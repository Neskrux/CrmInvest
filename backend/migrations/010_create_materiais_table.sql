-- Criar tabela de materiais de apoio
CREATE TABLE IF NOT EXISTS materiais (
  id SERIAL PRIMARY KEY,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('documento', 'video')),
  url TEXT,
  arquivo_nome VARCHAR(255),
  arquivo_url TEXT,
  created_by INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_materiais_tipo ON materiais(tipo);
CREATE INDEX IF NOT EXISTS idx_materiais_created_by ON materiais(created_by);
CREATE INDEX IF NOT EXISTS idx_materiais_created_at ON materiais(created_at);

-- Comentários na tabela
COMMENT ON TABLE materiais IS 'Tabela para armazenar materiais de apoio para consultores';
COMMENT ON COLUMN materiais.titulo IS 'Título do material';
COMMENT ON COLUMN materiais.descricao IS 'Descrição opcional do material';
COMMENT ON COLUMN materiais.tipo IS 'Tipo do material: documento, video, apresentacao, manual, template, outro';
COMMENT ON COLUMN materiais.url IS 'URL para vídeos ou links externos';
COMMENT ON COLUMN materiais.arquivo_nome IS 'Nome original do arquivo enviado';
COMMENT ON COLUMN materiais.arquivo_url IS 'Caminho do arquivo no servidor';
COMMENT ON COLUMN materiais.created_by IS 'ID do usuário que criou o material';
