/**
 * Implementación concreta de SoporteRepository usando MySQL
 */
const SoporteRepository = require('../../domain/repositories/SoporteRepository');
const SoporteTicket = require('../../domain/entities/SoporteTicket');
const db = require('./Database');

class MySQLSoporteRepository extends SoporteRepository {
  async crearTicket(ticket) {
    return new Promise((resolve, reject) => {
      const sql = `INSERT INTO soporte_tickets 
        (ticket_code, session_id, id_usuario, nombre_cliente, correo_cliente, telefono_cliente, asunto, estado, id_agente, nombre_agente) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      db.query(sql, [
        ticket.ticket_code,
        ticket.session_id,
        ticket.id_usuario,
        ticket.nombre_cliente,
        ticket.correo_cliente,
        ticket.telefono_cliente,
        ticket.asunto,
        ticket.estado || 'bot',
        ticket.id_agente || null,
        ticket.nombre_agente || null
      ], (err, result) => {
        if (err) return reject(err);
        ticket.id = result.insertId;
        resolve(ticket);
      });
    });
  }

  async buscarTicketPorId(id) {
    return new Promise((resolve, reject) => {
      db.query('SELECT * FROM soporte_tickets WHERE id = ?', [id], (err, rows) => {
        if (err) return reject(err);
        if (!rows || rows.length === 0) return resolve(null);
        resolve(new SoporteTicket(rows[0]));
      });
    });
  }

  async buscarTicketPorCodigo(codigo) {
    return new Promise((resolve, reject) => {
      db.query('SELECT * FROM soporte_tickets WHERE ticket_code = ?', [codigo], (err, rows) => {
        if (err) return reject(err);
        if (!rows || rows.length === 0) return resolve(null);
        resolve(new SoporteTicket(rows[0]));
      });
    });
  }

  async buscarTicketPorSessionId(sessionId) {
    return new Promise((resolve, reject) => {
      db.query('SELECT * FROM soporte_tickets WHERE session_id = ? ORDER BY created_at DESC LIMIT 1', [sessionId], (err, rows) => {
        if (err) return reject(err);
        if (!rows || rows.length === 0) return resolve(null);
        resolve(new SoporteTicket(rows[0]));
      });
    });
  }

  async actualizarTicket(id, datos) {
    return new Promise((resolve, reject) => {
      const campos = [];
      const valores = [];

      if (datos.estado !== undefined) { campos.push('estado = ?'); valores.push(datos.estado); }
      if (datos.id_agente !== undefined) { campos.push('id_agente = ?'); valores.push(datos.id_agente); }
      if (datos.nombre_agente !== undefined) { campos.push('nombre_agente = ?'); valores.push(datos.nombre_agente); }
      if (datos.asunto !== undefined) { campos.push('asunto = ?'); valores.push(datos.asunto); }

      if (campos.length === 0) {
        return resolve(this.buscarTicketPorId(id));
      }

      valores.push(id);
      const sql = `UPDATE soporte_tickets SET ${campos.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;

      db.query(sql, valores, (err, result) => {
        if (err) return reject(err);
        this.buscarTicketPorId(id).then(resolve).catch(reject);
      });
    });
  }

  async actualizarEstadoTicket(id, estado) {
    return this.actualizarTicket(id, { estado });
  }

  async asignarAgente(id, agenteId, nombreAgente) {
    return this.actualizarTicket(id, { 
      id_agente: agenteId, 
      nombre_agente: nombreAgente,
      estado: 'agente'
    });
  }

  async agregarMensaje(mensaje) {
    return new Promise((resolve, reject) => {
      const sql = `INSERT INTO soporte_mensajes 
        (ticket_id, session_id, id_usuario, nombre_remitente, rol, mensaje, leido, fecha) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

      db.query(sql, [
        mensaje.ticket_id,
        mensaje.session_id,
        mensaje.id_usuario || null,
        mensaje.nombre_remitente,
        mensaje.rol,
        mensaje.mensaje,
        mensaje.leido ? 1 : 0,
        mensaje.fecha || new Date()
      ], (err, result) => {
        if (err) return reject(err);
        resolve({ ...mensaje, id: result.insertId });
      });
    });
  }

  async listarTickets() {
    return new Promise((resolve, reject) => {
      db.query(`
        SELECT t.*,
          (SELECT COUNT(*) FROM soporte_mensajes m WHERE m.ticket_id = t.id AND m.leido = 0 AND m.rol = 'user') as no_leidos,
          (SELECT mensaje FROM soporte_mensajes m2 WHERE m2.ticket_id = t.id ORDER BY m2.id DESC LIMIT 1) as ultimo_mensaje
        FROM soporte_tickets t
        ORDER BY t.updated_at DESC LIMIT 50
      `, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  async buscarTickets(queryTerm) {
    return new Promise((resolve, reject) => {
      const q = `%${(queryTerm || '').trim()}%`;
      db.query(`
        SELECT t.*,
          (SELECT COUNT(*) FROM soporte_mensajes m WHERE m.ticket_id = t.id AND m.leido = 0 AND m.rol = 'user') as no_leidos,
          (SELECT mensaje FROM soporte_mensajes m2 WHERE m2.ticket_id = t.id ORDER BY m2.id DESC LIMIT 1) as ultimo_mensaje
        FROM soporte_tickets t
        WHERE t.ticket_code LIKE ? OR t.nombre_cliente LIKE ? OR t.correo_cliente LIKE ? OR t.asunto LIKE ?
        ORDER BY t.updated_at DESC LIMIT 40
      `, [q, q, q, q], (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });
  }

  async obtenerMensajes(ticketId) {
    return new Promise((resolve, reject) => {
      db.query('SELECT * FROM soporte_mensajes WHERE ticket_id = ? ORDER BY fecha ASC', [ticketId], (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });
  }

  async obtenerMensajesPorSession(sessionId) {
    return new Promise((resolve, reject) => {
      db.query('SELECT * FROM soporte_mensajes WHERE session_id = ? ORDER BY fecha ASC', [sessionId], (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });
  }

  async crearCalificacion(calificacion) {
    return new Promise((resolve, reject) => {
      const sql = `INSERT INTO soporte_calificaciones 
        (ticket_id, session_id, id_agente, nombre_agente, estrellas, comentario) 
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE estrellas = VALUES(estrellas), comentario = VALUES(comentario)`;

      db.query(sql, [
        calificacion.ticket_id,
        calificacion.session_id,
        calificacion.id_agente || null,
        calificacion.nombre_agente || 'Soporte Admin',
        calificacion.estrellas,
        calificacion.comentario || null
      ], (err, result) => {
        if (err) return reject(err);
        resolve({ ...calificacion, id: result.insertId });
      });
    });
  }

  async obtenerCalificacion(ticketId) {
    return new Promise((resolve, reject) => {
      db.query('SELECT * FROM soporte_calificaciones WHERE ticket_id = ?', [ticketId], (err, rows) => {
        if (err) return reject(err);
        resolve(rows && rows.length > 0 ? rows[0] : null);
      });
    });
  }

  async obtenerStatsAgentes() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          u.id_usuario, u.nombre, u.apodo, u.correo, u.avatar,
          COUNT(DISTINCT t.id) as total_tickets,
          COUNT(DISTINCT CASE WHEN t.estado = 'cerrado' THEN t.id END) as tickets_cerrados,
          COUNT(DISTINCT c.id) as total_calificaciones,
          ROUND(AVG(c.estrellas), 1) as promedio_estrellas
        FROM usuarios u
        LEFT JOIN soporte_tickets t ON t.id_agente = u.id_usuario
        LEFT JOIN soporte_calificaciones c ON c.id_agente = u.id_usuario
        WHERE u.id_rol = 4
        GROUP BY u.id_usuario
        ORDER BY promedio_estrellas DESC`;

      db.query(sql, (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });
  }

  async obtenerTodasCalificaciones() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT c.*, t.ticket_code, t.nombre_cliente, t.asunto
        FROM soporte_calificaciones c
        LEFT JOIN soporte_tickets t ON c.ticket_id = t.id
        ORDER BY c.created_at DESC`;

      db.query(sql, (err, calificaciones) => {
        if (err) return reject(err);
        resolve(calificaciones || []);
      });
    });
  }
}

module.exports = MySQLSoporteRepository;