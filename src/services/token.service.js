import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { JwtConfig } from '../config/jwt.config.js';

/**
 * Servicio Orientado a Objetos para Emisión y Revocación de Tokens JWT (Blacklist en memoria con jti)
 * Impide que un token o cookie reutilizado tras POST /auth/logout o al pulsar "Atrás" sea aceptado.
 */
export class TokenService {
    static #revokedTokens = new Set();

    static createAccessToken(user) {
        const jti = crypto.randomUUID();
        const payload = {
            sub: String(user.id || user.id_user),
            email: user.email,
            role: user.role,
            jti
        };

        const accessToken = jwt.sign(payload, JwtConfig.secret, {
            expiresIn: JwtConfig.expiresIn,
            algorithm: 'HS256'
        });

        return {
            accessToken,
            expiresIn: JwtConfig.expiresIn,
            jti
        };
    }

    static revokeToken(rawToken) {
        if (!rawToken) return;
        TokenService.#revokedTokens.add(String(rawToken).trim());
        try {
            const decoded = jwt.decode(rawToken);
            if (decoded && decoded.jti) {
                TokenService.#revokedTokens.add(`jti:${decoded.jti}`);
            }
        } catch {
            // Ignorar errores de decodificación al revocar
        }
    }

    static isRevoked(rawToken, payload = null) {
        if (rawToken && TokenService.#revokedTokens.has(String(rawToken).trim())) {
            return true;
        }
        if (payload && payload.jti && TokenService.#revokedTokens.has(`jti:${payload.jti}`)) {
            return true;
        }
        return false;
    }

    static extractRawTokenFromRequest(req) {
        const cookieName = JwtConfig.cookieName;
        if (req?.cookies?.[cookieName]) {
            return req.cookies[cookieName];
        }
        const authHeader = req?.headers?.authorization || '';
        if (authHeader.toLowerCase().startsWith('bearer ')) {
            return authHeader.slice(7).trim();
        }
        return null;
    }
}
