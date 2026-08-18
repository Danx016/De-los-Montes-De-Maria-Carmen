/**
 * Entidad de dominio: Direccion
 * Representa una dirección guardada por el usuario
 */
class Direccion {
  constructor({
    id_direccion,
    id_usuario,
    titulo = 'Principal',
    direccion_principal,
    departamento,
    ciudad,
    telefono,
    codigo_postal = '',
    notas = ''
  }) {
    this.id_direccion = id_direccion;
    this.id_usuario = id_usuario;
    this.titulo = titulo;
    this.direccion_principal = direccion_principal;
    this.departamento = departamento;
    this.ciudad = ciudad;
    this.telefono = telefono;
    this.codigo_postal = codigo_postal;
    this.notas = notas;
  }

  validar() {
    if (!this.direccion_principal || !this.departamento || !this.ciudad || !this.telefono) {
      throw new Error('Faltan campos obligatorios para la dirección');
    }
  }

  toJSON() {
    return {
      id_direccion: this.id_direccion,
      id_usuario: this.id_usuario,
      titulo: this.titulo,
      direccion_principal: this.direccion_principal,
      departamento: this.departamento,
      ciudad: this.ciudad,
      telefono: this.telefono,
      codigo_postal: this.codigo_postal,
      notas: this.notas
    };
  }
}

module.exports = Direccion;
