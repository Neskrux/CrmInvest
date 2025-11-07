const express = require('express');
const router = express.Router();
const assinaturasAdminController = require('../controllers/assinaturas-admin.controller');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GET /api/assinaturas-admin/minha-assinatura - Obter assinatura ativa do admin
router.get('/assinaturas-admin/minha-assinatura', authenticateToken, requireAdmin, assinaturasAdminController.getMinhaAssinatura);

// POST /api/assinaturas-admin - Salvar assinatura do admin
router.post('/assinaturas-admin', authenticateToken, requireAdmin, assinaturasAdminController.salvarAssinaturaAdmin);

module.exports = router;
