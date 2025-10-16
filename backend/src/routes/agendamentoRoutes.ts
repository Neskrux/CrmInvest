import { Router } from 'express';
import { 
  listAgendamentos, 
  createAgendamento, 
  getAgendamento, 
  updateAgendamento,
  cancelAgendamento
} from '../controllers/agendamentoController';
import { authenticateToken } from '../middleware/auth';
import { AuthenticatedHandler } from '../types';

const router = Router();

// Todas as rotas de agendamento requerem autenticação
router.use(authenticateToken);

// Listar agendamentos
router.get('/', listAgendamentos as AuthenticatedHandler);

// Criar agendamento
router.post('/', createAgendamento as AuthenticatedHandler);

// Obter agendamento específico
router.get('/:id', getAgendamento as AuthenticatedHandler);

// Atualizar agendamento
router.put('/:id', updateAgendamento as AuthenticatedHandler);

// Cancelar agendamento
router.patch('/:id/cancel', cancelAgendamento as AuthenticatedHandler);

export default router;
