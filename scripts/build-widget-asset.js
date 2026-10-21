// scripts/build-widget-asset.js — Genera extensions/trystyleai-widget/assets/trystyleai.js
// dalla stessa funzione widgetMain usata da /api/widget (una sola fonte di codice).
// Uso: npm run build:widget   (poi `shopify app deploy`)
const fs = require('fs');
const path = require('path');
const { widgetMain } = require('../api/widget.js');

const APP_URL = process.env.APP_URL || 'https://trystyleai-vercel.vercel.app';
const out = path.join(__dirname, '..', 'extensions', 'trystyleai-widget', 'assets', 'trystyleai.js');

const code = '/* TryStyleAI widget - file generato da scripts/build-widget-asset.js, non modificare a mano */\n'
  + '(function () {\n'
  + '  var s = document.currentScript;\n'
  + '  var shop = (s && s.getAttribute("data-shop")) || "";\n'
  + '  (' + widgetMain.toString() + ')(' + JSON.stringify(APP_URL) + ', shop);\n'
  + '})();\n';

new Function(code); // verifica sintassi
fs.writeFileSync(out, code);
console.log('Scritto', path.relative(process.cwd(), out), '(' + code.length + ' byte)');
