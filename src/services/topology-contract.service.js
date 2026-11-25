import { BaseService } from '../core/base.service.js';
import { OltDTO, NapBoxDTO, OnuDTO } from '../dtos/topology.dto.js';
import { ServicePlanDTO, ContractDTO } from '../dtos/contract.dto.js';
import { NotFoundError, ForbiddenError } from '../utils/app-error.js';

export class TopologyService extends BaseService {
    #napRepository;
    #onuRepository;

    constructor(oltRepository, napRepository, onuRepository) {
        super(oltRepository, OltDTO);
        this.#napRepository = napRepository;
        this.#onuRepository = onuRepository;
    }

    async listOlts() {
        const rows = await this.repository.findAllWithNapCount();
        return OltDTO.fromList(rows);
    }

    async createOlt(payload) {
        const row = await this.repository.create(payload);
        return OltDTO.from(row);
    }

    async listNapBoxes() {
        const rows = await this.#napRepository.findAllWithOpticalHealth();
        return NapBoxDTO.fromList(rows);
    }

    async createNapBox(payload) {
        await this.repository.findByIdOrFail(payload.oltId, 'Nodo OLT');
        const row = await this.#napRepository.create(payload);
        return NapBoxDTO.from(row);
    }

    async listOnus() {
        const rows = await this.#onuRepository.findAllDetailed();
        return OnuDTO.fromList(rows);
    }

    async createOnu(payload) {
        await this.#napRepository.findByIdOrFail(payload.napBoxId, 'Caja NAP');
        const row = await this.#onuRepository.create(payload);
        return OnuDTO.from(row);
    }
}

export class ContractService extends BaseService {
    #planRepository;

    constructor(contractRepository, planRepository) {
        super(contractRepository, ContractDTO);
        this.#planRepository = planRepository;
    }

    async listPlans() {
        const rows = await this.#planRepository.findAllActive();
        return ServicePlanDTO.fromList(rows);
    }

    async createPlan(payload) {
        const row = await this.#planRepository.create(payload);
        return ServicePlanDTO.from(row);
    }

    async listContracts(search = '') {
        const rows = await this.repository.findAllDetailed({ search });
        return ContractDTO.fromList(rows);
    }

    async listMyContracts(customerId) {
        const rows = await this.repository.findByCustomerId(customerId);
        return ContractDTO.fromList(rows);
    }

    async getContractById(id, requestingUser) {
        const row = await this.repository.findDetailedById(id);
        if (!row) {
            throw new NotFoundError('Contrato FTTH', id);
        }
        if (requestingUser.role === 'customer' && Number(row.id_customer) !== Number(requestingUser.id)) {
            throw new ForbiddenError('No tiene permiso para consultar contratos de otros suscriptores.');
        }
        return ContractDTO.from(row);
    }

    async createContract(payload) {
        const contractNumber = payload.contractNumber || `CON-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 89999)}`;
        const created = await this.repository.create({
            ...payload,
            contractNumber
        });
        return ContractDTO.from(created);
    }
}
