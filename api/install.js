// api/install.js — OAuth Shopify
const crypto = require('crypto');
const axios = require('axios');

const API_KEY = process.env.SHOPIFY_API_KEY;
const API_SECRET = process.env.SHOPIFY_API_SECRET;
const APP_URL = process.env.APP_URL || 'https://trystyleai-vercel.vercel.app';
const SCOPES = 'write_script_tags,read_script_tags,read_products,write_metafields,read_metafields';

module.exports = async (req, res) => {
  const { shop, code, hmac, state } = req.query;

  // Step 1: avvia installazione
  if (!code) {
    if (!shop || !shop.includes('.myshopify.com')) {
      return res.status(400).send('Shop non valido');
    }
    const nonce = crypto.randomBytes(16).toString('hex');
    const redirectUri = `${APP_URL}/api/install`;
    const url = `https://${shop}/admin/oauth/authorize?client_id=${API_KEY}&scope=${SCOPES}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${nonce}`;
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

    // Dopo OAuth: serve una pagina che salva token in sessionStorage e ricarica la dashboard
    // (funziona sia se aperto in nuova tab che in top-level window)
    const host = Buffer.from(`${shop}/admin`).toString('base64');
    const shopEnc = encodeURIComponent(shop);
    const tokenEnc = encodeURIComponent(accessToken);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(`<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>TryStyleAI — Autenticazione</title></head>
<body style="font-family:sans-serif;text-align:center;padding:60px;background:#f6f6f7;">
<div style="max-width:400px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,.1)">
  <div style="width:48px;height:48px;background:linear-gradient(135deg,#7b2ff7,#00c6ff);border-radius:12px;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:18px">TS</div>
  <h2 style="margin:0 0 8px;font-size:18px">Autenticazione completata</h2>
  <p style="color:#6d7175;font-size:14px;margin:0 0 24px">Reindirizzamento alla dashboard...</p>
  <div style="width:32px;height:32px;border:3px solid #e1e3e5;border-top-color:#7b2ff7;border-radius:50%;animation:spin .8s linear infinite;margin:0 auto"></div>
</div>
<style>@keyframes spin{to{transform:rotate(360deg)}}</style>
<script>
  // Salva token e shop in sessionStorage
  try {
    sessionStorage.setItem('trystyleai_shop', '${shop}');
    sessionStorage.setItem('trystyleai_token', '${accessToken}');
  } catch(e) {}

  // Se questa tab è stata aperta da un opener (nuova tab), avvisa e chiudi
  if (window.opener && !window.opener.closed) {
    try {
      window.opener.sessionStorage.setItem('trystyleai_shop', '${shop}');
      window.opener.sessionStorage.setItem('trystyleai_token', '${accessToken}');
      window.opener.location.reload();
    } catch(e) {}
    setTimeout(function(){ window.close(); }, 800);
  } else {
    // Altrimenti vai direttamente alla dashboard
    window.location.href = '/api/app?shop=${shopEnc}&token=${tokenEnc}&host=${host}';
  }
</script>
</body>
</html>`);

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
