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
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
  },
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT, 10) || 465,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
};
