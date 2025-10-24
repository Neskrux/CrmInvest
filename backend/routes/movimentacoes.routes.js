const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getMovimentacoesUsuario,
  getMovimentacoesPaciente,
  getRelatorioMovimentacoes,
  getMovimentacoesRecentes,
  getMovimentacoesRelatorio
} = require('../controllers/movimentacoes.controller');

// GET /api/movimentacoes/usuario/:consultorId - Ver todas movimentações de um consultor específico
router.get('/usuario/:consultorId', authenticateToken, getMovimentacoesUsuario);

// GET /api/movimentacoes/paciente/:pacienteId - Ver histórico completo de um paciente
router.get('/paciente/:pacienteId', authenticateToken, getMovimentacoesPaciente);

// GET /api/movimentacoes/relatorio - Relatório geral com filtros
router.get('/relatorio', authenticateToken, getMovimentacoesRelatorio);

// GET /api/movimentacoes/recentes - Movimentações recentes para dashboard
router.get('/recentes', authenticateToken, getMovimentacoesRecentes);

module.exports = router;
