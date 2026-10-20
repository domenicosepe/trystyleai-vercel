// api/app.js — Dashboard embedded TryStyleAI v3
module.exports = (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Frame-Options', 'ALLOWALL');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'self' https://*.myshopify.com https://admin.shopify.com");

  const css = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f6f6f7; color: #202223; }
    .header { background: #fff; border-bottom: 1px solid #e1e3e5; padding: 16px 24px; display: flex; align-items: center; gap: 12px; }
    .logo { width: 32px; height: 32px; background: linear-gradient(135deg, #7b2ff7, #00c6ff); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px; }
    .header h1 { font-size: 18px; font-weight: 600; }
    .nav-tabs { display: flex; background: #fff; border-bottom: 1px solid #e1e3e5; padding: 0 24px; }
    .nav-tab { padding: 12px 20px; font-size: 14px; font-weight: 500; color: #6d7175; cursor: pointer; border-bottom: 2px solid transparent; background: none; border-top: none; border-left: none; border-right: none; }
    .nav-tab.active { color: #7b2ff7; border-bottom-color: #7b2ff7; }
    .tab-content { display: none; }
    .tab-content.active { display: block; }
    .container { padding: 24px; max-width: 960px; margin: 0 auto; }
    .status-banner { background: #fff; border: 1px solid #e1e3e5; border-radius: 12px; padding: 20px 24px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
    .status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 600; }
    .badge-active { background: #d4edda; color: #155724; }
    .badge-trial { background: #cce5ff; color: #004085; }
    .badge-pending { background: #fff3cd; color: #856404; }
    .badge-cancelled { background: #f8d7da; color: #721c24; }
    .badge-none { background: #e2e3e5; color: #383d41; }
    .usage-card { background: #fff; border: 1px solid #e1e3e5; border-radius: 12px; padding: 20px 24px; margin-bottom: 20px; }
    .usage-card h2 { font-size: 15px; font-weight: 600; margin-bottom: 16px; color: #6d7175; text-transform: uppercase; letter-spacing: 0.05em; }
    .usage-numbers { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 16px; }
    .usage-stat { text-align: center; }
    .usage-big { font-size: 32px; font-weight: 700; color: #7b2ff7; }
    .usage-big.danger { color: #d72c0d; }
    .usage-label { font-size: 12px; color: #6d7175; margin-top: 4px; }
    .progress-wrap { margin-top: 16px; }
    .progress-bar { height: 8px; background: #e1e3e5; border-radius: 4px; overflow: hidden; }
    .progress-fill { height: 100%; background: linear-gradient(90deg, #7b2ff7, #00c6ff); border-radius: 4px; }
    .progress-fill.danger { background: linear-gradient(90deg, #d72c0d, #ff6b6b); }
    .progress-label { display: flex; justify-content: space-between; font-size: 12px; color: #6d7175; margin-top: 6px; }
    .plans-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; margin-bottom: 20px; }
    .plan-card { background: #fff; border: 2px solid #e1e3e5; border-radius: 12px; padding: 20px; position: relative; }
    .plan-card.plan-active { border-color: #7b2ff7; }
    .plan-card.popular::before { content: 'Piu popolare'; position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: #7b2ff7; color: white; font-size: 11px; font-weight: 600; padding: 3px 12px; border-radius: 20px; white-space: nowrap; }
    .plan-name { font-size: 16px; font-weight: 700; margin-bottom: 4px; }
    .plan-price { font-size: 28px; font-weight: 800; color: #7b2ff7; }
    .plan-price span { font-size: 14px; font-weight: 400; color: #6d7175; }
    .plan-calls { font-size: 13px; color: #6d7175; margin: 8px 0 16px; }
    .plan-features { list-style: none; margin-bottom: 20px; }
    .plan-features li { font-size: 13px; padding: 4px 0; color: #444; }
    .plan-features li::before { content: "V "; color: #7b2ff7; font-weight: bold; }
    .btn { display: block; width: 100%; padding: 10px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; border: none; text-align: center; }
    .btn-primary { background: #7b2ff7; color: white; }
    .btn-active { background: #e1e3e5; color: #6d7175; cursor: default; }
    .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
    .dot-green { background: #00a047; }
    .dot-blue { background: #0052cc; }
    .dot-yellow { background: #ffc453; }
    .dot-red { background: #d72c0d; }
    .section-title { font-size: 18px; font-weight: 700; margin-bottom: 16px; }
    .trial-note { font-size: 12px; color: #6d7175; text-align: center; margin-top: 8px; }
    .loading { text-align: center; padding: 60px; color: #6d7175; }
    .spinner { width: 32px; height: 32px; border: 3px solid #e1e3e5; border-top-color: #7b2ff7; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .alert { padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; font-size: 14px; }
    .alert-warning { background: #fff3cd; border: 1px solid #ffc107; color: #856404; }
    .alert-danger { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
    .alert-success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
    .config-card { background: #fff; border: 1px solid #e1e3e5; border-radius: 12px; padding: 24px; margin-bottom: 20px; }
    .config-card h2 { font-size: 16px; font-weight: 700; margin-bottom: 20px; }
    .form-group { margin-bottom: 20px; }
    .form-label { display: block; font-size: 13px; font-weight: 600; color: #6d7175; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.04em; }
    .form-input { width: 100%; padding: 10px 12px; border: 1px solid #e1e3e5; border-radius: 8px; font-size: 14px; color: #202223; }
    .color-row { display: flex; align-items: center; gap: 12px; }
    .color-input { height: 44px; padding: 4px 8px; cursor: pointer; border: 1px solid #e1e3e5; border-radius: 8px; width: 60px; }
    .color-preview { width: 44px; height: 44px; border-radius: 8px; border: 1px solid #e1e3e5; flex-shrink: 0; }
    .hex-input { max-width: 120px; padding: 10px 12px; border: 1px solid #e1e3e5; border-radius: 8px; font-size: 14px; }
    .widget-preview { background: #f6f6f7; border: 1px solid #e1e3e5; border-radius: 12px; padding: 20px; margin-top: 20px; }
    .widget-preview h3 { font-size: 13px; font-weight: 600; color: #6d7175; margin-bottom: 12px; text-transform: uppercase; }
    .preview-btn { padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; border: none; cursor: default; color: white; }
    .save-row { display: flex; justify-content: flex-end; align-items: center; margin-top: 24px; gap: 12px; }
    .btn-save { background: #7b2ff7; color: white; border: none; padding: 10px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
    .save-msg { font-size: 13px; }
    .save-msg.ok { color: #155724; }
    .save-msg.err { color: #721c24; }
  `;

  const js = `
(function() {
  var urlParams = new URLSearchParams(window.location.search);
  var hostParam = urlParams.get('host') || '';
  var shop = urlParams.get('shop') || '';

  if (!shop && hostParam) {
    try { shop = atob(hostParam).split('/')[0]; } catch(e) {}
  }
  if (shop) { try { sessionStorage.setItem('ts_shop', shop); } catch(e) {} }
  else { try { shop = sessionStorage.getItem('ts_shop') || ''; } catch(e) {} }

  // Tabs
  document.querySelectorAll('.nav-tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      var t = tab.getAttribute('data-tab');
      document.querySelectorAll('.nav-tab').forEach(function(x) { x.classList.remove('active'); });
      document.querySelectorAll('.tab-content').forEach(function(x) { x.classList.remove('active'); });
      tab.classList.add('active');
      document.getElementById('tab-' + t).classList.add('active');
    });
  });

  function getToken(cb) {
    var done = false;
    function finish(t) { if (!done) { done = true; cb(t || ''); } }
    // Timeout: se idToken non risponde in 3s, vai avanti senza token
    var timeout = setTimeout(function() { finish(''); }, 3000);
    try {
      if (window.shopify && window.shopify.idToken) {
        window.shopify.idToken()
          .then(function(t) { clearTimeout(timeout); finish(t); })
          .catch(function() { clearTimeout(timeout); finish(''); });
      } else {
        clearTimeout(timeout); finish('');
      }
    } catch(e) { clearTimeout(timeout); finish(''); }
  }

  var DEFAULT_PLANS = [
    { key: 'basic',   name: 'TryStyleAI Basic',    price: 30,  calls: 80,  trialDays: 7 },
    { key: 'pro',     name: 'TryStyleAI Pro',      price: 85,  calls: 250, trialDays: 7 },
    { key: 'premium', name: 'TryStyleAI Business', price: 275, calls: 840, trialDays: 7 }
  ];

  // ── DASHBOARD ──────────────────────────────────────────────
  function loadDashboard() {
    if (!shop) {
      document.getElementById('app').innerHTML = '<div class="alert alert-danger">Parametro shop mancante. Riapri dal tuo admin Shopify.</div>';
      return;
    }
    var fromConfirm = urlParams.get('confirmed') === '1';

    function fetchDashboard(tok) {
      var url = '/api/billing?action=current&shop=' + encodeURIComponent(shop);
      if (tok) url += '&session_token=' + encodeURIComponent(tok);
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url);
      xhr.timeout = 8000;
      xhr.onload = function() {
        try {
          var d = JSON.parse(xhr.responseText);
          if (!d.plans) d.plans = DEFAULT_PLANS;
          renderDashboard(d, tok, fromConfirm);
        } catch(e) {
          renderDashboard({ shop: shop, plan: 'none', planName: 'Nessun piano', status: 'none', callsUsed: 0, callsLimit: 0, plans: DEFAULT_PLANS }, tok, fromConfirm);
        }
      };
      xhr.ontimeout = xhr.onerror = function() {
        renderDashboard({ shop: shop, plan: 'none', planName: 'Nessun piano', status: 'none', callsUsed: 0, callsLimit: 0, plans: DEFAULT_PLANS }, tok, fromConfirm);
      };
      xhr.send();
    }

    // Prima carica subito senza token (usa KV), poi ricarica con token se disponibile
    fetchDashboard('');
    getToken(function(tok) {
      if (tok) fetchDashboard(tok);
      // Secondo JWT separato: salva token offline per widget/try-on
      // (dopo 3s, così non si sovrappone allo scambio della dashboard)
      setTimeout(function() {
        getToken(function(tok2) {
          if (!tok2) return;
          var x = new XMLHttpRequest();
          x.open('GET', '/api/billing?action=store_offline&shop=' + encodeURIComponent(shop) + '&session_token=' + encodeURIComponent(tok2));
          x.send();
        });
      }, 3000);
    });
  }

  function renderDashboard(data, tok, fromConfirm) {
    var pct = data.callsLimit > 0 ? Math.min(100, Math.round(data.callsUsed / data.callsLimit * 100)) : 0;
    var remaining = Math.max(0, (data.callsLimit || 0) - (data.callsUsed || 0));
    var isDanger = pct >= 80;
    var isActive = data.status === 'active';
    var isTrial  = data.status === 'trialing' || data.status === 'pending';

    var scl = isActive ? 'badge-active' : isTrial ? 'badge-trial' : data.status === 'cancelled' ? 'badge-cancelled' : 'badge-none';
    var dcl = isActive ? 'dot-green' : isTrial ? 'dot-blue' : data.status === 'cancelled' ? 'dot-red' : 'dot-yellow';
    var slbl = isActive ? 'Attivo' : isTrial ? 'Prova gratuita' : data.status === 'cancelled' ? 'Cancellato' : 'Nessun piano';

    var html = '';
    if (fromConfirm && data.plan !== 'none') {
      html += '<div class="alert alert-success">Abbonamento attivato! Piano <strong>' + (data.planName || data.plan) + '</strong> ora attivo.</div>';
    }
    if (data.plan !== 'none' && data.callsLimit > 0 && remaining === 0) {
      html += '<div class="alert alert-danger">Generazioni esaurite per questo mese. Passa a un piano superiore per continuare.</div>';
    } else if (isDanger && data.plan !== 'none') {
      html += '<div class="alert alert-warning">Hai usato oltre l' + "'" + '80% delle generazioni disponibili questo mese.</div>';
    }

    html += '<div class="status-banner">';
    html += '<div><div style="font-size:13px;color:#6d7175;margin-bottom:4px">Negozio</div><div style="font-weight:600">' + (data.shop || shop) + '</div></div>';
    html += '<div><div style="font-size:13px;color:#6d7175;margin-bottom:4px">Piano</div><div style="font-weight:600">' + (data.planName || 'Nessun piano') + '</div></div>';
    html += '<span class="status-badge ' + scl + '"><span class="dot ' + dcl + '"></span>' + slbl + '</span>';
    html += '</div>';

    if (data.plan !== 'none' && data.callsLimit > 0) {
      html += '<div class="usage-card"><h2>Utilizzo questo mese</h2>';
      html += '<div class="usage-numbers">';
      html += '<div class="usage-stat"><div class="usage-big">' + (data.callsUsed || 0) + '</div><div class="usage-label">Usate</div></div>';
      html += '<div class="usage-stat"><div class="usage-big ' + (remaining === 0 ? 'danger' : '') + '">' + remaining + '</div><div class="usage-label">Rimaste</div></div>';
      html += '<div class="usage-stat"><div class="usage-big">' + data.callsLimit + '</div><div class="usage-label">Totale</div></div>';
      html += '</div>';
      html += '<div class="progress-wrap"><div class="progress-bar"><div class="progress-fill ' + (isDanger ? 'danger' : '') + '" style="width:' + pct + '%"></div></div>';
      html += '<div class="progress-label"><span>' + pct + '% utilizzato</span><span>' + remaining + ' rimanenti</span></div></div>';
      html += '</div>';
    }

    html += '<div class="section-title">' + (data.plan === 'none' ? 'Scegli il tuo piano' : 'Cambia piano') + '</div>';
    html += '<div class="plans-grid">';
    (data.plans || DEFAULT_PLANS).forEach(function(p) {
      var isPlnActive = p.key === data.plan && (isActive || isTrial);
      html += '<div class="plan-card ' + (isPlnActive ? 'plan-active' : '') + ' ' + (p.key === 'pro' ? 'popular' : '') + '">';
      html += '<div class="plan-name">' + p.name + '</div>';
      html += '<div class="plan-price">&euro;' + p.price + '<span>/mese</span></div>';
      html += '<div class="plan-calls">' + p.calls + ' generazioni/mese</div>';
      html += '<ul class="plan-features"><li>Virtual Try-On con AI</li><li>Installazione automatica</li><li>Dashboard analytics</li></ul>';
      if (isPlnActive) {
        html += '<div class="btn btn-active">Piano attuale</div>';
      } else {
        var hasPlan = data.plan && data.plan !== 'none' && (isActive || isTrial);
        var lbl = hasPlan ? ('Passa a ' + p.name.replace('TryStyleAI ', '')) : ('Prova gratis ' + p.trialDays + ' giorni');
        html += '<button data-plan="' + p.key + '" data-label="' + lbl + '" class="btn btn-primary sub-btn">' + lbl + '</button>';
        html += '<div class="trial-note">' + (hasPlan ? '&euro;' + p.price + '/mese - Annulla quando vuoi' : 'Poi &euro;' + p.price + '/mese - Annulla quando vuoi') + '</div>';
      }
      html += '</div>';
    });
    html += '</div>';

    document.getElementById('app').innerHTML = html;
    window._ts_tok = tok;
  }

  // Click subscribe
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('.sub-btn');
    if (!btn) return;
    e.preventDefault();
    var planKey = btn.getAttribute('data-plan');
    if (!planKey) return;
    btn.disabled = true;
    btn.textContent = 'Attendi...';

    function doSubscribe(tok) {
      if (!tok) {
        alert('Sessione scaduta. Ricarica la pagina e riprova.');
        btn.disabled = false; btn.textContent = btn.getAttribute('data-label') || 'Prova gratis';
        return;
      }
      var url = '/api/billing?action=subscribe&shop=' + encodeURIComponent(shop)
        + '&plan=' + planKey
        + '&session_token=' + encodeURIComponent(tok);
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url);
      xhr.timeout = 15000;
      xhr.onload = function() {
        try {
          var d = JSON.parse(xhr.responseText);
          if (d.confirmationUrl) {
            if (window.top && window.top !== window) { window.top.location.href = d.confirmationUrl; }
            else { window.location.href = d.confirmationUrl; }
          } else {
            var det = d.detail ? (typeof d.detail === 'string' ? d.detail : JSON.stringify(d.detail)) : '';
            alert('Errore (' + xhr.status + '): ' + (d.error || 'Risposta non valida') + (det ? '\\n\\nDettaglio: ' + det.substring(0, 400) : ''));
            btn.disabled = false; btn.textContent = btn.getAttribute('data-label') || 'Prova gratis';
          }
        } catch(err) {
          alert('Errore imprevisto');
          btn.disabled = false; btn.textContent = btn.getAttribute('data-label') || 'Prova gratis';
        }
      };
      xhr.ontimeout = function() { alert('Timeout. Riprova.'); btn.disabled = false; btn.textContent = btn.getAttribute('data-label') || 'Prova gratis'; };
      xhr.onerror = function() { alert('Errore di rete'); btn.disabled = false; btn.textContent = btn.getAttribute('data-label') || 'Prova gratis'; };
      xhr.send();
    }

    // Per subscribe serve sempre un token fresco — timeout 8s
    if (window.shopify && window.shopify.idToken) {
      var tDone = false;
      var tTimer = setTimeout(function() {
        if (!tDone) { tDone = true; doSubscribe(''); }
      }, 8000);
      window.shopify.idToken()
        .then(function(t) { if (!tDone) { tDone = true; clearTimeout(tTimer); doSubscribe(t); } })
        .catch(function() { if (!tDone) { tDone = true; clearTimeout(tTimer); doSubscribe(''); } });
    } else {
      doSubscribe('');
    }
  });

  // ── WIDGET CONFIG ──────────────────────────────────────────
  function loadWidgetConfig() {
    var url = '/api/billing?action=get_config&shop=' + encodeURIComponent(shop);
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.onload = function() {
      try {
        var cfg = JSON.parse(xhr.responseText);
        if (cfg.btnText) document.getElementById('btn-text').value = cfg.btnText;
        if (cfg.btnColor) {
          document.getElementById('btn-color').value = cfg.btnColor;
          document.getElementById('btn-color-hex').value = cfg.btnColor;
          document.getElementById('color-preview').style.background = cfg.btnColor;
        }
        if (cfg.btnTextColor) {
          document.getElementById('btn-text-color').value = cfg.btnTextColor;
          document.getElementById('btn-tc-hex').value = cfg.btnTextColor;
          document.getElementById('tc-preview').style.background = cfg.btnTextColor;
        }
        updatePreview();
      } catch(e) {}
    };
    xhr.send();
  }

  function updatePreview() {
    var text  = document.getElementById('btn-text').value || 'Prova questo outfit';
    var color = document.getElementById('btn-color').value || '#7b2ff7';
    var tc    = document.getElementById('btn-text-color').value || '#ffffff';
    var pb = document.getElementById('preview-btn');
    pb.textContent = text;
    pb.style.background = color;
    pb.style.color = tc;
  }

  function wireColor(pickerId, hexId, previewId) {
    var picker = document.getElementById(pickerId);
    var hex    = document.getElementById(hexId);
    var prev   = document.getElementById(previewId);
    picker.addEventListener('input', function() {
      hex.value = picker.value;
      prev.style.background = picker.value;
      updatePreview();
    });
    hex.addEventListener('input', function() {
      if (/^#[0-9a-fA-F]{6}$/.test(hex.value)) {
        picker.value = hex.value;
        prev.style.background = hex.value;
        updatePreview();
      }
    });
  }

  wireColor('btn-color', 'btn-color-hex', 'color-preview');
  wireColor('btn-text-color', 'btn-tc-hex', 'tc-preview');
  document.getElementById('btn-text').addEventListener('input', updatePreview);

  document.getElementById('btn-save').addEventListener('click', function() {
    var saveBtn = this;
    var msg = document.getElementById('save-msg');
    saveBtn.disabled = true;
    msg.textContent = '';
    getToken(function(tok) {
      var url = '/api/billing?action=save_config&shop=' + encodeURIComponent(shop)
        + '&btnText=' + encodeURIComponent(document.getElementById('btn-text').value || 'Prova questo outfit')
        + '&btnColor=' + encodeURIComponent(document.getElementById('btn-color').value || '#7b2ff7')
        + '&btnTextColor=' + encodeURIComponent(document.getElementById('btn-text-color').value || '#ffffff');
      if (tok) url += '&session_token=' + encodeURIComponent(tok);
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url);
      xhr.onload = function() {
        saveBtn.disabled = false;
        try {
          var r = JSON.parse(xhr.responseText);
          msg.textContent = r.ok ? 'Salvato!' : 'Errore salvataggio';
          msg.className = 'save-msg ' + (r.ok ? 'ok' : 'err');
        } catch(e) { msg.textContent = 'Errore'; msg.className = 'save-msg err'; }
        setTimeout(function() { msg.textContent = ''; }, 3000);
      };
      xhr.onerror = function() { saveBtn.disabled = false; msg.textContent = 'Errore di rete'; msg.className = 'save-msg err'; };
      xhr.send();
    });
  });

  loadDashboard();
  loadWidgetConfig();
})();
  `;

  const html = '<!DOCTYPE html>\n<html lang="it">\n<head>\n' +
    '<meta charset="UTF-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    '<title>TryStyleAI</title>\n' +
    '<script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"><\/script>\n' +
    '<style>' + css + '</style>\n' +
    '</head>\n<body>\n' +
    '<div class="header"><div class="logo">TS</div><h1>TryStyleAI</h1></div>\n' +
    '<div class="nav-tabs">' +
      '<button class="nav-tab active" data-tab="dashboard">Dashboard</button>' +
      '<button class="nav-tab" data-tab="widget">Configura Widget</button>' +
    '</div>\n' +
    '<div id="tab-dashboard" class="tab-content active">' +
      '<div class="container"><div id="app">' +
        '<div class="loading"><div class="spinner"></div><p>Caricamento...</p></div>' +
      '</div></div>' +
    '</div>\n' +
    '<div id="tab-widget" class="tab-content">' +
      '<div class="container"><div class="config-card">' +
        '<h2>Personalizza il widget Virtual Try-On</h2>' +
        '<div class="form-group">' +
          '<label class="form-label" for="btn-text">Testo del bottone</label>' +
          '<input type="text" id="btn-text" class="form-input" maxlength="40" placeholder="Prova questo outfit" />' +
        '</div>' +
        '<div class="form-group">' +
          '<label class="form-label">Colore bottone</label>' +
          '<div class="color-row">' +
            '<input type="color" id="btn-color" class="color-input" value="#7b2ff7" />' +
            '<div class="color-preview" id="color-preview" style="background:#7b2ff7"></div>' +
            '<input type="text" id="btn-color-hex" class="hex-input" value="#7b2ff7" placeholder="#7b2ff7" />' +
          '</div>' +
        '</div>' +
        '<div class="form-group">' +
          '<label class="form-label">Colore testo bottone</label>' +
          '<div class="color-row">' +
            '<input type="color" id="btn-text-color" class="color-input" value="#ffffff" />' +
            '<div class="color-preview" id="tc-preview" style="background:#ffffff;border:1px solid #ccc"></div>' +
            '<input type="text" id="btn-tc-hex" class="hex-input" value="#ffffff" placeholder="#ffffff" />' +
          '</div>' +
        '</div>' +
        '<div class="widget-preview">' +
          '<h3>Anteprima</h3>' +
          '<button class="preview-btn" id="preview-btn" style="background:#7b2ff7;color:#ffffff">Prova questo outfit</button>' +
        '</div>' +
        '<div class="save-row">' +
          '<span class="save-msg" id="save-msg"></span>' +
          '<button class="btn-save" id="btn-save">Salva impostazioni</button>' +
        '</div>' +
      '</div></div>' +
    '</div>\n' +
    '<script>' + js + '<\/script>\n' +
    '</body></html>';

  res.status(200).send(html);
};
