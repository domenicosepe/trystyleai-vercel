// api/webhooks.js — Webhook Shopify
// Iscrizioni dichiarate in shopify.app.toml (i topic GDPR non si possono registrare via API):
//   compliance: customers/data_request, customers/redact, shop/redact
//   eventi:     app/uninstalled, app_subscriptions/update
const { getShopToken, tokenStatus } = require('./_token');
const crypto = require('crypto');
const { kvGet, kvSet, kvDel } = require('./_kv');
const { PLAN_CALLS, planKeyFromName } = require('./_config');

function planFromName(name) {
  const key = planKeyFromName(name);
  return key ? { key, calls: PLAN_CALLS[key] } : null;
}

const API_SECRET = process.env.SHOPIFY_API_SECRET;
const SHOP_RE = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;

function verifyHmac(hmacHeader, rawBody) {
  if (!hmacHeader || !API_SECRET) return false;
  const digest = crypto.createHmac('sha256', API_SECRET).update(rawBody).digest();
  let given;
  try { given = Buffer.from(String(hmacHeader), 'base64'); } catch (e) { return false; }
  // Lunghezze diverse → firma non valida (timingSafeEqual lancerebbe un errore → 500)
  if (given.length !== digest.length) return false;
  return crypto.timingSafeEqual(digest, given);
}

// Tutte le chiavi KV legate a un negozio
function shopKeys(shop) {
  return ['token:' + shop, 'offline:' + shop, 'offline_err:' + shop, 'config:' + shop, 'sub:' + shop];
}

// Logica per topic. Risponde sempre dopo aver gestito l'evento (Shopify attende max 5s).
async function processWebhook(topic, shop, payload) {
  try {
    switch (topic) {
      // ── GDPR ───────────────────────────────────────────
      case 'customers/data_request':
        // TryStyleAI non conserva dati dei clienti finali: le foto vanno a FASHN solo per
        // generare l'anteprima e non vengono salvate da noi. Nulla da esportare.
        console.log('GDPR data_request: nessun dato cliente conservato. customer id:', payload.customer && payload.customer.id);
        break;

      case 'customers/redact':
        // Nessun dato cliente conservato → nulla da cancellare.
        console.log('GDPR customers/redact: nessun dato cliente conservato. customer id:', payload.customer && payload.customer.id);
        break;

      case 'shop/redact': {
        // 48h dopo la disinstallazione: cancella tutto ciò che riguarda il negozio
        const n = await kvDel(...shopKeys(shop));
        console.log('GDPR shop/redact: chiavi KV cancellate:', n);
        break;
      }

      // ── Ciclo di vita app ─────────────────────────────
      case 'app/uninstalled': {
        // I token sono revocati da Shopify: li eliminiamo e blocchiamo il widget.
        // La configurazione resta fino a shop/redact, nel caso il negozio reinstalli.
        await kvDel('token:' + shop, 'offline:' + shop, 'offline_err:' + shop);
        await kvSet('sub:' + shop, { status: 'UNINSTALLED', plan: 'none', at: new Date().toISOString() });
        console.log('app/uninstalled: token eliminati');
        break;
      }

      case 'app_subscriptions/update': {
        const sub = payload.app_subscription || {};
        const status = String(sub.status || '').toUpperCase();
        const id = sub.admin_graphql_api_id || null;
        const plan = planFromName(sub.name);
        console.log('app_subscriptions/update:', sub.name, status, id);

        if (status === 'ACTIVE' && plan) {
          await kvSet('sub:' + shop, { status, plan: plan.key, calls: plan.calls, id, at: new Date().toISOString() });
          await syncMeta(shop, 'ACTIVE', plan);
          break;
        }
        if (!['CANCELLED', 'DECLINED', 'EXPIRED', 'FROZEN'].includes(status)) break; // PENDING ecc.: nulla da fare

        // Cambio piano: Shopify annulla il vecchio abbonamento e attiva il nuovo, ma l'ordine
        // dei webhook non è garantito. Blocchiamo solo se non c'è un altro abbonamento attivo.
        const live = await activeSubscription(shop);
        if (live === undefined) {
          // Shopify non raggiungibile: confronta con l'abbonamento noto
          const known = parseJson(await kvGet('sub:' + shop));
          if (known && known.status === 'ACTIVE' && known.id && id && known.id !== id) {
            console.log('Annullato un abbonamento non corrente, ignoro');
            break;
          }
        } else if (live) {
          const lp = planFromName(live.name);
          await kvSet('sub:' + shop, { status: 'ACTIVE', plan: lp ? lp.key : 'none', calls: lp ? lp.calls : 0, id: live.id, at: new Date().toISOString() });
          if (lp) await syncMeta(shop, 'ACTIVE', lp);
          console.log('Esiste ancora un abbonamento attivo:', live.name);
          break;
        }
        await kvSet('sub:' + shop, { status, plan: 'none', calls: 0, id, at: new Date().toISOString() });
        await syncMeta(shop, status, null);
        break;
      }

      default:
        console.log('Webhook topic non gestito:', topic);
    }
  } catch (e) {
    // Rispondiamo comunque 200: Shopify riproverebbe all'infinito un 500 su dati già gestiti
    console.log('Webhook errore gestione:', topic, e.message);
  }
}

