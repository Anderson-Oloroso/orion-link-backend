import passport from 'passport';
import { UnauthorizedError, ForbiddenError } from '../utils/app-error.js';

/**
 * Middleware Orientado a Objetos de Autenticación JWT (Cookie HttpOnly + Bearer)
 * y Control de Acceso Basado en Roles (RBAC para los 4 roles de Orion Link).
 * Incluye cabeceras anti-caché (no-store) para impedir que el navegador sirva
 * estados autenticados obsoletos al presionar el botón "Atrás" tras cerrar sesión.
 */
export class AuthMiddleware {
    static setNoCacheHeaders(res) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, private');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }

    static requireAuth(req, res, next) {
        AuthMiddleware.setNoCacheHeaders(res);
        passport.authenticate('jwt', { session: false }, (err, user) => {
            if (err) {
                return next(err);
            }
            if (!user) {
                return next(
                    new UnauthorizedError(
                        'Sesión no válida, revocada o expirada. Inicie sesión nuevamente para continuar.'
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
