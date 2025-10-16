import { Router } from 'express';
import { uploadSingle, uploadMultiple, removeFile, getFileUrl } from '../controllers/uploadController';
import { authenticateToken } from '../middleware/auth';
import { authenticateUpload, upload, uploadEvidencia } from '../middleware/upload';
import { AuthenticatedHandler } from '../types';

const router = Router();

// Todas as rotas de upload requerem autenticação
router.use(authenticateToken);
router.use(authenticateUpload);

// Upload de arquivo único
router.post('/single', upload.single('file'), uploadSingle as AuthenticatedHandler);

// Upload de múltiplos arquivos
router.post('/multiple', upload.array('files', 10), uploadMultiple as AuthenticatedHandler);

// Upload de evidências (apenas imagens)
router.post('/evidencias', uploadEvidencia.array('files', 5), uploadMultiple as AuthenticatedHandler);

// Upload de contratos (PDFs e imagens)
router.post('/contratos', upload.fields([
  { name: 'contrato', maxCount: 1 },
  { name: 'print_confirmacao', maxCount: 1 }
]), uploadMultiple as AuthenticatedHandler);

// Remover arquivo
router.delete('/:fileName', removeFile as AuthenticatedHandler);

// Obter URL pública de arquivo
router.get('/url/:fileName', getFileUrl as AuthenticatedHandler);

export default router;
