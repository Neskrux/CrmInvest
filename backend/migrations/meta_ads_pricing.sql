-- 🎯 INTEGRAÇÃO META ADS - Preços por Lead por Cidade
-- Execute este script no Supabase SQL Editor

-- 1. Tabela de preços por lead do Meta Ads
CREATE TABLE IF NOT EXISTS meta_ads_pricing (
  id SERIAL PRIMARY KEY,
  cidade TEXT NOT NULL,
  estado VARCHAR(2) NOT NULL,
  preco_por_lead DECIMAL(10,2) NOT NULL,
  campanha_id TEXT,
  campanha_nome TEXT,
  periodo_inicio DATE,
  periodo_fim DATE,
  status TEXT DEFAULT 'ativo',
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Índices para performance
CREATE INDEX IF NOT EXISTS idx_meta_pricing_cidade ON meta_ads_pricing(cidade);
CREATE INDEX IF NOT EXISTS idx_meta_pricing_estado ON meta_ads_pricing(estado);
CREATE INDEX IF NOT EXISTS idx_meta_pricing_status ON meta_ads_pricing(status);
CREATE INDEX IF NOT EXISTS idx_meta_pricing_periodo ON meta_ads_pricing(periodo_inicio, periodo_fim);

-- 3. Dados de exemplo (preços fictícios por cidade)
INSERT INTO meta_ads_pricing (cidade, estado, preco_por_lead, campanha_nome, periodo_inicio, periodo_fim, status) VALUES
  ('São Paulo', 'SP', 45.00, 'Campanha SP - Estético', '2024-01-01', '2024-12-31', 'ativo'),
  ('Rio de Janeiro', 'RJ', 38.00, 'Campanha RJ - Odontológico', '2024-01-01', '2024-12-31', 'ativo'),
  ('Belo Horizonte', 'MG', 35.00, 'Campanha MG - Ambos', '2024-01-01', '2024-12-31', 'ativo'),
  ('Curitiba', 'PR', 42.00, 'Campanha PR - Estético', '2024-01-01', '2024-12-31', 'ativo'),
  ('Porto Alegre', 'RS', 40.00, 'Campanha RS - Odontológico', '2024-01-01', '2024-12-31', 'ativo'),
  ('Salvador', 'BA', 32.00, 'Campanha BA - Ambos', '2024-01-01', '2024-12-31', 'ativo'),
  ('Recife', 'PE', 30.00, 'Campanha PE - Estético', '2024-01-01', '2024-12-31', 'ativo'),
  ('Fortaleza', 'CE', 28.00, 'Campanha CE - Odontológico', '2024-01-01', '2024-12-31', 'ativo')
ON CONFLICT DO NOTHING;

-- 4. Tabela para rastrear leads do Meta Ads
CREATE TABLE IF NOT EXISTS meta_ads_leads (
  id SERIAL PRIMARY KEY,
  paciente_id INTEGER REFERENCES pacientes(id) ON DELETE CASCADE,
  campanha_id TEXT,
  campanha_nome TEXT,
  adset_id TEXT,
  adset_nome TEXT,
  ad_id TEXT,
  ad_nome TEXT,
  custo_lead DECIMAL(10,2),
  data_lead DATE,
  cidade_lead TEXT,
  estado_lead VARCHAR(2),
  fonte_lead TEXT DEFAULT 'meta_ads',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Índices para leads do Meta
CREATE INDEX IF NOT EXISTS idx_meta_leads_paciente ON meta_ads_leads(paciente_id);
CREATE INDEX IF NOT EXISTS idx_meta_leads_campanha ON meta_ads_leads(campanha_id);
CREATE INDEX IF NOT EXISTS idx_meta_leads_data ON meta_ads_leads(data_lead);
CREATE INDEX IF NOT EXISTS idx_meta_leads_cidade ON meta_ads_leads(cidade_lead);

-- 6. Função para atualizar timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 7. Trigger para atualizar updated_at
CREATE TRIGGER update_meta_ads_pricing_updated_at 
    BEFORE UPDATE ON meta_ads_pricing 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 8. Verificar resultado
SELECT 
  'Meta Ads Pricing configurado!' as status,
  COUNT(*) as total_precos,
  COUNT(DISTINCT cidade) as total_cidades
FROM meta_ads_pricing; 