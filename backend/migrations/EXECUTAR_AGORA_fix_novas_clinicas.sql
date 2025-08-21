-- ========================================
-- FIX URGENTE: Criar tabela novas_clinicas
-- ========================================
-- Execute este arquivo COMPLETO no SQL Editor do Supabase
-- ========================================

-- 1. CRIAR TABELA NOVAS_CLINICAS
CREATE TABLE IF NOT EXISTS novas_clinicas (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT,
  endereco TEXT,
  status TEXT DEFAULT 'tem_interesse',
  observacoes TEXT,
  consultor_id INTEGER REFERENCES consultores(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_novas_clinicas_consultor_id ON novas_clinicas (consultor_id);
CREATE INDEX IF NOT EXISTS idx_novas_clinicas_status ON novas_clinicas (status);
CREATE INDEX IF NOT EXISTS idx_novas_clinicas_created_at ON novas_clinicas (created_at);
CREATE INDEX IF NOT EXISTS idx_novas_clinicas_telefone ON novas_clinicas (telefone);

-- 3. DESABILITAR RLS (MESMO PADRÃO DAS OUTRAS TABELAS)
ALTER TABLE novas_clinicas DISABLE ROW LEVEL SECURITY;

-- 4. ADICIONAR COMENTÁRIOS PARA DOCUMENTAÇÃO
COMMENT ON TABLE novas_clinicas IS 'Tabela para armazenar clínicas encontradas durante as missões diárias dos consultores';
COMMENT ON COLUMN novas_clinicas.nome IS 'Nome da clínica encontrada';
COMMENT ON COLUMN novas_clinicas.telefone IS 'Telefone da clínica (apenas números)';
COMMENT ON COLUMN novas_clinicas.endereco IS 'Endereço completo da clínica';
COMMENT ON COLUMN novas_clinicas.status IS 'Status da clínica (tem_interesse, nao_tem_interesse)';
COMMENT ON COLUMN novas_clinicas.observacoes IS 'Observações sobre a clínica';
COMMENT ON COLUMN novas_clinicas.consultor_id IS 'ID do consultor que pegou a clínica (NULL = disponível)';
COMMENT ON COLUMN novas_clinicas.created_at IS 'Data e hora do cadastro';

-- 5. INSERIR DADOS DE TESTE (OPCIONAL)
INSERT INTO novas_clinicas (nome, telefone, endereco, status, observacoes) VALUES 
('Clínica Sorriso', '11987654321', 'Rua das Flores, 123 - Centro', 'tem_interesse', 'Clínica de odontologia interessada em parcerias'),
('Estética Bella', '11876543210', 'Av. Principal, 456 - Vila Nova', 'tem_interesse', 'Clínica de estética com grande movimento')
ON CONFLICT DO NOTHING;

-- 6. VERIFICAR SE A TABELA FOI CRIADA
SELECT 'Tabela novas_clinicas criada com sucesso!' as status;
SELECT COUNT(*) as total_registros FROM novas_clinicas;

-- 7. RECARREGAR CACHE DO POSTGREST
NOTIFY pgrst, 'reload schema';

-- ========================================
-- VERIFICAÇÃO FINAL
-- ========================================
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'novas_clinicas' 
ORDER BY ordinal_position;

