-- ============================================
-- MIGRATION: Tabela boletos_caixa
-- ============================================
-- Tabela para armazenar boletos criados na API da Caixa
-- Execute este script no Supabase SQL Editor

-- Criar tabela boletos_caixa
CREATE TABLE IF NOT EXISTS boletos_caixa (
  id SERIAL PRIMARY KEY,
  
  -- Relacionamentos
  paciente_id INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  fechamento_id INTEGER REFERENCES fechamentos(id) ON DELETE SET NULL,
  
  -- Dados da Caixa
  id_beneficiario VARCHAR(50) NOT NULL, -- ID do beneficiário na Caixa
  nosso_numero BIGINT UNIQUE, -- Número do boleto na Caixa (único)
  numero_documento VARCHAR(100), -- Número do documento interno
  
  -- Dados do boleto
  codigo_barras VARCHAR(100), -- Código de barras do boleto
  linha_digitavel VARCHAR(100), -- Linha digitável do boleto
  url TEXT, -- URL para visualização do boleto
  qrcode TEXT, -- Código QRCode em texto
  url_qrcode TEXT, -- URL do QRCode
  
  -- Valores e datas
  valor DECIMAL(12, 2) NOT NULL,
  valor_pago DECIMAL(12, 2) DEFAULT 0,
  data_vencimento DATE NOT NULL,
  data_emissao DATE DEFAULT CURRENT_DATE,
  data_hora_pagamento TIMESTAMP WITH TIME ZONE,
  
  -- Status
  situacao VARCHAR(50) DEFAULT 'EM ABERTO', -- EM ABERTO, PAGO, BAIXADO, etc.
  status VARCHAR(50) DEFAULT 'pendente', -- Para uso no frontend: pendente, pago, vencido
  
  -- Metadados
  empresa_id INTEGER NOT NULL, -- Para filtrar por empresa (3 para Caixa)
  parcela_numero INTEGER, -- Número da parcela (se houver parcelamento)
  tentativas_criacao INTEGER DEFAULT 0, -- Contador de tentativas de criação
  erro_criacao TEXT, -- Mensagem de erro caso a criação falhe
  sincronizado_em TIMESTAMP WITH TIME ZONE, -- Última sincronização com API Caixa
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_boletos_caixa_paciente_id ON boletos_caixa(paciente_id);
CREATE INDEX IF NOT EXISTS idx_boletos_caixa_fechamento_id ON boletos_caixa(fechamento_id);
CREATE INDEX IF NOT EXISTS idx_boletos_caixa_nosso_numero ON boletos_caixa(nosso_numero);
CREATE INDEX IF NOT EXISTS idx_boletos_caixa_empresa_id ON boletos_caixa(empresa_id);
CREATE INDEX IF NOT EXISTS idx_boletos_caixa_data_vencimento ON boletos_caixa(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_boletos_caixa_situacao ON boletos_caixa(situacao);
CREATE INDEX IF NOT EXISTS idx_boletos_caixa_status ON boletos_caixa(status);

-- Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_boletos_caixa_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para atualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_boletos_caixa_updated_at ON boletos_caixa;
CREATE TRIGGER trigger_update_boletos_caixa_updated_at
  BEFORE UPDATE ON boletos_caixa
  FOR EACH ROW
  EXECUTE FUNCTION update_boletos_caixa_updated_at();

-- Comentários nas colunas
COMMENT ON TABLE boletos_caixa IS 'Tabela para armazenar boletos criados na API da Caixa';
COMMENT ON COLUMN boletos_caixa.id_beneficiario IS 'ID do beneficiário na Caixa (configurado por empresa)';
COMMENT ON COLUMN boletos_caixa.nosso_numero IS 'Número único do boleto na Caixa';
COMMENT ON COLUMN boletos_caixa.status IS 'Status para uso no frontend: pendente, pago, vencido';
COMMENT ON COLUMN boletos_caixa.situacao IS 'Situação retornada pela API Caixa: EM ABERTO, PAGO, BAIXADO, etc.';

-- Verificar se a tabela foi criada
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'boletos_caixa'
ORDER BY ordinal_position;

