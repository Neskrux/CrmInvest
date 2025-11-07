const express = require('express');
const router = express.Router();
const boletosGestaoController = require('../controllers/boletos-gestao.controller');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Rotas de gestão de boletos

// GET /api/boletos-gestao - Listar boletos com filtros
router.get('/boletos-gestao', authenticateToken, boletosGestaoController.listarBoletos);

// POST /api/boletos-gestao/importar - Importar boletos de um fechamento
router.post('/boletos-gestao/importar', authenticateToken, requireAdmin, boletosGestaoController.importarBoletos);

// PUT /api/boletos-gestao/:id - Atualizar boleto individual
router.put('/boletos-gestao/:id', authenticateToken, requireAdmin, boletosGestaoController.atualizarBoleto);

// PUT /api/boletos-gestao/atualizar-status-lote - Atualizar status de vários boletos
router.put('/boletos-gestao/atualizar-status-lote', authenticateToken, requireAdmin, boletosGestaoController.atualizarStatusLote);

// POST /api/boletos-gestao/gerar-pendentes - Gerar boletos pendentes (job manual)
router.post('/boletos-gestao/gerar-pendentes', authenticateToken, requireAdmin, boletosGestaoController.gerarBoletosPendentes);

// DELETE /api/boletos-gestao/:id - Excluir boleto
router.delete('/boletos-gestao/:id', authenticateToken, requireAdmin, boletosGestaoController.excluirBoleto);

module.exports = router;

