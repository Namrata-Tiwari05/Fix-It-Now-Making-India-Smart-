import { Router } from 'express';
import { officerController } from '../controllers/officerController.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();

// Protect with Field Officer / Admin RBAC
router.use(authMiddleware);
router.use(requireRole(['field_officer', 'municipal_admin', 'master_admin']));

// Operational tasks
router.get('/assignments', officerController.getMyAssignments);
router.patch('/complaints/:id/status', officerController.updateStatus);
router.post('/complaints/:id/resolution', officerController.submitResolution);

export default router;
