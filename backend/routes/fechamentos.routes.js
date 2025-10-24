const express = require('express');
const router = express.Router();
const fechamentosController = require('../controllers/fechamentos.controller');
const { authenticateToken, authenticateUpload, requireAdmin } = require('../middleware/auth');
const { upload } = require('../config/multer');

// Rotas de fechamentos

// GET /api/fechamentos - Listar fechamentos
router.get('/fechamentos', authenticateToken, fechamentosController.getAllFechamentos);

// GET /api/dashboard/fechamentos - Listar fechamentos para dashboard
router.get('/dashboard/fechamentos', authenticateToken, fechamentosController.getDashboardFechamentos);

// POST /api/fechamentos - Criar fechamento
router.post('/fechamentos', authenticateUpload, upload.fields([
  { name: 'contrato', maxCount: 1 },
  { name: 'print_confirmacao', maxCount: 1 }
]), fechamentosController.createFechamento);

// PUT /api/fechamentos/:id - Atualizar fechamento
router.put('/fechamentos/:id', authenticateUpload, upload.fields([
  { name: 'contrato', maxCount: 1 },
  { name: 'print_confirmacao', maxCount: 1 }
]), fechamentosController.updateFechamento);

// DELETE /api/fechamentos/:id - Excluir fechamento
router.delete('/fechamentos/:id', authenticateToken, fechamentosController.deleteFechamento);

// GET /api/fechamentos/:id/contrato-url - Gerar URL assinada do contrato
router.get('/fechamentos/:id/contrato-url', authenticateToken, fechamentosController.getContratoUrl);

// GET /api/fechamentos/:id/contrato - Download de contrato (DEPRECATED)
router.get('/fechamentos/:id/contrato', authenticateToken, fechamentosController.downloadContrato);

// GET /api/fechamentos/:id/print-confirmacao-url - Gerar URL assinada do print de confirmação
router.get('/fechamentos/:id/print-confirmacao-url', authenticateToken, fechamentosController.getPrintConfirmacaoUrl);

// PUT /api/fechamentos/:id/aprovar - Aprovar fechamento (apenas admin)
router.put('/fechamentos/:id/aprovar', authenticateToken, requireAdmin, fechamentosController.aprovarFechamento);

// PUT /api/fechamentos/:id/reprovar - Reprovar fechamento (apenas admin)
router.put('/fechamentos/:id/reprovar', authenticateToken, requireAdmin, fechamentosController.reprovarFechamento);

// POST /api/fechamentos/:id/criar-acesso-freelancer - Criar acesso freelancer para paciente fechado
router.post('/fechamentos/:id/criar-acesso-freelancer', authenticateToken, fechamentosController.criarAcessoFreelancer);

module.exports = router;

