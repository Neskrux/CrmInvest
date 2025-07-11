-- 🚀 MIGRAÇÃO COMPLETA ATUALIZADA - CRM
-- Execute este script no Supabase SQL Editor
-- Inclui TODAS as migrações necessárias incluindo campos de contrato

-- 1. Criar tabela de controle de migrações
CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(255) PRIMARY KEY,
  description TEXT,
  executed_at TIMESTAMP DEFAULT NOW()
);

-- 2. Criar todas as tabelas básicas
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

CREATE TABLE IF NOT EXISTS consultores (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

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
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Migração 011: Adicionar campo PIX
ALTER TABLE consultores 
ADD COLUMN IF NOT EXISTS pix VARCHAR(255);

-- 4. Migração 012: Adicionar campos para login de consultores
ALTER TABLE consultores 
ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;

ALTER TABLE consultores 
ADD COLUMN IF NOT EXISTS cpf VARCHAR(14) UNIQUE;

ALTER TABLE consultores 
ADD COLUMN IF NOT EXISTS tipo VARCHAR(50) DEFAULT 'consultor';

ALTER TABLE consultores 
ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;

ALTER TABLE consultores 
ADD COLUMN IF NOT EXISTS senha VARCHAR(255);

-- 5. Migração 013: Adicionar campos de contrato (CRÍTICO)
ALTER TABLE fechamentos 
ADD COLUMN IF NOT EXISTS contrato_arquivo TEXT;

ALTER TABLE fechamentos 
ADD COLUMN IF NOT EXISTS contrato_nome_original TEXT;

ALTER TABLE fechamentos 
ADD COLUMN IF NOT EXISTS contrato_tamanho INTEGER;

ALTER TABLE fechamentos 
ADD COLUMN IF NOT EXISTS contrato_upload_data TIMESTAMP DEFAULT NOW();

-- 6. Comentários explicativos
COMMENT ON COLUMN consultores.pix IS 'Chave PIX do consultor para recebimento de comissões';
COMMENT ON COLUMN consultores.email IS 'Email do consultor para login';
COMMENT ON COLUMN consultores.cpf IS 'CPF do consultor (usado para PIX)';
COMMENT ON COLUMN consultores.tipo IS 'Tipo do usuário (consultor, admin)';
COMMENT ON COLUMN consultores.ativo IS 'Se o consultor está ativo no sistema';
COMMENT ON COLUMN consultores.senha IS 'Hash da senha do consultor';

COMMENT ON COLUMN fechamentos.contrato_arquivo IS 'Nome do arquivo do contrato armazenado no servidor';
COMMENT ON COLUMN fechamentos.contrato_nome_original IS 'Nome original do arquivo enviado pelo usuário';
COMMENT ON COLUMN fechamentos.contrato_tamanho IS 'Tamanho do arquivo em bytes';
COMMENT ON COLUMN fechamentos.contrato_upload_data IS 'Data e hora do upload do contrato';

-- 7. Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_consultores_email ON consultores(email);
CREATE INDEX IF NOT EXISTS idx_consultores_cpf ON consultores(cpf);
CREATE INDEX IF NOT EXISTS idx_consultores_ativo ON consultores(ativo);
CREATE INDEX IF NOT EXISTS idx_fechamentos_contrato_arquivo ON fechamentos(contrato_arquivo);

-- 8. Registrar todas as migrações
INSERT INTO schema_migrations (version, description) VALUES
('011', 'Adicionar campo PIX para consultores'),
('012', 'Adicionar campos para cadastro público de consultores'),
('013', 'Adicionar campos de contrato para fechamentos')
ON CONFLICT (version) DO NOTHING;

-- 9. Verificar se tudo foi criado corretamente
SELECT 'CONSULTORES' as tabela, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'consultores' 
AND column_name IN ('pix', 'email', 'cpf', 'tipo', 'ativo', 'senha')
UNION ALL
SELECT 'FECHAMENTOS' as tabela, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'fechamentos' 
AND column_name LIKE 'contrato_%'
ORDER BY tabela, column_name;

-- 10. Verificar migrações executadas
SELECT version, description, executed_at 
FROM schema_migrations 
ORDER BY version; 