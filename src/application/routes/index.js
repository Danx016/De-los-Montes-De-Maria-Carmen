const express = require('express');
const createAuthRoutes = require('./auth.routes');
const createUsuarioRoutes = require('./usuario.routes');
const createProductoRoutes = require('./producto.routes');
const createCompraRoutes = require('./compra.routes');
const createSoporteRoutes = require('./soporte.routes');
const createChatRoutes = require('./chat.routes');
const createAdminRoutes = require('./admin.routes');
const createBannerRoutes = require('./banner.routes');
const createCouponRoutes = require('./coupon.routes');
const createTelegramRoutes = require('./telegram.routes');

function setupRoutes(app, controllers) {
  const {
    authController,
    usuarioController,
    productoController,
    compraController,
    soporteController,
    chatController,
    adminController,
    bannerController,
    couponController,
    telegramService
  } = controllers;

  // Montar rutas de la API REST
  app.use('/api/auth', createAuthRoutes(authController));
  app.use('/api/user', createUsuarioRoutes(usuarioController));
  app.use('/api/productos', createProductoRoutes(productoController));
  app.use('/api/compra', createCompraRoutes(compraController));
  app.use('/api/compras', createCompraRoutes(compraController)); // Alias RESTful
  app.use('/api/soporte', createSoporteRoutes(soporteController));
  app.use('/api/chat', createChatRoutes(chatController));
  app.use('/api/admin', createAdminRoutes(adminController));
  app.use('/api/banners', createBannerRoutes(bannerController));
  app.use('/api/cupones', createCouponRoutes(couponController));
  if (telegramService) {
    app.use('/api/telegram', createTelegramRoutes(telegramService));
  }

  // Rutas de compatibilidad directa
  app.use('/register', createAuthRoutes(authController));
  app.use('/login', createAuthRoutes(authController));
  app.use('/api/recover', createAuthRoutes(authController));
}

module.exports = setupRoutes;
