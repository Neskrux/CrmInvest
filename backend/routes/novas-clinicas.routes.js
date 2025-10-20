const express = require('express');
const router = express.Router();
const novasClinicasController = require('../controllers/novas-clinicas.controller');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Rotas de novas clínicas

// GET /api/novas-clinicas - Listar novas clínicas
router.get('/novas-clinicas', authenticateToken, novasClinicasController.getAllNovasClinicas);

// POST /api/novas-clinicas - Criar nova clínica
router.post('/novas-clinicas', authenticateToken, novasClinicasController.createNovaClinica);

// PUT /api/novas-clinicas/:id - Editar nova clínica (apenas admin)
router.put('/novas-clinicas/:id', authenticateToken, requireAdmin, novasClinicasController.updateNovaClinica);

// PUT /api/novas-clinicas/:id/pegar - Pegar clínica (apenas admin)
router.put('/novas-clinicas/:id/pegar', authenticateToken, requireAdmin, novasClinicasController.pegarClinica);

// PUT /api/novas-clinicas/:id/status - Atualizar status de nova clínica
router.put('/novas-clinicas/:id/status', authenticateToken, novasClinicasController.updateStatusNovaClinica);

// DELETE /api/novas-clinicas/:id - Excluir nova clínica (apenas admin)
router.delete('/novas-clinicas/:id', authenticateToken, requireAdmin, novasClinicasController.deleteNovaClinica);

module.exports = router;

