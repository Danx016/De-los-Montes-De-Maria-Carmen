/**
 * Implementación concreta de ProductoRepository usando MySQL
 */
const ProductoRepository = require('../../domain/repositories/ProductoRepository');
const Producto = require('../../domain/entities/Producto');
const db = require('./Database');

class MySQLProductoRepository extends ProductoRepository {
  async crear(producto) {
    return new Promise((resolve, reject) => {
      const sql = `INSERT INTO productos 
        (id_vendedor, nombre_producto, descripcion, precio, stock, unidad_medida, imagen, id_categoria, id_proveedor, categoria, origen, presentacion, cuidado, disponibilidad) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      db.query(sql, [
        producto.id_vendedor || producto.id_proveedor || null,
        producto.nombre_producto,
        producto.descripcion,
        producto.precio,
        producto.stock,
        producto.unidad_medida,
        producto.imagen,
        producto.id_categoria,
        producto.id_proveedor,
        producto.categoria,
        producto.origen,
        producto.presentacion,
        producto.cuidado,
        producto.disponibilidad
      ], (err, result) => {
        if (err) {
          return reject(err);
        }
        producto.id_producto = result.insertId;
        resolve(producto);
      });
    });
  }

  async buscarPorId(id) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT p.*, u.nombre as vendedor_nombre, u.apodo as vendedor_apodo, u.avatar as vendedor_avatar, u.foto_portada as vendedor_portada
        FROM productos p
        LEFT JOIN usuarios u ON u.id_usuario = COALESCE(p.id_vendedor, p.id_proveedor)
        WHERE p.id_producto = ?
      `;
      db.query(sql, [id], (err, rows) => {
        if (err) return reject(err);
        if (rows.length === 0) return resolve(null);
        resolve(new Producto(rows[0]));
      });
    });
  }

  async actualizar(id, datos) {
    return new Promise((resolve, reject) => {
      const campos = [];
      const valores = [];

      if (datos.id_vendedor !== undefined) { campos.push('id_vendedor = ?'); valores.push(datos.id_vendedor); }
      if (datos.nombre_producto) { campos.push('nombre_producto = ?'); valores.push(datos.nombre_producto); }
      if (datos.descripcion !== undefined) { campos.push('descripcion = ?'); valores.push(datos.descripcion); }
      if (datos.precio !== undefined) { campos.push('precio = ?'); valores.push(datos.precio); }
      if (datos.stock !== undefined) { campos.push('stock = ?'); valores.push(datos.stock); }
      if (datos.unidad_medida !== undefined) { campos.push('unidad_medida = ?'); valores.push(datos.unidad_medida); }
      if (datos.imagen) { campos.push('imagen = ?'); valores.push(datos.imagen); }
      if (datos.id_categoria !== undefined) { campos.push('id_categoria = ?'); valores.push(datos.id_categoria); }
      if (datos.id_proveedor !== undefined) { campos.push('id_proveedor = ?'); valores.push(datos.id_proveedor); }
      if (datos.categoria !== undefined) { campos.push('categoria = ?'); valores.push(datos.categoria); }
      if (datos.origen !== undefined) { campos.push('origen = ?'); valores.push(datos.origen); }
      if (datos.presentacion !== undefined) { campos.push('presentacion = ?'); valores.push(datos.presentacion); }
      if (datos.cuidado !== undefined) { campos.push('cuidado = ?'); valores.push(datos.cuidado); }
      if (datos.disponibilidad !== undefined) { campos.push('disponibilidad = ?'); valores.push(datos.disponibilidad); }

      if (campos.length === 0) {
        return resolve(this.buscarPorId(id));
      }

      valores.push(id);
      const sql = `UPDATE productos SET ${campos.join(', ')} WHERE id_producto = ?`;

      db.query(sql, valores, (err, result) => {
        if (err) return reject(err);
        if (result.affectedRows === 0) return resolve(null);
        this.buscarPorId(id).then(resolve).catch(reject);
      });
    });
  }

  async actualizarStock(id, cantidad) {
    return new Promise((resolve, reject) => {
      db.query('UPDATE productos SET stock = ? WHERE id_producto = ?', [cantidad, id], (err, result) => {
        if (err) return reject(err);
        if (result.affectedRows === 0) return resolve(null);
        this.buscarPorId(id).then(resolve).catch(reject);
      });
    });
  }

