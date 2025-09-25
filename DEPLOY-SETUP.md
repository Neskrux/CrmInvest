# 🚀 Configuração de Deploy Automático

## 📋 **CONFIGURAÇÃO NECESSÁRIA:**

### **1. 🔑 FLY.IO TOKEN (OBRIGATÓRIO)**

```bash
# Gerar token no Fly.io
flyctl auth token
```

**Adicionar no GitHub:**
1. Acesse: `https://github.com/seu-usuario/CrmInvest/settings/secrets/actions`
2. Clique em **"New repository secret"**
3. Nome: `FLY_API_TOKEN`
4. Valor: token gerado pelo comando acima

### **2. 🔑 VERCEL TOKENS (OPCIONAL - para frontend)**

**Adicionar no GitHub:**
1. Acesse: `https://github.com/seu-usuario/CrmInvest/settings/secrets/actions`
2. Adicione estes secrets:
   - `VERCEL_TOKEN`: Token do Vercel
   - `VERCEL_ORG_ID`: ID da organização
   - `VERCEL_PROJECT_ID`: ID do projeto

## 🎯 **COMO FUNCIONA:**

### **Backend (Fly.io):**
- ✅ **Deploy automático** quando há mudanças em `backend/`
- ✅ **Deploy manual** via workflow_dispatch
- ✅ **Health check** automático após deploy
- ✅ **Logs** disponíveis no GitHub Actions

### **Frontend (Vercel):**
- ✅ **Deploy automático** quando há mudanças em `frontend/`
- ✅ **Build automático** com npm
- ✅ **Deploy** para Vercel

## 🛠️ **COMANDOS MANUAIS:**

### **Deploy Backend:**
```powershell
# Script PowerShell
.\deploy-backend.ps1

# Ou manual
cd backend
flyctl deploy
```

### **Deploy Frontend:**
```bash
# Manual no Vercel
cd frontend
vercel --prod
```

## 📊 **MONITORAMENTO:**

### **Fly.io:**
- **Dashboard**: https://fly.io/apps/crminvest-backend/monitoring
- **Logs**: `flyctl logs -a crminvest-backend`
- **Status**: `flyctl status`

### **GitHub Actions:**
- **Workflows**: https://github.com/seu-usuario/CrmInvest/actions
- **Logs**: Clique em qualquer workflow para ver logs

## ✅ **TESTE DE CONFIGURAÇÃO:**

1. **Faça uma mudança** em `backend/`
2. **Commit e push** para `main`
3. **Verifique** se o deploy automático funcionou
4. **Acesse** https://crminvest-backend.fly.dev/health

## 🚨 **TROUBLESHOOTING:**

### **Se o deploy falhar:**
1. Verifique se o `FLY_API_TOKEN` está correto
2. Verifique se está logado no Fly.io: `flyctl auth whoami`
3. Verifique os logs no GitHub Actions

### **Se o health check falhar:**
1. Aguarde alguns minutos (deploy pode demorar)
2. Verifique logs: `flyctl logs -a crminvest-backend`
3. Teste manualmente: `curl https://crminvest-backend.fly.dev/health`
