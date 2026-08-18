USE agro_campo;

-- Tabla principal de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100),
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  rol ENUM('admin', 'usuario') DEFAULT 'usuario',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  avatar MEDIUMTEXT,
  reset_code VARCHAR(6) DEFAULT NULL,
  reset_expires DATETIME DEFAULT NULL,
  creditos DECIMAL(10,2) DEFAULT 0.00,
  foto_portada MEDIUMTEXT,
  descripcion TEXT,
  categoria_productos VARCHAR(255)
) ENGINE=InnoDB;

-- Tabla de productos
CREATE TABLE IF NOT EXISTS productos (
  id_producto INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  precio DECIMAL(10,2) NOT NULL,
  stock INT DEFAULT 0,
  imagen MEDIUMTEXT,
  descripcion TEXT DEFAULT NULL,
  categoria VARCHAR(50) DEFAULT NULL,
  origen VARCHAR(100) DEFAULT NULL,
  presentacion VARCHAR(100) DEFAULT NULL,
  cuidado VARCHAR(255) DEFAULT NULL,
  disponibilidad VARCHAR(100) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Tabla de compras
CREATE TABLE IF NOT EXISTS compras (
  id_compra INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NOT NULL,
  fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
  total DECIMAL(10,2) NOT NULL,
  estado VARCHAR(50) DEFAULT 'Pedido recibido',
  metodo_pago VARCHAR(50) DEFAULT 'Tarjeta de Crédito',
  reembolsado BOOLEAN DEFAULT FALSE,
  direccion_envio TEXT DEFAULT NULL,
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Tabla de detalles de compra
CREATE TABLE IF NOT EXISTS compra_detalles (
  id_detalle INT AUTO_INCREMENT PRIMARY KEY,
  id_compra INT NOT NULL,
  id_producto INT NOT NULL,
  cantidad INT NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (id_compra) REFERENCES compras(id_compra) ON DELETE CASCADE,
  FOREIGN KEY (id_producto) REFERENCES productos(id_producto) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Tabla de direcciones de envío
CREATE TABLE IF NOT EXISTS direcciones (
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
) ENGINE=InnoDB;
