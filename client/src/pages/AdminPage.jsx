import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../context/ConfirmContext'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import MediaRenderer from '../components/MediaRenderer'
import HeroSlideRenderer from '../components/HeroSlideRenderer'
import {
  obtenerEstadisticas,
  listarUsuarios,
  crearUsuarioAdmin,
  actualizarUsuario,
  eliminarUsuario,
  listarComprasGlobales,
  eliminarCompra,
  listarProductosAdmin,
  crearProductoAdmin,
  actualizarProductoAdmin,
  eliminarProductoAdmin,
  listarCategoriasAdmin,
  crearCategoriaAdmin,
  actualizarCategoriaAdmin,
  eliminarCategoriaAdmin,
  chatIA,
} from '../api/admin.api'
import {
  listarBannersAdmin,
  crearBannerAdmin,
  actualizarBannerAdmin,
  eliminarBannerAdmin,
} from '../api/banners.api'
import {
  listarCuponesAdmin,
  crearCuponAdmin,
  actualizarCuponAdmin,
  toggleCuponAdmin,
  togglePromocionCuponAdmin,
  eliminarCuponAdmin,
} from '../api/cupones.api'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'

export default function AdminPage() {
  const toast = useToast()
  const confirm = useConfirm()
  const [activeTab, setActiveTab] = useState('stats') // 'stats' | 'usuarios' | 'productos' | 'categorias' | 'compras' | 'ia'
  const [stats, setStats] = useState({ totalVentas: 0, totalUsuarios: 0, totalProductos: 0 })
  const [usuarios, setUsuarios] = useState([])
  const [compras, setCompras] = useState([])
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [cupones, setCupones] = useState([])
  const [loading, setLoading] = useState(true)

  // Modales y Gestión de Cupones
  const [showCreateCouponModal, setShowCreateCouponModal] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState(null)
  const [couponSearch, setCouponSearch] = useState('')
  const [couponForm, setCouponForm] = useState({
    codigo: '',
    descripcion: '',
    descuento_porcentaje: 10,
    descuento_fijo: 0,
    monto_minimo: 0,
    uso_limite: 100,
    fecha_expiracion: '',
    activo: true,
    promocionar_en_barra: false,
    mensaje_promocional: '',
  })
  const [couponSaving, setCouponSaving] = useState(false)
  const [couponError, setCouponError] = useState('')

  // Modales de Usuario
  const [editingUser, setEditingUser] = useState(null)
  const [showCreateUserModal, setShowCreateUserModal] = useState(false)
  const [userForm, setUserForm] = useState({
    nombre: '',
    apodo: '',
    correo: '',
    telefono: '',
    direccion: '',
    id_rol: 3,
    estado: 'activo',
    contrasena: '',
  })
  const [userModalSaving, setUserModalSaving] = useState(false)
  const [userModalError, setUserModalError] = useState('')

  // Filtros de búsqueda en admin
  const [prodSearch, setProdSearch] = useState('')
  const [userSearch, setUserSearch] = useState('')

  // Formulario nueva categoría y Modal
  const [showCreateCatModal, setShowCreateCatModal] = useState(false)
  const [newCat, setNewCat] = useState({
    nombre_categoria: '',
    descripcion: '',
    slug: '',
    icono: 'fa-wheat-awn',
    color: '#16a34a',
  })
  const [catImageFile, setCatImageFile] = useState(null)
  const [catImagePreview, setCatImagePreview] = useState('')
  const [catSaving, setCatSaving] = useState(false)
  const [catMessage, setCatMessage] = useState('')
  const [catError, setCatError] = useState('')

  // Modal Edición de Categoría
  const [editingCat, setEditingCat] = useState(null)
  const [editCatForm, setEditCatForm] = useState({
    nombre_categoria: '',
    slug: '',
    descripcion: '',
    icono: 'fa-wheat-awn',
    color: '#16a34a',
    imagen: '',
  })
  const [editCatImageFile, setEditCatImageFile] = useState(null)
  const [editCatImagePreview, setEditCatImagePreview] = useState('')
  const [editCatSaving, setEditCatSaving] = useState(false)
  const [editCatError, setEditCatError] = useState('')

  // Modales de Producto (Admin Inventario Global)
  const [showCreateProdModal, setShowCreateProdModal] = useState(false)
  const [newProdForm, setNewProdForm] = useState({
    nombre_producto: '',
    descripcion: '',
    precio: '',
    stock: '',
    categoria: '',
    unidad_medida: 'Unidad',
  })
  const [newProdImageFile, setNewProdImageFile] = useState(null)
  const [newProdImagePreview, setNewProdImagePreview] = useState('')
  const [prodSaving, setProdSaving] = useState(false)
  const [prodError, setProdError] = useState('')
  const [prodMessage, setProdMessage] = useState('')

  // Modal Edición de Producto
  const [editingProd, setEditingProd] = useState(null)
  const [editProdForm, setEditProdForm] = useState({
    nombre_producto: '',
    descripcion: '',
    precio: '',
    stock: '',
    categoria: '',
    unidad_medida: 'Unidad',
    imagen: '',
  })
  const [editProdImageFile, setEditProdImageFile] = useState(null)
  const [editProdImagePreview, setEditProdImagePreview] = useState('')
  const [editProdSaving, setEditProdSaving] = useState(false)
  const [editProdError, setEditProdError] = useState('')

  // ── Banners & Hero Carousel CMS ──
  const [banners, setBanners] = useState([])
  const [bannerSearch, setBannerSearch] = useState('')
  const [showBannerModal, setShowBannerModal] = useState(false)
  const [editingBanner, setEditingBanner] = useState(null)
  const [bannerForm, setBannerForm] = useState({
    titulo: '',
    subtitulo: '',
    categoria_nombre: 'Cosechas Frescas',
    categoria_slug: 'cosechas',
    categoria_thumb: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
    imagen_fondo: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=80',
    color_acento: '#22c55e',
    features: ['100% Campo Colombiano Directo', 'Pago 100% Directo al Productor', 'Envíos Seguros a Bolívar y Sucre'],
    boton_principal_texto: 'Explorar Catálogo',
    boton_principal_link: '/catalogo',
    boton_secundario_texto: 'Vender mis Productos',
    boton_secundario_link: '/vendedor',
    tarjeta_badge_top: '🌿 100% Campo',
    tarjeta_imagen: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=600&q=80',
    tarjeta_titulo: 'Ñame Criollo Espino',
    tarjeta_precio: '$6.000 COP / Kilo',
    tarjeta_vendedor_nombre: 'Roberto Carlos Salcedo',
    tarjeta_vendedor_rating: '⭐ 4.9/5 Calidad',
    tarjeta_vendedor_id: 47,
    cupon_codigo: '',
    cupon_texto: '',
    orden: 0,
    activo: 1,
  })
  const [featuresInput, setFeaturesInput] = useState('')
  const [bannerThumbFile, setBannerThumbFile] = useState(null)
  const [bannerThumbPreview, setBannerThumbPreview] = useState('')
  const [bannerBgFile, setBannerBgFile] = useState(null)
  const [bannerBgPreview, setBannerBgPreview] = useState('')
  const [bannerProdImgFile, setBannerProdImgFile] = useState(null)
  const [bannerProdImgPreview, setBannerProdImgPreview] = useState('')
  const [bannerSaving, setBannerSaving] = useState(false)
  const [bannerError, setBannerError] = useState('')
  const [bannerModalTab, setBannerModalTab] = useState('estilo')

  // IA Chat Admin
  const [iaPrompt, setIaPrompt] = useState('')
  const [iaResponses, setIaResponses] = useState([])
  const [iaLoading, setIaLoading] = useState(false)

  // Datos procesados para gráficos
  const [ventasPorMes, setVentasPorMes] = useState([])
  const [distribucionUsuarios, setDistribucionUsuarios] = useState([])

  const COLORS = ['#4CAF50', '#2196F3', '#FFC107', '#FF5722', '#9C27B0']

  const loadData = () => {
    setLoading(true)
    Promise.allSettled([
      obtenerEstadisticas(),
      listarUsuarios(),
      listarComprasGlobales(),
      listarProductosAdmin(),
      listarCategoriasAdmin(),
      listarBannersAdmin(),
      listarCuponesAdmin(),
    ]).then(([stRes, uRes, cRes, pRes, catRes, banRes, cupRes]) => {
      if (stRes.status === 'fulfilled') {
        const statsData = stRes.value.data?.estadisticas || stRes.value.data || {}
        setStats({
          totalVentas: statsData.ingresos || 0,
          totalUsuarios: statsData.usuarios || 0,
          totalProductos: statsData.productos || 0,
          totalCompras: statsData.ventas || 0
        })
      }
      if (uRes.status === 'fulfilled') {
        const usuariosData = uRes.value.data?.usuarios || uRes.value.data || []
        setUsuarios(usuariosData)
        procesarDistribucionUsuarios(usuariosData)
      }
      if (cRes.status === 'fulfilled') {
        const comprasData = cRes.value.data?.compras || cRes.value.data || []
        setCompras(comprasData)
        procesarVentasPorMes(comprasData)
      }
      if (pRes.status === 'fulfilled') {
        setProductos(pRes.value.data || [])
      }
      if (catRes.status === 'fulfilled') {
        setCategorias(catRes.value.data || [])
      }
      if (banRes.status === 'fulfilled') {
        setBanners(banRes.value.data?.banners || [])
      }
      if (cupRes.status === 'fulfilled') {
        setCupones(cupRes.value.data?.cupones || [])
      }
      setLoading(false)
    })
  }

  useEffect(() => {
    loadData()
  }, [])

  // ── Banner Handlers ──
  const handleOpenCreateBanner = () => {
    setEditingBanner(null)
    const defaultCat = categorias && categorias.length > 0 ? categorias[0] : null
    const defaultProd = productos && productos.length > 0 ? productos[0] : null

    const catSlug = defaultCat ? (defaultCat.slug || defaultCat.nombre_categoria?.toLowerCase().replace(/\s+/g, '-')) : 'cosechas'
    const catName = defaultCat ? (defaultCat.nombre_categoria || defaultCat.nombre) : 'Cosechas Frescas'
    const catImg = defaultCat?.imagen ? (defaultCat.imagen.startsWith('http') || defaultCat.imagen.startsWith('/') ? defaultCat.imagen : `/uploads/categories/${defaultCat.imagen}`) : 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80'

    const prodTitle = defaultProd ? (defaultProd.nombre_producto || defaultProd.nombre) : 'Ñame Criollo Espino'
    const prodPrice = defaultProd?.precio ? `$${Number(defaultProd.precio).toLocaleString('es-CO')} COP / ${defaultProd.unidad_medida || 'Kilo'}` : '$6.000 COP / Kilo'
    const prodImg = defaultProd?.imagen ? (defaultProd.imagen.startsWith('http') || defaultProd.imagen.startsWith('/') ? defaultProd.imagen : `/uploads/products/${defaultProd.imagen}`) : 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=600&q=80'
    const vendorName = defaultProd?.origen ? `${defaultProd.origen} • Productor Local` : (defaultProd?.vendedor_nombre || 'Roberto Carlos Salcedo')

    setBannerForm({
      titulo: `Cosechas Frescas: ${prodTitle}`,
      subtitulo: `Directamente desde las parcelas y fincas de los Montes de María a tu mesa.`,
      categoria_nombre: catName,
      categoria_slug: catSlug,
      categoria_thumb: catImg,
      imagen_fondo: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=80',
      color_acento: defaultCat?.color || '#22c55e',
      estilo_plantilla: 'clasico',
      filtro_blur: 0,
      features: ['100% Campo Colombiano Directo', 'Pago 100% Directo al Productor', 'Envíos Seguros a Bolívar y Sucre'],
      boton_principal_texto: 'Explorar Catálogo',
      boton_principal_link: `/categoria/${catSlug}`,
      boton_secundario_texto: 'Vender mis Productos',
      boton_secundario_link: '/vendedor',
      tarjeta_badge_top: '🌿 100% Campo',
      tarjeta_imagen: prodImg,
      tarjeta_titulo: prodTitle,
      tarjeta_precio: prodPrice,
      tarjeta_vendedor_nombre: vendorName,
      tarjeta_vendedor_rating: '⭐ 4.9/5 Calidad',
      tarjeta_vendedor_id: defaultProd?.id_vendedor || 47,
      cupon_codigo: 'CAMPO20',
      cupon_texto: '⚡ ¡Usa el cupón CAMPO20 y obtén 20% OFF en tu compra!',
      orden: banners.length + 1,
      activo: 1,
    })
    setFeaturesInput('100% Campo Colombiano Directo\nPago 100% Directo al Productor\nEnvíos Seguros a Bolívar y Sucre')
    setBannerThumbFile(null)
    setBannerThumbPreview(catImg)
    setBannerBgFile(null)
    setBannerBgPreview('https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=80')
    setBannerProdImgFile(null)
    setBannerProdImgPreview(prodImg)
    setBannerError('')
    setBannerModalTab('estilo')
    setShowBannerModal(true)
  }

  const handleOpenEditBanner = (b) => {
    setEditingBanner(b)
    const feats = Array.isArray(b.features) ? b.features : []
    setBannerForm({
      titulo: b.titulo || '',
      subtitulo: b.subtitulo || '',
      categoria_nombre: b.categoria_nombre || '',
      categoria_slug: b.categoria_slug || '',
      categoria_thumb: b.categoria_thumb || '',
      imagen_fondo: b.imagen_fondo || '',
      color_acento: b.color_acento || '#22c55e',
      estilo_plantilla: b.estilo_plantilla || 'clasico',
      filtro_blur: b.filtro_blur !== undefined ? Number(b.filtro_blur) : 0,
      features: feats,
      boton_principal_texto: b.boton_principal_texto || 'Ver Catálogo',
      boton_principal_link: b.boton_principal_link || '/catalogo',
      boton_secundario_texto: b.boton_secundario_texto || 'Vender mis Productos',
      boton_secundario_link: b.boton_secundario_link || '/vendedor',
      tarjeta_badge_top: b.tarjeta_badge_top || '🌿 100% Campo',
      tarjeta_imagen: b.tarjeta_imagen || '',
      tarjeta_titulo: b.tarjeta_titulo || '',
      tarjeta_precio: b.tarjeta_precio || '$6.000 COP',
      tarjeta_vendedor_nombre: b.tarjeta_vendedor_nombre || 'Roberto Carlos Salcedo',
      tarjeta_vendedor_rating: b.tarjeta_vendedor_rating || '⭐ 4.9/5 Calidad',
      tarjeta_vendedor_id: b.tarjeta_vendedor_id || 47,
      cupon_codigo: b.cupon_codigo || '',
      cupon_texto: b.cupon_texto || '',
      orden: b.orden !== undefined ? b.orden : 0,
      activo: b.activo !== undefined ? b.activo : 1,
    })
    setFeaturesInput(feats.join('\n'))
    setBannerThumbFile(null)
    setBannerThumbPreview(b.categoria_thumb || '')
    setBannerBgFile(null)
    setBannerBgPreview(b.imagen_fondo || '')
    setBannerProdImgFile(null)
    setBannerProdImgPreview(b.tarjeta_imagen || '')
    setBannerError('')
    setBannerModalTab('estilo')
    setShowBannerModal(true)
  }

  const handleSaveBanner = async (e) => {
    e.preventDefault()
    if (!bannerForm.titulo.trim()) {
      setBannerError('El título principal del banner es obligatorio.')
      return
    }
    setBannerSaving(true)
    setBannerError('')

    try {
      const formData = new FormData()
      formData.append('titulo', bannerForm.titulo.trim())
      formData.append('subtitulo', bannerForm.subtitulo.trim())
      formData.append('categoria_nombre', bannerForm.categoria_nombre.trim())
      formData.append('categoria_slug', bannerForm.categoria_slug.trim())
      formData.append('color_acento', bannerForm.color_acento)
      formData.append('estilo_plantilla', bannerForm.estilo_plantilla || 'clasico')
      formData.append('filtro_blur', bannerForm.filtro_blur !== undefined ? bannerForm.filtro_blur : 0)
      formData.append('boton_principal_texto', bannerForm.boton_principal_texto.trim())
      formData.append('boton_principal_link', bannerForm.boton_principal_link.trim())
      formData.append('boton_secundario_texto', bannerForm.boton_secundario_texto.trim())
      formData.append('boton_secundario_link', bannerForm.boton_secundario_link.trim())
      formData.append('tarjeta_badge_top', bannerForm.tarjeta_badge_top.trim())
      formData.append('tarjeta_titulo', bannerForm.tarjeta_titulo.trim())
      formData.append('tarjeta_precio', bannerForm.tarjeta_precio.trim())
      formData.append('tarjeta_vendedor_nombre', bannerForm.tarjeta_vendedor_nombre.trim())
      formData.append('tarjeta_vendedor_rating', bannerForm.tarjeta_vendedor_rating.trim())
      formData.append('tarjeta_vendedor_id', bannerForm.tarjeta_vendedor_id || 47)
      formData.append('cupon_codigo', bannerForm.cupon_codigo ? bannerForm.cupon_codigo.trim() : '')
      formData.append('cupon_texto', bannerForm.cupon_texto ? bannerForm.cupon_texto.trim() : '')
      formData.append('orden', bannerForm.orden || 0)
      formData.append('activo', bannerForm.activo !== undefined ? bannerForm.activo : 1)

      const featsArray = featuresInput
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean)
      formData.append('features', JSON.stringify(featsArray))

      if (bannerThumbFile) {
        formData.append('categoria_thumb', bannerThumbFile)
      } else if (bannerForm.categoria_thumb) {
        formData.append('categoria_thumb', bannerForm.categoria_thumb)
      }

      if (bannerBgFile) {
        formData.append('imagen_fondo', bannerBgFile)
      } else if (bannerForm.imagen_fondo) {
        formData.append('imagen_fondo', bannerForm.imagen_fondo)
      }

      if (bannerProdImgFile) {
        formData.append('tarjeta_imagen', bannerProdImgFile)
      } else if (bannerForm.tarjeta_imagen) {
        formData.append('tarjeta_imagen', bannerForm.tarjeta_imagen)
      }

      if (editingBanner) {
        await actualizarBannerAdmin(editingBanner.id_banner, formData)
        toast.success('¡Banner actualizado exitosamente!')
      } else {
        await crearBannerAdmin(formData)
        toast.success('¡Nuevo banner creado exitosamente!')
      }

      setShowBannerModal(false)
      const res = await listarBannersAdmin()
      setBanners(res.data?.banners || [])
    } catch (err) {
      setBannerError(err.response?.data?.message || err.response?.data?.error || 'Error al guardar el banner.')
    } finally {
      setBannerSaving(false)
    }
  }

  const handleDeleteBanner = async (id, titulo) => {
    const ok = await confirm({
      title: '¿Eliminar Banner del Carrusel?',
      message: `¿Estás seguro de eliminar el banner "${titulo}"? Dejará de mostrarse en la página de inicio.`,
      confirmText: 'Sí, Eliminar',
      type: 'danger',
    })
    if (!ok) return

    try {
      await eliminarBannerAdmin(id)
      toast.success('Banner eliminado correctamente')
      const res = await listarBannersAdmin()
      setBanners(res.data?.banners || [])
    } catch {
      toast.error('Error al eliminar el banner')
    }
  }

  const handleToggleBannerActivo = async (b) => {
    try {
      const formData = new FormData()
      formData.append('titulo', b.titulo)
      formData.append('subtitulo', b.subtitulo || '')
      formData.append('activo', b.activo === 1 ? 0 : 1)
      await actualizarBannerAdmin(b.id_banner, formData)
      toast.success(b.activo === 1 ? 'Banner desactivado' : 'Banner activado en el carrusel')
      const res = await listarBannersAdmin()
      setBanners(res.data?.banners || [])
    } catch {
      toast.error('Error al cambiar estado del banner')
    }
  }

  // Procesar datos para gráficos
  const procesarVentasPorMes = (comprasData) => {
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    const ventasMes = meses.map((mes, index) => {
      const total = comprasData
        .filter(c => {
          const fecha = new Date(c.fecha || Date.now())
          return fecha.getMonth() === index
        })
        .reduce((sum, c) => sum + (parseFloat(c.total) || 0), 0)
      
      return { mes, ventas: total }
    })
    setVentasPorMes(ventasMes)
  }

  const procesarDistribucionUsuarios = (usuariosData) => {
    const distribucion = [
      { name: 'Administradores', value: usuariosData.filter(u => u.id_rol === 1 || u.rol === 1).length },
      { name: 'Vendedores', value: usuariosData.filter(u => u.id_rol === 2 || u.rol === 2).length },
      { name: 'Clientes', value: usuariosData.filter(u => u.id_rol === 3 || u.rol === 3).length },
      { name: 'Soporte', value: usuariosData.filter(u => u.id_rol === 4 || u.rol === 4).length },
    ]
    setDistribucionUsuarios(distribucion.filter(d => d.value > 0))
  }

  useEffect(() => {
    loadData()
  }, [])

  // ── Gestor de Cupones Handlers ──
  const handleGenerateRandomCoupon = (customPct) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let rand = ''
    for (let i = 0; i < 4; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    const pct = customPct !== undefined ? customPct : (couponForm.descuento_porcentaje || 10)
    const prefixes = ['MONTES', 'CAMPO', 'FINCA', 'COSECHA', 'AGRO']
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)]
    const code = `${randomPrefix}${pct}-${rand}`
    setCouponForm((prev) => ({
      ...prev,
      codigo: code,
      descuento_porcentaje: pct,
    }))
  }

  const handleOpenCreateCoupon = () => {
    setEditingCoupon(null)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let rand = ''
    for (let i = 0; i < 4; i++) rand += chars.charAt(Math.floor(Math.random() * chars.length))
    setCouponForm({
      codigo: `MONTES10-${rand}`,
      descripcion: 'Cupón de descuento especial',
      descuento_porcentaje: 10,
      descuento_fijo: 0,
      monto_minimo: 0,
      uso_limite: 100,
      fecha_expiracion: '',
      activo: true,
      promocionar_en_barra: false,
      mensaje_promocional: '🔥 ¡Temporada de Cosecha! Usa este cupón y obtén un descuento especial',
    })
    setCouponError('')
    setShowCreateCouponModal(true)
  }

  const handleOpenEditCoupon = (c) => {
    setEditingCoupon(c)
    setCouponForm({
      codigo: c.codigo || '',
      descripcion: c.descripcion || '',
      descuento_porcentaje: Number(c.descuento_porcentaje || 0),
      descuento_fijo: Number(c.descuento_fijo || 0),
      monto_minimo: Number(c.monto_minimo || 0),
      uso_limite: c.uso_limite === null ? '' : c.uso_limite,
      fecha_expiracion: c.fecha_expiracion ? c.fecha_expiracion.slice(0, 10) : '',
      activo: c.activo === 1 || c.activo === true,
      promocionar_en_barra: c.promocionar_en_barra === 1 || c.promocionar_en_barra === true,
      mensaje_promocional: c.mensaje_promocional || '',
    })
    setCouponError('')
    setShowCreateCouponModal(true)
  }

  const handleSaveCoupon = async (e) => {
    e.preventDefault()
    if (!couponForm.codigo || !couponForm.codigo.trim()) {
      setCouponError('El código del cupón es obligatorio.')
      return
    }
    setCouponSaving(true)
    setCouponError('')
    try {
      const payload = {
        codigo: couponForm.codigo.trim().toUpperCase(),
        descripcion: couponForm.descripcion.trim(),
        descuento_porcentaje: Number(couponForm.descuento_porcentaje || 0),
        descuento_fijo: Number(couponForm.descuento_fijo || 0),
        monto_minimo: Number(couponForm.monto_minimo || 0),
        uso_limite: couponForm.uso_limite === '' ? null : Number(couponForm.uso_limite),
        fecha_expiracion: couponForm.fecha_expiracion || null,
        activo: couponForm.activo ? 1 : 0,
        promocionar_en_barra: couponForm.promocionar_en_barra ? 1 : 0,
        mensaje_promocional: couponForm.mensaje_promocional ? couponForm.mensaje_promocional.trim() : null,
      }

      if (editingCoupon) {
        const id = editingCoupon.id_cupon || editingCoupon.id
        const res = await actualizarCuponAdmin(id, payload)
        toast.success(res.data?.mensaje || '¡Cupón actualizado con éxito!')
      } else {
        const res = await crearCuponAdmin(payload)
        toast.success(res.data?.mensaje || '¡Cupón creado exitosamente!')
      }

      setShowCreateCouponModal(false)
      setEditingCoupon(null)
      const resList = await listarCuponesAdmin()
      setCupones(resList.data?.cupones || [])
    } catch (err) {
      setCouponError(err.response?.data?.error || 'Error al guardar el cupón.')
    } finally {
      setCouponSaving(false)
    }
  }

  const handleToggleCoupon = async (c) => {
    try {
      const id = c.id_cupon || c.id
      const res = await toggleCuponAdmin(id)
      setCupones((prev) =>
        prev.map((item) => ((item.id_cupon || item.id) === id ? { ...item, activo: item.activo === 1 ? 0 : 1 } : item))
      )
      toast.success(res.data?.mensaje || 'Estado del cupón actualizado.')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al cambiar estado del cupón.')
    }
  }

  const handleTogglePromoCoupon = async (c) => {
    try {
      const id = c.id_cupon || c.id
      const res = await togglePromocionCuponAdmin(id)
      setCupones((prev) =>
        prev.map((item) =>
          (item.id_cupon || item.id) === id
            ? { ...item, promocionar_en_barra: item.promocionar_en_barra === 1 ? 0 : 1 }
            : item
        )
      )
      toast.success(res.data?.mensaje || 'Estado de promoción en barra actualizado.')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al cambiar estado de promoción.')
    }
  }

  const handleDeleteCoupon = async (c) => {
    const ok = await confirm({
      title: '¿Eliminar Cupón?',
      message: `¿Estás seguro de eliminar permanentemente el cupón "${c.codigo}"?`,
      danger: true,
    })
    if (!ok) return
    try {
      const id = c.id_cupon || c.id
      await eliminarCuponAdmin(id)
      setCupones((prev) => prev.filter((item) => (item.id_cupon || item.id) !== id))
      toast.success('Cupón eliminado correctamente.')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al eliminar cupón.')
    }
  }

  const handleCopyCoupon = (codigo) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(codigo)
      toast.success(`¡Cupón "${codigo}" copiado al portapapeles!`)
    } else {
      toast.info(`Código: ${codigo}`)
    }
  }

  // Acciones Usuarios
  const handleDeleteUser = async (id, nombre) => {
    const ok = await confirm({
      title: `¿Eliminar usuario?`,
      message: `Se eliminará permanentemente a "${nombre || id}" de la plataforma.`,
      danger: true,
    })
    if (!ok) return
    try {
      await eliminarUsuario(id)
      setUsuarios((prev) => prev.filter((u) => (u.id_usuario || u.id) !== id))
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al eliminar usuario.')
    }
  }

  const handleOpenEditUser = (u) => {
    setEditingUser(u)
    setUserForm({
      nombre: u.nombre || '',
      apodo: u.apodo || '',
      correo: u.correo || '',
      telefono: u.telefono || '',
      direccion: u.direccion || '',
      id_rol: u.id_rol || u.rol || 3,
      estado: u.estado || 'activo',
      contrasena: '',
    })
    setUserModalError('')
  }

  const handleSaveEditUser = async (e) => {
    e.preventDefault()
    if (!editingUser) return
    setUserModalSaving(true)
    setUserModalError('')
    try {
      const id = editingUser.id_usuario || editingUser.id
      const payload = { ...userForm }
      if (!payload.contrasena || payload.contrasena.trim() === '') {
        delete payload.contrasena
      }
      const res = await actualizarUsuario(id, payload)
      const updated = res.data?.usuario || res.data
      setUsuarios((prev) =>
        prev.map((u) =>
          ((u.id_usuario || u.id) === id ? { ...u, ...updated, ...payload, rol: payload.id_rol } : u)
        )
      )
      setEditingUser(null)
    } catch (err) {
      setUserModalError(err.response?.data?.error || err.response?.data?.message || 'Error al actualizar los datos del usuario.')
    } finally {
      setUserModalSaving(false)
    }
  }

  const handleOpenCreateUser = () => {
    setUserForm({
      nombre: '',
      apodo: '',
      correo: '',
      telefono: '',
      direccion: '',
      id_rol: 3,
      estado: 'activo',
      contrasena: '',
    })
    setUserModalError('')
    setShowCreateUserModal(true)
  }

  const handleSaveCreateUser = async (e) => {
    e.preventDefault()
    if (!userForm.correo || !userForm.contrasena) {
      setUserModalError('El correo y la contraseña son obligatorios.')
      return
    }
    setUserModalSaving(true)
    setUserModalError('')
    try {
      const res = await crearUsuarioAdmin(userForm)
      const created = res.data?.usuario || res.data
      setUsuarios((prev) => [created, ...prev])
      setShowCreateUserModal(false)
    } catch (err) {
      setUserModalError(err.response?.data?.error || err.response?.data?.message || 'Error al crear el usuario.')
    } finally {
      setUserModalSaving(false)
    }
  }

  const handleChangeRole = async (id, newRol) => {
    try {
      await actualizarUsuario(id, { id_rol: Number(newRol) })
      setUsuarios((prev) =>
        prev.map((u) => ((u.id_usuario || u.id) === id ? { ...u, id_rol: Number(newRol), rol: Number(newRol) } : u))
      )
    } catch {
      toast.error('Error al cambiar rol.')
    }
  }

  // Acciones Compras
  const handleDeleteOrder = async (id) => {
    const ok = await confirm({
      title: '¿Eliminar registro de compra?',
      message: 'Esta acción no se puede deshacer.',
      danger: true,
    })
    if (!ok) return
    try {
      await eliminarCompra(id)
      setCompras((prev) => prev.filter((c) => (c.id_compra || c.id) !== id))
    } catch {
      toast.error('Error al eliminar compra.')
    }
  }

  // Acciones Productos (Admin puede borrar cualquier producto)
  const handleDeleteProduct = async (id, nombre) => {
    const ok = await confirm({
      title: '¿Eliminar producto?',
      message: `Se eliminará "${nombre}" del catálogo global. Esta acción no se puede deshacer.`,
      danger: true,
    })
    if (!ok) return
    try {
      await eliminarProductoAdmin(id)
      setProductos((prev) => prev.filter((p) => (p.id_producto || p.id) !== id))
      toast.success('Producto eliminado correctamente del catálogo global.')
    } catch {
      toast.error('Error al eliminar el producto.')
    }
  }

  // Acciones Categorías (Admin puede crear, editar y borrar categorías con datos reales)
  const handleCatImageChange = (e, isEdit = false) => {
    const file = e.target.files[0]
    if (!file) return
    if (isEdit) {
      setEditCatImageFile(file)
      setEditCatImagePreview(URL.createObjectURL(file))
    } else {
      setCatImageFile(file)
      setCatImagePreview(URL.createObjectURL(file))
    }
  }

  const handleOpenCreateCategory = () => {
    setNewCat({
      nombre_categoria: '',
      descripcion: '',
      slug: '',
      icono: 'fa-wheat-awn',
      color: '#16a34a'
    })
    setCatImageFile(null)
    setCatImagePreview('')
    setCatError('')
    setShowCreateCatModal(true)
  }

  const handleCreateCategory = async (e) => {
    e.preventDefault()
    if (!newCat.nombre_categoria.trim()) return
    setCatSaving(true)
    setCatMessage('')
    setCatError('')

    try {
      const formData = new FormData()
      formData.append('nombre_categoria', newCat.nombre_categoria.trim())
      formData.append('slug', newCat.slug.trim())
      formData.append('descripcion', newCat.descripcion.trim())
      formData.append('icono', newCat.icono || 'fa-wheat-awn')
      formData.append('color', newCat.color || '#16a34a')
      if (catImageFile) {
        formData.append('imagen', catImageFile)
      } else if (newCat.imagen) {
        formData.append('imagen', newCat.imagen)
      }

      await crearCategoriaAdmin(formData)
      setCatMessage('¡Categoría creada exitosamente en la base de datos!')
      setShowCreateCatModal(false)
      setNewCat({
        nombre_categoria: '',
        descripcion: '',
        slug: '',
        icono: 'fa-wheat-awn',
        color: '#16a34a',
        imagen: '',
      })
      setCatImageFile(null)
      setCatImagePreview('')
      
      const res = await listarCategoriasAdmin()
      setCategorias(res.data || [])
    } catch (err) {
      setCatError(err.response?.data?.error || 'Error al crear categoría.')
    } finally {
      setCatSaving(false)
    }
  }

  const handleOpenEditCategory = (cat) => {
    setEditingCat(cat)
    const isCodeOrUrl = cat.imagen && (cat.imagen.startsWith('<') || cat.imagen.startsWith('http'))
    setEditCatForm({
      nombre_categoria: cat.nombre_categoria || '',
      slug: cat.slug || '',
      descripcion: cat.descripcion || '',
      icono: cat.icono || 'fa-wheat-awn',
      color: cat.color || '#16a34a',
      imagen: isCodeOrUrl ? cat.imagen : ''
    })
    setEditCatImageFile(null)
    setEditCatImagePreview(cat.imagen || '')
    setEditCatError('')
  }

  const handleSaveEditCategory = async (e) => {
    e.preventDefault()
    if (!editCatForm.nombre_categoria.trim()) return
    setEditCatSaving(true)
    setEditCatError('')

    try {
      const id = editingCat.id_categoria || editingCat.id
      const formData = new FormData()
      formData.append('nombre_categoria', editCatForm.nombre_categoria.trim())
      formData.append('slug', editCatForm.slug.trim())
      formData.append('descripcion', editCatForm.descripcion.trim())
      formData.append('icono', editCatForm.icono || 'fa-wheat-awn')
      formData.append('color', editCatForm.color || '#16a34a')
      if (editCatImageFile) {
        formData.append('imagen', editCatImageFile)
      } else if (editCatForm.imagen) {
        formData.append('imagen', editCatForm.imagen)
      }

      await actualizarCategoriaAdmin(id, formData)
      setCatMessage('¡Categoría actualizada exitosamente!')
      setEditingCat(null)
      
      const res = await listarCategoriasAdmin()
      setCategorias(res.data || [])
    } catch (err) {
      setEditCatError(err.response?.data?.error || 'Error al actualizar categoría.')
    } finally {
      setEditCatSaving(false)
    }
  }

  const handleDeleteCategory = async (id, nombre) => {
    const ok = await confirm({
      title: '¿Eliminar categoría?',
      message: `Se eliminará "${nombre}" de la base de datos. Esta acción no se puede deshacer.`,
      danger: true,
    })
    if (!ok) return
    try {
      await eliminarCategoriaAdmin(id)
      setCategorias((prev) => prev.filter((c) => (c.id_categoria || c.id) !== id))
      setCatMessage(`Categoría "${nombre}" eliminada con éxito.`)
    } catch {
      toast.error('Error al eliminar la categoría.')
    }
  }

  // --- Handlers de Productos Admin ---
  const handleOpenCreateProduct = () => {
    setNewProdForm({
      nombre_producto: '',
      descripcion: '',
      precio: '',
      stock: '',
      categoria: categorias.length > 0 ? (categorias[0].slug || categorias[0].nombre_categoria) : 'cosechas',
      unidad_medida: 'Kg',
      imagen: '',
    })
    setNewProdImageFile(null)
    setNewProdImagePreview('')
    setProdError('')
    setShowCreateProdModal(true)
  }

  const handleOpenEditProduct = (prod) => {
    setEditingProd(prod)
    const isCodeOrUrl = prod.imagen && (prod.imagen.startsWith('<') || prod.imagen.startsWith('http'))
    setEditProdForm({
      nombre_producto: prod.nombre_producto || prod.nombre || '',
      descripcion: prod.descripcion || '',
      precio: prod.precio !== undefined ? prod.precio : '',
      stock: prod.stock !== undefined ? prod.stock : '',
      categoria: prod.categoria || (categorias.length > 0 ? (categorias[0].slug || categorias[0].nombre_categoria) : ''),
      unidad_medida: prod.unidad_medida || 'Unidad',
      imagen: isCodeOrUrl ? prod.imagen : '',
    })
    setEditProdImageFile(null)
    setEditProdImagePreview(prod.imagen || '')
    setEditProdError('')
  }

  const handleProdImageChange = (e, isEditing = false) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (isEditing) {
      setEditProdImageFile(file)
      setEditProdImagePreview(URL.createObjectURL(file))
      setEditProdForm((prev) => ({ ...prev, imagen: '' }))
    } else {
      setNewProdImageFile(file)
      setNewProdImagePreview(URL.createObjectURL(file))
      setNewProdForm((prev) => ({ ...prev, imagen: '' }))
    }
  }

  const handleCreateProduct = async (e) => {
    e.preventDefault()
    if (!newProdForm.nombre_producto.trim()) return
    setProdSaving(true)
    setProdError('')

    try {
      const formData = new FormData()
      formData.append('nombre_producto', newProdForm.nombre_producto.trim())
      formData.append('descripcion', newProdForm.descripcion.trim())
      formData.append('precio', newProdForm.precio)
      formData.append('stock', newProdForm.stock)
      formData.append('categoria', newProdForm.categoria)
      formData.append('unidad_medida', newProdForm.unidad_medida)
      if (newProdImageFile) {
        formData.append('imagen', newProdImageFile)
      } else if (newProdForm.imagen) {
        formData.append('imagen', newProdForm.imagen)
      }

      await crearProductoAdmin(formData)
      setProdMessage('¡Producto registrado con éxito en el inventario!')
      setShowCreateProdModal(false)
      
      const res = await listarProductosAdmin()
      setProductos(res.data?.productos || res.data || [])
    } catch (err) {
      setProdError(err.response?.data?.error || err.response?.data?.message || 'Error al crear producto.')
    } finally {
      setProdSaving(false)
    }
  }

  const handleSaveEditProduct = async (e) => {
    e.preventDefault()
    if (!editProdForm.nombre_producto.trim()) return
    setEditProdSaving(true)
    setEditProdError('')

    try {
      const id = editingProd.id_producto || editingProd.id
      const formData = new FormData()
      formData.append('nombre_producto', editProdForm.nombre_producto.trim())
      formData.append('descripcion', editProdForm.descripcion.trim())
      formData.append('precio', editProdForm.precio)
      formData.append('stock', editProdForm.stock)
      formData.append('categoria', editProdForm.categoria)
      formData.append('unidad_medida', editProdForm.unidad_medida)
      if (editProdImageFile) {
        formData.append('imagen', editProdImageFile)
      } else if (editProdForm.imagen !== undefined) {
        formData.append('imagen', editProdForm.imagen)
      }

      await actualizarProductoAdmin(id, formData)
      setProdMessage('¡Producto actualizado exitosamente!')
      setEditingProd(null)
      
      const res = await listarProductosAdmin()
      setProductos(res.data?.productos || res.data || [])
    } catch (err) {
      setEditProdError(err.response?.data?.error || err.response?.data?.message || 'Error al actualizar producto.')
    } finally {
      setEditProdSaving(false)
    }
  }

  // IA Chat
  const handleSendIAChat = async (e) => {
    e.preventDefault()
    if (!iaPrompt.trim() || iaLoading) return
    const p = iaPrompt.trim()
    setIaPrompt('')
    setIaResponses((prev) => [...prev, { role: 'user', text: p }])
    setIaLoading(true)

    try {
      const res = await chatIA({ prompt: p })
      setIaResponses((prev) => [...prev, { role: 'assistant', text: res.data?.respuesta || 'Sin respuesta generada.' }])
    } catch (err) {
      setIaResponses((prev) => [
        ...prev,
        { role: 'assistant', text: 'Error al consultar con el asistente IA.' },
      ])
    } finally {
      setIaLoading(false)
    }
  }

  const formatCOP = (val) =>
    Number(val || 0).toLocaleString('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    })

  // Filtros reactivos
  const filteredProducts = productos.filter((p) => {
    const q = prodSearch.toLowerCase()
    return (
      !q ||
      (p.nombre_producto && p.nombre_producto.toLowerCase().includes(q)) ||
      (p.categoria && p.categoria.toLowerCase().includes(q)) ||
      (p.vendedor_nombre && p.vendedor_nombre.toLowerCase().includes(q))
    )
  })

  const filteredUsers = usuarios.filter((u) => {
    const q = userSearch.toLowerCase()
    return (
      !q ||
      (u.nombre && u.nombre.toLowerCase().includes(q)) ||
      (u.correo && u.correo.toLowerCase().includes(q)) ||
      (u.apodo && u.apodo.toLowerCase().includes(q))
    )
  })

  return (
    <>
      <Navbar />

      <main className="main-content">
        <div className="app-container">
          <div className="admin-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <span className="badge badge-primary">🛡️ Panel Super Administrador</span>
              <h1 style={{ margin: '0.25rem 0' }}>Centro de Control y Gestión Global</h1>
              <p className="text-muted" style={{ margin: 0 }}>Supervisa métricas, inventario de todos los vendedores, categorías, usuarios y ventas.</p>
            </div>
            <Link to="/admin/soporte" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, padding: '0.75rem 1.25rem' }}>
              <i className="fa fa-headset" /> Mesa de Ayuda & Soporte en Vivo
            </Link>
          </div>

          {/* Admin Tabs */}
          <div className="profile-tabs" style={{ marginTop: '1.5rem' }}>
            <button
              className={`profile-tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
              onClick={() => setActiveTab('stats')}
            >
              <i className="fa fa-chart-line" /> Métricas & Resumen
            </button>
            <button
              className={`profile-tab-btn ${activeTab === 'productos' ? 'active' : ''}`}
              onClick={() => setActiveTab('productos')}
            >
              <i className="fa fa-boxes" /> Inventario Global ({productos.length})
            </button>
            <button
              className={`profile-tab-btn ${activeTab === 'categorias' ? 'active' : ''}`}
              onClick={() => setActiveTab('categorias')}
            >
              <i className="fa fa-tags" /> Categorías ({categorias.length})
            </button>
            <button
              className={`profile-tab-btn ${activeTab === 'banners' ? 'active' : ''}`}
              onClick={() => setActiveTab('banners')}
            >
              <i className="fa fa-images" /> Banners & Carrusel ({banners.length})
            </button>
            <button
              className={`profile-tab-btn ${activeTab === 'cupones' ? 'active' : ''}`}
              onClick={() => setActiveTab('cupones')}
            >
              <i className="fa fa-ticket-alt" /> Cupones ({cupones.length})
            </button>
            <button
              className={`profile-tab-btn ${activeTab === 'usuarios' ? 'active' : ''}`}
              onClick={() => setActiveTab('usuarios')}
            >
              <i className="fa fa-users" /> Usuarios ({usuarios.length})
            </button>
            <button
              className={`profile-tab-btn ${activeTab === 'compras' ? 'active' : ''}`}
              onClick={() => setActiveTab('compras')}
            >
              <i className="fa fa-shopping-bag" /> Compras Globales ({compras.length})
            </button>
            <Link
              to="/admin/soporte"
              className="profile-tab-btn"
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <i className="fa fa-headset text-primary" /> Mesa de Ayuda & Chat
            </Link>
            <button
              className={`profile-tab-btn ${activeTab === 'ia' ? 'active' : ''}`}
              onClick={() => setActiveTab('ia')}
            >
              <i className="fa fa-robot" /> Asistente IA
            </button>
          </div>

          {/* Tab 1: Stats */}
          {activeTab === 'stats' && (
            <div className="fade-in" style={{ marginTop: '1.5rem' }}>
              <div className="stats-cards-grid">
                <div className="card stat-card">
                  <div className="stat-card-icon stat-green"><i className="fa fa-chart-line" /></div>
                  <div className="stat-card-info">
                    <span>Ventas Totales</span>
                    <h3>{formatCOP(stats.totalVentas || 0)}</h3>
                  </div>
                </div>

                <div className="card stat-card">
                  <div className="stat-card-icon stat-blue"><i className="fa fa-users" /></div>
                  <div className="stat-card-info">
                    <span>Usuarios Registrados</span>
                    <h3>{usuarios.length || stats.totalUsuarios || 0}</h3>
                  </div>
                </div>

                <div className="card stat-card">
                  <div className="stat-card-icon stat-amber"><i className="fa fa-boxes" /></div>
                  <div className="stat-card-info">
                    <span>Productos en Catálogo</span>
                    <h3>{productos.length || stats.totalProductos || 0}</h3>
                  </div>
                </div>

                <div className="card stat-card">
                  <div className="stat-card-icon stat-purple"><i className="fa fa-shopping-bag" /></div>
                  <div className="stat-card-info">
                    <span>Órdenes Completadas</span>
                    <h3>{compras.length || stats.totalCompras || 0}</h3>
                  </div>
                </div>
              </div>

              {/* Charts Section */}
              <div className="charts-grid" style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
                <div className="card">
                  <h3>Ventas por Mes (COP)</h3>
                  <div style={{ width: '100%', height: 300, marginTop: '1rem' }}>
                    <ResponsiveContainer>
                      <BarChart data={ventasPorMes}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="mes" />
                        <YAxis />
                        <Tooltip formatter={(val) => formatCOP(val)} />
                        <Bar dataKey="ventas" fill="#2e7d32" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="card">
                  <h3>Distribución de Roles de Usuarios</h3>
                  <div style={{ width: '100%', height: 300, marginTop: '1rem' }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={distribucionUsuarios}
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {distribucionUsuarios.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Inventario Global (Admin puede registrar, editar y borrar cualquier producto) */}
          {activeTab === 'productos' && (
            <div className="card fade-in" style={{ marginTop: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ margin: 0 }}>Inventario Global de la Plataforma ({filteredProducts.length})</h3>
                  <p className="text-muted" style={{ margin: '0.35rem 0 0 0' }}>
                    Supervisa, edita precios, existencias y fotos o registra nuevos productos para el mercado campesino.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative', width: '240px' }}>
                    <input
                      type="text"
                      placeholder="Buscar por nombre, categoría..."
                      value={prodSearch}
                      onChange={(e) => setProdSearch(e.target.value)}
                      className="form-input form-input-sm"
                    />
                  </div>
                  <button onClick={handleOpenCreateProduct} className="btn btn-primary btn-sm">
                    <i className="fa fa-plus-circle" /> Registrar Producto
                  </button>
                </div>
              </div>

              {prodMessage && <div className="alert alert-success"><i className="fa fa-check-circle" /> {prodMessage}</div>}
              {prodError && <div className="alert alert-danger"><i className="fa fa-exclamation-circle" /> {prodError}</div>}

              {loading ? (
                <div className="loading-screen"><div className="spinner" /></div>
              ) : filteredProducts.length > 0 ? (
                <div className="orders-table-wrapper" style={{ marginTop: '1rem' }}>
                  <table className="orders-table">
                    <thead>
                      <tr>
                        <th>Imagen</th>
                        <th>Producto</th>
                        <th>Vendedor / Dueño</th>
                        <th>Categoría</th>
                        <th>Precio</th>
                        <th>Stock</th>
                        <th style={{ textAlign: 'right' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((prod) => {
                        const img = prod.imagen?.startsWith('http')
                          ? prod.imagen
                          : prod.imagen
                          ? (prod.imagen.startsWith('/') ? prod.imagen : `/uploads/products/${prod.imagen}`)
                          : '/img/Logo.jpg'

                        return (
                          <tr key={prod.id_producto || prod.id}>
                            <td>
                              <div style={{ width: '48px', height: '48px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <MediaRenderer
                                  src={prod.imagen}
                                  alt={prod.nombre_producto || prod.nombre}
                                  type="product"
                                />
                              </div>
                            </td>
                            <td>
                              <strong>{prod.nombre_producto || prod.nombre}</strong>
                              {prod.descripcion && <p className="table-desc">{prod.descripcion.slice(0, 50)}...</p>}
                            </td>
                            <td>
                              <span className="badge badge-info">
                                <i className="fa fa-user" /> {prod.vendedor_nombre || `Vendedor #${prod.id_vendedor || '1'}`}
                              </span>
                            </td>
                            <td>
                              <span className="badge badge-primary">{prod.categoria || 'General'}</span>
                            </td>
                            <td><strong>{formatCOP(prod.precio)}</strong></td>
                            <td>
                              <span className={`badge ${prod.stock > 5 ? 'badge-success' : prod.stock > 0 ? 'badge-warning' : 'badge-danger'}`}>
                                {prod.stock} disp.
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                                <button
                                  onClick={() => handleOpenEditProduct(prod)}
                                  className="btn btn-outline-primary btn-sm"
                                  title="Editar producto"
                                >
                                  <i className="fa fa-edit" /> Editar
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(prod.id_producto || prod.id, prod.nombre_producto || prod.nombre)}
                                  className="btn btn-danger btn-sm"
                                  title="Eliminar producto"
                                >
                                  <i className="fa fa-trash-alt" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <i className="fa fa-box-open empty-state-icon" />
                  <h4>No se encontraron productos</h4>
                  <p>No hay productos en el inventario global que coincidan con la búsqueda.</p>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Gestión de Categorías (Admin puede crear, editar y borrar categorías con datos reales e imágenes) */}
          {activeTab === 'categorias' && (
            <div className="card fade-in" style={{ marginTop: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ margin: 0 }}>Gestión de Categorías del Mercado Campesino ({categorias.length})</h3>
                  <p className="text-muted" style={{ margin: '0.35rem 0 0 0' }}>
                    Administra, clasifica y personaliza las categorías con fotos reales y colores para todo el catálogo.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <button onClick={handleOpenCreateCategory} className="btn btn-primary btn-sm">
                    <i className="fa fa-plus-circle" /> Registrar Categoría
                  </button>
                </div>
              </div>

              {catMessage && <div className="alert alert-success"><i className="fa fa-check-circle" /> {catMessage}</div>}
              {catError && <div className="alert alert-danger"><i className="fa fa-exclamation-circle" /> {catError}</div>}

              {/* Lista de Categorías Existentes */}
              <div className="orders-table-wrapper" style={{ marginTop: '1rem' }}>
                <table className="orders-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Imagen</th>
                      <th>Nombre & Icono</th>
                      <th>Slug (URL)</th>
                      <th>Descripción</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categorias.map((cat) => {
                      const img = cat.imagen?.startsWith('http')
                        ? cat.imagen
                        : cat.imagen
                        ? (cat.imagen.startsWith('/') ? cat.imagen : `/uploads/categories/${cat.imagen}`)
                        : null

                      return (
                        <tr key={cat.id_categoria || cat.id}>
                          <td><strong>#{cat.id_categoria || cat.id}</strong></td>
                          <td>
                            <div
                              style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                border: '1px solid var(--border-color)',
                                backgroundColor: `${cat.color || '#2e7d32'}15`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <MediaRenderer
                                src={cat.imagen}
                                alt={cat.nombre_categoria}
                                icon={cat.icono || 'fa-box'}
                                color={cat.color || '#2e7d32'}
                                type="category"
                              />
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  width: '12px',
                                  height: '12px',
                                  borderRadius: '50%',
                                  backgroundColor: cat.color || '#2e7d32',
                                }}
                              />
                              <strong>{cat.nombre_categoria}</strong>
                            </div>
                          </td>
                          <td><code>{cat.slug || cat.nombre_categoria?.toLowerCase()}</code></td>
                          <td><p className="table-desc">{cat.descripcion || 'Sin descripción'}</p></td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              <button
                                onClick={() => handleOpenEditCategory(cat)}
                                className="btn btn-warning btn-sm"
                                title="Editar categoría"
                              >
                                <i className="fa fa-edit" /> Editar
                              </button>
                              <button
                                onClick={() => handleDeleteCategory(cat.id_categoria || cat.id, cat.nombre_categoria)}
                                className="btn btn-danger btn-sm"
                                title="Eliminar categoría"
                              >
                                <i className="fa fa-trash-alt" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 4: Usuarios */}
          {activeTab === 'usuarios' && (
            <div className="card fade-in" style={{ marginTop: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <h3>Gestión Integral de Usuarios ({filteredUsers.length})</h3>
                  <p className="text-muted">Administra perfiles completos, cambia contraseñas, edita correos, datos personales y permisos.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative', width: '240px' }}>
                    <input
                      type="text"
                      placeholder="Buscar por nombre, correo, @apodo..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="form-input form-input-sm"
                    />
                  </div>
                  <button onClick={handleOpenCreateUser} className="btn btn-primary btn-sm">
                    <i className="fa fa-user-plus" /> Registrar Usuario
                  </button>
                </div>
              </div>

              <div className="orders-table-wrapper">
                <table className="orders-table">
                  <thead>
                    <tr>
                      <th>Usuario</th>
                      <th>Correo</th>
                      <th>Username</th>
                      <th>Teléfono</th>
                      <th>Rol</th>
                      <th>Estado</th>
                      <th style={{ textAlign: 'right' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => {
                      const uId = u.id_usuario || u.id
                      const roleName = u.id_rol === 1 || u.rol === 1 ? 'Administrador' : u.id_rol === 2 || u.rol === 2 ? 'Vendedor' : u.id_rol === 4 || u.rol === 4 ? 'Soporte' : 'Cliente'
                      const roleBadge = u.id_rol === 1 || u.rol === 1 ? 'badge-primary' : u.id_rol === 2 || u.rol === 2 ? 'badge-success' : u.id_rol === 4 || u.rol === 4 ? 'badge-info' : 'badge-warning'
                      const isActive = (u.estado || 'activo') === 'activo'

                      return (
                        <tr key={uId}>
                          <td>
                            <strong>{u.nombre}</strong>
                          </td>
                          <td>{u.correo}</td>
                          <td><code>@{u.apodo || 'sin_apodo'}</code></td>
                          <td>{u.telefono || '—'}</td>
                          <td>
                            <span className={`badge ${roleBadge}`}>{roleName}</span>
                          </td>
                          <td>
                            <span className={`badge ${isActive ? 'badge-success' : 'badge-danger'}`}>
                              {isActive ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="table-actions-row" style={{ justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => handleOpenEditUser(u)}
                                className="btn btn-outline-primary btn-sm"
                                title="Editar todos los datos del usuario"
                              >
                                <i className="fa fa-user-edit" /> Editar
                              </button>
                              <button
                                onClick={() => handleDeleteUser(uId, u.nombre)}
                                className="btn-icon-danger"
                                title="Eliminar usuario"
                              >
                                <i className="fa fa-trash-alt" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Modal Edición de Usuario Completo */}
          {editingUser && (
            <div className="modal-overlay fade-in" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
              <div className="modal-content card" style={{ maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', borderRadius: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                  <h3 style={{ margin: 0 }}>
                    <i className="fa fa-user-edit text-primary" /> Editar Usuario: {editingUser.nombre}
                  </h3>
                  <button onClick={() => setEditingUser(null)} className="btn-icon">
                    <i className="fa fa-times" />
                  </button>
                </div>

                {userModalError && (
                  <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
                    <i className="fa fa-exclamation-circle" /> {userModalError}
                  </div>
                )}

                <form onSubmit={handleSaveEditUser}>
                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Nombre Completo *</label>
                      <input
                        type="text"
                        required
                        value={userForm.nombre}
                        onChange={(e) => setUserForm({ ...userForm, nombre: e.target.value })}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Apodo / Username *</label>
                      <input
                        type="text"
                        required
                        value={userForm.apodo}
                        onChange={(e) => setUserForm({ ...userForm, apodo: e.target.value })}
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginTop: '0.75rem' }}>
                    <label className="form-label">Correo Electrónico *</label>
                    <input
                      type="email"
                      required
                      value={userForm.correo}
                      onChange={(e) => setUserForm({ ...userForm, correo: e.target.value })}
                      className="form-input"
                    />
                  </div>

                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label">Rol del Usuario</label>
                      <select
                        value={userForm.id_rol}
                        onChange={(e) => setUserForm({ ...userForm, id_rol: Number(e.target.value) })}
                        className="form-select"
                      >
                        <option value="1">🛡️ Administrador</option>
                        <option value="2">🌾 Vendedor Campesino</option>
                        <option value="3">🛒 Comprador / Cliente</option>
                        <option value="4">🎧 Soporte Técnico</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Estado de la Cuenta</label>
                      <select
                        value={userForm.estado}
                        onChange={(e) => setUserForm({ ...userForm, estado: e.target.value })}
                        className="form-select"
                      >
                        <option value="activo">🟢 Activo</option>
                        <option value="inactivo">🔴 Inactivo / Suspendido</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label">Teléfono</label>
                      <input
                        type="text"
                        placeholder="Ej: 3001234567"
                        value={userForm.telefono}
                        onChange={(e) => setUserForm({ ...userForm, telefono: e.target.value })}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Dirección / Finca</label>
                      <input
                        type="text"
                        placeholder="Ej: Finca Las Flores, Vereda El Carmen"
                        value={userForm.direccion}
                        onChange={(e) => setUserForm({ ...userForm, direccion: e.target.value })}
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginTop: '0.75rem', background: 'var(--bg-alt)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>
                      <i className="fa fa-key text-primary" /> Cambiar Contraseña (Opcional)
                    </label>
                    <input
                      type="password"
                      placeholder="Dejar en blanco para mantener la contraseña actual"
                      value={userForm.contrasena}
                      onChange={(e) => setUserForm({ ...userForm, contrasena: e.target.value })}
                      className="form-input"
                    />
                    <small className="text-muted">Si ingresas una contraseña aquí, el sistema actualizará y cifrará la clave del usuario.</small>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                    <button type="button" onClick={() => setEditingUser(null)} className="btn btn-secondary">
                      Cancelar
                    </button>
                    <button type="submit" disabled={userModalSaving} className="btn btn-primary">
                      {userModalSaving ? <><i className="fa fa-spinner fa-spin" /> Guardando...</> : <><i className="fa fa-save" /> Guardar Cambios</>}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal Crear Nuevo Usuario */}
          {showCreateUserModal && (
            <div className="modal-overlay fade-in" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
              <div className="modal-content card" style={{ maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', borderRadius: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                  <h3 style={{ margin: 0 }}>
                    <i className="fa fa-user-plus text-primary" /> Registrar Nuevo Usuario
                  </h3>
                  <button onClick={() => setShowCreateUserModal(false)} className="btn-icon">
                    <i className="fa fa-times" />
                  </button>
                </div>

                {userModalError && (
                  <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
                    <i className="fa fa-exclamation-circle" /> {userModalError}
                  </div>
                )}

                <form onSubmit={handleSaveCreateUser}>
                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Nombre Completo *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Pedro Pérez"
                        value={userForm.nombre}
                        onChange={(e) => setUserForm({ ...userForm, nombre: e.target.value })}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Apodo / Username (Opcional)</label>
                      <input
                        type="text"
                        placeholder="Ej: pedrop"
                        value={userForm.apodo}
                        onChange={(e) => setUserForm({ ...userForm, apodo: e.target.value })}
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label">Correo Electrónico *</label>
                      <input
                        type="email"
                        required
                        placeholder="ejemplo@correo.com"
                        value={userForm.correo}
                        onChange={(e) => setUserForm({ ...userForm, correo: e.target.value })}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Contraseña Inicial *</label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={userForm.contrasena}
                        onChange={(e) => setUserForm({ ...userForm, contrasena: e.target.value })}
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label">Rol Inicial</label>
                      <select
                        value={userForm.id_rol}
                        onChange={(e) => setUserForm({ ...userForm, id_rol: Number(e.target.value) })}
                        className="form-select"
                      >
                        <option value="3">🛒 Comprador / Cliente</option>
                        <option value="2">🌾 Vendedor Campesino</option>
                        <option value="1">🛡️ Administrador</option>
                        <option value="4">🎧 Soporte Técnico</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Teléfono</label>
                      <input
                        type="text"
                        placeholder="Ej: 3001234567"
                        value={userForm.telefono}
                        onChange={(e) => setUserForm({ ...userForm, telefono: e.target.value })}
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginTop: '0.75rem' }}>
                    <label className="form-label">Dirección</label>
                    <input
                      type="text"
                      placeholder="Ej: San Juan Nepomuceno, Bolívar"
                      value={userForm.direccion}
                      onChange={(e) => setUserForm({ ...userForm, direccion: e.target.value })}
                      className="form-input"
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                    <button type="button" onClick={() => setShowCreateUserModal(false)} className="btn btn-secondary">
                      Cancelar
                    </button>
                    <button type="submit" disabled={userModalSaving} className="btn btn-primary">
                      {userModalSaving ? <><i className="fa fa-spinner fa-spin" /> Registrando...</> : <><i className="fa fa-user-plus" /> Crear Usuario</>}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal Registrar Nuevo Producto */}
          {showCreateProdModal && (
            <div className="modal-overlay fade-in" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
              <div className="modal-content card" style={{ maxWidth: '640px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', borderRadius: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                  <h3 style={{ margin: 0 }}>
                    <i className="fa fa-box text-primary" /> Registrar Nuevo Producto en el Inventario
                  </h3>
                  <button onClick={() => setShowCreateProdModal(false)} className="btn-icon">
                    <i className="fa fa-times" />
                  </button>
                </div>

                {prodError && (
                  <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
                    <i className="fa fa-exclamation-circle" /> {prodError}
                  </div>
                )}

                <form onSubmit={handleCreateProduct}>
                  <div className="form-group">
                    <label className="form-label">Nombre del Producto *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Ñame Espino Seleccionado 1Kg"
                      value={newProdForm.nombre_producto}
                      onChange={(e) => setNewProdForm({ ...newProdForm, nombre_producto: e.target.value })}
                      className="form-input"
                    />
                  </div>

                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label">Categoría *</label>
                      <select
                        value={newProdForm.categoria}
                        onChange={(e) => setNewProdForm({ ...newProdForm, categoria: e.target.value })}
                        className="form-select"
                        required
                      >
                        {categorias.map((cat) => (
                          <option key={cat.id_categoria || cat.slug} value={cat.slug || cat.nombre_categoria.toLowerCase()}>
                            {cat.nombre_categoria}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Unidad de Medida</label>
                      <select
                        value={newProdForm.unidad_medida}
                        onChange={(e) => setNewProdForm({ ...newProdForm, unidad_medida: e.target.value })}
                        className="form-select"
                      >
                        <option value="Kg">Kg (Kilogramo)</option>
                        <option value="Libra">Libra (500g)</option>
                        <option value="Unidad">Unidad / Pieza</option>
                        <option value="Litro">Litro / Botella</option>
                        <option value="Bulto">Bulto / Saco</option>
                        <option value="Atado">Atado / Racimo</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label">Precio en Pesos (COP) *</label>
                      <input
                        type="number"
                        required
                        min="0"
                        placeholder="Ej: 15000"
                        value={newProdForm.precio}
                        onChange={(e) => setNewProdForm({ ...newProdForm, precio: e.target.value })}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Stock Disponible *</label>
                      <input
                        type="number"
                        required
                        min="0"
                        placeholder="Ej: 50"
                        value={newProdForm.stock}
                        onChange={(e) => setNewProdForm({ ...newProdForm, stock: e.target.value })}
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginTop: '0.75rem' }}>
                    <label className="form-label">Descripción</label>
                    <textarea
                      rows="2"
                      placeholder="Descripción detallada del producto, calidad y origen..."
                      value={newProdForm.descripcion}
                      onChange={(e) => setNewProdForm({ ...newProdForm, descripcion: e.target.value })}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group" style={{ marginTop: '0.75rem' }}>
                    <label className="form-label">
                      <i className="fa fa-image text-primary" /> Foto del Producto
                    </label>
                    <input
                      type="file"
                      accept="image/*,.svg"
                      onChange={(e) => handleProdImageChange(e, false)}
                      className="form-input"
                      style={{ padding: '0.45rem' }}
                    />

                    {newProdImagePreview && (
                      <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem', background: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <MediaRenderer
                            src={newProdImagePreview}
                            alt="Vista previa"
                            type="product"
                          />
                        </div>
                        <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                          Vista previa de la imagen seleccionada
                        </span>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                    <button type="button" onClick={() => setShowCreateProdModal(false)} className="btn btn-secondary">
                      Cancelar
                    </button>
                    <button type="submit" disabled={prodSaving} className="btn btn-primary">
                      {prodSaving ? <><i className="fa fa-spinner fa-spin" /> Guardando...</> : <><i className="fa fa-plus-circle" /> Registrar Producto</>}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal Editar Producto */}
          {editingProd && (
            <div className="modal-overlay fade-in" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
              <div className="modal-content card" style={{ maxWidth: '640px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', borderRadius: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                  <h3 style={{ margin: 0 }}>
                    <i className="fa fa-edit text-warning" /> Editar Producto: {editingProd.nombre_producto || editingProd.nombre}
                  </h3>
                  <button onClick={() => setEditingProd(null)} className="btn-icon">
                    <i className="fa fa-times" />
                  </button>
                </div>

                {editProdError && (
                  <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
                    <i className="fa fa-exclamation-circle" /> {editProdError}
                  </div>
                )}

                <form onSubmit={handleSaveEditProduct}>
                  <div className="form-group">
                    <label className="form-label">Nombre del Producto *</label>
                    <input
                      type="text"
                      required
                      value={editProdForm.nombre_producto}
                      onChange={(e) => setEditProdForm({ ...editProdForm, nombre_producto: e.target.value })}
                      className="form-input"
                    />
                  </div>

                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label">Categoría *</label>
                      <select
                        value={editProdForm.categoria}
                        onChange={(e) => setEditProdForm({ ...editProdForm, categoria: e.target.value })}
                        className="form-select"
                        required
                      >
                        {categorias.map((cat) => (
                          <option key={cat.id_categoria || cat.slug} value={cat.slug || cat.nombre_categoria.toLowerCase()}>
                            {cat.nombre_categoria}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Unidad de Medida</label>
                      <select
                        value={editProdForm.unidad_medida}
                        onChange={(e) => setEditProdForm({ ...editProdForm, unidad_medida: e.target.value })}
                        className="form-select"
                      >
                        <option value="Kg">Kg (Kilogramo)</option>
                        <option value="Libra">Libra (500g)</option>
                        <option value="Unidad">Unidad / Pieza</option>
                        <option value="Litro">Litro / Botella</option>
                        <option value="Bulto">Bulto / Saco</option>
                        <option value="Atado">Atado / Racimo</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label">Precio en Pesos (COP) *</label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={editProdForm.precio}
                        onChange={(e) => setEditProdForm({ ...editProdForm, precio: e.target.value })}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Stock Disponible *</label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={editProdForm.stock}
                        onChange={(e) => setEditProdForm({ ...editProdForm, stock: e.target.value })}
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginTop: '0.75rem' }}>
                    <label className="form-label">Descripción</label>
                    <textarea
                      rows="2"
                      value={editProdForm.descripcion}
                      onChange={(e) => setEditProdForm({ ...editProdForm, descripcion: e.target.value })}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group" style={{ marginTop: '0.75rem' }}>
                    <label className="form-label">
                      <i className="fa fa-image text-primary" /> Cambiar Foto del Producto
                    </label>
                    <input
                      type="file"
                      accept="image/*,.svg"
                      onChange={(e) => handleProdImageChange(e, true)}
                      className="form-input"
                      style={{ padding: '0.45rem' }}
                    />

                    <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem', background: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div style={{ width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <MediaRenderer
                          src={editProdImageFile ? editProdImagePreview : (editProdForm.imagen || editingProd?.imagen)}
                          alt="Vista previa"
                          type="product"
                        />
                      </div>
                      <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                        Foto actual / nueva seleccionada
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                    <button type="button" onClick={() => setEditingProd(null)} className="btn btn-secondary">
                      Cancelar
                    </button>
                    <button type="submit" disabled={editProdSaving} className="btn btn-primary">
                      {editProdSaving ? <><i className="fa fa-spinner fa-spin" /> Guardando...</> : <><i className="fa fa-save" /> Guardar Cambios</>}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal Registrar Nueva Categoría */}
          {showCreateCatModal && (
            <div className="modal-overlay fade-in" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
              <div className="modal-content card" style={{ maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', borderRadius: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                  <h3 style={{ margin: 0 }}>
                    <i className="fa fa-layer-group text-primary" /> Registrar Nueva Categoría
                  </h3>
                  <button onClick={() => setShowCreateCatModal(false)} className="btn-icon">
                    <i className="fa fa-times" />
                  </button>
                </div>

                {catError && (
                  <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
                    <i className="fa fa-exclamation-circle" /> {catError}
                  </div>
                )}

                <form onSubmit={handleCreateCategory}>
                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Nombre de Categoría *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Miel y Derivados"
                        value={newCat.nombre_categoria}
                        onChange={(e) => setNewCat({ ...newCat, nombre_categoria: e.target.value })}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Slug / Identificador</label>
                      <input
                        type="text"
                        placeholder="Ej: miel-derivados"
                        value={newCat.slug}
                        onChange={(e) => setNewCat({ ...newCat, slug: e.target.value })}
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginTop: '0.75rem' }}>
                    <label className="form-label">Color Temático</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="color"
                        value={newCat.color}
                        onChange={(e) => setNewCat({ ...newCat, color: e.target.value })}
                        style={{ width: '45px', height: '38px', padding: '2px', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer' }}
                      />
                      <input
                        type="text"
                        value={newCat.color}
                        onChange={(e) => setNewCat({ ...newCat, color: e.target.value })}
                        className="form-input"
                        style={{ flex: 1 }}
                        placeholder="#16a34a"
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginTop: '0.75rem' }}>
                    <label className="form-label">Descripción</label>
                    <textarea
                      rows="2"
                      placeholder="Descripción de la categoría para el mercado..."
                      value={newCat.descripcion}
                      onChange={(e) => setNewCat({ ...newCat, descripcion: e.target.value })}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group" style={{ marginTop: '0.75rem' }}>
                    <label className="form-label">
                      <i className="fa fa-image text-primary" /> Imagen / Logo de la Categoría
                    </label>
                    <input
                      type="file"
                      accept="image/*,.svg"
                      onChange={(e) => handleCatImageChange(e, false)}
                      className="form-input"
                      style={{ padding: '0.45rem' }}
                    />

                    {catImagePreview && (
                      <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem', background: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', backgroundColor: `${newCat.color || '#2e7d32'}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <MediaRenderer
                            src={catImagePreview}
                            alt="Vista previa"
                            color={newCat.color}
                            type="category"
                          />
                        </div>
                        <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                          Vista previa de la imagen seleccionada
                        </span>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                    <button type="button" onClick={() => setShowCreateCatModal(false)} className="btn btn-secondary">
                      Cancelar
                    </button>
                    <button type="submit" disabled={catSaving} className="btn btn-primary">
                      {catSaving ? <><i className="fa fa-spinner fa-spin" /> Guardando...</> : <><i className="fa fa-plus-circle" /> Crear Categoría Real</>}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal Editar Categoría */}
          {editingCat && (
            <div className="modal-overlay fade-in" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
              <div className="modal-content card" style={{ maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', borderRadius: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                  <h3 style={{ margin: 0 }}>
                    <i className="fa fa-edit text-warning" /> Editar Categoría: {editingCat.nombre_categoria}
                  </h3>
                  <button onClick={() => setEditingCat(null)} className="btn-icon">
                    <i className="fa fa-times" />
                  </button>
                </div>

                {editCatError && (
                  <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
                    <i className="fa fa-exclamation-circle" /> {editCatError}
                  </div>
                )}

                <form onSubmit={handleSaveEditCategory}>
                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Nombre de Categoría *</label>
                      <input
                        type="text"
                        required
                        value={editCatForm.nombre_categoria}
                        onChange={(e) => setEditCatForm({ ...editCatForm, nombre_categoria: e.target.value })}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Slug (URL)</label>
                      <input
                        type="text"
                        value={editCatForm.slug}
                        onChange={(e) => setEditCatForm({ ...editCatForm, slug: e.target.value })}
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginTop: '0.75rem' }}>
                    <label className="form-label">Color Temático</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="color"
                        value={editCatForm.color}
                        onChange={(e) => setEditCatForm({ ...editCatForm, color: e.target.value })}
                        style={{ width: '45px', height: '38px', padding: '2px', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer' }}
                      />
                      <input
                        type="text"
                        value={editCatForm.color}
                        onChange={(e) => setEditCatForm({ ...editCatForm, color: e.target.value })}
                        className="form-input"
                        style={{ flex: 1 }}
                        placeholder="#16a34a"
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginTop: '0.75rem' }}>
                    <label className="form-label">Descripción</label>
                    <textarea
                      rows="2"
                      value={editCatForm.descripcion}
                      onChange={(e) => setEditCatForm({ ...editCatForm, descripcion: e.target.value })}
                      className="form-input"
                      placeholder="Descripción detallada de la categoría..."
                    />
                  </div>

                  <div className="form-group" style={{ marginTop: '0.75rem' }}>
                    <label className="form-label">
                      <i className="fa fa-image text-primary" /> Cambiar Imagen / Logo
                    </label>
                    <input
                      type="file"
                      accept="image/*,.svg"
                      onChange={(e) => handleCatImageChange(e, true)}
                      className="form-input"
                      style={{ padding: '0.45rem' }}
                    />

                    <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem', background: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div style={{ width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', backgroundColor: `${editCatForm.color || '#2e7d32'}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <MediaRenderer
                          src={editCatImageFile ? editCatImagePreview : (editCatForm.imagen || editingCat?.imagen)}
                          alt="Vista previa"
                          icon={editCatForm.icono}
                          color={editCatForm.color}
                          type="category"
                        />
                      </div>
                      <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                        Imagen actual / seleccionada
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                    <button type="button" onClick={() => setEditingCat(null)} className="btn btn-secondary">
                      Cancelar
                    </button>
                    <button type="submit" disabled={editCatSaving} className="btn btn-primary">
                      {editCatSaving ? <><i className="fa fa-spinner fa-spin" /> Guardando...</> : <><i className="fa fa-save" /> Guardar Cambios</>}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Tab 5: Compras Globales */}
          {activeTab === 'compras' && (
            <div className="card fade-in" style={{ marginTop: '1.5rem' }}>
              <h3>Historial Global de Transacciones ({compras.length})</h3>
              <p className="text-muted" style={{ marginBottom: '1.25rem' }}>Todas las compras realizadas en el mercado.</p>

              {compras.length > 0 ? (
                <div className="orders-table-wrapper">
                  <table className="orders-table">
                    <thead>
                      <tr>
                        <th>N° Orden</th>
                        <th>Cliente</th>
                        <th>Fecha</th>
                        <th>Total</th>
                        <th>Estado</th>
                        <th>Método</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {compras.map((c) => (
                        <tr key={c.id_compra || c.id}>
                          <td><strong>#{c.id_compra || c.id}</strong></td>
                          <td>{c.cliente_nombre || c.nombre_usuario || c.nombre || 'Cliente'}</td>
                          <td>{new Date(c.fecha || Date.now()).toLocaleDateString('es-CO')}</td>
                          <td><strong>{formatCOP(c.total)}</strong></td>
                          <td>
                            <span className={`badge ${c.estado === 'entregado' ? 'badge-success' : c.estado === 'cancelado' ? 'badge-danger' : 'badge-warning'}`}>
                              {c.estado || 'Pendiente'}
                            </span>
                          </td>
                          <td><span className="badge badge-info">{c.metodo_pago || 'Contra Entrega'}</span></td>
                          <td>
                            <button onClick={() => handleDeleteOrder(c.id_compra || c.id)} className="btn-icon-danger" title="Eliminar compra">
                              <i className="fa fa-trash-alt" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <i className="fa fa-receipt empty-state-icon" />
                  <h4>No hay compras registradas</h4>
                </div>
              )}
            </div>
          )}

          {/* Tab 6: IA Chat */}
          {activeTab === 'ia' && (
            <div className="card fade-in" style={{ marginTop: '1.5rem' }}>
              <h3>Asistente IA Gerencial</h3>
              <p className="text-muted" style={{ marginBottom: '1.25rem' }}>
                Consulta métricas, proyecciones comerciales y recomendaciones para los productores de los Montes de María.
              </p>

              <div className="admin-ai-chat-box" style={{ minHeight: '320px', maxHeight: '450px', overflowY: 'auto', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', marginBottom: '1rem', background: 'var(--bg-alt)' }}>
                {iaResponses.length === 0 ? (
                  <p className="text-muted" style={{ textAlign: 'center', marginTop: '3rem' }}>
                    <i className="fa fa-robot fa-2x" /><br />
                    Escribe una pregunta para consultar al Asistente Gerencial.
                  </p>
                ) : (
                  iaResponses.map((msg, index) => (
                    <div key={index} style={{ marginBottom: '1rem', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                      <div style={{ display: 'inline-block', padding: '0.75rem 1rem', borderRadius: '8px', maxWidth: '80%', background: msg.role === 'user' ? 'var(--primary-color)' : 'var(--card-bg)', color: msg.role === 'user' ? '#fff' : 'inherit', boxShadow: 'var(--shadow-sm)' }}>
                        <strong>{msg.role === 'user' ? 'Tú: ' : '🤖 Asistente IA: '}</strong>
                        <p style={{ margin: '0.25rem 0 0 0', whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleSendIAChat} style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Pregunta sobre las ventas, stock o recomendaciones agrícolas..."
                  value={iaPrompt}
                  onChange={(e) => setIaPrompt(e.target.value)}
                  className="form-input"
                  style={{ flex: 1 }}
                />
                <button type="submit" disabled={iaLoading} className="btn btn-primary">
                  {iaLoading ? <i className="fa fa-spinner fa-spin" /> : <><i className="fa fa-paper-plane" /> Consultar</>}
                </button>
              </form>
            </div>
          )}

          {/* Tab 7: Banners & Carrusel Hero CMS */}
          {activeTab === 'banners' && (
            <div className="card fade-in" style={{ marginTop: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <h3>Gestor del Carrusel Principal & Banners ({banners.length})</h3>
                  <p className="text-muted" style={{ margin: 0 }}>
                    Personaliza diapositivas, títulos, categorías, botones y tarjetas de productos con vista previa interactiva en tiempo real.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative', width: '240px' }}>
                    <input
                      type="text"
                      placeholder="Buscar banner por título o categoría..."
                      value={bannerSearch}
                      onChange={(e) => setBannerSearch(e.target.value)}
                      className="form-input form-input-sm"
                    />
                  </div>
                  <button onClick={handleOpenCreateBanner} className="btn btn-primary btn-sm">
                    <i className="fa fa-plus-circle" /> Registrar Nuevo Banner
                  </button>
                </div>
              </div>

              {banners.length > 0 ? (
                <div className="orders-table-wrapper">
                  <table className="orders-table">
                    <thead>
                      <tr>
                        <th>Orden</th>
                        <th>Estilo / Plantilla</th>
                        <th>Insignia de Categoría</th>
                        <th>Título Principal & Subtítulo</th>
                        <th>Tarjeta de Producto Destacado</th>
                        <th>Color Acento</th>
                        <th>Estado</th>
                        <th style={{ textAlign: 'right' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {banners
                        .filter((b) => {
                          const q = bannerSearch.toLowerCase()
                          return (
                            !q ||
                            (b.titulo && b.titulo.toLowerCase().includes(q)) ||
                            (b.categoria_nombre && b.categoria_nombre.toLowerCase().includes(q)) ||
                            (b.tarjeta_titulo && b.tarjeta_titulo.toLowerCase().includes(q))
                          )
                        })
                        .map((b) => {
                          const styleLabels = {
                            clasico: { label: '🌿 Clásico', bg: '#16a34a' },
                            inmersivo: { label: '🌌 Inmersivo', bg: '#8b5cf6' },
                            oferta_flash: { label: '⚡ Oferta Flash', bg: '#ea580c' },
                            mosaico: { label: '🏛️ Mosaico', bg: '#0284c7' },
                            historia_campesina: { label: '👨‍🌾 Historia', bg: '#b45309' },
                          }
                          const curStyle = styleLabels[b.estilo_plantilla] || styleLabels.clasico

                          return (
                            <tr key={b.id_banner}>
                              <td>
                                <span className="badge badge-info" style={{ fontWeight: 800 }}>
                                  #{b.orden || 0}
                                </span>
                              </td>
                              <td>
                                <span
                                  style={{
                                    backgroundColor: curStyle.bg,
                                    color: '#ffffff',
                                    padding: '0.25rem 0.6rem',
                                    borderRadius: '999px',
                                    fontSize: '0.74rem',
                                    fontWeight: 800,
                                    whiteSpace: 'nowrap',
                                    display: 'inline-block',
                                  }}
                                >
                                  {curStyle.label}
                                </span>
                              </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', backgroundColor: '#f1f5f9', border: '1px solid var(--border-color)', flexShrink: 0 }}>
                                  <img
                                    src={b.categoria_thumb || '/img/verduras.avif'}
                                    alt={b.categoria_nombre}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    onError={(e) => { e.target.src = '/img/Logo.jpg' }}
                                  />
                                </div>
                                <div>
                                  <strong>{b.categoria_nombre || 'General'}</strong>
                                  <br />
                                  <code style={{ fontSize: '0.75rem' }}>/{b.categoria_slug || 'cat'}</code>
                                </div>
                              </div>
                            </td>
                            <td style={{ maxWidth: '280px' }}>
                              <strong>{b.titulo}</strong>
                              {b.subtitulo && (
                                <p className="table-desc" style={{ marginTop: '3px', fontSize: '0.8rem' }}>
                                  {b.subtitulo.slice(0, 75)}...
                                </p>
                              )}
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color)', backgroundColor: '#f8fafc', flexShrink: 0 }}>
                                  <img
                                    src={b.tarjeta_imagen || '/img/Ñame.avif'}
                                    alt={b.tarjeta_titulo}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    onError={(e) => { e.target.src = '/img/Logo.jpg' }}
                                  />
                                </div>
                                <div>
                                  <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>{b.tarjeta_titulo || 'Producto'}</span>
                                  <br />
                                  <span style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 800 }}>{b.tarjeta_precio || 'COP'}</span>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <span style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: b.color_acento || '#22c55e', border: '1px solid rgba(0,0,0,0.15)' }} />
                                <code style={{ fontSize: '0.78rem' }}>{b.color_acento || '#22c55e'}</code>
                              </div>
                            </td>
                            <td>
                              <button
                                onClick={() => handleToggleBannerActivo(b)}
                                className={`badge ${b.activo === 1 ? 'badge-success' : 'badge-danger'}`}
                                style={{ cursor: 'pointer', border: 'none', padding: '0.35rem 0.65rem' }}
                                title="Clic para alternar estado"
                              >
                                {b.activo === 1 ? '🟢 Activo en Carrusel' : '🔴 Inactivo'}
                              </button>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                                <button
                                  onClick={() => handleOpenEditBanner(b)}
                                  className="btn btn-warning btn-sm"
                                  title="Editar Banner con Vista Previa en Vivo"
                                >
                                  <i className="fa fa-edit" /> Editar
                                </button>
                                <button
                                  onClick={() => handleDeleteBanner(b.id_banner, b.titulo)}
                                  className="btn btn-danger btn-sm"
                                  title="Eliminar Banner"
                                >
                                  <i className="fa fa-trash-alt" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <i className="fa fa-images empty-state-icon" />
                  <h4>No hay banners registrados</h4>
                  <p>Crea tu primer banner interactivo para el carrusel de la página de inicio.</p>
                  <button onClick={handleOpenCreateBanner} className="btn btn-primary" style={{ marginTop: '1rem' }}>
                    <i className="fa fa-plus" /> Crear Primer Banner
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tab: Cupones de Descuento */}
          {activeTab === 'cupones' && (
            <div className="fade-in" style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* KPI Cards Cupones */}
              <div className="stats-cards-grid">
                <div className="card stat-card" style={{ borderLeft: '4px solid #16a34a' }}>
                  <div className="stat-card-icon stat-green">
                    <i className="fa fa-ticket-alt" />
                  </div>
                  <div className="stat-card-info">
                    <span className="stat-card-label">Total Cupones</span>
                    <span className="stat-card-val">{cupones.length}</span>
                    <span className="text-muted" style={{ fontSize: '0.8rem' }}>Creados en el sistema</span>
                  </div>
                </div>

                <div className="card stat-card" style={{ borderLeft: '4px solid #2563eb' }}>
                  <div className="stat-card-icon" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
                    <i className="fa fa-check-circle" />
                  </div>
                  <div className="stat-card-info">
                    <span className="stat-card-label">Cupones Activos</span>
                    <span className="stat-card-val">
                      {cupones.filter((c) => c.activo === 1 || c.activo === true).length}
                    </span>
                    <span className="text-muted" style={{ fontSize: '0.8rem' }}>Disponibles para compras</span>
                  </div>
                </div>

                <div className="card stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
                  <div className="stat-card-icon" style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>
                    <i className="fa fa-shopping-cart" />
                  </div>
                  <div className="stat-card-info">
                    <span className="stat-card-label">Total Canjes / Usos</span>
                    <span className="stat-card-val">
                      {cupones.reduce((acc, c) => acc + (Number(c.uso_actual) || 0), 0)}
                    </span>
                    <span className="text-muted" style={{ fontSize: '0.8rem' }}>Veces aplicados por clientes</span>
                  </div>
                </div>
              </div>

              {/* Promo Ribbon Manager Card */}
              <div
                className="card"
                style={{
                  background: 'linear-gradient(135deg, rgba(6,78,59,0.06), rgba(4,120,87,0.08))',
                  border: '1.5px solid #10b981',
                  padding: '1.25rem 1.5rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h4 style={{ margin: 0, color: '#065f46', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem' }}>
                      <i className="fa fa-bullhorn" /> Barra / Carrusel Promocional Superior de la Tienda
                    </h4>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#047857' }}>
                      Los cupones marcados como <strong>"Activo en Barra"</strong> aparecerán en la barra superior animada que ven los clientes en toda la tienda.
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="badge badge-success" style={{ fontSize: '0.82rem', padding: '0.4rem 0.75rem' }}>
                      <i className="fa fa-eye" /> {cupones.filter((c) => c.promocionar_en_barra === 1).length} Promociones Activas en Barra
                    </span>
                  </div>
                </div>

                {/* Live Preview Strip */}
                {cupones.filter((c) => c.promocionar_en_barra === 1).length > 0 && (
                  <div
                    style={{
                      marginTop: '1rem',
                      background: 'linear-gradient(90deg, #064e3b 0%, #047857 50%, #065f46 100%)',
                      color: '#ffffff',
                      padding: '0.55rem 1rem',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                      fontSize: '0.82rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ background: '#f59e0b', color: '#78350f', padding: '0.1rem 0.45rem', borderRadius: '4px', fontWeight: 800, fontSize: '0.7rem' }}>
                        VISTA PREVIA EN VIVO
                      </span>
                      <span>
                        {cupones.find((c) => c.promocionar_en_barra === 1)?.mensaje_promocional ||
                          '🔥 ¡Temporada de Cosecha! Usa el cupón CAMPO20 y obtén 20% de descuento'}
                      </span>
                      <span style={{ background: '#ffffff', color: '#065f46', padding: '0.15rem 0.5rem', borderRadius: '12px', fontWeight: 800, fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {cupones.find((c) => c.promocionar_en_barra === 1)?.codigo}
                      </span>
                    </div>
                    <span style={{ opacity: 0.7, fontSize: '0.75rem' }}>Visible en el encabezado</span>
                  </div>
                )}
              </div>

              {/* Main Card */}
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div>
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <i className="fa fa-tags text-primary" /> Sistema de Cupones y Descuentos ({cupones.length})
                    </h3>
                    <p className="text-muted" style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
                      Genera códigos promocionales con porcentajes (2%, 5%, 10%, 20%, 30%, etc.) o montos fijos para incentivar compras.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', width: '250px' }}>
                      <input
                        type="text"
                        placeholder="Buscar cupón por código..."
                        value={couponSearch}
                        onChange={(e) => setCouponSearch(e.target.value)}
                        className="form-input form-input-sm"
                      />
                    </div>
                    <button
                      onClick={handleOpenCreateCoupon}
                      className="btn btn-primary btn-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}
                    >
                      <i className="fa fa-plus-circle" /> Crear Nuevo Cupón
                    </button>
                  </div>
                </div>

                {cupones.length > 0 ? (
                  <div className="orders-table-wrapper">
                    <table className="orders-table">
                      <thead>
                        <tr>
                          <th>Código Promocional</th>
                          <th>Descuento</th>
                          <th>Descripción & Condición</th>
                          <th>Límite y Usos</th>
                          <th>Vigencia</th>
                          <th>📢 Barra Tienda</th>
                          <th>Estado</th>
                          <th style={{ textAlign: 'right' }}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cupones
                          .filter((c) => {
                            const q = couponSearch.toLowerCase()
                            return (
                              !q ||
                              (c.codigo && c.codigo.toLowerCase().includes(q)) ||
                              (c.descripcion && c.descripcion.toLowerCase().includes(q))
                            )
                          })
                          .map((c) => {
                            const isExpired = c.fecha_expiracion && new Date(c.fecha_expiracion) < new Date()
                            const isLimitReached = c.uso_limite !== null && c.uso_limite !== undefined && c.uso_actual >= c.uso_limite
                            const usagePct = c.uso_limite ? Math.min(100, Math.round((c.uso_actual / c.uso_limite) * 100)) : 0

                            return (
                              <tr key={c.id_cupon || c.codigo}>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div
                                      style={{
                                        background: '#ecfdf5',
                                        border: '1.5px dashed #059669',
                                        borderRadius: '8px',
                                        padding: '0.35rem 0.65rem',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.4rem',
                                      }}
                                    >
                                      <i className="fa fa-ticket-alt" style={{ color: '#059669', fontSize: '0.85rem' }} />
                                      <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#065f46', fontSize: '0.95rem' }}>
                                        {c.codigo}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleCopyCoupon(c.codigo)}
                                      className="btn btn-secondary btn-sm"
                                      title="Copiar código al portapapeles"
                                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                    >
                                      <i className="fa fa-copy" />
                                    </button>
                                  </div>
                                </td>

                                <td>
                                  {Number(c.descuento_porcentaje) > 0 ? (
                                    <span
                                      className="badge badge-success"
                                      style={{
                                        fontSize: '0.85rem',
                                        fontWeight: 800,
                                        padding: '0.35rem 0.6rem',
                                        background: '#16a34a',
                                        color: '#fff',
                                      }}
                                    >
                                      ⚡ {Number(c.descuento_porcentaje)}% OFF
                                    </span>
                                  ) : (
                                    <span
                                      className="badge badge-info"
                                      style={{
                                        fontSize: '0.85rem',
                                        fontWeight: 800,
                                        padding: '0.35rem 0.6rem',
                                      }}
                                    >
                                      💰 {formatCOP(c.descuento_fijo)} OFF
                                    </span>
                                  )}
                                </td>

                                <td style={{ maxWidth: '240px' }}>
                                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{c.descripcion || 'Sin descripción'}</div>
                                  {Number(c.monto_minimo) > 0 ? (
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                                      <i className="fa fa-info-circle" /> Compra mín: <strong>{formatCOP(c.monto_minimo)}</strong>
                                    </div>
                                  ) : (
                                    <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '2px' }}>
                                      <i className="fa fa-check" /> Sin monto mínimo
                                    </div>
                                  )}
                                </td>

                                <td>
                                  <div style={{ minWidth: '120px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: '3px' }}>
                                      <span>{c.uso_actual || 0} canjes</span>
                                      <span className="text-muted">{c.uso_limite ? `/ ${c.uso_limite}` : '(Ilimitado)'}</span>
                                    </div>
                                    {c.uso_limite && (
                                      <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div
                                          style={{
                                            width: `${usagePct}%`,
                                            height: '100%',
                                            backgroundColor: isLimitReached ? '#ef4444' : '#16a34a',
                                            transition: 'width 0.3s ease',
                                          }}
                                        />
                                      </div>
                                    )}
                                  </div>
                                </td>

                                <td>
                                  {c.fecha_expiracion ? (
                                    <span
                                      className={`badge ${isExpired ? 'badge-danger' : 'badge-light'}`}
                                      style={{ fontSize: '0.78rem' }}
                                    >
                                      <i className={`fa ${isExpired ? 'fa-clock' : 'fa-calendar-alt'}`} />{' '}
                                      {new Date(c.fecha_expiracion).toLocaleDateString('es-CO', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                      })}
                                      {isExpired && ' (Expirado)'}
                                    </span>
                                  ) : (
                                    <span className="badge badge-light" style={{ fontSize: '0.78rem', color: '#16a34a' }}>
                                      <i className="fa fa-infinity" /> Sin caducidad
                                    </span>
                                  )}
                                </td>

                                <td>
                                  <button
                                    type="button"
                                    onClick={() => handleTogglePromoCoupon(c)}
                                    className={`btn btn-sm ${c.promocionar_en_barra === 1 ? 'btn-success' : 'btn-outline-secondary'}`}
                                    style={{
                                      fontSize: '0.75rem',
                                      padding: '0.25rem 0.55rem',
                                      fontWeight: 700,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.35rem',
                                    }}
                                    title="Clic para activar/desactivar en la barra superior de la tienda"
                                  >
                                    <i className={`fa ${c.promocionar_en_barra === 1 ? 'fa-bullhorn' : 'fa-bullhorn text-muted'}`} />
                                    {c.promocionar_en_barra === 1 ? 'En Barra' : 'Oculto'}
                                  </button>
                                </td>

                                <td>
                                  <button
                                    onClick={() => handleToggleCoupon(c)}
                                    className={`badge ${c.activo === 1 || c.activo === true ? 'badge-success' : 'badge-danger'}`}
                                    style={{ cursor: 'pointer', border: 'none', padding: '0.35rem 0.65rem' }}
                                    title="Clic para activar/desactivar"
                                  >
                                    {c.activo === 1 || c.activo === true ? '🟢 Activo' : '🔴 Inactivo'}
                                  </button>
                                </td>

                                <td style={{ textAlign: 'right' }}>
                                  <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                                    <button
                                      onClick={() => handleOpenEditCoupon(c)}
                                      className="btn btn-warning btn-sm"
                                      title="Editar Cupón"
                                    >
                                      <i className="fa fa-edit" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteCoupon(c)}
                                      className="btn btn-danger btn-sm"
                                      title="Eliminar Cupón"
                                    >
                                      <i className="fa fa-trash-alt" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state" style={{ padding: '3rem 1rem' }}>
                    <i className="fa fa-ticket-alt empty-state-icon" style={{ fontSize: '3rem', color: '#cbd5e1' }} />
                    <h4 style={{ marginTop: '1rem' }}>No hay cupones registrados</h4>
                    <p className="text-muted">Crea cupones con descuentos del 2%, 5%, 10%, 20% o el que desees para tus clientes.</p>
                    <button onClick={handleOpenCreateCoupon} className="btn btn-primary" style={{ marginTop: '1rem' }}>
                      <i className="fa fa-plus-circle" /> Crear Primer Cupón
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Modal Crear / Editar Banner con Vista Previa en Vivo */}
          {showBannerModal && (
            <div className="modal-overlay fade-in" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
              <div className="modal-content card" style={{ maxWidth: '1360px', width: '96vw', maxHeight: '94vh', display: 'flex', flexDirection: 'column', padding: '0', borderRadius: '18px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}>
                
                {/* Modal Top Header */}
                <div style={{ background: 'var(--card-bg)', padding: '1.15rem 1.75rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.2rem', fontWeight: 800 }}>
                      <span style={{ width: '34px', height: '34px', borderRadius: '10px', backgroundColor: 'rgba(34,197,94,0.15)', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="fa fa-sliders-h" />
                      </span>
                      {editingBanner ? `Editar Slide de Carrusel: "${bannerForm.titulo}"` : 'Crear Nueva Diapositiva / Banner Hero'}
                    </h3>
                    <p style={{ margin: '3px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Elige entre 5 estilos visuales, conecta productos campesinos reales y previsualiza los cambios en tiempo real.
                    </p>
                  </div>
                  <button onClick={() => setShowBannerModal(false)} className="btn-icon" style={{ width: '36px', height: '36px', borderRadius: '50%', fontSize: '1.1rem' }}>
                    <i className="fa fa-times" />
                  </button>
                </div>

                {/* Steps / Tabs Navigation Bar */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-alt)', padding: '0.5rem 1.25rem', gap: '0.45rem', overflowX: 'auto' }}>
                  {[
                    { id: 'estilo', label: '1. Estilos de Diseño (5)', icon: 'fa-palette', badge: 'Nuevo' },
                    { id: 'textos', label: '2. Textos & Categoría', icon: 'fa-heading' },
                    { id: 'producto', label: '3. Producto & Campesino', icon: 'fa-box-open' },
                    { id: 'fondo', label: '4. Fondo & Efectos Blur', icon: 'fa-magic' },
                    { id: 'botones', label: '5. Botones, Cupón & Orden', icon: 'fa-mouse-pointer' },
                  ].map((tab) => {
                    const isActive = bannerModalTab === tab.id
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setBannerModalTab(tab.id)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.45rem',
                          padding: '0.6rem 1rem',
                          borderRadius: '10px',
                          border: isActive ? '1.5px solid var(--primary-color)' : '1px solid transparent',
                          backgroundColor: isActive ? 'var(--card-bg)' : 'transparent',
                          color: isActive ? 'var(--primary-color)' : 'var(--text-muted)',
                          fontWeight: isActive ? 800 : 600,
                          fontSize: '0.84rem',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <i className={`fa ${tab.icon}`} /> {tab.label}
                        {tab.badge && (
                          <span style={{ fontSize: '0.68rem', background: '#22c55e', color: '#fff', padding: '1px 6px', borderRadius: '999px', fontWeight: 800 }}>
                            {tab.badge}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>

                {bannerError && (
                  <div className="alert alert-danger" style={{ margin: '0.75rem 1.75rem 0', borderRadius: '8px' }}>
                    <i className="fa fa-exclamation-circle" /> {bannerError}
                  </div>
                )}

                {/* Main 2-Column Area: Form on Left, Sticky Live Preview on Right */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', flex: 1, overflowY: 'auto', minHeight: 0 }}>
                  
                  {/* Left Column: Tabbed Form */}
                  <form onSubmit={handleSaveBanner} style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', borderRight: '1px solid var(--border-color)' }}>
                    
                    {/* ══════════════════════════════════════════════════════════
                        TAB 1: ESTILOS DE DISEÑO (5 PLANTILLAS)
                       ══════════════════════════════════════════════════════════ */}
                    {bannerModalTab === 'estilo' && (
                      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        <div>
                          <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <i className="fa fa-palette" /> Selecciona la Plantilla de Diseño
                          </h4>
                          <p className="text-muted" style={{ fontSize: '0.82rem', margin: 0 }}>
                            Elige cómo se presentará este banner en la página de inicio. La vista previa a la derecha se adaptará inmediatamente:
                          </p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
                          {[
                            {
                              id: 'clasico',
                              name: '🌿 Clásico Agro & Tarjeta Flotante',
                              badge: 'Estándar',
                              badgeBg: '#16a34a',
                              desc: 'Diseño dividido clásico con textos a la izquierda y tarjeta flotante con efecto vidrio (glassmorphism) con foto del producto y vendedor a la derecha.',
                              features: ['Badge de categoría con foto', 'Lista de puntos clave con checks', 'Tarjeta de producto con precio y vendedor'],
                            },
                            {
                              id: 'inmersivo',
                              name: '🌌 Inmersivo & Tipografía Gigante',
                              badge: 'Moderno / Impacto',
                              badgeBg: '#8b5cf6',
                              desc: 'Diseño centrado de alto impacto visual, tipografía gigante con gradiente, cinta de 3 pilares horizontales y botones de llamada a la acción centrados.',
                              features: ['Texto centrado imponente', 'Cinta horizontal de características', 'Efecto resplandor en botones'],
                            },
                            {
                              id: 'oferta_flash',
                              name: '⚡ Oferta Flash & Cuponera Interactiva',
                              badge: 'Promocional',
                              badgeBg: '#ea580c',
                              desc: 'Especialmente diseñado para descuentos y ofertas: incluye cinta diagonal de oferta, caja interactiva para copiar cupón con 1 clic y precio anterior tachado.',
                              features: ['Caja de cupón con botón copiar', 'Cinta diagonal 🔥 OFERTA', 'Precio anterior vs precio con descuento'],
                            },
                            {
                              id: 'mosaico',
                              name: '🏛️ Mosaico Campesino (3 Pilares del Campo)',
                              badge: 'Visual / Pilares',
                              badgeBg: '#0284c7',
                              desc: 'Destaca 3 pilares esenciales del campo (100% orgánico, despachos rápidos, pago justo) en tarjetas visuales ilustradas con iconos y fondos traslúcidos.',
                              features: ['3 Tarjetas ilustradas con iconos', 'Enfoque en beneficios del campo', 'Diseño limpio y ordenado'],
                            },
                            {
                              id: 'historia_campesina',
                              name: '👨‍🌾 Historia & Tradición Campesina',
                              badge: 'Identidad / Campo',
                              badgeBg: '#b45309',
                              desc: 'Pone en primer plano al campesino productor: incluye su foto de perfil con sello de verificación, una cita inspiradora de su cosecha y tarjeta tipo postal.',
                              features: ['Tarjeta de perfil del campesino', 'Cita testimonial con comillas', 'Marco de foto de cosecha tipo postal'],
                            },
                          ].map((tpl) => {
                            const isSelected = (bannerForm.estilo_plantilla || 'clasico') === tpl.id
                            return (
                              <div
                                key={tpl.id}
                                onClick={() => setBannerForm({ ...bannerForm, estilo_plantilla: tpl.id })}
                                style={{
                                  border: isSelected ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                                  borderRadius: '12px',
                                  padding: '0.9rem 1.1rem',
                                  backgroundColor: isSelected ? 'rgba(34, 197, 94, 0.08)' : 'var(--bg-alt)',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '0.35rem',
                                  position: 'relative',
                                  transition: 'all 0.2s ease',
                                  boxShadow: isSelected ? '0 0 0 2px rgba(34, 197, 94, 0.25)' : 'none',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input
                                      type="radio"
                                      name="estilo_plantilla"
                                      checked={isSelected}
                                      onChange={() => setBannerForm({ ...bannerForm, estilo_plantilla: tpl.id })}
                                      style={{ width: '18px', height: '18px', accentColor: 'var(--primary-color)' }}
                                    />
                                    <strong style={{ fontSize: '0.95rem', color: isSelected ? 'var(--primary-color)' : 'inherit' }}>
                                      {tpl.name}
                                    </strong>
                                  </div>
                                  <span style={{ fontSize: '0.72rem', backgroundColor: tpl.badgeBg, color: '#fff', padding: '2px 8px', borderRadius: '999px', fontWeight: 800 }}>
                                    {tpl.badge}
                                  </span>
                                </div>
                                <p style={{ margin: '0.2rem 0 0.35rem 1.65rem', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.35 }}>
                                  {tpl.desc}
                                </p>
                                <div style={{ display: 'flex', gap: '0.4rem', marginLeft: '1.65rem', flexWrap: 'wrap' }}>
                                  {tpl.features.map((f, fIdx) => (
                                    <span key={fIdx} style={{ fontSize: '0.72rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)', padding: '2px 7px', borderRadius: '6px', color: 'var(--text-color)' }}>
                                      ✓ {f}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* ══════════════════════════════════════════════════════════
                        TAB 2: TEXTOS & CATEGORÍA
                       ══════════════════════════════════════════════════════════ */}
                    {bannerModalTab === 'textos' && (
                      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ background: 'var(--bg-alt)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                          <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--primary-color)' }}>
                            <i className="fa fa-heading" /> Textos Principales
                          </h4>
                          <div className="form-group">
                            <label className="form-label">Título Principal *</label>
                            <input
                              type="text"
                              required
                              placeholder="Ej: Cosechas Frescas y Tubérculos Tradicionales"
                              value={bannerForm.titulo}
                              onChange={(e) => setBannerForm({ ...bannerForm, titulo: e.target.value })}
                              className="form-input"
                            />
                          </div>
                          <div className="form-group" style={{ marginTop: '0.75rem' }}>
                            <label className="form-label">Subtítulo / Cita Descriptiva</label>
                            <textarea
                              rows="2"
                              placeholder="Descripción breve que motive la compra o frase del campesino..."
                              value={bannerForm.subtitulo}
                              onChange={(e) => setBannerForm({ ...bannerForm, subtitulo: e.target.value })}
                              className="form-input"
                            />
                          </div>
                          <div className="form-group" style={{ marginTop: '0.75rem' }}>
                            <label className="form-label">Características / Puntos Clave (1 por línea)</label>
                            <textarea
                              rows="3"
                              placeholder="Ñame Espino y Criollo&#10;Yuca Campesina Fresca&#10;Pago 100% Directo al Productor"
                              value={featuresInput}
                              onChange={(e) => setFeaturesInput(e.target.value)}
                              className="form-input"
                            />
                          </div>
                        </div>

                        {/* Selector de Categoría Real y Campos Editables de Identidad */}
                        <div style={{ background: 'var(--bg-alt)', padding: '1.15rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                            <h4 style={{ margin: 0, color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <i className="fa fa-tags" /> 🏷️ Seleccionar Categoría Real con Foto
                            </h4>
                            <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>
                              {categorias.length} Categorías en Base de Datos
                            </span>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(125px, 1fr))', gap: '0.55rem', maxHeight: '180px', overflowY: 'auto', padding: '4px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--card-bg)', marginBottom: '0.85rem' }}>
                            {categorias.map((cat) => {
                              const catSlug = cat.slug || cat.nombre_categoria?.toLowerCase().replace(/\s+/g, '-')
                              const isSelected = bannerForm.categoria_slug === catSlug || bannerForm.categoria_nombre === cat.nombre_categoria
                              let catImg = cat.imagen?.startsWith('http') || cat.imagen?.startsWith('/') ? cat.imagen : cat.imagen ? `/uploads/categories/${cat.imagen}` : null

                              return (
                                <div
                                  key={cat.id_categoria || cat.id || catSlug}
                                  onClick={() => {
                                    setBannerForm((prev) => ({
                                      ...prev,
                                      categoria_nombre: cat.nombre_categoria || cat.nombre,
                                      categoria_slug: catSlug,
                                      categoria_thumb: catImg || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
                                      color_acento: cat.color || prev.color_acento,
                                      boton_principal_link: `/categoria/${catSlug}`,
                                    }))
                                    setBannerThumbPreview(catImg || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80')
                                    setBannerThumbFile(null)
                                  }}
                                  style={{
                                    border: isSelected ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                                    borderRadius: '8px',
                                    padding: '0.5rem 0.35rem',
                                    backgroundColor: isSelected ? 'rgba(34, 197, 94, 0.1)' : 'var(--bg-alt)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    textAlign: 'center',
                                    gap: '0.3rem',
                                  }}
                                >
                                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', overflow: 'hidden', backgroundColor: `${cat.color || '#22c55e'}18`, border: `2px solid ${cat.color || '#22c55e'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {catImg ? <img src={catImg} alt={cat.nombre_categoria} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.src = '/img/Logo.jpg' }} /> : <i className={`fa ${cat.icono || 'fa-seedling'}`} style={{ color: cat.color || '#22c55e' }} />}
                                  </div>
                                  <span style={{ fontSize: '0.74rem', fontWeight: 700, lineHeight: 1.2, color: isSelected ? 'var(--primary-color)' : 'inherit' }}>
                                    {cat.nombre_categoria || cat.nombre}
                                  </span>
                                </div>
                              )
                            })}
                          </div>

                          {/* Campos Editables de Categoría, Productor y Badges */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem', background: 'var(--card-bg)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <div className="form-group">
                              <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                                Nombre de Categoría Visible
                              </label>
                              <input
                                type="text"
                                value={bannerForm.categoria_nombre}
                                onChange={(e) => setBannerForm({ ...bannerForm, categoria_nombre: e.target.value })}
                                className="form-input"
                                placeholder="Ej: Lácteos Artesanales"
                              />
                            </div>
                            <div className="form-group">
                              <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                                Badge / Sello Flotante (Ej: 🌿 100% Campo)
                              </label>
                              <input
                                type="text"
                                value={bannerForm.tarjeta_badge_top}
                                onChange={(e) => setBannerForm({ ...bannerForm, tarjeta_badge_top: e.target.value })}
                                className="form-input"
                                placeholder="Ej: 🌿 100% Campo / 🧀 100% Artesanal"
                              />
                            </div>
                            <div className="form-group" style={{ marginTop: '0.4rem' }}>
                              <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                                Nombre del Productor / Campesino
                              </label>
                              <input
                                type="text"
                                value={bannerForm.tarjeta_vendedor_nombre}
                                onChange={(e) => setBannerForm({ ...bannerForm, tarjeta_vendedor_nombre: e.target.value })}
                                className="form-input"
                                placeholder="Ej: Roberto Carlos Salcedo / Montes de María"
                              />
                            </div>
                            <div className="form-group" style={{ marginTop: '0.4rem' }}>
                              <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                                Ubicación / Rating del Productor
                              </label>
                              <input
                                type="text"
                                value={bannerForm.tarjeta_vendedor_rating}
                                onChange={(e) => setBannerForm({ ...bannerForm, tarjeta_vendedor_rating: e.target.value })}
                                className="form-input"
                                placeholder="Ej: ⭐ 4.9/5 Calidad / San Jacinto, Bolívar"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ══════════════════════════════════════════════════════════
                        TAB 3: PRODUCTO & CAMPESINO (SELECTORES REALES)
                       ══════════════════════════════════════════════════════════ */}
                    {bannerModalTab === 'producto' && (
                      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        
                        {/* 1. Selector de Producto Real */}
                        <div style={{ background: 'var(--bg-alt)', padding: '1.15rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                            <h4 style={{ margin: 0, color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <i className="fa fa-box-open" /> 1. Elegir Producto Real del Catálogo
                            </h4>
                            <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>
                              {productos.length} Productos Disponibles
                            </span>
                          </div>

                          <select
                            className="form-select"
                            style={{ marginBottom: '0.65rem' }}
                            onChange={(e) => {
                              const prodId = Number(e.target.value)
                              const found = productos.find((p) => (p.id_producto || p.id) === prodId)
                              if (found) {
                                const prodImg = found.imagen?.startsWith('http') || found.imagen?.startsWith('/') ? found.imagen : found.imagen ? `/uploads/products/${found.imagen}` : '/img/Ñame.avif'
                                const formattedPrice = found.precio ? `$${Number(found.precio).toLocaleString('es-CO')} COP / ${found.unidad_medida || found.presentacion || 'Unidad'}` : '$6.000 COP / Kilo'
                                const vendorName = found.origen ? `${found.origen} • Productor Local` : (found.vendedor_nombre || 'Productor de Montes de María')
                                setBannerForm((prev) => ({
                                  ...prev,
                                  tarjeta_titulo: found.nombre_producto || found.nombre || '',
                                  tarjeta_precio: formattedPrice,
                                  tarjeta_vendedor_nombre: vendorName,
                                  tarjeta_vendedor_id: found.id_vendedor || found.id_usuario || 47,
                                  tarjeta_imagen: prodImg,
                                }))
                                setBannerProdImgPreview(prodImg)
                                setBannerProdImgFile(null)
                              }
                            }}
                          >
                            <option value="">-- Autocompletar con producto de la tienda --</option>
                            {productos.map((prod) => (
                              <option key={prod.id_producto || prod.id} value={prod.id_producto || prod.id}>
                                📦 {prod.nombre_producto || prod.nombre} — ${Number(prod.precio || 0).toLocaleString('es-CO')} COP
                              </option>
                            ))}
                          </select>

                          {/* Quick Product Chips */}
                          {productos && productos.length > 0 && (
                            <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', padding: '2px 0' }}>
                              {productos.slice(0, 7).map((p) => {
                                const pImg = p.imagen?.startsWith('http') || p.imagen?.startsWith('/') ? p.imagen : p.imagen ? `/uploads/products/${p.imagen}` : '/img/Ñame.avif'
                                return (
                                  <button
                                    key={p.id_producto || p.id}
                                    type="button"
                                    onClick={() => {
                                      const formattedPrice = p.precio ? `$${Number(p.precio).toLocaleString('es-CO')} COP / ${p.unidad_medida || 'Unidad'}` : '$6.000 COP / Kilo'
                                      const vendorName = p.origen ? `${p.origen} • Productor Local` : (p.vendedor_nombre || 'Productor de Montes de María')
                                      setBannerForm((prev) => ({
                                        ...prev,
                                        tarjeta_titulo: p.nombre_producto || p.nombre || '',
                                        tarjeta_precio: formattedPrice,
                                        tarjeta_vendedor_nombre: vendorName,
                                        tarjeta_vendedor_id: p.id_vendedor || p.id_usuario || 47,
                                        tarjeta_imagen: pImg,
                                      }))
                                      setBannerProdImgPreview(pImg)
                                      setBannerProdImgFile(null)
                                    }}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.35rem',
                                      background: 'var(--card-bg)',
                                      border: '1px solid var(--border-color)',
                                      borderRadius: '6px',
                                      padding: '0.25rem 0.55rem',
                                      cursor: 'pointer',
                                      fontSize: '0.72rem',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    <img src={pImg} alt={p.nombre_producto} style={{ width: '18px', height: '18px', borderRadius: '3px', objectFit: 'cover' }} onError={(e) => { e.target.src = '/img/Logo.jpg' }} />
                                    <span>{p.nombre_producto || p.nombre}</span>
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>

                        {/* 2. Selector de Vendedor / Productor Campesino Real */}
                        <div style={{ background: 'var(--bg-alt)', padding: '1.15rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                            <h4 style={{ margin: 0, color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <i className="fa fa-user-check" /> 2. Elegir Campesino / Vendedor Productor Real
                            </h4>
                            <span className="badge badge-info" style={{ fontSize: '0.72rem' }}>
                              {usuarios.filter((u) => u.id_rol === 2 || u.rol === 2 || u.id_rol === 1).length || usuarios.length} Productores Registrados
                            </span>
                          </div>

                          <select
                            className="form-select"
                            style={{ marginBottom: '0.65rem' }}
                            value={bannerForm.tarjeta_vendedor_id || ''}
                            onChange={(e) => {
                              const uId = Number(e.target.value)
                              const foundUser = usuarios.find((u) => (u.id_usuario || u.id) === uId)
                              if (foundUser) {
                                const vName = foundUser.nombre || foundUser.apodo || 'Productor del Campo'
                                const vRating = foundUser.direccion ? `${foundUser.direccion} • Productor Verificado` : '⭐ 4.9/5 Productor Verificado'
                                setBannerForm((prev) => ({
                                  ...prev,
                                  tarjeta_vendedor_nombre: vName,
                                  tarjeta_vendedor_id: uId,
                                  tarjeta_vendedor_rating: vRating,
                                }))
                              }
                            }}
                          >
                            <option value="">-- Seleccionar productor de la base de datos --</option>
                            {usuarios.map((u) => (
                              <option key={u.id_usuario || u.id} value={u.id_usuario || u.id}>
                                👨‍🌾 {u.nombre || u.apodo} ({u.direccion || 'Montes de María'}) — {u.correo}
                              </option>
                            ))}
                          </select>

                          {/* Visual Producer Cards */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '0.5rem', maxHeight: '140px', overflowY: 'auto' }}>
                            {usuarios.map((u) => {
                              const uId = u.id_usuario || u.id
                              const isSelected = Number(bannerForm.tarjeta_vendedor_id) === uId || bannerForm.tarjeta_vendedor_nombre === u.nombre
                              const uAvatar = u.avatar?.startsWith('http') || u.avatar?.startsWith('/') ? u.avatar : u.avatar ? `/uploads/avatars/${u.avatar}` : '/img/Logo.jpg'

                              return (
                                <div
                                  key={uId}
                                  onClick={() => {
                                    const vName = u.nombre || u.apodo || 'Productor del Campo'
                                    const vRating = u.direccion ? `${u.direccion} • Productor Verificado` : '⭐ 4.9/5 Productor Verificado'
                                    setBannerForm((prev) => ({
                                      ...prev,
                                      tarjeta_vendedor_nombre: vName,
                                      tarjeta_vendedor_id: uId,
                                      tarjeta_vendedor_rating: vRating,
                                    }))
                                  }}
                                  style={{
                                    border: isSelected ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                                    borderRadius: '8px',
                                    padding: '0.45rem 0.6rem',
                                    background: isSelected ? 'rgba(34, 197, 94, 0.12)' : 'var(--card-bg)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    transition: 'all 0.15s ease',
                                  }}
                                >
                                  <img
                                    src={uAvatar}
                                    alt={u.nombre}
                                    style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover', border: isSelected ? '2px solid var(--primary-color)' : '1px solid var(--border-color)' }}
                                    onError={(e) => { e.target.src = '/img/Logo.jpg' }}
                                  />
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <strong style={{ fontSize: '0.78rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: isSelected ? 'var(--primary-color)' : 'inherit' }}>
                                      {u.nombre || u.apodo}
                                    </strong>
                                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {u.direccion || 'Montes de María'}
                                    </span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>

                        {/* 3. Datos Mostrados del Producto & Productor (Ajuste Fino) */}
                        <div style={{ background: 'var(--bg-alt)', padding: '1.15rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                          <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--primary-color)' }}>
                            <i className="fa fa-edit" /> 3. Textos Visibles en la Tarjeta & Foto Personalizada
                          </h4>

                          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <div className="form-group">
                              <label className="form-label">Nombre del Producto</label>
                              <input
                                type="text"
                                value={bannerForm.tarjeta_titulo}
                                onChange={(e) => setBannerForm({ ...bannerForm, tarjeta_titulo: e.target.value })}
                                className="form-input"
                              />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Precio Visible</label>
                              <input
                                type="text"
                                value={bannerForm.tarjeta_precio}
                                onChange={(e) => setBannerForm({ ...bannerForm, tarjeta_precio: e.target.value })}
                                className="form-input"
                              />
                            </div>
                          </div>

                          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '0.75rem', marginTop: '0.6rem' }}>
                            <div className="form-group">
                              <label className="form-label">Nombre del Campesino / Vendedor</label>
                              <input
                                type="text"
                                value={bannerForm.tarjeta_vendedor_nombre}
                                onChange={(e) => setBannerForm({ ...bannerForm, tarjeta_vendedor_nombre: e.target.value })}
                                className="form-input"
                              />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Ubicación / Rating del Campesino</label>
                              <input
                                type="text"
                                value={bannerForm.tarjeta_vendedor_rating}
                                onChange={(e) => setBannerForm({ ...bannerForm, tarjeta_vendedor_rating: e.target.value })}
                                className="form-input"
                              />
                            </div>
                          </div>

                          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.6rem' }}>
                            <div className="form-group">
                              <label className="form-label">Badge Flotante (Píldora)</label>
                              <input
                                type="text"
                                value={bannerForm.tarjeta_badge_top}
                                onChange={(e) => setBannerForm({ ...bannerForm, tarjeta_badge_top: e.target.value })}
                                className="form-input"
                              />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Subir Foto Personalizada de Producto</label>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files[0]
                                  if (file) {
                                    setBannerProdImgFile(file)
                                    setBannerProdImgPreview(URL.createObjectURL(file))
                                  }
                                }}
                                className="form-input"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ══════════════════════════════════════════════════════════
                        TAB 4: FONDO & EFECTOS BLUR
                       ══════════════════════════════════════════════════════════ */}
                    {bannerModalTab === 'fondo' && (
                      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ background: 'var(--bg-alt)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                          <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--primary-color)' }}>
                            <i className="fa fa-palette" /> Color de Acento & Botones
                          </h4>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                            <input
                              type="color"
                              value={bannerForm.color_acento}
                              onChange={(e) => setBannerForm({ ...bannerForm, color_acento: e.target.value })}
                              style={{ width: '44px', height: '36px', padding: '2px', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer' }}
                            />
                            <input
                              type="text"
                              value={bannerForm.color_acento}
                              onChange={(e) => setBannerForm({ ...bannerForm, color_acento: e.target.value })}
                              className="form-input"
                              style={{ width: '120px', fontSize: '0.84rem' }}
                            />
                          </div>

                          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                            {[
                              { label: '🌿 Verde Campo', color: '#16a34a' },
                              { label: '🌾 Ámbar Cosecha', color: '#f59e0b' },
                              { label: '🍊 Naranja Fuego', color: '#ea580c' },
                              { label: '🌊 Azul Caribe', color: '#0284c7' },
                              { label: '🍇 Púrpura', color: '#7e22ce' },
                              { label: '☕ Café Tierra', color: '#78350f' },
                              { label: '🌑 Carbón Noche', color: '#0f172a' },
                            ].map((c) => (
                              <button
                                key={c.color}
                                type="button"
                                onClick={() => setBannerForm({ ...bannerForm, color_acento: c.color })}
                                style={{
                                  backgroundColor: c.color,
                                  color: '#fff',
                                  border: bannerForm.color_acento === c.color ? '2px solid #fff' : '1px solid rgba(0,0,0,0.15)',
                                  outline: bannerForm.color_acento === c.color ? '2px solid var(--primary-color)' : 'none',
                                  padding: '0.3rem 0.65rem',
                                  borderRadius: '6px',
                                  fontSize: '0.74rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                {c.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Nivel de Desenfoque (Blur) con Slider en Tiempo Real y Botones de Acceso Rápido */}
                        <div style={{ background: 'var(--bg-alt)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <h4 style={{ margin: 0, color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <i className="fa fa-magic" /> 🌫️ Nivel de Desenfoque (Efecto Borroso del Fondo)
                            </h4>
                            <span
                              style={{
                                background: 'var(--primary-color)',
                                color: '#ffffff',
                                padding: '3px 10px',
                                borderRadius: '999px',
                                fontWeight: 800,
                                fontSize: '0.82rem',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                              }}
                            >
                              {bannerForm.filtro_blur !== undefined ? Number(bannerForm.filtro_blur) : 0}px
                            </span>
                          </div>
                          <p className="text-muted" style={{ fontSize: '0.82rem', margin: '0 0 0.85rem 0' }}>
                            Mueve la barra deslizante para ver el desenfoque en tiempo real en la vista previa a la derecha:
                          </p>

                          {/* Slider Range Interactivo */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', background: 'var(--card-bg)', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>0px (Nítido)</span>
                            <input
                              type="range"
                              min="0"
                              max="30"
                              step="1"
                              value={bannerForm.filtro_blur !== undefined ? Number(bannerForm.filtro_blur) : 0}
                              onChange={(e) => setBannerForm({ ...bannerForm, filtro_blur: Number(e.target.value) })}
                              style={{
                                flex: 1,
                                height: '8px',
                                borderRadius: '4px',
                                accentColor: 'var(--primary-color)',
                                cursor: 'pointer',
                              }}
                            />
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>30px (Ultra Borroso)</span>
                          </div>

                          {/* Botones de Presets Rápidos */}
                          <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                            {[
                              { label: '🔍 0px (100% Nítido)', blur: 0 },
                              { label: '🌫️ 4px (Leve)', blur: 4 },
                              { label: '💨 10px (Medio / Cristal)', blur: 10 },
                              { label: '☁️ 18px (Fuerte)', blur: 18 },
                              { label: '🌌 28px (Ultra Borroso)', blur: 28 },
                            ].map((b) => {
                              const currentBlur = bannerForm.filtro_blur !== undefined ? Number(bannerForm.filtro_blur) : 0
                              const isSelected = currentBlur === b.blur
                              return (
                                <button
                                  key={b.blur}
                                  type="button"
                                  onClick={() => setBannerForm({ ...bannerForm, filtro_blur: b.blur })}
                                  className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-outline-primary'}`}
                                  style={{ fontSize: '0.78rem', padding: '0.4rem 0.8rem', fontWeight: 700, borderRadius: '8px' }}
                                >
                                  {b.label}
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        {/* Foto de Fondo con Galería Rápida y Subida */}
                        <div style={{ background: 'var(--bg-alt)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                          <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <i className="fa fa-image" /> Fotografía de Fondo del Paisaje
                          </h4>
                          <p className="text-muted" style={{ fontSize: '0.8rem', margin: '0 0 0.75rem 0' }}>
                            Selecciona una foto panorámica de los Montes de María o sube tu propia imagen:
                          </p>

                          {/* Fotos de fondo predeterminadas */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.5rem', marginBottom: '0.85rem' }}>
                            {[
                              { label: 'Panorámica Montes', img: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=80' },
                              { label: 'Cultivos y Finca', img: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80' },
                              { label: 'Montañas Campesinas', img: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80' },
                              { label: 'Cosecha de Tierra', img: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=800&q=80' },
                            ].map((p, pIdx) => {
                              const isSelected = (bannerBgPreview || bannerForm.imagen_fondo) === p.img
                              return (
                                <div
                                  key={pIdx}
                                  onClick={() => {
                                    setBannerBgFile(null)
                                    setBannerBgPreview(p.img)
                                    setBannerForm((prev) => ({ ...prev, imagen_fondo: p.img }))
                                  }}
                                  style={{
                                    border: isSelected ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    cursor: 'pointer',
                                    position: 'relative',
                                    height: '70px',
                                  }}
                                >
                                  <img src={p.img} alt={p.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  <span style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: '0.68rem', padding: '2px 4px', textAlign: 'center', fontWeight: 600 }}>
                                    {p.label}
                                  </span>
                                </div>
                              )
                            })}
                          </div>

                          <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem' }}>O Subir Fotografía Personalizada:</label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files[0]
                              if (file) {
                                setBannerBgFile(file)
                                setBannerBgPreview(URL.createObjectURL(file))
                              }
                            }}
                            className="form-input"
                          />
                        </div>
                      </div>
                    )}

                    {/* ══════════════════════════════════════════════════════════
                        TAB 5: BOTONES, CUPÓN & ORDEN
                       ══════════════════════════════════════════════════════════ */}
                    {bannerModalTab === 'botones' && (
                      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ background: 'var(--bg-alt)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                          <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--primary-color)' }}>
                            <i className="fa fa-mouse-pointer" /> Botones de Acción (Llamado a la Acción)
                          </h4>

                          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <div className="form-group">
                              <label className="form-label">Texto Botón 1 (Principal)</label>
                              <input
                                type="text"
                                value={bannerForm.boton_principal_texto}
                                onChange={(e) => setBannerForm({ ...bannerForm, boton_principal_texto: e.target.value })}
                                className="form-input"
                              />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Enlace Botón 1</label>
                              <input
                                type="text"
                                value={bannerForm.boton_principal_link}
                                onChange={(e) => setBannerForm({ ...bannerForm, boton_principal_link: e.target.value })}
                                className="form-input"
                              />
                            </div>
                          </div>

                          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                            <div className="form-group">
                              <label className="form-label">Texto Botón 2 (Secundario)</label>
                              <input
                                type="text"
                                value={bannerForm.boton_secundario_texto}
                                onChange={(e) => setBannerForm({ ...bannerForm, boton_secundario_texto: e.target.value })}
                                className="form-input"
                              />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Enlace Botón 2</label>
                              <input
                                type="text"
                                value={bannerForm.boton_secundario_link}
                                onChange={(e) => setBannerForm({ ...bannerForm, boton_secundario_link: e.target.value })}
                                className="form-input"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Cupón Promocional Asociado */}
                        <div style={{ background: 'var(--bg-alt)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                          <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--primary-color)' }}>
                            <i className="fa fa-ticket-alt" /> Cupón de Descuento Promocional (Opcional)
                          </h4>

                          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '0.75rem' }}>
                            <div className="form-group">
                              <label className="form-label">Código del Cupón</label>
                              <input
                                type="text"
                                placeholder="Ej: CAMPO20"
                                value={bannerForm.cupon_codigo}
                                onChange={(e) => setBannerForm({ ...bannerForm, cupon_codigo: e.target.value.toUpperCase() })}
                                className="form-input"
                              />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Mensaje Promocional</label>
                              <input
                                type="text"
                                placeholder="Ej: ⚡ ¡Usa CAMPO20 y obtén 20% OFF!"
                                value={bannerForm.cupon_texto}
                                onChange={(e) => setBannerForm({ ...bannerForm, cupon_texto: e.target.value })}
                                className="form-input"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Orden y Activación */}
                        <div style={{ background: 'var(--bg-alt)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                          <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--primary-color)' }}>
                            <i className="fa fa-sort-numeric-down" /> Orden & Estado
                          </h4>
                          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', alignItems: 'center' }}>
                            <div className="form-group">
                              <label className="form-label">Orden de Aparición</label>
                              <input
                                type="number"
                                min="0"
                                value={bannerForm.orden}
                                onChange={(e) => setBannerForm({ ...bannerForm, orden: Number(e.target.value) })}
                                className="form-input"
                              />
                            </div>
                            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.25rem' }}>
                              <input
                                type="checkbox"
                                id="bannerActivo"
                                checked={bannerForm.activo === 1}
                                onChange={(e) => setBannerForm({ ...bannerForm, activo: e.target.checked ? 1 : 0 })}
                                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary-color)' }}
                              />
                              <label htmlFor="bannerActivo" style={{ cursor: 'pointer', fontWeight: 700 }}>
                                Mostrar Activo en Carrusel
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step Navigation & Action Buttons */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {bannerModalTab !== 'estilo' && (
                          <button
                            type="button"
                            onClick={() => {
                              const tabs = ['estilo', 'textos', 'producto', 'fondo', 'botones']
                              const currIdx = tabs.indexOf(bannerModalTab)
                              if (currIdx > 0) setBannerModalTab(tabs[currIdx - 1])
                            }}
                            className="btn btn-secondary btn-sm"
                          >
                            ← Anterior
                          </button>
                        )}
                        {bannerModalTab !== 'botones' && (
                          <button
                            type="button"
                            onClick={() => {
                              const tabs = ['estilo', 'textos', 'producto', 'fondo', 'botones']
                              const currIdx = tabs.indexOf(bannerModalTab)
                              if (currIdx < tabs.length - 1) setBannerModalTab(tabs[currIdx + 1])
                            }}
                            className="btn btn-outline-primary btn-sm"
                          >
                            Siguiente Paso →
                          </button>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button type="button" onClick={() => setShowBannerModal(false)} className="btn btn-secondary">
                          Cancelar
                        </button>
                        <button type="submit" disabled={bannerSaving} className="btn btn-primary" style={{ padding: '0.65rem 1.6rem', fontWeight: 800 }}>
                          {bannerSaving ? <><i className="fa fa-spinner fa-spin" /> Guardando...</> : <><i className="fa fa-save" /> Guardar Banner</>}
                        </button>
                      </div>
                    </div>
                  </form>

                  {/* Right Column: Sticky Real-Time Live Preview */}
                  <div style={{ padding: '1.25rem 1.5rem', backgroundColor: 'var(--bg-alt)', display: 'flex', flexDirection: 'column', gap: '0.85rem', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 800, color: 'var(--primary-color)', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <i className="fa fa-eye" /> Vista Previa en Vivo (Tiempo Real)
                      </span>
                      <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>
                        Plantilla: {(bannerForm.estilo_plantilla || 'clasico').toUpperCase()}
                      </span>
                    </div>

                    {/* Quick Style Switcher Pills for Live Testing */}
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      {[
                        { id: 'clasico', label: '🌿 Clásico' },
                        { id: 'inmersivo', label: '🌌 Inmersivo' },
                        { id: 'oferta_flash', label: '⚡ Oferta Flash' },
                        { id: 'mosaico', label: '🏛️ Mosaico' },
                        { id: 'historia_campesina', label: '👨‍🌾 Historia' },
                      ].map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setBannerForm({ ...bannerForm, estilo_plantilla: s.id })}
                          style={{
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            padding: '3px 9px',
                            borderRadius: '999px',
                            border: (bannerForm.estilo_plantilla || 'clasico') === s.id ? '1.5px solid var(--primary-color)' : '1px solid var(--border-color)',
                            backgroundColor: (bannerForm.estilo_plantilla || 'clasico') === s.id ? 'var(--primary-color)' : 'var(--card-bg)',
                            color: (bannerForm.estilo_plantilla || 'clasico') === s.id ? '#ffffff' : 'var(--text-color)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>

                    {/* Live Render Card */}
                    <div
                      style={{
                        borderRadius: '16px',
                        overflow: 'hidden',
                        boxShadow: '0 15px 35px rgba(0,0,0,0.3)',
                        minHeight: '440px',
                        display: 'flex',
                        position: 'relative',
                      }}
                    >
                      <HeroSlideRenderer
                        slide={{
                          id: editingBanner?.id_banner || 999,
                          estilo_plantilla: bannerForm.estilo_plantilla || 'clasico',
                          filtro_blur: bannerForm.filtro_blur !== undefined ? Number(bannerForm.filtro_blur) : 0,
                          accentColor: bannerForm.color_acento || '#22c55e',
                          color_acento: bannerForm.color_acento || '#22c55e',
                          categoryName: bannerForm.categoria_nombre || 'Cosechas Frescas',
                          categoria_nombre: bannerForm.categoria_nombre || 'Cosechas Frescas',
                          categoryThumb: bannerThumbPreview || bannerForm.categoria_thumb || '/img/verduras.avif',
                          categoria_thumb: bannerThumbPreview || bannerForm.categoria_thumb || '/img/verduras.avif',
                          categorySlug: bannerForm.categoria_slug || 'cosechas',
                          categoria_slug: bannerForm.categoria_slug || 'cosechas',
                          title: bannerForm.titulo || 'Título Principal del Banner',
                          titulo: bannerForm.titulo || 'Título Principal del Banner',
                          subtitle: bannerForm.subtitulo || 'Subtítulo descriptivo de cosechas y productos de los Montes de María...',
                          subtitulo: bannerForm.subtitulo || 'Subtítulo descriptivo de cosechas y productos de los Montes de María...',
                          features: featuresInput.split('\n').map((f) => f.trim()).filter(Boolean),
                          primaryBtn: {
                            text: bannerForm.boton_principal_texto || 'Ver Catálogo',
                            link: bannerForm.boton_principal_link || '/catalogo',
                            icon: 'fa-shopping-basket',
                          },
                          boton_principal_texto: bannerForm.boton_principal_texto || 'Ver Catálogo',
                          boton_principal_link: bannerForm.boton_principal_link || '/catalogo',
                          secondaryBtn: {
                            text: bannerForm.boton_secundario_texto || 'Vender mis Productos',
                            link: bannerForm.boton_secundario_link || '/vendedor',
                            icon: 'fa-store',
                          },
                          boton_secundario_texto: bannerForm.boton_secundario_texto || 'Vender mis Productos',
                          boton_secundario_link: bannerForm.boton_secundario_link || '/vendedor',
                          showcaseImage: bannerProdImgPreview || bannerForm.tarjeta_imagen || '/img/Ñame.avif',
                          tarjeta_imagen: bannerProdImgPreview || bannerForm.tarjeta_imagen || '/img/Ñame.avif',
                          showcaseTitle: bannerForm.tarjeta_titulo || 'Nombre del Producto',
                          tarjeta_titulo: bannerForm.tarjeta_titulo || 'Nombre del Producto',
                          showcasePrice: bannerForm.tarjeta_precio || '$6.000 COP',
                          tarjeta_precio: bannerForm.tarjeta_precio || '$6.000 COP',
                          farmerName: bannerForm.tarjeta_vendedor_nombre || 'Roberto Carlos Salcedo',
                          tarjeta_vendedor_nombre: bannerForm.tarjeta_vendedor_nombre || 'Roberto Carlos Salcedo',
                          floatPillTop: bannerForm.tarjeta_badge_top || '🌿 100% Campo',
                          tarjeta_badge_top: bannerForm.tarjeta_badge_top || '🌿 100% Campo',
                          floatPillBottom: bannerForm.tarjeta_vendedor_rating || '⭐ 4.9/5 Calidad',
                          tarjeta_vendedor_rating: bannerForm.tarjeta_vendedor_rating || '⭐ 4.9/5 Calidad',
                          backgroundImage: bannerBgPreview || bannerForm.imagen_fondo || 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=80',
                          imagen_fondo: bannerBgPreview || bannerForm.imagen_fondo || 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=80',
                          cupon_codigo: bannerForm.cupon_codigo || '',
                          cupon_texto: bannerForm.cupon_texto || '',
                        }}
                        isPreview={true}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal Crear / Editar Cupón de Descuento */}
          {showCreateCouponModal && (
            <div className="modal-overlay fade-in" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
              <div className="modal-content card" style={{ maxWidth: '680px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', borderRadius: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                  <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <i className="fa fa-ticket-alt text-primary" />
                    {editingCoupon ? `Editar Cupón: ${editingCoupon.codigo}` : 'Crear Nuevo Cupón de Descuento'}
                  </h3>
                  <button onClick={() => setShowCreateCouponModal(false)} className="btn-icon">
                    <i className="fa fa-times" />
                  </button>
                </div>

                {couponError && (
                  <div className="alert alert-danger" style={{ marginBottom: '1.25rem' }}>
                    <i className="fa fa-exclamation-circle" /> {couponError}
                  </div>
                )}

                <form onSubmit={handleSaveCoupon} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Selector de Porcentaje de Descuento Rápido */}
                  <div style={{ background: 'var(--bg-alt)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
                      <i className="fa fa-percentage text-success" /> Porcentaje de Descuento *
                    </label>
                    <p className="text-muted" style={{ fontSize: '0.82rem', margin: '0 0 0.75rem 0' }}>
                      Elige un porcentaje predefinido o escribe cualquier valor personalizado:
                    </p>

                    {/* Presets Grid */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.85rem' }}>
                      {[2, 3, 4, 5, 10, 15, 20, 25, 30, 40, 50].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => {
                            setCouponForm((prev) => ({ ...prev, descuento_porcentaje: pct, descuento_fijo: 0 }))
                            handleGenerateRandomCoupon(pct)
                          }}
                          className={`btn btn-sm ${Number(couponForm.descuento_porcentaje) === pct ? 'btn-primary' : 'btn-outline-primary'}`}
                          style={{
                            fontWeight: 700,
                            borderRadius: '8px',
                            minWidth: '52px',
                            padding: '0.35rem 0.6rem',
                          }}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>

                    <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.85rem' }}>% Descuento Personalizado</label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            step="0.5"
                            value={couponForm.descuento_porcentaje}
                            onChange={(e) => setCouponForm({ ...couponForm, descuento_porcentaje: e.target.value, descuento_fijo: 0 })}
                            className="form-input"
                            placeholder="Ej: 12"
                            required={!couponForm.descuento_fijo}
                          />
                          <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: '#64748b' }}>%</span>
                        </div>
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.85rem' }}>O Monto Fijo en COP</label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            value={couponForm.descuento_fijo}
                            onChange={(e) => setCouponForm({ ...couponForm, descuento_fijo: e.target.value, descuento_porcentaje: 0 })}
                            className="form-input"
                            placeholder="Ej: 15000"
                          />
                          <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: '#64748b', fontSize: '0.8rem' }}>COP</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Código del Cupón y Generador Random */}
                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>
                        <i className="fa fa-barcode text-primary" /> Código del Cupón *
                      </label>
                      <button
                        type="button"
                        onClick={() => handleGenerateRandomCoupon()}
                        className="btn btn-outline-primary btn-sm"
                        style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        <i className="fa fa-dice" /> Generar Código Random
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="Ej: MONTES20-A1B2 o BIENVENIDO10"
                      value={couponForm.codigo}
                      onChange={(e) => setCouponForm({ ...couponForm, codigo: e.target.value.toUpperCase() })}
                      className="form-input"
                      style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1.05rem', letterSpacing: '1px' }}
                    />
                    <small className="text-muted" style={{ display: 'block', marginTop: '4px' }}>
                      El código será usado por el cliente al pagar. Se guarda automáticamente en mayúsculas.
                    </small>
                  </div>

                  {/* Descripción */}
                  <div className="form-group">
                    <label className="form-label">Descripción / Motivo</label>
                    <input
                      type="text"
                      placeholder="Ej: Descuento especial por temporada de cosecha o bienvenida"
                      value={couponForm.descripcion}
                      onChange={(e) => setCouponForm({ ...couponForm, descripcion: e.target.value })}
                      className="form-input"
                    />
                  </div>

                  {/* Condiciones de Compra y Límites */}
                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.85rem' }}>Límite de Usos</label>
                      <input
                        type="number"
                        min="1"
                        placeholder="Sin límite"
                        value={couponForm.uso_limite}
                        onChange={(e) => setCouponForm({ ...couponForm, uso_limite: e.target.value })}
                        className="form-input"
                      />
                      <small className="text-muted" style={{ fontSize: '0.72rem' }}>1 = uso único</small>
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.85rem' }}>Compra Mínima (COP)</label>
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        placeholder="$0 (Sin mínimo)"
                        value={couponForm.monto_minimo}
                        onChange={(e) => setCouponForm({ ...couponForm, monto_minimo: e.target.value })}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.85rem' }}>Fecha de Expiración</label>
                      <input
                        type="date"
                        value={couponForm.fecha_expiracion}
                        onChange={(e) => setCouponForm({ ...couponForm, fecha_expiracion: e.target.value })}
                        className="form-input"
                      />
                      <small className="text-muted" style={{ fontSize: '0.72rem' }}>Opcional</small>
                    </div>
                  </div>

                  {/* Vista Previa del Cupón */}
                  <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                      Vista previa del cupón generado:
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', background: '#ecfdf5', padding: '0.85rem 1.25rem', borderRadius: '8px', border: '1.5px dashed #059669' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <i className="fa fa-ticket-alt" style={{ color: '#059669', fontSize: '1.2rem' }} />
                          <span style={{ fontFamily: 'monospace', fontWeight: 900, color: '#065f46', fontSize: '1.15rem' }}>
                            {couponForm.codigo || 'CODIGO-EJEMPLO'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#047857', marginTop: '2px' }}>
                          {couponForm.descripcion || 'Descuento especial'}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span className="badge badge-success" style={{ fontSize: '0.95rem', fontWeight: 800, padding: '0.4rem 0.8rem' }}>
                          {Number(couponForm.descuento_porcentaje) > 0
                            ? `⚡ ${couponForm.descuento_porcentaje}% OFF`
                            : `💰 ${formatCOP(couponForm.descuento_fijo)} OFF`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Promocionar en la Barra Superior de la Tienda */}
                  <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '10px', border: '1.5px solid #86efac' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: couponForm.promocionar_en_barra ? '0.75rem' : 0 }}>
                      <input
                        type="checkbox"
                        id="coupon_promocionar_en_barra"
                        checked={couponForm.promocionar_en_barra}
                        onChange={(e) => setCouponForm({ ...couponForm, promocionar_en_barra: e.target.checked })}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <label htmlFor="coupon_promocionar_en_barra" style={{ cursor: 'pointer', fontWeight: 700, margin: 0, color: '#14532d', fontSize: '0.9rem' }}>
                        <i className="fa fa-bullhorn text-success" /> Promocionar este cupón en la Barra Superior de la Tienda
                      </label>
                    </div>

                    {couponForm.promocionar_en_barra && (
                      <div className="form-group" style={{ margin: 0, marginTop: '0.5rem' }}>
                        <label className="form-label" style={{ fontSize: '0.82rem', color: '#166534' }}>
                          Mensaje que aparecerá en la barra superior:
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: 🔥 ¡Temporada de Cosecha! Usa el cupón CAMPO20 y obtén 20% de descuento"
                          value={couponForm.mensaje_promocional}
                          onChange={(e) => setCouponForm({ ...couponForm, mensaje_promocional: e.target.value })}
                          className="form-input"
                          style={{ backgroundColor: '#ffffff' }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Estado Activo */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="checkbox"
                      id="coupon_activo"
                      checked={couponForm.activo}
                      onChange={(e) => setCouponForm({ ...couponForm, activo: e.target.checked })}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <label htmlFor="coupon_activo" style={{ cursor: 'pointer', fontWeight: 600, margin: 0 }}>
                      Habilitar cupón inmediatamente para los compradores
                    </label>
                  </div>

                  {/* Botones */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                    <button
                      type="button"
                      onClick={() => setShowCreateCouponModal(false)}
                      className="btn btn-secondary"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={couponSaving}
                      className="btn btn-primary"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}
                    >
                      {couponSaving ? (
                        <>
                          <i className="fa fa-spinner fa-spin" /> Guardando...
                        </>
                      ) : (
                        <>
                          <i className="fa fa-check" />
                          {editingCoupon ? 'Guardar Cambios' : 'Crear Cupón'}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  )
}
