const express = require('express');
const router = express.Router();
const pacientesFinanceiroController = require('../controllers/pacientes-financeiro.controller');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');

// Configuração do multer para upload de documentos de pacientes
const pacienteDocumentUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido'), false);
    }
  }
});

// Rotas de pacientes financeiro

// GET /api/pacientes-financeiro - Listar pacientes financeiros
router.get('/pacientes-financeiro', authenticateToken, pacientesFinanceiroController.getAllPacientesFinanceiro);

// POST /api/pacientes-financeiro - Criar paciente financeiro
router.post('/pacientes-financeiro', authenticateToken, pacientesFinanceiroController.createPacienteFinanceiro);

// PUT /api/pacientes-financeiro/:id - Atualizar paciente financeiro
router.put('/pacientes-financeiro/:id', authenticateToken, pacientesFinanceiroController.updatePacienteFinanceiro);

// DELETE /api/pacientes-financeiro/:id - Excluir paciente financeiro (apenas admin)
router.delete('/pacientes-financeiro/:id', authenticateToken, pacientesFinanceiroController.deletePacienteFinanceiro);

// POST /api/pacientes-financeiro/:id/upload-documento - Upload de documento
router.post('/pacientes-financeiro/:id/upload-documento', authenticateToken, pacienteDocumentUpload.single('documento'), pacientesFinanceiroController.uploadDocumentoPaciente);

module.exports = router;

