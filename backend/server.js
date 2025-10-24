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
app.use(helmet()); // Proteção de headers HTTP
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
        /\.vercel\.app$/
      ],
      methods: ['GET', 'POST']
    }
  });
}

// Socket.IO connection handling
if (io) {
  io.on('connection', (socket) => {
    console.log('🔌 Cliente conectado:', socket.id);
    
    // Handler para join-lead-notifications
    socket.on('join-lead-notifications', (data) => {
      console.log('📢 Cliente entrou no grupo de notificações de leads:', data);
      socket.join('lead-notifications');
      
      // Enviar contagem atual de leads para admins
      if (data.userType === 'admin') {
        socket.emit('lead-count-update', { count: 0 }); // Será atualizado pela requisição
      }
    });
    
    // Handler para request-lead-count
    socket.on('request-lead-count', async (data) => {
      console.log('📊 Solicitação de contagem de leads:', data);
      
      if (data.userType === 'admin') {
        try {
          // Contar leads não atribuídos
          const { count, error } = await supabaseAdmin
            .from('pacientes')
            .select('*', { count: 'exact', head: true })
            .is('consultor_id', null)
            .eq('status', 'lead');
            
          if (!error) {
            socket.emit('lead-count-update', { count: count || 0 });
            console.log(`📊 Contagem de leads enviada: ${count || 0}`);
          }
        } catch (error) {
          console.error('❌ Erro ao contar leads:', error);
        }
      }
    });
    
    // Handler para join-clinicas-notifications
    socket.on('join-clinicas-notifications', (data) => {
      console.log('📢 Cliente entrou no grupo de notificações de clínicas:', data);
      socket.join('clinicas-notifications');
      
      // Enviar contagem atual de clínicas para admins
      if (data.userType === 'admin') {
        socket.emit('clinicas-count-update', { count: 0 }); // Será atualizado pela requisição
      }
    });
    
    // Handler para request-clinicas-count
    socket.on('request-clinicas-count', async (data) => {
      console.log('📊 Solicitação de contagem de novas clínicas:', data);
      
      if (data.userType === 'admin') {
        try {
          // Contar novas clínicas
          const { count, error } = await supabaseAdmin
            .from('novas_clinicas')
            .select('*', { count: 'exact', head: true });
            
          if (!error) {
            socket.emit('clinicas-count-update', { count: count || 0 });
            console.log(`📊 Contagem de novas clínicas enviada: ${count || 0}`);
          }
        } catch (error) {
          console.error('❌ Erro ao contar novas clínicas:', error);
        }
      }
    });
    
    socket.on('disconnect', () => {
      console.log('🔌 Cliente desconectado:', socket.id);
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