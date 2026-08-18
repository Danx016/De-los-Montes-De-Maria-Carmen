const db = require('../src/infrastructure/persistence/Database');

const createTableSql = `
CREATE TABLE IF NOT EXISTS banners_hero (
  id_banner INT AUTO_INCREMENT PRIMARY KEY,
  titulo VARCHAR(255) NOT NULL,
  subtitulo TEXT,
  categoria_nombre VARCHAR(150),
  categoria_slug VARCHAR(100),
  categoria_thumb VARCHAR(255),
  imagen_fondo VARCHAR(255),
  color_acento VARCHAR(50) DEFAULT '#22c55e',
  features TEXT,
  boton_principal_texto VARCHAR(100) DEFAULT 'Ver Productos',
  boton_principal_link VARCHAR(255) DEFAULT '/catalogo',
  boton_secundario_texto VARCHAR(100) DEFAULT 'Vender mis Productos',
  boton_secundario_link VARCHAR(255) DEFAULT '/vendedor',
  tarjeta_badge_top VARCHAR(100) DEFAULT '🌿 100% Campo',
  tarjeta_imagen VARCHAR(255),
  tarjeta_titulo VARCHAR(200),
  tarjeta_precio VARCHAR(100),
  tarjeta_vendedor_nombre VARCHAR(150),
  tarjeta_vendedor_rating VARCHAR(100),
  tarjeta_vendedor_id INT DEFAULT 47,
  orden INT DEFAULT 0,
  activo TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

db.query(createTableSql, (err) => {
  if (err) {
    console.error('Error creating banners_hero table:', err);
    process.exit(1);
  }
  console.log('✅ TABLE banners_hero ready in MySQL');

  db.query('SELECT COUNT(*) as count FROM banners_hero', (err2, rows) => {
    if (err2) {
      console.error(err2);
      process.exit(1);
    }
    if (rows && rows[0].count === 0) {
      const initialSlides = [
        [
          'Cosechas Frescas y Tubérculos Tradicionales',
          'Ñame espino, yuca campesina, plátano hartón y aguacate cultivados directamente en las tierras fértiles de los Montes de María.',
          'Cosechas Frescas',
          'cosechas',
          '/img/verduras.avif',
          '/img/montes-de-maria-paisaje.jpg',
          '#22c55e',
          JSON.stringify(['Ñame Espino y Criollo', 'Yuca Campesina Fresca', 'Pago 100% Directo al Productor']),
          'Ver Cosechas',
          '/categoria/cosechas',
          'Vender mis Productos',
          '/vendedor',
          '🌿 100% Campo',
          '/img/Ñame.avif',
          'Ñame Criollo Espino',
          '$6.000 COP / Kilo',
          'Roberto Carlos Salcedo',
          '⭐ 4.9/5 Calidad',
          47,
          1,
          1
        ],
        [
          'Semillas Seleccionadas de Alto Rendimiento',
          'Semillas de maíz amarillo, fríjol rojo, hortalizas y granos con alto porcentaje de germinación para agricultores.',
          'Semillas Certificadas',
          'semillas',
          '/img/Maiz amarillo.jpg',
          '/img/fondo-campo.jpeg',
          '#f59e0b',
          JSON.stringify(['Maíz Amarillo Seleccionado', 'Fríjol Rojo Criollo', 'Alta Germinación']),
          'Ver Semillas',
          '/categoria/semillas',
          'Registrarme Gratis',
          '/registro',
          '🌱 Alta Germinación',
          '/img/Maiz amarillo.jpg',
          'Semilla de Maíz Amarillo',
          '$8.000 COP / Libra',
          'Roberto Carlos Salcedo',
          '📦 Disponible en Stock',
          47,
          2,
          1
        ],
        [
          'Queso Costeño y Lácteos Campesinos',
          'Queso costeño fresco, cuajada y suero tradicional elaborado artesanalmente con leche 100% pura en San Jacinto.',
          'Lácteos de la Finca',
          'lacteos',
          '/img/fondo vaca2.png',
          '/img/fondo-campo.jpeg',
          '#06b6d4',
          JSON.stringify(['Queso Costeño Fresco', 'Suero Tradicional Costeño', 'Leche Pura de Ordeño']),
          'Ver Lácteos',
          '/categoria/lacteos',
          'Conoce los Productores',
          '/vendedores',
          '🧀 100% Artesanal',
          '/img/fondo vaca2.png',
          'Queso Costeño Fresco',
          '$15.000 COP / Libra',
          'Roberto Carlos Salcedo',
          '🚚 Envío Inmediato',
          47,
          3,
          1
        ],
        [
          'Herramientas de Campo y Maquinaria Agrícola',
          'Fumigadoras, motobombas, machetes, palas y sistemas de riego para el trabajo diario en la finca.',
          'Herramientas & AgroEquipos',
          'agro',
          '/img/agro-campo.jpeg',
          '/img/agro-campo.jpeg',
          '#0284c7',
          JSON.stringify(['Fumigadoras y Bombas de Agua', 'Herramientas Manuales', 'Garantía Directa']),
          'Ver Herramientas',
          '/categoria/agro',
          'Explorar Catálogo',
          '/catalogo',
          '🚜 Trabajo Pesado',
          '/img/agro-campo.jpeg',
          'Fumigadora Manual RoyalCondor',
          '$250.000 COP',
          'Roberto Carlos Salcedo',
          '🛡️ Garantía de Campo',
          47,
          4,
          1
        ]
      ];

      const insertSql = `INSERT INTO banners_hero (
        titulo, subtitulo, categoria_nombre, categoria_slug, categoria_thumb,
        imagen_fondo, color_acento, features, boton_principal_texto, boton_principal_link,
        boton_secundario_texto, boton_secundario_link, tarjeta_badge_top, tarjeta_imagen,
        tarjeta_titulo, tarjeta_precio, tarjeta_vendedor_nombre, tarjeta_vendedor_rating,
        tarjeta_vendedor_id, orden, activo
      ) VALUES ?`;

      db.query(insertSql, [initialSlides], (err3, res3) => {
        if (err3) console.error('Error inserting initial slides:', err3);
        else console.log('✅ Base slides inserted successfully:', res3.affectedRows);
        process.exit(0);
      });
    } else {
      console.log('✅ Banners already configured in DB:', rows[0].count);
      process.exit(0);
    }
  });
});
