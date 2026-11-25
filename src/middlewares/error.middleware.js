import { AppError, DatabaseError, NotFoundError } from '../utils/app-error.js';
import { Logger } from '../utils/logger.js';

/**
 * Manejador Centralizado y Polimórfico de Errores HTTP
 * Aprovecha la herencia de AppError para serializar respuestas limpias y seguras.
 */
export class ErrorMiddleware {
    static notFound(req, _res, next) {
        next(new NotFoundError('Ruta o endpoint de la API', `${req.method} ${req.originalUrl}`));
    }

    static handle(err, _req, res, _next) {
        let appError = err;

        // Si proviene directamente de mysql2 sin envolver, convertirlo polimórficamente
        if (!(appError instanceof AppError)) {
            if (err && (err.sqlState || err.code?.startsWith('ER_'))) {
                appError = DatabaseError.fromMySQLError(err);
            } else {
                appError = new AppError(
                    err?.message || 'Error interno inesperado en el servidor Orion Link.',
                    err?.statusCode || 500,
                    { isOperational: false }
                );
            }
        }

        if (appError.statusCode >= 500) {
            Logger.error(`${appError.name}: ${appError.message}`, err?.stack || '');
        }

        return res.status(appError.statusCode).json(appError.toJSON());
    }
}

export const notFoundHandler = ErrorMiddleware.notFound;
export const errorHandler = ErrorMiddleware.handle;
