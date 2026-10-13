import { Router } from 'express';
import { masterController } from '../controllers/masterController.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();

// Protect with Master Admin RBAC
router.use(authMiddleware);
router.use(requireRole(['master_admin']));

// Global Overview
router.get('/overview', masterController.getOverview);

// Municipalities CRUD
router.get('/municipalities', masterController.listMunicipalities);
router.post('/municipalities', masterController.createMunicipality);
router.patch('/municipalities/:id', masterController.updateMunicipality);

// PIN Codes Coverage Management
router.get('/pincodes', masterController.listPincodes);
router.post('/municipalities/:id/pincodes', masterController.addPincodes);

// Routing Review Queue (Unmapped PINs)
router.get('/routing-queue', masterController.getRoutingQueue);
router.post('/routing-queue/:id/assign-municipality', masterController.assignMunicipalityToUnmapped);

// Audit Trail & AI Governance
router.get('/audit-logs', masterController.getAuditLogs);
router.get('/ai-governance', masterController.getAiGovernance);

export default router;
