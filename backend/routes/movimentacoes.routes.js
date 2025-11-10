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

// Log para debug
console.log('✅ [MOVIMENTACOES-ROUTES] Rotas de movimentações carregadas');

// GET /api/movimentacoes/usuario/:consultorId - Ver todas movimentações de um consultor específico
router.get('/movimentacoes/usuario/:consultorId', authenticateToken, getMovimentacoesUsuario);

// GET /api/movimentacoes/paciente/:pacienteId - Ver histórico completo de um paciente
router.get('/movimentacoes/paciente/:pacienteId', authenticateToken, (req, res, next) => {
  console.log('🔍 [MOVIMENTACOES-ROUTES] Rota /movimentacoes/paciente/:pacienteId chamada - ID:', req.params.pacienteId);
  next();
}, getMovimentacoesPaciente);

// GET /api/movimentacoes/relatorio - Relatório geral com filtros
router.get('/movimentacoes/relatorio', authenticateToken, getMovimentacoesRelatorio);

// GET /api/movimentacoes/recentes - Movimentações recentes para dashboard
router.get('/movimentacoes/recentes', authenticateToken, getMovimentacoesRecentes);

console.log('✅ [MOVIMENTACOES-ROUTES] Rotas registradas:', router.stack.map(layer => layer.route?.path || 'middleware').filter(Boolean));

module.exports = router;
