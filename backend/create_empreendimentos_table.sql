-- Script para criar a tabela empreendimentos
-- Execute este script no seu banco de dados Supabase

CREATE TABLE IF NOT EXISTS empreendimentos (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  localizacao VARCHAR(255),
  endereco VARCHAR(255),
  tipo VARCHAR(100) DEFAULT 'Residencial',
  unidades INTEGER DEFAULT 0,
  status VARCHAR(100) DEFAULT 'Em construção',
  preco DECIMAL(12,2),
  construtora VARCHAR(255),
  entrega VARCHAR(100),
  previsao_entrega VARCHAR(100),
  imagem VARCHAR(500),
  caracteristicas TEXT[], -- Array de strings
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Inserir dados de exemplo baseados nos IDs que você mostrou
INSERT INTO empreendimentos (id, nome, descricao, localizacao, tipo, unidades, status, preco, construtora, entrega, caracteristicas) VALUES
(4, 'Laguna Sky Garden', 'Empreendimento residencial de alto padrão com vista panorâmica', 'São Paulo - SP', 'Residencial', 120, 'Em construção', 350000.00, 'Construtora Laguna', 'Dezembro 2024', ARRAY['Piscina', 'Academia', 'Salão de festas', 'Playground', 'Portaria 24h']),
(5, 'Residencial Girassol', 'Condomínio familiar com muito verde e área de lazer completa', 'Campinas - SP', 'Residencial', 80, 'Lançamento', 290000.00, 'Construtora Girassol', 'Março 2025', ARRAY['Área verde', 'Piscina', 'Quadra', 'Playground', 'Salão de festas']),
(6, 'Sintropia Sky Garden', 'Torres residenciais com conceito sustentável', 'São Paulo - SP', 'Residencial', 200, 'Em construção', 420000.00, 'Construtora Sintropia', 'Junho 2025', ARRAY['Sustentável', 'Piscina', 'Academia', 'Salão de festas', 'Garagem']),
(7, 'Residencial Lotus', 'Apartamentos com design moderno e funcional', 'Santos - SP', 'Residencial', 150, 'Pronto para morar', 320000.00, 'Construtora Lotus', 'Pronto', ARRAY['Moderno', 'Piscina', 'Playground', 'Salão de festas', 'Portaria']),
(8, 'River Sky Garden', 'Empreendimento à beira-mar com vista para o rio', 'Santos - SP', 'Residencial', 100, 'Lançamento', 450000.00, 'Construtora River', 'Dezembro 2025', ARRAY['Vista para o mar', 'Piscina', 'Academia', 'Salão de festas', 'Garagem']),
(9, 'Condomínio Figueira Garcia', 'Condomínio fechado com muito verde e segurança', 'Guarulhos - SP', 'Residencial', 180, 'Em construção', 280000.00, 'Construtora Figueira', 'Setembro 2024', ARRAY['Familiar', 'Piscina', 'Playground', 'Salão de festas', 'Portaria'])
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  localizacao = EXCLUDED.localizacao,
  tipo = EXCLUDED.tipo,
  unidades = EXCLUDED.unidades,
  status = EXCLUDED.status,
  preco = EXCLUDED.preco,
  construtora = EXCLUDED.construtora,
  entrega = EXCLUDED.entrega,
  caracteristicas = EXCLUDED.caracteristicas,
  updated_at = NOW();

-- Verificar se os dados foram inseridos
SELECT * FROM empreendimentos ORDER BY id;
