# ✅ CHECKLIST PARA RESOLVER UPLOAD EM PRODUÇÃO

## 🔧 1. CONFIGURAR VARIÁVEIS NO VERCEL

No painel do Vercel (vercel.com), vá em Settings > Environment Variables e adicione:

```
SUPABASE_URL=https://yomvfjbapbomcvfnusgm.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvbXZmamJhcGJvbWN2Zm51c2dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTc1MTgxNjEsImV4cCI6MjAzMzA5NDE2MX0.tZmam5hcGJvbwN2Zm51c2dtIiwi
SUPABASE_SERVICE_KEY=[PEGUE ESTA CHAVE NO SUPABASE - CHAVE SERVICE_ROLE]
JWT_SECRET=DasRGZ78T3A47YF/0coBWUZ2qpsMcBfGRXV...
NODE_ENV=production
```

## 🔑 2. PEGAR A CHAVE SERVICE_ROLE NO SUPABASE

1. Acesse: https://app.supabase.com
2. Selecione seu projeto
3. Vá em: Settings > API
4. Copie a chave **service_role** (não a anon!)
5. Cole no Vercel como `SUPABASE_SERVICE_KEY`

## 🗂️ 3. CRIAR BUCKET NO SUPABASE

1. No Supabase, vá em: Storage
2. Clique em "Create bucket"
3. Nome: `contratos`
4. Deixe como **Private** (não público)

## 🔐 4. CONFIGURAR POLÍTICAS DO BUCKET

1. No Supabase, vá em: SQL Editor
2. Clique em "New Query"
3. Cole o código do arquivo `POLITICAS_SUPABASE.sql`
4. Clique em "Run"

## 🚀 5. FAZER DEPLOY

1. Após configurar as variáveis, faça um novo deploy
2. Ou force um redeploy no Vercel

## 🧪 6. TESTAR

1. Acesse sua aplicação em produção
2. Faça login
3. Vá em Fechamentos
4. Tente criar um novo fechamento com PDF
5. Verifique se o arquivo aparece no Supabase Storage

## 🐛 7. DEBUG SE NÃO FUNCIONAR

### Verificar no Console do Navegador:
- Token JWT está sendo enviado?
- Requisição retorna erro 401, 403 ou 500?

### Verificar no Vercel Functions:
- Vá em Vercel > Functions > Logs
- Procure por erros na função API

### Verificar no Supabase:
- Bucket 'contratos' existe?
- Políticas estão ativas?
- Service key está correta?

## 📋 RESUMO RÁPIDO

1. ✅ Configurar `SUPABASE_SERVICE_KEY` no Vercel
2. ✅ Criar bucket `contratos` no Supabase
3. ✅ Executar políticas SQL no Supabase
4. ✅ Fazer deploy no Vercel
5. ✅ Testar upload em produção

## 🆘 SE AINDA NÃO FUNCIONAR

O problema mais comum é a `SUPABASE_SERVICE_KEY` estar incorreta ou não configurada. Certifique-se de:

1. Pegar a chave **service_role** (não anon)
2. Configurar no Vercel exatamente como `SUPABASE_SERVICE_KEY`
3. Fazer um novo deploy após configurar

**A chave service_role é diferente da chave anon e tem permissões administrativas!** 