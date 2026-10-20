// api/app.js — Pagina admin embedded TryStyleAI (stile Shopify Polaris)
// Il codice del browser è la funzione dashboardMain, serializzata con toString():
// niente template literal annidati, niente problemi di apici.
const { FONTS, DEFAULTS } = require('./_config');

module.exports = (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Security-Policy', "frame-ancestors https://*.myshopify.com https://admin.shopify.com");

  // Client ID pubblico dell'app (letto da env, non hardcoded)
  const apiKey = String(process.env.SHOPIFY_API_KEY || '').replace(/[^a-zA-Z0-9]/g, '');
  const boot = { apiKey, fonts: FONTS, defaults: DEFAULTS };

  const html = '<!DOCTYPE html>\n<html lang="it">\n<head>\n'
    + '<meta charset="UTF-8">\n'
    + '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
    + '<meta name="shopify-api-key" content="' + apiKey + '">\n'
    + '<title>TryStyleAI</title>\n'
    + '<script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>\n'
    + '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
    + '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">\n'
    + '<style>' + CSS + '</style>\n'
    + '</head>\n<body>\n'
    + '<div class="page">'
    +   '<header class="top">'
    +     '<div class="brand"><div class="mark">T</div><div><div class="brand-name">TryStyleAI</div><div class="brand-sub" id="shop-name"></div></div></div>'
    +     '<div id="plan-badge"></div>'
    +   '</header>'
    +   '<nav class="tabs" role="tablist">'
    +     '<button class="tab on" data-tab="overview" role="tab">Panoramica</button>'
    +     '<button class="tab" data-tab="customize" role="tab">Personalizza</button>'
    +     '<button class="tab" data-tab="plans" role="tab">Piani</button>'
    +   '</nav>'
    +   '<main>'
    +     '<section class="panel on" id="panel-overview"><div class="skeleton"><div></div><div></div><div></div></div></section>'
    +     '<section class="panel" id="panel-customize"></section>'
    +     '<section class="panel" id="panel-plans"></section>'
    +   '</main>'
    +   '<footer class="foot">TryStyleAI &middot; Prova virtuale con AI per Shopify</footer>'
    + '</div>\n'
    + '<script>(' + dashboardMain.toString() + ')(' + JSON.stringify(boot).replace(/</g, '\\u003c') + ');</script>\n'
    + '</body>\n</html>';

  res.status(200).send(html);
};