// ── Handler Web standard (Vercel Node.js runtime) ───────────
// Con POST(request) Vercel non tocca il body: request.arrayBuffer() restituisce i byte
// esatti firmati da Shopify, necessari per verificare l'HMAC.
async function POST(request) {
  let rawBody;
  try { rawBody = Buffer.from(await request.arrayBuffer()); }
  catch (e) { return new Response('Bad Request', { status: 400 }); }

  const hmacHeader = request.headers.get('x-shopify-hmac-sha256');
  const topic = String(request.headers.get('x-shopify-topic') || '');
  const shop = String(request.headers.get('x-shopify-shop-domain') || '').toLowerCase();

  if (!verifyHmac(hmacHeader, rawBody)) {
    console.log('Webhook HMAC non valido | topic:', topic || '-', '| bytes:', rawBody.length,
      '| header hmac:', hmacHeader ? 'presente' : 'assente', '| secret configurato:', !!API_SECRET);
    return new Response('Unauthorized', { status: 401 });
  }

  let payload = {};
  try { payload = JSON.parse(rawBody.toString('utf8') || '{}'); } catch (e) {}
  console.log('Webhook:', topic, '| shop:', shop, '| id:', request.headers.get('x-shopify-webhook-id') || '-');

  if (SHOP_RE.test(shop)) await processWebhook(topic, shop, payload);
  return new Response('OK', { status: 200 });
}

function GET() {
  return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
}

function parseJson(v) {
  if (!v) return null;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch (e) { return null; }
}

// Abbonamento attivo da Shopify: oggetto, null se nessuno, undefined se non verificabile
async function activeSubscription(shop) {
  const axios = require('axios');
  const token = (await getShopToken(shop));
  if (!token) return undefined;
  try {
    const r = await axios.post(`https://${shop}/admin/api/2025-01/graphql.json`,
      { query: '{ currentAppInstallation { activeSubscriptions { id name status } } }' },
      { headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' } });
    const subs = r.data && r.data.data && r.data.data.currentAppInstallation && r.data.data.currentAppInstallation.activeSubscriptions;
    if (!Array.isArray(subs)) return undefined;
    return subs.find(x => x.status === 'ACTIVE') || null;
  } catch (e) { return undefined; }
}

async function syncMeta(shop, status, plan) {
  const axios = require('axios');
  const token = (await getShopToken(shop));
  if (!token) return;
  const h = { headers: { 'X-Shopify-Access-Token': token } };
  const base = `https://${shop}/admin/api/2025-01/metafields.json`;
  async function setMeta(key, value) {
    try {
      const r = await axios.get(`${base}?namespace=trystyleai&key=${key}`, h);
      const mf = r.data.metafields && r.data.metafields[0];
      if (mf) {
        await axios.put(`https://${shop}/admin/api/2025-01/metafields/${mf.id}.json`,
          { metafield: { id: mf.id, value, type: 'single_line_text_field' } }, h);
      } else {
        await axios.post(base, { metafield: { namespace: 'trystyleai', key, value, type: 'single_line_text_field' } }, h);
      }
    } catch (e) { console.log('syncMeta errore', key, e.response?.status); }
  }
  if (status === 'ACTIVE' && plan) {
    await setMeta('status', 'active');
    await setMeta('plan', plan.key);
    await setMeta('calls_limit', String(plan.calls));
  } else if (['CANCELLED', 'DECLINED', 'EXPIRED', 'FROZEN'].includes(status)) {
    await setMeta('status', 'cancelled');
    await setMeta('plan', 'none');
  }
}

// Nessun export di default: così Vercel usa gli handler Web (GET/POST) invece di (req, res)
module.exports = { GET, POST, verifyHmac, processWebhook };
