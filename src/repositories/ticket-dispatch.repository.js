import { BaseRepository } from '../core/base.repository.js';

export class TicketRepository extends BaseRepository {
    constructor(pool) {
        super('support_tickets', 'id_ticket', pool);
    }

    static get BASE_JOIN_SQL() {
        return `
            SELECT t.*,
                   sc.contract_number,
                   CONCAT(cu.first_name, ' ', cu.last_name) AS customer_name,
                   CONCAT(ag.first_name, ' ', ag.last_name) AS assigned_agent_name,
                   mo.outage_code,
                   nb.nap_code,
                   o.serial_number AS onu_serial,
                   o.rx_power_dbm AS current_rx_dbm,
                   TIMESTAMPDIFF(MINUTE, NOW(), t.sla_due_at) AS sla_remaining_minutes
              FROM support_tickets t
              INNER JOIN subscriber_contracts sc ON t.id_contract = sc.id_contract
              INNER JOIN users cu ON t.id_customer = cu.id_user
              INNER JOIN onus o ON sc.id_onu = o.id_onu
              INNER JOIN nap_boxes nb ON o.id_nap_box = nb.id_nap_box
              LEFT JOIN users ag ON t.assigned_agent_id = ag.id_user
              LEFT JOIN mass_outages mo ON t.id_mass_outage = mo.id_mass_outage
        `;
    }

    async findAllDetailed({ customerId = null, status = null } = {}) {
        const conditions = [];
        const params = [];

        if (customerId) {
            conditions.push('t.id_customer = ?');
            params.push(customerId);
        }
        if (status) {
            conditions.push('t.status = ?');
            params.push(status);
        }

        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const sql = `${TicketRepository.BASE_JOIN_SQL} ${where} ORDER BY t.created_at DESC`;
        const [rows] = await this.execute(sql, params);
        return this.mapRows(rows);
    }

    async findDetailedById(id) {
        const sql = `${TicketRepository.BASE_JOIN_SQL} WHERE t.id_ticket = ? LIMIT 1`;
        const [rows] = await this.execute(sql, [id]);
        return rows.length > 0 ? this.mapRow(rows[0]) : null;
    }

    async create({
        ticketNumber,
        contractId,
        customerId,
        assignedAgentId = null,
        massOutageId = null,
        lastDiagnosticId = null,
        category,
        priority = 'medium',
        subject,
        description,
        slaHours = 12
    }) {
        const sql = `
            INSERT INTO support_tickets (
                ticket_number, id_contract, id_customer, assigned_agent_id,
                id_mass_outage, id_last_diagnostic, category, priority,
                status, subject, description, sla_due_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, DATE_ADD(NOW(), INTERVAL ? HOUR))
        `;
        const [result] = await this.execute(sql, [
            ticketNumber,
            contractId,
            customerId,
            assignedAgentId,
            massOutageId,
            lastDiagnosticId,
            category,
            priority,
            subject,
            description,
            slaHours
        ]);
        return await this.findDetailedById(result.insertId);
    }

    async updateStatus(id, { status, assignedAgentId, priority, resolutionSummary }) {
        const current = await this.findByIdOrFail(id, 'Ticket de soporte');
        const nextStatus = status || current.status;
        const isResolved = ['resolved', 'closed'].includes(nextStatus);

        const sql = `
            UPDATE support_tickets
               SET status = ?,
                   assigned_agent_id = ?,
                   priority = ?,
                   resolution_summary = ?,
                   resolved_at = CASE WHEN ? THEN COALESCE(resolved_at, NOW()) ELSE resolved_at END
             WHERE id_ticket = ?
        `;
        await this.execute(sql, [
            nextStatus,
            assignedAgentId !== undefined ? assignedAgentId : current.assigned_agent_id,
            priority || current.priority,
            resolutionSummary !== undefined ? resolutionSummary : current.resolution_summary,
            isResolved,
            id
        ]);
        return await this.findDetailedById(id);
    }

    async findComments(ticketId, includeInternal = true) {
        const internalClause = includeInternal ? '' : 'AND tc.is_internal = FALSE';
        const sql = `
            SELECT tc.*,
                   CONCAT(u.first_name, ' ', u.last_name) AS author_name,
                   u.role AS author_role
              FROM ticket_comments tc
              INNER JOIN users u ON tc.id_author = u.id_user
             WHERE tc.id_ticket = ? ${internalClause}
             ORDER BY tc.created_at ASC
        `;
        const [rows] = await this.execute(sql, [ticketId]);
        return rows;
    }

    async addComment({ ticketId, authorId, isInternal = false, commentText }) {
        const sql = `
            INSERT INTO ticket_comments (id_ticket, id_author, is_internal, comment_text)
            VALUES (?, ?, ?, ?)
        `;
        const [result] = await this.execute(sql, [ticketId, authorId, Boolean(isInternal), commentText]);
        const [rows] = await this.execute(
            `SELECT tc.*, CONCAT(u.first_name, ' ', u.last_name) AS author_name, u.role AS author_role
               FROM ticket_comments tc
               INNER JOIN users u ON tc.id_author = u.id_user
              WHERE tc.id_comment = ?`,
            [result.insertId]
        );
        return rows[0];
    }
}

export class CrewRepository extends BaseRepository {
    constructor(pool) {
        super('technical_crews', 'id_crew', pool);
    }

