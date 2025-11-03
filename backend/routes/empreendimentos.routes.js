const express = require('express');
const router = express.Router();
const { testEmpreendimentos, getAllEmpreendimentos, getEmpreendimentoById, getUnidadesByEmpreendimento, getUnidadeById } = require('../controllers/empreendimentos.controller');
const { authenticateToken } = require('../middleware/auth');

// GET /api/empreendimentos/test - Testar conexão (sem autenticação para debug)
router.get('/test', (req, res) => {
  res.json({ message: 'Endpoint de teste funcionando!' });
});

// GET /api/empreendimentos/test-db - Testar conexão com banco
router.get('/test-db', testEmpreendimentos);

// Aplicar middleware de autenticação nas demais rotas
router.use(authenticateToken);

// GET /api/empreendimentos - Listar empreendimentos
router.get('/', getAllEmpreendimentos);

// IMPORTANTE: Rotas mais específicas devem vir ANTES das rotas genéricas
// GET /api/empreendimentos/:id/unidades/:unidadeId - Buscar unidade específica
router.get('/:id/unidades/:unidadeId', getUnidadeById);

// GET /api/empreendimentos/:id/unidades - Buscar unidades de um empreendimento (com filtros opcionais: ?tipo=X&torre=Y&status=Z)
router.get('/:id/unidades', getUnidadesByEmpreendimento);

// GET /api/empreendimentos/:id - Buscar empreendimento por ID
router.get('/:id', getEmpreendimentoById);

module.exports = router;

