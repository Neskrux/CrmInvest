const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getMetasCorretores,
  getMetaCorretor,
  createMetaCorretor,
  updateMetaCorretor,
  updateMetaCorretorById
} = require('../controllers/metas-corretores.controller');

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// GET /api/metas-corretores - Buscar metas de todos corretores do mês
router.get('/', getMetasCorretores);

// GET /api/metas-corretores/:corretor_id - Buscar meta de um corretor
router.get('/:corretor_id', getMetaCorretor);

// POST /api/metas-corretores - Criar meta (apenas admin)
router.post('/', createMetaCorretor);

// PUT /api/metas-corretores/:id - Atualizar meta (apenas admin)
router.put('/:id', updateMetaCorretor);

// PUT /api/metas-corretores/corretor/:corretor_id - Atualizar meta por corretor_id (apenas admin)
router.put('/corretor/:corretor_id', updateMetaCorretorById);

module.exports = router;

