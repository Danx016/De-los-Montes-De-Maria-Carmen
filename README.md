# 🌾 De los Montes de María — Plataforma Agropecuaria & Comercio Campesino

[![Node.js Version](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-339933?logo=node.js)](https://nodejs.org)
[![React Version](https://img.shields.io/badge/React-18.x-61DAFB?logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?logo=vite)](https://vitejs.dev)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql)](https://www.mysql.com)
[![Deployed on Render](https://img.shields.io/badge/Render-Live-46E3B7?logo=render)](https://delosmontesdemaria.onrender.com)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> **De los Montes de María** es una plataforma tecnológica integral de comercio electrónico y gestión agropecuaria diseñada para conectar de forma directa y sin intermediarios a los productores campesinos de la subregión de los **Montes de María** (El Carmen de Bolívar, San Jacinto, Ovejas, San Juan Nepomuceno, etc.) con consumidores y compradores de toda Colombia.

---

## 🌐 Enlaces del Proyecto

- **Sitio Web en Producción:** [https://delosmontesdemaria.onrender.com](https://delosmontesdemaria.onrender.com)
- **Repositorio Oficial en GitHub:** [https://github.com/Danx016/delosmontesdemaria](https://github.com/Danx016/delosmontesdemaria)

---

## 🌟 Características Principales

### 🛒 1. Tienda Virtual & Comercio Campesino
- **Catálogo Dinámico:** Filtrado instantáneo por categorías (*Cosechas Frescas, Lácteos Artesanales, Semillas Nativas, Abonos y Fertilizantes, Ferretería & Herramientas*), rango de precios, origen y disponibilidad.
- **Perfiles de Productores Campesinos:** Cada campesino cuenta con su propio perfil público con foto de finca, calificación, biografía e inventario de cosechas.
- **Carrito de Compras Persistente:** Cálculo en vivo de subtotales, descuentos por cupones y validación de cobertura de envíos.

### 🚚 2. Checkout Seguro con Pago Contra Entrega & Factura Electrónica
- **Pago Contra Entrega (Cash on Delivery):** Los clientes pagan en efectivo al recibir sus cosechas en la puerta de su casa o finca.
- **Verificación OTP por Correo:** Envío automatizado de códigos de seguridad de 6 dígitos para validar la identidad del comprador.
- **Factura Electrónica en PDF:** Emisión de factura legal con desglose de ítems, cupón de descuento aplicado, datos del cliente y código QR.

### 🤖 3. AgroAsistente Virtual con Inteligencia Artificial
- Asistente conversacional en vivo para asesorar a los clientes en la selección de tubérculos (ñame, yuca, plátano), recomendaciones de siembra, abonos orgánicos, cálculo de costos de envío y agregar productos al carrito con 1 clic.

### 💬 4. Centro de Soporte y Chat en Tiempo Real
- Soporte en vivo impulsado por **WebSockets (Socket.io)** para conectar compradores con asesores y administradores en tiempo real.
- Notificaciones de escritorio y calificaciones de atención al cliente (1 a 5 estrellas).

### ⚙️ 5. Panel de Control Administrativo Integral (`/admin`)
- **Dashboard Estadístico:** Métricas de ventas en COP, total de transacciones, inventario global y usuarios registrados.
- **Gestión de Inventario y Productos:** Creación, edición, cambio de precios, control de stock y subida de fotos.
- **Gestor de Banners y Carrusel Hero:** Personalización completa del carrusel de la página de inicio (subida de imágenes de fondo, filtros de color/tinte, efecto de desenfoque/blur, botones de llamado a la acción y selección de productos destacados).
- **Gestor de Cupones y Barra Promocional:** Creación de cupones con porcentaje o descuento fijo, fecha límite y activación en la marquesina superior de la tienda.
- **Control de Roles y Usuarios:** Asignación de roles (Administrador, Vendedor, Cliente, Soporte) y auditoría de cuentas.

---

## 🏗️ Arquitectura del Sistema

El proyecto está estructurado bajo **Arquitectura Limpia (Clean Architecture)** y principios de **Diseño Guiado por el Dominio (DDD)**:

```
├── client/                     # Aplicación Frontend en React 18 + Vite
│   ├── src/
│   │   ├── components/         # Componentes reutilizables (Navbar, Footer, Modales, Banners, IA Widget)
│   │   ├── context/            # Context API (Auth, Carrito, Notificaciones Toast, Confirmaciones)
│   │   ├── data/               # Datos locales y departamentos/municipios de Colombia
│   │   ├── pages/              # Vistas de la aplicación (Home, Catálogo, Checkout, Admin, Soporte, Perfil)
│   │   ├── hooks/              # Custom React Hooks (WebSockets, estado)
│   │   └── main.jsx            # Punto de entrada de React con ErrorBoundary
│   └── vite.config.js          # Configuración de compilación con Vite
│
├── src/                        # Backend en Node.js + Express
│   ├── domain/                 # Entidades, Interfaces de Repositorios y Casos de Uso
│   │   ├── entities/           # Usuario, Producto, Compra, Cupon, Banner, SoporteTicket
│   │   ├── repositories/       # Contratos/Interfaces
│   │   └── use-cases/          # Lógica de negocio pura independiente del framework
│   ├── application/            # Controladores, Rutas y Middlewares
│   │   ├── controllers/        # Controladores REST API
│   │   ├── middleware/         # Autenticación JWT, CSRF, Rate Limiting, Subida de Archivos, Logger
│   │   └── routes/             # Enrutadores modulares de la API
│   ├── infrastructure/         # Base de Datos, Servicios Externos y WebSockets
│   │   ├── persistence/        # Implementación de Repositorios MySQL y Pool de Conexiones
│   │   ├── external-services/  # Email (Nodemailer), Google OAuth, Inteligencia Artificial
│   │   └── websocket/          # Servidor Socket.io para chat de soporte en vivo
│   └── framework/              # Configuración de Express, Helmet, CORS y Servidor HTTP
│
├── public/                     # Archivos estáticos, imágenes de productos y assets
├── scripts/                    # Scripts de utilidad y mantenimiento
├── package.json                # Dependencias raíz del proyecto
└── README.md                   # Documentación oficial
```

---

## 💻 Stack Tecnológico

| Capa | Tecnologías |
| :--- | :--- |
| **Frontend** | React 18, Vite, Context API, CSS3 Vanilla Moderno, FontAwesome |
| **Backend** | Node.js, Express.js, Socket.IO, Bcrypt, JWT |
| **Base de Datos** | MySQL 8.0 en Aiven Cloud (SSL, Connection Pooling) |
| **Seguridad** | Helmet, CORS, CSRF Protection, Rate Limiter, Validación de Esquemas |
| **Integraciones** | Nodemailer (Emails OTP & Facturas), Google OAuth 2.0 |
| **Despliegue** | Render (PaaS con CI/CD automático desde GitHub) |

---

## 🚀 Instalación y Ejecución Local

### Prerrequisitos
- **Node.js:** Versión 18.0.0 o superior
- **NPM:** Versión 9.0.0 o superior
- **MySQL:** Servidor MySQL 8.x local o conexión a la base de datos en la nube (Aiven)

### 1. Clonar el Repositorio
```bash
git clone https://github.com/Danx016/delosmontesdemaria.git
cd delosmontesdemaria
```

### 2. Configurar Variables de Entorno (`.env`)
Crea un archivo `.env` en la raíz del proyecto con la siguiente estructura:

```env
PORT=3000
NODE_ENV=development

# Conexión a Base de Datos MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=tu_contrasena
DB_NAME=defaultdb
DB_SSL=false

# Seguridad JWT & Sesiones
JWT_SECRET=tu_clave_secreta_super_segura_jwt_montes_de_maria
SESSION_SECRET=tu_clave_secreta_para_sesiones

# Configuración de Correo Electrónico (Para envío de OTP y Facturas)
EMAIL_SERVICE=gmail
EMAIL_USER=tu_correo@gmail.com
EMAIL_PASS=tu_contrasena_de_aplicacion_gmail

# Google OAuth (Opcional)
GOOGLE_CLIENT_ID=tu_google_client_id.apps.googleusercontent.com
```

### 3. Instalar Dependencias y Compilar Frontend
```bash
# Instalar dependencias del servidor y compilar cliente React
npm install
npm run build
```

### 4. Iniciar Servidor
```bash
# Modo Producción / Servidor Unificado
npm start

# O para desarrollo interactivo con reinicio automático
npm run dev
```

Visita en tu navegador: **`http://localhost:3000`**

---

## 👥 Roles y Credenciales Predeterminadas

| Rol | Correo | Contraseña | Permisos |
| :--- | :--- | :--- | :--- |
| **Administrador** | `danilorodelo355@gmail.com` | `123456` | Acceso total al panel `/admin`, gestión de productos, banners, cupones y usuarios |
| **Soporte** | `soporte@montesdemaria.com` | `123456` | Atención de tickets y chat en tiempo real |
| **Vendedor / Productor** | `roberto.salcedo@montesdemaria.com` | `123456` | Publicación y administración de cosechas propias |
| **Cliente** | `cliente@ejemplo.com` | `123456` | Compra de productos, seguimiento de pedidos y soporte |

---

## 📄 Licencia

Este proyecto se encuentra protegido y distribuido bajo los términos de la **Licencia MIT**.

---

🌾 *Desarrollado con orgullo para apoyar el campo y las comunidades campesinas de los Montes de María, Colombia.* 🇨🇴
