import { Router } from 'express';
import { getProfile, updateProfile, listEmpresas } from '../controllers/empresaController';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { AuthenticatedHandler } from '../types';

const router = Router();

// Rotas para empresas
router.get('/perfil', authenticateToken, getProfile as AuthenticatedHandler);
router.put('/perfil', authenticateToken, updateProfile as AuthenticatedHandler);

// Rota para listar empresas (apenas admin)
router.get('/', authenticateToken, requireAdmin, listEmpresas as AuthenticatedHandler);

export default router;
