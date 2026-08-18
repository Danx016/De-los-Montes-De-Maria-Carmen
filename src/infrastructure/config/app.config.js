/**
 * Configuración general de la aplicación
 */
require('dotenv').config();

function sanitize(val) {
  if (!val) return '';
  return val.replace(/^\"|\"$/g, '').replace(/^\'|\'$/g, '');
}

module.exports = {
  port: process.env.PORT || 3000,
  httpsPort: process.env.HTTPS_PORT || 3443,
  jwtSecret: process.env.JWT_SECRET || 'dev_change_this_secret',
  googleClientId: sanitize(process.env.GOOGLE_CLIENT_ID),
  openRouterApiKey: process.env.OPENROUTER_API_KEY,
  openRouterModel: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
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
  }
};

