-- Migration: Adicionar campos de endereço na tabela pacientes
-- Data: 2024-12-XX
-- Descrição: Adiciona campos endereco, bairro, numero e cep para suportar endereço completo do paciente

-- Verificar se as colunas já existem antes de adicionar
DO $$ 
BEGIN
    -- Adicionar coluna 'endereco' (rua/logradouro)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pacientes' AND column_name = 'endereco'
    ) THEN
        ALTER TABLE pacientes ADD COLUMN endereco VARCHAR(255);
        RAISE NOTICE 'Coluna "endereco" adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna "endereco" já existe';
    END IF;

    -- Adicionar coluna 'bairro'
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pacientes' AND column_name = 'bairro'
    ) THEN
        ALTER TABLE pacientes ADD COLUMN bairro VARCHAR(100);
        RAISE NOTICE 'Coluna "bairro" adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna "bairro" já existe';
    END IF;

    -- Adicionar coluna 'numero'
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pacientes' AND column_name = 'numero'
    ) THEN
        ALTER TABLE pacientes ADD COLUMN numero VARCHAR(20);
        RAISE NOTICE 'Coluna "numero" adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna "numero" já existe';
    END IF;

    -- Adicionar coluna 'cep'
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pacientes' AND column_name = 'cep'
    ) THEN
        ALTER TABLE pacientes ADD COLUMN cep VARCHAR(8);
        RAISE NOTICE 'Coluna "cep" adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna "cep" já existe';
    END IF;
END $$;

-- Verificar se as colunas foram criadas
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'pacientes' 
AND column_name IN ('endereco', 'bairro', 'numero', 'cep')
ORDER BY column_name;

-- Comentários nas colunas para documentação
COMMENT ON COLUMN pacientes.endereco IS 'Rua ou logradouro do paciente';
COMMENT ON COLUMN pacientes.bairro IS 'Bairro do paciente';
COMMENT ON COLUMN pacientes.numero IS 'Número do endereço do paciente';
COMMENT ON COLUMN pacientes.cep IS 'CEP do paciente (apenas números, sem formatação)';

