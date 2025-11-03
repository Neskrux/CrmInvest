-- Migração: Melhorias na página de Empreendimentos
-- Data: 2025-01-XX

-- ============================================
-- 1. Adicionar novas colunas na tabela empreendimentos
-- ============================================

-- Galeria de imagens (JSON array de URLs do Supabase Storage)
ALTER TABLE empreendimentos 
ADD COLUMN IF NOT EXISTS galeria_imagens TEXT DEFAULT '[]';

-- Diferenciais gerais do empreendimento
ALTER TABLE empreendimentos 
ADD COLUMN IF NOT EXISTS diferenciais_gerais TEXT DEFAULT NULL;

-- Progresso da obra (0-100)
ALTER TABLE empreendimentos 
ADD COLUMN IF NOT EXISTS progresso_obra INTEGER DEFAULT 0 
CHECK (progresso_obra >= 0 AND progresso_obra <= 100);

-- Datas da obra
ALTER TABLE empreendimentos 
ADD COLUMN IF NOT EXISTS data_inicio_obra DATE DEFAULT NULL;
ALTER TABLE empreendimentos 
ADD COLUMN IF NOT EXISTS data_entrega DATE DEFAULT NULL;

-- Valores
ALTER TABLE empreendimentos 
ADD COLUMN IF NOT EXISTS valor_condominio DECIMAL(10, 2) DEFAULT NULL;
ALTER TABLE empreendimentos 
ADD COLUMN IF NOT EXISTS valor_iptu DECIMAL(10, 2) DEFAULT NULL;

-- Data de última atualização
ALTER TABLE empreendimentos 
ADD COLUMN IF NOT EXISTS data_ultima_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- URLs e links
ALTER TABLE empreendimentos 
ADD COLUMN IF NOT EXISTS site_incorporadora TEXT DEFAULT NULL;
ALTER TABLE empreendimentos 
ADD COLUMN IF NOT EXISTS pdf_url TEXT DEFAULT NULL;
ALTER TABLE empreendimentos 
ADD COLUMN IF NOT EXISTS catalogo_url TEXT DEFAULT NULL;
ALTER TABLE empreendimentos 
ADD COLUMN IF NOT EXISTS tour_virtual_url TEXT DEFAULT NULL;
ALTER TABLE empreendimentos 
ADD COLUMN IF NOT EXISTS simulador_caixa_url TEXT DEFAULT NULL;

-- Nota: telefone e email já existem e serão usados como contato_incorporadora

-- ============================================
-- 2. Criar tabela unidades
-- ============================================

CREATE TABLE IF NOT EXISTS unidades (
    id BIGSERIAL PRIMARY KEY,
    empreendimento_id BIGINT NOT NULL,
    numero TEXT NOT NULL,
    torre TEXT DEFAULT NULL,
    tipo_unidade TEXT DEFAULT NULL,
    metragem DECIMAL(10, 2) DEFAULT NULL,
    valor DECIMAL(12, 2) DEFAULT NULL,
    status TEXT DEFAULT 'disponivel' CHECK (status IN ('disponivel', 'reservado', 'vendido')),
    dormitorios INTEGER DEFAULT 0,
    suites INTEGER DEFAULT 0,
    vagas INTEGER DEFAULT 0,
    diferenciais TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (empreendimento_id) REFERENCES empreendimentos(id) ON DELETE CASCADE
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_unidades_empreendimento_id ON unidades(empreendimento_id);
CREATE INDEX IF NOT EXISTS idx_unidades_status ON unidades(status);
CREATE INDEX IF NOT EXISTS idx_unidades_tipo ON unidades(tipo_unidade);
CREATE INDEX IF NOT EXISTS idx_unidades_torre ON unidades(torre);

-- ============================================
-- 3. Criar tabela compartilhamentos_empreendimentos
-- ============================================

CREATE TABLE IF NOT EXISTS compartilhamentos_empreendimentos (
    id BIGSERIAL PRIMARY KEY,
    empreendimento_id BIGINT NOT NULL,
    unidade_id BIGINT DEFAULT NULL,
    token TEXT UNIQUE NOT NULL,
    configuracoes JSONB DEFAULT '{}',
    corretor_id BIGINT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT NULL,
    FOREIGN KEY (empreendimento_id) REFERENCES empreendimentos(id) ON DELETE CASCADE,
    FOREIGN KEY (unidade_id) REFERENCES unidades(id) ON DELETE CASCADE
    -- Nota: corretor_id pode referenciar a tabela de usuários/consultores se necessário
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_compartilhamentos_token ON compartilhamentos_empreendimentos(token);
CREATE INDEX IF NOT EXISTS idx_compartilhamentos_empreendimento_id ON compartilhamentos_empreendimentos(empreendimento_id);
CREATE INDEX IF NOT EXISTS idx_compartilhamentos_corretor_id ON compartilhamentos_empreendimentos(corretor_id);

-- ============================================
-- Comentários nas tabelas
-- ============================================

COMMENT ON COLUMN empreendimentos.galeria_imagens IS 'Array JSON de URLs assinadas do Supabase Storage';
COMMENT ON COLUMN empreendimentos.progresso_obra IS 'Percentual de progresso da obra (0-100)';
COMMENT ON COLUMN unidades.status IS 'Status da unidade: disponivel, reservado ou vendido';
COMMENT ON COLUMN compartilhamentos_empreendimentos.configuracoes IS 'JSON com configurações do que mostrar/esconder no compartilhamento';
COMMENT ON COLUMN compartilhamentos_empreendimentos.token IS 'Token único para acesso ao compartilhamento';

