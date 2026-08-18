/**
 * Rutas: Autenticación
 */
const express = require('express');
const { loginRules, registerRules, adminRegisterRules, handleValidation } = require('../middleware/validate');
const { loginLimiter, registerLimiter } = require('../middleware/rateLimiter');

function createAuthRoutes(authController) {
  const router = express.Router();

  router.post('/login', loginLimiter, loginRules, handleValidation, (req, res) => authController.login(req, res));
  router.post('/login/google', (req, res) => authController.loginGoogle(req, res));
  router.post('/register', registerLimiter, registerRules, handleValidation, (req, res) => authController.registrar(req, res));
  router.get('/check-username', (req, res) => authController.verificarUsername(req, res));
  router.post('/admin-register', adminRegisterRules, handleValidation, (req, res) => authController.adminRegister(req, res));
  router.post('/recover/request', (req, res) => authController.solicitarRecuperacion(req, res));
  router.post('/recover/reset', (req, res) => authController.resetearContrasena(req, res));

  return router;
}

module.exports = createAuthRoutes;
