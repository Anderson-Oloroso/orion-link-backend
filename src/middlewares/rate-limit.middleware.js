import rateLimit from 'express-rate-limit';
import { EnvConfig } from '../config/env.config.js';
import { AppError } from '../utils/app-error.js';

export class RateLimitMiddleware {
    static globalLimiter() {
        const { windowMs, maxRequests } = EnvConfig.rateLimit;
        return rateLimit({
            windowMs,
            limit: maxRequests,
            standardHeaders: true,
            legacyHeaders: false,
            handler: (_req, _res, next) => {
                next(
                    new AppError(
                        'Ha excedido el límite de peticiones permitidas. Intente nuevamente en unos minutos.',
                        429,
                        { errorCode: 'RATE_LIMIT_EXCEEDED' }
                    )
                );
            }
        });
    }

    static authLimiter() {
        const { windowMs, authMaxRequests } = EnvConfig.rateLimit;
        return rateLimit({
            windowMs,
            limit: authMaxRequests,
            standardHeaders: true,
            legacyHeaders: false,
            handler: (_req, _res, next) => {
                next(
                    new AppError(
                        'Demasiados intentos de autenticación desde esta IP. Espere 15 minutos.',
                        429,
                        { errorCode: 'AUTH_RATE_LIMIT_EXCEEDED' }
                    )
                );
            }
        });
    }
}
