-- ================================================
-- ATUALIZAÇÃO DA TABELA PACIENTES
-- ================================================
-- Execute este código no SQL Editor do Supabase
-- Dashboard > SQL Editor > New Query
-- ================================================

-- Adicionar novos campos à tabela pacientes
ALTER TABLE pacientes
ADD COLUMN IF NOT EXISTS clinica_id INTEGER REFERENCES clinicas(id),
ADD COLUMN IF NOT EXISTS valor_parcela DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS numero_parcelas INTEGER,
ADD COLUMN IF NOT EXISTS vencimento DATE,
ADD COLUMN IF NOT EXISTS valor_tratamento DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS antecipacao_meses INTEGER,
ADD COLUMN IF NOT EXISTS data_operacao DATE,
ADD COLUMN IF NOT EXISTS entregue BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS analise TEXT,
ADD COLUMN IF NOT EXISTS responsavel TEXT,
ADD COLUMN IF NOT EXISTS observacoes_financeiras TEXT,
ADD COLUMN IF NOT EXISTS selfie_doc_url TEXT,
ADD COLUMN IF NOT EXISTS documento_url TEXT,
ADD COLUMN IF NOT EXISTS comprovante_residencia_url TEXT,
ADD COLUMN IF NOT EXISTS contrato_servico_url TEXT,
ADD COLUMN IF NOT EXISTS confirmacao_sacado_url TEXT;

-- Criar bucket para documentos dos pacientes se não existir
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pacientes-documentos',
  'pacientes-documentos', 
  true,
  10485760, -- 10MB
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- Criar políticas para o bucket de documentos dos pacientes
-- Permitir leitura pública
CREATE POLICY "Permitir leitura pública de documentos pacientes" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'pacientes-documentos');

-- Permitir upload via service key
CREATE POLICY "Permitir upload documentos pacientes" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'pacientes-documentos');

-- Permitir update via service key
CREATE POLICY "Permitir update documentos pacientes" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'pacientes-documentos')
WITH CHECK (bucket_id = 'pacientes-documentos');

-- Permitir delete via service key
CREATE POLICY "Permitir delete documentos pacientes" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'pacientes-documentos');

-- ================================================
-- COMENTÁRIOS SOBRE OS NOVOS CAMPOS
-- ================================================
-- clinica_id: ID da clínica associada ao paciente (para filtrar por clínica)
-- valor_parcela: Valor de cada parcela do tratamento
-- numero_parcelas: Quantidade de parcelas
-- vencimento: Data de vencimento da primeira parcela
-- valor_tratamento: Valor total do tratamento
-- antecipacao_meses: Quantos meses de antecipação
-- data_operacao: Data em que a operação foi realizada
-- entregue: Se foi entregue ou não
-- analise: Status da análise
-- responsavel: Responsável pela operação
-- observacoes_financeiras: Observações específicas financeiras
-- selfie_doc_url: URL da selfie com documento
-- documento_url: URL do documento
-- comprovante_residencia_url: URL do comprovante de residência
-- contrato_servico_url: URL do contrato de serviço
-- confirmacao_sacado_url: URL do print de conversa com sacado
-- ================================================
