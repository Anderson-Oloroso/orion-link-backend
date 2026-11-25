import { apiPrefix, appVersion } from './version.config.js';

export class SwaggerConfig {
    static getSpec() {
        return {
            openapi: '3.0.3',
            info: {
                title: 'Orion Link — ISP Technical Support & FTTH Operations CRM API',
                version: appVersion,
                description: 'API REST 100% OOP con Node.js 20 ESM, Express 5, MySQL 8.0 InnoDB, JWT + Cookies HttpOnly para diagnóstico óptico remoto, detección temprana de fallas masivas FTTH y despacho de cuadrillas.'
            },
            servers: [
                {
                    url: `http://localhost:5000${apiPrefix}`,
                    description: 'Servidor local / Docker Compose'
                }
            ],
            components: {
                securitySchemes: {
                    bearerAuth: {
                        type: 'http',
                        scheme: 'bearer',
                        bearerFormat: 'JWT'
                    },
                    cookieAuth: {
                        type: 'apiKey',
                        in: 'cookie',
                        name: 'orion_access_token'
                    }
                }
            },
            paths: {
                '/health': {
                    get: {
                        tags: ['Health'],
                        summary: 'Verifica estado del servidor y conexión MySQL InnoDB',
                        responses: { 200: { description: 'Servicio saludable' } }
                    }
                },
                '/auth/login': {
                    post: {
                        tags: ['Auth'],
                        summary: 'Autentica usuario y emite JWT en Cookie HttpOnly + Bearer Token',
                        responses: { 200: { description: 'Sesión iniciada' }, 401: { description: 'Credenciales inválidas' } }
                    }
                },
                '/auth/register': {
                    post: {
                        tags: ['Auth'],
                        summary: 'Registra un nuevo cliente suscriptor con DPI de 13 dígitos',
                        responses: { 201: { description: 'Suscriptor creado' } }
                    }
                },
                '/auth/logout': {
                    post: {
                        tags: ['Auth'],
                        summary: 'Invalida la cookie HttpOnly de sesión',
                        responses: { 200: { description: 'Sesión cerrada' } }
                    }
                },
                '/dashboard/summary': {
                    get: {
                        tags: ['NOC Dashboard'],
                        summary: 'Métricas ejecutivas del NOC (ONUs online, LOS, fallas masivas, tickets y cuadrillas)',
                        responses: { 200: { description: 'Resumen NOC' } }
                    }
                },
                '/diagnostics/run': {
                    post: {
                        tags: ['Optical Diagnostics'],
                        summary: 'Ejecuta sp_run_remote_diagnostic (telemetría dBm + correlación automática de falla masiva por Caja NAP)',
                        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
                        responses: { 201: { description: 'Diagnóstico óptico ejecutado' } }
                    }
                },
                '/outages': {
                    get: {
                        tags: ['Mass Outages'],
                        summary: 'Lista fallas masivas activas e históricas en la red FTTH',
                        responses: { 200: { description: 'Listado de fallas masivas' } }
                    }
                },
                '/tickets': {
                    get: {
                        tags: ['Support Tickets'],
                        summary: 'Lista tickets de soporte filtrados por rol (RBAC)',
                        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
                        responses: { 200: { description: 'Tickets recuperados' } }
                    },
                    post: {
                        tags: ['Support Tickets'],
                        summary: 'Crea un ticket de soporte y lo vincula automáticamente si su Caja NAP tiene falla masiva activa',
                        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
                        responses: { 201: { description: 'Ticket creado' } }
                    }
                },
                '/dispatches/{id}/complete': {
                    put: {
                        tags: ['Crew Dispatch'],
                        summary: 'Ejecuta sp_complete_dispatch_order certificando potencia óptica dBm en campo y restaurando ONU/NAP/Tickets en transacción ACID',
                        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
                        parameters: [
                            { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
                        ],
                        responses: { 200: { description: 'Orden de despacho certificada y cerrada' } }
                    }
                }
            }
        };
    }
}
