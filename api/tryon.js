// api/tryon.js — Chiama Fashn.ai e gestisce contatori
// Il token del negozio viene letto lato server da KV: il browser non lo vede mai.
const { getShopToken, tokenStatus } = require('./_token');
const axios = require('axios');

const FASHN_API_KEY = process.env.FASHN_API_KEY;
const FASHN_URL = 'https://api.fashn.ai/v1';
const SHOP_RE = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;

function kvDecode(val) {
  // Valori salvati con JSON.stringify ('"shpua_..."', '"{\\"btnText\\":...}"') o vecchio wrapper '["..."]'
  let v = val;
  for (let i = 0; i < 3 && typeof v === 'string'; i++) {
    const c = v.charAt(0);
    if (c !== '"' && c !== '[') break;
    try { const p = JSON.parse(v); v = Array.isArray(p) ? p[0] : p; } catch (e) { break; }
  }
  return v == null ? null : v;
}

async function kvGet(key) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  try {
    const r = await axios.post(url, ['GET', key],
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
    const val = kvDecode(r.data.result || null);
    return val;
  } catch (e) { return null; }
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (e) { return {}; } }
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch (e) { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Status generazione
  if (req.method === 'GET') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'ID mancante' });
    try {
      const r = await axios.get(`${FASHN_URL}/status/${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${FASHN_API_KEY}` }
      });
      return res.json(r.data);
    } catch (err) {
      return res.status(500).json({ error: 'Errore status' });
    }
  }

  if (req.method !== 'POST') return res.status(405).end();

  const body = await readBody(req);
  const shop = String(body.shop || '').toLowerCase();
  const { model_image, garment_image, category } = body;
  if (!SHOP_RE.test(shop) || !model_image || !garment_image) {
    return res.status(400).json({ error: 'Parametri mancanti' });
  }

  const token = (await getShopToken(shop));
  if (!token) return res.status(403).json({ error: 'Servizio non disponibile per questo negozio.' });

  try {
    const meta = await getMetafields(shop, token);

    const subRaw = await kvGet('sub:' + shop);
    let sub = null;
    try { sub = typeof subRaw === 'string' ? JSON.parse(subRaw) : subRaw; } catch (e) {}
    if ((sub && sub.status && sub.status !== 'ACTIVE') || meta.status !== 'active') {
      return res.status(403).json({ error: 'Prova virtuale non disponibile al momento.' });
    }

    const used = parseInt(meta.calls_used || '0', 10);
    const limit = parseInt(meta.calls_limit || '0', 10);
    if (used >= limit) {
      return res.status(429).json({ error: 'Prova virtuale non disponibile al momento.' });
    }

    const fashnRes = await axios.post(`${FASHN_URL}/run`, {
      model_name: 'tryon-v1.6',
      inputs: {
        model_image,
        garment_image,
        category: ['auto', 'tops', 'bottoms', 'one-pieces'].includes(category) ? category : 'auto'
      }
    }, {
      headers: { Authorization: `Bearer ${FASHN_API_KEY}` }
    });

    await updateMetafield(shop, token, 'calls_used', String(used + 1));

    res.json({ id: fashnRes.data.id, status: 'processing' });
  } catch (err) {
    console.error('Tryon error:', err.response?.status, JSON.stringify(err.response?.data || err.message));
    res.status(500).json({ error: 'Errore generazione, riprova.' });
  }
};

async function getMetafields(shop, token) {
  const result = {};
  try {
    const r = await axios.get(`https://${shop}/admin/api/2025-01/metafields.json?namespace=trystyleai`, {
      headers: { 'X-Shopify-Access-Token': token }
    });
    for (const mf of r.data.metafields || []) result[mf.key] = mf.value;
  } catch (e) {
    console.log('tryon getMetafields errore:', e.response?.status);
  }
  return result;
}

async function updateMetafield(shop, token, key, value) {
  try {
    const r = await axios.get(
      `https://${shop}/admin/api/2025-01/metafields.json?namespace=trystyleai&key=${key}`,
      { headers: { 'X-Shopify-Access-Token': token } }
    );
    const mf = r.data.metafields?.[0];
    if (mf) {
      await axios.put(`https://${shop}/admin/api/2025-01/metafields/${mf.id}.json`, {
        metafield: { id: mf.id, value, type: 'single_line_text_field' }
      }, { headers: { 'X-Shopify-Access-Token': token } });
    } else {
      await axios.post(`https://${shop}/admin/api/2025-01/metafields.json`, {
        metafield: { namespace: 'trystyleai', key, value, type: 'single_line_text_field' }
      }, { headers: { 'X-Shopify-Access-Token': token } });
    }
  } catch (e) {
    console.log('tryon updateMetafield errore:', key, e.response?.status);
  }
}
