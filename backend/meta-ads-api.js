const axios = require('axios');
require('dotenv').config();

class MetaAdsAPI {
  constructor() {
    this.accessToken = process.env.META_ACCESS_TOKEN;
    this.adAccountId = process.env.META_AD_ACCOUNT_ID;
    this.apiVersion = 'v19.0'; // Versão mais recente
    this.baseURL = `https://graph.facebook.com/${this.apiVersion}`;
  }

  // Verificar se as credenciais estão configuradas
  isConfigured() {
    return this.accessToken && this.adAccountId;
  }

  // Fazer requisição para a API do Meta
  async makeRequest(endpoint, params = {}) {
    try {
      // Verificar se o token está configurado
      if (!this.accessToken || this.accessToken === 'seu_token_de_acesso_aqui') {
        throw new Error('Token de acesso do Meta não configurado. Configure META_ACCESS_TOKEN no arquivo .env');
      }

      const url = `${this.baseURL}${endpoint}`;
      const response = await axios.get(url, {
        params: {
          access_token: this.accessToken,
          ...params
        }
      });
      return response.data;
    } catch (error) {
      if (error.response?.data?.error?.code === 190) {
        console.error('Erro de token inválido do Meta Ads API. Verifique se o token está correto e não expirou.');
        throw new Error('Token de acesso do Meta inválido ou expirado. Gere um novo token no Meta Business Manager.');
      }
      console.error('Erro na requisição Meta API:', error.response?.data || error.message);
      throw error;
    }
  }

  // Buscar campanhas ativas
  async getCampaigns() {
    if (!this.isConfigured()) {
      throw new Error('Meta Ads API não configurada. Configure META_ACCESS_TOKEN e META_AD_ACCOUNT_ID');
    }

    const endpoint = `/${this.adAccountId}/campaigns`;
    const params = {
      fields: 'id,name,status,objective,created_time,start_time,stop_time,spend_cap,spend_cap_amount',
      status: ['ACTIVE', 'PAUSED']
    };

    return await this.makeRequest(endpoint, params);
  }

  // Buscar adsets de uma campanha
  async getAdSets(campaignId) {
    const endpoint = `/${campaignId}/adsets`;
    const params = {
      fields: 'id,name,status,targeting,created_time,start_time,stop_time,daily_budget,lifetime_budget'
    };

    return await this.makeRequest(endpoint, params);
  }

  // Buscar insights de campanha (custos, leads, etc.)
  async getCampaignInsights(campaignId, dateRange = 'last_30d') {
    const endpoint = `/${campaignId}/insights`;
    const params = {
      fields: 'campaign_name,spend,impressions,clicks,actions,action_values,cost_per_action_type',
      time_range: `{'since':'${this.getDateRange(dateRange).since}','until':'${this.getDateRange(dateRange).until}'}`,
      breakdowns: 'country,region'
    };

    return await this.makeRequest(endpoint, params);
  }

  // Buscar leads de uma campanha
  async getLeads(campaignId, dateRange = 'last_30d') {
    const endpoint = `/${campaignId}/leads`;
    const params = {
      fields: 'id,created_time,field_data,ad_id,adset_id',
      time_range: `{'since':'${this.getDateRange(dateRange).since}','until':'${this.getDateRange(dateRange).until}'}`
    };

    return await this.makeRequest(endpoint, params);
  }

  // Buscar dados de targeting por região
  async getRegionalInsights(campaignId, dateRange = 'last_30d') {
    const endpoint = `/${campaignId}/insights`;
    const params = {
      fields: 'spend,impressions,clicks,actions,action_values,cost_per_action_type',
      time_range: `{'since':'${this.getDateRange(dateRange).since}','until':'${this.getDateRange(dateRange).until}'}`,
      breakdowns: 'country,region,city'
    };

    return await this.makeRequest(endpoint, params);
  }

  // Buscar custo por lead por região
  async getCostPerLeadByRegion(campaignId, dateRange = 'last_30d') {
    try {
      const insights = await this.getRegionalInsights(campaignId, dateRange);
      
      return insights.data.map(insight => {
        const region = insight.breakdowns?.region || 'N/A';
        const city = insight.breakdowns?.city || 'N/A';
        const country = insight.breakdowns?.country || 'BR';
        
        // Calcular custo por lead
        const spend = parseFloat(insight.spend) || 0;
        const leads = this.countLeads(insight.actions);
        const costPerLead = leads > 0 ? spend / leads : 0;

        return {
          region,
          city,
          country,
          spend,
          leads,
          costPerLead,
          impressions: insight.impressions,
          clicks: insight.clicks
        };
      });
    } catch (error) {
      console.error('Erro ao buscar custo por lead:', error);
      return [];
    }
  }

  // Contar leads nas actions
  countLeads(actions) {
    if (!actions) return 0;
    
    let leadCount = 0;
    actions.forEach(action => {
      if (action.action_type === 'lead' || action.action_type === 'offsite_conversion') {
        leadCount += parseInt(action.value) || 1;
      }
    });
    
    return leadCount;
  }

  // Gerar range de datas
  getDateRange(range) {
    const now = new Date();
    const since = new Date();
    
    switch (range) {
      case 'last_7d':
        since.setDate(now.getDate() - 7);
        break;
      case 'last_30d':
        since.setDate(now.getDate() - 30);
        break;
      case 'last_90d':
        since.setDate(now.getDate() - 90);
        break;
      case 'this_month':
        since.setDate(1);
        break;
      default:
        since.setDate(now.getDate() - 30);
    }

    return {
      since: since.toISOString().split('T')[0],
      until: now.toISOString().split('T')[0]
    };
  }

  // Sincronizar dados de campanhas
  async syncCampaignData() {
    try {
      const campaigns = await this.getCampaigns();
      const campaignData = [];

      for (const campaign of campaigns.data) {
        const insights = await this.getCostPerLeadByRegion(campaign.id);
        
        campaignData.push({
          campaign_id: campaign.id,
          campaign_name: campaign.name,
          status: campaign.status,
          objective: campaign.objective,
          insights: insights
        });
      }

      return campaignData;
    } catch (error) {
      console.error('Erro ao sincronizar dados de campanhas:', error);
      throw error;
    }
  }

  // Testar conexão com a API
  async testConnection() {
    try {
      const campaigns = await this.getCampaigns();
      return {
        success: true,
        message: 'Conexão com Meta Ads API estabelecida com sucesso!',
        campaignsCount: campaigns.data?.length || 0
      };
    } catch (error) {
      return {
        success: false,
        message: `Erro na conexão: ${error.message}`,
        error: typeof error.response?.data === 'string' 
          ? error.response.data 
          : error.message || 'Erro desconhecido'
      };
    }
  }
}

module.exports = MetaAdsAPI; 