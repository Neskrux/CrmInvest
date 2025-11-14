const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
// Carregar variáveis de ambiente do arquivo .env no diretório backend
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Importar configurações
const corsConfig = require('./config/cors');
const { supabase, supabaseAdmin } = require('./config/database');

// Importar rotas refatoradas
const routes = require('./routes');

// Importar middlewares e controllers para rotas de upload de galeria e unidades
const { authenticateUpload, authenticateToken } = require('./middleware/auth');
const { uploadGaleria: multerGaleria } = require('./config/multer');
const { 
  uploadGaleria, 
  uploadGaleriaMultiple, 
  removeGaleria,
  createUnidade,
  updateUnidade,
  deleteUnidade,
  updateEmpreendimento
} = require('./controllers/empreendimentos.controller');

// Importar MetaAdsAPI (service)
const MetaAdsAPI = require('./services/meta-ads.service');

// Importar rate limiters
const { generalLimiter } = require('./middleware/rateLimiter');

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 5000;

// Middlewares globais de segurança
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }, // ✅ Permitir CORS
  crossOriginEmbedderPolicy: false // ✅ Não bloquear recursos cross-origin
}));
app.use(cors(corsConfig));

// Middleware JSON para outras rotas (exceto uploads)
app.use((req, res, next) => {
  // Pular body parser para rotas de upload (FormData)
  if (req.path.includes('/upload') || req.path.includes('/galeria/upload')) {
    return next();
  }
  bodyParser.json({ limit: '250mb' })(req, res, next);
});

app.use((req, res, next) => {
  // Pular body parser para rotas de upload (FormData)
  if (req.path.includes('/upload') || req.path.includes('/galeria/upload')) {
    return next();
  }
  bodyParser.urlencoded({ extended: true, limit: '250mb' })(req, res, next);
});

// Middleware de log global para capturar TODAS as requisições à API (para debug)
app.use('/api', (req, res, next) => {
  if (req.path.includes('validar-biometria')) {
    console.log('🚨 [SERVER-GLOBAL] Requisição para /api/auth/validar-biometria');
    console.log('🚨 [SERVER-GLOBAL] Method:', req.method);
    console.log('🚨 [SERVER-GLOBAL] Path:', req.path);
    console.log('🚨 [SERVER-GLOBAL] URL:', req.url);
    console.log('🚨 [SERVER-GLOBAL] Headers:', {
      'content-type': req.headers['content-type'],
      'authorization': req.headers['authorization'] ? 'PRESENTE' : 'AUSENTE',
      'origin': req.headers['origin']
    });
  }
  next();
});

// Rate limiting global (aplicado a todas as rotas)
app.use('/api', generalLimiter);

// Servir arquivos estáticos da pasta uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Test endpoint for empreendimentos
app.get('/test-empreendimentos', (req, res) => {
  res.json({ message: 'Endpoint de teste funcionando!' });
});

// Test endpoint for empreendimentos with database
app.get('/test-db', async (req, res) => {
  try {
    const { supabaseAdmin } = require('./config/database');
    
    console.log('🧪 Testando conexão com banco...');
    
    const { data, error } = await supabaseAdmin
      .from('empreendimentos')
      .select('*');

    if (error) {
      console.error('❌ Erro ao acessar tabela empreendimentos:', error);
      return res.status(500).json({ 
        error: 'Tabela empreendimentos não existe ou não é acessível',
        details: error.message
      });
    }

    console.log('✅ Tabela empreendimentos acessível');
    res.json({ 
      success: true, 
      message: 'Tabela empreendimentos acessível',
      data: data 
    });
  } catch (error) {
    console.error('❌ Erro no teste:', error);
    res.status(500).json({ 
      error: error.message,
      details: 'Erro ao testar conexão com empreendimentos'
    });
  }
});

// Test endpoint for empreendimentos API (without auth)
app.get('/empreendimentos-test', async (req, res) => {
  try {
    const { supabaseAdmin } = require('./config/database');
    
    console.log('🧪 Testando API de empreendimentos...');
    
    const { data, error } = await supabaseAdmin
      .from('empreendimentos')
      .select('*');

    if (error) {
      console.error('❌ Erro ao acessar tabela empreendimentos:', error);
      return res.status(500).json({ 
        error: 'Tabela empreendimentos não existe ou não é acessível',
        details: error.message
      });
    }

    console.log('✅ API de empreendimentos funcionando');
    res.json(data);
  } catch (error) {
    console.error('❌ Erro no teste da API:', error);
    res.status(500).json({ 
      error: error.message,
      details: 'Erro ao testar API de empreendimentos'
    });
  }
});

