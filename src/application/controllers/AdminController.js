/**
 * Controlador: AdminController
 * Maneja panel administrativo: usuarios, métricas, productos, categorías y órdenes
 * mediante adaptadores de repositorios y casos de uso en Arquitectura Hexagonal.
 */
const GetAdminStats = require('../../domain/use-cases/admin/GetAdminStats');
const ManageUsersAdmin = require('../../domain/use-cases/admin/ManageUsersAdmin');
const ProcessAdminAIChat = require('../../domain/use-cases/admin/ProcessAdminAIChat');
const Producto = require('../../domain/entities/Producto');
const Usuario = require('../../domain/entities/Usuario');

class AdminController {
  constructor({ usuarioRepository, productoRepository, compraRepository, categoriaRepository, emailService, iaService }) {
    this.usuarioRepository = usuarioRepository;
    this.productoRepository = productoRepository;
    this.compraRepository = compraRepository;
    this.categoriaRepository = categoriaRepository;
    this.emailService = emailService;
    this.iaService = iaService;
    this.getAdminStats = new GetAdminStats(compraRepository);
    this.manageUsersAdmin = new ManageUsersAdmin(usuarioRepository, emailService);
    this.processAdminAIChat = new ProcessAdminAIChat(iaService, {
      usuarioRepository,
      productoRepository,
      compraRepository
    });
  }

  async obtenerEstadisticas(req, res) {
    try {
      const stats = await this.getAdminStats.execute();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener estadísticas del programa.' });
    }
  }

  async listarUsuarios(req, res) {
    try {
      const users = await this.manageUsersAdmin.listar();
      res.json(users.map(u => u.toJSON()));
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener usuarios' });
    }
  }

