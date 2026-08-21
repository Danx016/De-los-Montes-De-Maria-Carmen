/**
 * Punto de entrada principal del servidor
 * Configura e inicia el servidor HTTP/HTTPS y Socket.IO
 */
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');
const app = require('./app');

const PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;

// Rutas a los certificados
const privateKeyPath = path.join(__dirname, '../../cert', 'private.key');
const certificatePath = path.join(__dirname, '../../cert', 'certificate.crt');

const useHTTPS = fs.existsSync(privateKeyPath) && 
                  fs.existsSync(certificatePath) && 
                  process.env.NODE_ENV !== 'production' && 
                  process.env.DISABLE_HTTPS !== 'true';

let mainServer;

if (useHTTPS) {
  const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
  const certificate = fs.readFileSync(certificatePath, 'utf8');
  const credentials = { key: privateKey, cert: certificate };

  mainServer = https.createServer(credentials, app);
  
  mainServer.listen(HTTPS_PORT, () => {
    console.log(`🔒 Servidor HTTPS corriendo en puerto ${HTTPS_PORT}`);
    console.log(`📝 Visita: https://localhost:${HTTPS_PORT}`);
  });

  // Servidor HTTP redirige a HTTPS
  const httpServer = http.createServer((req, res) => {
    res.writeHead(301, { Location: `https://${req.headers.host}${req.url}` });
    res.end();
  });
  
  httpServer.listen(PORT, () => {
    console.log(`🔄 Servidor HTTP redirigiendo a HTTPS en puerto ${PORT}`);
  });
} else {
  mainServer = http.createServer(app);
  
  mainServer.listen(PORT, () => {
    console.log(`🚀 Servidor HTTP corriendo en puerto ${PORT}`);
    console.log(`📝 Visita: http://localhost:${PORT}`);
  });
}

// Configurar Socket.IO
const io = new Server(mainServer, {
  cors: {
    origin: (origin, callback) => {
      // Permitir origen dinámicamente para soportar credenciales correctamente
      callback(null, true);
    },
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['polling', 'websocket'],
  allowEIO3: true
});

app.setupSocketIO(io);

console.log('🔧 Socket.IO configurado exitosamente');

// Manejo de errores del servidor
mainServer.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ El puerto ${error.port} ya está en uso`);
  } else {
    console.error('❌ Error del servidor:', error);
  }
});

// Manejo de cierre gracioso
process.on('SIGTERM', () => {
  console.log('📴 SIGTERM recibido. Cerrando servidor...');
  mainServer.close(() => {
    console.log('✅ Servidor cerrado');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('📴 SIGINT recibido. Cerrando servidor...');
  mainServer.close(() => {
    console.log('✅ Servidor cerrado');
    process.exit(0);
  });
});