// Endpoint público para empreendimentos (dados não sensíveis)
app.get('/api/empreendimentos-public', async (req, res) => {
  try {
    const { supabaseAdmin } = require('./config/database');
    
    console.log('🔍 [Backend] Buscando empreendimentos (endpoint público)...');
    
        const { data, error } = await supabaseAdmin
          .from('empreendimentos')
          .select('id, nome, endereco, bairro, cidade, estado, status, created_at, unidades, tipo, observacoes, imagem, condicoes_pagamento, diferenciais_gerais, diferenciais_unidade, progresso_obra, data_inicio_obra, data_entrega, valor_condominio, valor_iptu, data_ultima_atualizacao, telefone, email, catalogo_url, tour_virtual_url, simulador_caixa_url, dormitorios, suites, vagas');

    if (error) {
      console.error('❌ [Backend] Erro na query:', error);
      return res.status(500).json({ 
        error: 'Erro ao buscar empreendimentos',
        details: error.message
      });
    }

    console.log('✅ [Backend] Empreendimentos carregados:', data.length);
    res.json(data);
  } catch (error) {
    console.error('❌ [Backend] Erro completo:', error);
    res.status(500).json({ 
      error: error.message,
      details: 'Erro interno do servidor'
    });
  }
});

// Endpoint público para buscar um empreendimento específico por ID
app.get('/api/empreendimentos-public/:id', async (req, res) => {
  try {
    const { supabaseAdmin } = require('./config/database');
    const { id } = req.params;
    
    console.log(`🔍 [Backend] Buscando empreendimento ${id} (endpoint público)...`);
    
    const { data, error } = await supabaseAdmin
      .from('empreendimentos')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      // Se não encontrou o registro, retornar 404
      if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
        return res.status(404).json({ error: 'Empreendimento não encontrado' });
      }
      console.error('❌ [Backend] Erro na query:', error);
      return res.status(500).json({ 
        error: 'Erro ao buscar empreendimento',
        details: error.message
      });
    }

    if (!data) {
      return res.status(404).json({ error: 'Empreendimento não encontrado' });
    }

    console.log(`✅ [Backend] Empreendimento ${id} carregado`);
    res.json(data);
  } catch (error) {
    console.error('❌ [Backend] Erro completo:', error);
    res.status(500).json({ 
      error: error.message,
      details: 'Erro interno do servidor'
    });
  }
});

// Endpoint público para buscar unidades de um empreendimento
app.get('/api/empreendimentos-public/:id/unidades', async (req, res) => {
  try {
    const { supabaseAdmin } = require('./config/database');
    const { id } = req.params;
    const { tipo, torre, status } = req.query;
    
    console.log(`🔍 [Backend] Buscando unidades do empreendimento ${id} (endpoint público)...`);
    
    let query = supabaseAdmin
      .from('unidades')
      .select('*')
      .eq('empreendimento_id', id);

    // Aplicar filtros se fornecidos
    if (tipo) query = query.eq('tipo_unidade', tipo);
    if (torre) query = query.eq('torre', torre);
    if (status) query = query.eq('status', status);

    const { data, error } = await query.order('numero', { ascending: true });

    if (error) {
      console.error('❌ [Backend] Erro na query:', error);
      return res.status(500).json({ 
        error: 'Erro ao buscar unidades',
        details: error.message
      });
    }

    console.log(`✅ [Backend] Unidades carregadas: ${data.length}`);
    res.json(data || []);
  } catch (error) {
    console.error('❌ [Backend] Erro completo:', error);
    res.status(500).json({ 
      error: error.message,
      details: 'Erro interno do servidor'
    });
  }
});

// Rota raiz
app.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'CrmInvest Backend API', 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      api: '/api',
      documents: '/api/documents',
      idsf: '/api/idsf'
    }
  });
});

// ============================================
// Rotas de upload de galeria de empreendimentos
// Definidas diretamente no server.js para evitar problemas com Express Router
// ============================================

// POST /api/empreendimentos/:id/galeria/upload - Upload de imagem única
app.post('/api/empreendimentos/:id/galeria/upload', authenticateUpload, multerGaleria.single('imagem'), uploadGaleria);

