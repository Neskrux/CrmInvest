# Configuração do Supabase Storage para Materiais de Apoio

## ✅ Sistema Migrado para Supabase Storage

O sistema de materiais de apoio foi migrado do armazenamento local (efêmero no Fly.io) para o **Supabase Storage** (persistente).

### 🏗️ Arquitetura

1. **Frontend**: Interface de upload com filtros e download de materiais
2. **Backend**: API que recebe arquivos e envia para Supabase Storage
3. **Storage**: Supabase Storage com bucket `materiais-apoio`
4. **Banco**: Metadados e referências dos arquivos na tabela `materiais`

### 📁 Estrutura do Storage

```
materiais-apoio/
├── documento_1234567890_123456789.pdf
├── video_1234567890_987654321.mp4
├── documento_1234567890_555555555.docx
└── ...
```

Arquivos são nomeados com o padrão: `{tipo}_{timestamp}_{randomId}.{extensão}`

### 🔧 Configuração no Supabase

#### Passo 1: Criar o Bucket

1. Acesse o painel do Supabase: https://app.supabase.com
2. Selecione seu projeto
3. Vá em **Storage** no menu lateral
4. Clique em **"Create a new bucket"**
5. Configure:
   - **Name**: `materiais-apoio`
   - **Public**: ✅ Sim (para acesso direto aos arquivos)
   - **File size limit**: 200 MB
   - **Allowed MIME types**: Deixe vazio ou configure:
     - Documentos: `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.*`
     - Vídeos: `video/mp4`, `video/quicktime`, `video/*`

#### Passo 2: Configurar Políticas de Acesso

Execute no **SQL Editor** do Supabase:

```sql
-- Política para leitura pública (download)
    CREATE POLICY "Public Access"
    ON storage.objects FOR SELECT
    USING ( bucket_id = 'materiais-apoio' );

    -- Política para upload (apenas autenticados)
    CREATE POLICY "Authenticated can upload"
    ON storage.objects FOR INSERT
    WITH CHECK ( bucket_id = 'materiais-apoio' AND auth.role() = 'authenticated' );

    -- Política para deletar (apenas autenticados)
    CREATE POLICY "Authenticated can delete"
    ON storage.objects FOR DELETE
    USING ( bucket_id = 'materiais-apoio' AND auth.role() = 'authenticated' );
```

**Nota**: Como estamos usando o `supabaseAdmin` (service key) no backend, as políticas acima são mais para documentação. O service key tem acesso total.

### 📊 Tipos de Arquivos Aceitos

#### Documentos:
- PDF (`.pdf`)
- Word (`.doc`, `.docx`)
- PowerPoint (`.ppt`, `.pptx`)
- Excel (`.xls`, `.xlsx`)
- Texto (`.txt`)
- Compactados (`.zip`, `.rar`)

#### Vídeos:
- MP4 (`.mp4`)
- QuickTime (`.mov`)
- AVI (`.avi`)
- MKV (`.mkv`)
- WMV (`.wmv`)
- FLV (`.flv`)
- WebM (`.webm`)

**Tamanho máximo**: 200 MB

### 🔄 API Endpoints

#### GET /api/materiais
- Lista todos os materiais
- Requer autenticação

#### POST /api/materiais
- Cria novo material e faz upload do arquivo
- Requer autenticação de admin
- Upload direto para Supabase Storage

#### GET /api/materiais/:id/download
- Download do arquivo do material
- Busca arquivo do Supabase Storage
- Requer autenticação

#### DELETE /api/materiais/:id
- Exclui material e arquivo
- Remove arquivo do Supabase Storage
- Requer autenticação de admin

### 🚀 Benefícios da Migração

1. **Persistência**: Arquivos não são perdidos em deploys/restarts
2. **Escalabilidade**: Supabase Storage suporta arquivos grandes e muitos usuários
3. **Performance**: CDN global para downloads rápidos
4. **Confiabilidade**: Backup automático e redundância
5. **Economia**: Sem custos adicionais de servidor para armazenamento
6. **Gestão**: Interface visual no painel do Supabase

