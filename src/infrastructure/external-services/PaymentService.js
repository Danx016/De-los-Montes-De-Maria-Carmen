/**
 * Servicio externo: PaymentService
 * Maneja integraciones de pago (Wompi hash SHA256, etc.)
 */
const crypto = require('crypto');
const Stripe = require('stripe');
const appConfig = require('../config/app.config');

class PaymentService {
  constructor() {
    if (appConfig.stripe && appConfig.stripe.secretKey) {
      this.stripe = new Stripe(appConfig.stripe.secretKey);
    }
  }

  async crearStripePaymentIntent(amountInCop, description = 'Compra De los Montes de María') {
    if (!this.stripe) {
      throw new Error('Stripe no está configurado en el servidor');
    }
    const amount = Math.max(2000, Math.round(Number(amountInCop) || 0));
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: amount,
      currency: 'cop',
      description,
      payment_method_types: ['card']
    });
    return {
      clientSecret: paymentIntent.client_secret,
      id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      publishableKey: appConfig.stripe.publishableKey
    };
  }

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
