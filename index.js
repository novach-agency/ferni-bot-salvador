require('dotenv').config();
const express = require('express');
const twilio = require('twilio');

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

// ✅ Ahora leemos TU variable real
const CAROUSEL_CONTENT_SID = process.env.TWILIO_TEMPLATE_CARRUSEL_SID;

if (!accountSid || !authToken) {
  console.error('❌ Faltan TWILIO_ACCOUNT_SID o TWILIO_AUTH_TOKEN');
  // No hacemos process.exit en Railway para evitar loops
}

if (!CAROUSEL_CONTENT_SID) {
  console.error('❌ Falta TWILIO_TEMPLATE_CARRUSEL_SID (ContentSid del carrusel)');
}

const client = twilio(accountSid, authToken);

// ✅ Tu número sender (debe existir en Twilio como WhatsApp sender)
const FROM_WHATSAPP = 'whatsapp:+15515251435';

// Health check
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'active',
    service: 'NovaKit AI - WhatsApp Carousel Sender (Single Message)',
    endpoints: ['POST /send-carousel'],
  });
});

app.get('/health', (req, res) => res.status(200).send('ok'));

// Endpoint para enviar SOLO el carrusel
app.post('/send-carousel', async (req, res) => {
  try {
    console.log('📥 /send-carousel recibido:', req.body);

    let phone =
      req.body.phone ||
      req.body.phoneNumber ||
      req.body.phone_number ||
      req.body.to;

    if (!phone) {
      return res.status(400).json({
        error: 'No se proporcionó número (phone/phoneNumber/phone_number/to)',
        received: req.body,
      });
    }

    phone = String(phone).trim().replace(/\s+/g, '').replace(/^whatsapp:/i, '');

    // Normalización razonable (MX/USA)
    if (!phone.startsWith('+')) {
      const digits = phone.replace(/\D/g, '');
      if (digits.length === 10) phone = '+521' + digits;         // MX móvil
      else if (digits.length === 11 && digits.startsWith('1')) phone = '+' + digits; // USA
      else phone = '+' + digits; // fallback
    }

    if (phone.startsWith('+52') && !phone.startsWith('+521')) {
      phone = phone.replace('+52', '+521');
    }

    const to = `whatsapp:${phone}`;

    if (!accountSid || !authToken) {
      return res.status(500).json({ error: 'Twilio credentials missing' });
    }
    if (!CAROUSEL_CONTENT_SID) {
      return res.status(500).json({ error: 'TWILIO_TEMPLATE_CARRUSEL_SID missing' });
    }

    console.log(`📤 Enviando CARRUSEL a: ${to} | from: ${FROM_WHATSAPP}`);
    console.log(`🧩 contentSid: ${CAROUSEL_CONTENT_SID}`);

    const message = await client.messages.create({
      from: FROM_WHATSAPP,
      to,
      contentSid: CAROUSEL_CONTENT_SID,
    });

    console.log(`✅ Enviado | SID: ${message.sid} | Status: ${message.status}`);

    return res.status(200).json({
      success: true,
      messageSid: message.sid,
      to: phone,
      status: message.status,
      contentSid: CAROUSEL_CONTENT_SID,
    });
  } catch (error) {
    console.error('❌ Error:', error);

    return res.status(500).json({
      error: error.message,
      code: error.code,
      moreInfo: error.moreInfo,
    });
  }
});

// Railway: SIEMPRE escuchar en process.env.PORT
const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
