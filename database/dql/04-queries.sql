-- ============================================================================
-- ORION LINK CRM & ISP OPERATIONS — DQL ANALYTICAL & NOC QUERIES
-- Archivo: 04-queries.sql
-- Autor: Henrik Anderson Oloroso García (Anderson-Oloroso)
-- Descripción: Consultas de negocio, monitoreo NOC, correlación óptica FTTH,
--              cumplimiento de SLA y productividad de cuadrillas técnicas.
-- ============================================================================

USE orion_link_db;

-- ----------------------------------------------------------------------------
-- CONSULTA 1: Mapa de Salud Óptica por Caja NAP (Correlación Planta Externa)
-- Muestra cuántas ONUs están online, con atenuación alta o en corte (LOS)
-- por cada Caja NAP y su Nodo OLT padre.
-- ----------------------------------------------------------------------------
SELECT 
    ol.olt_code,
    ol.name AS olt_name,
    nb.nap_code,
    nb.zone_sector,
    nb.splitter_ratio,
    nb.total_ports,
    nb.occupied_ports,
    nb.status AS nap_status,
    COUNT(o.id_onu) AS installed_onus,
    SUM(CASE WHEN o.optical_status = 'online' THEN 1 ELSE 0 END) AS onus_online,
    SUM(CASE WHEN o.optical_status = 'high_attenuation' THEN 1 ELSE 0 END) AS onus_high_attenuation,
    SUM(CASE WHEN o.optical_status IN ('los', 'offline') THEN 1 ELSE 0 END) AS onus_los_critical,
    ROUND(AVG(o.rx_power_dbm), 2) AS avg_rx_power_dbm
FROM nap_boxes nb
INNER JOIN olts ol ON nb.id_olt = ol.id_olt
LEFT JOIN onus o ON nb.id_nap_box = o.id_nap_box
GROUP BY ol.id_olt, nb.id_nap_box
ORDER BY onus_los_critical DESC, avg_rx_power_dbm ASC;

-- ----------------------------------------------------------------------------
-- CONSULTA 2: Ficha 360° de Contratos de Suscriptores con Telemetría FTTH
-- ----------------------------------------------------------------------------
SELECT 
    sc.contract_number,
    CONCAT(u.first_name, ' ', u.last_name) AS customer_name,
    u.dpi,
    u.phone,
    sp.name AS service_plan,
    sp.download_mbps,
    nb.nap_code,
    o.nap_port_number,
    o.serial_number AS onu_serial,
    o.model AS onu_model,
    o.rx_power_dbm,
    o.tx_power_dbm,
    o.optical_status,
    sc.status AS contract_status
FROM subscriber_contracts sc
INNER JOIN users u ON sc.id_customer = u.id_user
INNER JOIN service_plans sp ON sc.id_plan = sp.id_plan
INNER JOIN onus o ON sc.id_onu = o.id_onu
INNER JOIN nap_boxes nb ON o.id_nap_box = nb.id_nap_box
ORDER BY o.rx_power_dbm ASC;

-- ----------------------------------------------------------------------------
-- CONSULTA 3: Tablero NOC de Tickets Abiertos con Estado de SLA y Falla Masiva
-- ----------------------------------------------------------------------------
SELECT 
    t.ticket_number,
    t.category,
    t.priority,
    t.status,
    t.subject,
    sc.contract_number,
    CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
    CONCAT(a.first_name, ' ', a.last_name) AS assigned_agent,
    mo.outage_code AS linked_mass_outage,
    o.rx_power_dbm AS current_onu_rx_dbm,
    t.sla_due_at,
    TIMESTAMPDIFF(MINUTE, NOW(), t.sla_due_at) AS sla_remaining_minutes
FROM support_tickets t
INNER JOIN subscriber_contracts sc ON t.id_contract = sc.id_contract
INNER JOIN users c ON t.id_customer = c.id_user
INNER JOIN onus o ON sc.id_onu = o.id_onu
LEFT JOIN users a ON t.assigned_agent_id = a.id_user
LEFT JOIN mass_outages mo ON t.id_mass_outage = mo.id_mass_outage
WHERE t.status NOT IN ('resolved', 'closed')
ORDER BY FIELD(t.priority, 'critical', 'high', 'medium', 'low'), t.sla_due_at ASC;

-- ----------------------------------------------------------------------------
-- CONSULTA 4: Trazabilidad de Despacho de Cuadrillas en Campo
-- ----------------------------------------------------------------------------
SELECT 
    d.dispatch_code,
    d.visit_type,
    d.status AS dispatch_status,
    tc.crew_code,
    tc.name AS crew_name,
    tc.vehicle_plate,
    CONCAT(ldr.first_name, ' ', ldr.last_name) AS crew_leader,
    t.ticket_number,
    mo.outage_code,
    d.scheduled_at,
    d.arrived_at,
    d.completed_at,
    d.fiber_drop_meters,
    d.restored_rx_dbm
FROM dispatch_orders d
INNER JOIN technical_crews tc ON d.id_crew = tc.id_crew
INNER JOIN users ldr ON tc.leader_user_id = ldr.id_user
LEFT JOIN support_tickets t ON d.id_ticket = t.id_ticket
LEFT JOIN mass_outages mo ON d.id_mass_outage = mo.id_mass_outage
ORDER BY d.created_at DESC;
