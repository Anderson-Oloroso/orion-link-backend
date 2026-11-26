import bcrypt from 'bcrypt';
import { BaseService } from '../core/base.service.js';
import { UserDTO } from '../dtos/user.dto.js';
import { ConflictError, UnauthorizedError } from '../utils/app-error.js';

export class AuthService extends BaseService {
    constructor(userRepository) {
        super(userRepository, UserDTO);
    }

    async register({ dpi, firstName, lastName, phone, email, password }) {
        const existing = await this.repository.findByEmail(email);
        if (existing) {
            throw new ConflictError('El correo electrónico ya está registrado en Orion Link.');
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const created = await this.repository.create({
            dpi,
            firstName,
            lastName,
            phone,
            email,
            passwordHash,
            role: 'customer'
        });

        return this.toDTO(created);
    }

    async login(email, password) {
        const user = await this.repository.findByEmail(email);
        if (!user) {
            throw new UnauthorizedError('Credenciales inválidas: correo o contraseña incorrectos.');
        }

        if (!user.is_active) {
            throw new UnauthorizedError('Esta cuenta de usuario se encuentra desactivada.');
        }

        let isValid = false;
        try {
            isValid = await bcrypt.compare(password, user.password_hash);
        } catch {
            isValid = false;
        }

        if (!isValid) {
            throw new UnauthorizedError('Credenciales inválidas: correo o contraseña incorrectos.');
        }

        return this.toDTO(user);
    }
}

export class UserService extends BaseService {
    constructor(userRepository) {
        super(userRepository, UserDTO);
    }

    async listUsers(filters = {}) {
        const rows = await this.repository.findAllFiltered(filters);
        return this.toDTOList(rows);
    }

    async createUser({ dpi, firstName, lastName, phone, email, password, role = 'customer' }) {
        const existing = await this.repository.findByEmail(email);
        if (existing) {
            throw new ConflictError('El correo electrónico ya está asignado a otro usuario.');
        }
        const passwordHash = await bcrypt.hash(password, 10);
        const user = await this.repository.create({
            dpi,
            firstName,
            lastName,
            phone,
            email,
            passwordHash,
            role
        });
        return this.toDTO(user);
    }

    async updateUser(id, data) {
        const updated = await this.repository.updateProfile(id, data);
        return this.toDTO(updated);
    }

    async deactivateUser(id) {
        await this.repository.findByIdOrFail(id, 'Usuario');
        const deactivated = await this.repository.deactivate(id);
        return this.toDTO(deactivated);
    }

    async listPublicRolesDirectory() {
        const rows = await this.repository.findRepresentativeByEachRole();
        return this.toDTOList(rows);
    }
}
