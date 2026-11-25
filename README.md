# Orion Link — Backend (`orion-link-backend`)

API REST empresarial y motor de operaciones FTTH para **Orion Link**, un Sistema CRM de Soporte Técnico y Operaciones ISP que centraliza la atención al cliente suscriptor, el diagnóstico óptico remoto (`OLT → Caja NAP → ONU`), la detección temprana de fallas masivas en red de fibra óptica y el despacho de cuadrillas técnicas en campo.

## Objetivo

Proveer una arquitectura backend **100% Orientada a Objetos (OOP)** con herencia, polimorfismo, encapsulamiento e inyección de dependencias sobre **Node.js 20+ (ES Modules)**, **Express 5** y **MySQL 8.0 (`InnoDB`)**, garantizando seguridad en la frontera desde el primer commit, transacciones ACID y reproducibilidad total con **Docker Compose**.

## Funcionalidades Principales

- **Autenticación Dual JWT + Cookies `HttpOnly` y RBAC de 4 Roles:** Emisión simultánea de cookie segura (`orion_access_token`) y token Bearer para los roles `admin` (NOC), `support_agent` (Soporte N1/N2), `field_tech` (Técnico de Cuadrilla) y `customer` (Cliente Suscriptor).
- **Jerarquía Polimórfica de Errores y Capas Base OOP:**
  - `AppError extends Error` con subclases polimórficas (`ValidationError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, `DatabaseError`).
  - Clases base abstractas: `BaseRepository`, `BaseService`, `BaseController`, `BaseDTO` y `BaseValidator`.
- **Topología FTTH y Contratos:** Gestión de nodos OLT, Cajas NAP con control automático de puertos splitter por triggers, terminales ONUs, planes simétricos y contratos de suscriptores.
- **Motor de Diagnóstico Remoto y Correlación de Fallas Masivas (`sp_run_remote_diagnostic`):** Evalúa potencia óptica (`rx_power_dbm`, `tx_power_dbm`), latencia y pérdida de paquetes; si una Caja NAP alcanza `>= 3` ONUs en pérdida de señal (`los`), declara o actualiza automáticamente una falla masiva en `mass_outages` y agrupa los tickets abiertos de esa NAP.
- **Despacho y Cierre Certificado de Cuadrillas (`sp_complete_dispatch_order`):** Las órdenes de trabajo en campo exigen lectura óptica restaurada (`-14.00` a `-25.00 dBm`), restaurando en una sola transacción InnoDB la ONU, la Caja NAP, el ticket y la disponibilidad de la cuadrilla.

## Tecnologías

| Tecnología | Uso en `orion-link-backend` |
|---|---|
| Node.js 20+ (ES Modules) y Express 5 | Servidor HTTP y arquitectura modular por capas OOP. |
| MySQL 8.0 (`InnoDB`) y `mysql2/promise` | Persistencia relacional ACID, Connection Pool, Triggers y Stored Procedures. |
| JWT, Passport JWT, `cookie-parser` y `bcrypt` | Autenticación dual (Cookie `HttpOnly` + Bearer), autorización RBAC y hash de contraseñas. |
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
│   ├── middlewares/                # AuthMiddleware (RBAC), ErrorMiddleware, RateLimit, SecurityHeaders
│   ├── repositories/               # Acceso a datos parametrizado con mysql2/promise
│   ├── routes/                     # Enrutador principal /api/v1 con inyección de dependencias
│   ├── services/                   # Lógica de dominio, diagnóstico óptico y correlación NOC
│   ├── utils/                      # AppError (polimórfico), Logger y OpticalTelemetryClassifier
│   ├── validators/                 # Esquemas de validación con express-validator
│   ├── app.js                      # Clase App (Express, CORS, Cookies, Swagger, Rutas)
│   └── server.js                   # Clase Server (arranque y verificación de pool MySQL)
├── tests/
│   └── orion-oop.test.js           # Suite de pruebas unitarias (AppError, GPON Classifier, DTOs)
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
| **Autenticación** | `POST /auth/login`, `POST /auth/register`, `POST /auth/logout`, `GET /auth/me` | Público / JWT | Emite cookie `HttpOnly` `orion_access_token` + token Bearer. |
| **Usuarios** | `GET /users`, `POST /users`, `PUT /users/:id`, `DELETE /users/:id` | `admin` (`support_agent` lectura) | Gestión de cuentas y baja lógica sin pérdida de historial. |
| **Topología FTTH** | `GET /topology/olts`, `GET /topology/naps`, `GET /topology/onus` | Autenticados (`POST` `admin`) | Inventario de OLTs, Cajas NAP con salud óptica y ONUs. |
| **Planes y Contratos** | `GET /plans`, `GET /contracts`, `GET /contracts/me`, `POST /contracts` | `customer` ve los suyos; staff ve todos | Planes simétricos FTTH y contratos vinculados a ONU y NAP. |
| **Diagnóstico Remoto** | `GET /diagnostics`, `POST /diagnostics/run` | Todos los roles (validando propiedad) | Ejecuta `sp_run_remote_diagnostic` y correlaciona fallas masivas. |
| **Fallas Masivas** | `GET /outages`, `POST /outages`, `PUT /outages/:id/resolve` | Consulta general; mutación `admin`/`support_agent` | Alertas tempranas de caída de Caja NAP o corte de fibra. |
| **Tickets Soporte** | `GET /tickets`, `GET /tickets/:id`, `POST /tickets`, `PUT /tickets/:id/status`, `POST /tickets/:id/comments` | Todos los roles con filtro RBAC | Creación, triaje, SLA y bitácora de comentarios públicos/internos. |
| **Cuadrillas y Despacho** | `GET /crews`, `GET /dispatches`, `POST /dispatches`, `PUT /dispatches/:id/state`, `PUT /dispatches/:id/complete` | `admin`, `support_agent`, `field_tech` | Despacho a campo y cierre con certificación óptica en `dBm`. |

## Autoría

- **Autor:** Henrik Anderson Oloroso García ([Anderson-Oloroso](https://github.com/Anderson-Oloroso)).
