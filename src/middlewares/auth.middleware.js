import passport from 'passport';
import { UnauthorizedError, ForbiddenError } from '../utils/app-error.js';

/**
 * Middleware Orientado a Objetos de Autenticación JWT (Cookie HttpOnly + Bearer)
 * y Control de Acceso Basado en Roles (RBAC para los 4 roles de Orion Link).
 */
export class AuthMiddleware {
    static requireAuth(req, res, next) {
        passport.authenticate('jwt', { session: false }, (err, user) => {
            if (err) {
                return next(err);
            }
            if (!user) {
                return next(
                    new UnauthorizedError(
                        'Sesión no válida o expirada. Inicie sesión nuevamente para continuar.'
                    )
                );
            }
            req.user = user;
            return next();
        })(req, res, next);
    }

    static requireRole(...allowedRoles) {
        return (req, _res, next) => {
            if (!req.user) {
                return next(new UnauthorizedError());
            }
            if (!allowedRoles.includes(req.user.role)) {
                return next(
                    new ForbiddenError(
                        `Esta acción requiere uno de los siguientes roles: [${allowedRoles.join(', ')}]. Rol actual: '${req.user.role}'.`
                    )
                );
            }
            return next();
        };
    }
}

export const requireAuth = AuthMiddleware.requireAuth;
export const requireRole = AuthMiddleware.requireRole;
