/**
 * Middleware Orientado a Objetos para Endurecimiento de Cabeceras HTTP (OWASP A05)
 */
export class SecurityHeadersMiddleware {
    static apply(_req, res, next) {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
        res.removeHeader('X-Powered-By');
        next();
    }
}
