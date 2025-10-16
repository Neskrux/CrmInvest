import { Router } from 'express';
import { 
  listConsultores, 
  createConsultor, 
  getConsultor, 
  getLinksPersonalizados, 
  updateConsultor 
} from '../controllers/consultorController';
import { authenticateToken, requireAdminOrEmpresa } from '../middleware/auth';
import { AuthenticatedHandler } from '../types';

const router = Router();

// Todas as rotas de consultor requerem autenticação
router.use(authenticateToken);

// Listar consultores
router.get('/', listConsultores as AuthenticatedHandler);

// Criar consultor (apenas admin ou empresa)
router.post('/', requireAdminOrEmpresa, createConsultor as AuthenticatedHandler);

// Obter consultor específico
router.get('/:id', getConsultor as AuthenticatedHandler);

// Obter links personalizados do consultor
router.get('/:id/links', getLinksPersonalizados as AuthenticatedHandler);

// Atualizar consultor
router.put('/:id', updateConsultor as AuthenticatedHandler);

export default router;
