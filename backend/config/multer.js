const multer = require('multer');
const path = require('path');

// Configuração do Multer para upload de arquivos
// Usar memoryStorage para funcionar no Vercel
const storage = multer.memoryStorage();

// Filtros para upload
const fileFilter = (req, file, cb) => {
  // Permitir PDFs e imagens
  const allowedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg', 
    'image/png'
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Apenas arquivos PDF, JPG e PNG são permitidos!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // Limite de 10MB
  }
});

// Middleware específico para upload de evidências (imagens)
const evidenciaFilter = (req, file, cb) => {
  // Permitir apenas imagens JPG e PNG
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
    cb(null, true);
  } else {
    cb(new Error('Apenas arquivos JPG e PNG são permitidos!'), false);
  }
};

const uploadEvidencia = multer({
  storage: storage,
  fileFilter: evidenciaFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // Limite de 5MB
  }
});

// Middleware para upload de materiais (documentos e vídeos - até 200MB)
const materiaisFilter = (req, file, cb) => {
  const allowedTypes = [
    // Documentos
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/zip',
    'application/x-rar-compressed',
    // Vídeos
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-matroska',
    'video/x-ms-wmv',
    'video/x-flv',
    'video/webm'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não permitido. Apenas documentos e vídeos são aceitos.'), false);
  }
};

const uploadMateriais = multer({
  storage: storage,
  fileFilter: materiaisFilter,
  limits: {
    fileSize: 200 * 1024 * 1024 // Limite de 200MB
  }
});

module.exports = {
  upload,
  uploadEvidencia,
  uploadMateriais
};

