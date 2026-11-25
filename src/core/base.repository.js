import { Database } from '../config/database.config.js';
import { NotFoundError } from '../utils/app-error.js';

/**
 * Clase Base Abstracta para Repositorios MySQL InnoDB (100% OOP)
 * Implementa herencia y polimorfismo mediante `mapRow(row)` y operaciones CRUD comunes.
 */
export class BaseRepository {
    #pool;
    #tableName;
    #primaryKey;

    constructor(tableName, primaryKey, pool = Database.getPool()) {
        if (new.target === BaseRepository) {
            throw new Error('BaseRepository es una clase abstracta y no puede instanciarse directamente.');
        }
        this.#tableName = tableName;
        this.#primaryKey = primaryKey;
        this.#pool = pool;
    }

    get pool() {
        return this.#pool;
    }

    get tableName() {
        return this.#tableName;
    }

    get primaryKey() {
        return this.#primaryKey;
    }

    /**
     * Gancho polimórfico que las subclases pueden sobrescribir para normalizar tipos
     */
    mapRow(row) {
        return row;
    }

    mapRows(rows = []) {
        return rows.map((row) => this.mapRow(row));
    }

    async execute(sql, params = []) {
        return await Database.execute(sql, params);
    }

    async query(sql, params = []) {
        return await Database.query(sql, params);
    }

    async findAll({ orderBy = this.#primaryKey, direction = 'DESC', limit = 100 } = {}) {
        const safeColumn = /^[a-zA-Z0-9_]+$/.test(String(orderBy)) ? orderBy : this.#primaryKey;
        const safeDirection = String(direction).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
        const sql = `SELECT * FROM ${this.#tableName} ORDER BY ${safeColumn} ${safeDirection} LIMIT ${safeLimit}`;
        const [rows] = await this.query(sql);
        return this.mapRows(rows);
    }

    async findById(id) {
        const sql = `SELECT * FROM ${this.#tableName} WHERE ${this.#primaryKey} = ? LIMIT 1`;
        const [rows] = await this.execute(sql, [id]);
        return rows.length > 0 ? this.mapRow(rows[0]) : null;
    }

    async findByIdOrFail(id, resourceLabel = this.#tableName) {
        const entity = await this.findById(id);
        if (!entity) {
            throw new NotFoundError(resourceLabel, id);
        }
        return entity;
    }

    async deleteById(id) {
        const sql = `DELETE FROM ${this.#tableName} WHERE ${this.#primaryKey} = ?`;
        const [result] = await this.execute(sql, [id]);
        return result.affectedRows > 0;
    }
}
