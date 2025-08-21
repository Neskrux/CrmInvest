-- Migração para adicionar campo observações na tabela novas_clinicas
-- Execute este arquivo no SQL Editor do Supabase se você já tinha a tabela criada anteriormente

-- Adicionar campo observações se não existir
ALTER TABLE novas_clinicas ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- Atualizar valores de status existentes se necessário
UPDATE novas_clinicas 
SET status = 'tem_interesse' 
WHERE status = 'nova' OR status IS NULL;

-- Comentário para a nova coluna
COMMENT ON COLUMN novas_clinicas.observacoes IS 'Observações sobre a clínica';

-- Recarregar cache do PostgREST
NOTIFY pgrst, 'reload schema';

