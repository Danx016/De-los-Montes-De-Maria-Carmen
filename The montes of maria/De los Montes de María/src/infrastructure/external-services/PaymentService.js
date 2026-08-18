/**
 * Servicio externo: PaymentService
 * Maneja integraciones de pago (Wompi hash SHA256, etc.)
 */
const crypto = require('crypto');
const appConfig = require('../config/app.config');

class PaymentService {
  generarFirmaWompi(reference, amountInCents, currency = 'COP') {
    const integrityKey = appConfig.wompi.integrityKey;
    if (!integrityKey) {
      throw new Error('Llave de integridad de Wompi no configurada en el servidor');
    }
    const cadena = `${reference}${amountInCents}${currency}${integrityKey}`;
    const signature = crypto.createHash('sha256').update(cadena).digest('hex');
    return {
      signature,
      reference,
      amountInCents,
      currency,
      publicKey: appConfig.wompi.publicKey
    };
  }
}

module.exports = PaymentService;
