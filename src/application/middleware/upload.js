/**
 * Middleware: upload
 * Manejador de subida de imágenes con multer para productos, categorías, soporte y banners
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
  const allowedExts = /\.(jpg|jpeg|png|webp|gif|svg|bmp|avif|heic|jfif)$/i;
  const isImageMime = file.mimetype && (file.mimetype.startsWith('image/') || file.mimetype === 'application/octet-stream');
  const isImageExt = allowedExts.test(file.originalname || '');
  if (isImageMime || isImageExt) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes (JPEG, PNG, WEBP, GIF, SVG, AVIF)'));
  }
};

const productStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, productsUploadDir),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-z0-9.\-_]/gi, '_').toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${safeName}`);
  }
});

const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, profilesUploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const field = file.fieldname || 'media';
    cb(null, `${field}_${Date.now()}_${Math.round(Math.random() * 1e6)}${ext}`);
  }
});

const soporteStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, soporteUploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const name = 'soporte_' + Date.now() + '_' + Math.round(Math.random() * 1e6) + ext;
    cb(null, name);
  }
});

const categoryStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, categoriesUploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const safeName = path.basename(file.originalname, ext).replace(/[^a-z0-9.\-_]/gi, '_').toLowerCase();
    cb(null, `cat_${Date.now()}_${safeName}${ext}`);
  }
});

const bannerStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, bannersUploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const field = file.fieldname || 'banner';
    const safeName = path.basename(file.originalname, ext).replace(/[^a-z0-9.\-_]/gi, '_').toLowerCase();
    cb(null, `${field}_${Date.now()}_${safeName}${ext}`);
  }
});

const uploadProductImage = multer({
  storage: productStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

const uploadProfileMedia = multer({
  storage: profileStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

const uploadSupportImage = multer({
  storage: soporteStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

const uploadCategoryImage = multer({
  storage: categoryStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

const uploadBannerImages = multer({
  storage: bannerStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
}).fields([
  { name: 'categoria_thumb', maxCount: 1 },
  { name: 'imagen_fondo', maxCount: 1 },
  { name: 'tarjeta_imagen', maxCount: 1 }
]);

module.exports = {
  uploadProductImage,
  uploadSupportImage,
  uploadProfileMedia,
  uploadCategoryImage,
  uploadBannerImages
};
