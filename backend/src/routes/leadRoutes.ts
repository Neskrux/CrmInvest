import { Router } from 'express';
import { 
  listLeads, 
  capturarLead,
  createLead, 
  getLead, 
  updateLead,
  converterLeadEmPaciente
} from '../controllers/leadController';
import { authenticateToken } from '../middleware/auth';
import { AuthenticatedHandler } from '../types';

const router = Router();

// Rota pública para capturar leads (sem autenticação)
router.post('/capturar', capturarLead);

// Todas as outras rotas de lead requerem autenticação
router.use(authenticateToken);

// Listar leads
router.get('/', listLeads as AuthenticatedHandler);

// Criar lead
router.post('/', createLead as AuthenticatedHandler);

// Obter lead específico
router.get('/:id', getLead as AuthenticatedHandler);

// Atualizar lead
router.put('/:id', updateLead as AuthenticatedHandler);

// Converter lead em paciente
router.post('/:id/converter', converterLeadEmPaciente as AuthenticatedHandler);

export default router;
