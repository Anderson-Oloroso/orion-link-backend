import { Router } from 'express';
import { Database } from '../config/database.config.js';
import { UserRepository } from '../repositories/user.repository.js';
import { OltRepository, NapBoxRepository, OnuRepository } from '../repositories/topology.repository.js';
import { ServicePlanRepository, ContractRepository } from '../repositories/contract.repository.js';
import { DiagnosticRepository, MassOutageRepository } from '../repositories/diagnostic-outage.repository.js';
import { TicketRepository, CrewRepository, DispatchRepository } from '../repositories/ticket-dispatch.repository.js';
import { AuthService, UserService } from '../services/auth-user.service.js';
import { TopologyService, ContractService } from '../services/topology-contract.service.js';
import { DiagnosticService, MassOutageService, TicketService, DispatchService } from '../services/operations.service.js';
import { AuthController, UserController } from '../controllers/auth-user.controller.js';
import { TopologyController, ContractController, OperationsController } from '../controllers/operations.controller.js';
import { AuthValidator, OperationsValidator } from '../validators/orion.validators.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import { RateLimitMiddleware } from '../middlewares/rate-limit.middleware.js';

/**
 * Composición Orientada a Objetos e Inyección de Dependencias del Enrutador Principal `/api/v1`
 */
const pool = Database.getPool();

// 1. Instancias de Repositorios
const userRepo = new UserRepository(pool);
const oltRepo = new OltRepository(pool);
const napRepo = new NapBoxRepository(pool);
const onuRepo = new OnuRepository(pool);
const planRepo = new ServicePlanRepository(pool);
const contractRepo = new ContractRepository(pool);
const diagnosticRepo = new DiagnosticRepository(pool);
const outageRepo = new MassOutageRepository(pool);
const ticketRepo = new TicketRepository(pool);
const crewRepo = new CrewRepository(pool);
const dispatchRepo = new DispatchRepository(pool);

// 2. Instancias de Servicios
const authService = new AuthService(userRepo);
const userService = new UserService(userRepo);
const topologyService = new TopologyService(oltRepo, napRepo, onuRepo);
const contractService = new ContractService(contractRepo, planRepo);
const diagnosticService = new DiagnosticService(diagnosticRepo, contractRepo);
const outageService = new MassOutageService(outageRepo);
const ticketService = new TicketService(ticketRepo, contractRepo);
const dispatchService = new DispatchService(dispatchRepo, crewRepo);

// 3. Instancias de Controladores
const authController = new AuthController(authService);
const userController = new UserController(userService);
const topologyController = new TopologyController(topologyService);
const contractController = new ContractController(contractService);
const opsController = new OperationsController({
    diagnosticService,
    outageService,
    ticketService,
    dispatchService
});

const apiRouter = Router();

// --- AUTH & SESSION (Público + JWT Cookie/Bearer) ---
apiRouter.get('/auth/roles-directory', userController.handle('listPublicRolesDirectory'));
apiRouter.post('/auth/register', RateLimitMiddleware.authLimiter(), AuthValidator.register(), authController.handle('register'));
apiRouter.post('/auth/login', RateLimitMiddleware.authLimiter(), AuthValidator.login(), authController.handle('login'));
apiRouter.post('/auth/logout', authController.handle('logout'));
apiRouter.get('/auth/me', requireAuth, authController.handle('me'));

// --- USERS & RBAC (Admin / Perfil) ---
apiRouter.get('/users/me', requireAuth, authController.handle('me'));
apiRouter.get('/users', requireAuth, requireRole('admin', 'support_agent'), userController.handle('list'));
apiRouter.post('/users', requireAuth, requireRole('admin'), AuthValidator.register(), userController.handle('create'));
apiRouter.put('/users/:id', requireAuth, requireRole('admin'), userController.handle('update'));
apiRouter.delete('/users/:id', requireAuth, requireRole('admin'), userController.handle('deactivate'));

