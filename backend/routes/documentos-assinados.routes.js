const express = require('express');
const router = express.Router();
const documentosAssinadosController = require('../controllers/documentos-assinados.controller');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');

// Configurar multer para upload de PDF
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos PDF são permitidos'), false);
    }
  }
});

// Salvar documento assinado (requer autenticação)
router.post('/', authenticateToken, documentosAssinadosController.salvarDocumentoAssinado);

// Validar documento por código (público) - aceita tanto 'k' quanto 'codigo'
router.get('/validar-documento', (req, res) => {
  // Aceitar tanto 'k' quanto 'codigo' como parâmetro
  const codigo = req.query.k || req.query.codigo;
  if (!codigo) {
    return res.status(400).json({ error: 'Código de validação não fornecido' });
  }
  // Passar para o controller com o código
  req.query.k = codigo;
  documentosAssinadosController.validarDocumento(req, res);
});

// Validar documento por hash SHA1 (público)
router.get('/validar-hash', documentosAssinadosController.validarDocumentoPorHash);

// Validar integridade por hash (público)
router.get('/validar-integridade', documentosAssinadosController.validarIntegridadeDocumento);

// Validar integridade por arquivo PDF (público)
router.post('/validar-integridade-arquivo', upload.single('pdf'), documentosAssinadosController.validarIntegridadePorArquivo);

// Detectar alteração no documento (público)
router.get('/detectar-alteracao', documentosAssinadosController.detectarAlteracao);

// Listar documentos do usuário (requer autenticação)
router.get('/', authenticateToken, documentosAssinadosController.listarDocumentosAssinados);

module.exports = router;

