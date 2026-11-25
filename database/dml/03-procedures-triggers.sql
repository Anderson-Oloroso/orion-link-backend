-- ============================================================================
-- ORION LINK CRM & ISP OPERATIONS — DML STORED PROCEDURES & TRIGGERS
-- Archivo: 03-procedures-triggers.sql
-- Autor: Henrik Anderson Oloroso García (Anderson-Oloroso)
-- Descripción: Triggers de integridad para ocupación de puertos en Cajas NAP
--              y procedimientos almacenados transaccionales para:
--              1) sp_run_remote_diagnostic (telemetría óptica + detección de
--                 fallas masivas FTTH por correlación de ONUs en LOS).
--              2) sp_complete_dispatch_order (cierre técnico en campo con
--                 certificación de potencia óptica dBm y restauración en cascada).
-- ============================================================================

SET NAMES utf8mb4;
USE orion_link_db;

DELIMITER $$

-- ----------------------------------------------------------------------------
-- TRIGGER 1: trg_before_insert_onu
-- Valida que el número de puerto asignado en la Caja NAP esté dentro de la
-- capacidad física del splitter (1..total_ports) y que haya cupo disponible.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_before_insert_onu $$
CREATE TRIGGER trg_before_insert_onu
BEFORE INSERT ON onus
FOR EACH ROW
BEGIN
    DECLARE v_total_ports TINYINT UNSIGNED;
    DECLARE v_occupied_ports TINYINT UNSIGNED;

    SELECT total_ports, occupied_ports
      INTO v_total_ports, v_occupied_ports
      FROM nap_boxes
     WHERE id_nap_box = NEW.id_nap_box
     FOR UPDATE;

    IF NEW.nap_port_number < 1 OR NEW.nap_port_number > v_total_ports THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'El número de puerto supera la capacidad física de la Caja NAP.';
    END IF;

    IF v_occupied_ports >= v_total_ports THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'La Caja NAP seleccionada ya tiene todos sus puertos ópticos ocupados.';
    END IF;
END $$

-- ----------------------------------------------------------------------------
-- TRIGGER 2: trg_after_insert_onu
-- Incrementa automáticamente el contador de puertos ocupados en la Caja NAP.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_after_insert_onu $$
CREATE TRIGGER trg_after_insert_onu
AFTER INSERT ON onus
FOR EACH ROW
BEGIN
    UPDATE nap_boxes
       SET occupied_ports = (
           SELECT COUNT(*) FROM onus WHERE id_nap_box = NEW.id_nap_box
       )
     WHERE id_nap_box = NEW.id_nap_box;
END $$

-- ----------------------------------------------------------------------------
-- TRIGGER 3: trg_after_delete_onu
-- Sincroniza el contador de puertos ocupados cuando se retira una ONU.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_after_delete_onu $$
CREATE TRIGGER trg_after_delete_onu
AFTER DELETE ON onus
FOR EACH ROW
BEGIN
    UPDATE nap_boxes
       SET occupied_ports = (
           SELECT COUNT(*) FROM onus WHERE id_nap_box = OLD.id_nap_box
       )
     WHERE id_nap_box = OLD.id_nap_box;
END $$