// --- PLANS & SUBSCRIBER CONTRACTS ---
apiRouter.get('/plans', contractController.handle('listPlans'));
apiRouter.post('/plans', requireAuth, requireRole('admin'), contractController.handle('createPlan'));
apiRouter.get('/contracts/me', requireAuth, contractController.handle('listMyContracts'));
apiRouter.get('/contracts', requireAuth, requireRole('admin', 'support_agent', 'field_tech'), contractController.handle('listContracts'));
apiRouter.get('/contracts/:id', requireAuth, contractController.handle('getContractById'));
apiRouter.post('/contracts', requireAuth, requireRole('admin', 'support_agent'), contractController.handle('createContract'));

// --- FTTH NETWORK TOPOLOGY (OLTs, Cajas NAP, ONUs) ---
apiRouter.get('/topology/olts', requireAuth, requireRole('admin', 'support_agent', 'field_tech'), topologyController.handle('listOlts'));
apiRouter.post('/topology/olts', requireAuth, requireRole('admin'), topologyController.handle('createOlt'));
apiRouter.get('/topology/naps', topologyController.handle('listNaps'));
apiRouter.post('/topology/naps', requireAuth, requireRole('admin'), topologyController.handle('createNap'));
apiRouter.get('/topology/onus', requireAuth, requireRole('admin', 'support_agent', 'field_tech'), topologyController.handle('listOnus'));
apiRouter.post('/topology/onus', requireAuth, requireRole('admin', 'support_agent'), topologyController.handle('createOnu'));

// --- REMOTE OPTICAL DIAGNOSTICS (dBm) ---
apiRouter.get('/diagnostics', requireAuth, opsController.handle('listDiagnostics'));
apiRouter.post('/diagnostics/run', requireAuth, OperationsValidator.runDiagnostic(), opsController.handle('runDiagnostic'));

// --- MASS OUTAGES (Detección Temprana FTTH) ---
apiRouter.get('/outages', opsController.handle('listOutages'));
apiRouter.post('/outages', requireAuth, requireRole('admin', 'support_agent'), opsController.handle('declareOutage'));
apiRouter.put('/outages/:id/resolve', requireAuth, requireRole('admin', 'support_agent'), opsController.handle('resolveOutage'));

// --- SUPPORT TICKETS & COMMENTS ---
apiRouter.get('/tickets', requireAuth, opsController.handle('listTickets'));
apiRouter.get('/tickets/:id', requireAuth, opsController.handle('getTicketById'));
apiRouter.post('/tickets', requireAuth, OperationsValidator.createTicket(), opsController.handle('createTicket'));
apiRouter.put('/tickets/:id/status', requireAuth, requireRole('admin', 'support_agent', 'field_tech'), opsController.handle('updateTicketStatus'));
apiRouter.post('/tickets/:id/comments', requireAuth, OperationsValidator.addComment(), opsController.handle('addTicketComment'));

// --- TECHNICAL CREWS & FIELD DISPATCH ORDERS ---
apiRouter.get('/crews', requireAuth, requireRole('admin', 'support_agent', 'field_tech'), opsController.handle('listCrews'));
apiRouter.get('/dispatches', requireAuth, requireRole('admin', 'support_agent', 'field_tech'), opsController.handle('listDispatches'));
apiRouter.post('/dispatches', requireAuth, requireRole('admin', 'support_agent'), OperationsValidator.createDispatch(), opsController.handle('createDispatch'));
apiRouter.put('/dispatches/:id/state', requireAuth, requireRole('admin', 'support_agent', 'field_tech'), opsController.handle('updateDispatchState'));
apiRouter.put('/dispatches/:id/complete', requireAuth, requireRole('admin', 'field_tech'), OperationsValidator.completeDispatch(), opsController.handle('completeDispatch'));

// --- DASHBOARD EXECUTIVE SUMMARY ---
apiRouter.get('/dashboard/summary', opsController.handle('getDashboardSummary'));

export default apiRouter;
