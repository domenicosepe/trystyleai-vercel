// api/_token.js — Token offline con scadenza (obbligatori per le app pubbliche nuove)
// Shopify: access token 1h + refresh token (fino a 90 giorni) con rotazione.
// Record in KV `offline:{shop}` = { access_token, expires_at, refresh_token, refresh_expires_at, scope }
const axios = require('axios');
const { kvGet, kvSet, kvDel, kvLock } = require('./_kv');

const API_KEY = process.env.SHOPIFY_API_KEY;
const API_SECRET = process.env.SHOPIFY_API_SECRET;
const SKEW_MS = 2 * 60 * 1000;           // rinnova 2 minuti prima della scadenza
const LOCK_S = 20;                        // lucchetto per evitare exchange/refresh simultanei

function parseRecord(v) {
  if (!v) return null;
  let o = v;
  if (typeof v === 'string') { try { o = JSON.parse(v); } catch (e) { return null; } }
  return o && typeof o === 'object' && o.access_token ? o : null;  // le vecchie stringhe (token senza scadenza) non valgono
}

function toRecord(data) {
  const now = Date.now();
  return {
    access_token: data.access_token,
    expires_at: data.expires_in ? now + data.expires_in * 1000 : null,
    refresh_token: data.refresh_token || null,
    refresh_expires_at: data.refresh_token_expires_in ? now + data.refresh_token_expires_in * 1000 : null,
    scope: data.scope || null
  };
}

function form(obj) {
  return Object.keys(obj).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(obj[k])).join('&');
}

async function postToken(shop, params) {
  const r = await axios.post(`https://${shop}/admin/oauth/access_token`, form(params), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    timeout: 10000
  });
  return r.data;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Exchange di un session token (JWT) per un token offline con scadenza; salva la coppia
async function exchangeOffline(shop, sessionJwt) {
  const lockKey = 'tokenlock:' + shop;
  if (!(await kvLock(lockKey, LOCK_S))) { await sleep(1500); }
  try {
    const data = await postToken(shop, {
      client_id: API_KEY,
      client_secret: API_SECRET,
      grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
      subject_token: sessionJwt,
      subject_token_type: 'urn:ietf:params:oauth:token-type:id_token',
      requested_token_type: 'urn:shopify:params:oauth:token-type:offline-access-token',
      expiring: '1'
    });
    if (!data || !data.access_token) throw new Error('risposta senza access_token');
    const rec = toRecord(data);
    await kvSet('offline:' + shop, JSON.stringify(rec));
    await kvDel('offline_err:' + shop);
    return rec;
  } finally {
    await kvDel(lockKey);
  }
}

async function refresh(shop, rec) {
  const data = await postToken(shop, {
    client_id: API_KEY,
    client_secret: API_SECRET,
    grant_type: 'refresh_token',
    refresh_token: rec.refresh_token
  });
  if (!data || !data.access_token) throw new Error('refresh senza access_token');
  const next = toRecord(data);
  if (!next.refresh_token) { next.refresh_token = rec.refresh_token; next.refresh_expires_at = rec.refresh_expires_at; }
  await kvSet('offline:' + shop, JSON.stringify(next));
  return next;
}

// Token valido per le chiamate Admin API di questo negozio (o null)
async function getShopToken(shop) {
  const now = Date.now();
  let rec = parseRecord(await kvGet('offline:' + shop));

  if (rec && (!rec.expires_at || rec.expires_at - SKEW_MS > now)) return rec.access_token;

  if (rec && rec.refresh_token && (!rec.refresh_expires_at || rec.refresh_expires_at > now)) {
    const lockKey = 'tokenlock:' + shop;
    if (await kvLock(lockKey, LOCK_S)) {
      try {
        rec = await refresh(shop, rec);
        return rec.access_token;
      } catch (e) {
        const msg = (e.response?.status || '') + ' ' + JSON.stringify(e.response?.data || e.message).substring(0, 200);
        console.log('Refresh token offline fallito:', shop, msg);
        await kvSet('offline_err:' + shop, 'refresh: ' + msg);
        // Refresh token ritirato o scaduto: elimina il record, la prossima apertura della dashboard ne crea uno nuovo
        if (e.response && [400, 401].includes(e.response.status)) await kvDel('offline:' + shop);
      } finally {
        await kvDel(lockKey);
      }
    } else {
      // Un'altra richiesta sta rinnovando: aspetta e rileggi
      for (let i = 0; i < 4; i++) {
        await sleep(700);
        const again = parseRecord(await kvGet('offline:' + shop));
        if (again && again.expires_at && again.expires_at - SKEW_MS > Date.now()) return again.access_token;
      }
    }
  }

  // Ripiego: ultimo token online salvato dalla dashboard (dura ~24h)
  return (await kvGet('token:' + shop)) || null;
}

// Stato per diagnosi (nessun token in chiaro)
async function tokenStatus(shop) {
  const rec = parseRecord(await kvGet('offline:' + shop));
  const now = Date.now();
  return {
    offline_token: !!rec,
    offline_expires_in_min: rec && rec.expires_at ? Math.round((rec.expires_at - now) / 60000) : null,
    refresh_expires_in_days: rec && rec.refresh_expires_at ? Math.round((rec.refresh_expires_at - now) / 86400000) : null,
    online_fallback: !!(await kvGet('token:' + shop)),
    last_error: (await kvGet('offline_err:' + shop)) || null
  };
}

// Serve un nuovo exchange? (nessun record, o refresh token in scadenza entro 7 giorni)
async function needsExchange(shop) {
  const rec = parseRecord(await kvGet('offline:' + shop));
  if (!rec || !rec.refresh_token) return true;
  return !!(rec.refresh_expires_at && rec.refresh_expires_at - Date.now() < 7 * 86400000);
}

module.exports = { getShopToken, exchangeOffline, tokenStatus, needsExchange };
