import { BaseController } from '../core/base.controller.js';
import { TokenService } from '../services/token.service.js';
import { JwtConfig } from '../config/jwt.config.js';

export class AuthController extends BaseController {
    constructor(authService) {
        super(authService);
    }

    async register(req, res) {
        const newUser = await this.service.register(req.body);
        const { accessToken, expiresIn } = TokenService.createAccessToken(newUser);
        res.cookie(JwtConfig.cookieName, accessToken, JwtConfig.getCookieOptions());

        return this.created(res, newUser, 'Suscriptor registrado exitosamente en Orion Link.', {
            accessToken,
            tokenType: 'Bearer',
            expiresIn
        });
    }

    async login(req, res) {
        const { email, password } = req.body;
        const user = await this.service.login(email, password);
        const { accessToken, expiresIn } = TokenService.createAccessToken(user);

        // Emisión dual: Cookie HttpOnly segura + Token Bearer en respuesta JSON
        res.cookie(JwtConfig.cookieName, accessToken, JwtConfig.getCookieOptions());

        return this.ok(res, user, 'Inicio de sesión exitoso en Orion Link.', {
            accessToken,
            tokenType: 'Bearer',
            expiresIn
        });
    }

    async logout(_req, res) {
        res.clearCookie(JwtConfig.cookieName, {
            httpOnly: true,
            path: '/'
        });
        return this.ok(res, null, 'Sesión cerrada correctamente y cookie HttpOnly invalidada.');
    }

    async me(req, res) {
        return this.ok(res, req.user, 'Perfil autenticado recuperado.');
    }
}

export class UserController extends BaseController {
    constructor(userService) {
        super(userService);
    }

    async list(req, res) {
        const users = await this.service.listUsers({
            role: req.query.role || null,
            activeOnly: req.query.activeOnly === 'true'
        });
        return this.ok(res, users, 'Listado de usuarios recuperado.');
    }

    async create(req, res) {
        const user = await this.service.createUser(req.body);
        return this.created(res, user, 'Usuario creado por administración.');
    }

    async update(req, res) {
        const user = await this.service.updateUser(Number(req.params.id), req.body);
        return this.ok(res, user, 'Usuario actualizado correctamente.');
    }

    async deactivate(req, res) {
        const user = await this.service.deactivateUser(Number(req.params.id));
        return this.ok(res, user, 'Cuenta de usuario desactivada conservando historial.');
    }
}