    async findAllDetailed() {
        const sql = `
            SELECT tc.*,
                   CONCAT(u.first_name, ' ', u.last_name) AS leader_name
              FROM technical_crews tc
              INNER JOIN users u ON tc.leader_user_id = u.id_user
             ORDER BY tc.id_crew ASC
        `;
        const [rows] = await this.execute(sql);
        return this.mapRows(rows);
    }
}

export class DispatchRepository extends BaseRepository {
    constructor(pool) {
        super('dispatch_orders', 'id_dispatch', pool);
    }

    static get BASE_JOIN_SQL() {
        return `
            SELECT DISTINCT d.*,
                   tc.crew_code,
                   tc.name AS crew_name,
                   tc.vehicle_plate,
                   tc.leader_user_id,
                   t.ticket_number,
                   t.subject AS ticket_subject,
                   sc.installation_address,
                   mo.outage_code,
                   mo.title AS outage_title,
                   COALESCE(nb_t.nap_code, nb_m.nap_code) AS nap_code,
                   nb_m.address_reference,
                   CONCAT(dp.first_name, ' ', dp.last_name) AS dispatcher_name
              FROM dispatch_orders d
              INNER JOIN technical_crews tc ON d.id_crew = tc.id_crew
              INNER JOIN users dp ON d.dispatched_by = dp.id_user
              LEFT JOIN support_tickets t ON d.id_ticket = t.id_ticket
              LEFT JOIN subscriber_contracts sc ON t.id_contract = sc.id_contract
              LEFT JOIN onus o_t ON sc.id_onu = o_t.id_onu
              LEFT JOIN nap_boxes nb_t ON o_t.id_nap_box = nb_t.id_nap_box
              LEFT JOIN mass_outages mo ON d.id_mass_outage = mo.id_mass_outage
              LEFT JOIN nap_boxes nb_m ON mo.id_nap_box = nb_m.id_nap_box
        `;
    }

    async findAllDetailed({ techUserId = null } = {}) {
        if (!techUserId) {
            const sql = `${DispatchRepository.BASE_JOIN_SQL} ORDER BY d.created_at DESC`;
            const [rows] = await this.execute(sql);
            return this.mapRows(rows);
        }

        const sql = `
            ${DispatchRepository.BASE_JOIN_SQL}
            LEFT JOIN crew_members cm ON tc.id_crew = cm.id_crew
            WHERE tc.leader_user_id = ? OR cm.id_user = ?
            ORDER BY d.created_at DESC
        `;
        const [rows] = await this.execute(sql, [techUserId, techUserId]);
        return this.mapRows(rows);
    }

    async findDetailedById(id) {
        const sql = `${DispatchRepository.BASE_JOIN_SQL} WHERE d.id_dispatch = ? LIMIT 1`;
        const [rows] = await this.execute(sql, [id]);
        return rows.length > 0 ? this.mapRow(rows[0]) : null;
    }

    async create({ dispatchCode, ticketId = null, massOutageId = null, crewId, dispatchedBy, visitType = 'last_mile_repair', fieldNotes = null }) {
        const sql = `
            INSERT INTO dispatch_orders (
                dispatch_code, id_ticket, id_mass_outage, id_crew,
                dispatched_by, visit_type, status, scheduled_at, field_notes
            ) VALUES (?, ?, ?, ?, ?, ?, 'assigned', DATE_ADD(NOW(), INTERVAL 30 MINUTE), ?)
        `;
        const [result] = await this.execute(sql, [
            dispatchCode, ticketId, massOutageId, crewId, dispatchedBy, visitType, fieldNotes
        ]);

        await this.execute("UPDATE technical_crews SET status = 'en_route' WHERE id_crew = ?", [crewId]);
        if (ticketId) {
            await this.execute("UPDATE support_tickets SET status = 'dispatched' WHERE id_ticket = ?", [ticketId]);
        }
        if (massOutageId) {
            await this.execute("UPDATE mass_outages SET status = 'dispatched' WHERE id_mass_outage = ?", [massOutageId]);
        }

        return await this.findDetailedById(result.insertId);
    }

    async updateFieldState(id, status, fieldNotes) {
        const arrivedSql = status === 'on_site' ? ', arrived_at = COALESCE(arrived_at, NOW())' : '';
        const sql = `
            UPDATE dispatch_orders
               SET status = ?,
                   field_notes = COALESCE(?, field_notes)
                   ${arrivedSql}
             WHERE id_dispatch = ?
        `;
        await this.execute(sql, [status, fieldNotes || null, id]);
        const updated = await this.findDetailedById(id);
        if (updated && (status === 'en_route' || status === 'on_site')) {
            await this.execute('UPDATE technical_crews SET status = ? WHERE id_crew = ?', [status, updated.id_crew]);
        }
        return updated;
    }

    /**
     * Invoca sp_complete_dispatch_order para certificar la potencia óptica dBm y cerrar en cascada
     */
    async completeWithOpticalCertification(id, { fieldNotes, fiberDropMeters = 0, restoredRxDbm }) {
        const sql = 'CALL sp_complete_dispatch_order(?, ?, ?, ?)';
        await this.query(sql, [id, fieldNotes, Number(fiberDropMeters) || 0, Number(restoredRxDbm)]);
        return await this.findDetailedById(id);
    }
}
