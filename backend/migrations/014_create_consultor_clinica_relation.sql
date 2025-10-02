-- Migration 014: Criar tabela de relacionamento entre consultores e clínicas
-- Para rastrear quais consultores freelancers indicaram quais clínicas

CREATE TABLE IF NOT EXISTS consultor_clinica (
  id SERIAL PRIMARY KEY,
  consultor_id INTEGER NOT NULL REFERENCES consultores(id) ON DELETE CASCADE,
  clinica_id INTEGER NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  data_indicacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  comissao_paga BOOLEAN DEFAULT FALSE,
  valor_comissao DECIMAL(10, 2) DEFAULT 0.00,
  observacoes TEXT,
  UNIQUE(consultor_id, clinica_id) -- Evitar duplicatas
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_consultor_clinica_consultor ON consultor_clinica(consultor_id);
CREATE INDEX IF NOT EXISTS idx_consultor_clinica_clinica ON consultor_clinica(clinica_id);
CREATE INDEX IF NOT EXISTS idx_consultor_clinica_data ON consultor_clinica(data_indicacao);

-- Comentário na tabela
COMMENT ON TABLE consultor_clinica IS 'Relacionamento entre consultores freelancers e as clínicas que eles indicaram';

