const db = require('./Database');
const CategoriaRepository = require('../../domain/repositories/CategoriaRepository');
const Categoria = require('../../domain/entities/Categoria');

/**
 * Adaptador de Persistencia MySQL para Categorías
 * Implementa el puerto CategoriaRepository de la capa de dominio.
 */
class MySQLCategoriaRepository extends CategoriaRepository {
  async obtenerTodas() {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM categorias ORDER BY id_categoria ASC';
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
      const nombre = (data.nombre_categoria || data.nombre || '').trim();
      const slug = data.slug || nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const sql = 'INSERT INTO categorias (nombre_categoria, descripcion, slug, imagen, icono, color) VALUES (?, ?, ?, ?, ?, ?)';
      
      db.query(sql, [
        nombre,
        data.descripcion || null,
        slug,
        data.imagen || null,
        data.icono || 'fa-box',
        data.color || '#2e7d32'
      ], (err, result) => {
        if (err) return reject(err);
        resolve({
          id_categoria: result.insertId,
          nombre_categoria: nombre,
          descripcion: data.descripcion || null,
          slug,
          imagen: data.imagen || null,
          icono: data.icono || 'fa-box',
          color: data.color || '#2e7d32'
        });
      });
    });
  }

  async actualizar(id, data) {
    return new Promise((resolve, reject) => {
      const nombre = (data.nombre_categoria || data.nombre || '').trim();
      const slug = data.slug || nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      
      let imagenSql = '';
      const params = [nombre, data.descripcion || null, slug, data.icono || 'fa-box', data.color || '#2e7d32'];

      if (data.imagen !== undefined) {
        imagenSql = ', imagen = ?';
        params.push(data.imagen);
      }

      params.push(id);

      const sql = `UPDATE categorias SET nombre_categoria = ?, descripcion = ?, slug = ?, icono = ?, color = ? ${imagenSql} WHERE id_categoria = ?`;
      
      db.query(sql, params, (err, result) => {
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
