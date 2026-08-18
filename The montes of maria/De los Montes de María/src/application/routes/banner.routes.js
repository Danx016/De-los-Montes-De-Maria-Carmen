const express = require('express');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const { uploadBannerImages } = require('../middleware/upload');

function createBannerRoutes(bannerController) {
  const router = express.Router();

  // Ruta pública para el Hero de la página principal
  router.get('/', bannerController.obtenerBannersPublicos);

  // Rutas administrativas
  router.get('/admin/all', verifyToken, verifyAdmin, bannerController.obtenerTodosBanners);
  router.post('/admin', verifyToken, verifyAdmin, uploadBannerImages, bannerController.crearBanner);
  router.put('/admin/:id', verifyToken, verifyAdmin, uploadBannerImages, bannerController.actualizarBanner);
  router.delete('/admin/:id', verifyToken, verifyAdmin, bannerController.eliminarBanner);

  return router;
}

module.exports = createBannerRoutes;
