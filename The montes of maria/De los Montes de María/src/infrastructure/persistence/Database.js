/**
 * Configuración de base de datos MySQL
 * Mueve la lógica de conexión a la capa de infraestructura
 */
require('dotenv').config();
const mysql = require('mysql2');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS !== undefined ? process.env.DB_PASS : '',
  database: process.env.DB_NAME || 'agro_campo',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true
};

// Pool principal de MySQL
const pool = mysql.createPool(dbConfig);

// Verificar la base de datos y crear las tablas si no existen
const initConn = mysql.createConnection({
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  password: dbConfig.password,
  multipleStatements: true
});

initConn.connect((err) => {
  if (err) {
    console.error('⚠️  No se pudo conectar al servidor MySQL:', err.message);
    console.error('ℹ️  Verifica que el servicio MySQL esté iniciado y las variables DB_* en el archivo .env sean correctas.');
  } else {
    initConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`, (err2) => {
      if (err2) {
        console.error('Error al verificar/crear la base de datos MySQL:', err2.message);
      } else {
        console.log(`Base de datos MySQL '${dbConfig.database}' verificada/lista en ${dbConfig.host}:${dbConfig.port}`);
      }
      initConn.end();
      initializeDatabaseTables();
    });
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
      monto_minimo DECIMAL(10, 2) DEFAULT 0,
      uso_limite INT DEFAULT NULL,
      uso_actual INT DEFAULT 0,
      fecha_expiracion DATE DEFAULT NULL,
      activo TINYINT(1) DEFAULT 1,
      promocionar_en_barra TINYINT(1) DEFAULT 0,
      mensaje_promocional VARCHAR(255) DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
      console.log("Sembrando datos iniciales en MySQL (categorías, proveedores, productos)...");
      pool.query(`INSERT IGNORE INTO categorias (id_categoria, nombre_categoria, descripcion) VALUES
        (1, 'Fertilizantes', 'Productos para mejorar cultivos'),
        (2, 'Semillas', 'Semillas agrícolas'),
        (3, 'Herramientas', 'Herramientas de trabajo agrícola'),
        (4, 'Riego', 'Sistemas y accesorios de riego')`);

      pool.query(`INSERT IGNORE INTO proveedores (id_proveedor, nombre_empresa, representante, telefono, correo, direccion, ciudad) VALUES
        (1, 'AgroFertil SAS', 'Carlos Perez', '3001112233', 'contacto@agrofertil.com', 'Calle 10 #20-30', 'Barranquilla'),
        (2, 'Semillas del Norte', 'Laura Diaz', '3015557788', 'ventas@semillasnorte.com', 'Carrera 15 #40-22', 'Cartagena')`);

      pool.query(`INSERT IGNORE INTO productos (id_producto, id_vendedor, nombre_producto, descripcion, precio, stock, unidad_medida, imagen, id_categoria, id_proveedor, categoria, presentacion, disponibilidad) VALUES
        (1, 47, 'Fertilizante Premium', 'Fertilizante orgánico para cultivos', 85000, 50, 'Bolsa', 'fertilizante.jpg', 1, 1, 'abonos', 'Bolsa', '50'),
        (2, 47, 'Semilla de Maíz', 'Semilla híbrida de maíz', 45000, 100, 'Paquete', 'maiz.jpg', 2, 2, 'semillas', 'Paquete', '100'),
        (3, 47, 'Pala Agrícola', 'Pala resistente de acero', 70000, 25, 'Unidad', 'pala.jpg', 3, 1, 'ferre', 'Unidad', '25')`);
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
      pool.query(`INSERT IGNORE INTO cupones (codigo, descripcion, descuento_porcentaje, descuento_fijo, monto_minimo, uso_limite, uso_actual, activo, promocionar_en_barra, mensaje_promocional) VALUES
        ('AGRO10', '10% de descuento en toda la tienda del campo', 10, 0, 0, 1000, 0, 1, 1, '¡Usa el cupón AGRO10 para 10% OFF en toda tu compra!'),
        ('BIENVENIDO', '15% de descuento especial de bienvenida', 15, 0, 0, 500, 0, 1, 1, '¡Bienvenido! Usa BIENVENIDO para 15% OFF en tu primer pedido.'),
        ('CAMPO20', '$20.000 COP de descuento directo', 0, 20000, 50000, 200, 0, 1, 0, '$20.000 OFF en compras mayores a $50.000 COP'),
        ('COSECHA5', '5% de descuento en cosechas frescas', 5, 0, 0, 1000, 0, 1, 0, '5% OFF adicional')
      `);
    } else if (!err) {
      // Asegurar que AGRO10 siempre esté disponible y activo
      pool.query(`INSERT IGNORE INTO cupones (codigo, descripcion, descuento_porcentaje, descuento_fijo, monto_minimo, uso_limite, uso_actual, activo, promocionar_en_barra, mensaje_promocional)
        VALUES ('AGRO10', '10% de descuento en toda la tienda del campo', 10, 0, 0, 1000, 0, 1, 1, '¡Usa el cupón AGRO10 para 10% OFF en toda tu compra!')
      `);
    }
  });
}

module.exports = dbProxy;