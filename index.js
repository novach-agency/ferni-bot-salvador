require('dotenv').config();
const express = require('express');
const twilio = require('twilio');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const CAROUSEL_CONTENT_SID = process.env.TWILIO_TEMPLATE_CARRUSEL_SID;

if (!accountSid || !authToken) {
  console.error('❌ Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN');
}

if (!CAROUSEL_CONTENT_SID) {
  console.error('❌ Missing TWILIO_TEMPLATE_CARRUSEL_SID (Carousel Content SID)');
}

const client = twilio(accountSid, authToken);

// ✅ Tu sender WhatsApp (debe estar habilitado en Twilio/WABA)
const FROM_WHATSAPP = 'whatsapp:+15515251435';

// Health
app.get('/', (req, res) => res.status(200).send('OK'));
app.get('/health', (req, res) => res.status(200).send('OK'));

// Enviar carrusel (SOLO 1 MENSAJE)
app.post('/send-carousel', async (req, res) => {
  try {
    let phone =
      req.body.phone ||
      req.body.phoneNumber ||
      req.body.phone_number ||
      req.body.to;

    if (!phone) return res.status(400).json({ error: 'No phone provided' });

    phone = String(phone).replace(/\s+/g, '').replace(/^whatsapp:/i, '');

    // Normalización básica MX/USA
    if (!phone.startsWith('+')) {
      const digits = phone.replace(/\D/g, '');
      if (digits.length === 10) phone = '+521' + digits; // MX móvil
      else if (digits.length === 11 && digits.startsWith('1')) phone = '+' + digits; // USA
      else phone = '+' + digits; // fallback
    }

    if (phone.startsWith('+52') && !phone.startsWith('+521')) {
      phone = phone.replace('+52', '+521');
    }

    if (!accountSid || !authToken) {
      return res.status(500).json({ error: 'Twilio credentials missing' });
    }
    if (!CAROUSEL_CONTENT_SID) {
      return res.status(500).json({ error: 'Carousel Content SID missing' });
    }

    const to = `whatsapp:${phone}`;

    console.log(`📤 Sending carousel -> to: ${to} | from: ${FROM_WHATSAPP}`);
    console.log(`🧩 contentSid: ${CAROUSEL_CONTENT_SID}`);

    const message = await client.messages.create({
      from: FROM_WHATSAPP,
      to,
      contentSid: CAROUSEL_CONTENT_SID,
    });

    return res.status(200).json({ success: true, sid: message.sid, status: message.status });
  } catch (err) {
    console.error('❌ Error /send-carousel:', err);
    return res.status(500).json({ error: err.message, code: err.code });
  }
});

// ✅ IMPORTANT: Railway (Metal Edge) a veces espera 8080.
// ✅ Usamos PORT si existe, si no, caemos a 8080.
const PORT = Number(process.env.PORT) || 8080;

console.log('🔎 process.env.PORT =', process.env.PORT);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
