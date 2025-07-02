-- Migração 008: Adicionar campo email para consultores
-- Executar no Supabase SQL Editor

-- Adicionar campo email para consultores
ALTER TABLE consultores ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;

-- Função para remover acentos e normalizar texto
CREATE OR REPLACE FUNCTION remover_acentos(texto TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(
    translate(
      texto,
      'ÀÁÂÃÄÅàáâãäåÒÓÔÕÖØòóôõöøÈÉÊËèéêëÇçÌÍÎÏìíîïÙÚÛÜùúûüÿÑñ ',
      'AAAAAAaaaaaaOOOOOOooooooEEEEeeeeChIIIIiiiiUUUUuuuuyNn'
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Atualizar consultores existentes com emails normalizados
UPDATE consultores 
SET email = remover_acentos(nome) || '@investmoneysa.com.br'
WHERE email IS NULL;

-- Função para gerar email automático
CREATE OR REPLACE FUNCTION gerar_email_consultor()
RETURNS TRIGGER AS $$
BEGIN
  NEW.email = remover_acentos(NEW.nome) || '@investmoneysa.com.br';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para gerar email automaticamente ao inserir/atualizar
DROP TRIGGER IF EXISTS trigger_gerar_email_consultor ON consultores;
CREATE TRIGGER trigger_gerar_email_consultor
  BEFORE INSERT OR UPDATE ON consultores
  FOR EACH ROW
  EXECUTE FUNCTION gerar_email_consultor();

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_consultores_email ON consultores(email);

-- Comentário para documentação
COMMENT ON COLUMN consultores.email IS 'Email gerado automaticamente a partir do nome normalizado (sem acentos/espaços)'; 