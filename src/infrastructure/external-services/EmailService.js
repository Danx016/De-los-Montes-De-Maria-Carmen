/**
 * Servicio externo: EmailService
 * Maneja el envío de correos electrónicos con plantillas HTML profesionales
 * adaptadas a la identidad visual campestre y moderna de "De los Montes de María".
 */
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const appConfig = require('../config/app.config');

const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

class EmailService {
  constructor() {
    this.transporter = null;
    this.inicializarTransporter();
  }

  inicializarTransporter() {
    const user = appConfig.smtp.user || 'danilorodelo355@gmail.com';
    const rawPass = appConfig.smtp.pass || 'gszsvbqujjebrlgk';
    const pass = rawPass.replace(/\s+/g, '');

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user,
          pass,
        },
        family: 4,
        lookup: (hostname, options, callback) => {
          dns.lookup(hostname, { family: 4, all: false }, callback);
        },
        tls: {
          rejectUnauthorized: false,
        },
      });
    }
  }

  /**
   * Envío a través de APIs HTTP REST (Puerto 443 HTTPS - 100% compatible con Render)
   */
  async sendViaHttpApi({ to, subject, html }) {
    const brevoKey = process.env.BREVO_API_KEY;
    const resendKey = process.env.RESEND_API_KEY;

    if (brevoKey) {
      try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'api-key': brevoKey,
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            sender: { name: 'De los Montes de María', email: appConfig.smtp.user || 'danilorodelo355@gmail.com' },
            to: [{ email: to }],
            subject,
            htmlContent: html
          })
        });
        if (response.ok) {
          console.log(`✉️ [Brevo HTTPS] Correo enviado exitosamente a: ${to}`);
          return true;
        }
      } catch (e) {
        console.warn('⚠️ [Brevo HTTPS Error]:', e.message);
      }
    }

    if (resendKey) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'De los Montes de María <onboarding@resend.dev>',
            to: [to],
            subject,
            html
          })
        });
        if (response.ok) {
          console.log(`✉️ [Resend HTTPS] Correo enviado exitosamente a: ${to}`);
          return true;
        }
      } catch (e) {
        console.warn('⚠️ [Resend HTTPS Error]:', e.message);
      }
    }

    return false;
  }

  async sendMailSafe({ to, subject, html, attachments, fallbackLog }) {
    // 1. Intentar por HTTP REST API primero si hay API key configurada (Puerto 443)
    const httpSuccess = await this.sendViaHttpApi({ to, subject, html });
    if (httpSuccess) return true;

    // 2. Intentar por SMTP Gmail directo
    if (!this.transporter) {
      this.inicializarTransporter();
    }

    if (this.transporter) {
      try {
        const logoPath = path.resolve(__dirname, '../../../public/img/Logo.jpg');
        const defaultAttachments = fs.existsSync(logoPath)
          ? [{
              filename: 'Logo.jpg',
              path: logoPath,
              cid: 'logo_montesdemaria'
            }]
          : [];

        const finalAttachments = Array.isArray(attachments) && attachments.length > 0
          ? [...defaultAttachments, ...attachments]
          : defaultAttachments;

        const info = await this.transporter.sendMail({
          from: `"De los Montes de María" <${appConfig.smtp.user || 'danilorodelo355@gmail.com'}>`,
          to,
          subject,
          html,
          attachments: finalAttachments
        });
        console.log(`✉️ [Google Gmail] Correo enviado exitosamente a: ${to} | Asunto: ${subject} | ID: ${info?.messageId || 'OK'}`);
        return true;
      } catch (err) {
        console.error(`⚠️ [Google Gmail Error] al enviar correo a ${to}:`, err.message);
      }
    }

    return false;
  }

  /**
   * Layout maestro HTML con la identidad gráfica de De los Montes de María
   */
  buildEmailLayout({ badge, title, subtitle, contentHtml, ctaText, ctaLink, footerNote, bannerColor = '#1b5e20' }) {
    const baseUrl = appConfig.baseUrl || 'http://localhost:3000';
    const link = ctaLink ? (ctaLink.startsWith('http') ? ctaLink : `${baseUrl}${ctaLink}`) : null;

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'De los Montes de María'}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 30px 12px;">
    <tr>
      <td align="center">
        <!-- Main Email Container Card -->
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #14532d 0%, #1b5e20 60%, #2e7d32 100%); padding: 36px 30px 30px; text-align: center; color: #ffffff;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <!-- Project Logo (Embedded CID) -->
                    <div style="margin-bottom: 12px;">
                      <img src="cid:logo_montesdemaria" alt="De los Montes de María" style="height: 65px; width: auto; max-width: 140px; background-color: #ffffff; border-radius: 12px; padding: 4px 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); display: inline-block;" />
                    </div>
                    <!-- Brand Top Badge -->
                    <div style="display: inline-block; background: rgba(255,255,255,0.18); border: 1px solid rgba(255,255,255,0.3); border-radius: 999px; padding: 4px 14px; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; color: #86efac; margin-bottom: 10px;">
                      🌿 DE LOS MONTES DE MARÍA
                    </div>
                    <!-- Email Title -->
                    <h1 style="margin: 0 0 6px 0; font-size: 23px; font-weight: 900; color: #ffffff; letter-spacing: -0.4px; line-height: 1.3;">
                      ${title}
                    </h1>
                    ${subtitle ? `<p style="margin: 0; font-size: 13.5px; color: #d1fae5; font-weight: 500; line-height: 1.4;">${subtitle}</p>` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content Area -->
          <tr>
            <td style="padding: 32px 30px 24px; background-color: #ffffff;">
              ${badge ? `
                <div style="margin-bottom: 20px;">
                  <span style="background-color: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; font-size: 12px; font-weight: 700; padding: 5px 14px; border-radius: 999px; display: inline-block;">
                    ${badge}
                  </span>
                </div>
              ` : ''}
              
              <div style="color: #334155; font-size: 15px; line-height: 1.65;">
                ${contentHtml}
              </div>

              ${ctaText && link ? `
                <div style="text-align: center; margin: 32px 0 16px;">
                  <a href="${link}" target="_blank" style="background: linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%); color: #ffffff; text-decoration: none; padding: 14px 34px; border-radius: 999px; font-size: 15px; font-weight: 800; display: inline-block; box-shadow: 0 6px 16px rgba(27,94,32,0.25); letter-spacing: 0.2px;">
                    ${ctaText} →
                  </a>
                </div>
              ` : ''}

              ${footerNote ? `
                <div style="margin-top: 26px; padding-top: 18px; border-top: 1px solid #f1f5f9; font-size: 12.5px; color: #64748b; text-align: center; line-height: 1.5;">
                  ${footerNote}
                </div>
              ` : ''}
            </td>
          </tr>

          <!-- Footer Area -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 26px 30px; text-align: center; color: #64748b; font-size: 12px; line-height: 1.6;">
              <p style="margin: 0 0 6px 0; font-weight: 800; color: #0f172a; font-size: 14px;">
                🌱 DE LOS MONTES DE MARÍA S.A.S.
              </p>
              <p style="margin: 0 0 6px 0; color: #334155; font-size: 12.5px; font-weight: 600;">
                NIT: 1050277880 • Tel / WhatsApp: +57 300 872 3989
              </p>
              <p style="margin: 0 0 8px 0; color: #64748b; font-size: 12px;">
                Del campo colombiano directo a tu hogar • Cosechas, Lácteos, Semillas y Tradición
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.5;">
                San Jacinto • Carmen de Bolívar • María La Baja • Ovejas • San Juan Nepomuceno<br/>
                Para consultas, pedidos o soporte: <strong>3008723989</strong> | danilorodelo355@gmail.com
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  async sendWelcomeEmail(name, email, apodo) {
    const contentHtml = `
      <p style="font-size: 16px; margin: 0 0 14px 0;">Hola <strong>${name}</strong>,</p>
      <p style="margin: 0 0 18px 0;">
        ¡Es un gusto darte la bienvenida a <strong>De los Montes de María</strong>! Desde hoy formas parte de la red campesina que conecta los mejores frutos, cosechas y productos artesanales de nuestra tierra con los hogares colombianos.
      </p>

      <!-- Account Details Box -->
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 14px; padding: 20px; margin: 22px 0;">
        <h3 style="margin: 0 0 12px 0; color: #166534; font-size: 15px; font-weight: 800; display: flex; align-items: center;">
          📋 Resumen de tu Cuenta:
        </h3>
        <table width="100%" border="0" cellpadding="4" cellspacing="0" style="font-size: 14px; color: #334155;">
          <tr>
            <td width="140" style="color: #64748b; font-weight: 600;">Nombre Completo:</td>
            <td style="font-weight: 700; color: #0f172a;">${name}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-weight: 600;">Usuario:</td>
            <td style="font-weight: 700; color: #2e7d32;">@${apodo}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-weight: 600;">Correo Electrónico:</td>
            <td style="font-weight: 700; color: #0f172a;">${email}</td>
          </tr>
        </table>
      </div>

      <!-- Value Props -->
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px 20px; margin-bottom: 10px;">
        <p style="margin: 0 0 8px 0; font-weight: 700; color: #0f172a; font-size: 13.5px;">✨ Lo que puedes hacer en nuestra plataforma:</p>
        <ul style="margin: 0; padding-left: 20px; font-size: 13.5px; color: #475569; line-height: 1.6;">
          <li>Explorar cosechas frescas y productos de campesinos locales.</li>
          <li>Comprar con pagos seguros y entregas garantizadas.</li>
          <li>Publicar tus propios productos si eres productor o campesino.</li>
        </ul>
      </div>
    `;

    const html = this.buildEmailLayout({
      badge: '🎉 Registro Exitoso',
      title: '¡Bienvenido a Nuestra Familia!',
      subtitle: 'Tu cuenta ha sido activada en De los Montes de María',
      contentHtml,
      ctaText: 'Ir a Explorar Productos',
      ctaLink: '/catalogo',
      footerNote: 'Si no creaste esta cuenta, puedes desestimar este mensaje con seguridad.'
    });

    return this.sendMailSafe({
      to: email,
      subject: `🌱 ¡Bienvenido a De los Montes de María, ${name}!`,
      html,
      fallbackLog: `Usuario registrado: ${apodo} (${name})`
    });
  }

  async sendPasswordResetEmail(email, code) {
    const contentHtml = `
      <p style="font-size: 16px; margin: 0 0 14px 0;">Hola,</p>
      <p style="margin: 0 0 18px 0;">
        Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>De los Montes de María</strong>. Utiliza el siguiente código de seguridad temporal:
      </p>

      <!-- Security Code Box -->
      <div style="text-align: center; margin: 26px 0; padding: 24px; background: #f0fdf4; border: 2px dashed #16a34a; border-radius: 16px;">
        <span style="font-size: 12px; font-weight: 800; letter-spacing: 1px; color: #166534; text-transform: uppercase; display: block; margin-bottom: 8px;">
          Código de Verificación
        </span>
        <span style="font-size: 38px; font-weight: 900; color: #14532d; letter-spacing: 8px; font-family: Consolas, 'Courier New', monospace; display: inline-block;">
          ${code}
        </span>
      </div>

      <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 12px; padding: 14px 18px; margin: 20px 0;">
        <p style="margin: 0; color: #b45309; font-size: 13.5px; font-weight: 600;">
          ⏱️ <strong>Importante:</strong> Este código expira en <strong>10 minutos</strong> por tu seguridad. Si no solicitaste este cambio, puedes ignorar este correo; tu cuenta permanece segura.
        </p>
      </div>
    `;

    const html = this.buildEmailLayout({
      badge: '🔒 Seguridad de Cuenta',
      title: 'Restablecer Contraseña',
      subtitle: 'Código de seguridad temporal para recuperar tu acceso',
      contentHtml,
      ctaText: 'Ingresar Código en la Plataforma',
      ctaLink: '/recuperar-contrasena',
      footerNote: 'Por tu seguridad, nunca compartas este código con ninguna persona.'
    });

    return this.sendMailSafe({
      to: email,
      subject: `🔒 Código de Seguridad: ${code} - De los Montes de María`,
      html,
      fallbackLog: `Código de recuperación: ${code}`
    });
  }

  async sendSecurityCodeEmail(email, code, accion = 'acción de seguridad') {
    const contentHtml = `
      <p style="font-size: 16px; margin: 0 0 14px 0;">Hola,</p>
      <p style="margin: 0 0 18px 0;">
        Has solicitado realizar la siguiente acción: <strong>${accion}</strong> en <strong>De los Montes de María</strong>.
      </p>

      <div style="text-align: center; margin: 26px 0; padding: 24px; background: #f0fdf4; border: 2px dashed #16a34a; border-radius: 16px;">
        <span style="font-size: 12px; font-weight: 800; letter-spacing: 1px; color: #166534; text-transform: uppercase; display: block; margin-bottom: 8px;">
          Código de Autorización
        </span>
        <span style="font-size: 38px; font-weight: 900; color: #14532d; letter-spacing: 8px; font-family: Consolas, 'Courier New', monospace; display: inline-block;">
          ${code}
        </span>
      </div>

      <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 12px; padding: 14px 18px; margin: 20px 0;">
        <p style="margin: 0; color: #b45309; font-size: 13.5px; font-weight: 600;">
          ⏱️ Este código expira en <strong>10 minutos</strong>.
        </p>
      </div>
    `;

    const html = this.buildEmailLayout({
      badge: '🛡️ Confirmación Requerida',
      title: 'Código de Autorización',
      subtitle: `Solicitud para: ${accion}`,
      contentHtml,
      footerNote: 'Si no reconoces esta actividad, por favor ponte en contacto con nuestro equipo.'
    });

    return this.sendMailSafe({
      to: email,
      subject: `Código de Seguridad: ${accion} - De los Montes de María`,
      html,
      fallbackLog: `Acción: ${accion} | Código: ${code}`
    });
  }

  async sendAccountDeletedEmail(name, email, isAdminTriggered = false) {
    const title = isAdminTriggered ? 'Notificación de Cuenta Eliminada' : 'Cuenta Eliminada Exitosamente';
    const contentHtml = `
      <p style="font-size: 16px; margin: 0 0 14px 0;">Hola <strong>${name}</strong>,</p>
      <p style="margin: 0 0 18px 0;">
        ${isAdminTriggered
          ? 'Te informamos que tu cuenta en <strong>De los Montes de María</strong> ha sido cancelada o eliminada por un administrador del sistema.'
          : 'Confirmamos que tu cuenta en <strong>De los Montes de María</strong> ha sido eliminada exitosamente conforme a tu solicitud.'}
      </p>
      <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 16px 20px; margin: 20px 0;">
        <p style="margin: 0; color: #991b1b; font-size: 13.5px; line-height: 1.5;">
          Tus datos personales han sido anonimizados o eliminados de acuerdo a nuestras políticas de privacidad y la normativa colombiana de Habeas Data.
        </p>
      </div>
      <p style="margin: 0; font-size: 14px; color: #64748b;">
        Si tienes preguntas o consideras que esto fue un error, puedes escribir a soporte en nuestra plataforma.
      </p>
    `;

    const html = this.buildEmailLayout({
      badge: '🗑️ Estado de Cuenta',
      title,
      subtitle: 'De los Montes de María',
      contentHtml,
      footerNote: 'Gracias por haber sido parte de De los Montes de María.'
    });

    return this.sendMailSafe({
      to: email,
      subject: `${title} - De los Montes de María`,
      html,
      fallbackLog: `Cuenta eliminada para ${name}`
    });
  }

  async sendInvoiceEmail(recibo, email) {
    const totalValue = parseFloat(recibo.total) || 0;
    const fechaStr = new Date(recibo.fecha || Date.now()).toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    let subtotalProductos = 0;
    let rowsHtml = '';
    (recibo.detalles || []).forEach((item, idx) => {
      const cant = Number(item.cantidad) || 1;
      const unit = parseFloat(item.precio_unitario) || 0;
      const lineSub = cant * unit;
      subtotalProductos += lineSub;
      const sub = lineSub.toLocaleString('es-CO');
      const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      rowsHtml += `
        <tr style="background-color: ${bg};">
          <td style="padding: 12px 14px; border-bottom: 1px solid #e2e8f0; font-size: 13.5px; color: #0f172a;">
            <strong>${item.nombre_producto || item.nombre || 'Producto Campesino'}</strong>
            ${item.presentacion ? `<br><span style="color: #64748b; font-size: 11.5px;">Presentación: ${item.presentacion}</span>` : ''}
          </td>
          <td style="padding: 12px 14px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 13.5px; color: #475569;">
            ${cant}
          </td>
          <td style="padding: 12px 14px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 13.5px; color: #475569;">
            $${unit.toLocaleString('es-CO')}
          </td>
          <td style="padding: 12px 14px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700; font-size: 13.5px; color: #166534;">
            $${sub}
          </td>
        </tr>`;
    });

    const contentHtml = `
      <p style="font-size: 16px; margin: 0 0 14px 0;">Estimado(a) <strong>${recibo.nombre_cliente || 'Cliente'}</strong>,</p>
      <p style="margin: 0 0 18px 0;">
        ¡Muchas gracias por tu compra en <strong>DE LOS MONTES DE MARÍA S.A.S.</strong>! Adjuntamos el detalle de tu <strong>Factura Electrónica de Venta</strong> correspondiente a tu pedido.
      </p>

      <!-- Fiscal & Issuer Box -->
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px 20px; margin: 20px 0;">
        <table width="100%" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td width="50%" valign="top" style="padding-right: 15px; border-right: 1px solid #e2e8f0;">
              <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #166534; letter-spacing: 0.5px; display: block; margin-bottom: 4px;">EMISOR:</span>
              <strong style="font-size: 14px; color: #0f172a;">DE LOS MONTES DE MARÍA S.A.S.</strong><br/>
              <span style="font-size: 12.5px; color: #475569; line-height: 1.6;">
                <strong>NIT:</strong> 1050277880<br/>
                <strong>Tel / WhatsApp:</strong> +57 300 872 3989<br/>
                <strong>Ubicación:</strong> Montes de María, Colombia
              </span>
            </td>
            <td width="50%" valign="top" style="padding-left: 15px;">
              <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #166534; letter-spacing: 0.5px; display: block; margin-bottom: 4px;">ADQUIRENTE / CLIENTE:</span>
              <strong style="font-size: 14px; color: #0f172a;">${recibo.nombre_cliente || 'Cliente'}</strong><br/>
              <span style="font-size: 12.5px; color: #475569; line-height: 1.6;">
                ${recibo.correo_cliente ? `<strong>Email:</strong> ${recibo.correo_cliente}<br/>` : ''}
                <strong>Dirección:</strong> ${recibo.direccion_envio || 'Montes de María, Colombia'}<br/>
                <strong>Fecha:</strong> ${fechaStr}
              </span>
            </td>
          </tr>
        </table>
      </div>

      <!-- Invoice Data Strip -->
      <table width="100%" border="0" cellpadding="8" cellspacing="0" style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; margin-bottom: 20px;">
        <tr>
          <td style="font-size: 13px; color: #166534; font-weight: 700;">
            🧾 Factura N°: #${recibo.id_compra}
          </td>
          <td style="font-size: 13px; color: #166534; font-weight: 700; text-align: right;">
            💳 Método de Pago: ${recibo.metodo_pago || 'Contra Entrega'}
          </td>
        </tr>
      </table>

      <!-- Items Table -->
      <div style="border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; margin: 22px 0;">
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
          <thead>
            <tr style="background: #14532d; color: #ffffff;">
              <th style="padding: 12px 14px; text-align: left; font-size: 12px; font-weight: 800; text-transform: uppercase;">Producto</th>
              <th style="padding: 12px 14px; text-align: center; font-size: 12px; font-weight: 800; text-transform: uppercase;">Cant</th>
              <th style="padding: 12px 14px; text-align: right; font-size: 12px; font-weight: 800; text-transform: uppercase;">Precio</th>
              <th style="padding: 12px 14px; text-align: right; font-size: 12px; font-weight: 800; text-transform: uppercase;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr style="background-color: #f8fafc; border-top: 2px solid #e2e8f0;">
              <td colspan="3" style="padding: 10px 14px; text-align: right; font-size: 13px; color: #475569;">
                Subtotal Productos:
              </td>
              <td style="padding: 10px 14px; text-align: right; font-weight: 700; color: #0f172a; font-size: 13.5px;">
                $${subtotalProductos.toLocaleString('es-CO')} COP
              </td>
            </tr>
            <tr style="background-color: #f0fdf4; border-top: 1px solid #bbf7d0;">
              <td colspan="3" style="padding: 14px; text-align: right; font-weight: 800; color: #166534; font-size: 14.5px;">
                TOTAL PAGADO:
              </td>
              <td style="padding: 14px; text-align: right; font-weight: 900; color: #14532d; font-size: 17px;">
                $${totalValue.toLocaleString('es-CO')} COP
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Security / Legal Info -->
      <div style="background: #fafafa; border: 1px dashed #cbd5e1; border-radius: 10px; padding: 12px 16px; margin-top: 16px; font-size: 11.5px; color: #64748b; line-height: 1.5;">
        <strong>Documento Electrónico Oficial:</strong> Representación gráfica digital autorizada de factura de venta de <strong>DE LOS MONTES DE MARÍA S.A.S.</strong> (NIT: 1050277880). Para cualquier duda o aclaración sobre este comprobante, contáctanos al teléfono <strong>3008723989</strong>.
      </div>
    `;

    const html = this.buildEmailLayout({
      badge: '🧾 Factura de Compra',
      title: 'Factura Electrónica de Venta',
      subtitle: `Comprobante oficial #${recibo.id_compra}`,
      contentHtml,
      ctaText: 'Ver Mis Pedidos',
      ctaLink: '/mis-compras',
      footerNote: 'Conserva este correo como comprobante legal de tu transacción.'
    });

    return this.sendMailSafe({
      to: email,
      subject: `🧾 Factura Electrónica #${recibo.id_compra} - DE LOS MONTES DE MARÍA S.A.S`,
      html,
      fallbackLog: `Factura #${recibo.id_compra} por $${totalValue} (NIT: 1050277880)`
    });
  }

  async sendOrderStatusEmail(compra, email, estado) {
    const estadoLimpio = String(estado || 'actualizado').toUpperCase();
    const contentHtml = `
      <p style="font-size: 16px; margin: 0 0 14px 0;">Hola <strong>${compra.nombre_cliente || 'Cliente'}</strong>,</p>
      <p style="margin: 0 0 18px 0;">
        Te informamos que tu pedido <strong>#${compra.id_compra}</strong> ha cambiado de estado:
      </p>

      <!-- Status Highlight Badge -->
      <div style="text-align: center; margin: 24px 0; padding: 20px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 14px;">
        <span style="font-size: 12px; font-weight: 800; color: #166534; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 6px;">
          Nuevo Estado del Pedido
        </span>
        <span style="font-size: 22px; font-weight: 900; color: #14532d;">
          📦 ${estadoLimpio}
        </span>
      </div>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; margin: 18px 0; font-size: 13.5px; color: #334155;">
        <p style="margin: 0 0 6px 0;"><strong>Dirección de Entrega:</strong> ${compra.direccion_envio || 'Registrada en la orden'}</p>
        <p style="margin: 0;"><strong>Total del Pedido:</strong> $${(parseFloat(compra.total) || 0).toLocaleString('es-CO')} COP</p>
      </div>
    `;

    const html = this.buildEmailLayout({
      badge: '📦 Seguimiento de Pedido',
      title: 'Estado de Pedido Actualizado',
      subtitle: `Orden #${compra.id_compra}`,
      contentHtml,
      ctaText: 'Ver Detalles del Pedido',
      ctaLink: '/mis-compras',
      footerNote: 'Recibirás más actualizaciones a medida que tu pedido avance en el proceso de entrega.'
    });

    return this.sendMailSafe({
      to: email,
      subject: `📦 Pedido #${compra.id_compra} - Estado: ${estadoLimpio}`,
      html,
      fallbackLog: `Pedido #${compra.id_compra} cambiado a ${estado}`
    });
  }

  async sendPurchaseOtpEmail(email, name, code, total) {
    const formattedTotal = total ? `$${parseFloat(total).toLocaleString('es-CO')} COP` : '';
    const contentHtml = `
      <p style="font-size: 16px; margin: 0 0 14px 0;">Hola <strong>${name || 'Cliente'}</strong>,</p>
      <p style="margin: 0 0 18px 0;">
        Estás a punto de confirmar tu pedido en <strong>DE LOS MONTES DE MARÍA S.A.S.</strong>${formattedTotal ? ` por un valor total de <strong>${formattedTotal}</strong>` : ''}.
      </p>
      <p style="margin: 0 0 18px 0;">
        Para garantizar la total seguridad de tu compra y procesar el despacho a tu dirección, ingresa el siguiente código de autorización en la pantalla de pago:
      </p>

      <div style="text-align: center; margin: 26px 0; padding: 24px; background: #f0fdf4; border: 2px dashed #16a34a; border-radius: 16px;">
        <span style="font-size: 12px; font-weight: 800; letter-spacing: 1.2px; color: #166534; text-transform: uppercase; display: block; margin-bottom: 8px;">
          Código de Autorización de Compra
        </span>
        <span style="font-size: 40px; font-weight: 900; color: #14532d; letter-spacing: 10px; font-family: Consolas, 'Courier New', monospace; display: inline-block;">
          ${code}
        </span>
      </div>

      <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 12px; padding: 14px 18px; margin: 20px 0;">
        <p style="margin: 0; color: #b45309; font-size: 13.5px; font-weight: 600;">
          ⏱️ Este código expira en <strong>10 minutos</strong>. Una vez confirmado, recibirás de inmediato tu Factura Electrónica oficial de compra.
        </p>
      </div>
    `;

    const html = this.buildEmailLayout({
      badge: '🛡️ Autorización de Compra',
      title: 'Código de Seguridad de Compra',
      subtitle: 'Autorización requerida para procesar tu pedido',
      contentHtml,
      footerNote: 'Si no estás realizando ninguna compra, comunícate de inmediato al 3008723989.'
    });

    return this.sendMailSafe({
      to: email,
      subject: `🛡️ Código de Autorización: ${code} - DE LOS MONTES DE MARÍA S.A.S`,
      html,
      fallbackLog: `Código de compra para ${email}: ${code}`
    });
  }

  async sendOtpEmail(email, name, code) {
    return this.sendPurchaseOtpEmail(email, name, code);
  }

  async enviarCodigoVerificacionTelegram({ correo, nombre, codigo }) {
    const contentHtml = `
      <p>Hola <strong>${nombre || 'Usuario'}</strong>,</p>
      <p>Has solicitado vincular tu cuenta de <strong>De los Montes de María</strong> con nuestro bot oficial de Telegram (<code>@montesdemariabot</code>).</p>
      <div style="background-color: #f8fafc; border: 2px dashed #2e7d32; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
        <span style="font-size: 13px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 8px;">Tu Código de Seguridad</span>
        <span style="font-size: 36px; font-weight: 900; color: #1b5e20; letter-spacing: 6px; font-family: monospace;">${codigo}</span>
      </div>
      <p style="font-size: 13.5px; color: #64748b;">Ingresa este código de 6 dígitos en el chat de Telegram para confirmar tu identidad. Este código vencerá en 10 minutos.</p>
    `;

    const html = this.buildEmailLayout({
      badge: '🔐 Seguridad & Vinculación Telegram',
      title: 'Tu Código de Verificación',
      subtitle: 'Acceso seguro al Bot de Telegram',
      contentHtml,
      footerNote: 'Si tú no solicitaste este código, puedes ignorar este correo de forma segura.'
    });

    return await this.sendMailSafe({
      to: correo,
      subject: `🔐 Tu código de verificación Telegram: ${codigo}`,
      html,
      fallbackLog: `CÓDIGO TELEGRAM: ${codigo} para ${correo}`
    });
  }
}

module.exports = EmailService;