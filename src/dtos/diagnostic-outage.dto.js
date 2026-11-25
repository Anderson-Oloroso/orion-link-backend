import { BaseDTO } from '../core/base.dto.js';

export class DiagnosticDTO extends BaseDTO {
    constructor(row) {
        super();
        this.id = Number(row.id_diagnostic);
        this.contractId = Number(row.id_contract);
        this.contractNumber = row.contract_number || undefined;
        this.customerName = row.customer_name || undefined;
        this.onuId = Number(row.id_onu);
        this.onuSerial = row.serial_number || row.onu_serial || undefined;
        this.napCode = row.nap_code || undefined;
        this.executedBy = Number(row.executed_by);
        this.executorName = row.executor_name || undefined;
        this.rxPowerDbm = Number(row.rx_power_dbm);
        this.txPowerDbm = Number(row.tx_power_dbm);
        this.latencyMs = Number(row.latency_ms);
        this.packetLossPct = Number(row.packet_loss_pct);
        this.onuStatusSnapshot = row.onu_status_snapshot;
        this.opticalHealth = row.optical_health;
        this.diagnosisSummary = row.diagnosis_summary;
        this.recommendedAction = row.recommended_action;
        this.napLosCount = row.nap_los_count !== undefined ? Number(row.nap_los_count) : undefined;
        this.correlatedMassOutageId = row.correlated_mass_outage_id ? Number(row.correlated_mass_outage_id) : null;
        this.createdAt = row.created_at;
    }
}

export class MassOutageDTO extends BaseDTO {
    constructor(row) {
        super();
        this.id = Number(row.id_mass_outage);
        this.outageCode = row.outage_code;
        this.oltId = Number(row.id_olt);
        this.oltCode = row.olt_code || undefined;
        this.oltName = row.olt_name || undefined;
        this.napBoxId = row.id_nap_box ? Number(row.id_nap_box) : null;
        this.napCode = row.nap_code || undefined;
        this.zoneSector = row.zone_sector || undefined;
        this.declaredBy = row.declared_by ? Number(row.declared_by) : null;
        this.declaredByName = row.declared_by_name || undefined;
        this.title = row.title;
        this.rootCause = row.root_cause;
        this.severity = row.severity;
        this.status = row.status;
        this.affectedContractsCount = Number(row.affected_contracts_count);
        this.detectedAt = row.detected_at;
        this.estimatedResolutionAt = row.estimated_resolution_at;
        this.resolvedAt = row.resolved_at;
        this.resolutionNotes = row.resolution_notes;
    }
}
