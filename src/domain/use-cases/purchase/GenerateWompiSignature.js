/**
 * Caso de uso: GenerateWompiSignature
 */
class GenerateWompiSignature {
  constructor(paymentService) {
    this.paymentService = paymentService;
  }

  execute(reference, amountInCents, currency = 'COP') {
    if (!reference || !amountInCents) {
      throw new Error('Faltan parámetros: reference y amountInCents son requeridos');
    }
    return this.paymentService.generarFirmaWompi(reference, amountInCents, currency);
  }
}

module.exports = GenerateWompiSignature;
