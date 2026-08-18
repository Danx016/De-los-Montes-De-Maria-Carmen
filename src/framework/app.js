/**
 * Configuración principal de Express
 * Orquesta todos los adaptadores, casos de uso y controladores en Arquitectura Hexagonal
 */
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

// Repositorios (Persistencia)
const MySQLUsuarioRepository = require('../infrastructure/persistence/MySQLUsuarioRepository');
const MySQLProductoRepository = require('../infrastructure/persistence/MySQLProductoRepository');
const MySQLCompraRepository = require('../infrastructure/persistence/MySQLCompraRepository');
const MySQLSoporteRepository = require('../infrastructure/persistence/MySQLSoporteRepository');
const MySQLTokenRepository = require('../infrastructure/persistence/MySQLTokenRepository');
const MySQLChatRepository = require('../infrastructure/persistence/MySQLChatRepository');
const MySQLBannerRepository = require('../infrastructure/persistence/MySQLBannerRepository');
const MySQLCategoriaRepository = require('../infrastructure/persistence/MySQLCategoriaRepository');

// Servicios Externos
const EmailService = require('../infrastructure/external-services/EmailService');
const GoogleAuthService = require('../infrastructure/external-services/GoogleAuthService');
const IAService = require('../infrastructure/external-services/IAService');
const PaymentService = require('../infrastructure/external-services/PaymentService');

// WebSockets
const SocketHandler = require('../infrastructure/websocket/SocketHandler');

// Controladores
const AuthController = require('../application/controllers/AuthController');
const UsuarioController = require('../application/controllers/UsuarioController');
const ProductoController = require('../application/controllers/ProductoController');
const CompraController = require('../application/controllers/CompraController');
const SoporteController = require('../application/controllers/SoporteController');
const ChatController = require('../application/controllers/ChatController');
const AdminController = require('../application/controllers/AdminController');
const BannerController = require('../application/controllers/BannerController');

// Enrutador y Middlewares
const setupRoutes = require('../application/routes/index');
const csrfProtection = require('../application/middleware/csrf');
const { requestLogger, logError } = require('../application/middleware/logger');
const { globalLimiter } = require('../application/middleware/rateLimiter');
const appConfig = require('../infrastructure/config/app.config');

// 1. Inicializar Repositorios
const usuarioRepository = new MySQLUsuarioRepository();
const productoRepository = new MySQLProductoRepository();
const compraRepository = new MySQLCompraRepository();
const soporteRepository = new MySQLSoporteRepository();
const tokenRepository = new MySQLTokenRepository();
const chatRepository = new MySQLChatRepository();
const bannerRepository = new MySQLBannerRepository();
const categoriaRepository = new MySQLCategoriaRepository();

// 2. Inicializar Servicios Externos
const emailService = new EmailService();
const googleAuthService = new GoogleAuthService();
const iaService = new IAService(emailService);
const paymentService = new PaymentService();

// Variable para el manejador de websockets
let socketHandler = null;

// 3. Inicializar Controladores (Inyección de Dependencias)
const authController = new AuthController({
  usuarioRepository,
  emailService,
  googleAuthService
});

const usuarioController = new UsuarioController({
  usuarioRepository,
  emailService
});

const productoController = new ProductoController({
  productoRepository
});

const MySQLCouponRepository = require('../infrastructure/persistence/MySQLCouponRepository');
const CouponController = require('../application/controllers/CouponController');
const couponRepository = new MySQLCouponRepository();
const couponController = new CouponController(couponRepository);

const compraController = new CompraController({
  compraRepository,
  productoRepository,
  usuarioRepository,
  tokenRepository,
  emailService,
  paymentService,
  couponRepository
});

const soporteController = new SoporteController({
  soporteRepository,
  usuarioRepository,
  productoRepository,
  compraRepository,
  emailService,
  iaService,
  socketHandler: null // Se asigna dinámicamente cuando el servidor inicia Socket.IO
});

const chatController = new ChatController({
  iaService,
  productoRepository,
  usuarioRepository,
  compraRepository
});

const adminController = new AdminController({
  usuarioRepository,
  productoRepository,
  compraRepository,
  emailService,
  iaService
});

const bannerController = new BannerController(bannerRepository);

// 4. Crear Aplicación Express
const app = express();

app.set('trust proxy', 1);

// Middleware de Seguridad HTTP
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
  noSniff: true,
  frameguard: { action: 'sameorigin' },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? (process.env.PRODUCTION_URL || true) 
    : ['http://localhost:3000', 'http://localhost:3443', 'http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
  credentials: true
}));

app.use(requestLogger);
app.use(express.static(path.join(__dirname, '../../public')));
// Servir bundle compilado de React si existe
const clientDistPath = path.join(__dirname, '../../client/dist');
if (require('fs').existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
}

app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(csrfProtection);
app.use(hpp());
app.use(globalLimiter);

// 5. Configurar Rutas de la API
setupRoutes(app, {
  authController,
  usuarioController,
  productoController,
  compraController,
  soporteController,
  chatController,
  adminController,
  bannerController,
  couponController
});

// 6. SPA Catch-All para React (en producción o cuando build existe)
app.use((req, res, next) => {
  const indexPath = path.join(clientDistPath, 'index.html');
  if (req.accepts('html') && require('fs').existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  next();
});

// 7. Manejo de Errores
app.use((req, res) => {
  res.status(404).json({ message: 'Recurso no encontrado' });
});

app.use((err, req, res, next) => {
  logError('Error no manejado', err);
  res.status(500).json({
    message: 'Error interno del servidor'
  });
});

// 8. Setup de Socket.IO
app.setupSocketIO = (io) => {
  socketHandler = new SocketHandler(io);
  soporteController.socketHandler = socketHandler;
};

module.exports = app;