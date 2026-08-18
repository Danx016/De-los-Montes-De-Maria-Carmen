/**
 * Entrada principal / Proxy de arranque
 * Redirige la ejecución a la Arquitectura Hexagonal en src/framework/server.js
 */
const path = require('path');
const server = require(path.join(__dirname, 'src', 'framework', 'server.js'));

module.exports = server;
