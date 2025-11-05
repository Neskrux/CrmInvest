const express = require('express');
const router = express.Router();
const { 
  testEmpreendimentos, 
  getAllEmpreendimentos, 
  getEmpreendimentoById, 
  getUnidadesByEmpreendimento, 
  getUnidadeById,
  uploadGaleria,
  uploadGaleriaMultiple,
  removeGaleria,
  updateEmpreendimento,
  updateUnidade,
  createUnidade,
  deleteUnidade
} = require('../controllers/empreendimentos.controller');
const { authenticateToken, authenticateUpload } = require('../middleware/auth');
const { uploadGaleria: multerGaleria } = require('../config/multer');

// GET /api/empreendimentos/test - Testar conexão (sem autenticação para debug)
router.get('/test', (req, res) => {
  res.json({ message: 'Endpoint de teste funcionando!' });
});

// GET /api/empreendimentos/test-db - Testar conexão com banco
router.get('/test-db', testEmpreendimentos);

// IMPORTANTE: Rotas mais específicas devem vir ANTES das rotas genéricas
// Rotas de upload (POST/DELETE) - usar authenticateUpload diretamente

// POST /api/empreendimentos/:id/galeria/upload-multiple - Upload múltiplo de imagens para galeria
router.post('/:id/galeria/upload-multiple', authenticateUpload, multerGaleria.array('imagens', 20), uploadGaleriaMultiple);

// POST /api/empreendimentos/:id/galeria/upload - Upload de imagem única para galeria
router.post('/:id/galeria/upload', authenticateUpload, multerGaleria.single('imagem'), uploadGaleria);

// DELETE /api/empreendimentos/:id/galeria/* - Remover imagem da galeria
router.delete('/:id/galeria/*', authenticateUpload, removeGaleria);

// Aplicar middleware de autenticação para rotas GET
router.use(authenticateToken);

// GET /api/empreendimentos - Listar empreendimentos
router.get('/', getAllEmpreendimentos);

// ============================================
// Rotas de Unidades (devem vir ANTES da rota genérica /:id)
// ============================================

// GET /api/empreendimentos/:id/unidades/:unidadeId - Buscar unidade específica
router.get('/:id/unidades/:unidadeId', getUnidadeById);

// GET /api/empreendimentos/:id/unidades - Buscar unidades de um empreendimento (com filtros opcionais: ?tipo=X&torre=Y&status=Z)
router.get('/:id/unidades', getUnidadesByEmpreendimento);

// POST /api/empreendimentos/:id/unidades - Criar nova unidade (apenas admin)
router.post('/:id/unidades', createUnidade);

// PUT /api/empreendimentos/:id/unidades/:unidadeId - Atualizar unidade (apenas admin)
router.put('/:id/unidades/:unidadeId', updateUnidade);

// DELETE /api/empreendimentos/:id/unidades/:unidadeId - Deletar unidade (apenas admin)
router.delete('/:id/unidades/:unidadeId', deleteUnidade);

// PUT /api/empreendimentos/:id - Atualizar empreendimento (apenas admin)
router.put('/:id', updateEmpreendimento);

// GET /api/empreendimentos/:id - Buscar empreendimento por ID (rota genérica por último)
router.get('/:id', getEmpreendimentoById);

module.exports = router;

