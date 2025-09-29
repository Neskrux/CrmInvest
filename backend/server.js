const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const MetaAdsAPI = require('./meta-ads-api');
const { createServer } = require('http');
const { Server } = require('socket.io');
const nodemailer = require('nodemailer');
require('dotenv').config();


const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 5000;

// Health check endpoint para Railway
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Rota raiz para Railway
app.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'CrmInvest Backend API', 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      api: '/api',
      whatsapp: '/api/whatsapp'
    }
  });
});

// Configuração CORS para Vercel
const corsOptions = {
  origin: true,  // ← Temporariamente permitir todos os domínios
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Servir arquivos estáticos da pasta uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configuração do Multer para upload de arquivos
// Usar memoryStorage para funcionar no Vercel
const storage = multer.memoryStorage();

// Filtros para upload
const fileFilter = (req, file, cb) => {
  // Permitir apenas arquivos PDF
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Apenas arquivos PDF são permitidos!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // Limite de 10MB
  }
});

// Supabase client - usando apenas variáveis de ambiente
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Verificar se as variáveis de ambiente estão configuradas
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não configuradas!');
  console.error('Configure SUPABASE_URL e SUPABASE_SERVICE_KEY no arquivo .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey); // Cliente admin para Storage

// Configurar Nodemailer para envio de emails
const getEmailTransporter = () => {
  const service = process.env.EMAIL_SERVICE || 'gmail';
  
  switch (service) {
    case 'sendgrid':
      return nodemailer.createTransporter({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: 'apikey',
          pass: process.env.EMAIL_PASS
        }
      });
    
    case 'mailgun':
      return nodemailer.createTransporter({
        host: 'smtp.mailgun.org',
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
    
    case 'gmail':
    default:
      return nodemailer.createTransporter({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
  }
};

const transporter = getEmailTransporter();

// Log da configuração de email (para debug)
console.log(`📧 Email configurado: ${process.env.EMAIL_SERVICE || 'gmail'}`);
console.log(`📧 Email user: ${process.env.EMAIL_USER || 'seu-email@gmail.com'}`);
console.log(`📧 Email from: ${process.env.EMAIL_FROM || 'noreply@crm.com'}`);

// Configurar Supabase Storage
const STORAGE_BUCKET = 'contratos';

// Função para fazer upload para Supabase Storage com retry
const uploadToSupabase = async (file, retryCount = 0) => {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000; // 1 segundo
  
  try {
    // Debug: verificar configuração do Supabase
    console.log('🔍 Debug uploadToSupabase:', {
      hasSupabaseAdmin: !!supabaseAdmin,
      bucket: STORAGE_BUCKET,
      fileSize: file.size,
      supabaseUrl: supabaseUrl ? 'OK' : 'MISSING',
      supabaseKey: supabaseServiceKey ? 'OK' : 'MISSING'
    });

    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const randomId = Math.round(Math.random() * 1E9);
    const fileName = `contrato-${timestamp}-${randomId}.pdf`;
    
    
    // Fazer upload para o Supabase Storage usando cliente admin com timeout
    const uploadPromise = supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, file.buffer, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: false
      });

    // Timeout de 60 segundos para uploads grandes
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Upload timeout - arquivo muito grande ou conexão lenta')), 60000);
    });

    const { data, error } = await Promise.race([uploadPromise, timeoutPromise]);

    if (error) throw error;
    
    
    // Retornar informações do arquivo
    return {
      fileName: fileName,
      originalName: file.originalname,
      size: file.size,
      path: data.path
    };
  } catch (error) {
    console.error(`❌ Erro no upload para Supabase (tentativa ${retryCount + 1}):`, error.message);
    
    // Se não atingiu o máximo de tentativas e é um erro de conexão, tenta novamente
    if (retryCount < MAX_RETRIES && isRetryableError(error)) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return uploadToSupabase(file, retryCount + 1);
    }
    
    throw error;
  }
};

// Função para verificar se o erro permite retry
const isRetryableError = (error) => {
  const retryableMessages = [
    'fetch failed',
    'other side closed',
    'timeout',
    'network',
    'socket',
    'ECONNRESET',
    'ETIMEDOUT'
  ];
  
  const errorMessage = error.message.toLowerCase();
  return retryableMessages.some(msg => errorMessage.includes(msg));
};

// JWT Secret - usando apenas variável de ambiente
const JWT_SECRET = process.env.JWT_SECRET;

// Verificar se o JWT_SECRET está configurado
if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET não configurado!');
  console.error('Configure JWT_SECRET no arquivo .env');
  process.exit(1);
}

// Função para normalizar emails (converter para minúsculas e limpar espaços)
const normalizarEmail = (email) => {
  if (!email) return '';
  return email.toLowerCase().trim();
};

