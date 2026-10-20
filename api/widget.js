// api/widget.js — Script del negozio (caricato via ScriptTag) + endpoint config
// GET /api/widget?shop=...              → JavaScript del widget
// GET /api/widget?action=config&shop=... → { active, reason, btnText, btnColor, btnTextColor }
const axios = require('axios');

const APP_URL = process.env.APP_URL || 'https://trystyleai-vercel.vercel.app';
const DEFAULT_CFG = { btnText: 'Prova questo outfit', btnColor: '#7b2ff7', btnTextColor: '#ffffff' };
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

async function getMeta(shop, token) {
  const result = {};
  try {
    const r = await axios.get(`https://${shop}/admin/api/2025-01/metafields.json?namespace=trystyleai`,
      { headers: { 'X-Shopify-Access-Token': token } });
    for (const mf of r.data.metafields || []) result[mf.key] = mf.value;
  } catch (e) {
    console.log('widget getMeta errore:', e.response?.status);
  }
  return result;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const q = req.query || {};

  // ── Config + stato abbonamento ─────────────────────────
  if (q.action === 'config') {
    res.setHeader('Cache-Control', 'no-store');
    const shop = String(q.shop || '').toLowerCase();
    if (!SHOP_RE.test(shop)) return res.status(400).json({ active: false, reason: 'shop' });

    let cfg = { ...DEFAULT_CFG };
    try {
      const raw = await kvGet('config:' + shop);
      if (raw) cfg = { ...cfg, ...(typeof raw === 'string' ? JSON.parse(raw) : raw) };
    } catch (e) {}

    const token = (await kvGet('offline:' + shop)) || (await kvGet('token:' + shop));
    if (!token) return res.json({ active: false, reason: 'token', ...cfg });

    const meta = await getMeta(shop, token);
    const used = parseInt(meta.calls_used || '0', 10);
    const limit = parseInt(meta.calls_limit || '0', 10);
    let reason = null;
    if (meta.status !== 'active') reason = 'inactive';
    else if (used >= limit) reason = 'quota';

    return res.json({ active: !reason, reason, ...cfg });
  }

  // ── Diagnosi (nessun dato sensibile) ───────────────────
  if (q.action === 'diag') {
    res.setHeader('Cache-Control', 'no-store');
    const shop = String(q.shop || '').toLowerCase();
    if (!SHOP_RE.test(shop)) return res.status(400).json({ error: 'shop non valido' });
    const out = { shop, widget_deployed: true, token_in_kv: false };
    const token = (await kvGet('offline:' + shop)) || (await kvGet('token:' + shop));
    out.token_in_kv = !!token;
    out.offline_token = !!(await kvGet('offline:' + shop));
    out.offline_last_error = await kvGet('offline_err:' + shop);
    if (token) {
      const h = { headers: { 'X-Shopify-Access-Token': token } };
      try {
        const r = await axios.get(`https://${shop}/admin/api/2025-01/script_tags.json`, h);
        out.script_tags = (r.data.script_tags || []).map(t => t.src);
      } catch (e) { out.script_tags_error = e.response?.status || e.message; }
      // ?fix=1 → prova a registrare lo script e mostra l'errore esatto di Shopify
      if (q.fix === '1' && Array.isArray(out.script_tags) && !out.script_tags.some(s => (s || '').split('?')[0] === APP_URL + '/api/widget')) {
        try {
          const c = await axios.post(`https://${shop}/admin/api/2025-01/script_tags.json`,
            { script_tag: { event: 'onload', src: APP_URL + '/api/widget' } }, h);
          out.fix_result = 'creato';
          out.script_tags.push(c.data.script_tag && c.data.script_tag.src);
        } catch (e) {
          out.fix_result = 'errore';
          out.fix_status = e.response?.status || null;
          out.fix_error = e.response?.data || e.message;
        }
      }
      try {
        const r2 = await axios.get(`https://${shop}/admin/oauth/access_scopes.json`, h);
        out.granted_scopes = (r2.data.access_scopes || []).map(s => s.handle);
      } catch (e) { out.granted_scopes_error = e.response?.status || e.message; }
      const meta = await getMeta(shop, token);
      out.plan = meta.plan || null;
      out.status = meta.status || null;
      out.calls_used = meta.calls_used || null;
      out.calls_limit = meta.calls_limit || null;
    }
    return res.json(out);
  }

  // ── Script widget ──────────────────────────────────────
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  const shopParam = SHOP_RE.test(String(q.shop || '')) ? q.shop : '';
  res.status(200).send(
    '(' + widgetMain.toString() + ')(' + JSON.stringify(APP_URL) + ',' + JSON.stringify(shopParam) + ');'
  );
};

