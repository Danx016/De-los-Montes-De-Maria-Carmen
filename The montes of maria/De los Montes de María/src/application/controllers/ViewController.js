/**
 * Controlador: ViewController
 * Maneja el renderizado de vistas EJS del lado del servidor (SSR)
 */
const CATEGORIAS = {
  semillas: {
    titulo: 'Semillas del Valle',
    descripcion: 'La mejor selección de semillas certificadas para garantizar una cosecha abundante y de alta calidad.',
    icon: 'fa-seedling',
    keywords: ['semilla', 'grano', 'maiz', 'arroz', 'trigo', 'frijol', 'soya']
  },
  lacteos: {
    titulo: 'Lácteos La Finca',
    descripcion: 'Quesos, sueros, yogures y leche fresca directamente de nuestras vacas a tu mesa.',
    icon: 'fa-cow',
    keywords: ['leche', 'queso', 'suero', 'yogur', 'mantequilla', 'lacteo', 'lácteo']
  },
  abonos: {
    titulo: 'Abonos Natura',
    descripcion: 'Fertilizantes y abonos 100% orgánicos para nutrir tu tierra y maximizar tus cosechas.',
    icon: 'fa-leaf',
    keywords: ['abono', 'fertilizante', 'tierra', 'compost', 'urea', 'humus', 'organico', 'orgánico']
  },
  ferre: {
    titulo: 'Ferre Campo',
    descripcion: 'Todo en herramientas manuales, equipos y materiales para el trabajo duro del campo.',
    icon: 'fa-hammer',
    keywords: ['herramienta', 'pala', 'machete', 'rastrillo', 'martillo', 'alambre', 'manguera', 'pico']
  },
  cosechas: {
    titulo: 'Cosechas del Sol',
    descripcion: 'Hortalizas frescas, frutas y legumbres seleccionadas de la más alta calidad, directas del campo.',
    icon: 'fa-wheat-awn',
    keywords: ['fruta', 'verdura', 'hortaliza', 'tomate', 'cebolla', 'papa', 'yuca', 'fresco', 'platano', 'plátano', 'zanahoria']
  },
  agro: {
    titulo: 'AgroEquipos',
    descripcion: 'Maquinaria agrícola, repuestos y tecnología de punta para modernizar y optimizar tu finca.',
    icon: 'fa-tractor',
    keywords: ['tractor', 'maquina', 'máquina', 'motor', 'bomba', 'fumigadora', 'cosechadora']
  }
};

class ViewController {
  constructor({ productoRepository, usuarioRepository }) {
    this.productoRepository = productoRepository;
    this.usuarioRepository = usuarioRepository;
  }

  async inicio(req, res) {
    try {
      const productos = await this.productoRepository.listarTodos();
      res.render('index', { productos: productos.map(p => p.toJSON()) });
    } catch (error) {
      console.error('Error al cargar productos en inicio:', error);
      res.render('index', { productos: [] });
    }
  }

  async categoria(req, res) {
    try {
      const slug = req.params.slug;
      const catInfo = CATEGORIAS[slug];
      if (!catInfo) {
        return res.status(404).render('index', { productos: [] });
      }

      const productos = await this.productoRepository.listarPorCategoria(slug);
      res.render('categoria', { categoria: catInfo, productos: productos.map(p => p.toJSON()) });
    } catch (error) {
      console.error('Error al cargar categoría:', error);
      res.render('categoria', { categoria: {}, productos: [] });
    }
  }

  async buscar(req, res) {
    try {
      const query = (req.query.q || '').trim();
      if (!query) return res.redirect('/');

      const productos = await this.productoRepository.buscar(query);
      res.render('buscar', { query, productos: productos.map(p => p.toJSON()) });
    } catch (error) {
      console.error('Error en búsqueda:', error);
      res.render('buscar', { query: req.query.q || '', productos: [] });
    }
  }

  async adminRegisterPage(req, res) {
    try {
      const adminCount = await this.usuarioRepository.contarAdministradores();
      if (adminCount === 0) {
        return res.render('admin_register');
      }

      const token = req.cookies?.jwt;
      if (!token) return res.redirect('/login');

      const jwt = require('jsonwebtoken');
      const appConfig = require('../../infrastructure/config/app.config');
      try {
        const decoded = jwt.verify(token, appConfig.jwtSecret);
        if (decoded.rol !== 1) return res.redirect('/');
        res.render('admin_register');
      } catch (e) {
        return res.redirect('/login');
      }
    } catch (error) {
      res.redirect('/');
    }
  }

  registro(req, res) { res.render('register'); }
  login(req, res) { res.render('inicio_sesion'); }
  adminLogin(req, res) { res.render('admin_login'); }
  vendedor(req, res) { res.render('vendedor'); }
  recuperar(req, res) { res.render('ovidaste_contrasena'); }

  async admin(req, res) {
    try {
      const productos = await this.productoRepository.listarTodos();
      res.render('admin', { productos: productos.map(p => p.toJSON()) });
    } catch (error) {
      res.render('admin', { productos: [] });
    }
  }

  adminSoporte(req, res) {
    const csrfToken = req.csrfToken ? req.csrfToken() : '';
    res.render('admin_soporte', { csrfToken });
  }

  perfil(req, res) { res.render('perfil'); }
  perfilVendedor(req, res) { res.render('perfil_vendedor'); }
  carrito(req, res) { res.render('carrito'); }
  soporte(req, res) { res.render('soporte'); }
  envio(req, res) { res.render('checkout_envio'); }
  pago(req, res) { res.render('method_pago'); }

  logout(req, res) {
    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https' || req.protocol === 'https';
    res.clearCookie('jwt', {
      path: '/',
      secure: isHttps,
      sameSite: isHttps ? 'none' : 'lax'
    });
    res.redirect('/');
  }
}

module.exports = ViewController;