  async eliminar(id) {
    return new Promise((resolve, reject) => {
      db.query('DELETE FROM productos WHERE id_producto = ?', [id], (err, result) => {
        if (err) return reject(err);
        resolve(result.affectedRows > 0);
      });
    });
  }

  async listarTodos() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT p.*, u.nombre as vendedor_nombre, u.apodo as vendedor_apodo, u.avatar as vendedor_avatar, u.foto_portada as vendedor_portada
        FROM productos p
        LEFT JOIN usuarios u ON u.id_usuario = COALESCE(p.id_vendedor, p.id_proveedor)
        ORDER BY p.id_producto DESC
      `;
      db.query(sql, (err, rows) => {
        if (err) return reject(err);
        resolve(rows.map(row => new Producto(row)));
      });
    });
  }

  async buscarTodos() {
    return this.listarTodos();
  }

  async listarPorVendedor(idVendedor) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT p.*, u.nombre as vendedor_nombre, u.apodo as vendedor_apodo, u.avatar as vendedor_avatar, u.foto_portada as vendedor_portada
        FROM productos p
        LEFT JOIN usuarios u ON u.id_usuario = COALESCE(p.id_vendedor, p.id_proveedor)
        WHERE p.id_vendedor = ? OR p.id_proveedor = ?
        ORDER BY p.id_producto DESC
      `;
      db.query(sql, [idVendedor, idVendedor], (err, rows) => {
        if (err) return reject(err);
        resolve(rows.map(row => new Producto(row)));
      });
    });
  }

  async listarPorCategoria(categoria) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT p.*, u.nombre as vendedor_nombre, u.apodo as vendedor_apodo, u.avatar as vendedor_avatar, u.foto_portada as vendedor_portada
        FROM productos p
        LEFT JOIN usuarios u ON u.id_usuario = COALESCE(p.id_vendedor, p.id_proveedor)
        WHERE p.categoria = ?
        ORDER BY p.id_producto DESC
      `;
      db.query(sql, [categoria], (err, rows) => {
        if (err) return reject(err);
        resolve(rows.map(row => new Producto(row)));
      });
    });
  }

  async listarPorProveedor(idProveedor) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT p.*, u.nombre as vendedor_nombre, u.apodo as vendedor_apodo, u.avatar as vendedor_avatar, u.foto_portada as vendedor_portada
        FROM productos p
        LEFT JOIN usuarios u ON u.id_usuario = COALESCE(p.id_vendedor, p.id_proveedor)
        WHERE p.id_proveedor = ? OR p.id_vendedor = ?
        ORDER BY p.id_producto DESC
      `;
      db.query(sql, [idProveedor, idProveedor], (err, rows) => {
        if (err) return reject(err);
        resolve(rows.map(row => new Producto(row)));
      });
    });
  }

  async buscar(termino) {
    return new Promise((resolve, reject) => {
      const term = `%${termino}%`;
      const sql = `
        SELECT p.*, u.nombre as vendedor_nombre, u.apodo as vendedor_apodo, u.avatar as vendedor_avatar, u.foto_portada as vendedor_portada
        FROM productos p
        LEFT JOIN usuarios u ON u.id_usuario = COALESCE(p.id_vendedor, p.id_proveedor)
        WHERE p.nombre_producto LIKE ? OR p.descripcion LIKE ?
        ORDER BY p.id_producto DESC
      `;
      db.query(sql, [term, term], (err, rows) => {
        if (err) return reject(err);
        resolve(rows.map(row => new Producto(row)));
      });
    });
  }

  async buscarLimitado(termino, limite = 5) {
    return new Promise((resolve, reject) => {
      const term = `%${termino}%`;
      const sql = `
        SELECT p.*, u.nombre as vendedor_nombre, u.apodo as vendedor_apodo, u.avatar as vendedor_avatar, u.foto_portada as vendedor_portada
        FROM productos p
        LEFT JOIN usuarios u ON u.id_usuario = COALESCE(p.id_vendedor, p.id_proveedor)
        WHERE p.nombre_producto LIKE ? OR p.descripcion LIKE ?
        LIMIT ?
      `;
      db.query(sql, [term, term, limite], (err, rows) => {
        if (err) return reject(err);
        resolve(rows.map(row => new Producto(row)));
      });
    });
  }

  async contar() {
    return new Promise((resolve, reject) => {
      db.query('SELECT COUNT(*) as count FROM productos', (err, rows) => {
        if (err) return reject(err);
        resolve(rows[0] ? rows[0].count : 0);
      });
    });
  }
}

module.exports = MySQLProductoRepository;