-- Migration: Adicionar campo limite_credito à tabela clinicas (se não existir)
-- Execute este script no Supabase SQL Editor

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'clinicas' 
        AND column_name = 'limite_credito'
    ) THEN
        ALTER TABLE clinicas ADD COLUMN limite_credito DECIMAL(15, 2) DEFAULT 0.00;
        COMMENT ON COLUMN clinicas.limite_credito IS 'Limite de crédito da clínica em reais';
        RAISE NOTICE 'Coluna "limite_credito" adicionada à tabela "clinicas".';
    ELSE
        RAISE NOTICE 'Coluna "limite_credito" já existe na tabela "clinicas".';
    END IF;
END $$;

