const crypto = require('crypto');

class CouponController {
  constructor(couponRepository) {
    this.couponRepository = couponRepository;
  }

  // Generador de código aleatorio único y memorable
  generarCodigoAleatorio(porcentaje = 10, prefijo = 'MONTES') {
    const randomChars = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 chars
    const p = Math.round(Number(porcentaje) || 10);
    return `${prefijo}${p}-${randomChars}`;
  }

  // Validar cupón durante el checkout
  async validarCupon(req, res) {
    try {
      let { codigo, total, monto_compra } = req.body || {};
      if (typeof codigo === 'object' && codigo !== null) {
        total = codigo.total !== undefined ? codigo.total : (codigo.monto_compra !== undefined ? codigo.monto_compra : total);
        codigo = codigo.codigo || codigo.code;
      }
      if (!codigo || !String(codigo).trim()) {
        return res.status(400).json({ error: 'Por favor ingresa un código de cupón.' });
      }

      const rawCode = String(codigo).trim().toUpperCase();
      const totalNum = Number(total !== undefined ? total : (monto_compra !== undefined ? monto_compra : 0)) || 0;
      let cupon = await this.couponRepository.obtenerPorCodigo(rawCode);

      // Fallback a cupones del sistema si la tabla no tuviera el registro
      if (!cupon) {
        const SYSTEM_COUPONS = {
          'AGRO10': { id_cupon: 991, codigo: 'AGRO10', descripcion: '10% de descuento en toda la tienda', descuento_porcentaje: 10, descuento_fijo: 0, monto_minimo: 0, activo: 1 },
          'BIENVENIDO': { id_cupon: 992, codigo: 'BIENVENIDO', descripcion: '15% de descuento especial de bienvenida', descuento_porcentaje: 15, descuento_fijo: 0, monto_minimo: 0, activo: 1 },
          'CAMPO20': { id_cupon: 993, codigo: 'CAMPO20', descripcion: '$20.000 COP de descuento', descuento_porcentaje: 0, descuento_fijo: 20000, monto_minimo: 50000, activo: 1 },
          'COSECHA5': { id_cupon: 994, codigo: 'COSECHA5', descripcion: '5% de descuento en cosechas', descuento_porcentaje: 5, descuento_fijo: 0, monto_minimo: 0, activo: 1 },
        };
        if (SYSTEM_COUPONS[rawCode]) {
          cupon = SYSTEM_COUPONS[rawCode];
        }
      }

      if (!cupon) {
        return res.status(404).json({ error: 'El cupón ingresado no existe.' });
      }

      if (!cupon.activo) {
        return res.status(400).json({ error: 'Este cupón se encuentra inactivo o deshabilitado.' });
      }

      // Validar fecha de expiración
      if (cupon.fecha_expiracion) {
        const expDate = new Date(cupon.fecha_expiracion);
        if (new Date() > expDate) {
          return res.status(400).json({ error: 'Este cupón ha expirado.' });
        }
      }

      // Validar límite de usos
      if (cupon.uso_limite !== null && cupon.uso_limite !== undefined && Number(cupon.uso_limite) > 0) {
        if (Number(cupon.uso_actual || 0) >= Number(cupon.uso_limite)) {
          return res.status(400).json({ error: 'Este cupón ha alcanzado el límite máximo de usos.' });
        }
      }

      // Validar monto mínimo
      if (cupon.monto_minimo && Number(cupon.monto_minimo) > 0) {
        if (totalNum < Number(cupon.monto_minimo)) {
          const minFormatted = Number(cupon.monto_minimo).toLocaleString('es-CO');
          return res.status(400).json({
            error: `Este cupón requiere una compra mínima de $${minFormatted} COP.`
          });
        }
      }

      // Calcular descuento
      let descuentoCalculado = 0;
      const pct = Number(cupon.descuento_porcentaje || 0);
      const fijo = Number(cupon.descuento_fijo || 0);

      if (pct > 0) {
        descuentoCalculado = (totalNum * pct) / 100;
      } else if (fijo > 0) {
        descuentoCalculado = Math.min(totalNum, fijo);
      }

      const nuevoTotal = Math.max(0, totalNum - descuentoCalculado);
      const descuentoRedondeado = Math.round(descuentoCalculado);
      const nuevoTotalRedondeado = Math.round(nuevoTotal);

      return res.json({
        valido: true,
        cupon: {
          id_cupon: cupon.id_cupon,
          codigo: cupon.codigo,
          descripcion: cupon.descripcion,
          descuento_porcentaje: pct,
          descuento_fijo: fijo,
          descuento: descuentoRedondeado,
          subtotal_original: totalNum,
          nuevo_total: nuevoTotalRedondeado,
        },
        id_cupon: cupon.id_cupon,
        codigo: cupon.codigo,
        descripcion: cupon.descripcion,
        porcentaje: pct,
        descuento_fijo: fijo,
        descuento_calculado: descuentoRedondeado,
        subtotal_original: totalNum,
        nuevo_total: nuevoTotalRedondeado,
        mensaje: pct > 0
          ? `¡Cupón ${cupon.codigo} aplicado! -${pct}% de descuento`
          : `¡Cupón ${cupon.codigo} aplicado! -$${descuentoRedondeado.toLocaleString('es-CO')} COP`
      });
    } catch (error) {
      console.error('Error en validarCupon:', error);
      res.status(500).json({ error: 'Error al validar el cupón.' });
    }
  }

  // Listar cupones para el panel de administración
  async listarCupones(req, res) {
    try {
      const cupones = await this.couponRepository.obtenerTodos();
      res.json({ cupones });
    } catch (error) {
      console.error('Error en listarCupones:', error);
      res.status(500).json({ error: 'Error al obtener cupones.' });
    }
  }

