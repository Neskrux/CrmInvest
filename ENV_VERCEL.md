# 🔧 Variáveis de Ambiente para Vercel

## 📋 **Variáveis Necessárias**

Configure estas variáveis no painel do Vercel (Settings > Environment Variables):

### **Backend (.env)**
```bash
# Configurações do Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_KEY=sua_service_key_aqui

# JWT Secret
JWT_SECRET=seu_jwt_secret_aqui

# Meta Ads API (opcional)
META_ACCESS_TOKEN=seu_meta_token_aqui
META_AD_ACCOUNT_ID=act_seu_ad_account_id_aqui

# Frontend URL
FRONTEND_URL=https://seu-dominio.vercel.app
```

### **Frontend (.env)**
```bash
# API URL (será /api no Vercel)
REACT_APP_API_URL=/api

# Supabase (se necessário no frontend)
REACT_APP_SUPABASE_URL=https://seu-projeto.supabase.co
REACT_APP_SUPABASE_ANON_KEY=sua_anon_key_aqui
```

## 🎯 **Como Configurar no Vercel**

1. **Acesse** seu projeto no Vercel
2. **Vá em** Settings > Environment Variables
3. **Adicione** cada variável acima
4. **Selecione** todos os environments (Production, Preview, Development)

## ⚠️ **IMPORTANTE**

- **SUPABASE_SERVICE_KEY** deve ser secreta (não exposta no frontend)
- **SUPABASE_ANON_KEY** pode ser pública
- **JWT_SECRET** deve ser uma string longa e aleatória
- **REACT_APP_API_URL** deve ser `/api` para o Vercel 