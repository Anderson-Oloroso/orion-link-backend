import { createPool } from 'mysql2/promise';
import { EnvConfig } from './env.config.js';
import { DatabaseError } from '../utils/app-error.js';

/**
 * Gestor Singleton Orientado a Objetos para el Pool de Conexiones MySQL 8.0 InnoDB
 * Soporta ejecución parametrizada y transacciones ACID con rollback automático.
 */
export class Database {
    static #pool = null;

    static getPool() {
        if (!Database.#pool) {
            const dbConfig = EnvConfig.db;
            Database.#pool = createPool({
                host: dbConfig.host,
                port: dbConfig.port,
                user: dbConfig.user,
                password: dbConfig.password,
                database: dbConfig.database,
                waitForConnections: true,
                connectionLimit: dbConfig.connectionLimit,
                queueLimit: 0,
                decimalNumbers: true,
                timezone: '-06:00'
            });
        }
        return Database.#pool;
    }

    static async getConnection() {
        return await Database.getPool().getConnection();
    }

    static async execute(sql, params = []) {
        try {
            return await Database.getPool().execute(sql, params);
        } catch (err) {
            throw DatabaseError.fromMySQLError(err);
        }
    }

    static async query(sql, params = []) {
        try {
            return await Database.getPool().query(sql, params);
        } catch (err) {
            throw DatabaseError.fromMySQLError(err);
        }
    }

    /**
     * Ejecuta un bloque de operaciones dentro de una transacción MySQL InnoDB
     */
    static async withTransaction(workCallback) {
        const connection = await Database.getConnection();
        try {
            await connection.beginTransaction();
            const result = await workCallback(connection);
            await connection.commit();
            return result;
        } catch (err) {
            await connection.rollback();
            if (err.name && err.name.endsWith('Error') && err.statusCode) {
                throw err;
            }
            throw DatabaseError.fromMySQLError(err);
        } finally {
            connection.release();
        }
    }

    static async checkConnection() {
        const connection = await Database.getConnection();
        await connection.ping();
        connection.release();
        return true;
    }

    static async close() {
        if (Database.#pool) {
            await Database.#pool.end();
            Database.#pool = null;
        }
    }
}

export const Pool = Database.getPool();
