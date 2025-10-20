const express = require('express');
const router = express.Router();
const materiaisController = require('../controllers/materiais.controller');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { uploadMateriais } = require('../config/multer');

// Rotas de materiais

// GET /api/materiais - Listar todos os materiais
router.get('/materiais', authenticateToken, materiaisController.getAllMateriais);

// POST /api/materiais - Criar novo material (apenas admin)
router.post('/materiais', authenticateToken, requireAdmin, uploadMateriais.single('arquivo'), materiaisController.createMaterial);

// GET /api/materiais/:id/download - Download de arquivo
router.get('/materiais/:id/download', authenticateToken, materiaisController.downloadMaterial);

// DELETE /api/materiais/:id - Excluir material (apenas admin)
router.delete('/materiais/:id', authenticateToken, requireAdmin, materiaisController.deleteMaterial);

module.exports = router;

