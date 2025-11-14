const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/database');

console.log('🔍 [ROUTES] Carregando boletos-gestao.routes.js...');

let boletosGestaoController;
try {
  boletosGestaoController = require('../controllers/boletos-gestao.controller');
  console.log('✅ [ROUTES] Controller carregado:', typeof boletosGestaoController.listarBoletos);
} catch (error) {
  console.error('❌ [ROUTES] Erro ao carregar controller:', error);
  throw error;
}

const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { upload } = require('../config/multer');

// Rotas de gestão de boletos

// Rota de teste simples SEM autenticação para verificar se funciona
router.get('/boletos-gestao-test', async (req, res) => {
  console.log('🔍 [TESTE] Rota de teste acessada');
  res.json({ 
    message: 'Rota de teste funcionando!',
    boletos: [],
    total: 0
  });
});

// GET /api/boletos-gestao - Listar boletos com filtros
router.get('/boletos-gestao', async (req, res) => {
  console.log('🔍 [ROTA] /boletos-gestao acessada DIRETAMENTE');
  
  // Verificar token manualmente
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    console.error('❌ [ROTA] Token não encontrado');
    return res.status(401).json({ error: 'Token de acesso requerido' });
  }
  
  // Decodificar token sem verificar (apenas para teste)
  const jwt = require('jsonwebtoken');
  const { JWT_SECRET } = require('../config/constants');
  
  try {
    const user = jwt.verify(token, JWT_SECRET);
    console.log('✅ [ROTA] Token válido, user:', user);
    req.user = user;
  } catch (err) {
    console.error('❌ [ROTA] Token inválido:', err.message);
    return res.status(403).json({ error: 'Token inválido' });
  }
  
  console.log('🔍 [ROTA] Buscando boletos...');
  
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    
    const { data, error, count } = await supabaseAdmin
      .from('boletos_gestao')
      .select('*', { count: 'exact' })
      .order('data_vencimento', { ascending: true })
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('❌ [ROTA] Erro ao buscar boletos:', error);
      if (error.code === 'PGRST205') {
        // Tabela não existe
        console.log('⚠️ [ROTA] Tabela não existe, retornando lista vazia');
        return res.json({
          boletos: [],
          total: 0,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: 0
        });
      }
      throw error;
    }
    
    console.log(`✅ [ROTA] Retornando ${data?.length || 0} boletos`);
    
    res.json({
      boletos: data || [],
      total: count || 0,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil((count || 0) / limit)
    });
  } catch (error) {
    console.error('❌ [ROTA] Erro:', error);
    res.status(500).json({ error: error.message || 'Erro ao listar boletos' });
  }
});
console.log('✅ [ROUTES] Rota GET /boletos-gestao registrada');

// POST /api/boletos-gestao/importar - Importar boletos de um fechamento
router.post('/boletos-gestao/importar', authenticateToken, requireAdmin, boletosGestaoController.importarBoletos);

// POST /api/boletos-gestao/importar-arquivo - Importar boleto manualmente com arquivo PDF
router.post('/boletos-gestao/importar-arquivo', authenticateToken, requireAdmin, upload.single('arquivo'), boletosGestaoController.importarBoletoArquivo);

// POST /api/boletos-gestao/importar-caixa - Importar boletos existentes de boletos_caixa
router.post('/boletos-gestao/importar-caixa', authenticateToken, requireAdmin, boletosGestaoController.importarBoletosCaixa);

// PUT /api/boletos-gestao/:id - Atualizar boleto individual
router.put('/boletos-gestao/:id', authenticateToken, requireAdmin, boletosGestaoController.atualizarBoleto);

// PUT /api/boletos-gestao/atualizar-status-lote - Atualizar status de vários boletos
router.put('/boletos-gestao/atualizar-status-lote', authenticateToken, requireAdmin, boletosGestaoController.atualizarStatusLote);

// POST /api/boletos-gestao/gerar-pendentes - Gerar boletos pendentes (job manual)
router.post('/boletos-gestao/gerar-pendentes', authenticateToken, requireAdmin, boletosGestaoController.gerarBoletosPendentes);

// DELETE /api/boletos-gestao/:id - Excluir boleto
router.delete('/boletos-gestao/:id', authenticateToken, requireAdmin, boletosGestaoController.excluirBoleto);

// GET /api/boletos-gestao/:id/sincronizar - Sincronizar status de um boleto específico (admin)
router.get('/boletos-gestao/:id/sincronizar', authenticateToken, boletosGestaoController.sincronizarBoleto);

// POST /api/boletos-gestao/sincronizar-todos - Sincronizar todos os boletos pendentes/vencidos (admin)
router.post('/boletos-gestao/sincronizar-todos', authenticateToken, boletosGestaoController.sincronizarTodosBoletos);

console.log('✅ [ROUTES] boletos-gestao.routes.js carregado completamente');
console.log('✅ [ROUTES] Rotas registradas:', router.stack.map(layer => layer.route?.path || 'middleware').filter(Boolean));

module.exports = router;

