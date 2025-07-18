-- 🏠 CRM IMOBILIÁRIO - CONFIGURAÇÃO COMPLETA DO BANCO DE DADOS
-- Execute este script no Supabase SQL Editor

-- 1. Tabela de usuários (sistema de autenticação)
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  senha VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) DEFAULT 'admin',
  consultor_id INTEGER,
  ativo BOOLEAN DEFAULT true,
  ultimo_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Tabela de consultores
CREATE TABLE IF NOT EXISTS consultores (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT,
  email VARCHAR(255) UNIQUE,
  senha VARCHAR(255),
  cpf VARCHAR(14) UNIQUE,
  pix VARCHAR(255),
  tipo VARCHAR(50) DEFAULT 'consultor',
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Tabela de imobiliárias
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

-- 4. Tabela de clientes/leads
CREATE TABLE IF NOT EXISTS clientes (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT,
  cpf TEXT,
  tipo_servico TEXT,
  status TEXT DEFAULT 'lead',
  observacoes TEXT,
  consultor_id INTEGER REFERENCES consultores(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Tabela de agendamentos
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

-- 6. Tabela de fechamentos
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
  contrato_arquivo TEXT,
  contrato_nome_original TEXT,
  contrato_tamanho INTEGER,
  contrato_upload_data TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 7. Inserir admin padrão
INSERT INTO usuarios (nome, email, senha, tipo, ativo) 
VALUES (
  'Administrador', 
  'admin@crm.com', 
  '$2b$10$8K1p/a9UOGNeMlvV7QT4..ZCdP9.VJK0Hk5QZY3oBz3Ohs/qJlm/G', 
  'admin', 
  true
) ON CONFLICT (email) DO NOTHING;

-- 8. Inserir dados de exemplo para imobiliárias
INSERT INTO imobiliarias (nome, endereco, cidade, estado, telefone, email, status)
VALUES 
  ('Imobiliária Prime SP', 'Av. Paulista, 1000', 'São Paulo', 'SP', '(11) 3000-1000', 'contato@primesp.com', 'ativo'),
  ('Imobiliária Costa Verde RJ', 'Rua das Laranjeiras, 200', 'Rio de Janeiro', 'RJ', '(21) 3000-2000', 'contato@costaverde.com', 'ativo'),
  ('Imobiliária Minas Casa BH', 'Rua da Bahia, 300', 'Belo Horizonte', 'MG', '(31) 3000-3000', 'contato@minascasa.com', 'ativo')
ON CONFLICT DO NOTHING;

-- 9. Inserir dados de exemplo para consultores
INSERT INTO consultores (nome, telefone, email, senha, cpf, pix, tipo, ativo)
VALUES 
  ('João Silva', '(11) 99999-1111', 'joao@crm.com', '$2b$10$8K1p/a9UOGNeMlvV7QT4..ZCdP9.VJK0Hk5QZY3oBz3Ohs/qJlm/G', '11111111111', 'joao@pix.com', 'consultor', true),
  ('Maria Santos', '(21) 99999-2222', 'maria@crm.com', '$2b$10$8K1p/a9UOGNeMlvV7QT4..ZCdP9.VJK0Hk5QZY3oBz3Ohs/qJlm/G', '22222222222', 'maria@pix.com', 'consultor', true)
ON CONFLICT (email) DO NOTHING;

-- 10. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_clientes_consultor ON clientes(consultor_id);
CREATE INDEX IF NOT EXISTS idx_clientes_status ON clientes(status);
CREATE INDEX IF NOT EXISTS idx_agendamentos_consultor ON agendamentos(consultor_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_data ON agendamentos(data_agendamento);
CREATE INDEX IF NOT EXISTS idx_agendamentos_cliente ON agendamentos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_imobiliaria ON agendamentos(imobiliaria_id);
CREATE INDEX IF NOT EXISTS idx_fechamentos_consultor ON fechamentos(consultor_id);
CREATE INDEX IF NOT EXISTS idx_fechamentos_data ON fechamentos(data_fechamento);
CREATE INDEX IF NOT EXISTS idx_fechamentos_cliente ON fechamentos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_fechamentos_imobiliaria ON fechamentos(imobiliaria_id);
CREATE INDEX IF NOT EXISTS idx_imobiliarias_estado ON imobiliarias(estado);
CREATE INDEX IF NOT EXISTS idx_imobiliarias_cidade ON imobiliarias(cidade);

-- 11. Desabilitar RLS para simplificar
ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE consultores DISABLE ROW LEVEL SECURITY;
ALTER TABLE imobiliarias DISABLE ROW LEVEL SECURITY;
ALTER TABLE clientes DISABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos DISABLE ROW LEVEL SECURITY;
ALTER TABLE fechamentos DISABLE ROW LEVEL SECURITY;

-- 12. Verificação final
SELECT 
  'Configuração completa!' as status,
  (SELECT COUNT(*) FROM usuarios) as total_usuarios,
  (SELECT COUNT(*) FROM consultores) as total_consultores,
  (SELECT COUNT(*) FROM imobiliarias) as total_imobiliarias;

-- PRONTO! 🚀
-- Seu CRM Imobiliário está configurado e pronto para uso!
-- Login padrão: admin@crm.com / admin123 