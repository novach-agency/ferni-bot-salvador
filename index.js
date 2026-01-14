require('dotenv').config();
const express = require('express');
const twilio = require('twilio');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

if (!accountSid || !authToken) {
  console.error('❌ Faltan TWILIO_ACCOUNT_SID o TWILIO_AUTH_TOKEN en .env');
  process.exit(1);
}

const client = twilio(accountSid, authToken);

// ✅ Tu número WhatsApp sender (debe existir en Twilio / WABA)
const FROM_WHATSAPP = 'whatsapp:+15515251435';

// ✅ Content SID del carrusel (template aprobado en Twilio Content / WhatsApp)
const CAROUSEL_CONTENT_SID = process.env.TWILIO_CAROUSEL_CONTENT_SID || 'HX2ad6983945f36aab0cc4e6160aa7a50b';

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'active',
    service: 'NovaKit AI - WhatsApp Carousel Sender (Single Message)',
    endpoints: ['POST /send-carousel'],
  });
});

// ✅ Endpoint para enviar SOLO el carrusel
app.post('/send-carousel', async (req, res) => {
  try {
    console.log('📥 Webhook recibido:', req.body);

    let phoneNumber =
      req.body.phone ||
      req.body.phoneNumber ||
      req.body.phone_number ||
      req.body.to;

    if (!phoneNumber) {
      return res.status(400).json({
        error: 'No se proporcionó número de teléfono (phone / phoneNumber / phone_number / to)',
        received: req.body,
      });
    }

    // Normalizar
    phoneNumber = String(phoneNumber).trim().replace(/\s+/g, '');

    // Si viene sin +, asumimos México (+521...)
    if (!phoneNumber.startsWith('+')) {
      phoneNumber = '+521' + phoneNumber;
    }

    // Ajuste común en MX (WhatsApp usa +521 para móviles)
    if (phoneNumber.startsWith('+52') && !phoneNumber.startsWith('+521')) {
      phoneNumber = phoneNumber.replace('+52', '+521');
    }

    const to = `whatsapp:${phoneNumber}`;

    console.log(`📤 Enviando CARRUSEL a: ${to} | from: ${FROM_WHATSAPP}`);

    const message = await client.messages.create({
      from: FROM_WHATSAPP,
      to,
      contentSid: CAROUSEL_CONTENT_SID,

      // Si tu carrusel usa variables, descomenta y manda JSON string:
      // contentVariables: JSON.stringify({
      //   "1": "Valor variable 1",
      //   "2": "Valor variable 2"
      // })
    });

    console.log(`✅ Carrusel enviado | SID: ${message.sid} | Status: ${message.status}`);

    return res.json({
      success: true,
      messageSid: message.sid,
      to: phoneNumber,
      status: message.status,
      contentSid: CAROUSEL_CONTENT_SID,
    });
  } catch (error) {
    console.error('❌ Error enviando carrusel:', error);

    return res.status(500).json({
      error: error.message,
      code: error.code,
      moreInfo: error.moreInfo,
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📡 POST /send-carousel - Envía 1 solo carrusel`);
});
