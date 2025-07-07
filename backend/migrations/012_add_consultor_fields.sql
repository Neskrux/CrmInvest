-- Migration: Adicionar campos necessários para cadastro público de consultores
-- Data: 2024

-- Adicionar coluna email se não existe
ALTER TABLE consultores 
ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;

-- Adicionar coluna cpf se não existe
ALTER TABLE consultores 
ADD COLUMN IF NOT EXISTS cpf VARCHAR(14) UNIQUE;

-- Adicionar coluna tipo se não existe
ALTER TABLE consultores 
ADD COLUMN IF NOT EXISTS tipo VARCHAR(50) DEFAULT 'consultor';

-- Adicionar coluna ativo se não existe
ALTER TABLE consultores 
ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;

-- Adicionar coluna senha se não existe
ALTER TABLE consultores 
ADD COLUMN IF NOT EXISTS senha VARCHAR(255);

-- Adicionar comentários explicativos
COMMENT ON COLUMN consultores.email IS 'Email do consultor para login';
COMMENT ON COLUMN consultores.cpf IS 'CPF do consultor (usado para PIX)';
COMMENT ON COLUMN consultores.tipo IS 'Tipo do usuário (consultor, admin)';
COMMENT ON COLUMN consultores.ativo IS 'Se o consultor está ativo no sistema';
COMMENT ON COLUMN consultores.senha IS 'Hash da senha do consultor';

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_consultores_email ON consultores(email);
CREATE INDEX IF NOT EXISTS idx_consultores_cpf ON consultores(cpf);
CREATE INDEX IF NOT EXISTS idx_consultores_ativo ON consultores(ativo);

-- Inserir migração no controle
INSERT INTO schema_migrations (version, description) 
VALUES ('012', 'Adicionar campos para cadastro público de consultores')
ON CONFLICT (version) DO NOTHING; 