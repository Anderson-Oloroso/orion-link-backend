import { BaseRepository } from '../core/base.repository.js';

export class OltRepository extends BaseRepository {
    constructor(pool) {
        super('olts', 'id_olt', pool);
    }

    async findAllWithNapCount() {
        const sql = `
            SELECT ol.*,
                   COUNT(nb.id_nap_box) AS nap_count
              FROM olts ol
              LEFT JOIN nap_boxes nb ON ol.id_olt = nb.id_olt
             GROUP BY ol.id_olt
             ORDER BY ol.id_olt ASC
        `;
        const [rows] = await this.execute(sql);
        return this.mapRows(rows);
    }

    async create({ code, name, brandModel, managementIp, zoneName, latitude, longitude, totalPonPorts = 16, status = 'online' }) {
        const sql = `
            INSERT INTO olts (olt_code, name, brand_model, management_ip, zone_name, latitude, longitude, total_pon_ports, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await this.execute(sql, [
            code, name, brandModel, managementIp, zoneName, latitude, longitude, totalPonPorts, status
        ]);
        return await this.findById(result.insertId);
    }
}

export class NapBoxRepository extends BaseRepository {
    constructor(pool) {
        super('nap_boxes', 'id_nap_box', pool);
    }

    async findAllWithOpticalHealth() {
        const sql = `
            SELECT nb.*,
                   ol.olt_code,
                   ol.name AS olt_name,
                   SUM(CASE WHEN o.optical_status = 'online' THEN 1 ELSE 0 END) AS onus_online,
                   SUM(CASE WHEN o.optical_status = 'high_attenuation' THEN 1 ELSE 0 END) AS onus_high_attenuation,
                   SUM(CASE WHEN o.optical_status IN ('los', 'offline') THEN 1 ELSE 0 END) AS onus_los_critical,
                   ROUND(AVG(o.rx_power_dbm), 2) AS avg_rx_power_dbm
              FROM nap_boxes nb
              INNER JOIN olts ol ON nb.id_olt = ol.id_olt
              LEFT JOIN onus o ON nb.id_nap_box = o.id_nap_box
             GROUP BY nb.id_nap_box, ol.id_olt
             ORDER BY onus_los_critical DESC, nb.id_nap_box ASC
        `;
        const [rows] = await this.execute(sql);
        return this.mapRows(rows);
    }

    async create({ oltId, ponPortNumber, code, zoneSector, addressReference, latitude, longitude, splitterRatio = '1:8', totalPorts = 8 }) {
        const sql = `
            INSERT INTO nap_boxes (id_olt, pon_port_number, nap_code, zone_sector, address_reference, latitude, longitude, splitter_ratio, total_ports, occupied_ports, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'operational')
        `;
        const [result] = await this.execute(sql, [
            oltId, ponPortNumber, code, zoneSector, addressReference, latitude, longitude, splitterRatio, totalPorts
        ]);
        return await this.findById(result.insertId);
    }
}

export class OnuRepository extends BaseRepository {
    constructor(pool) {
        super('onus', 'id_onu', pool);
    }

    async findAllDetailed() {
        const sql = `
            SELECT o.*,
                   nb.nap_code,
                   nb.zone_sector
              FROM onus o
              INNER JOIN nap_boxes nb ON o.id_nap_box = nb.id_nap_box
             ORDER BY o.rx_power_dbm ASC
        `;
        const [rows] = await this.execute(sql);
        return this.mapRows(rows);
    }

    async create({ napBoxId, napPortNumber, serialNumber, macAddress, model, rxPowerDbm = -19.20, txPowerDbm = 2.20, opticalStatus = 'online' }) {
        const sql = `
            INSERT INTO onus (id_nap_box, nap_port_number, serial_number, mac_address, model, rx_power_dbm, tx_power_dbm, optical_status, last_telemetry_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `;
        const [result] = await this.execute(sql, [
            napBoxId, napPortNumber, serialNumber, macAddress, model, rxPowerDbm, txPowerDbm, opticalStatus
        ]);
        return await this.findById(result.insertId);
    }
}
