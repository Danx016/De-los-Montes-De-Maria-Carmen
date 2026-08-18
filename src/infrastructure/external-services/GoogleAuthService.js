/**
 * Servicio externo: GoogleAuthService
 * Encapsula la verificación de tokens de identidad de Google OAuth
 */
const { OAuth2Client } = require('google-auth-library');
const appConfig = require('../config/app.config');

class GoogleAuthService {
  constructor() {
    this.client = new OAuth2Client(appConfig.googleClientId);
  }

  async verifyToken(credential) {
    if (!credential) {
      throw new Error('Token de Google no proporcionado');
    }

    const ticket = await this.client.verifyIdToken({
      idToken: credential,
      audience: appConfig.googleClientId
    });

    const payload = ticket.getPayload();
    return {
      googleId: payload['sub'],
      email: payload['email'],
      name: payload['name'],
      picture: payload['picture']
    };
  }
}

module.exports = GoogleAuthService;
