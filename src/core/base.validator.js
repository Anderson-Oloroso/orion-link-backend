import { validationResult } from 'express-validator';
import { ValidationError } from '../utils/app-error.js';

/**
 * Clase Base para Validadores de Entrada con express-validator (100% OOP)
 * Ejecuta las reglas y lanza una instancia polimórfica de ValidationError (extendida de AppError).
 */
export class BaseValidator {
    static validate(rules = []) {
        return [
            ...rules,
            (req, _res, next) => {
                const result = validationResult(req);
                if (result.isEmpty()) {
                    return next();
                }

                const formattedErrors = result.array().map((err) => ({
                    field: err.path || err.param,
                    message: err.msg
                }));

                return next(
                    new ValidationError(
                        formattedErrors[0]?.message || 'Datos de entrada inválidos.',
                        formattedErrors
                    )
                );
            }
        ];
    }
}
