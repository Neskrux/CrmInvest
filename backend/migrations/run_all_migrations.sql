-- ========================================
-- MIGRAÇÃO COMPLETA DO CRM INVEST
-- Execute este arquivo no SQL Editor do Supabase
-- ========================================

-- 1. TABELA DE CLÍNICAS
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
  status TEXT DEFAULT 'ativo',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. TABELA DE CONSULTORES
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

-- 3. TABELA DE PACIENTES/LEADS
CREATE TABLE IF NOT EXISTS pacientes (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT,
  cpf TEXT,
  tipo_tratamento TEXT,
  status TEXT DEFAULT 'lead',
  observacoes TEXT,
  cidade TEXT,
  estado TEXT,
  consultor_id INTEGER REFERENCES consultores(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. TABELA DE AGENDAMENTOS
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

-- 5. TABELA DE FECHAMENTOS
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

-- 6. TABELA DE NOVAS CLÍNICAS (MISSÕES DIÁRIAS) - PRINCIPAL PARA RESOLVER O ERRO
CREATE TABLE IF NOT EXISTS novas_clinicas (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT,
  endereco TEXT,
  status TEXT DEFAULT 'tem_interesse',
  observacoes TEXT,
  consultor_id INTEGER REFERENCES consultores(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 7. TABELA DE USUÁRIOS ADMIN
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

-- 8. TABELA DE MENSAGENS WHATSAPP
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id SERIAL PRIMARY KEY,
  message_id TEXT UNIQUE NOT NULL,
  remote_jid TEXT NOT NULL,
  contact_name TEXT,
  contact_number TEXT,
  message TEXT,
  message_type TEXT DEFAULT 'text',
  timestamp TIMESTAMP DEFAULT NOW(),
  is_from_me BOOLEAN DEFAULT FALSE,
  media_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ========================================
-- CRIAR ÍNDICES PARA PERFORMANCE
-- ========================================

-- Índices para novas_clinicas (resolver o erro principal)
CREATE INDEX IF NOT EXISTS idx_novas_clinicas_consultor_id ON novas_clinicas (consultor_id);
CREATE INDEX IF NOT EXISTS idx_novas_clinicas_status ON novas_clinicas (status);
CREATE INDEX IF NOT EXISTS idx_novas_clinicas_created_at ON novas_clinicas (created_at);
CREATE INDEX IF NOT EXISTS idx_novas_clinicas_telefone ON novas_clinicas (telefone);

-- Índices para WhatsApp
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_remote_jid ON whatsapp_messages (remote_jid);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_timestamp ON whatsapp_messages (timestamp);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_contact_number ON whatsapp_messages (contact_number);

-- Outros índices importantes
CREATE INDEX IF NOT EXISTS idx_pacientes_consultor_id ON pacientes (consultor_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_data ON agendamentos (data_agendamento);
CREATE INDEX IF NOT EXISTS idx_fechamentos_data ON fechamentos (data_fechamento);

-- ========================================
-- DESABILITAR RLS (ROW LEVEL SECURITY)
-- ========================================
ALTER TABLE clinicas DISABLE ROW LEVEL SECURITY;
ALTER TABLE consultores DISABLE ROW LEVEL SECURITY;
ALTER TABLE pacientes DISABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos DISABLE ROW LEVEL SECURITY;
ALTER TABLE fechamentos DISABLE ROW LEVEL SECURITY;
ALTER TABLE novas_clinicas DISABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages DISABLE ROW LEVEL SECURITY;

-- ========================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ========================================
COMMENT ON TABLE novas_clinicas IS 'Tabela para armazenar clínicas encontradas durante as missões diárias dos consultores';
COMMENT ON COLUMN novas_clinicas.nome IS 'Nome da clínica encontrada';
COMMENT ON COLUMN novas_clinicas.telefone IS 'Telefone da clínica (apenas números)';
COMMENT ON COLUMN novas_clinicas.endereco IS 'Endereço completo da clínica';
COMMENT ON COLUMN novas_clinicas.status IS 'Status da clínica (tem_interesse, nao_tem_interesse)';
COMMENT ON COLUMN novas_clinicas.observacoes IS 'Observações sobre a clínica';
COMMENT ON COLUMN novas_clinicas.consultor_id IS 'ID do consultor que pegou a clínica (NULL = disponível)';
COMMENT ON COLUMN novas_clinicas.created_at IS 'Data e hora do cadastro';

-- ========================================
-- INSERIR USUÁRIO ADMIN PADRÃO
-- ========================================
INSERT INTO usuarios (nome, email, senha, tipo) 
VALUES ('Administrador', 'admin@crm.com', '$2b$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', 'admin')
ON CONFLICT (email) DO NOTHING;

-- ========================================
-- RECARREGAR CACHE DO POSTGREST
-- ========================================
NOTIFY pgrst, 'reload schema';

-- ========================================
-- VERIFICAÇÃO FINAL
-- ========================================
SELECT 'Migração concluída com sucesso!' as status;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

