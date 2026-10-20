// api/_config.js — Configurazione widget condivisa (non è un endpoint: il prefisso _ lo esclude su Vercel)

// Font selezionabili: "theme" = usa il font del tema del negozio, gli altri arrivano da Google Fonts
const FONTS = [
  'theme',
  'Inter', 'DM Sans', 'Poppins', 'Montserrat', 'Lato', 'Open Sans', 'Nunito Sans', 'Raleway', 'Jost',
  'Playfair Display', 'Cormorant Garamond', 'Lora', 'Libre Baskerville'
];

const DEFAULTS = {
  btnText: 'Provalo indossato',
  btnColor: '#ffffff',
  btnTextColor: '#111111',
  btnBorderColor: '#d4d4d4',
  btnRadius: 4,
  showIcon: true,
  font: 'theme',
  primaryColor: '#111111',
  primaryTextColor: '#ffffff',
  accentColor: '#c9a24a',
  modalRadius: 8
};

const HEX = /^#[0-9a-fA-F]{6}$/;

function int(v, min, max, d) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d;
}

// Accetta un oggetto parziale (query string, body o valore salvato) e restituisce una config valida e completa
function sanitize(input) {
  const src = input && typeof input === 'object' ? input : {};
  const hex = (k) => (HEX.test(String(src[k] || '')) ? String(src[k]).toLowerCase() : DEFAULTS[k]);
  const text = String(src.btnText == null ? '' : src.btnText).replace(/[<>]/g, '').trim().substring(0, 40);
  return {
    btnText: text || DEFAULTS.btnText,
    btnColor: hex('btnColor'),
    btnTextColor: hex('btnTextColor'),
    btnBorderColor: hex('btnBorderColor'),
    btnRadius: int(src.btnRadius, 0, 30, DEFAULTS.btnRadius),
    showIcon: src.showIcon == null ? DEFAULTS.showIcon : !(src.showIcon === false || src.showIcon === 'false' || src.showIcon === '0'),
    font: FONTS.includes(src.font) ? src.font : DEFAULTS.font,
    primaryColor: hex('primaryColor'),
    primaryTextColor: hex('primaryTextColor'),
    accentColor: hex('accentColor'),
    modalRadius: int(src.modalRadius, 0, 24, DEFAULTS.modalRadius)
  };
}

function parseStored(raw) {
  if (!raw) return sanitize({});
  try { return sanitize(typeof raw === 'string' ? JSON.parse(raw) : raw); } catch (e) { return sanitize({}); }
}

// Generazioni per piano (chiavi interne)
const PLAN_CALLS = { basic: 80, pro: 250, premium: 840 };

// "TryStyleAI Basic", "Basic", "Piano Pro", "Business"... → chiave interna
function planKeyFromName(name) {
  const n = String(name || '').toLowerCase();
  if (/business|premium/.test(n)) return 'premium';
  if (/\bpro\b/.test(n)) return 'pro';
  if (/basic|base/.test(n)) return 'basic';
  return null;
}

module.exports = { FONTS, DEFAULTS, sanitize, parseStored, PLAN_CALLS, planKeyFromName };
