import path from 'path';
import { fileURLToPath } from 'url';
import app from './app.js';
import { serverPort, EnvConfig } from './config/env.config.js';
import { apiPrefix } from './config/version.config.js';
import { Database } from './config/database.config.js';
import { Logger } from './utils/logger.js';

export class Server {
    #app;
    #port;
    #httpServer;

    constructor(expressApp = app, port = serverPort) {
        this.#app = expressApp;
        this.#port = port;
        this.#httpServer = null;
    }

    get port() {
        return this.#port;
    }

    async connectDatabase() {
        try {
            await Database.checkConnection();
            Logger.info(`Pool MySQL 8.0 InnoDB conectado exitosamente a '${EnvConfig.db.database}' (${EnvConfig.db.host}:${EnvConfig.db.port})`);
        } catch (error) {
            Logger.error(`No se pudo conectar a MySQL InnoDB (${EnvConfig.db.host}:${EnvConfig.db.port}): ${error.message}`);
            process.exit(1);
        }
    }

    listen() {
        this.#httpServer = this.#app.listen(this.#port, () => {
            Logger.info(`Orion Link Backend corriendo en http://localhost:${this.#port}${apiPrefix}`);
            Logger.info(`Healthcheck disponible en http://localhost:${this.#port}${apiPrefix}/health`);
            Logger.info(`Swagger OpenAPI UI en http://localhost:${this.#port}/api-docs`);
        });
        return this.#httpServer;
    }

    async start() {
        await this.connectDatabase();
        this.listen();
    }

    async stop() {
        if (this.#httpServer) {
            await new Promise((resolve) => this.#httpServer.close(resolve));
        }
        await Database.close();
    }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
    const server = new Server();
    server.start();
}
