/**
 * Implementación concreta de UsuarioRepository usando MySQL
 */
const UsuarioRepository = require('../../domain/repositories/UsuarioRepository');
const Usuario = require('../../domain/entities/Usuario');
const Direccion = require('../../domain/entities/Direccion');
const bcrypt = require('bcrypt');
const db = require('./Database');

class MySQLUsuarioRepository extends UsuarioRepository {
  async crear(usuario) {
    let hashedPassword = null;
    if (usuario.contrasena) {
      hashedPassword = await bcrypt.hash(usuario.contrasena, 12);
    }

    return new Promise((resolve, reject) => {
      const sql = `INSERT INTO usuarios 
        (nombre, apodo, correo, telefono, direccion, contrasena, id_rol, avatar, creditos, google_id, estado, foto_portada, descripcion, categoria_productos) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      db.query(sql, [
        usuario.nombre,
        usuario.apodo,
        usuario.correo,
        usuario.telefono,
        usuario.direccion,
        hashedPassword,
        usuario.id_rol,
        usuario.avatar,
        usuario.creditos || 0.00,
        usuario.google_id || null,
        usuario.estado || 'activo',
        usuario.foto_portada || null,
        usuario.descripcion || null,
        usuario.categoria_productos || null
      ], (err, result) => {
        if (err) return reject(err);
        const createdObj = usuario instanceof Usuario ? usuario : new Usuario({
          ...usuario,
          id_usuario: result.insertId,
          contrasena: hashedPassword
        });
        createdObj.id_usuario = result.insertId;
        resolve(createdObj);
      });
    });
  }

  async buscarPorId(id) {
    return new Promise((resolve, reject) => {
      db.query('SELECT * FROM usuarios WHERE id_usuario = ?', [id], (err, rows) => {
        if (err) return reject(err);
        if (!rows || rows.length === 0) return resolve(null);
        resolve(new Usuario(rows[0]));
      });
    });
  }

  async buscarPorApodo(apodo) {
    return new Promise((resolve, reject) => {
      db.query('SELECT * FROM usuarios WHERE apodo = ?', [apodo], (err, rows) => {
        if (err) return reject(err);
        if (!rows || rows.length === 0) return resolve(null);
        resolve(new Usuario(rows[0]));
      });
    });
  }

  async buscarPorCorreo(correo) {
    return new Promise((resolve, reject) => {
      db.query('SELECT * FROM usuarios WHERE correo = ?', [correo], (err, rows) => {
        if (err) return reject(err);
        if (!rows || rows.length === 0) return resolve(null);
        resolve(new Usuario(rows[0]));
      });
    });
  }

  async buscarPorApodoOCorreo(termino) {
    return new Promise((resolve, reject) => {
      db.query('SELECT * FROM usuarios WHERE apodo = ? OR correo = ?', [termino, termino], (err, rows) => {
        if (err) return reject(err);
        if (!rows || rows.length === 0) return resolve(null);
        resolve(new Usuario(rows[0]));
      });
    });
  }

  async buscarPorGoogleId(googleId) {
    return new Promise((resolve, reject) => {
      db.query('SELECT * FROM usuarios WHERE google_id = ?', [googleId], (err, rows) => {
        if (err) return reject(err);
        if (!rows || rows.length === 0) return resolve(null);
        resolve(new Usuario(rows[0]));
      });
    });
  }

  async actualizar(id, datos) {
    return new Promise((resolve, reject) => {
      const campos = [];
      const valores = [];

      if (datos.nombre !== undefined) { campos.push('nombre = ?'); valores.push(datos.nombre); }
      if (datos.apodo !== undefined) { campos.push('apodo = ?'); valores.push(datos.apodo); }
      if (datos.correo !== undefined) { campos.push('correo = ?'); valores.push(datos.correo); }
      if (datos.telefono !== undefined) { campos.push('telefono = ?'); valores.push(datos.telefono); }
      if (datos.direccion !== undefined) { campos.push('direccion = ?'); valores.push(datos.direccion); }
      if (datos.avatar !== undefined) { campos.push('avatar = ?'); valores.push(datos.avatar); }
      if (datos.id_rol !== undefined) { campos.push('id_rol = ?'); valores.push(datos.id_rol); }
      if (datos.google_id !== undefined) { campos.push('google_id = ?'); valores.push(datos.google_id); }
      if (datos.estado !== undefined) { campos.push('estado = ?'); valores.push(datos.estado); }
      if (datos.foto_portada !== undefined) { campos.push('foto_portada = ?'); valores.push(datos.foto_portada); }
      if (datos.descripcion !== undefined) { campos.push('descripcion = ?'); valores.push(datos.descripcion); }
      if (datos.categoria_productos !== undefined) { campos.push('categoria_productos = ?'); valores.push(datos.categoria_productos); }

      if (campos.length === 0) {
        return resolve(this.buscarPorId(id));
      }

      valores.push(id);
      const sql = `UPDATE usuarios SET ${campos.join(', ')} WHERE id_usuario = ?`;

      db.query(sql, valores, (err, result) => {
        if (err) return reject(err);
        if (result.affectedRows === 0) return resolve(null);
        this.buscarPorId(id).then(resolve).catch(reject);
      });
    });
  }

  async actualizarContrasena(id, nuevaContrasena) {
    const hashedPassword = await bcrypt.hash(nuevaContrasena, 12);
    return new Promise((resolve, reject) => {
      db.query('UPDATE usuarios SET contrasena = ?, reset_code = NULL, reset_expires = NULL WHERE id_usuario = ?', [hashedPassword, id], (err, result) => {
        if (err) return reject(err);
        if (result.affectedRows === 0) return resolve(null);
        this.buscarPorId(id).then(resolve).catch(reject);
      });
    });
  }

  async actualizarCreditos(id, creditos) {
    return new Promise((resolve, reject) => {
      db.query('UPDATE usuarios SET creditos = ? WHERE id_usuario = ?', [creditos, id], (err, result) => {
        if (err) return reject(err);
        if (result.affectedRows === 0) return resolve(null);
        this.buscarPorId(id).then(resolve).catch(reject);
      });
    });
  }

  async descontarCreditos(id, monto) {
    return new Promise((resolve, reject) => {
      db.query('UPDATE usuarios SET creditos = creditos - ? WHERE id_usuario = ?', [monto, id], (err, result) => {
        if (err) return reject(err);
        resolve(result.affectedRows > 0);
      });
    });
  }

  async guardarResetCode(idUsuario, codigo, expiracion) {
    return new Promise((resolve, reject) => {
      db.query('UPDATE usuarios SET reset_code = ?, reset_expires = ? WHERE id_usuario = ?', [codigo, expiracion, idUsuario], (err) => {
        if (err) return reject(err);
        resolve(true);
      });
    });
  }

  async limpiarResetCode(idUsuario) {
    return new Promise((resolve, reject) => {
      db.query('UPDATE usuarios SET reset_code = NULL, reset_expires = NULL WHERE id_usuario = ?', [idUsuario], (err) => {
        if (err) return reject(err);
        resolve(true);
      });
    });
  }

  async eliminar(id) {
    return new Promise((resolve, reject) => {
      db.query('DELETE FROM usuarios WHERE id_usuario = ?', [id], (err, result) => {
        if (err) return reject(err);
        resolve(result.affectedRows > 0);
      });
    });
  }

  async listarTodos(search = null) {
    return new Promise((resolve, reject) => {
      let sql = 'SELECT * FROM usuarios';
      const params = [];
      if (search) {
        sql += ' WHERE nombre LIKE ? OR apodo LIKE ? OR correo LIKE ?';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }
      sql += ' ORDER BY id_usuario DESC';
      db.query(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows.map(row => new Usuario(row)));
      });
    });
  }

  async listarPorRol(idRol) {
    return new Promise((resolve, reject) => {
      db.query('SELECT * FROM usuarios WHERE id_rol = ? ORDER BY id_usuario DESC', [idRol], (err, rows) => {
        if (err) return reject(err);
        resolve(rows.map(row => new Usuario(row)));
      });
    });
  }

  async contarAdministradores() {
    return new Promise((resolve, reject) => {
      db.query('SELECT COUNT(*) AS cnt FROM usuarios WHERE id_rol = 1', (err, rows) => {
        if (err) return reject(err);
        resolve(rows[0] ? rows[0].cnt : 0);
      });
    });
  }

  async verificarApodoDisponible(apodo, excludeUserId = null) {
    return new Promise((resolve, reject) => {
      let sql = 'SELECT id_usuario FROM usuarios WHERE apodo = ?';
      const params = [apodo.trim()];
      if (excludeUserId) {
        sql += ' AND id_usuario != ?';
        params.push(excludeUserId);
      }
      db.query(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows.length === 0);
      });
    });
  }

  async verificarCorreoDisponible(correo, excludeUserId = null) {
    return new Promise((resolve, reject) => {
      let sql = 'SELECT id_usuario FROM usuarios WHERE correo = ?';
      const params = [correo.trim()];
      if (excludeUserId) {
        sql += ' AND id_usuario != ?';
        params.push(excludeUserId);
      }
      db.query(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows.length === 0);
      });
    });
  }

  // --- Direcciones ---
  async obtenerDirecciones(idUsuario) {
    return new Promise((resolve, reject) => {
      db.query('SELECT * FROM direcciones WHERE id_usuario = ?', [idUsuario], (err, rows) => {
        if (err) return reject(err);
        resolve(rows.map(r => new Direccion(r)));
      });
    });
  }

  async agregarDireccion(idUsuario, data) {
    return new Promise((resolve, reject) => {
      const sql = 'INSERT INTO direcciones (id_usuario, titulo, direccion_principal, departamento, ciudad, telefono, codigo_postal, notas) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
      const params = [idUsuario, data.titulo || 'Principal', data.direccion_principal, data.departamento, data.ciudad, data.telefono, data.codigo_postal || '', data.notas || ''];
      db.query(sql, params, (err, result) => {
        if (err) return reject(err);
        resolve(new Direccion({ id_direccion: result.insertId, id_usuario: idUsuario, ...data }));
      });
    });
  }

  async actualizarDireccion(idUsuario, idDir, data) {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE direcciones SET titulo = ?, direccion_principal = ?, departamento = ?, ciudad = ?, telefono = ?, codigo_postal = ?, notas = ? WHERE id_direccion = ? AND id_usuario = ?';
      const params = [data.titulo || 'Principal', data.direccion_principal, data.departamento, data.ciudad, data.telefono, data.codigo_postal || '', data.notas || '', idDir, idUsuario];
      db.query(sql, params, (err, result) => {
        if (err) return reject(err);
        resolve(result.affectedRows > 0);
      });
    });
  }

  async eliminarDireccion(idUsuario, idDir) {
    return new Promise((resolve, reject) => {
      db.query('DELETE FROM direcciones WHERE id_direccion = ? AND id_usuario = ?', [idDir, idUsuario], (err, result) => {
        if (err) return reject(err);
        resolve(result.affectedRows > 0);
      });
    });
  }
}

module.exports = MySQLUsuarioRepository;