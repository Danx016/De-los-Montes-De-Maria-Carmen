# Arquitectura Hexagonal Completa - De los Montes de María

## 📋 Estructura del Proyecto

El proyecto está 100% estructurado e implementado bajo **Arquitectura Hexagonal (Ports and Adapters)**. Esta arquitectura separa rigurosamente las reglas del negocio de los adaptadores de infraestructura, servicios externos, base de datos y presentación web.

```
The montes of maria/De los Montes de María/
├── src/
│   ├── domain/                         # DOMINIO (Núcleo de Negocio - Puro)
│   │   ├── entities/                   # Entidades de Dominio
│   │   │   ├── Usuario.js              # Reglas y validaciones de usuarios
│   │   │   ├── Producto.js             # Lógica de stock, catálogo y cálculo de precios
│   │   │   ├── Compra.js               # Lógica de órdenes de compra
│   │   │   ├── ItemCompra.js           # Ítems individuales de pedidos
│   │   │   ├── Categoria.js            # Categorías de productos
│   │   │   ├── SoporteTicket.js        # Estados y datos de tickets de soporte
│   │   │   ├── MensajeChat.js          # Mensajes de chat y soporte
│   │   │   ├── TokenRecuperacion.js    # Manejo y validación de OTPs y códigos
│   │   │   └── Direccion.js            # Direcciones de envío
│   │   ├── repositories/               # Interfaces / Puertos de Repositorio
│   │   │   ├── UsuarioRepository.js
│   │   │   ├── ProductoRepository.js
│   │   │   ├── CompraRepository.js
│   │   │   ├── SoporteRepository.js
│   │   │   ├── ChatRepository.js
│   │   │   └── TokenRepository.js
│   │   └── use-cases/                  # Casos de Uso (Lógica de Aplicación)
│   │       ├── auth/                   # RegisterUser, LoginUser, GoogleAuthUser, RequestPasswordReset, ResetPassword
│   │       ├── admin/                  # GetAdminStats, ManageUsersAdmin, ProcessAdminAIChat
│   │       ├── user/                   # UpdateProfile, DeleteAccount, ManageAddresses
│   │       ├── product/                # CreateProduct, UpdateProduct, DeleteProduct, SearchProducts
│   │       ├── purchase/               # CreateCompra, UpdateOrderStatus, GenerateWompiSignature
│   │       ├── support/                # ProcessSoporte, ProcessSupportAIChat
│   │       └── chat/                   # ProcessPublicAIChat
│   │
│   ├── infrastructure/                 # INFRAESTRUCTURA (Adaptadores de Salida y Configuración)
│   │   ├── config/                     # Configuraciones centralizadas
│   │   │   ├── database.config.js
│   │   │   └── app.config.js
│   │   ├── persistence/                # Persistencia y acceso a Base de Datos
│   │   │   ├── Database.js             # Pool y transacciones MySQL
│   │   │   ├── MySQLUsuarioRepository.js
│   │   │   ├── MySQLProductoRepository.js
│   │   │   ├── MySQLCompraRepository.js
│   │   │   ├── MySQLSoporteRepository.js
│   │   │   ├── MySQLChatRepository.js
│   │   │   └── MySQLTokenRepository.js
│   │   ├── external-services/          # Servicios Externos
│   │   │   ├── EmailService.js         # Envío de correos SMTP y simulados
│   │   │   ├── GoogleAuthService.js    # Verificación de tokens de Google
│   │   │   ├── IAService.js            # OpenRouter (AdminIA, SoporteIA, AgroIA)
│   │   │   └── PaymentService.js       # Firmas criptográficas Wompi (SHA256)
│   │   └── websocket/                  # WebSockets
│   │       └── SocketHandler.js        # Eventos Socket.IO de Soporte en vivo
│   │
│   ├── application/                    # APLICACIÓN (Adaptadores de Entrada HTTP)
│   │   ├── controllers/                # Controladores HTTP
│   │   │   ├── AuthController.js       # Login, Register, Google, Reset Password
│   │   │   ├── UsuarioController.js    # Perfil, Direcciones, Eliminación de Cuenta
│   │   │   ├── ProductoController.js   # CRUD y Búsqueda de Productos
│   │   │   ├── CompraController.js     # Checkout, OTP, Recibos, Wompi, Estados
│   │   │   ├── SoporteController.js    # Tickets, Mensajería, Calificaciones, Agentes
│   │   │   ├── ChatController.js       # Asistente de Tienda y AdminIA
│   │   │   ├── AdminController.js      # Métricas, Gestión de Usuarios, IA Admin
│   │   │   └── ViewController.js       # Renderizado de Vistas SSR (EJS)
│   │   ├── middleware/                 # Middlewares
│   │   │   ├── auth.js                 # verifyToken, verifyAdmin, verifyVendedor, verifySelf
│   │   │   ├── csrf.js                 # Protección CSRF
│   │   │   ├── logger.js               # Logs de seguridad y peticiones
│   │   │   ├── validate.js             # Validación de esquemas y parámetros
│   │   │   ├── rateLimiter.js          # Rate limits para login, registro y global
│   │   │   └── upload.js               # Subida de imágenes de productos y soporte
│   │   └── routes/                     # Rutas HTTP
│   │       ├── auth.routes.js
│   │       ├── usuario.routes.js
│   │       ├── producto.routes.js
│   │       ├── compra.routes.js
│   │       ├── soporte.routes.js
│   │       ├── chat.routes.js
│   │       ├── admin.routes.js
│   │       ├── view.routes.js
│   │       └── index.js                # Enrutador centralizado
│   │
│   └── framework/                      # FRAMEWORK (Bootstrap y Servidor)
│       ├── app.js                      # Configuración de Express, middlewares y orquestación
│       └── server.js                   # Inicio de Servidores HTTP/HTTPS y Socket.IO
│
├── views/                              # Vistas EJS
├── public/                             # Archivos estáticos (CSS, JS, imágenes, uploads)
└── package.json
```

---

## 🚀 Cómo Iniciar el Proyecto

```bash
# Iniciar con la Arquitectura Hexagonal
npm start
```

## 🔄 Flujo de una Petición (Ejemplo)

1. **Cliente HTTP / Navegador** envía petición a `/api/compra`.
2. **Framework (`src/framework/app.js`)** recibe la petición, aplica middlewares (`rateLimiter`, `helmet`, `cors`, `requestLogger`, `cookieParser`, `csrf`, `verifyToken`).
3. **Enrutador (`src/application/routes/compra.routes.js`)** direcciona la petición a `CompraController.crear`.
4. **Controlador (`CompraController`)** extrae parámetros validados e invoca el caso de uso `compraRepository.crear`.
5. **Caso de Uso / Entidades (`src/domain/`)** aplican reglas de negocio (validar ítems, stock, calcular totales).
6. **Adaptador de Persistencia (`src/infrastructure/persistence/MySQLCompraRepository.js`)** realiza la transacción SQL atómica.
7. **Adaptador Externo (`src/infrastructure/external-services/EmailService.js`)** envía la confirmación de la orden por correo electrónico.
8. **Controlador** responde con status 201 y payload JSON estandarizado.