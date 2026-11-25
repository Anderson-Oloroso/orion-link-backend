/**
 * Clase Base Abstracta para Data Transfer Objects (DTOs) con polimorfismo
 */
export class BaseDTO {
    static from(row) {
        if (!row) return null;
        return new this(row).serialize();
    }

    static fromList(rows = []) {
        if (!Array.isArray(rows)) return [];
        return rows.map((row) => this.from(row));
    }

    serialize() {
        return { ...this };
    }
}
