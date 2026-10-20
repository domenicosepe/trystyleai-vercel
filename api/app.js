// api/app.js — Dashboard embedded TryStyleAI
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
    .container { padding: 24px; max-width: 960px; margin: 0 auto; }
    .status-banner { background: #fff; border: 1px solid #e1e3e5; border-radius: 12px; padding: 20px 24px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
    .status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 600; }
    .badge-active { background: #d4edda; color: #155724; }
    .badge-pending { background: #fff3cd; color: #856404; }
    .badge-cancelled { background: #f8d7da; color: #721c24; }
    .badge-none { background: #e2e3e5; color: #383d41; }
    .usage-card { background: #fff; border: 1px solid #e1e3e5; border-radius: 12px; padding: 20px 24px; margin-bottom: 20px; }
    .usage-card h2 { font-size: 15px; font-weight: 600; margin-bottom: 16px; color: #6d7175; text-transform: uppercase; letter-spacing: 0.05em; }
    .usage-numbers { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 16px; }
    .usage-stat { text-align: center; }
    .usage-stat .value { font-size: 32px; font-weight: 700; color: #7b2ff7; }
    .usage-stat .label { font-size: 12px; color: #6d7175; margin-top: 4px; }
    .progress-wrap { margin-top: 16px; }
    .progress-bar { height: 8px; background: #e1e3e5; border-radius: 4px; overflow: hidden; }
    .progress-fill { height: 100%; background: linear-gradient(90deg, #7b2ff7, #00c6ff); border-radius: 4px; transition: width 0.4s ease; }
    .progress-label { display: flex; justify-content: space-between; font-size: 12px; color: #6d7175; margin-top: 6px; }
    .plans-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; margin-bottom: 20px; }
    .plan-card { background: #fff; border: 2px solid #e1e3e5; border-radius: 12px; padding: 20px; position: relative; }
    .plan-card.active { border-color: #7b2ff7; }
    .plan-card.popular::before { content: 'Piu popolare'; position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: #7b2ff7; color: white; font-size: 11px; font-weight: 600; padding: 3px 12px; border-radius: 20px; }
    .plan-name { font-size: 16px; font-weight: 700; margin-bottom: 4px; }
    .plan-price { font-size: 28px; font-weight: 800; color: #7b2ff7; }
    .plan-price span { font-size: 14px; font-weight: 400; color: #6d7175; }
    .plan-calls { font-size: 13px; color: #6d7175; margin: 8px 0 16px; }
    .plan-features { list-style: none; margin-bottom: 20px; }
    .plan-features li { font-size: 13px; padding: 4px 0; color: #444; }
    .plan-features li::before { content: "v "; color: #7b2ff7; font-weight: bold; }
    .btn { display: block; width: 100%; padding: 10px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; border: none; text-align: center; text-decoration: none; transition: opacity 0.2s; }
    .btn:hover { opacity: 0.85; }
    .btn-primary { background: #7b2ff7; color: white; }
    .btn-active { background: #e1e3e5; color: #6d7175; cursor: default; }
    .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
    .dot-green { background: #00a047; }
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
    .reinstall-btn { display: inline-block; margin-top: 12px; padding: 10px 20px; background: #7b2ff7; color: white; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; }
  </style>
</head>
<body>
<div class="header">
  <div class="logo">TS</div>
  <h1>TryStyleAI</h1>
</div>
<div class="container">
  <div id="app">
    <div class="loading"><div class="spinner"></div><p>Caricamento...</p></div>
  </div>
</div>
<script>
(function() {
  var urlParams = new URLSearchParams(window.location.search);
  var hostParam  = urlParams.get('host') || '';
  var idToken    = urlParams.get('id_token') || '';
  var shop       = urlParams.get('shop') || '';
  var urlToken   = urlParams.get('token') || '';

  if (!shop && hostParam) {
    try { shop = atob(hostParam).split('/')[0]; } catch(e) {}
  }
  if (shop) { try { sessionStorage.setItem('trystyleai_shop', shop); } catch(e) {} }
  else { try { shop = sessionStorage.getItem('trystyleai_shop') || ''; } catch(e) {} }

  // Salva token OAuth in sessionStorage se arriva dall'URL (post-install)
  if (urlToken) { try { sessionStorage.setItem('trystyleai_token_' + shop, urlToken); } catch(e) {} }
  var savedToken = '';
  try { savedToken = sessionStorage.getItem('trystyleai_token_' + shop) || ''; } catch(e) {}

  function getIdToken(cb) {
    if (window.shopify && window.shopify.idToken) {
      window.shopify.idToken().then(function(t) { cb(t); }).catch(function() {
        cb(idToken || getCookieToken());
      });
      return;
    }
    cb(idToken || getCookieToken());
  }

  function getCookieToken() {
    try {
      var key = 'ts_token_' + shop.replace(/\./g, '_');
      var match = document.cookie.split(';').map(function(c) { return c.trim(); })
        .find(function(c) { return c.indexOf(key + '=') === 0; });
      if (match) return '__oauth__' + decodeURIComponent(match.split('=').slice(1).join('='));
    } catch(e) {}
    return null;
  }

  function showInstallLink() {
    var installUrl = 'https://trystyleai-vercel.vercel.app/api/install?shop=' + encodeURIComponent(shop);
    if (window.shopify && window.shopify.navigate) {
      try { window.shopify.navigate(installUrl); return; } catch(e) {}
    }
    document.getElementById('app').innerHTML =
      '<div class="alert alert-warning">Sessione scaduta. ' +
      '<a href="' + installUrl + '" class="reinstall-btn">Reinstalla app</a></div>';
  }

  function loadDashboard() {
    if (!shop) {
      document.getElementById('app').innerHTML =
        '<div class="alert alert-danger">Parametro shop mancante.</div>';
      return;
    }

    getIdToken(function(tok) {
      if (!tok) { showInstallLink(); return; }

      var isOAuth = tok.indexOf('__oauth__') === 0;
      var authParam = isOAuth
        ? '&token=' + encodeURIComponent(tok.slice(9))
        : '&session_token=' + encodeURIComponent(tok);

      var xhr = new XMLHttpRequest();
      xhr.open('GET', '/api/billing?action=current&shop=' + encodeURIComponent(shop) + authParam);
      xhr.onload = function() {
        try {
          var data = JSON.parse(xhr.responseText);
          if (data.error) throw new Error(data.error);
          renderDashboard(data, tok, isOAuth);
        } catch(e) {
          showFallback(tok, isOAuth);
        }
      };
      xhr.onerror = function() { showFallback(tok, isOAuth); };
      xhr.send();
    });
  }

  function showFallback(tok, isOAuth) {
    renderDashboard({
      shop: shop, plan: 'none', planName: 'Nessun piano', status: 'pending',
      callsUsed: 0, callsLimit: 0,
      plans: [
        { key: 'basic',   name: 'TryStyleAI Basic',    price: 30,  calls: 80,  trialDays: 7 },
        { key: 'pro',     name: 'TryStyleAI Pro',      price: 85,  calls: 250, trialDays: 7 },
        { key: 'premium', name: 'TryStyleAI Business', price: 275, calls: 840, trialDays: 7 }
      ]
    }, tok, isOAuth);
  }

  function renderDashboard(data, tok, isOAuth) {
    var pct = data.callsLimit > 0 ? Math.min(100, Math.round(data.callsUsed / data.callsLimit * 100)) : 0;
    var remaining = Math.max(0, data.callsLimit - data.callsUsed);
    var statusClass = data.status === 'active' ? 'badge-active'
      : data.status === 'pending' ? 'badge-pending'
      : data.status === 'cancelled' ? 'badge-cancelled' : 'badge-none';
    var dotClass = data.status === 'active' ? 'dot-green'
      : data.status === 'pending' ? 'dot-yellow' : 'dot-red';
    // tok può essere: session token JWT (da App Bridge) o oauth token (__oauth__...)
    var oauthTok = (isOAuth && tok) ? tok.slice(9) : '';
    // sessionJwt è il token JWT di App Bridge — lo passiamo a billing per il token exchange server-side
    var sessionJwt = (!isOAuth && tok) ? tok : '';
    var shopEnc = encodeURIComponent(shop);

    var plansHtml = (data.plans || []).map(function(p) {
      var isActive = p.key === data.plan && data.status === 'active';
      var btnUrl;
      if (oauthTok) {
        // Abbiamo il token OAuth direttamente (raro — solo se arriva da cookie)
        btnUrl = '/api/billing?action=subscribe&shop=' + shopEnc + '&plan=' + p.key + '&token=' + encodeURIComponent(oauthTok);
      } else if (sessionJwt) {
        // Usiamo il session token JWT — billing.js lo scambia server-side con il token OAuth
        btnUrl = '/api/billing?action=subscribe&shop=' + shopEnc + '&plan=' + p.key + '&session_token=' + encodeURIComponent(sessionJwt);
      } else {
        // Nessun token disponibile — billing reindirizza a install
        btnUrl = '/api/billing?action=subscribe&shop=' + shopEnc + '&plan=' + p.key;
      }
      var extra = p.key !== 'basic' ? '<li>Supporto prioritario</li>' : '';
      var planKey = p.key;
      return '<div class="plan-card ' + (isActive ? 'active' : '') + ' ' + (p.key === 'pro' ? 'popular' : '') + '">' +
        '<div class="plan-name">' + p.name + '</div>' +
        '<div class="plan-price">EUR ' + p.price + '<span>/mese</span></div>' +
        '<div class="plan-calls">' + p.calls + ' generazioni/mese</div>' +
        '<ul class="plan-features"><li>Virtual Try-On con AI</li><li>Installazione automatica</li><li>Dashboard analytics</li>' + extra + '</ul>' +
        (isActive
          ? '<div class="btn btn-active">Piano attuale</div>'
          : '<button data-plan="' + planKey + '" data-url="' + btnUrl.replace(/"/g, '&quot;') + '" class="btn btn-primary subscribe-btn">Prova gratis ' + p.trialDays + ' giorni</button>' +
            '<div class="trial-note">Poi EUR ' + p.price + '/mese - annulla quando vuoi</div>'
        ) + '</div>';
    }).join('');

    var usageHtml = (data.plan !== 'none' && data.callsLimit > 0)
      ? '<div class="usage-card"><h2>Utilizzo questo mese</h2>' +
        '<div class="usage-numbers">' +
        '<div class="usage-stat"><div class="value">' + data.callsUsed + '</div><div class="label">Usate</div></div>' +
        '<div class="usage-stat"><div class="value">' + remaining + '</div><div class="label">Rimaste</div></div>' +
        '<div class="usage-stat"><div class="value">' + data.callsLimit + '</div><div class="label">Totale</div></div>' +
        '</div><div class="progress-wrap"><div class="progress-bar">' +
        '<div class="progress-fill" style="width:' + pct + '%"></div></div>' +
        '<div class="progress-label"><span>' + pct + '% utilizzato</span><span>' + remaining + ' rimanenti</span></div></div></div>'
      : '';

    var statusLabel = data.status === 'active' ? 'Attivo' : data.status === 'pending' ? 'In attesa' : 'Nessun piano';

    document.getElementById('app').innerHTML =
      '<div class="status-banner">' +
        '<div><div style="font-size:13px;color:#6d7175;margin-bottom:4px">Negozio</div><div style="font-weight:600">' + (data.shop || shop) + '</div></div>' +
        '<div><div style="font-size:13px;color:#6d7175;margin-bottom:4px">Piano</div><div style="font-weight:600">' + (data.planName || 'Nessun piano') + '</div></div>' +
        '<div><span class="status-badge ' + statusClass + '"><span class="dot ' + dotClass + '"></span>' + statusLabel + '</span></div>' +
      '</div>' +
      usageHtml +
      '<div class="section-title">' + (data.plan === 'none' ? 'Scegli il tuo piano' : 'Cambia piano') + '</div>' +
      '<div class="plans-grid">' + plansHtml + '</div>';
  }

  document.addEventListener('click', function(e) {
    var btn = e.target.closest('.subscribe-btn');
    if (!btn) return;
    e.preventDefault();

    var planKey = btn.getAttribute('data-plan');
    if (!planKey) return;

    btn.disabled = true;
    btn.textContent = 'Attendi...';

    // Prende token fresco al click e fa fetch XHR (non navigazione top-frame)
    // così il session_token arriva correttamente al backend
    getIdToken(function(freshTok) {
      console.log('[TryStyleAI] freshTok tipo:', freshTok ? (freshTok.indexOf('__oauth__') === 0 ? 'oauth' : 'jwt') : 'null');
      console.log('[TryStyleAI] freshTok lunghezza:', freshTok ? freshTok.length : 0);
      var params = 'action=subscribe&shop=' + encodeURIComponent(shop) + '&plan=' + planKey;
      if (freshTok && freshTok.indexOf('__oauth__') !== 0) {
        params += '&session_token=' + encodeURIComponent(freshTok);
      }
      console.log('[TryStyleAI] XHR params (senza token):', 'action=subscribe&shop=' + encodeURIComponent(shop) + '&plan=' + planKey);

      var xhr = new XMLHttpRequest();
      xhr.open('GET', '/api/billing?' + params);
      xhr.onload = function() {
        try {
          var data = JSON.parse(xhr.responseText);
          if (data.confirmationUrl) {
            // Redirect top-frame verso pagina conferma pagamento Shopify
            if (window.top && window.top !== window) {
              window.top.location.href = data.confirmationUrl;
            } else {
              window.location.href = data.confirmationUrl;
            }
          } else if (data.redirectUrl) {
            window.location.href = data.redirectUrl;
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
      xhr.send();
    });
  });

  window.subscribePlan = function(planKey, url) {
    // App Bridge top-level redirect — evita il blocco X-Frame-Options di Shopify OAuth
    if (window.shopify && window.shopify.navigate) {
      window.shopify.navigate(url);
    } else if (window.top) {
      window.top.location.href = url;
    } else {
      window.location.href = url;
    }
  };

  loadDashboard();
})();
</script>
</body>
</html>`;

  res.status(200).send(html);
};
