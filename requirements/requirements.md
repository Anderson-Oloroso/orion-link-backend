# Requisitos de Ingeniería y Modelo de Dominio ISP — Orion Link

> **Motor Relacional:** MySQL 8.0 (`ENGINE=InnoDB`, `CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`).

---

## 1. Visión General del Negocio
**Orion Link** es un Sistema CRM de Soporte Técnico y Operaciones ISP especializado en redes de fibra óptica hasta el hogar (**FTTH — GPON/XGS-PON**). Centraliza en una sola fuente de verdad:
1. **Atención al cliente suscriptor y contratos FTTH:** vínculo exacto entre el cliente, su plan de ancho de banda y el equipo óptico instalado en su domicilio.
2. **Diagnóstico remoto de conectividad:** medición determinista e interactiva de potencia óptica de recepción/transmisión (`rx_power_dbm`, `tx_power_dbm`), latencia, pérdida de paquetes y estado operativo de la **ONU** (`online`, `high_attenuation`, `los`, `power_off`, `offline`).
3. **Detección temprana de fallas masivas en red de fibra óptica:** correlación automática a nivel de **Caja NAP (Splitter óptico)** y **Nodo OLT**. Si 3 o más ONUs de una misma Caja NAP entran en pérdida de señal (`los`), el sistema declara o actualiza una falla masiva (`mass_outages`) y agrupa los tickets de soporte de esa zona para evitar despachos duplicados.
4. **Despacho de cuadrillas técnicas en campo:** asignación de cuadrillas (`technical_crews`) a órdenes de trabajo (`dispatch_orders`) con certificación obligatoria de potencia óptica restaurada (`restored_rx_dbm`) al momento del cierre en campo.

---

## 2. Actores y Control de Acceso Basado en Roles (RBAC — 4 Roles Autenticados)

| Rol (`users.role`) | Nombre Operativo | Responsabilidades y Alcance en Orion Link |
|---|---|---|
| `admin` | **Admin / Ingeniero NOC** | Gobernanza completa del sistema: gestión de usuarios, nodos OLT, Cajas NAP, inventario de ONUs, planes de fibra, declaración/resolución manual o automática de fallas masivas, asignación de cuadrillas y monitoreo de KPIs de red y SLA. |
| `support_agent` | **Agente de Soporte Técnico (N1/N2)** | Búsqueda de suscriptores por contrato/DPI/serie ONU, ejecución de diagnóstico óptico remoto en 1 clic, apertura y seguimiento de tickets, adición de comentarios técnicos y escalamiento a orden de despacho de cuadrilla. |
| `field_tech` | **Técnico de Cuadrilla en Campo** | Consulta de su cuadrilla y órdenes de despacho asignadas (`assigned`, `en_route`, `on_site`, `resolved`), registro de desplazamiento a coordenadas de Caja NAP o domicilio y cierre técnico con lectura de potencia óptica final (`restored_rx_dbm`). |
| `customer` | **Cliente Suscriptor** | Portal personal autenticado: consulta de su contrato y plan activo, verificación temprana de fallas masivas en su zona con tiempo estimado de resolución (ETR), botón de autodiagnóstico remoto de su ONU, creación de tickets y lectura de avances/comentarios públicos. |

---

## 3. Reglas Físicas de Telemetría Óptica FTTH (Umbrales Deterministas)

| Rango de `rx_power_dbm` | Estado (`optical_status`) | Salud (`optical_health`) | Diagnóstico y Acción Recomendada |
|---|---|---|---|
| `-15.00` a `-24.50 dBm` | `online` | `optimal` | Señal óptica saludable dentro de presupuesto GPON. Si el cliente reporta lentitud, revisar canal Wi-Fi o saturación LAN. |
| `-24.51` a `-27.99 dBm` | `high_attenuation` | `warning` | Atenuación óptica elevada (macrocurvatura en patchcord, conector sucio o empalme degradado). Requiere visita preventiva/correctiva si hay microcortes. |
| `<= -28.00 dBm` (ej. `-40.00 dBm`) | `los` | `critical` | Pérdida de señal óptica (*Loss of Signal*). Corte de acometida drop o caída de Caja NAP. Si >= 3 ONUs en la misma NAP tienen `los`, declarar **Falla Masiva**. |
| `NULL` con energía apagada | `power_off` | `warning` | Equipo ONU sin alimentación eléctrica en domicilio (*Dying Gasp*). Solicitar al cliente verificar adaptador de corriente. |
