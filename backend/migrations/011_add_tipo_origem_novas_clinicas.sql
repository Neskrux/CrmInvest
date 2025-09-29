-- Adicionar coluna tipo_origem na tabela novas_clinicas
ALTER TABLE novas_clinicas 
ADD COLUMN IF NOT EXISTS tipo_origem VARCHAR(50) DEFAULT 'aprovada' 
CHECK (tipo_origem IN ('aprovada', 'criada_direto'));

-- Comentário na coluna
COMMENT ON COLUMN novas_clinicas.tipo_origem IS 'Tipo de origem da clínica: aprovada (indicada por consultor) ou criada_direto (criada por admin)';

-- Atualizar registros existentes para ter o valor padrão
UPDATE novas_clinicas 
SET tipo_origem = 'aprovada' 
WHERE tipo_origem IS NULL;
