# 🚨 RESOLVER PROBLEMA DE UPLOAD DE PDF NO FECHAMENTO

## O Problema
O upload de PDF não está funcionando no fechamento. O erro mostra "Failed to fetch" ao tentar salvar.

## Solução Passo a Passo

### 1. Verificar se os campos existem no banco de dados
Execute no **Supabase SQL Editor**:

```sql
-- Verificar se os campos de contrato existem
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'fechamentos' 
AND column_name LIKE 'contrato_%';
```

Se não aparecer nada, execute:

```sql
-- Adicionar campos de contrato
ALTER TABLE fechamentos 
ADD COLUMN IF NOT EXISTS contrato_arquivo TEXT;

ALTER TABLE fechamentos 
ADD COLUMN IF NOT EXISTS contrato_nome_original TEXT;

ALTER TABLE fechamentos 
ADD COLUMN IF NOT EXISTS contrato_tamanho INTEGER;

ALTER TABLE fechamentos 
ADD COLUMN IF NOT EXISTS contrato_upload_data TIMESTAMP DEFAULT NOW();
```

### 2. Verificar variáveis de ambiente no Vercel

No painel do Vercel (vercel.com):

1. Vá em **Settings** → **Environment Variables**
2. Verifique se estas variáveis existem:
   - `SUPABASE_URL` - Sua URL do Supabase
   - `SUPABASE_KEY` - Sua chave anon do Supabase
   - `JWT_SECRET` - Pode ser qualquer string (ex: crm-secret-key-2024)

### 3. Verificar se a pasta uploads existe

O backend precisa da pasta `backend/uploads` para salvar os PDFs.

Se estiver rodando localmente:
```bash
cd backend
mkdir uploads
```

### 4. Testar localmente primeiro

1. Abra dois terminais
2. Terminal 1: `cd backend && npm start`
3. Terminal 2: `cd frontend && npm start`
4. Acesse http://localhost:3000
5. Tente fazer o upload

### 5. Se funcionar localmente mas não no Vercel

O Vercel não permite salvar arquivos no servidor. Você precisará usar um serviço de armazenamento como:
- Supabase Storage
- AWS S3
- Cloudinary

## Solução Temporária

Para testar rapidamente, você pode tornar o campo de contrato opcional:

1. Edite `frontend/src/components/Fechamentos.js`
2. Procure por:
```javascript
if (!fechamentoEditando && !contratoSelecionado) {
  alert('Por favor, selecione o contrato em PDF!');
  return;
}
```
3. Comente essas linhas para tornar o PDF opcional

## Status Atual

✅ Campos de contrato criados no banco
✅ Frontend configurado corretamente
❌ Backend pode não estar salvando arquivos no Vercel
❌ Variáveis de ambiente podem estar faltando

## Próximos Passos

1. Verifique as variáveis de ambiente no Vercel
2. Teste localmente
3. Se funcionar local mas não no Vercel, implemente Supabase Storage 