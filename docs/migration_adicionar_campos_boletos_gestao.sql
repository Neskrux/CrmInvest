-- Adicionar campos necessários para a tabela boletos_gestao
DO $$
BEGIN
    -- Adicionar campo para indicar se o boleto deve ser gerado automaticamente
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'boletos_gestao' 
                   AND column_name = 'gerar_boleto') THEN
        ALTER TABLE boletos_gestao
        ADD COLUMN gerar_boleto BOOLEAN DEFAULT TRUE;
        
        COMMENT ON COLUMN boletos_gestao.gerar_boleto IS 
        'Indica se o boleto deve ser gerado automaticamente quando chegar a data limite';
    END IF;

    -- Adicionar campo para indicar se o boleto foi gerado
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'boletos_gestao' 
                   AND column_name = 'boleto_gerado') THEN
        ALTER TABLE boletos_gestao
        ADD COLUMN boleto_gerado BOOLEAN DEFAULT FALSE;
        
        COMMENT ON COLUMN boletos_gestao.boleto_gerado IS 
        'Indica se o boleto já foi gerado na API da Caixa';
    END IF;

    -- Adicionar campo para armazenar a data de geração do boleto
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'boletos_gestao' 
                   AND column_name = 'data_geracao_boleto') THEN
        ALTER TABLE boletos_gestao
        ADD COLUMN data_geracao_boleto TIMESTAMP WITH TIME ZONE;
        
        COMMENT ON COLUMN boletos_gestao.data_geracao_boleto IS 
        'Data e hora em que o boleto foi gerado na API da Caixa';
    END IF;

    -- Adicionar campo para armazenar o ID do boleto na Caixa
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'boletos_gestao' 
                   AND column_name = 'boleto_caixa_id') THEN
        ALTER TABLE boletos_gestao
        ADD COLUMN boleto_caixa_id UUID;
        
        COMMENT ON COLUMN boletos_gestao.boleto_caixa_id IS 
        'ID do boleto retornado pela API da Caixa';
    END IF;

    -- Adicionar campo para armazenar o número do documento
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'boletos_gestao' 
                   AND column_name = 'numero_documento') THEN
        ALTER TABLE boletos_gestao
        ADD COLUMN numero_documento VARCHAR(20);
        
        COMMENT ON COLUMN boletos_gestao.numero_documento IS 
        'Número do documento do boleto';
    END IF;

    -- Adicionar campo para data de pagamento
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'boletos_gestao' 
                   AND column_name = 'data_pagamento') THEN
        ALTER TABLE boletos_gestao
        ADD COLUMN data_pagamento DATE;
        
        COMMENT ON COLUMN boletos_gestao.data_pagamento IS 
        'Data em que o boleto foi pago';
    END IF;

    -- Adicionar campo para valor pago
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'boletos_gestao' 
                   AND column_name = 'valor_pago') THEN
        ALTER TABLE boletos_gestao
        ADD COLUMN valor_pago NUMERIC(10, 2);
        
        COMMENT ON COLUMN boletos_gestao.valor_pago IS 
        'Valor efetivamente pago (pode incluir juros e multa)';
    END IF;

    -- Adicionar campo para observações
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'boletos_gestao' 
                   AND column_name = 'observacoes') THEN
        ALTER TABLE boletos_gestao
        ADD COLUMN observacoes TEXT;
        
        COMMENT ON COLUMN boletos_gestao.observacoes IS 
        'Observações gerais sobre o boleto';
    END IF;

    -- Adicionar campo atualizado_em se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'boletos_gestao' 
                   AND column_name = 'atualizado_em') THEN
        ALTER TABLE boletos_gestao
        ADD COLUMN atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        
        COMMENT ON COLUMN boletos_gestao.atualizado_em IS 
        'Data da última atualização do registro';
    END IF;

    -- Criar índices para melhorar performance
    IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                   WHERE tablename = 'boletos_gestao' 
                   AND indexname = 'idx_boletos_gestao_status') THEN
        CREATE INDEX idx_boletos_gestao_status ON boletos_gestao(status);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                   WHERE tablename = 'boletos_gestao' 
                   AND indexname = 'idx_boletos_gestao_vencimento') THEN
        CREATE INDEX idx_boletos_gestao_vencimento ON boletos_gestao(data_vencimento);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                   WHERE tablename = 'boletos_gestao' 
                   AND indexname = 'idx_boletos_gestao_paciente') THEN
        CREATE INDEX idx_boletos_gestao_paciente ON boletos_gestao(paciente_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                   WHERE tablename = 'boletos_gestao' 
                   AND indexname = 'idx_boletos_gestao_gerar') THEN
        CREATE INDEX idx_boletos_gestao_gerar 
        ON boletos_gestao(gerar_boleto, boleto_gerado, data_vencimento) 
        WHERE gerar_boleto = TRUE AND boleto_gerado = FALSE;
    END IF;

END $$;

-- Função para atualizar o campo atualizado_em automaticamente
CREATE OR REPLACE FUNCTION update_boletos_gestao_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger 
                   WHERE tgname = 'trg_update_boletos_gestao_updated_at') THEN
        CREATE TRIGGER trg_update_boletos_gestao_updated_at
        BEFORE UPDATE ON boletos_gestao
        FOR EACH ROW
        EXECUTE FUNCTION update_boletos_gestao_updated_at();
    END IF;
END $$;

