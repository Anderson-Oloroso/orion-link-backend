/**
 * Jerarquía Polimórfica de Errores de Aplicación (100% OOP)
 * Extiende la clase nativa Error de JavaScript e implementa polimorfismo
 * en toJSON() para que ErrorMiddleware serialice respuestas HTTP uniformes.
 */
export class AppError extends Error {
    #statusCode;
    #status;
    #errorCode;
    #errors;
    #isOperational;
    #timestamp;

    constructor(
        message,
        statusCode = 500,
        { errorCode = 'INTERNAL_ERROR', errors = [], isOperational = true } = {}
    ) {
        super(message);
        this.name = this.constructor.name;
        this.#statusCode = Number(statusCode) || 500;
        this.#status = this.#statusCode >= 400 && this.#statusCode < 500 ? 'Fail' : 'Error';
        this.#errorCode = errorCode;
        this.#errors = Array.isArray(errors) ? errors : [];
        this.#isOperational = Boolean(isOperational);
        this.#timestamp = new Date().toISOString();

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }

    get statusCode() {
        return this.#statusCode;
    }

    get status() {
        return this.#status;
    }

    get errorCode() {
        return this.#errorCode;
    }

    get errors() {
        return this.#errors;
    }

    get isOperational() {
        return this.#isOperational;
    }

    get timestamp() {
        return this.#timestamp;
    }

    /**
     * Método polimórfico que las subclases pueden enriquecer
     */
    toJSON() {
        const payload = {
            status: this.#status,
            errorCode: this.#errorCode,
            message: this.message,
            timestamp: this.#timestamp
        };

        if (this.#errors.length > 0) {
            payload.errors = this.#errors;
        }

        return payload;
    }
}

export class ValidationError extends AppError {
    constructor(message = 'Error de validación en los datos enviados', errors = []) {
        super(message, 400, {
            errorCode: 'VALIDATION_ERROR',
            errors,
            isOperational: true
        });
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = 'No autorizado. Inicie sesión o proporcione un token válido.') {
        super(message, 401, {
            errorCode: 'UNAUTHORIZED',
            isOperational: true
        });
    }
}

export class ForbiddenError extends AppError {
    constructor(message = 'Acceso denegado. Su rol no tiene permisos para esta operación.') {
        super(message, 403, {
            errorCode: 'FORBIDDEN_ROLE',
            isOperational: true
        });
    }
}

export class NotFoundError extends AppError {
    #resource;

    constructor(resource = 'Recurso', identifier = '') {
        const detail = identifier ? `${resource} (${identifier}) no encontrado.` : `${resource} no encontrado.`;
        super(detail, 404, {
            errorCode: 'RESOURCE_NOT_FOUND',
            isOperational: true
        });
        this.#resource = resource;
    }

    get resource() {
        return this.#resource;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            resource: this.#resource
        };
    }
}

export class ConflictError extends AppError {
    constructor(message = 'Conflicto con el estado actual del recurso o registro duplicado.') {
        super(message, 409, {
            errorCode: 'RESOURCE_CONFLICT',
            isOperational: true
        });
    }
}

export class DatabaseError extends AppError {
    #sqlState;

    constructor(message = 'Error en la operación de base de datos MySQL InnoDB.', sqlState = 'HY000', statusCode = 500) {
        super(message, statusCode, {
            errorCode: 'DATABASE_OPERATION_ERROR',
            isOperational: statusCode < 500
        });
        this.#sqlState = sqlState;
    }

    get sqlState() {
        return this.#sqlState;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            sqlState: this.#sqlState
        };
    }

    static fromMySQLError(err) {
        if (!err) {
            return new DatabaseError();
        }
        // SQLSTATE '45000' lanzado por nuestros triggers y stored procedures de negocio
        if (err.sqlState === '45000') {
            return new DatabaseError(err.sqlMessage || err.message, '45000', 400);
        }
        if (err.code === 'ER_DUP_ENTRY') {
            return new ConflictError('Ya existe un registro con esos datos únicos (correo, DPI, serie ONU, puerto NAP o código).');
        }
        if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_ROW_IS_REFERENCED_2') {
            return new ConflictError('Restricción de integridad referencial en MySQL InnoDB: el registro está vinculado a otra entidad activa.');
        }
        return new DatabaseError(err.sqlMessage || err.message || 'Error interno en MySQL InnoDB.', err.sqlState || 'HY000', 500);
    }
}