### 🛠️ Migração de Arquivos Antigos (se houver)

Se existem materiais com arquivos locais antigos:

1. Identificar materiais com `arquivo_url` começando com `/uploads/materiais/`
2. Fazer upload manual desses arquivos para o Supabase Storage
3. Atualizar campo `arquivo_url` no banco com o novo nome do arquivo
4. Remover arquivos locais

### 📝 Logs do Sistema

O sistema gera logs detalhados:

```
🔧 POST /api/materiais recebido
📤 Fazendo upload para Supabase Storage: documento_1234567890_123456789.pdf
✅ Upload realizado com sucesso: documento_1234567890_123456789.pdf
🔧 Material criado com sucesso: 42

🔧 GET /api/materiais/:id/download recebido
📥 Baixando arquivo do Supabase Storage: documento_1234567890_123456789.pdf

🔧 DELETE /api/materiais/:id recebido
🗑️ Deletando arquivo do Supabase Storage: documento_1234567890_123456789.pdf
✅ Arquivo deletado do Supabase Storage com sucesso
```

### ⚠️ Importante

- O bucket `materiais-apoio` deve ser criado **ANTES** de usar o sistema
- Certifique-se de que as variáveis `SUPABASE_URL` e `SUPABASE_SERVICE_KEY` estão configuradas
- Arquivos com mais de 200MB serão rejeitados
- Apenas admins podem fazer upload e deletar materiais
- Todos os usuários autenticados podem visualizar e baixar

### ⚙️ Configurações de Servidor

#### Timeouts e Limites

Para suportar uploads de vídeos grandes (até 200MB), as seguintes configurações foram aplicadas:

**Backend (server.js):**
- Body parser limit: 250MB
- Server timeout: 5 minutos (300.000ms)
- Keep alive timeout: 5min 10s
- Headers timeout: 5min 20s
- Upload timeout para Supabase: 4 minutos

**Fly.io (fly.toml):**
- Memória: 2GB (aumentado de 1GB)
- Health check timeout: 5s (aumentado de 2s)
- Grace period: 10s (aumentado de 5s)
- Concurrency soft limit: 20 requests
- Concurrency hard limit: 25 requests

#### Deploy no Fly.io

Após fazer alterações, faça o deploy:

```bash
cd backend
fly deploy
```

Se precisar aumentar a memória manualmente:
```bash
fly scale memory 2048
```

### 🐛 Troubleshooting

#### Erro 502 (Bad Gateway) ao fazer upload de vídeos

**Causa**: Timeout do servidor ou memória insuficiente

**Soluções**:
1. Verifique se o bucket `materiais-apoio` foi criado no Supabase
2. Confirme que a memória do Fly.io está em 2GB: `fly scale show`
3. Verifique os logs: `fly logs`
4. Reduza o tamanho do vídeo (idealmente < 100MB)
5. Considere comprimir o vídeo antes do upload

#### Upload demora muito

**Normal**: Vídeos grandes podem levar 1-3 minutos para upload
- 50MB: ~30s
- 100MB: ~1min
- 150MB: ~2min
- 200MB: ~3min

#### Erro CORS

**Causa**: Domínio não está na lista de origens permitidas

**Solução**: Adicionar domínio em `server.js` no array `corsOptions.origin`

### 🎯 Status

- ✅ Backend configurado para Supabase Storage
- ✅ Timeouts e limites configurados para vídeos grandes
- ✅ Memória do Fly.io aumentada para 2GB
- ⚠️ **PENDENTE**: Criar bucket `materiais-apoio` no Supabase
- ⚠️ **PENDENTE**: Fazer deploy no Fly.io com novas configurações
- ⚠️ **PENDENTE**: Testar upload de vídeo grande (50-200MB)
