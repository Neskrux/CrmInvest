# Deploy na Vercel - CRM Platform

## Estrutura do Projeto

Este projeto está configurado para deploy na Vercel com a seguinte estrutura:

- **Frontend**: React app em `/frontend`
- **Backend**: Node.js API em `/api`
- **Configuração**: Vercel configurado para full-stack

## Opções de Deploy

### Opção 1: Deploy Full-Stack (Recomendado)

1. **Conecte o repositório na Vercel:**
   - Acesse [vercel.com](https://vercel.com)
   - Faça login e clique em "New Project"
   - Importe o repositório `Neskrux/CrmInvest`
   - A Vercel detectará automaticamente a configuração

2. **Configure as variáveis de ambiente:**
   ```
   SUPABASE_URL=sua_url_do_supabase
   SUPABASE_KEY=sua_chave_do_supabase
   JWT_SECRET=seu_jwt_secret
   FRONTEND_URL=https://seu-dominio.vercel.app
   ```

3. **Deploy automático:**
   - A Vercel fará o build automaticamente
   - O frontend será servido em `/`
   - A API será servida em `/api/*`

### Opção 2: Deploy Separado (Para melhor performance)

#### Frontend
1. Crie um novo projeto na Vercel
2. Configure o diretório raiz como `/frontend`
3. Build Command: `npm run build`
4. Output Directory: `build`

#### Backend
1. Crie outro projeto na Vercel
2. Configure o diretório raiz como `/backend`
3. Build Command: `npm install`
4. Output Directory: `.`

## Configurações Importantes

### Variáveis de Ambiente Necessárias

```bash
# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua_chave_anon

# JWT
JWT_SECRET=seu_secret_muito_seguro

# Frontend URL (para CORS)
FRONTEND_URL=https://seu-frontend.vercel.app
```

### Configuração do Supabase

1. Crie um projeto no [Supabase](https://supabase.com)
2. Execute as migrações SQL em `backend/migrations/`
3. Configure as variáveis de ambiente

### Domínios

- **Frontend**: `https://seu-crm.vercel.app`
- **Backend**: `https://seu-crm-api.vercel.app`

## Comandos de Deploy

### Deploy Manual (se necessário)

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy do projeto completo
vercel

# Deploy apenas frontend
vercel --cwd frontend

# Deploy apenas backend
vercel --cwd backend
```

## Estrutura de URLs

- **Frontend**: `https://seu-crm.vercel.app`
- **API**: `https://seu-crm.vercel.app/api/`
- **Uploads**: `https://seu-crm.vercel.app/api/uploads/`

## Troubleshooting

### Problemas Comuns

1. **Erro de CORS:**
   - Verifique se `FRONTEND_URL` está configurado corretamente
   - Adicione o domínio da Vercel nas configurações CORS

2. **Erro de build:**
   - Verifique se todas as dependências estão no `package.json`
   - Confirme se o Node.js version está correto

3. **Erro de API:**
   - Verifique as variáveis de ambiente
   - Confirme se o Supabase está configurado

### Logs

Para ver os logs do deploy:
```bash
vercel logs
```

## Performance

- **Frontend**: Otimizado com React e build production
- **Backend**: Serverless functions com timeout de 30s
- **Uploads**: Limitado a 10MB por arquivo
- **Database**: Supabase com PostgreSQL

## Segurança

- JWT tokens para autenticação
- CORS configurado adequadamente
- Uploads restritos a PDF
- Variáveis de ambiente seguras 