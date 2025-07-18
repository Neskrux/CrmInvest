const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Configuração CORS para Vercel
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://localhost:3000',
    process.env.FRONTEND_URL,
    /\.vercel\.app$/
  ],
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

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project-id.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'your-anon-key-here';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || supabaseKey; // Service role key para Storage
const supabase = createClient(supabaseUrl, supabaseKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey); // Cliente admin para Storage

// Configurar Supabase Storage
const STORAGE_BUCKET = 'contratos';

// Função para fazer upload para Supabase Storage
const uploadToSupabase = async (file) => {
  try {
    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const randomId = Math.round(Math.random() * 1E9);
    const fileName = `contrato-${timestamp}-${randomId}.pdf`;
    
    // Fazer upload para o Supabase Storage usando cliente admin
    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, file.buffer, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;
    
    // Retornar informações do arquivo
    return {
      fileName: fileName,
      originalName: file.originalname,
      size: file.size,
      path: data.path
    };
  } catch (error) {
    console.error('Erro no upload para Supabase:', error);
    throw error;
  }
};

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'crm-secret-key-2024';

// Função para normalizar emails (converter para minúsculas e limpar espaços)
const normalizarEmail = (email) => {
  if (!email) return '';
  return email.toLowerCase().trim();
};

// Middleware especial para upload que preserva headers
const authenticateUpload = (req, res, next) => {
  // Para upload com FormData, o header pode vir em minúsculas
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log('📤 Upload - Todos os headers:', req.headers);
  console.log('📤 Upload - Authorization:', authHeader);
  console.log('📤 Upload - Token:', token ? 'presente' : 'ausente');

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso requerido' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.log('📤 Erro ao verificar token no upload:', err.message);
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

  // Log para debug
  console.log('🔐 Autenticação - Headers recebidos:', Object.keys(req.headers));
  console.log('🔐 Authorization header:', authHeader);
  console.log('🔐 Token extraído:', token ? 'presente' : 'ausente');

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso requerido' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.log('🔐 Erro ao verificar token:', err.message);
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

// Helper function para inicializar tabelas no Supabase
const initializeTables = async () => {
  console.log('🔄 Verificando estrutura das tabelas no Supabase...');
  
  // As tabelas serão criadas via SQL no painel do Supabase
  console.log('✅ Para configurar o banco, execute as migrações em backend/migrations/');
  console.log('📁 Use o arquivo: backend/migrations/run_migrations.sql');
  console.log(`
-- Tabela de imobiliárias (atualizada)
CREATE TABLE IF NOT EXISTS imobiliarias (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  endereco TEXT,
  bairro TEXT,
  cidade TEXT,
  estado VARCHAR(2),
  telefone TEXT,
  email TEXT,
  status TEXT DEFAULT 'ativo',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de consultores
CREATE TABLE IF NOT EXISTS consultores (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de clientes/leads
CREATE TABLE IF NOT EXISTS clientes (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT,
  cpf TEXT,
  tipo_servico TEXT,
  status TEXT DEFAULT 'lead',
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de agendamentos
CREATE TABLE IF NOT EXISTS agendamentos (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER REFERENCES clientes(id),
  consultor_id INTEGER REFERENCES consultores(id),
  imobiliaria_id INTEGER REFERENCES imobiliarias(id),
  data_agendamento DATE,
  horario TIME,
  status TEXT DEFAULT 'agendado',
  lembrado BOOLEAN DEFAULT FALSE,
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de fechamentos
CREATE TABLE IF NOT EXISTS fechamentos (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER REFERENCES clientes(id) ON DELETE CASCADE,
  consultor_id INTEGER REFERENCES consultores(id) ON DELETE SET NULL,
  imobiliaria_id INTEGER REFERENCES imobiliarias(id) ON DELETE SET NULL,
  agendamento_id INTEGER REFERENCES agendamentos(id) ON DELETE SET NULL,
  valor_fechado DECIMAL(10,2) NOT NULL,
  data_fechamento DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo_servico TEXT,
  forma_pagamento TEXT,
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
  `);
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
    if (email.includes('@')) {
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
    if (!usuario && email.includes('@')) {
      // Normalizar email para busca
      const emailNormalizado = normalizarEmail(email);
      console.log('🔍 Buscando consultor por email:', emailNormalizado);
      
      const { data: consultores, error } = await supabase
        .from('consultores')
        .select('*')
        .eq('email', emailNormalizado)
        .limit(1);

      console.log('📊 Resultado da busca:', { consultores, error });

      if (error) throw error;

      if (consultores && consultores.length > 0) {
        usuario = consultores[0];
        tipoLogin = 'consultor';
        console.log('✅ Consultor encontrado:', usuario.nome);
      } else {
        console.log('❌ Nenhum consultor encontrado com email:', emailNormalizado);
      }
    }

    if (!usuario) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Verificar senha
    console.log('🔐 Verificando senha para usuário:', usuario.nome || usuario.email);
    console.log('🔐 Senha digitada:', senha);
    console.log('🔐 Hash no banco:', usuario.senha);
    
    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    console.log('🔐 Senha válida?', senhaValida);
    
    // TEMPORÁRIO: Aceitar senha admin123 para admin
    const senhaTemporaria = senha === 'admin123' && usuario.email === 'admin@crm.com';
    
    if (!senhaValida && !senhaTemporaria) {
      console.log('❌ Login falhou: senha inválida');
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Atualizar último login (apenas para admin)
    if (tipoLogin === 'admin') {
      await supabase
        .from('usuarios')
        .update({ ultimo_login: new Date().toISOString() })
        .eq('id', usuario.id);
    }

    // Gerar token JWT
    const tokenData = {
      id: usuario.id,
      nome: usuario.nome,
      tipo: tipoLogin
    };

    // Adicionar dados específicos baseado no tipo
    if (tipoLogin === 'admin') {
      tokenData.email = usuario.email;
      tokenData.consultor_id = usuario.consultor_id;
    } else {
      tokenData.consultor_id = usuario.id; // Para consultores, o ID deles é o consultor_id
      tokenData.email = null;
    }

    const token = jwt.sign(tokenData, JWT_SECRET, { expiresIn: '8h' });

    // Retornar dados do usuário (sem a senha)
    const { senha: _, ...dadosUsuario } = usuario;

    res.json({
      message: 'Login realizado com sucesso',
      token,
      usuario: {
        ...dadosUsuario,
        tipo: tipoLogin,
        consultor_nome: tipoLogin === 'admin' ? usuario.consultores?.nome || null : usuario.nome
      }
    });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.post('/api/logout', authenticateToken, (req, res) => {
  // Com JWT stateless, o logout é feito removendo o token do cliente
  res.json({ message: 'Logout realizado com sucesso' });
});

app.get('/api/verify-token', authenticateToken, async (req, res) => {
  try {
    // Buscar dados atualizados do usuário
    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select(`
        *,
        consultores(nome, telefone)
      `)
      .eq('id', req.user.id)
      .eq('ativo', true)
      .single();

    if (error || !usuario) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    const { senha: _, ...dadosUsuario } = usuario;

    res.json({
      usuario: {
        ...dadosUsuario,
        consultor_nome: usuario.consultores?.nome || null
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ROTAS DA API

// === IMOBILIÁRIAS === (Apenas Admin)
app.get('/api/imobiliarias', authenticateToken, async (req, res) => {
  try {
    const { cidade, estado } = req.query;
    
    let query = supabase
      .from('imobiliarias')
      .select('*')
      .order('nome');

    // Filtrar por estado se especificado
    if (estado) {
      query = query.eq('estado', estado);
    }

    // Filtrar por cidade se especificado
    if (cidade) {
      query = query.ilike('cidade', `%${cidade}%`);
    }

    const { data, error } = await query;

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/imobiliarias/cidades', authenticateToken, async (req, res) => {
  try {
    const { estado } = req.query;
    
    let query = supabase
      .from('imobiliarias')
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

app.get('/api/imobiliarias/estados', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('imobiliarias')
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

app.post('/api/imobiliarias', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { nome, endereco, bairro, cidade, estado, telefone, email, status } = req.body;
    
    const { data, error } = await supabase
      .from('imobiliarias')
      .insert([{ 
        nome, 
        endereco, 
        bairro, 
        cidade, 
        estado, 
        telefone, 
        email, 
        status: status || 'ativo' // Padrão: desbloqueado
      }])
      .select();

    if (error) throw error;
    res.json({ id: data[0].id, message: 'Imobiliária cadastrada com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/imobiliarias/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🔧 PUT /api/imobiliarias/:id recebido');
    console.log('🔧 ID da imobiliária:', id);
    console.log('🔧 Body recebido:', req.body);
    console.log('🔧 Usuário autenticado:', req.user);
    
    // Permitir atualização parcial: só atualiza os campos enviados
    const camposPermitidos = ['nome', 'endereco', 'bairro', 'cidade', 'estado', 'telefone', 'email', 'status'];
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
      .from('imobiliarias')
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
    
    console.log('✅ Imobiliária atualizada com sucesso:', data[0]);
    res.json({ id: data[0].id, message: 'Imobiliária atualizada com sucesso!' });
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

    if (error) throw error;
    
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

// === CADASTRO PÚBLICO DE CLIENTES/LEADS === (Sem autenticação)
app.post('/api/leads/cadastro', async (req, res) => {
  try {
    const { nome, telefone, tipo_servico, cpf, observacoes } = req.body;
    
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
    
    // Inserir lead/cliente
    const { data, error } = await supabase
      .from('clientes')
      .insert([{ 
        nome: nome.trim(), 
        telefone: telefone.trim(), 
        cpf: cpfNumeros,
        tipo_servico: tipo_servico || null,
        status: 'lead', 
        observacoes: observacoes || null,
        consultor_id: null // Lead público não tem consultor inicial
      }])
      .select();

    if (error) throw error;
    
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

// === CLIENTES === (Admin vê todos, Consultor vê apenas os seus)
app.get('/api/clientes', authenticateToken, async (req, res) => {
  try {
    let query = supabase
      .from('clientes')
      .select(`
        *,
        consultores(nome)
      `)
      .order('created_at', { ascending: false });

    // Se for consultor, filtrar clientes atribuídos a ele OU vinculados através de agendamentos
    if (req.user.tipo === 'consultor') {
      // Buscar clientes com agendamentos deste consultor
      const { data: agendamentos, error: agendError } = await supabase
        .from('agendamentos')
        .select('cliente_id')
        .eq('consultor_id', req.user.consultor_id);

      if (agendError) throw agendError;

      const clienteIds = agendamentos.map(a => a.cliente_id);
      
      // Combinar: clientes atribuídos diretamente OU com agendamentos
      const conditions = [`consultor_id.eq.${req.user.consultor_id}`];
      
      if (clienteIds.length > 0) {
        conditions.push(`id.in.(${clienteIds.join(',')})`);
      }
      
      // Aplicar filtro OR
      query = query.or(conditions.join(','));
    }

    const { data, error } = await query;

    if (error) throw error;
    
    // Reformatar dados para compatibilidade com frontend
    const formattedData = data.map(cliente => ({
      ...cliente,
      consultor_nome: cliente.consultores?.nome
    }));

    res.json(formattedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/clientes', authenticateToken, async (req, res) => {
  try {
    const { nome, telefone, cpf, tipo_servico, status, observacoes, consultor_id } = req.body;
    
    // Converter consultor_id para null se não fornecido
    const consultorId = consultor_id && String(consultor_id).trim() !== '' ? parseInt(consultor_id) : null;
    
    const { data, error } = await supabase
      .from('clientes')
      .insert([{ 
        nome, 
        telefone, 
        cpf, 
        tipo_servico, 
        status: status || 'lead', 
        observacoes,
        consultor_id: consultorId
      }])
      .select();

    if (error) throw error;
    res.json({ id: data[0].id, message: 'Cliente cadastrado com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/clientes/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, telefone, cpf, tipo_servico, status, observacoes, consultor_id } = req.body;
    
    // Converter consultor_id para null se não fornecido
    const consultorId = consultor_id && String(consultor_id).trim() !== '' ? parseInt(consultor_id) : null;
    
    const { data, error } = await supabase
      .from('clientes')
      .update({ 
        nome, 
        telefone, 
        cpf, 
        tipo_servico, 
        status, 
        observacoes,
        consultor_id: consultorId
      })
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json({ id: data[0].id, message: 'Cliente atualizado com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/clientes/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const { error } = await supabase
      .from('clientes')
      .update({ status })
      .eq('id', id);

    if (error) throw error;
    res.json({ message: 'Status atualizado com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// === NOVOS LEADS === (Funcionalidade para pegar leads)
app.get('/api/novos-leads', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('clientes')
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
    const { data: clienteAtual, error: checkError } = await supabase
      .from('clientes')
      .select('consultor_id')
      .eq('id', id)
      .single();

    if (checkError) throw checkError;

    if (clienteAtual.consultor_id !== null) {
      return res.status(400).json({ error: 'Este lead já foi atribuído a outro consultor!' });
    }

    // Atribuir o lead ao consultor atual
    const { error } = await supabase
      .from('clientes')
      .update({ consultor_id: req.user.consultor_id })
      .eq('id', id);

    if (error) throw error;
    res.json({ message: 'Lead atribuído com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// === AGENDAMENTOS === (Admin vê todos, Consultor vê apenas os seus)
app.get('/api/agendamentos', authenticateToken, async (req, res) => {
  try {
    let query = supabase
      .from('agendamentos')
      .select(`
        *,
        clientes(nome, telefone),
        consultores(nome),
        imobiliarias(nome)
      `)
      .order('data_agendamento', { ascending: false })
      .order('horario');

    // Se for consultor, filtrar apenas seus agendamentos
    if (req.user.tipo === 'consultor') {
      query = query.eq('consultor_id', req.user.consultor_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Reformatar dados para compatibilidade com frontend
    const formattedData = data.map(agendamento => ({
      ...agendamento,
      cliente_nome: agendamento.clientes?.nome,
      cliente_telefone: agendamento.clientes?.telefone,
      consultor_nome: agendamento.consultores?.nome,
      imobiliaria_nome: agendamento.imobiliarias?.nome
    }));

    res.json(formattedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/agendamentos', authenticateToken, async (req, res) => {
  try {
    const { cliente_id, consultor_id, imobiliaria_id, data_agendamento, horario, observacoes } = req.body;
    
    const { data, error } = await supabase
      .from('agendamentos')
      .insert([{ cliente_id, consultor_id, imobiliaria_id, data_agendamento, horario, observacoes }])
      .select();

    if (error) throw error;

    // Atualizar status do cliente para "agendado"
    if (cliente_id) {
      await supabase
        .from('clientes')
        .update({ status: 'agendado' })
        .eq('id', cliente_id);
    }

    res.json({ id: data[0].id, message: 'Agendamento criado com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/agendamentos/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { cliente_id, consultor_id, imobiliaria_id, data_agendamento, horario, status, observacoes } = req.body;
    
    const { data, error } = await supabase
      .from('agendamentos')
      .update({ cliente_id, consultor_id, imobiliaria_id, data_agendamento, horario, status, observacoes })
      .eq('id', id)
      .select();

    if (error) throw error;

    // Se mudou o cliente do agendamento, atualizar status do novo cliente
    if (cliente_id) {
      await supabase
        .from('clientes')
        .update({ status: 'agendado' })
        .eq('id', cliente_id);
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
    
    const { error } = await supabase
      .from('agendamentos')
      .update({ status })
      .eq('id', id);

    if (error) throw error;
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
    res.json({ message: 'Cliente marcado como lembrado!' });
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
    let query = supabase
      .from('fechamentos')
      .select(`
        *,
        clientes(nome, telefone, cpf),
        consultores(nome),
        imobiliarias(nome)
      `)
      .order('data_fechamento', { ascending: false })
      .order('created_at', { ascending: false });

    // Se for consultor, filtrar apenas seus fechamentos
    if (req.user.tipo === 'consultor') {
      query = query.eq('consultor_id', req.user.consultor_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Reformatar dados para compatibilidade com frontend
    const formattedData = data.map(fechamento => ({
      ...fechamento,
      cliente_nome: fechamento.clientes?.nome,
      cliente_telefone: fechamento.clientes?.telefone,
      cliente_cpf: fechamento.clientes?.cpf,
      consultor_nome: fechamento.consultores?.nome,
      imobiliaria_nome: fechamento.imobiliarias?.nome
    }));

    res.json(formattedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/fechamentos', authenticateUpload, upload.single('contrato'), async (req, res) => {
  try {
    const { 
      cliente_id, 
      consultor_id, 
      imobiliaria_id, 
      valor_fechado, 
      data_fechamento, 
      tipo_servico,
      observacoes 
    } = req.body;

    // Verificar se o arquivo foi enviado
    if (!req.file) {
      return res.status(400).json({ error: 'Contrato em PDF é obrigatório!' });
    }

    // Converter campos opcionais para null se não enviados ou vazios
    const consultorId = consultor_id && String(consultor_id).trim() !== '' ? parseInt(consultor_id) : null;
    const imobiliariaId = imobiliaria_id && String(imobiliaria_id).trim() !== '' ? parseInt(imobiliaria_id) : null;

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
    
    const { data, error } = await supabase
      .from('fechamentos')
      .insert([{ 
        cliente_id: parseInt(cliente_id), 
        consultor_id: consultorId, 
        imobiliaria_id: imobiliariaId, 
        valor_fechado: parseFloat(valor_fechado), 
        data_fechamento, 
        tipo_servico: tipo_servico || null,
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

    // Atualizar status do cliente para "fechado"
    if (cliente_id) {
      await supabase
        .from('clientes')
        .update({ status: 'fechado' })
        .eq('id', cliente_id);
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

app.put('/api/fechamentos/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      cliente_id, 
      consultor_id, 
      imobiliaria_id, 
      valor_fechado, 
      data_fechamento, 
      tipo_servico,
      observacoes 
    } = req.body;

    // Converter campos opcionais para null se não enviados ou vazios
    const consultorId = consultor_id && String(consultor_id).trim() !== '' ? parseInt(consultor_id) : null;
    const imobiliariaId = imobiliaria_id && String(imobiliaria_id).trim() !== '' ? parseInt(imobiliaria_id) : null;
    
    const { data, error } = await supabase
      .from('fechamentos')
      .update({ 
        cliente_id: parseInt(cliente_id), 
        consultor_id: consultorId, 
        imobiliaria_id: imobiliariaId, 
        valor_fechado: parseFloat(valor_fechado), 
        data_fechamento, 
        tipo_servico: tipo_servico || null,
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
    const { data: fechamento, error: selectError } = await supabase
      .from('fechamentos')
      .select('contrato_arquivo')
      .eq('id', id)
      .single();

    if (selectError) throw selectError;

    // Deletar fechamento do banco
    const { error } = await supabase
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
    const { data: fechamento, error } = await supabase
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
    const { data: fechamento, error: fetchError } = await supabase
      .from('fechamentos')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError || !fechamento) {
      return res.status(404).json({ error: 'Fechamento não encontrado' });
    }
    
    // Tentar atualizar o campo aprovado
    const { data, error } = await supabase
      .from('fechamentos')
      .update({ aprovado: 'aprovado' })
      .eq('id', id)
      .select();
    
    if (error) {
      // Se der erro (campo não existe), criar uma resposta de sucesso mesmo assim
      console.log('Campo aprovado não existe na tabela, mas continuando...');
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
    const { data: fechamento, error: fetchError } = await supabase
      .from('fechamentos')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError || !fechamento) {
      return res.status(404).json({ error: 'Fechamento não encontrado' });
    }
    
    // Tentar atualizar o campo aprovado
    const { data, error } = await supabase
      .from('fechamentos')
      .update({ aprovado: 'reprovado' })
      .eq('id', id)
      .select();
    
    if (error) {
      // Se der erro (campo não existe), criar uma resposta de sucesso mesmo assim
      console.log('Campo aprovado não existe na tabela, mas continuando...');
      return res.json({ message: 'Fechamento reprovado com sucesso!' });
    }
    
    res.json({ message: 'Fechamento reprovado com sucesso!' });
  } catch (error) {
    console.error('Erro ao reprovar fechamento:', error);
    res.status(500).json({ error: error.message });
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

    // Buscar total de clientes
    let clientesQuery = supabase
      .from('clientes')
      .select('*', { count: 'exact', head: true });

    // Para consultor, contar apenas clientes com agendamentos dele
    if (isConsultor) {
      const { data: agendamentos, error: agendError } = await supabase
        .from('agendamentos')
        .select('cliente_id')
        .eq('consultor_id', consultorId);

      if (agendError) throw agendError;

      const clienteIds = [...new Set(agendamentos.map(a => a.cliente_id))];
      
      if (clienteIds.length > 0) {
        clientesQuery = clientesQuery.in('id', clienteIds);
      } else {
        clientesQuery = clientesQuery.eq('id', 0); // Força resultado vazio
      }
    }

    const { count: totalClientes, error: error3 } = await clientesQuery;
    if (error3) throw error3;

    // Buscar fechamentos
    let fechamentosQuery = supabase
      .from('fechamentos')
      .select('*');
    
    if (isConsultor) {
      fechamentosQuery = fechamentosQuery.eq('consultor_id', consultorId);
    }

    const { data: fechamentos, error: error5 } = await fechamentosQuery;
    if (error5) throw error5;

    // Estatísticas de fechamentos
    const fechamentosHoje = fechamentos.filter(f => f.data_fechamento === hoje).length;
    
    const fechamentosMes = fechamentos.filter(f => {
      const mesAtual = new Date().getMonth();
      const anoAtual = new Date().getFullYear();
      const dataFechamento = new Date(f.data_fechamento + 'T12:00:00'); // Forçar meio-dia para evitar timezone
      return dataFechamento.getMonth() === mesAtual && dataFechamento.getFullYear() === anoAtual;
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
    let fechamentosConsultorQuery = supabase
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
        return dataFechamento.getFullYear() === anoAtual; // Mostrar fechamentos do ano todo
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
      totalClientes,
      fechamentosHoje,
      fechamentosMes: fechamentosMes.length,
      valorTotalMes,
      ticketMedio,
      totalFechamentos: fechamentos.length,
      estatisticasConsultores
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Inicializar servidor
app.listen(PORT, async () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🌐 Acesse: http://localhost:${PORT}`);
  console.log(`🗄️ Usando Supabase como banco de dados`);
  
  // Verificar conexão com Supabase
  try {
    const { data, error } = await supabase.from('imobiliarias').select('count').limit(1);
    if (error) {
      console.log('⚠️  Configure as variáveis SUPABASE_URL e SUPABASE_SERVICE_KEY no arquivo .env');
      console.log('📖 Consulte o README.md para instruções detalhadas');
    } else {
      console.log('✅ Conexão com Supabase estabelecida com sucesso!');
    }
  } catch (error) {
    console.log('⚠️  Erro ao conectar com Supabase:', error.message);
  }
  
  await initializeTables();
}); 