-- ----------------------------------------------------------------------------
-- PROCEDIMIENTO 1: sp_run_remote_diagnostic
-- Ejecuta o simula una lectura óptica determinista sobre un contrato FTTH,
-- actualiza la telemetría de la ONU, guarda el diagnóstico en remote_diagnostics
-- y verifica si la Caja NAP alcanzó el umbral de Falla Masiva (>= 3 ONUs en LOS).
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_run_remote_diagnostic $$
CREATE PROCEDURE sp_run_remote_diagnostic(
    IN p_id_contract INT UNSIGNED,
    IN p_executed_by INT UNSIGNED,
    IN p_simulated_rx_dbm DECIMAL(5,2)
)
BEGIN
    DECLARE v_id_onu INT UNSIGNED;
    DECLARE v_id_nap_box INT UNSIGNED;
    DECLARE v_id_olt INT UNSIGNED;
    DECLARE v_nap_code VARCHAR(30);
    DECLARE v_zone_sector VARCHAR(100);
    DECLARE v_rx_dbm DECIMAL(5,2);
    DECLARE v_tx_dbm DECIMAL(5,2);
    DECLARE v_latency SMALLINT UNSIGNED;
    DECLARE v_packet_loss DECIMAL(5,2);
    DECLARE v_onu_status VARCHAR(20);
    DECLARE v_optical_health VARCHAR(15);
    DECLARE v_summary VARCHAR(255);
    DECLARE v_action VARCHAR(255);
    DECLARE v_los_count INT DEFAULT 0;
    DECLARE v_active_outage_id INT UNSIGNED DEFAULT NULL;
    DECLARE v_new_diagnostic_id INT UNSIGNED;
    DECLARE v_outage_code VARCHAR(25);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- 1. Obtener la ONU, Caja NAP y OLT asociadas al contrato
    SELECT c.id_onu, o.id_nap_box, n.id_olt, n.nap_code, n.zone_sector, o.rx_power_dbm
      INTO v_id_onu, v_id_nap_box, v_id_olt, v_nap_code, v_zone_sector, v_rx_dbm
      FROM subscriber_contracts c
      INNER JOIN onus o ON c.id_onu = o.id_onu
      INNER JOIN nap_boxes n ON o.id_nap_box = n.id_nap_box
     WHERE c.id_contract = p_id_contract
     FOR UPDATE;

    IF v_id_onu IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'El contrato indicado no existe o no tiene una ONU vinculada.';
    END IF;

    -- 2. Si se provee un valor simulado de potencia Rx (ej. para inyectar falla o mejora), aplicarlo
    IF p_simulated_rx_dbm IS NOT NULL THEN
        SET v_rx_dbm = p_simulated_rx_dbm;
    END IF;

    -- 3. Evaluar reglas físicas de telemetría óptica GPON
    IF v_rx_dbm >= -24.50 THEN
        SET v_onu_status = 'online';
        SET v_optical_health = 'optimal';
        SET v_tx_dbm = 2.25;
        SET v_latency = 6;
        SET v_packet_loss = 0.00;
        SET v_summary = CONCAT('Señal óptica óptima (', v_rx_dbm, ' dBm) en ', v_nap_code, '. Enlace estable.');
        SET v_action = 'Sin anomalías físicas en fibra. Si persiste queja, revisar red Wi-Fi local.';
    ELSEIF v_rx_dbm >= -27.99 THEN
        SET v_onu_status = 'high_attenuation';
        SET v_optical_health = 'warning';
        SET v_tx_dbm = 1.90;
        SET v_latency = 45;
        SET v_packet_loss = 4.80;
        SET v_summary = CONCAT('Atenuación óptica elevada (', v_rx_dbm, ' dBm) en ', v_nap_code, '. Degradación de paquete detectada.');
        SET v_action = 'Agendar revisión de última milla: limpieza de conector SC/APC o revisión de curvatura en acometida drop.';
    ELSE
        SET v_onu_status = 'los';
        SET v_optical_health = 'critical';
        SET v_tx_dbm = 0.00;
        SET v_latency = 999;
        SET v_packet_loss = 100.00;
        SET v_summary = CONCAT('Pérdida crítica de señal óptica LOS (', v_rx_dbm, ' dBm) en ', v_nap_code, '.');
        SET v_action = 'Verificar correlación de Caja NAP o despachar cuadrilla por corte de acometida.';
    END IF;

    -- 4. Actualizar estado de la ONU
    UPDATE onus
       SET rx_power_dbm = v_rx_dbm,
           tx_power_dbm = v_tx_dbm,
           optical_status = v_onu_status,
           last_telemetry_at = NOW()
     WHERE id_onu = v_id_onu;

    -- 5. Registrar diagnóstico en el historial
    INSERT INTO remote_diagnostics (
        id_contract, id_onu, executed_by, rx_power_dbm, tx_power_dbm,
        latency_ms, packet_loss_pct, onu_status_snapshot, optical_health,
        diagnosis_summary, recommended_action
    ) VALUES (
        p_id_contract, v_id_onu, p_executed_by, v_rx_dbm, v_tx_dbm,
        v_latency, v_packet_loss, v_onu_status, v_optical_health,
        v_summary, v_action
    );

    SET v_new_diagnostic_id = LAST_INSERT_ID();

    -- 6. Correlación temprana de Fallas Masivas en la Caja NAP
    SELECT COUNT(*)
      INTO v_los_count
      FROM onus
     WHERE id_nap_box = v_id_nap_box
       AND optical_status IN ('los', 'offline');

    IF v_los_count >= 3 THEN
        -- Verificar si ya existe una falla masiva activa para esta Caja NAP
        SELECT id_mass_outage
          INTO v_active_outage_id
          FROM mass_outages
         WHERE id_nap_box = v_id_nap_box
           AND status IN ('detected', 'dispatched', 'repairing')
         ORDER BY id_mass_outage DESC
         LIMIT 1;

        IF v_active_outage_id IS NULL THEN
            SET v_outage_code = CONCAT('OUT-', DATE_FORMAT(NOW(), '%Y'), '-', LPAD(FLOOR(100 + RAND() * 899), 3, '0'));

            INSERT INTO mass_outages (
                outage_code, id_olt, id_nap_box, declared_by, title,
                root_cause, severity, status, affected_contracts_count,
                detected_at, estimated_resolution_at
            ) VALUES (
                v_outage_code, v_id_olt, v_id_nap_box, p_executed_by,
                CONCAT('Caída Masiva Automática en Caja ', v_nap_code, ' (', v_zone_sector, ')'),
                'fiber_cut', 'critical', 'detected', v_los_count,
                NOW(), DATE_ADD(NOW(), INTERVAL 3 HOUR)
            );

            SET v_active_outage_id = LAST_INSERT_ID();
        ELSE
            UPDATE mass_outages
               SET affected_contracts_count = v_los_count
             WHERE id_mass_outage = v_active_outage_id;
        END IF;

        -- Marcar la Caja NAP en estado outage y vincular tickets abiertos de esa NAP
        UPDATE nap_boxes
           SET status = 'outage'
         WHERE id_nap_box = v_id_nap_box;

        UPDATE support_tickets t
        INNER JOIN subscriber_contracts sc ON t.id_contract = sc.id_contract
        INNER JOIN onus o ON sc.id_onu = o.id_onu
           SET t.id_mass_outage = v_active_outage_id,
               t.priority = 'critical'
         WHERE o.id_nap_box = v_id_nap_box
           AND t.status IN ('open', 'diagnosed', 'dispatched', 'in_progress');
    END IF;

    COMMIT;

    -- Devolver el diagnóstico recién generado junto con alerta de falla masiva si existe
    SELECT d.*,
           v_nap_code AS nap_code,
           v_los_count AS nap_los_count,
           v_active_outage_id AS correlated_mass_outage_id
      FROM remote_diagnostics d
     WHERE d.id_diagnostic = v_new_diagnostic_id;
