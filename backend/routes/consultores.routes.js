const express = require('express');
const router = express.Router();
const consultoresController = require('../controllers/consultores.controller');
const { authenticateToken, requireAdmin, requireAdminOrEmpresa } = require('../middleware/auth');

// Rotas de consultores

// GET /api/consultores/perfil
router.get('/consultores/perfil', authenticateToken, consultoresController.getPerfil);

// PUT /api/consultores/perfil
router.put('/consultores/perfil', authenticateToken, consultoresController.updatePerfil);

// PUT /api/consultores/:id/permissao
router.put('/consultores/:id/permissao', authenticateToken, consultoresController.updatePermissao);

// GET /api/consultores
router.get('/consultores', authenticateToken, consultoresController.getAllConsultores);

// POST /api/consultores/cadastro (sem autenticação)
router.post('/consultores/cadastro', consultoresController.cadastroPublico);

// POST /api/consultores
router.post('/consultores', authenticateToken, requireAdminOrEmpresa, consultoresController.createConsultor);

// PUT /api/consultores/:id
router.put('/consultores/:id', authenticateToken, requireAdminOrEmpresa, consultoresController.updateConsultor);

// DELETE /api/consultores/:id
router.delete('/consultores/:id', authenticateToken, requireAdminOrEmpresa, consultoresController.deleteConsultor);

// POST /api/consultores/:id/gerar-codigo
router.post('/consultores/:id/gerar-codigo', authenticateToken, requireAdmin, consultoresController.gerarCodigo);

// POST /api/consultores/gerar-codigos-faltantes
router.post('/consultores/gerar-codigos-faltantes', authenticateToken, requireAdmin, consultoresController.gerarCodigosFaltantes);

// GET /api/consultores/:id/link-personalizado
router.get('/consultores/:id/link-personalizado', authenticateToken, consultoresController.getLinkPersonalizado);

// GET /api/consultores/:id
router.get('/consultores/:id', authenticateToken, requireAdmin, consultoresController.getConsultorById);

module.exports = router;

