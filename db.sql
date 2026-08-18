-- ==========================================================
-- BASE DE DATOS OFICIAL: DE LOS MONTES DE MARÍA
-- Compatible con MySQL 8.x / Aiven Cloud / Render
-- ==========================================================

USE `defaultdb`;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `compra_detalles`;
DROP TABLE IF EXISTS `detalle_compras`;
DROP TABLE IF EXISTS `compras`;
DROP TABLE IF EXISTS `direcciones`;
DROP TABLE IF EXISTS `soporte_calificaciones`;
DROP TABLE IF EXISTS `soporte_mensajes`;
DROP TABLE IF EXISTS `soporte_tickets`;
DROP TABLE IF EXISTS `tokens_seguridad`;
DROP TABLE IF EXISTS `banners`;
DROP TABLE IF EXISTS `cupones`;
DROP TABLE IF EXISTS `productos`;
DROP TABLE IF EXISTS `categorias`;
DROP TABLE IF EXISTS `proveedores`;
DROP TABLE IF EXISTS `usuarios`;
DROP TABLE IF EXISTS `roles`;

SET FOREIGN_KEY_CHECKS = 1;

-- 1. Tabla de Roles
CREATE TABLE `roles` (
  `id_rol` INT AUTO_INCREMENT PRIMARY KEY,
  `nombre_rol` VARCHAR(50) NOT NULL UNIQUE,
  `descripcion` TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `roles` (`id_rol`, `nombre_rol`, `descripcion`) VALUES
(1, 'Administrador', 'Control total de la plataforma'),
(2, 'Vendedor', 'Productor campesino y vendedor'),
(3, 'Cliente', 'Comprador de productos del campo'),
(4, 'Soporte', 'Atención al cliente y soporte técnico en vivo');

-- 2. Tabla de Categorías
CREATE TABLE `categorias` (
  `id_categoria` INT AUTO_INCREMENT PRIMARY KEY,
  `nombre_categoria` VARCHAR(100) NOT NULL,
  `slug` VARCHAR(100),
  `descripcion` TEXT,
  `imagen` MEDIUMTEXT,
  `icono` VARCHAR(100) DEFAULT 'fa-box',
  `color` VARCHAR(50) DEFAULT '#2e7d32'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `categorias` (`id_categoria`, `nombre_categoria`, `slug`, `descripcion`, `imagen`, `icono`, `color`) VALUES
(1, 'Cosechas Frescas', 'cosechas', 'Frutas, verduras, hortalizas y tubérculos recién cosechados.', 'https://blog.mentta.com/wp-content/uploads/2024/06/pexels-daniel-dan-47825192-7543155-scaled.jpg', 'fa-carrot', '#16a34a'),
(2, 'Lácteos Artesanales', 'lacteos', 'Quesos, suero, mantequilla y leche pura de vaca.', 'https://es.edairynews.com/wp-content/uploads/2024/09/A-como-esta-el-kilo-de-queso-en-Colombia.png', 'fa-cheese', '#f59e0b'),
(3, 'Semillas Nativas', 'semillas', 'Semillas seleccionadas y certificadas de alta pureza y rendimiento.', 'https://http2.mlstatic.com/D_NQ_NP_942124-MCO95273155376_102025-O.webp', 'fa-seedling', '#059669'),
(4, 'Abonos y Fertilizantes', 'abonos', 'Compost orgánico, humus de lombriz y biofertilizantes.', 'https://fertilizantesecoforce.es/wp-content/uploads/2019/09/forceorganic.jpg', 'fa-leaf', '#10b981'),
(5, 'Ferretería & Herramientas', 'ferre', 'Machetes, palas, mangueras y herramientas agrícolas.', 'https://http2.mlstatic.com/D_NQ_NP_693816-MLA92561820026_092025-O.webp', 'fa-tools', '#64748b');

-- 3. Tabla de Proveedores
CREATE TABLE `proveedores` (
  `id_proveedor` INT AUTO_INCREMENT PRIMARY KEY,
  `nombre_empresa` VARCHAR(150) NOT NULL,
  `representante` VARCHAR(100),
  `telefono` VARCHAR(20),
  `correo` VARCHAR(100),
  `direccion` VARCHAR(200),
  `ciudad` VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `proveedores` (`id_proveedor`, `nombre_empresa`, `representante`, `telefono`, `correo`, `direccion`, `ciudad`) VALUES
(1, 'Asociación Campesina Montes de María', 'Carlos Pérez', '3001112233', 'contacto@montesdemaria.com', 'Vereda El Salado', 'El Carmen de Bolívar'),
(2, 'Lácteos San Jacinto', 'Laura Díaz', '3015557788', 'ventas@lacteossanjacinto.com', 'Carrera 15 #40-22', 'San Jacinto');

-- 4. Tabla de Usuarios
CREATE TABLE `usuarios` (
  `id_usuario` INT AUTO_INCREMENT PRIMARY KEY,
  `nombre` VARCHAR(100) NOT NULL,
  `apodo` VARCHAR(100) NOT NULL UNIQUE,
  `correo` VARCHAR(150) NOT NULL UNIQUE,
  `telefono` VARCHAR(20),
  `direccion` VARCHAR(200),
  `contrasena` VARCHAR(255) NOT NULL,
  `id_rol` INT DEFAULT 3,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `avatar` MEDIUMTEXT,
  `reset_code` VARCHAR(10),
  `reset_expires` DATETIME,
  `creditos` DECIMAL(10,2) DEFAULT 0.00,
  `google_id` VARCHAR(255),
  `estado` VARCHAR(50) DEFAULT 'activo',
  `foto_portada` TEXT,
  `descripcion` TEXT,
  `categoria_productos` VARCHAR(255),
  FOREIGN KEY (`id_rol`) REFERENCES `roles`(`id_rol`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Hash bcrypt para '123456'
INSERT INTO `usuarios` (`id_usuario`, `nombre`, `apodo`, `correo`, `telefono`, `direccion`, `contrasena`, `id_rol`, `creditos`, `foto_portada`, `avatar`, `descripcion`, `categoria_productos`) VALUES
(1, 'Administrador General', 'admin', 'admin@montesdemaria.com', '3008723989', 'Oficina Central Montes de María', '$2b$10$wT0aXk9oF3YpEmsyW8nBSuo2bL7FqXb7FqXb7FqXb7FqXb7FqXb7F', 1, 100000.00, NULL, NULL, 'Administrador de la plataforma', 'Todas'),
(2, 'Danilo Rodelo', 'danilo_rodelo', 'danilorodelo355@gmail.com', '3008723989', 'El Carmen de Bolívar', '$2b$10$wT0aXk9oF3YpEmsyW8nBSuo2bL7FqXb7FqXb7FqXb7FqXb7FqXb7F', 1, 50000.00, NULL, NULL, 'Fundador y Administrador', 'Cosechas, Lácteos'),
(47, 'Pedro Montes (Campesino)', 'pedro_montes', 'pedro@agrocampo.com', '3111111111', 'San Jacinto, Bolívar', '$2b$10$wT0aXk9oF3YpEmsyW8nBSuo2bL7FqXb7FqXb7FqXb7FqXb7FqXb7F', 2, 0.00, 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80', 'Productor tradicional de cosechas frescas, lácteos y semillas en las faldas de los Montes de María.', 'Cosechas, Lácteos, Semillas');

-- 5. Tabla de Productos
CREATE TABLE `productos` (
  `id_producto` INT AUTO_INCREMENT PRIMARY KEY,
  `id_vendedor` INT DEFAULT 47,
  `nombre_producto` VARCHAR(150) NOT NULL,
  `descripcion` TEXT,
  `precio` DECIMAL(10,2) NOT NULL,
  `stock` INT DEFAULT 0,
  `unidad_medida` VARCHAR(50),
  `imagen` MEDIUMTEXT,
  `fecha_ingreso` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `id_categoria` INT,
  `id_proveedor` INT,
  `categoria` VARCHAR(100),
  `origen` VARCHAR(100),
  `presentacion` VARCHAR(100),
  `cuidado` VARCHAR(255),
  `disponibilidad` VARCHAR(100),
  FOREIGN KEY (`id_vendedor`) REFERENCES `usuarios`(`id_usuario`) ON DELETE SET NULL,
  FOREIGN KEY (`id_categoria`) REFERENCES `categorias`(`id_categoria`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `productos` (`id_producto`, `id_vendedor`, `nombre_producto`, `descripcion`, `precio`, `stock`, `imagen`, `categoria`, `origen`, `presentacion`, `cuidado`, `disponibilidad`) VALUES
(28, 47, 'Semilla de Ají Dulce', 'Ideal para huertas caseras y producción comercial.', 10000.00, 54, 'https://www.tierragro.com/cdn/shop/files/02210011.jpg?v=1730314267', 'semillas', 'Montes de María', 'Bolsa x 200 semillas', 'Evitar humedad excesiva', '54'),
(30, 47, 'Semilla de Sandía', 'Produce frutos grandes y dulces de excelente calidad.', 23000.00, 32, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTC3FERpvsAfvsHTJacUko1KVuk7IE1y0KtvA&s', 'semillas', 'Montes de María', 'Sobre x 120 semillas', 'Mantener en lugar fresco y seco', '32'),
(31, 47, 'Semilla de Maíz Híbrido', 'Semillas certificadas de maíz híbrido de alta productividad y resistencia.', 18000.00, 45, 'https://http2.mlstatic.com/D_NQ_NP_942124-MCO95273155376_102025-O.webp', 'semillas', 'Valle del Cauca', 'Bolsa x 1kg', 'Mantener en lugar fresco y seco', '45'),
(32, 47, 'Semilla de Tomate Chonto', 'Semillas seleccionadas para cultivos de tomate de excelente calidad.', 9500.00, 44, 'https://calyxplantas.com/cdn/shop/products/10SEMILLATOMATECHONTOCALYXPLANTASBOGOTA-824068.jpg?v=1773264607&width=1445', 'semillas', 'Antioquia', 'Sobre x 100 semillas', 'Evitar humedad excesiva', '44'),
(36, 47, 'Queso Costeño', 'Queso artesanal fresco elaborado con leche pura de vaca.', 25000.00, 104, 'https://es.edairynews.com/wp-content/uploads/2024/09/A-como-esta-el-kilo-de-queso-en-Colombia.png', 'lacteos', 'Montes de María', 'Venta por kg', 'Mantener refrigerado', '104'),
(37, 47, 'Suero Costeño', 'Suero tradicional costeño con sabor auténtico.', 6000.00, 498, 'https://larazon.co/wp-content/uploads/2024/06/suero-costeno.jpg', 'lacteos', 'Montes de María', 'Bolsa x 1kg', 'Mantener refrigerado', '498'),
(38, 47, 'Yogurt Natural', 'Yogurt artesanal elaborado con leche fresca.', 12000.00, 77, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ2qdsEyGZL-4m_3U1OnDfjdoRlmYuC4V3QIg&s', 'lacteos', 'Montes de María', 'Botella x 1 litro', 'Mantener refrigerado', '77'),
(39, 47, 'Kumis Casero', 'Bebida láctea tradicional con sabor suave.', 10000.00, 186, 'https://www.utadeo.edu.co/sites/tadeo/files/node/news/field_images/kumis_casero.png', 'lacteos', 'Montes de María', 'Botella x 1lt', 'Mantener refrigerado', '186'),
(40, 47, 'Cuajada Fresca', 'Producto lácteo artesanal de textura suave.', 18000.00, 55, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTR_E21jSwSmhARPogv0m8gYqA2NR31eITTCQ&s', 'lacteos', 'Montes de María', 'Venta por kg', 'Mantener refrigerado', '55'),
(41, 47, 'Mantequilla Artesanal', 'Mantequilla natural elaborada con crema de leche pura.', 14000.00, 76, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQH8v0mepmQ-XmJECmD4UQOmQXQlK6KbGOdbQ&s', 'lacteos', 'Montes de María', 'Venta por 500g', 'Mantener refrigerado', '76'),
(48, 47, 'Compost Orgánico', 'Abono natural elaborado con residuos vegetales compostados.', 25000.00, 500, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSa2vmsEVsiLa2pHh1oSxnaz2eFskuQVc-tAw&s', 'abonos', 'Montes de María', 'Bolsa x 20kg', 'Natural', '500'),
(49, 47, 'Humus de Lombriz', 'Fertilizante orgánico rico en nutrientes para cultivos.', 35000.00, 600, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTYC7Iy6Y1RduY7Ch6xG6e_Bv1hyGy73imBvA&s', 'abonos', 'Montes de María', 'Bolsa x 25kg', 'Mantener en lugar seco', '600'),
(56, 47, 'Machete Profesional', 'Herramienta resistente para labores agrícolas y limpieza.', 28000.00, 100, 'https://http2.mlstatic.com/D_NQ_NP_693816-MLA92561820026_092025-O.webp', 'ferre', 'Montes de María', 'Unidad', '100% Acero Inoxidable', '100'),
(58, 47, 'Azadón Reforzado', 'Herramienta resistente para preparación de suelos.', 38000.00, 45, 'https://www.ferragro.com/cdn/shop/files/1005615_700x700.jpg?v=1723696992', 'ferre', 'Montes de María', 'Unidad', 'Hierro forjado', '45'),
(64, 47, 'Yuca Fresca del Campo', 'Yuca fresca y harinosa cosechada el mismo día.', 3000.00, 595, 'https://blog.mentta.com/wp-content/uploads/2024/06/pexels-daniel-dan-47825192-7543155-scaled.jpg', 'cosechas', 'Montes de María', 'Venta por kg', 'Natural', '595'),
(65, 47, 'Plátano Hartón', 'Plátano verde fresco cultivado sin químicos.', 2500.00, 1000, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQFTz1G95TxFK5DhidiWztSVhFZglvbvhXEcA&s', 'cosechas', 'Montes de María', 'Unidad', 'Natural', '1000'),
(66, 47, 'Mango de Azúcar / Tommy', 'Mango dulce y jugoso de excelente calidad.', 4000.00, 700, 'https://upload.wikimedia.org/wikipedia/commons/a/af/Mango_TommyAtkins04_Asit.jpg', 'cosechas', 'Montes de María', 'Venta por kg', 'Natural', '700'),
(67, 47, 'Pepino Fresco', 'Hortaliza fresca cosechada diariamente.', 3500.00, 600, 'https://freshmate.cl/cdn/shop/files/pepino_en_tabla_de_madera_38_11zon.webp?v=1724716656', 'cosechas', 'Montes de María', 'Venta por kg', 'Natural', '600');

-- 6. Tabla de Compras
CREATE TABLE `compras` (
  `id_compra` INT AUTO_INCREMENT PRIMARY KEY,
  `id_usuario` INT NOT NULL,
  `fecha` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `total` DECIMAL(10,2) NOT NULL,
  `estado` VARCHAR(50) DEFAULT 'Pedido recibido',
  `metodo_pago` VARCHAR(50) DEFAULT 'Contra Entrega (Efectivo)',
  `reembolsado` TINYINT(1) DEFAULT 0,
  `direccion_envio` TEXT,
  `codigo_cupon` VARCHAR(50) DEFAULT NULL,
  `descuento` DECIMAL(10,2) DEFAULT 0.00,
  FOREIGN KEY (`id_usuario`) REFERENCES `usuarios`(`id_usuario`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Tabla de Detalles de Compra
CREATE TABLE `compra_detalles` (
  `id_detalle` INT AUTO_INCREMENT PRIMARY KEY,
  `id_compra` INT NOT NULL,
  `id_producto` INT NOT NULL,
  `cantidad` INT NOT NULL,
  `precio_unitario` DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (`id_compra`) REFERENCES `compras`(`id_compra`) ON DELETE CASCADE,
  FOREIGN KEY (`id_producto`) REFERENCES `productos`(`id_producto`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Tabla de Direcciones de Envío
CREATE TABLE `direcciones` (
  `id_direccion` INT AUTO_INCREMENT PRIMARY KEY,
  `id_usuario` INT NOT NULL,
  `titulo` VARCHAR(100) DEFAULT 'Principal',
  `direccion_principal` VARCHAR(255) NOT NULL,
  `departamento` VARCHAR(100) NOT NULL,
  `ciudad` VARCHAR(100) NOT NULL,
  `telefono` VARCHAR(30) NOT NULL,
  `codigo_postal` VARCHAR(20) DEFAULT '',
  `notas` TEXT,
  FOREIGN KEY (`id_usuario`) REFERENCES `usuarios`(`id_usuario`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Tabla de Cupones
CREATE TABLE `cupones` (
  `id_cupon` INT AUTO_INCREMENT PRIMARY KEY,
  `codigo` VARCHAR(50) NOT NULL UNIQUE,
  `descripcion` VARCHAR(255),
  `descuento_porcentaje` DECIMAL(5, 2) DEFAULT 0,
  `descuento_fijo` DECIMAL(10, 2) DEFAULT 0,
  `monto_minimo` DECIMAL(10, 2) DEFAULT 0,
  `uso_limite` INT DEFAULT NULL,
  `uso_actual` INT DEFAULT 0,
  `fecha_expiracion` DATE DEFAULT NULL,
  `activo` TINYINT(1) DEFAULT 1,
  `promocionar_en_barra` TINYINT(1) DEFAULT 0,
  `mensaje_promocional` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `cupones` (`codigo`, `descripcion`, `descuento_porcentaje`, `descuento_fijo`, `monto_minimo`, `uso_limite`, `uso_actual`, `activo`, `promocionar_en_barra`, `mensaje_promocional`) VALUES
('AGRO10', '10% de descuento en toda la tienda del campo', 10.00, 0.00, 0.00, 1000, 0, 1, 1, '¡Usa el cupón AGRO10 para 10% OFF en toda tu compra!'),
('BIENVENIDO', '15% de descuento especial de bienvenida', 15.00, 0.00, 0.00, 500, 0, 1, 1, '¡Bienvenido! Usa BIENVENIDO para 15% OFF en tu primer pedido.'),
('CAMPO20', '$20.000 COP de descuento directo', 0.00, 20000.00, 50000.00, 200, 0, 1, 0, '$20.000 OFF en compras mayores a $50.000 COP');

-- 10. Tabla de Soporte (Tickets y Mensajes)
CREATE TABLE `soporte_tickets` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `ticket_code` VARCHAR(50) NOT NULL UNIQUE,
  `session_id` VARCHAR(255) NOT NULL,
  `id_usuario` INT,
  `nombre_cliente` VARCHAR(100) NOT NULL,
  `correo_cliente` VARCHAR(150) NOT NULL,
  `telefono_cliente` VARCHAR(30) NOT NULL,
  `asunto` VARCHAR(255) NOT NULL,
  `estado` VARCHAR(50) DEFAULT 'bot',
  `id_agente` INT,
  `nombre_agente` VARCHAR(100),
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `soporte_mensajes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `ticket_id` INT,
  `session_id` VARCHAR(255) NOT NULL,
  `id_usuario` INT,
  `nombre_remitente` VARCHAR(100) NOT NULL,
  `rol` VARCHAR(50) NOT NULL,
  `mensaje` TEXT NOT NULL,
  `leido` TINYINT(1) DEFAULT 0,
  `fecha` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`ticket_id`) REFERENCES `soporte_tickets`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `soporte_calificaciones` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `ticket_id` INT NOT NULL UNIQUE,
  `session_id` VARCHAR(255) NOT NULL,
  `id_agente` INT,
  `nombre_agente` VARCHAR(100),
  `estrellas` INT NOT NULL CHECK(`estrellas` BETWEEN 1 AND 5),
  `comentario` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`ticket_id`) REFERENCES `soporte_tickets`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
