const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const sqlitePath = path.join(__dirname, '..', 'data', 'database.sqlite');

async function migrate() {
  if (!fs.existsSync(sqlitePath)) {
    console.log('No se encontró el archivo database.sqlite para migrar.');
    return;
  }

  console.log('Iniciando migración de SQLite a MySQL...');
  
  const mysqlConn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS !== undefined ? process.env.DB_PASS : '',
    database: process.env.DB_NAME || 'agro_campo'
  });

  const sqliteDb = new sqlite3.Database(sqlitePath);

  const getSqliteRows = (query) => {
    return new Promise((resolve, reject) => {
      sqliteDb.all(query, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  };

  try {
    // 1. Roles
    const roles = await getSqliteRows('SELECT * FROM roles');
    for (const r of roles) {
      await mysqlConn.query(
        'INSERT IGNORE INTO roles (id_rol, nombre_rol, descripcion) VALUES (?, ?, ?)',
        [r.id_rol, r.nombre_rol, r.descripcion]
      );
    }
    console.log(`✓ Roles migrados: ${roles.length}`);

    // 2. Categorías
    const categorias = await getSqliteRows('SELECT * FROM categorias');
    for (const c of categorias) {
      await mysqlConn.query(
        'INSERT IGNORE INTO categorias (id_categoria, nombre_categoria, descripcion) VALUES (?, ?, ?)',
        [c.id_categoria, c.nombre_categoria, c.descripcion]
      );
    }
    console.log(`✓ Categorías migradas: ${categorias.length}`);

    // 3. Proveedores
    const proveedores = await getSqliteRows('SELECT * FROM proveedores');
    for (const p of proveedores) {
      await mysqlConn.query(
        'INSERT IGNORE INTO proveedores (id_proveedor, nombre_empresa, representante, telefono, correo, direccion, ciudad) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [p.id_proveedor, p.nombre_empresa, p.representante, p.telefono, p.correo, p.direccion, p.ciudad]
      );
    }
    console.log(`✓ Proveedores migrados: ${proveedores.length}`);

    // 4. Usuarios
    try {
      await mysqlConn.query("ALTER TABLE usuarios ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP");
    } catch(e) {}

    const usuarios = await getSqliteRows('SELECT * FROM usuarios');
    for (const u of usuarios) {
      const createdAt = u.created_at || u.fecha_registro || new Date();
      await mysqlConn.query(
        `INSERT IGNORE INTO usuarios 
        (id_usuario, nombre, apodo, correo, telefono, direccion, contrasena, id_rol, created_at, avatar, reset_code, reset_expires, creditos, google_id, estado)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [u.id_usuario, u.nombre, u.apodo || u.nombre, u.correo, u.telefono || '', u.direccion || '', u.contrasena, u.id_rol || 2, createdAt, u.avatar || null, u.reset_code || null, u.reset_expires || null, u.creditos || 0.00, u.google_id || null, u.estado || 'activo']
      );
    }
    console.log(`✓ Usuarios migrados: ${usuarios.length}`);

    // 5. Productos
    const productos = await getSqliteRows('SELECT * FROM productos');
    for (const prod of productos) {
      const fechaIngreso = prod.fecha_ingreso || new Date();
      await mysqlConn.query(
        `INSERT IGNORE INTO productos
        (id_producto, nombre_producto, descripcion, precio, stock, unidad_medida, imagen, fecha_ingreso, id_categoria, id_proveedor, categoria, origen, presentacion, cuidado, disponibilidad)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [prod.id_producto, prod.nombre_producto || prod.nombre || 'Producto', prod.descripcion || '', prod.precio || 0, prod.stock || 0, prod.unidad_medida || 'Unidad', prod.imagen || '', fechaIngreso, prod.id_categoria || 1, prod.id_proveedor || 1, prod.categoria || '', prod.origen || '', prod.presentacion || '', prod.cuidado || '', prod.disponibilidad || '50']
      );
    }
    // 6. Compras
    try {
      const compras = await getSqliteRows('SELECT * FROM compras');
      for (const comp of compras) {
        await mysqlConn.query(
          `INSERT IGNORE INTO compras
          (id_compra, id_usuario, fecha, total, estado, metodo_pago, reembolsado, direccion_envio)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [comp.id_compra, comp.id_usuario, comp.fecha || new Date(), comp.total, comp.estado || 'Pedido recibido', comp.metodo_pago || 'Tarjeta de Crédito', comp.reembolsado || 0, comp.direccion_envio || '']
        );
      }
      console.log(`✓ Compras migradas: ${compras.length}`);
    } catch(e) {
      console.log('Skipping compras:', e.message);
    }

    // 7. Compra Detalles
    try {
      const detalles = await getSqliteRows('SELECT * FROM compra_detalles');
      for (const d of detalles) {
        await mysqlConn.query(
          `INSERT IGNORE INTO compra_detalles
          (id_detalle, id_compra, id_producto, cantidad, precio_unitario)
          VALUES (?, ?, ?, ?, ?)`,
          [d.id_detalle, d.id_compra, d.id_producto, d.cantidad, d.precio_unitario]
        );
      }
      console.log(`✓ Detalles de compra migrados: ${detalles.length}`);
    } catch(e) {
      console.log('Skipping compra_detalles:', e.message);
    }

    // 8. Direcciones
    try {
      const direcciones = await getSqliteRows('SELECT * FROM direcciones');
      for (const dir of direcciones) {
        await mysqlConn.query(
          `INSERT IGNORE INTO direcciones
          (id_direccion, id_usuario, titulo, direccion_principal, departamento, ciudad, telefono, codigo_postal, notas)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [dir.id_direccion, dir.id_usuario, dir.titulo || 'Principal', dir.direccion_principal, dir.departamento, dir.ciudad, dir.telefono, dir.codigo_postal || '', dir.notas || '']
        );
      }
      console.log(`✓ Direcciones migradas: ${direcciones.length}`);
    } catch(e) {
      console.log('Skipping direcciones:', e.message);
    }

    console.log('🎉 Migración completada con éxito.');
  } catch (err) {
    console.error('Error durante la migración:', err.message);
  } finally {
    sqliteDb.close();
    await mysqlConn.end();
  }
}

migrate();
