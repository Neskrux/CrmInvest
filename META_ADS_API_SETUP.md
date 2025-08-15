# 🔗 Configuração Meta Ads API

## 📋 **Pré-requisitos**

1. **Conta Meta Business** ativa
2. **Acesso ao Meta Ads Manager**
3. **Permissões de desenvolvedor** na conta

## 🚀 **Passo a Passo de Configuração**

### **1. Criar App no Meta for Developers**

1. Acesse: https://developers.facebook.com/
2. Clique em **"Criar App"**
3. Selecione **"Business"**
4. Preencha as informações do app
5. Anote o **App ID**

### **2. Configurar Permissões**

1. No seu app, vá em **"App Review"**
2. Solicite as seguintes permissões:
   - `ads_management`
   - `ads_read`
   - `business_management`
   - `read_insights`

### **3. Gerar Access Token**

1. Vá em **"Tools"** → **"Graph API Explorer"**
2. Selecione seu app
3. Adicione as permissões necessárias
4. Clique em **"Generate Access Token"**
5. **Copie o token** (será usado como `META_ACCESS_TOKEN`)

### **4. Encontrar Ad Account ID**

1. No **Meta Ads Manager**
2. Vá em **"Settings"** → **"Account Settings"**
3. O **Account ID** aparece no formato: `act_123456789`
4. **Copie o ID** (será usado como `META_AD_ACCOUNT_ID`)

### **5. Configurar Variáveis de Ambiente**

Crie/atualize o arquivo `.env` no backend:

```bash
# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_KEY=your_supabase_service_key_here

# JWT Secret
JWT_SECRET=your_jwt_secret_here

# Meta Ads API Configuration
META_ACCESS_TOKEN=your_meta_access_token_here
META_AD_ACCOUNT_ID=act_your_ad_account_id_here

# Server Configuration
PORT=5000
NODE_ENV=development
```

### **6. Testar Conexão**

1. **Reinicie o backend:**
   ```bash
   cd backend
   npm start
   ```

2. **Acesse a interface:**
   - Login como admin
   - Vá em **"Meta Ads"**
   - Clique na aba **"API Integration"**
   - Clique em **"Testar Conexão"**

## 🔧 **APIs Disponíveis**

### **Teste de Conexão**
```bash
GET /api/meta-ads/test-connection
```

### **Listar Campanhas**
```bash
GET /api/meta-ads/campaigns
```

### **Insights de Campanha**
```bash
GET /api/meta-ads/campaign/:id/insights?dateRange=last_30d
```

### **Sincronizar Campanhas**
```bash
POST /api/meta-ads/sync-campaigns
```

### **Insights Regionais**
```bash
GET /api/meta-ads/regional-insights?campaignId=123&dateRange=last_30d
```

## 📊 **Dados Coletados**

### **Informações de Campanha**
- ID da campanha
- Nome da campanha
- Status (ACTIVE/PAUSED)
- Objetivo
- Data de criação

### **Insights Regionais**
- Cidade
- Estado/Região
- País
- Gasto (spend)
- Impressões
- Cliques
- Leads
- Custo por lead

### **Dados de Lead**
- ID do lead
- Dados do formulário
- Campanha/Adset/Ad
- Data de criação
- Custo

## 🛡️ **Segurança**

### **Token de Acesso**
- ✅ **Access Token** com permissões específicas
- ✅ **Account ID** para limitar acesso
- ✅ **Validação** de permissões no backend

### **Rate Limiting**
- ⚠️ **Meta API** tem limites de requisições
- ⚠️ **Implementar cache** para otimizar
- ⚠️ **Monitorar** uso da API

## 🔄 **Sincronização Automática**

### **Processo de Sincronização**
1. **Buscar campanhas** ativas
2. **Coletar insights** por região
3. **Calcular custo** por lead
4. **Salvar no banco** de dados
5. **Atualizar preços** automaticamente

### **Frequência Recomendada**
- **Diária**: Para campanhas ativas
- **Semanal**: Para análise de performance
- **Mensal**: Para relatórios completos

## 📈 **Monitoramento**

### **Métricas Importantes**
- ✅ **Taxa de sucesso** das requisições
- ✅ **Tempo de resposta** da API
- ✅ **Número de campanhas** sincronizadas
- ✅ **Erros de autenticação**

### **Logs de Debug**
```javascript
// Exemplo de log
console.log('Meta API Response:', {
  campaignId: campaign.id,
  leads: insights.length,
  costPerLead: averageCost
});
```

## 🚨 **Troubleshooting**

### **Erro: "Invalid access token"**
- ✅ Verificar se o token está correto
- ✅ Confirmar se não expirou
- ✅ Verificar permissões do app

### **Erro: "Permission denied"**
- ✅ Verificar permissões do usuário
- ✅ Confirmar acesso à conta de anúncios
- ✅ Verificar se o app foi aprovado

### **Erro: "Rate limit exceeded"**
- ✅ Implementar delay entre requisições
- ✅ Usar cache para dados estáticos
- ✅ Reduzir frequência de sincronização

## 📞 **Suporte**

### **Recursos Úteis**
- 📖 [Meta Marketing API Docs](https://developers.facebook.com/docs/marketing-apis/)
- 📖 [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
- 📖 [App Review Guidelines](https://developers.facebook.com/docs/app-review/)

### **Contato**
- 🆘 **Meta Developer Support**: https://developers.facebook.com/support/
- 🆘 **Community Forum**: https://developers.facebook.com/community/

---

**🎉 Configuração concluída! Agora você tem dados reais do Meta Ads!** 