const axios = require('axios');
require('dotenv').config();

class MetaAdsAPI {
  constructor() {
    this.accessToken = process.env.META_ACCESS_TOKEN || '';
    this.adAccountId = process.env.META_AD_ACCOUNT_ID || '';
    this.baseURL = 'https://graph.facebook.com/v19.0';
    this.cache = new Map(); // Cache para evitar muitas chamadas
    this.lastRequest = 0; // Timestamp da última requisição
    this.minDelay = 1000; // Delay mínimo entre requisições (1 segundo)
  }

  // Adicionar delay entre requisições
  async enforceRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;
    
    if (timeSinceLastRequest < this.minDelay) {
      const waitTime = this.minDelay - timeSinceLastRequest;
      console.log(`⏱️ Rate limit: aguardando ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequest = Date.now();
  }

  // Cache com TTL de 5 minutos
  getCachedData(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
      console.log(`🚀 Cache hit para: ${key}`);
      return cached.data;
    }
    return null;
  }

  setCachedData(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  // Verificar se as credenciais estão configuradas
  isConfigured() {
    return this.accessToken && this.adAccountId;
  }

  // Verificar informações do token atual
  async getTokenInfo() {
    try {
      const url = `${this.baseURL}/debug_token`;
      const response = await axios.get(url, {
        params: {
          input_token: this.accessToken,
          access_token: this.accessToken
        }
      });
      
      return response.data.data;
    } catch (error) {
      console.error('Erro ao verificar token:', error.response?.data || error.message);
      throw error;
    }
  }

  // Renovar token para longa duração (60 dias)
  async extendToken() {
    try {
      if (!this.appId || !this.appSecret) {
        throw new Error('APP_ID e APP_SECRET são necessários para renovar o token. Configure META_APP_ID e META_APP_SECRET no .env');
      }

      const url = `${this.baseURL}/oauth/access_token`;
      const response = await axios.get(url, {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: this.appId,
          client_secret: this.appSecret,
          fb_exchange_token: this.accessToken
        }
      });

      const newToken = response.data.access_token;
      
      // Verificar se o novo token é válido
      const tokenInfo = await this.getTokenInfo();
      
      return {
        access_token: newToken,
        expires_in: response.data.expires_in,
        token_type: response.data.token_type,
        expires_at: tokenInfo.expires_at
      };
    } catch (error) {
      console.error('Erro ao renovar token:', error.response?.data || error.message);
      throw error;
    }
  }

  // Verificar se o token está próximo do vencimento (menos de 7 dias)
  async checkTokenExpiration() {
    try {
      const tokenInfo = await this.getTokenInfo();
      
      if (!tokenInfo.expires_at) {
        return {
          isValid: true,
          expires: 'never',
          daysLeft: Infinity,
          needsRenewal: false
        };
      }

      const expiresAt = new Date(tokenInfo.expires_at * 1000);
      const now = new Date();
      const daysLeft = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
      
      return {
        isValid: tokenInfo.is_valid,
        expires: expiresAt.toLocaleDateString('pt-BR'),
        daysLeft: daysLeft,
        needsRenewal: daysLeft <= 7,
        expiresAt: tokenInfo.expires_at
      };
    } catch (error) {
      return {
        isValid: false,
        error: error.message,
        needsRenewal: true
      };
    }
  }

  // Fazer requisição para a API do Meta
  async makeRequest(endpoint, params = {}) {
    // Verificar cache primeiro
    const cacheKey = `${endpoint}:${JSON.stringify(params)}`;
    const cachedData = this.getCachedData(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    // Aplicar rate limiting
    await this.enforceRateLimit();

    try {
      const url = `${this.baseURL}${endpoint}`;
      const requestParams = {
        access_token: this.accessToken,
        ...params
      };

      console.log(`📡 Meta API Request: ${url}`);
      console.log(`📝 Params:`, requestParams);

      const response = await axios.get(url, { 
        params: requestParams,
        timeout: 30000
      });

      // Salvar no cache
      this.setCachedData(cacheKey, response.data);
      
      return response.data;
    } catch (error) {
      console.error('Erro na requisição Meta API:', error.response?.data || error.message);
      
      // Se for rate limit, aguardar mais tempo antes da próxima tentativa
      if (error.response?.data?.error?.code === 17) {
        console.log('🚫 Rate limit detectado. Aumentando delay para próximas requisições...');
        this.minDelay = 5000; // 5 segundos
      }
      
      throw error;
    }
  }

  // Buscar campanhas por status
  async getCampaigns(statusFilter = 'ACTIVE') {
    if (!this.isConfigured()) {
      throw new Error('Meta Ads API não configurada. Configure META_ACCESS_TOKEN e META_AD_ACCOUNT_ID');
    }

    const endpoint = `/${this.adAccountId}/campaigns`;
    
    // Definir quais status buscar baseado no filtro
    let statusArray;
    switch(statusFilter) {
      case 'ACTIVE':
        statusArray = ['ACTIVE'];
        break;
      case 'PAUSED':
        statusArray = ['PAUSED'];
        break;
      case 'ALL':
        statusArray = ['ACTIVE', 'PAUSED'];
        break;
      default:
        statusArray = ['ACTIVE'];
    }
    
    const params = {
      fields: 'id,name,status,objective,created_time,start_time,stop_time,spend_cap,spend_cap_amount,updated_time',
      status: statusArray
    };

    console.log(`📊 Buscando campanhas com status: ${statusArray.join(', ')}`);
    return await this.makeRequest(endpoint, params);
  }

  // Buscar adsets de uma campanha (todos os status)
  async getAdSets(campaignId) {
    // Cache específico para Ad Sets
    const cacheKey = `adsets:${campaignId}`;
    const cachedData = this.getCachedData(cacheKey);
    if (cachedData) {
      console.log(`🚀 Cache: Ad Sets da campanha ${campaignId}`);
      return cachedData;
    }

    const endpoint = `/${campaignId}/adsets`;
    const params = {
      fields: 'id,name,status,targeting,created_time,start_time,stop_time,daily_budget,lifetime_budget,insights.date_preset(last_30d){spend,impressions,clicks,reach,actions,cost_per_action_type,cpm,cpc}'
    };

    const result = await this.makeRequest(endpoint, params);
    
    // Cache específico para Ad Sets (TTL maior - 10 minutos)
    this.cache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
      ttl: 10 * 60 * 1000 // 10 minutos
    });

    return result;
  }

  // Buscar insights de campanha (custos, leads, etc.)
  async getCampaignInsights(campaignId, dateRange = 'last_30d') {
    const endpoint = `/${campaignId}/insights`;
    const params = {
      fields: 'campaign_name,spend,actions,action_values,cost_per_action_type,impressions,clicks,reach,cpm,cpc,ctr,frequency',
      time_range: `{'since':'${this.getDateRange(dateRange).since}','until':'${this.getDateRange(dateRange).until}'}`,
      level: 'campaign'
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
      fields: 'spend,actions,action_values,cost_per_action_type,impressions,clicks,reach,cpm,cpc,ctr',
      time_range: `{'since':'${this.getDateRange(dateRange).since}','until':'${this.getDateRange(dateRange).until}'}`,
      breakdowns: 'country,region' // Removido 'city' - não suportado pela API v23.0+
    };

    return await this.makeRequest(endpoint, params);
  }

  // Buscar custo por lead por região
  async getCostPerLeadByRegion(campaignId, dateRange = 'last_30d') {
    try {
      const insights = await this.getRegionalInsights(campaignId, dateRange);
      
      return insights.data.map(insight => {
        const region = insight.region || 'N/A';
        const country = insight.country || 'BR';
        
        // Calcular custo por lead
        const spend = parseFloat(insight.spend) || 0;
        const leads = this.countLeads(insight.actions);
        const costPerLead = leads > 0 ? spend / leads : 0;

        return {
          region,
          country,
          spend,
          leads,
          costPerLead
        };
      });
    } catch (error) {
      console.error('Erro ao buscar custo por lead:', error);
      return [];
    }
  }

  // Buscar insights detalhados por adset (inclui targeting de cidade)
  async getDetailedInsightsByAdSet(campaignId, dateRange = 'last_30d') {
    try {
      console.log(`🔍 Buscando insights detalhados para campanha ${campaignId}`);
      
      // 1. Buscar todos os adsets da campanha
      const adsets = await this.getAdSets(campaignId);
      console.log(`📊 Encontrados ${adsets.data?.length || 0} adsets`);
      
      const detailedData = [];

      for (const adset of adsets.data) {
        // 2. Buscar insights do adset
        const insightsEndpoint = `/${adset.id}/insights`;
        const insightsParams = {
          fields: 'spend,actions,action_values,cost_per_action_type,adset_name,impressions,clicks,reach,cpm,cpc,ctr',
          time_range: `{'since':'${this.getDateRange(dateRange).since}','until':'${this.getDateRange(dateRange).until}'}`
        };

        try {
          const insights = await this.makeRequest(insightsEndpoint, insightsParams);
          
          // 3. Extrair informações de targeting (cidades)
          const targeting = adset.targeting || {};
          const geoLocations = targeting.geo_locations || {};
          const cities = geoLocations.cities || [];
          const regions = geoLocations.regions || [];
          const countries = geoLocations.countries || [];
          
          console.log(`🎯 Adset ${adset.name} - Targeting:`, {
            cities: cities.length,
            regions: regions.length,
            countries: countries.length
          });

          // 4. Processar cada insight
          if (insights.data && insights.data.length > 0) {
            insights.data.forEach(insight => {
              const spend = parseFloat(insight.spend) || 0;
              const leads = this.countLeads(insight.actions);
              const costPerLead = leads > 0 ? spend / leads : 0;

              // 5. Criar registro para cada cidade no targeting
              if (cities.length > 0) {
                cities.forEach(city => {
                  detailedData.push({
                    adset_id: adset.id,
                    adset_name: adset.name,
                    city: city.name,
                    region: city.region || 'N/A',
                    country: city.country || 'BR',
                    spend,
                    leads,
                    costPerLead
                  });
                });
              } else if (regions.length > 0) {
                // Se não tem cidade específica, usar região
                regions.forEach(region => {
                  detailedData.push({
                    adset_id: adset.id,
                    adset_name: adset.name,
                    city: 'Todo o estado',
                    region: region.name,
                    country: region.country || 'BR',
                    spend,
                    leads,
                    costPerLead
                  });
                });
              } else {
                // Fallback para país inteiro
                detailedData.push({
                  adset_id: adset.id,
                  adset_name: adset.name,
                  city: 'Todo o país',
                  region: 'Brasil',
                  country: 'BR',
                  spend,
                  leads,
                  costPerLead
                });
              }
            });
          }
        } catch (error) {
          console.warn(`Erro ao buscar insights do adset ${adset.id}:`, error.message);
        }
      }

      console.log(`✅ Total de dados detalhados: ${detailedData.length}`);
      return detailedData;
    } catch (error) {
      console.error('Erro ao buscar insights detalhados:', error);
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
      case 'today':
        // Para hoje, usar a data atual
        since.setHours(0, 0, 0, 0); // Início do dia
        const today = new Date();
        today.setHours(23, 59, 59, 999); // Final do dia
        return {
          since: since.toISOString().split('T')[0],
          until: today.toISOString().split('T')[0]
        };
      case 'last_7d':
        since.setDate(now.getDate() - 7);
        break;
      case 'last_30d':
        since.setDate(now.getDate() - 30);
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

  // Sincronizar dados de campanhas com detalhes de cidade
  async syncCampaignData(statusFilter = 'ACTIVE') {
    try {
      const campaigns = await this.getCampaigns(statusFilter);
      const campaignData = [];

      for (const campaign of campaigns.data) {
        console.log(`🚀 Processando campanha: ${campaign.name}`);
        
        // Usar novo método que pega dados por cidade
        let detailedInsights = await this.getDetailedInsightsByAdSet(campaign.id);
        
        // Fallback: se não tem dados detalhados, usar método regional com melhor parsing
        if (!detailedInsights || detailedInsights.length === 0) {
          console.log(`⚠️ Sem dados detalhados, usando método regional para ${campaign.name}`);
          const regionalInsights = await this.getCostPerLeadByRegion(campaign.id);
          
          // Melhorar o parsing dos estados brasileiros
          detailedInsights = regionalInsights.map(insight => ({
            ...insight,
            city: this.parseRegionToCity(insight.region),
            state: this.parseRegionToState(insight.region),
            region: insight.region
          }));
        }
        
        campaignData.push({
          campaign_id: campaign.id,
          campaign_name: campaign.name,
          status: campaign.status,
          objective: campaign.objective,
          insights: detailedInsights
        });
      }

      return campaignData;
    } catch (error) {
      console.error('Erro ao sincronizar dados de campanhas:', error);
      throw error;
    }
  }

  // Converter nomes de região/estado para cidade
  parseRegionToCity(region) {
    if (!region) return 'N/A';
    
    // Mapeamento de estados/regiões para principais cidades
    const stateToCityMap = {
      'São Paulo': 'São Paulo',
      'São Paulo (state)': 'São Paulo', 
      'Rio de Janeiro (state)': 'Rio de Janeiro',
      'Minas Gerais': 'Belo Horizonte',
      'Paraná': 'Curitiba',
      'Rio Grande do Sul': 'Porto Alegre',
      'Santa Catarina': 'Florianópolis',
      'Goiás': 'Goiânia',
      'Mato Grosso': 'Cuiabá',
      'Mato Grosso do Sul': 'Campo Grande',
      'Bahia': 'Salvador',
      'Pernambuco': 'Recife',
      'Ceará': 'Fortaleza',
      'Espírito Santo': 'Vitória',
      'Federal District': 'Brasília',
      'Amazonas': 'Manaus',
      'Maranhão': 'São Luís'
    };
    
    return stateToCityMap[region] || region;
  }
  
  // Extrair cidade do nome do Ad Set
  extractCityFromAdSetName(adSetName) {
    if (!adSetName) return { city: 'N/A', state: 'BR' };
    
    // Padrão 1: "SACADOS | Conversas WhatsApp - Cuiabá"
    let match = adSetName.match(/\|\s*[^-]+\s*-\s*([^-]+)$/);
    if (match) {
      return { city: match[1].trim(), state: this.guessStateFromCity(match[1].trim()) };
    }
    
    // Padrão 2: "NOVO HAMBURGO - RS" ou "Foz do Iguaçu - PR"
    match = adSetName.match(/([A-Za-zÀ-ÿ\s]+(?:do\s|da\s|de\s)?[A-Za-zÀ-ÿ\s]*?)\s*-\s*([A-Z]{2})$/);
    if (match) {
      return { city: match[1].trim(), state: match[2] };
    }
    
    // Padrão 3: Última parte após hífen
    const parts = adSetName.split('-');
    if (parts.length > 1) {
      const lastPart = parts[parts.length - 1].trim();
      return { city: lastPart, state: this.guessStateFromCity(lastPart) };
    }
    
    return { city: adSetName, state: 'BR' };
  }
  
  // Adivinhar estado pela cidade
  guessStateFromCity(city) {
    const cityToState = {
      'São Paulo': 'SP',
      'Curitiba': 'PR',
      'Porto Alegre': 'RS',
      'Belo Horizonte': 'MG',
      'Goiânia': 'GO',
      'Cuiabá': 'MT',
      'Florianópolis': 'SC',
      'Salvador': 'BA',
      'Recife': 'PE',
      'Fortaleza': 'CE',
      'Brasília': 'DF',
      'Manaus': 'AM',
      'Belém': 'PA',
      'Vitória': 'ES',
      'Natal': 'RN',
      'João Pessoa': 'PB',
      'Maceió': 'AL',
      'Aracaju': 'SE',
      'Teresina': 'PI',
      'São Luís': 'MA',
      'Campo Grande': 'MS',
      'Rio Branco': 'AC',
      'Porto Velho': 'RO',
      'Boa Vista': 'RR',
      'Macapá': 'AP',
      'Palmas': 'TO',
      'Rio de Janeiro': 'RJ',
      'Novo Hamburgo': 'RS',
      'Chapecó': 'SC',
      'Foz do Iguaçu': 'PR',
      'Sete Lagoas': 'MG',
      'Atibaia': 'SP'
    };
    
    return cityToState[city] || 'BR';
  }

  // Converter nomes de região para sigla do estado
  parseRegionToState(region) {
    if (!region) return 'BR';
    
    const stateMap = {
      'São Paulo': 'SP',
      'São Paulo (state)': 'SP',
      'Rio de Janeiro (state)': 'RJ', 
      'Minas Gerais': 'MG',
      'Paraná': 'PR',
      'Rio Grande do Sul': 'RS',
      'Santa Catarina': 'SC',
      'Goiás': 'GO',
      'Mato Grosso': 'MT',
      'Mato Grosso do Sul': 'MS',
      'Bahia': 'BA',
      'Pernambuco': 'PE',
      'Ceará': 'CE',
      'Espírito Santo': 'ES',
      'Federal District': 'DF',
      'Amazonas': 'AM',
      'Maranhão': 'MA',
      'Alto Paraná Department': 'PY' // Paraguai
    };
    
    return stateMap[region] || 'BR';
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