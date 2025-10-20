const express = require('express');
const router = express.Router();
const agendamentosController = require('../controllers/agendamentos.controller');
const { authenticateToken, authenticateUpload, requireAdmin } = require('../middleware/auth');
const { uploadEvidencia } = require('../config/multer');

// Rotas de agendamentos

// GET /api/agendamentos - Listar agendamentos
router.get('/agendamentos', authenticateToken, agendamentosController.getAllAgendamentos);

// GET /api/dashboard/agendamentos - Listar agendamentos para dashboard
router.get('/dashboard/agendamentos', authenticateToken, agendamentosController.getDashboardAgendamentos);

// POST /api/agendamentos - Criar agendamento
router.post('/agendamentos', authenticateToken, agendamentosController.createAgendamento);

// PUT /api/agendamentos/:id - Atualizar agendamento
router.put('/agendamentos/:id', authenticateToken, agendamentosController.updateAgendamento);

// PUT /api/agendamentos/:id/status - Atualizar status do agendamento
router.put('/agendamentos/:id/status', authenticateToken, agendamentosController.updateStatusAgendamento);

// PUT /api/agendamentos/:id/lembrado - Marcar como lembrado
router.put('/agendamentos/:id/lembrado', authenticateToken, agendamentosController.marcarLembrado);

// DELETE /api/agendamentos/:id - Excluir agendamento (apenas admin)
router.delete('/agendamentos/:id', authenticateToken, requireAdmin, agendamentosController.deleteAgendamento);

// === EVIDÊNCIAS ===

// POST /api/evidencias/upload - Upload de evidência
router.post('/evidencias/upload', authenticateUpload, uploadEvidencia.single('evidencia'), agendamentosController.uploadEvidencia);

// GET /api/evidencias/:tipo/:registroId - Buscar evidências de um registro
router.get('/evidencias/:tipo/:registroId', authenticateToken, agendamentosController.getEvidencias);

// GET /api/evidencias/todas - Listar todas as evidências (apenas admin)
router.get('/evidencias/todas', authenticateToken, requireAdmin, agendamentosController.getAllEvidencias);

module.exports = router;

