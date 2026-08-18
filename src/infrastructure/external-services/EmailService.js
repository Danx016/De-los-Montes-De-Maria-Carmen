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
    const brevoKey = appConfig.brevoApiKey || process.env.BREVO_API_KEY;
    const resendKey = appConfig.resendApiKey || process.env.RESEND_API_KEY;

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
   * Generador de tarjetas de código de seguridad con selección táctil instantánea para copiar
   */
  buildOtpCodeCard({ code, label = 'Código de Verificación', actionUrl = null, actionText = null, note = 'Este código vence en 10 minutos por tu seguridad.' }) {
    return `
      <!-- OTP Security Card -->
      <div style="margin: 26px auto; max-width: 460px; background: linear-gradient(180deg, #f0fdf4 0%, #dcfce7 100%); border: 2px dashed #16a34a; border-radius: 20px; padding: 26px 20px; text-align: center; box-shadow: 0 8px 24px rgba(22, 163, 74, 0.08);">
        <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #166534; margin-bottom: 12px;">
          🛡️ ${label}
        </div>
        
        <div style="background: #ffffff; border: 1.5px solid #86efac; border-radius: 14px; padding: 14px 22px; display: inline-block; margin-bottom: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.04);">
          <span style="font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #14532d; font-family: 'Courier New', Courier, Consolas, monospace; line-height: 1; user-select: all; -webkit-user-select: all; -moz-user-select: all; display: inline-block; cursor: pointer;" title="Toca o selecciona para copiar">
            ${code}
          </span>
        </div>

        <div style="margin-bottom: 8px;">
          <span style="display: inline-block; background: #166534; color: #ffffff; font-size: 12px; font-weight: 800; padding: 6px 18px; border-radius: 999px; box-shadow: 0 2px 8px rgba(22,101,52,0.25); letter-spacing: 0.3px;">
            📋 Selecciona o mantén presionado para copiar
          </span>
        </div>

        ${actionUrl && actionText ? `
          <div style="margin-top: 18px;">
            <a href="${actionUrl}" target="_blank" style="background: linear-gradient(135deg, #15803d 0%, #166534 100%); color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 999px; font-size: 14px; font-weight: 800; display: inline-block; box-shadow: 0 4px 14px rgba(21,128,61,0.3);">
              ${actionText} →
            </a>
          </div>
        ` : ''}

        ${note ? `
          <div style="margin-top: 14px; font-size: 12px; color: #475569; font-weight: 600; line-height: 1.4;">
            ⏱️ ${note}
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Layout maestro HTML con la identidad gráfica de De los Montes de María
   */
  buildEmailLayout({ badge, title, subtitle, contentHtml, ctaText, ctaLink, footerNote, bannerColor = '#1b5e20' }) {
    const baseUrl = appConfig.baseUrl || 'https://delosmontesdemaria.onrender.com';
    const link = ctaLink ? (ctaLink.startsWith('http') ? ctaLink : `${baseUrl}${ctaLink}`) : null;
    const logoUrl = `${baseUrl}/img/Logo.jpg`;

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'De los Montes de María'}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 36px 12px;">
    <tr>
      <td align="center">
        <!-- Main Email Container Card -->
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 620px; width: 100%; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 16px 40px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #064e3b 0%, #166534 60%, #15803d 100%); padding: 38px 24px 32px; text-align: center; color: #ffffff;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <!-- Project Logo (Circular Frame with Gold/Emerald Border) -->
                    <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto 16px auto;">
                      <tr>
                        <td align="center" style="background: #ffffff; padding: 5px; border-radius: 50%; box-shadow: 0 10px 25px rgba(0,0,0,0.25); border: 3px solid #86efac;">
                          <img src="${logoUrl}" alt="De los Montes de María" width="82" height="82" style="display: block; width: 82px; height: 82px; border-radius: 50%; object-fit: cover; border: 0;" />
                        </td>
                      </tr>
                    </table>

                    <!-- Brand Top Pill Badge -->
                    <div style="display: inline-block; background: rgba(255,255,255,0.18); border: 1px solid rgba(255,255,255,0.35); border-radius: 999px; padding: 5px 16px; font-size: 11px; font-weight: 800; letter-spacing: 1.8px; text-transform: uppercase; color: #bbf7d0; margin-bottom: 12px;">
                      🌾 DE LOS MONTES DE MARÍA
                    </div>

                    <!-- Email Title -->
                    <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 900; color: #ffffff; letter-spacing: -0.4px; line-height: 1.3;">
                      ${title}
                    </h1>
                    ${subtitle ? `<p style="margin: 0; font-size: 14px; color: #dcfce7; font-weight: 500; line-height: 1.4;">${subtitle}</p>` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content Area -->
          <tr>
            <td style="padding: 36px 32px 28px; background-color: #ffffff;">
              ${badge ? `
                <div style="margin-bottom: 22px;">
                  <span style="background-color: #f0fdf4; border: 1.5px solid #bbf7d0; color: #166534; font-size: 12px; font-weight: 800; padding: 6px 16px; border-radius: 999px; display: inline-block; letter-spacing: 0.3px;">
                    ${badge}
                  </span>
                </div>
              ` : ''}
              
              <div style="color: #334155; font-size: 15.5px; line-height: 1.7;">
                ${contentHtml}
              </div>

              ${ctaText && link ? `
                <div style="text-align: center; margin: 34px 0 18px;">
                  <a href="${link}" target="_blank" style="background: linear-gradient(135deg, #166534 0%, #15803d 100%); color: #ffffff; text-decoration: none; padding: 15px 36px; border-radius: 999px; font-size: 15.5px; font-weight: 800; display: inline-block; box-shadow: 0 8px 20px rgba(22,101,52,0.28); letter-spacing: 0.3px;">
                    ${ctaText} →
                  </a>
                </div>
              ` : ''}

              ${footerNote ? `
                <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #f1f5f9; font-size: 12.5px; color: #64748b; text-align: center; line-height: 1.55;">
                  ${footerNote}
                </div>
              ` : ''}
            </td>
          </tr>

          <!-- Footer Area -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 28px 30px; text-align: center; color: #64748b; font-size: 12px; line-height: 1.6;">
              <p style="margin: 0 0 6px 0; font-weight: 900; color: #0f172a; font-size: 14.5px; letter-spacing: 0.3px;">
                🌱 DE LOS MONTES DE MARÍA S.A.S.
              </p>
              <p style="margin: 0 0 6px 0; color: #334155; font-size: 12.5px; font-weight: 700;">
                NIT: 1050277880 • Tel / WhatsApp: +57 300 872 3989
              </p>
              <p style="margin: 0 0 10px 0; color: #64748b; font-size: 12px;">
                Del campo colombiano directo a tu hogar • Cosechas, Lácteos, Semillas y Tradición
              </p>
              <div style="border-top: 1px dashed #cbd5e1; padding-top: 10px; font-size: 11px; color: #94a3b8; line-height: 1.55;">
                San Jacinto • Carmen de Bolívar • María La Baja • Ovejas • San Juan Nepomuceno<br/>
                Soporte y Atención: <strong>+57 300 872 3989</strong> | danilorodelo355@gmail.com
              </div>
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
        ¡Es un gran honor darte la bienvenida a <strong>De los Montes de María</strong>! Desde hoy haces parte activa de la red campesina que conecta las mejores cosechas, productos artesanales y alimentos frescos de nuestra región con toda Colombia.
      </p>

      <!-- Account Summary Card -->
      <div style="background-color: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 16px; padding: 22px; margin: 24px 0; box-shadow: 0 4px 12px rgba(22,163,74,0.04);">
        <h3 style="margin: 0 0 14px 0; color: #166534; font-size: 15.5px; font-weight: 800;">
          📋 Resumen de tu Cuenta:
        </h3>
        <table width="100%" border="0" cellpadding="5" cellspacing="0" style="font-size: 14px; color: #334155;">
          <tr>
            <td width="140" style="color: #64748b; font-weight: 600;">Nombre Completo:</td>
            <td style="font-weight: 800; color: #0f172a;">${name}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-weight: 600;">Usuario:</td>
            <td style="font-weight: 800; color: #166534;">@${apodo}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-weight: 600;">Correo Electrónico:</td>
            <td style="font-weight: 800; color: #0f172a;">${email}</td>
          </tr>
        </table>
      </div>

      <!-- Value Props -->
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px 22px; margin-bottom: 12px;">
        <p style="margin: 0 0 10px 0; font-weight: 800; color: #0f172a; font-size: 14px;">✨ Beneficios en nuestra plataforma:</p>
        <ul style="margin: 0; padding-left: 20px; font-size: 13.5px; color: #475569; line-height: 1.7;">
          <li>Cosechas frescas directas de campesinos y productores locales.</li>
          <li>Pagos seguros con Wompi, PSE, tarjetas y contra entrega.</li>
          <li>Atención y asistencia inteligente personalizada 24/7 vía Telegram.</li>
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
      html
    });
  }

  async sendPasswordResetEmail(email, code) {
    const otpCard = this.buildOtpCodeCard({
      code,
      label: 'Código para Restablecer Contraseña',
      actionUrl: `${appConfig.baseUrl || 'https://delosmontesdemaria.onrender.com'}/recuperar-contrasena`,
      actionText: 'Ir a Restablecer Contraseña',
      note: 'Este código vence en 10 minutos. Por tu seguridad, nunca lo compartas.'
    });

    const contentHtml = `
      <p style="font-size: 16px; margin: 0 0 14px 0;">Hola,</p>
      <p style="margin: 0 0 18px 0;">
        Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>De los Montes de María</strong>.
      </p>

      ${otpCard}

      <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 12px; padding: 14px 18px; margin: 20px 0;">
        <p style="margin: 0; color: #b45309; font-size: 13px; font-weight: 600;">
          🔒 <strong>¿No solicitaste este cambio?</strong> Puedes ignorar este correo; tu cuenta permanece 100% protegida.
        </p>
      </div>
    `;

    const html = this.buildEmailLayout({
      badge: '🔒 Seguridad de Cuenta',
      title: 'Restablecer Contraseña',
      subtitle: 'Código de seguridad temporal para recuperar tu acceso',
      contentHtml,
      footerNote: 'Por tu seguridad, nunca compartas este código con ninguna persona.'
    });

    return this.sendMailSafe({
      to: email,
      subject: `🔒 Código de Seguridad: ${code} - De los Montes de María`,
      html
    });
  }

  async sendSecurityCodeEmail(email, code, accion = 'acción de seguridad') {
    const otpCard = this.buildOtpCodeCard({
      code,
      label: `Código para: ${accion}`,
      note: 'Vence en 10 minutos.'
    });

    const contentHtml = `
      <p style="font-size: 16px; margin: 0 0 14px 0;">Hola,</p>
      <p style="margin: 0 0 18px 0;">
        Has solicitado realizar la siguiente acción: <strong>${accion}</strong> en <strong>De los Montes de María</strong>.
      </p>

      ${otpCard}
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
      html
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
      html
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
      html
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
      <div style="text-align: center; margin: 24px 0; padding: 22px; background-color: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 16px; box-shadow: 0 4px 12px rgba(22,163,74,0.06);">
        <span style="font-size: 12px; font-weight: 800; color: #166534; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 6px;">
          Nuevo Estado del Pedido
        </span>
        <span style="font-size: 24px; font-weight: 900; color: #14532d;">
          📦 ${estadoLimpio}
        </span>
      </div>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px 22px; margin: 20px 0; font-size: 14px; color: #334155;">
        <p style="margin: 0 0 8px 0;"><strong>Dirección de Entrega:</strong> ${compra.direccion_envio || 'Registrada en la orden'}</p>
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
      html
    });
  }

  async sendPurchaseOtpEmail(email, name, code, total) {
    const formattedTotal = total ? `$${parseFloat(total).toLocaleString('es-CO')} COP` : '';
    const otpCard = this.buildOtpCodeCard({
      code,
      label: 'Código de Autorización de Compra',
      note: 'Ingresa este código en la pantalla de compra para validar tu pago y generar tu factura.'
    });

    const contentHtml = `
      <p style="font-size: 16px; margin: 0 0 14px 0;">Hola <strong>${name || 'Cliente'}</strong>,</p>
      <p style="margin: 0 0 18px 0;">
        Estás a punto de confirmar tu pedido en <strong>DE LOS MONTES DE MARÍA S.A.S.</strong>${formattedTotal ? ` por un valor total de <strong>${formattedTotal}</strong>` : ''}.
      </p>
      <p style="margin: 0 0 18px 0;">
        Para garantizar la total seguridad de tu compra y procesar el despacho a tu dirección, utiliza el siguiente código de autorización:
      </p>

      ${otpCard}
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
      html
    });
  }

  async sendOtpEmail(email, name, code) {
    return this.sendPurchaseOtpEmail(email, name, code);
  }

  async enviarCodigoVerificacionTelegram({ correo, nombre, codigo }) {
    const otpCard = this.buildOtpCodeCard({
      code: codigo,
      label: 'Código de Seguridad Telegram',
      actionUrl: 'https://t.me/montesdemariabot',
      actionText: 'Abrir Bot de Telegram',
      note: 'Pega este código de 6 dígitos en el chat del bot de Telegram para verificar tu cuenta al instante.'
    });

    const contentHtml = `
      <p style="font-size: 16px; margin: 0 0 14px 0;">Hola <strong>${nombre || 'Usuario'}</strong>,</p>
      <p style="margin: 0 0 18px 0;">
        Has solicitado vincular tu cuenta de <strong>De los Montes de María</strong> con nuestro bot oficial de Telegram (<code>@montesdemariabot</code>) para soporte y administración.
      </p>

      ${otpCard}

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 18px; margin: 18px 0; font-size: 13px; color: #475569;">
        💡 <strong>Consejo:</strong> También puedes ingresar directamente a Telegram escribiendo tu <strong>contraseña de la plataforma web</strong> en el chat.
      </div>
    `;

    const html = this.buildEmailLayout({
      badge: '🔐 Seguridad & Vinculación Telegram',
      title: 'Tu Código de Verificación',
      subtitle: 'Acceso seguro al Bot de Telegram @montesdemariabot',
      contentHtml,
      footerNote: 'Si tú no solicitaste este código, puedes ignorar este correo de forma segura.'
    });

    return await this.sendMailSafe({
      to: correo,
      subject: `🔐 Tu código de verificación Telegram: ${codigo}`,
      html
    });
  }
}

module.exports = EmailService;