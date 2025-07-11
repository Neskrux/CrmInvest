# Solução para Upload de Contratos em Produção

## Problema Identificado
O upload de contratos não está funcionando em produção devido a:
1. Falta da variável `SUPABASE_SERVICE_KEY` no Vercel
2. Erros de autenticação JWT
3. Configuração incorreta do Supabase Storage

## Solução Passo a Passo

### 1. Configurar Variáveis de Ambiente no Vercel

Adicione as seguintes variáveis no painel do Vercel:

```
SUPABASE_URL=https://yomvfjbapbomcvfnusgm.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvbXZmamJhcGJvbWN2Zm51c2dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTc1MTgxNjEsImV4cCI6MjAzMzA5NDE2MX0.tZmam5hcGJvbwN2Zm51c2dtIiwi
SUPABASE_SERVICE_KEY=[VOCÊ PRECISA PEGAR ESTA CHAVE NO SUPABASE]
JWT_SECRET=DasRGZ78T3A47YF/0coBWUZ2qpsMcBfGRXV...
NODE_ENV=production
```

### 2. Como obter a SUPABASE_SERVICE_KEY

1. Acesse o painel do Supabase: https://app.supabase.com
2. Selecione seu projeto
3. Vá em Settings > API
4. Copie a chave "service_role" (NÃO a "anon" key)
5. Esta é a chave que tem permissões administrativas para fazer upload

### 3. Configurar o Bucket no Supabase

1. No painel do Supabase, vá em Storage
2. Crie um bucket chamado `contratos` se não existir
3. Configure as políticas:

```sql
-- Política para permitir upload via service role
CREATE POLICY "Service role pode fazer upload" ON storage.objects
FOR INSERT TO service_role
USING (bucket_id = 'contratos');

-- Política para permitir download via service role
CREATE POLICY "Service role pode fazer download" ON storage.objects
FOR SELECT TO service_role
USING (bucket_id = 'contratos');
```

### 4. Verificar o Backend

O código do backend já está correto e usa:
- `multer.memoryStorage()` para funcionar no Vercel
- `supabaseAdmin` com a service key para upload
- Autenticação JWT em todas as rotas

### 5. Testar em Produção

1. Faça deploy no Vercel
2. Faça login no sistema
3. Vá em Fechamentos
4. Tente criar um novo fechamento com PDF
5. Verifique se o arquivo aparece no Supabase Storage

## Checklist de Verificação

- [ ] SUPABASE_SERVICE_KEY está configurada no Vercel
- [ ] Bucket 'contratos' existe no Supabase
- [ ] Políticas do bucket estão configuradas
- [ ] Token JWT está sendo enviado nas requisições
- [ ] Upload funciona localmente
- [ ] Deploy foi feito após configurar variáveis

## Debug

Se ainda houver problemas:

1. Verifique os logs no Vercel Functions
2. Verifique o console do navegador
3. Verifique se o token JWT está presente no localStorage
4. Verifique se o bucket 'contratos' está público ou privado (deve ser privado)

## Código de Teste

Para testar se a service key está funcionando, você pode usar este código:

```javascript
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Testar listagem de arquivos
const { data, error } = await supabaseAdmin.storage
  .from('contratos')
  .list();

console.log('Arquivos:', data);
console.log('Erro:', error);
``` 