// ─────────────────────────────────────────────────────────
// Codice eseguito nel browser del cliente (serializzato con toString)
// ES5 per compatibilità con tutti i temi/browser
// ─────────────────────────────────────────────────────────
function widgetMain(APP, SHOP_PARAM) {
  if (window.__trystyleai) return;
  window.__trystyleai = true;

  var shop = (window.Shopify && window.Shopify.shop) || SHOP_PARAM;
  if (!shop) return;

  var match = location.pathname.match(/\/products\/([^\/?#]+)/);
  if (!match) return;
  var handle = match[1];
  var root = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';

  function getJSON(url) {
    return fetch(url, { credentials: 'omit' }).then(function (r) { return r.json(); });
  }

  Promise.all([
    getJSON(APP + '/api/widget?action=config&shop=' + encodeURIComponent(shop)),
    fetch(root + 'products/' + handle + '.js').then(function (r) { return r.json(); })
  ]).then(function (res) {
    var cfg = res[0], product = res[1];
    if (!cfg || !cfg.active || !product) return;
    mount(cfg, product);
  }).catch(function () {});

  function garmentUrl(product) {
    var src = product.featured_image || (product.images && product.images[0]) || '';
    if (src.indexOf('//') === 0) src = 'https:' + src;
    return src;
  }

  function category(product) {
    var t = ((product.type || '') + ' ' + (product.title || '') + ' ' + (product.tags || []).join(' ')).toLowerCase();
    if (/(abito|vestit|dress|tuta|jumpsuit|salopette|completo)/.test(t)) return 'one-pieces';
    if (/(pantalon|jeans|gonna|short|bermuda|leggings|pants|trouser|skirt|jogger)/.test(t)) return 'bottoms';
    return 'tops';
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function injectStyles(cfg) {
    var css = ''
      + '.tsai-btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;margin:10px 0;padding:14px 18px;border:0;border-radius:6px;font:600 15px/1.2 inherit;cursor:pointer;background:' + cfg.btnColor + ';color:' + cfg.btnTextColor + ';transition:opacity .2s}'
      + '.tsai-btn:hover{opacity:.88}'
      + '.tsai-btn.tsai-float{position:fixed;right:16px;bottom:16px;width:auto;z-index:99998;box-shadow:0 6px 20px rgba(0,0,0,.2);border-radius:999px}'
      + '.tsai-ov{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px}'
      + '.tsai-md{background:#fff;color:#111;border-radius:14px;width:100%;max-width:440px;max-height:92vh;overflow:auto;padding:22px;position:relative;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}'
      + '.tsai-x{position:absolute;top:10px;right:12px;background:none;border:0;font-size:26px;line-height:1;cursor:pointer;color:#666}'
      + '.tsai-h{font-size:18px;font-weight:700;margin:0 0 4px}'
      + '.tsai-p{font-size:13px;color:#666;margin:0 0 16px;line-height:1.45}'
      + '.tsai-drop{display:block;border:2px dashed #ccc;border-radius:10px;padding:28px 14px;text-align:center;cursor:pointer;font-size:14px;color:#444}'
      + '.tsai-drop:hover{border-color:' + cfg.btnColor + '}'
      + '.tsai-row{display:flex;gap:10px;margin-bottom:14px}'
      + '.tsai-row img{flex:1;min-width:0;width:50%;aspect-ratio:3/4;object-fit:cover;border-radius:8px;background:#f2f2f2}'
      + '.tsai-res{width:100%;border-radius:10px;display:block;margin-bottom:14px}'
      + '.tsai-go{width:100%;padding:13px;border:0;border-radius:8px;font-weight:600;font-size:15px;cursor:pointer;background:' + cfg.btnColor + ';color:' + cfg.btnTextColor + '}'
      + '.tsai-go[disabled]{opacity:.5;cursor:default}'
      + '.tsai-link{display:block;margin:10px auto 0;background:none;border:0;color:#555;text-decoration:underline;cursor:pointer;font-size:13px}'
      + '.tsai-err{background:#fdecea;color:#a61b1b;border-radius:8px;padding:10px 12px;font-size:13px;margin-bottom:12px}'
      + '.tsai-spin{width:38px;height:38px;border:4px solid #eee;border-top-color:' + cfg.btnColor + ';border-radius:50%;margin:24px auto 14px;animation:tsai-r 1s linear infinite}'
      + '@keyframes tsai-r{to{transform:rotate(360deg)}}'
      + '.tsai-c{text-align:center;font-size:14px;color:#444;margin-bottom:10px}'
      + '.tsai-note{font-size:11px;color:#999;margin-top:12px;text-align:center}';
    var st = document.createElement('style');
    st.textContent = css;
    document.head.appendChild(st);
  }

  function findForm() {
    var forms = document.querySelectorAll('form[action*="/cart/add"]');
    for (var i = 0; i < forms.length; i++) {
      var f = forms[i];
      if (f.closest('[id*="quick"],[class*="quick"],[class*="drawer"],cart-drawer')) continue;
      if (f.offsetParent !== null) return f;
    }
    return forms[0] || null;
  }

  function mount(cfg, product) {
    injectStyles(cfg);
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tsai-btn';
    btn.textContent = cfg.btnText;
    btn.addEventListener('click', function (e) { e.preventDefault(); openModal(cfg, product, btn); });

    var anchor = document.querySelector('.trystyleai-anchor');
    var form = findForm();
    if (anchor) anchor.appendChild(btn);
    else if (form) form.parentNode.insertBefore(btn, form.nextSibling);
    else { btn.className += ' tsai-float'; document.body.appendChild(btn); }
  }

  function resizeImage(file, max, cb) {
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () {
        var w = img.width, h = img.height, s = Math.min(1, max / Math.max(w, h));
        var c = document.createElement('canvas');
        c.width = Math.round(w * s); c.height = Math.round(h * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        cb(c.toDataURL('image/jpeg', 0.88));
      };
      img.onerror = function () { cb(null); };
      img.src = reader.result;
    };
    reader.onerror = function () { cb(null); };
    reader.readAsDataURL(file);
  }

  function openModal(cfg, product, triggerBtn) {
    var garment = garmentUrl(product);
    var userImg = null;
    var ov = document.createElement('div');
    ov.className = 'tsai-ov';
    ov.innerHTML = '<div class="tsai-md" role="dialog" aria-modal="true"><button class="tsai-x" aria-label="Chiudi">&times;</button><div class="tsai-body"></div></div>';
    document.body.appendChild(ov);
    var body = ov.querySelector('.tsai-body');
    var closed = false;

    function close() { closed = true; if (ov.parentNode) ov.parentNode.removeChild(ov); }
    ov.querySelector('.tsai-x').onclick = close;
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });

    function stepUpload(err) {
      body.innerHTML = ''
        + '<div class="tsai-h">' + esc(cfg.btnText) + '</div>'
        + '<p class="tsai-p">Carica una tua foto a figura intera, frontale e ben illuminata. Vedrai come ti sta <b>' + esc(product.title) + '</b>.</p>'
        + (err ? '<div class="tsai-err">' + esc(err) + '</div>' : '')
        + '<div class="tsai-row"><img alt="Prodotto" src="' + esc(garment) + '"><img alt="La tua foto" class="tsai-me" style="display:none"></div>'
        + '<label class="tsai-drop">Scegli o scatta una foto<input type="file" accept="image/*" hidden></label>'
        + '<button class="tsai-go" disabled style="margin-top:14px">Genera prova</button>'
        + '<div class="tsai-note">La foto viene usata solo per generare l\'anteprima.</div>';
      var input = body.querySelector('input');
      var me = body.querySelector('.tsai-me');
      var go = body.querySelector('.tsai-go');
      input.onchange = function () {
        if (!input.files || !input.files[0]) return;
        resizeImage(input.files[0], 1024, function (data) {
          if (!data) return stepUpload('Immagine non valida, prova con un\'altra foto.');
          userImg = data;
          me.src = data; me.style.display = '';
          go.disabled = false;
        });
      };
      go.onclick = function () { if (userImg) generate(); };
    }

    function stepLoading(msg) {
      body.innerHTML = '<div class="tsai-spin"></div><div class="tsai-c">' + esc(msg) + '</div><p class="tsai-p" style="text-align:center">Di solito servono 15-40 secondi.</p>';
    }

    function stepResult(url) {
      body.innerHTML = '<div class="tsai-h">Ecco come ti sta</div><p class="tsai-p">' + esc(product.title) + '</p>'
        + '<img class="tsai-res" alt="Risultato prova virtuale" src="' + esc(url) + '">'
        + '<button class="tsai-go">Continua lo shopping</button>'
        + '<button class="tsai-link">Prova con un\'altra foto</button>';
      body.querySelector('.tsai-go').onclick = close;
      body.querySelector('.tsai-link').onclick = function () { userImg = null; stepUpload(); };
    }

    function generate() {
      stepLoading('Stiamo creando la tua prova...');
      fetch(APP + '/api/tryon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop: shop, model_image: userImg, garment_image: garment, category: category(product) })
      }).then(function (r) {
        return r.json().then(function (d) { return { ok: r.ok, status: r.status, d: d }; });
      }).then(function (res) {
        if (!res.ok || !res.d.id) {
          if (res.status === 429 || res.status === 403) triggerBtn.style.display = 'none';
          return stepUpload(res.d.error || 'Servizio non disponibile, riprova più tardi.');
        }
        poll(res.d.id, 0);
      }).catch(function () { stepUpload('Errore di rete, riprova.'); });
    }

    function poll(id, n) {
      if (closed) return;
      if (n > 45) return stepUpload('La generazione sta impiegando troppo tempo, riprova.');
      setTimeout(function () {
        if (closed) return;
        getJSON(APP + '/api/tryon?id=' + encodeURIComponent(id)).then(function (d) {
          if (d.status === 'completed' && d.output && d.output[0]) return stepResult(d.output[0]);
          if (d.status === 'failed' || d.error) return stepUpload('Non siamo riusciti a generare l\'immagine. Prova con una foto frontale a figura intera.');
          poll(id, n + 1);
        }).catch(function () { poll(id, n + 1); });
      }, 2500);
    }

    stepUpload();
  }
}
