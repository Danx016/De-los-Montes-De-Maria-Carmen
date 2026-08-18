/**
 * Rutas: Usuario
 */
const express = require('express');
const { verifyToken, verifySelf } = require('../middleware/auth');
const { profileUpdateRules, idParamRule, handleValidation } = require('../middleware/validate');

const { uploadProfileMedia } = require('../middleware/upload');

const handleUpload = (multerMiddleware) => (req, res, next) => {
  multerMiddleware(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Error al procesar la imagen' });
    }
    next();
  });
};

function createUsuarioRoutes(usuarioController) {
  const router = express.Router();

  // Perfiles de vendedores (públicos) - deben ir antes de las rutas parametrizadas
  router.get('/vendedores', (req, res) => usuarioController.listarVendedores(req, res));
  router.get('/vendedor/:id', (req, res) => usuarioController.obtenerPerfilVendedor(req, res));

  router.get('/me', verifyToken, (req, res) => usuarioController.obtenerMe(req, res));
  router.post('/convertir-vendedor', verifyToken, (req, res) => usuarioController.convertirseEnVendedor(req, res));
  router.put('/:id', verifyToken, verifySelf, handleUpload(uploadProfileMedia.fields([{ name: 'avatar', maxCount: 1 }, { name: 'foto_portada', maxCount: 1 }])), idParamRule, profileUpdateRules, handleValidation, (req, res) => usuarioController.actualizarPerfil(req, res));
  router.post('/:id/avatar', verifyToken, verifySelf, handleUpload(uploadProfileMedia.single('avatar')), idParamRule, (req, res) => usuarioController.subirAvatar(req, res));
  router.post('/:id/portada', verifyToken, verifySelf, handleUpload(uploadProfileMedia.single('foto_portada')), idParamRule, (req, res) => usuarioController.subirPortada(req, res));
  router.delete('/:id', verifyToken, verifySelf, idParamRule, handleValidation, (req, res) => usuarioController.eliminarCuenta(req, res));

  // Direcciones
  router.get('/:id/direcciones', verifyToken, verifySelf, idParamRule, handleValidation, (req, res) => usuarioController.listarDirecciones(req, res));
  router.post('/:id/direcciones', verifyToken, verifySelf, idParamRule, handleValidation, (req, res) => usuarioController.agregarDireccion(req, res));
  router.put('/:id/direcciones/:id_dir', verifyToken, verifySelf, idParamRule, handleValidation, (req, res) => usuarioController.actualizarDireccion(req, res));
  router.delete('/:id/direcciones/:id_dir', verifyToken, verifySelf, idParamRule, handleValidation, (req, res) => usuarioController.eliminarDireccion(req, res));

  return router;
}

module.exports = createUsuarioRoutes;