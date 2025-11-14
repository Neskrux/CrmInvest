-- Criar tabela de solicitações de cobrança
CREATE TABLE IF NOT EXISTS solicitacoes_cobranca (
  id SERIAL PRIMARY KEY,
  clinica_id INTEGER NOT NULL REFERENCES clinicas(id),
  usuario_id INTEGER REFERENCES usuarios(id),
  status VARCHAR(20) DEFAULT 'pendente' CHECK(status IN ('pendente', 'aprovado', 'rejeitado', 'processado')),
  valor_total DECIMAL(10,2) NOT NULL,
  valor_por_paciente DECIMAL(10,2) NOT NULL,
  quantidade_pacientes INTEGER NOT NULL,
  observacoes TEXT,
  data_aprovacao TIMESTAMP WITH TIME ZONE,
  aprovado_por INTEGER REFERENCES usuarios(id),
  motivo_rejeicao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de itens da solicitação (serviços)
CREATE TABLE IF NOT EXISTS solicitacao_cobranca_itens (
  id SERIAL PRIMARY KEY,
  solicitacao_id INTEGER NOT NULL REFERENCES solicitacoes_cobranca(id) ON DELETE CASCADE,
  tipo_servico VARCHAR(50),
  nome_servico VARCHAR(255) NOT NULL,
  valor_unitario DECIMAL(10,2) NOT NULL,
  quantidade INTEGER DEFAULT 1,
  valor_total DECIMAL(10,2) NOT NULL,
  tipo_cobranca VARCHAR(20) CHECK(tipo_cobranca IN ('unitario', 'fixo', 'percentual')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de pacientes da solicitação
CREATE TABLE IF NOT EXISTS solicitacao_cobranca_pacientes (
  id SERIAL PRIMARY KEY,
  solicitacao_id INTEGER NOT NULL REFERENCES solicitacoes_cobranca(id) ON DELETE CASCADE,
  paciente_id INTEGER NOT NULL REFERENCES pacientes(id),
  processado BOOLEAN DEFAULT FALSE,
  data_processamento TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_solicitacoes_clinica ON solicitacoes_cobranca(clinica_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_status ON solicitacoes_cobranca(status);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_data ON solicitacoes_cobranca(created_at);
CREATE INDEX IF NOT EXISTS idx_solicitacao_itens ON solicitacao_cobranca_itens(solicitacao_id);
CREATE INDEX IF NOT EXISTS idx_solicitacao_pacientes ON solicitacao_cobranca_pacientes(solicitacao_id);

-- Adicionar função para trigger
CREATE OR REPLACE FUNCTION update_solicitacoes_cobranca_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remover trigger se já existir antes de criar
DROP TRIGGER IF EXISTS update_solicitacoes_cobranca_timestamp ON solicitacoes_cobranca;

CREATE TRIGGER update_solicitacoes_cobranca_timestamp
BEFORE UPDATE ON solicitacoes_cobranca
FOR EACH ROW
EXECUTE FUNCTION update_solicitacoes_cobranca_timestamp();