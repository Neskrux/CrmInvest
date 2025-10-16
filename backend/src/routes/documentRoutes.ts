import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { uploadDocument, uploadMultipleDocuments, deleteDocumentFromArray, listClinicDocuments } from '../controllers/documentController';
import { AuthenticatedHandler } from '../types';
import multer from 'multer';
import path from 'path';

const router = Router();

// Configurar multer para upload em memória
const storage = multer.memoryStorage();

// Filtro para tipos de arquivo baseado no tipo de documento
const createFileFilter = (docType: string) => {
  return (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
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
      // Para outros documentos, aceitar PDFs, imagens e documentos
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
};

// Configuração do multer para upload único
const createUploadSingle = (docType: string) => {
  return multer({
    storage: storage,
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB (para suportar vídeos)
    fileFilter: createFileFilter(docType)
  });
};

// Configuração do multer para upload múltiplo
const createUploadMultiple = (docType: string) => {
  return multer({
    storage: storage,
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB (para suportar vídeos)
    fileFilter: createFileFilter(docType)
  });
};

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Listar documentos de uma clínica
router.get('/clinic/:clinicaId', listClinicDocuments as AuthenticatedHandler);

// Upload de documento único para clínica
router.post('/upload/:clinicaId/:docType', 
  (req, res, next) => {
    const { docType } = req.params;
    if (!docType) {
      return res.status(400).json({ error: 'Tipo de documento é obrigatório' });
    }
    const upload = createUploadSingle(docType);
    return upload.single('file')(req, res, next);
  },
  uploadDocument as AuthenticatedHandler
);

// Upload múltiplo de documentos para clínica
router.post('/upload-multiple/:clinicaId/:docType',
  (req, res, next) => {
    const { docType } = req.params;
    if (!docType) {
      return res.status(400).json({ error: 'Tipo de documento é obrigatório' });
    }
    const upload = createUploadMultiple(docType);
    return upload.array('documents', 10)(req, res, next);
  },
  uploadMultipleDocuments as AuthenticatedHandler
);

// Deletar documento específico do array
router.delete('/delete-from-array/:clinicaId/:docType/:fileIndex', deleteDocumentFromArray as AuthenticatedHandler);

export default router;
