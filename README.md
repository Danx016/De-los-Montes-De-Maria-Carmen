# 🌾 AgroCampo - De los Montes de María

Plataforma integral de comercio electrónico y asesoría agropecuaria local desarrollada con Node.js, Express, Socket.IO, MySQL y React + Vite.

---

## 🚀 Características Principales

- **Tienda Agropecuaria Virtual:** Catálogo de productos agrícolas, filtros por departamento, categoría, rango de precio y disponibilidad en stock.
- **Asistente Virtual IA:** Asesor inteligente en tiempo real para cotizaciones, recomendaciones de productos campesinos y resolución de dudas.
- **Soporte en Vivo y Tickets:** Chat de soporte interactivo con escalado automático a asesores humanos mediante WebSockets (Socket.IO).
- **Proceso de Pago Seguro & Facturación Electrónica:**
  - Verificación de seguridad mediante código OTP enviado al correo.
  - Generación, visualización en modal e impresión/descarga en PDF de Factura Electrónica oficial.
  - Validación dinámica de cupones de descuento (ej: `AGRO10`).
- **Ubicación Geográfica Nacional:** Cobertura de los 32 departamentos de Colombia y Bogotá D.C. con carga dinámica de municipios.
- **Panel de Administración y Vendedor:** Gestión completa de usuarios, productos, cupones, categorías, banners y estados de despacho.

---

## 🛠️ Tecnologías Utilizadas

- **Frontend:** React 19, Vite, Context API, CSS3 Moderno, FontAwesome.
- **Backend:** Node.js, Express, Socket.IO, Nodemailer, JWT.
- **Base de Datos:** MySQL / MariaDB (con migraciones automáticas).

---

## 💻 Instalación y Ejecución Local

### 1. Clonar el repositorio
```bash
git clone <URL_DE_TU_REPOSITORIO_EN_GITHUB>
cd "De los montesdemaria"
```

### 2. Instalar dependencias
```bash
# Dependencias del servidor y cliente
npm run install:all
```

### 3. Configurar Variables de Entorno
Copia el archivo `.env.example` y renómbralo a `.env`:
```bash
cp .env.example .env
```
Configura tus credenciales de base de datos MySQL y correo electrónico.

### 4. Compilar el Frontend y Ejecutar
```bash
npm run build
npm start
```
La aplicación estará disponible en: `http://localhost:3000`

---

## 📄 Licencia
Este proyecto es propiedad de **De los Montes de María S.A.S.**
