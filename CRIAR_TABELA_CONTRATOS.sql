-- Criar tabela para contratos dos pacientes da carteira
CREATE TABLE IF NOT EXISTS contratos_carteira (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  solicitacao_carteira_id UUID NOT NULL REFERENCES solicitacoes_carteira(id) ON DELETE CASCADE,
  paciente_cpf TEXT NOT NULL,
  paciente_nome TEXT NOT NULL,
  
  -- Arquivo do contrato
  arquivo_url TEXT,
  arquivo_nome TEXT,
  
  -- Status do contrato
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'reprovado')),
  
  -- Devolutiva do admin
  motivo_reprovacao TEXT,
  reprovado_por INTEGER REFERENCES usuarios(id),
  data_reprovacao TIMESTAMP WITH TIME ZONE,
  
  -- Aprovação do admin
  aprovado_por INTEGER REFERENCES usuarios(id),
  data_aprovacao TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_contratos_solicitacao ON contratos_carteira(solicitacao_carteira_id);
CREATE INDEX IF NOT EXISTS idx_contratos_status ON contratos_carteira(status);
CREATE INDEX IF NOT EXISTS idx_contratos_paciente ON contratos_carteira(paciente_cpf);

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_contratos_carteira_updated_at ON contratos_carteira;
CREATE TRIGGER update_contratos_carteira_updated_at
  BEFORE UPDATE ON contratos_carteira
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Adicionar coluna para controlar etapa de aprovação na solicitacoes_carteira
ALTER TABLE solicitacoes_carteira 
ADD COLUMN IF NOT EXISTS etapa_aprovacao TEXT DEFAULT 'aguardando_contratos' 
CHECK (etapa_aprovacao IN ('aguardando_contratos', 'contratos_enviados', 'contratos_aprovados'));

-- Comentários para documentação
COMMENT ON TABLE contratos_carteira IS 'Armazena os contratos individuais de cada paciente da carteira';
COMMENT ON COLUMN solicitacoes_carteira.etapa_aprovacao IS 'Controla em qual etapa a aprovação está: aguardando contratos, contratos enviados ou contratos aprovados';

