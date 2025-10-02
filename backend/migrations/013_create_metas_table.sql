-- Criar tabela de metas
CREATE TABLE IF NOT EXISTS metas (
  id SERIAL PRIMARY KEY,
  tipo VARCHAR(50) NOT NULL, -- 'clinicas_aprovadas' ou 'valor_fechamentos'
  mes INTEGER NOT NULL, -- 1-12
  ano INTEGER NOT NULL,
  valor_meta DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tipo, mes, ano)
);

-- Inserir metas padrão para outubro/2025
INSERT INTO metas (tipo, mes, ano, valor_meta) 
VALUES 
  ('pacientes_fechados', 10, 2025, 120),
  ('clinicas_aprovadas', 10, 2025, 30),
  ('valor_fechamentos', 10, 2025, 500000)
ON CONFLICT DO NOTHING;

-- Inserir também para setembro e julho (meses com dados)
INSERT INTO metas (tipo, mes, ano, valor_meta) 
VALUES 
  ('pacientes_fechados', 9, 2025, 120),
  ('clinicas_aprovadas', 9, 2025, 30),
  ('valor_fechamentos', 9, 2025, 500000),
  ('pacientes_fechados', 7, 2025, 120),
  ('clinicas_aprovadas', 7, 2025, 30),
  ('valor_fechamentos', 7, 2025, 500000)
ON CONFLICT DO NOTHING;