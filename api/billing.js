// api/billing.js — Shopify Billing API
const axios = require('axios');
const crypto = require('crypto');

const API_KEY = process.env.SHOPIFY_API_KEY;
const API_SECRET = process.env.SHOPIFY_API_SECRET;
const APP_URL = process.env.APP_URL || 'https://trystyleai-vercel.vercel.app';

const PLANS = {
  basic:   { name: 'TryStyleAI Basic',    price: 30.00,  calls: 80,  trialDays: 7 },
  pro:     { name: 'TryStyleAI Pro',      price: 85.00,  calls: 250, trialDays: 7 },
  premium: { name: 'TryStyleAI Business', price: 275.00, calls: 840, trialDays: 7 }
};

// Decodifica JWT session token (App Bridge) — solo base64, non serve verificare la firma per estrarre il shop
function decodeSessionToken(jwt) {
  try {
    const parts = jwt.split('.');
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    return JSON.parse(payload);
  } catch(e) {
    return null;
  }
}

// Verifica HMAC del session token con il secret dell'app
function verifySessionToken(jwt) {
  try {
    if (!API_SECRET) return false;
    const parts = jwt.split('.');
    if (parts.length !== 3) return false;
    const msg = parts[0] + '.' + parts[1];
    const sig = Buffer.from(parts[2].replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    const expected = crypto.createHmac('sha256', API_SECRET).update(msg).digest();
    return crypto.timingSafeEqual(sig, expected);
  } catch(e) {
    return false;
  }
}

// Recupera il token OAuth dai metafield del negozio usando le credenziali dell'app
// Questo funziona perché il token è stato salvato come metafield durante l'install
// e lo recuperiamo usando il token stesso (che abbiamo salvato come metafield access_token)
async function getTokenFromMetafield(shop) {
  // Non possiamo leggere metafield senza token — questa funzione è un no-op
  // Il token viene sempre passato dal frontend o dal session_token exchange
  return null;
}

// Recupera il token OAuth tramite token exchange con Shopify
// Il session token JWT è firmato da Shopify — lo usiamo per ottenere un token offline
async function getOAuthTokenViaSessionToken(sessionJwt, shop) {
  if (!sessionJwt) return null;

  // Decodifica il JWT per ottenere il shop dal claim 'dest' (senza verificare la firma — Shopify la verifica nell'exchange)
  const claims = decodeSessionToken(sessionJwt);
  // Il claim 'dest' contiene l'URL del negozio, es: "https://checkout-rapido-test.myshopify.com"
  const destShop = (claims?.dest ? claims.dest.replace('https://', '') : shop) || shop;
  if (!destShop) return null;

  // Recupera il token OAuth dal metafield access_token del negozio
  // Per farlo ci serve già un token — usiamo l'online token exchange di Shopify
  // Shopify permette di scambiare un session token con un token online usando le credenziali dell'app
  try {
    const r = await axios.post(
      `https://${destShop}/admin/oauth/access_token`,
      {
        client_id: API_KEY,
        client_secret: API_SECRET,
        subject_token: sessionJwt,
        subject_token_type: 'urn:ietf:params:oauth:token-type:id_token',
        grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
        requested_token_type: 'urn:shopify:params:oauth:token-type:offline-access-token'
      }
    );
    if (r.data.access_token) {
      return r.data.access_token;
    }
  } catch(e) {
    const errData = e.response?.data;
    console.log('Token exchange fallito:', JSON.stringify(errData));
  }

  return null;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action, shop, plan } = req.query;
  let { token, session_token } = req.query;

  // Se arriva session_token (JWT da App Bridge), esegui token exchange per ottenere l'OAuth token
  if (!token && session_token && shop) {
    const exchanged = await getOAuthTokenViaSessionToken(session_token, shop);
    if (exchanged) {
      token = exchanged;
    } else {
      // Fallback: prova a leggere token dal cookie (funziona solo se non siamo in iframe cross-origin)
      const cookieKey = 'ts_token_' + shop.replace(/\./g, '_');
      const cookies = req.headers.cookie || '';
      const match = cookies.split(';').map(c => c.trim()).find(c => c.startsWith(cookieKey + '='));
      if (match) token = decodeURIComponent(match.split('=').slice(1).join('='));
    }
  }

  // Se c'è solo session_token senza token OAuth, prova cookie come ultimo fallback
  if (!token && shop) {
    const cookieKey = 'ts_token_' + shop.replace(/\./g, '_');
    const cookies = req.headers.cookie || '';
    const match = cookies.split(';').map(c => c.trim()).find(c => c.startsWith(cookieKey + '='));
    if (match) token = decodeURIComponent(match.split('=').slice(1).join('='));
  }

  // ── Crea abbonamento ──────────────────────────────────────
  if (action === 'subscribe') {
    if (!shop || !plan || !PLANS[plan]) {
      return res.status(400).json({ error: 'Parametri non validi' });
    }
    if (!token) {
      // Nessun token OAuth — reindirizza all'installazione OAuth
      const installUrl = `${APP_URL}/api/install?shop=${encodeURIComponent(shop)}`;
      return res.redirect(installUrl);
    }

    const p = PLANS[plan];
    const returnUrl = `${APP_URL}/api/billing?action=confirm&shop=${encodeURIComponent(shop)}&plan=${plan}&token=${encodeURIComponent(token)}`;

    const mutation = `
      mutation {
        appSubscriptionCreate(
          name: "${p.name}"
          returnUrl: "${returnUrl}"
          trialDays: ${p.trialDays}
          lineItems: [{
            plan: {
              appRecurringPricingDetails: {
                price: { amount: ${p.price}, currencyCode: EUR }
                interval: EVERY_30_DAYS
              }
            }
          }]
        ) {
          appSubscription { id status }
          confirmationUrl
          userErrors { field message }
        }
      }
    `;

    try {
      const r = await axios.post(
        `https://${shop}/admin/api/2024-01/graphql.json`,
        { query: mutation },
        { headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' } }
      );
      const data = r.data.data?.appSubscriptionCreate;
      if (data?.userErrors?.length) return res.status(400).json({ error: data.userErrors[0].message });
      return res.redirect(data.confirmationUrl);
    } catch (err) {
      const detail = err.response?.data || err.message;
      console.error('Billing error detail:', JSON.stringify(detail));
      return res.status(500).json({ error: 'Errore creazione abbonamento: ' + err.message, detail });
    }
  }

  // ── Conferma dopo pagamento ───────────────────────────────
  if (action === 'confirm') {
    try {
      const p = PLANS[plan];
      if (p) {
        await updateMeta(shop, token, 'plan', plan);
        await updateMeta(shop, token, 'status', 'active');
        await updateMeta(shop, token, 'calls_limit', String(p.calls));
        await updateMeta(shop, token, 'calls_used', '0');
      }
    } catch (err) {
      console.error('Confirm error:', err.message);
    }
    const host = Buffer.from(`${shop}/admin`).toString('base64');
    return res.redirect(`/api/app?shop=${encodeURIComponent(shop)}&token=${encodeURIComponent(token)}&host=${host}`);
  }

  // ── Info piano corrente ───────────────────────────────────
  if (action === 'current') {
    if (!shop) return res.status(400).json({ error: 'Shop mancante' });

    // Se ancora non c'è token, risponde con stato "no plan" invece di errore
    if (!token) {
      return res.json({
        shop,
        plan: 'none',
        planName: 'Nessun piano',
        status: 'pending',
        callsUsed: 0,
        callsLimit: 0,
        plans: Object.entries(PLANS).map(([key, pl]) => ({
          key, name: pl.name, price: pl.price, calls: pl.calls, trialDays: pl.trialDays
        }))
      });
    }

    try {
      const meta = await getMeta(shop, token);
      const p = PLANS[meta.plan] || null;
      return res.json({
        shop,
        plan: meta.plan || 'none',
        planName: p?.name || 'Nessun piano',
        status: meta.status || 'pending',
        callsUsed: parseInt(meta.calls_used || '0'),
        callsLimit: parseInt(meta.calls_limit || '0'),
        plans: Object.entries(PLANS).map(([key, pl]) => ({
          key, name: pl.name, price: pl.price, calls: pl.calls, trialDays: pl.trialDays
        }))
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── Cancella abbonamento ──────────────────────────────────
  if (action === 'cancel') {
    const body = req.body || {};
    const subShop = body.shop || shop;
    const subToken = body.token || token;
    const subId = body.subId;
    if (!subId) return res.status(400).json({ error: 'subId mancante' });
    const mutation = `mutation { appSubscriptionCancel(id: "${subId}") { appSubscription { id } } }`;
    try {
      await axios.post(
        `https://${subShop}/admin/api/2024-01/graphql.json`,
        { query: mutation },
        { headers: { 'X-Shopify-Access-Token': subToken, 'Content-Type': 'application/json' } }
      );
      await updateMeta(subShop, subToken, 'status', 'cancelled');
      await updateMeta(subShop, subToken, 'plan', 'none');
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: 'Errore cancellazione' });
    }
  }

  res.status(400).json({ error: 'Azione non valida' });
};

async function getMeta(shop, token) {
  const result = {};
  try {
    const r = await axios.get(`https://${shop}/admin/api/2024-01/metafields.json?namespace=trystyleai`, {
      headers: { 'X-Shopify-Access-Token': token }
    });
    for (const mf of r.data.metafields || []) result[mf.key] = mf.value;
  } catch (e) {}
  return result;
}

async function updateMeta(shop, token, key, value) {
  try {
    const r = await axios.get(
      `https://${shop}/admin/api/2024-01/metafields.json?namespace=trystyleai&key=${key}`,
      { headers: { 'X-Shopify-Access-Token': token } }
    );
    const mf = r.data.metafields?.[0];
    if (mf) {
      await axios.put(`https://${shop}/admin/api/2024-01/metafields/${mf.id}.json`,
        { metafield: { id: mf.id, value, type: 'single_line_text_field' } },
        { headers: { 'X-Shopify-Access-Token': token } }
      );
    } else {
      await axios.post(`https://${shop}/admin/api/2024-01/metafields.json`,
        { metafield: { namespace: 'trystyleai', key, value, type: 'single_line_text_field' } },
        { headers: { 'X-Shopify-Access-Token': token } }
      );
    }
  } catch (e) {}
}
