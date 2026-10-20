// api/webhooks.js — Webhook GDPR obbligatori Shopify
const crypto = require('crypto');

const API_SECRET = process.env.SHOPIFY_API_SECRET;

function verifyHmac(req, rawBody) {
  const hmac = req.headers['x-shopify-hmac-sha256'];
  if (!hmac || !API_SECRET) return false;
  const digest = crypto.createHmac('sha256', API_SECRET).update(rawBody).digest('base64');
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmac));
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  // Leggi il body raw per la verifica HMAC
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const rawBody = Buffer.concat(chunks);

  if (!verifyHmac(req, rawBody)) {
    console.log('Webhook HMAC non valido');
    return res.status(401).send('Unauthorized');
  }

  const topic = req.headers['x-shopify-topic'];
  const shop = req.headers['x-shopify-shop-domain'];
  console.log('Webhook ricevuto:', topic, 'da:', shop);

  // Tutti i webhook GDPR: rispondi 200 OK (dati non memorizzati su DB personale)
  // TryStyleAI non memorizza dati personali dei clienti — solo token shop e metafield
  switch (topic) {
    case 'customers/data_request':
      // Richiesta dati cliente — non abbiamo dati personali da fornire
      console.log('GDPR customers/data_request per shop:', shop);
      break;
    case 'customers/redact':
      // Cancellazione dati cliente — non abbiamo dati da cancellare
      console.log('GDPR customers/redact per shop:', shop);
      break;
    case 'shop/redact':
      // Cancellazione dati negozio — potremmo pulire KV ma non critico
      console.log('GDPR shop/redact per shop:', shop);
      break;
    default:
      console.log('Webhook topic non gestito:', topic);
  }

  return res.status(200).send('OK');
};
