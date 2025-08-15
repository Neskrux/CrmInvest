-- =====================================================
-- MIGRAÇÕES DO CRM - EXECUTAR NO SUPABASE SQL EDITOR
-- =====================================================

-- Tabela de controle de migrações
CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMP DEFAULT NOW()
);

-- Migração 001: Tabelas básicas
INSERT INTO schema_migrations (version) VALUES ('001_basic_tables')
ON CONFLICT (version) DO NOTHING;

-- Tabela de clínicas
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

-- Tabelas do Meta Ads
CREATE TABLE IF NOT EXISTS meta_ads_pricing (
  id SERIAL PRIMARY KEY,
  cidade TEXT NOT NULL,
  estado VARCHAR(2) NOT NULL,
  preco_lead DECIMAL(10,2) NOT NULL,
  campanha_id TEXT,
  campanha_nome TEXT,
  data_inicio DATE,
  data_fim DATE,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meta_ads_leads (
  id SERIAL PRIMARY KEY,
  paciente_id INTEGER REFERENCES pacientes(id),
  campanha_id TEXT,
  adset_id TEXT,
  ad_id TEXT,
  custo_lead DECIMAL(10,2),
  cidade TEXT,
  estado VARCHAR(2),
  data_lead DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Desabilitar RLS para simplificar
ALTER TABLE clinicas DISABLE ROW LEVEL SECURITY;
ALTER TABLE consultores DISABLE ROW LEVEL SECURITY;
ALTER TABLE pacientes DISABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos DISABLE ROW LEVEL SECURITY;
ALTER TABLE fechamentos DISABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE meta_ads_pricing DISABLE ROW LEVEL SECURITY;
ALTER TABLE meta_ads_leads DISABLE ROW LEVEL SECURITY;

-- Inserir admin padrão
INSERT INTO usuarios (nome, email, senha, tipo) VALUES (
  'Administrador',
  'admin@crm.com',
  '$2b$10$rQZ8K9vX2mN3pL4qR5sT6uV7wX8yZ9aA0bB1cC2dE3fF4gG5hH6iI7jJ8kK9lL0mM1nN2oO3pP4qQ5rR6sS7tT8uU9vV0wW1xX2yY3zZ',
  'admin'
) ON CONFLICT (email) DO NOTHING;

-- Verificar migração
SELECT 'Migração 001 concluída com sucesso!' as status;
