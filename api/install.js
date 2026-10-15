// api/install.js — OAuth Shopify
const crypto = require('crypto');
const axios = require('axios');

const API_KEY = process.env.SHOPIFY_API_KEY;
const API_SECRET = process.env.SHOPIFY_API_SECRET;
const APP_URL = process.env.APP_URL || 'https://trystyleai-vercel.vercel.app';
const SCOPES = 'write_script_tags,read_script_tags,read_products,write_metafields,read_metafields,read_orders';

module.exports = async (req, res) => {
  const { shop, code, hmac, state } = req.query;

  // Step 1: avvia installazione
  if (!code) {
    if (!shop || !shop.includes('.myshopify.com')) {
      return res.status(400).send('Shop non valido');
    }
    const nonce = crypto.randomBytes(16).toString('hex');
    const redirectUri = `${APP_URL}/api/install`;
    const url = `https://${shop}/admin/oauth/authorize?client_id=${API_KEY}&scope=${SCOPES}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${nonce}&grant_options[]=offline`;
    return res.redirect(url);
  }

  // Step 2: callback — verifica HMAC
  const params = Object.keys(req.query)
    .filter(k => k !== 'hmac')
    .sort()
    .map(k => `${k}=${req.query[k]}`)
    .join('&');
  const digest = crypto.createHmac('sha256', API_SECRET).update(params).digest('hex');
  if (digest !== hmac) return res.status(403).send('HMAC non valido');

  try {
    // Ottieni access token
    const tokenRes = await axios.post(`https://${shop}/admin/oauth/access_token`, {
      client_id: API_KEY,
      client_secret: API_SECRET,
      code
    });
    const accessToken = tokenRes.data.access_token;

    // Salva access token come metafield del negozio
    await setMetafield(shop, accessToken, 'access_token', accessToken);

    // Inizializza contatori (solo se non esistono già)
    await setMetafieldIfEmpty(shop, accessToken, 'calls_used', '0');
    await setMetafieldIfEmpty(shop, accessToken, 'calls_limit', '0');
    await setMetafieldIfEmpty(shop, accessToken, 'plan', 'none');
    await setMetafieldIfEmpty(shop, accessToken, 'status', 'pending');

    // Installa script tag
    try {
      await axios.post(`https://${shop}/admin/api/2024-01/script_tags.json`, {
        script_tag: { event: 'onload', src: `${APP_URL}/api/widget` }
      }, { headers: { 'X-Shopify-Access-Token': accessToken } });
    } catch(e) {}

    // Salva token in cookie httpOnly (server-side, non dipende da sessionStorage/iframe)
    const host = Buffer.from(`${shop}/admin`).toString('base64');
    res.setHeader('Set-Cookie', `ts_token_${shop.replace(/\./g,'_')}=${encodeURIComponent(accessToken)}; Path=/; SameSite=None; Secure; Max-Age=86400`);
    return res.redirect(`/api/app?shop=${encodeURIComponent(shop)}&host=${host}`);

  } catch (err) {
    console.error('Install error:', err.response?.data || err.message);
    res.status(500).send('Errore installazione: ' + (err.response?.data?.error_description || err.message));
  }
};

async function setMetafield(shop, token, key, value) {
  try {
    // Prima cerca se esiste già
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

async function setMetafieldIfEmpty(shop, token, key, value) {
  try {
    const r = await axios.get(
      `https://${shop}/admin/api/2024-01/metafields.json?namespace=trystyleai&key=${key}`,
      { headers: { 'X-Shopify-Access-Token': token } }
    );
    if (!r.data.metafields?.length) {
      await axios.post(`https://${shop}/admin/api/2024-01/metafields.json`,
        { metafield: { namespace: 'trystyleai', key, value, type: 'single_line_text_field' } },
        { headers: { 'X-Shopify-Access-Token': token } }
      );
    }
  } catch (e) {}
}
