const db = require('../src/infrastructure/persistence/Database');
const bcrypt = require('bcrypt');

async function run() {
  console.log('--- Iniciando sincronización de vendedores en base de datos ---');

  await new Promise(r => setTimeout(r, 1200));

  // 1. Columnas en usuarios
  await query(`SHOW COLUMNS FROM usuarios LIKE 'foto_portada'`).then(async (rows) => {
    if (!rows || rows.length === 0) {
      await query(`ALTER TABLE usuarios ADD COLUMN foto_portada TEXT`);
      console.log('Columna foto_portada agregada a usuarios.');
    }
  });

  await query(`SHOW COLUMNS FROM usuarios LIKE 'descripcion'`).then(async (rows) => {
    if (!rows || rows.length === 0) {
      await query(`ALTER TABLE usuarios ADD COLUMN descripcion TEXT`);
      console.log('Columna descripcion agregada a usuarios.');
    }
  });

  await query(`SHOW COLUMNS FROM usuarios LIKE 'categoria_productos'`).then(async (rows) => {
    if (!rows || rows.length === 0) {
      await query(`ALTER TABLE usuarios ADD COLUMN categoria_productos VARCHAR(255)`);
      console.log('Columna categoria_productos agregada a usuarios.');
    }
  });

  // 2. Columna en productos
  await query(`SHOW COLUMNS FROM productos LIKE 'id_vendedor'`).then(async (rows) => {
    if (!rows || rows.length === 0) {
      await query(`ALTER TABLE productos ADD COLUMN id_vendedor INT`);
      console.log('Columna id_vendedor agregada a productos.');
    }
  });

  const hash = bcrypt.hashSync('123456', 10);

  // 3. Actualizar Roberto
  await query(`UPDATE usuarios SET 
    nombre = 'Roberto Carlos Salcedo',
    apodo = 'roberto_montes',
    id_rol = 2,
    foto_portada = 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
    avatar = 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=300&q=80',
    descripcion = 'Campesino y productor de San Jacinto, Bolívar. Cultivo de ñame criollo, plátano, yuca y frutas tradicionales con técnicas agroecológicas sostenibles.',
    categoria_productos = 'Cosechas Frescas, Tubérculos, Frutas'
    WHERE id_usuario = 47`);

  // 4. Vendedores representativos de Montes de María
  const sampleVendors = [
    {
      id: 50,
      nombre: 'Don Rafael Arrieta',
      apodo: 'don_rafael_agrocampo',
      correo: 'rafael.arrieta@montesdemaria.com',
      telefono: '3104567890',
      direccion: 'Vereda Las Palmas, El Carmen de Bolívar',
      id_rol: 2,
      foto_portada: 'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&w=1200&q=80',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
      descripcion: 'Familia campesina con más de 30 años cultivando aguacate criollo, cacao fino de aroma y miel de abejas pura en El Carmen de Bolívar.',
      categoria_productos: 'Cosechas Frescas, Miel & Café, Abonos'
    },
    {
      id: 51,
      nombre: 'Doña Carmen Mendoza',
      apodo: 'carmen_lacteos_montes',
      correo: 'carmen.mendoza@montesdemaria.com',
      telefono: '3157891234',
      direccion: 'Corregimiento San Cristóbal, San Jacinto',
      id_rol: 2,
      foto_portada: 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=1200&q=80',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
      descripcion: 'Elaboración artesanal de quesos campesinos, cuajadas, suero costeño tradicional y derivados lácteos de vacas alimentadas en pastoreo natural.',
      categoria_productos: 'Lácteos Artesanales, Queso Costeño'
    },
    {
      id: 52,
      nombre: 'Asociación Agroecológica Ovejas',
      apodo: 'agro_ovejas_sucre',
      correo: 'contacto@agroovejas.org',
      telefono: '3012345678',
      direccion: 'Ovejas, Sucre - Montes de María',
      id_rol: 2,
      foto_portada: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=1200&q=80',
      avatar: 'https://images.unsplash.com/photo-1560493676-04071c5f467b?auto=format&fit=crop&w=300&q=80',
      descripcion: 'Asociación de más de 25 pequeños productores que cultivan semillas nativas, maíz, ajonjolí y abonos orgánicos sin químicos.',
      categoria_productos: 'Semillas Nativas, Abonos & Fertilizantes, Cosechas'
    }
  ];

  for (const v of sampleVendors) {
    await query(
      `INSERT INTO usuarios (id_usuario, nombre, apodo, correo, telefono, direccion, contrasena, id_rol, foto_portada, avatar, descripcion, categoria_productos, creditos)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0.00)
       ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), apodo = VALUES(apodo), foto_portada = VALUES(foto_portada), avatar = VALUES(avatar), descripcion = VALUES(descripcion), categoria_productos = VALUES(categoria_productos), id_rol = 2`,
      [v.id, v.nombre, v.apodo, v.correo, v.telefono, v.direccion, hash, v.id_rol, v.foto_portada, v.avatar, v.descripcion, v.categoria_productos]
    );
    console.log(`Vendedor listo: ${v.nombre}`);
  }

  // 5. Vincular productos a vendedores
  await query(`UPDATE productos SET id_vendedor = 47 WHERE categoria = 'cosechas' OR categoria = 'ferre'`);
  await query(`UPDATE productos SET id_vendedor = 50 WHERE id_producto IN (1, 66, 68, 95, 100, 109)`);
  await query(`UPDATE productos SET id_vendedor = 51 WHERE categoria = 'lacteos' OR id_producto IN (92, 97, 102, 106, 111, 115, 120, 122)`);
  await query(`UPDATE productos SET id_vendedor = 52 WHERE categoria = 'semillas' OR categoria = 'abonos' OR id_producto IN (2, 49, 50, 51, 52, 91, 93, 98, 107)`);
  await query(`UPDATE productos SET id_vendedor = 47 WHERE id_vendedor IS NULL`);

  console.log('✅ Base de datos actualizada y productos vinculados correctamente a los vendedores.');
  process.exit(0);
}

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

run().catch(console.error);
