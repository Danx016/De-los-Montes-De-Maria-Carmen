/**
 * Script para actualizar el rol del usuario ID 46 a administrador
 */
const db = require('./src/infrastructure/persistence/Database');

async function updateUserToAdmin() {
  try {
    const userId = 46;
    const adminRoleId = 1;

    console.log(`Actualizando usuario ID ${userId} a rol de administrador...`);

    // Primero verificar si el usuario existe
    db.query('SELECT * FROM usuarios WHERE id_usuario = ?', [userId], (err, rows) => {
      if (err) {
        console.error('Error al buscar usuario:', err);
        process.exit(1);
      }

      if (!rows || rows.length === 0) {
        console.error(`Usuario con ID ${userId} no encontrado`);
        process.exit(1);
      }

      const user = rows[0];
      console.log('Usuario encontrado:', {
        id: user.id_usuario,
        nombre: user.nombre,
        correo: user.correo,
        rol_actual: user.id_rol
      });

      // Actualizar el rol a administrador
      db.query('UPDATE usuarios SET id_rol = ? WHERE id_usuario = ?', [adminRoleId, userId], (err, result) => {
        if (err) {
          console.error('Error al actualizar rol:', err);
          process.exit(1);
        }

        if (result.affectedRows === 0) {
          console.error('No se pudo actualizar el rol del usuario');
          process.exit(1);
        }

        console.log(`✅ Usuario ID ${userId} actualizado exitosamente a rol de administrador (id_rol = ${adminRoleId})`);
        
        // Verificar la actualización
        db.query('SELECT * FROM usuarios WHERE id_usuario = ?', [userId], (err, rows) => {
          if (err) {
            console.error('Error al verificar actualización:', err);
            process.exit(1);
          }

          const updatedUser = rows[0];
          console.log('Usuario actualizado:', {
            id: updatedUser.id_usuario,
            nombre: updatedUser.nombre,
            correo: updatedUser.correo,
            nuevo_rol: updatedUser.id_rol
          });

          db.end();
          process.exit(0);
        });
      });
    });
  } catch (error) {
    console.error('Error inesperado:', error);
    process.exit(1);
  }
}

updateUserToAdmin();