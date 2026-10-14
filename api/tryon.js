// api/tryon.js — Chiama Fashn.ai e gestisce contatori
const axios = require('axios');

const FASHN_API_KEY = process.env.FASHN_API_KEY;
const FASHN_URL = 'https://api.fashn.ai/v1';

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Status generazione
  if (req.method === 'GET') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'ID mancante' });
    try {
      const r = await axios.get(`${FASHN_URL}/status/${id}`, {
        headers: { Authorization: `Bearer ${FASHN_API_KEY}` }
      });
      return res.json(r.data);
    } catch (err) {
      return res.status(500).json({ error: 'Errore status' });
    }
  }

  if (req.method !== 'POST') return res.status(405).end();

  const { shop, model_image, garment_image, category } = req.body;
  if (!shop || !model_image || !garment_image) {
    return res.status(400).json({ error: 'Parametri mancanti' });
  }

  try {
    // Leggi metafield dal negozio
    const meta = await getMetafields(shop, req.body.access_token);

    if (meta.status !== 'active') {
      return res.status(403).json({ error: 'Abbonamento non attivo. Vai su TryStyleAI per abbonarti.' });
    }

    const used = parseInt(meta.calls_used || '0');
    const limit = parseInt(meta.calls_limit || '0');

    if (used >= limit) {
      return res.status(429).json({ error: `Limite generazioni raggiunto (${used}/${limit}). Aggiorna il piano.` });
    }

    // Chiama Fashn.ai
    const fashnRes = await axios.post(`${FASHN_URL}/run`, {
      model_image,
      garment_image,
      category: category || 'tops'
    }, {
      headers: { Authorization: `Bearer ${FASHN_API_KEY}` }
    });

    // Incrementa contatore
    await updateMetafield(shop, req.body.access_token, 'calls_used', String(used + 1));

    res.json({ id: fashnRes.data.id, status: 'processing' });
  } catch (err) {
    console.error('Tryon error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Errore generazione' });
  }
};

async function getMetafields(shop, token) {
  const keys = ['status', 'calls_used', 'calls_limit', 'plan'];
  const result = {};
  try {
    const r = await axios.get(`https://${shop}/admin/api/2024-01/metafields.json?namespace=trystyleai`, {
      headers: { 'X-Shopify-Access-Token': token }
    });
    for (const mf of r.data.metafields || []) {
      result[mf.key] = mf.value;
    }
  } catch (e) {}
  return result;
}

async function updateMetafield(shop, token, key, value) {
  try {
    // Prima trova l'ID del metafield
    const r = await axios.get(
      `https://${shop}/admin/api/2024-01/metafields.json?namespace=trystyleai&key=${key}`,
      { headers: { 'X-Shopify-Access-Token': token } }
    );
    const mf = r.data.metafields?.[0];
    if (mf) {
      await axios.put(`https://${shop}/admin/api/2024-01/metafields/${mf.id}.json`, {
        metafield: { id: mf.id, value, type: 'single_line_text_field' }
      }, { headers: { 'X-Shopify-Access-Token': token } });
    }
  } catch (e) {}
}
