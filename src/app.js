import './config/env.config.js';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { EnvConfig } from './config/env.config.js';
import { apiPrefix, appVersion } from './config/version.config.js';
import { SwaggerConfig } from './config/swagger.config.js';
import passport from './config/passport.js';
import { logger } from './utils/logger.js';
import { ForbiddenError } from './utils/app-error.js';
import { SecurityHeadersMiddleware } from './middlewares/security-headers.middleware.js';
import { RateLimitMiddleware } from './middlewares/rate-limit.middleware.js';
import { notFoundHandler, errorHandler } from './middlewares/error.middleware.js';
import apiRouter from './routes/index.js';

export class App {
    #app;

    constructor() {
        this.#app = express();
        this.initializeMiddlewares();
        this.initializeDocumentation();
        this.initializeRoutes();
        this.initializeErrorHandling();
    }

    initializeMiddlewares() {
        const allowedOrigins = EnvConfig.corsOrigins;

        this.#app.use(SecurityHeadersMiddleware.apply);
        this.#app.use(logger);
        this.#app.use(
            cors({
                origin: (origin, callback) => {
                    // Peticiones de herramientas como Bruno, curl o mismo origen no envían header Origin
                    if (!origin) {
                        return callback(null, true);
                    }
                    const isLocalDev =
                        !EnvConfig.isProduction &&
                        (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin) || origin === 'null');
                    const isNetlifyOrigin = /^https:\/\/[a-z0-9-]+(--[a-z0-9-]+)?\.netlify\.app$/i.test(origin);

                    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin) || isLocalDev || isNetlifyOrigin) {
                        return callback(null, true);
                    }
                    return callback(new ForbiddenError(`Origen CORS no autorizado por Orion Link: ${origin}`));
                },
                credentials: true
            })
        );
        this.#app.use(cookieParser());
        this.#app.use(express.json({ limit: '1mb' }));
        this.#app.use(express.urlencoded({ extended: true }));
        this.#app.use(RateLimitMiddleware.globalLimiter());
        this.#app.use(passport.initialize());
    }

    initializeDocumentation() {
        const spec = SwaggerConfig.getSpec();
        this.#app.get('/api-docs.json', (_req, res) => {
            res.status(200).json(spec);
        });
        this.#app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec));
    }

    initializeRoutes() {
        const healthPath = apiPrefix === '/' ? '/health' : `${apiPrefix}/health`;

        this.#app.get(healthPath, (_req, res) => {
            res.status(200).json({
                status: 'ok',
                service: 'Orion Link ISP CRM & FTTH Operations API',
                version: appVersion,
                engine: 'MySQL 8.0 InnoDB',
                auth: 'JWT Dual (HttpOnly Cookie + Bearer)',
                timestamp: new Date().toISOString()
            });
        });

        this.#app.use(apiPrefix, apiRouter);
    }

    initializeErrorHandling() {
        this.#app.use(notFoundHandler);
        this.#app.use(errorHandler);
    }

    get instance() {
        return this.#app;
    }
}

export const appInstance = new App();
export default appInstance.instance;
