# 🎯 Integração Meta Ads + CRM por Cidade

## 📋 **Resumo da Solução**

Esta integração permite conectar os preços por lead do Meta Ads por cidade, oferecendo:

- ✅ **Preços por cidade** configuráveis
- ✅ **Rastreamento de leads** do Meta Ads
- ✅ **Dashboard de custos** por campanha
- ✅ **Relatórios de ROI** por região
- ✅ **Interface administrativa** completa

## 🚀 **Passos para Implementar**

### **1. Execute a Migração no Supabase**

Acesse seu **Supabase** → **SQL Editor** e execute:

```sql
-- Copie e cole todo o conteúdo de: backend/migrations/meta_ads_pricing.sql
```

### **2. Reinicie o Backend**

```bash
cd backend
npm start
```

### **3. Acesse a Interface**

1. **Faça login** como administrador
2. **Clique em "Meta Ads"** no menu lateral
3. **Configure os preços** por cidade

## 📊 **Funcionalidades Implementadas**

### **💰 Gestão de Preços por Cidade**

| Campo | Descrição | Exemplo |
|-------|-----------|---------|
| **Cidade** | Nome da cidade | São Paulo |
| **Estado** | Sigla do estado | SP |
| **Preço por Lead** | Valor em R$ | 45.00 |
| **Campanha ID** | ID da campanha no Meta | 123456789 |
| **Campanha Nome** | Nome da campanha | Campanha SP - Estético |
| **Período** | Data início/fim | 01/01/2024 - 31/12/2024 |
| **Status** | Ativo/Inativo | Ativo |

### **📈 Rastreamento de Leads**

- **Paciente vinculado** ao lead
- **Custo do lead** registrado
- **Cidade/Estado** do lead
- **Campanha/Adset/Ad** identificados
- **Data do lead** para análise temporal

## 🔧 **APIs Disponíveis**

### **Preços por Lead**
```bash
GET    /api/meta-ads/pricing          # Listar preços
POST   /api/meta-ads/pricing          # Criar preço
PUT    /api/meta-ads/pricing/:id      # Atualizar preço
```

### **Leads do Meta Ads**
```bash
GET    /api/meta-ads/leads            # Listar leads
POST   /api/meta-ads/leads            # Registrar lead
```

## 📱 **Interface do Usuário**

### **Aba 1: Preços por Cidade**
- ✅ Lista todos os preços configurados
- ✅ Filtros por cidade, estado e status
- ✅ Adicionar/editar preços
- ✅ Visualização em tabela organizada

### **Aba 2: Leads do Meta Ads**
- ✅ Lista todos os leads registrados
- ✅ Informações do paciente vinculado
- ✅ Custo e campanha do lead
- ✅ Fonte e data do lead

## 🎯 **Casos de Uso**

### **1. Configuração Inicial**
```
1. Acesse Meta Ads como admin
2. Clique em "Adicionar Preço"
3. Configure cidade, estado e preço
4. Adicione ID da campanha (opcional)
5. Salve a configuração
```

### **2. Registro de Lead**
```
1. Lead chega via formulário
2. Sistema identifica cidade/estado
3. Busca preço correspondente
4. Registra lead com custo
5. Vincula ao paciente
```

### **3. Análise de ROI**
```
1. Visualize leads por cidade
2. Compare custos vs fechamentos
3. Identifique cidades mais rentáveis
4. Ajuste preços conforme necessário
```

## 🔗 **Integração com Meta Ads API**

Para integração automática com Meta Ads, você precisará:

### **1. Configurar Meta Marketing API**
```javascript
// Exemplo de integração futura
const metaAdsAPI = {
  accessToken: 'seu_token_aqui',
  adAccountId: 'act_123456789',
  
  async getCampaigns() {
    // Buscar campanhas do Meta
  },
  
  async getLeads(campaignId) {
    // Buscar leads de uma campanha
  }
};
```

### **2. Webhook para Leads**
```javascript
// Endpoint para receber leads do Meta
app.post('/api/meta-ads/webhook', async (req, res) => {
  const { lead_id, campaign_id, cost, city, state } = req.body;
  
  // Registrar lead automaticamente
  await registerMetaLead(lead_id, campaign_id, cost, city, state);
  
  res.json({ success: true });
});
```

## 📊 **Relatórios Disponíveis**

### **1. ROI por Cidade**
- Custo total por cidade
- Fechamentos por cidade
- ROI médio por região

### **2. Performance por Campanha**
- Leads por campanha
- Custo médio por lead
- Taxa de conversão

### **3. Análise Temporal**
- Leads por período
- Variação de custos
- Sazonalidade

## 🛡️ **Segurança**

- ✅ **Apenas admins** podem configurar preços
- ✅ **Autenticação JWT** obrigatória
- ✅ **Validação de dados** completa
- ✅ **Logs de auditoria** implementados

## 🚀 **Próximos Passos**

### **1. Integração Automática**
- [ ] Conectar com Meta Marketing API
- [ ] Webhook para leads automáticos
- [ ] Sincronização de campanhas

### **2. Relatórios Avançados**
- [ ] Dashboard de ROI
- [ ] Gráficos de performance
- [ ] Exportação de dados

### **3. Otimizações**
- [ ] Cache de preços
- [ ] Notificações de leads
- [ ] Integração com WhatsApp

## 📞 **Suporte**

Se precisar de ajuda:

1. **Verifique os logs** do backend
2. **Teste as APIs** com Postman
3. **Confirme as migrações** no Supabase
4. **Verifique permissões** de admin

---

**🎉 Integração implementada com sucesso!** 