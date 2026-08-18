/**
 * import_mysql_to_sqlite.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Importa un dump de MySQL al archivo SQLite del proyecto.
 *
 * USO:
 *   1. Exporta tu BD MySQL con:
 *        mysqldump -u root -p agro_campo --no-tablespaces > data/mysql_dump.sql
 *   2. Copia el archivo generado a: data/mysql_dump.sql
 *   3. Ejecuta este script:
 *        node scripts/import_mysql_to_sqlite.js
 *
 * El script borra y recrea la BD SQLite con los datos del dump.
 */

const fs   = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dataDir  = path.join(__dirname, '..', 'data');
const dumpPath = path.join(dataDir, 'mysql_dump.sql');
const dbFile   = path.join(dataDir, 'database.sqlite');

if (!fs.existsSync(dumpPath)) {
  console.error('❌ No se encontró el dump en:', dumpPath);
  console.error('   Exporta tu BD con: mysqldump -u root -p agro_campo --no-tablespaces > data/mysql_dump.sql');
  process.exit(1);
}

// Borrar la BD anterior para empezar limpio
if (fs.existsSync(dbFile)) {
  fs.unlinkSync(dbFile);
  console.log('🗑️  BD anterior eliminada:', dbFile);
}

let sql = fs.readFileSync(dumpPath, 'utf8');

