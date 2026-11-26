-- ============================================================================
-- ORION LINK CRM & ISP OPERATIONS — DDL (MySQL 8.0 InnoDB)
-- Archivo: 01-schema.sql
-- Autor: Henrik Anderson Oloroso García (Anderson-Oloroso)
-- Descripción: Esquema físico normalizado con motor InnoDB, restricciones de
--              integridad referencial, validaciones CHECK e índices de búsqueda.
-- ============================================================================

SET NAMES utf8mb4;
SET time_zone = '-06:00';

CREATE DATABASE IF NOT EXISTS orion_link_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE orion_link_db;

-- ----------------------------------------------------------------------------
-- 1. Tabla: users (4 roles autenticados: admin, support_agent, field_tech, customer)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id_user INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    dpi VARCHAR(13) NOT NULL,
    first_name VARCHAR(60) NOT NULL,
    last_name VARCHAR(60) NOT NULL,
    phone VARCHAR(8) NOT NULL,
    email VARCHAR(160) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'support_agent', 'field_tech', 'customer') NOT NULL DEFAULT 'customer',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_users_dpi_len CHECK (CHAR_LENGTH(dpi) = 13),
    CONSTRAINT chk_users_phone_len CHECK (CHAR_LENGTH(phone) = 8),
    UNIQUE KEY uq_users_dpi (dpi),
    INDEX idx_users_role_active (role, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2. Tabla: service_plans (Planes comerciales de fibra óptica FTTH)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS service_plans (
    id_plan INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    plan_code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(80) NOT NULL,
    download_mbps SMALLINT UNSIGNED NOT NULL,
    upload_mbps SMALLINT UNSIGNED NOT NULL,
    monthly_price DECIMAL(8,2) NOT NULL,
    sla_hours TINYINT UNSIGNED NOT NULL DEFAULT 24,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_plans_speeds CHECK (download_mbps > 0 AND upload_mbps > 0),
    CONSTRAINT chk_plans_price CHECK (monthly_price >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 3. Tabla: olts (Nodos de cabecera óptica GPON / XGS-PON)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS olts (
    id_olt INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    olt_code VARCHAR(25) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    brand_model VARCHAR(80) NOT NULL,
    management_ip VARCHAR(45) NOT NULL UNIQUE,
    zone_name VARCHAR(100) NOT NULL,
    latitude DECIMAL(10,7) NOT NULL,
    longitude DECIMAL(10,7) NOT NULL,
    total_pon_ports TINYINT UNSIGNED NOT NULL DEFAULT 16,
    status ENUM('online', 'degraded', 'maintenance', 'offline') NOT NULL DEFAULT 'online',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_olts_status_zone (status, zone_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 4. Tabla: nap_boxes (Cajas de distribución óptica NAP en planta externa)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nap_boxes (
    id_nap_box INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    id_olt INT UNSIGNED NOT NULL,
    pon_port_number TINYINT UNSIGNED NOT NULL,
    nap_code VARCHAR(30) NOT NULL UNIQUE,
    zone_sector VARCHAR(100) NOT NULL,
    address_reference VARCHAR(180) NOT NULL,
    latitude DECIMAL(10,7) NOT NULL,
    longitude DECIMAL(10,7) NOT NULL,
    splitter_ratio ENUM('1:8', '1:16') NOT NULL DEFAULT '1:8',
    total_ports TINYINT UNSIGNED NOT NULL DEFAULT 8,
    occupied_ports TINYINT UNSIGNED NOT NULL DEFAULT 0,
    status ENUM('operational', 'degraded', 'outage', 'maintenance') NOT NULL DEFAULT 'operational',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_nap_boxes_olt
        FOREIGN KEY (id_olt) REFERENCES olts(id_olt)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_nap_pon_port CHECK (pon_port_number >= 1),
    CONSTRAINT chk_nap_splitter_ports CHECK (
        (splitter_ratio = '1:8' AND total_ports = 8) OR
        (splitter_ratio = '1:16' AND total_ports = 16)
    ),
    CONSTRAINT chk_nap_ports_capacity CHECK (occupied_ports <= total_ports),
    INDEX idx_nap_boxes_olt_status (id_olt, status),
    INDEX idx_nap_boxes_sector (zone_sector)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 5. Tabla: onus (Terminales ópticas instaladas en el domicilio del cliente)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS onus (
    id_onu INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    id_nap_box INT UNSIGNED NOT NULL,
    nap_port_number TINYINT UNSIGNED NOT NULL,
    serial_number VARCHAR(32) NOT NULL UNIQUE,
    mac_address VARCHAR(17) NOT NULL UNIQUE,
    model VARCHAR(60) NOT NULL,
    rx_power_dbm DECIMAL(5,2) NOT NULL DEFAULT -19.50,
    tx_power_dbm DECIMAL(5,2) NOT NULL DEFAULT 2.20,
    optical_status ENUM('online', 'high_attenuation', 'los', 'power_off', 'offline') NOT NULL DEFAULT 'online',
    last_telemetry_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_onus_nap_box
        FOREIGN KEY (id_nap_box) REFERENCES nap_boxes(id_nap_box)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT uq_onus_nap_port UNIQUE (id_nap_box, nap_port_number),
    INDEX idx_onus_nap_status (id_nap_box, optical_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 6. Tabla: subscriber_contracts (Contratos FTTH de clientes suscriptores)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscriber_contracts (
    id_contract INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    contract_number VARCHAR(25) NOT NULL UNIQUE,
    id_customer INT UNSIGNED NOT NULL,
    id_plan INT UNSIGNED NOT NULL,
    id_onu INT UNSIGNED NOT NULL UNIQUE,
    installation_address VARCHAR(200) NOT NULL,
    zone_department VARCHAR(100) NOT NULL,
    latitude DECIMAL(10,7) NULL,
    longitude DECIMAL(10,7) NULL,
    installation_date DATE NOT NULL,
    billing_day TINYINT UNSIGNED NOT NULL DEFAULT 5,
    status ENUM('active', 'suspended', 'past_due', 'cancelled') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_contracts_customer
        FOREIGN KEY (id_customer) REFERENCES users(id_user)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_contracts_plan
        FOREIGN KEY (id_plan) REFERENCES service_plans(id_plan)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_contracts_onu
        FOREIGN KEY (id_onu) REFERENCES onus(id_onu)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_contracts_billing_day CHECK (billing_day BETWEEN 1 AND 28),
    INDEX idx_contracts_customer_status (id_customer, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 7. Tabla: remote_diagnostics (Historial de diagnósticos ópticos remotos)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS remote_diagnostics (
    id_diagnostic INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    id_contract INT UNSIGNED NOT NULL,
    id_onu INT UNSIGNED NOT NULL,
    executed_by INT UNSIGNED NOT NULL,
    rx_power_dbm DECIMAL(5,2) NOT NULL,
    tx_power_dbm DECIMAL(5,2) NOT NULL,
    latency_ms SMALLINT UNSIGNED NOT NULL DEFAULT 8,
    packet_loss_pct DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    onu_status_snapshot ENUM('online', 'high_attenuation', 'los', 'power_off', 'offline') NOT NULL,
    optical_health ENUM('optimal', 'warning', 'critical') NOT NULL,
    diagnosis_summary VARCHAR(255) NOT NULL,
    recommended_action VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_diagnostics_contract
        FOREIGN KEY (id_contract) REFERENCES subscriber_contracts(id_contract)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_diagnostics_onu
        FOREIGN KEY (id_onu) REFERENCES onus(id_onu)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_diagnostics_executor
        FOREIGN KEY (executed_by) REFERENCES users(id_user)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    INDEX idx_diagnostics_contract_date (id_contract, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 8. Tabla: mass_outages (Detección temprana de fallas masivas en red FTTH)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mass_outages (
    id_mass_outage INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    outage_code VARCHAR(25) NOT NULL UNIQUE,
    id_olt INT UNSIGNED NOT NULL,
    id_nap_box INT UNSIGNED NULL,
    declared_by INT UNSIGNED NULL,
    title VARCHAR(140) NOT NULL,
    root_cause ENUM('fiber_cut', 'splitter_damage', 'olt_pon_card', 'power_grid_failure', 'vandalism', 'scheduled_maintenance', 'investigating') NOT NULL DEFAULT 'investigating',
    severity ENUM('warning', 'major', 'critical') NOT NULL DEFAULT 'critical',
    status ENUM('detected', 'dispatched', 'repairing', 'resolved') NOT NULL DEFAULT 'detected',
    affected_contracts_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    detected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estimated_resolution_at TIMESTAMP NULL,
    resolved_at TIMESTAMP NULL,
    resolution_notes TEXT NULL,
    CONSTRAINT fk_outages_olt
        FOREIGN KEY (id_olt) REFERENCES olts(id_olt)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_outages_nap_box
        FOREIGN KEY (id_nap_box) REFERENCES nap_boxes(id_nap_box)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_outages_declared_by
        FOREIGN KEY (declared_by) REFERENCES users(id_user)
        ON UPDATE CASCADE ON DELETE SET NULL,
    INDEX idx_outages_status_nap (status, id_nap_box),
    INDEX idx_outages_detected_at (detected_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 9. Tabla: support_tickets (Tickets de soporte técnico y operaciones)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS support_tickets (
    id_ticket INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    ticket_number VARCHAR(25) NOT NULL UNIQUE,
    id_contract INT UNSIGNED NOT NULL,
    id_customer INT UNSIGNED NOT NULL,
    assigned_agent_id INT UNSIGNED NULL,
    id_mass_outage INT UNSIGNED NULL,
    id_last_diagnostic INT UNSIGNED NULL,
    category ENUM('no_connection_los', 'slow_speed', 'high_attenuation', 'wifi_router', 'onu_power', 'installation_relocation', 'billing_inquiry') NOT NULL,
    priority ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium',
    status ENUM('open', 'diagnosed', 'dispatched', 'in_progress', 'resolved', 'closed') NOT NULL DEFAULT 'open',
    subject VARCHAR(140) NOT NULL,
    description TEXT NOT NULL,
    resolution_summary TEXT NULL,
    sla_due_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    CONSTRAINT fk_tickets_contract
        FOREIGN KEY (id_contract) REFERENCES subscriber_contracts(id_contract)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_tickets_customer
        FOREIGN KEY (id_customer) REFERENCES users(id_user)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_tickets_agent
        FOREIGN KEY (assigned_agent_id) REFERENCES users(id_user)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_tickets_outage
        FOREIGN KEY (id_mass_outage) REFERENCES mass_outages(id_mass_outage)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_tickets_diagnostic
        FOREIGN KEY (id_last_diagnostic) REFERENCES remote_diagnostics(id_diagnostic)
        ON UPDATE CASCADE ON DELETE SET NULL,
    INDEX idx_tickets_status_priority (status, priority),
    INDEX idx_tickets_contract_status (id_contract, status),
    INDEX idx_tickets_customer (id_customer, created_at DESC),
    INDEX idx_tickets_mass_outage (id_mass_outage)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 10. Tabla: ticket_comments (Bitácora de comentarios en cascada por ticket)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ticket_comments (
    id_comment INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    id_ticket INT UNSIGNED NOT NULL,
    id_author INT UNSIGNED NOT NULL,
    is_internal BOOLEAN NOT NULL DEFAULT FALSE,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_comments_ticket
        FOREIGN KEY (id_ticket) REFERENCES support_tickets(id_ticket)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_comments_author
        FOREIGN KEY (id_author) REFERENCES users(id_user)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    INDEX idx_comments_ticket_date (id_ticket, created_at ASC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 11. Tabla: technical_crews (Cuadrillas técnicas de campo)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS technical_crews (
    id_crew INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    crew_code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(80) NOT NULL,
    leader_user_id INT UNSIGNED NOT NULL,
    vehicle_plate VARCHAR(15) NOT NULL,
    zone_assigned VARCHAR(100) NOT NULL,
    specialty ENUM('fusion_splicing', 'last_mile_drop', 'backbone_emergency') NOT NULL DEFAULT 'last_mile_drop',
    status ENUM('available', 'en_route', 'on_site', 'off_duty') NOT NULL DEFAULT 'available',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_crews_leader
        FOREIGN KEY (leader_user_id) REFERENCES users(id_user)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    INDEX idx_crews_status_zone (status, zone_assigned)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 12. Tabla: crew_members (Técnicos asignados a cada cuadrilla)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crew_members (
    id_crew_member INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    id_crew INT UNSIGNED NOT NULL,
    id_user INT UNSIGNED NOT NULL UNIQUE,
    member_role ENUM('lead_splicer', 'lineman_tech', 'support_assistant') NOT NULL DEFAULT 'lineman_tech',
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_crew_members_crew
        FOREIGN KEY (id_crew) REFERENCES technical_crews(id_crew)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_crew_members_user
        FOREIGN KEY (id_user) REFERENCES users(id_user)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 13. Tabla: dispatch_orders (Órdenes de trabajo y despacho de cuadrillas)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dispatch_orders (
    id_dispatch INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    dispatch_code VARCHAR(25) NOT NULL UNIQUE,
    id_ticket INT UNSIGNED NULL,
    id_mass_outage INT UNSIGNED NULL,
    id_crew INT UNSIGNED NOT NULL,
    dispatched_by INT UNSIGNED NOT NULL,
    visit_type ENUM('last_mile_repair', 'nap_splitter_repair', 'backbone_fusion', 'onu_replacement') NOT NULL DEFAULT 'last_mile_repair',
    status ENUM('assigned', 'en_route', 'on_site', 'resolved', 'cancelled') NOT NULL DEFAULT 'assigned',
    scheduled_at TIMESTAMP NOT NULL,
    arrived_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    field_notes TEXT NULL,
    fiber_drop_meters SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    restored_rx_dbm DECIMAL(5,2) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_dispatches_ticket
        FOREIGN KEY (id_ticket) REFERENCES support_tickets(id_ticket)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_dispatches_outage
        FOREIGN KEY (id_mass_outage) REFERENCES mass_outages(id_mass_outage)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_dispatches_crew
        FOREIGN KEY (id_crew) REFERENCES technical_crews(id_crew)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_dispatches_dispatcher
        FOREIGN KEY (dispatched_by) REFERENCES users(id_user)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_dispatch_target CHECK (id_ticket IS NOT NULL OR id_mass_outage IS NOT NULL),
    INDEX idx_dispatches_crew_status (id_crew, status),
    INDEX idx_dispatches_ticket (id_ticket),
    INDEX idx_dispatches_outage (id_mass_outage)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
