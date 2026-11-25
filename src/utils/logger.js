/**
 * Logger HTTP y de sistema orientado a objetos
 */
export class Logger {
    static middleware(req, res, next) {
        const startedAt = Date.now();
        res.on('finish', () => {
            const elapsedMs = Date.now() - startedAt;
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${elapsedMs}ms)`);
        });
        next();
    }

    static info(message, meta = '') {
        console.log(`[ORION-INFO] ${new Date().toISOString()} - ${message}`, meta);
    }

    static error(message, meta = '') {
        console.error(`[ORION-ERROR] ${new Date().toISOString()} - ${message}`, meta);
    }
}

export const logger = Logger.middleware;
