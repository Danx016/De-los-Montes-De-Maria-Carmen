const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbFile = path.join(__dirname, '..', 'data', 'database.sqlite');
const db = new sqlite3.Database(dbFile, (err) => {
  if (err) return console.error('No se pudo abrir DB:', err.message);
  console.log('Abierta DB:', dbFile);
});

db.serialize(() => {
  db.run("ALTER TABLE productos ADD COLUMN categoria TEXT", (err) => {
    if (err) {
      if (err.message && err.message.includes('duplicate column')) {
        console.log('Columna categoria ya existe.');
      } else {
        console.error('Error añadiendo columna categoria:', err.message);
      }
    } else {
      console.log('Columna categoria añadida.');
    }
  });

  db.run(`UPDATE productos SET categoria = (
    SELECT nombre_categoria FROM categorias WHERE categorias.id_categoria = productos.id_categoria
  )`, (err) => {
    if (err) console.error('Error actualizando categoria en productos:', err.message);
    else console.log('Categorias pobladas en productos.');
  });
});

db.close();
