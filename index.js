require('dotenv').config();
const express = require('express');
const twilio = require('twilio');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

const from = 'whatsapp:+13185839825'; // Tu número de Twilio
const templateInicial = 'HXa7495976c03edc265c142521228c7c2d'; // Template: pregunta inicial
const templatePlanes = 'HX6d9b55e2462689f45551f978b97426e3'; // Template: planes de precios

// Endpoint para recibir el webhook de Zapier (envía template inicial)
app.post('/send-template', async (req, res) => {
  try {
    console.log('📥 Webhook recibido:', req.body);
    
    let phoneNumber = req.body.phone || req.body.phoneNumber || req.body.phone_number;
    
    if (!phoneNumber) {
      return res.status(400).json({ 
        error: 'No se proporcionó número de teléfono',
        received: req.body 
      });
    }
    
    // Asegurar formato +521XXXXXXXXXX
    phoneNumber = phoneNumber.trim().replace(/\s+/g, '');
    
    if (!phoneNumber.startsWith('+')) {
      phoneNumber = '+521' + phoneNumber;
    }
    
    if (phoneNumber.startsWith('+52') && !phoneNumber.startsWith('+521')) {
      phoneNumber = phoneNumber.replace('+52', '+521');
    }
    
    console.log(`📤 Enviando template inicial a: ${phoneNumber}`);
    
    const message = await client.messages.create({
      from,
      to: `whatsapp:${phoneNumber}`,
      contentSid: templateInicial,
    });
    
    console.log(`✅ Template inicial enviado | SID: ${message.sid}`);
    
    res.json({ 
      success: true, 
      messageSid: message.sid,
      to: phoneNumber,
      status: message.status
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({ 
      error: error.message,
      code: error.code 
    });
  }
});

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'active',
    service: 'NovaKit AI - WhatsApp Lead Automation',
    endpoints: ['/send-template', '/webhook/incoming']
  });
});

// Webhook para recibir respuestas de WhatsApp
app.post('/webhook/incoming', async (req, res) => {
  try {
    console.log('📨 Mensaje entrante:', req.body);
    
    const from = req.body.From; // whatsapp:+5215551234567
    const body = req.body.Body.toLowerCase().trim();
    
    // Verificar si la respuesta es afirmativa
    const affirmativeResponses = ['si', 'sí', 'claro', 'ok', 'Si', 'dale', 'va', 'Sí, quiero'];
    const isAffirmative = affirmativeResponses.some(word => body.includes(word));
    
    if (isAffirmative) {
      console.log(`✅ Respuesta afirmativa detectada de: ${from}`);
      
      // Enviar template de planes aprobado
      const templateMessage = await client.messages.create({
        from: 'whatsapp:+13185839825',
        to: from,
        contentSid: templatePlanes, // Template con los planes
      });
      
      console.log(`✅ Template de planes enviado | SID: ${templateMessage.sid}`);
    } else {
      console.log(`ℹ️ Respuesta no afirmativa de: ${from} - Mensaje: "${body}"`);
      // No enviamos nada si dicen que no
    }
    
    res.status(200).send('OK');
    
  } catch (error) {
    console.error('❌ Error en webhook incoming:', error.message);
    res.status(500).send('Error');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor de NovaKit AI corriendo en puerto ${PORT}`);
  console.log(`📡 Endpoints disponibles:`);
  console.log(`   POST /send-template - Envía template inicial`);
  console.log(`   POST /webhook/incoming - Recibe respuestas de WhatsApp`);
});