import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { complaintController } from '../controllers/complaintController.js';
import { authMiddleware } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.resolve(__dirname, '../../../uploads/complaints');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `evidence-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (allowed.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Invalid image format. Allowed formats: JPEG, PNG, WebP.'));
    }
  }
});

const router = Router();

// Draft pre-analysis (Conversational AI scan)
router.post('/pre-analyze', complaintController.preAnalyze);

// Upload camera evidence image
router.post('/upload-media', upload.single('media'), complaintController.uploadMedia);

// Citizen complaints
router.post('/', authMiddleware, complaintController.create);
router.get('/citizen/my-reports', authMiddleware, complaintController.getMyReports);
router.get('/:id', authMiddleware, complaintController.getById);
router.post('/:id/verify', authMiddleware, complaintController.verify);

export default router;
