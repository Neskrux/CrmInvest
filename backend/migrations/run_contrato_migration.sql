-- 🚀 MIGRAÇÃO COMPLETA: Campos de Contrato para Fechamentos
-- Execute este script no Supabase SQL Editor

-- 1. Criar tabela de controle de migrações (se não existir)
CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(255) PRIMARY KEY,
  description TEXT,
  executed_at TIMESTAMP DEFAULT NOW()
);

-- 2. Adicionar campos de contrato na tabela fechamentos
ALTER TABLE fechamentos 
ADD COLUMN IF NOT EXISTS contrato_arquivo TEXT;

ALTER TABLE fechamentos 
ADD COLUMN IF NOT EXISTS contrato_nome_original TEXT;

ALTER TABLE fechamentos 
ADD COLUMN IF NOT EXISTS contrato_tamanho INTEGER;

ALTER TABLE fechamentos 
ADD COLUMN IF NOT EXISTS contrato_upload_data TIMESTAMP DEFAULT NOW();

-- 3. Comentários explicativos
COMMENT ON COLUMN fechamentos.contrato_arquivo IS 'Nome do arquivo do contrato armazenado no servidor';
COMMENT ON COLUMN fechamentos.contrato_nome_original IS 'Nome original do arquivo enviado pelo usuário';
COMMENT ON COLUMN fechamentos.contrato_tamanho IS 'Tamanho do arquivo em bytes';
COMMENT ON COLUMN fechamentos.contrato_upload_data IS 'Data e hora do upload do contrato';

-- 4. Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_fechamentos_contrato_arquivo ON fechamentos(contrato_arquivo);

-- 5. Registrar migração
INSERT INTO schema_migrations (version, description) 
VALUES ('013', 'Adicionar campos de contrato para fechamentos')
ON CONFLICT (version) DO NOTHING;

-- 6. Verificar se os campos foram criados
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'fechamentos' 
AND column_name LIKE 'contrato_%'
ORDER BY column_name; 