require('dotenv').config();
const express = require('express');
const twilio = require('twilio');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const CAROUSEL_CONTENT_SID = process.env.TWILIO_TEMPLATE_CARRUSEL_SID;

const client = twilio(accountSid, authToken);

const FROM_WHATSAPP = 'whatsapp:+15515251435';

// Health
app.get('/', (req, res) => res.send('OK'));
app.get('/health', (req, res) => res.send('OK'));

// Enviar carrusel
app.post('/send-carousel', async (req, res) => {
  try {
    let phone =
      req.body.phone ||
      req.body.phoneNumber ||
      req.body.phone_number ||
      req.body.to;

    if (!phone) return res.status(400).json({ error: 'No phone provided' });

    phone = String(phone).replace(/\s+/g, '').replace(/^whatsapp:/, '');

    if (!phone.startsWith('+')) {
      const digits = phone.replace(/\D/g, '');
      if (digits.length === 10) phone = '+521' + digits;
      else if (digits.length === 11 && digits.startsWith('1')) phone = '+' + digits;
      else phone = '+' + digits;
    }

    if (phone.startsWith('+52') && !phone.startsWith('+521')) {
      phone = phone.replace('+52', '+521');
    }

    const message = await client.messages.create({
      from: FROM_WHATSAPP,
      to: `whatsapp:${phone}`,
      contentSid: CAROUSEL_CONTENT_SID
    });

    res.json({ success: true, sid: message.sid });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 🔴 ESTO ES LO IMPORTANTE
const PORT = process.env.PORT;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
