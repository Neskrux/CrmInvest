const express = require('express');
const router = express.Router();
const metasController = require('../controllers/metas.controller');
const { authenticateToken } = require('../middleware/auth');

// Rotas de metas

// GET /api/metas - Buscar metas
router.get('/metas', authenticateToken, metasController.getMetas);

// PUT /api/metas/:id - Atualizar meta
router.put('/metas/:id', authenticateToken, metasController.updateMeta);

// GET /api/metas/progresso - Buscar progresso das metas
router.get('/metas/progresso', authenticateToken, metasController.getProgressoMetas);

module.exports = router;

