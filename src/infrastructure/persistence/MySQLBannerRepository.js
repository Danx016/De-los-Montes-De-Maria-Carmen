const db = require('./Database');
const BannerRepository = require('../../domain/repositories/BannerRepository');

class MySQLBannerRepository extends BannerRepository {
  async obtenerActivos() {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM banners_hero WHERE activo = 1 ORDER BY orden ASC, id_banner ASC';
      db.query(sql, (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });
  }

  async obtenerTodos() {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM banners_hero ORDER BY orden ASC, id_banner ASC';
      db.query(sql, (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });
  }

  async obtenerPorId(id) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM banners_hero WHERE id_banner = ?';
      db.query(sql, [id], (err, rows) => {
        if (err) return reject(err);
        resolve(rows[0] || null);
      });
    });
  }

  async crear(banner) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO banners_hero (
          titulo, subtitulo, categoria_nombre, categoria_slug, categoria_thumb,
          imagen_fondo, color_acento, features, boton_principal_texto, boton_principal_link,
          boton_secundario_texto, boton_secundario_link, tarjeta_badge_top, tarjeta_imagen,
          tarjeta_titulo, tarjeta_precio, tarjeta_vendedor_nombre, tarjeta_vendedor_rating,
          tarjeta_vendedor_id, cupon_codigo, cupon_texto, orden, activo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const featuresJson = typeof banner.features === 'string' ? banner.features : JSON.stringify(banner.features || []);

      const params = [
        banner.titulo,
        banner.subtitulo || '',
        banner.categoria_nombre || '',
        banner.categoria_slug || '',
        banner.categoria_thumb || '',
        banner.imagen_fondo || '',
        banner.color_acento || '#22c55e',
        featuresJson,
        banner.boton_principal_texto || 'Ver Catálogo',
        banner.boton_principal_link || '/catalogo',
        banner.boton_secundario_texto || 'Vender mis Productos',
        banner.boton_secundario_link || '/vendedor',
        banner.tarjeta_badge_top || '🌿 100% Campo',
        banner.tarjeta_imagen || '',
        banner.tarjeta_titulo || '',
        banner.tarjeta_precio || '',
        banner.tarjeta_vendedor_nombre || 'Productor de los Montes',
        banner.tarjeta_vendedor_rating || '⭐ 4.9/5 Calidad',
        banner.tarjeta_vendedor_id || 47,
        banner.cupon_codigo || null,
        banner.cupon_texto || null,
        Number(banner.orden) || 0,
        banner.activo !== undefined ? Number(banner.activo) : 1
      ];

      db.query(sql, params, (err, res) => {
        if (err) return reject(err);
        resolve({ id_banner: res.insertId, ...banner });
      });
    });
  }

  async actualizar(id, banner) {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE banners_hero SET
          titulo = ?, subtitulo = ?, categoria_nombre = ?, categoria_slug = ?, categoria_thumb = ?,
          imagen_fondo = ?, color_acento = ?, features = ?, boton_principal_texto = ?, boton_principal_link = ?,
          boton_secundario_texto = ?, boton_secundario_link = ?, tarjeta_badge_top = ?, tarjeta_imagen = ?,
          tarjeta_titulo = ?, tarjeta_precio = ?, tarjeta_vendedor_nombre = ?, tarjeta_vendedor_rating = ?,
          tarjeta_vendedor_id = ?, cupon_codigo = ?, cupon_texto = ?, orden = ?, activo = ?
        WHERE id_banner = ?
      `;

      const featuresJson = typeof banner.features === 'string' ? banner.features : JSON.stringify(banner.features || []);

      const params = [
        banner.titulo,
        banner.subtitulo || '',
        banner.categoria_nombre || '',
        banner.categoria_slug || '',
        banner.categoria_thumb || '',
        banner.imagen_fondo || '',
        banner.color_acento || '#22c55e',
        featuresJson,
        banner.boton_principal_texto || 'Ver Catálogo',
        banner.boton_principal_link || '/catalogo',
        banner.boton_secundario_texto || 'Vender mis Productos',
        banner.boton_secundario_link || '/vendedor',
        banner.tarjeta_badge_top || '🌿 100% Campo',
        banner.tarjeta_imagen || '',
        banner.tarjeta_titulo || '',
        banner.tarjeta_precio || '',
        banner.tarjeta_vendedor_nombre || 'Productor de los Montes',
        banner.tarjeta_vendedor_rating || '⭐ 4.9/5 Calidad',
        banner.tarjeta_vendedor_id || 47,
        banner.cupon_codigo || null,
        banner.cupon_texto || null,
        Number(banner.orden) || 0,
        banner.activo !== undefined ? Number(banner.activo) : 1,
        id
      ];

      db.query(sql, params, (err, res) => {
        if (err) return reject(err);
        resolve(res.affectedRows > 0);
      });
    });
  }

  async eliminar(id) {
    return new Promise((resolve, reject) => {
      const sql = 'DELETE FROM banners_hero WHERE id_banner = ?';
      db.query(sql, [id], (err, res) => {
        if (err) return reject(err);
        resolve(res.affectedRows > 0);
      });
    });
  }
}

module.exports = MySQLBannerRepository;
