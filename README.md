# Orion Link — Backend (`orion-link-backend`)

<p align="center">
  <img src="./docs/assets/orion-link-logo.png" alt="Orion Link Logo Oficial" width="420">
</p>

API REST empresarial y motor de operaciones FTTH para **Orion Link**, un Sistema CRM de Soporte Técnico y Operaciones ISP que centraliza la atención al cliente suscriptor, el diagnóstico óptico remoto (`OLT → Caja NAP → ONU`), la detección temprana de fallas masivas en red de fibra óptica y el despacho de cuadrillas técnicas en campo.

## Ecosistema de Repositorios Hermanos y Despliegues en Producción (`Orion Link`)

| Componente | Plataforma Cloud / URL en Vivo | Enlace Oficial en GitHub |
|---|---|---|
| **`orion-link-backend`** *(este repositorio)* | **Railway (Node.js 20+ + MySQL 8.0 InnoDB):** [`https://orion-link-backend-production.up.railway.app/api/v1/health`](https://orion-link-backend-production.up.railway.app/api/v1/health) · **Swagger UI:** [`/api-docs`](https://orion-link-backend-production.up.railway.app/api-docs) | [github.com/Anderson-Oloroso/orion-link-backend](https://github.com/Anderson-Oloroso/orion-link-backend) |
| **`orion-link-frontend`** *(repositorio hermano)* | **Netlify (HTML5, CSS3 Bitema & Vanilla JS OOP Multipágina):** [`https://orion-link-frontend.netlify.app`](https://orion-link-frontend.netlify.app) | [github.com/Anderson-Oloroso/orion-link-frontend](https://github.com/Anderson-Oloroso/orion-link-frontend) |

---

## ¿Qué es en realidad Orion Link y cómo funciona?

En un proveedor de internet por fibra óptica hasta el hogar (**FTTH / GPON**), el mayor problema operativo ocurre cuando múltiples clientes llaman por falta de servicio y el centro de soporte no distingue entre una falla individual (el router ONU de una casa desconectado o un patchcord doblado) y una **caída masiva de planta externa** (un camión cortó el cable troncal o una Caja NAP en un poste sufrió vandalismo).

**Orion Link** resuelve esa brecha unificando en un solo motor transaccional:

1. **Jerarquía Física Real de Red GPON (`OLT → Caja NAP → ONU → Contrato`):**
   - **OLT (`olts`):** Cabecera óptica en el nodo central del ISP que ilumina las fibras troncales.
   - **Caja NAP (`nap_boxes`):** Caja de distribución instalada en poste o cámara subterránea con un splitter óptico (`1:8` o `1:16`). Un trigger InnoDB (`trg_onu_after_insert_nap_ports`) controla automáticamente cuántos puertos quedan libres u ocupados.
   - **Terminal ONU (`onus`):** El módem/router óptico dentro de la casa o empresa del cliente conectado a un puerto específico de su Caja NAP.
   - **Contrato de Suscriptor (`service_contracts`):** Vincula al cliente (`customer`) con un plan simétrico (`service_plans`) y su ONU física.

2. **Diagnóstico Óptico Remoto Determinístico (`sp_run_remote_diagnostic`):**
   - Cada vez que un cliente o un agente ejecuta un diagnóstico remoto, el motor mide la potencia óptica recibida (`rx_power_dbm`), potencia transmitida (`tx_power_dbm`), latencia y pérdida de paquetes:
     - **`-14.00 dBm` a `-25.00 dBm` (`online` / Óptimo):** Señal láser saludable; servicio operando al 100%.
     - **`-25.01 dBm` a `-27.99 dBm` (`high_attenuation` / Atenuación Alta):** Microcurvatura en fibra drop o conector sucio; degradación preventiva.
     - **`<= -28.00 dBm` o `-40.00 dBm` (`los` / Loss of Signal):** Pérdida total de luz óptica; corte físico de fibra.

3. **Correlación Automática de Fallas Masivas (`mass_outages`):**
   - Dentro del procedimiento almacenado `sp_run_remote_diagnostic`, cada vez que una ONU cae en estado `los`, MySQL cuenta cuántas ONUs hermanas conectadas a esa **misma Caja NAP** están también en `los`.
   - Si **`>= 3` ONUs de la misma Caja NAP** están sin luz (`los`), Orion Link **declara automáticamente una Falla Masiva (`mass_outages`)**, marca la Caja NAP como `degraded` o `outage` y agrupa los tickets abiertos de ese sector para no enviar 8 técnicos distintos al mismo poste.

4. **Despacho de Cuadrillas y Cierre con Certificación Óptica (`sp_complete_dispatch_order`):**
   - Cuando la mesa de ayuda o el NOC despacha una cuadrilla (`field_tech`) al sitio (`dispatch_orders`), el sistema **prohíbe cerrar la orden con un simple clic**.
   - El técnico de campo está obligado a ingresar la lectura de su medidor de potencia óptica tras fusionar o reparar la fibra (`final_rx_power_dbm` entre **`-14.00` y `-25.00 dBm`**) y los metros de cable drop utilizados. En una sola transacción ACID, MySQL certifica la ONU en `online`, restaura la Caja NAP a `operational`, cierra el ticket y libera la cuadrilla.

---

## Función y Operación de Cada Rol en el Sistema (RBAC de 4 Roles)

Orion Link separa estrictamente tanto los permisos de endpoints en el backend como la experiencia de consola polimórfica en el frontend para sus **4 roles autenticados**:

| Rol (`users.role`) | Nombre Operativo | Función Real en el ISP | Capacidades y Permisos en `orion-link-backend` |
|---|---|---|---|
| **`admin`** | **Administrador NOC / Planta Externa** | Supervisa la salud global de la red FTTH, administra la infraestructura (`OLT`, `Cajas NAP`, `ONUs`), declara o resuelve cortes masivos de fibra y audita las cuentas RBAC del personal y clientes. | Acceso total: alta de Cajas NAP (`POST /topology/naps`), alta de contratos (`POST /contracts`), declaración manual y resolución de fallas masivas (`POST /outages`, `PUT /outages/:id/resolve`), despacho de cuadrillas y auditoría completa de usuarios (`GET/POST/PUT/DELETE /users`). |
| **`support_agent`** | **Agente de Soporte Técnico N1 / N2** | Atiende la cola de tickets de clientes, ejecuta pruebas remotas de telemetría GPON sobre cualquier contrato para diagnosticar si el problema es de configuración Wi-Fi (N1) o físico de fibra (N2), y escala a cuadrilla cuando hay atenuación o `LOS`. | Ve todos los contratos y tickets del ISP, ejecuta diagnósticos remotos con inyección de lecturas de prueba (`POST /diagnostics/run`), resuelve tickets N1 remotos (`PUT /tickets/:id/status`), agrega notas técnicas y genera órdenes de despacho (`POST /dispatches`). |
| **`field_tech`** | **Técnico de Cuadrilla de Campo** | Recibe en su hoja de ruta las órdenes de despacho en calle, se traslada al poste/Caja NAP o domicilio del cliente, repara o fusiona la fibra óptica y certifica la potencia láser final en `dBm`. | Opera el ciclo de vida en campo (`PUT /dispatches/:id/state` → `en_route`, `on_site`) y ejecuta el cierre técnico certificado con medidor óptico (`PUT /dispatches/:id/complete` validando `-14.00` a `-25.00 dBm` y metraje de fibra). |
| **`customer`** | **Cliente Suscriptor FTTH** | Consulta el estado real de su servicio contratado, verifica si su zona/Caja NAP presenta una falla masiva reportada, ejecuta autodiagnóstico remoto de su router ONU y abre tickets de soporte. | Aislamiento estricto por propiedad: solo ve sus propios contratos (`GET /contracts/me`), solo puede diagnosticar sus propios contratos (`POST /diagnostics/run`) y solo ve o comenta sus propios tickets (`GET/POST /tickets`). |

---

## Seguridad de Sesión, Revocación de JWT y Protección Anti-Caché (`bfcache`)

Para evitar que una sesión cerrada pueda visualizarse al presionar el botón **"Atrás"** del navegador:

1. **Identificador Único de Token (`jti`) y Lista de Revocación en Servidor (`TokenService`):**
   - Cada JWT emitido incluye un `jti` (`crypto.randomUUID()`).
   - Al invocar `POST /api/v1/auth/logout`, el backend extrae el token (de la cookie `HttpOnly` `orion_access_token` o del header `Authorization: Bearer`), lo registra inmediatamente en el registro de tokens revocados (`TokenService.revokeToken`) y limpia la cookie `HttpOnly`.
   - Cualquier petición posterior con ese mismo token es rechazada en `PassportConfig` (`TokenService.isRevoked`) con `401 Unauthorized`, incluso antes de que expire su TTL original.
2. **Cabeceras HTTP Anti-Almacenamiento en Rutas Autenticadas (`AuthMiddleware`):**
   - Todo endpoint protegido por `AuthMiddleware.requireAuth()` emite `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate, private`, `Pragma: no-cache` y `Expires: 0`, impidiendo que proxies o el navegador almacenen respuestas privadas.

---

## Tecnologías

| Tecnología | Uso en `orion-link-backend` |
|---|---|
| Node.js 20+ (ES Modules) y Express 5 | Servidor HTTP y arquitectura modular por capas 100% OOP. |
| MySQL 8.0 (`InnoDB`) y `mysql2/promise` | Persistencia relacional ACID, Connection Pool, Triggers y Stored Procedures. |
| JWT (`jti` revocable), Passport JWT, `cookie-parser` y `bcrypt` | Autenticación dual (Cookie `HttpOnly` + Bearer), revocación en logout, RBAC y hash de contraseñas. |
| `express-validator`, `cors` y `express-rate-limit` | Validación declarativa de entradas, lista blanca de orígenes y límite de peticiones. |
| Docker & Docker Compose | Contenerización orquestada de MySQL 8.0 (con healthcheck) y la API Node.js. |
| Swagger UI & Bruno (`bruno/`) | Documentación OpenAPI 3.0 en `/api-docs` y colección HTTP reproducible. |

## Estructura del Proyecto

```text
orion-link-backend/
├── bruno/orion-link/               # Colección Bruno lista para probar endpoints
├── database/
│   ├── ddl/01-schema.sql           # Esquema físico de 13 tablas MySQL 8.0 InnoDB
│   ├── dml/02-seeds.sql            # Datos semilla para los 4 roles y topología FTTH
│   ├── dml/03-procedures-triggers.sql # Triggers y Stored Procedures transaccionales
│   ├── dql/04-queries.sql          # Consultas analíticas del NOC y reportes SLA
│   ├── diagram/                    # Diagrama físico HTML/SVG del esquema InnoDB
│   └── README.md                   # Detalle de tablas, reglas y credenciales semilla
├── docs/
│   └── diagrams/                   # Diagramas editoriales HTML/SVG (Esquema, Arquitectura, Flujo)
├── requirements/
│   └── requirements.md             # Requisitos funcionales y reglas físicas GPON (dBm)
├── src/
│   ├── config/                     # EnvConfig, Database Pool, JwtConfig, Passport, Swagger, SemVer
│   ├── core/                       # Clases base OOP (BaseRepository, BaseService, BaseController, BaseDTO, BaseValidator)
│   ├── controllers/                # Controladores HTTP orientados a objetos
│   ├── dtos/                       # Data Transfer Objects polimórficos
│   ├── middlewares/                # AuthMiddleware (RBAC + no-store), ErrorMiddleware, RateLimit, SecurityHeaders
│   ├── repositories/               # Acceso a datos parametrizado con mysql2/promise
│   ├── routes/                     # Enrutador principal /api/v1 con inyección de dependencias
│   ├── services/                   # Lógica de dominio, TokenService (jti revocable) y correlación NOC
│   ├── utils/                      # AppError (polimórfico), Logger y OpticalTelemetryClassifier
│   ├── validators/                 # Esquemas de validación con express-validator
│   ├── app.js                      # Clase App (Express, CORS, Cookies, Swagger, Rutas)
│   └── server.js                   # Clase Server (arranque y verificación de pool MySQL)
├── tests/
│   └── orion-oop.test.js           # Suite de pruebas unitarias (AppError, GPON Classifier, DTOs, JWT Revocation)
├── .dockerignore
├── .env.example
├── .gitignore
├── docker-compose.yml
├── Dockerfile
├── package.json
└── README.md
```

## Cómo Ejecutarlo con Docker Compose (Recomendado)

1. Copie la plantilla de variables de entorno:
   ```bash
   cp .env.example .env
   ```
2. Construya e inicie los contenedores de MySQL 8.0 InnoDB y la API:
   ```bash
   docker compose up --build -d
   ```
3. Verifique el estado del servicio y explore la documentación:
   - **Healthcheck:** `http://localhost:5000/api/v1/health`
   - **Swagger UI:** `http://localhost:5000/api-docs`

## Cómo Ejecutarlo en Desarrollo Local (Sin Docker para la API)

1. Configure en `.env` `DB_HOST=127.0.0.1` y `DB_PORT=3308` (o el puerto de su instancia local MySQL 8.0 tras ejecutar `01-schema.sql`, `02-seeds.sql` y `03-procedures-triggers.sql`).
2. Instale dependencias, ejecute las pruebas y levante el servidor:
   ```bash
   npm install
   npm test
   npm run dev
   ```

## Endpoints Principales (`/api/v1`)

| Módulo | Método y Ruta | Roles Permitidos | Descripción |
|---|---|---|---|
| **Salud** | `GET /health` | Público | Verifica estado de la API y motor MySQL InnoDB. |
| **Autenticación** | `POST /auth/login`, `POST /auth/register`, `POST /auth/logout`, `GET /auth/me` | Público / JWT | Emite y revoca cookie `HttpOnly` `orion_access_token` + token Bearer. |
| **Usuarios** | `GET /users`, `POST /users`, `PUT /users/:id`, `DELETE /users/:id` | `admin` (`support_agent` lectura) | Gestión de cuentas y baja lógica sin pérdida de historial. |
| **Topología FTTH** | `GET /topology/olts`, `GET /topology/naps`, `GET /topology/onus` | Autenticados (`POST` `admin`) | Inventario de OLTs, Cajas NAP con salud óptica y ONUs. |
| **Planes y Contratos** | `GET /plans`, `GET /contracts`, `GET /contracts/me`, `POST /contracts` | `customer` ve los suyos; staff ve todos | Planes simétricos FTTH y contratos vinculados a ONU y NAP. |
| **Diagnóstico Remoto** | `GET /diagnostics`, `POST /diagnostics/run` | Todos los roles (validando propiedad) | Ejecuta `sp_run_remote_diagnostic` y correlaciona fallas masivas. |
| **Fallas Masivas** | `GET /outages`, `POST /outages`, `PUT /outages/:id/resolve` | Consulta general; mutación `admin`/`support_agent` | Alertas tempranas de caída de Caja NAP o corte de fibra. |
| **Tickets Soporte** | `GET /tickets`, `GET /tickets/:id`, `POST /tickets`, `PUT /tickets/:id/status`, `POST /tickets/:id/comments` | Todos los roles con filtro RBAC | Creación, triaje, SLA y bitácora de comentarios públicos/internos. |
| **Cuadrillas y Despacho** | `GET /crews`, `GET /dispatches`, `POST /dispatches`, `PUT /dispatches/:id/state`, `PUT /dispatches/:id/complete` | `admin`, `support_agent`, `field_tech` | Despacho a campo y cierre con certificación óptica en `dBm`. |

## Autoría

- **Autor:** Henrik Anderson Oloroso García ([Anderson-Oloroso](https://github.com/Anderson-Oloroso)).
