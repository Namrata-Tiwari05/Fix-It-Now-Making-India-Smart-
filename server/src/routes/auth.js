import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { authController } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.resolve(__dirname, '../../../uploads/avatars');
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
    cb(null, `avatar-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
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

// --- Citizen Phone OTP Routes ---
router.post('/citizen/send-otp', authController.citizenSendOtp);
router.post('/citizen/verify-otp', authController.citizenVerifyOtp);
router.post('/citizen/upload-avatar', upload.single('avatar'), authController.uploadAvatar);
router.post('/citizen/onboard', authController.citizenOnboard);

// --- Shared Staff Login (Master Admin, Municipal Admin, Field Officer) ---
router.post('/staff/login', authController.staffLogin);

// --- Current Session Profile ---
router.get('/me', authMiddleware, authController.getMe);

export default router;
