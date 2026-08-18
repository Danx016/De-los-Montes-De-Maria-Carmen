/**
 * Entidad de dominio: Compra
 * Representa una compra en el sistema con lógica de negocio pura
 */
class Compra {
  constructor({
    id_compra,
    id_usuario,
    fecha,
    total,
    estado,
    metodo_pago,
    reembolsado,
    direccion_envio,
    detalles
  }) {
    this.id_compra = id_compra;
    this.id_usuario = id_usuario;
    this.fecha = fecha || new Date();
    this.total = total || 0;
    this.estado = estado || 'Pedido recibido';
    this.metodo_pago = metodo_pago || 'Tarjeta de Crédito';
    this.reembolsado = reembolsado || false;
    this.direccion_envio = direccion_envio;
    this.detalles = detalles || []; // Array de objetos {id_producto, cantidad, precio_unitario}
  }

  // Métodos de negocio
  calcularTotal() {
    this.total = this.detalles.reduce((sum, detalle) => {
      return sum + (detalle.cantidad * detalle.precio_unitario);
    }, 0);
    return this.total;
  }

  agregarDetalle(productoId, cantidad, precioUnitario) {
    if (cantidad <= 0) {
      throw new Error('La cantidad debe ser positiva');
    }
    if (precioUnitario <= 0) {
      throw new Error('El precio unitario debe ser positivo');
    }

    const detalleExistente = this.detalles.find(d => d.id_producto === productoId);
    if (detalleExistente) {
      detalleExistente.cantidad += cantidad;
    } else {
      this.detalles.push({
        id_producto: productoId,
        cantidad: cantidad,
        precio_unitario: precioUnitario
      });
    }
    this.calcularTotal();
  }

  estaPendiente() {
    return this.estado === 'Pedido recibido' || this.estado === 'Procesando';
  }

  estaCompletada() {
    return this.estado === 'Entregado' || this.estado === 'Completado';
  }

  estaCancelada() {
    return this.estado === 'Cancelado';
  }

  puedeCancelar() {
    return this.estaPendiente() && !this.reembolsado;
  }

  cancelar() {
    if (!this.puedeCancelar()) {
      throw new Error('No se puede cancelar esta compra');
    }
    this.estado = 'Cancelado';
  }

  actualizarEstado(nuevoEstado) {
    const estadosValidos = [
      'Pedido recibido',
      'Procesando',
      'Enviado',
      'Entregado',
      'Cancelado',
      'Completado'
    ];

    if (!estadosValidos.includes(nuevoEstado)) {
      throw new Error('Estado no válido');
    }

    this.estado = nuevoEstado;
  }

  procesarReembolso() {
    if (this.reembolsado) {
      throw new Error('Ya se ha procesado un reembolso para esta compra');
    }
    if (!this.estaCancelada()) {
      throw new Error('Solo se pueden reembolsar compras canceladas');
    }
    this.reembolsado = true;
  }

  validarDatos() {
    if (!this.id_usuario) {
      throw new Error('El usuario es requerido');
    }
    if (!this.detalles || this.detalles.length === 0) {
      throw new Error('La compra debe tener al menos un detalle');
    }
    if (!this.direccion_envio) {
      throw new Error('La dirección de envío es requerida');
    }
  }

  toJSON() {
    return {
      id_compra: this.id_compra,
      id_usuario: this.id_usuario,
      fecha: this.fecha,
      total: this.total,
      estado: this.estado,
      metodo_pago: this.metodo_pago,
      reembolsado: this.reembolsado,
      direccion_envio: this.direccion_envio,
      detalles: this.detalles
    };
  }
}

module.exports = Compra;