  async obtenerUsuarioPorId(req, res) {
    try {
      const user = await this.manageUsersAdmin.obtenerPorId(req.params.id_usuario);
      res.json(user.toJSON());
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  }

  async actualizarUsuario(req, res) {
    try {
      const idUsuario = req.params.id_usuario;
      const { nombre, apodo, correo, telefono, direccion, estado, id_rol, contrasena } = req.body;
      const updated = await this.manageUsersAdmin.actualizar(idUsuario, {
        nombre,
        apodo,
        correo,
        telefono,
        direccion,
        estado,
        id_rol,
        contrasena
      });
      res.json(updated.toJSON());
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async crearUsuario(req, res) {
    try {
      const { nombre, apodo, correo, contrasena, id_rol, telefono, direccion } = req.body;
      if (!correo || !contrasena) {
        return res.status(400).json({ error: 'Correo y contraseña son requeridos para registrar al usuario.' });
      }
      const existing = await this.usuarioRepository.buscarPorCorreo(correo);
      if (existing) {
        return res.status(400).json({ error: 'Ya existe un usuario con este correo electrónico.' });
      }
      const nuevoUsuario = new Usuario({
        nombre: nombre || 'Usuario',
        apodo: apodo || (correo.split('@')[0] + Math.floor(Math.random() * 100)),
        correo,
        telefono: telefono || null,
        direccion: direccion || null,
        id_rol: id_rol ? parseInt(id_rol, 10) : 3,
        estado: 'activo'
      });
      const created = await this.usuarioRepository.crear(nuevoUsuario, contrasena);
      res.status(201).json(created.toJSON());
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async eliminarUsuario(req, res) {
    try {
      const idUsuario = req.params.id_usuario;
      const adminId = req.user.id;
      const result = await this.manageUsersAdmin.eliminar(idUsuario, adminId);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async listarComprasGlobales(req, res) {
    try {
      const compras = await this.compraRepository.listarTodas();
      res.json(compras);
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener historial global de compras' });
    }
  }

  async eliminarCompra(req, res) {
    try {
      const idCompra = req.params.id_compra;
      await this.compraRepository.eliminar(idCompra);
      res.json({ success: true, message: 'Compra eliminada por el administrador.' });
    } catch (error) {
      res.status(500).json({ error: 'Error al eliminar la compra' });
    }
  }

  // --- Gestión Global de Inventario (Admin) ---
  async listarProductosGlobal(req, res) {
    try {
      const productos = await this.productoRepository.listarTodos();
      const usuarios = await this.usuarioRepository.listarTodos();
      const userMap = {};
      if (Array.isArray(usuarios)) {
        usuarios.forEach(u => {
          userMap[u.id_usuario] = u.nombre || u.apodo;
        });
      }

      const enriched = productos.map(p => {
        const json = typeof p.toJSON === 'function' ? p.toJSON() : p;
        json.vendedor_nombre = userMap[json.id_vendedor] || userMap[json.id_proveedor] || 'Administrador / Sin asignar';
        return json;
      });

      res.json(enriched);
    } catch (error) {
      console.error('Error al listar inventario global:', error);
      res.status(500).json({ error: 'Error al listar inventario global' });
    }
  }

  async crearProducto(req, res) {
    try {
      const { nombre, nombre_producto, descripcion, precio, stock, categoria, id_categoria, unidad_medida, id_vendedor, origen, presentacion, cuidado } = req.body;
      const nombreFinal = nombre || nombre_producto;
      if (!nombreFinal || !nombreFinal.trim()) {
        return res.status(400).json({ error: 'El nombre del producto es obligatorio.' });
      }

      let imagen = req.file ? req.file.filename : (req.body.imagen || null);
      const vendorId = (id_vendedor && id_vendedor !== '' && id_vendedor !== 'null') ? parseInt(id_vendedor, 10) : (req.user?.id || 1);

      const prod = new Producto({
        id_vendedor: vendorId,
        id_proveedor: vendorId,
        nombre_producto: nombreFinal.trim(),
        descripcion: descripcion || '',
        precio: parseFloat(precio) || 0,
        stock: parseInt(stock, 10) || 0,
        unidad_medida: unidad_medida || 'Unidad',
        categoria: categoria || 'General',
        id_categoria: id_categoria || null,
        origen: origen || 'Montes de María, Colombia',
        presentacion: presentacion || 'Empaque fresco de finca',
        cuidado: cuidado || 'Conservar en lugar fresco y seco',
        imagen: imagen,
        disponibilidad: 1
      });

      const nuevo = await this.productoRepository.crear(prod);
      res.status(201).json({ success: true, message: 'Producto registrado en el inventario global con éxito.', producto: nuevo });
    } catch (error) {
      console.error('Error al crear producto admin:', error);
      res.status(500).json({ error: 'Error al crear el producto' });
    }
  }

  async actualizarProducto(req, res) {
    try {
      const idProducto = req.params.id_producto;
      const { nombre, nombre_producto, descripcion, precio, stock, categoria, id_categoria, unidad_medida, id_vendedor, origen, presentacion, cuidado } = req.body;
      const updateData = {};

      const nombreFinal = nombre || nombre_producto;
      if (nombreFinal) updateData.nombre_producto = nombreFinal.trim();
      if (descripcion !== undefined) updateData.descripcion = descripcion;
      if (precio !== undefined) updateData.precio = parseFloat(precio);
      if (stock !== undefined) updateData.stock = parseInt(stock, 10);
      if (categoria !== undefined) updateData.categoria = categoria;
      if (id_categoria !== undefined) updateData.id_categoria = id_categoria;
      if (unidad_medida !== undefined) updateData.unidad_medida = unidad_medida;
      if (origen !== undefined) updateData.origen = origen;
      if (presentacion !== undefined) updateData.presentacion = presentacion;
      if (cuidado !== undefined) updateData.cuidado = cuidado;
      if (id_vendedor !== undefined) {
        const parsedVendor = (id_vendedor === '' || id_vendedor === 'null' || id_vendedor === null) ? null : parseInt(id_vendedor, 10);
        updateData.id_vendedor = parsedVendor;
        updateData.id_proveedor = parsedVendor;
      }

      if (req.file) {
        updateData.imagen = req.file.filename;
      } else if (req.body.imagen !== undefined) {
        updateData.imagen = req.body.imagen;
      }

      const actualizado = await this.productoRepository.actualizar(idProducto, updateData);
      res.json({ success: true, message: 'Producto actualizado con éxito.', producto: actualizado });
    } catch (error) {
      console.error('Error al actualizar producto admin:', error);
      res.status(500).json({ error: 'Error al actualizar el producto' });
    }
  }

  async eliminarProducto(req, res) {
    try {
      const idProducto = req.params.id_producto;
      await this.productoRepository.eliminar(idProducto);
      res.json({ success: true, message: 'Producto eliminado del inventario global con éxito.' });
    } catch (error) {
      res.status(500).json({ error: 'Error al eliminar el producto' });
    }
  }

  // --- Gestión de Categorías (Admin) ---
  async listarCategorias(req, res) {
    try {
      if (!this.categoriaRepository) {
        return res.json([]);
      }
      const categorias = await this.categoriaRepository.obtenerTodas();
      res.json(categorias || []);
    } catch (error) {
      console.error('Error al obtener categorías:', error);
      res.status(500).json({ error: 'Error al obtener categorías' });
    }
  }

  async crearCategoria(req, res) {
    try {
      const { nombre_categoria, descripcion, slug, icono, color } = req.body;
      if (!nombre_categoria || !nombre_categoria.trim()) {
        return res.status(400).json({ error: 'El nombre de la categoría es obligatorio.' });
      }

      const safeSlug = (slug || nombre_categoria)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      let imagen = req.file ? req.file.filename : (req.body.imagen || null);

      const nueva = await this.categoriaRepository.crear({
        nombre_categoria: nombre_categoria.trim(),
        descripcion: descripcion || null,
        slug: safeSlug,
        imagen,
        icono: icono || 'fa-box',
        color: color || '#2e7d32'
      });

      res.status(201).json({
        ...nueva,
        message: 'Categoría agregada exitosamente.'
      });
    } catch (error) {
      console.error('Error en crearCategoria:', error);
      res.status(400).json({ error: 'Error al crear la categoría. Verifica que no exista duplicada.' });
    }
  }

  async actualizarCategoria(req, res) {
    try {
      const idCategoria = req.params.id_categoria;
      const { nombre_categoria, descripcion, slug, icono, color } = req.body;

      if (!nombre_categoria || !nombre_categoria.trim()) {
        return res.status(400).json({ error: 'El nombre de la categoría es obligatorio.' });
      }

      const safeSlug = (slug || nombre_categoria)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      const updateData = {
        nombre_categoria: nombre_categoria.trim(),
        descripcion: descripcion || null,
        slug: safeSlug,
        icono: icono || 'fa-box',
        color: color || '#2e7d32'
      };

      if (req.file) {
        updateData.imagen = req.file.filename;
      } else if (req.body.imagen !== undefined) {
        updateData.imagen = req.body.imagen;
      }

      await this.categoriaRepository.actualizar(idCategoria, updateData);
      res.json({
        success: true,
        message: 'Categoría actualizada exitosamente.'
      });
    } catch (error) {
      console.error('Error en actualizarCategoria:', error);
      res.status(400).json({ error: 'Error al actualizar categoría.' });
    }
  }

  async eliminarCategoria(req, res) {
    try {
      const idCategoria = req.params.id_categoria;
      await this.categoriaRepository.eliminar(idCategoria);
      res.json({ success: true, message: 'Categoría eliminada con éxito.' });
    } catch (error) {
      console.error('Error al eliminar categoría:', error);
      res.status(500).json({ error: 'Error al eliminar categoría' });
    }
  }

  async chatIA(req, res) {
    try {
      const { prompt, history } = req.body;
      const adminUserId = req.user ? req.user.id : 1;
      const result = await this.processAdminAIChat.execute(prompt, history || [], adminUserId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = AdminController;
