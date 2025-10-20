const express = require('express');
const router = express.Router();
const empresasController = require('../controllers/empresas.controller');
const { authenticateToken } = require('../middleware/auth');

// Rotas de empresas/parceiros
router.get('/parceiros/perfil', authenticateToken, empresasController.getPerfil);
router.put('/parceiros/perfil', authenticateToken, empresasController.updatePerfil);

module.exports = router;

