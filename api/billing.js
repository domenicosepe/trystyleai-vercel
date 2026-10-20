// api/billing.js — Shopify Billing API v2
const axios = require('axios');

const API_KEY = process.env.SHOPIFY_API_KEY;
const API_SECRET = process.env.SHOPIFY_API_SECRET;
const APP_URL = process.env.APP_URL || 'https://trystyleai-vercel.vercel.app';

const PLANS = {
  basic:   { name: 'TryStyleAI Basic',    price: 30.00,  calls: 80,  trialDays: 7 },
  pro:     { name: 'TryStyleAI Pro',      price: 85.00,  calls: 250, trialDays: 7 },
  premium: { name: 'TryStyleAI Business', price: 275.00, calls: 840, trialDays: 7 }
};

// ── Upstash KV ────────────────────────────────────────────
async function kvGet(key) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  try {
    const r = await axios.post(url, ['GET', key],
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
    return r.data.result || null;
  } catch(e) {
    console.log('KV get errore:', e.response?.data || e.message);
    return null;
  }
}

async function kvSet(key, value) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return;
  try {
    await axios.post(`${url}/set/${encodeURIComponent(key)}`, [value],
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
    console.log('KV set OK:', key);
  } catch(e) {
    console.log('KV set errore:', e.response?.data || e.message);
  }
}

// ── Token exchange (JWT → OAuth offline token) ────────────
async function tokenExchange(sessionJwt, shop) {
  console.log('tokenExchange: API_KEY presente:', !!API_KEY, '| API_SECRET presente:', !!API_SECRET);
  console.log('tokenExchange: JWT lunghezza:', sessionJwt ? sessionJwt.length : 0);
  try {
    const r = await axios.post(`https://${shop}/admin/oauth/access_token`, {
      client_id: API_KEY,
      client_secret: API_SECRET,
      subject_token: sessionJwt,
      subject_token_type: 'urn:ietf:params:oauth:token-type:id_token',
      grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
      requested_token_type: 'urn:shopify:params:oauth:token-type:offline-access-token'
    });
    const t = r.data.access_token;
    if (t) {
      console.log('Token exchange OK per shop:', shop);
      return t;
    }
    console.log('Token exchange: risposta senza access_token:', JSON.stringify(r.data));
  } catch(e) {
    console.log('Token exchange errore status:', e.response?.status);
    console.log('Token exchange errore body:', JSON.stringify(e.response?.data));
  }
  return null;
}

