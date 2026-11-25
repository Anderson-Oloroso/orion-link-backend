/**
 * Clase Base Abstracta para Controladores HTTP en Express (100% OOP)
 * Estandariza el envoltorio asíncrono y las respuestas JSON del contrato Orion Link.
 */
export class BaseController {
    #service;

    constructor(service = null) {
        if (new.target === BaseController) {
            throw new Error('BaseController es una clase abstracta y no puede instanciarse directamente.');
        }
        this.#service = service;
    }

    get service() {
        return this.#service;
    }

    /**
     * Envoltorio polimórfico que captura promesas rechazadas y las delega a ErrorMiddleware
     */
    handle(methodName) {
        if (typeof this[methodName] !== 'function') {
            throw new Error(`El método '${methodName}' no existe en ${this.constructor.name}`);
        }
        return async (req, res, next) => {
            try {
                await this[methodName](req, res, next);
            } catch (error) {
                next(error);
            }
        };
    }

    ok(res, data = null, message = 'Operación exitosa', extra = {}) {
        return res.status(200).json({
            status: 'Success',
            message,
            data,
            ...extra
        });
    }

    created(res, data = null, message = 'Registro creado correctamente', extra = {}) {
        return res.status(201).json({
            status: 'Success',
            message,
            data,
            ...extra
        });
    }
}