// ─────────────────────────────────────────────────────────
// CSS — token in stile Polaris, nessun colore di brand forte
// ─────────────────────────────────────────────────────────
const CSS = `
:root{
  --bg:#f1f1f1; --surface:#ffffff; --surface-2:#f7f7f7; --border:#e3e3e3; --border-strong:#cccccc;
  --text:#303030; --text-2:#616161; --text-3:#8a8a8a;
  --primary:#303030; --primary-hover:#1a1a1a; --on-primary:#ffffff;
  --success:#0c5132; --success-bg:#cdfee1; --warning:#5e4200; --warning-bg:#ffef9d;
  --critical:#8e1f0b; --critical-bg:#fedad9; --info-bg:#eaf4ff; --info:#00527c;
  --radius:12px; --radius-sm:8px;
  --shadow:0 1px 0 rgba(26,26,26,.07), 0 0 0 1px rgba(26,26,26,.06);
}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--text);font:400 13px/1.5 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased}
button,input,select{font:inherit;color:inherit}
.page{max-width:1080px;margin:0 auto;padding:20px 20px 32px}
.top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}
.brand{display:flex;align-items:center;gap:10px;min-width:0}
.mark{width:32px;height:32px;border-radius:8px;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px;flex:none}
.brand-name{font-size:16px;font-weight:650;line-height:1.2}
.brand-sub{font-size:12px;color:var(--text-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.badge{display:inline-flex;align-items:center;gap:6px;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:550;background:#e3e3e3;color:var(--text);white-space:nowrap}
.badge.ok{background:var(--success-bg);color:var(--success)}
.badge.warn{background:var(--warning-bg);color:var(--warning)}
.badge .dot{width:6px;height:6px;border-radius:50%;background:currentColor}
.tabs{display:flex;gap:4px;border-bottom:1px solid var(--border);margin-bottom:20px;overflow-x:auto}
.tab{background:none;border:0;padding:10px 12px;font-weight:550;color:var(--text-2);cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;white-space:nowrap}
.tab:hover{color:var(--text)}
.tab.on{color:var(--text);border-bottom-color:var(--primary)}
.panel{display:none}.panel.on{display:block}
.grid{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:16px;align-items:start}
.stack{display:flex;flex-direction:column;gap:16px;min-width:0}
.card{background:var(--surface);border-radius:var(--radius);box-shadow:var(--shadow);padding:16px;min-width:0}
.card-h{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
.card-t{font-size:14px;font-weight:650}
.muted{color:var(--text-2)}
.subtle{color:var(--text-3);font-size:12px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:7px 12px;border-radius:var(--radius-sm);font-weight:600;font-size:13px;cursor:pointer;border:0;text-decoration:none;white-space:nowrap;transition:background .15s}
.btn-primary{background:var(--primary);color:var(--on-primary);box-shadow:inset 0 -1px 0 rgba(0,0,0,.3)}
.btn-primary:hover{background:var(--primary-hover)}
.btn-secondary{background:var(--surface);color:var(--text);box-shadow:0 0 0 1px var(--border-strong) inset}
.btn-secondary:hover{background:var(--surface-2)}
.btn-plain{background:none;color:var(--text);padding:7px 8px;text-decoration:underline}
.btn[disabled]{opacity:.5;cursor:default}
.btn-block{width:100%}
.banner{display:flex;gap:12px;align-items:flex-start;border-radius:var(--radius);padding:12px 14px;margin-bottom:16px;box-shadow:var(--shadow)}
.banner p{flex:1;min-width:0}
.banner b{display:block;margin-bottom:2px}
.banner.info{background:var(--info-bg);color:var(--info)}
.banner.warn{background:var(--warning-bg);color:var(--warning)}
.banner.crit{background:var(--critical-bg);color:var(--critical)}
.banner.ok{background:var(--success-bg);color:var(--success)}
.banner .btn{flex:none}
.usage-num{font-size:30px;font-weight:650;letter-spacing:-.02em;line-height:1.1}
.usage-num span{font-size:14px;font-weight:500;color:var(--text-2);letter-spacing:0}
.bar{height:8px;border-radius:999px;background:#ebebeb;overflow:hidden;margin:14px 0 8px}
.bar i{display:block;height:100%;background:var(--primary);border-radius:999px;transition:width .4s}
.bar i.warn{background:#e5a000}.bar i.crit{background:#d72c0d}
.row{display:flex;justify-content:space-between;gap:12px}
.kv{display:flex;flex-direction:column;gap:10px}
.kv div{display:flex;justify-content:space-between;gap:12px}
.kv dt{color:var(--text-2)}.kv dd{font-weight:550;text-align:right}
.steps{display:flex;flex-direction:column}
.step{display:flex;gap:12px;align-items:flex-start;padding:12px 0;border-top:1px solid var(--border)}
.step:first-child{border-top:0;padding-top:0}
.step-ic{width:22px;height:22px;border-radius:50%;border:1.5px dashed var(--border-strong);flex:none;display:flex;align-items:center;justify-content:center;margin-top:1px}
.step.done .step-ic{border:0;background:var(--primary);color:#fff}
.step-b{flex:1;min-width:0}
.step-t{font-weight:600}
.step.done .step-t{color:var(--text-2)}
.step-d{color:var(--text-2);margin:2px 0 8px}
.plans{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.plan{display:flex;flex-direction:column;gap:12px}
.plan.current{box-shadow:0 0 0 2px var(--primary)}
.plan-top{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:22px}
.plan-n{font-size:14px;font-weight:650}
.price{font-size:26px;font-weight:650;letter-spacing:-.02em}
.price span{font-size:13px;font-weight:500;color:var(--text-2);letter-spacing:0}
.feat{list-style:none;display:flex;flex-direction:column;gap:8px;flex:1}
.feat li{display:flex;gap:8px;align-items:flex-start}
.feat svg{flex:none;margin-top:2px}
.note-c{text-align:center;margin-top:16px}
.form{display:flex;flex-direction:column;gap:14px}
.f-label{display:block;font-weight:550;margin-bottom:6px}
.f-help{color:var(--text-3);font-size:12px;margin-top:4px}
.input,.select{width:100%;padding:7px 10px;border-radius:var(--radius-sm);border:1px solid var(--border-strong);background:#fff;min-height:34px}
.input:focus,.select:focus{outline:2px solid #005bd3;outline-offset:1px;border-color:transparent}
.two{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.color{display:flex;align-items:center;gap:8px;border:1px solid var(--border-strong);border-radius:var(--radius-sm);padding:3px 8px 3px 3px;background:#fff}
.color input[type=color]{width:28px;height:28px;border:0;padding:0;background:none;cursor:pointer;flex:none;border-radius:6px}
.color input[type=color]::-webkit-color-swatch-wrapper{padding:0}
.color input[type=color]::-webkit-color-swatch{border:1px solid rgba(0,0,0,.12);border-radius:6px}
.color input[type=text]{border:0;outline:0;width:100%;min-width:0;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;text-transform:uppercase}
.range{display:flex;align-items:center;gap:10px}
.range input{flex:1;accent-color:var(--primary)}
.range output{width:40px;text-align:right;color:var(--text-2);font-variant-numeric:tabular-nums}
.check{display:flex;align-items:center;gap:8px;cursor:pointer}
.check input{width:16px;height:16px;accent-color:var(--primary)}
.sec-t{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--text-2);margin:4px 0 -2px}
.sticky{position:sticky;top:12px}
.pv-stage{background:var(--surface-2);border-radius:var(--radius-sm);padding:16px;display:flex;flex-direction:column;gap:14px}
.pv-prod{background:#fff;border-radius:6px;padding:12px;box-shadow:0 0 0 1px var(--border)}
.pv-line{height:8px;border-radius:4px;background:#e6e6e6;margin-bottom:6px}
.pv-cart{height:38px;border-radius:4px;background:#1f1f1f;margin-top:10px}
.pv-trigger{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:11px 12px;margin-top:8px;font-size:13px;font-weight:600;border:1px solid}
.pv-modal{background:#fff;padding:14px;box-shadow:0 8px 24px rgba(0,0,0,.12)}
.pv-title{font-size:14px;font-weight:700;margin-bottom:10px}
.pv-steps{display:flex;gap:10px;margin-bottom:10px}
.pv-steps span{display:flex;align-items:center;gap:5px;font-size:10px;color:#8a8a8a}
.pv-steps i{font-style:normal;width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;background:#ececec;color:#8a8a8a}
.pv-steps .on{color:#111;font-weight:600}
.pv-pair{display:grid;grid-template-columns:1fr 14px 1fr;gap:4px;align-items:center}
.pv-lbl{font-size:9px;font-weight:700;letter-spacing:.1em;text-align:center;color:#555;margin-bottom:4px}
.pv-frame{aspect-ratio:3/4;background:linear-gradient(160deg,#e9e6e1,#d8d3cb)}
.pv-frame.me{background:linear-gradient(160deg,#e3e8ee,#cdd5df)}
.pv-arrow{text-align:center;font-size:12px}
.pv-go{margin-top:10px;padding:9px;text-align:center;font-size:12px;font-weight:600}
.save-bar{display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-top:16px}
.save-bar .subtle{margin-right:auto}
.skeleton{display:flex;flex-direction:column;gap:16px}
.skeleton div{height:110px;border-radius:var(--radius);background:linear-gradient(90deg,#e8e8e8,#f3f3f3,#e8e8e8);background-size:200% 100%;animation:sk 1.2s infinite}
@keyframes sk{to{background-position:-200% 0}}
.foot{text-align:center;color:var(--text-3);font-size:12px;margin-top:28px}
.toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#1a1a1a;color:#fff;padding:10px 16px;border-radius:10px;font-weight:500;z-index:50;box-shadow:0 8px 24px rgba(0,0,0,.2)}
@media (max-width:860px){.grid{grid-template-columns:minmax(0,1fr)}.plans{grid-template-columns:minmax(0,1fr)}.sticky{position:static}}
@media (max-width:480px){.page{padding:14px 12px 24px}.two{grid-template-columns:1fr}.banner{flex-direction:column}}
`;

