-- Migração 009: Adicionar consultor responsável aos pacientes
-- Data: 2024-12-02
-- Descrição: Permite direcionar pacientes para consultores específicos

-- Adicionar campo consultor_id na tabela pacientes
ALTER TABLE pacientes 
ADD COLUMN consultor_id INTEGER REFERENCES consultores(id) ON DELETE SET NULL;

-- Comentário explicativo
COMMENT ON COLUMN pacientes.consultor_id IS 'Consultor responsável pelo paciente (direcionamento de campanha)';

-- Índice para melhorar performance das consultas
CREATE INDEX IF NOT EXISTS idx_pacientes_consultor ON pacientes(consultor_id);

-- Visualizar estrutura atualizada
\d pacientes; 