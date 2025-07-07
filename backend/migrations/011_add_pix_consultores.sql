-- Migration: Adicionar campo PIX para consultores
-- Data: 2024

-- Adicionar coluna pix na tabela consultores
ALTER TABLE consultores 
ADD COLUMN IF NOT EXISTS pix VARCHAR(255);

-- Comentário explicativo
COMMENT ON COLUMN consultores.pix IS 'Chave PIX do consultor para recebimento de comissões'; 