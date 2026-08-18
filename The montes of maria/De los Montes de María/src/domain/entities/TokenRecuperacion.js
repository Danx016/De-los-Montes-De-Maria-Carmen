/**
 * Entidad de dominio: TokenRecuperacion
 * Representa un código de seguridad para recuperación de cuenta o verificación OTP
 */
class TokenRecuperacion {
  constructor({ id_usuario, correo, codigo, expiracion, tipo = 'reset_password' }) {
    this.id_usuario = id_usuario;
    this.correo = correo;
    this.codigo = codigo;
    this.expiracion = new Date(expiracion);
    this.tipo = tipo;
  }

  haExpirado() {
    return new Date() > this.expiracion;
  }

  esValido(codigoIngresado) {
    if (this.haExpirado()) return false;
    return String(this.codigo).trim() === String(codigoIngresado).trim();
  }
}

module.exports = TokenRecuperacion;
