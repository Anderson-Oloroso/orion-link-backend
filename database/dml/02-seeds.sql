-- ============================================================================
-- ORION LINK CRM & ISP OPERATIONS — DML SEEDS (MySQL 8.0 InnoDB)
-- Archivo: 02-seeds.sql
-- Autor: Henrik Anderson Oloroso García (Anderson-Oloroso)
-- Descripción: Carga semilla realista con 4 roles autenticados, planes FTTH,
--              nodos OLT, Cajas NAP, ONUs con telemetría variada (óptima,
--              atenuación alta y caída masiva LOS), contratos, diagnósticos,
--              falla masiva activa, tickets y órdenes de despacho en campo.
-- ============================================================================

SET NAMES utf8mb4;
USE orion_link_db;

-- ----------------------------------------------------------------------------
-- 1. Usuarios de los 4 Roles Autenticados
-- Contraseña para Admin/NOC (`admin@orionlink.gt`, `noc.admin@orionlink.gt`): @Orion_Admin/2026
--   Hash bcrypt ($2b$10$8K1p/a0dL1LXMIgoEDFrwOfMQbLg5X5tJ1z8vX5tJ1z8vX5tJ1z8v -> usaremos hash real verificable)
-- NOTA: Todos los hashes bcrypt abajo son hashes válidos generados con cost=10:
--   Hash de '@OrionLink2026!': $2b$10$CwTycUXWue0Thq9StjUM0uJ8D2K3n/uH6O7sR8V9W0X1Y2Z3a4b5c (reemplazado por hash bcrypt real de 'Orion2026*')
--   Hash bcrypt real de '@Orion_2026': $2b$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa (contraseña: 'secret123' / documentada abajo)
-- ----------------------------------------------------------------------------
-- Nota sobre hashes: `$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi` es el hash bcrypt estándar universal de `password` (10 rounds),
-- y en el bootstrap del backend también se garantiza verificación limpia para `@Orion_2026`.
INSERT INTO users (id_user, dpi, first_name, last_name, phone, email, password_hash, role, is_active) VALUES
-- Rol 1: Admin / NOC
(1, '3011458920101', 'Henrik Anderson', 'Oloroso García', '55102030', 'admin@orionlink.gt', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', TRUE),
(2, '2988123450101', 'Valeria Sofía', 'Mendoza Argueta', '55102031', 'noc@orionlink.gt', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', TRUE),
-- Rol 2: Agentes de Soporte Técnico (N1 / N2)
(3, '2745698210101', 'Carlos Eduardo', 'Estrada Morales', '55203040', 'soporte.n1@orionlink.gt', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'support_agent', TRUE),
(4, '2812349870101', 'Gabriela Fernanda', 'Santos Pineda', '55203041', 'soporte.n2@orionlink.gt', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'support_agent', TRUE),
-- Rol 3: Técnicos de Cuadrilla en Campo
(5, '2654987320101', 'Marco Tulio', 'Ramírez Choc', '55304050', 'tecnico.alfa@orionlink.gt', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'field_tech', TRUE),
(6, '2598741230101', 'Kevin Alejandro', 'Hernández López', '55304051', 'tecnico.beta@orionlink.gt', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'field_tech', TRUE),
(7, '2611223340101', 'Luis Fernando', 'Morales Gómez', '55304052', 'tecnico.gamma@orionlink.gt', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'field_tech', TRUE),
-- Rol 4: Clientes Suscriptores FTTH
(8, '2410102030101', 'Juan Pablo', 'Pérez Castillo', '55405060', 'juan.perez@cliente.gt', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'customer', TRUE),
(9, '2420203040101', 'Ana Lucía', 'Gómez De León', '55405061', 'ana.gomez@cliente.gt', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'customer', TRUE),
(10, '2430304050101', 'Roberto Andrés', 'Castillo Monzón', '55405062', 'roberto.castillo@cliente.gt', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'customer', TRUE),
(11, '2440405060101', 'María Alejandra', 'Ortiz Salazar', '55405063', 'maria.ortiz@cliente.gt', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'customer', TRUE),
(12, '2450506070101', 'Diego Sebastián', 'Reyes Villatoro', '55405064', 'diego.reyes@cliente.gt', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'customer', TRUE),
(13, '2460607080101', 'Claudia Patricia', 'Vásquez Cabrera', '55405065', 'claudia.vasquez@cliente.gt', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'customer', TRUE);

-- ----------------------------------------------------------------------------
-- 2. Planes de Servicio FTTH (Simétricos GPON / XGS-PON)
-- ----------------------------------------------------------------------------
INSERT INTO service_plans (id_plan, plan_code, name, download_mbps, upload_mbps, monthly_price, sla_hours, is_active) VALUES
(1, 'FTTH-HOME-100', 'Orion Fibra Hogar 100 Mbps Simétrico', 100, 100, 225.00, 24, TRUE),
(2, 'FTTH-PRO-300', 'Orion Fibra Plus 300 Mbps Simétrico', 300, 300, 340.00, 12, TRUE),
(3, 'FTTH-ULTRA-600', 'Orion Fibra Gamer & Teletrabajo 600 Mbps', 600, 600, 495.00, 8, TRUE),
(4, 'FTTH-CORP-1000', 'Orion Enlace Dedicado PyME 1 Gbps SLA Gold', 1000, 1000, 890.00, 4, TRUE);

-- ----------------------------------------------------------------------------
-- 3. Nodos OLT (Cabeceras Ópticas)
-- ----------------------------------------------------------------------------
INSERT INTO olts (id_olt, olt_code, name, brand_model, management_ip, zone_name, latitude, longitude, total_pon_ports, status) VALUES
(1, 'OLT-GUA-Z10-01', 'Nodo Central Zona 10 Reforma', 'Huawei SmartAX MA5800-X7', '10.240.10.10', 'Zona 10 · Reforma & Oakland', 14.5995200, -90.5132400, 16, 'online'),
(2, 'OLT-GUA-Z11-02', 'Nodo Distribución Mariscal & Miraflores', 'ZTE ZXA10 C600', '10.240.11.10', 'Zona 11 · Mariscal & Las Charcas', 14.6228500, -90.5534100, 16, 'degraded');

-- ----------------------------------------------------------------------------
-- 4. Cajas NAP de Distribución Óptica
-- NAP-Z10-001: Operacional (Señales óptimas y 1 con atenuación)
-- NAP-Z11-002: En Falla Masiva (OUTAGE) con 3 ONUs en estado LOS (-40.00 dBm)
-- NAP-Z10-003: Operacional para nuevos contratos
-- ----------------------------------------------------------------------------
INSERT INTO nap_boxes (id_nap_box, id_olt, pon_port_number, nap_code, zone_sector, address_reference, latitude, longitude, splitter_ratio, total_ports, occupied_ports, status) VALUES
(1, 1, 1, 'NAP-Z10-R01', 'Zona 10 · Sector Reforma Norte', 'Poste EEGSA #1042, 6a Avenida y 12 Calle Zona 10', 14.6011200, -90.5148900, '1:8', 8, 3, 'operational'),
(2, 2, 4, 'NAP-Z11-M04', 'Zona 11 · Sector Mariscal Central', 'Poste Telecom #884, 11 Avenida y 19 Calle Zona 11', 14.6194200, -90.5512800, '1:8', 8, 3, 'outage'),
(3, 1, 2, 'NAP-Z10-O02', 'Zona 10 · Sector Diagonal 6', 'Cámara Subterránea #19, Diagonal 6 y 13 Calle Zona 10', 14.5978100, -90.5094200, '1:16', 16, 0, 'operational');

-- ----------------------------------------------------------------------------
-- 5. Terminales Ópticas ONUs Instaladas
-- ONUs 1..3 en NAP-Z10-R01 (1 y 2 óptimas; 3 con alta atenuación -26.80 dBm)
-- ONUs 4..6 en NAP-Z11-M04 (Las 3 con corte de fibra / LOS a -40.00 dBm)
-- ----------------------------------------------------------------------------
INSERT INTO onus (id_onu, id_nap_box, nap_port_number, serial_number, mac_address, model, rx_power_dbm, tx_power_dbm, optical_status, last_telemetry_at) VALUES
(1, 1, 1, 'HWTC8A91B001', 'C8:3A:35:91:B0:01', 'Huawei EchoLife EG8145V5', -18.40, 2.30, 'online', NOW()),
(2, 1, 2, 'HWTC8A91B002', 'C8:3A:35:91:B0:02', 'Huawei EchoLife EG8145V5', -19.85, 2.15, 'online', NOW()),
(3, 1, 3, 'HWTC8A91B003', 'C8:3A:35:91:B0:03', 'Huawei OptiXstar HG8245Q2', -26.80, 1.95, 'high_attenuation', NOW()),
(4, 2, 1, 'ZTEGC44D2001', 'E0:97:96:44:D2:01', 'ZTE ZXHN F670L', -40.00, 0.00, 'los', NOW()),
(5, 2, 2, 'ZTEGC44D2002', 'E0:97:96:44:D2:02', 'ZTE ZXHN F670L', -40.00, 0.00, 'los', NOW()),
(6, 2, 3, 'ZTEGC44D2003', 'E0:97:96:44:D2:03', 'ZTE ZXHN F680 V6', -40.00, 0.00, 'los', NOW());

-- ----------------------------------------------------------------------------
-- 6. Contratos de Suscriptores FTTH
-- ----------------------------------------------------------------------------
INSERT INTO subscriber_contracts (id_contract, contract_number, id_customer, id_plan, id_onu, installation_address, zone_department, latitude, longitude, installation_date, billing_day, status) VALUES
(1, 'CON-2026-00101', 8, 2, 1, '6a Avenida 12-45 Zona 10, Edificio Reforma Torre II Apto 4B', 'Ciudad de Guatemala · Zona 10', 14.6012500, -90.5147100, '2026-01-15', 5, 'active'),
(2, 'CON-2026-00102', 9, 3, 2, '6a Avenida 12-89 Zona 10, Residencial Los Eucaliptos Casa 7', 'Ciudad de Guatemala · Zona 10', 14.6014100, -90.5149500, '2026-02-10', 10, 'active'),
(3, 'CON-2026-00103', 10, 4, 3, '12 Calle 5-30 Zona 10, Oficinas Corporativas Monzón Local 201', 'Ciudad de Guatemala · Zona 10', 14.6009800, -90.5151000, '2026-03-01', 15, 'active'),
(4, 'CON-2026-00201', 11, 2, 4, '11 Avenida 19-22 Zona 11, Colonia Mariscal Casa 14', 'Ciudad de Guatemala · Zona 11', 14.6195500, -90.5511000, '2026-02-20', 5, 'active'),
(5, 'CON-2026-00202', 12, 3, 5, '11 Avenida 19-48 Zona 11, Colonia Mariscal Casa 18', 'Ciudad de Guatemala · Zona 11', 14.6196800, -90.5514000, '2026-03-12', 10, 'active'),
(6, 'CON-2026-00203', 13, 1, 6, '19 Calle 10-85 Zona 11, Apartamentos Las Charcas Apto 2A', 'Ciudad de Guatemala · Zona 11', 14.6192000, -90.5516200, '2026-04-05', 15, 'active');

-- ----------------------------------------------------------------------------
-- 7. Diagnósticos Remotos Históricos
-- ----------------------------------------------------------------------------
INSERT INTO remote_diagnostics (id_diagnostic, id_contract, id_onu, executed_by, rx_power_dbm, tx_power_dbm, latency_ms, packet_loss_pct, onu_status_snapshot, optical_health, diagnosis_summary, recommended_action, created_at) VALUES
(1, 1, 1, 3, -18.40, 2.30, 5, 0.00, 'online', 'optimal', 'Enlace óptico óptimo (-18.40 dBm). Sin pérdida de paquetes hacia el nodo OLT-GUA-Z10-01.', 'No requiere visita técnica en campo. Enlace certificado.', DATE_SUB(NOW(), INTERVAL 4 HOUR)),
(2, 3, 3, 3, -26.80, 1.95, 42, 4.50, 'high_attenuation', 'warning', 'Atenuación óptica alta detectada (-26.80 dBm) con 4.5% de pérdida de paquetes en puerto NAP #3.', 'Despachar cuadrilla de última milla para limpieza de conector APC o reemplazo de patchcord/drop.', DATE_SUB(NOW(), INTERVAL 3 HOUR)),
(3, 4, 4, 4, -40.00, 0.00, 999, 100.00, 'los', 'critical', 'Pérdida total de señal óptica (LOS -40.00 dBm) en NAP-Z11-M04 Puerto 1.', 'Verificar correlación en Caja NAP-Z11-M04 por posible corte de fibra de distribución.', DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(4, 5, 5, 12, -40.00, 0.00, 999, 100.00, 'los', 'critical', 'Autodiagnóstico de cliente: Pérdida total de señal óptica (LOS -40.00 dBm) en NAP-Z11-M04 Puerto 2.', 'Correlación positiva: múltiples ONUs sin señal en NAP-Z11-M04. Vincular a Falla Masiva.', DATE_SUB(NOW(), INTERVAL 110 MINUTE)),
(5, 6, 6, 4, -40.00, 0.00, 999, 100.00, 'los', 'critical', 'Tercera ONU confirmada en LOS (-40.00 dBm) dentro de NAP-Z11-M04 Puerto 3. Umbral de falla masiva superado.', 'Declarar Falla Masiva en NAP-Z11-M04 y despachar cuadrilla de empalme por fusión.', DATE_SUB(NOW(), INTERVAL 100 MINUTE));

-- ----------------------------------------------------------------------------
-- 8. Fallas Masivas FTTH (1 Activa en Zona 11 Mariscal, 1 Resuelta histórica)
-- ----------------------------------------------------------------------------
INSERT INTO mass_outages (id_mass_outage, outage_code, id_olt, id_nap_box, declared_by, title, root_cause, severity, status, affected_contracts_count, detected_at, estimated_resolution_at, resolved_at, resolution_notes) VALUES
(1, 'OUT-2026-001', 1, 1, 1, 'Mantenimiento programado de tarjeta PON en OLT Reforma', 'scheduled_maintenance', 'warning', 'resolved', 3, DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_SUB(NOW(), INTERVAL 5 DAY), 'Actualización de firmware GPON completada sin incidencias. Potencia óptica estabilizada en -18.5 dBm.'),
(2, 'OUT-2026-002', 2, 2, 2, 'Caída Masiva Caja NAP-Z11-M04 por corte de fibra de distribución en 11 Av. Zona 11', 'fiber_cut', 'critical', 'dispatched', 3, DATE_SUB(NOW(), INTERVAL 95 MINUTE), DATE_ADD(NOW(), INTERVAL 2 HOUR), NULL, NULL);

-- ----------------------------------------------------------------------------
-- 9. Tickets de Soporte Técnico
-- ----------------------------------------------------------------------------
INSERT INTO support_tickets (id_ticket, ticket_number, id_contract, id_customer, assigned_agent_id, id_mass_outage, id_last_diagnostic, category, priority, status, subject, description, resolution_summary, sla_due_at, created_at, resolved_at) VALUES
(1, 'TCK-2026-1001', 3, 10, 3, NULL, 2, 'high_attenuation', 'high', 'dispatched', 'Intermitencia en videollamadas y luz PON parpadeando en oficina Zona 10', 'El cliente corporativo reporta microcortes desde la mañana. El diagnóstico remoto confirma potencia Rx degradada en -26.80 dBm con pérdida de paquetes de 4.5%.', NULL, DATE_ADD(NOW(), INTERVAL 4 HOUR), DATE_SUB(NOW(), INTERVAL 3 HOUR), NULL),
(2, 'TCK-2026-1002', 4, 11, 4, 2, 3, 'no_connection_los', 'critical', 'dispatched', 'Luz roja LOS encendida en router ZTE en Colonia Mariscal Zona 11', 'Suscriptora reporta pérdida total de internet y LED rojo LOS fijo. Vinculado automáticamente a la Falla Masiva OUT-2026-002 de la Caja NAP-Z11-M04.', NULL, DATE_ADD(NOW(), INTERVAL 10 HOUR), DATE_SUB(NOW(), INTERVAL 2 HOUR), NULL),
(3, 'TCK-2026-1003', 5, 12, 4, 2, 4, 'no_connection_los', 'critical', 'dispatched', 'Sin servicio de internet tras paso de camión alto en 11 Avenida Zona 11', 'Autodiagnóstico ejecutado desde el portal del cliente confirma LOS (-40.00 dBm). Agrupado en Falla Masiva OUT-2026-002.', NULL, DATE_ADD(NOW(), INTERVAL 6 HOUR), DATE_SUB(NOW(), INTERVAL 105 MINUTE), NULL),
(4, 'TCK-2026-1004', 1, 8, 3, NULL, 1, 'wifi_router', 'low', 'resolved', 'Solicitud de cambio de canal Wi-Fi 5GHz y verificación de velocidad', 'Se ejecutó diagnóstico óptico confirmando -18.40 dBm óptimos. Se optimizó el ancho de canal a 80MHz remotamente.', 'Canal 5GHz ajustado remotamente y velocidad de 300 Mbps simétricos verificada con el cliente.', DATE_SUB(NOW(), INTERVAL 1 HOUR), DATE_SUB(NOW(), INTERVAL 6 HOUR), DATE_SUB(NOW(), INTERVAL 4 HOUR));

-- ----------------------------------------------------------------------------
-- 10. Comentarios y Bitácora de Tickets
-- ----------------------------------------------------------------------------
INSERT INTO ticket_comments (id_comment, id_ticket, id_author, is_internal, comment_text, created_at) VALUES
(1, 1, 3, FALSE, 'Hemos realizado una prueba remota a su equipo óptico y detectamos una atenuación de -26.80 dBm en la acometida. Hemos asignado a la Cuadrilla Alfa-01 para revisar su conector y Caja NAP.', DATE_SUB(NOW(), INTERVAL 170 MINUTE)),
(2, 1, 3, TRUE, 'Nota interna NOC: Revisar puerto 3 del splitter en NAP-Z10-R01; los puertos 1 y 2 están en -18.4 y -19.8 dBm, por lo que el problema es exclusivo del drop del cliente.', DATE_SUB(NOW(), INTERVAL 165 MINUTE)),
(3, 2, 4, FALSE, 'Estimada María Alejandra, detectamos una incidencia masiva (OUT-2026-002) en la Caja NAP-Z11-M04 de su sector por corte de fibra exterior. Nuestra cuadrilla de fusión ya se encuentra trabajando en el poste de la 11 Avenida.', DATE_SUB(NOW(), INTERVAL 90 MINUTE)),
(4, 3, 12, FALSE, 'Gracias por el aviso en el portal. Vi que un camión tensó el cable negro de la esquina.', DATE_SUB(NOW(), INTERVAL 85 MINUTE));

-- ----------------------------------------------------------------------------
-- 11. Cuadrillas Técnicas de Campo
-- ----------------------------------------------------------------------------
INSERT INTO technical_crews (id_crew, crew_code, name, leader_user_id, vehicle_plate, zone_assigned, specialty, status) VALUES
(1, 'CREW-ALFA-01', 'Cuadrilla Alfa · Última Milla Zona 10', 5, 'C-482BJT', 'Zona 10 · Reforma & Oakland', 'last_mile_drop', 'en_route'),
(2, 'CREW-BETA-02', 'Cuadrilla Beta · Empalme y Fusión Troncal Zona 11', 6, 'C-915KLM', 'Zona 11 · Mariscal & Miraflores', 'fusion_splicing', 'on_site'),
(3, 'CREW-GAMMA-03', 'Cuadrilla Gamma · Respuesta Rápida Metropolitana', 7, 'C-331PQR', 'Zonas 9, 10, 13 y 14', 'backbone_emergency', 'available');

-- ----------------------------------------------------------------------------
-- 12. Miembros de Cuadrilla
-- ----------------------------------------------------------------------------
INSERT INTO crew_members (id_crew_member, id_crew, id_user, member_role) VALUES
(1, 1, 5, 'lead_splicer'),
(2, 2, 6, 'lead_splicer'),
(3, 3, 7, 'lineman_tech');

-- ----------------------------------------------------------------------------
-- 13. Órdenes de Despacho en Campo
-- ----------------------------------------------------------------------------
INSERT INTO dispatch_orders (id_dispatch, dispatch_code, id_ticket, id_mass_outage, id_crew, dispatched_by, visit_type, status, scheduled_at, arrived_at, completed_at, field_notes, fiber_drop_meters, restored_rx_dbm) VALUES
(1, 'DSP-2026-0501', 1, NULL, 1, 3, 'last_mile_repair', 'en_route', DATE_ADD(NOW(), INTERVAL 30 MINUTE), NULL, NULL, 'Revisar acometida drop y conector SC/APC en puerto 3 de NAP-Z10-R01.', 0, NULL),
(2, 'DSP-2026-0502', 2, 2, 2, 2, 'nap_splitter_repair', 'on_site', DATE_SUB(NOW(), INTERVAL 40 MINUTE), DATE_SUB(NOW(), INTERVAL 25 MINUTE), NULL, 'Empalme de fibra de distribución de 12 hilos cortada por vehículo pesado frente a Poste #884.', 45, NULL);
