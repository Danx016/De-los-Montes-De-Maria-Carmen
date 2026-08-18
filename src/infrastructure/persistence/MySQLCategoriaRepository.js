const db = require('./Database');
const CategoriaRepository = require('../../domain/repositories/CategoriaRepository');

/**
 * Adaptador de Persistencia MySQL para Categorías
 * Implementa el puerto CategoriaRepository de la capa de dominio.
 */
class MySQLCategoriaRepository extends CategoriaRepository {
  async obtenerTodas() {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM categorias ORDER BY nombre ASC';
      db.query(sql, (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });
  }

  async obtenerPorId(id) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM categorias WHERE id_categoria = ?';
      db.query(sql, [id], (err, rows) => {
        if (err) return reject(err);
        resolve(rows[0] || null);
      });
    });
  }

  async obtenerPorSlug(slug) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM categorias WHERE LOWER(TRIM(slug)) = LOWER(TRIM(?))';
      db.query(sql, [slug], (err, rows) => {
        if (err) return reject(err);
        resolve(rows[0] || null);
      });
    });
  }

  async crear(data) {
    return new Promise((resolve, reject) => {
      const sql = 'INSERT INTO categorias (nombre, descripcion, imagen, slug) VALUES (?, ?, ?, ?)';
      const slug = data.slug || data.nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      db.query(sql, [data.nombre, data.descripcion || null, data.imagen || null, slug], (err, result) => {
        if (err) return reject(err);
        resolve({ id_categoria: result.insertId, ...data, slug });
      });
    });
  }

  async actualizar(id, data) {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE categorias SET nombre = ?, descripcion = ?, imagen = ?, slug = ? WHERE id_categoria = ?';
      const slug = data.slug || data.nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      db.query(sql, [data.nombre, data.descripcion || null, data.imagen || null, slug, id], (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });
  }

  async eliminar(id) {
    return new Promise((resolve, reject) => {
      const sql = 'DELETE FROM categorias WHERE id_categoria = ?';
      db.query(sql, [id], (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });
  }
}

module.exports = MySQLCategoriaRepository;
