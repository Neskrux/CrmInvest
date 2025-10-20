const express = require('express');
const router = express.Router();
const clinicasController = require('../controllers/clinicas.controller');
const { authenticateToken, requireAdmin, requireAdminOrConsultorInterno } = require('../middleware/auth');
const { upload } = require('../config/multer');

// Rotas de clínicas (rotas específicas devem vir ANTES de rotas parametrizadas)

// GET /api/clinicas/cidades
router.get('/clinicas/cidades', authenticateToken, clinicasController.getCidades);

// GET /api/clinicas/estados
router.get('/clinicas/estados', authenticateToken, clinicasController.getEstados);

// GET /api/clinicas/em-analise
router.get('/clinicas/em-analise', authenticateToken, clinicasController.getClinicasEmAnalise);

// GET /api/clinicas-negativas
router.get('/clinicas-negativas', authenticateToken, clinicasController.getClinicasNegativas);

// POST /api/clinicas/cadastro-publico (sem autenticação)
router.post('/clinicas/cadastro-publico', clinicasController.cadastroPublico);

// GET /api/clinicas
router.get('/clinicas', authenticateToken, clinicasController.getAllClinicas);

// GET /api/clinicas/:id
router.get('/clinicas/:id', authenticateToken, clinicasController.getClinicaById);

// POST /api/clinicas
router.post('/clinicas', authenticateToken, requireAdminOrConsultorInterno, clinicasController.createClinica);

// POST /api/clinicas/:id/criar-acesso
router.post('/clinicas/:id/criar-acesso', authenticateToken, requireAdmin, clinicasController.criarAcesso);

// POST /api/clinicas/:id/documentos
router.post('/clinicas/:id/documentos', authenticateToken, upload.single('documento'), clinicasController.uploadDocumento);

// GET /api/clinicas/:id/documentos/:tipo
router.get('/clinicas/:id/documentos/:tipo', authenticateToken, clinicasController.downloadDocumento);

// PUT /api/clinicas/:id/documentos/:tipo/aprovar
router.put('/clinicas/:id/documentos/:tipo/aprovar', authenticateToken, requireAdmin, clinicasController.aprovarDocumento);

// PUT /api/clinicas/:id/documentos/:tipo/reprovar
router.put('/clinicas/:id/documentos/:tipo/reprovar', authenticateToken, requireAdmin, clinicasController.reprovarDocumento);

// DELETE /api/clinicas/:id/remover-acesso
router.delete('/clinicas/:id/remover-acesso', authenticateToken, requireAdmin, clinicasController.removerAcesso);

// PUT /api/clinicas/:id
router.put('/clinicas/:id', authenticateToken, clinicasController.updateClinica);

// DELETE /api/clinicas/:id
router.delete('/clinicas/:id', authenticateToken, requireAdmin, clinicasController.deleteClinica);

module.exports = router;

