/**
 * Implementación de ChatRepository usando MySQL
 */
const ChatRepository = require('../../domain/repositories/ChatRepository');
const db = require('./Database');

class MySQLChatRepository extends ChatRepository {
  async guardarMensaje(mensaje) {
    return new Promise((resolve, reject) => {
      const sql = 'INSERT INTO soporte_mensajes (ticket_id, session_id, id_usuario, nombre_remitente, rol, mensaje, leido) VALUES (?, ?, ?, ?, ?, ?, ?)';
      db.query(sql, [
        mensaje.ticket_id || null,
        mensaje.session_id,
        mensaje.id_usuario || null,
        mensaje.nombre_remitente,
        mensaje.rol,
        mensaje.mensaje,
        mensaje.leido ? 1 : 0
      ], (err, result) => {
        if (err) return reject(err);
        resolve({ ...mensaje, id: result.insertId });
      });
    });
  }

  async obtenerHistorialPorTicket(ticketId, limite = 30) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM soporte_mensajes WHERE ticket_id = ? ORDER BY fecha ASC LIMIT ?';
      db.query(sql, [ticketId, limite], (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });
  }

  async obtenerHistorialPorSesion(sessionId, limite = 30) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM soporte_mensajes WHERE session_id = ? ORDER BY fecha ASC LIMIT ?';
      db.query(sql, [sessionId, limite], (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });
  }

  async marcarLeidos(ticketId, rol) {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE soporte_mensajes SET leido = 1 WHERE ticket_id = ? AND rol = ?';
      db.query(sql, [ticketId, rol], (err) => {
        if (err) return reject(err);
        resolve(true);
      });
    });
  }
}

module.exports = MySQLChatRepository;
