-- 🏥 Script para corrigir a tabela CLÍNICAS em produção
-- Execute este script no Supabase SQL Editor em PRODUÇÃO

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

-- 3. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_clinicas_estado ON clinicas(estado);
CREATE INDEX IF NOT EXISTS idx_clinicas_cidade ON clinicas(cidade);
CREATE INDEX IF NOT EXISTS idx_clinicas_status ON clinicas(status);

-- 4. Verificar se há dados na tabela
SELECT 
  'clinicas' as tabela,
  COUNT(*) as total_registros,
  COUNT(CASE WHEN status = 'ativo' THEN 1 END) as ativos,
  COUNT(CASE WHEN status = 'bloqueado' THEN 1 END) as bloqueados
FROM clinicas;

-- 5. Se não houver dados, inserir dados de exemplo
INSERT INTO clinicas (nome, endereco, cidade, estado, nicho, telefone, email, status)
SELECT 
  'Clínica Exemplo ' || generate_series,
  'Rua das Flores, ' || (generate_series * 100),
  CASE 
    WHEN generate_series % 4 = 1 THEN 'São Paulo'
    WHEN generate_series % 4 = 2 THEN 'Rio de Janeiro'
    WHEN generate_series % 4 = 3 THEN 'Belo Horizonte'
    ELSE 'Curitiba'
  END,
  CASE 
    WHEN generate_series % 4 = 1 THEN 'SP'
    WHEN generate_series % 4 = 2 THEN 'RJ'
    WHEN generate_series % 4 = 3 THEN 'MG'
    ELSE 'PR'
  END,
  CASE 
    WHEN generate_series % 3 = 1 THEN 'Estético'
    WHEN generate_series % 3 = 2 THEN 'Odontológico'
    ELSE 'Ambos'
  END,
  '(11) 9999-' || LPAD(generate_series::text, 4, '0'),
  'contato' || generate_series || '@clinica.com',
  'ativo'
FROM generate_series(1, 3)
WHERE NOT EXISTS (SELECT 1 FROM clinicas LIMIT 1);

-- 6. Configurar políticas de segurança (RLS)
-- Se RLS estiver habilitado, criar policies básicas
-- Primeiro, dropar policies existentes se houver
DROP POLICY IF EXISTS "Permitir leitura de clínicas para usuários autenticados" ON clinicas;
DROP POLICY IF EXISTS "Permitir inserção de clínicas para admins" ON clinicas;
DROP POLICY IF EXISTS "Permitir atualização de clínicas para admins" ON clinicas;

-- Criar policies (sem IF NOT EXISTS)
CREATE POLICY "Permitir leitura de clínicas para usuários autenticados" 
  ON clinicas FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Permitir inserção de clínicas para admins" 
  ON clinicas FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Permitir atualização de clínicas para admins" 
  ON clinicas FOR UPDATE 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- 7. Verificação final
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'clinicas' 
ORDER BY ordinal_position;

-- 8. Mostrar dados para confirmar
SELECT id, nome, cidade, estado, status, created_at 
FROM clinicas 
ORDER BY created_at DESC 
LIMIT 5; 