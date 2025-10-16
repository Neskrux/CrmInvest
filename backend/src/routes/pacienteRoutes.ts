import { Router } from 'express';
import { 
  listPacientes, 
  createPaciente, 
  getPaciente, 
  updatePaciente 
} from '../controllers/pacienteController';
import { authenticateToken } from '../middleware/auth';
import { AuthenticatedHandler } from '../types';

const router = Router();

// Todas as rotas de paciente requerem autenticação
router.use(authenticateToken);

// Listar pacientes
router.get('/', listPacientes as AuthenticatedHandler);

// Criar paciente
router.post('/', createPaciente as AuthenticatedHandler);

// Obter paciente específico
router.get('/:id', getPaciente as AuthenticatedHandler);

// Atualizar paciente
router.put('/:id', updatePaciente as AuthenticatedHandler);

export default router;
