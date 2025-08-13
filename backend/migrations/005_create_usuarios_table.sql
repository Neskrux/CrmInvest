-- Migração 005: Adicionar campos necessários para consultores
-- Execute este arquivo no SQL Editor do Supabase

-- Adicionar campos na tabela consultores
ALTER TABLE consultores ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;
ALTER TABLE consultores ADD COLUMN IF NOT EXISTS senha VARCHAR(255);
ALTER TABLE consultores ADD COLUMN IF NOT EXISTS cpf VARCHAR(14) UNIQUE;
ALTER TABLE consultores ADD COLUMN IF NOT EXISTS pix VARCHAR(255);
ALTER TABLE consultores ADD COLUMN IF NOT EXISTS tipo VARCHAR(50) DEFAULT 'consultor';
ALTER TABLE consultores ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;

-- Criar tabela de usuários para autenticação
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  senha VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) DEFAULT 'admin',
  consultor_id INTEGER REFERENCES consultores(id),
  ativo BOOLEAN DEFAULT true,
  ultimo_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Inserir usuário admin padrão
INSERT INTO usuarios (nome, email, senha, tipo, ativo) 
VALUES (
  'Administrador', 
  'admin@crm.com', 
  '$2b$10$8K1p/a9UOGNeMlvV7QT4..ZCdP9.VJK0Hk5QZY3oBz3Ohs/qJlm/G', -- senha: admin123
  'admin', 
  true
) ON CONFLICT (email) DO NOTHING;

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_consultores_email ON consultores(email);
CREATE INDEX IF NOT EXISTS idx_consultores_cpf ON consultores(cpf);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_tipo ON usuarios(tipo);

