-- Criar tabela para gestão manual de boletos
CREATE TABLE IF NOT EXISTS boletos_gestao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fechamento_id INTEGER REFERENCES fechamentos(id) ON DELETE CASCADE,
    paciente_id INTEGER REFERENCES pacientes(id) ON DELETE CASCADE,
    clinica_id INTEGER REFERENCES clinicas(id),
    empresa_id INTEGER REFERENCES empresas(id),
    
    -- Informações do boleto
    numero_parcela INTEGER NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    data_vencimento DATE NOT NULL,
    
    -- Status do boleto
    status VARCHAR(50) DEFAULT 'pendente', -- pendente, pago, vencido, cancelado
    data_pagamento DATE,
    valor_pago DECIMAL(10,2),
    
    -- Controle de geração
    gerar_boleto BOOLEAN DEFAULT FALSE, -- Se deve gerar o boleto na Caixa
    boleto_gerado BOOLEAN DEFAULT FALSE, -- Se já foi gerado
    data_geracao_boleto TIMESTAMP WITH TIME ZONE,
    dias_antes_vencimento INTEGER DEFAULT 20, -- Quantos dias antes do vencimento deve gerar
    
    -- Dados do boleto gerado (se houver)
    boleto_caixa_id UUID REFERENCES boletos_caixa(id),
    nosso_numero VARCHAR(50),
    numero_documento VARCHAR(50),
    linha_digitavel VARCHAR(100),
    codigo_barras VARCHAR(100),
    url_boleto TEXT,
    
    -- Observações e controle
    observacoes TEXT,
    importado_por UUID REFERENCES auth.users(id),
    importado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_por UUID REFERENCES auth.users(id),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para busca e performance
CREATE INDEX IF NOT EXISTS idx_boletos_gestao_fechamento ON boletos_gestao(fechamento_id);
CREATE INDEX IF NOT EXISTS idx_boletos_gestao_paciente ON boletos_gestao(paciente_id);
CREATE INDEX IF NOT EXISTS idx_boletos_gestao_clinica ON boletos_gestao(clinica_id);
CREATE INDEX IF NOT EXISTS idx_boletos_gestao_empresa ON boletos_gestao(empresa_id);
CREATE INDEX IF NOT EXISTS idx_boletos_gestao_status ON boletos_gestao(status);
CREATE INDEX IF NOT EXISTS idx_boletos_gestao_vencimento ON boletos_gestao(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_boletos_gestao_gerar ON boletos_gestao(gerar_boleto, boleto_gerado);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_boletos_gestao_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_update_boletos_gestao_updated_at
BEFORE UPDATE ON boletos_gestao
FOR EACH ROW
EXECUTE FUNCTION update_boletos_gestao_updated_at();

-- Comentários na tabela
COMMENT ON TABLE boletos_gestao IS 'Tabela para gestão manual de boletos com controle de geração automática';
COMMENT ON COLUMN boletos_gestao.status IS 'Status do boleto: pendente, pago, vencido, cancelado';
COMMENT ON COLUMN boletos_gestao.gerar_boleto IS 'Flag para indicar se o boleto deve ser gerado automaticamente na Caixa';
COMMENT ON COLUMN boletos_gestao.boleto_gerado IS 'Flag para indicar se o boleto já foi gerado na Caixa';
COMMENT ON COLUMN boletos_gestao.dias_antes_vencimento IS 'Quantos dias antes do vencimento o boleto deve ser gerado (padrão 20)';

-- View para facilitar consultas
CREATE OR REPLACE VIEW vw_boletos_gestao_completo AS
SELECT 
    bg.*,
    p.nome as paciente_nome,
    p.cpf as paciente_cpf,
    p.telefone as paciente_telefone,
    c.nome as clinica_nome,
    c.cnpj as clinica_cnpj,
    f.valor_fechado,
    f.numero_parcelas as total_parcelas,
    f.data_fechamento,
    -- Calcular se deve gerar o boleto hoje
    CASE 
        WHEN bg.gerar_boleto = TRUE 
             AND bg.boleto_gerado = FALSE 
             AND bg.data_vencimento - INTERVAL '1 day' * bg.dias_antes_vencimento <= CURRENT_DATE
        THEN TRUE
        ELSE FALSE
    END as deve_gerar_hoje,
    -- Dias até o vencimento
    bg.data_vencimento - CURRENT_DATE as dias_ate_vencimento,
    -- Status calculado
    CASE 
        WHEN bg.status = 'pago' THEN 'Pago'
        WHEN bg.status = 'cancelado' THEN 'Cancelado'
        WHEN bg.data_vencimento < CURRENT_DATE AND bg.status != 'pago' THEN 'Vencido'
        ELSE 'Pendente'
    END as status_display
FROM boletos_gestao bg
LEFT JOIN pacientes p ON bg.paciente_id = p.id
LEFT JOIN clinicas c ON bg.clinica_id = c.id
LEFT JOIN fechamentos f ON bg.fechamento_id = f.id;

-- Função para importar boletos de um fechamento
CREATE OR REPLACE FUNCTION importar_boletos_fechamento(
    p_fechamento_id INTEGER,
    p_usuario_id UUID,
    p_gerar_automatico BOOLEAN DEFAULT FALSE,
    p_dias_antes INTEGER DEFAULT 20
)
RETURNS INTEGER AS $$
DECLARE
    v_fechamento RECORD;
    v_contador INTEGER := 0;
    v_data_vencimento DATE;
    i INTEGER;
BEGIN
    -- Buscar dados do fechamento
    SELECT * INTO v_fechamento
    FROM fechamentos
    WHERE id = p_fechamento_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Fechamento não encontrado';
    END IF;
    
    -- Calcular data inicial de vencimento
    v_data_vencimento := COALESCE(v_fechamento.vencimento, CURRENT_DATE + INTERVAL '30 days');
    
    -- Criar boletos para cada parcela
    FOR i IN 1..v_fechamento.numero_parcelas LOOP
        INSERT INTO boletos_gestao (
            fechamento_id,
            paciente_id,
            clinica_id,
            empresa_id,
            numero_parcela,
            valor,
            data_vencimento,
            gerar_boleto,
            dias_antes_vencimento,
            importado_por,
            status
        ) VALUES (
            p_fechamento_id,
            v_fechamento.paciente_id,
            v_fechamento.clinica_id,
            v_fechamento.empresa_id,
            i,
            v_fechamento.valor_parcela,
            v_data_vencimento + (INTERVAL '1 month' * (i - 1)),
            p_gerar_automatico,
            p_dias_antes,
            p_usuario_id,
            'pendente'
        );
        
        v_contador := v_contador + 1;
    END LOOP;
    
    RETURN v_contador;
END;
$$ LANGUAGE plpgsql;

