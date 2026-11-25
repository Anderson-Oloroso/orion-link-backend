import { BaseDTO } from '../core/base.dto.js';

export class UserDTO extends BaseDTO {
    constructor(row) {
        super();
        this.id = Number(row.id_user);
        this.dpi = row.dpi;
        this.firstName = row.first_name;
        this.lastName = row.last_name;
        this.fullName = `${row.first_name} ${row.last_name}`.trim();
        this.phone = row.phone;
        this.email = row.email;
        this.role = row.role;
        this.isActive = Boolean(row.is_active);
        this.createdAt = row.created_at;
    }
}
