require('dotenv').config();
const express = require('express');
const twilio = require('twilio');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ====== ENV ======
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const CAROUSEL_CONTENT_SID = process.env.TWILIO_TEMPLATE_CARRUSEL_SID;
const FROM_WHATSAPP = 'whatsapp:+15515251435';

// ====== LOGS CLAROS ======
console.log('🔎 ENV CHECK');
console.log('PORT =', process.env.PORT);
console.log('TWILIO_ACCOUNT_SID =', accountSid ? 'OK' : 'MISSING');
console.log('TWILIO_AUTH_TOKEN =', authToken ? 'OK' : 'MISSING');
console.log('TWILIO_TEMPLATE_CARRUSEL_SID =', CAROUSEL_CONTENT_SID ? 'OK' : 'MISSING');

// ====== TWILIO CLIENT (safe) ======
let client = null;
if (accountSid && authToken) {
  client = twilio(accountSid, authToken);
} else {
  console.error('❌ Twilio credentials missing. Bot will not send messages.');
}

// ====== KEEP ALIVE (CRÍTICO PARA RAILWAY) ======
setInterval(() => {
  console.log('🫀 keep-alive tick', new Date().toISOString());
}, 1000 * 60);

// ====== HEALTH ======
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'ferni-bot-salvador' });
});

app.get('/health', (req, res) => {
  res.status(200).send('ok');
});

// ====== SEND CAROUSEL ======
app.post('/send-carousel', async (req, res) => {
  try {
    if (!client) {
      return res.status(500).json({ error: 'Twilio not configured' });
    }

    let phone =
      req.body.phone ||
      req.body.phoneNumber ||
      req.body.phone_number ||
      req.body.to;

    if (!phone) {
      return res.status(400).json({ error: 'No phone provided' });
    }

    phone = String(phone).replace(/\s+/g, '').replace(/^whatsapp:/i, '');

    if (!phone.startsWith('+')) {
      const digits = phone.replace(/\D/g, '');
      if (digits.length === 10) phone = '+521' + digits;
      else if (digits.length === 11 && digits.startsWith('1')) phone = '+' + digits;
      else phone = '+' + digits;
    }

    if (phone.startsWith('+52') && !phone.startsWith('+521')) {
      phone = phone.replace('+52', '+521');
    }

    console.log(`📤 Sending carousel to ${phone}`);

    const message = await client.messages.create({
      from: FROM_WHATSAPP,
      to: `whatsapp:${phone}`,
      contentSid: CAROUSEL_CONTENT_SID
    });

    console.log('✅ Sent:', message.sid);

    return res.json({ success: true, sid: message.sid });
  } catch (err) {
    console.error('❌ send-carousel error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ====== SERVER START ======
const PORT = Number(process.env.PORT) || 8080;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server listening on ${PORT}`);
});

// ====== GLOBAL SAFETY ======
process.on('uncaughtException', (err) => {
  console.error('🔥 uncaughtException:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('🔥 unhandledRejection:', reason);
});
