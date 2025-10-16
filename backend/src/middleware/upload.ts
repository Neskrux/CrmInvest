import multer, { FileFilterCallback } from 'multer';
import { Request, Response, NextFunction } from 'express';

// Configuração do Multer para upload de arquivos
// Usar memoryStorage para funcionar no Vercel
const storage = multer.memoryStorage();

// Filtros para upload
const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
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
    cb(new Error('Apenas arquivos PDF, JPG e PNG são permitidos!'));
  }
};

// Middleware específico para upload de evidências (imagens)
const evidenciaFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  // Permitir apenas imagens JPG e PNG
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
    cb(null, true);
  } else {
    cb(new Error('Apenas arquivos JPG e PNG são permitidos!'));
  }
};

// Configuração do multer para uploads gerais
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // Limite de 10MB
  }
});

// Configuração do multer para upload de evidências
export const uploadEvidencia = multer({
  storage: storage,
  fileFilter: evidenciaFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // Limite de 5MB
  }
});

// Middleware para autenticar uploads
export const authenticateUpload = (req: Request, res: Response, next: NextFunction): void => {
  // Verificar se o usuário está autenticado
  if (!req.user) {
    res.status(401).json({ 
      success: false, 
      error: 'Token de autenticação necessário para upload' 
    });
    return;
  }
  
  // Verificar se o usuário tem permissão para fazer upload
  const allowedTypes = ['admin', 'consultor', 'empresa', 'clinica'];
  if (!allowedTypes.includes(req.user.tipo)) {
    res.status(403).json({ 
      success: false, 
      error: 'Usuário não tem permissão para fazer upload' 
    });
    return;
  }
  
  next();
};
