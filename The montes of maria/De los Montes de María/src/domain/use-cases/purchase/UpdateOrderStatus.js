/**
 * Caso de uso: UpdateOrderStatus
 * Actualiza el estado de despacho de la orden, procesa reembolsos de créditos si aplica, y notifica por email
 */
class UpdateOrderStatus {
  constructor(compraRepository, usuarioRepository, emailService) {
    this.compraRepository = compraRepository;
    this.usuarioRepository = usuarioRepository;
    this.emailService = emailService;
  }

  async execute(idCompra, nuevoEstado) {
    const compra = await this.compraRepository.obtenerReciboCompleto(idCompra);
    if (!compra) throw new Error('Compra no encontrada');

    await this.compraRepository.actualizarEstado(idCompra, nuevoEstado);

    // Si es reembolso procesado y no ha sido reembolsado previamente
    if (nuevoEstado === 'Reembolso procesado' && !compra.reembolsado) {
      await this.usuarioRepository.actualizarCreditos(compra.id_usuario, (parseFloat(compra.total) || 0));
      await this.compraRepository.marcarReembolsado(idCompra);
    }

    if (this.emailService && compra.correo_cliente) {
      await this.emailService.sendOrderStatusEmail(compra, compra.correo_cliente, nuevoEstado);
    }

    return {
      success: true,
      message: `El pedido #${idCompra} ha sido marcado como ${nuevoEstado} con éxito.`
    };
  }
}

module.exports = UpdateOrderStatus;
