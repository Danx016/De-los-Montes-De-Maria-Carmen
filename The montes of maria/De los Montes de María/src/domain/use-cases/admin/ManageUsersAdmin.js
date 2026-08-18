/**
 * Caso de uso: ManageUsersAdmin
 * Permite al administrador consultar, editar roles, modificar y eliminar usuarios con notificación
 */
class ManageUsersAdmin {
  constructor(usuarioRepository, emailService) {
    this.usuarioRepository = usuarioRepository;
    this.emailService = emailService;
  }

  async listar(search = null) {
    return this.usuarioRepository.listarTodos(search);
  }

  async obtenerPorId(idUsuario) {
    const user = await this.usuarioRepository.buscarPorId(idUsuario);
    if (!user) throw new Error('Usuario no encontrado');
    return user;
  }

  async actualizar(idUsuario, { nombre, apodo, correo, telefono, direccion, estado, id_rol, contrasena }) {
    const user = await this.usuarioRepository.buscarPorId(idUsuario);
    if (!user) throw new Error('Usuario no encontrado');

    const newRol = (id_rol === 'null' || id_rol === '' || id_rol === null || id_rol === undefined) ? null : parseInt(id_rol, 10);
    if (user.apodo === 'admin_0' && newRol !== 1) {
      throw new Error('No se puede cambiar el rol del administrador principal (admin_0).');
    }

    const updateData = {};
    if (nombre !== undefined) updateData.nombre = nombre;
    if (apodo !== undefined) updateData.apodo = apodo;
    if (correo !== undefined) updateData.correo = correo;
    if (telefono !== undefined) updateData.telefono = telefono;
    if (direccion !== undefined) updateData.direccion = direccion;
    if (estado !== undefined) updateData.estado = estado;
    if (newRol !== null && newRol !== undefined) updateData.id_rol = newRol;

    const updated = await this.usuarioRepository.actualizar(idUsuario, updateData);

    if (contrasena && contrasena.trim() !== '') {
      await this.usuarioRepository.actualizarContrasena(idUsuario, contrasena);
    }

    return updated;
  }

  async eliminar(idUsuario, adminUserId) {
    if (parseInt(idUsuario) === parseInt(adminUserId)) {
      throw new Error('No puedes eliminar tu propia cuenta de administrador');
    }

    const user = await this.usuarioRepository.buscarPorId(idUsuario);
    if (!user) throw new Error('Usuario no encontrado');

    await this.usuarioRepository.eliminar(idUsuario);

    if (this.emailService) {
      await this.emailService.sendAccountDeletedEmail(user.nombre, user.correo, true);
    }

    return { success: true, message: 'Usuario eliminado por el administrador.' };
  }
}

module.exports = ManageUsersAdmin;
