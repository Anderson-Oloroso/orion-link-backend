import { BaseRepository } from '../core/base.repository.js';

export class DiagnosticRepository extends BaseRepository {
    constructor(pool) {
        super('remote_diagnostics', 'id_diagnostic', pool);
    }

    async findAllDetailed({ contractId = null } = {}) {
        const params = [];
        const where = contractId ? 'WHERE rd.id_contract = ?' : '';
        if (contractId) params.push(contractId);

        const sql = `
            SELECT rd.*,
                   sc.contract_number,
                   CONCAT(cu.first_name, ' ', cu.last_name) AS customer_name,
                   o.serial_number AS onu_serial,
                   nb.nap_code,
                   CONCAT(ex.first_name, ' ', ex.last_name) AS executor_name
              FROM remote_diagnostics rd
              INNER JOIN subscriber_contracts sc ON rd.id_contract = sc.id_contract
              INNER JOIN users cu ON sc.id_customer = cu.id_user
              INNER JOIN onus o ON rd.id_onu = o.id_onu
              INNER JOIN nap_boxes nb ON o.id_nap_box = nb.id_nap_box
              INNER JOIN users ex ON rd.executed_by = ex.id_user
              ${where}
             ORDER BY rd.created_at DESC
             LIMIT 100
        `;
        const [rows] = await this.execute(sql, params);
        return this.mapRows(rows);
    }

    /**
     * Invoca el Stored Procedure transaccional sp_run_remote_diagnostic
     */
    async runStoredDiagnostic(contractId, executedBy, simulatedRxDbm = null) {
        const sql = 'CALL sp_run_remote_diagnostic(?, ?, ?)';
        const [resultSets] = await this.query(sql, [
            contractId,
            executedBy,
            simulatedRxDbm !== undefined && simulatedRxDbm !== '' ? simulatedRxDbm : null
        ]);
        const rows = Array.isArray(resultSets) && Array.isArray(resultSets[0]) ? resultSets[0] : [];
        return rows.length > 0 ? this.mapRow(rows[0]) : null;
    }
}

export class MassOutageRepository extends BaseRepository {
    constructor(pool) {
        super('mass_outages', 'id_mass_outage', pool);
    }

    static get BASE_JOIN_SQL() {
        return `
            SELECT mo.*,
                   ol.olt_code,
                   ol.name AS olt_name,
                   nb.nap_code,
                   nb.zone_sector,
                   CONCAT(u.first_name, ' ', u.last_name) AS declared_by_name
              FROM mass_outages mo
              INNER JOIN olts ol ON mo.id_olt = ol.id_olt
              LEFT JOIN nap_boxes nb ON mo.id_nap_box = nb.id_nap_box
              LEFT JOIN users u ON mo.declared_by = u.id_user
        `;
    }

    async findAllDetailed({ activeOnly = false } = {}) {
        const where = activeOnly ? "WHERE mo.status IN ('detected', 'dispatched', 'repairing')" : '';
        const sql = `${MassOutageRepository.BASE_JOIN_SQL} ${where} ORDER BY mo.detected_at DESC`;
        const [rows] = await this.execute(sql);
        return this.mapRows(rows);
    }

    async findDetailedById(id) {
        const sql = `${MassOutageRepository.BASE_JOIN_SQL} WHERE mo.id_mass_outage = ? LIMIT 1`;
        const [rows] = await this.execute(sql, [id]);
        return rows.length > 0 ? this.mapRow(rows[0]) : null;
    }

    async create({ outageCode, oltId, napBoxId = null, declaredBy, title, rootCause = 'fiber_cut', severity = 'critical', affectedContractsCount = 0, estimatedHours = 3 }) {
        const sql = `
            INSERT INTO mass_outages (
                outage_code, id_olt, id_nap_box, declared_by, title,
                root_cause, severity, status, affected_contracts_count,
                detected_at, estimated_resolution_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'detected', ?, NOW(), DATE_ADD(NOW(), INTERVAL ? HOUR))
        `;
        const [result] = await this.execute(sql, [
            outageCode, oltId, napBoxId, declaredBy, title, rootCause, severity, affectedContractsCount, estimatedHours
        ]);
        if (napBoxId) {
            await this.execute("UPDATE nap_boxes SET status = 'outage' WHERE id_nap_box = ?", [napBoxId]);
        }
        return await this.findDetailedById(result.insertId);
    }

    async resolveOutage(id, resolutionNotes) {
        const outage = await this.findDetailedById(id);
        if (!outage) return null;

        await this.execute(
            "UPDATE mass_outages SET status = 'resolved', resolved_at = NOW(), resolution_notes = ? WHERE id_mass_outage = ?",
            [resolutionNotes || 'Falla masiva resuelta por NOC.', id]
        );

        if (outage.id_nap_box) {
            await this.execute("UPDATE nap_boxes SET status = 'operational' WHERE id_nap_box = ?", [outage.id_nap_box]);
            await this.execute(
                "UPDATE onus SET rx_power_dbm = -19.20, tx_power_dbm = 2.20, optical_status = 'online', last_telemetry_at = NOW() WHERE id_nap_box = ?",
                [outage.id_nap_box]
            );
        }

        return await this.findDetailedById(id);
    }
}
