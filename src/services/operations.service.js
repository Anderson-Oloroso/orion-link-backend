import { BaseService } from '../core/base.service.js';
import { DiagnosticDTO, MassOutageDTO } from '../dtos/diagnostic-outage.dto.js';
import { TicketDTO, TicketCommentDTO, CrewDTO, DispatchOrderDTO } from '../dtos/ticket-dispatch.dto.js';
import { ForbiddenError, NotFoundError } from '../utils/app-error.js';
import { Database } from '../config/database.config.js';

export class DiagnosticService extends BaseService {
    #contractRepository;

    constructor(diagnosticRepository, contractRepository) {
        super(diagnosticRepository, DiagnosticDTO);
        this.#contractRepository = contractRepository;
    }

    async listDiagnostics(contractId = null) {
        const rows = await this.repository.findAllDetailed({ contractId });
        return DiagnosticDTO.fromList(rows);
    }

    async runDiagnostic({ contractId, simulatedRxDbm = null }, requestingUser) {
        const contract = await this.#contractRepository.findDetailedById(contractId);
        if (!contract) {
            throw new NotFoundError('Contrato FTTH', contractId);
        }

        if (requestingUser.role === 'customer' && Number(contract.id_customer) !== Number(requestingUser.id)) {
            throw new ForbiddenError('Solo puede ejecutar autodiagnóstico sobre su propio contrato activo.');
        }

        const result = await this.repository.runStoredDiagnostic(
            Number(contractId),
            Number(requestingUser.id),
            simulatedRxDbm
        );
        return DiagnosticDTO.from(result);
    }
}

export class MassOutageService extends BaseService {
    constructor(massOutageRepository) {
        super(massOutageRepository, MassOutageDTO);
    }

    async listOutages({ activeOnly = false } = {}) {
        const rows = await this.repository.findAllDetailed({ activeOnly });
        return MassOutageDTO.fromList(rows);
    }

    async declareOutage(payload, declaredByUserId) {
        const outageCode = payload.outageCode || `OUT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 899)}`;
        const created = await this.repository.create({
            ...payload,
            outageCode,
            declaredBy: declaredByUserId
        });
        return MassOutageDTO.from(created);
    }

    async resolveOutage(id, resolutionNotes) {
        const existing = await this.repository.findDetailedById(id);
        if (!existing) {
            throw new NotFoundError('Falla Masiva FTTH', id);
        }
        const resolved = await this.repository.resolveOutage(id, resolutionNotes);
        return MassOutageDTO.from(resolved);
    }
}

export class TicketService extends BaseService {
    #contractRepository;

    constructor(ticketRepository, contractRepository) {
        super(ticketRepository, TicketDTO);
        this.#contractRepository = contractRepository;
    }

    async listTickets({ requestingUser, status = null }) {
        const customerId = requestingUser.role === 'customer' ? requestingUser.id : null;
        const rows = await this.repository.findAllDetailed({ customerId, status });
        return TicketDTO.fromList(rows);
    }

    async getTicketDetails(ticketId, requestingUser) {
        const ticket = await this.repository.findDetailedById(ticketId);
        if (!ticket) {
            throw new NotFoundError('Ticket de soporte', ticketId);
        }
        if (requestingUser.role === 'customer' && Number(ticket.id_customer) !== Number(requestingUser.id)) {
            throw new ForbiddenError('No tiene autorización para ver este ticket.');
        }
        const includeInternal = requestingUser.role !== 'customer';
        const comments = await this.repository.findComments(ticketId, includeInternal);
        return {
            ...TicketDTO.from(ticket),
            comments: TicketCommentDTO.fromList(comments)
        };
    }

    async createTicket(payload, requestingUser) {
        const contract = await this.#contractRepository.findDetailedById(payload.contractId);
        if (!contract) {
            throw new NotFoundError('Contrato FTTH', payload.contractId);
        }

        if (requestingUser.role === 'customer' && Number(contract.id_customer) !== Number(requestingUser.id)) {
            throw new ForbiddenError('Solo puede crear tickets para sus propios contratos.');
        }

        const ticketNumber = `TCK-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 8999)}`;
        const assignedAgentId = ['support_agent', 'admin'].includes(requestingUser.role) ? requestingUser.id : null;

        // Verificar si la Caja NAP del contrato tiene una falla masiva activa para vincularla automáticamente
        const [activeOutages] = await Database.execute(
            "SELECT id_mass_outage FROM mass_outages WHERE id_nap_box = ? AND status IN ('detected', 'dispatched', 'repairing') LIMIT 1",
            [contract.id_nap_box]
        );
        const autoOutageId = activeOutages.length > 0 ? activeOutages[0].id_mass_outage : (payload.massOutageId || null);

        const created = await this.repository.create({
            ticketNumber,
            contractId: contract.id_contract,
            customerId: contract.id_customer,
            assignedAgentId,
            massOutageId: autoOutageId,
            category: payload.category,
            priority: autoOutageId ? 'critical' : (payload.priority || 'medium'),
            subject: payload.subject,
            description: payload.description,
            slaHours: contract.sla_hours || 12
        });

        return TicketDTO.from(created);
    }

