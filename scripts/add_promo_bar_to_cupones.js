const db = require('../src/infrastructure/persistence/Database');

async function migrate() {
  db.query(`
    ALTER TABLE cupones 
    ADD COLUMN promocionar_en_barra TINYINT(1) DEFAULT 0 AFTER activo,
    ADD COLUMN mensaje_promocional VARCHAR(255) NULL AFTER promocionar_en_barra
  `, (err) => {
    if (err && !err.message.includes('Duplicate column')) {
      console.error('Error alter table cupones:', err.message);
    } else {
      console.log('✅ Columns promocionar_en_barra and mensaje_promocional added to cupones table!');
    }

    // Activar una por defecto para mostrar
    db.query(`
      UPDATE cupones 
      SET promocionar_en_barra = 1, mensaje_promocional = '🔥 ¡Temporada de Cosecha! Usa el cupón CAMPO20 y obtén 20% de descuento en tu pedido'
      WHERE codigo = 'CAMPO20' LIMIT 1
    `, (err2) => {
      if (err2) console.error(err2);
      else console.log('✅ CAMPO20 marked as active promo banner!');
      process.exit(0);
    });
  });
}

migrate();
