-- Atualizar nomes das clínicas nas solicitações existentes
-- Substituir "Clínica Teste" pelo nome real da clínica

UPDATE solicitacoes_carteira 
SET clinica_nome = (
  SELECT nome 
  FROM clinicas 
  WHERE clinicas.id = solicitacoes_carteira.clinica_id
)
WHERE clinica_nome = 'Clínica Teste';

-- Verificar se a atualização funcionou
SELECT 
  sc.id,
  sc.clinica_id,
  sc.clinica_nome,
  c.nome as nome_real_clinica
FROM solicitacoes_carteira sc
LEFT JOIN clinicas c ON c.id = sc.clinica_id
ORDER BY sc.created_at DESC;
