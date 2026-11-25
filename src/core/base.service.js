/**
 * Clase Base Abstracta para Servicios de Dominio (100% OOP)
 * Aplica polimorfismo en la transformación de entidades con DTOs y reglas de negocio.
 */
export class BaseService {
    #repository;
    #dtoClass;

    constructor(repository, dtoClass = null) {
        if (new.target === BaseService) {
            throw new Error('BaseService es una clase abstracta y no puede instanciarse directamente.');
        }
        this.#repository = repository;
        this.#dtoClass = dtoClass;
    }

    get repository() {
        return this.#repository;
    }

    get dtoClass() {
        return this.#dtoClass;
    }

    toDTO(entity) {
        if (!entity) return null;
        if (this.#dtoClass && typeof this.#dtoClass.from === 'function') {
            return this.#dtoClass.from(entity);
        }
        return entity;
    }

    toDTOList(entities = []) {
        if (this.#dtoClass && typeof this.#dtoClass.fromList === 'function') {
            return this.#dtoClass.fromList(entities);
        }
        return entities.map((item) => this.toDTO(item));
    }

    async listAll(options = {}) {
        const rows = await this.#repository.findAll(options);
        return this.toDTOList(rows);
    }

    async getById(id, label) {
        const row = await this.#repository.findByIdOrFail(id, label);
        return this.toDTO(row);
    }
}