  // Crear cupón desde el panel admin
  async crearCupon(req, res) {
    try {
      let {
        codigo,
        descripcion,
        descuento_porcentaje,
        descuento_fijo,
        monto_minimo,
        uso_limite,
        fecha_expiracion,
        activo,
        generar_random,
        prefijo_random
      } = req.body;

      const pct = Number(descuento_porcentaje || 0);

      // Si solicitó generar random o no ingresó código
      if (generar_random || !codigo || !codigo.trim()) {
        codigo = this.generarCodigoAleatorio(pct || 10, prefijo_random || 'MONTES');
      } else {
        codigo = codigo.toUpperCase().trim().replace(/[^A-Z0-9_-]/g, '');
      }

      // Verificar si ya existe
      const existente = await this.couponRepository.obtenerPorCodigo(codigo);
      if (existente) {
        return res.status(400).json({ error: `Ya existe un cupón con el código '${codigo}'.` });
      }

      const nuevoCupon = await this.couponRepository.crear({
        codigo,
        descripcion: descripcion || null,
        descuento_porcentaje: pct,
        descuento_fijo: Number(descuento_fijo || 0),
        monto_minimo: Number(monto_minimo || 0),
        uso_limite: uso_limite ? Number(uso_limite) : null,
        uso_actual: 0,
        fecha_expiracion: fecha_expiracion || null,
        activo: activo !== undefined ? (activo ? 1 : 0) : 1
      });

      res.status(201).json({
        success: true,
        cupon: nuevoCupon,
        mensaje: `¡Cupón '${codigo}' creado exitosamente!`
      });
    } catch (error) {
      console.error('Error en crearCupon:', error);
      res.status(500).json({ error: 'Error al crear el cupón.' });
    }
  }

  // Actualizar cupón
  async actualizarCupon(req, res) {
    try {
      const id = req.params.id;
      const {
        codigo,
        descripcion,
        descuento_porcentaje,
        descuento_fijo,
        monto_minimo,
        uso_limite,
        fecha_expiracion,
        activo,
        promocionar_en_barra,
        mensaje_promocional
      } = req.body;

      if (!codigo || !codigo.trim()) {
        return res.status(400).json({ error: 'El código del cupón es obligatorio.' });
      }

      const cleanCode = codigo.toUpperCase().trim();
      const existente = await this.couponRepository.obtenerPorCodigo(cleanCode);
      if (existente && String(existente.id_cupon) !== String(id)) {
        return res.status(400).json({ error: `Ya existe otro cupón con el código '${cleanCode}'.` });
      }

      await this.couponRepository.actualizar(id, {
        codigo: cleanCode,
        descripcion: descripcion || null,
        descuento_porcentaje: Number(descuento_porcentaje || 0),
        descuento_fijo: Number(descuento_fijo || 0),
        monto_minimo: Number(monto_minimo || 0),
        uso_limite: uso_limite ? Number(uso_limite) : null,
        fecha_expiracion: fecha_expiracion || null,
        activo: activo ? 1 : 0,
        promocionar_en_barra: promocionar_en_barra ? 1 : 0,
        mensaje_promocional: mensaje_promocional ? mensaje_promocional.trim() : null
      });

      const actualizado = await this.couponRepository.obtenerPorId(id);
      res.json({
        success: true,
        cupon: actualizado,
        mensaje: 'Cupón actualizado correctamente.'
      });
    } catch (error) {
      console.error('Error en actualizarCupon:', error);
      res.status(500).json({ error: 'Error al actualizar el cupón.' });
    }
  }

  // Activar / Desactivar cupón
  async toggleCupon(req, res) {
    try {
      const id = req.params.id;
      await this.couponRepository.toggleActivo(id);
      const cupon = await this.couponRepository.obtenerPorId(id);
      res.json({
        success: true,
        cupon,
        mensaje: `Cupón ${cupon.activo ? 'activado' : 'desactivado'} con éxito.`
      });
    } catch (error) {
      console.error('Error en toggleCupon:', error);
      res.status(500).json({ error: 'Error al cambiar estado del cupón.' });
    }
  }

  // Activar / Desactivar promoción en la barra de la tienda
  async togglePromocionCupon(req, res) {
    try {
      const id = req.params.id;
      await this.couponRepository.togglePromocion(id);
      const cupon = await this.couponRepository.obtenerPorId(id);
      res.json({
        success: true,
        cupon,
        mensaje: `Promoción en barra ${cupon.promocionar_en_barra ? 'activada' : 'desactivada'}.`
      });
    } catch (error) {
      console.error('Error en togglePromocionCupon:', error);
      res.status(500).json({ error: 'Error al cambiar estado de promoción en barra.' });
    }
  }

  // Obtener cupones promocionales activos para la barra de la tienda (Público)
  async obtenerCuponesPromocionales(req, res) {
    try {
      const cupones = await this.couponRepository.obtenerPromocionales();
      res.json({ success: true, cupones });
    } catch (error) {
      console.error('Error en obtenerCuponesPromocionales:', error);
      res.status(500).json({ error: 'Error al obtener cupones promocionales.' });
    }
  }

  // Eliminar cupón
  async eliminarCupon(req, res) {
    try {
      const id = req.params.id;
      await this.couponRepository.eliminar(id);
      res.json({ success: true, mensaje: 'Cupón eliminado exitosamente.' });
    } catch (error) {
      console.error('Error en eliminarCupon:', error);
      res.status(500).json({ error: 'Error al eliminar el cupón.' });
    }
  }
}

module.exports = CouponController;
