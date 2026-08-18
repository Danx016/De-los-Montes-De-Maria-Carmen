/**
 * Middleware: rateLimiter
 * Limitadores de peticiones para endpoints públicos y de autenticación
 */
const rateLimit = require('express-rate-limit');

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000,
  skip: (req) => {
    return req.path.startsWith('/css') ||
           req.path.startsWith('/js') ||
           req.path.startsWith('/img') ||
           req.path.startsWith('/uploads') ||
           /\.(css|js|png|jpg|jpeg|webp|gif|ico|svg|woff2?)$/i.test(req.path);
  },
  message: { message: 'Demasiadas peticiones. Intenta de nuevo más tarde.' },
  standardHeaders: true,
  legacyHeaders: false
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,
  message: { message: 'Demasiados registros. Intenta de nuevo más tarde.' },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = { globalLimiter, loginLimiter, registerLimiter };
