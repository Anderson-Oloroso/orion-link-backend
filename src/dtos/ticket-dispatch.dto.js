import { BaseDTO } from '../core/base.dto.js';

export class TicketDTO extends BaseDTO {
    constructor(row) {
        super();
        this.id = Number(row.id_ticket);
        this.ticketNumber = row.ticket_number;
        this.contractId = Number(row.id_contract);
        this.contractNumber = row.contract_number || undefined;
        this.customerId = Number(row.id_customer);
        this.customerName = row.customer_name || undefined;
        this.assignedAgentId = row.assigned_agent_id ? Number(row.assigned_agent_id) : null;
        this.assignedAgentName = row.assigned_agent_name || undefined;
        this.massOutageId = row.id_mass_outage ? Number(row.id_mass_outage) : null;
        this.outageCode = row.outage_code || undefined;
        this.lastDiagnosticId = row.id_last_diagnostic ? Number(row.id_last_diagnostic) : null;
        this.napCode = row.nap_code || undefined;
        this.onuSerial = row.onu_serial || undefined;
        this.currentRxDbm = row.current_rx_dbm !== undefined ? Number(row.current_rx_dbm) : undefined;
        this.category = row.category;
        this.priority = row.priority;
        this.status = row.status;
        this.subject = row.subject;
        this.description = row.description;
        this.resolutionSummary = row.resolution_summary;
        this.slaDueAt = row.sla_due_at;
        this.slaRemainingMinutes = row.sla_remaining_minutes !== undefined ? Number(row.sla_remaining_minutes) : undefined;
        this.createdAt = row.created_at;
        this.resolvedAt = row.resolved_at;
    }
}

export class TicketCommentDTO extends BaseDTO {
    constructor(row) {
        super();
        this.id = Number(row.id_comment);
        this.ticketId = Number(row.id_ticket);
        this.authorId = Number(row.id_author);
        this.authorName = row.author_name || undefined;
        this.authorRole = row.author_role || undefined;
        this.isInternal = Boolean(row.is_internal);
        this.commentText = row.comment_text;
        this.createdAt = row.created_at;
    }
}

export class CrewDTO extends BaseDTO {
    constructor(row) {
        super();
        this.id = Number(row.id_crew);
        this.crewCode = row.crew_code;
        this.name = row.name;
        this.leaderUserId = Number(row.leader_user_id);
        this.leaderName = row.leader_name || undefined;
        this.vehiclePlate = row.vehicle_plate;
        this.zoneAssigned = row.zone_assigned;
        this.specialty = row.specialty;
        this.status = row.status;
    }
}

export class DispatchOrderDTO extends BaseDTO {
    constructor(row) {
        super();
        this.id = Number(row.id_dispatch);
        this.dispatchCode = row.dispatch_code;
        this.ticketId = row.id_ticket ? Number(row.id_ticket) : null;
        this.ticketNumber = row.ticket_number || undefined;
        this.ticketSubject = row.ticket_subject || undefined;
        this.massOutageId = row.id_mass_outage ? Number(row.id_mass_outage) : null;
        this.outageCode = row.outage_code || undefined;
        this.outageTitle = row.outage_title || undefined;
        this.crewId = Number(row.id_crew);
        this.crewCode = row.crew_code || undefined;
        this.crewName = row.crew_name || undefined;
        this.vehiclePlate = row.vehicle_plate || undefined;
        this.napCode = row.nap_code || undefined;
        this.installationAddress = row.installation_address || row.address_reference || undefined;
        this.dispatchedBy = Number(row.dispatched_by);
        this.dispatcherName = row.dispatcher_name || undefined;
        this.visitType = row.visit_type;
        this.status = row.status;
        this.scheduledAt = row.scheduled_at;
        this.arrivedAt = row.arrived_at;
        this.completedAt = row.completed_at;
        this.fieldNotes = row.field_notes;
        this.fiberDropMeters = Number(row.fiber_drop_meters || 0);
        this.restoredRxDbm = row.restored_rx_dbm !== null && row.restored_rx_dbm !== undefined ? Number(row.restored_rx_dbm) : null;
        this.createdAt = row.created_at;
    }
}
