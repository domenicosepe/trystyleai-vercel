// api/app.js — Dashboard embedded TryStyleAI
module.exports = (req, res) => {
  const { shop, host } = req.query;
  // NOTA: 'token' rimosso dai query params — ora usiamo session token via App Bridge v4

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Frame-Options', 'ALLOWALL');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'self' https://*.myshopify.com https://admin.shopify.com");
  res.status(200).send(`<!DOCTYPE html>
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
    .plan-card.popular::before { content: 'Più popolare'; position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: #7b2ff7; color: white; font-size: 11px; font-weight: 600; padding: 3px 12px; border-radius: 20px; }
    .plan-name { font-size: 16px; font-weight: 700; margin-bottom: 4px; }
    .plan-price { font-size: 28px; font-weight: 800; color: #7b2ff7; }
    .plan-price span { font-size: 14px; font-weight: 400; color: #6d7175; }
    .plan-calls { font-size: 13px; color: #6d7175; margin: 8px 0 16px; }
    .plan-features { list-style: none; margin-bottom: 20px; }
    .plan-features li { font-size: 13px; padding: 4px 0; color: #444; }
    .plan-features li::before { content: '✓ '; color: #7b2ff7; font-weight: bold; }
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
    .reinstall-btn { display: inline-block; margin-top: 12px; padding: 10px 20px; background: #7b2ff7; color: white; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; border: none; cursor: pointer; }
  </style>
</head>
<body>
<div class="header">
  <div class="logo">TS</div>
  <h1>TryStyleAI</h1>
</div>
<div class="container">
  <div id="app">
    <div class="loading"><div class="spinner"></div>Caricamento...</div>
  </div>
</div>
<script>
  // ── Parametri URL ──────────────────────────────────────────
  const urlParams = new URLSearchParams(window.location.search);
  const hostParam  = urlParams.get('host')     || '';
  const idToken    = urlParams.get('id_token') || '';  // JWT da App Bridge v4
  let   shop       = urlParams.get('shop')     || '';

  // Decodifica shop da host se manca
  if (!shop && hostParam) {
    try { shop = atob(hostParam).split('/')[0]; } catch(e) {}
  }

  // Persistenza shop
  if (shop) sessionStorage.setItem('trystyleai_shop', shop);
  else      shop = sessionStorage.getItem('trystyleai_shop') || '';

  // ── App Bridge v4 (CDN Shopify) ────────────────────────────
  // Con App Bridge v4 il session token arriva già nell'URL come id_token.
  // Usiamo window.shopify.idToken() per refresharlo quando scade.
  let _sessionTokenFn = null;
  if (window.shopify) {
    _sessionTokenFn = () => window.shopify.idToken();
  }

  async function getIdToken() {
    // 1) prova App Bridge v4 globale
    if (_sessionTokenFn) {
      try { return await _sessionTokenFn(); } catch(e) {}
    }
    // 2) usa quello già nell'URL (primo caricamento)
    if (idToken) return idToken;
    // 3) leggi il token OAuth dal cookie (fallback install classico)
    try {
      const cookieKey = 'ts_token_' + shop.replace(/\./g, '_');
      const match = document.cookie.split(';').map(c => c.trim())
        .find(c => c.startsWith(cookieKey + '='));
      if (match) return '__oauth__' + decodeURIComponent(match.split('=').slice(1).join('='));
    } catch(e) {}
    return null;
  }

  // ── Redirect a install ─────────────────────────────────────
  function redirectToInstall() {
    const installUrl = 'https://trystyleai-vercel.vercel.app/api/install?shop=' + encodeURIComponent(shop);
    // App Bridge v4
    if (window.shopify && window.shopify.navigate) {
      try { window.shopify.navigate(installUrl); return; } catch(e) {}
    }
    // App Bridge v3 fallback
    const AB = window['app-bridge'];
    if (AB && hostParam) {
      try {
        const app3 = AB.default({ apiKey: '8cc69e33dd6444c334c764b246282af9', host: hostParam, forceRedirect: true });
        AB.actions.Redirect.create(app3).dispatch(AB.actions.Redirect.Action.REMOTE, installUrl);
        return;
      } catch(e) {}
    }
    // Ultimo fallback — link visibile
    document.getElementById('app').innerHTML =
      '<div class="alert alert-warning">Sessione scaduta. <a href="' + installUrl + '" class="reinstall-btn">Reinstalla l\'app</a></div>';
  }

  // ── Carica dashboard ───────────────────────────────────────
  async function loadDashboard() {
    if (!shop) {
      document.getElementById('app').innerHTML =
        '<div class="alert alert-danger">Parametro shop mancante. Apri l\'app dall\'admin Shopify.</div>';
      return;
    }

    try {
      const tok = await getIdToken();
      if (!tok) { redirectToInstall(); return; }

      // Determina se è un session JWT o un token OAuth
      const isOAuth = tok.startsWith('__oauth__');
      const authParam = isOAuth
        ? '&token=' + encodeURIComponent(tok.slice(9))
        : '&session_token=' + encodeURIComponent(tok);

      const res = await fetch('/api/billing?action=current&shop=' + encodeURIComponent(shop) + authParam);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      renderDashboard(data, tok, isOAuth);
    } catch(err) {
      console.error('Dashboard error:', err);
      // Mostra dashboard con piani anche senza token (utente nuovo)
      renderDashboard({
        shop, plan: 'none', planName: 'Nessun piano', status: 'pending',
        callsUsed: 0, callsLimit: 0,
        plans: [
          { key: 'basic',   name: 'TryStyleAI Basic',    price: 30,  calls: 80,  trialDays: 7 },
          { key: 'pro',     name: 'TryStyleAI Pro',      price: 85,  calls: 250, trialDays: 7 },
          { key: 'premium', name: 'TryStyleAI Business', price: 275, calls: 840, trialDays: 7 }
        ]
      }, '', false);
    }
  }

  // ── Renderizza dashboard ───────────────────────────────────
  function renderDashboard(data, tok, isOAuth) {
    const pct = data.callsLimit > 0 ? Math.min(100, Math.round(data.callsUsed / data.callsLimit * 100)) : 0;
    const remaining = Math.max(0, data.callsLimit - data.callsUsed);
    const statusClass = data.status === 'active' ? 'badge-active'
      : data.status === 'pending' ? 'badge-pending'
      : data.status === 'cancelled' ? 'badge-cancelled'
      : 'badge-none';
    const dotClass = data.status === 'active' ? 'dot-green'
      : data.status === 'pending' ? 'dot-yellow'
      : 'dot-red';

    // oauthTok: se il tok è OAuth rimuove il prefisso __oauth__, altrimenti stringa vuota
    // (per session token JWT non passiamo il tok nei link — billing lo riceve come session_token)
    const oauthTok = (isOAuth && tok) ? tok.slice(9) : '';
    const shopEnc = encodeURIComponent(shop);

    const plansHtml = (data.plans || []).map(p => {
      const isActive = p.key === data.plan && data.status === 'active';
      // Se abbiamo un oauthTok lo usiamo, altrimenti il browser passerà il session_token via URL
      const btnUrl = oauthTok
        ? '/api/billing?action=subscribe&shop=' + shopEnc + '&plan=' + p.key + '&token=' + encodeURIComponent(oauthTok)
        : '/api/billing?action=subscribe&shop=' + shopEnc + '&plan=' + p.key + (idToken ? '&session_token=' + encodeURIComponent(idToken) : '');
      return '<div class="plan-card ' + (isActive ? 'active' : '') + ' ' + (p.key === 'pro' ? 'popular' : '') + '">' +
        '<div class="plan-name">' + p.name + '</div>' +
        '<div class="plan-price">€' + p.price + '<span>/mese</span></div>' +
        '<div class="plan-calls">' + p.calls + ' generazioni/mese</div>' +
        '<ul class="plan-features"><li>Virtual Try-On con AI</li><li>Installazione automatica</li><li>Dashboard analytics</li>' +
        (p.key !== 'basic' ? '<li>Supporto prioritario</li>' : '') + '</ul>' +
        (isActive
          ? '<div class="btn btn-active">Piano attuale</div>'
          : '<a href="' + btnUrl + '" class="btn btn-primary">Prova gratis ' + p.trialDays + ' giorni</a>' +
            '<div class="trial-note">Poi €' + p.price + '/mese · annulla quando vuoi</div>'
        ) +
      '</div>';
    }).join('');

    document.getElementById('app').innerHTML =
      '<div class="status-banner">' +
        '<div><div style="font-size:13px;color:#6d7175;margin-bottom:4px">Negozio</div>' +
        '<div style="font-weight:600">' + (data.shop || shop) + '</div></div>' +
        '<div><div style="font-size:13px;color:#6d7175;margin-bottom:4px">Piano</div>' +
        '<div style="font-weight:600">' + (data.planName || 'Nessun piano') + '</div></div>' +
        '<div><span class="status-badge ' + statusClass + '">' +
          '<span class="dot ' + dotClass + '"></span>' +
          (data.status === 'active' ? 'Attivo' : data.status === 'pending' ? 'In attesa' : 'Nessun piano') +
        '</span></div>' +
      '</div>' +
      (data.plan !== 'none' && data.callsLimit > 0
        ? '<div class="usage-card"><h2>Utilizzo questo mese</h2>' +
          '<div class="usage-numbers">' +
          '<div class="usage-stat"><div class="value">' + data.callsUsed + '</div><div class="label">Usate</div></div>' +
          '<div class="usage-stat"><div class="value">' + remaining + '</div><div class="label">Rimaste</div></div>' +
          '<div class="usage-stat"><div class="value">' + data.callsLimit + '</div><div class="label">Totale</div></div>' +
          '</div>' +
          '<div class="progress-wrap"><div class="progress-bar">' +
          '<div class="progress-fill" style="width:' + pct + '%"></div></div>' +
          '<div class="progress-label"><span>' + pct + '% utilizzato</span><span>' + remaining + ' rimanenti</span></div></div>' +
          '</div>'
        : '') +
      '<div class="section-title">' + (data.plan === 'none' ? 'Scegli il tuo piano' : 'Cambia piano') + '</div>' +
      '<div class="plans-grid">' + plansHtml + '</div>';
  }

  loadDashboard();
</script>
</body>
</html>`);
};