// POST /api/empreendimentos/:id/galeria/upload-multiple - Upload múltiplo
app.post('/api/empreendimentos/:id/galeria/upload-multiple', authenticateUpload, multerGaleria.array('imagens', 20), uploadGaleriaMultiple);

// DELETE /api/empreendimentos/:id/galeria/* - Remover imagem
app.delete('/api/empreendimentos/:id/galeria/*', authenticateUpload, removeGaleria);

// ============================================
// Rotas de unidades de empreendimentos
// Definidas diretamente no server.js para evitar problemas com Express Router
// ============================================

// POST /api/empreendimentos/:id/unidades - Criar nova unidade (apenas admin)
app.post('/api/empreendimentos/:id/unidades', authenticateToken, createUnidade);

// PUT /api/empreendimentos/:id/unidades/:unidadeId - Atualizar unidade (apenas admin)
app.put('/api/empreendimentos/:id/unidades/:unidadeId', authenticateToken, updateUnidade);

// DELETE /api/empreendimentos/:id/unidades/:unidadeId - Deletar unidade (apenas admin)
app.delete('/api/empreendimentos/:id/unidades/:unidadeId', authenticateToken, deleteUnidade);

// PUT /api/empreendimentos/:id - Atualizar empreendimento (apenas admin)
app.put('/api/empreendimentos/:id', authenticateToken, updateEmpreendimento);

// Usar rotas refatoradas
app.use('/api', routes);

// Configurar Socket.IO apenas se não estiver no Vercel
let io = null;
if (!process.env.VERCEL && !process.env.DISABLE_WEBSOCKET) {
  io = new Server(server, {
    cors: {
      origin: [
        'http://localhost:3000',
        'https://localhost:3000',
        process.env.FRONTEND_URL,
        'https://www.solumn.com.br', // ✅ Domínio de produção
        'https://solumn.com.br', // ✅ Domínio de produção sem www
        /\.vercel\.app$/
      ],
      methods: ['GET', 'POST']
    }
  });
}

// Socket.IO connection handling
if (io) {
  io.on('connection', (socket) => {
    console.log('🔌 [SOCKET.IO] Cliente conectado:', {
      socketId: socket.id,
      timestamp: new Date().toISOString(),
      userAgent: socket.handshake.headers['user-agent'] || 'N/A',
      ip: socket.handshake.address || 'N/A'
    });
    
    // Handler para join-lead-notifications
    socket.on('join-lead-notifications', (data) => {
      console.log('📢 [SOCKET.IO] Cliente entrou no grupo de notificações de leads:', {
        socketId: socket.id,
        userType: data.userType,
        userId: data.userId,
        timestamp: new Date().toISOString()
      });
      socket.join('lead-notifications');
      console.log('✅ [SOCKET.IO] Cliente adicionado ao grupo: lead-notifications');
      
      // Enviar contagem atual de leads para admins
      if (data.userType === 'admin') {
        socket.emit('lead-count-update', { count: 0 }); // Será atualizado pela requisição
        console.log('📊 [SOCKET.IO] Contagem inicial de leads enviada para admin');
      }
    });
    
    // Handler para request-lead-count
    socket.on('request-lead-count', async (data) => {
      console.log('📊 [SOCKET.IO] Solicitação de contagem de leads:', {
        socketId: socket.id,
        userType: data.userType,
        userId: data.userId,
        timestamp: new Date().toISOString()
      });
      
      if (data.userType === 'admin') {
        try {
          console.log('🔍 [SOCKET.IO] Buscando contagem de leads não atribuídos...');
          // Contar leads não atribuídos
          const { count, error } = await supabaseAdmin
            .from('pacientes')
            .select('*', { count: 'exact', head: true })
            .is('consultor_id', null)
            .eq('status', 'lead');
            
          if (!error) {
            socket.emit('lead-count-update', { count: count || 0 });
            console.log(`📊 [SOCKET.IO] Contagem de leads enviada para admin:`, {
              socketId: socket.id,
              count: count || 0,
              timestamp: new Date().toISOString()
            });
          } else {
            console.error('❌ [SOCKET.IO] Erro ao contar leads:', error);
          }
        } catch (error) {
          console.error('❌ [SOCKET.IO] Erro ao contar leads:', error);
        }
      }
    });
    
    // Handler para join-clinicas-notifications
    socket.on('join-clinicas-notifications', (data) => {
      console.log('📢 [SOCKET.IO] Cliente entrou no grupo de notificações de clínicas:', {
        socketId: socket.id,
        userType: data.userType,
        userId: data.userId,
        timestamp: new Date().toISOString()
      });
      socket.join('clinicas-notifications');
      console.log('✅ [SOCKET.IO] Cliente adicionado ao grupo: clinicas-notifications');
      
      // Enviar contagem atual de clínicas para admins
      if (data.userType === 'admin') {
        socket.emit('clinicas-count-update', { count: 0 }); // Será atualizado pela requisição
        console.log('📊 [SOCKET.IO] Contagem inicial de clínicas enviada para admin');
      }
    });
    
    // Handler para request-clinicas-count
    socket.on('request-clinicas-count', async (data) => {
      console.log('📊 [SOCKET.IO] Solicitação de contagem de novas clínicas:', {
        socketId: socket.id,
        userType: data.userType,
        userId: data.userId,
        timestamp: new Date().toISOString()
      });
      
      if (data.userType === 'admin') {
        try {
          console.log('🔍 [SOCKET.IO] Buscando contagem de novas clínicas...');
          // Contar novas clínicas
          const { count, error } = await supabaseAdmin
            .from('novas_clinicas')
            .select('*', { count: 'exact', head: true });
            
          if (!error) {
            socket.emit('clinicas-count-update', { count: count || 0 });
            console.log(`📊 [SOCKET.IO] Contagem de novas clínicas enviada para admin:`, {
              socketId: socket.id,
              count: count || 0,
              timestamp: new Date().toISOString()
            });
          } else {
            console.error('❌ [SOCKET.IO] Erro ao contar novas clínicas:', error);
          }
        } catch (error) {
          console.error('❌ [SOCKET.IO] Erro ao contar novas clínicas:', error);
        }
      }
    });
    
    // REMOVIDO: Handlers de incorporadora-notifications foram migrados para Supabase Realtime
    // Os handlers join-incorporadora-notifications e lead-capturado-incorporadora
    // não são mais necessários pois agora usamos notificacoes_leads, notificacoes_agendamentos
    // e notificacoes_fechamentos via Supabase Realtime
    
    socket.on('disconnect', () => {
      console.log('🔌 [SOCKET.IO] Cliente desconectado:', {
        socketId: socket.id,
        timestamp: new Date().toISOString()
      });
    });
  });
}

