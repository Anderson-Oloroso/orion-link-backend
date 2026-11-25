import passport from 'passport';
import { ExtractJwt, Strategy as JwtStrategy } from 'passport-jwt';
import { JwtConfig } from './jwt.config.js';
import { Database } from './database.config.js';
import { UserRepository } from '../repositories/user.repository.js';
import { UserDTO } from '../dtos/user.dto.js';

const userRepository = new UserRepository(Database.getPool());

/**
 * Extractor Dual Polimórfico:
 * 1. Busca primero la cookie HttpOnly `orion_access_token`
 * 2. Si no existe, extrae el token del encabezado `Authorization: Bearer <token>`
 */
const dualCookieOrBearerExtractor = (req) => {
    const cookieName = JwtConfig.cookieName;
    if (req && req.cookies && req.cookies[cookieName]) {
        return req.cookies[cookieName];
    }
    return ExtractJwt.fromAuthHeaderAsBearerToken()(req);
};

passport.use(
    new JwtStrategy(
        {
            jwtFromRequest: dualCookieOrBearerExtractor,
            secretOrKey: JwtConfig.secret,
            algorithms: ['HS256']
        },
        async (payload, done) => {
            try {
                if (!payload || !payload.sub) {
                    return done(null, false);
                }
                const user = await userRepository.findActiveById(Number(payload.sub));
                if (!user) {
                    return done(null, false);
                }
                return done(null, UserDTO.from(user));
            } catch (error) {
                return done(error, false);
            }
        }
    )
);

export default passport;
