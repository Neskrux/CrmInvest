const express = require('express');
const router = express.Router();
const solicitacoesController = require('../controllers/solicitacoes-cobranca.controller');
const { authenticateToken } = require('../middleware/auth');

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Rotas de solicitações de cobrança
router.get('/solicitacoes-cobranca', solicitacoesController.listarSolicitacoes);
router.get('/solicitacoes-cobranca/gastos-mensais', solicitacoesController.obterGastosMensais);
router.get('/solicitacoes-cobranca/:id', solicitacoesController.buscarSolicitacao);
router.post('/solicitacoes-cobranca', solicitacoesController.criarSolicitacao);
router.put('/solicitacoes-cobranca/:id/aprovar', solicitacoesController.aprovarSolicitacao);
router.put('/solicitacoes-cobranca/:id/rejeitar', solicitacoesController.rejeitarSolicitacao);

module.exports = router;
