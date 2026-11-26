# Base de Datos Orion Link (`orion_link_db`) — MySQL 8.0 InnoDB

El modelo relacional de **Orion Link** está diseñado para **MySQL 8.0** con motor transaccional **`InnoDB`** y juego de caracteres `utf8mb4` (`utf8mb4_unicode_ci`). Sigue la regla metodológica *Data & Spec First*, separando las responsabilidades en `ddl/`, `dml/` y `dql/`.

## 1. Organización de Scripts SQL

| Carpeta / Archivo | Propósito |
|---|---|
| `ddl/01-schema.sql` | Define las 13 tablas InnoDB en 3ra Forma Normal (3NF), llaves primarias, llaves foráneas (`ON DELETE RESTRICT / CASCADE / SET NULL`), unicidad de DPI (`uq_users_dpi`), validaciones `CHECK` (DPI de 13 dígitos, teléfono de 8 dígitos, dependencia `splitter_ratio` ↔ `total_ports`, arco de despacho `chk_dispatch_target`) e índices compuestos. |
| `dml/02-seeds.sql` | Carga 13 usuarios en los 4 roles (`admin`, `support_agent`, `field_tech`, `customer`), 4 planes simétricos FTTH, 2 nodos OLT, 3 Cajas NAP, 6 ONUs, 6 contratos, 5 diagnósticos, 2 fallas masivas, 4 tickets y 2 órdenes de despacho. |
| `dml/03-procedures-triggers.sql` | Define 5 triggers de ocupación y traslado de puertos NAP (`trg_before_insert_onu`, `trg_after_insert_onu`, `trg_before_update_onu`, `trg_after_update_onu`, `trg_after_delete_onu`) y los procedimientos almacenados transaccionales `sp_run_remote_diagnostic` y `sp_complete_dispatch_order`. |
| `dql/04-queries.sql` | 5 consultas analíticas para el Centro de Operaciones de Red (NOC), mapa de salud óptica por Caja NAP, ficha 360° de contratos, cumplimiento de SLA y productividad de cuadrillas. |
| `diagram/orion-link-db-schema.html` | Diagrama físico interactivo en HTML + SVG inline generado con `/diagram-design`. |

## 2. Credenciales Semilla para Pruebas Locales

Todas las cuentas de prueba aceptan la contraseña `password` o `@Orion_2026` en entorno de desarrollo:

| Rol (`users.role`) | Correos Semilla | Uso en el Sistema |
|---|---|---|
| **Admin / NOC (`admin`)** | `admin@orionlink.gt`, `noc@orionlink.gt` | Control total de topología FTTH, fallas masivas, usuarios, planes y despacho. |
| **Soporte N1/N2 (`support_agent`)** | `soporte.n1@orionlink.gt`, `soporte.n2@orionlink.gt` | Diagnóstico óptico remoto, triaje de tickets y escalamiento a cuadrillas. |
| **Técnico Cuadrilla (`field_tech`)** | `tecnico.alfa@orionlink.gt`, `tecnico.beta@orionlink.gt`, `tecnico.gamma@orionlink.gt` | Atención de órdenes en campo y cierre con certificación óptica en `dBm`. |
| **Suscriptor (`customer`)** | `juan.perez@cliente.gt`, `maria.ortiz@cliente.gt`, `diego.reyes@cliente.gt` | Portal del cliente, autodiagnóstico de ONU, avisos de falla masiva y tickets. |
