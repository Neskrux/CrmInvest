-- 🏥 SCRIPT SIMPLIFICADO para corrigir clínicas em produção
-- Execute este script no Supabase SQL Editor

-- 1. Criar tabela clínicas se não existir
CREATE TABLE IF NOT EXISTS clinicas (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  endereco TEXT,
  bairro TEXT,
  cidade TEXT,
  estado VARCHAR(2),
  nicho TEXT DEFAULT 'Ambos',
  telefone TEXT,
  email TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Adicionar campo STATUS que está faltando (CRÍTICO!)
ALTER TABLE clinicas 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo';

-- 3. Inserir dados de exemplo se a tabela estiver vazia
INSERT INTO clinicas (nome, endereco, cidade, estado, nicho, telefone, email, status)
VALUES 
  ('Clínica Exemplo SP', 'Rua das Flores, 100', 'São Paulo', 'SP', 'Estético', '(11) 9999-0001', 'contato1@clinica.com', 'ativo'),
  ('Clínica Exemplo RJ', 'Rua das Flores, 200', 'Rio de Janeiro', 'RJ', 'Odontológico', '(21) 9999-0002', 'contato2@clinica.com', 'ativo'),
  ('Clínica Exemplo MG', 'Rua das Flores, 300', 'Belo Horizonte', 'MG', 'Ambos', '(31) 9999-0003', 'contato3@clinica.com', 'ativo')
ON CONFLICT DO NOTHING;

-- 4. Verificar resultado
SELECT 
  'Tabela clínicas configurada!' as status,
  COUNT(*) as total_clinicas
FROM clinicas; 