    async updateTicketStatus(ticketId, payload) {
        const updated = await this.repository.updateStatus(ticketId, payload);
        return TicketDTO.from(updated);
    }

    async addComment(ticketId, { commentText, isInternal = false }, requestingUser) {
        const ticket = await this.repository.findDetailedById(ticketId);
        if (!ticket) {
            throw new NotFoundError('Ticket de soporte', ticketId);
        }
        if (requestingUser.role === 'customer' && Number(ticket.id_customer) !== Number(requestingUser.id)) {
            throw new ForbiddenError('No puede comentar en tickets de otros suscriptores.');
        }
        const safeInternal = requestingUser.role === 'customer' ? false : Boolean(isInternal);
        const created = await this.repository.addComment({
            ticketId,
            authorId: requestingUser.id,
            isInternal: safeInternal,
            commentText
        });
        return TicketCommentDTO.from(created);
    }
}

export class DispatchService extends BaseService {
    #crewRepository;

    constructor(dispatchRepository, crewRepository) {
        super(dispatchRepository, DispatchOrderDTO);
        this.#crewRepository = crewRepository;
    }

    async listCrews() {
        const rows = await this.#crewRepository.findAllDetailed();
        return CrewDTO.fromList(rows);
    }

    async listDispatches(requestingUser, onlyMyCrew = false) {
        const techUserId = (requestingUser.role === 'field_tech' || onlyMyCrew) ? requestingUser.id : null;
        const rows = await this.repository.findAllDetailed({ techUserId });
        return DispatchOrderDTO.fromList(rows);
    }

    async createDispatch(payload, dispatchedByUserId) {
        await this.#crewRepository.findByIdOrFail(payload.crewId, 'Cuadrilla técnica');
        const dispatchCode = `DSP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 8999)}`;
        const created = await this.repository.create({
            ...payload,
            dispatchCode,
            dispatchedBy: dispatchedByUserId
        });
        return DispatchOrderDTO.from(created);
    }

    async updateDispatchState(id, { status, fieldNotes }) {
        await this.repository.findByIdOrFail(id, 'Orden de despacho');
        const updated = await this.repository.updateFieldState(id, status, fieldNotes);
        return DispatchOrderDTO.from(updated);
    }

    async completeDispatch(id, { fieldNotes, fiberDropMeters, restoredRxDbm }) {
        await this.repository.findByIdOrFail(id, 'Orden de despacho');
        const completed = await this.repository.completeWithOpticalCertification(id, {
            fieldNotes,
            fiberDropMeters,
            restoredRxDbm
        });
        return DispatchOrderDTO.from(completed);
    }
}

export class DashboardService {
    static async getExecutiveSummary() {
        const [[counts]] = await Database.execute(`
            SELECT
                (SELECT COUNT(*) FROM subscriber_contracts WHERE status = 'active') AS activeContracts,
                (SELECT COUNT(*) FROM onus WHERE optical_status = 'online') AS onusOnline,
                (SELECT COUNT(*) FROM onus WHERE optical_status = 'high_attenuation') AS onusHighAttenuation,
                (SELECT COUNT(*) FROM onus WHERE optical_status IN ('los', 'offline')) AS onusLosCritical,
                (SELECT COUNT(*) FROM mass_outages WHERE status IN ('detected', 'dispatched', 'repairing')) AS activeMassOutages,
                (SELECT COUNT(*) FROM support_tickets WHERE status NOT IN ('resolved', 'closed')) AS openTickets,
                (SELECT COUNT(*) FROM dispatch_orders WHERE status IN ('assigned', 'en_route', 'on_site')) AS activeDispatches,
                (SELECT COUNT(*) FROM technical_crews WHERE status = 'available') AS availableCrews
        `);

        return {
            activeContracts: Number(counts.activeContracts || 0),
            onusOnline: Number(counts.onusOnline || 0),
            onusHighAttenuation: Number(counts.onusHighAttenuation || 0),
            onusLosCritical: Number(counts.onusLosCritical || 0),
            activeMassOutages: Number(counts.activeMassOutages || 0),
            openTickets: Number(counts.openTickets || 0),
            activeDispatches: Number(counts.activeDispatches || 0),
            availableCrews: Number(counts.availableCrews || 0)
        };
    }
}
