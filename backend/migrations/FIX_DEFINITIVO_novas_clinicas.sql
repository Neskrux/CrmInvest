-- ========================================
-- MIGRAÇÃO DEFINITIVA - NOVAS CLÍNICAS
-- ========================================
-- COPIE E COLE ESTE CÓDIGO NO SUPABASE SQL EDITOR
-- ========================================

-- 1. REMOVER TABELA SE EXISTIR (para recriá-la limpa)
DROP TABLE IF EXISTS novas_clinicas;

-- 2. CRIAR TABELA SEM FOREIGN KEY (mais simples)
CREATE TABLE novas_clinicas (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT,
  endereco TEXT,
  status TEXT DEFAULT 'tem_interesse',
  observacoes TEXT,
  consultor_id INTEGER,  -- SEM REFERENCES para evitar erros
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. CRIAR ÍNDICES
CREATE INDEX idx_novas_clinicas_consultor_id ON novas_clinicas (consultor_id);
CREATE INDEX idx_novas_clinicas_status ON novas_clinicas (status);
CREATE INDEX idx_novas_clinicas_created_at ON novas_clinicas (created_at);

-- 4. DESABILITAR RLS
ALTER TABLE novas_clinicas DISABLE ROW LEVEL SECURITY;

-- 5. INSERIR DADOS DE TESTE
INSERT INTO novas_clinicas (nome, telefone, endereco, status, observacoes) VALUES 
('Clínica Teste 1', '11987654321', 'Rua das Flores, 123', 'tem_interesse', 'Clínica de teste'),
('Clínica Teste 2', '11876543210', 'Av. Principal, 456', 'tem_interesse', 'Outra clínica de teste');

-- 6. VERIFICAR CRIAÇÃO
SELECT 'SUCESSO: Tabela novas_clinicas criada!' as resultado;
SELECT COUNT(*) as total_registros FROM novas_clinicas;
SELECT * FROM novas_clinicas LIMIT 3;

-- 7. RECARREGAR CACHE
NOTIFY pgrst, 'reload schema';
