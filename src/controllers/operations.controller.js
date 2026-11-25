import { BaseController } from '../core/base.controller.js';
import { DashboardService } from '../services/operations.service.js';

export class TopologyController extends BaseController {
    constructor(topologyService) {
        super(topologyService);
    }

    async listOlts(_req, res) {
        const data = await this.service.listOlts();
        return this.ok(res, data, 'Nodos OLT recuperados.');
    }

    async createOlt(req, res) {
        const data = await this.service.createOlt(req.body);
        return this.created(res, data, 'Nodo OLT registrado.');
    }

    async listNaps(_req, res) {
        const data = await this.service.listNapBoxes();
        return this.ok(res, data, 'Cajas NAP con telemetría óptica recuperadas.');
    }

    async createNap(req, res) {
        const data = await this.service.createNapBox(req.body);
        return this.created(res, data, 'Caja NAP registrada en planta externa.');
    }

    async listOnus(_req, res) {
        const data = await this.service.listOnus();
        return this.ok(res, data, 'Terminales ópticas ONUs recuperadas.');
    }

    async createOnu(req, res) {
        const data = await this.service.createOnu(req.body);
        return this.created(res, data, 'Equipo terminal ONU registrado y puerto NAP ocupado.');
    }
}

export class ContractController extends BaseController {
    constructor(contractService) {
        super(contractService);
    }

    async listPlans(_req, res) {
        const data = await this.service.listPlans();
        return this.ok(res, data, 'Planes de fibra óptica FTTH recuperados.');
    }

    async createPlan(req, res) {
        const data = await this.service.createPlan(req.body);
        return this.created(res, data, 'Plan de servicio FTTH creado.');
    }

    async listContracts(req, res) {
        const data = await this.service.listContracts(req.query.search || '');
        return this.ok(res, data, 'Contratos de suscriptores recuperados.');
    }

    async listMyContracts(req, res) {
        const data = await this.service.listMyContracts(req.user.id);
        return this.ok(res, data, 'Sus contratos FTTH activos.');
    }

    async getContractById(req, res) {
        const data = await this.service.getContractById(Number(req.params.id), req.user);
        return this.ok(res, data, 'Detalle de contrato FTTH recuperado.');
    }

    async createContract(req, res) {
        const data = await this.service.createContract(req.body);
        return this.created(res, data, 'Contrato de suscriptor vinculado a ONU y Caja NAP.');
    }
}

export class OperationsController extends BaseController {
    #diagnosticService;
    #outageService;
    #ticketService;
    #dispatchService;

    constructor({ diagnosticService, outageService, ticketService, dispatchService }) {
        super(ticketService);
        this.#diagnosticService = diagnosticService;
        this.#outageService = outageService;
        this.#ticketService = ticketService;
        this.#dispatchService = dispatchService;
    }

    async getDashboardSummary(_req, res) {
        const summary = await DashboardService.getExecutiveSummary();
        return this.ok(res, summary, 'Resumen ejecutivo NOC y operaciones FTTH.');
    }

    async listDiagnostics(req, res) {
        const contractId = req.query.contractId ? Number(req.query.contractId) : null;
        const data = await this.#diagnosticService.listDiagnostics(contractId);
        return this.ok(res, data, 'Historial de diagnósticos ópticos remotos.');
    }

    async runDiagnostic(req, res) {
        const data = await this.#diagnosticService.runDiagnostic(req.body, req.user);
        const message = data.correlatedMassOutageId
            ? `Diagnóstico completado (${data.rxPowerDbm} dBm). ¡ALERTA NOC: Se correlacionó Falla Masiva en ${data.napCode}!`
            : `Diagnóstico óptico remoto completado (${data.rxPowerDbm} dBm · ${data.opticalHealth.toUpperCase()}).`;
        return this.created(res, data, message);
    }

    async listOutages(req, res) {
        const activeOnly = req.query.activeOnly === 'true';
        const data = await this.#outageService.listOutages({ activeOnly });
        return this.ok(res, data, 'Fallas masivas en red FTTH recuperadas.');
    }

    async declareOutage(req, res) {
        const data = await this.#outageService.declareOutage(req.body, req.user.id);
        return this.created(res, data, 'Falla masiva FTTH declarada por NOC.');
    }

    async resolveOutage(req, res) {
        const data = await this.#outageService.resolveOutage(Number(req.params.id), req.body.resolutionNotes);
        return this.ok(res, data, 'Falla masiva marcada como resuelta y Caja NAP restaurada.');
    }

    async listTickets(req, res) {
        const data = await this.#ticketService.listTickets({
            requestingUser: req.user,
            status: req.query.status || null
        });
        return this.ok(res, data, 'Tickets de soporte recuperados.');
    }

    async getTicketById(req, res) {
        const data = await this.#ticketService.getTicketDetails(Number(req.params.id), req.user);
        return this.ok(res, data, 'Detalle y bitácora del ticket recuperados.');
    }

    async createTicket(req, res) {
        const data = await this.#ticketService.createTicket(req.body, req.user);
        return this.created(res, data, `Ticket ${data.ticketNumber} registrado exitosamente.`);
    }

    async updateTicketStatus(req, res) {
        const data = await this.#ticketService.updateTicketStatus(Number(req.params.id), req.body);
        return this.ok(res, data, 'Estado del ticket actualizado.');
    }

    async addTicketComment(req, res) {
        const data = await this.#ticketService.addComment(Number(req.params.id), req.body, req.user);
        return this.created(res, data, 'Comentario agregado a la bitácora del ticket.');
    }

    async listCrews(_req, res) {
        const data = await this.#dispatchService.listCrews();
        return this.ok(res, data, 'Cuadrillas técnicas en campo recuperadas.');
    }

    async listDispatches(req, res) {
        const onlyMyCrew = req.query.myCrew === 'true';
        const data = await this.#dispatchService.listDispatches(req.user, onlyMyCrew);
        return this.ok(res, data, 'Órdenes de despacho de cuadrillas recuperadas.');
    }

    async createDispatch(req, res) {
        const data = await this.#dispatchService.createDispatch(req.body, req.user.id);
        return this.created(res, data, `Orden de despacho ${data.dispatchCode} asignada a cuadrilla.`);
    }

    async updateDispatchState(req, res) {
        const data = await this.#dispatchService.updateDispatchState(Number(req.params.id), req.body);
        return this.ok(res, data, 'Estado de cuadrilla en campo actualizado.');
    }

    async completeDispatch(req, res) {
        const data = await this.#dispatchService.completeDispatch(Number(req.params.id), req.body);
        return this.ok(
            res,
            data,
            `Orden ${data.dispatchCode} cerrada con éxito. Potencia óptica certificada en ${data.restoredRxDbm} dBm.`
        );
    }
}
