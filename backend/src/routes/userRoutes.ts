import { Router } from 'express';
import { getProfile, updateProfile, changePassword } from '../controllers/userController';
import { authenticateToken } from '../middleware/auth';
import { AuthenticatedHandler } from '../types';

const router = Router();

// Todas as rotas de usuário requerem autenticação
router.use(authenticateToken);

// Rotas de perfil
router.get('/perfil', getProfile as AuthenticatedHandler);
router.put('/perfil', updateProfile as AuthenticatedHandler);
router.put('/senha', changePassword as AuthenticatedHandler);

export default router;
