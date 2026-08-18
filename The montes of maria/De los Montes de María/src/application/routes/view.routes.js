/**
 * Rutas: Vistas SSR EJS
 */
const express = require('express');

function createViewRoutes(viewController) {
  const router = express.Router();

  router.get('/', (req, res) => viewController.inicio(req, res));
  router.get('/categoria/:slug', (req, res) => viewController.categoria(req, res));
  router.get('/buscar', (req, res) => viewController.buscar(req, res));
  router.get('/registro', (req, res) => viewController.registro(req, res));
  router.get('/login', (req, res) => viewController.login(req, res));
  router.get('/admin-login', (req, res) => viewController.adminLogin(req, res));
  router.get('/admin-register', (req, res) => viewController.adminRegisterPage(req, res));
  router.get('/vendedor', (req, res) => viewController.vendedor(req, res));
  router.get('/recuperar', (req, res) => viewController.recuperar(req, res));
  router.get('/admin', (req, res) => viewController.admin(req, res));
  router.get('/admin/soporte', (req, res) => viewController.adminSoporte(req, res));
  router.get('/perfil', (req, res) => viewController.perfil(req, res));
  router.get('/perfil-vendedor', (req, res) => viewController.perfilVendedor(req, res));
  router.get('/carrito', (req, res) => viewController.carrito(req, res));
  router.get('/soporte', (req, res) => viewController.soporte(req, res));
  router.get('/envio', (req, res) => viewController.envio(req, res));
  router.get('/pago', (req, res) => viewController.pago(req, res));
  router.get('/logout', (req, res) => viewController.logout(req, res));

  return router;
}

module.exports = createViewRoutes;
