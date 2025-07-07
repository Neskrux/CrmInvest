# 🚀 Guia de Deploy na Vercel

## 📋 Pré-requisitos

1. **Conta na Vercel**: Crie em [vercel.com](https://vercel.com)
2. **Supabase configurado**: Projeto criado e tabelas migradas
3. **GitHub/GitLab**: Código versionado

## 🔧 Configurações Necessárias

### 1️⃣ Variáveis de Ambiente na Vercel

No painel da Vercel, configure estas variáveis:

```env
# Supabase (Obrigatório)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-anon-key-here

# JWT Secret (Gere uma chave segura)
JWT_SECRET=sua-chave-jwt-super-secreta-aqui

# Node Environment
NODE_ENV=production

# URLs (Serão preenchidas automaticamente pela Vercel)
FRONTEND_URL=https://your-app.vercel.app
BACKEND_URL=https://your-app.vercel.app/api
```

### 2️⃣ Arquivos de Ambiente Local

Crie os arquivos:

**`.env` (raiz do projeto):**
```env
PORT=5000
NODE_ENV=development
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-anon-key-here
JWT_SECRET=crm-secret-key-development-2024
```

**`frontend/.env`:**
```env
REACT_APP_API_URL=http://localhost:5000/api
```

**Para produção na Vercel, crie `frontend/.env.production`:**
```env
REACT_APP_API_URL=/api
```

## 🚀 Passos do Deploy

### 1️⃣ Preparar o Código

```bash
# 1. Instalar dependências
npm install
cd frontend && npm install
cd ../backend && npm install

# 2. Testar build local
cd ../frontend && npm run build

# 3. Verificar se não há erros
```

### 2️⃣ Configurar Vercel

1. **Conectar Repositório**: No dashboard da Vercel, importe seu repositório
2. **Configurar Build**:
   - **Framework Preset**: Other
   - **Root Directory**: `/` (raiz)
   - **Build Command**: `npm run vercel-build`
   - **Output Directory**: `frontend/build`

### 3️⃣ Configurar Variáveis de Ambiente

No painel da Vercel:
1. Vá em **Settings > Environment Variables**
2. Adicione as variáveis listadas acima
3. Marque todas para **Production**, **Preview** e **Development**

### 4️⃣ Deploy Manual

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login na Vercel
vercel login

# Deploy
vercel --prod
```

## ⚠️ Problemas Comuns e Soluções

### 1. **Erro de CORS**
- ✅ **Solução**: Configurado automaticamente no código

### 2. **API não encontrada**
- ✅ **Solução**: Arquivo `vercel.json` configurado para rotear `/api/*` para o backend

### 3. **Erro de conexão com Supabase**
- ⚠️ **Verificar**: Variáveis `SUPABASE_URL` e `SUPABASE_KEY` estão corretas
- ⚠️ **Verificar**: RLS está desabilitado nas tabelas (como configurado)

### 4. **Upload de arquivos não funciona**
- ⚠️ **Limitação da Vercel**: Funções serverless não suportam upload de arquivos persistente
- 💡 **Solução**: Migrar uploads para Supabase Storage

## 🔄 Migrando Uploads para Supabase Storage

Para uploads funcionarem na Vercel, precisamos usar Supabase Storage:

### 1. Criar Bucket no Supabase

```sql
-- No SQL Editor do Supabase
INSERT INTO storage.buckets (id, name, public)
VALUES ('contratos', 'contratos', true);
```

### 2. Configurar Políticas

```sql
-- Política para upload (apenas usuários autenticados)
CREATE POLICY "Authenticated users can upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'contratos');

-- Política para visualização (público)
CREATE POLICY "Public can view" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'contratos');
```

## 🎯 Checklist Final

- [ ] ✅ Variáveis de ambiente configuradas na Vercel
- [ ] ✅ Supabase funcionando (teste com uma query)
- [ ] ✅ Build do frontend sem erros
- [ ] ✅ CORS configurado
- [ ] ✅ Roteamento API funcionando
- [ ] ⚠️ Migrar uploads para Supabase Storage (se necessário)

## 🔗 Links Úteis

- [Vercel Docs](https://vercel.com/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Supabase Storage](https://supabase.com/docs/guides/storage)

## 📞 Próximos Passos

1. **Deploy inicial**: Seguir os passos acima
2. **Testar funcionamento**: Criar um lead, agendar, fazer fechamento
3. **Migrar uploads**: Se necessário, implementar Supabase Storage
4. **Configurar domínio**: Se desejar um domínio customizado

**🎉 Seu CRM estará pronto para produção!** 