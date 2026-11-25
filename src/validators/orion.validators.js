import { body, param } from 'express-validator';
import { BaseValidator } from '../core/base.validator.js';

export class AuthValidator extends BaseValidator {
    static register() {
        return AuthValidator.validate([
            body('dpi')
                .trim()
                .isLength({ min: 13, max: 13 })
                .withMessage('El DPI debe contener exactamente 13 dígitos.')
                .isNumeric()
                .withMessage('El DPI solo debe contener números.'),
            body('firstName')
                .trim()
                .notEmpty()
                .withMessage('El nombre es obligatorio.')
                .isLength({ max: 60 }),
            body('lastName')
                .trim()
                .notEmpty()
                .withMessage('El apellido es obligatorio.')
                .isLength({ max: 60 }),
            body('phone')
                .trim()
                .isLength({ min: 8, max: 8 })
                .withMessage('El teléfono debe contener exactamente 8 dígitos.')
                .isNumeric()
                .withMessage('El teléfono solo debe contener dígitos.'),
            body('email')
                .trim()
                .isEmail()
                .withMessage('Debe proporcionar un correo electrónico válido.')
                .normalizeEmail(),
            body('password')
                .isString()
                .isLength({ min: 8 })
                .withMessage('La contraseña debe tener al menos 8 caracteres.')
        ]);
    }

    static login() {
        return AuthValidator.validate([
            body('email')
                .trim()
                .isEmail()
                .withMessage('Ingrese un correo electrónico válido.'),
            body('password')
                .notEmpty()
                .withMessage('La contraseña es requerida.')
        ]);
    }
}

export class OperationsValidator extends BaseValidator {
    static runDiagnostic() {
        return OperationsValidator.validate([
            body('contractId')
                .isInt({ min: 1 })
                .withMessage('El identificador del contrato (contractId) debe ser un entero positivo.'),
            body('simulatedRxDbm')
                .optional({ nullable: true })
                .isFloat({ min: -45.0, max: -10.0 })
                .withMessage('La potencia óptica simulada debe estar entre -45.00 y -10.00 dBm.')
        ]);
    }

    static createTicket() {
        return OperationsValidator.validate([
            body('contractId')
                .isInt({ min: 1 })
                .withMessage('Debe seleccionar un contrato válido.'),
            body('category')
                .isIn([
                    'no_connection_los',
                    'slow_speed',
                    'high_attenuation',
                    'wifi_router',
                    'onu_power',
                    'installation_relocation',
                    'billing_inquiry'
                ])
                .withMessage('Categoría técnica de ticket no válida.'),
            body('priority')
                .optional()
                .isIn(['low', 'medium', 'high', 'critical'])
                .withMessage('Prioridad no válida.'),
            body('subject')
                .trim()
                .isLength({ min: 5, max: 140 })
                .withMessage('El asunto del ticket debe tener entre 5 y 140 caracteres.'),
            body('description')
                .trim()
                .isLength({ min: 10 })
                .withMessage('La descripción del problema debe tener al menos 10 caracteres.')
        ]);
    }

    static addComment() {
        return OperationsValidator.validate([
            param('id').isInt({ min: 1 }).withMessage('ID de ticket inválido.'),
            body('commentText')
                .trim()
                .isLength({ min: 3 })
                .withMessage('El comentario debe tener al menos 3 caracteres.')
        ]);
    }

    static createDispatch() {
        return OperationsValidator.validate([
            body('crewId')
                .isInt({ min: 1 })
                .withMessage('Debe asignar una cuadrilla técnica válida (crewId).'),
            body('visitType')
                .optional()
                .isIn(['last_mile_repair', 'nap_splitter_repair', 'backbone_fusion', 'onu_replacement'])
                .withMessage('Tipo de visita técnica no válido.')
        ]);
    }

    static completeDispatch() {
        return OperationsValidator.validate([
            param('id').isInt({ min: 1 }).withMessage('ID de orden de despacho inválido.'),
            body('restoredRxDbm')
                .isFloat({ min: -25.0, max: -14.0 })
                .withMessage('Para certificar el cierre en campo, la potencia óptica restaurada debe estar entre -14.00 y -25.00 dBm.'),
            body('fieldNotes')
                .trim()
                .isLength({ min: 5 })
                .withMessage('Las notas técnicas de cierre en campo son obligatorias.')
        ]);
    }
}
