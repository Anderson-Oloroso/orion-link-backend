import jwt from 'jsonwebtoken';
import { JwtConfig } from '../config/jwt.config.js';

export class TokenService {
    static createAccessToken(user) {
        const payload = {
            sub: String(user.id || user.id_user),
            email: user.email,
            role: user.role
        };

        const accessToken = jwt.sign(payload, JwtConfig.secret, {
            expiresIn: JwtConfig.expiresIn,
            algorithm: 'HS256'
        });

        return {
            accessToken,
            expiresIn: JwtConfig.expiresIn
        };
    }
}
