import { BaseRepository } from '../core/base.repository.js';

export class ServicePlanRepository extends BaseRepository {
    constructor(pool) {
        super('service_plans', 'id_plan', pool);
    }

    async findAllActive() {
        const sql = 'SELECT * FROM service_plans WHERE is_active = TRUE ORDER BY download_mbps ASC';
        const [rows] = await this.execute(sql);
        return this.mapRows(rows);
    }

    async create({ code, name, downloadMbps, uploadMbps, monthlyPrice, slaHours = 24 }) {
        const sql = `
            INSERT INTO service_plans (plan_code, name, download_mbps, upload_mbps, monthly_price, sla_hours, is_active)
            VALUES (?, ?, ?, ?, ?, ?, TRUE)
        `;
        const [result] = await this.execute(sql, [code, name, downloadMbps, uploadMbps, monthlyPrice, slaHours]);
        return await this.findById(result.insertId);
    }
}

export class ContractRepository extends BaseRepository {
    constructor(pool) {
        super('subscriber_contracts', 'id_contract', pool);
    }

    static get BASE_JOIN_SQL() {
        return `
            SELECT sc.*,
                   CONCAT(u.first_name, ' ', u.last_name) AS customer_name,
                   u.email AS customer_email,
                   u.phone AS customer_phone,
                   u.dpi AS customer_dpi,
                   sp.plan_code,
                   sp.name AS plan_name,
                   sp.download_mbps,
                   sp.upload_mbps,
                   sp.monthly_price,
                   sp.sla_hours,
                   o.serial_number AS onu_serial,
                   o.model AS onu_model,
                   o.rx_power_dbm,
                   o.tx_power_dbm,
                   o.optical_status,
                   o.nap_port_number,
                   nb.id_nap_box,
                   nb.nap_code,
                   nb.status AS nap_status
              FROM subscriber_contracts sc
              INNER JOIN users u ON sc.id_customer = u.id_user
              INNER JOIN service_plans sp ON sc.id_plan = sp.id_plan
              INNER JOIN onus o ON sc.id_onu = o.id_onu
              INNER JOIN nap_boxes nb ON o.id_nap_box = nb.id_nap_box
        `;
    }

    async findAllDetailed({ search = '' } = {}) {
        const term = String(search || '').trim();
        if (!term) {
            const sql = `${ContractRepository.BASE_JOIN_SQL} ORDER BY sc.id_contract ASC`;
            const [rows] = await this.execute(sql);
            return this.mapRows(rows);
        }

        const like = `%${term}%`;
        const sql = `
            ${ContractRepository.BASE_JOIN_SQL}
            WHERE sc.contract_number LIKE ?
               OR u.dpi LIKE ?
               OR CONCAT(u.first_name, ' ', u.last_name) LIKE ?
               OR o.serial_number LIKE ?
               OR nb.nap_code LIKE ?
            ORDER BY sc.id_contract ASC
        `;
        const [rows] = await this.execute(sql, [like, like, like, like, like]);
        return this.mapRows(rows);
    }

    async findByCustomerId(customerId) {
        const sql = `${ContractRepository.BASE_JOIN_SQL} WHERE sc.id_customer = ? ORDER BY sc.id_contract ASC`;
        const [rows] = await this.execute(sql, [customerId]);
        return this.mapRows(rows);
    }

    async findDetailedById(id) {
        const sql = `${ContractRepository.BASE_JOIN_SQL} WHERE sc.id_contract = ? LIMIT 1`;
        const [rows] = await this.execute(sql, [id]);
        return rows.length > 0 ? this.mapRow(rows[0]) : null;
    }

    async create({ contractNumber, customerId, planId, onuId, installationAddress, zoneDepartment, installationDate, billingDay = 5 }) {
        const sql = `
            INSERT INTO subscriber_contracts (
                contract_number, id_customer, id_plan, id_onu,
                installation_address, zone_department, installation_date, billing_day, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
        `;
        const [result] = await this.execute(sql, [
            contractNumber, customerId, planId, onuId, installationAddress, zoneDepartment, installationDate, billingDay
        ]);
        return await this.findDetailedById(result.insertId);
    }
}
