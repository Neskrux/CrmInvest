const express = require('express');
const router = express.Router();
const pacientesController = require('../controllers/pacientes.controller');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Rotas de pacientes

// GET /api/pacientes - Listar pacientes
router.get('/pacientes', authenticateToken, pacientesController.getAllPacientes);

// GET /api/pacientes/:id - Buscar paciente por ID
router.get('/pacientes/:id', authenticateToken, pacientesController.getPacienteById);

// GET /api/dashboard/pacientes - Listar pacientes para dashboard
router.get('/dashboard/pacientes', authenticateToken, pacientesController.getDashboardPacientes);

// POST /api/pacientes - Criar paciente
router.post('/pacientes', authenticateToken, pacientesController.createPaciente);

// PUT /api/pacientes/:id - Atualizar paciente
router.put('/pacientes/:id', authenticateToken, pacientesController.updatePaciente);

// PUT /api/pacientes/:id/status - Atualizar status do paciente
router.put('/pacientes/:id/status', authenticateToken, pacientesController.updateStatusPaciente);

// POST /api/pacientes/:id/criar-login - Criar login para paciente (apenas clínica)
router.post('/pacientes/:id/criar-login', authenticateToken, pacientesController.criarLoginPaciente);

// PUT /api/pacientes/:id/atualizar-login - Atualizar login do paciente (apenas clínica)
router.put('/pacientes/:id/atualizar-login', authenticateToken, pacientesController.atualizarLoginPaciente);

// PUT /api/pacientes/:id/desativar-login - Desativar login do paciente (apenas clínica)
router.put('/pacientes/:id/desativar-login', authenticateToken, pacientesController.desativarLoginPaciente);

// DELETE /api/pacientes/:id - Excluir paciente (apenas admin)
router.delete('/pacientes/:id', authenticateToken, pacientesController.deletePaciente);

// === NOVOS LEADS ===

// GET /api/novos-leads - Listar novos leads
router.get('/novos-leads', authenticateToken, pacientesController.getNovosLeads);

// GET /api/leads-negativos - Listar leads negativos
router.get('/leads-negativos', authenticateToken, pacientesController.getLeadsNegativos);

// PUT /api/novos-leads/:id/aprovar - Aprovar lead (muda status de 'lead' para 'em_conversa')
router.put('/novos-leads/:id/aprovar', authenticateToken, pacientesController.aprovarLead);

// PUT /api/novos-leads/:id/pegar - Pegar lead (atribuir a um consultor)
router.put('/novos-leads/:id/pegar', authenticateToken, pacientesController.pegarLead);

// DELETE /api/novos-leads/:id - Excluir lead (apenas admin)
router.delete('/novos-leads/:id', authenticateToken, requireAdmin, pacientesController.deleteLead);

// PUT /api/novos-leads/:id/status - Atualizar status de novo lead
router.put('/novos-leads/:id/status', authenticateToken, pacientesController.updateStatusLead);

// POST /api/leads/cadastro - Cadastro público de lead (sem autenticação)
router.post('/leads/cadastro', pacientesController.cadastroPublicoLead);

module.exports = router;

