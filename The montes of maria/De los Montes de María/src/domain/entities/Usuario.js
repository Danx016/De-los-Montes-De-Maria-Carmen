/**
 * Entidad de dominio: Usuario
 * Representa un usuario en el sistema con lógica de negocio pura
 */
class Usuario {
  constructor({
    id_usuario,
    nombre,
    apodo,
    correo,
    telefono,
    direccion,
    contrasena,
    id_rol,
    created_at,
    avatar,
    reset_code,
    reset_expires,
    creditos,
    google_id,
    estado,
    foto_portada,
    descripcion,
    categoria_productos
  }) {
    this.id_usuario = id_usuario;
    this.nombre = nombre;
    this.apodo = apodo;
    this.correo = correo;
    this.telefono = telefono;
    this.direccion = direccion;
    this.contrasena = contrasena;
    this.id_rol = id_rol;
    this.created_at = created_at;
    this.avatar = avatar;
    this.reset_code = reset_code;
    this.reset_expires = reset_expires;
    this.creditos = creditos || 0.00;
    this.google_id = google_id;
    this.estado = estado || 'activo';
    this.foto_portada = foto_portada;
    this.descripcion = descripcion;
    this.categoria_productos = categoria_productos;
  }

  // Métodos de negocio
  esAdministrador() {
    return this.id_rol === 1;
  }

  esVendedor() {
    return this.id_rol === 2;
  }

  esCliente() {
    return this.id_rol === 3;
  }

  esSoporte() {
    return this.id_rol === 4;
  }

  tieneCreditosSuficientes(monto) {
    return this.creditos >= monto;
  }

  agregarCreditos(monto) {
    if (monto <= 0) {
      throw new Error('El monto debe ser positivo');
    }
    this.creditos += monto;
  }

  descontarCreditos(monto) {
    if (monto <= 0) {
      throw new Error('El monto debe ser positivo');
    }
    if (!this.tieneCreditosSuficientes(monto)) {
      throw new Error('Créditos insuficientes');
    }
    this.creditos -= monto;
  }

  estaActivo() {
    return this.estado === 'activo';
  }

  validarDatos() {
    if (!this.nombre || this.nombre.trim() === '') {
      throw new Error('El nombre es requerido');
    }
    if (!this.apodo || this.apodo.trim() === '') {
      throw new Error('El apodo es requerido');
    }
    if (!this.correo || !this.validarEmail(this.correo)) {
      throw new Error('El correo no es válido');
    }
    if (!this.contrasena || this.contrasena.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres');
    }
  }

  validarEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  generarResetCode() {
    const code = Math.random().toString(36).substring(2, 12).toUpperCase();
    this.reset_code = code;
    this.reset_expires = new Date(Date.now() + 3600000); // 1 hora
    return code;
  }

  resetCodeValido(code) {
    if (!this.reset_code || this.reset_code !== code) {
      return false;
    }
    if (!this.reset_expires || new Date() > this.reset_expires) {
      return false;
    }
    return true;
  }

  toJSON() {
    return {
      id: this.id_usuario,
      id_usuario: this.id_usuario,
      nombre: this.nombre,
      apodo: this.apodo,
      correo: this.correo,
      telefono: this.telefono,
      direccion: this.direccion,
      id_rol: this.id_rol,
      rol: this.id_rol,
      created_at: this.created_at,
      avatar: this.avatar,
      creditos: this.creditos,
      google_id: this.google_id,
      estado: this.estado,
      foto_portada: this.foto_portada,
      descripcion: this.descripcion,
      categoria_productos: this.categoria_productos
    };
  }
}

module.exports = Usuario;