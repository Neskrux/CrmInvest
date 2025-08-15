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
    'https://crm-invest.vercel.app',
    'https://crm-invest-*.vercel.app',
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

// Configuração do Multer para upload de arquivos
// Trocar para memoryStorage para funcionar no Vercel
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

// Supabase client - CREDENCIAIS FIXAS PARA VERCEL
const supabaseUrl = 'https://idicuetpukxjqripbpwa.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkaWN1ZXRwdWt4anFyaXBicHdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYyNzA5MTQsImV4cCI6MjA1MTg0NjkxNH0.j1u6gpLmC9Kont3WW9nqLmJJ6icQAcLt5TuPVtJCqGc';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkaWN1ZXRwdWt4anFyaXBicHdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTIwMDczMSwiZXhwIjoyMDcwNzc2NzMxfQ.71IeNihVLi3Uj4Tx9b9-xB2XVqUqBZXimHspudv4Ex4';

console.log('🔍 DEBUG - Credenciais Supabase:');
console.log('URL:', supabaseUrl);
console.log('ANON KEY:', supabaseAnonKey ? 'Presente' : 'Ausente');
console.log('SERVICE KEY:', supabaseServiceKey ? 'Presente' : 'Ausente');

// Cliente Supabase para operações normais
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente Supabase Admin para operações privilegiadas (Storage, etc.)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Configurar Supabase Storage
const STORAGE_BUCKET = 'contratos';

// JWT Secret - FIXO PARA VERCEL
const JWT_SECRET = 'nKDiWQtS50GAaJUf3u2YKPxrJn+Y2DRdV5pRwkUg0iBkb/tvH0UQVAnOT8kWQA7pp27mXaTCaoV2NpoOPVZ8IA==';

// Função para normalizar emails (converter para minúsculas e limpar espaços)
const normalizarEmail = (email) => {
  if (!email) return '';
  return email.toLowerCase().trim();
};

// Função para normalizar nomes (remover acentos, espaços, converter para minúsculas)
const normalizarNome = (nome) => {
  if (!nome) return '';
  
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9]/g, '') // Remove caracteres especiais e espaços
    .trim();
};

