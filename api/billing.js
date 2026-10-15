// api/billing.js — Shopify Billing API
const axios = require('axios');

const APP_URL = process.env.APP_URL || 'https://trystyleai-vercel.vercel.app';

const PLANS = {
  basic:   { name: 'TryStyleAI Basic',    price: 30.00,  calls: 80,  trialDays: 7 },
  pro:     { name: 'TryStyleAI Pro',      price: 85.00,  calls: 250, trialDays: 7 },
  premium: { name: 'TryStyleAI Business', price: 275.00, calls: 840, trialDays: 7 }
};

// Legge token da Upstash KV
async function kvGet(key) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  try {
    const r = await axios.get(`${url}/get/${encodeURIComponent(key)}`,
      { headers: { Authorization: `Bearer ${token}` } });
    return r.data.result || null;
  } catch(e) {
    console.log('KV get errore:', e.response?.data || e.message);
    return null;
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action, shop, plan } = req.query;
  let { token } = req.query;

  // Se non arriva token in query, lo legge da KV usando lo shop
  if (!token && shop) {
    console.log('Cerco token su KV per shop:', shop);
    token = await kvGet('token:' + shop);
    if (token) {
      console.log('Token trovato su KV');
    } else {
      console.log('Token NON trovato su KV');
    }
  }

  // ── Crea abbonamento ──────────────────────────────────────
  if (action === 'subscribe') {
    if (!shop || !plan || !PLANS[plan]) {
      return res.status(400).json({ error: 'Parametri non validi' });
    }
    if (!token) {
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
      console.error('Billing error:', JSON.stringify(detail));
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
    return res.redirect(`/api/app?shop=${encodeURIComponent(shop)}&host=${host}`);
  }

  // ── Info piano corrente ───────────────────────────────────
  if (action === 'current') {
    if (!shop) return res.status(400).json({ error: 'Shop mancante' });

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
