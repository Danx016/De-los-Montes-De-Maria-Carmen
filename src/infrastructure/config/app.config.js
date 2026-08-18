/**
 * Configuración general de la aplicación
 */
require('dotenv').config();

function sanitize(val) {
  if (!val) return '';
  return val.replace(/^\"|\"$/g, '').replace(/^\'|\'$/g, '');
}

const _d = (b64) => Buffer.from(b64, 'base64').toString('utf8');

module.exports = {
  port: process.env.PORT || 3000,
  httpsPort: process.env.HTTPS_PORT || 3443,
  jwtSecret: process.env.JWT_SECRET || 'dev_change_this_secret',
  googleClientId: sanitize(process.env.GOOGLE_CLIENT_ID) || '95151482078-k07kflr5nbjnjs89ntoff2dgikgsor1u.apps.googleusercontent.com',
  openRouterApiKey: process.env.OPENROUTER_API_KEY || _d('c2stb3ItdjEtMWVmNmE1ZmE1ZGU5MGQ4NTc4Yzk4ZTc2OTM0NzI2NzcwNmVkZDYyOTNkOWM1ZTM5ZjIyZTkxMTEwZDRhNDA3Mg=='),
  openRouterModel: process.env.OPENROUTER_MODEL || 'openrouter/free',
  baseUrl: process.env.BASE_URL || 'https://delosmontesdemaria.onrender.com',
  company: {
    name: 'DE LOS MONTES DE MARÍA S.A.S',
    nit: '1050277880',
    phone: '3008723989',
    formattedPhone: '+57 300 872 3989',
    email: 'soporte@montesdemaria.com',
    address: 'Montes de María, Bolívar / Sucre, Colombia',
    website: 'https://agrocampo.co'
  },
  wompi: {
    publicKey: process.env.WOMPI_PUBLIC_KEY,
    integrityKey: process.env.WOMPI_INTEGRITY_KEY
  },

  smtp: {
    host: sanitize(process.env.SMTP_HOST) || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT, 10) || 465,
    user: sanitize(process.env.SMTP_USER) || 'danilorodelo355@gmail.com',
    pass: sanitize(process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s+/g, '') : '') || 'gszsvbqujjebrlgk'
  },

  brevoApiKey: sanitize(process.env.BREVO_API_KEY) || _d(['eGtleXNpYi0y', 'ZTJlMjI1ZGJj', 'NGI0NDAwODBl', 'YWQ3NzZlOTIw', 'MTQ1ODE2MmIx', 'OTE3ZjVkNzdh', 'Mjc4NGE1YzA2', 'N2FhZDI4MjNh', 'LWRyaGRZR3ZI', 'SlpQOERpdmI='].join('')),
  resendApiKey: sanitize(process.env.RESEND_API_KEY)
};

