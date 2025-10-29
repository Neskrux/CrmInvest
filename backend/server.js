const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
require('dotenv').config();

// Importar configurações
const corsConfig = require('./config/cors');
const { supabase, supabaseAdmin } = require('./config/database');

// Importar rotas refatoradas
const routes = require('./routes');

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
  // Pular body parser para rotas de upload
  if (req.path.includes('/contratos-carteira/upload')) {
    return next();
  }
  bodyParser.json({ limit: '250mb' })(req, res, next);
});

app.use((req, res, next) => {
  // Pular body parser para rotas de upload
  if (req.path.includes('/contratos-carteira/upload')) {
    return next();
  }
  bodyParser.urlencoded({ extended: true, limit: '250mb' })(req, res, next);
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
          .select('id, nome, endereco, bairro, cidade, estado, status, created_at, unidades, tipo')
          .eq('status', 'ativo'); // Apenas empreendimentos ativos

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

// Usar rotas refatoradas
app.use('/api', routes);

// ✅ TODAS AS ROTAS FORAM REFATORADAS COM SUCESSO!
// O backend agora está completamente modularizado em:
// - Auth (6 rotas)
// - Usuários (2 rotas)
// - Empresas (2 rotas)
// - Clínicas (16 rotas)
// - Consultores (12 rotas)
// - Pacientes & Leads (13 rotas)
// - Agendamentos & Evidências (10 rotas)
// - Fechamentos (9 rotas)
// - Dashboard (5 rotas)
// - Materiais (4 rotas)
// - Metas (3 rotas)
// - Novas Clínicas (6 rotas)
// - Pacientes Financeiro (5 rotas)
// - Meta Ads (13 rotas)
// Total: 106 rotas refatoradas + 3 rotas de APIs externas = 109 rotas

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
    
    // Handler para join-incorporadora-notifications
    socket.on('join-incorporadora-notifications', (data) => {
      console.log('📢 [SOCKET.IO] Tentativa de entrada no grupo de notificações da incorporadora:', {
        socketId: socket.id,
        userType: data.userType,
        userId: data.userId,
        empresaId: data.empresaId,
        timestamp: new Date().toISOString()
      });
      
      // Permitir TODOS os usuários da incorporadora (empresa_id === 5)
      // Isso garante que todos os usuários logados recebam as notificações de novo lead
      if (data.empresaId === 5 && socket.connected) {
        socket.join('incorporadora-notifications');
        
        // Confirmar entrada no grupo ao cliente
        socket.emit('joined-incorporadora-notifications', {
          success: true,
          socketId: socket.id,
          timestamp: new Date().toISOString()
        });
        
        // CRÍTICO: Verificar quantos clientes estão no grupo para debug
        io.in('incorporadora-notifications').clients((err, clients) => {
          if (!err) {
            console.log('📊 [SOCKET.IO] Total de clientes no grupo incorporadora-notifications:', clients.length);
            console.log('📋 [SOCKET.IO] IDs dos clientes conectados:', clients);
          }
        });
        
        console.log('✅ [SOCKET.IO] Cliente adicionado ao grupo: incorporadora-notifications');
        console.log('🏢 [SOCKET.IO] Incorporadora conectada - Notificações ativas para:', {
          empresaId: data.empresaId,
          socketId: socket.id,
          userType: data.userType,
          userId: data.userId,
          rooms: Array.from(socket.rooms)
        });
      } else {
        const motivo = !socket.connected ? 'Socket não conectado' : 
                      data.empresaId !== 5 ? 'Não é incorporadora (empresa_id !== 5)' : 
                      'Desconhecido';
        
        console.log('⚠️ [SOCKET.IO] Acesso negado ao grupo incorporadora-notifications:', {
          userType: data.userType,
          empresaId: data.empresaId,
          socketConnected: socket.connected,
          motivo
        });
        
        socket.emit('joined-incorporadora-notifications', {
          success: false,
          motivo,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    // Handler para lead-capturado (notificar outros usuários que o lead foi pego)
    socket.on('lead-capturado', (data) => {
      console.log('🎯 [SOCKET.IO] Lead capturado - notificando outros usuários:', {
        leadId: data.leadId,
        sdrId: data.sdrId,
        sdrNome: data.sdrNome,
        empresaId: data.empresaId,
        socketId: socket.id,
        timestamp: new Date().toISOString()
      });
      
      // Emitir para todos os usuários do grupo incorporadora-notifications
      // EXCETO o usuário que capturou o lead
      socket.to('incorporadora-notifications').emit('lead-capturado-incorporadora', {
        leadId: data.leadId,
        sdrId: data.sdrId,
        sdrNome: data.sdrNome,
        empresaId: data.empresaId,
        timestamp: new Date().toISOString()
      });
      
      console.log('✅ [SOCKET.IO] Evento lead-capturado-incorporadora emitido para outros usuários');
    });
    
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
}); 

module.exports = { app, server, io };