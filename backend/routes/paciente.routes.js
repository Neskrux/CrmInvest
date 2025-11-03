const express = require('express');
const router = express.Router();
const pacienteController = require('../controllers/paciente.controller');
const { authenticateToken } = require('../middleware/auth');

// Rotas específicas para pacientes logados

// GET /api/paciente/boletos - Listar boletos do paciente logado
router.get('/boletos', authenticateToken, pacienteController.getBoletosPaciente);

// GET /api/paciente/boletos/sincronizar/:boleto_id - Sincronizar status de um boleto específico
router.get('/boletos/sincronizar/:boleto_id', authenticateToken, pacienteController.sincronizarStatusBoleto);

// POST /api/paciente/boletos/sincronizar-todos - Sincronizar todos os boletos pendentes/vencidos
router.post('/boletos/sincronizar-todos', authenticateToken, pacienteController.sincronizarTodosBoletos);

module.exports = router;