END $$

-- ----------------------------------------------------------------------------
-- PROCEDIMIENTO 2: sp_complete_dispatch_order
-- Cierra una orden de despacho en campo certificando la nueva potencia óptica
-- en dBm, restaura la ONU (o todas las ONUs de la Caja NAP en caso de falla
-- masiva), resuelve los tickets vinculados y libera a la cuadrilla.
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_complete_dispatch_order $$
CREATE PROCEDURE sp_complete_dispatch_order(
    IN p_id_dispatch INT UNSIGNED,
    IN p_field_notes TEXT,
    IN p_fiber_drop_meters SMALLINT UNSIGNED,
    IN p_restored_rx_dbm DECIMAL(5,2)
)
BEGIN
    DECLARE v_id_ticket INT UNSIGNED;
    DECLARE v_id_mass_outage INT UNSIGNED;
    DECLARE v_id_crew INT UNSIGNED;
    DECLARE v_id_contract INT UNSIGNED;
    DECLARE v_id_onu INT UNSIGNED;
    DECLARE v_id_nap_box INT UNSIGNED;
    DECLARE v_current_status VARCHAR(20);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    IF p_restored_rx_dbm > -14.00 OR p_restored_rx_dbm < -25.00 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Para certificar el cierre en campo, la potencia óptica restaurada debe estar entre -14.00 y -25.00 dBm.';
    END IF;

    SELECT id_ticket, id_mass_outage, id_crew, status
      INTO v_id_ticket, v_id_mass_outage, v_id_crew, v_current_status
      FROM dispatch_orders
     WHERE id_dispatch = p_id_dispatch
     FOR UPDATE;

    IF v_current_status IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'La orden de despacho indicada no existe.';
    END IF;

    IF v_current_status = 'resolved' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'La orden de despacho ya fue cerrada previamente.';
    END IF;

    -- 1. Marcar la orden de despacho como resuelta con la lectura óptica certificada
    UPDATE dispatch_orders
       SET status = 'resolved',
           arrived_at = COALESCE(arrived_at, NOW()),
           completed_at = NOW(),
           field_notes = p_field_notes,
           fiber_drop_meters = COALESCE(p_fiber_drop_meters, 0),
           restored_rx_dbm = p_restored_rx_dbm
     WHERE id_dispatch = p_id_dispatch;

    -- 2. Si la orden atiende una Falla Masiva, restaurar la Caja NAP, sus ONUs y tickets
    IF v_id_mass_outage IS NOT NULL THEN
        SELECT id_nap_box INTO v_id_nap_box
          FROM mass_outages
         WHERE id_mass_outage = v_id_mass_outage;

        IF v_id_nap_box IS NOT NULL THEN
            UPDATE onus
               SET rx_power_dbm = p_restored_rx_dbm,
                   tx_power_dbm = 2.20,
                   optical_status = 'online',
                   last_telemetry_at = NOW()
             WHERE id_nap_box = v_id_nap_box;

            UPDATE nap_boxes
               SET status = 'operational'
             WHERE id_nap_box = v_id_nap_box;
        END IF;

        UPDATE mass_outages
           SET status = 'resolved',
               resolved_at = NOW(),
               resolution_notes = p_field_notes
         WHERE id_mass_outage = v_id_mass_outage;

        UPDATE support_tickets
           SET status = 'resolved',
               resolved_at = NOW(),
               resolution_summary = CONCAT('Resuelto por reparación de Falla Masiva en campo. Potencia certificada: ', p_restored_rx_dbm, ' dBm. ', p_field_notes)
         WHERE id_mass_outage = v_id_mass_outage
           AND status NOT IN ('resolved', 'closed');
    END IF;

    -- 3. Si la orden atiende un Ticket Individual, restaurar su ONU y el ticket
    IF v_id_ticket IS NOT NULL THEN
        SELECT sc.id_contract, sc.id_onu
          INTO v_id_contract, v_id_onu
          FROM support_tickets t
          INNER JOIN subscriber_contracts sc ON t.id_contract = sc.id_contract
         WHERE t.id_ticket = v_id_ticket;

        IF v_id_onu IS NOT NULL THEN
            UPDATE onus
               SET rx_power_dbm = p_restored_rx_dbm,
                   tx_power_dbm = 2.25,
                   optical_status = 'online',
                   last_telemetry_at = NOW()
             WHERE id_onu = v_id_onu;
        END IF;

        UPDATE support_tickets
           SET status = 'resolved',
               resolved_at = NOW(),
               resolution_summary = CONCAT('Reparación en campo completada. Potencia óptica certificada: ', p_restored_rx_dbm, ' dBm. ', p_field_notes)
         WHERE id_ticket = v_id_ticket;
    END IF;

    -- 4. Actualizar disponibilidad de la cuadrilla técnica
    UPDATE technical_crews
       SET status = 'available'
     WHERE id_crew = v_id_crew;

    COMMIT;

    SELECT * FROM dispatch_orders WHERE id_dispatch = p_id_dispatch;
END $$

DELIMITER ;
