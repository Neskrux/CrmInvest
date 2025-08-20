# 🚀 CONFIGURAÇÃO DE VARIÁVEIS DE AMBIENTE NA VERCEL

## 📋 VARIÁVEIS NECESSÁRIAS

### **Backend (Supabase)**
Configure estas variáveis no painel da Vercel:

```
SUPABASE_URL=https://yomvfjbapbomcvfnusgm.supabase.co
SUPABASE_SERVICE_KEY=sua-service-key-aqui
JWT_SECRET=sua-chave-jwt-secreta
NODE_ENV=production
```

### **Frontend (React)**
```
REACT_APP_API_URL=/api
NODE_ENV=production
DISABLE_ESLINT_PLUGIN=true
CI=false
```

## 🔧 COMO CONFIGURAR NA VERCEL

1. **Acesse o painel da Vercel**
2. **Vá em Settings → Environment Variables**
3. **Adicione cada variável:**
   - Name: `SUPABASE_URL`
   - Value: `https://yomvfjbapbomcvfnusgm.supabase.co`
   - Environment: `Production`

4. **Repita para todas as variáveis acima**

## ⚠️ IMPORTANTE

- **SUPABASE_SERVICE_KEY**: Use a Service Role Key (não a anon key)
- **JWT_SECRET**: Gere uma chave aleatória forte
- **REACT_APP_API_URL**: Deve ser `/api` para produção

## 🧪 TESTE

Após configurar, teste:
```
https://crm-invest.vercel.app/api/test
https://crm-invest.vercel.app/captura-lead
```
