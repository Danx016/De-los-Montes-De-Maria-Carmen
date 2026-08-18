const db = require('./src/infrastructure/persistence/Database');
const bcrypt = require('bcrypt');

async function setupAdmin() {
  try {
    console.log('🔧 Configurando administrador del sistema...');
    
    // Generar hash de la contraseña
    const passwordHash = await bcrypt.hash('Admin.123', 12);
    
    // Verificar si ya existe el usuario admin
    db.query("SELECT id_usuario FROM usuarios WHERE apodo = 'admin'", async (err, results) => {
      if (err) {
        console.error('❌ Error al buscar admin:', err);
        process.exit(1);
      }
      
      if (results && results.length > 0) {
        // Actualizar admin existente
        const idUsuario = results[0].id_usuario;
        db.query(
          "UPDATE usuarios SET contrasena = ?, id_rol = 1, estado = 'activo' WHERE id_usuario = ?",
          [passwordHash, idUsuario],
          (updateErr) => {
            if (updateErr) {
              console.error('❌ Error al actualizar admin:', updateErr);
              process.exit(1);
            }
            console.log('✅ Admin actualizado exitosamente');
            console.log('📝 Credenciales:');
            console.log('   Usuario: admin');
            console.log('   Correo: admin@agrocampo.local');
            console.log('   Contraseña: Admin.123');
            console.log('   Rol: Administrador (1)');
            process.exit(0);
          }
        );
      } else {
        // Crear nuevo admin
        db.query(
          "INSERT INTO usuarios (nombre, apodo, correo, contrasena, id_rol, estado, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)",
          ['Administrador Principal', 'admin', 'admin@agrocampo.local', passwordHash, 1, 'activo', 'default.png'],
          (insertErr) => {
            if (insertErr) {
              console.error('❌ Error al crear admin:', insertErr);
              process.exit(1);
            }
            console.log('✅ Admin creado exitosamente');
            console.log('📝 Credenciales:');
            console.log('   Usuario: admin');
            console.log('   Correo: admin@agrocampo.local');
            console.log('   Contraseña: Admin.123');
            console.log('   Rol: Administrador (1)');
            process.exit(0);
          }
        );
      }
    });
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

setupAdmin();