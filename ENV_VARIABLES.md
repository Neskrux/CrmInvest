# Variáveis de Ambiente

Este documento lista todas as variáveis de ambiente necessárias para o projeto.

## Backend (.env)

Crie um arquivo `.env` no diretório `backend/` com as seguintes variáveis:

```bash
# Configurações do Servidor
NODE_ENV=development
PORT=5000

# Configurações do Supabase
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_KEY=your_supabase_service_key_here

# JWT Secret (gerar uma chave segura)
JWT_SECRET=your_jwt_secret_here

# Meta Ads API Configuration
META_ACCESS_TOKEN=your_meta_access_token_here
META_AD_ACCOUNT_ID=act_your_ad_account_id_here

# Frontend URL (para CORS)
FRONTEND_URL=http://localhost:3000
```

## Frontend (.env)

Crie um arquivo `.env` no diretório `frontend/` com as seguintes variáveis:

```bash
# API Configuration
REACT_APP_API_URL=http://localhost:5000/api

# Supabase Configuration (se necessário)
REACT_APP_SUPABASE_URL=your_supabase_url_here
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

## Segurança

⚠️ **IMPORTANTE:**
- Nunca commite arquivos `.env` no Git
- Mantenha suas credenciais seguras
- Use chaves diferentes para desenvolvimento e produção
- O arquivo `.env` já está no `.gitignore` 