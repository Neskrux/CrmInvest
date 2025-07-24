-- Primeiro, deletar a tabela se existir para recriar corretamente
DROP TABLE IF EXISTS meta_ads_pricing CASCADE;

-- Criar tabela para preços do Meta Ads por cidade/região
CREATE TABLE meta_ads_pricing (
  id SERIAL PRIMARY KEY,
  region TEXT NOT NULL, -- Campo principal (Cidade - Estado)
  city TEXT, -- Cidade específica  
  state TEXT, -- Estado/Província
  country TEXT NOT NULL DEFAULT 'BR',
  cost_per_lead DECIMAL(10,2),
  spend DECIMAL(10,2),
  leads INTEGER,
  date_range TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraint único para evitar duplicatas
  UNIQUE(region, country, date_range)
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE meta_ads_pricing ENABLE ROW LEVEL SECURITY;

-- Política de acesso (permitir tudo por enquanto)
DROP POLICY IF EXISTS "Enable all access for meta_ads_pricing" ON meta_ads_pricing;
CREATE POLICY "Enable all access for meta_ads_pricing" ON meta_ads_pricing
  FOR ALL USING (true);

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_meta_ads_pricing_region ON meta_ads_pricing(region);
CREATE INDEX IF NOT EXISTS idx_meta_ads_pricing_city ON meta_ads_pricing(city);
CREATE INDEX IF NOT EXISTS idx_meta_ads_pricing_state ON meta_ads_pricing(state);
CREATE INDEX IF NOT EXISTS idx_meta_ads_pricing_country ON meta_ads_pricing(country);
CREATE INDEX IF NOT EXISTS idx_meta_ads_pricing_date ON meta_ads_pricing(date_range); 