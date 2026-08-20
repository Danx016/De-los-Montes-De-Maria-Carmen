/**
 * Utilidad de compresión y optimización de imágenes para dispositivos móviles y web
 * Permite que fotos pesadas tomadas desde la cámara del celular (10MB-30MB)
 * se optimicen automáticamente en el navegador antes de enviarse al servidor.
 */

export async function compressImage(file, maxDimension = 1920, quality = 0.85) {
  if (!file) return file;

  // Si no es imagen estándar o es SVG/GIF animado, devolver el archivo original
  if (
    file.type === 'image/svg+xml' ||
    file.type === 'image/gif' ||
    (!file.type.startsWith('image/') && !/\.(jpg|jpeg|png|webp|heic|heif|jfif)$/i.test(file.name || ''))
  ) {
    return file;
  }

  return new Promise((resolve) => {
    try {
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        const img = new Image();
        img.onload = () => {
          try {
            let { width, height } = img;

            // Redimensionar manteniendo proporción si excede la dimensión máxima
            if (width > maxDimension || height > maxDimension) {
              if (width > height) {
                height = Math.round((height * maxDimension) / width);
                width = maxDimension;
              } else {
                width = Math.round((width * maxDimension) / height);
                height = maxDimension;
              }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
              return resolve(file);
            }

            // Fondo blanco en caso de transparencias en JPG
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  return resolve(file);
                }

                // Generar nombre seguro con extensión .jpg
                const baseName = (file.name || 'foto_producto')
                  .replace(/\.[^/.]+$/, '')
                  .replace(/[^a-zA-Z0-9_-]/g, '_');
                const compressedFile = new File([blob], `${baseName}.jpg`, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });

                resolve(compressedFile);
              },
              'image/jpeg',
              quality
            );
          } catch (err) {
            console.warn('Error durante el procesamiento del canvas:', err);
            resolve(file);
          }
        };

        img.onerror = () => {
          resolve(file);
        };

        img.src = readerEvent.target?.result;
      };

      reader.onerror = () => {
        resolve(file);
      };

      reader.readAsDataURL(file);
    } catch (e) {
      console.warn('Error al comprimir imagen en cliente:', e);
      resolve(file);
    }
  });
}
