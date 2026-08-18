/**
 * seed_usuarios.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Inserta los usuarios reales de producción provistos por el usuario en MySQL.
 *
 * USO:
 *   node scripts/seed_usuarios.js
 */

const db = require('../models/db');

const usuarios = [
  {
    id_usuario: 35,
    nombre: 'keine',
    apodo: 'Keiner_h',
    correo: 'hkeiner663@gmail.com',
    telefono: '',
    direccion: '',
    contrasena: '$2b$12$R/ck87FXcb.7965ds0F3gO79JfwP4HkSkwGiH1Y8Ce8vL8hytUBaK',
    fecha_registro: '2026-05-20 17:15:51',
    estado: 'activo',
    id_rol: 3,
    avatar: null,
    reset_code: '369375',
    reset_expires: '2026-05-23 10:14:30',
    creditos: 57500.00,
    google_id: null
  },
  {
    id_usuario: 36,
    nombre: 'Francisco',
    apodo: 'Francisco_p',
    correo: 'fp9791189@gmail.com',
    telefono: '',
    direccion: '',
    contrasena: '$2b$12$gp.bFET2Ip.nFfyzn.XqRePPWmw86CCmSWjpm./WyhYckqdOBVj16',
    fecha_registro: '2026-05-20 23:40:13',
    estado: 'activo',
    id_rol: 3,
    avatar: null,
    reset_code: null,
    reset_expires: null,
    creditos: 0.00,
    google_id: null
  },
  {
    id_usuario: 37,
    nombre: 'Danilo Gomez Rodelo',
    apodo: 'danilo_g',
    correo: 'danilorodelo123@gmail.com',
    telefono: '',
    direccion: '',
    contrasena: '$2b$12$gdgXBt00DC0BB8C.7Yt57OaXTWxeJcy.6hZdbWa9lwjBwa4FQe0i.',
    fecha_registro: '2026-05-21 10:00:52',
    estado: 'activo',
    id_rol: 3,
    avatar: 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&w=150&h=150&q=80',
    reset_code: null,
    reset_expires: null,
    creditos: 0.00,
    google_id: null
  },
  {
    id_usuario: 41,
    nombre: 'Danilo Gómez',
    apodo: 'Danxx_',
    correo: 'alejandrolopezmoran604@gmail.com',
    telefono: '',
    direccion: '',
    contrasena: '$2b$12$K4vvZnN7GPXNp4ysz8eXPusIprBACcd1PxZgUkTDf2mQ2JXGn1EFe',
    fecha_registro: '2026-05-21 15:18:20',
    estado: 'activo',
    id_rol: 3,
    avatar: 'https://lh3.googleusercontent.com/a/ACg8ocK-q8gw6T7vXvK7Z-uYW0CCAWA6F7MIyxiG5AeZIb4m_6tWIWYI=s96-c',
    reset_code: null,
    reset_expires: null,
    creditos: 0.00,
    google_id: '107455632671028295110'
  },
  {
    id_usuario: 42,
    nombre: 'Brayan Ochoa',
    apodo: 'BRAYAN_',
    correo: 'brayanjoseochoa2005@gmail.com',
    telefono: '',
    direccion: '',
    contrasena: '$2b$12$Ni8CfxBJznwF4RFQPBu7VeY92JzWre2JyfdK8KijX4E54p/H/Fo8S',
    fecha_registro: '2026-06-06 08:47:20',
    estado: 'activo',
    id_rol: 3,
    avatar: null,
    reset_code: null,
    reset_expires: null,
    creditos: 0.00,
    google_id: null
  },
  {
    id_usuario: 43,
    nombre: 'Martha',
    apodo: 'marthaferrarolo_304',
    correo: 'marthaferrarolombardo@gmail.com',
    telefono: '',
    direccion: '',
    contrasena: '$2b$12$nX2QWRY.NkmKYY1rPFQh/uT68Pn2oyfmWtz1BKuutvzGIV7XxyddW',
    fecha_registro: '2026-07-06 20:27:46',
    estado: 'activo',
    id_rol: 3,
    avatar: 'https://lh3.googleusercontent.com/a/ACg8ocLXvHo1uApz1EXz4JSWfQ2Kb7_JVt5a1XxUe7UYh04f_gSynKM=s96-c',
    reset_code: '342620',
    reset_expires: '2026-07-06 20:49:05',
    creditos: 0.00,
    google_id: '103286544060282246456'
  },
  {
    id_usuario: 44,
    nombre: 'Danilo Gómez',
    apodo: 'danxrodelo_g',
    correo: 'danxrodelo@gmail.com',
    telefono: '',
    direccion: '',
    contrasena: '$2b$12$zsPbc21L86HM2aIO2C5bcumCT6/WkRXQeLWOv9Qye6LCAu/KYg8PO',
    fecha_registro: '2026-07-06 20:45:55',
    estado: 'activo',
    id_rol: 3,
    avatar: 'https://lh3.googleusercontent.com/a/ACg8ocJXev7dgAtSDV2TykG6nJujwGHKgilReHbVyoxB0HwgJzzOayo=s96-c',
    reset_code: null,
    reset_expires: null,
    creditos: 0.00,
    google_id: '100002125857502557941'
  },
  {
    id_usuario: 45,
    nombre: 'Test Admin',
    apodo: 'admin_0',
    correo: 'testadmin@example.com',
    telefono: '',
    direccion: '',
    contrasena: '$2b$12$NvG6NQLMGRowb2H20eG9d.jR4zYd8hwpdT/6GwUU/euGSNv4FNVxG',
    fecha_registro: '2026-07-06 21:43:16',
    estado: 'activo',
    id_rol: 1,
    avatar: null,
    reset_code: null,
    reset_expires: null,
    creditos: 0.00,
    google_id: null
  },
  {
    id_usuario: 46,
    nombre: 'Danilo Gomez Rodelo',
    apodo: 'danilorodelo355',
    correo: 'danilorodelo355@gmail.com',
    telefono: '',
    direccion: '',
    contrasena: '$2b$12$RZ3Dv2Vn0zGfavaBQnkvJOKcaySaOp9/eX7IZzfsP02P3SpChaTyq',
    fecha_registro: '2026-07-06 21:44:58',
    estado: 'activo',
    id_rol: 1,
    avatar: 'https://lh3.googleusercontent.com/a/ACg8ocJ0GO_7Wl8XZyXRKL2UqR--b919IC2BqxEfwoZ0hjeVzPJlCoS4=s96-c',
    reset_code: null,
    reset_expires: null,
    creditos: 0.00,
    google_id: '105601790078576967479'
  }
];

let pending = usuarios.length;
usuarios.forEach(u => {
  db.query(
    `INSERT INTO usuarios (id_usuario, nombre, apodo, correo, telefono, direccion, contrasena, created_at, estado, id_rol, avatar, reset_code, reset_expires, creditos, google_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE nombre=VALUES(nombre), correo=VALUES(correo), id_rol=VALUES(id_rol)`,
    [u.id_usuario, u.nombre, u.apodo, u.correo, u.telefono, u.direccion, u.contrasena, u.fecha_registro, u.estado, u.id_rol, u.avatar, u.reset_code, u.reset_expires, u.creditos, u.google_id],
    (err) => {
      if (err) console.error(`❌ Error en usuario ${u.id_usuario}:`, err.message);
      pending--;
      if (pending === 0) {
        console.log('✅ Todos los usuarios han sido procesados en MySQL.');
        process.exit(0);
      }
    }
  );
});
