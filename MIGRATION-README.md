# 🚀 Migração Railway → Fly.io

## ✅ **ARQUIVOS CRIADOS AUTOMATICAMENTE:**

### **Backend (Fly.io):**
- `backend/fly.toml` - Configuração do Fly.io
- `backend/Dockerfile` - Container otimizado
- `backend/deploy-fly.ps1` - Script de deploy PowerShell
- `backend/setup-env.ps1` - Script para configurar variáveis

### **Frontend (Atualizado):**
- `frontend/src/config.js` - URLs atualizadas para Fly.io
- `frontend/src/contexts/AuthContext.js` - URLs atualizadas

### **Scripts de Migração:**
- `migrate-to-fly.ps1` - Script completo de migração

## 🎯 **COMO EXECUTAR A MIGRAÇÃO:**

### **1. Executar Script Completo:**
```powershell
# No PowerShell, na raiz do projeto:
.\migrate-to-fly.ps1
```

### **2. Ou Passo a Passo:**

#### **Passo 1: Configurar Variáveis**
```powershell
cd backend
.\setup-env.ps1
```

#### **Passo 2: Deploy**
```powershell
.\deploy-fly.ps1
```

#### **Passo 3: Deploy do Frontend**
```bash
# No Vercel, fazer novo deploy do frontend
# As URLs já foram atualizadas automaticamente
```

## 🔧 **VARIÁVEIS DE AMBIENTE NECESSÁRIAS:**

Copie estas variáveis do dashboard do Railway:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `JWT_SECRET`
- `META_ACCESS_TOKEN`
- `META_AD_ACCOUNT_ID`
- `FRONTEND_URL` (URL do seu frontend no Vercel)

## 🌐 **URLs ATUALIZADAS:**

- **Backend Railway:** `https://crminvest-production.up.railway.app`
- **Backend Fly.io:** `https://crminvest-backend.fly.dev`

## ✅ **CHECKLIST PÓS-MIGRAÇÃO:**

- [ ] Backend funcionando no Fly.io
- [ ] Health check: `https://crminvest-backend.fly.dev/health`
- [ ] Frontend atualizado no Vercel
- [ ] Testar login/logout
- [ ] Testar WhatsApp
- [ ] Testar Meta Ads
- [ ] Testar upload de arquivos
- [ ] Remover aplicação do Railway

## 🆘 **EM CASO DE PROBLEMAS:**

1. **Verificar logs:** `flyctl logs`
2. **Verificar status:** `flyctl status`
3. **Rollback:** Manter Railway ativo até confirmar que tudo funciona
4. **Suporte:** Verificar documentação do Fly.io

## 💰 **VANTAGENS DA MIGRAÇÃO:**

- ✅ Custo otimizado (usando Fly.io que vocês já pagam)
- ✅ Melhor performance no Brasil (região GRU)
- ✅ Auto-scaling automático
- ✅ Monitoramento avançado
- ✅ Uptime superior


