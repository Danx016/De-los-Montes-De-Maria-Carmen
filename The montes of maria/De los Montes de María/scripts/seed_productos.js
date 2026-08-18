/**
 * seed_productos.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Inserta los productos reales exportados de MySQL directamente en SQLite.
 * NO borra la base de datos — solo agrega/actualiza los productos.
 *
 * USO:
 *   node scripts/seed_productos.js
 */

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbFile = path.join(__dirname, '..', 'data', 'database.sqlite');
const db = new sqlite3.Database(dbFile, (err) => {
  if (err) { console.error('❌ No se pudo abrir la BD:', err.message); process.exit(1); }
});

// Datos reales exportados de MySQL
// Columnas: id, nombre_producto, descripcion, precio, stock, imagen, fecha_ingreso, categoria, origen, presentacion, cuidado, disponibilidad
const productos = [
  [28, 'Semilla de Ají Dulce', 'Ideal para huertas caseras y producción comercial.', 10000.00, 0, 'https://www.tierragro.com/cdn/shop/files/02210011.jpg?v=1730314267', '2026-05-19 23:28:17', 'semillas', 'Montes de Maria', 'Bolsa x 200', 'Evitar humedad excesiva', '54'],
  [30, 'Semilla de Sandía', 'Produce frutos grandes y dulces de excelente calidad.', 23000.00, 0, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTC3FERpvsAfvsHTJacUko1KVuk7IE1y0KtvA&s', '2026-05-19 23:32:13', 'semillas', 'Montes de Maria', 'Sobre x 120 semillas', 'Mantener en lugar fresco y seco', '32'],
  [31, 'Semilla de Maíz Híbrido', 'Semillas certificadas de maíz híbrido de alta productividad y resistencia.', 18000.00, 0, 'https://http2.mlstatic.com/D_NQ_NP_942124-MCO95273155376_102025-O.webp', '2026-05-20 12:54:03', 'semillas', 'Valle del Cauca', 'Bolsa x 1kg', 'Mantener en lugar fresco y seco', '5'],
  [32, 'Semilla de Tomate Chonto', 'Semillas seleccionadas para cultivos de tomate de excelente calidad.', 9500.00, 0, 'https://calyxplantas.com/cdn/shop/products/10SEMILLATOMATECHONTOCALYXPLANTASBOGOTA-824068.jpg?v=1773264607&width=1445', '2026-05-20 18:27:19', 'semillas', 'Antioquia', 'Sobre x 100 semillas', 'Evitar humedad excesiva', '44'],
  [34, 'Semilla de Pepino Cohombro', 'Semillas de rápida germinación y excelente producción.', 20000.00, 0, 'https://http2.mlstatic.com/D_NQ_NP_762586-MCO99226305839_112025-O.webp', '2026-05-20 18:44:45', 'semillas', 'Antioquia', 'Bolsa x 150', 'Mantener en lugar fresco y seco', '230'],
  [36, 'Queso Costeño', 'Queso artesanal fresco elaborado con leche pura de vaca.', 25000.00, 0, 'https://es.edairynews.com/wp-content/uploads/2024/09/A-como-esta-el-kilo-de-queso-en-Colombia.png', '2026-05-20 18:56:19', 'lacteos', 'Montes de Maria', 'venta por kg', 'Mantener en lugar fresco y seco', '104'],
  [37, 'Suero Costeño', 'Suero tradicional costeño con sabor auténtico.', 6000.00, 0, 'https://larazon.co/wp-content/uploads/2024/06/suero-costeno.jpg', '2026-05-20 18:57:48', 'lacteos', 'Montes de Maria', 'Bolsa x 1kg', 'Evitar humedad excesiva', '498'],
  [38, 'Yogurt Natural', 'Yogurt artesanal elaborado con leche fresca.', 56000.00, 0, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ2qdsEyGZL-4m_3U1OnDfjdoRlmYuC4V3QIg&s', '2026-05-20 18:59:06', 'lacteos', 'Montes de Maria', 'Botella x 1 litro', 'Mantener en lugar fresco y seco', '77'],
  [39, 'Kumis Casero', 'Bebida láctea tradicional con sabor suave.', 54000.00, 0, 'https://www.utadeo.edu.co/sites/tadeo/files/node/news/field_images/kumis_casero.png', '2026-05-20 19:00:29', 'lacteos', 'Montes de Maria', 'Botella x1lt', 'Mantener en lugar fresco y seco', '186'],
  [40, 'Cuajada Fresca', 'Producto lácteo artesanal de textura suave.', 65000.00, 0, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTR_E21jSwSmhARPogv0m8gYqA2NR31eITTCQ&s', '2026-05-20 19:01:42', 'lacteos', 'Montes de Maria', 'venta por kg', 'Mantener en lugar fresco y seco', '5544'],
  [41, 'Mantequilla Artesanal', 'Mantequilla natural elaborada con crema de leche.', 44600.00, 0, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQH8v0mepmQ-XmJECmD4UQOmQXQlK6KbGOdbQ&s', '2026-05-20 19:02:57', 'lacteos', 'Montes de Maria', 'venta por kg', 'Mantener en lugar fresco y seco', '764'],
  [42, 'Leche Fresca', 'Leche recién ordeñada de alta calidad.', 43000.00, 0, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRmy2UddvRra0ByDGOaSIfbNmN6y_lazj7mPw&s', '2026-05-20 19:04:16', 'lacteos', 'Montes de Maria', 'Bolsa x 1lt', 'Mantener en lugar fresco y seco', '98'],
  [43, 'Queso Campesino', 'Queso suave ideal para desayunos y comidas típicas.', 66000.00, 0, 'https://carnesoasis.com/wp-content/uploads/2020/09/Queso-fresco.jpg', '2026-05-20 19:05:25', 'lacteos', 'Montes de Maria', 'Bolsa x 1kg', 'Mantener en lugar fresco y seco', '76'],
  [44, 'Semilla de Arroz Selecto', 'Semillas de arroz de alta calidad y rendimiento', 3400.00, 0, 'https://walmartcr.vtexassets.com/arquivos/ids/536075/Arroz-Selecto-Fortificado-99-Entero-5000gr-1-42442.jpg?v=638422922225930000', '2026-05-20 19:06:38', 'semillas', 'Montes de Maria', 'venta por kg', 'Mantener en lugar fresco y seco', '88'],
  [45, 'Semilla de Lechuga Crespa', 'Ideal para huertas urbanas y cultivos hidropónicos.', 78000.00, 0, 'https://http2.mlstatic.com/D_NQ_NP_785511-MCO101904339637_122025-O.webp', '2026-05-20 19:07:42', 'semillas', 'Montes de Maria', 'Bolsa x 150', 'Mantener en lugar fresco y seco', '77'],
  [46, 'Arequipe Casero', 'Dulce artesanal preparado con leche y azúcar.', 5600.00, 0, 'https://comidasvenezolanas.org/assets/images/arequipe-casero_800x534.webp', '2026-05-20 19:10:05', 'lacteos', 'Montes de Maria', 'Tarro x 1kg', 'Mantener en lugar fresco y seco', '999'],
  [47, 'Queso Mozzarella Artesanal', 'Queso fresco ideal para pizzas y comidas rápidas.', 45000.00, 0, 'https://mygourmet.com.mx/wp-content/uploads/2023/10/queso-mozzarella-artesanal.jpg', '2026-05-20 19:19:09', 'lacteos', 'Montes de Maria', 'venta por kg', 'Mantener en lugar fresco y seco', '99'],
  [48, 'Compost Orgánico', 'Abono natural elaborado con residuos vegetales compostados.', 55000.00, 0, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSa2vmsEVsiLa2pHh1oSxnaz2eFskuQVc-tAw&s', '2026-05-20 19:21:21', 'abonos', 'Montes de Maria', 'Bolsa x 1kg', 'Natural', '500'],
  [49, 'Humus de Lombriz', 'Fertilizante orgánico rico en nutrientes para cultivos.', 123000.00, 0, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTYC7Iy6Y1RduY7Ch6xG6e_Bv1hyGy73imBvA&s', '2026-05-20 19:23:22', 'abonos', 'Montes de Maria', 'Bolsa x 40kg', 'Mantener en lugar fresco y seco', '6000'],
  [50, 'Tierra Abonada', 'Mezcla fértil para cultivos y jardinería.', 80000.00, 0, 'https://media.falabella.com/sodimacCO/614189/public', '2026-05-20 19:24:24', 'abonos', 'Montes de Maria', 'Bolsa x 50kg', 'Mantener en lugar fresco y seco', '900'],
  [51, 'Biofertilizante Líquido', 'Fertilizante natural para fortalecer cultivos.', 350000.00, 0, 'https://http2.mlstatic.com/D_NQ_NP_894136-MCO78796573567_082024-O.webp', '2026-05-20 19:26:08', 'abonos', 'Montes de Maria', 'venta por galon', 'Mantener en lugar fresco y seco', '6555'],
  [52, 'Gallinaza Compostada', 'Abono orgánico rico en nitrógeno.', 110000.00, 0, 'https://http2.mlstatic.com/D_NQ_NP_943819-MLA69476203394_052023-O.webp', '2026-05-20 19:27:28', 'abonos', 'Montes de Maria', 'venta por 40kg', 'Mantener en lugar fresco y seco', '1200'],
  [53, 'Abono Orgánico Nitrogenado', 'Mejora el crecimiento y la producción de plantas.', 30000.00, 0, 'https://fertilizantesecoforce.es/wp-content/uploads/2019/09/forceorganic.jpg', '2026-05-20 19:28:43', 'abonos', 'Montes de Maria', 'Bolsa x 5kg', 'Evitar humedad excesiva', '500'],
  [54, 'Cal Agrícola', 'Ayuda a corregir la acidez del suelo y mejorar cultivos.', 45000.00, 0, 'https://agroactivocol.com/cdn/shop/files/Cal-agricola.png?v=1767364329&width=1920', '2026-05-20 19:30:20', 'abonos', 'Montes de Maria', 'Bolsa x 40kg', 'Mantener en lugar fresco y seco', '1333'],
  [55, 'Abono NPK', 'Fertilizante químico balanceado para todo tipo de plantas.', 59000.00, 0, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ5ILUvDqxtuKPYbvdlUX-1TC2FOSAVIa3mlQ&s', '2026-05-20 19:31:12', 'abonos', 'Montes de Maria', 'venta por kg', 'Mantener en lugar fresco y seco', '10044'],
  [56, 'Machete Profesional', 'Herramienta resistente para labores agrícolas y limpieza de terreno.', 18000.00, 0, 'https://http2.mlstatic.com/D_NQ_NP_693816-MLA92561820026_092025-O.webp', '2026-05-20 19:33:43', 'ferre', 'Montes de Maria', 'Unidad', '100% Acero Inoxidable', '100'],
  [57, 'Manguera Agrícola', 'Manguera flexible de alta resistencia para sistemas de riego.', 9000.00, 0, 'https://plaxco.com.co/wp-content/uploads/2020/07/pvc-5.jpg', '2026-05-20 19:35:10', 'ferre', 'Montes de Maria', 'Metro', '100% pvc', '5000'],
  [58, 'Azadón Reforzado', 'Herramienta resistente para preparación de suelos.', 50000.00, 0, 'https://www.ferragro.com/cdn/shop/files/1005615_700x700.jpg?v=1723696992', '2026-05-20 19:36:02', 'ferre', 'Montes de Maria', 'por unidad', 'Hierro', '45000'],
  [59, 'Carretilla Agrícola', 'Carretilla metálica de alta capacidad para trabajo pesado.', 4000000.00, 0, 'https://thumbs.dreamstime.com/b/carretilla-agr%C3%ADcola-o-de-jard%C3%ADn-sobre-el-medio-ambiente-la-agricultura-natural-campo-verde-utilizado-para-trabajo-equipo-254289840.jpg', '2026-05-20 19:37:12', 'ferre', 'Montes de Maria', 'Unidad', 'Acero inoxidable', '700'],
  [60, 'Tijera de Poda', 'Tijera ergonómica ideal para poda de árboles y plantas.', 30000.00, 0, 'https://http2.mlstatic.com/D_NQ_NP_880856-MLU71232516378_082023-O.webp', '2026-05-20 19:38:33', 'ferre', 'Valle del Cauca', 'Unidad', 'Natural', '6000'],
  [61, 'Guantes de Trabajo', 'Guantes resistentes para protección en labores agrícolas.', 6000.00, 0, 'https://hechitools.com/cdn/shop/files/pixelcut-export-2025-04-11T110558.457_d83d1af6-c6ff-4c54-a098-2e0ff2ff3cdf.png?v=1744664900', '2026-05-20 19:39:55', 'ferre', 'Montes de Maria', 'por unidad', 'Natural', '800'],
  [62, 'Pala Metálica', 'Pala resistente para excavación y movimiento de tierra.', 50000.00, 0, 'https://media.falabella.com/sodimacCO/148135/public', '2026-05-20 19:41:13', 'ferre', 'Valle del Cauca', 'Unidad', 'Natural', '7655'],
  [63, 'Alambre de Púas', 'Rollo de alambre galvanizado para cercas agrícolas.', 70000.00, 0, 'https://media.falabella.com/sodimacCO/214423_02/w=1160', '2026-05-20 19:42:12', 'ferre', 'Montes de Maria', 'por unidad', 'Mantener en lugar fresco y seco', '6000'],
  [64, 'Yuca', 'Yuca fresca cosechada el mismo día.', 2000.00, 0, 'https://blog.mentta.com/wp-content/uploads/2024/06/pexels-daniel-dan-47825192-7543155-scaled.jpg', '2026-05-20 19:44:20', 'cosechas', 'Montes de Maria', 'venta por kg', 'Natural', '5950'],
  [65, 'Plátano', 'Plátano fresco cultivado localmente.', 2000.00, 0, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQFTz1G95TxFK5DhidiWztSVhFZglvbvhXEcA&s', '2026-05-20 19:45:30', 'cosechas', 'Montes de Maria', 'Unidad', 'Natural', '10000'],
  [66, 'Mango Tommy', 'Mango dulce y jugoso de excelente calidad.', 5000.00, 0, 'https://upload.wikimedia.org/wikipedia/commons/a/af/Mango_TommyAtkins04_Asit.jpg', '2026-05-20 19:46:30', 'cosechas', 'Montes de Maria', 'por unidad', 'Natural', '70000'],
  [67, 'Pepino Fresco', 'Hortaliza fresca cosechada diariamente.', 6000.00, 0, 'https://freshmate.cl/cdn/shop/files/pepino_en_tabla_de_madera_38_11zon.webp?v=1724716656', '2026-05-20 19:48:23', 'cosechas', 'Montes de Maria', 'venta por kg', 'Mantener en lugar fresco y seco', '6000'],
  [68, 'Papaya Maradol', 'Papaya fresca rica en vitaminas y nutrientes.', 6000.00, 0, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRGeLHlhYAX2KfCoF-5v6M3aIOsB6EnSGGK3Q&s', '2026-05-20 19:49:44', 'cosechas', 'Montes de Maria', 'venta por kg', 'Mantener en lugar fresco y seco', '6000'],
  [69, 'Cebolla Blanca', 'Cebolla fresca ideal para todo tipo de comidas.', 5000.00, 0, 'https://i.blogs.es/99fa73/cebolla_blanca/650_1200.jpg', '2026-05-20 19:50:59', 'cosechas', 'Montes de Maria', 'venta por kg', 'Natural', '7000'],
  [70, 'Lechuga Fresca', 'Lechuga verde cultivada de manera natural.', 6000.00, 0, 'https://i.blogs.es/b689b8/como-conservar-la-lechuga-para-que-dure-fresca-mas-dias/500_333.jpeg', '2026-05-20 19:52:35', 'cosechas', 'Montes de Maria', 'venta por kg', 'Mantener en lugar fresco y seco', '6000'],
  [71, 'Ñame Criollo', 'Tubérculo fresco cosechado por productores locales.', 6000.00, 0, 'https://a.storyblok.com/f/160385/9579dc01cb/todo-name.jpg/m/?w=256&q=100', '2026-05-20 19:59:29', 'cosechas', 'Montes de Maria', 'venta por kg', 'Natural', '7000'],
  [72, 'Fumigadora Manual', 'Fumigadora de alta presión ideal para cultivos medianos', 250000.00, 0, 'https://progen.vteximg.com.br/arquivos/ids/157786-1000-1000/Fumigadora-Manual-RoyalCondor-%C2%AE-La-Clasica.jpg?v=637483407058000000', '2026-05-20 20:00:50', 'agro', 'Montes de Maria', 'Unidad', 'Mantener en lugar fresco y seco', '1000'],
  [73, 'Motobomba de Agua', 'Equipo motorizado para riego agrícola y extracción de agua.', 600000.00, 0, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTGh0dpi5USi6p-uHdrW9dM5tZIjcy4_QcR3A&s', '2026-05-20 20:01:49', 'agro', 'Montes de Maria', 'Unidad', 'Mantener en lugar fresco y seco', '500'],
  [74, 'Guadañadora Profesional', 'Equipo motorizado para corte de maleza y césped.', 600000.00, 0, 'https://www.agrocampo.com.co/media/catalog/product/cache/dd0974c17aa11c1008feb0c4f8e4080c/4/7/475000010-min.jpg', '2026-05-20 20:02:58', 'agro', 'Montes de Maria', 'Unidad', 'Mantener en lugar fresco y seco', '800'],
  [75, 'Sistema de Riego por Goteo', 'Sistema eficiente para ahorro de agua en cultivos.', 2000000.00, 0, 'https://gestionagroambiental.com/wp-content/uploads/2022/10/riego-por-goteo-goteros-1024x682.jpg', '2026-05-20 20:04:18', 'agro', 'Montes de Maria', 'Metro', 'Mantener en lugar fresco y seco', '100000'],
  [77, 'Motoazada Agrícola', 'Máquina para preparación rápida de terrenos agrícolas.', 5000000.00, 0, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT_HgLi5NsmkS96tsK-ssY6RTsqOK-6lCNEjA&s', '2026-05-20 20:07:00', 'agro', 'Montes de Maria', 'Unidad', 'Evitar humedad excesiva', '4000'],
  [78, 'Motosierra Profesional', 'Herramienta potente para corte de madera y árboles.', 1000000.00, 0, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSAKsSO4qriAMZ5nH0oDacSetvYfQVSoJWb3A&s', '2026-05-20 20:07:49', 'agro', 'Montes de Maria', 'Unidad', 'Mantener en lugar fresco y seco', '3000'],
  [79, 'Trituradora de Pasto', 'Máquina especializada para triturar residuos vegetales.', 6000000.00, 0, 'https://cdn.croper.com/images/awvuylyo8n2t41pfmn9ho/original.jpeg', '2026-05-20 20:08:50', 'agro', 'Montes de Maria', 'Unidad', 'Evitar humedad excesiva', '10000'],
  [80, 'Guadaña', 'Perfecto para el control de malezas', 1500000.00, 0, 'https://www.agrocampo.com.co/media/catalog/product/cache/d51e0dc10c379a6229d70d752fc46d83/4/7/475000010-min.jpg', '2026-05-21 10:32:02', 'ferre', 'El Salao', 'Unidad', '100% Amigable con los mosquitos', '5'],
];

db.serialize(() => {
  db.run('PRAGMA foreign_keys = OFF');

  // Limpiar productos de demo previos (IDs 1,2,3 del seed automático)
  db.run('DELETE FROM productos WHERE id_producto IN (1, 2, 3)', [], (err) => {
    if (!err) console.log('🗑️  Productos de demo eliminados');
  });

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO productos 
      (id_producto, nombre_producto, descripcion, precio, stock, imagen, fecha_ingreso, 
       categoria, origen, presentacion, cuidado, disponibilidad)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let insertados = 0;
  for (const p of productos) {
    stmt.run(p, (err) => {
      if (err) console.error(`❌ Error en producto ${p[0]} (${p[1]}):`, err.message);
      else insertados++;
    });
  }

  stmt.finalize(() => {
    db.run('PRAGMA foreign_keys = ON');
    db.get('SELECT COUNT(*) as total FROM productos', [], (err, row) => {
      console.log(`\n✅ ${insertados} productos importados correctamente.`);
      console.log(`📦 Total en BD: ${row ? row.total : '?'} productos.`);
      db.close();
    });
  });
});
