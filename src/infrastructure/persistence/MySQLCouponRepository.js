const db = require('./Database');
const CouponRepository = require('../../domain/repositories/CouponRepository');

class MySQLCouponRepository extends CouponRepository {
  async obtenerTodos() {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM cupones ORDER BY id_cupon DESC';
      db.query(sql, (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });
  }

  async obtenerPorId(idCupon) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM cupones WHERE id_cupon = ?';
      db.query(sql, [idCupon], (err, rows) => {
        if (err) return reject(err);
        resolve(rows[0] || null);
      });
    });
  }

  async obtenerPorCodigo(codigo) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM cupones WHERE UPPER(TRIM(codigo)) = UPPER(TRIM(?))';
      db.query(sql, [codigo], (err, rows) => {
        if (err) return reject(err);
        resolve(rows[0] || null);
      });
    });
  }

  async obtenerPromocionales() {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM cupones WHERE activo = 1 AND promocionar_en_barra = 1 ORDER BY id_cupon DESC';
      db.query(sql, (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });
  }

  async crear(data) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO cupones (
          codigo, descripcion, descuento_porcentaje, descuento_fijo, color_tema, monto_minimo,
          uso_limite, uso_actual, fecha_expiracion, activo, promocionar_en_barra, mensaje_promocional
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const params = [
        data.codigo.toUpperCase().trim(),
        data.descripcion || null,
        data.descuento_porcentaje !== undefined ? Number(data.descuento_porcentaje) : 0,
        data.descuento_fijo !== undefined ? Number(data.descuento_fijo) : 0,
        data.color_tema || '#059669',
        data.monto_minimo !== undefined ? Number(data.monto_minimo) : 0,
        data.uso_limite !== undefined ? (data.uso_limite === null ? null : Number(data.uso_limite)) : null,
        data.uso_actual !== undefined ? Number(data.uso_actual) : 0,
        data.fecha_expiracion || null,
        data.activo !== undefined ? Number(data.activo) : 1,
        data.promocionar_en_barra !== undefined ? Number(data.promocionar_en_barra) : 0,
        data.mensaje_promocional || null
      ];

      db.query(sql, params, (err, result) => {
        if (err) return reject(err);
        resolve({ id_cupon: result.insertId, ...data });
      });
    });
  }

  async actualizar(idCupon, data) {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE cupones SET
          codigo = ?,
          descripcion = ?,
          descuento_porcentaje = ?,
          descuento_fijo = ?,
          color_tema = ?,
          monto_minimo = ?,
          uso_limite = ?,
          fecha_expiracion = ?,
          activo = ?,
          promocionar_en_barra = ?,
          mensaje_promocional = ?
        WHERE id_cupon = ?
      `;
      const params = [
        data.codigo.toUpperCase().trim(),
        data.descripcion || null,
        Number(data.descuento_porcentaje || 0),
        Number(data.descuento_fijo || 0),
        data.color_tema || '#059669',
        Number(data.monto_minimo || 0),
        data.uso_limite === null || data.uso_limite === '' ? null : Number(data.uso_limite),
        data.fecha_expiracion || null,
        Number(data.activo !== undefined ? data.activo : 1),
        Number(data.promocionar_en_barra !== undefined ? data.promocionar_en_barra : 0),
        data.mensaje_promocional || null,
        idCupon
      ];

      db.query(sql, params, (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });
  }

  async incrementarUso(codigo) {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE cupones SET uso_actual = uso_actual + 1 WHERE UPPER(TRIM(codigo)) = UPPER(TRIM(?))';
      db.query(sql, [codigo], (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });
  }

  async toggleActivo(idCupon) {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE cupones SET activo = IF(activo = 1, 0, 1) WHERE id_cupon = ?';
      db.query(sql, [idCupon], (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });
  }

  async togglePromocion(idCupon) {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE cupones SET promocionar_en_barra = IF(promocionar_en_barra = 1, 0, 1) WHERE id_cupon = ?';
      db.query(sql, [idCupon], (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });
  }

  async eliminar(idCupon) {
    return new Promise((resolve, reject) => {
      const sql = 'DELETE FROM cupones WHERE id_cupon = ?';
      db.query(sql, [idCupon], (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });
  }
}

module.exports = MySQLCouponRepository;