// ─── 1. Limpiar cabeceras MySQL ────────────────────────────────────────────
sql = sql.replace(/CREATE\s+DATABASE[\s\S]*?;/gi, '');
sql = sql.replace(/USE\s+\w+\s*;/gi, '');
sql = sql.replace(/SET\s+[^;]+;/gi, '');              // SET NAMES, SET time_zone, etc.
sql = sql.replace(/\/\*![\s\S]*?\*\/\s*;?/g, '');    // Comentarios MySQL /*!40101 ... */
sql = sql.replace(/--[^\n]*/g, '');                   // Comentarios --
sql = sql.replace(/^#[^\n]*/gm, '');                  // Comentarios # solo al inicio de línea (MySQL 8)

// ─── 2. Eliminar opciones de tabla no soportadas ──────────────────────────
sql = sql.replace(/ENGINE\s*=\s*\w+/gi, '');
sql = sql.replace(/DEFAULT\s+CHARSET\s*=\s*\w+/gi, '');
sql = sql.replace(/COLLATE\s*=?\s*[\w_]+/gi, '');
sql = sql.replace(/ROW_FORMAT\s*=\s*\w+/gi, '');
sql = sql.replace(/AUTO_INCREMENT\s*=\s*\d+/gi, '');  // opción de tabla AUTO_INCREMENT=N
sql = sql.replace(/CHARACTER\s+SET\s+\w+/gi, '');
sql = sql.replace(/COMMENT\s+'[^']*'/gi, '');

// ─── 3. Backticks → sin comillas (SQLite usa comillas dobles o nada) ───────
sql = sql.replace(/`/g, '"');

// ─── 4. Tipos MySQL → SQLite ──────────────────────────────────────────────
sql = sql.replace(/INT\s+AUTO_INCREMENT\s+PRIMARY\s+KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT');
sql = sql.replace(/BIGINT\s+AUTO_INCREMENT\s+PRIMARY\s+KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT');
sql = sql.replace(/AUTO_INCREMENT/gi, '');
sql = sql.replace(/TINYINT\(\d+\)/gi, 'INTEGER');
sql = sql.replace(/SMALLINT\(\d+\)/gi, 'INTEGER');
sql = sql.replace(/MEDIUMINT\(\d+\)/gi, 'INTEGER');
sql = sql.replace(/BIGINT\(\d+\)/gi, 'INTEGER');
sql = sql.replace(/INT\(\d+\)/gi, 'INTEGER');
sql = sql.replace(/\bINT\b/gi, 'INTEGER');
sql = sql.replace(/VARCHAR\(\d+\)/gi, 'TEXT');
sql = sql.replace(/CHAR\(\d+\)/gi, 'TEXT');
sql = sql.replace(/LONGTEXT/gi, 'TEXT');
sql = sql.replace(/MEDIUMTEXT/gi, 'TEXT');
sql = sql.replace(/TINYTEXT/gi, 'TEXT');
sql = sql.replace(/DECIMAL\([^)]+\)/gi, 'REAL');
sql = sql.replace(/FLOAT\([^)]+\)/gi, 'REAL');
sql = sql.replace(/DOUBLE\([^)]+\)/gi, 'REAL');
sql = sql.replace(/\bFLOAT\b/gi, 'REAL');
sql = sql.replace(/\bDOUBLE\b/gi, 'REAL');
sql = sql.replace(/ENUM\([^)]+\)/gi, 'TEXT');
sql = sql.replace(/SET\s*\([^)]+\)/gi, 'TEXT');
sql = sql.replace(/TIMESTAMP/gi, 'DATETIME');
sql = sql.replace(/DATETIME/gi, 'DATETIME'); // ya es igual, sin cambio
sql = sql.replace(/TINYINT\b/gi, 'INTEGER');
sql = sql.replace(/BOOLEAN\b/gi, 'INTEGER');
sql = sql.replace(/BLOB/gi, 'BLOB');

// ─── 5. Ajustes específicos del proyecto ─────────────────────────────────

// 5a. Renombrar columna apellido → apodo en CREATE TABLE usuarios
sql = sql.replace(
  /(CREATE\s+TABLE\s+(?:"usuarios"|usuarios)[\s\S]*?)\)/i,
  (match) => match
    .replace(/\bapellido\s+TEXT/gi, 'apodo TEXT')
    .replace(/\bapellido\s+VARCHAR\(\d+\)\s*(NOT\s+NULL)?/gi, 'apodo TEXT $1')
);

// 5b. Renombrar apellido → apodo en los INSERTs de usuarios
sql = sql.replace(
  /INSERT\s+INTO\s+(?:"usuarios"|usuarios)\s*\(\s*"?nombre"?\s*,\s*"?apellido"?/gi,
  'INSERT INTO "usuarios" ("nombre", "apodo"'
);

// Forzar nombres de usuario correctos (apodo) para cuentas por defecto
sql = sql.replace(/'Principal',\s*'admin@agrocampo\.com'/gi, "'admin_0', 'admin@agrocampo.com'");
sql = sql.replace(/'Gomez',\s*'pedro@agrocampo\.com'/gi, "'pedro', 'pedro@agrocampo.com'");

// 5c. Eliminar ALTER TABLE que ya no son necesarios
sql = sql.replace(/ALTER\s+TABLE\s+[^;]+;/gi, '');

// 5d. Agregar columnas faltantes en CREATE TABLE usuarios (las que usa la app)
sql = sql.replace(
  /(CREATE\s+TABLE\s+(?:"usuarios"|usuarios)\s*\([\s\S]*?)(FOREIGN\s+KEY[^)]+\)[^,\n]*,?|(?=\s*\)))/i,
  (match, prefix, fk) => {
    const extra = `
  "avatar" TEXT,
  "reset_code" TEXT,
  "reset_expires" DATETIME,
  "creditos" REAL DEFAULT 0.00,
  "google_id" TEXT,
  ${fk}`;
    return prefix + extra;
  }
);

// 5e. Agregar columnas faltantes en productos si no existen
sql = sql.replace(
  /(CREATE\s+TABLE\s+(?:"productos"|productos)\s*\([\s\S]*?)(FOREIGN\s+KEY[^)]+\)[^,\n]*,?|(?=\s*\)))/i,
  (match, prefix, fk) => {
    const extra = `
  "categoria" TEXT,
  "origen" TEXT,
  "presentacion" TEXT,
  "cuidado" TEXT,
  "disponibilidad" TEXT,
  ${fk}`;
    return prefix + extra;
  }
);

// ─── 6. Limpiar líneas vacías y whitespace excesivo ───────────────────────
// Normalizar CRLF → LF
sql = sql.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

// Eliminar bloques de texto Markdown que algunos dumps incluyen al final
// (líneas que NO empiezan con keywords SQL)
const sqlLines = sql.split('\n');
const cleanedLines = [];
let inSql = true;
for (const line of sqlLines) {
  const trimmed = line.trim();
  // Detectar inicio de texto no-SQL (como "## Descripción General")
  if (trimmed.startsWith('##') || trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
    inSql = false;
  }
  if (inSql) {
    cleanedLines.push(line.trimEnd());
  }
}
sql = cleanedLines.filter(l => l.length > 0).join('\n');

// ─── 7. Ejecutar en SQLite ────────────────────────────────────────────────
const db = new sqlite3.Database(dbFile);

console.log('🔄 Importando datos a SQLite...\n');

db.serialize(() => {
  db.run('PRAGMA foreign_keys = OFF;');
  db.run('PRAGMA journal_mode = WAL;');

  // Dividir en sentencias individuales y ejecutarlas una a una
  // Usamos ; como separador (puede aparecer en cualquier posición, no solo fin de línea)
  const stmts = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !/^\s*$/.test(s));

  let ok = 0, errors = 0;

  (function run(i) {
    if (i >= stmts.length) {
      db.run('PRAGMA foreign_keys = ON;');
      console.log(`\n✅ Importación terminada. ${ok} sentencias OK, ${errors} ignoradas.`);
      console.log('📂 Base de datos en:', dbFile);
      db.close();
      return;
    }

    const stmt = stmts[i];

    // Ignorar SELECTs del dump (consultas de verificación)
    if (/^\s*SELECT\b/i.test(stmt)) {
      run(i + 1);
      return;
    }

    db.run(stmt + ';', [], function(err) {
      if (err) {
        // Ignorar errores de "tabla ya existe" y "columna ya existe"
        const msg = err.message.toLowerCase();
        if (!msg.includes('already exists') && !msg.includes('duplicate column')) {
          console.warn(`⚠️  Error en sentencia ${i + 1}: ${err.message}`);
          console.warn('   SQL:', stmt.slice(0, 120));
          errors++;
        }
      } else {
        ok++;
      }
      run(i + 1);
    });
  })(0);
});
