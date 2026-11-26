import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Database } from './database.config.js';
import { EnvConfig } from './env.config.js';
import { Logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_ROOT = path.resolve(__dirname, '../../database');

/**
 * Inicializador Orientado a Objetos para entornos Cloud (Railway MySQL) y Locales.
 * Verifica si las tablas, semillas y procedimientos almacenados ya existen en la BD;
 * si la instancia MySQL está vacía, ejecuta automáticamente ddl/01-schema.sql,
 * dml/02-seeds.sql y dml/03-procedures-triggers.sql.
 */
export class DatabaseBootstrapper {
    static stripUseAndCreateDb(sqlText) {
        return sqlText
            .replace(/CREATE\s+DATABASE\s+IF\s+NOT\s+EXISTS\s+[^;]+;/gi, '')
            .replace(/USE\s+[a-zA-Z0-9_]+\s*;/gi, '');
    }

    static splitStandardSqlStatements(sqlText) {
        const cleaned = DatabaseBootstrapper.stripUseAndCreateDb(sqlText)
            .split(/\r?\n/)
            .filter((line) => !line.trim().startsWith('--'))
            .join('\n');

        return cleaned
            .split(';')
            .map((stmt) => stmt.trim())
            .filter(Boolean);
    }

    static splitDelimiterBlocks(sqlText) {
        const withoutComments = DatabaseBootstrapper.stripUseAndCreateDb(sqlText)
            .split(/\r?\n/)
            .filter((line) => !line.trim().startsWith('--'))
            .join('\n')
            .replace(/DELIMITER\s+\$\$/gi, '')
            .replace(/DELIMITER\s+;/gi, '');

        return withoutComments
            .split('$$')
            .map((block) => block.trim().replace(/;$/, '').trim())
            .filter((block) => block.length > 0 && !/^SET\s+NAMES/i.test(block));
    }

    static async ensureInitialized() {
        const connection = await Database.getConnection();
        try {
            const dbName = EnvConfig.db.database;
            const [tables] = await connection.query(
                'SELECT COUNT(*) AS cnt FROM information_schema.tables WHERE table_schema = ? AND table_name = ?',
                [dbName, 'dispatch_orders']
            );

            const hasFullSchema = Number(tables[0]?.cnt || 0) > 0;
            if (!hasFullSchema) {
                Logger.info(`Inicializando esquema 3NF MySQL InnoDB en '${dbName}' desde database/ddl/01-schema.sql...`);
                const schemaSql = await fs.readFile(path.join(DB_ROOT, 'ddl/01-schema.sql'), 'utf8');
                for (const stmt of DatabaseBootstrapper.splitStandardSqlStatements(schemaSql)) {
                    await connection.query(stmt);
                }
            }

            const [userCountRows] = await connection.query('SELECT COUNT(*) AS cnt FROM users');
            const [dispatchCountRows] = await connection.query('SELECT COUNT(*) AS cnt FROM dispatch_orders');
            if (Number(userCountRows[0]?.cnt || 0) === 0 || Number(dispatchCountRows[0]?.cnt || 0) === 0) {
                Logger.info(`Cargando datos iniciales en '${dbName}' desde database/dml/02-seeds.sql...`);
                const seedsSql = await fs.readFile(path.join(DB_ROOT, 'dml/02-seeds.sql'), 'utf8');
                for (const stmt of DatabaseBootstrapper.splitStandardSqlStatements(seedsSql)) {
                    const safeStmt = stmt.replace(/^INSERT\s+INTO\s+/i, 'INSERT IGNORE INTO ');
                    await connection.query(safeStmt);
                }
            }

            const [routines] = await connection.query(
                'SELECT COUNT(*) AS cnt FROM information_schema.routines WHERE routine_schema = ? AND routine_name = ?',
                [dbName, 'sp_run_remote_diagnostic']
            );

            if (Number(routines[0]?.cnt || 0) === 0) {
                Logger.info(`Instalando triggers y stored procedures en '${dbName}' desde database/dml/03-procedures-triggers.sql...`);
                const procSql = await fs.readFile(path.join(DB_ROOT, 'dml/03-procedures-triggers.sql'), 'utf8');
                for (const block of DatabaseBootstrapper.splitDelimiterBlocks(procSql)) {
                    await connection.query(block);
                }
            }
        } finally {
            connection.release();
        }
    }
}
