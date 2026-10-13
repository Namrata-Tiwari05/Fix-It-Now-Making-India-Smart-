import { Router } from 'express';
import { municipalController } from '../controllers/municipalController.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole, requireMunicipality } from '../middleware/rbac.js';

const router = Router();

// Protect with Municipal Admin / Master Admin RBAC & Municipality isolation
router.use(authMiddleware);
router.use(requireRole(['municipal_admin', 'master_admin']));
router.use(requireMunicipality);

// Municipal Dashboard Overview
router.get('/overview', municipalController.getOverview);

// Municipal Complaints Queue
router.get('/complaints', municipalController.listComplaints);
router.patch('/complaints/:id/assign', municipalController.assign);
router.patch('/complaints/:id/status', municipalController.updateStatus);
router.post('/complaints/:id/ai-override', municipalController.overrideAI);
router.post('/complaints/:id/link-duplicate', municipalController.linkDuplicate);
router.post('/complaints/:id/verify-resolution', municipalController.verifyResolution);

// Municipal Operational Resources
router.get('/departments', municipalController.getDepartments);
router.post('/departments', municipalController.createDepartment);
router.get('/officers', municipalController.getOfficers);
router.post('/officers', municipalController.createOfficer);

// Municipal Analytics & Settings
router.get('/analytics', municipalController.getAnalytics);
router.get('/settings', municipalController.getSettings);
router.patch('/settings', municipalController.updateSettings);

export default router;
