const db = require('../src/infrastructure/persistence/Database');

const alterQueries = [
  "ALTER TABLE cupones ADD COLUMN descripcion VARCHAR(255) NULL AFTER codigo",
  "ALTER TABLE cupones ADD COLUMN monto_minimo DECIMAL(10,2) DEFAULT 0.00 AFTER descuento_fijo",
  "ALTER TABLE cupones ADD COLUMN fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
];

async function setup() {
  for (const q of alterQueries) {
    await new Promise((resolve) => {
      db.query(q, () => resolve());
    });
  }

  const seed = `
    INSERT INTO cupones (codigo, descripcion, descuento_porcentaje, monto_minimo, uso_limite, uso_actual, activo) VALUES
    ('MONTES10', 'Descuento del 10% en cosechas de la región', 10.00, 0, 100, 0, 1),
    ('CAMPO20', 'Descuento especial del 20% para compras del campo', 20.00, 20000, 50, 0, 1),
    ('OFERTA30', 'Súper descuento del 30% en pedidos seleccionados', 30.00, 35000, 25, 0, 1),
    ('AGRO5', 'Descuento del 5% en herramientas y agro', 5.00, 0, 200, 0, 1)
    ON DUPLICATE KEY UPDATE descuento_porcentaje = VALUES(descuento_porcentaje);
  `;

  db.query(seed, (err) => {
    if (err) console.error('Error seeding:', err);
    else console.log('✅ Cupones table updated and seeded.');
    process.exit(0);
  });
}

setup();
