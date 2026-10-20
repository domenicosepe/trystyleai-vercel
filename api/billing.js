// api/billing.js — Shopify Billing API
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
  } catch(e) {
    console.log('Token exchange errore:', e.response?.data || e.message);
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
// Se c'è il JWT session token: SEMPRE token exchange (garantisce token fresco)
// Senza JWT: fallback su KV (per chiamate backend senza sessione utente)
async function getValidToken(shop, sessionJwt) {
  // 1. Se c'è JWT, fai sempre token exchange → token garantito fresco
  if (sessionJwt) {
    console.log('JWT presente, faccio token exchange...');
    const token = await tokenExchange(sessionJwt, shop);
    if (token) {
      await kvSet('token:' + shop, token);
      return token;
    }
    console.log('Token exchange fallito, provo KV come fallback...');
  }

  // 2. Fallback: token da KV (senza sessione utente attiva)
  const cached = await kvGet('token:' + shop);
  if (cached) {
    console.log('Token da KV (fallback senza JWT)');
    return cached;
  }

  return null;
}

// ── Handler principale ────────────────────────────────────
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action, shop, plan, session_token } = req.query;

  if (!shop) return res.status(400).json({ error: 'Shop mancante' });

  // Log diagnostico
  console.log('=== billing.js ===');
  console.log('action:', action, '| shop:', shop, '| plan:', plan);
  console.log('session_token presente:', !!session_token, '| lunghezza:', session_token ? session_token.length : 0);
  if (session_token) console.log('session_token primi 50 char:', session_token.substring(0, 50));

  // Recupera token valido
  const token = await getValidToken(shop, session_token);

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
      console.log('Subscription creata, redirect a confirmationUrl');
      return res.redirect(data.confirmationUrl);
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
