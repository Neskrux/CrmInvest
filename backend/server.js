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
  
  if (req.user.tipo === 'consultor' && req.user.consultor_id === parseInt(consultorId)) {
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
      const { data: usuarios, error } = await supabase
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
      
      const { data: consultores, error } = await supabase
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
      await supabase
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
    const { data: emailExistente } = await supabase
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
      const { data: usuario, error: userError } = await supabase
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
    const { error: updateError } = await supabase
      .from('usuarios')
      .update(updateData)
      .eq('id', userId);

    if (updateError) {
      throw updateError;
    }

    // Buscar dados atualizados do usuário
    const { data: usuarioAtualizado, error: fetchError } = await supabase
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
    const { data: usuario, error } = await supabase
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
    const { data: emailExistente } = await supabase
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
      const { data: consultor, error: userError } = await supabase
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
    const { error: updateError } = await supabase
      .from('consultores')
      .update(updateData)
      .eq('id', userId);

    if (updateError) {
      throw updateError;
    }

    // Buscar dados atualizados do consultor
    const { data: consultorAtualizado, error: fetchError } = await supabase
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
    const { data: consultor, error } = await supabase
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
    const { data, error } = await supabase
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

    const { data: usuarioData, error: errorUsuario } = await supabase
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
      const { data: consultorData, error: errorConsultor } = await supabase
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
    const { data, error } = await supabase
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
    
    const { data, error } = await supabase
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
        longitude
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
    
    const { data, error } = await supabase
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
    const { data, error } = await supabase
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
    const { data: emailExistente, error: emailError } = await supabase
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
    
    const { data, error } = await supabase
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
    const { data: emailExistente, error: emailError } = await supabase
      .from('consultores')
      .select('id')
      .eq('email', emailNormalizado)
      .limit(1);

    if (emailError) throw emailError;
    
    if (emailExistente && emailExistente.length > 0) {
      return res.status(400).json({ error: 'Este email já está cadastrado!' });
    }
    
    // Validar se CPF já existe
    const { data: cpfExistente, error: cpfError } = await supabase
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
    const { data, error } = await supabase
      .from('consultores')
      .insert([{ 
        nome, 
        telefone, 
        email: emailNormalizado, 
        senha: senhaHash, 
        cpf, 
        pix,
        tipo: 'consultor',
        ativo: true
      }])
      .select();

    if (error) {
      console.error('❌ Erro ao inserir consultor:', error);
      throw error;
    }
    
    
    res.json({ 
      id: data[0].id, 
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
    const { data: telefoneExistente, error: telefoneError } = await supabase
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
    const { data: cpfExistente, error: cpfError } = await supabase
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
      
      const { data: consultorData, error: consultorError } = await supabase
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
    
    const { data, error } = await supabase
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
      const { data: emailExistente, error: emailError } = await supabase
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
    
    const { data, error } = await supabase
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

// Gerar código de referência para um consultor específico
app.post('/api/consultores/:id/gerar-codigo', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar dados do consultor
    const { data: consultor, error: consultorError } = await supabase
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
    const { data: updatedConsultor, error: updateError } = await supabase
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
    const { data: consultores, error: consultoresError } = await supabase
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
      const { error: updateError } = await supabase
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
    if (req.user.tipo !== 'admin' && req.user.consultor_id !== parseInt(id)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    const { data: consultor, error: consultorError } = await supabase
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
    
    const { data, error } = await supabase
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
      const { data: agendamentos, error: agendError } = await supabase
        .from('agendamentos')
        .select('paciente_id')
        .eq('consultor_id', req.user.consultor_id);

      if (agendError) throw agendError;

      const pacienteIds = agendamentos.map(a => a.paciente_id);
      
      // Combinar: pacientes atribuídos diretamente OU com agendamentos
      const conditions = [`consultor_id.eq.${req.user.consultor_id}`];
      
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
    let query = supabase
      .from('pacientes')
      .select(`
        *,
        consultores(nome)
      `)
      .order('created_at', { ascending: false });

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
      const { data: telefoneExistente, error: telefoneError } = await supabase
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
      const { data: cpfExistente, error: cpfError } = await supabase
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
    
    const { data, error } = await supabase
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
      const { data: telefoneExistente, error: telefoneError } = await supabase
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
      const { data: cpfExistente, error: cpfError } = await supabase
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
    
    const { data, error } = await supabase
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
    const { data: paciente, error: pacienteError } = await supabase
      .from('pacientes')
      .select('*')
      .eq('id', id)
      .single();

    if (pacienteError) throw pacienteError;
    if (!paciente) {
      return res.status(404).json({ error: 'Paciente não encontrado' });
    }

    // Atualizar status do paciente
    const { error } = await supabase
      .from('pacientes')
      .update({ status })
      .eq('id', id);

    if (error) throw error;

    // Automação do pipeline
    if (status === 'fechado') {
      // Verificar se já existe fechamento
      const { data: fechamentoExistente } = await supabase
        .from('fechamentos')
        .select('id')
        .eq('paciente_id', id)
        .single();

      if (!fechamentoExistente) {
        // Buscar agendamento relacionado
        const { data: agendamento } = await supabase
          .from('agendamentos')
          .select('*')
          .eq('paciente_id', id)
          .single();

        // Criar fechamento automaticamente
        await supabase
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
    const { data: user, error: userError } = await supabase
      .from('usuarios')
      .select('tipo')
      .eq('id', userId)
      .single();
    
    if (userError) throw userError;
    
    if (user.tipo !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem excluir pacientes.' });
    }
    
    // Excluir agendamentos relacionados primeiro
    await supabase
      .from('agendamentos')
      .delete()
      .eq('paciente_id', id);
    
    // Excluir fechamentos relacionados
    await supabase
      .from('fechamentos')
      .delete()
      .eq('paciente_id', id);
    
    // Excluir o paciente
    const { error } = await supabase
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
    const { data, error } = await supabase
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
    
    // Verificar se o lead ainda está disponível
    const { data: pacienteAtual, error: checkError } = await supabase
      .from('pacientes')
      .select('consultor_id')
      .eq('id', id)
      .single();

    if (checkError) throw checkError;

    if (pacienteAtual.consultor_id !== null) {
      return res.status(400).json({ error: 'Este lead já foi atribuído a outro consultor!' });
    }

    // Atribuir o lead ao consultor atual
    const { error } = await supabase
      .from('pacientes')
      .update({ consultor_id: req.user.consultor_id })
      .eq('id', id);

    if (error) throw error;
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
    const { data: pacienteAtual, error: checkError } = await supabase
      .from('pacientes')
      .select('consultor_id, nome')
      .eq('id', id)
      .single();

    if (checkError) throw checkError;

    if (pacienteAtual.consultor_id !== null) {
      return res.status(400).json({ error: 'Não é possível excluir um lead que já foi atribuído a um consultor!' });
    }

    // Excluir o lead
    const { error } = await supabase
      .from('pacientes')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ message: 'Lead excluído com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// === NOVAS CLÍNICAS === (Funcionalidade para pegar clínicas encontradas nas missões)
app.get('/api/novas-clinicas', authenticateToken, async (req, res) => {
  try {
    let query = supabase
      .from('novas_clinicas')
      .select(`
        *,
        consultores!criado_por_consultor_id(nome)
      `)
      .order('created_at', { ascending: false });

    // Se for consultor, mostrar apenas clínicas disponíveis (sem proprietário) ou suas próprias
    if (req.user.tipo === 'consultor') {
      query = query.or(`consultor_id.is.null,consultor_id.eq.${req.user.id}`);
    }
    // Admin vê todas as novas clínicas (com ou sem consultor_id)

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

app.post('/api/novas-clinicas', authenticateToken, async (req, res) => {
  try {
    const { nome, endereco, bairro, cidade, estado, nicho, telefone, email, status, observacoes } = req.body;
    
    // Normalizar telefone (remover formatação)
    const telefoneNumeros = telefone ? telefone.replace(/\D/g, '') : '';
    
    // Verificar se telefone já existe
    if (telefoneNumeros) {
      const { data: telefoneExistente, error: telefoneError } = await supabase
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
      criado_por_consultor_id: req.user.tipo === 'consultor' ? req.user.id : null
    };
    
    const { data, error } = await supabase
      .from('novas_clinicas')
      .insert([clinicaData])
      .select();

    if (error) throw error;
    res.json({ id: data[0].id, message: 'Nova clínica cadastrada com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/novas-clinicas/:id/pegar', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar se a clínica ainda está disponível
    const { data: clinicaAtual, error: checkError } = await supabase
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
      consultor_id: clinicaAtual.criado_por_consultor_id // Definir consultor_id baseado em quem criou
    };

    // Excluir o campo id para evitar conflitos de chave primária
    delete clinicaParaMover.id;

    // Inserir na tabela clinicas
    const { data: clinicaInserida, error: insertError } = await supabase
      .from('clinicas')
      .insert([clinicaParaMover])
      .select();

    if (insertError) throw insertError;

    // Remover da tabela novas_clinicas
    const { error: deleteError } = await supabase
      .from('novas_clinicas')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    res.json({ message: 'Clínica aprovada e movida para clínicas parceiras com sucesso!' });
  } catch (error) {
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
    let { data, error } = await supabase
      .from('agendamentos')
      .insert([{ paciente_id, consultor_id, clinica_id, data_agendamento, horario, status: status || 'agendado', observacoes }])
      .select();

    // Se der erro de chave duplicada, tenta corrigir a sequência
    if (error && error.message.includes('duplicate key value violates unique constraint')) {
      console.log('Erro de sequência detectado, tentando corrigir...');
      
      // Corrigir a sequência
      await supabase.rpc('reset_agendamentos_sequence');
      
      // Tentar inserir novamente
      const retryResult = await supabase
        .from('agendamentos')
        .insert([{ paciente_id, consultor_id, clinica_id, data_agendamento, horario, status: status || 'agendado', observacoes }])
        .select();
      
      data = retryResult.data;
      error = retryResult.error;
    }

    if (error) throw error;

    // Atualizar status do paciente para "agendado"
    if (paciente_id) {
      await supabase
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
    
    const { data, error } = await supabase
      .from('agendamentos')
      .update({ paciente_id, consultor_id, clinica_id, data_agendamento, horario, status, observacoes })
      .eq('id', id)
      .select();

    if (error) throw error;

    // Se mudou o paciente do agendamento, atualizar status do novo paciente
    if (paciente_id) {
      await supabase
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
    const { data: agendamento, error: agendamentoError } = await supabase
      .from('agendamentos')
      .select('*')
      .eq('id', id)
      .single();

    if (agendamentoError) throw agendamentoError;
    if (!agendamento) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    // Atualizar status do agendamento
    const { error } = await supabase
      .from('agendamentos')
      .update({ status })
      .eq('id', id);

    if (error) throw error;

    // Automação do pipeline: se status for "fechado", criar fechamento
    // NOTA: A criação do fechamento agora é feita pelo frontend via modal de valor
    if (status === 'fechado') {
      // Apenas atualizar status do paciente para "fechado"
      await supabase
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
    
    const { error } = await supabase
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
    
    const { error } = await supabase
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
      query = query.eq('consultor_id', req.user.consultor_id);
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
    
    const { data, error } = await supabaseAdmin
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
        await supabaseAdmin.storage
          .from(STORAGE_BUCKET)
          .remove([contratoArquivo]);
      }
      throw error;
    }

    // Atualizar status do paciente para "fechado"
    if (paciente_id) {
      await supabaseAdmin
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
    
    const { data, error } = await supabaseAdmin
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
    const { data: fechamento, error: selectError } = await supabaseAdmin
      .from('fechamentos')
      .select('contrato_arquivo')
      .eq('id', id)
      .single();

    if (selectError) throw selectError;

    // Deletar fechamento do banco
    const { error } = await supabaseAdmin
      .from('fechamentos')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Remover arquivo de contrato do Supabase Storage se existir
    if (fechamento?.contrato_arquivo) {
      try {
        await supabaseAdmin.storage
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
    const { data: fechamento, error } = await supabaseAdmin
      .from('fechamentos')
      .select('contrato_arquivo, contrato_nome_original')
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!fechamento?.contrato_arquivo) {
      return res.status(404).json({ error: 'Contrato não encontrado!' });
    }

    // Fazer download do arquivo do Supabase Storage
    const { data, error: downloadError } = await supabaseAdmin.storage
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
    const { data: fechamento, error: fetchError } = await supabaseAdmin
      .from('fechamentos')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError || !fechamento) {
      return res.status(404).json({ error: 'Fechamento não encontrado' });
    }
    
    // Tentar atualizar o campo aprovado
    const { data, error } = await supabaseAdmin
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
    const { data: fechamento, error: fetchError } = await supabaseAdmin
      .from('fechamentos')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError || !fechamento) {
      return res.status(404).json({ error: 'Fechamento não encontrado' });
    }
    
    // Tentar atualizar o campo aprovado
    const { data, error } = await supabaseAdmin
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
    const { data, error } = await supabase
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
    
    const { data, error } = await supabase
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
      const { data: pacientesConsultor, error: pacientesError } = await supabase
        .from('pacientes')
        .select('id')
        .eq('consultor_id', req.user.consultor_id);

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
    
    const { data, error } = await supabase
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
    
    const { data, error } = await supabase
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
    const consultorId = req.user.consultor_id;

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
      const { data: agendamentos, error: agendError } = await supabase
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


// Socket.IO connection handling (apenas se Socket.IO estiver habilitado)
if (io) {
  io.on('connection', (socket) => {
    console.log('🔌 Cliente conectado:', socket.id);
    
    
    socket.on('disconnect', () => {
      console.log('🔌 Cliente desconectado:', socket.id);
    });
  });
}


// Inicializar servidor
server.listen(PORT, async () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🌐 Acesse: http://localhost:${PORT}`);
  console.log(`📱 WhatsApp API: http://localhost:${PORT}/api/whatsapp`);
  console.log(`🔗 Webhook WhatsApp: http://localhost:${PORT}/api/whatsapp/webhook`);
  console.log(`🗄️ Usando Supabase como banco de dados`);
  
  // Verificar conexão com Supabase
  try {
    const { data, error } = await supabase.from('clinicas').select('count').limit(1);
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
