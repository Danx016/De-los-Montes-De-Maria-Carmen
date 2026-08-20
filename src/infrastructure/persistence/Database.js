/**
 * Configuración de base de datos MySQL
 * Mueve la lógica de conexión a la capa de infraestructura
 */
require('dotenv').config();
const mysql = require('mysql2');

function cleanEnv(val, fallback = '') {
  if (val === undefined || val === null) return fallback;
  const s = String(val).trim().replace(/^["']|["']$/g, '');
  return s || fallback;
}

const dbHost = cleanEnv(process.env.DB_HOST, 'localhost');
const dbPort = parseInt(cleanEnv(process.env.DB_PORT, '3306'), 10) || 3306;
const dbUser = cleanEnv(process.env.DB_USER, 'root');
const dbPass = cleanEnv(process.env.DB_PASS, '');
const dbName = cleanEnv(process.env.DB_NAME, 'defaultdb');
const useSsl =
  process.env.DB_SSL === 'true' ||
  dbHost.includes('aivencloud.com') ||
  dbHost.includes('railway') ||
  dbHost.includes('clever-cloud');

const dbConfig = {
  host: dbHost,
  port: dbPort,
  user: dbUser,
  password: dbPass,
  database: dbName,
  waitForConnections: true,
  connectionLimit: 25,
  queueLimit: 0,
  connectTimeout: 20000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  multipleStatements: true,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
};

// Pool principal de MySQL
const pool = mysql.createPool(dbConfig);

// Verificar la conexión y preparar las tablas
const initConn = mysql.createConnection({
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  password: dbConfig.password,
  database: dbConfig.database,
  multipleStatements: true,
  connectTimeout: 15000,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
});

initConn.connect((err) => {
  if (err) {
    console.error(`⚠️  No se pudo conectar al servidor MySQL (${dbHost}:${dbPort}):`, err.code || err.message || err);
    console.error('ℹ️  Verifica que las variables DB_* en el panel Environment de Render sean correctas.');
  } else {
    console.log(`✅ Base de datos MySQL '${dbConfig.database}' conectada con éxito en ${dbConfig.host}:${dbConfig.port}`);
    initConn.end();
    initializeDatabaseTables();
  }
});

const dbProxy = {
  query: (sql, params, cb) => {
    if (typeof params === 'function') {
      cb = params;
      params = [];
    }
    params = params || [];

    pool.query(sql, params, (err, results, fields) => {
      if (cb) cb(err, results, fields);
    });
  },
  beginTransaction: (cb) => pool.query('START TRANSACTION', cb),
  commit: (cb) => pool.query('COMMIT', cb),
  rollback: (cb) => pool.query('ROLLBACK', cb),
  ping: (cb) => pool.query('SELECT 1 as ok', [], cb),
  end: (cb) => pool.end(cb)
};

function initializeDatabaseTables() {
  const schemaQueries = [
    `CREATE TABLE IF NOT EXISTS roles (
      id_rol INT AUTO_INCREMENT PRIMARY KEY,
      nombre_rol VARCHAR(50) NOT NULL UNIQUE,
      descripcion TEXT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS categorias (
      id_categoria INT AUTO_INCREMENT PRIMARY KEY,
      nombre_categoria VARCHAR(100) NOT NULL,
      slug VARCHAR(100),
      descripcion TEXT,
      imagen VARCHAR(255),
      icono VARCHAR(100) DEFAULT 'fa-box',
      color VARCHAR(50) DEFAULT '#2e7d32'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS proveedores (
      id_proveedor INT AUTO_INCREMENT PRIMARY KEY,
      nombre_empresa VARCHAR(150) NOT NULL,
      representante VARCHAR(100),
      telefono VARCHAR(20),
      correo VARCHAR(100),
      direccion VARCHAR(200),
      ciudad VARCHAR(100)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS usuarios (
      id_usuario INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(100) NOT NULL,
      apodo VARCHAR(100) NOT NULL UNIQUE,
      correo VARCHAR(150) NOT NULL UNIQUE,
      telefono VARCHAR(20),
      direccion VARCHAR(200),
      contrasena VARCHAR(255) NOT NULL,
      id_rol INT DEFAULT 2,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      avatar MEDIUMTEXT,
      reset_code VARCHAR(10),
      reset_expires DATETIME,
      creditos DECIMAL(10,2) DEFAULT 0.00,
      google_id VARCHAR(255),
      estado VARCHAR(50) DEFAULT 'activo',
      foto_portada TEXT,
      descripcion TEXT,
      categoria_productos VARCHAR(255)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS productos (
      id_producto INT AUTO_INCREMENT PRIMARY KEY,
      id_vendedor INT,
      nombre_producto VARCHAR(150) NOT NULL,
      descripcion TEXT,
      precio DECIMAL(10,2) NOT NULL,
      stock INT DEFAULT 0,
      unidad_medida VARCHAR(50),
      imagen VARCHAR(255),
      fecha_ingreso DATETIME DEFAULT CURRENT_TIMESTAMP,
      id_categoria INT,
      id_proveedor INT,
      categoria VARCHAR(100),
      origen VARCHAR(100),
      presentacion VARCHAR(100),
      cuidado VARCHAR(255),
      disponibilidad VARCHAR(100)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS compras (
      id_compra INT AUTO_INCREMENT PRIMARY KEY,
      id_usuario INT NOT NULL,
      fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
      total DECIMAL(10,2) NOT NULL,
      estado VARCHAR(50) DEFAULT 'Pedido recibido',
      metodo_pago VARCHAR(50) DEFAULT 'Tarjeta de Crédito',
      reembolsado TINYINT(1) DEFAULT 0,
      direccion_envio TEXT,
      FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS compra_detalles (
      id_detalle INT AUTO_INCREMENT PRIMARY KEY,
      id_compra INT NOT NULL,
      id_producto INT NOT NULL,
      cantidad INT NOT NULL,
      precio_unitario DECIMAL(10,2) NOT NULL,
      FOREIGN KEY (id_compra) REFERENCES compras(id_compra) ON DELETE CASCADE,
      FOREIGN KEY (id_producto) REFERENCES productos(id_producto) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS direcciones (
      id_direccion INT AUTO_INCREMENT PRIMARY KEY,
      id_usuario INT NOT NULL,
      titulo VARCHAR(100) DEFAULT 'Principal',
      direccion_principal VARCHAR(255) NOT NULL,
      departamento VARCHAR(100) NOT NULL,
      ciudad VARCHAR(100) NOT NULL,
      telefono VARCHAR(30) NOT NULL,
      codigo_postal VARCHAR(20) DEFAULT '',
      notas TEXT,
      FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS soporte_tickets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      ticket_code VARCHAR(50) NOT NULL UNIQUE,
      session_id VARCHAR(255) NOT NULL,
      id_usuario INT,
      nombre_cliente VARCHAR(100) NOT NULL,
      correo_cliente VARCHAR(150) NOT NULL,
      telefono_cliente VARCHAR(30) NOT NULL,
      asunto VARCHAR(255) NOT NULL,
      estado VARCHAR(50) DEFAULT 'bot',
      id_agente INT,
      nombre_agente VARCHAR(100),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS soporte_mensajes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      ticket_id INT,
      session_id VARCHAR(255) NOT NULL,
      id_usuario INT,
      nombre_remitente VARCHAR(100) NOT NULL,
      rol VARCHAR(50) NOT NULL,
      mensaje TEXT NOT NULL,
      leido TINYINT(1) DEFAULT 0,
      fecha DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS soporte_calificaciones (
      id INT AUTO_INCREMENT PRIMARY KEY,
      ticket_id INT NOT NULL UNIQUE,
      session_id VARCHAR(255) NOT NULL,
      id_agente INT,
      nombre_agente VARCHAR(100),
      estrellas INT NOT NULL CHECK(estrellas BETWEEN 1 AND 5),
      comentario TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS cupones (
      id_cupon INT AUTO_INCREMENT PRIMARY KEY,
      codigo VARCHAR(50) NOT NULL UNIQUE,
      descripcion VARCHAR(255),
      descuento_porcentaje DECIMAL(5, 2) DEFAULT 0,
      descuento_fijo DECIMAL(10, 2) DEFAULT 0,
      color_tema VARCHAR(50) DEFAULT '#059669',
      monto_minimo DECIMAL(10, 2) DEFAULT 0,
      uso_limite INT DEFAULT NULL,
      uso_actual INT DEFAULT 0,
      fecha_expiracion DATE DEFAULT NULL,
      activo TINYINT(1) DEFAULT 1,
      promocionar_en_barra TINYINT(1) DEFAULT 0,
      mensaje_promocional VARCHAR(255) DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS telegram_sesiones (
      chat_id VARCHAR(100) PRIMARY KEY,
      id_usuario INT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS telegram_auth_codigos (
      chat_id VARCHAR(100) PRIMARY KEY,
      id_usuario INT NOT NULL,
      codigo VARCHAR(10) NOT NULL,
      expires_at BIGINT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS banners_hero (
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
      cupon_codigo VARCHAR(50) DEFAULT NULL,
      cupon_texto VARCHAR(255) DEFAULT NULL,
      estilo_plantilla VARCHAR(50) DEFAULT 'clasico',
      filtro_blur INT DEFAULT 0,
      orden INT DEFAULT 0,
      activo TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
  ];

  let pending = schemaQueries.length;
  schemaQueries.forEach(queryStr => {
    pool.query(queryStr, (err) => {
      if (err) console.error('Error al crear tabla MySQL:', err.message);
      pending--;
      if (pending === 0) {
        syncMissingColumnsAndSeed();
      }
    });
  });
}

function syncMissingColumnsAndSeed() {
  // Asegurar columnas para banners_hero
  pool.query("SHOW COLUMNS FROM banners_hero LIKE 'estilo_plantilla'", (err, rows) => {
    if (!err && rows && rows.length === 0) {
      pool.query("ALTER TABLE banners_hero ADD COLUMN estilo_plantilla VARCHAR(50) DEFAULT 'clasico'", () => {});
    }
  });

  pool.query("SHOW COLUMNS FROM banners_hero LIKE 'filtro_blur'", (err, rows) => {
    if (!err && rows && rows.length === 0) {
      pool.query("ALTER TABLE banners_hero ADD COLUMN filtro_blur INT DEFAULT 0", () => {});
    }
  });
  // Asegurar que la columna 'created_at' exista en usuarios
  pool.query("SHOW COLUMNS FROM usuarios LIKE 'created_at'", (err, rows) => {
    if (!err && rows && rows.length === 0) {
      pool.query("ALTER TABLE usuarios ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP", () => {
        pool.query("UPDATE usuarios SET created_at = fecha_registro WHERE created_at IS NULL AND fecha_registro IS NOT NULL", () => {});
      });
    }
  });

  // Asegurar que 'apodo' exista en usuarios
  pool.query("SHOW COLUMNS FROM usuarios LIKE 'apodo'", (err, rows) => {
    if (!err && rows && rows.length === 0) {
      pool.query("ALTER TABLE usuarios ADD COLUMN apodo VARCHAR(100)", () => {});
    }
  });

  // Asegurar columnas de vendedor en usuarios
  pool.query("SHOW COLUMNS FROM usuarios LIKE 'foto_portada'", (err, rows) => {
    if (!err && rows && rows.length === 0) {
      pool.query("ALTER TABLE usuarios ADD COLUMN foto_portada TEXT", () => {});
    }
  });

  pool.query("SHOW COLUMNS FROM usuarios LIKE 'descripcion'", (err, rows) => {
    if (!err && rows && rows.length === 0) {
      pool.query("ALTER TABLE usuarios ADD COLUMN descripcion TEXT", () => {});
    }
  });

  pool.query("SHOW COLUMNS FROM usuarios LIKE 'categoria_productos'", (err, rows) => {
    if (!err && rows && rows.length === 0) {
      pool.query("ALTER TABLE usuarios ADD COLUMN categoria_productos VARCHAR(255)", () => {});
    }
  });

  // Asegurar columnas en categorias
  pool.query("SHOW COLUMNS FROM categorias LIKE 'slug'", (err, rows) => {
    if (!err && rows && rows.length === 0) {
      pool.query("ALTER TABLE categorias ADD COLUMN slug VARCHAR(100)", () => {});
    }
  });

  pool.query("SHOW COLUMNS FROM categorias LIKE 'imagen'", (err, rows) => {
    if (!err && rows && rows.length === 0) {
      pool.query("ALTER TABLE categorias ADD COLUMN imagen MEDIUMTEXT", () => {});
    } else {
      pool.query("ALTER TABLE categorias MODIFY COLUMN imagen MEDIUMTEXT", () => {});
    }
  });

  pool.query("SHOW COLUMNS FROM productos LIKE 'imagen'", (err, rows) => {
    if (!err && rows && rows.length > 0) {
      pool.query("ALTER TABLE productos MODIFY COLUMN imagen MEDIUMTEXT", () => {});
    }
  });

  pool.query("SHOW COLUMNS FROM categorias LIKE 'icono'", (err, rows) => {
    if (!err && rows && rows.length === 0) {
      pool.query("ALTER TABLE categorias ADD COLUMN icono VARCHAR(100) DEFAULT 'fa-box'", () => {});
    }
  });

  pool.query("SHOW COLUMNS FROM categorias LIKE 'color'", (err, rows) => {
    if (!err && rows && rows.length === 0) {
      pool.query("ALTER TABLE categorias ADD COLUMN color VARCHAR(50) DEFAULT '#2e7d32'", () => {});
    }
  });

  // Asegurar id_vendedor en productos
  pool.query("SHOW COLUMNS FROM productos LIKE 'id_vendedor'", (err, rows) => {
    if (!err && rows && rows.length === 0) {
      pool.query("ALTER TABLE productos ADD COLUMN id_vendedor INT", () => {
        // Asignar vendedor por defecto a productos huérfanos
        pool.query("UPDATE productos SET id_vendedor = 47 WHERE id_vendedor IS NULL", () => {});
      });
    }
  });

  seedDataIfEmpty();
}

function seedDataIfEmpty() {
  const bcrypt = require('bcrypt');

  pool.query("SELECT COUNT(*) as count FROM productos", (err, rows) => {
    if (err) return;
    if (rows && rows[0] && rows[0].count === 0) {
      console.log("Sembrando datos iniciales en MySQL (categorías, proveedores, productos reales de Montes de María)...");
      pool.query(`INSERT IGNORE INTO categorias (id_categoria, nombre_categoria, descripcion, imagen, icono, color) VALUES
        (1, 'Cosechas Frescas', 'Frutas, verduras y tubérculos recién cosechados en el campo montemariano', 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80', 'fa-leaf', '#16a34a'),
        (2, 'Lácteos Artesanales', 'Quesos costeños, sueros y lácteos tradicionales de ordeño puro', 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=600&q=80', 'fa-cheese', '#ea580c'),
        (3, 'Semillas Nativas', 'Semillas de maíz, fríjol y granos seleccionados de alta germinación', 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=600&q=80', 'fa-seedling', '#ca8a04'),
        (4, 'Abonos y Fertilizantes', 'Compost y abonos orgánicos para cultivos saludables', 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&w=600&q=80', 'fa-flask', '#0284c7'),
        (5, 'Ferretería & Herramientas', 'Machetes, palas, motobombas y equipos de campo', 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80', 'fa-tools', '#78350f'),
        (6, 'Miel y Derivados', 'Miel pura de abejas de la serranía y panela campesina', 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=600&q=80', 'fa-jar', '#d97706')`);

      pool.query(`INSERT IGNORE INTO proveedores (id_proveedor, nombre_empresa, representante, telefono, correo, direccion, ciudad) VALUES
        (1, 'Asociación Campesina Montes de María', 'Roberto Carlos Salcedo', '3001112233', 'contacto@montesdemaria.org', 'Vereda Las Palmas', 'San Jacinto'),
        (2, 'Semillas y Frutos del Campo', 'Pedro Montes', '3015557788', 'ventas@semillasdelcampo.co', 'Sector El Carmen', 'El Carmen de Bolívar')`);

      pool.query(`INSERT IGNORE INTO productos (id_producto, id_vendedor, nombre_producto, descripcion, precio, stock, unidad_medida, imagen, id_categoria, id_proveedor, categoria, origen, presentacion, disponibilidad) VALUES
        (1, 47, 'Ñame Criollo Espino', 'Ñame espino de primera calidad recién cosechado en tierras montemarianas, ideal para sancocho.', 6000, 150, 'Kilo', 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=600&q=80', 1, 1, 'cosechas', 'San Juan Nepomuceno', 'Kilo', '150'),
        (2, 47, 'Yuca Campesina Fresca', 'Yuca blanca suave de cocción rápida, recién arrancada de la parcela.', 3500, 200, 'Kilo', 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=600&q=80', 1, 1, 'cosechas', 'El Carmen de Bolívar', 'Kilo', '200'),
        (3, 47, 'Aguacate Criollo Mantecoso', 'Aguacate criollo de gran tamaño, pulpa cremosa y sabor tradicional.', 5000, 80, 'Unidad', 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&w=600&q=80', 1, 1, 'cosechas', 'San Jacinto', 'Unidad', '80'),
        (4, 2, 'Semilla de Maíz Amarillo', 'Semilla seleccionada y tratada artesanalmente para siembra de alto rendimiento.', 8000, 100, 'Libra', 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=600&q=80', 3, 2, 'semillas', 'San Jacinto', 'Libra', '100'),
        (5, 47, 'Queso Costeño Fresco', 'Queso artesanal con bajo nivel de sal, elaborado con leche pura de ordeño.', 15000, 50, 'Libra', 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=600&q=80', 2, 1, 'lacteos', 'San Jacinto', 'Libra', '50'),
        (6, 47, 'Fríjol Rojo Criollo', 'Grano seco seleccionado, libre de impurezas, excelente rendimiento en cocina.', 7500, 70, 'Libra', 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80', 3, 2, 'semillas', 'El Carmen de Bolívar', 'Libra', '70'),
        (7, 47, 'Limón Tahití Jugoso', 'Limones verdes jugosos de exportación, acidez balanceada y abundante jugo.', 4000, 120, 'Kilo', 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=600&q=80', 1, 1, 'cosechas', 'San Juan Nepomuceno', 'Kilo', '120'),
        (8, 47, 'Papaya Criolla Dulce', 'Papaya madurada al sol en árbol con gran dulzura y textura firme.', 4500, 60, 'Unidad', 'https://images.unsplash.com/photo-1517282009859-f000ec3b26fe?auto=format&fit=crop&w=600&q=80', 1, 1, 'cosechas', 'San Jacinto', 'Unidad', '60'),
        (9, 47, 'Banano Criollo Maduro', 'Racimos de banano dulce cultivados bajo sombra natural.', 3000, 90, 'Kilo', 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=600&q=80', 1, 1, 'cosechas', 'El Carmen de Bolívar', 'Kilo', '90')`);
    }
  });

  pool.query("SELECT COUNT(*) as count FROM usuarios", (err, rows) => {
    if (err) return;
    if (rows && rows[0] && rows[0].count === 0) {
      console.log("Sembrando datos iniciales de usuarios en MySQL...");
      pool.query(`INSERT IGNORE INTO roles (id_rol, nombre_rol, descripcion) VALUES
        (1, 'Administrador', 'Control total del sistema'),
        (2, 'Vendedor', 'Productor campesino y vendedor'),
        (3, 'Cliente', 'Realiza compras'),
        (4, 'Soporte', 'Atención al cliente y soporte técnico en vivo')`);

      const defaultHash = bcrypt.hashSync('123456', 10);
      pool.query(`INSERT IGNORE INTO usuarios (id_usuario, nombre, apodo, correo, telefono, direccion, contrasena, id_rol, creditos, foto_portada, avatar, descripcion, categoria_productos) VALUES
        (1, 'Admin', 'admin_0', 'admin@agrocampo.com', '3000000000', 'Oficina Central', ?, 1, 1000.00, NULL, NULL, NULL, NULL),
        (2, 'Pedro Montes', 'pedro_montes', 'pedro@agrocampo.com', '3111111111', 'San Jacinto, Bolívar', ?, 2, 0.00, 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80', 'Productor tradicional de maíz, yuca y frutas tropicales en las faldas de los Montes de María.', 'Cosechas, Semillas')`,
        [defaultHash, defaultHash]
      );
    }
  });

  // Asegurar roles actualizados
  pool.query("UPDATE roles SET nombre_rol = 'Vendedor', descripcion = 'Productor campesino y vendedor' WHERE id_rol = 2");

  // Sembrar cupones por defecto si no existen
  pool.query("SELECT COUNT(*) as count FROM cupones", (err, rows) => {
    if (!err && rows && rows[0] && rows[0].count === 0) {
      console.log("Sembrando cupones de descuento iniciales (AGRO10, BIENVENIDO, CAMPO20, COSECHA5)...");
      pool.query(`INSERT IGNORE INTO cupones (codigo, descripcion, descuento_porcentaje, descuento_fijo, color_tema, monto_minimo, uso_limite, uso_actual, activo, promocionar_en_barra, mensaje_promocional) VALUES
        ('AGRO10', '10% de descuento en toda la tienda del campo', 10, 0, '#059669', 0, 1000, 0, 1, 1, '¡Usa el cupón AGRO10 para 10% OFF en toda tu compra!'),
        ('BIENVENIDO', '15% de descuento especial de bienvenida', 15, 0, '#7c3aed', 0, 500, 0, 1, 1, '¡Bienvenido! Usa BIENVENIDO para 15% OFF en tu primer pedido.'),
        ('CAMPO20', '$20.000 COP de descuento directo', 0, 20000, '#d97706', 50000, 200, 0, 1, 0, '$20.000 OFF en compras mayores a $50.000 COP'),
        ('COSECHA5', '5% de descuento en cosechas frescas', 5, 0, '#2563eb', 0, 1000, 0, 1, 0, '5% OFF adicional')
      `);
    } else if (!err) {
      // Asegurar que AGRO10 siempre esté disponible y activo
      pool.query(`INSERT IGNORE INTO cupones (codigo, descripcion, descuento_porcentaje, descuento_fijo, color_tema, monto_minimo, uso_limite, uso_actual, activo, promocionar_en_barra, mensaje_promocional)
        VALUES ('AGRO10', '10% de descuento en toda la tienda del campo', 10, 0, '#059669', 0, 1000, 0, 1, 1, '¡Usa el cupón AGRO10 para 10% OFF en toda tu compra!')
      `);
    }

    // Migración segura: agregar columna color_tema si la tabla ya existía
    pool.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'cupones' AND COLUMN_NAME = 'color_tema'
    `, (cErr, cRows) => {
      if (!cErr && cRows && cRows.length === 0) {
        pool.query("ALTER TABLE cupones ADD COLUMN color_tema VARCHAR(50) DEFAULT '#059669'");
      }
    });
  });

  // Sembrar banners reales en MySQL si la tabla está vacía
  pool.query("SELECT COUNT(*) as count FROM banners_hero", (err, rows) => {
    if (!err && rows && rows[0] && rows[0].count === 0) {
      console.log("Sembrando banners_hero iniciales en MySQL con los 5 estilos reales...");
      const initialBanners = [
        [
          'Cosechas Frescas y Tubérculos Tradicionales',
          'Ñame espino, yuca campesina, plátano hartón y aguacate cultivados en las tierras fértiles de los Montes de María.',
          'Cosechas Frescas',
          'cosechas',
          'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
          'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=80',
          '#22c55e',
          JSON.stringify(['Ñame Espino y Criollo', 'Yuca Campesina Fresca', 'Pago 100% Directo al Productor']),
          'Ver Cosechas',
          '/categoria/cosechas',
          'Vender mis Productos',
          '/vendedor',
          '🌿 100% Campo',
          'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=600&q=80',
          'Ñame Criollo Espino',
          '$6.000 COP / Kilo',
          'Roberto Carlos Salcedo',
          '⭐ 4.9/5 Calidad',
          47,
          'CAMPO20',
          '⚡ ¡Usa el cupón CAMPO20 y obtén 20% OFF en tu compra!',
          'clasico',
          0,
          1,
          1
        ],
        [
          'Semillas Seleccionadas de Alto Rendimiento',
          'Semillas de maíz amarillo, fríjol rojo, hortalizas y granos con alto porcentaje de germinación para agricultores.',
          'Semillas',
          'semillas',
          'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=600&q=80',
          'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=80',
          '#f59e0b',
          JSON.stringify(['Maíz Amarillo Seleccionado', 'Fríjol Rojo Criollo', 'Alta Germinación Garantizada']),
          'Ver Semillas',
          '/categoria/semillas',
          'Registrarme Gratis',
          '/registro',
          '🌱 Alta Germinación',
          'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=600&q=80',
          'Semilla de Maíz Amarillo',
          '$8.000 COP / Libra',
          'Pedro Montes',
          '⭐ 4.8/5 Productor',
          2,
          'AGRO10',
          '🌱 Usa AGRO10 para 10% OFF en semillas seleccionadas',
          'inmersivo',
          2,
          2,
          1
        ],
        [
          'Queso Costeño Artesanal y Lácteos del Campo',
          'Queso fresco, cuajada y suero tradicional elaborado artesanalmente con leche 100% pura de ordeño en San Jacinto.',
          'Lácteos',
          'lacteos',
          'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=600&q=80',
          'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=80',
          '#ea580c',
          JSON.stringify(['Queso Costeño Fresco', 'Suero Tradicional Costeño', 'Leche Pura de Ordeño']),
          '¡Aprovechar Oferta!',
          '/categoria/lacteos',
          'Conoce los Productores',
          '/vendedores',
          '🧀 100% Artesanal',
          'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=600&q=80',
          'Queso Costeño Fresco',
          '$15.000 COP / Libra',
          'Roberto Carlos Salcedo',
          '⭐ 5.0/5 Ganadería',
          47,
          'QUESO15',
          '⚡ ¡Usa el cupón QUESO15 y obtén 15% OFF en lácteos artesanales!',
          'oferta_flash',
          0,
          3,
          1
        ],
        [
          'Herramientas de Campo y Maquinaria Agrícola',
          'Fumigadoras, motobombas, machetes, palas y sistemas de riego para el trabajo diario en la finca.',
          'Herramientas',
          'agro',
          'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
          'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=80',
          '#0284c7',
          JSON.stringify(['Fumigadoras y Bombas de Agua', 'Herramientas Manuales de Acero', 'Garantía Directa de Fábrica']),
          'Ver Herramientas',
          '/categoria/agro',
          'Explorar Catálogo',
          '/catalogo',
          '🚜 Trabajo Pesado',
          'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
          'Fumigadora Manual RoyalCondor',
          '$250.000 COP',
          'AgroFertil SAS',
          '⭐ 4.9/5 Proveedor',
          47,
          '',
          '',
          'mosaico',
          0,
          4,
          1
        ],
        [
          'Raíces y Tradición de los Montes de María',
          'Cada fruto que sembramos lleva el sudor, la esperanza y la memoria de nuestras familias montemarianas.',
          'Cosechas Tradicionales',
          'cosechas',
          'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
          'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=80',
          '#16a34a',
          JSON.stringify(['Cosechado a Mano en Bolívar', 'Venta 100% Directa', 'Envío Seguro Regional']),
          'Comprar Cosecha',
          '/categoria/cosechas',
          'Conocer al Productor',
          '/vendedor',
          '🌿 Tradición Viva',
          'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=600&q=80',
          'Ñame Espino Seleccionado',
          '$6.000 COP / Kilo',
          'Roberto Carlos Salcedo',
          '⭐ 5.0/5 Campesino de Tradición',
          47,
          '',
          '',
          'historia_campesina',
          0,
          5,
          1
        ]
      ];

      const insertSql = `
        INSERT INTO banners_hero (
          titulo, subtitulo, categoria_nombre, categoria_slug, categoria_thumb,
          imagen_fondo, color_acento, features, boton_principal_texto, boton_principal_link,
          boton_secundario_texto, boton_secundario_link, tarjeta_badge_top, tarjeta_imagen,
          tarjeta_titulo, tarjeta_precio, tarjeta_vendedor_nombre, tarjeta_vendedor_rating,
          tarjeta_vendedor_id, cupon_codigo, cupon_texto, estilo_plantilla, filtro_blur, orden, activo
        ) VALUES ?
      `;
      pool.query(insertSql, [initialBanners], (insertErr) => {
        if (insertErr) console.error("Error al sembrar banners_hero iniciales:", insertErr.message);
        else console.log("✅ 5 Banners iniciales sembrados exitosamente en la base de datos MySQL.");
      });
    }
  });
}

module.exports = dbProxy;