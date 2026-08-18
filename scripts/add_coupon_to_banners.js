const db = require('../src/infrastructure/persistence/Database');

async function migrate() {
  db.query(`
    ALTER TABLE banners_hero 
    ADD COLUMN cupon_codigo VARCHAR(50) NULL AFTER tarjeta_vendedor_id,
    ADD COLUMN cupon_texto VARCHAR(255) NULL AFTER cupon_codigo
  `, (err) => {
    if (err && !err.message.includes('Duplicate column')) {
      console.error('Error alter table:', err.message);
    } else {
      console.log('✅ Columns cupon_codigo and cupon_texto successfully added to banners_hero!');
    }
    process.exit(0);
  });
}

migrate();
