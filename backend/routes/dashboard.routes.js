const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { authenticateToken } = require('../middleware/auth');

// Rotas de dashboard

// GET /api/dashboard - Dashboard principal
router.get('/dashboard', authenticateToken, dashboardController.getDashboard);

// GET /api/dashboard/gerais/pacientes - Dados gerais de pacientes (para gráficos)
router.get('/dashboard/gerais/pacientes', authenticateToken, dashboardController.getGeraisPacientes);

// GET /api/dashboard/gerais/agendamentos - Dados gerais de agendamentos (para gráficos)
router.get('/dashboard/gerais/agendamentos', authenticateToken, dashboardController.getGeraisAgendamentos);

// GET /api/dashboard/gerais/fechamentos - Dados gerais de fechamentos (para gráficos)
router.get('/dashboard/gerais/fechamentos', authenticateToken, dashboardController.getGeraisFechamentos);

// GET /api/dashboard/gerais/clinicas - Dados gerais de clínicas (para gráficos)
router.get('/dashboard/gerais/clinicas', authenticateToken, dashboardController.getGeraisClinicas);

// GET /api/dashboard/ranking/sdrs - Ranking de SDRs
router.get('/dashboard/ranking/sdrs', authenticateToken, dashboardController.getRankingSDRs);

// GET /api/dashboard/ranking/internos - Ranking de consultores internos
router.get('/dashboard/ranking/internos', authenticateToken, dashboardController.getRankingInternos);

// GET /api/dashboard/ranking/freelancers - Ranking de freelancers
router.get('/dashboard/ranking/freelancers', authenticateToken, dashboardController.getRankingFreelancers);

// GET /api/dashboard/incorporadora/corretor - KPIs do primeiro quadro (foco corretor)
router.get('/dashboard/incorporadora/corretor', authenticateToken, dashboardController.getDashboardIncorporadoraCorretor);

// GET /api/dashboard/incorporadora/geral - Dados gerais (negócios ganhos/perdidos/em andamento)
router.get('/dashboard/incorporadora/geral', authenticateToken, dashboardController.getDashboardIncorporadoraGeral);

// GET /api/dashboard/incorporadora/funil - Dados do funil visual
router.get('/dashboard/incorporadora/funil', authenticateToken, dashboardController.getDashboardIncorporadoraFunil);

// GET /api/dashboard/incorporadora/sdr/:sdr_id/funil - Mini-funil individual de um SDR
router.get('/dashboard/incorporadora/sdr/:sdr_id/funil', authenticateToken, dashboardController.getDashboardIncorporadoraSDRFunil);

// GET /api/dashboard/incorporadora/corretores/individuais - Dados de VGV e Entrada por corretor com metas
router.get('/dashboard/incorporadora/corretores/individuais', authenticateToken, dashboardController.getDashboardIncorporadoraCorretoresIndividuais);

module.exports = router;

