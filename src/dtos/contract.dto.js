import { BaseDTO } from '../core/base.dto.js';

export class ServicePlanDTO extends BaseDTO {
    constructor(row) {
        super();
        this.id = Number(row.id_plan);
        this.code = row.plan_code;
        this.name = row.name;
        this.downloadMbps = Number(row.download_mbps);
        this.uploadMbps = Number(row.upload_mbps);
        this.monthlyPrice = Number(row.monthly_price);
        this.slaHours = Number(row.sla_hours);
        this.isActive = Boolean(row.is_active);
    }
}

export class ContractDTO extends BaseDTO {
    constructor(row) {
        super();
        this.id = Number(row.id_contract);
        this.contractNumber = row.contract_number;
        this.customerId = Number(row.id_customer);
        this.customerName = row.customer_name || undefined;
        this.customerEmail = row.customer_email || undefined;
        this.customerPhone = row.customer_phone || undefined;
        this.customerDpi = row.customer_dpi || undefined;
        this.planId = Number(row.id_plan);
        this.planCode = row.plan_code || undefined;
        this.planName = row.plan_name || undefined;
        this.downloadMbps = row.download_mbps !== undefined ? Number(row.download_mbps) : undefined;
        this.uploadMbps = row.upload_mbps !== undefined ? Number(row.upload_mbps) : undefined;
        this.monthlyPrice = row.monthly_price !== undefined ? Number(row.monthly_price) : undefined;
        this.slaHours = row.sla_hours !== undefined ? Number(row.sla_hours) : undefined;
        this.onuId = Number(row.id_onu);
        this.onuSerial = row.onu_serial || undefined;
        this.onuModel = row.onu_model || undefined;
        this.rxPowerDbm = row.rx_power_dbm !== undefined ? Number(row.rx_power_dbm) : undefined;
        this.txPowerDbm = row.tx_power_dbm !== undefined ? Number(row.tx_power_dbm) : undefined;
        this.opticalStatus = row.optical_status || undefined;
        this.napBoxId = row.id_nap_box !== undefined ? Number(row.id_nap_box) : undefined;
        this.napCode = row.nap_code || undefined;
        this.napPortNumber = row.nap_port_number !== undefined ? Number(row.nap_port_number) : undefined;
        this.napStatus = row.nap_status || undefined;
        this.installationAddress = row.installation_address;
        this.zoneDepartment = row.zone_department;
        this.installationDate = row.installation_date;
        this.billingDay = Number(row.billing_day);
        this.status = row.status;
    }
}
