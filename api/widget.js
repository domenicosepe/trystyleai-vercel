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
    return 'auto';
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function injectStyles(cfg) {
    var C = cfg.btnColor, T = cfg.btnTextColor;
    var css = ''
      + '.tsai-btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;margin:10px 0;padding:14px 18px;border:0;border-radius:6px;font:600 15px/1.2 inherit;cursor:pointer;background:' + C + ';color:' + T + ';transition:opacity .2s}'
      + '.tsai-btn:hover{opacity:.88}'
      + '.tsai-btn.tsai-float{position:fixed;right:16px;bottom:16px;width:auto;z-index:99998;box-shadow:0 6px 20px rgba(0,0,0,.2);border-radius:999px}'
      + '.tsai-ov{position:fixed;inset:0;background:rgba(17,17,17,.55);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px}'
      + '.tsai-md{background:#fff;color:#111;border-radius:18px;width:100%;max-width:780px;max-height:94vh;overflow:auto;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;box-shadow:0 24px 60px rgba(0,0,0,.25)}'
      + '.tsai-md,.tsai-md *{box-sizing:border-box}'
      + '.tsai-hd{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 20px;border-bottom:1px solid #eee}'
      + '.tsai-ttl{font-size:17px;font-weight:700;margin:0}'
      + '.tsai-sub{font-size:12px;color:#777;margin-top:2px}'
      + '.tsai-x{width:36px;height:36px;border-radius:50%;border:0;background:#f2f2f2;font-size:22px;line-height:1;cursor:pointer;color:#333;flex:none}'
      + '.tsai-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;padding:20px}'
      + '.tsai-col{min-width:0;display:flex;flex-direction:column}'
      + '.tsai-lbl{font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#888;margin-bottom:8px}'
      + '.tsai-frame{position:relative;width:100%;aspect-ratio:3/4;border-radius:14px;overflow:hidden;background:#f4f4f4}'
      + '.tsai-frame img{width:100%;height:100%;object-fit:cover;display:block}'
      + '.tsai-pname{font-size:14px;font-weight:600;margin-top:10px;line-height:1.35}'
      + '.tsai-empty{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:20px;text-align:center;border:2px dashed #d9d9d9;border-radius:14px}'
      + '.tsai-empty-ic{width:52px;height:52px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.08)}'
      + '.tsai-empty h4{margin:0;font-size:16px;font-weight:700}'
      + '.tsai-empty p{margin:0;font-size:13px;color:#777;line-height:1.4}'
      + '.tsai-acts{display:flex;flex-direction:column;gap:10px;margin-top:14px}'
      + '.tsai-a{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:13px 16px;border-radius:999px;font-weight:600;font-size:15px;cursor:pointer;border:1px solid transparent;text-align:center}'
      + '.tsai-a1{background:' + C + ';color:' + T + '}'
      + '.tsai-a2{background:#fff;color:#111;border-color:#d6d6d6}'
      + '.tsai-a[disabled]{opacity:.45;cursor:default}'
      + '.tsai-a input{display:none}'
      + '.tsai-chg{position:absolute;right:10px;bottom:10px;background:rgba(255,255,255,.92);border:0;border-radius:999px;padding:7px 12px;font-size:12px;font-weight:600;cursor:pointer}'
      + '.tsai-err{background:#fdecea;color:#a61b1b;border-radius:10px;padding:10px 12px;font-size:13px;margin-top:12px}'
      + '.tsai-load{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;background:rgba(255,255,255,.82);text-align:center;padding:16px}'
      + '.tsai-spin{width:40px;height:40px;border:4px solid #e6e6e6;border-top-color:' + C + ';border-radius:50%;animation:tsai-r 1s linear infinite}'
      + '@keyframes tsai-r{to{transform:rotate(360deg)}}'
      + '.tsai-load b{font-size:14px}.tsai-load span{font-size:12px;color:#666}'
      + '.tsai-note{font-size:11px;color:#999;margin-top:12px;text-align:center;line-height:1.4}'
      + '@media (max-width:640px){'
      +   '.tsai-ov{padding:0;align-items:flex-end}'
      +   '.tsai-md{border-radius:18px 18px 0 0;max-height:96vh}'
      +   '.tsai-grid{grid-template-columns:1fr;gap:14px;padding:16px}'
      +   '.tsai-prod{flex-direction:row;align-items:center;gap:12px}'
      +   '.tsai-prod .tsai-lbl{display:none}'
      +   '.tsai-prod .tsai-frame{width:72px;flex:none;border-radius:10px}'
      +   '.tsai-prod .tsai-pname{margin-top:0}'
      +   '.tsai-me .tsai-frame{max-height:46vh}'
      + '}';
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

  function variantId(product) {
    var form = findForm();
    var inp = form && form.querySelector('[name="id"]');
    if (inp && inp.value) return inp.value;
    return product.variants && product.variants[0] && product.variants[0].id;
  }

  function openModal(cfg, product, triggerBtn) {
    var garment = garmentUrl(product);
    var userImg = null;
    var closed = false;
    var CAM = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>';
    var PLUS = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
    var USER = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"/><path d="M5.5 21a6.5 6.5 0 0 1 13 0"/></svg>';

    var ov = document.createElement('div');
    ov.className = 'tsai-ov';
    ov.innerHTML = ''
      + '<div class="tsai-md" role="dialog" aria-modal="true" aria-label="' + esc(cfg.btnText) + '">'
      +   '<div class="tsai-hd"><div><div class="tsai-ttl">' + esc(cfg.btnText) + '</div><div class="tsai-sub">Scopri come ti sta</div></div>'
      +   '<button class="tsai-x" aria-label="Chiudi">&times;</button></div>'
      +   '<div class="tsai-grid">'
      +     '<div class="tsai-col tsai-prod"><div class="tsai-lbl">Il capo</div>'
      +       '<div class="tsai-frame"><img alt="' + esc(product.title) + '" src="' + esc(garment) + '"></div>'
      +       '<div class="tsai-pname">' + esc(product.title) + '</div></div>'
      +     '<div class="tsai-col tsai-me"></div>'
      +   '</div>'
      + '</div>';
    document.body.appendChild(ov);
    var side = ov.querySelector('.tsai-me');

    function close() { closed = true; if (ov.parentNode) ov.parentNode.removeChild(ov); document.removeEventListener('keydown', onKey); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    ov.querySelector('.tsai-x').onclick = close;
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });

    function pickers() {
      return ''
        + '<label class="tsai-a tsai-a1">' + PLUS + (userImg ? 'Cambia foto' : 'Scegli la tua foto') + '<input type="file" accept="image/*" class="tsai-f1"></label>'
        + '<label class="tsai-a tsai-a2">' + CAM + 'Scatta una foto<input type="file" accept="image/*" capture="user" class="tsai-f2"></label>';
    }

    function bindPickers() {
      var inputs = side.querySelectorAll('input[type=file]');
      for (var i = 0; i < inputs.length; i++) {
        inputs[i].onchange = function () {
          if (!this.files || !this.files[0]) return;
          resizeImage(this.files[0], 1024, function (data) {
            if (!data) return stepUpload('Immagine non valida, prova con un\'altra foto.');
            userImg = data;
            stepUpload();
          });
        };
      }
    }

    function stepUpload(err) {
      var frame = userImg
        ? '<div class="tsai-frame"><img alt="La tua foto" src="' + userImg + '"></div>'
        : '<div class="tsai-frame"><div class="tsai-empty"><div class="tsai-empty-ic">' + USER + '</div>'
          + '<h4>Carica la tua foto</h4><p>Foto a figura intera o mezzo busto, frontale e ben illuminata.</p></div></div>';
      side.innerHTML = '<div class="tsai-lbl">La tua foto</div>' + frame
        + (err ? '<div class="tsai-err">' + esc(err) + '</div>' : '')
        + '<div class="tsai-acts">'
        + (userImg ? '<button class="tsai-a tsai-a1 tsai-go">Genera la prova</button>' + pickers().replace('tsai-a tsai-a1', 'tsai-a tsai-a2') : pickers())
        + '</div>'
        + '<div class="tsai-note">La foto viene usata solo per generare l\'anteprima. L\'AI pu\u00f2 commettere errori.</div>';
      bindPickers();
      var go = side.querySelector('.tsai-go');
      if (go) go.onclick = generate;
    }

    function stepLoading() {
      side.innerHTML = '<div class="tsai-lbl">La tua foto</div>'
        + '<div class="tsai-frame"><img alt="" src="' + userImg + '">'
        + '<div class="tsai-load"><div class="tsai-spin"></div><b>Stiamo creando la tua prova\u2026</b><span>Di solito servono 15-40 secondi</span></div></div>'
        + '<div class="tsai-acts"><button class="tsai-a tsai-a1" disabled>Generazione in corso</button></div>';
    }

    function stepResult(url) {
      side.innerHTML = '<div class="tsai-lbl">Ecco come ti sta</div>'
        + '<div class="tsai-frame"><img alt="Risultato prova virtuale" src="' + esc(url) + '"></div>'
        + '<div class="tsai-acts">'
        + '<button class="tsai-a tsai-a1 tsai-cart">Aggiungi al carrello</button>'
        + '<button class="tsai-a tsai-a2 tsai-again">Prova con un\'altra foto</button>'
        + '</div>';
      side.querySelector('.tsai-again').onclick = function () { userImg = null; stepUpload(); };
      side.querySelector('.tsai-cart').onclick = function () {
        var b = this; b.disabled = true; b.textContent = 'Aggiunta\u2026';
        var root = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
        fetch(root + 'cart/add.js', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: [{ id: Number(variantId(product)), quantity: 1 }] })
        }).then(function (r) {
          if (!r.ok) throw new Error();
          b.textContent = 'Aggiunto \u2713';
          setTimeout(function () { location.href = root + 'cart'; }, 700);
        }).catch(function () { b.disabled = false; b.textContent = 'Aggiungi al carrello'; alertSide('Scegli taglia/variante nella pagina e riprova.'); });
      };
    }

    function alertSide(msg) {
      var e = document.createElement('div'); e.className = 'tsai-err'; e.textContent = msg;
      side.appendChild(e);
    }

    function generate() {
      if (!userImg) return;
      stepLoading();
      fetch(APP + '/api/tryon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop: shop, model_image: userImg, garment_image: garment, category: category(product) })
      }).then(function (r) {
        return r.json().then(function (d) { return { ok: r.ok, status: r.status, d: d }; });
      }).then(function (res) {
        if (!res.ok || !res.d.id) {
          if (res.status === 429 || res.status === 403) triggerBtn.style.display = 'none';
          return stepUpload(res.d.error || 'Servizio non disponibile, riprova pi\u00f9 tardi.');
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
          if (d.status === 'failed' || d.error) return stepUpload('Non siamo riusciti a generare l\'immagine. Prova con una foto frontale e ben illuminata.');
          poll(id, n + 1);
        }).catch(function () { poll(id, n + 1); });
      }, 2500);
    }

    stepUpload();
  }
}
