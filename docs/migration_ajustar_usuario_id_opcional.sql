-- Tornar usuario_id opcional (permitir NULL) na tabela solicitacoes_cobranca
-- Isso é necessário porque para clínicas, o id no token pode não corresponder a um registro em usuarios

-- Remover a constraint NOT NULL do campo usuario_id
ALTER TABLE solicitacoes_cobranca 
ALTER COLUMN usuario_id DROP NOT NULL;

-- A constraint de foreign key já permite NULL por padrão, então não precisa alterar
