// api/_kv.js — Helper Upstash KV condivisi (non è un endpoint: prefisso _)
const axios = require('axios');

// Valori salvati con JSON.stringify ('"shpua_..."') o vecchio wrapper '["..."]'
function kvDecode(val) {
  let v = val;
  for (let i = 0; i < 3 && typeof v === 'string'; i++) {
    const c = v.charAt(0);
    if (c !== '"' && c !== '[') break;
    try { const p = JSON.parse(v); v = Array.isArray(p) ? p[0] : p; } catch (e) { break; }
  }
  return v == null ? null : v;
}

async function kvCommand(cmd) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  const r = await axios.post(url, cmd,
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
  return r.data ? r.data.result : null;
}

async function kvGet(key) {
  try { return kvDecode(await kvCommand(['GET', key])); } catch (e) { return null; }
}

async function kvSet(key, value) {
  try { await kvCommand(['SET', key, typeof value === 'string' ? value : JSON.stringify(value)]); return true; }
  catch (e) { console.log('KV set errore:', key, e.response?.data || e.message); return false; }
}

async function kvDel(...keys) {
  if (!keys.length) return 0;
  try { return await kvCommand(['DEL', ...keys]); }
  catch (e) { console.log('KV del errore:', e.response?.data || e.message); return 0; }
}

module.exports = { kvDecode, kvGet, kvSet, kvDel };
