-- Criar tabela para solicitações de carteira existente
CREATE TABLE IF NOT EXISTS solicitacoes_carteira (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id INTEGER NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  clinica_nome TEXT NOT NULL,
  
  -- Dados do cálculo
  pacientes_carteira JSONB NOT NULL,
  calculos JSONB NOT NULL,
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

-- Trigger para atualizar updated_at (usando CREATE OR REPLACE)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remover trigger existente se houver e criar novo
DROP TRIGGER IF EXISTS update_solicitacoes_carteira_updated_at ON solicitacoes_carteira;
CREATE TRIGGER update_solicitacoes_carteira_updated_at
  BEFORE UPDATE ON solicitacoes_carteira
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
