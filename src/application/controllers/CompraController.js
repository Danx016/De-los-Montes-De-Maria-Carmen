/**
 * Controlador: CompraController
 * Maneja el flujo de compras, estados de despacho, OTP, recibos y Wompi
 */
const UpdateOrderStatus = require('../../domain/use-cases/purchase/UpdateOrderStatus');
const GenerateWompiSignature = require('../../domain/use-cases/purchase/GenerateWompiSignature');

class CompraController {
  constructor({ compraRepository, productoRepository, usuarioRepository, tokenRepository, emailService, paymentService, couponRepository }) {
    this.compraRepository = compraRepository;
    this.productoRepository = productoRepository;
    this.usuarioRepository = usuarioRepository;
    this.tokenRepository = tokenRepository;
    this.emailService = emailService;
    this.paymentService = paymentService;
    this.couponRepository = couponRepository;
    this.updateOrderStatus = new UpdateOrderStatus(compraRepository, usuarioRepository, emailService);
    this.generateWompiSignature = new GenerateWompiSignature(paymentService);
  }


  async wompiFirma(req, res) {
    try {
      const { reference, amountInCents, currency } = req.body;
      const signatureData = this.generateWompiSignature.execute(reference, amountInCents, currency);
      res.json(signatureData);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async obtenerCreditos(req, res) {
    try {
      const userId = req.user.id;
      const user = await this.usuarioRepository.buscarPorId(userId);
      res.json({ creditos: user ? user.creditos : 0 });
    } catch (error) {
      res.status(500).json({ error: 'Error al consultar créditos' });
    }
  }

  async crear(req, res) {
    try {
      let { idUser, id_usuario, productos, total, metodoPago, metodo_pago, direccion, direccion_envio, shippingInfo } = req.body;

      const userId = req.user?.id || req.user?.id_usuario || idUser || id_usuario;

      if (!userId || !productos || productos.length === 0 || !total) {
        return res.status(400).json({ error: 'Datos de compra incompletos (usuario, productos o total requerido).' });
      }

      const paymentMethod = metodoPago || metodo_pago || 'Contra Entrega (Efectivo)';
      let shippingAddress = direccion || direccion_envio;
      if (!shippingAddress && shippingInfo) {
        shippingAddress = `${shippingInfo.direccion || ''}, ${shippingInfo.ciudad || shippingInfo.municipio || ''} ${shippingInfo.departamento || ''} (Tel: ${shippingInfo.telefono || ''})`;
      }
      shippingAddress = shippingAddress || 'Dirección de entrega';

      if (paymentMethod === 'Agro-Créditos') {
        const user = await this.usuarioRepository.buscarPorId(userId);
        if (!user || user.creditos < parseFloat(total)) {
          return res.status(400).json({ error: 'Créditos insuficientes en tu cuenta.' });
        }
        await this.usuarioRepository.descontarCreditos(userId, parseFloat(total));
      }

      const compraCreada = await this.compraRepository.crear({
        id_usuario: userId,
        total: parseFloat(total),
        metodo_pago: paymentMethod,
        direccion_envio: shippingAddress,
        productos
      });

      // Incrementar uso de cupón si fue aplicado
      const cuponAplicado = req.body.codigo_cupon || req.body.cupon || req.body.codigoCupon;
      if (cuponAplicado && this.couponRepository) {
        try {
          await this.couponRepository.incrementarUso(cuponAplicado);
        } catch (couponErr) {
          console.warn('No se pudo incrementar uso de cupón:', couponErr.message);
        }
      }

      // Auto-send invoice email
      try {
        const recibo = await this.compraRepository.obtenerReciboCompleto(compraCreada.id_compra);
        if (recibo && recibo.correo_cliente) {
          await this.emailService.sendInvoiceEmail(recibo, recibo.correo_cliente);
        }
      } catch (emailErr) {
        console.warn('No se pudo enviar la factura por correo:', emailErr.message);
      }

      res.status(201).json({
        success: true,
        id_compra: compraCreada.id_compra,
        idCompra: compraCreada.id_compra,
        message: 'Compra registrada con éxito'
      });
    } catch (error) {
      console.error('Error al registrar compra:', error);
      res.status(500).json({ error: 'Error en el servidor al procesar la compra' });
    }
  }

  async historialUsuario(req, res) {
    try {
      const idUsuario = parseInt(req.params.id_usuario, 10);
      const role = req.user.role;

      if (parseInt(req.user.id, 10) !== idUsuario && role !== 1 && role !== 2) {
        return res.status(403).json({ error: 'No tienes permiso para ver el historial de otro usuario.' });
      }

      const compras = await this.compraRepository.listarPorUsuario(idUsuario);
      res.json(compras.map(c => c.toJSON()));
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener historial de compras' });
    }
  }

  async obtenerRecibo(req, res) {
    try {
      const idCompra = req.params.id_compra;
      const recibo = await this.compraRepository.obtenerReciboCompleto(idCompra);
      if (!recibo) return res.status(404).json({ error: 'Recibo no encontrado' });

      const role = req.user.role;
      if (parseInt(req.user.id, 10) !== parseInt(recibo.id_usuario, 10) && role !== 1 && role !== 2) {
        return res.status(403).json({ error: 'No tienes permiso para acceder a este recibo.' });
      }

      res.json(recibo);
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener datos del recibo' });
    }
  }

  async enviarReciboCorreo(req, res) {
    try {
      const { idCompra, email } = req.body;
      const recibo = await this.compraRepository.obtenerReciboCompleto(idCompra);
      if (!recibo) return res.status(404).json({ error: 'Compra no encontrada' });

      const role = req.user.role;
      if (parseInt(req.user.id, 10) !== parseInt(recibo.id_usuario, 10) && role !== 1 && role !== 2) {
        return res.status(403).json({ error: 'No tienes permiso para enviar este recibo.' });
      }

      await this.emailService.sendInvoiceEmail(recibo, email);
      res.json({ success: true, message: 'Factura enviada correctamente por correo electrónico.' });
    } catch (error) {
      res.status(500).json({ error: 'Error al enviar factura por correo' });
    }
  }

  async actualizarEstadoDespacho(req, res) {
    try {
      const { id_compra } = req.params;
      const { estado } = req.body;
      if (!estado) return res.status(400).json({ error: 'Falta especificar el estado de despacho' });

      const result = await this.updateOrderStatus.execute(id_compra, estado);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async listarTodasVendedor(req, res) {
    try {
      const compras = await this.compraRepository.listarParaVendedores();
      res.json(compras);
    } catch (error) {
      res.status(500).json({ error: 'Error al recuperar registros de pedidos' });
    }
  }

  async enviarOtp(req, res) {
    try {
      const { email, nombre, total } = req.body;
      const targetEmail = (email || req.user?.correo || '').trim().toLowerCase();
      if (!targetEmail) {
        return res.status(400).json({ error: 'Falta especificar el correo electrónico.' });
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      await this.tokenRepository.guardarOtp(targetEmail, code, 10);
      console.log(`[OTP] Generado código para ${targetEmail}: ${code}`);

      const sent = await this.emailService.sendPurchaseOtpEmail(targetEmail, nombre || req.user?.nombre, code, total);
      if (!sent) {
        console.warn(`[OTP] Advertencia: El correo SMTP falló para ${targetEmail}, pero el código de respaldo en sesión es válido.`);
      }

      res.json({ 
        success: true, 
        message: `Código de seguridad enviado a ${targetEmail}`
      });
    } catch (error) {
      console.error('Error al enviar OTP de compra:', error);
      res.status(500).json({ error: 'Error al enviar código de seguridad al correo' });
    }
  }

  async verificarOtp(req, res) {
    try {
      const { email, code } = req.body;
      const targetEmail = (email || req.user?.correo || '').trim().toLowerCase();
      if (!targetEmail || !code) {
        return res.status(400).json({ error: 'Faltan datos para verificar el código.' });
      }

      const verification = await this.tokenRepository.verificarOtp(targetEmail, code);
      if (!verification.valid) {
        return res.status(400).json({ error: verification.message });
      }

      res.json({ success: true, message: 'Código verificado con éxito' });
    } catch (error) {
      res.status(500).json({ error: 'Error al verificar el código de seguridad' });
    }
  }
}

module.exports = CompraController;