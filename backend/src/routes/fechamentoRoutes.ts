import { Router } from 'express';
import { 
  listFechamentos, 
  createFechamento, 
  getFechamento, 
  updateFechamento,
  aprovarFechamento,
  rejeitarFechamento
} from '../controllers/fechamentoController';
import { authenticateToken } from '../middleware/auth';
import { AuthenticatedHandler } from '../types';

const router = Router();

// Todas as rotas de fechamento requerem autenticação
router.use(authenticateToken);

// Listar fechamentos
router.get('/', listFechamentos as AuthenticatedHandler);

// Criar fechamento
router.post('/', createFechamento as AuthenticatedHandler);

// Obter fechamento específico
router.get('/:id', getFechamento as AuthenticatedHandler);

// Atualizar fechamento
router.put('/:id', updateFechamento as AuthenticatedHandler);

// Aprovar fechamento (apenas admin)
router.patch('/:id/aprovar', aprovarFechamento as AuthenticatedHandler);

// Rejeitar fechamento (apenas admin)
router.patch('/:id/rejeitar', rejeitarFechamento as AuthenticatedHandler);

export default router;
