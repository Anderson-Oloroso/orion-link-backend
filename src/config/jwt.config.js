import { EnvConfig } from './env.config.js';

export class JwtConfig {
    static get secret() {
        return EnvConfig.jwt.secret;
    }

    static get expiresIn() {
        return EnvConfig.jwt.expiresIn;
    }

    static get cookieName() {
        return EnvConfig.jwt.cookieName;
    }

    static getCookieOptions() {
        return {
            httpOnly: true,
            secure: EnvConfig.isProduction,
            sameSite: EnvConfig.isProduction ? 'none' : 'lax',
            maxAge: EnvConfig.jwt.cookieMaxAgeMs,
            path: '/'
        };
    }
}

export default JwtConfig.secret;
