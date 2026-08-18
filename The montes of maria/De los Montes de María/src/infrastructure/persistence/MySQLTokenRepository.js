/**
 * Implementación de TokenRepository usando base de datos y memoria
 */
const TokenRepository = require('../../domain/repositories/TokenRepository');
const db = require('./Database');

class MySQLTokenRepository extends TokenRepository {
  constructor() {
    super();
    this.inMemoryOtps = new Map();
  }

  async guardarResetCode(idUsuario, codigo, expiracion) {
    return new Promise((resolve, reject) => {
      db.query('UPDATE usuarios SET reset_code = ?, reset_expires = ? WHERE id_usuario = ?', [codigo, expiracion, idUsuario], (err) => {
        if (err) return reject(err);
        resolve(true);
      });
    });
  }

  async obtenerResetCode(idUsuario) {
    return new Promise((resolve, reject) => {
      db.query('SELECT reset_code, reset_expires FROM usuarios WHERE id_usuario = ?', [idUsuario], (err, rows) => {
        if (err) return reject(err);
        if (!rows || rows.length === 0) return resolve(null);
        resolve({
          codigo: rows[0].reset_code,
          expiracion: rows[0].reset_expires
        });
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

  async guardarOtp(email, codigo, durationMinutes = 5) {
    const expiresAt = Date.now() + durationMinutes * 60 * 1000;
    this.inMemoryOtps.set(email.toLowerCase().trim(), {
      codigo: String(codigo),
      expiresAt
    });
    return true;
  }

  async verificarOtp(email, codigo) {
    const key = email.toLowerCase().trim();
    const record = this.inMemoryOtps.get(key);
    if (!record) return { valid: false, message: 'No hay código pendiente para este correo' };
    if (Date.now() > record.expiresAt) {
      this.inMemoryOtps.delete(key);
      return { valid: false, message: 'El código ha expirado. Solicita uno nuevo.' };
    }
    if (record.codigo !== String(codigo).trim()) {
      return { valid: false, message: 'Código incorrecto. Verifica el correo.' };
    }
    this.inMemoryOtps.delete(key);
    return { valid: true };
  }
}

module.exports = MySQLTokenRepository;