// Middleware especial para upload que preserva headers
const authenticateUpload = (req, res, next) => {
  // Para upload com FormData, o header pode vir em minúsculas ou maiúsculas
  const authHeader = req.headers.authorization || req.headers.Authorization;
  const token = authHeader && authHeader.split(' ')[1];

  console.log('🔍 Debug authenticateUpload:', {
    hasAuthHeader: !!authHeader,
    hasToken: !!token,
    headers: Object.keys(req.headers)
  });

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso requerido' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error('❌ JWT verify error:', err.message);
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// Middleware de autenticação
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN


  if (!token) {
    return res.status(401).json({ error: 'Token de acesso requerido' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// Middleware para verificar se é admin
const requireAdmin = (req, res, next) => {
  if (req.user.tipo !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
  }
  next();
};

// Middleware para verificar se é o próprio consultor ou admin
const requireOwnerOrAdmin = (req, res, next) => {
  const consultorId = req.params.consultorId || req.query.consultor_id || req.body.consultor_id;
  
  if (req.user.tipo === 'admin') {
    return next(); // Admin pode tudo
  }
  
  if (req.user.tipo === 'consultor' && req.user.id === parseInt(consultorId)) {
    return next(); // Consultor pode acessar seus próprios dados
  }
  
  return res.status(403).json({ error: 'Acesso negado' });
};



// === ROTAS DE AUTENTICAÇÃO ===
app.post('/api/login', async (req, res) => {
  try {
    const { email, senha } = req.body; // 'email' será usado para nome do consultor também

    if (!email || !senha) {
      return res.status(400).json({ error: 'Nome/Email e senha são obrigatórios' });
    }

    let usuario = null;
    let tipoLogin = null;

  // Primeiro, tentar login como admin (por email)
  if (typeof email === 'string' && email.includes('@')) {
      const { data: usuarios, error } = await supabaseAdmin
        .from('usuarios')
        .select(`
          *,
          consultores(nome, telefone)
        `)
        .eq('email', email)
        .eq('ativo', true)
        .limit(1);

      if (error) throw error;

      if (usuarios && usuarios.length > 0) {
        usuario = usuarios[0];
        tipoLogin = 'admin';
      }
    }

  // Se não encontrou admin, tentar login como consultor (apenas por email)
  if (!usuario && typeof email === 'string' && email.includes('@')) {
      // Normalizar email para busca
      const emailNormalizado = normalizarEmail(email);
      
      const { data: consultores, error } = await supabaseAdmin
        .from('consultores')
        .select('*')
        .eq('email', emailNormalizado)
        .limit(1);


      if (error) throw error;

      if (consultores && consultores.length > 0) {
        usuario = consultores[0];
        tipoLogin = 'consultor';
      } else {
      }
    }

    if (!usuario) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Verificar senha
    
    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    
    // TEMPORÁRIO: Aceitar senha admin123 para admin
    const senhaTemporaria = senha === 'admin123' && usuario.email === 'admin@crm.com';
    
    if (!senhaValida && !senhaTemporaria) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Atualizar último login
    try {
      await supabaseAdmin
        .from('usuarios')
        .update({ ultimo_login: new Date().toISOString() })
        .eq('id', usuario.id);
    } catch (error) {
      console.log('Erro ao atualizar ultimo_login:', error);
    }

    // Padronizar payload e resposta para compatibilidade com Meta Ads
    const payload = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      tipo: usuario.tipo,
      consultor_id: usuario.consultor_id !== undefined ? usuario.consultor_id : (tipoLogin === 'consultor' ? usuario.id : null),
      podealterarstatus: usuario.podealterarstatus || usuario.tipo === 'admin' || false,
      pode_ver_todas_novas_clinicas: usuario.pode_ver_todas_novas_clinicas || false,
      is_freelancer: usuario.is_freelancer !== false // Por padrão, se não especificado, é freelancer
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });

    // Remover senha do objeto antes de enviar para o front
    delete usuario.senha;

    // Garante que usuario.consultor_id, podealterarstatus, pode_ver_todas_novas_clinicas e is_freelancer também estejam presentes no objeto de resposta
    usuario.consultor_id = payload.consultor_id;
    usuario.podealterarstatus = payload.podealterarstatus;
    usuario.pode_ver_todas_novas_clinicas = payload.pode_ver_todas_novas_clinicas;
    usuario.is_freelancer = payload.is_freelancer;

    res.json({ token, usuario });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.post('/api/logout', authenticateToken, (req, res) => {
  // Com JWT stateless, o logout é feito removendo o token do cliente
  res.json({ message: 'Logout realizado com sucesso' });
});

// Atualizar perfil do usuário
app.put('/api/usuarios/perfil', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { nome, email, senhaAtual, novaSenha } = req.body;

    // Validações básicas
    if (!nome || !email) {
      return res.status(400).json({ error: 'Nome e email são obrigatórios' });
    }

    // Verificar se o email já está sendo usado por outro usuário
    const { data: emailExistente } = await supabaseAdmin
      .from('usuarios')
      .select('id')
      .eq('email', email)
      .neq('id', userId)
      .single();

    if (emailExistente) {
      return res.status(400).json({ error: 'Este email já está sendo usado por outro usuário' });
    }

    // Se foi fornecida nova senha, verificar senha atual
    if (novaSenha && novaSenha.trim() !== '') {
      if (!senhaAtual) {
        return res.status(400).json({ error: 'Senha atual é obrigatória para alterar a senha' });
      }

      // Buscar senha atual do usuário
      const { data: usuario, error: userError } = await supabaseAdmin
        .from('usuarios')
        .select('senha')
        .eq('id', userId)
        .single();

      if (userError || !usuario) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Verificar se senha atual está correta
      const senhaCorreta = await bcrypt.compare(senhaAtual, usuario.senha);
      if (!senhaCorreta) {
        return res.status(400).json({ error: 'Senha atual incorreta' });
      }
    }

    // Preparar dados para atualização
    const updateData = {
      nome,
      email
    };

    // Se nova senha foi fornecida, incluir na atualização
    if (novaSenha && novaSenha.trim() !== '') {
      const hashedPassword = await bcrypt.hash(novaSenha, 10);
      updateData.senha = hashedPassword;
    }

    // Executar atualização
    const { error: updateError } = await supabaseAdmin
      .from('usuarios')
      .update(updateData)
      .eq('id', userId);

    if (updateError) {
      throw updateError;
    }

    // Buscar dados atualizados do usuário
    const { data: usuarioAtualizado, error: fetchError } = await supabaseAdmin
      .from('usuarios')
      .select('id, nome, email, tipo, ultimo_login, created_at')
      .eq('id', userId)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    res.json({
      message: 'Perfil atualizado com sucesso',
      usuario: usuarioAtualizado
    });

  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar informações completas do perfil do usuário
app.get('/api/usuarios/perfil', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Buscar dados completos do usuário
    const { data: usuario, error } = await supabaseAdmin
      .from('usuarios')
      .select('id, nome, email, tipo, ultimo_login, created_at')
      .eq('id', userId)
      .single();

    if (error || !usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({
      usuario: usuario
    });

  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar perfil do consultor
app.put('/api/consultores/perfil', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { nome, telefone, email, senhaAtual, novaSenha, pix } = req.body;

    // Validações básicas
    if (!nome || !email) {
      return res.status(400).json({ error: 'Nome e email são obrigatórios' });
    }

    // Verificar se o email já está sendo usado por outro consultor
    const { data: emailExistente } = await supabaseAdmin
      .from('consultores')
      .select('id')
      .eq('email', email)
      .neq('id', userId)
      .single();

    if (emailExistente) {
      return res.status(400).json({ error: 'Este email já está sendo usado por outro consultor' });
    }

    // Se foi fornecida nova senha, verificar senha atual
    if (novaSenha && novaSenha.trim() !== '') {
      if (!senhaAtual) {
        return res.status(400).json({ error: 'Senha atual é obrigatória para alterar a senha' });
      }

      // Buscar senha atual do consultor
      const { data: consultor, error: userError } = await supabaseAdmin
        .from('consultores')
        .select('senha')
        .eq('id', userId)
        .single();

      if (userError || !consultor) {
        return res.status(404).json({ error: 'Consultor não encontrado' });
      }

      // Verificar se senha atual está correta
      const senhaCorreta = await bcrypt.compare(senhaAtual, consultor.senha);
      if (!senhaCorreta) {
        return res.status(400).json({ error: 'Senha atual incorreta' });
      }
    }

    // Preparar dados para atualização
    const updateData = {
      nome,
      email,
      telefone: telefone || null,
      pix: pix || null
    };

    // Se nova senha foi fornecida, incluir na atualização
    if (novaSenha && novaSenha.trim() !== '') {
      const hashedPassword = await bcrypt.hash(novaSenha, 10);
      updateData.senha = hashedPassword;
    }

    // Executar atualização
    const { error: updateError } = await supabaseAdmin
      .from('consultores')
      .update(updateData)
      .eq('id', userId);

    if (updateError) {
      throw updateError;
    }

    // Buscar dados atualizados do consultor
    const { data: consultorAtualizado, error: fetchError } = await supabaseAdmin
      .from('consultores')
      .select('id, nome, email, telefone, pix, ativo, created_at')
      .eq('id', userId)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    res.json({
      message: 'Perfil atualizado com sucesso',
      consultor: consultorAtualizado
    });

  } catch (error) {
    console.error('Erro ao atualizar perfil do consultor:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar informações completas do perfil do consultor
app.get('/api/consultores/perfil', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Buscar dados completos do consultor
    const { data: consultor, error } = await supabaseAdmin
      .from('consultores')
      .select('id, nome, email, telefone, pix, ativo, created_at, codigo_referencia, pode_ver_todas_novas_clinicas, podealterarstatus, is_freelancer')
      .eq('id', userId)
      .single();

    if (error || !consultor) {
      return res.status(404).json({ error: 'Consultor não encontrado' });
    }

    res.json({
      consultor: consultor
    });

  } catch (error) {
    console.error('Erro ao buscar perfil do consultor:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para atualizar permissões de consultor (apenas admin)
app.put('/api/consultores/:id/permissao', authenticateToken, async (req, res) => {
  try {
    // Verificar se o usuário é admin
    if (req.user.tipo !== 'admin') {
      return res.status(403).json({ error: 'Apenas administradores podem alterar permissões' });
    }

    const { id } = req.params;
    const { podeAlterarStatus } = req.body;

    if (typeof podeAlterarStatus !== 'boolean') {
      return res.status(400).json({ error: 'podeAlterarStatus deve ser true ou false' });
    }

    // Atualizar permissão na tabela consultores
    const { data, error } = await supabaseAdmin
      .from('consultores')
      .update({ podeAlterarStatus })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Erro ao atualizar permissão:', error);
      return res.status(500).json({ error: 'Erro ao atualizar permissão' });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Consultor não encontrado' });
    }

    res.json({ 
      success: true, 
      message: 'Permissão atualizada com sucesso',
      consultor: data[0]
    });

  } catch (error) {
    console.error('Erro na rota de permissão:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.get('/api/verify-token', authenticateToken, async (req, res) => {
  try {
    // Buscar dados atualizados do usuário na tabela usuarios
    let usuario = null;
    let tipo = null;
    let consultor_nome = null;
    let consultor_id = null;

    const { data: usuarioData, error: errorUsuario } = await supabaseAdmin
      .from('usuarios')
      .select('*')
      .eq('id', req.user.id)
      .eq('ativo', true)
      .single();

    if (usuarioData) {
      usuario = usuarioData;
      tipo = usuario.tipo || 'admin';
      consultor_id = usuario.consultor_id || null;
    } else {
      // Se não achou em usuarios, buscar em consultores
      const { data: consultorData, error: errorConsultor } = await supabaseAdmin
        .from('consultores')
        .select('*')
        .eq('id', req.user.id)
        .eq('ativo', true)
        .single();

      if (consultorData) {
        usuario = consultorData;
        tipo = usuario.tipo || 'consultor';
        consultor_id = usuario.id;
      }
    }

    if (!usuario) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    // Remover senha do objeto antes de enviar para o front
    const { senha: _, ...dadosUsuario } = usuario;

    res.json({
      usuario: {
        ...dadosUsuario,
        tipo,
        consultor_id,
        podealterarstatus: usuario.podealterarstatus || tipo === 'admin' || false,
        pode_ver_todas_novas_clinicas: usuario.pode_ver_todas_novas_clinicas || false,
        is_freelancer: usuario.is_freelancer !== false // Por padrão, se não especificado, é freelancer
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ROTAS DA API

// === CLÍNICAS === (Admin vê todas, Consultores vêem apenas públicas ou suas próprias)
app.get('/api/clinicas', authenticateToken, async (req, res) => {
  try {
    const { cidade, estado } = req.query;
    
    let query = supabase
      .from('clinicas')
      .select(`
        *,
        consultores!consultor_id(nome)
      `)
      .order('nome');

    // Filtrar por estado se especificado
    if (estado) {
      query = query.eq('estado', estado);
    }

    // Filtrar por cidade se especificado
    if (cidade) {
      query = query.ilike('cidade', `%${cidade}%`);
    }

    // Se for consultor freelancer (não tem as duas permissões), mostrar apenas clínicas públicas (sem proprietário) ou suas próprias
    // Consultores internos (com pode_ver_todas_novas_clinicas=true E podealterarstatus=true) veem todas as clínicas
    if (req.user.tipo === 'consultor' && !(req.user.pode_ver_todas_novas_clinicas === true && req.user.podealterarstatus === true)) {
      query = query.or(`consultor_id.is.null,consultor_id.eq.${req.user.id}`);
    }

    const { data, error } = await query;

    if (error) throw error;
    
    // Reformatar dados para incluir nome do consultor
    const formattedData = data.map(clinica => ({
      ...clinica,
      consultor_nome: clinica.consultores?.nome
    }));
    
    res.json(formattedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/clinicas/cidades', authenticateToken, async (req, res) => {
  try {
    const { estado } = req.query;
    
    let query = supabase
      .from('clinicas')
      .select('cidade')
      .not('cidade', 'is', null)
      .not('cidade', 'eq', '');

    // Filtrar por estado se especificado
    if (estado) {
      query = query.eq('estado', estado);
    }

    const { data, error } = await query;

    if (error) throw error;
    
    // Extrair cidades únicas e ordenar
    const cidadesUnicas = [...new Set(data.map(c => c.cidade))].sort();
    res.json(cidadesUnicas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/clinicas/estados', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('clinicas')
      .select('estado')
      .not('estado', 'is', null)
      .not('estado', 'eq', '');

    if (error) throw error;
    
    // Extrair estados únicos e ordenar
    const estadosUnicos = [...new Set(data.map(c => c.estado))].sort();
    res.json(estadosUnicos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/clinicas', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { nome, endereco, bairro, cidade, estado, nicho, telefone, email, status } = req.body;
    
    // Geocodificar endereço se tiver cidade e estado
    let latitude = null;
    let longitude = null;
    
    if (cidade && estado) {
      try {
        const address = `${endereco ? endereco + ', ' : ''}${cidade}, ${estado}, Brasil`;
        const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
        const geocodeResponse = await fetch(geocodeUrl);
        const geocodeData = await geocodeResponse.json();
        
        if (geocodeData && geocodeData.length > 0) {
          latitude = parseFloat(geocodeData[0].lat);
          longitude = parseFloat(geocodeData[0].lon);
        }
      } catch (geocodeError) {
        console.error('Erro ao geocodificar:', geocodeError);
        // Continua sem coordenadas se falhar
      }
    }
    
    const { data, error } = await supabaseAdmin
      .from('clinicas')
      .insert([{ 
        nome, 
        endereco, 
        bairro, 
        cidade, 
        estado, 
        nicho, 
        telefone, 
        email, 
        status: status || 'ativo', // Padrão: desbloqueado
        latitude,
        longitude,
        tipo_origem: 'direta' // Clínicas criadas diretamente por admin
      }])
      .select();

    if (error) throw error;
    res.json({ id: data[0].id, message: 'Clínica cadastrada com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/clinicas/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🔧 PUT /api/clinicas/:id recebido');
    console.log('🔧 ID da clínica:', id);
    console.log('🔧 Body recebido:', req.body);
    console.log('🔧 Usuário autenticado:', req.user);
    
    // Permitir atualização parcial: só atualiza os campos enviados
    const camposPermitidos = ['nome', 'endereco', 'bairro', 'cidade', 'estado', 'nicho', 'telefone', 'email', 'status'];
    const updateData = {};
    for (const campo of camposPermitidos) {
      if (req.body[campo] !== undefined) {
        updateData[campo] = req.body[campo];
      }
    }
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'Nenhum campo válido para atualizar.' });
    }
    console.log('🔧 Dados para atualizar:', updateData);
    
    const { data, error } = await supabaseAdmin
      .from('clinicas')
      .update(updateData)
      .eq('id', id)
      .select();

    console.log('🔧 Resultado do Supabase:');
    console.log('🔧 Data:', data);
    console.log('🔧 Error:', error);

    if (error) {
      console.error('❌ Erro do Supabase:', error);
      return res.status(500).json({ error: error.message });
    }
    
    if (!data || data.length === 0) {
      console.error('❌ Nenhuma linha foi atualizada! Verifique as policies do Supabase.');
      return res.status(403).json({ error: 'Nenhuma linha atualizada! Verifique as policies do Supabase.' });
    }
    
    console.log('✅ Clínica atualizada com sucesso:', data[0]);
    res.json({ id: data[0].id, message: 'Clínica atualizada com sucesso!' });
  } catch (error) {
    console.error('❌ Erro geral:', error);
    res.status(500).json({ error: error.message });
  }
});

// === CONSULTORES === (Apenas Admin pode gerenciar)
app.get('/api/consultores', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('consultores')
      .select('*')
      .order('nome');

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/consultores', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { nome, telefone, email, senha, pix } = req.body;
    
    // Validar campos obrigatórios
    if (!senha || senha.trim() === '') {
      return res.status(400).json({ error: 'Senha é obrigatória!' });
    }
    
    if (!email || email.trim() === '') {
      return res.status(400).json({ error: 'Email é obrigatório!' });
    }
    
    // Normalizar email
    const emailNormalizado = normalizarEmail(email);
    
    // Verificar se email já existe
    const { data: emailExistente, error: emailError } = await supabaseAdmin
      .from('consultores')
      .select('id')
      .eq('email', emailNormalizado)
      .limit(1);

    if (emailError) throw emailError;
    
    if (emailExistente && emailExistente.length > 0) {
      return res.status(400).json({ error: 'Este email já está cadastrado!' });
    }
    
    // Hash da senha antes de salvar
    const saltRounds = 10;
    const senhaHash = await bcrypt.hash(senha, saltRounds);
    
    const { data, error } = await supabaseAdmin
      .from('consultores')
      .insert([{ nome, telefone, email: emailNormalizado, senha: senhaHash, pix }])
      .select();

    if (error) throw error;
    res.json({ 
      id: data[0].id, 
      message: 'Consultor cadastrado com sucesso!',
      email: emailNormalizado
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// === CADASTRO PÚBLICO DE CONSULTORES === (Sem autenticação)
app.post('/api/consultores/cadastro', async (req, res) => {
  try {
    console.log('📝 === NOVO CADASTRO DE CONSULTOR ===');
    console.log('📋 Dados recebidos:', req.body);
    
    const { nome, telefone, email, senha, cpf, pix } = req.body;
    
    // Validar campos obrigatórios
    if (!nome || !telefone || !email || !senha || !cpf || !pix) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios!' });
    }
    
    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Email inválido!' });
    }
    
    // Normalizar email antes de salvar
    const emailNormalizado = normalizarEmail(email);
    
    // Validar se email já existe
    const { data: emailExistente, error: emailError } = await supabaseAdmin
      .from('consultores')
      .select('id')
      .eq('email', emailNormalizado)
      .limit(1);

    if (emailError) throw emailError;
    
    if (emailExistente && emailExistente.length > 0) {
      return res.status(400).json({ error: 'Este email já está cadastrado!' });
    }
    
    // Validar se CPF já existe
    const { data: cpfExistente, error: cpfError } = await supabaseAdmin
      .from('consultores')
      .select('id')
      .eq('cpf', cpf)
      .limit(1);

    if (cpfError) throw cpfError;
    
    if (cpfExistente && cpfExistente.length > 0) {
      return res.status(400).json({ error: 'Este CPF já está cadastrado!' });
    }
    
    // Hash da senha
    const saltRounds = 10;
    const senhaHash = await bcrypt.hash(senha, saltRounds);
    
    // Inserir consultor
    const { data, error } = await supabaseAdmin
      .from('consultores')
      .insert([{ 
        nome, 
        telefone, 
        email: emailNormalizado, 
        senha: senhaHash, 
        cpf, 
        pix,
        tipo: 'consultor',
        ativo: true,
        is_freelancer: true // Por padrão, consultores do cadastro público são freelancers
      }])
      .select();

    if (error) {
      console.error('❌ Erro ao inserir consultor:', error);
      throw error;
    }

    const consultorId = data[0].id;
    
    // Gerar código de referência automaticamente para freelancers
    try {
      console.log('🔄 Iniciando geração de código de referência para consultor ID:', consultorId);
      
      const nomeLimpo = nome
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/[^a-z0-9]/g, '') // Remove caracteres especiais
        .substring(0, 10); // Limita a 10 caracteres
      
      const codigoReferencia = `${nomeLimpo}${consultorId}`;
      
      console.log('📝 Dados do código:', {
        nomeOriginal: nome,
        nomeLimpo: nomeLimpo,
        consultorId: consultorId,
        codigoReferencia: codigoReferencia
      });
      
      // Atualizar o consultor com o código de referência
      const { error: updateError } = await supabaseAdmin
        .from('consultores')
        .update({ codigo_referencia: codigoReferencia })
        .eq('id', consultorId);
      
      if (updateError) {
        console.error('⚠️ Erro ao gerar código de referência:', updateError);
        console.error('⚠️ Detalhes do erro:', {
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
          code: updateError.code
        });
        // Não falhar o cadastro se não conseguir gerar o código
      } else {
        console.log('✅ Código de referência gerado automaticamente:', codigoReferencia);
        
        // Verificar se o código foi salvo corretamente
        const { data: consultorVerificacao, error: verifError } = await supabaseAdmin
          .from('consultores')
          .select('id, nome, codigo_referencia')
          .eq('id', consultorId)
          .single();
          
        if (verifError) {
          console.error('⚠️ Erro ao verificar código salvo:', verifError);
        } else {
          console.log('✅ Código verificado no banco:', consultorVerificacao);
        }
      }
    } catch (codigoError) {
      console.error('⚠️ Erro ao gerar código de referência:', codigoError);
      console.error('⚠️ Stack trace:', codigoError.stack);
      // Não falhar o cadastro se não conseguir gerar o código
    }
    
    res.json({ 
      id: consultorId, 
      message: 'Consultor cadastrado com sucesso! Agora você pode fazer login.',
      email: emailNormalizado
    });
  } catch (error) {
    console.error('Erro no cadastro:', error);
    res.status(500).json({ error: error.message });
  }
});

// === CADASTRO PÚBLICO DE PACIENTES/LEADS === (Sem autenticação)
app.post('/api/leads/cadastro', async (req, res) => {
  try {
    console.log('📝 Cadastro de lead recebido:', req.body);
    const { nome, telefone, tipo_tratamento, cpf, observacoes, cidade, estado, ref_consultor } = req.body;
    
    // Validar campos obrigatórios
    if (!nome || !telefone || !cpf) {
      return res.status(400).json({ error: 'Nome, telefone e CPF são obrigatórios!' });
    }
    
    // Validar nome (mínimo 2 caracteres)
    if (nome.trim().length < 2) {
      return res.status(400).json({ error: 'Nome deve ter pelo menos 2 caracteres!' });
    }
    
    // Validar telefone (formato básico)
    const telefoneRegex = /^[\(\)\s\-\+\d]{10,15}$/;
    if (!telefoneRegex.test(telefone.replace(/\s/g, ''))) {
      return res.status(400).json({ error: 'Telefone inválido!' });
    }
    
    // Validar CPF (11 dígitos)
    const cpfNumeros = cpf.replace(/\D/g, '');
    if (cpfNumeros.length !== 11) {
      return res.status(400).json({ error: 'CPF deve ter 11 dígitos!' });
    }
    
    // Normalizar telefone (remover formatação)
    const telefoneNumeros = telefone.replace(/\D/g, '');
    
    // Verificar se telefone já existe
    const { data: telefoneExistente, error: telefoneError } = await supabaseAdmin
      .from('pacientes')
      .select('id, nome, created_at')
      .eq('telefone', telefoneNumeros)
      .limit(1);

    if (telefoneError) {
      console.error('❌ Erro ao verificar telefone:', telefoneError);
      throw telefoneError;
    }
    
    if (telefoneExistente && telefoneExistente.length > 0) {
      const pacienteExistente = telefoneExistente[0];
      const dataCadastro = new Date(pacienteExistente.created_at).toLocaleDateString('pt-BR');
      console.log('❌ Telefone já cadastrado:', { 
        telefone: telefoneNumeros, 
        paciente: pacienteExistente.nome,
        dataCadastro: dataCadastro 
      });
      return res.status(400).json({ 
        error: `Este número de telefone já está cadastrado para ${pacienteExistente.nome} (cadastrado em ${dataCadastro}). Por favor, utilize outro número.` 
      });
    }
    
    
    // Verificar se CPF já existe
    const { data: cpfExistente, error: cpfError } = await supabaseAdmin
      .from('pacientes')
      .select('id, nome, created_at')
      .eq('cpf', cpfNumeros)
      .limit(1);

    if (cpfError) {
      console.error('❌ Erro ao verificar CPF:', cpfError);
      throw cpfError;
    }
    
    if (cpfExistente && cpfExistente.length > 0) {
      const pacienteExistente = cpfExistente[0];
      const dataCadastro = new Date(pacienteExistente.created_at).toLocaleDateString('pt-BR');
      console.log('❌ CPF já cadastrado:', { 
        cpf: cpfNumeros, 
        paciente: pacienteExistente.nome,
        dataCadastro: dataCadastro 
      });
      return res.status(400).json({ 
        error: `Este CPF já está cadastrado para ${pacienteExistente.nome} (cadastrado em ${dataCadastro}). Por favor, verifique os dados.` 
      });
    }
    
    // Buscar consultor pelo código de referência se fornecido
    let consultorId = null;
    if (ref_consultor && ref_consultor.trim() !== '') {
      console.log('🔍 Buscando consultor pelo código de referência:', ref_consultor);
      
      const { data: consultorData, error: consultorError } = await supabaseAdmin
        .from('consultores')
        .select('id, nome, codigo_referencia, ativo')
        .eq('codigo_referencia', ref_consultor.trim())
        .eq('ativo', true)
        .single();
      
      if (consultorError) {
        console.error('❌ Erro ao buscar consultor:', consultorError);
        console.error('❌ Detalhes do erro:', {
          message: consultorError.message,
          details: consultorError.details,
          hint: consultorError.hint,
          code: consultorError.code
        });
        // Não falhar o cadastro se não encontrar o consultor, apenas logar o erro
      } else if (consultorData) {
        consultorId = consultorData.id;
        console.log('✅ Consultor encontrado:', { 
          id: consultorData.id, 
          nome: consultorData.nome,
          codigo_referencia: consultorData.codigo_referencia,
          ativo: consultorData.ativo
        });
      } else {
        console.log('⚠️ Consultor não encontrado para o código:', ref_consultor);
      }
    } else {
      console.log('ℹ️ Nenhum código de referência fornecido');
    }
    
    // Inserir lead/paciente
    console.log('💾 Inserindo lead com consultor_id:', consultorId);
    
    const { data, error } = await supabaseAdmin
      .from('pacientes')
      .insert([{ 
        nome: nome.trim(), 
        telefone: telefoneNumeros, // Usar telefone normalizado (apenas números)
        cpf: cpfNumeros,
        tipo_tratamento: tipo_tratamento || null,
        status: 'lead', 
        observacoes: observacoes || null,
        cidade: cidade ? cidade.trim() : null,
        estado: estado ? estado.trim() : null,
        consultor_id: consultorId // Atribuir ao consultor se encontrado pelo código de referência
      }])
      .select();

    if (error) {
      console.error('❌ Erro ao inserir lead:', error);
      throw error;
    }
    
    console.log('✅ Lead cadastrado com sucesso:', {
      id: data[0].id,
      nome: data[0].nome,
      consultor_id: data[0].consultor_id,
      status: data[0].status
    });
    
    // Emitir evento Socket.IO para notificar admins sobre novo lead
    if (io) {
      console.log('📢 Emitindo evento new-lead via Socket.IO');
      io.to('lead-notifications').emit('new-lead', {
        leadId: data[0].id,
        nome: data[0].nome,
        telefone: data[0].telefone,
        tipo_tratamento: data[0].tipo_tratamento,
        cidade: data[0].cidade,
        estado: data[0].estado,
        timestamp: new Date().toISOString()
      });
      
      // Atualizar contagem de leads para admins
      setTimeout(() => updateLeadCount(), 100); // Pequeno delay para garantir que o lead foi inserido
    }
    
    res.json({ 
      id: data[0].id, 
      message: 'Cadastro realizado com sucesso! Entraremos em contato em breve.',
      nome: nome.trim()
    });
  } catch (error) {
    console.error('Erro no cadastro de lead:', error);
    res.status(500).json({ error: 'Erro interno do servidor. Tente novamente.' });
  }
});

// === CADASTRO PÚBLICO DE CLÍNICAS === (Sem autenticação)
app.post('/api/clinicas/cadastro-publico', async (req, res) => {
  try {
    console.log('📝 Cadastro de clínica recebido:', req.body);
    const { 
      nome, 
      cnpj, 
      endereco, 
      bairro, 
      cidade, 
      estado, 
      telefone, 
      email, 
      nicho, 
      responsavel, 
      observacoes, 
      ref_consultor 
    } = req.body;
    
    // Validar campos obrigatórios
    if (!nome || !cnpj || !telefone || !email || !responsavel) {
      return res.status(400).json({ error: 'Nome da clínica, CNPJ, telefone, email e responsável são obrigatórios!' });
    }
    
    // Validar nome (mínimo 2 caracteres)
    if (nome.trim().length < 2) {
      return res.status(400).json({ error: 'Nome da clínica deve ter pelo menos 2 caracteres!' });
    }
    
    // Validar CNPJ (14 dígitos)
    const cnpjNumeros = cnpj.replace(/\D/g, '');
    if (cnpjNumeros.length !== 14) {
      return res.status(400).json({ error: 'CNPJ deve ter 14 dígitos!' });
    }
    
    // Validar telefone (formato básico)
    const telefoneRegex = /^[\(\)\s\-\+\d]{10,15}$/;
    if (!telefoneRegex.test(telefone.replace(/\s/g, ''))) {
      return res.status(400).json({ error: 'Telefone inválido!' });
    }
    
    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Email inválido!' });
    }
    
    // Normalizar telefone (remover formatação)
    const telefoneNumeros = telefone.replace(/\D/g, '');
    
    // Verificar se telefone já existe
    const { data: telefoneExistente, error: telefoneError } = await supabaseAdmin
      .from('novas_clinicas')
      .select('id, nome, created_at')
      .eq('telefone', telefoneNumeros)
      .limit(1);

    if (telefoneError) {
      console.error('❌ Erro ao verificar telefone:', telefoneError);
      throw telefoneError;
    }
    
    if (telefoneExistente && telefoneExistente.length > 0) {
      const clinicaExistente = telefoneExistente[0];
      const dataCadastro = new Date(clinicaExistente.created_at).toLocaleDateString('pt-BR');
      console.log('❌ Telefone já cadastrado:', { 
        telefone: telefoneNumeros, 
        clinica: clinicaExistente.nome,
        data: dataCadastro
      });
      return res.status(400).json({ 
        error: `Este número de telefone já está cadastrado para ${clinicaExistente.nome} (cadastrado em ${dataCadastro}).` 
      });
    }
    
    // Buscar consultor pelo código de referência se fornecido
    let consultorId = null;
    let consultorNome = null;
    if (ref_consultor && ref_consultor.trim() !== '') {
      console.log('🔍 Buscando consultor pelo código de referência:', ref_consultor);
      
      const { data: consultorData, error: consultorError } = await supabaseAdmin
        .from('consultores')
        .select('id, nome, codigo_referencia, ativo')
        .eq('codigo_referencia', ref_consultor.trim())
        .eq('ativo', true)
        .single();
      
      if (consultorError) {
        console.error('❌ Erro ao buscar consultor:', consultorError);
        // Não falhar o cadastro se não encontrar o consultor, apenas logar o erro
      } else if (consultorData) {
        consultorId = consultorData.id;
        consultorNome = consultorData.nome;
        console.log('✅ Consultor encontrado:', { 
          id: consultorData.id, 
          nome: consultorData.nome,
          codigo_referencia: consultorData.codigo_referencia,
          ativo: consultorData.ativo
        });
      } else {
        console.log('⚠️ Consultor não encontrado para o código:', ref_consultor);
      }
    } else {
      console.log('ℹ️ Nenhum código de referência fornecido');
    }
    
    // Geocodificar endereço se tiver cidade e estado
    let latitude = null;
    let longitude = null;
    
    if (cidade && estado) {
      try {
        const address = `${endereco ? endereco + ', ' : ''}${cidade}, ${estado}, Brasil`;
        const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
        const geocodeResponse = await fetch(geocodeUrl);
        const geocodeData = await geocodeResponse.json();
        
        if (geocodeData && geocodeData.length > 0) {
          latitude = parseFloat(geocodeData[0].lat);
          longitude = parseFloat(geocodeData[0].lon);
        }
      } catch (geocodeError) {
        console.error('Erro ao geocodificar:', geocodeError);
        // Continua sem coordenadas se falhar
      }
    }
    
    // Inserir clínica na tabela novas_clinicas
    console.log('💾 Inserindo clínica com consultor_id:', consultorId);
    
    const { data, error } = await supabaseAdmin
      .from('novas_clinicas')
      .insert([{ 
        nome: nome.trim(), 
        cnpj: cnpjNumeros,
        endereco: endereco ? endereco.trim() : null,
        bairro: bairro ? bairro.trim() : null,
        cidade: cidade ? cidade.trim() : null,
        estado: estado ? estado.trim() : null,
        telefone: telefoneNumeros,
        email: email.trim(),
        nicho: nicho || null,
        responsavel: responsavel.trim(),
        observacoes: observacoes ? observacoes.trim() : null,
        status: 'tem_interesse',
        latitude,
        longitude,
        criado_por_consultor_id: consultorId,
        tipo_origem: 'aprovada' // Clínicas que se cadastraram pelo link público (serão aprovadas)
      }])
      .select();

    if (error) {
      console.error('❌ Erro ao inserir clínica:', error);
      throw error;
    }
    
    console.log('✅ Clínica inserida com sucesso:', data[0]);
    
    // Emitir evento Socket.IO para notificar admins sobre nova clínica (cadastro público)
    if (io) {
      console.log('📢 Emitindo evento new-clinica via Socket.IO (cadastro público)');
      io.to('clinicas-notifications').emit('new-clinica', {
        clinicaId: data[0].id,
        nome: data[0].nome,
        cidade: data[0].cidade,
        estado: data[0].estado,
        telefone: data[0].telefone,
        email: data[0].email,
        nicho: data[0].nicho,
        status: data[0].status,
        observacoes: data[0].observacoes,
        responsavel: data[0].responsavel,
        criado_por_consultor_id: data[0].criado_por_consultor_id,
        created_at: data[0].created_at,
        origem: 'cadastro_publico' // Identificar que veio do formulário público
      });
      
      // Atualizar contagem de novas clínicas para admins
      setTimeout(() => updateClinicasCount(), 100); // Pequeno delay para garantir que a clínica foi inserida
    }
    
    res.json({ 
      id: data[0].id, 
      message: 'Cadastro realizado com sucesso! Entraremos em contato em até 24 horas.',
      nome: nome.trim(),
      consultor_referencia: consultorNome
    });
  } catch (error) {
    console.error('Erro no cadastro de clínica:', error);
    res.status(500).json({ error: 'Erro interno do servidor. Tente novamente.' });
  }
});

app.put('/api/consultores/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, telefone, email, senha, pix } = req.body;
    
    // Preparar dados para atualização
    const updateData = { nome, telefone, pix };
    
    // Atualizar email se fornecido
    if (email && email.trim() !== '') {
      const emailNormalizado = normalizarEmail(email);
      
      // Verificar se email já existe em outro consultor
      const { data: emailExistente, error: emailError } = await supabaseAdmin
        .from('consultores')
        .select('id')
        .eq('email', emailNormalizado)
        .neq('id', id)
        .limit(1);

      if (emailError) throw emailError;
      
      if (emailExistente && emailExistente.length > 0) {
        return res.status(400).json({ error: 'Este email já está sendo usado por outro consultor!' });
      }
      
      updateData.email = emailNormalizado;
    }
    
    // Se uma nova senha foi fornecida, fazer hash dela
    if (senha && senha.trim() !== '') {
      const saltRounds = 10;
      updateData.senha = await bcrypt.hash(senha, saltRounds);
    }
    
    const { data, error } = await supabaseAdmin
      .from('consultores')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json({ 
      id: data[0].id, 
      message: 'Consultor atualizado com sucesso!',
      email: updateData.email
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE - Excluir consultor (apenas admin)
app.delete('/api/consultores/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { transferir_para_consultor_id, apenas_desativar } = req.body;
    
    // Verificar se o consultor existe
    const { data: consultor, error: consultorError } = await supabaseAdmin
      .from('consultores')
      .select('id, nome, is_freelancer, ativo')
      .eq('id', id)
      .single();

    if (consultorError) {
      if (consultorError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Consultor não encontrado' });
      }
      throw consultorError;
    }

    // Verificar se é o próprio admin tentando se excluir
    if (req.user.id === parseInt(id)) {
      return res.status(400).json({ error: 'Você não pode excluir a si mesmo' });
    }

    // Verificar se o consultor tem pacientes associados
    const { data: pacientesAssociados, error: pacientesError } = await supabaseAdmin
      .from('pacientes')
      .select('id, nome')
      .eq('consultor_id', id);

    if (pacientesError) throw pacientesError;

    // Se tem pacientes associados e não foi especificado como lidar com eles
    if (pacientesAssociados && pacientesAssociados.length > 0) {
      if (!transferir_para_consultor_id && !apenas_desativar) {
        return res.status(400).json({ 
          error: 'Este consultor possui pacientes associados. É necessário especificar como lidar com eles.',
          pacientes_associados: pacientesAssociados.length,
          opcoes: {
            transferir_para_consultor_id: 'ID do consultor para transferir os pacientes',
            apenas_desativar: 'true para apenas desativar o consultor em vez de excluir'
          }
        });
      }

      // Se foi solicitado transferir pacientes
      if (transferir_para_consultor_id) {
        // Verificar se o consultor de destino existe
        const { data: consultorDestino, error: destinoError } = await supabaseAdmin
          .from('consultores')
          .select('id, nome')
          .eq('id', transferir_para_consultor_id)
          .single();

        if (destinoError || !consultorDestino) {
          return res.status(400).json({ error: 'Consultor de destino não encontrado' });
        }

        // Transferir pacientes para o novo consultor
        const { error: transferError } = await supabaseAdmin
          .from('pacientes')
          .update({ consultor_id: transferir_para_consultor_id })
          .eq('consultor_id', id);

        if (transferError) throw transferError;

        console.log(`📋 ${pacientesAssociados.length} pacientes transferidos de ${consultor.nome} para ${consultorDestino.nome}`);
      }
    }

    // Se foi solicitado apenas desativar
    if (apenas_desativar) {
      const { error: deactivateError } = await supabaseAdmin
        .from('consultores')
        .update({ ativo: false })
        .eq('id', id);

      if (deactivateError) throw deactivateError;

      res.json({ 
        message: `Consultor ${consultor.nome} desativado com sucesso!`,
        desativado: true
      });
    } else {
      // Excluir consultor (após transferir pacientes se necessário)
      const { error: deleteError } = await supabaseAdmin
        .from('consultores')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      res.json({ 
        message: `Consultor ${consultor.nome} excluído com sucesso!`,
        pacientes_transferidos: pacientesAssociados ? pacientesAssociados.length : 0
      });
    }
  } catch (error) {
    console.error('Erro ao excluir consultor:', error);
    
    // Se for erro de foreign key constraint, retornar erro mais específico
    if (error.code === '23503') {
      return res.status(400).json({ 
        error: 'Não é possível excluir este consultor pois ele possui pacientes associados. Use as opções de transferência ou desativação.',
        code: 'FOREIGN_KEY_CONSTRAINT'
      });
    }
    
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Gerar código de referência para um consultor específico
app.post('/api/consultores/:id/gerar-codigo', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar dados do consultor
    const { data: consultor, error: consultorError } = await supabaseAdmin
      .from('consultores')
      .select('id, nome, codigo_referencia')
      .eq('id', id)
      .single();
    
    if (consultorError) throw consultorError;
    if (!consultor) {
      return res.status(404).json({ error: 'Consultor não encontrado' });
    }
    
    // Gerar código único baseado no nome e ID
    const nomeLimpo = consultor.nome
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9]/g, '') // Remove caracteres especiais
      .substring(0, 10); // Limita a 10 caracteres
    
    const codigoReferencia = `${nomeLimpo}${id}`;
    
    // Atualizar o consultor com o novo código
    const { data: updatedConsultor, error: updateError } = await supabaseAdmin
      .from('consultores')
      .update({ codigo_referencia: codigoReferencia })
      .eq('id', id)
      .select()
      .single();
    
    if (updateError) throw updateError;
    
    const linkPersonalizado = `https://crm.investmoneysa.com.br/captura-lead?ref=${codigoReferencia}`;
    
    res.json({
      codigo_referencia: codigoReferencia,
      link_personalizado: linkPersonalizado,
      message: 'Código de referência gerado com sucesso!'
    });
  } catch (error) {
    console.error('Erro ao gerar código de referência:', error);
    res.status(500).json({ error: error.message });
  }
});

// Gerar códigos de referência para todos os consultores freelancers que não possuem
app.post('/api/consultores/gerar-codigos-faltantes', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Buscar consultores freelancers que não possuem código de referência
    const { data: consultores, error: consultoresError } = await supabaseAdmin
      .from('consultores')
      .select('id, nome, codigo_referencia')
      .or('codigo_referencia.is.null,codigo_referencia.eq.')
      .eq('ativo', true);
    
    if (consultoresError) throw consultoresError;
    
    let processados = 0;
    const resultados = [];
    
    for (const consultor of consultores) {
      // Gerar código único baseado no nome e ID
      const nomeLimpo = consultor.nome
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/[^a-z0-9]/g, '') // Remove caracteres especiais
        .substring(0, 10); // Limita a 10 caracteres
      
      const codigoReferencia = `${nomeLimpo}${consultor.id}`;
      
      // Atualizar o consultor com o novo código
      const { error: updateError } = await supabaseAdmin
        .from('consultores')
        .update({ codigo_referencia: codigoReferencia })
        .eq('id', consultor.id);
      
      if (updateError) {
        console.error(`Erro ao atualizar consultor ${consultor.id}:`, updateError);
        resultados.push({ id: consultor.id, nome: consultor.nome, sucesso: false, erro: updateError.message });
      } else {
        processados++;
        resultados.push({ 
          id: consultor.id, 
          nome: consultor.nome, 
          sucesso: true, 
          codigo: codigoReferencia 
        });
      }
    }
    
    res.json({
      message: `Processamento concluído. ${processados} códigos gerados com sucesso.`,
      processados,
      total: consultores.length,
      resultados
    });
  } catch (error) {
    console.error('Erro ao gerar códigos em lote:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obter link personalizado de um consultor
app.get('/api/consultores/:id/link-personalizado', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar se o usuário pode acessar este consultor
    if (req.user.tipo !== 'admin' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    const { data: consultor, error: consultorError } = await supabaseAdmin
      .from('consultores')
      .select('id, nome, codigo_referencia')
      .eq('id', id)
      .single();
    
    if (consultorError) throw consultorError;
    if (!consultor) {
      return res.status(404).json({ error: 'Consultor não encontrado' });
    }
    
    if (consultor.codigo_referencia) {
      const linkPersonalizado = `https://crm.investmoneysa.com.br/captura-lead?ref=${consultor.codigo_referencia}`;
      res.json({
        link_personalizado: linkPersonalizado,
        codigo_referencia: consultor.codigo_referencia
      });
    } else {
      res.json({
        link_personalizado: null,
        codigo_referencia: null
      });
    }
  } catch (error) {
    console.error('Erro ao obter link personalizado:', error);
    res.status(500).json({ error: error.message });
  }
});

// Buscar consultor específico com senha (apenas admin)
app.get('/api/consultores/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabaseAdmin
      .from('consultores')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    
    // Retornar dados incluindo hash da senha (para admin verificar se existe)
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// === PACIENTES === (Admin vê todos, Consultor vê apenas os seus)
app.get('/api/pacientes', authenticateToken, async (req, res) => {
  try {
    let query = supabase
      .from('pacientes')
      .select(`
        *,
        consultores(nome)
      `)
      .order('created_at', { ascending: false });

    // Se for consultor freelancer (não tem as duas permissões), filtrar pacientes atribuídos a ele OU vinculados através de agendamentos
    // Consultores internos (com pode_ver_todas_novas_clinicas=true E podealterarstatus=true) veem todos os pacientes
    if (req.user.tipo === 'consultor' && !(req.user.pode_ver_todas_novas_clinicas === true && req.user.podealterarstatus === true)) {
      // Buscar pacientes com agendamentos deste consultor
      const { data: agendamentos, error: agendError } = await supabaseAdmin
        .from('agendamentos')
        .select('paciente_id')
        .eq('consultor_id', req.user.id);

      if (agendError) throw agendError;

      const pacienteIds = agendamentos.map(a => a.paciente_id);
      
      // Combinar: pacientes atribuídos diretamente OU com agendamentos
      const conditions = [`consultor_id.eq.${req.user.id}`];
      
      if (pacienteIds.length > 0) {
        conditions.push(`id.in.(${pacienteIds.join(',')})`);
      }
      
      // Aplicar filtro OR
      query = query.or(conditions.join(','));
    }

    const { data, error } = await query;

    if (error) throw error;
    
    // Reformatar dados para compatibilidade com frontend
    const formattedData = data.map(paciente => ({
      ...paciente,
      consultor_nome: paciente.consultores?.nome
    }));

    res.json(formattedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/dashboard/pacientes', authenticateToken, async (req, res) => {
  try {
    let query = supabaseAdmin
      .from('pacientes')
      .select(`
        *,
        consultores(nome)
      `)
      .order('created_at', { ascending: false });

    // Se for consultor freelancer (não tem as duas permissões), filtrar pacientes atribuídos a ele OU vinculados através de agendamentos OU fechamentos
    // Consultores internos (com pode_ver_todas_novas_clinicas=true E podealterarstatus=true) veem todos os pacientes
    if (req.user.tipo === 'consultor' && !(req.user.pode_ver_todas_novas_clinicas === true && req.user.podealterarstatus === true)) {
      // Buscar pacientes com agendamentos deste consultor
      const { data: agendamentos, error: agendError } = await supabaseAdmin
        .from('agendamentos')
        .select('paciente_id')
        .eq('consultor_id', req.user.id);

      if (agendError) throw agendError;

      // Buscar pacientes com fechamentos deste consultor
      const { data: fechamentos, error: fechError } = await supabaseAdmin
        .from('fechamentos')
        .select('paciente_id')
        .eq('consultor_id', req.user.id);

      if (fechError) throw fechError;

      const pacienteIdsAgendamentos = agendamentos.map(a => a.paciente_id);
      const pacienteIdsFechamentos = fechamentos.map(f => f.paciente_id);
      
      // Combinar todos os IDs únicos
      const todosPacienteIds = [...new Set([...pacienteIdsAgendamentos, ...pacienteIdsFechamentos])];
      
      // Combinar: pacientes atribuídos diretamente OU com agendamentos OU fechamentos
      const conditions = [`consultor_id.eq.${req.user.id}`];
      
      if (todosPacienteIds.length > 0) {
        conditions.push(`id.in.(${todosPacienteIds.join(',')})`);
      }
      
      // Aplicar filtro OR
      query = query.or(conditions.join(','));
    }

    const { data, error } = await query;

    if (error) throw error;
    
    // Reformatar dados para compatibilidade com frontend
    const formattedData = data.map(paciente => ({
      ...paciente,
      consultor_nome: paciente.consultores?.nome
    }));

    res.json(formattedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/pacientes', authenticateToken, async (req, res) => {
  try {
    const { nome, telefone, cpf, tipo_tratamento, status, observacoes, consultor_id, cidade, estado } = req.body;
    
    // Normalizar telefone e CPF (remover formatação)
    const telefoneNumeros = telefone ? telefone.replace(/\D/g, '') : '';
    const cpfNumeros = cpf ? cpf.replace(/\D/g, '') : '';
    
    // Verificar se telefone já existe
    if (telefoneNumeros) {
      const { data: telefoneExistente, error: telefoneError } = await supabaseAdmin
        .from('pacientes')
        .select('id, nome, created_at')
        .eq('telefone', telefoneNumeros)
        .limit(1);

      if (telefoneError) throw telefoneError;
      
      if (telefoneExistente && telefoneExistente.length > 0) {
        const pacienteExistente = telefoneExistente[0];
        const dataCadastro = new Date(pacienteExistente.created_at).toLocaleDateString('pt-BR');
        return res.status(400).json({ 
          error: `Este número de telefone já está cadastrado para ${pacienteExistente.nome} (cadastrado em ${dataCadastro}).` 
        });
      }
    }
    
    // Verificar se CPF já existe
    if (cpfNumeros) {
      const { data: cpfExistente, error: cpfError } = await supabaseAdmin
        .from('pacientes')
        .select('id, nome, created_at')
        .eq('cpf', cpfNumeros)
        .limit(1);

      if (cpfError) throw cpfError;
      
      if (cpfExistente && cpfExistente.length > 0) {
        const pacienteExistente = cpfExistente[0];
        const dataCadastro = new Date(pacienteExistente.created_at).toLocaleDateString('pt-BR');
        return res.status(400).json({ 
          error: `Este CPF já está cadastrado para ${pacienteExistente.nome} (cadastrado em ${dataCadastro}).` 
        });
      }
    }
    
    // Converter consultor_id para null se não fornecido
    const consultorId = consultor_id && consultor_id !== '' ? 
      (typeof consultor_id === 'number' ? consultor_id : parseInt(consultor_id)) : null;
    
    // Lógica de diferenciação: se tem consultor = paciente, se não tem = lead
    const statusFinal = status || (consultorId ? 'paciente' : 'lead');
    
    const { data, error } = await supabaseAdmin
      .from('pacientes')
      .insert([{ 
        nome, 
        telefone: telefoneNumeros, // Usar telefone normalizado
        cpf: cpfNumeros, // Usar CPF normalizado
        tipo_tratamento, 
        status: statusFinal, // Usar status diferenciado
        observacoes,
        consultor_id: consultorId,
        cidade,
        estado
      }])
      .select();

    if (error) throw error;
    res.json({ id: data[0].id, message: 'Paciente cadastrado com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/pacientes/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, telefone, cpf, tipo_tratamento, status, observacoes, consultor_id, cidade, estado } = req.body;
    
    // Verificar se é consultor interno - consultores internos não podem editar pacientes
    if (req.user.tipo === 'consultor' && req.user.pode_ver_todas_novas_clinicas === true && req.user.podealterarstatus === true) {
      return res.status(403).json({ error: 'Consultores internos não podem editar pacientes.' });
    }
    
    // Normalizar telefone e CPF (remover formatação)
    const telefoneNumeros = telefone ? telefone.replace(/\D/g, '') : '';
    const cpfNumeros = cpf ? cpf.replace(/\D/g, '') : '';
    
    // Verificar se telefone já existe em outro paciente
    if (telefoneNumeros) {
      const { data: telefoneExistente, error: telefoneError } = await supabaseAdmin
        .from('pacientes')
        .select('id, nome, created_at')
        .eq('telefone', telefoneNumeros)
        .neq('id', id) // Excluir o paciente atual
        .limit(1);

      if (telefoneError) throw telefoneError;
      
      if (telefoneExistente && telefoneExistente.length > 0) {
        const pacienteExistente = telefoneExistente[0];
        const dataCadastro = new Date(pacienteExistente.created_at).toLocaleDateString('pt-BR');
        return res.status(400).json({ 
          error: `Este número de telefone já está cadastrado para ${pacienteExistente.nome} (cadastrado em ${dataCadastro}).` 
        });
      }
    }
    
    // Verificar se CPF já existe em outro paciente
    if (cpfNumeros) {
      const { data: cpfExistente, error: cpfError } = await supabaseAdmin
        .from('pacientes')
        .select('id, nome, created_at')
        .eq('cpf', cpfNumeros)
        .neq('id', id) // Excluir o paciente atual
        .limit(1);

      if (cpfError) throw cpfError;
      
      if (cpfExistente && cpfExistente.length > 0) {
        const pacienteExistente = cpfExistente[0];
        const dataCadastro = new Date(pacienteExistente.created_at).toLocaleDateString('pt-BR');
        return res.status(400).json({ 
          error: `Este CPF já está cadastrado para ${pacienteExistente.nome} (cadastrado em ${dataCadastro}).` 
        });
      }
    }
    
    // Converter consultor_id para null se não fornecido
    const consultorId = consultor_id && consultor_id !== '' ? 
      (typeof consultor_id === 'number' ? consultor_id : parseInt(consultor_id)) : null;
    
    // Lógica de diferenciação: se tem consultor = paciente, se não tem = lead
    // Mas só aplica se o status não foi explicitamente definido
    const statusFinal = status || (consultorId ? 'paciente' : 'lead');
    
    const { data, error } = await supabaseAdmin
      .from('pacientes')
      .update({ 
        nome, 
        telefone: telefoneNumeros, // Usar telefone normalizado
        cpf: cpfNumeros, // Usar CPF normalizado
        tipo_tratamento, 
        status: statusFinal, // Usar status diferenciado
        observacoes,
        consultor_id: consultorId,
        cidade,
        estado
      })
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json({ id: data[0].id, message: 'Paciente atualizado com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/pacientes/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Verificar se é consultor interno - consultores internos não podem editar pacientes
    if (req.user.tipo === 'consultor' && req.user.pode_ver_todas_novas_clinicas === true && req.user.podealterarstatus === true) {
      return res.status(403).json({ error: 'Consultores internos não podem editar pacientes.' });
    }
    
    // Buscar dados do paciente primeiro
    const { data: paciente, error: pacienteError } = await supabaseAdmin
      .from('pacientes')
      .select('*')
      .eq('id', id)
      .single();

    if (pacienteError) throw pacienteError;
    if (!paciente) {
      return res.status(404).json({ error: 'Paciente não encontrado' });
    }

    // Atualizar status do paciente
    const { error } = await supabaseAdmin
      .from('pacientes')
      .update({ status })
      .eq('id', id);

    if (error) throw error;

    // Automação do pipeline
    if (status === 'fechado') {
      // Verificar se já existe fechamento
      const { data: fechamentoExistente } = await supabaseAdmin
        .from('fechamentos')
        .select('id')
        .eq('paciente_id', id)
        .single();

      if (!fechamentoExistente) {
        // Buscar agendamento relacionado
        const { data: agendamento } = await supabaseAdmin
          .from('agendamentos')
          .select('*')
          .eq('paciente_id', id)
          .single();

        // Criar fechamento automaticamente
        await supabaseAdmin
          .from('fechamentos')
          .insert({
            paciente_id: id,
            consultor_id: paciente.consultor_id,
            clinica_id: agendamento?.clinica_id || null,
            agendamento_id: agendamento?.id || null,
            valor_fechado: 0,
            data_fechamento: new Date().toISOString().split('T')[0],
            tipo_tratamento: paciente.tipo_tratamento,
            forma_pagamento: 'A definir',
            observacoes: 'Fechamento criado automaticamente pelo pipeline',
            aprovado: 'pendente'
          });
      }
    }

    res.json({ message: 'Status atualizado com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE - Excluir paciente (apenas admin)
app.delete('/api/pacientes/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Verificar se o usuário é admin
    const { data: user, error: userError } = await supabaseAdmin
      .from('usuarios')
      .select('tipo')
      .eq('id', userId)
      .single();
    
    if (userError) throw userError;
    
    if (user.tipo !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem excluir pacientes.' });
    }
    
    // Excluir agendamentos relacionados primeiro
    await supabaseAdmin
      .from('agendamentos')
      .delete()
      .eq('paciente_id', id);
    
    // Excluir fechamentos relacionados
    await supabaseAdmin
      .from('fechamentos')
      .delete()
      .eq('paciente_id', id);
    
    // Excluir o paciente
    const { error } = await supabaseAdmin
      .from('pacientes')
      .delete()
      .eq('id', id);
      
    if (error) throw error;

    res.json({ message: 'Paciente e registros relacionados excluídos com sucesso!' });
  } catch (error) {
    console.error('Erro ao excluir paciente:', error);
    res.status(500).json({ error: error.message });
  }
});

// === NOVOS LEADS === (Funcionalidade para pegar leads)
app.get('/api/novos-leads', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('pacientes')
      .select('*')
      .is('consultor_id', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/novos-leads/:id/pegar', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { consultor_id } = req.body;
    
    // Verificar se o lead ainda está disponível
    const { data: pacienteAtual, error: checkError } = await supabaseAdmin
      .from('pacientes')
      .select('consultor_id')
      .eq('id', id)
      .single();

    if (checkError) throw checkError;

    if (pacienteAtual.consultor_id !== null) {
      return res.status(400).json({ error: 'Este lead já foi atribuído a outro consultor!' });
    }

    // Determinar qual consultor_id usar
    let consultorIdParaAtribuir;
    
    if (consultor_id) {
      // Se foi fornecido consultor_id no body (admin escolhendo consultor)
      consultorIdParaAtribuir = consultor_id;
    } else if (req.user.consultor_id) {
      // Se o usuário tem consultor_id (consultor normal)
      consultorIdParaAtribuir = req.user.consultor_id;
    } else {
      // Se não tem consultor_id e não foi fornecido no body
      return res.status(400).json({ error: 'É necessário especificar um consultor para atribuir o lead!' });
    }

    // Atribuir o lead ao consultor
    const { error } = await supabaseAdmin
      .from('pacientes')
      .update({ consultor_id: consultorIdParaAtribuir })
      .eq('id', id);

    if (error) throw error;
    
    // Emitir evento Socket.IO para atualizar contagem de leads
    if (io) {
      console.log('📢 Lead atribuído - atualizando contagem via Socket.IO');
      setTimeout(() => updateLeadCount(), 100);
    }
    
    res.json({ message: 'Lead atribuído com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Excluir lead da aba Novos Leads (apenas admin)
app.delete('/api/novos-leads/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar se o lead existe e não está atribuído
    const { data: pacienteAtual, error: checkError } = await supabaseAdmin
      .from('pacientes')
      .select('consultor_id, nome')
      .eq('id', id)
      .single();

    if (checkError) throw checkError;

    if (pacienteAtual.consultor_id !== null) {
      return res.status(400).json({ error: 'Não é possível excluir um lead que já foi atribuído a um consultor!' });
    }

    // Excluir o lead
    const { error } = await supabaseAdmin
      .from('pacientes')
      .delete()
      .eq('id', id);

    if (error) throw error;
    
    // Emitir evento Socket.IO para atualizar contagem de leads
    if (io) {
      console.log('📢 Lead excluído - atualizando contagem via Socket.IO');
      setTimeout(() => updateLeadCount(), 100);
    }
    
    res.json({ message: 'Lead excluído com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// === NOVAS CLÍNICAS === (Funcionalidade para pegar clínicas encontradas nas missões)
app.get('/api/novas-clinicas', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 DEBUG /api/novas-clinicas - Dados do usuário:');
    console.log('🔍 Tipo:', req.user.tipo);
    console.log('🔍 pode_ver_todas_novas_clinicas:', req.user.pode_ver_todas_novas_clinicas);
    console.log('🔍 podealterarstatus:', req.user.podealterarstatus);
    console.log('🔍 is_freelancer:', req.user.is_freelancer);
    
    let query = supabase
      .from('novas_clinicas')
      .select(`
        *,
        consultores!criado_por_consultor_id(nome)
      `)
      .order('created_at', { ascending: false });

    // Se for consultor freelancer (não tem as duas permissões), mostrar apenas clínicas disponíveis (sem proprietário) ou suas próprias
    // Consultores internos (com pode_ver_todas_novas_clinicas=true E podealterarstatus=true) veem todas as novas clínicas
    const isFreelancer = req.user.tipo === 'consultor' && !(req.user.pode_ver_todas_novas_clinicas === true && req.user.podealterarstatus === true);
    console.log('🔍 É freelancer?', isFreelancer);
    
    if (isFreelancer) {
      console.log('🔍 Aplicando filtro para freelancer - ID:', req.user.id);
      query = query.or(`criado_por_consultor_id.is.null,criado_por_consultor_id.eq.${req.user.id}`);
      console.log('🔍 Query filtrada aplicada');
    } else {
      console.log('🔍 Usuário tem acesso a todas as novas clínicas');
    }
    // Admin e consultores internos veem todas as novas clínicas (com ou sem consultor_id)

    const { data, error } = await query;
    
    console.log('🔍 Total de clínicas retornadas:', data ? data.length : 0);
    if (data && data.length > 0) {
      console.log('🔍 Primeiras 3 clínicas:');
      data.slice(0, 3).forEach((clinica, index) => {
        console.log(`🔍 Clínica ${index + 1}: ID=${clinica.id}, Nome=${clinica.nome}, criado_por_consultor_id=${clinica.criado_por_consultor_id}`);
      });
    }

    if (error) throw error;
    
    // Reformatar dados para incluir nome do consultor
    const formattedData = data.map(clinica => ({
      ...clinica,
      consultor_nome: clinica.consultores?.nome
    }));
    
    res.json(formattedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/novas-clinicas', authenticateToken, async (req, res) => {
  try {
    const { nome, cnpj, responsavel, endereco, bairro, cidade, estado, nicho, telefone, email, status, observacoes } = req.body;
    
    // Normalizar telefone (remover formatação)
    const telefoneNumeros = telefone ? telefone.replace(/\D/g, '') : '';
    
    // Verificar se telefone já existe
    if (telefoneNumeros) {
      const { data: telefoneExistente, error: telefoneError } = await supabaseAdmin
        .from('novas_clinicas')
        .select('id, nome, created_at')
        .eq('telefone', telefoneNumeros)
        .limit(1);

      if (telefoneError) throw telefoneError;
      
      if (telefoneExistente && telefoneExistente.length > 0) {
        const clinicaExistente = telefoneExistente[0];
        const dataCadastro = new Date(clinicaExistente.created_at).toLocaleDateString('pt-BR');
        return res.status(400).json({ 
          error: `Este número de telefone já está cadastrado para ${clinicaExistente.nome} (cadastrado em ${dataCadastro}).` 
        });
      }
    }
    
    // Geocodificar endereço se tiver cidade e estado
    let latitude = null;
    let longitude = null;
    
    if (cidade && estado) {
      try {
        const address = `${endereco ? endereco + ', ' : ''}${cidade}, ${estado}, Brasil`;
        const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
        const geocodeResponse = await fetch(geocodeUrl);
        const geocodeData = await geocodeResponse.json();
        
        if (geocodeData && geocodeData.length > 0) {
          latitude = parseFloat(geocodeData[0].lat);
          longitude = parseFloat(geocodeData[0].lon);
        }
      } catch (geocodeError) {
        console.error('Erro ao geocodificar:', geocodeError);
        // Continua sem coordenadas se falhar
      }
    }
    
    // Preparar dados para inserção
    const clinicaData = {
      nome,
      cnpj,
      responsavel,
      endereco,
      bairro,
      cidade,
      estado,
      nicho,
      telefone: telefoneNumeros,
      email,
      status: status || 'tem_interesse',
      observacoes,
      latitude,
      longitude,
      criado_por_consultor_id: req.user.tipo === 'consultor' ? req.user.id : null,
      tipo_origem: 'aprovada' // Todas as novas clínicas serão aprovadas
    };
    
    const { data, error } = await supabaseAdmin
      .from('novas_clinicas')
      .insert([clinicaData])
      .select();

    if (error) throw error;
    
    console.log('✅ Nova clínica cadastrada com sucesso:', {
      id: data[0].id,
      nome: data[0].nome,
      cidade: data[0].cidade,
      estado: data[0].estado,
      consultor_id: data[0].criado_por_consultor_id
    });
    
    // Emitir evento Socket.IO para notificar admins sobre nova clínica
    if (io) {
      console.log('📢 Emitindo evento new-clinica via Socket.IO');
      io.to('clinicas-notifications').emit('new-clinica', {
        clinicaId: data[0].id,
        nome: data[0].nome,
        cidade: data[0].cidade,
        estado: data[0].estado,
        telefone: data[0].telefone,
        email: data[0].email,
        nicho: data[0].nicho,
        status: data[0].status,
        observacoes: data[0].observacoes,
        criado_por_consultor_id: data[0].criado_por_consultor_id,
        created_at: data[0].created_at
      });
      
      // Atualizar contagem de novas clínicas para admins
      setTimeout(() => updateClinicasCount(), 100); // Pequeno delay para garantir que a clínica foi inserida
    }
    
    res.json({ id: data[0].id, message: 'Nova clínica cadastrada com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/novas-clinicas/:id/pegar', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar se a clínica ainda está disponível
    const { data: clinicaAtual, error: checkError } = await supabaseAdmin
      .from('novas_clinicas')
      .select('*')
      .eq('id', id)
      .single();

    if (checkError) throw checkError;

    if (clinicaAtual.consultor_id !== null) {
      return res.status(400).json({ error: 'Esta clínica já foi aprovada!' });
    }

    // Apenas admins podem aprovar clínicas
    if (req.user.tipo !== 'admin') {
      return res.status(403).json({ error: 'Apenas administradores podem aprovar clínicas!' });
    }

    // Mover a clínica da tabela novas_clinicas para clinicas
    const clinicaParaMover = {
      nome: clinicaAtual.nome,
      endereco: clinicaAtual.endereco,
      bairro: clinicaAtual.bairro,
      cidade: clinicaAtual.cidade,
      estado: clinicaAtual.estado,
      nicho: clinicaAtual.nicho,
      telefone: clinicaAtual.telefone,
      email: clinicaAtual.email,
      status: 'ativo',
      consultor_id: clinicaAtual.criado_por_consultor_id, // Definir consultor_id baseado em quem criou
      tipo_origem: 'aprovada' // Clínicas aprovadas da aba "Novas Clínicas"
    };

    // Excluir o campo id para evitar conflitos de chave primária
    delete clinicaParaMover.id;

    // Inserir na tabela clinicas
    const { data: clinicaInserida, error: insertError } = await supabaseAdmin
      .from('clinicas')
      .insert([clinicaParaMover])
      .select();

    if (insertError) throw insertError;

    // Remover da tabela novas_clinicas
    const { error: deleteError } = await supabaseAdmin
      .from('novas_clinicas')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;
    
    // Emitir evento Socket.IO para atualizar contagem de novas clínicas
    if (io) {
      console.log('📢 Clínica aprovada - atualizando contagem via Socket.IO');
      setTimeout(() => updateClinicasCount(), 100);
    }

    res.json({ message: 'Clínica aprovada e movida para clínicas parceiras com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// === ATUALIZAR STATUS DE NOVA CLÍNICA ===
app.put('/api/novas-clinicas/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    console.log('🔧 PUT /api/novas-clinicas/:id/status recebido');
    console.log('🔧 ID da clínica:', id);
    console.log('🔧 Novo status:', status);
    console.log('🔧 Usuário autenticado:', req.user);
    
    // Verificar se o status é válido
    const statusValidos = [
      'sem_primeiro_contato', 
      'tem_interesse', 
      'nao_tem_interesse', 
      'em_contato', 
      'reuniao_marcada', 
      'aguardando_documentacao', 
      'nao_fechou'
    ];
    if (!status || !statusValidos.includes(status)) {
      return res.status(400).json({ error: 'Status inválido! Status válidos: ' + statusValidos.join(', ') });
    }
    
    // Verificar permissões: admin ou consultor com permissão
    const podeAlterarStatus = req.user.tipo === 'admin' || 
      (req.user.tipo === 'consultor' && req.user.podealterarstatus === true);
    
    if (!podeAlterarStatus) {
      return res.status(403).json({ error: 'Você não tem permissão para alterar o status de clínicas!' });
    }
    
    // Verificar se a clínica existe
    const { data: clinicaAtual, error: checkError } = await supabaseAdmin
      .from('novas_clinicas')
      .select('*')
      .eq('id', id)
      .single();

    if (checkError) {
      console.error('❌ Erro ao buscar clínica:', checkError);
      return res.status(404).json({ error: 'Clínica não encontrada!' });
    }
    
    if (!clinicaAtual) {
      return res.status(404).json({ error: 'Clínica não encontrada!' });
    }
    
    // Atualizar o status
    const { data, error } = await supabaseAdmin
      .from('novas_clinicas')
      .update({ status })
      .eq('id', id)
      .select();

    if (error) {
      console.error('❌ Erro do Supabase:', error);
      return res.status(500).json({ error: error.message });
    }
    
    if (!data || data.length === 0) {
      console.error('❌ Nenhuma linha foi atualizada!');
      return res.status(403).json({ error: 'Nenhuma linha atualizada! Verifique as policies do Supabase.' });
    }
    
    console.log('✅ Status da clínica atualizado com sucesso:', data[0]);
    res.json({ id: data[0].id, message: 'Status atualizado com sucesso!' });
  } catch (error) {
    console.error('❌ Erro geral:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/agendamentos', authenticateToken, async (req, res) => {
  try {
    let query = supabase
      .from('agendamentos')
      .select(`
        *,
        pacientes(nome, telefone),
        consultores(nome),
        clinicas(nome)
      `)
      .order('data_agendamento', { ascending: false })
      .order('horario');

    // Se for consultor freelancer (não tem as duas permissões), filtrar apenas seus agendamentos
    // Consultores internos (com pode_ver_todas_novas_clinicas=true E podealterarstatus=true) veem todos os agendamentos
    if (req.user.tipo === 'consultor' && !(req.user.pode_ver_todas_novas_clinicas === true && req.user.podealterarstatus === true)) {
      query = query.eq('consultor_id', req.user.id);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Reformatar dados para compatibilidade com frontend
    const formattedData = data.map(agendamento => ({
      ...agendamento,
      paciente_nome: agendamento.pacientes?.nome,
      paciente_telefone: agendamento.pacientes?.telefone,
      consultor_nome: agendamento.consultores?.nome,
      clinica_nome: agendamento.clinicas?.nome
    }));

    res.json(formattedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/dashboard/agendamentos', authenticateToken, async (req, res) => {
  try {
    let query = supabaseAdmin
      .from('agendamentos')
      .select(`
        *,
        pacientes(nome, telefone),
        consultores(nome),
        clinicas(nome)
      `)
      .order('data_agendamento', { ascending: false })
      .order('horario');

    // Se for consultor freelancer (não tem as duas permissões), filtrar apenas seus agendamentos
    // Consultores internos (com pode_ver_todas_novas_clinicas=true E podealterarstatus=true) veem todos os agendamentos
    if (req.user.tipo === 'consultor' && !(req.user.pode_ver_todas_novas_clinicas === true && req.user.podealterarstatus === true)) {
      query = query.eq('consultor_id', req.user.id);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Reformatar dados para compatibilidade com frontend
    const formattedData = data.map(agendamento => ({
      ...agendamento,
      paciente_nome: agendamento.pacientes?.nome,
      paciente_telefone: agendamento.pacientes?.telefone,
      consultor_nome: agendamento.consultores?.nome,
      clinica_nome: agendamento.clinicas?.nome
    }));

    res.json(formattedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/agendamentos', authenticateToken, async (req, res) => {
  try {
    const { paciente_id, consultor_id, clinica_id, data_agendamento, horario, status, observacoes } = req.body;
    
    // Primeiro, tenta inserir normalmente
    let { data, error } = await supabaseAdmin
      .from('agendamentos')
      .insert([{ paciente_id, consultor_id, clinica_id, data_agendamento, horario, status: status || 'agendado', observacoes }])
      .select();

    // Se der erro de chave duplicada, tenta corrigir a sequência
    if (error && error.message.includes('duplicate key value violates unique constraint')) {
      console.log('Erro de sequência detectado, tentando corrigir...');
      
      // Corrigir a sequência
      await supabaseAdmin.rpc('reset_agendamentos_sequence');
      
      // Tentar inserir novamente
      const retryResult = await supabaseAdmin
        .from('agendamentos')
        .insert([{ paciente_id, consultor_id, clinica_id, data_agendamento, horario, status: status || 'agendado', observacoes }])
        .select();
      
      data = retryResult.data;
      error = retryResult.error;
    }

    if (error) throw error;

    // Atualizar status do paciente para "agendado"
    if (paciente_id) {
      await supabaseAdmin
        .from('pacientes')
        .update({ status: 'agendado' })
        .eq('id', paciente_id);
    }

    res.json({ id: data[0].id, message: 'Agendamento criado com sucesso!' });
  } catch (error) {
    console.error('Erro ao criar agendamento:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/agendamentos/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { paciente_id, consultor_id, clinica_id, data_agendamento, horario, status, observacoes } = req.body;
    
    const { data, error } = await supabaseAdmin
      .from('agendamentos')
      .update({ paciente_id, consultor_id, clinica_id, data_agendamento, horario, status, observacoes })
      .eq('id', id)
      .select();

    if (error) throw error;

    // Se mudou o paciente do agendamento, atualizar status do novo paciente
    if (paciente_id) {
      await supabaseAdmin
        .from('pacientes')
        .update({ status: 'agendado' })
        .eq('id', paciente_id);
    }

    res.json({ id: data[0].id, message: 'Agendamento atualizado com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/agendamentos/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Buscar dados do agendamento primeiro
    const { data: agendamento, error: agendamentoError } = await supabaseAdmin
      .from('agendamentos')
      .select('*')
      .eq('id', id)
      .single();

    if (agendamentoError) throw agendamentoError;
    if (!agendamento) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    // Atualizar status do agendamento
    const { error } = await supabaseAdmin
      .from('agendamentos')
      .update({ status })
      .eq('id', id);

    if (error) throw error;

    // Automação do pipeline: se status for "fechado", criar fechamento
    // NOTA: A criação do fechamento agora é feita pelo frontend via modal de valor
    if (status === 'fechado') {
      // Apenas atualizar status do paciente para "fechado"
      await supabaseAdmin
        .from('pacientes')
        .update({ status: 'fechado' })
        .eq('id', agendamento.paciente_id);
    }

    res.json({ message: 'Status atualizado com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/agendamentos/:id/lembrado', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabaseAdmin
      .from('agendamentos')
      .update({ lembrado: true })
      .eq('id', id);

    if (error) throw error;
    res.json({ message: 'Paciente marcado como lembrado!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Deletar agendamento (apenas admin)
app.delete('/api/agendamentos/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabaseAdmin
      .from('agendamentos')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ message: 'Agendamento removido com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// === FECHAMENTOS === (Admin vê todos, Consultor vê apenas os seus)
app.get('/api/fechamentos', authenticateToken, async (req, res) => {
  try {
    let query = supabaseAdmin
      .from('fechamentos')
      .select(`
        *,
        pacientes(nome, telefone, cpf),
        consultores(nome),
        clinicas(nome)
      `)
      .order('data_fechamento', { ascending: false })
      .order('created_at', { ascending: false });

    // Se for consultor freelancer (não tem as duas permissões), filtrar apenas seus fechamentos
    // Consultores internos (com pode_ver_todas_novas_clinicas=true E podealterarstatus=true) veem todos os fechamentos
    if (req.user.tipo === 'consultor' && !(req.user.pode_ver_todas_novas_clinicas === true && req.user.podealterarstatus === true)) {
      query = query.eq('consultor_id', req.user.id);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Reformatar dados para compatibilidade com frontend
    const formattedData = data.map(fechamento => ({
      ...fechamento,
      paciente_nome: fechamento.pacientes?.nome,
      paciente_telefone: fechamento.pacientes?.telefone,
      paciente_cpf: fechamento.pacientes?.cpf,
      consultor_nome: fechamento.consultores?.nome,
      clinica_nome: fechamento.clinicas?.nome
    }));

    res.json(formattedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// === FECHAMENTOS === (Admin vê todos, Consultor vê apenas os seus)
// Rotas para dados gerais (não filtrados por consultor) - usadas para gráfico de cidades e ranking
app.get('/api/dashboard/gerais/pacientes', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('pacientes')
      .select(`
        *,
        consultores(nome)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    const formattedData = data.map(paciente => ({
      ...paciente,
      consultor_nome: paciente.consultores?.nome
    }));

    res.json(formattedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/dashboard/gerais/agendamentos', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('agendamentos')
      .select(`
        *,
        pacientes(nome, telefone),
        consultores(nome),
        clinicas(nome)
      `)
      .order('data_agendamento', { ascending: false })
      .order('horario');

    if (error) throw error;

    const formattedData = data.map(agendamento => ({
      ...agendamento,
      paciente_nome: agendamento.pacientes?.nome,
      paciente_telefone: agendamento.pacientes?.telefone,
      consultor_nome: agendamento.consultores?.nome,
      clinica_nome: agendamento.clinicas?.nome
    }));

    res.json(formattedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/dashboard/gerais/fechamentos', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('fechamentos')
      .select(`
        *,
        pacientes(nome, telefone, cpf),
        consultores(nome),
        clinicas(nome)
      `)
      .order('data_fechamento', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formattedData = data.map(fechamento => ({
      ...fechamento,
      paciente_nome: fechamento.pacientes?.nome,
      paciente_telefone: fechamento.pacientes?.telefone,
      paciente_cpf: fechamento.pacientes?.cpf,
      consultor_nome: fechamento.consultores?.nome,
      clinica_nome: fechamento.clinicas?.nome
    }));

    res.json(formattedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/dashboard/fechamentos', authenticateToken, async (req, res) => {
  try {
    let query = supabaseAdmin
      .from('fechamentos')
      .select(`
        *,
        pacientes(nome, telefone, cpf),
        consultores(nome),
        clinicas(nome)
      `)
      .order('data_fechamento', { ascending: false })
      .order('created_at', { ascending: false });

    // Se for consultor freelancer (não tem as duas permissões), filtrar apenas seus fechamentos
    // Consultores internos (com pode_ver_todas_novas_clinicas=true E podealterarstatus=true) veem todos os fechamentos
    if (req.user.tipo === 'consultor' && !(req.user.pode_ver_todas_novas_clinicas === true && req.user.podealterarstatus === true)) {
      query = query.eq('consultor_id', req.user.id);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Reformatar dados para compatibilidade com frontend
    const formattedData = data.map(fechamento => ({
      ...fechamento,
      paciente_nome: fechamento.pacientes?.nome,
      paciente_telefone: fechamento.pacientes?.telefone,
      paciente_cpf: fechamento.pacientes?.cpf,
      consultor_nome: fechamento.consultores?.nome,
      clinica_nome: fechamento.clinicas?.nome
    }));

    res.json(formattedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/fechamentos', authenticateUpload, upload.single('contrato'), async (req, res) => {
  try {
    const { 
      paciente_id, 
      consultor_id, 
      clinica_id, 
      valor_fechado, 
      data_fechamento, 
      tipo_tratamento,
      observacoes 
    } = req.body;

    // Verificar se é fechamento automático (baseado nas observações)
    const isAutomaticFechamento = observacoes && observacoes.includes('automaticamente pelo pipeline');
    
    // Verificar se o arquivo foi enviado (obrigatório apenas para fechamentos manuais)
    if (!req.file && !isAutomaticFechamento) {
      return res.status(400).json({ error: 'Contrato em PDF é obrigatório!' });
    }

    // Converter campos opcionais para null se não enviados ou vazios
    const consultorId = consultor_id && consultor_id !== '' ? 
      (typeof consultor_id === 'number' ? consultor_id : parseInt(consultor_id)) : null;
    const clinicaId = clinica_id && clinica_id !== '' ? 
      (typeof clinica_id === 'number' ? clinica_id : parseInt(clinica_id)) : null;

    // Validar valor_fechado para garantir que não seja null/NaN
    const valorFechado = parseFloat(valor_fechado);
    if (isNaN(valorFechado) || valorFechado < 0) {
      return res.status(400).json({ error: 'Valor de fechamento deve ser um número válido maior ou igual a zero' });
    }

    // Dados do contrato (se houver arquivo)
    let contratoArquivo = null;
    let contratoNomeOriginal = null;
    let contratoTamanho = null;
    
    // Se houver arquivo, fazer upload para Supabase Storage
    if (req.file) {
      try {
        const uploadResult = await uploadToSupabase(req.file);
        contratoArquivo = uploadResult.fileName;
        contratoNomeOriginal = uploadResult.originalName;
        contratoTamanho = uploadResult.size;
      } catch (uploadError) {
        console.error('Erro detalhado no upload:', uploadError);
        return res.status(500).json({ 
          error: 'Erro ao fazer upload do contrato: ' + uploadError.message,
          details: process.env.NODE_ENV === 'development' ? uploadError : undefined
        });
      }
    }
    
    const { data, error } = await supabaseAdminAdmin
      .from('fechamentos')
      .insert([{
        paciente_id: parseInt(paciente_id),
        consultor_id: consultorId,
        clinica_id: clinicaId,
        valor_fechado: valorFechado,
        data_fechamento,
        tipo_tratamento: tipo_tratamento || null,
        observacoes: observacoes || null,
        contrato_arquivo: contratoArquivo,
        contrato_nome_original: contratoNomeOriginal,
        contrato_tamanho: contratoTamanho,
        aprovado: 'pendente'
      }])
      .select();

    if (error) {
      // Se houve erro, remover o arquivo do Supabase Storage
      if (contratoArquivo) {
        await supabaseAdminAdmin.storage
          .from(STORAGE_BUCKET)
          .remove([contratoArquivo]);
      }
      throw error;
    }

    // Atualizar status do paciente para "fechado"
    if (paciente_id) {
      await supabaseAdminAdmin
        .from('pacientes')
        .update({ status: 'fechado' })
        .eq('id', paciente_id);
    }



    res.json({ 
      id: data[0].id, 
      message: 'Fechamento registrado com sucesso!',
      contrato: contratoNomeOriginal
    });
  } catch (error) {
    console.error('Erro ao criar fechamento:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/fechamentos/:id', authenticateUpload, upload.single('contrato'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Debug: Log completo do que está chegando
    
    const { 
      paciente_id, 
      consultor_id, 
      clinica_id, 
      valor_fechado, 
      data_fechamento, 
      tipo_tratamento,
      observacoes 
    } = req.body;

    // Converter campos opcionais para null se não enviados ou vazios
    const consultorId = consultor_id && consultor_id !== '' ? 
      (typeof consultor_id === 'number' ? consultor_id : parseInt(consultor_id)) : null;
    const clinicaId = clinica_id && clinica_id !== '' ? 
      (typeof clinica_id === 'number' ? clinica_id : parseInt(clinica_id)) : null;
    
    // Validar valor_fechado para garantir que não seja null/NaN
    
    let valorFechado;
    if (valor_fechado === null || valor_fechado === undefined || valor_fechado === '') {
      return res.status(400).json({ error: 'Valor de fechamento é obrigatório' });
    }
    
    valorFechado = parseFloat(valor_fechado);
    
    if (isNaN(valorFechado) || valorFechado < 0) {
      return res.status(400).json({ 
        error: 'Valor de fechamento deve ser um número válido maior ou igual a zero',
        debug: { valorOriginal: valor_fechado, valorParsed: valorFechado }
      });
    }
    
    const { data, error } = await supabaseAdminAdmin
      .from('fechamentos')
      .update({ 
        paciente_id: parseInt(paciente_id), 
        consultor_id: consultorId, 
        clinica_id: clinicaId, 
        valor_fechado: valorFechado, 
        data_fechamento, 
        tipo_tratamento: tipo_tratamento || null,
        observacoes: observacoes || null 
      })
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json({ id: data[0].id, message: 'Fechamento atualizado com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/fechamentos/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar dados do fechamento antes de deletar para remover arquivo
    const { data: fechamento, error: selectError } = await supabaseAdminAdmin
      .from('fechamentos')
      .select('contrato_arquivo')
      .eq('id', id)
      .single();

    if (selectError) throw selectError;

    // Deletar fechamento do banco
    const { error } = await supabaseAdminAdmin
      .from('fechamentos')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Remover arquivo de contrato do Supabase Storage se existir
    if (fechamento?.contrato_arquivo) {
      try {
        await supabaseAdminAdmin.storage
          .from(STORAGE_BUCKET)
          .remove([fechamento.contrato_arquivo]);
      } catch (storageError) {
        console.error('Erro ao remover arquivo do storage:', storageError);
      }
    }

    res.json({ message: 'Fechamento removido com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rota para download de contratos (aceita token via header Authorization)
app.get('/api/fechamentos/:id/contrato', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar dados do fechamento
    const { data: fechamento, error } = await supabaseAdminAdmin
      .from('fechamentos')
      .select('contrato_arquivo, contrato_nome_original')
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!fechamento?.contrato_arquivo) {
      return res.status(404).json({ error: 'Contrato não encontrado!' });
    }

    // Fazer download do arquivo do Supabase Storage
    const { data, error: downloadError } = await supabaseAdminAdmin.storage
      .from(STORAGE_BUCKET)
      .download(fechamento.contrato_arquivo);

    if (downloadError) {
      console.error('Erro ao baixar arquivo:', downloadError);
      return res.status(500).json({ error: 'Erro ao baixar arquivo' });
    }

    // Configurar headers para download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fechamento.contrato_nome_original || 'contrato.pdf'}"`);
    
    // Enviar o arquivo
    res.send(data);
  } catch (error) {
    console.error('Erro ao baixar contrato:', error);
    res.status(500).json({ error: error.message });
  }
});

// Rotas para admin aprovar/reprovar fechamentos
app.put('/api/fechamentos/:id/aprovar', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Primeiro, verificar se o fechamento existe
    const { data: fechamento, error: fetchError } = await supabaseAdminAdmin
      .from('fechamentos')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError || !fechamento) {
      return res.status(404).json({ error: 'Fechamento não encontrado' });
    }
    
    // Tentar atualizar o campo aprovado
    const { data, error } = await supabaseAdminAdmin
      .from('fechamentos')
      .update({ aprovado: 'aprovado' })
      .eq('id', id)
      .select();
    
    if (error) {
      // Campo aprovado não existe na tabela, mas continuar
      return res.json({ message: 'Fechamento aprovado com sucesso!' });
    }
    
    res.json({ message: 'Fechamento aprovado com sucesso!' });
  } catch (error) {
    console.error('Erro ao aprovar fechamento:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/fechamentos/:id/reprovar', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Primeiro, verificar se o fechamento existe
    const { data: fechamento, error: fetchError } = await supabaseAdminAdmin
      .from('fechamentos')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError || !fechamento) {
      return res.status(404).json({ error: 'Fechamento não encontrado' });
    }
    
    // Tentar atualizar o campo aprovado
    const { data, error } = await supabaseAdminAdmin
      .from('fechamentos')
      .update({ aprovado: 'reprovado' })
      .eq('id', id)
      .select();
    
    if (error) {
      // Campo aprovado não existe na tabela, mas continuar
      return res.json({ message: 'Fechamento reprovado com sucesso!' });
    }
    
    res.json({ message: 'Fechamento reprovado com sucesso!' });
  } catch (error) {
    console.error('Erro ao reprovar fechamento:', error);
    res.status(500).json({ error: error.message });
  }
});

// === META ADS PRICING === (Apenas Admin)
app.get('/api/meta-ads/pricing', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { cidade, estado, status } = req.query;
    
    let query = supabase
      .from('meta_ads_pricing')
      .select('*')
      .order('region');

    if (cidade) {
      query = query.ilike('region', `%${cidade}%`);
    }

    if (estado) {
      query = query.ilike('region', `%${estado}%`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/meta-ads/pricing', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { city, state, cost_per_lead, spend, leads } = req.body;
    
    // Adaptar para a estrutura da tabela meta_ads_pricing
    const { data, error } = await supabaseAdmin
      .from('meta_ads_pricing')
      .insert([{ 
        region: `${city || 'N/A'} - ${state || 'BR'}`,
        city: city,
        state: state,
        country: 'BR',
        cost_per_lead: cost_per_lead || 0,
        spend: spend || 0,
        leads: leads || 0,
        date_range: 'manual' // indicar que foi inserido manualmente
      }])
      .select();

    if (error) throw error;
    res.json({ id: data[0].id, message: 'Preço por lead cadastrado com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/meta-ads/pricing/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { city, state, cost_per_lead, spend, leads } = req.body;
    
    // Adaptar dados para a estrutura da tabela
    const updateData = {};
    if (city || state) {
      updateData.region = `${city || 'N/A'} - ${state || 'BR'}`;
      updateData.city = city;
      updateData.state = state;
    }
    if (cost_per_lead !== undefined) updateData.cost_per_lead = cost_per_lead;
    if (spend !== undefined) updateData.spend = spend;
    if (leads !== undefined) updateData.leads = leads;
    
    const { data, error } = await supabaseAdmin
      .from('meta_ads_pricing')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json({ id: data[0].id, message: 'Preço por lead atualizado com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// === META ADS LEADS === (Admin vê todos, Consultor vê apenas seus)
app.get('/api/meta-ads/leads', authenticateToken, async (req, res) => {
  try {
    let query = supabase
      .from('meta_ads_leads')
      .select(`
        *,
        pacientes(nome, telefone, cpf)
      `)
      .order('created_at', { ascending: false });

    // Se for consultor, filtrar apenas leads de pacientes atribuídos a ele
    if (req.user.tipo === 'consultor') {
      const { data: pacientesConsultor, error: pacientesError } = await supabaseAdmin
        .from('pacientes')
        .select('id')
        .eq('consultor_id', req.user.id);

      if (pacientesError) throw pacientesError;

      const pacienteIds = pacientesConsultor.map(p => p.id);
      
      if (pacienteIds.length > 0) {
        query = query.in('paciente_id', pacienteIds);
      } else {
        // Se não tem pacientes, retornar array vazio
        return res.json([]);
      }
    }

    const { data, error } = await query;

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/meta-ads/leads', authenticateToken, async (req, res) => {
  try {
    const { 
      paciente_id, 
      campanha_id, 
      campanha_nome, 
      adset_id, 
      adset_nome, 
      ad_id, 
      ad_nome, 
      custo_lead, 
      data_lead, 
      cidade_lead, 
      estado_lead 
    } = req.body;
    
    const { data, error } = await supabaseAdmin
      .from('meta_ads_leads')
      .insert([{ 
        paciente_id, 
        campanha_id, 
        campanha_nome, 
        adset_id, 
        adset_nome, 
        ad_id, 
        ad_nome, 
        custo_lead, 
        data_lead, 
        cidade_lead, 
        estado_lead 
      }])
      .select();

    if (error) throw error;
    res.json({ id: data[0].id, message: 'Lead do Meta Ads registrado com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// === META ADS API INTEGRATION === (Apenas Admin)
app.get('/api/meta-ads/test-connection', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const metaAPI = new MetaAdsAPI();
    const result = await metaAPI.testConnection();
    
    // Verificar expiração do token
    const tokenStatus = await metaAPI.checkTokenExpiration();
    
    res.json({
      ...result,
      tokenStatus
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao testar conexão com Meta Ads API',
      error: error.message || 'Erro desconhecido'
    });
  }
});

// Verificar status do token
app.get('/api/meta-ads/token-status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const metaAPI = new MetaAdsAPI();
    const tokenStatus = await metaAPI.checkTokenExpiration();
    res.json(tokenStatus);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao verificar token',
      error: error.message || 'Erro desconhecido'
    });
  }
});

// Renovar token
app.post('/api/meta-ads/extend-token', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const metaAPI = new MetaAdsAPI();
    const newToken = await metaAPI.extendToken();
    
    res.json({
      success: true,
      message: 'Token renovado com sucesso! Atualize o META_ACCESS_TOKEN no arquivo .env',
      newToken: newToken.access_token,
      expiresIn: newToken.expires_in,
      expiresAt: newToken.expires_at
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao renovar token',
      error: error.message || 'Erro desconhecido'
    });
  }
});

app.get('/api/meta-ads/campaigns', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const metaAPI = new MetaAdsAPI();
    const campaigns = await metaAPI.getCampaigns();
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao buscar campanhas',
      error: error.message || 'Erro desconhecido'
    });
  }
});

// Nova rota para buscar Ad Sets de uma campanha
app.get('/api/meta-ads/campaign/:id/adsets', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 [AdSets] Buscando Ad Sets para campanha: ${id}`);
    console.log(`👤 [AdSets] Usuário: ${req.user?.nome || 'Unknown'}`);
    
    const metaAPI = new MetaAdsAPI();
    console.log(`📡 [AdSets] Chamando metaAPI.getAdSets(${id})`);
    
    const adsets = await metaAPI.getAdSets(id);
    console.log(`✅ [AdSets] Dados recebidos:`, JSON.stringify(adsets, null, 2));
    
    res.json(adsets);
  } catch (error) {
    console.error(`❌ [AdSets] Erro ao buscar Ad Sets para campanha ${req.params.id}:`, error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao buscar conjuntos de anúncios',
      error: error.message || 'Erro desconhecido'
    });
  }
});

app.get('/api/meta-ads/campaign/:id/insights', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { dateRange = 'last_30d' } = req.query;
    
    const metaAPI = new MetaAdsAPI();
    const insights = await metaAPI.getCostPerLeadByRegion(id, dateRange);
    res.json(insights);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao buscar insights da campanha',
      error: error.message || 'Erro desconhecido'
    });
  }
});

app.post('/api/meta-ads/sync-campaigns', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status = 'ACTIVE' } = req.body;
    const metaAPI = new MetaAdsAPI();
    const campaignData = await metaAPI.syncCampaignData(status);
    
    // Salvar dados reais do Meta Ads - agora com cidade + estado
    const rawData = campaignData.flatMap(campaign => 
      campaign.insights.map(insight => ({
        region: `${insight.city || insight.region || 'N/A'} - ${insight.region || 'BR'}`,
        country: insight.country || 'BR',
        cost_per_lead: insight.costPerLead || 0,
        spend: insight.spend || 0,
        leads: insight.leads || 0,
        date_range: 'last_30d',
        // Campos extras para filtros
        city: insight.city || insight.region || 'N/A',
        state: insight.region || 'BR'
      }))
    );

    // Consolidar dados por região (somar valores duplicados)
    const consolidated = {};
    rawData.forEach(item => {
      const key = `${item.region}-${item.country}-${item.date_range}`;
      if (consolidated[key]) {
        consolidated[key].spend += item.spend;
        consolidated[key].leads += item.leads;
        // Recalcular cost_per_lead
        consolidated[key].cost_per_lead = consolidated[key].leads > 0 ? 
          consolidated[key].spend / consolidated[key].leads : 0;
      } else {
        consolidated[key] = { ...item };
      }
    });

    const pricingData = Object.values(consolidated);
    
    console.log('=== DADOS CONSOLIDADOS DO META ADS ===');
    console.log('Total de itens únicos para sincronizar:', pricingData.length);
    console.log('Dados:', JSON.stringify(pricingData, null, 2));

    console.log('Total items:', pricingData.length);
    
    console.log('Tentando inserir dados:', JSON.stringify(pricingData, null, 2));
    
    const { data, error } = await supabaseAdmin
      .from('meta_ads_pricing')
      .upsert(pricingData, {
        onConflict: 'region,country,date_range',
        ignoreDuplicates: false
      });
      
    if (error) {
      console.log('Erro detalhado:', error);
      console.log('Código do erro:', error.code);
      console.log('Mensagem do erro:', error.message);
      console.log('Detalhes do erro:', error.details);
    }

    if (error) throw error;
    
    res.json({ 
      success: true, 
      message: 'Campanhas sincronizadas com sucesso!',
      campaignsCount: campaignData.length,
      pricingCount: data?.length || 0
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao sincronizar campanhas',
      error: error.message || 'Erro desconhecido'
    });
  }
});

app.get('/api/meta-ads/regional-insights', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { campaignId, dateRange = 'last_30d' } = req.query;
    
    if (!campaignId) {
      return res.status(400).json({ error: 'ID da campanha é obrigatório' });
    }
    
    const metaAPI = new MetaAdsAPI();
    const insights = await metaAPI.getRegionalInsights(campaignId, dateRange);
    res.json(insights);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao buscar insights regionais',
      error: error.message || 'Erro desconhecido'
    });
  }
});

// === DASHBOARD/ESTATÍSTICAS === (Admin vê tudo, Consultor vê apenas seus dados)
app.get('/api/dashboard', authenticateToken, async (req, res) => {
  try {
    // Obter data atual do sistema (dinâmica/real)
    const agora = new Date();
    const hoje = agora.getFullYear() + '-' + 
                 String(agora.getMonth() + 1).padStart(2, '0') + '-' + 
                 String(agora.getDate()).padStart(2, '0');

    // Configurar filtros baseados no tipo de usuário
    const isConsultor = req.user.tipo === 'consultor';
    const consultorId = req.user.id;

    // Buscar agendamentos de hoje
    let agendamentosQuery = supabase
      .from('agendamentos')
      .select('*')
      .eq('data_agendamento', hoje);
    
    if (isConsultor) {
      agendamentosQuery = agendamentosQuery.eq('consultor_id', consultorId);
    }

    const { data: agendamentosHoje, error: error1 } = await agendamentosQuery;
    if (error1) throw error1;

    // Buscar lembrados de hoje
    let lembradosQuery = supabase
      .from('agendamentos')
      .select('*')
      .eq('data_agendamento', hoje)
      .eq('lembrado', true);
    
    if (isConsultor) {
      lembradosQuery = lembradosQuery.eq('consultor_id', consultorId);
    }

    const { data: lembradosHoje, error: error2 } = await lembradosQuery;
    if (error2) throw error2;

    // Buscar total de pacientes
    let pacientesQuery = supabase
      .from('pacientes')
      .select('*', { count: 'exact', head: true });

    // Para consultor, contar apenas pacientes com agendamentos dele
    if (isConsultor) {
      const { data: agendamentos, error: agendError } = await supabaseAdmin
        .from('agendamentos')
        .select('paciente_id')
        .eq('consultor_id', consultorId);

      if (agendError) throw agendError;

      const pacienteIds = [...new Set(agendamentos.map(a => a.paciente_id))];
      
      if (pacienteIds.length > 0) {
        pacientesQuery = pacientesQuery.in('id', pacienteIds);
      } else {
        pacientesQuery = pacientesQuery.eq('id', 0); // Força resultado vazio
      }
    }

    const { count: totalPacientes, error: error3 } = await pacientesQuery;
    if (error3) throw error3;

    // Buscar fechamentos
    let fechamentosQuery = supabaseAdmin
      .from('fechamentos')
      .select('*');
    
    if (isConsultor) {
      fechamentosQuery = fechamentosQuery.eq('consultor_id', consultorId);
    }

    const { data: fechamentos, error: error5 } = await fechamentosQuery;
    if (error5) throw error5;

    // Estatísticas de fechamentos
    const fechamentosHoje = fechamentos.filter(f => f.data_fechamento === hoje && f.aprovado !== 'reprovado').length;
    
    const fechamentosMes = fechamentos.filter(f => {
      const mesAtual = new Date().getMonth();
      const anoAtual = new Date().getFullYear();
      const dataFechamento = new Date(f.data_fechamento + 'T12:00:00'); // Forçar meio-dia para evitar timezone
      return dataFechamento.getMonth() === mesAtual && dataFechamento.getFullYear() === anoAtual && f.aprovado !== 'reprovado';
    });

    const valorTotalMes = fechamentosMes.reduce((acc, f) => acc + parseFloat(f.valor_fechado || 0), 0);
    const ticketMedio = fechamentosMes.length > 0 ? (valorTotalMes / fechamentosMes.length) : 0;

    // Buscar consultores
    let consultoresQuery = supabase
      .from('consultores')
      .select('id, nome');

    // Se for consultor, buscar apenas dados dele
    if (isConsultor) {
      consultoresQuery = consultoresQuery.eq('id', consultorId);
    }

    const { data: consultores, error: error4 } = await consultoresQuery;
    if (error4) throw error4;

    // Buscar todos os agendamentos
    let agendamentosConsultorQuery = supabase
      .from('agendamentos')
      .select('id, consultor_id, lembrado, data_agendamento');

    if (isConsultor) {
      agendamentosConsultorQuery = agendamentosConsultorQuery.eq('consultor_id', consultorId);
    }

    const { data: todosAgendamentos, error: agendError } = await agendamentosConsultorQuery;
    if (agendError) throw agendError;

    // Buscar todos os fechamentos
    let fechamentosConsultorQuery = supabaseAdmin
      .from('fechamentos')
      .select('id, consultor_id, valor_fechado, data_fechamento');

    if (isConsultor) {
      fechamentosConsultorQuery = fechamentosConsultorQuery.eq('consultor_id', consultorId);
    }

    const { data: todosFechamentos, error: fechError } = await fechamentosConsultorQuery;
    if (fechError) throw fechError;



    // Processar estatísticas dos consultores
    const estatisticasConsultores = consultores.map(consultor => {
      // Filtrar agendamentos do consultor
      const agendamentos = todosAgendamentos.filter(a => a.consultor_id === consultor.id);
      
      // Filtrar fechamentos do consultor
      const fechamentosConsultor = todosFechamentos.filter(f => f.consultor_id === consultor.id);
      
      const fechamentosConsultorMes = fechamentosConsultor.filter(f => {
        const anoAtual = new Date().getFullYear();
        const dataFechamento = new Date(f.data_fechamento + 'T12:00:00'); // Forçar meio-dia para evitar timezone
        return dataFechamento.getFullYear() === anoAtual && f.aprovado !== 'reprovado'; // Mostrar fechamentos do ano todo
      });

      const valorTotalConsultor = fechamentosConsultorMes.reduce((acc, f) => acc + parseFloat(f.valor_fechado || 0), 0);



      return {
        id: consultor.id,
        nome: consultor.nome,
        total_agendamentos: agendamentos.length,
        total_lembrados: agendamentos.filter(a => a.lembrado).length,
        agendamentos_hoje: agendamentos.filter(a => a.data_agendamento === hoje).length,
        fechamentos_mes: fechamentosConsultorMes.length,
        valor_total_mes: valorTotalConsultor
      };
    });

    // Sistema pronto com dados reais e dinâmicos

    res.json({
      agendamentosHoje: agendamentosHoje.length,
      lembradosHoje: lembradosHoje.length,
      totalPacientes,
      fechamentosHoje,
      fechamentosMes: fechamentosMes.length,
      valorTotalMes,
      ticketMedio,
      totalFechamentos: fechamentos.filter(f => f.aprovado !== 'reprovado').length,
      estatisticasConsultores
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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

// Controle de debounce para evitar múltiplas atualizações
let updateLeadCountTimeout = null;

// Função auxiliar para contar leads não atribuídos e notificar via Socket.IO
async function updateLeadCount() {
  if (!io) return;
  
  // Debounce: cancelar atualização anterior se ainda não foi executada
  if (updateLeadCountTimeout) {
    clearTimeout(updateLeadCountTimeout);
  }
  
  updateLeadCountTimeout = setTimeout(async () => {
    try {
      const { count, error } = await supabaseAdmin
        .from('pacientes')
        .select('*', { count: 'exact', head: true })
        .is('consultor_id', null)
        .eq('status', 'lead');
        
      if (!error) {
        console.log(`📊 Atualizando contagem de leads: ${count || 0}`);
        io.to('lead-notifications').emit('lead-count-update', { count: count || 0 });
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar contagem de leads:', error);
    }
    updateLeadCountTimeout = null;
  }, 500); // 500ms de debounce
}

// Controle de debounce para evitar múltiplas atualizações de clínicas
let updateClinicasCountTimeout = null;

// Função auxiliar para contar novas clínicas e notificar via Socket.IO
async function updateClinicasCount() {
  if (!io) return;
  
  // Debounce: cancelar atualização anterior se ainda não foi executada
  if (updateClinicasCountTimeout) {
    clearTimeout(updateClinicasCountTimeout);
  }
  
  updateClinicasCountTimeout = setTimeout(async () => {
    try {
      const { count, error } = await supabaseAdmin
        .from('novas_clinicas')
        .select('*', { count: 'exact', head: true });
        
      if (!error) {
        console.log(`📊 Atualizando contagem de novas clínicas: ${count || 0}`);
        io.to('clinicas-notifications').emit('clinicas-count-update', { count: count || 0 });
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar contagem de novas clínicas:', error);
    }
    updateClinicasCountTimeout = null;
  }, 500); // 500ms de debounce
}


// Socket.IO connection handling (apenas se Socket.IO estiver habilitado)
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


// ==================== ROTA ESQUECI MINHA SENHA ====================

// POST /api/forgot-password - Solicitar redefinição de senha
app.post('/api/forgot-password', async (req, res) => {
  try {
    console.log('🔧 POST /api/forgot-password recebido');
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email é obrigatório' });
    }

    // Verificar se o consultor existe
    console.log('🔧 Buscando consultor com email:', email);
    const { data: user, error: userError } = await supabaseAdmin
      .from('consultores')
      .select('id, nome, email')
      .eq('email', email)
      .single();

    console.log('🔧 Resultado da busca:', { user, userError });

    if (userError || !user) {
      console.log('🔧 Consultor não encontrado, retornando mensagem de segurança');
      // Por segurança, sempre retorna sucesso mesmo se o email não existir
      return res.json({ 
        message: 'Se o email estiver cadastrado, você receberá instruções para redefinir sua senha.' 
      });
    }

    console.log('✅ Consultor encontrado:', user);

    // Gerar token de redefinição com timestamp para expiração
    const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas
    
    // Salvar token no banco de dados
    console.log('🔧 Tentando salvar token no banco...');
    const { error: tokenError } = await supabaseAdmin
      .from('password_reset_tokens')
      .insert([{
        user_id: user.id,
        token: resetToken,
        expires_at: expiresAt.toISOString(),
        used: false
      }]);

    if (tokenError) {
      console.error('❌ Erro ao salvar token de reset:', tokenError);
      console.log('🔧 Continuando mesmo com erro no banco...');
    } else {
      console.log('✅ Token salvo no banco com sucesso');
    }

    // Enviar email real
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    console.log('🔧 Preparando envio de email...');
    console.log('🔧 Reset link:', resetLink);
    
    const mailOptions = {
      from: `"Solumn - Sistema CRM" <${process.env.EMAIL_USER}>`,
      replyTo: process.env.EMAIL_FROM || 'noreply@solumn.com',
      to: email,
      subject: 'Redefinição de Senha - Solumn',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a1d23;">Redefinição de Senha</h2>
          <p>Olá ${user.nome},</p>
          <p>Você solicitou a redefinição de sua senha. Clique no botão abaixo para criar uma nova senha:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #1a1d23; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Redefinir Senha
            </a>
          </div>
          <p>Ou copie e cole este link no seu navegador:</p>
          <p style="word-break: break-all; color: #666;">${resetLink}</p>
          <p><strong>Este link expira em 24 horas.</strong></p>
          <p>Se você não solicitou esta redefinição, ignore este email.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">Este é um email automático, não responda.</p>
        </div>
      `
    };

    try {
      // Verificar se está em ambiente de desenvolvimento e se email não está configurado
      const isEmailConfigured = process.env.EMAIL_USER && 
                                process.env.EMAIL_USER !== 'your-email@gmail.com' && 
                                process.env.EMAIL_PASS && 
                                process.env.EMAIL_PASS !== 'your-app-password';

      if (!isEmailConfigured && process.env.NODE_ENV === 'development') {
        console.log('🔧 EMAIL NÃO CONFIGURADO - MODO DESENVOLVIMENTO');
        console.log('📧 ========================================');
        console.log('📧 LINK DE REDEFINIÇÃO DE SENHA:');
        console.log(`📧 ${resetLink}`);
        console.log('📧 ========================================');
        console.log('📧 Copie o link acima e cole no navegador para redefinir a senha');
        console.log('📧 Para configurar o envio de email, veja o arquivo EMAIL_SETUP.md');
      } else {
        console.log('🔧 Tentando enviar email...');
        console.log('🔧 Configuração do transporter:', {
          service: process.env.EMAIL_SERVICE,
          host: process.env.EMAIL_SERVICE === 'mailgun' ? 'smtp.mailgun.org' : undefined,
          port: process.env.EMAIL_SERVICE === 'mailgun' ? 587 : undefined,
          user: process.env.EMAIL_USER
        });
        
        await transporter.sendMail(mailOptions);
        console.log(`✅ Email de redefinição enviado para ${email}`);
      }
    } catch (emailError) {
      console.error('❌ Erro ao enviar email:', emailError);
      console.error('❌ Detalhes do erro:', emailError.message);
      
      // Em desenvolvimento, mostrar o link mesmo se o email falhar
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 FALHA NO EMAIL - MODO DESENVOLVIMENTO');
        console.log('📧 ========================================');
        console.log('📧 LINK DE REDEFINIÇÃO DE SENHA:');
        console.log(`📧 ${resetLink}`);
        console.log('📧 ========================================');
        console.log('📧 Copie o link acima e cole no navegador para redefinir a senha');
      }
    }
    
    res.json({ 
      message: 'Instruções para redefinição de senha foram enviadas para seu email.' 
    });

  } catch (error) {
    console.error('Erro ao processar solicitação de redefinição de senha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Validar token de redefinição de senha
app.post('/api/validate-reset-token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token é obrigatório' });
    }

    // Buscar token no banco de dados
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('password_reset_tokens')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .single();

    if (tokenError || !tokenData) {
      return res.status(400).json({ error: 'Token inválido ou não encontrado' });
    }

    // Verificar se o token não expirou
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);

    if (now > expiresAt) {
      return res.status(400).json({ error: 'Token expirado' });
    }

    res.json({ message: 'Token válido' });

  } catch (error) {
    console.error('Erro ao validar token:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Redefinir senha usando token
app.post('/api/reset-password', async (req, res) => {
  try {
    const { token, novaSenha } = req.body;

    if (!token || !novaSenha) {
      return res.status(400).json({ error: 'Token e nova senha são obrigatórios' });
    }

    if (novaSenha.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
    }

    // Buscar token no banco de dados
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('password_reset_tokens')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .single();

    if (tokenError || !tokenData) {
      return res.status(400).json({ error: 'Token inválido ou não encontrado' });
    }

    // Verificar se o token não expirou
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);

    if (now > expiresAt) {
      return res.status(400).json({ error: 'Token expirado' });
    }

    // Buscar o consultor
    const { data: consultor, error: consultorError } = await supabaseAdmin
      .from('consultores')
      .select('*')
      .eq('id', tokenData.user_id)
      .single();

    if (consultorError || !consultor) {
      return res.status(404).json({ error: 'Consultor não encontrado' });
    }

    // Hash da nova senha
    const hashedPassword = await bcrypt.hash(novaSenha, 10);

    // Atualizar senha do consultor
    const { error: updateError } = await supabaseAdmin
      .from('consultores')
      .update({ senha: hashedPassword })
      .eq('id', tokenData.user_id);

    if (updateError) {
      throw updateError;
    }

    // Marcar token como usado
    const { error: tokenUpdateError } = await supabaseAdmin
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('token', token);

    if (tokenUpdateError) {
      console.error('Erro ao marcar token como usado:', tokenUpdateError);
      // Não parar o processo, apenas logar o erro
    }

    console.log(`✅ Senha redefinida com sucesso para o consultor ${consultor.nome}`);
    res.json({ message: 'Senha redefinida com sucesso' });

  } catch (error) {
    console.error('Erro ao redefinir senha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ==================== ROTAS PARA MATERIAIS ====================

// Middleware para servir arquivos de materiais
app.use('/uploads/materiais', express.static(path.join(__dirname, 'uploads', 'materiais')));

// Configuração do multer para upload de arquivos de materiais
const materiaisStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, 'uploads', 'materiais');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const materiaisUpload = multer({ 
  storage: materiaisStorage,
  limits: {
    fileSize: 200 * 1024 * 1024 // 200MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      // Documentos
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'application/zip',
      'application/x-rar-compressed',
      // Vídeos
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-matroska',
      'video/x-ms-wmv',
      'video/x-flv',
      'video/webm'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido. Apenas documentos e vídeos são aceitos.'), false);
    }
  }
});

// GET /api/materiais - Listar todos os materiais
app.get('/api/materiais', authenticateToken, async (req, res) => {
  try {
    console.log('🔧 GET /api/materiais recebido');
    console.log('🔧 Usuário autenticado:', req.user);

    const { data, error } = await supabaseAdmin
      .from('materiais')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar materiais:', error);
      return res.status(500).json({ error: 'Erro ao buscar materiais' });
    }

    console.log('🔧 Materiais encontrados:', data.length);
    res.json(data);
  } catch (error) {
    console.error('Erro ao buscar materiais:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/materiais - Criar novo material
app.post('/api/materiais', authenticateToken, requireAdmin, (req, res, next) => {
  materiaisUpload.single('arquivo')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Arquivo muito grande! Tamanho máximo permitido: 200MB' });
      }
      return res.status(400).json({ error: 'Erro no upload do arquivo: ' + err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    console.log('🔧 POST /api/materiais recebido');
    console.log('🔧 Headers:', req.headers);
    console.log('🔧 Body:', req.body);
    console.log('🔧 File:', req.file);
    console.log('🔧 Usuário autenticado:', req.user);

    const { titulo, descricao, tipo } = req.body;

    if (!titulo || !tipo) {
      return res.status(400).json({ error: 'Título e tipo são obrigatórios' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Arquivo é obrigatório' });
    }

    const materialData = {
      titulo,
      descricao: descricao || '',
      tipo,
      url: null,
      arquivo_nome: req.file.originalname,
      arquivo_url: `/uploads/materiais/${req.file.filename}`,
      created_by: req.user.id
    };

    const { data, error } = await supabaseAdmin
      .from('materiais')
      .insert([materialData])
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar material:', error);
      return res.status(500).json({ error: 'Erro ao criar material' });
    }

    console.log('🔧 Material criado com sucesso:', data.id);
    res.status(201).json(data);
  } catch (error) {
    console.error('Erro ao criar material:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/materiais/:id/download - Download de arquivo
app.get('/api/materiais/:id/download', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🔧 GET /api/materiais/:id/download recebido');
    console.log('🔧 ID do material:', id);

    const { data, error } = await supabaseAdmin
      .from('materiais')
      .select('arquivo_url, arquivo_nome, titulo')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Material não encontrado' });
    }

    if (!data.arquivo_url) {
      return res.status(400).json({ error: 'Este material não possui arquivo para download' });
    }

    const filePath = path.join(__dirname, data.arquivo_url);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Arquivo não encontrado no servidor' });
    }

    const fileName = data.arquivo_nome || data.titulo;
    res.download(filePath, fileName);
  } catch (error) {
    console.error('Erro ao fazer download do material:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/materiais/:id - Excluir material
app.delete('/api/materiais/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🔧 DELETE /api/materiais/:id recebido');
    console.log('🔧 ID do material:', id);
    console.log('🔧 Usuário autenticado:', req.user);

    // Buscar o material para obter informações do arquivo
    const { data: material, error: fetchError } = await supabaseAdmin
      .from('materiais')
      .select('arquivo_url')
      .eq('id', id)
      .single();

    if (fetchError || !material) {
      return res.status(404).json({ error: 'Material não encontrado' });
    }

    // Excluir o material do banco
    const { error: deleteError } = await supabaseAdmin
      .from('materiais')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Erro ao excluir material:', deleteError);
      return res.status(500).json({ error: 'Erro ao excluir material' });
    }

    // Excluir o arquivo físico se existir
    if (material.arquivo_url) {
      const filePath = path.join(__dirname, material.arquivo_url);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log('🔧 Arquivo físico excluído:', filePath);
        } catch (fileError) {
          console.error('Erro ao excluir arquivo físico:', fileError);
        }
      }
    }

    console.log('🔧 Material excluído com sucesso:', id);
    res.json({ message: 'Material excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir material:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ==================== FIM DAS ROTAS PARA MATERIAIS ====================

// Inicializar servidor
server.listen(PORT, async () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🌐 Acesse: http://localhost:${PORT}`);
  console.log(`📱 WhatsApp API: http://localhost:${PORT}/api/whatsapp`);
  console.log(`🔗 Webhook WhatsApp: http://localhost:${PORT}/api/whatsapp/webhook`);
  console.log(`🗄️ Usando Supabase como banco de dados`);
  
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

// === META ADS REAL-TIME INSIGHTS === (Apenas Admin)
app.get('/api/meta-ads/real-time-insights', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { dateRange = 'last_30d', status = 'ACTIVE' } = req.query;
    
    console.log(`🔄 Buscando insights em tempo real para período: ${dateRange}, status: ${status}`);
    
    const metaAPI = new MetaAdsAPI();
    const campaigns = await metaAPI.getCampaigns(status);
    
    if (!campaigns.data || campaigns.data.length === 0) {
      return res.json([]);
    }
    
    const realTimeData = [];
    
    // Buscar insights por Ad Set para cada campanha ativa
    for (const campaign of campaigns.data) {
      try {
        console.log(`📊 Processando campanha: ${campaign.name}`);
        
        // Buscar Ad Sets da campanha
        const adSetsResponse = await metaAPI.getAdSets(campaign.id);
        
        if (adSetsResponse.data && adSetsResponse.data.length > 0) {
          // Processar cada Ad Set
          for (const adSet of adSetsResponse.data) {
            // Apenas Ad Sets ativos
            if (adSet.status !== 'ACTIVE') continue;
            
            // Extrair cidade do nome do Ad Set
            const locationInfo = metaAPI.extractCityFromAdSetName(adSet.name);
            const city = locationInfo.city;
            const state = locationInfo.state;
            
            // Buscar insights do Ad Set
            const adSetInsightsEndpoint = `/${adSet.id}/insights`;
            const adSetInsightsParams = {
              fields: 'spend,impressions,clicks,reach,actions,cost_per_action_type,cpm,cpc,ctr',
              time_range: `{'since':'${metaAPI.getDateRange(dateRange).since}','until':'${metaAPI.getDateRange(dateRange).until}'}`
            };
            
            try {
              const adSetInsights = await metaAPI.makeRequest(adSetInsightsEndpoint, adSetInsightsParams);
              
              if (adSetInsights.data && adSetInsights.data.length > 0) {
                const insight = adSetInsights.data[0];
                const spend = parseFloat(insight.spend) || 0;
                const leads = metaAPI.countLeads(insight.actions);
                const impressions = parseInt(insight.impressions) || 0;
                const clicks = parseInt(insight.clicks) || 0;
                const reach = parseInt(insight.reach) || 0;
                
                // Calcular métricas
                const costPerLead = leads > 0 ? spend / leads : 0;
                const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
                const cpc = clicks > 0 ? spend / clicks : 0;
                const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
                
                realTimeData.push({
                  campaign_id: campaign.id,
                  name: campaign.name,
                  adset_name: adSet.name,
                  status: campaign.status || 'ACTIVE',
                  objective: campaign.objective || 'OUTCOME_ENGAGEMENT',
                  city: city,
                  state: state,
                  region: `${city} - ${state}`,
                  cost_per_lead: parseFloat(costPerLead.toFixed(2)),
                  spend: spend,
                  leads: leads,
                  impressions: impressions,
                  reach: reach,
                  clicks: clicks,
                  cpm: parseFloat(cpm.toFixed(2)),
                  cpc: parseFloat(cpc.toFixed(2)),
                  ctr: parseFloat(ctr.toFixed(2)),
                  updated_time: campaign.updated_time || campaign.created_time,
                  date_range: dateRange
                });
              } else {
                console.log(`⚠️ Sem insights para Ad Set: ${adSet.name}`);
              }
            } catch (adSetError) {
              console.warn(`⚠️ Erro ao buscar insights do Ad Set ${adSet.name}:`, adSetError.message);
            }
          }
        } else {
          console.log(`⚠️ Nenhum Ad Set ativo encontrado para campanha: ${campaign.name}`);
        }
        
        // Delay pequeno para evitar rate limit
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (campaignError) {
        console.warn(`⚠️ Erro ao processar campanha ${campaign.name}:`, campaignError.message);
        
        // Adicionar campanha com erro/dados básicos
        realTimeData.push({
          campaign_id: campaign.id,
          name: campaign.name,
          status: campaign.status || 'ACTIVE',
          objective: campaign.objective || 'UNKNOWN',
          city: 'N/A',
          state: 'BR',
          region: 'Erro ao carregar',
          cost_per_lead: 0,
          spend: 0,
          leads: 0,
          impressions: 0,
          reach: 0,
          clicks: 0,
          cpm: 0,
          cpc: 0,
          ctr: 0,
          updated_time: campaign.updated_time || campaign.created_time,
          date_range: dateRange,
          error: campaignError.message
        });
      }
    }
    
    console.log(`✅ Total de campanhas processadas: ${realTimeData.length}`);
    
    // Ordenar por gasto (maior primeiro)
    realTimeData.sort((a, b) => (b.spend || 0) - (a.spend || 0));
    
    res.json(realTimeData);
    
  } catch (error) {
    console.error('❌ Erro ao buscar insights em tempo real:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar insights em tempo real',
      details: error.message,
      success: false 
    });
  }
});

// === META ADS MÉTRICAS AVANÇADAS === (Apenas Admin)
app.get('/api/meta-ads/advanced-metrics', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { dateRange = 'last_30d' } = req.query;
    
    console.log(`🔄 Buscando métricas avançadas APENAS campanhas ATIVAS para período: ${dateRange}`);
    
    const metaAPI = new MetaAdsAPI();
    const campaigns = await metaAPI.getCampaigns('ACTIVE'); // SEMPRE buscar apenas ATIVAS
    
    if (!campaigns.data || campaigns.data.length === 0) {
      return res.json({
        success: true,
        data: [],
        summary: {
          total_fechamentos: 0,
          valor_total_fechamentos: 0,
          periodo: dateRange,
          cidades_com_fechamentos: 0,
          mensagem: 'Nenhuma campanha ativa encontrada'
        }
      });
    }
    
    // Filtrar APENAS campanhas ATIVAS (dupla verificação)
    const activeCampaigns = campaigns.data.filter(c => c.status === 'ACTIVE');
    console.log(`✅ ${activeCampaigns.length} campanhas ATIVAS encontradas`);
    
    if (activeCampaigns.length === 0) {
      return res.json({
        success: true,
        data: [],
        summary: {
          total_fechamentos: 0,
          valor_total_fechamentos: 0,
          periodo: dateRange,
          cidades_com_fechamentos: 0,
          mensagem: 'Nenhuma campanha ativa encontrada após filtro'
        }
      });
    }

    // Buscar fechamentos do período para calcular CPA real
    const { since, until } = metaAPI.getDateRange(dateRange);
    const { data: fechamentos, error: fechError } = await supabaseAdmin
      .from('fechamentos')
      .select(`
        valor_fechado, 
        data_fechamento,
        pacientes(cidade, nome, telefone)
      `)
      .gte('data_fechamento', since)
      .lte('data_fechamento', until);

    if (fechError) {
      console.warn('⚠️ Erro ao buscar fechamentos:', fechError.message);
    }

    const fechamentosAprovados = fechamentos?.filter(f => f.aprovado !== 'reprovado') || [];
    const totalFechamentos = fechamentosAprovados.length;
    const valorTotalFechamentos = fechamentosAprovados.reduce((sum, f) => sum + parseFloat(f.valor_fechado || 0), 0);

    // Inicializar objeto para agrupar fechamentos por cidade
    const fechamentosPorCidade = {};

    // Agrupar fechamentos por cidade para calcular CPA real por região
    if (fechamentosAprovados && fechamentosAprovados.length > 0) {
      fechamentosAprovados.forEach(fechamento => {
        const cidade = fechamento.pacientes?.cidade || 'N/A';
        if (!fechamentosPorCidade[cidade]) {
          fechamentosPorCidade[cidade] = {
            count: 0,
            valor_total: 0
          };
        }
        fechamentosPorCidade[cidade].count++;
        fechamentosPorCidade[cidade].valor_total += parseFloat(fechamento.valor_fechado || 0);
      });
    }
    
    const advancedMetrics = [];
    
    // Buscar insights detalhados por Ad Set para cada campanha ATIVA
    for (const campaign of activeCampaigns) {
      try {
        console.log(`📊 Processando métricas avançadas para campanha: ${campaign.name}`);
        
        // Buscar Ad Sets da campanha
        const adSetsResponse = await metaAPI.getAdSets(campaign.id);
        
        if (adSetsResponse.data && adSetsResponse.data.length > 0) {
          // Processar cada Ad Set
          for (const adSet of adSetsResponse.data) {
            // Apenas Ad Sets ativos
            if (adSet.status !== 'ACTIVE') continue;
            
            // Extrair cidade do nome do Ad Set
            const locationInfo = metaAPI.extractCityFromAdSetName(adSet.name);
            const city = locationInfo.city;
            const state = locationInfo.state;
            
            // Buscar insights do Ad Set
            const adSetInsightsEndpoint = `/${adSet.id}/insights`;
            const adSetInsightsParams = {
              fields: 'spend,impressions,clicks,reach,actions,cost_per_action_type,cpm,cpc,ctr',
              time_range: `{'since':'${metaAPI.getDateRange(dateRange).since}','until':'${metaAPI.getDateRange(dateRange).until}'}`
            };
            
            try {
              const adSetInsights = await metaAPI.makeRequest(adSetInsightsEndpoint, adSetInsightsParams);
              
              if (adSetInsights.data && adSetInsights.data.length > 0) {
                const insight = adSetInsights.data[0];
                const spend = parseFloat(insight.spend) || 0;
                const leads = metaAPI.countLeads(insight.actions);
                const impressions = parseInt(insight.impressions) || 0;
                const clicks = parseInt(insight.clicks) || 0;
                const reach = parseInt(insight.reach) || 0;
                
                // Calcular métricas
                const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0; // Cost per Mille
                const cpc = clicks > 0 ? spend / clicks : 0; // Cost per Click
                const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0; // Click Through Rate
                const costPerLead = leads > 0 ? spend / leads : 0; // Custo por Lead do Meta
                
                // CPA Real baseado em fechamentos do sistema
                const fechamentosCity = fechamentosPorCidade[city] || { count: 0, valor_total: 0 };
                const cpaReal = fechamentosCity.count > 0 ? spend / fechamentosCity.count : 0;
                const roasReal = spend > 0 ? fechamentosCity.valor_total / spend : 0;
                
                advancedMetrics.push({
                  campaign_id: campaign.id,
                  name: campaign.name,
                  adset_name: adSet.name,
                  status: campaign.status || 'ACTIVE',
                  objective: campaign.objective || 'OUTCOME_ENGAGEMENT',
                  city: city,
                  state: state,
                  region: `${city} - ${state}`,
              
              // Métricas básicas
              spend: spend,
              leads: leads,
              impressions: impressions,
              clicks: clicks,
              reach: reach,
              
              // Métricas calculadas
              cpm: parseFloat(cpm.toFixed(2)),
              cpc: parseFloat(cpc.toFixed(2)),
              ctr: parseFloat(ctr.toFixed(2)),
              cost_per_lead: parseFloat(costPerLead.toFixed(2)),
              
              // Métricas baseadas em fechamentos reais
              cpa_real: parseFloat(cpaReal.toFixed(2)),
              fechamentos_reais: fechamentosCity.count,
              valor_total_fechamentos: fechamentosCity.valor_total,
              roas_real: parseFloat(roasReal.toFixed(2)),
              
                  updated_time: campaign.updated_time || campaign.created_time,
                  date_range: dateRange
                });
              } else {
                console.log(`⚠️ Sem insights para Ad Set: ${adSet.name}`);
              }
            } catch (adSetError) {
              console.warn(`⚠️ Erro ao buscar insights do Ad Set ${adSet.name}:`, adSetError.message);
            }
          }
        } else {
          console.log(`⚠️ Nenhum Ad Set ativo encontrado para campanha: ${campaign.name}`);
        }
        
        // Delay pequeno para evitar rate limit
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (campaignError) {
        console.warn(`⚠️ Erro ao processar métricas da campanha ${campaign.name}:`, campaignError.message);
      }
    }
    
    console.log(`✅ Total de métricas avançadas processadas: ${advancedMetrics.length}`);
    console.log(`📊 Resumo dos fechamentos: ${totalFechamentos} fechamentos, R$ ${valorTotalFechamentos.toFixed(2)} em valor total`);
    
    // Ordenar por gasto (maior primeiro)
    advancedMetrics.sort((a, b) => (b.spend || 0) - (a.spend || 0));
    
    res.json({
      success: true,
      data: advancedMetrics,
      summary: {
        total_fechamentos: totalFechamentos,
        valor_total_fechamentos: valorTotalFechamentos,
        periodo: dateRange,
        cidades_com_fechamentos: Object.keys(fechamentosPorCidade).length
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar métricas avançadas:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar métricas avançadas',
      details: error.message,
      success: false 
    });
  }
}); 

// ===== SERVIR ARQUIVOS DE UPLOAD =====
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ===== ROTAS WHATSAPP =====
const whatsappRoutes = require('./api/whatsapp');
app.use('/api/whatsapp', whatsappRoutes);

// ===== ROTAS DE DOCUMENTOS =====
const documentsRoutes = require('./api/documents');
app.use('/api/documents', documentsRoutes);