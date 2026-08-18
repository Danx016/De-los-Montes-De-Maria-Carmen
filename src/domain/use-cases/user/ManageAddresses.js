/**
 * Caso de uso: ManageAddresses
 * Operaciones CRUD de direcciones de usuario
 */
class ManageAddresses {
  constructor(usuarioRepository) {
    this.usuarioRepository = usuarioRepository;
  }

  async listar(userId) {
    return this.usuarioRepository.obtenerDirecciones(userId);
  }

  async agregar(userId, datosDireccion) {
    return this.usuarioRepository.agregarDireccion(userId, datosDireccion);
  }

  async actualizar(userId, idDir, datosDireccion) {
    return this.usuarioRepository.actualizarDireccion(userId, idDir, datosDireccion);
  }

  async eliminar(userId, idDir) {
    return this.usuarioRepository.eliminarDireccion(userId, idDir);
  }
}

module.exports = ManageAddresses;
