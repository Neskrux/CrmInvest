-- Adicionar campo tipo_origem na tabela clinicas
ALTER TABLE clinicas ADD COLUMN tipo_origem VARCHAR(20);

-- Adicionar comentário explicativo
COMMENT ON COLUMN clinicas.tipo_origem IS 'Tipo de origem da clínica: aprovada, direta';

-- Atualizar clínicas existentes baseado na lógica atual
-- Clínicas com consultor_id = aprovadas (vieram de novas_clinicas)
UPDATE clinicas SET tipo_origem = 'aprovada' WHERE consultor_id IS NOT NULL;

-- Clínicas sem consultor_id = diretas (criadas diretamente)
UPDATE clinicas SET tipo_origem = 'direta' WHERE consultor_id IS NULL;
