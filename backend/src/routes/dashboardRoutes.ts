import { Router } from 'express';
import { 
  getDashboard,
  getDashboardPacientes,
  getDashboardAgendamentos,
  getDashboardFechamentos,
  getDashboardGeraisPacientes,
  getDashboardGeraisAgendamentos,
  getDashboardGeraisFechamentos,
  getDashboardGeraisClinicas
} from '../controllers/dashboardController';
import { authenticateToken } from '../middleware/auth';
import { AuthenticatedHandler } from '../types';

const router = Router();

// Todas as rotas de dashboard requerem autenticação
router.use(authenticateToken);

// ===== DASHBOARD PRINCIPAL =====

// Dashboard principal com estatísticas gerais
router.get('/', getDashboard as AuthenticatedHandler);

// ===== DASHBOARD ESPECÍFICOS =====

// Pacientes do dashboard (com filtros por tipo de usuário)
router.get('/pacientes', getDashboardPacientes as AuthenticatedHandler);

// Agendamentos do dashboard (com filtros por tipo de usuário)
router.get('/agendamentos', getDashboardAgendamentos as AuthenticatedHandler);

// Fechamentos do dashboard (com filtros por tipo de usuário)
router.get('/fechamentos', getDashboardFechamentos as AuthenticatedHandler);

// ===== DASHBOARD GERAIS (APENAS ADMIN) =====

// Todos os pacientes (apenas admin)
router.get('/gerais/pacientes', getDashboardGeraisPacientes as AuthenticatedHandler);

// Todos os agendamentos (apenas admin)
router.get('/gerais/agendamentos', getDashboardGeraisAgendamentos as AuthenticatedHandler);

// Todos os fechamentos (apenas admin)
router.get('/gerais/fechamentos', getDashboardGeraisFechamentos as AuthenticatedHandler);

// Todas as clínicas (apenas admin) - para gráfico de cidades
router.get('/gerais/clinicas', getDashboardGeraisClinicas as AuthenticatedHandler);

export default router;
