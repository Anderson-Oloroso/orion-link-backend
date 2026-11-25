import { BaseDTO } from '../core/base.dto.js';
import { OpticalTelemetryClassifier } from '../utils/optical-classifier.js';

export class OltDTO extends BaseDTO {
    constructor(row) {
        super();
        this.id = Number(row.id_olt);
        this.code = row.olt_code;
        this.name = row.name;
        this.brandModel = row.brand_model;
        this.managementIp = row.management_ip;
        this.zoneName = row.zone_name;
        this.latitude = Number(row.latitude);
        this.longitude = Number(row.longitude);
        this.totalPonPorts = Number(row.total_pon_ports);
        this.status = row.status;
        this.napCount = row.nap_count !== undefined ? Number(row.nap_count) : undefined;
    }
}

export class NapBoxDTO extends BaseDTO {
    constructor(row) {
        super();
        this.id = Number(row.id_nap_box);
        this.oltId = Number(row.id_olt);
        this.oltCode = row.olt_code || undefined;
        this.oltName = row.olt_name || undefined;
        this.ponPortNumber = Number(row.pon_port_number);
        this.code = row.nap_code;
        this.zoneSector = row.zone_sector;
        this.addressReference = row.address_reference;
        this.latitude = Number(row.latitude);
        this.longitude = Number(row.longitude);
        this.splitterRatio = row.splitter_ratio;
        this.totalPorts = Number(row.total_ports);
        this.occupiedPorts = Number(row.occupied_ports);
        this.availablePorts = Math.max(0, Number(row.total_ports) - Number(row.occupied_ports));
        this.status = row.status;
        this.onusOnline = row.onus_online !== undefined ? Number(row.onus_online) : undefined;
        this.onusHighAttenuation = row.onus_high_attenuation !== undefined ? Number(row.onus_high_attenuation) : undefined;
        this.onusLosCritical = row.onus_los_critical !== undefined ? Number(row.onus_los_critical) : undefined;
        this.avgRxPowerDbm = row.avg_rx_power_dbm !== undefined && row.avg_rx_power_dbm !== null ? Number(row.avg_rx_power_dbm) : null;
    }
}

export class OnuDTO extends BaseDTO {
    constructor(row) {
        super();
        const telemetry = OpticalTelemetryClassifier.evaluateRxPower(row.rx_power_dbm);
        this.id = Number(row.id_onu);
        this.napBoxId = Number(row.id_nap_box);
        this.napCode = row.nap_code || undefined;
        this.zoneSector = row.zone_sector || undefined;
        this.napPortNumber = Number(row.nap_port_number);
        this.serialNumber = row.serial_number;
        this.macAddress = row.mac_address;
        this.model = row.model;
        this.rxPowerDbm = Number(row.rx_power_dbm);
        this.txPowerDbm = Number(row.tx_power_dbm);
        this.opticalStatus = row.optical_status;
        this.opticalHealth = telemetry.opticalHealth;
        this.opticalLabel = telemetry.label;
        this.lastTelemetryAt = row.last_telemetry_at;
    }
}