// ─────────────────────────────────────────────────────────
// Codice browser
// ─────────────────────────────────────────────────────────
function dashboardMain(BOOT) {
  var params = new URLSearchParams(location.search);
  var shop = params.get('shop') || '';
  var shopName = shop.replace('.myshopify.com', '');
  var state = { data: null, cfg: null, savedCfg: null };

  var ICON_CHECK = '<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 10.5l3.2 3L15 6.5"/></svg>';
  var ICON_PERSON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"/><path d="M5.5 21a6.5 6.5 0 0 1 13 0"/></svg>';

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function euro(n) { return '€' + (Math.round(n) === n ? n : n.toFixed(2)); }
  function planShort(name) { return String(name || '').replace('TryStyleAI ', ''); }

  function toast(msg) {
    try { if (window.shopify && window.shopify.toast) { window.shopify.toast.show(msg); return; } } catch (e) {}
    var t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2600);
  }

  function getToken(cb, ms) {
    var done = false;
    function finish(t) { if (!done) { done = true; cb(t || ''); } }
    var timer = setTimeout(function () { finish(''); }, ms || 3000);
    try {
      if (window.shopify && window.shopify.idToken) {
        window.shopify.idToken().then(function (t) { clearTimeout(timer); finish(t); })
          .catch(function () { clearTimeout(timer); finish(''); });
      } else { clearTimeout(timer); finish(''); }
    } catch (e) { clearTimeout(timer); finish(''); }
  }

  function api(qs, cb, timeout) {
    var x = new XMLHttpRequest();
    x.open('GET', '/api/billing?' + qs);
    x.timeout = timeout || 10000;
    x.onload = function () { var d = null; try { d = JSON.parse(x.responseText); } catch (e) {} cb(d, x.status); };
    x.onerror = x.ontimeout = function () { cb(null, 0); };
    x.send();
  }

  // ── Tabs ─────────────────────────────────────────────
  function showTab(name) {
    var tabs = document.querySelectorAll('.tab');
    for (var i = 0; i < tabs.length; i++) tabs[i].classList.toggle('on', tabs[i].getAttribute('data-tab') === name);
    var panels = document.querySelectorAll('.panel');
    for (var j = 0; j < panels.length; j++) panels[j].classList.toggle('on', panels[j].id === 'panel-' + name);
    window.scrollTo(0, 0);
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-tab]');
    if (t) { e.preventDefault(); showTab(t.getAttribute('data-tab')); }
  });

  // ── Dati ─────────────────────────────────────────────
  function isActive(d) { return d && (d.status === 'active' || d.status === 'trial') && d.plan && d.plan !== 'none'; }
  function embedUrl() {
    return 'https://admin.shopify.com/store/' + shopName + '/themes/current/editor?context=apps&template=product&activateAppId=' + BOOT.apiKey + '/app-embed';
  }

  function load() {
    if (!shop) {
      $('panel-overview').innerHTML = '<div class="banner crit"><p><b>Negozio non riconosciuto</b>Apri TryStyleAI dalla sezione App del tuo admin Shopify.</p></div>';
      return;
    }
    $('shop-name').textContent = shop;
    fetchData('');
    getToken(function (tok) {
      if (tok) fetchData(tok);
      setTimeout(function () {
        getToken(function (t2) { if (t2) api('action=store_offline&shop=' + encodeURIComponent(shop) + '&session_token=' + encodeURIComponent(t2), function () {}); });
      }, 3000);
    });
    api('action=get_config&shop=' + encodeURIComponent(shop), function (cfg) {
      state.cfg = normalize(cfg || {});
      state.savedCfg = JSON.stringify(state.cfg);
      renderCustomize();
    });
  }

  function fetchData(tok) {
    var qs = 'action=current&shop=' + encodeURIComponent(shop) + (tok ? '&session_token=' + encodeURIComponent(tok) : '');
    api(qs, function (d) {
      if (!d || d.error) {
        if (!state.data) renderOverview({ plan: 'none', status: 'none', callsUsed: 0, callsLimit: 0, plans: [] });
        return;
      }
      state.data = d;
      renderBadge(d); renderOverview(d); renderPlans(d);
    });
  }

  function renderBadge(d) {
    var html;
    if (isActive(d)) html = '<span class="badge ok"><span class="dot"></span>' + esc(planShort(d.planName)) + ' attivo</span>';
    else html = '<span class="badge warn"><span class="dot"></span>Nessun piano attivo</span>';
    $('plan-badge').innerHTML = html;
  }

  // ── Panoramica ───────────────────────────────────────
  function renderOverview(d) {
    var active = isActive(d);
    var used = d.callsUsed || 0, limit = d.callsLimit || 0;
    var pct = limit > 0 ? Math.min(100, Math.round(used / limit * 100)) : 0;
    var left = Math.max(0, limit - used);
    var plan = (d.plans || []).filter(function (p) { return p.key === d.plan; })[0];
    var h = '';

    if (params.get('confirmed') === '1' && active) h += '<div class="banner ok"><p><b>Abbonamento attivato</b>Il piano ' + esc(planShort(d.planName)) + ' è attivo. Completa la configurazione qui sotto.</p></div>';
    if (!active) {
      h += '<div class="banner info"><p><b>Attiva TryStyleAI con un piano</b>Scegli un piano per mostrare la prova virtuale ai tuoi clienti. Ogni piano include 7 giorni di prova gratuita.</p><button class="btn btn-primary" data-tab="plans">Vedi i piani</button></div>';
    } else if (pct >= 100) {
      h += '<div class="banner crit"><p><b>Generazioni esaurite</b>Il bottone di prova è nascosto nel negozio fino al rinnovo o al passaggio a un piano superiore.</p><button class="btn btn-primary" data-tab="plans">Cambia piano</button></div>';
    } else if (pct >= 80) {
      h += '<div class="banner warn"><p><b>Hai usato il ' + pct + '% delle generazioni</b>Quando finiscono, il bottone viene nascosto fino al rinnovo.</p><button class="btn btn-secondary" data-tab="plans">Cambia piano</button></div>';
    }

    h += '<div class="grid"><div class="stack">';

    // Guida
    h += '<div class="card"><div class="card-h"><div class="card-t">Guida alla configurazione</div><span class="subtle">' + (active ? '1' : '0') + ' di 3 completati</span></div><div class="steps">';
    h += step(active, 'Scegli un piano', 'Attiva l’abbonamento: la fatturazione è gestita da Shopify.', active ? '' : '<button class="btn btn-primary" data-tab="plans">Scegli un piano</button>');
    h += step(false, 'Attiva il widget nel tema', 'Accendi TryStyleAI in Personalizza tema → Incorporamenti app e salva. Il bottone comparirà sotto “Aggiungi al carrello”.', '<a class="btn ' + (active ? 'btn-primary' : 'btn-secondary') + '" target="_top" href="' + esc(embedUrl()) + '">Apri l’editor del tema</a>');
    h += step(false, 'Personalizza l’aspetto', 'Testo, colori, font e arrotondamenti del bottone e della finestra di prova.', '<button class="btn btn-secondary" data-tab="customize">Personalizza</button>');
    h += '</div></div>';

    // Utilizzo
    h += '<div class="card"><div class="card-h"><div class="card-t">Generazioni questo mese</div>' + (active ? '<span class="subtle">' + pct + '% utilizzato</span>' : '') + '</div>';
    if (active) {
      h += '<div class="usage-num">' + used + ' <span>di ' + limit + '</span></div>';
      h += '<div class="bar"><i class="' + (pct >= 100 ? 'crit' : pct >= 80 ? 'warn' : '') + '" style="width:' + pct + '%"></i></div>';
      h += '<div class="row muted"><span>' + left + ' rimanenti</span><span>Si azzera al rinnovo mensile</span></div>';
    } else {
      h += '<p class="muted">Le generazioni del mese compariranno qui dopo l’attivazione di un piano.</p>';
    }
    h += '</div>';
    h += '</div>';

    // Colonna destra
    h += '<div class="stack"><div class="card"><div class="card-h"><div class="card-t">Piano</div></div>';
    if (active && plan) {
      h += '<dl class="kv"><div><dt>Piano</dt><dd>' + esc(planShort(plan.name)) + '</dd></div>'
        + '<div><dt>Prezzo</dt><dd>' + euro(plan.price) + '/mese</dd></div>'
        + '<div><dt>Generazioni</dt><dd>' + plan.calls + '/mese</dd></div>'
        + '<div><dt>Stato</dt><dd><span class="badge ok"><span class="dot"></span>Attivo</span></dd></div></dl>'
        + '<div style="margin-top:14px"><button class="btn btn-secondary btn-block" data-tab="plans">Cambia piano</button></div>';
    } else {
      h += '<p class="muted" style="margin-bottom:12px">Nessun piano attivo.</p><button class="btn btn-primary btn-block" data-tab="plans">Vedi i piani</button>';
    }
    h += '</div>';
    h += '<div class="card"><div class="card-t" style="margin-bottom:6px">Serve aiuto?</div><p class="muted">Se il bottone non compare, verifica che l’incorporamento TryStyleAI sia attivo nel tema pubblicato e che il piano abbia generazioni disponibili.</p></div>';
    h += '</div></div>';

    $('panel-overview').innerHTML = h;
  }

  function step(done, title, desc, action) {
    return '<div class="step' + (done ? ' done' : '') + '"><div class="step-ic">' + (done ? ICON_CHECK : '') + '</div>'
      + '<div class="step-b"><div class="step-t">' + esc(title) + '</div><div class="step-d">' + esc(desc) + '</div>' + (done ? '' : action) + '</div></div>';
  }

  // ── Piani ────────────────────────────────────────────
  function renderPlans(d) {
    var active = isActive(d);
    var plans = d.plans || [];
    var h = '<div id="plans-msg"></div><div class="plans">';
    plans.forEach(function (p) {
      var current = active && p.key === d.plan;
      var label = current ? 'Piano attuale' : (active ? 'Passa a ' + planShort(p.name) : 'Inizia la prova gratuita');
      h += '<div class="card plan' + (current ? ' current' : '') + '">'
        + '<div class="plan-top"><div class="plan-n">' + esc(planShort(p.name)) + '</div>'
        + (current ? '<span class="badge ok">Attuale</span>' : (p.key === 'pro' ? '<span class="badge">Consigliato</span>' : '')) + '</div>'
        + '<div class="price">' + euro(p.price) + ' <span>/ mese</span></div>'
        + '<ul class="feat">'
        + feat('<b>' + p.calls + '</b> generazioni al mese')
        + feat('Bottone e finestra personalizzabili')
        + feat('Installazione dal tema, senza codice')
        + feat(p.trialDays + ' giorni di prova gratuita')
        + '</ul>'
        + '<button class="btn ' + (current ? 'btn-secondary' : 'btn-primary') + ' btn-block sub-btn" data-plan="' + esc(p.key) + '" data-label="' + esc(label) + '"' + (current ? ' disabled' : '') + '>' + esc(label) + '</button>'
        + '</div>';
    });
    h += '</div><p class="subtle note-c">Prezzi in euro. La fatturazione è gestita da Shopify e puoi annullare in qualsiasi momento.</p>';
    $('panel-plans').innerHTML = h;
  }
  function feat(t) { return '<li>' + ICON_CHECK + '<span>' + t + '</span></li>'; }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.sub-btn');
    if (!btn || btn.disabled) return;
    var plan = btn.getAttribute('data-plan');
    var label = btn.getAttribute('data-label');
    btn.disabled = true; btn.textContent = 'Reindirizzamento…';
    var msg = $('plans-msg');
    function fail(text) {
      btn.disabled = false; btn.textContent = label;
      msg.innerHTML = '<div class="banner crit"><p><b>Impossibile avviare l’abbonamento</b>' + esc(text) + '</p></div>';
    }
    getToken(function (tok) {
      if (!tok) return fail('Sessione scaduta. Ricarica la pagina e riprova.');
      api('action=subscribe&shop=' + encodeURIComponent(shop) + '&plan=' + encodeURIComponent(plan) + '&session_token=' + encodeURIComponent(tok), function (d, status) {
        if (d && d.confirmationUrl) { window.open(d.confirmationUrl, '_top'); return; }
        var det = d && d.detail ? (typeof d.detail === 'string' ? d.detail : JSON.stringify(d.detail)).substring(0, 300) : '';
        fail(((d && d.error) || 'Risposta non valida') + (status ? ' (' + status + ')' : '') + (det ? ' — ' + det : ''));
      }, 15000);
    }, 8000);
  });

  // ── Personalizza ─────────────────────────────────────
  function normalize(c) {
    var d = BOOT.defaults, o = {};
    for (var k in d) o[k] = (c[k] === undefined || c[k] === null) ? d[k] : c[k];
    return o;
  }

  function colorField(key, label) {
    var v = state.cfg[key];
    return '<div><label class="f-label">' + esc(label) + '</label><div class="color">'
      + '<input type="color" data-k="' + key + '" value="' + esc(v) + '" aria-label="' + esc(label) + '">'
      + '<input type="text" data-k="' + key + '" data-hex="1" value="' + esc(v) + '" maxlength="7" spellcheck="false"></div></div>';
  }
  function rangeField(key, label, min, max) {
    return '<div><label class="f-label">' + esc(label) + '</label><div class="range">'
      + '<input type="range" data-k="' + key + '" min="' + min + '" max="' + max + '" value="' + state.cfg[key] + '">'
      + '<output data-o="' + key + '">' + state.cfg[key] + ' px</output></div></div>';
  }

  function renderCustomize() {
    var c = state.cfg;
    var fonts = BOOT.fonts.map(function (f) {
      return '<option value="' + esc(f) + '"' + (c.font === f ? ' selected' : '') + '>' + (f === 'theme' ? 'Font del tema (consigliato)' : esc(f)) + '</option>';
    }).join('');

    var h = '<div class="grid"><div class="stack">'
      + '<div class="card"><div class="card-h"><div class="card-t">Bottone nella pagina prodotto</div></div><div class="form">'
      +   '<div><label class="f-label" for="f-text">Testo</label><input id="f-text" class="input" data-k="btnText" maxlength="40" value="' + esc(c.btnText) + '"><div class="f-help">Massimo 40 caratteri. Viene usato anche come titolo della finestra.</div></div>'
      +   '<label class="check"><input type="checkbox" data-k="showIcon"' + (c.showIcon ? ' checked' : '') + '> Mostra l’icona accanto al testo</label>'
      +   '<div class="two">' + colorField('btnColor', 'Sfondo') + colorField('btnTextColor', 'Testo') + '</div>'
      +   '<div class="two">' + colorField('btnBorderColor', 'Bordo') + rangeField('btnRadius', 'Arrotondamento', 0, 30) + '</div>'
      + '</div></div>'
      + '<div class="card"><div class="card-h"><div class="card-t">Finestra di prova</div></div><div class="form">'
      +   '<div><label class="f-label" for="f-font">Font</label><select id="f-font" class="select" data-k="font">' + fonts + '</select><div class="f-help">Vale per bottone e finestra. "Font del tema" usa lo stesso carattere del negozio.</div></div>'
      +   '<div class="two">' + colorField('primaryColor', 'Bottoni principali') + colorField('primaryTextColor', 'Testo bottoni principali') + '</div>'
      +   '<div class="two">' + colorField('accentColor', 'Accento (passi e caricamento)') + rangeField('modalRadius', 'Arrotondamento finestra', 0, 24) + '</div>'
      + '</div></div>'
      + '<div class="save-bar"><span class="subtle" id="save-state"></span>'
      +   '<button class="btn btn-secondary" id="btn-reset">Ripristina predefiniti</button>'
      +   '<button class="btn btn-primary" id="btn-save">Salva</button></div>'
      + '</div>'
      + '<div class="stack sticky"><div class="card"><div class="card-h"><div class="card-t">Anteprima</div><span class="subtle">Come la vedono i clienti</span></div><div class="pv-stage" id="preview"></div></div></div>'
      + '</div>';
    $('panel-customize').innerHTML = h;
    bindCustomize();
    renderPreview();
  }

  var loadedFonts = {};
  function ensureFont(f) {
    if (!f || f === 'theme' || loadedFonts[f]) return;
    loadedFonts[f] = true;
    var l = document.createElement('link'); l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(f).replace(/%20/g, '+') + ':wght@400;600;700&display=swap';
    document.head.appendChild(l);
  }

  function renderPreview() {
    var c = state.cfg;
    ensureFont(c.font);
    var font = c.font === 'theme' ? 'Georgia, "Times New Roman", serif' : '"' + c.font + '", sans-serif';
    var r = c.btnRadius + 'px', mr = c.modalRadius + 'px', fr = Math.min(c.modalRadius, 12) + 'px';
    var h = '<div class="pv-prod" style="font-family:' + esc(font) + '">'
      + '<div class="pv-line" style="width:60%;height:10px;background:#cfcfcf"></div><div class="pv-line" style="width:30%"></div>'
      + '<div class="pv-cart"></div>'
      + '<div class="pv-trigger" style="background:' + c.btnColor + ';color:' + c.btnTextColor + ';border-color:' + c.btnBorderColor + ';border-radius:' + r + '">'
      + (c.showIcon ? ICON_PERSON : '') + '<span>' + esc(c.btnText) + '</span></div></div>'
      + '<div class="pv-modal" style="border-radius:' + mr + ';font-family:' + esc(font) + '">'
      + '<div class="pv-title">' + esc(c.btnText) + '</div>'
      + '<div class="pv-steps"><span class="on"><i style="background:' + c.accentColor + ';color:#fff">1</i>La tua foto</span><span><i>2</i>Elaborazione</span><span><i>3</i>Risultato</span></div>'
      + '<div class="pv-pair"><div><div class="pv-lbl">IL CAPO</div><div class="pv-frame" style="border-radius:' + fr + '"></div></div>'
      + '<div class="pv-arrow" style="color:' + c.accentColor + '">→</div>'
      + '<div><div class="pv-lbl">TU</div><div class="pv-frame me" style="border-radius:' + fr + '"></div></div></div>'
      + '<div class="pv-go" style="background:' + c.primaryColor + ';color:' + c.primaryTextColor + ';border-radius:' + r + '">Provalo ora</div>'
      + '</div>';
    if (c.font === 'theme') h += '<p class="subtle">Con "Font del tema" il carattere reale sarà quello del tuo negozio.</p>';
    $('preview').innerHTML = h;
    var dirty = JSON.stringify(c) !== state.savedCfg;
    $('save-state').textContent = dirty ? 'Modifiche non salvate' : '';
  }

  var bound = false;
  function bindCustomize() {
    var root = $('panel-customize');
    if (!bound) { bound = true; root.addEventListener('input', onEdit); root.addEventListener('change', onEdit); }
    $('btn-save').onclick = save;
    $('btn-reset').onclick = function () {
      state.cfg = normalize({});
      renderCustomize();
      $('save-state').textContent = 'Predefiniti ripristinati: salva per applicarli';
    };
  }

  function onEdit(e) {
    var el = e.target, k = el.getAttribute('data-k');
    if (!k) return;
    var v;
    if (el.type === 'checkbox') v = el.checked;
    else if (el.type === 'range') { v = parseInt(el.value, 10); var o = document.querySelector('[data-o="' + k + '"]'); if (o) o.textContent = v + ' px'; }
    else if (el.getAttribute('data-hex')) {
      v = el.value.trim(); if (v.charAt(0) !== '#') v = '#' + v;
      if (!/^#[0-9a-fA-F]{6}$/.test(v)) return;
      var pick = document.querySelector('input[type=color][data-k="' + k + '"]'); if (pick) pick.value = v.toLowerCase();
    } else if (el.type === 'color') {
      v = el.value; var hx = document.querySelector('input[data-hex][data-k="' + k + '"]'); if (hx) hx.value = v;
    } else v = el.value;
    state.cfg[k] = v;
    renderPreview();
  }

  function save() {
    var b = $('btn-save'); b.disabled = true; b.textContent = 'Salvataggio…';
    var c = state.cfg, qs = 'action=save_config&shop=' + encodeURIComponent(shop);
    for (var k in c) qs += '&' + k + '=' + encodeURIComponent(c[k]);
    api(qs, function (d) {
      b.disabled = false; b.textContent = 'Salva';
      if (d && d.ok) {
        state.cfg = normalize(d.config); state.savedCfg = JSON.stringify(state.cfg);
        renderCustomize(); toast('Impostazioni salvate');
      } else {
        $('save-state').textContent = 'Errore nel salvataggio, riprova';
      }
    });
  }

  load();
}
