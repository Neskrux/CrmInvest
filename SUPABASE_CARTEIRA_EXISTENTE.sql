-- Script SQL para adicionar campos da Carteira Existente na tabela pacientes
-- Execute este script no Supabase SQL Editor

-- Adicionar coluna para identificar pacientes da carteira existente
ALTER TABLE pacientes 
ADD COLUMN IF NOT EXISTS carteira_existente BOOLEAN DEFAULT FALSE;

-- Adicionar campos específicos da carteira existente
ALTER TABLE pacientes 
ADD COLUMN IF NOT EXISTS valor_parcela DECIMAL(10,2);

ALTER TABLE pacientes 
ADD COLUMN IF NOT EXISTS numero_parcelas_aberto INTEGER;

ALTER TABLE pacientes 
ADD COLUMN IF NOT EXISTS primeira_vencimento DATE;

ALTER TABLE pacientes 
ADD COLUMN IF NOT EXISTS numero_parcelas_antecipar INTEGER;

ALTER TABLE pacientes 
ADD COLUMN IF NOT EXISTS fator_am DECIMAL(5,2) DEFAULT 0.33;

ALTER TABLE pacientes 
ADD COLUMN IF NOT EXISTS data_aceite DATE;

-- Adicionar campos dos resultados calculados
ALTER TABLE pacientes 
ADD COLUMN IF NOT EXISTS valor_entregue_total DECIMAL(10,2);

ALTER TABLE pacientes 
ADD COLUMN IF NOT EXISTS desagio_total DECIMAL(10,2);

ALTER TABLE pacientes 
ADD COLUMN IF NOT EXISTS valor_face_total DECIMAL(10,2);

ALTER TABLE pacientes 
ADD COLUMN IF NOT EXISTS valor_total_operacao DECIMAL(10,2);

ALTER TABLE pacientes 
ADD COLUMN IF NOT EXISTS valor_colateral DECIMAL(10,2);

ALTER TABLE pacientes 
ADD COLUMN IF NOT EXISTS percentual_final DECIMAL(5,2);

-- Adicionar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_pacientes_carteira_existente 
ON pacientes(carteira_existente);

CREATE INDEX IF NOT EXISTS idx_pacientes_clinica_carteira 
ON pacientes(clinica_id, carteira_existente);

-- Adicionar comentários para documentação
COMMENT ON COLUMN pacientes.carteira_existente IS 'Indica se o paciente é da carteira existente da clínica';
COMMENT ON COLUMN pacientes.valor_parcela IS 'Valor da parcela do paciente da carteira existente';
COMMENT ON COLUMN pacientes.numero_parcelas_aberto IS 'Número de parcelas em aberto do paciente';
COMMENT ON COLUMN pacientes.primeira_vencimento IS 'Data da primeira parcela a ser antecipada';
COMMENT ON COLUMN pacientes.numero_parcelas_antecipar IS 'Número de parcelas que serão antecipadas';
COMMENT ON COLUMN pacientes.fator_am IS 'Fator de antecipação mensal (percentual)';
COMMENT ON COLUMN pacientes.data_aceite IS 'Data de aceite da operação';
COMMENT ON COLUMN pacientes.valor_entregue_total IS 'Valor total entregue ao paciente (calculado)';
COMMENT ON COLUMN pacientes.desagio_total IS 'Deságio total aplicado (calculado)';
COMMENT ON COLUMN pacientes.valor_face_total IS 'Valor de face total (calculado)';
COMMENT ON COLUMN pacientes.valor_total_operacao IS 'Valor total da operação (calculado)';
COMMENT ON COLUMN pacientes.valor_colateral IS 'Valor do colateral (130% da operação)';
COMMENT ON COLUMN pacientes.percentual_final IS 'Percentual final da operação (calculado)';

-- Verificar se as colunas foram criadas corretamente
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'pacientes' 
AND column_name IN (
  'carteira_existente',
  'valor_parcela',
  'numero_parcelas_aberto',
  'primeira_vencimento',
  'numero_parcelas_antecipar',
  'fator_am',
  'data_aceite',
  'valor_entregue_total',
  'desagio_total',
  'valor_face_total',
  'valor_total_operacao',
  'valor_colateral',
  'percentual_final'
)
ORDER BY column_name;
