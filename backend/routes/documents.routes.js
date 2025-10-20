const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const documentsController = require('../controllers/documents.controller');

// Configurar multer para upload em memória (para enviar ao Supabase)
const storage = multer.memoryStorage();

// Filtro para aceitar PDFs, imagens e vídeos
const fileFilter = (req, file, cb) => {
  const { docType } = req.params;
  
  // Se for visita online ou vídeo de validação, aceitar apenas vídeos
  if (docType === 'visita_online' || docType === 'video_validacao') {
    const videoTypes = /mp4|avi|mov|wmv|webm|mkv/;
    const extname = videoTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = file.mimetype.startsWith('video/');
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Para este tipo de documento, apenas arquivos de vídeo são permitidos (MP4, AVI, MOV, WMV, WEBM, MKV)'));
    }
  } else {
    // Para outros documentos, manter as regras antigas
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Apenas arquivos PDF, DOC, DOCX, JPG, JPEG e PNG são permitidos'));
    }
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB (para suportar vídeos)
  fileFilter: fileFilter
});

// ===== ENDPOINTS PARA CLÍNICAS =====

// Upload múltiplo de documentos (para doc_socios)
router.post('/upload-multiple/:clinicaId/:docType', upload.array('documents', 10), documentsController.uploadMultiple);

// Upload de documento específico de clínica (único arquivo)
router.post('/upload/:clinicaId/:docType', upload.single('document'), documentsController.uploadClinica);

// Deletar um documento específico do array (para múltiplos documentos)
router.delete('/delete-from-array/:clinicaId/:docType/:fileIndex', documentsController.deleteFromArray);

// Deletar todos os documentos
router.delete('/delete/:clinicaId/:docType', documentsController.deleteDocument);

// Baixar documento
router.get('/download/:clinicaId/:docType', documentsController.downloadDocument);

// ===== ENDPOINTS PARA PACIENTES =====

// Upload de documento de paciente
router.post('/upload-paciente/:pacienteId/:docType', upload.single('document'), documentsController.uploadPaciente);

// Aprovar documento de paciente
router.put('/approve-paciente/:pacienteId/:docType', documentsController.approvePaciente);

// Reprovar documento de paciente
router.put('/reject-paciente/:pacienteId/:docType', documentsController.rejectPaciente);

module.exports = router;
