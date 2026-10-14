// api/demo.js — Demo mode per screencast (no billing reale)
module.exports = (req, res) => {
  const { step } = req.query;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Frame-Options', 'ALLOWALL');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'self' https://*.myshopify.com https://admin.shopify.com");

  res.status(200).send(`<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TryStyleAI</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f6f6f7; color: #202223; }
    .header { background: #fff; border-bottom: 1px solid #e1e3e5; padding: 16px 24px; display: flex; align-items: center; gap: 12px; }
    .logo { width: 32px; height: 32px; background: linear-gradient(135deg, #7b2ff7, #00c6ff); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px; }
    .container { padding: 24px; max-width: 960px; margin: 0 auto; }
    .status-banner { background: #fff; border: 1px solid #e1e3e5; border-radius: 12px; padding: 20px 24px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
    .status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 600; }
    .badge-active { background: #d4edda; color: #155724; }
    .badge-pending { background: #fff3cd; color: #856404; }
    .badge-none { background: #e2e3e5; color: #383d41; }
    .usage-card { background: #fff; border: 1px solid #e1e3e5; border-radius: 12px; padding: 20px 24px; margin-bottom: 20px; }
    .usage-card h2 { font-size: 15px; font-weight: 600; margin-bottom: 16px; color: #6d7175; text-transform: uppercase; letter-spacing: 0.05em; }
    .usage-numbers { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .usage-stat { text-align: center; }
    .usage-stat .value { font-size: 32px; font-weight: 700; color: #7b2ff7; }
    .usage-stat .label { font-size: 12px; color: #6d7175; margin-top: 4px; }
    .progress-wrap { margin-top: 16px; }
    .progress-bar { height: 8px; background: #e1e3e5; border-radius: 4px; overflow: hidden; }
    .progress-fill { height: 100%; background: linear-gradient(90deg, #7b2ff7, #00c6ff); border-radius: 4px; }
    .progress-label { display: flex; justify-content: space-between; font-size: 12px; color: #6d7175; margin-top: 6px; }
    .plans-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 20px; }
    .plan-card { background: #fff; border: 2px solid #e1e3e5; border-radius: 12px; padding: 20px; position: relative; }
    .plan-card.active { border-color: #7b2ff7; }
    .plan-card.popular::before { content: 'Più popolare'; position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: #7b2ff7; color: white; font-size: 11px; font-weight: 600; padding: 3px 12px; border-radius: 20px; white-space: nowrap; }
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
    .section-title { font-size: 18px; font-weight: 700; margin-bottom: 16px; }
    .trial-note { font-size: 12px; color: #6d7175; text-align: center; margin-top: 8px; }
    /* Demo screens */
    .screen { display: none; }
    .screen.active { display: block; }
    /* Billing confirm page */
    .billing-page { max-width: 600px; margin: 60px auto; background: #fff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 24px rgba(0,0,0,.08); text-align: center; }
    .billing-page h2 { font-size: 22px; margin-bottom: 8px; }
    .billing-page .price-big { font-size: 48px; font-weight: 800; color: #7b2ff7; margin: 24px 0 8px; }
    .billing-page .trial-info { background: #f0f9ff; border: 1px solid #bde4ff; border-radius: 8px; padding: 12px 16px; margin: 16px 0; font-size: 14px; color: #0066cc; }
    .billing-page .btn-approve { background: #7b2ff7; color: white; border: none; width: 100%; padding: 14px; border-radius: 10px; font-size: 16px; font-weight: 700; cursor: pointer; margin-top: 16px; }
    /* Widget screen */
    .product-page { max-width: 900px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; padding: 24px; }
    .product-image { background: #f0f0f0; border-radius: 12px; aspect-ratio: 3/4; display: flex; align-items: center; justify-content: center; color: #aaa; font-size: 18px; }
    .product-info h1 { font-size: 24px; margin-bottom: 8px; }
    .product-price { font-size: 22px; font-weight: 700; margin-bottom: 20px; }
    .add-btn { background: #111; color: white; border: none; width: 100%; padding: 14px; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; margin-bottom: 16px; }
    .widget-box { border: 2px solid #7b2ff7; border-radius: 12px; overflow: hidden; margin-top: 8px; }
    .widget-header { background: linear-gradient(135deg, #7b2ff7, #00c6ff); padding: 12px 16px; display: flex; align-items: center; gap: 10px; color: white; font-weight: 600; font-size: 14px; }
    .widget-body { padding: 16px; }
    .upload-area { border: 2px dashed #c9b8f5; border-radius: 10px; padding: 24px; text-align: center; background: #f8f6ff; cursor: pointer; margin-bottom: 12px; }
    .upload-area .icon { font-size: 28px; margin-bottom: 8px; }
    .upload-area p { font-size: 13px; color: #7b2ff7; font-weight: 600; }
    .upload-area small { color: #6d7175; font-size: 11px; }
    .try-btn { background: #7b2ff7; color: white; border: none; width: 100%; padding: 11px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
    /* Result screen */
    .result-page { max-width: 900px; margin: 0 auto; padding: 24px; }
    .result-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 16px; }
    .result-card { border-radius: 12px; overflow: hidden; border: 1px solid #e1e3e5; }
    .result-card-header { background: #f6f6f7; padding: 10px 16px; font-size: 13px; font-weight: 600; color: #6d7175; }
    .result-card-body { background: #f0f0f0; aspect-ratio: 3/4; display: flex; align-items: center; justify-content: center; }
    .result-card-body.ai { background: linear-gradient(135deg, #1a0533, #0a0a1a); }
    .result-card-body.ai .inner { text-align: center; }
    .result-card-body.ai .inner p { color: #b44fff; font-size: 16px; font-weight: 600; margin-top: 12px; }
    .result-card-body.ai .inner small { color: #6d7175; font-size: 12px; }
    .match-bar { background: #fff; border: 1px solid #e1e3e5; border-radius: 12px; padding: 16px 20px; margin-top: 16px; display: flex; align-items: center; gap: 16px; }
    .match-bar .score { font-size: 28px; font-weight: 800; color: #7b2ff7; }
    .match-bar .bar-wrap { flex: 1; }
    .match-bar .bar { height: 10px; background: #e1e3e5; border-radius: 5px; overflow: hidden; }
    .match-bar .bar-fill { height: 100%; width: 94%; background: linear-gradient(90deg, #7b2ff7, #00c6ff); border-radius: 5px; }
    .nav-btn { display: inline-block; margin-top: 20px; padding: 10px 24px; background: #7b2ff7; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
  </style>
</head>
<body>

<!-- SCREEN 1: Dashboard no plan -->
<div class="screen active" id="screen-dashboard">
  <div class="header">
    <div class="logo">TS</div>
    <h1 style="font-size:18px;font-weight:600">TryStyleAI</h1>
  </div>
  <div class="container">
    <div class="status-banner">
      <div><div style="font-size:13px;color:#6d7175;margin-bottom:4px">Negozio</div><div style="font-weight:600">checkout-rapido-test.myshopify.com</div></div>
      <div><div style="font-size:13px;color:#6d7175;margin-bottom:4px">Piano</div><div style="font-weight:600">Nessun piano</div></div>
      <div><span class="status-badge badge-none"><span class="dot dot-yellow"></span>In attesa</span></div>
    </div>
    <div class="section-title">Scegli il tuo piano</div>
    <div class="plans-grid">
      <div class="plan-card">
        <div class="plan-name">TryStyleAI Basic</div>
        <div class="plan-price">€30<span>/mese</span></div>
        <div class="plan-calls">80 generazioni/mese</div>
        <ul class="plan-features"><li>Virtual Try-On con AI</li><li>Installazione automatica</li><li>Dashboard analytics</li></ul>
        <button class="btn btn-primary" onclick="goTo('screen-billing-basic')">Prova gratis 7 giorni</button>
        <div class="trial-note">Poi €30/mese · annulla quando vuoi</div>
      </div>
      <div class="plan-card popular">
        <div class="plan-name">TryStyleAI Pro</div>
        <div class="plan-price">€85<span>/mese</span></div>
        <div class="plan-calls">250 generazioni/mese</div>
        <ul class="plan-features"><li>Virtual Try-On con AI</li><li>Installazione automatica</li><li>Dashboard analytics</li><li>Supporto prioritario</li></ul>
        <button class="btn btn-primary" onclick="goTo('screen-billing-pro')">Prova gratis 7 giorni</button>
        <div class="trial-note">Poi €85/mese · annulla quando vuoi</div>
      </div>
      <div class="plan-card">
        <div class="plan-name">TryStyleAI Business</div>
        <div class="plan-price">€275<span>/mese</span></div>
        <div class="plan-calls">840 generazioni/mese</div>
        <ul class="plan-features"><li>Virtual Try-On con AI</li><li>Installazione automatica</li><li>Dashboard analytics</li><li>Supporto prioritario</li></ul>
        <button class="btn btn-primary" onclick="goTo('screen-billing-business')">Prova gratis 7 giorni</button>
        <div class="trial-note">Poi €275/mese · annulla quando vuoi</div>
      </div>
    </div>
  </div>
</div>

<!-- SCREEN 2a: Billing confirm Basic -->
<div class="screen" id="screen-billing-basic">
  <div style="background:#f6f6f7;min-height:100vh;padding:20px">
    <div class="billing-page">
      <div style="font-size:13px;color:#6d7175;margin-bottom:4px">checkout-rapido-test.myshopify.com</div>
      <h2>Conferma abbonamento</h2>
      <div style="font-size:15px;color:#6d7175">TryStyleAI Basic</div>
      <div class="price-big">€30<span style="font-size:18px;color:#6d7175">/mese</span></div>
      <div class="trial-info">✓ 7 giorni di prova gratuita — nessun addebito oggi</div>
      <div style="font-size:13px;color:#6d7175;margin:12px 0">Dopo il periodo di prova verranno addebitati €30,00 ogni 30 giorni. Puoi annullare in qualsiasi momento.</div>
      <button class="btn-approve" onclick="goTo('screen-dashboard-active')">Approva abbonamento</button>
      <div style="margin-top:12px"><a href="#" onclick="goTo('screen-dashboard');return false;" style="font-size:13px;color:#6d7175">Annulla</a></div>
    </div>
  </div>
</div>

<!-- SCREEN 2b: Billing confirm Pro -->
<div class="screen" id="screen-billing-pro">
  <div style="background:#f6f6f7;min-height:100vh;padding:20px">
    <div class="billing-page">
      <div style="font-size:13px;color:#6d7175;margin-bottom:4px">checkout-rapido-test.myshopify.com</div>
      <h2>Conferma abbonamento</h2>
      <div style="font-size:15px;color:#6d7175">TryStyleAI Pro</div>
      <div class="price-big">€85<span style="font-size:18px;color:#6d7175">/mese</span></div>
      <div class="trial-info">✓ 7 giorni di prova gratuita — nessun addebito oggi</div>
      <div style="font-size:13px;color:#6d7175;margin:12px 0">Dopo il periodo di prova verranno addebitati €85,00 ogni 30 giorni. Puoi annullare in qualsiasi momento.</div>
      <button class="btn-approve" onclick="goTo('screen-dashboard-active')">Approva abbonamento</button>
      <div style="margin-top:12px"><a href="#" onclick="goTo('screen-dashboard');return false;" style="font-size:13px;color:#6d7175">Annulla</a></div>
    </div>
  </div>
</div>

<!-- SCREEN 2c: Billing confirm Business -->
<div class="screen" id="screen-billing-business">
  <div style="background:#f6f6f7;min-height:100vh;padding:20px">
    <div class="billing-page">
      <div style="font-size:13px;color:#6d7175;margin-bottom:4px">checkout-rapido-test.myshopify.com</div>
      <h2>Conferma abbonamento</h2>
      <div style="font-size:15px;color:#6d7175">TryStyleAI Business</div>
      <div class="price-big">€275<span style="font-size:18px;color:#6d7175">/mese</span></div>
      <div class="trial-info">✓ 7 giorni di prova gratuita — nessun addebito oggi</div>
      <div style="font-size:13px;color:#6d7175;margin:12px 0">Dopo il periodo di prova verranno addebitati €275,00 ogni 30 giorni. Puoi annullare in qualsiasi momento.</div>
      <button class="btn-approve" onclick="goTo('screen-dashboard-active')">Approva abbonamento</button>
      <div style="margin-top:12px"><a href="#" onclick="goTo('screen-dashboard');return false;" style="font-size:13px;color:#6d7175">Annulla</a></div>
    </div>
  </div>
</div>

<!-- SCREEN 3: Dashboard active -->
<div class="screen" id="screen-dashboard-active">
  <div class="header">
    <div class="logo">TS</div>
    <h1 style="font-size:18px;font-weight:600">TryStyleAI</h1>
  </div>
  <div class="container">
    <div class="status-banner">
      <div><div style="font-size:13px;color:#6d7175;margin-bottom:4px">Negozio</div><div style="font-weight:600">checkout-rapido-test.myshopify.com</div></div>
      <div><div style="font-size:13px;color:#6d7175;margin-bottom:4px">Piano</div><div style="font-weight:600">TryStyleAI Pro</div></div>
      <div><span class="status-badge badge-active"><span class="dot dot-green"></span>Attivo</span></div>
    </div>
    <div class="usage-card">
      <h2>Utilizzo questo mese</h2>
      <div class="usage-numbers">
        <div class="usage-stat"><div class="value">12</div><div class="label">Usate</div></div>
        <div class="usage-stat"><div class="value">238</div><div class="label">Rimaste</div></div>
        <div class="usage-stat"><div class="value">250</div><div class="label">Totale</div></div>
      </div>
      <div class="progress-wrap">
        <div class="progress-bar"><div class="progress-fill" style="width:5%"></div></div>
        <div class="progress-label"><span>5% utilizzato</span><span>238 rimanenti</span></div>
      </div>
    </div>
    <div class="section-title">Cambia piano</div>
    <div class="plans-grid">
      <div class="plan-card">
        <div class="plan-name">TryStyleAI Basic</div>
        <div class="plan-price">€30<span>/mese</span></div>
        <div class="plan-calls">80 generazioni/mese</div>
        <ul class="plan-features"><li>Virtual Try-On con AI</li><li>Installazione automatica</li><li>Dashboard analytics</li></ul>
        <button class="btn btn-primary">Passa a Basic</button>
      </div>
      <div class="plan-card active popular">
        <div class="plan-name">TryStyleAI Pro</div>
        <div class="plan-price">€85<span>/mese</span></div>
        <div class="plan-calls">250 generazioni/mese</div>
        <ul class="plan-features"><li>Virtual Try-On con AI</li><li>Installazione automatica</li><li>Dashboard analytics</li><li>Supporto prioritario</li></ul>
        <div class="btn btn-active">Piano attuale</div>
      </div>
      <div class="plan-card">
        <div class="plan-name">TryStyleAI Business</div>
        <div class="plan-price">€275<span>/mese</span></div>
        <div class="plan-calls">840 generazioni/mese</div>
        <ul class="plan-features"><li>Virtual Try-On con AI</li><li>Installazione automatica</li><li>Dashboard analytics</li><li>Supporto prioritario</li></ul>
        <button class="btn btn-primary">Passa a Business</button>
      </div>
    </div>
    <div style="text-align:center;margin-top:8px">
      <button class="nav-btn" onclick="goTo('screen-widget')">▶ Vedi widget sul negozio</button>
    </div>
  </div>
</div>

<!-- SCREEN 4: Product page with widget -->
<div class="screen" id="screen-widget">
  <div class="header">
    <div class="logo" style="background:#111;font-size:11px;font-weight:700;letter-spacing:.05em">SHOP</div>
    <h1 style="font-size:16px;font-weight:600;color:#111">Fashion Store</h1>
  </div>
  <div class="product-page">
    <div class="product-image">📷 Foto prodotto</div>
    <div class="product-info">
      <div style="font-size:12px;color:#888;margin-bottom:6px">Abbigliamento / Vestiti</div>
      <h1>Abito Midi Svasato Nero</h1>
      <div class="product-price">€ 129,00</div>
      <div style="font-size:13px;color:#444;margin-bottom:8px">Taglia:</div>
      <div style="display:flex;gap:8px;margin-bottom:20px">
        <div style="padding:6px 14px;border:1px solid #ccc;border-radius:6px;font-size:13px">XS</div>
        <div style="padding:6px 14px;border:1px solid #ccc;border-radius:6px;font-size:13px">S</div>
        <div style="padding:6px 14px;border:2px solid #111;border-radius:6px;font-size:13px;font-weight:700">M</div>
        <div style="padding:6px 14px;border:1px solid #ccc;border-radius:6px;font-size:13px">L</div>
        <div style="padding:6px 14px;border:1px solid #ccc;border-radius:6px;font-size:13px">XL</div>
      </div>
      <button class="add-btn">Aggiungi al carrello</button>
      <div class="widget-box">
        <div class="widget-header">
          <div style="width:24px;height:24px;background:rgba(255,255,255,.2);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800">TS</div>
          Prova virtuale con AI
        </div>
        <div class="widget-body">
          <div class="upload-area" onclick="goTo('screen-result')">
            <div class="icon">📸</div>
            <p>Carica la tua foto</p>
            <small>JPG o PNG · max 10MB</small>
          </div>
          <button class="try-btn" onclick="goTo('screen-result')">✨ Prova questo outfit</button>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- SCREEN 5: Try-on result -->
<div class="screen" id="screen-result">
  <div class="header">
    <div class="logo">TS</div>
    <h1 style="font-size:18px;font-weight:600">TryStyleAI — Risultato</h1>
  </div>
  <div class="result-page">
    <div style="font-size:13px;color:#6d7175">Abito Midi Svasato Nero · Taglia M</div>
    <div class="result-grid">
      <div class="result-card">
        <div class="result-card-header">📷 Foto originale</div>
        <div class="result-card-body" style="background:#e8e8e8;display:flex;align-items:center;justify-content:center;color:#aaa;font-size:14px">Foto cliente</div>
      </div>
      <div class="result-card">
        <div class="result-card-header">✨ Con il tuo outfit</div>
        <div class="result-card-body ai">
          <div class="inner">
            <div style="font-size:48px">✨</div>
            <p>Outfit applicato con AI</p>
            <small style="color:#6d7175">Generato da Fashn.ai</small>
          </div>
        </div>
      </div>
    </div>
    <div class="match-bar">
      <div class="score">94%</div>
      <div class="bar-wrap">
        <div style="font-size:12px;color:#6d7175;margin-bottom:4px">Match outfit</div>
        <div class="bar"><div class="bar-fill"></div></div>
      </div>
      <button class="nav-btn" style="margin-top:0" onclick="goTo('screen-widget')">← Riprova</button>
    </div>
  </div>
</div>

<script>
  function goTo(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    window.scrollTo(0,0);
  }
</script>
</body>
</html>`);
};
