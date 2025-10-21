const express = require('express');
const router = express.Router();
const { getAllEmpreendimentos, getEmpreendimentoById } = require('../controllers/empreendimentos.controller');
const { authenticateToken } = require('../middleware/auth');

// Aplicar middleware de autenticação em todas as rotas
router.use(authenticateToken);

// GET /api/empreendimentos - Listar empreendimentos
router.get('/', getAllEmpreendimentos);

// GET /api/empreendimentos/:id - Buscar empreendimento por ID
router.get('/:id', getEmpreendimentoById);

module.exports = router;

