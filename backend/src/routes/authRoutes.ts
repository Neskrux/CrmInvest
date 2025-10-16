import { Router } from 'express';
import { login, logout, verifyToken, forgotPassword } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import { AuthenticatedHandler } from '../types';

const router = Router();

// Rotas de autenticação
router.post('/login', login);
router.post('/logout', authenticateToken, logout as AuthenticatedHandler);
router.get('/verify-token', authenticateToken, verifyToken as AuthenticatedHandler);
router.post('/forgot-password', forgotPassword);

export default router;