// Tornar io disponível globalmente para os controllers
app.locals.io = io;

// Inicializar servidor
// Configurar timeouts para uploads grandes
server.timeout = 300000; // 5 minutos
server.keepAliveTimeout = 310000; // 5min + 10s
server.headersTimeout = 320000; // 5min + 20s

server.listen(PORT, async () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🌐 Acesse: http://localhost:${PORT}`);
  console.log(`🗄️ Usando Supabase como banco de dados`);
  console.log(`⏱️ Timeout configurado: ${server.timeout}ms (${server.timeout/1000}s)`);
  
  // Verificar conexão com Supabase
  try {
    const { data, error } = await supabaseAdmin.from('clinicas').select('count').limit(1);
    if (error) {
      console.log('⚠️  Configure as variáveis SUPABASE_URL e SUPABASE_SERVICE_KEY no arquivo .env');
      console.log('📖 Consulte o README.md para instruções detalhadas');
    } else {
      console.log('✅ Conexão com Supabase estabelecida com sucesso!');
    }
  } catch (error) {
    console.log('⚠️  Erro ao conectar com Supabase:', error.message);
  }

  // Inicializar job de envio de notificações automáticas de boletos
  try {
    const enviadorNotificacoes = require('./jobs/enviar-notificacoes-boletos');
    // Executar a cada 3 horas
    enviadorNotificacoes.iniciarScheduler(3);
    console.log('✅ Job de notificações automáticas de boletos iniciado (intervalo: 3 horas)');
  } catch (error) {
    console.error('⚠️  Erro ao iniciar job de notificações:', error.message);
    console.error('⚠️  Stack trace:', error.stack);
  }

  // Inicializar job de atualização de status de boletos
  try {
    const atualizadorStatus = require('./jobs/atualizar-status-boletos');
    // Executar a cada 6 horas (mesmo intervalo das notificações)
    atualizadorStatus.iniciarScheduler(6);
    console.log('✅ Job de atualização de status de boletos iniciado');
  } catch (error) {
    console.error('⚠️  Erro ao iniciar job de atualização de status:', error.message);
  }
}); 

module.exports = { app, server, io };