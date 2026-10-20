// api/webhooks.js — Webhook Shopify
// Iscrizioni dichiarate in shopify.app.toml (i topic GDPR non si possono registrare via API):
//   compliance: customers/data_request, customers/redact, shop/redact
//   eventi:     app/uninstalled, app_subscriptions/update
const crypto = require('crypto');
const { kvGet, kvSet, kvDel } = require('./_kv');

const API_SECRET = process.env.SHOPIFY_API_SECRET;
const SHOP_RE = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;
const PLAN_BY_NAME = {
  'TryStyleAI Basic': { key: 'basic', calls: 80 },
  'TryStyleAI Pro': { key: 'pro', calls: 250 },
  'TryStyleAI Business': { key: 'premium', calls: 840 }
};

// Body raw necessario per l'HMAC: niente parsing automatico
module.exports.config = { api: { bodyParser: false } };

function verifyHmac(hmacHeader, rawBody) {
  if (!hmacHeader || !API_SECRET) return false;
  const digest = crypto.createHmac('sha256', API_SECRET).update(rawBody).digest();
  let given;
  try { given = Buffer.from(String(hmacHeader), 'base64'); } catch (e) { return false; }
  // Lunghezze diverse → firma non valida (timingSafeEqual lancerebbe un errore → 500)
  if (given.length !== digest.length) return false;
  return crypto.timingSafeEqual(digest, given);
}

async function readRaw(req) {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return Buffer.from(req.body);
  const chunks = [];
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks);
}

// Tutte le chiavi KV legate a un negozio
function shopKeys(shop) {
  return ['token:' + shop, 'offline:' + shop, 'offline_err:' + shop, 'config:' + shop, 'sub:' + shop];
}

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  let rawBody;
  try { rawBody = await readRaw(req); } catch (e) { return res.status(400).send('Bad Request'); }

  if (!verifyHmac(req.headers['x-shopify-hmac-sha256'], rawBody)) {
    console.log('Webhook HMAC non valido');
    return res.status(401).send('Unauthorized');
  }

  const topic = String(req.headers['x-shopify-topic'] || '');
  const shop = String(req.headers['x-shopify-shop-domain'] || '').toLowerCase();
  let payload = {};
  try { payload = JSON.parse(rawBody.toString('utf8') || '{}'); } catch (e) {}
  console.log('Webhook:', topic, '| shop:', shop, '| id:', req.headers['x-shopify-webhook-id'] || '-');

  if (!SHOP_RE.test(shop)) return res.status(200).send('OK');

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
        const plan = PLAN_BY_NAME[sub.name] || null;
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
          const lp = PLAN_BY_NAME[live.name] || null;
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

  return res.status(200).send('OK');
}

function parseJson(v) {
  if (!v) return null;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch (e) { return null; }
}

// Abbonamento attivo da Shopify: oggetto, null se nessuno, undefined se non verificabile
async function activeSubscription(shop) {
  const axios = require('axios');
  const token = (await kvGet('offline:' + shop)) || (await kvGet('token:' + shop));
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
  const token = (await kvGet('offline:' + shop)) || (await kvGet('token:' + shop));
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

module.exports = handler;
module.exports.config = { api: { bodyParser: false } };
module.exports.verifyHmac = verifyHmac;
