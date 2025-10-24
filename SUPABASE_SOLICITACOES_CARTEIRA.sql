-- Criar tabela para solicitações de carteira existente
CREATE TABLE IF NOT EXISTS solicitacoes_carteira (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id INTEGER NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  clinica_nome TEXT NOT NULL,
  
  -- Dados do cálculo
  pacientes_carteira JSONB NOT NULL, -- Array com todos os pacientes
  calculos JSONB NOT NULL, -- Resultado dos cálculos
  percentual_alvo DECIMAL(5,2) DEFAULT 130,
  
  -- Status da solicitação
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'reprovado', 'em_analise')),
  observacoes_clinica TEXT,
  observacoes_admin TEXT,
  
  -- Dados de aprovação
  aprovado_por INTEGER REFERENCES usuarios(id),
  data_aprovacao TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_solicitacoes_carteira_clinica_id ON solicitacoes_carteira(clinica_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_carteira_status ON solicitacoes_carteira(status);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_carteira_created_at ON solicitacoes_carteira(created_at DESC);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_solicitacoes_carteira_updated_at
  BEFORE UPDATE ON solicitacoes_carteira
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE solicitacoes_carteira IS 'Solicitações de aprovação de carteira existente feitas pelas clínicas';
COMMENT ON COLUMN solicitacoes_carteira.pacientes_carteira IS 'Array JSON com todos os pacientes da carteira (CPF, nome, valor_parcela, etc)';
COMMENT ON COLUMN solicitacoes_carteira.calculos IS 'Resultado dos cálculos (valor_face_total, valor_colateral, percentual_final, etc)';
COMMENT ON COLUMN solicitacoes_carteira.status IS 'Status da solicitação: pendente, aprovado, reprovado, em_analise';
COMMENT ON COLUMN solicitacoes_carteira.percentual_alvo IS 'Percentual alvo usado no cálculo (padrão 130%)';

-- Verificar se a tabela foi criada corretamente
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'solicitacoes_carteira'
ORDER BY column_name;