// Função para gerar email do consultor
const gerarEmailConsultor = (nome) => {
  const nomeNormalizado = normalizarNome(nome);
  return `${nomeNormalizado}@investmoneysa.com.br`;
};

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
-- Tabela de clínicas (atualizada)
CREATE TABLE IF NOT EXISTS clinicas (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  endereco TEXT,
  bairro TEXT,
  cidade TEXT,
  estado VARCHAR(2),
  nicho TEXT DEFAULT 'Ambos',
  telefone TEXT,
  email TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de consultores
CREATE TABLE IF NOT EXISTS consultores (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  senha TEXT,
  cpf TEXT,
  pix TEXT,
  tipo TEXT DEFAULT 'consultor',
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de pacientes/leads
CREATE TABLE IF NOT EXISTS pacientes (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT,
  cpf TEXT,
  tipo_tratamento TEXT,
  status TEXT DEFAULT 'lead',
  observacoes TEXT,
  consultor_id INTEGER REFERENCES consultores(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de agendamentos
CREATE TABLE IF NOT EXISTS agendamentos (
  id SERIAL PRIMARY KEY,
  paciente_id INTEGER REFERENCES pacientes(id),
  consultor_id INTEGER REFERENCES consultores(id),
  clinica_id INTEGER REFERENCES clinicas(id),
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
  paciente_id INTEGER REFERENCES pacientes(id) ON DELETE CASCADE,
  consultor_id INTEGER REFERENCES consultores(id) ON DELETE SET NULL,
  clinica_id INTEGER REFERENCES clinicas(id) ON DELETE SET NULL,
  agendamento_id INTEGER REFERENCES agendamentos(id) ON DELETE SET NULL,
  valor_fechado DECIMAL(10,2) NOT NULL,
  data_fechamento DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo_tratamento TEXT,
  forma_pagamento TEXT,
  observacoes TEXT,
  contrato_arquivo TEXT,
  contrato_nome_original TEXT,
  contrato_tamanho INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de usuários admin
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  senha TEXT NOT NULL,
  tipo TEXT DEFAULT 'admin',
  ativo BOOLEAN DEFAULT TRUE,
  consultor_id INTEGER REFERENCES consultores(id),
  ultimo_login TIMESTAMP,
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
    
    if (!senhaValida) {
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
      tokenData.email = usuario.email;
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

// CORRIGIDO: Endpoint verify-token para funcionar com consultores
app.get('/api/verify-token', authenticateToken, async (req, res) => {
  try {
    let usuario = null;
    
    // Se for admin, buscar na tabela usuarios
    if (req.user.tipo === 'admin') {
      const { data: usuarioAdmin, error } = await supabase
        .from('usuarios')
        .select(`
          *,
          consultores(nome, telefone)
        `)
        .eq('id', req.user.id)
        .eq('ativo', true)
        .single();

      if (error || !usuarioAdmin) {
        return res.status(401).json({ error: 'Usuário não encontrado' });
      }
      
      usuario = usuarioAdmin;
    } else {
      // Se for consultor, buscar na tabela consultores
      const { data: consultorData, error } = await supabase
        .from('consultores')
        .select('*')
        .eq('id', req.user.id)
        .single();

      if (error || !consultorData) {
        return res.status(401).json({ error: 'Consultor não encontrado' });
      }
      
      usuario = consultorData;
    }

    const { senha: _, ...dadosUsuario } = usuario;

    res.json({
      usuario: {
        ...dadosUsuario,
        tipo: req.user.tipo,
        consultor_nome: req.user.tipo === 'admin' ? usuario.consultores?.nome || null : usuario.nome
      }
    });
  } catch (error) {
    console.error('Erro ao verificar token:', error);
    res.status(500).json({ error: error.message });
  }
});

// ROTAS DA API

// === CLÍNICAS === (Apenas Admin)
app.get('/api/clinicas', authenticateToken, async (req, res) => {
  try {
    const { cidade, estado } = req.query;
    
    let query = supabase
      .from('clinicas')
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
    const { nome, endereco, bairro, cidade, estado, nicho, telefone, email } = req.body;
    
    const { data, error } = await supabase
      .from('clinicas')
      .insert([{ nome, endereco, bairro, cidade, estado, nicho, telefone, email }])
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
    const { nome, endereco, bairro, cidade, estado, nicho, telefone, email } = req.body;
    
    const { data, error } = await supabase
      .from('clinicas')
      .update({ nome, endereco, bairro, cidade, estado, nicho, telefone, email })
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json({ id: data[0].id, message: 'Clínica atualizada com sucesso!' });
  } catch (error) {
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
    const { nome, telefone, senha, pix } = req.body;
    
    // Validar se senha foi fornecida
    if (!senha || senha.trim() === '') {
      return res.status(400).json({ error: 'Senha é obrigatória!' });
    }
    
    // Gerar email automático normalizado
    const email = gerarEmailConsultor(nome);
    
    // Hash da senha antes de salvar
    const saltRounds = 10;
    const senhaHash = await bcrypt.hash(senha, saltRounds);
    
    const { data, error } = await supabase
      .from('consultores')
      .insert([{ nome, telefone, email, senha: senhaHash, pix }])
      .select();

    if (error) throw error;
    res.json({ 
      id: data[0].id, 
      message: 'Consultor cadastrado com sucesso!',
      email: email 
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
    
    // Validar se email já existe
    const { data: emailExistente, error: emailError } = await supabase
      .from('consultores')
      .select('id')
      .eq('email', email.toLowerCase())
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
        email: email.toLowerCase(), 
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
      email: email.toLowerCase()
    });
  } catch (error) {
    console.error('Erro no cadastro:', error);
    res.status(500).json({ error: error.message });
  }
});

// === CADASTRO PÚBLICO DE PACIENTES/LEADS === (Sem autenticação)
app.post('/api/leads/cadastro', async (req, res) => {
  try {
    const { nome, telefone, tipo_tratamento, cpf, observacoes } = req.body;
    
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
    
    // Inserir lead/paciente
    const { data, error } = await supabase
      .from('pacientes')
      .insert([{ 
        nome: nome.trim(), 
        telefone: telefone.trim(), 
        cpf: cpfNumeros,
        tipo_tratamento: tipo_tratamento || null,
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
    const { nome, telefone, senha, pix } = req.body;
    
    // Preparar dados para atualização
    const updateData = { nome, telefone, pix };
    
    // Atualizar email sempre que o nome for alterado
    if (nome) {
      updateData.email = gerarEmailConsultor(nome);
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

    // Se for consultor, filtrar pacientes atribuídos a ele OU vinculados através de agendamentos
    if (req.user.tipo === 'consultor') {
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

app.post('/api/pacientes', authenticateToken, async (req, res) => {
  try {
    const { nome, telefone, cpf, tipo_tratamento, status, observacoes, consultor_id } = req.body;
    
    // Converter consultor_id para null se não fornecido
    const consultorId = consultor_id && String(consultor_id).trim() !== '' ? parseInt(consultor_id) : null;
    
    const { data, error } = await supabase
      .from('pacientes')
      .insert([{ 
        nome, 
        telefone, 
        cpf, 
        tipo_tratamento, 
        status: status || 'lead', 
        observacoes,
        consultor_id: consultorId
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
    const { nome, telefone, cpf, tipo_tratamento, status, observacoes, consultor_id } = req.body;
    
    // Converter consultor_id para null se não fornecido
    const consultorId = consultor_id && String(consultor_id).trim() !== '' ? parseInt(consultor_id) : null;
    
    const { data, error } = await supabase
      .from('pacientes')
      .update({ 
        nome, 
        telefone, 
        cpf, 
        tipo_tratamento, 
        status, 
        observacoes,
        consultor_id: consultorId
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
    
    const { error } = await supabase
      .from('pacientes')
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

// === AGENDAMENTOS === (Admin vê todos, Consultor vê apenas os seus)
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

    // Se for consultor, filtrar apenas seus agendamentos
    if (req.user.tipo === 'consultor') {
      query = query.eq('consultor_id', req.user.consultor_id);
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
    const { paciente_id, consultor_id, clinica_id, data_agendamento, horario, observacoes } = req.body;
    
    const { data, error } = await supabase
      .from('agendamentos')
      .insert([{ paciente_id, consultor_id, clinica_id, data_agendamento, horario, observacoes }])
      .select();

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
    let query = supabase
      .from('fechamentos')
      .select(`
        *,
        pacientes(nome, telefone, cpf),
        consultores(nome),
        clinicas(nome)
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

    // Verificar se o arquivo foi enviado
    if (!req.file) {
      return res.status(400).json({ error: 'Contrato em PDF é obrigatório!' });
    }

    // Converter campos opcionais para null se não enviados ou vazios
    const consultorId = consultor_id && String(consultor_id).trim() !== '' ? parseInt(consultor_id) : null;
    const clinicaId = clinica_id && String(clinica_id).trim() !== '' ? parseInt(clinica_id) : null;

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
        paciente_id: parseInt(paciente_id), 
        consultor_id: consultorId, 
        clinica_id: clinicaId, 
        valor_fechado: parseFloat(valor_fechado), 
        data_fechamento, 
        tipo_tratamento: tipo_tratamento || null,
        observacoes: observacoes || null,
        contrato_arquivo: contratoArquivo,
        contrato_nome_original: contratoNomeOriginal,
        contrato_tamanho: contratoTamanho
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
      await supabase
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

app.put('/api/fechamentos/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
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
    const consultorId = consultor_id && String(consultor_id).trim() !== '' ? parseInt(consultor_id) : null;
    const clinicaId = clinica_id && String(clinica_id).trim() !== '' ? parseInt(clinica_id) : null;
    
    const { data, error } = await supabase
      .from('fechamentos')
      .update({ 
        paciente_id: parseInt(paciente_id), 
        consultor_id: consultorId, 
        clinica_id: clinicaId, 
        valor_fechado: parseFloat(valor_fechado), 
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

    // Usar URL assinada do Supabase (expira em 60s) para garantir download correto
    const nomeDownload = (fechamento.contrato_nome_original || 'contrato.pdf').replace(/"/g, '');
    const { data: signed, error: signedError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(fechamento.contrato_arquivo, 60, { download: nomeDownload });

    if (!signedError && signed?.signedUrl) {
      return res.redirect(signed.signedUrl);
    }

    // Fallback manual
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nomeDownload}"`);
    if (data && typeof data.arrayBuffer === 'function') {
      const buffer = Buffer.from(await data.arrayBuffer());
      res.setHeader('Content-Length', buffer.length);
      return res.end(buffer);
    }
    if (data && typeof data.pipe === 'function') {
      return data.pipe(res);
    }
    return res.status(500).json({ error: 'Não foi possível processar o arquivo do contrato' });
  } catch (error) {
    console.error('Erro ao baixar contrato:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint alternativo: retorna URL assinada para download
app.get('/api/fechamentos/:id/contrato/url', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: fechamento, error } = await supabase
      .from('fechamentos')
      .select('contrato_arquivo, contrato_nome_original')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!fechamento?.contrato_arquivo) {
      return res.status(404).json({ error: 'Contrato não encontrado!' });
    }

    const nomeDownload = (fechamento.contrato_nome_original || 'contrato.pdf').replace(/"/g, '');
    const { data: signed, error: signedError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(fechamento.contrato_arquivo, 60, { download: nomeDownload });

    if (signedError || !signed?.signedUrl) {
      return res.status(500).json({ error: 'Não foi possível gerar URL assinada' });
    }

    res.json({ url: signed.signedUrl, nome: nomeDownload });
  } catch (error) {
    console.error('Erro ao gerar URL do contrato:', error);
    res.status(500).json({ error: error.message });
  }
});

// === DASHBOARD/ESTATÍSTICAS === (Admin vê tudo, Consultor vê apenas seus dados)
app.get('/api/dashboard', authenticateToken, async (req, res) => {
  try {
    // Obter data atual no fuso horário do Brasil (UTC-3)
    const agora = new Date();
    const brasilTime = new Date(agora.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
    const hoje = brasilTime.getFullYear() + '-' + 
                 String(brasilTime.getMonth() + 1).padStart(2, '0') + '-' + 
                 String(brasilTime.getDate()).padStart(2, '0');
    
    console.log('📅 Data atual no Brasil:', hoje);
    console.log('📅 Data UTC do servidor:', agora.toISOString().split('T')[0]);

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
      totalPacientes,
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

// Inicializar tabelas quando o módulo for carregado
(async () => {
  try {
    await initializeTables();
    console.log('✅ Tabelas inicializadas com sucesso!');
  } catch (error) {
    console.log('⚠️  Erro ao inicializar tabelas:', error.message);
  }
})();

// Exportar para Vercel
// Endpoint de debug para verificar configuração
app.get('/debug-env', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    supabase: {
      url: supabaseUrl,
      hasAnonKey: !!supabaseAnonKey,
      hasServiceKey: !!supabaseServiceKey
    },
    jwt: {
      hasSecret: !!JWT_SECRET
    },
    environment: process.env.NODE_ENV || 'undefined'
  });
});

// Endpoint raiz
app.get('/', (req, res) => {
  res.json({ 
    status: 'CRM API Online', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

module.exports = app; 