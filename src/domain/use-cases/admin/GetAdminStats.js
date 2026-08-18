/**
 * Caso de uso: GetAdminStats
 * Compila estadísticas clave de ventas, usuarios, productos y categorías
 */
const db = require('../../../infrastructure/persistence/Database');

class GetAdminStats {
  async execute() {
    const query = (sql, params = []) => new Promise((resolve, reject) => {
      db.query(sql, params, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

    const ventasResult = await query("SELECT SUM(total) as ingresos, COUNT(id_compra) as ventas FROM compras");
    const usuariosResult = await query("SELECT COUNT(id_usuario) as usuarios FROM usuarios");
    const productosResult = await query("SELECT COUNT(id_producto) as productos FROM productos");

    const productosCat = await query("SELECT IFNULL(categoria, 'Sin Categoría') as categoria, COUNT(*) as cantidad FROM productos GROUP BY categoria");
    const usuariosRol = await query("SELECT id_rol, COUNT(*) as cantidad FROM usuarios GROUP BY id_rol");
    const ventasEstado = await query("SELECT IFNULL(estado, 'Completado') as estado, COUNT(*) as cantidad FROM compras GROUP BY estado");

    return {
      ingresos: ventasResult[0]?.ingresos || 0,
      ventas: ventasResult[0]?.ventas || 0,
      usuarios: usuariosResult[0]?.usuarios || 0,
      productos: productosResult[0]?.productos || 0,
      productosCat: productosCat || [],
      usuariosRol: usuariosRol || [],
      ventasEstado: ventasEstado || []
    };
  }
}

module.exports = GetAdminStats;
