import dotenv from 'dotenv';

dotenv.config();

export class EnvConfig {
    static get nodeEnv() {
        return process.env.NODE_ENV || 'development';
    }

    static get isProduction() {
        return EnvConfig.nodeEnv === 'production';
    }

    static get port() {
        return Number(process.env.PORT) || 5000;
    }

    static get apiPrefix() {
        return process.env.API_PREFIX || '/api/v1';
    }

    static get db() {
        return {
            host: process.env.DB_HOST || process.env.MYSQLHOST || '127.0.0.1',
            port: Number(process.env.DB_PORT || process.env.MYSQLPORT) || 3307,
            user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
            password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || 'orion_secret_2026',
            database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'orion_link_db',
            connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10
        };
    }

    static get jwt() {
        return {
            secret: process.env.JWT_SECRET || 'orion_link_super_secret_jwt_key_2026_isp_ftth_noc',
            expiresIn: process.env.JWT_EXPIRES_IN || '24h',
            cookieName: process.env.JWT_COOKIE_NAME || 'orion_access_token',
            cookieMaxAgeMs: Number(process.env.JWT_COOKIE_MAX_AGE_MS) || 86400000
        };
    }

    static get corsOrigins() {
        return (process.env.CORS_ORIGIN || 'http://localhost:5500,http://127.0.0.1:5500,http://localhost:3000,http://localhost:5173')
            .split(',')
            .map((origin) => origin.trim())
            .filter(Boolean);
    }

    static get rateLimit() {
        return {
            windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
            maxRequests: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 200,
            authMaxRequests: Number(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS) || 30
        };
    }
}

export const serverPort = EnvConfig.port;
