const csrf = require('csurf');

// Configurar dos instancias del middleware 'csurf' usando cookies
// Una para peticiones locales HTTP (secure: false) y otra para HTTPS (secure: true)
const csrfHTTP = csrf({
  cookie: {
    key: 'csrfToken',
    httpOnly: false,  // Permitir que Javascript lo lea
    sameSite: 'lax',  // 'lax' para compatibilidad con Cloudflare Tunnel
    secure: false     // false para HTTP local
  }
});

const csrfHTTPS = csrf({
  cookie: {
    key: 'csrfToken',
    httpOnly: false,  // Permitir que Javascript lo lea
    sameSite: 'lax',  // 'lax' para compatibilidad con Cloudflare Tunnel
    secure: true      // true para conexiones HTTPS a través de Cloudflare
  }
});

function csrfMiddleware(req, res, next) {
  // Eximir las rutas de API REST (/api/*) que usan JWT y peticiones asíncronas
  if (req.path.startsWith('/api')) {
    return next();
  }

  const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  
  const currentCsrf = isSecure ? csrfHTTPS : csrfHTTP;
  
  currentCsrf(req, res, (err) => {
    if (err) {
      console.warn('Bloqueo de seguridad CSRF:', err.message);
      return res.status(403).json({ 
        error: 'Acceso denegado: Token CSRF de csurf inválido o faltante en la petición.' 
      });
    }
    
    // Generar el token actual
    const token = req.csrfToken();
    
    // Hacerlo disponible para las vistas EJS
    res.locals.csrfToken = token;
    
    // Guardar el token real en una cookie no HTTPOnly para que el frontend pueda leerlo
    res.cookie('XSRF-TOKEN', token, {
      httpOnly: false,
      sameSite: 'lax',   // 'lax' para compatibilidad con Cloudflare Tunnel
      secure: isSecure   // Dinámico: true en HTTPS, false en HTTP
    });
    
    next();
  });
}

module.exports = csrfMiddleware;

