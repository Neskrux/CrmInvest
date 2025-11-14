-- ============================================
-- MIGRATION: Adicionar colunas de notificação em boletos_gestao
-- e remover colunas antigas de boletos_caixa
-- ============================================
-- Execute este script no Supabase SQL Editor
-- ============================================

DO $$
BEGIN
    -- Adicionar coluna notificado_3_dias em boletos_gestao
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'boletos_gestao' 
                   AND column_name = 'notificado_3_dias') THEN
        ALTER TABLE boletos_gestao
        ADD COLUMN notificado_3_dias BOOLEAN DEFAULT FALSE;
        
        COMMENT ON COLUMN boletos_gestao.notificado_3_dias IS 
        'Indica se o paciente foi notificado 3 dias antes do vencimento';
    END IF;

    -- Adicionar coluna notificado_no_dia em boletos_gestao
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'boletos_gestao' 
                   AND column_name = 'notificado_no_dia') THEN
        ALTER TABLE boletos_gestao
        ADD COLUMN notificado_no_dia BOOLEAN DEFAULT FALSE;
        
        COMMENT ON COLUMN boletos_gestao.notificado_no_dia IS 
        'Indica se o paciente foi notificado no dia do vencimento';
    END IF;

    -- Adicionar coluna notificado_vencido em boletos_gestao
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'boletos_gestao' 
                   AND column_name = 'notificado_vencido') THEN
        ALTER TABLE boletos_gestao
        ADD COLUMN notificado_vencido BOOLEAN DEFAULT FALSE;
        
        COMMENT ON COLUMN boletos_gestao.notificado_vencido IS 
        'Indica se o paciente foi notificado após o vencimento';
    END IF;

    -- Remover colunas antigas de boletos_caixa (se existirem)
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'boletos_caixa' 
               AND column_name = 'notificado_3_dias') THEN
        ALTER TABLE boletos_caixa
        DROP COLUMN notificado_3_dias;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'boletos_caixa' 
               AND column_name = 'notificado_1_dia') THEN
        ALTER TABLE boletos_caixa
        DROP COLUMN notificado_1_dia;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'boletos_caixa' 
               AND column_name = 'notificado_hoje') THEN
        ALTER TABLE boletos_caixa
        DROP COLUMN notificado_hoje;
    END IF;

    RAISE NOTICE '✅ Migração de notificações concluída com sucesso!';
END $$;

-- Criar índices para melhorar performance das consultas
CREATE INDEX IF NOT EXISTS idx_boletos_gestao_notificacoes 
ON boletos_gestao(data_vencimento, status, notificado_3_dias, notificado_no_dia, notificado_vencido)
WHERE status IN ('pendente', 'vencido');

