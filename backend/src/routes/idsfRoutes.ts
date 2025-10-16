import { Router } from 'express';
import { 
  testConnection,
  getClinica,
  createClinica,
  updateClinica,
  getFinanciamento,
  createFinanciamento,
  getDocumentosNecessarios,
  getAnalise,
  validateCNPJ,
  getConfig
} from '../controllers/idsfController';
import { authenticateToken } from '../middleware/auth';
import { AuthenticatedHandler } from '../types';

const router = Router();

// Todas as rotas de IDSF requerem autenticação
router.use(authenticateToken);

// Testar conexão com IDSF API
router.get('/test', testConnection as AuthenticatedHandler);

// Obter configuração da IDSF
router.get('/config', getConfig as AuthenticatedHandler);

// Validar CNPJ (pode ser usado sem autenticação em alguns casos)
router.get('/validate-cnpj/:cnpj', validateCNPJ as AuthenticatedHandler);

// Clínicas
router.get('/clinica/:cnpj', getClinica as AuthenticatedHandler);
router.post('/clinica', createClinica as AuthenticatedHandler);
router.put('/clinica/:cnpj', updateClinica as AuthenticatedHandler);

// Financiamentos
router.get('/financiamento/:cnpj', getFinanciamento as AuthenticatedHandler);
router.post('/financiamento', createFinanciamento as AuthenticatedHandler);

// Documentos
router.get('/documentos-necessarios/:tipo', getDocumentosNecessarios as AuthenticatedHandler);

// Análises
router.get('/analise/:cnpj', getAnalise as AuthenticatedHandler);

export default router;
