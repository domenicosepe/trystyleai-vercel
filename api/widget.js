// api/widget.js — Script del negozio (caricato via ScriptTag) + endpoint config
// GET /api/widget?shop=...              → JavaScript del widget
// GET /api/widget?action=config&shop=... → { active, reason, btnText, btnColor, btnTextColor }
const axios = require('axios');
const { parseStored } = require('./_config');

const APP_URL = process.env.APP_URL || 'https://trystyleai-vercel.vercel.app';
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

function parseSub(v) {
  if (!v) return null;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch (e) { return null; }
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

    const cfg = parseStored(await kvGet('config:' + shop));

    const token = (await kvGet('offline:' + shop)) || (await kvGet('token:' + shop));
    if (!token) return res.json({ active: false, reason: 'token', ...cfg });

    const meta = await getMeta(shop, token);
    const used = parseInt(meta.calls_used || '0', 10);
    const limit = parseInt(meta.calls_limit || '0', 10);
    let reason = null;
    const sub = parseSub(await kvGet('sub:' + shop));
    if (sub && sub.status && sub.status !== 'ACTIVE') reason = 'inactive';
    else if (meta.status !== 'active') reason = 'inactive';
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
    var C = cfg.btnColor, T = cfg.btnTextColor, A = cfg.accentColor || '#c9a24a';
    var B = cfg.btnBorderColor || '#d4d4d4', R = (cfg.btnRadius == null ? 4 : cfg.btnRadius) + 'px';
    var P = cfg.primaryColor || '#111111', PT = cfg.primaryTextColor || '#ffffff';
    var MR = (cfg.modalRadius == null ? 8 : cfg.modalRadius) + 'px';
    var FR = Math.min(cfg.modalRadius == null ? 8 : cfg.modalRadius, 12) + 'px';
    var F = 'inherit';
    if (cfg.font && cfg.font !== 'theme') {
      F = '"' + cfg.font + '",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
      var lk = document.createElement('link');
      lk.rel = 'stylesheet';
      lk.href = 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(cfg.font).replace(/%20/g, '+') + ':wght@400;500;600;700&display=swap';
      document.head.appendChild(lk);
    }
    var css = ''
      + '.tsai-btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;margin:12px 0;padding:15px 18px;border:1px solid ' + B + ';border-radius:' + R + ';font-family:' + F + ';font-size:15px;font-weight:600;letter-spacing:.01em;cursor:pointer;background:' + C + ';color:' + T + ';transition:opacity .2s}'
      + '.tsai-btn:hover{opacity:.88}'
      + '.tsai-btn svg{flex:none}'
      + '.tsai-btn.tsai-float{position:fixed;right:16px;bottom:16px;width:auto;z-index:99998;box-shadow:0 6px 20px rgba(0,0,0,.2);border-radius:999px}'
      + '.tsai-ov{position:fixed;inset:0;background:rgba(17,17,17,.5);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px}'
      + '.tsai-md,.tsai-md *{box-sizing:border-box}'
      + '.tsai-md{position:relative;background:#fff;color:#111;border-radius:' + MR + ';width:100%;max-width:620px;max-height:94vh;overflow:auto;padding:26px 28px 24px;font-family:' + F + ';box-shadow:0 24px 60px rgba(0,0,0,.25)}'
      + '.tsai-x{position:absolute;top:16px;right:16px;width:34px;height:34px;border:0;background:none;font-size:26px;line-height:1;cursor:pointer;color:#333}'
      + '.tsai-ttl{font-size:21px;font-weight:700;margin:0 40px 16px 0;line-height:1.2}'
      + '.tsai-steps{display:flex;gap:18px;margin-bottom:22px}'
      + '.tsai-st{display:flex;flex-direction:column;align-items:center;gap:6px;font-size:11px;color:#9a9a9a;text-align:center;min-width:58px}'
      + '.tsai-st i{font-style:normal;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;background:#ececec;color:#8a8a8a}'
      + '.tsai-st.on{color:#111;font-weight:600}.tsai-st.on i,.tsai-st.done i{background:' + A + ';color:#fff}'
      + '.tsai-st.done{color:#555}'
      + '.tsai-pair{display:grid;grid-template-columns:1fr 28px 1fr;align-items:center;gap:6px}'
      + '.tsai-cell{min-width:0}'
      + '.tsai-lbl{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#555;text-align:center;margin-bottom:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
      + '.tsai-frame{position:relative;width:100%;aspect-ratio:3/4;border-radius:' + FR + ';overflow:hidden;background:#f3f3f3}'
      + '.tsai-frame img{width:100%;height:100%;object-fit:cover;display:block}'
      + '.tsai-arrow{color:' + A + ';text-align:center;font-size:20px;padding-top:18px}'
      + '.tsai-empty{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:14px;text-align:center;border:1.5px dashed #cfcfcf;border-radius:' + FR + '}'
      + '.tsai-empty p{margin:0;font-size:12px;color:#777;line-height:1.4}'
      + '.tsai-pick{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:11px 10px;border-radius:' + R + ';font-size:13px;font-weight:600;cursor:pointer;border:1px solid ' + P + ';font-family:inherit;text-align:center}'
      + '.tsai-pick input{display:none}'
      + '.tsai-pick.p1{background:' + P + ';color:' + PT + '}.tsai-pick.p2{background:#fff;color:' + P + '}'
      + '.tsai-chg{position:absolute;left:50%;bottom:10px;transform:translateX(-50%);background:rgba(255,255,255,.94);border:0;border-radius:999px;padding:7px 14px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;font-family:inherit;color:#111}'
      + '.tsai-chg input{display:none}'
      + '.tsai-note{font-size:12px;color:#888;text-align:center;margin:16px 0 0;line-height:1.45}'
      + '.tsai-acts{display:flex;flex-direction:column;gap:10px;margin-top:16px}'
      + '.tsai-a{display:block;width:100%;padding:14px 16px;border-radius:' + R + ';font-family:inherit;font-weight:600;font-size:15px;cursor:pointer;border:1px solid ' + P + ';text-align:center}'
      + '.tsai-a1{background:' + P + ';color:' + PT + '}.tsai-a2{background:#fff;color:#111;border-color:#cfcfcf}'
      + '.tsai-a[disabled]{opacity:.45;cursor:default}'
      + '.tsai-err{background:#fdecea;color:#a61b1b;border-radius:4px;padding:10px 12px;font-size:13px;margin-top:14px}'
      + '.tsai-load{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;background:#f6f4ef;text-align:center;padding:12px}'
      + '.tsai-spin{width:36px;height:36px;border:3px solid #e4e0d6;border-top-color:' + A + ';border-radius:50%;animation:tsai-r 1s linear infinite}'
      + '@keyframes tsai-r{to{transform:rotate(360deg)}}'
      + '.tsai-load b{font-size:13px}.tsai-load span{font-size:11px;color:#777}'
      + '@media (max-width:560px){'
      +   '.tsai-ov{padding:0;align-items:flex-end}'
      +   '.tsai-md{border-radius:14px 14px 0 0;max-height:96vh;padding:20px 16px 18px}'
      +   '.tsai-ttl{font-size:18px}'
      +   '.tsai-steps{gap:10px;margin-bottom:16px}'
      +   '.tsai-pair{grid-template-columns:1fr 18px 1fr;gap:4px}'
      +   '.tsai-arrow{font-size:16px}'
      +   '.tsai-pick{font-size:12px;padding:10px 6px}'
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
    btn.innerHTML = (cfg.showIcon === false ? '' : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="7" r="4"/><path d="M5.5 21a6.5 6.5 0 0 1 13 0"/></svg>') + '<span></span>';
    btn.querySelector('span').textContent = cfg.btnText;
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
    var CAM = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>';
    var UP = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/></svg>';
    var USER = '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#9a9a9a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"/><path d="M5.5 21a6.5 6.5 0 0 1 13 0"/></svg>';
    var STEPS = ['La tua foto', 'Elaborazione', 'Risultato'];

    var ov = document.createElement('div');
    ov.className = 'tsai-ov';
    ov.innerHTML = '<div class="tsai-md" role="dialog" aria-modal="true" aria-label="' + esc(cfg.btnText) + '">'
      + '<button class="tsai-x" aria-label="Chiudi">&times;</button>'
      + '<div class="tsai-ttl">' + esc(cfg.btnText) + '</div>'
      + '<div class="tsai-steps"></div><div class="tsai-body"></div></div>';
    document.body.appendChild(ov);
    var stepsEl = ov.querySelector('.tsai-steps');
    var body = ov.querySelector('.tsai-body');

    function close() { closed = true; if (ov.parentNode) ov.parentNode.removeChild(ov); document.removeEventListener('keydown', onKey); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    ov.querySelector('.tsai-x').onclick = close;
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });

    function setStep(n) {
      var h = '';
      for (var i = 0; i < 3; i++) {
        var cls = i + 1 < n ? 'done' : (i + 1 === n ? 'on' : '');
        if (n === 3 && i === 2) cls = 'on done';
        h += '<div class="tsai-st ' + cls + '"><i>' + (i + 1) + '</i>' + STEPS[i] + '</div>';
      }
      stepsEl.innerHTML = h;
    }

    function cell(label, inner) {
      return '<div class="tsai-cell"><div class="tsai-lbl">' + esc(label) + '</div>' + inner + '</div>';
    }
    var ARROW = '<div class="tsai-arrow">&rarr;</div>';
    var withLabel = 'Con ' + product.title;

    function bindFiles() {
      var inputs = body.querySelectorAll('input[type=file]');
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
      setStep(1);
      var mine = userImg
        ? '<div class="tsai-frame"><img alt="La tua foto" src="' + userImg + '"><label class="tsai-chg">Cambia foto<input type="file" accept="image/*"></label></div>'
        : '<div class="tsai-frame"><div class="tsai-empty">' + USER + '<p>Foto frontale, a figura intera o mezzo busto, ben illuminata</p>'
          + '<label class="tsai-pick p1">' + UP + 'Carica foto<input type="file" accept="image/*"></label>'
          + '<label class="tsai-pick p2">' + CAM + 'Scatta foto<input type="file" accept="image/*" capture="user"></label>'
          + '</div></div>';
      body.innerHTML = '<div class="tsai-pair">'
        + cell('Il capo', '<div class="tsai-frame"><img alt="' + esc(product.title) + '" src="' + esc(garment) + '"></div>')
        + ARROW
        + cell('Tu', mine)
        + '</div>'
        + (err ? '<div class="tsai-err">' + esc(err) + '</div>' : '')
        + '<div class="tsai-acts"><button class="tsai-a tsai-a1 tsai-go"' + (userImg ? '' : ' disabled') + '>Provalo ora</button></div>'
        + '<p class="tsai-note">La foto viene usata solo per generare l\'anteprima.</p>';
      bindFiles();
      body.querySelector('.tsai-go').onclick = generate;
    }

    function stepLoading() {
      setStep(2);
      body.innerHTML = '<div class="tsai-pair">'
        + cell('Tu', '<div class="tsai-frame"><img alt="La tua foto" src="' + userImg + '"></div>')
        + ARROW
        + cell(withLabel, '<div class="tsai-frame"><div class="tsai-load"><div class="tsai-spin"></div><b>Elaborazione in corso</b><span>Di solito servono 15-40 secondi</span></div></div>')
        + '</div>'
        + '<p class="tsai-note">Non chiudere questa finestra.</p>';
    }

    function stepResult(url) {
      setStep(3);
      body.innerHTML = '<div class="tsai-pair">'
        + cell('Tu', '<div class="tsai-frame"><img alt="La tua foto" src="' + userImg + '"></div>')
        + ARROW
        + cell(withLabel, '<div class="tsai-frame"><img alt="Risultato prova virtuale" src="' + esc(url) + '"></div>')
        + '</div>'
        + '<p class="tsai-note">Risultato generato dall\'AI: colori e proporzioni potrebbero variare leggermente dal prodotto reale.</p>'
        + '<div class="tsai-acts">'
        + '<button class="tsai-a tsai-a2 tsai-again">Prova un\'altra foto</button>'
        + '<button class="tsai-a tsai-a1 tsai-cart">Aggiungi al carrello</button>'
        + '</div>';
      body.querySelector('.tsai-again').onclick = function () { userImg = null; stepUpload(); };
      body.querySelector('.tsai-cart').onclick = function () {
        var b = this; b.disabled = true; b.textContent = 'Aggiunta\u2026';
        var root = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
        fetch(root + 'cart/add.js', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: [{ id: Number(variantId(product)), quantity: 1 }] })
        }).then(function (r) {
          if (!r.ok) throw new Error();
          b.textContent = 'Aggiunto al carrello \u2713';
          setTimeout(function () { location.href = root + 'cart'; }, 700);
        }).catch(function () {
          b.disabled = false; b.textContent = 'Aggiungi al carrello';
          var e = document.createElement('div'); e.className = 'tsai-err';
          e.textContent = 'Scegli taglia o variante nella pagina e riprova.';
          body.appendChild(e);
        });
      };
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
