-- Migration: Adicionar campos de contrato para fechamentos
-- Data: 2024

-- Adicionar campos de contrato na tabela fechamentos
ALTER TABLE fechamentos 
ADD COLUMN IF NOT EXISTS contrato_arquivo TEXT;

ALTER TABLE fechamentos 
ADD COLUMN IF NOT EXISTS contrato_nome_original TEXT;

ALTER TABLE fechamentos 
ADD COLUMN IF NOT EXISTS contrato_tamanho INTEGER;

ALTER TABLE fechamentos 
ADD COLUMN IF NOT EXISTS contrato_upload_data TIMESTAMP DEFAULT NOW();

-- Comentários explicativos
COMMENT ON COLUMN fechamentos.contrato_arquivo IS 'Nome do arquivo do contrato armazenado no servidor';
COMMENT ON COLUMN fechamentos.contrato_nome_original IS 'Nome original do arquivo enviado pelo usuário';
COMMENT ON COLUMN fechamentos.contrato_tamanho IS 'Tamanho do arquivo em bytes';
COMMENT ON COLUMN fechamentos.contrato_upload_data IS 'Data e hora do upload do contrato';

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_fechamentos_contrato_arquivo ON fechamentos(contrato_arquivo);

-- Inserir migração no controle
INSERT INTO schema_migrations (version, description) 
VALUES ('013', 'Adicionar campos de contrato para fechamentos')
ON CONFLICT (version) DO NOTHING; 