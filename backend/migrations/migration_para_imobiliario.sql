-- 🏠 MIGRAÇÃO: CRM MÉDICO → CRM IMOBILIÁRIO
-- Execute este script no Supabase SQL Editor para converter sistema existente

-- ATENÇÃO: Este script converte um CRM médico existente para imobiliário
-- Faça backup antes de executar!

-- 1. Renomear tabela pacientes para clientes
DROP TABLE IF EXISTS clientes CASCADE;
ALTER TABLE IF EXISTS pacientes RENAME TO clientes;

-- 2. Renomear tabela clinicas para imobiliarias  
DROP TABLE IF EXISTS imobiliarias CASCADE;
ALTER TABLE IF EXISTS clinicas RENAME TO imobiliarias;

-- 3. Atualizar colunas da tabela clientes
ALTER TABLE clientes 
RENAME COLUMN tipo_tratamento TO tipo_servico;

-- 4. Remover coluna nicho da tabela imobiliarias (específica do médico)
ALTER TABLE imobiliarias 
DROP COLUMN IF EXISTS nicho;

-- 5. Atualizar referências na tabela agendamentos
ALTER TABLE agendamentos 
RENAME COLUMN paciente_id TO cliente_id;

ALTER TABLE agendamentos 
RENAME COLUMN clinica_id TO imobiliaria_id;

-- 6. Atualizar referências na tabela fechamentos
ALTER TABLE fechamentos 
RENAME COLUMN paciente_id TO cliente_id;

ALTER TABLE fechamentos 
RENAME COLUMN clinica_id TO imobiliaria_id;

ALTER TABLE fechamentos 
RENAME COLUMN tipo_tratamento TO tipo_servico;

-- 7. Recriar foreign keys com novos nomes
ALTER TABLE agendamentos 
DROP CONSTRAINT IF EXISTS agendamentos_paciente_id_fkey,
DROP CONSTRAINT IF EXISTS agendamentos_clinica_id_fkey;

ALTER TABLE agendamentos 
ADD CONSTRAINT agendamentos_cliente_id_fkey 
  FOREIGN KEY (cliente_id) REFERENCES clientes(id),
ADD CONSTRAINT agendamentos_imobiliaria_id_fkey 
  FOREIGN KEY (imobiliaria_id) REFERENCES imobiliarias(id);

ALTER TABLE fechamentos 
DROP CONSTRAINT IF EXISTS fechamentos_paciente_id_fkey,
DROP CONSTRAINT IF EXISTS fechamentos_clinica_id_fkey;

ALTER TABLE fechamentos 
ADD CONSTRAINT fechamentos_cliente_id_fkey 
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
ADD CONSTRAINT fechamentos_imobiliaria_id_fkey 
  FOREIGN KEY (imobiliaria_id) REFERENCES imobiliarias(id) ON DELETE SET NULL;

-- 8. Atualizar dados existentes - tipos de serviço imobiliário
UPDATE clientes 
SET tipo_servico = CASE 
  WHEN tipo_servico = 'Estético' THEN 'Compra'
  WHEN tipo_servico = 'Odontológico' THEN 'Venda'
  ELSE 'Locacao'
END
WHERE tipo_servico IS NOT NULL;

UPDATE fechamentos 
SET tipo_servico = CASE 
  WHEN tipo_servico = 'Estético' THEN 'Compra'
  WHEN tipo_servico = 'Odontológico' THEN 'Venda'
  ELSE 'Locacao'
END
WHERE tipo_servico IS NOT NULL;

-- 9. Inserir dados de exemplo para imobiliárias (se não existirem)
INSERT INTO imobiliarias (nome, endereco, cidade, estado, telefone, email, status)
SELECT * FROM (VALUES 
  ('Imobiliária Prime SP', 'Av. Paulista, 1000', 'São Paulo', 'SP', '(11) 3000-1000', 'contato@primesp.com', 'ativo'),
  ('Imobiliária Costa Verde RJ', 'Rua das Laranjeiras, 200', 'Rio de Janeiro', 'RJ', '(21) 3000-2000', 'contato@costaverde.com', 'ativo'),
  ('Imobiliária Minas Casa BH', 'Rua da Bahia, 300', 'Belo Horizonte', 'MG', '(31) 3000-3000', 'contato@minascasa.com', 'ativo')
) AS novos_dados(nome, endereco, cidade, estado, telefone, email, status)
WHERE NOT EXISTS (SELECT 1 FROM imobiliarias LIMIT 1);

-- 10. Atualizar índices
DROP INDEX IF EXISTS idx_pacientes_consultor;
DROP INDEX IF EXISTS idx_pacientes_status;
DROP INDEX IF EXISTS idx_agendamentos_paciente;
DROP INDEX IF EXISTS idx_agendamentos_clinica;
DROP INDEX IF EXISTS idx_fechamentos_paciente;
DROP INDEX IF EXISTS idx_fechamentos_clinica;
DROP INDEX IF EXISTS idx_clinicas_estado;
DROP INDEX IF EXISTS idx_clinicas_cidade;

-- Criar novos índices
CREATE INDEX IF NOT EXISTS idx_clientes_consultor ON clientes(consultor_id);
CREATE INDEX IF NOT EXISTS idx_clientes_status ON clientes(status);
CREATE INDEX IF NOT EXISTS idx_agendamentos_cliente ON agendamentos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_imobiliaria ON agendamentos(imobiliaria_id);
CREATE INDEX IF NOT EXISTS idx_fechamentos_cliente ON fechamentos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_fechamentos_imobiliaria ON fechamentos(imobiliaria_id);
CREATE INDEX IF NOT EXISTS idx_imobiliarias_estado ON imobiliarias(estado);
CREATE INDEX IF NOT EXISTS idx_imobiliarias_cidade ON imobiliarias(cidade);

-- 11. Verificação final
SELECT 
  'Migração concluída!' as status,
  (SELECT COUNT(*) FROM clientes) as total_clientes,
  (SELECT COUNT(*) FROM imobiliarias) as total_imobiliarias,
  (SELECT COUNT(*) FROM agendamentos) as total_agendamentos,
  (SELECT COUNT(*) FROM fechamentos) as total_fechamentos;

-- MIGRAÇÃO COMPLETA! 🎉
-- Seu CRM agora é 100% imobiliário! 