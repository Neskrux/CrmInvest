-- 🏠 CRM IMOBILIÁRIO - SETUP COMPLETO DO ZERO
-- Execute este script no Supabase SQL Editor

-- ATENÇÃO: Este script remove e recria todas as tabelas
-- Use apenas se quiser começar com banco limpo!

-- 1. Remover tabelas existentes (se houver)
DROP TABLE IF EXISTS fechamentos CASCADE;
DROP TABLE IF EXISTS agendamentos CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;
DROP TABLE IF EXISTS imobiliarias CASCADE;
DROP TABLE IF EXISTS consultores CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

-- 2. Criar tabela de usuários (sistema de autenticação)
CREATE TABLE usuarios (
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

-- 3. Criar tabela de consultores
CREATE TABLE consultores (
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

-- 4. Criar tabela de imobiliárias
CREATE TABLE imobiliarias (
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

-- 5. Criar tabela de clientes/leads
CREATE TABLE clientes (
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

-- 6. Criar tabela de agendamentos
CREATE TABLE agendamentos (
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

-- 7. Criar tabela de fechamentos
CREATE TABLE fechamentos (
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

-- 8. Inserir admin padrão
INSERT INTO usuarios (nome, email, senha, tipo, ativo) 
VALUES (
  'Administrador', 
  'admin@crm.com', 
  '$2b$10$8K1p/a9UOGNeMlvV7QT4..ZCdP9.VJK0Hk5QZY3oBz3Ohs/qJlm/G', 
  'admin', 
  true
);

-- 9. Inserir consultores de exemplo
INSERT INTO consultores (nome, telefone, email, senha, cpf, pix, tipo, ativo)
VALUES 
  ('João Silva', '(11) 99999-1111', 'joao@crm.com', '$2b$10$8K1p/a9UOGNeMlvV7QT4..ZCdP9.VJK0Hk5QZY3oBz3Ohs/qJlm/G', '11111111111', 'joao@pix.com', 'consultor', true),
  ('Maria Santos', '(21) 99999-2222', 'maria@crm.com', '$2b$10$8K1p/a9UOGNeMlvV7QT4..ZCdP9.VJK0Hk5QZY3oBz3Ohs/qJlm/G', '22222222222', 'maria@pix.com', 'consultor', true);

-- 10. Inserir imobiliárias de exemplo
INSERT INTO imobiliarias (nome, endereco, cidade, estado, telefone, email, status)
VALUES 
  ('Imobiliária Prime SP', 'Av. Paulista, 1000', 'São Paulo', 'SP', '(11) 3000-1000', 'contato@primesp.com', 'ativo'),
  ('Imobiliária Costa Verde RJ', 'Rua das Laranjeiras, 200', 'Rio de Janeiro', 'RJ', '(21) 3000-2000', 'contato@costaverde.com', 'ativo'),
  ('Imobiliária Minas Casa BH', 'Rua da Bahia, 300', 'Belo Horizonte', 'MG', '(31) 3000-3000', 'contato@minascasa.com', 'ativo');

-- 11. Inserir clientes de exemplo
INSERT INTO clientes (nome, telefone, cpf, tipo_servico, status, consultor_id)
VALUES 
  ('Ana Costa', '(11) 98888-1111', '33333333333', 'Compra', 'lead', 1),
  ('Carlos Lima', '(21) 97777-2222', '44444444444', 'Venda', 'agendado', 2),
  ('Beatriz Souza', '(31) 96666-3333', '55555555555', 'Locacao', 'lead', 1);

-- 12. Criar índices para performance
CREATE INDEX idx_clientes_consultor ON clientes(consultor_id);
CREATE INDEX idx_clientes_status ON clientes(status);
CREATE INDEX idx_agendamentos_consultor ON agendamentos(consultor_id);
CREATE INDEX idx_agendamentos_data ON agendamentos(data_agendamento);
CREATE INDEX idx_agendamentos_cliente ON agendamentos(cliente_id);
CREATE INDEX idx_agendamentos_imobiliaria ON agendamentos(imobiliaria_id);
CREATE INDEX idx_fechamentos_consultor ON fechamentos(consultor_id);
CREATE INDEX idx_fechamentos_data ON fechamentos(data_fechamento);
CREATE INDEX idx_fechamentos_cliente ON fechamentos(cliente_id);
CREATE INDEX idx_fechamentos_imobiliaria ON fechamentos(imobiliaria_id);
CREATE INDEX idx_imobiliarias_estado ON imobiliarias(estado);
CREATE INDEX idx_imobiliarias_cidade ON imobiliarias(cidade);

-- 13. Desabilitar RLS para simplificar
ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE consultores DISABLE ROW LEVEL SECURITY;
ALTER TABLE imobiliarias DISABLE ROW LEVEL SECURITY;
ALTER TABLE clientes DISABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos DISABLE ROW LEVEL SECURITY;
ALTER TABLE fechamentos DISABLE ROW LEVEL SECURITY;

-- 14. Verificação final
SELECT 
  'CRM Imobiliário configurado com sucesso!' as status,
  (SELECT COUNT(*) FROM usuarios) as total_usuarios,
  (SELECT COUNT(*) FROM consultores) as total_consultores,
  (SELECT COUNT(*) FROM imobiliarias) as total_imobiliarias,
  (SELECT COUNT(*) FROM clientes) as total_clientes;

-- ✅ SETUP COMPLETO!
-- Login: admin@crm.com / admin123
-- Seu CRM Imobiliário está pronto! 🏠🚀 