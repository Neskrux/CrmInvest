import { Router } from 'express';
import { 
  getLeadCount,
  getClinicasCount,
  updateLeadCount,
  updateClinicasCount
} from '../controllers/auxiliaryController';
import { authenticateToken } from '../middleware/auth';
import { AuthenticatedHandler } from '../types';

const router = Router();

// Todas as rotas auxiliares requerem autenticação
router.use(authenticateToken);

// Obter contagem de leads não atribuídos
router.get('/lead-count', getLeadCount as AuthenticatedHandler);

// Obter contagem de novas clínicas
router.get('/clinicas-count', getClinicasCount as AuthenticatedHandler);

// Atualizar contagem de leads (trigger manual)
router.post('/update-lead-count', updateLeadCount as AuthenticatedHandler);

// Atualizar contagem de clínicas (trigger manual)
router.post('/update-clinicas-count', updateClinicasCount as AuthenticatedHandler);

export default router;