// ── Verifica token con GraphQL (REST accetta ancora i vecchi token non-expiring) ─
async function isTokenValid(shop, token) {
  try {
    const r = await axios.post(
      `https://${shop}/admin/api/2024-01/graphql.json`,
      { query: '{ shop { name } }' },
      { headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' } }
    );
    // Se GraphQL risponde con errori di autenticazione nel body
    if (r.data?.errors) {
      console.log('Token validation GraphQL errors:', r.data.errors);
      return false;
    }
    return true;
  } catch(e) {
    const status = e.response?.status;
    console.log('Token validation status:', status, e.response?.data?.errors || '');
    return false;
  }
}

// ── Ottieni token valido ─────────────────────────────────────
// Se c'è JWT → sempre token exchange (token fresco garantito)
// Senza JWT → token da KV solo per azioni non-subscribe (current, cancel)
async function getValidToken(shop, sessionJwt, requireFresh) {
  // 1. Se c'è JWT, fai sempre token exchange → token garantito fresco
  if (sessionJwt) {
    console.log('JWT presente, faccio token exchange...');
    const token = await tokenExchange(sessionJwt, shop);
    if (token) {
      await kvSet('token:' + shop, token);
      console.log('Token exchange OK, token fresco salvato in KV');
      return token;
    }
    console.log('Token exchange fallito');
    return null; // non usare KV come fallback se token exchange fallisce
  }

  // 2. Senza JWT: solo se non richiedfresh (es. current/cancel)
  if (!requireFresh) {
    const cached = await kvGet('token:' + shop);
    if (cached) {
      console.log('Token da KV (no JWT disponibile)');
      return cached;
    }
  }

  return null;
}

// ── Handler principale ────────────────────────────────────
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // POST: parametri arrivano da query string (inviati come ?params nel POST)
  // GET: parametri da query string come al solito

  const { action, shop, plan, session_token } = req.query;

  // ── Endpoint debug ────────────────────────────────────────
  if (action === 'debug') {
    const result = { shop, session_token_length: session_token ? session_token.length : 0, api_key_present: !!API_KEY, api_secret_present: !!API_SECRET };
    if (session_token) {
      try {
        const r = await axios.post(`https://${shop}/admin/oauth/access_token`, {
          client_id: API_KEY, client_secret: API_SECRET,
          subject_token: session_token,
          subject_token_type: 'urn:ietf:params:oauth:token-type:id_token',
          grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
          requested_token_type: 'urn:shopify:params:oauth:token-type:offline-access-token'
        });
        result.exchange_ok = true;
        result.token_prefix = r.data.access_token ? r.data.access_token.substring(0, 10) : 'none';
        result.response = r.data;
      } catch(e) {
        result.exchange_ok = false;
        result.exchange_status = e.response?.status;
        result.exchange_error = e.response?.data;
      }
    }
    return res.json(result);
  }

  if (!shop) return res.status(400).json({ error: 'Shop mancante' });

  // Log diagnostico
  console.log('=== billing.js v2 ===');
  console.log('action:', action, '| shop:', shop, '| plan:', plan);
  console.log('session_token presente:', !!session_token, '| lunghezza:', session_token ? session_token.length : 0);
  console.log('TUTTI query params:', JSON.stringify(Object.keys(req.query)));
  if (session_token) console.log('session_token inizio:', session_token.substring(0, 30));

  // Per subscribe serve token fresco (no KV fallback con token vecchi)
  const requireFresh = (action === 'subscribe');
  const token = await getValidToken(shop, session_token, requireFresh);
  console.log('token ottenuto:', !!token, '| requireFresh:', requireFresh);

  // Se subscribe senza token → errore chiaro (non usare token vecchio da KV)
  if (action === 'subscribe' && !token) {
    console.log('Subscribe senza token valido — token exchange fallito o JWT assente');
    return res.status(401).json({
      error: 'Sessione scaduta. Reinstalla l\'app.',
      redirectUrl: `${APP_URL}/api/install?shop=${encodeURIComponent(shop)}`
    });
  }

  // ── Crea abbonamento ──────────────────────────────────────
  if (action === 'subscribe') {
    if (!plan || !PLANS[plan]) {
      return res.status(400).json({ error: 'Piano non valido' });
    }
    if (!token) {
      console.log('Nessun token valido, redirect a install');
      return res.redirect(`${APP_URL}/api/install?shop=${encodeURIComponent(shop)}`);
    }

    const p = PLANS[plan];
    const returnUrl = `${APP_URL}/api/billing?action=confirm&shop=${encodeURIComponent(shop)}&plan=${plan}`;

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
      if (data?.userErrors?.length) {
        console.log('userErrors:', data.userErrors);
        return res.status(400).json({ error: data.userErrors[0].message });
      }
      console.log('Subscription creata, confirmationUrl:', data.confirmationUrl);
      // Ritorna JSON con confirmationUrl — il frontend fa il redirect top-frame
      return res.json({ confirmationUrl: data.confirmationUrl });
    } catch (err) {
      const detail = err.response?.data || err.message;
      console.error('Billing error:', JSON.stringify(detail));
      return res.status(500).json({ error: 'Errore creazione abbonamento: ' + err.message, detail });
    }
  }

  // ── Conferma dopo pagamento ───────────────────────────────
  if (action === 'confirm') {
    try {
      const p = PLANS[plan];
      if (p && token) {
        await updateMeta(shop, token, 'plan', plan);
        await updateMeta(shop, token, 'status', 'active');
        await updateMeta(shop, token, 'calls_limit', String(p.calls));
        await updateMeta(shop, token, 'calls_used', '0');
      }
    } catch (err) {
      console.error('Confirm error:', err.message);
    }
    const host = Buffer.from(`${shop}/admin`).toString('base64');
    return res.redirect(`/api/app?shop=${encodeURIComponent(shop)}&host=${host}`);
  }

  // ── Info piano corrente ───────────────────────────────────
  if (action === 'current') {
    if (!token) {
      return res.json({
        shop, plan: 'none', planName: 'Nessun piano', status: 'pending',
        callsUsed: 0, callsLimit: 0,
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
    const subId = body.subId || req.query.subId;
    if (!subId) return res.status(400).json({ error: 'subId mancante' });
    const mutation = `mutation { appSubscriptionCancel(id: "${subId}") { appSubscription { id } } }`;
    try {
      await axios.post(
        `https://${shop}/admin/api/2024-01/graphql.json`,
        { query: mutation },
        { headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' } }
      );
      if (token) {
        await updateMeta(shop, token, 'status', 'cancelled');
        await updateMeta(shop, token, 'plan', 'none');
      }
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: 'Errore cancellazione' });
    }
  }

  res.status(400).json({ error: 'Azione non valida' });
};

// ── Metafield helpers ─────────────────────────────────────
async function getMeta(shop, token) {
  const result = {};
  try {
    const r = await axios.get(`https://${shop}/admin/api/2024-01/metafields.json?namespace=trystyleai`,
      { headers: { 'X-Shopify-Access-Token': token } });
    for (const mf of r.data.metafields || []) result[mf.key] = mf.value;
  } catch (e) {}
  return result;
}

async function updateMeta(shop, token, key, value) {
  try {
    const r = await axios.get(
      `https://${shop}/admin/api/2024-01/metafields.json?namespace=trystyleai&key=${key}`,
      { headers: { 'X-Shopify-Access-Token': token } });
    const mf = r.data.metafields?.[0];
    if (mf) {
      await axios.put(`https://${shop}/admin/api/2024-01/metafields/${mf.id}.json`,
        { metafield: { id: mf.id, value, type: 'single_line_text_field' } },
        { headers: { 'X-Shopify-Access-Token': token } });
    } else {
      await axios.post(`https://${shop}/admin/api/2024-01/metafields.json`,
        { metafield: { namespace: 'trystyleai', key, value, type: 'single_line_text_field' } },
        { headers: { 'X-Shopify-Access-Token': token } });
    }
  } catch (e) {}
}
