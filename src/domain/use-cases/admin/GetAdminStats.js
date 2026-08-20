/**
 * Caso de uso: GetAdminStats
 * Compila estadísticas clave de ventas, usuarios, productos y categorías
 * a través de contratos de repositorio sin acoplamiento a infraestructura.
 */
class GetAdminStats {
  constructor(compraRepository) {
    this.compraRepository = compraRepository;
  }

  async execute() {
    const totales = await this.compraRepository.obtenerEstadisticasGlobales();
    const desglose = await this.compraRepository.obtenerDesgloseEstadisticas();

    return {
      ingresos: parseFloat(totales.ingresos) || 0,
      ventas: parseInt(totales.ventas, 10) || 0,
      usuarios: parseInt(totales.usuarios, 10) || 0,
      productos: parseInt(totales.productos, 10) || 0,
      productosCat: desglose.productosCat || [],
      usuariosRol: desglose.usuariosRol || [],
      ventasEstado: desglose.ventasEstado || []
    };
  }
}

module.exports = GetAdminStats;
