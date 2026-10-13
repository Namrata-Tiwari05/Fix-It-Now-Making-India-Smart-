import { Router } from 'express';
import { db } from '../services/db/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { successResponse } from '../utils/response.js';

const router = Router();

router.use(authMiddleware);

// Get user notifications
router.get('/', (req, res) => {
  const list = db.getNotifications(req.user.id, req.user.role);
  return successResponse(res, list);
});

// Mark all as read
router.post('/mark-read', (req, res) => {
  const list = db.getNotifications(req.user.id, req.user.role);
  list.forEach(n => { n.is_read = true; });
  return successResponse(res, { success: true }, 'All notifications marked as read');
});

export default router;
