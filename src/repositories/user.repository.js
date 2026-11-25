import { BaseRepository } from '../core/base.repository.js';

export class UserRepository extends BaseRepository {
    constructor(pool) {
        super('users', 'id_user', pool);
    }

    async findByEmail(email) {
        const sql = 'SELECT * FROM users WHERE email = ? LIMIT 1';
        const [rows] = await this.execute(sql, [String(email).trim().toLowerCase()]);
        return rows.length > 0 ? this.mapRow(rows[0]) : null;
    }

    async findActiveById(id) {
        const sql = 'SELECT * FROM users WHERE id_user = ? AND is_active = TRUE LIMIT 1';
        const [rows] = await this.execute(sql, [id]);
        return rows.length > 0 ? this.mapRow(rows[0]) : null;
    }

    async findAllFiltered({ role, activeOnly = false } = {}) {
        const conditions = [];
        const params = [];

        if (role) {
            conditions.push('role = ?');
            params.push(role);
        }
        if (activeOnly) {
            conditions.push('is_active = TRUE');
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const sql = `SELECT * FROM users ${whereClause} ORDER BY id_user ASC`;
        const [rows] = await this.execute(sql, params);
        return this.mapRows(rows);
    }

    async create({ dpi, firstName, lastName, phone, email, passwordHash, role = 'customer' }) {
        const sql = `
            INSERT INTO users (dpi, first_name, last_name, phone, email, password_hash, role, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)
        `;
        const [result] = await this.execute(sql, [
            dpi,
            firstName,
            lastName,
            phone,
            String(email).trim().toLowerCase(),
            passwordHash,
            role
        ]);
        return await this.findById(result.insertId);
    }

    async updateProfile(id, { firstName, lastName, phone, role, isActive }) {
        const current = await this.findByIdOrFail(id, 'Usuario');
        const sql = `
            UPDATE users
               SET first_name = ?,
                   last_name = ?,
                   phone = ?,
                   role = ?,
                   is_active = ?
             WHERE id_user = ?
        `;
        await this.execute(sql, [
            firstName ?? current.first_name,
            lastName ?? current.last_name,
            phone ?? current.phone,
            role ?? current.role,
            isActive !== undefined ? Boolean(isActive) : Boolean(current.is_active),
            id
        ]);
        return await this.findById(id);
    }

    async deactivate(id) {
        const sql = 'UPDATE users SET is_active = FALSE WHERE id_user = ?';
        await this.execute(sql, [id]);
        return await this.findById(id);
    }
}
