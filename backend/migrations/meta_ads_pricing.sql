-- Criar tabela para preços do Meta Ads por região
CREATE TABLE IF NOT EXISTS meta_ads_pricing (
  id SERIAL PRIMARY KEY,
  region TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'BR',
  cost_per_lead DECIMAL(10,2),
  spend DECIMAL(10,2),
  impressions INTEGER,
  clicks INTEGER,
  leads INTEGER,
  date_range TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraint único para evitar duplicatas
  UNIQUE(region, country, date_range)
);

-- Criar tabela para leads do Meta Ads
CREATE TABLE IF NOT EXISTS meta_ads_leads (
  id SERIAL PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  campaign_name TEXT,
  lead_id TEXT UNIQUE,
  created_time TIMESTAMP,
  form_data JSONB,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraint único para evitar duplicatas
  UNIQUE(lead_id)
);

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_meta_ads_pricing_region ON meta_ads_pricing(region);
CREATE INDEX IF NOT EXISTS idx_meta_ads_pricing_country ON meta_ads_pricing(country); 
CREATE INDEX IF NOT EXISTS idx_meta_ads_pricing_date ON meta_ads_pricing(date_range);
CREATE INDEX IF NOT EXISTS idx_meta_ads_leads_campaign ON meta_ads_leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_meta_ads_leads_processed ON meta_ads_leads(processed);

-- Habilitar RLS (Row Level Security) se necessário
ALTER TABLE meta_ads_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_ads_leads ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso (permitir tudo por enquanto)
CREATE POLICY IF NOT EXISTS "Enable all access for meta_ads_pricing" ON meta_ads_pricing
  FOR ALL USING (true);

CREATE POLICY IF NOT EXISTS "Enable all access for meta_ads_leads" ON meta_ads_leads
  FOR ALL USING (true); 