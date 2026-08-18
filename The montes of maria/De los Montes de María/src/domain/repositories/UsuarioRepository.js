/**
 * Interfaz de repositorio: UsuarioRepository
 * Define las operaciones que debe implementar cualquier repositorio de usuarios
 */
class UsuarioRepository {
  async crear(usuario) {
    throw new Error('Método no implementado');
  }

  async buscarPorId(id) {
    throw new Error('Método no implementado');
  }

  async buscarPorApodo(apodo) {
    throw new Error('Método no implementado');
  }

  async buscarPorCorreo(correo) {
    throw new Error('Método no implementado');
  }

  async buscarPorGoogleId(googleId) {
    throw new Error('Método no implementado');
  }

  async actualizar(id, datos) {
    throw new Error('Método no implementado');
  }

  async actualizarContrasena(id, nuevaContrasena) {
    throw new Error('Método no implementado');
  }

  async actualizarCreditos(id, creditos) {
    throw new Error('Método no implementado');
  }

  async eliminar(id) {
    throw new Error('Método no implementado');
  }

  async listarTodos() {
    throw new Error('Método no implementado');
  }

  async listarPorRol(idRol) {
    throw new Error('Método no implementado');
  }

  async contarAdministradores() {
    throw new Error('Método no implementado');
  }

  async verificarApodoDisponible(apodo) {
    throw new Error('Método no implementado');
  }

  async verificarCorreoDisponible(correo) {
    throw new Error('Método no implementado');
  }
}

module.exports = UsuarioRepository;