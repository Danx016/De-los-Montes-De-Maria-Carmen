const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_change_this_secret';
if (!process.env.JWT_SECRET) {
  console.warn('⚠️ WARNING: JWT_SECRET no está configurado. Usando clave temporal para desarrollo (middleware auth).');
}

// Middleware que verifica el token JWT
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  
  // Triple fallback para extraer el token:
  // 1. Cookie parseada por cookie-parser
  // 2. Leer el header cookie directamente con regex (fallback Cloudflare Tunnel)
  // 3. Authorization: Bearer header
  let token = req.cookies?.jwt;
  if (!token && req.headers.cookie) {
    const match = req.headers.cookie.match(/(?:^|;\s*)jwt=([^;]+)/);
    if (match) token = decodeURIComponent(match[1]);
  }
  if (!token && authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Acceso denegado. Token no proporcionado.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    decoded.role = decoded.rol ?? decoded.id_rol ?? null;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Token inválido o expirado.' });
  }
}

// Middleware que verifica si el usuario es administrador
function verifyAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Acceso denegado.' });
  }
  // Verificar rol de admin (rol = 1) o una cuenta privilegiada 'admin'
  const role = Number(req.user.role);
  if (role !== 1 && req.user.username !== 'admin') {
    return res.status(403).json({ message: 'Acceso denegado. Se requieren permisos de administrador.' });
  }
  next();
}

// Middleware para verificar que el usuario solo modifica sus propios datos
function verifySelf(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Acceso denegado.' });
  }
  const requestedId = parseInt(req.params.id);
  if (req.user.id !== requestedId) {
    return res.status(403).json({ message: 'No tienes permiso para modificar este recurso.' });
  }
  next();
}

// Middleware que verifica si el usuario es administrador o agente de soporte
function verifyAdminOrSupport(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Acceso denegado.' });
  }
  const role = Number(req.user.role);
  if (role !== 1 && role !== 4 && req.user.username !== 'admin') {
    return res.status(403).json({ message: 'Acceso denegado. Se requieren permisos de administrador o soporte.' });
  }
  next();
}

// Middleware que verifica si el usuario es vendedor o admin
function verifyVendedor(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Acceso denegado.' });
  }
  // Permitir rol de vendedor (2) o administrador (1 o username 'admin')
  const role = Number(req.user.role);
  if (role !== 2 && role !== 1 && req.user.username !== 'admin') {
    return res.status(403).json({ message: 'Acceso denegado. Se requieren permisos de vendedor o administrador.' });
  }
  next();
}

module.exports = { verifyToken, verifyAdmin, verifyAdminOrSupport, verifySelf, verifyVendedor };
