class BannerController {
  constructor(bannerRepository) {
    this.bannerRepository = bannerRepository;
  }

  // GET /api/banners (Público para la HomePage)
  obtenerBannersPublicos = async (req, res) => {
    try {
      const banners = await this.bannerRepository.obtenerActivos();
      // Parse features if stored as JSON
      const parsed = banners.map(b => {
        let feats = [];
        try {
          feats = typeof b.features === 'string' ? JSON.parse(b.features) : (b.features || []);
        } catch {
          feats = [];
        }
        return {
          ...b,
          features: Array.isArray(feats) ? feats : []
        };
      });
      res.json({ success: true, banners: parsed });
    } catch (err) {
      console.error('Error al obtener banners públicos:', err);
      res.status(500).json({ success: false, message: 'Error al obtener banners del carrusel' });
    }
  };

  // GET /api/admin/banners (Admin: Lista completa)
  obtenerTodosBanners = async (req, res) => {
    try {
      const banners = await this.bannerRepository.obtenerTodos();
      const parsed = banners.map(b => {
        let feats = [];
        try {
          feats = typeof b.features === 'string' ? JSON.parse(b.features) : (b.features || []);
        } catch {
          feats = [];
        }
        return {
          ...b,
          features: Array.isArray(feats) ? feats : []
        };
      });
      res.json({ success: true, banners: parsed });
    } catch (err) {
      console.error('Error al obtener banners para admin:', err);
      res.status(500).json({ success: false, message: 'Error al cargar lista de banners' });
    }
  };

  // POST /api/admin/banners (Admin: Crear banner)
  crearBanner = async (req, res) => {
    try {
      const data = { ...req.body };

      if (!data.titulo || !data.titulo.trim()) {
        return res.status(400).json({ success: false, message: 'El título del banner es obligatorio' });
      }

      // Si se subieron archivos con multer
      if (req.files) {
        if (req.files.categoria_thumb && req.files.categoria_thumb[0]) {
          data.categoria_thumb = `/uploads/banners/${req.files.categoria_thumb[0].filename}`;
        }
        if (req.files.imagen_fondo && req.files.imagen_fondo[0]) {
          data.imagen_fondo = `/uploads/banners/${req.files.imagen_fondo[0].filename}`;
        }
        if (req.files.tarjeta_imagen && req.files.tarjeta_imagen[0]) {
          data.tarjeta_imagen = `/uploads/banners/${req.files.tarjeta_imagen[0].filename}`;
        }
      }

      // Parsear features si viene como string
      if (typeof data.features === 'string') {
        try {
          data.features = JSON.parse(data.features);
        } catch {
          data.features = data.features.split(',').map(f => f.trim()).filter(Boolean);
        }
      }

      const nuevo = await this.bannerRepository.crear(data);
      res.status(201).json({ success: true, message: 'Banner creado exitosamente', banner: nuevo });
    } catch (err) {
      console.error('Error al crear banner:', err);
      res.status(500).json({ success: false, message: 'Error al guardar el banner' });
    }
  };

  // PUT /api/admin/banners/:id (Admin: Actualizar banner)
  actualizarBanner = async (req, res) => {
    try {
      const { id } = req.params;
      const data = { ...req.body };

      if (!data.titulo || !data.titulo.trim()) {
        return res.status(400).json({ success: false, message: 'El título del banner es obligatorio' });
      }

      // Si se subieron archivos con multer
      if (req.files) {
        if (req.files.categoria_thumb && req.files.categoria_thumb[0]) {
          data.categoria_thumb = `/uploads/banners/${req.files.categoria_thumb[0].filename}`;
        }
        if (req.files.imagen_fondo && req.files.imagen_fondo[0]) {
          data.imagen_fondo = `/uploads/banners/${req.files.imagen_fondo[0].filename}`;
        }
        if (req.files.tarjeta_imagen && req.files.tarjeta_imagen[0]) {
          data.tarjeta_imagen = `/uploads/banners/${req.files.tarjeta_imagen[0].filename}`;
        }
      }

      // Parsear features si viene como string
      if (typeof data.features === 'string') {
        try {
          data.features = JSON.parse(data.features);
        } catch {
          data.features = data.features.split(',').map(f => f.trim()).filter(Boolean);
        }
      }

      const actualizado = await this.bannerRepository.actualizar(id, data);
      if (!actualizado) {
        return res.status(404).json({ success: false, message: 'Banner no encontrado' });
      }

      res.json({ success: true, message: 'Banner actualizado exitosamente' });
    } catch (err) {
      console.error('Error al actualizar banner:', err);
      res.status(500).json({ success: false, message: 'Error al actualizar el banner' });
    }
  };

  // DELETE /api/admin/banners/:id (Admin: Eliminar banner)
  eliminarBanner = async (req, res) => {
    try {
      const { id } = req.params;
      const eliminado = await this.bannerRepository.eliminar(id);
      if (!eliminado) {
        return res.status(404).json({ success: false, message: 'Banner no encontrado' });
      }
      res.json({ success: true, message: 'Banner eliminado exitosamente' });
    } catch (err) {
      console.error('Error al eliminar banner:', err);
      res.status(500).json({ success: false, message: 'Error al eliminar el banner' });
    }
  };
}

module.exports = BannerController;
