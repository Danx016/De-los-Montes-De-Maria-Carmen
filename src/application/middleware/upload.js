/**
 * Middleware: upload
 * Manejador de subida de imágenes con multer para productos, categorías, soporte y banners
 * Optimizado para subidas desde teléfonos móviles (Android, iOS) y computadores.
 */
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const productsUploadDir = path.join(__dirname, '../../../public/uploads/products');
if (!fs.existsSync(productsUploadDir)) {
  fs.mkdirSync(productsUploadDir, { recursive: true });
}

const soporteUploadDir = path.join(__dirname, '../../../public/uploads/soporte');
if (!fs.existsSync(soporteUploadDir)) {
  fs.mkdirSync(soporteUploadDir, { recursive: true });
}

const profilesUploadDir = path.join(__dirname, '../../../public/uploads/profiles');
if (!fs.existsSync(profilesUploadDir)) {
  fs.mkdirSync(profilesUploadDir, { recursive: true });
}

const categoriesUploadDir = path.join(__dirname, '../../../public/uploads/categories');
if (!fs.existsSync(categoriesUploadDir)) {
  fs.mkdirSync(categoriesUploadDir, { recursive: true });
}

const bannersUploadDir = path.join(__dirname, '../../../public/uploads/banners');
if (!fs.existsSync(bannersUploadDir)) {
  fs.mkdirSync(bannersUploadDir, { recursive: true });
}

const imageFilter = (req, file, cb) => {
  const allowedExts = /\.(jpg|jpeg|png|webp|gif|svg|bmp|avif|heic|heif|jfif)$/i;
  const isImageMime =
    file.mimetype &&
    (file.mimetype.startsWith('image/') ||
     file.mimetype === 'application/octet-stream' ||
     file.mimetype === 'binary/octet-stream');
  const isImageExt = allowedExts.test(file.originalname || '');

  if (isImageMime || isImageExt || !file.originalname) {
    cb(null, true);
  } else {
    cb(new Error('Formato no soportado. Sube una imagen (JPEG, PNG, WEBP, GIF, SVG, AVIF, HEIC).'));
  }
};

const getCleanExtension = (originalname, mimetype) => {
  let ext = path.extname(originalname || '').toLowerCase();
  if (!ext || ext.length <= 1) {
    if (mimetype === 'image/png') ext = '.png';
    else if (mimetype === 'image/webp') ext = '.webp';
    else if (mimetype === 'image/gif') ext = '.gif';
    else if (mimetype === 'image/svg+xml') ext = '.svg';
    else ext = '.jpg';
  }
  return ext;
};

const productStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, productsUploadDir),
  filename: (req, file, cb) => {
    const ext = getCleanExtension(file.originalname, file.mimetype);
    const rawBase = path.basename(file.originalname || 'prod', ext);
    const safeName = rawBase.replace(/[^a-z0-9.\-_]/gi, '_').toLowerCase() || 'producto';
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${safeName}${ext}`);
  }
});

const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, profilesUploadDir),
  filename: (req, file, cb) => {
    const ext = getCleanExtension(file.originalname, file.mimetype);
    const field = file.fieldname || 'media';
    cb(null, `${field}_${Date.now()}_${Math.round(Math.random() * 1e6)}${ext}`);
  }
});

const soporteStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, soporteUploadDir),
  filename: (req, file, cb) => {
    const ext = getCleanExtension(file.originalname, file.mimetype);
    const name = 'soporte_' + Date.now() + '_' + Math.round(Math.random() * 1e6) + ext;
    cb(null, name);
  }
});

const categoryStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, categoriesUploadDir),
  filename: (req, file, cb) => {
    const ext = getCleanExtension(file.originalname, file.mimetype);
    const rawBase = path.basename(file.originalname || 'cat', ext);
    const safeName = rawBase.replace(/[^a-z0-9.\-_]/gi, '_').toLowerCase() || 'categoria';
    cb(null, `cat_${Date.now()}_${safeName}${ext}`);
  }
});

const bannerStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, bannersUploadDir),
  filename: (req, file, cb) => {
    const ext = getCleanExtension(file.originalname, file.mimetype);
    const field = file.fieldname || 'banner';
    const rawBase = path.basename(file.originalname || 'banner', ext);
    const safeName = rawBase.replace(/[^a-z0-9.\-_]/gi, '_').toLowerCase() || 'banner';
    cb(null, `${field}_${Date.now()}_${safeName}${ext}`);
  }
});

// Límite de 35MB para soportar fotos en alta resolución de cámaras móviles
const MAX_UPLOAD_SIZE = 35 * 1024 * 1024;

const uploadProductImage = multer({
  storage: productStorage,
  fileFilter: imageFilter,
  limits: { fileSize: MAX_UPLOAD_SIZE }
});

const uploadProfileMedia = multer({
  storage: profileStorage,
  fileFilter: imageFilter,
  limits: { fileSize: MAX_UPLOAD_SIZE }
});

const uploadSupportImage = multer({
  storage: soporteStorage,
  fileFilter: imageFilter,
  limits: { fileSize: MAX_UPLOAD_SIZE }
});

const uploadCategoryImage = multer({
  storage: categoryStorage,
  fileFilter: imageFilter,
  limits: { fileSize: MAX_UPLOAD_SIZE }
});

const uploadBannerImages = multer({
  storage: bannerStorage,
  fileFilter: imageFilter,
  limits: { fileSize: MAX_UPLOAD_SIZE }
}).fields([
  { name: 'categoria_thumb', maxCount: 1 },
  { name: 'imagen_fondo', maxCount: 1 },
  { name: 'tarjeta_imagen', maxCount: 1 }
]);

// Wrapper para capturar errores de multer amigablemente
const handleMulterUpload = (uploadMiddleware) => {
  return (req, res, next) => {
    uploadMiddleware(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'La foto es demasiado pesada. El tamaño máximo permitido es 35MB.' });
        }
        return res.status(400).json({ error: `Error al subir imagen: ${err.message}` });
      } else if (err) {
        return res.status(400).json({ error: err.message || 'Error al procesar la imagen subida.' });
      }
      next();
    });
  };
};

module.exports = {
  uploadProductImage,
  uploadSupportImage,
  uploadProfileMedia,
  uploadCategoryImage,
  uploadBannerImages,
  handleMulterUpload
};
