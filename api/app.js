// api/app.js — Dashboard embedded TryStyleAI v3
module.exports = (req, res) => {
  const { shop, host } = req.query;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Frame-Options', 'ALLOWALL');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'self' https://*.myshopify.com https://admin.shopify.com");

  const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TryStyleAI</title>
  <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f6f6f7; color: #202223; }
    .header { background: #fff; border-bottom: 1px solid #e1e3e5; padding: 16px 24px; display: flex; align-items: center; gap: 12px; }
    .logo { width: 32px; height: 32px; background: linear-gradient(135deg, #7b2ff7, #00c6ff); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px; }
    .header h1 { font-size: 18px; font-weight: 600; }
    .nav-tabs { display: flex; gap: 0; background: #fff; border-bottom: 1px solid #e1e3e5; padding: 0 24px; }
    .nav-tab { padding: 12px 20px; font-size: 14px; font-weight: 500; color: #6d7175; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s; background: none; border-top: none; border-left: none; border-right: none; }
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
    .usage-stat .value { font-size: 32px; font-weight: 700; color: #7b2ff7; }
    .usage-stat .value.danger { color: #d72c0d; }
    .usage-stat .label { font-size: 12px; color: #6d7175; margin-top: 4px; }
    .progress-wrap { margin-top: 16px; }
    .progress-bar { height: 8px; background: #e1e3e5; border-radius: 4px; overflow: hidden; }
    .progress-fill { height: 100%; background: linear-gradient(90deg, #7b2ff7, #00c6ff); border-radius: 4px; transition: width 0.4s ease; }
    .progress-fill.danger { background: linear-gradient(90deg, #d72c0d, #ff6b6b); }
    .progress-label { display: flex; justify-content: space-between; font-size: 12px; color: #6d7175; margin-top: 6px; }
    .plans-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; margin-bottom: 20px; }
    .plan-card { background: #fff; border: 2px solid #e1e3e5; border-radius: 12px; padding: 20px; position: relative; }
    .plan-card.active { border-color: #7b2ff7; }
    .plan-card.popular::before { content: 'Più popolare'; position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: #7b2ff7; color: white; font-size: 11px; font-weight: 600; padding: 3px 12px; border-radius: 20px; white-space: nowrap; }
    .plan-name { font-size: 16px; font-weight: 700; margin-bottom: 4px; }
    .plan-price { font-size: 28px; font-weight: 800; color: #7b2ff7; }
    .plan-price span { font-size: 14px; font-weight: 400; color: #6d7175; }
    .plan-calls { font-size: 13px; color: #6d7175; margin: 8px 0 16px; }
    .plan-features { list-style: none; margin-bottom: 20px; }
    .plan-features li { font-size: 13px; padding: 4px 0; color: #444; }
    .plan-features li::before { content: "✓ "; color: #7b2ff7; font-weight: bold; }
    .btn { display: block; width: 100%; padding: 10px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; border: none; text-align: center; text-decoration: none; transition: opacity 0.2s; }
    .btn:hover:not(:disabled) { opacity: 0.85; }
    .btn-primary { background: #7b2ff7; color: white; }
    .btn-active { background: #e1e3e5; color: #6d7175; cursor: default; }
    .btn-secondary { background: #fff; color: #7b2ff7; border: 2px solid #7b2ff7; }
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
    .alert-info { background: #cce5ff; border: 1px solid #b8daff; color: #004085; }
    .reinstall-btn { display: inline-block; margin-top: 12px; padding: 10px 20px; background: #7b2ff7; color: white; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; }
    /* Widget config */
    .config-card { background: #fff; border: 1px solid #e1e3e5; border-radius: 12px; padding: 24px; margin-bottom: 20px; }
    .config-card h2 { font-size: 16px; font-weight: 700; margin-bottom: 20px; }
    .form-group { margin-bottom: 20px; }
    .form-group label { display: block; font-size: 13px; font-weight: 600; color: #6d7175; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.04em; }
    .form-group input[type="text"], .form-group input[type="color"] { width: 100%; padding: 10px 12px; border: 1px solid #e1e3e5; border-radius: 8px; font-size: 14px; color: #202223; }
    .form-group input[type="color"] { height: 44px; padding: 4px 8px; cursor: pointer; }
    .color-row { display: flex; align-items: center; gap: 12px; }
    .color-preview { width: 44px; height: 44px; border-radius: 8px; border: 1px solid #e1e3e5; flex-shrink: 0; }
    .widget-preview { background: #f6f6f7; border: 1px solid #e1e3e5; border-radius: 12px; padding: 20px; margin-top: 20px; }
    .widget-preview h3 { font-size: 13px; font-weight: 600; color: #6d7175; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
    .preview-btn { padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; border: none; cursor: default; color: white; }
    .save-row { display: flex; justify-content: flex-end; margin-top: 24px; }
    .btn-save { background: #7b2ff7; color: white; border: none; padding: 10px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
    .btn-save:disabled { opacity: 0.5; cursor: default; }
    .save-msg { font-size: 13px; margin-right: 12px; padding: 10px 0; }
    .save-msg.ok { color: #155724; }
    .save-msg.err { color: #721c24; }
  </style>
</head>
<body>
<div class="header">
  <div class="logo">TS</div>
  <h1>TryStyleAI</h1>
</div>
<div class="nav-tabs">
  <button class="nav-tab active" data-tab="dashboard">Dashboard</button>
  <button class="nav-tab" data-tab="widget">Configura Widget</button>
</div>

<div id="tab-dashboard" class="tab-content active">
  <div class="container">
    <div id="app">
      <div class="loading"><div class="spinner"></div><p>Caricamento...</p></div>
    </div>
  </div>
</div>

<div id="tab-widget" class="tab-content">
  <div class="container">
    <div class="config-card">
      <h2>Personalizza il widget Virtual Try-On</h2>
      <div class="form-group">
        <label>Testo del bottone</label>
        <input type="text" id="btn-text" maxlength="40" placeholder="Prova questo outfit" />
      </div>
      <div class="form-group">
        <label>Colore del bottone</label>
        <div class="color-row">
          <input type="color" id="btn-color" value="#7b2ff7" />
          <div class="color-preview" id="color-preview" style="background:#7b2ff7"></div>
          <input type="text" id="btn-color-hex" value="#7b2ff7" style="max-width:120px" placeholder="#7b2ff7" />
        </div>
      </div>
      <div class="form-group">
        <label>Colore testo bottone</label>
        <div class="color-row">
          <input type="color" id="btn-text-color" value="#ffffff" />
          <div class="color-preview" id="text-color-preview" style="background:#ffffff;border:1px solid #ccc"></div>
          <input type="text" id="btn-text-color-hex" value="#ffffff" style="max-width:120px" placeholder="#ffffff" />
        </div>
      </div>
      <div class="widget-preview">
        <h3>Anteprima</h3>
        <button class="preview-btn" id="preview-btn" style="background:#7b2ff7;color:#ffffff">Prova questo outfit</button>
      </div>
      <div class="save-row">
        <span class="save-msg" id="save-msg"></span>
        <button class="btn-save" id="btn-save">Salva impostazioni</button>
      </div>
    </div>
  </div>
</div>

<script>
(function() {
  var urlParams = new URLSearchParams(window.location.search);
  var hostParam  = urlParams.get('host') || '';
  var idToken    = urlParams.get('id_token') || '';
  var shop       = urlParams.get('shop') || '';

  if (!shop && hostParam) {
    try { shop = atob(hostParam).split('/')[0]; } catch(e) {}
  }
  if (shop) { try { sessionStorage.setItem('trystyleai_shop', shop); } catch(e) {} }
  else { try { shop = sessionStorage.getItem('trystyleai_shop') || ''; } catch(e) {} }

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

  function getIdToken(cb) {
    if (window.shopify && window.shopify.idToken) {
      window.shopify.idToken().then(function(t) { cb(t); }).catch(function() { cb(idToken || null); });
      return;
    }
    cb(idToken || null);
  }

  function showInstallLink() {
    var installUrl = 'https://trystyleai-vercel.vercel.app/api/install?shop=' + encodeURIComponent(shop);
    document.getElementById('app').innerHTML =
      '<div class="alert alert-warning">Sessione scaduta o app non installata. ' +
      '<a href="' + installUrl + '" class="reinstall-btn">Reinstalla app</a></div>';
  }

  // ── Dashboard ────────────────────────────────────────────
  function loadDashboard() {
    if (!shop) {
      document.getElementById('app').innerHTML = '<div class="alert alert-danger">Parametro shop mancante.</div>';
      return;
    }

    // Controlla se arriviamo da conferma pagamento
    var fromConfirm = urlParams.get('confirmed') === '1';

    getIdToken(function(tok) {
      if (!tok) { showInstallLink(); return; }

      var body = { action: 'current', shop: shop, session_token: tok };
      var xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/billing');
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.onload = function() {
        try {
          var data = JSON.parse(xhr.responseText);
          if (data.error) throw new Error(data.error);
          renderDashboard(data, tok, fromConfirm);
        } catch(e) {
          renderDashboard({
            shop: shop, plan: 'none', planName: 'Nessun piano', status: 'pending',
            callsUsed: 0, callsLimit: 0,
            plans: [
              { key: 'basic',   name: 'TryStyleAI Basic',    price: 30,  calls: 80,  trialDays: 7 },
              { key: 'pro',     name: 'TryStyleAI Pro',      price: 85,  calls: 250, trialDays: 7 },
              { key: 'premium', name: 'TryStyleAI Business', price: 275, calls: 840, trialDays: 7 }
            ]
          }, tok, fromConfirm);
        }
      };
      xhr.onerror = function() { showInstallLink(); };
      xhr.send(JSON.stringify(body));
    });
  }

  function renderDashboard(data, tok, fromConfirm) {
    var pct = data.callsLimit > 0 ? Math.min(100, Math.round(data.callsUsed / data.callsLimit * 100)) : 0;
    var remaining = Math.max(0, data.callsLimit - data.callsUsed);
    var isDanger = pct >= 80;
    var isActive = data.status === 'active';
    var isTrial  = data.status === 'trialing' || data.status === 'pending';

    var statusClass = isActive ? 'badge-active' : isTrial ? 'badge-trial' : data.status === 'cancelled' ? 'badge-cancelled' : 'badge-none';
    var dotClass = isActive ? 'dot-green' : isTrial ? 'dot-blue' : data.status === 'cancelled' ? 'dot-red' : 'dot-yellow';
    var statusLabel = isActive ? 'Attivo' : isTrial ? 'Prova gratuita' : data.status === 'cancelled' ? 'Cancellato' : 'Nessun piano';

    // Alert conferma
    var confirmAlert = '';
    if (fromConfirm && data.plan !== 'none') {
      confirmAlert = '<div class="alert alert-success">🎉 Abbonamento attivato! Piano <strong>' + (data.planName || data.plan) + '</strong> ora attivo.</div>';
    }

    // Alert generazioni esaurite
    var exhaustedAlert = '';
    if (data.plan !== 'none' && data.callsLimit > 0 && remaining === 0) {
      exhaustedAlert = '<div class="alert alert-danger">⚠️ Generazioni esaurite per questo mese. Passa a un piano superiore per continuare.</div>';
    } else if (isDanger && data.plan !== 'none') {
      exhaustedAlert = '<div class="alert alert-warning">⚠️ Hai usato oltre l\'80% delle generazioni disponibili questo mese.</div>';
    }

    var usageHtml = (data.plan !== 'none' && data.callsLimit > 0)
      ? '<div class="usage-card"><h2>Utilizzo questo mese</h2>' +
        '<div class="usage-numbers">' +
        '<div class="usage-stat"><div class="value">' + data.callsUsed + '</div><div class="label">Usate</div></div>' +
        '<div class="usage-stat"><div class="value ' + (remaining === 0 ? 'danger' : '') + '">' + remaining + '</div><div class="label">Rimaste</div></div>' +
        '<div class="usage-stat"><div class="value">' + data.callsLimit + '</div><div class="label">Totale</div></div>' +
        '</div><div class="progress-wrap"><div class="progress-bar">' +
        '<div class="progress-fill ' + (isDanger ? 'danger' : '') + '" style="width:' + pct + '%"></div></div>' +
        '<div class="progress-label"><span>' + pct + '% utilizzato</span><span>' + remaining + ' rimanenti</span></div></div></div>'
      : '';

    var plansHtml = (data.plans || []).map(function(p) {
      var isPlanActive = p.key === data.plan && (isActive || isTrial);
      return '<div class="plan-card ' + (isPlanActive ? 'active' : '') + ' ' + (p.key === 'pro' ? 'popular' : '') + '">' +
        '<div class="plan-name">' + p.name + '</div>' +
        '<div class="plan-price">€' + p.price + '<span>/mese</span></div>' +
        '<div class="plan-calls">' + p.calls + ' generazioni/mese</div>' +
        '<ul class="plan-features"><li>Virtual Try-On con AI</li><li>Installazione automatica</li><li>Dashboard analytics</li>' +
        (p.key !== 'basic' ? '<li>Supporto prioritario</li>' : '') + '</ul>' +
        (isPlanActive
          ? '<div class="btn btn-active">Piano attuale</div>'
          : '<button data-plan="' + p.key + '" class="btn btn-primary subscribe-btn">Prova gratis ' + p.trialDays + ' giorni</button>' +
            '<div class="trial-note">Poi €' + p.price + '/mese · Annulla quando vuoi</div>'
        ) + '</div>';
    }).join('');

    document.getElementById('app').innerHTML =
      confirmAlert + exhaustedAlert +
      '<div class="status-banner">' +
        '<div><div style="font-size:13px;color:#6d7175;margin-bottom:4px">Negozio</div><div style="font-weight:600">' + (data.shop || shop) + '</div></div>' +
        '<div><div style="font-size:13px;color:#6d7175;margin-bottom:4px">Piano</div><div style="font-weight:600">' + (data.planName || 'Nessun piano') + '</div></div>' +
        '<div><span class="status-badge ' + statusClass + '"><span class="dot ' + dotClass + '"></span>' + statusLabel + '</span></div>' +
      '</div>' +
      usageHtml +
      '<div class="section-title">' + (data.plan === 'none' ? 'Scegli il tuo piano' : 'Cambia piano') + '</div>' +
      '<div class="plans-grid">' + plansHtml + '</div>';

    // Salva tok per click handler
    window._trystyleai_tok = tok;
  }

  // Click sui piani
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('.subscribe-btn');
    if (!btn) return;
    e.preventDefault();
    var planKey = btn.getAttribute('data-plan');
    if (!planKey) return;
    btn.disabled = true;
    btn.textContent = 'Attendi...';

    getIdToken(function(freshTok) {
      var body = { action: 'subscribe', shop: shop, plan: planKey };
      if (freshTok) body.session_token = freshTok;

      var xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/billing');
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.onload = function() {
        try {
          var data = JSON.parse(xhr.responseText);
          if (data.confirmationUrl) {
            if (window.top && window.top !== window) {
              window.top.location.href = data.confirmationUrl;
            } else {
              window.location.href = data.confirmationUrl;
            }
          } else if (data.error) {
            alert('Errore: ' + data.error);
            btn.disabled = false;
            btn.textContent = 'Prova gratis';
          }
        } catch(err) {
          alert('Errore imprevisto');
          btn.disabled = false;
          btn.textContent = 'Prova gratis';
        }
      };
      xhr.onerror = function() {
        alert('Errore di rete');
        btn.disabled = false;
        btn.textContent = 'Prova gratis';
      };
      xhr.send(JSON.stringify(body));
    });
  });

  // ── Widget config ────────────────────────────────────────
  function loadWidgetConfig() {
    getIdToken(function(tok) {
      if (!tok) return;
      var body = { action: 'get_config', shop: shop, session_token: tok };
      var xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/billing');
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.onload = function() {
        try {
          var cfg = JSON.parse(xhr.responseText);
          if (cfg.btnText)      document.getElementById('btn-text').value = cfg.btnText;
          if (cfg.btnColor)     { document.getElementById('btn-color').value = cfg.btnColor; document.getElementById('btn-color-hex').value = cfg.btnColor; document.getElementById('color-preview').style.background = cfg.btnColor; }
          if (cfg.btnTextColor) { document.getElementById('btn-text-color').value = cfg.btnTextColor; document.getElementById('btn-text-color-hex').value = cfg.btnTextColor; document.getElementById('text-color-preview').style.background = cfg.btnTextColor; }
          updatePreview();
        } catch(e) {}
      };
      xhr.send(JSON.stringify(body));
    });
  }

  function updatePreview() {
    var text  = document.getElementById('btn-text').value || 'Prova questo outfit';
    var color = document.getElementById('btn-color').value || '#7b2ff7';
    var tColor = document.getElementById('btn-text-color').value || '#ffffff';
    var btn = document.getElementById('preview-btn');
    btn.textContent = text;
    btn.style.background = color;
    btn.style.color = tColor;
  }

  // Sync color picker ↔ hex input
  document.getElementById('btn-color').addEventListener('input', function() {
    document.getElementById('btn-color-hex').value = this.value;
    document.getElementById('color-preview').style.background = this.value;
    updatePreview();
  });
  document.getElementById('btn-color-hex').addEventListener('input', function() {
    var v = this.value;
    if (/^#[0-9a-fA-F]{6}$/.test(v)) { document.getElementById('btn-color').value = v; document.getElementById('color-preview').style.background = v; updatePreview(); }
  });
  document.getElementById('btn-text-color').addEventListener('input', function() {
    document.getElementById('btn-text-color-hex').value = this.value;
    document.getElementById('text-color-preview').style.background = this.value;
    updatePreview();
  });
  document.getElementById('btn-text-color-hex').addEventListener('input', function() {
    var v = this.value;
    if (/^#[0-9a-fA-F]{6}$/.test(v)) { document.getElementById('btn-text-color').value = v; document.getElementById('text-color-preview').style.background = v; updatePreview(); }
  });
  document.getElementById('btn-text').addEventListener('input', updatePreview);

  // Salva config
  document.getElementById('btn-save').addEventListener('click', function() {
    var saveBtn = this;
    var msg = document.getElementById('save-msg');
    saveBtn.disabled = true;
    msg.textContent = '';

    getIdToken(function(tok) {
      var body = {
        action: 'save_config',
        shop: shop,
        session_token: tok,
        btnText: document.getElementById('btn-text').value || 'Prova questo outfit',
        btnColor: document.getElementById('btn-color').value || '#7b2ff7',
        btnTextColor: document.getElementById('btn-text-color').value || '#ffffff'
      };
      var xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/billing');
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.onload = function() {
        saveBtn.disabled = false;
        try {
          var r = JSON.parse(xhr.responseText);
          if (r.ok) { msg.textContent = '✓ Salvato!'; msg.className = 'save-msg ok'; }
          else { msg.textContent = 'Errore salvataggio'; msg.className = 'save-msg err'; }
        } catch(e) { msg.textContent = 'Errore'; msg.className = 'save-msg err'; }
        setTimeout(function() { msg.textContent = ''; }, 3000);
      };
      xhr.onerror = function() { saveBtn.disabled = false; msg.textContent = 'Errore di rete'; msg.className = 'save-msg err'; };
      xhr.send(JSON.stringify(body));
    });
  });

  loadDashboard();
  loadWidgetConfig();
})();
</script>
</body>
</html>`;

  res.status(200).send(html);
};
