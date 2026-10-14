// api/billing.js — Shopify Billing API
const axios = require('axios');

const API_KEY = process.env.SHOPIFY_API_KEY;
const APP_URL = process.env.APP_URL || 'https://trystyleai-vercel.vercel.app';

const PLANS = {
  basic:   { name: 'TryStyleAI Basic',    price: 30.00,  calls: 80,  trialDays: 7 },
  pro:     { name: 'TryStyleAI Pro',      price: 85.00,  calls: 250, trialDays: 7 },
  premium: { name: 'TryStyleAI Business', price: 275.00, calls: 840, trialDays: 7 }
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action, shop, plan } = req.query;
  let { token } = req.query;

  // Se non c'è token in query, lo recupera dai metafield
  if (!token && shop) {
    token = await getTokenFromMeta(shop);
  }

  // ── Crea abbonamento ──────────────────────────────────────
  if (action === 'subscribe') {
    if (!shop || !plan || !PLANS[plan]) {
      return res.status(400).json({ error: 'Parametri non validi' });
    }
    if (!token) return res.status(401).json({ error: 'Token mancante. Reinstalla l\'app.' });

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
      return res.status(500).json({ error: 'Errore creazione abbonamento: ' + err.message });
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

// Recupera il token salvato nei metafield (serve una chiamata non autenticata impossibile)
// Usiamo un workaround: il token admin dell'app è necessario — questa funzione usa il secret per ottenere
// l'elenco dei token salvati tramite private app. In alternativa, leggiamo da un metafield "pubblico".
// NOTA: non è possibile leggere metafield senza token → se manca, restituiamo null.
async function getTokenFromMeta(shop) {
  // Non possiamo leggere metafield senza un token valido.
  // Il token viene sempre passato dalla dashboard che lo ha ricevuto dall'install.
  return null;
}

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
