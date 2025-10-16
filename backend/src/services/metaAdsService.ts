import axios, { AxiosResponse } from 'axios';

// Interfaces para tipagem da Meta Ads API
export interface MetaCampaign {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED';
  objective: string;
  created_time: string;
  start_time?: string;
  stop_time?: string;
  spend_cap?: number;
  spend_cap_amount?: number;
  updated_time: string;
}

export interface MetaAdSet {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED';
  targeting: {
    geo_locations: {
      cities?: Array<{ key: string; name: string; country: string; region: string }>;
      regions?: Array<{ key: string; name: string; country: string }>;
      countries?: Array<{ key: string; country: string }>;
    };
  };
  created_time: string;
  start_time?: string;
  stop_time?: string;
  daily_budget?: number;
  lifetime_budget?: number;
  insights?: {
    data: Array<{
      spend: string;
      impressions: string;
      clicks: string;
      reach: string;
      actions: Array<{ action_type: string; value: string }>;
      cost_per_action_type: Array<{ action_type: string; value: string }>;
      cpm: string;
      cpc: string;
    }>;
  };
}

export interface MetaInsight {
  campaign_name?: string;
  adset_name?: string;
  spend: string;
  actions: Array<{ action_type: string; value: string }>;
  action_values?: Array<{ action_type: string; value: string }>;
  cost_per_action_type: Array<{ action_type: string; value: string }>;
  impressions: string;
  clicks: string;
  reach: string;
  cpm: string;
  cpc: string;
  ctr?: string;
  frequency?: string;
  country?: string;
  region?: string;
}

export interface MetaLead {
  id: string;
  created_time: string;
  field_data: Array<{ name: string; values: string[] }>;
  ad_id?: string;
  adset_id?: string;
}

export interface MetaTokenInfo {
  app_id: string;
  application: string;
  expires_at: number;
  is_valid: boolean;
  issued_at: number;
  scopes: string[];
  type: string;
  user_id: string;
}

export interface MetaApiResponse<T> {
  data: T[];
  paging?: {
    cursors: {
      before: string;
      after: string;
    };
    next?: string;
    previous?: string;
  };
}

export interface CampaignInsight {
  campaign_id: string;
  campaign_name: string;
  status: string;
  objective: string;
  insights: Array<{
    adset_id: string;
    adset_name: string;
    city: string;
    region: string;
    country: string;
    spend: number;
    leads: number;
    costPerLead: number;
  }>;
}

export interface RegionalInsight {
  region: string;
  country: string;
  spend: number;
  leads: number;
  costPerLead: number;
}

export interface DetailedInsight {
  adset_id: string;
  adset_name: string;
  city: string;
  region: string;
  country: string;
  spend: number;
  leads: number;
  costPerLead: number;
}

export interface TokenExpirationInfo {
  isValid: boolean;
  expires?: string;
  daysLeft?: number;
  needsRenewal: boolean;
  expiresAt?: number;
  error?: string;
}

export interface TokenRenewalResult {
  access_token: string;
  expires_in: number;
  token_type: string;
  expires_at: number;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  campaignsCount?: number;
  error?: string;
}

export class MetaAdsService {
  private accessToken: string;
  private adAccountId: string;
  private appId: string | undefined;
  private appSecret: string | undefined;
  private baseURL: string = 'https://graph.facebook.com/v19.0';
  private cache: Map<string, { data: any; timestamp: number; ttl?: number }> = new Map();
  private lastRequest: number = 0;
  private minDelay: number = 1000; // 1 segundo

  constructor() {
    this.accessToken = process.env['META_ACCESS_TOKEN'] || '';
    this.adAccountId = process.env['META_AD_ACCOUNT_ID'] || '';
    this.appId = process.env['META_APP_ID'] || undefined;
    this.appSecret = process.env['META_APP_SECRET'] || undefined;
    
    if (!this.accessToken || !this.adAccountId) {
      console.error('❌ Variáveis de ambiente do Meta Ads não configuradas!');
      console.error('Configure META_ACCESS_TOKEN e META_AD_ACCOUNT_ID no arquivo .env');
    }
  }

  // Adicionar delay entre requisições
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;
    
    if (timeSinceLastRequest < this.minDelay) {
      const waitTime = this.minDelay - timeSinceLastRequest;
      console.log(`⏱️ Rate limit: aguardando ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequest = Date.now();
  }

  // Cache com TTL personalizado
  private getCachedData(key: string): any {
    const cached = this.cache.get(key);
    if (cached) {
      const ttl = cached.ttl || 5 * 60 * 1000; // Default 5 minutos
      if (Date.now() - cached.timestamp < ttl) {
        console.log(`🚀 Cache hit para: ${key}`);
        return cached.data;
      }
    }
    return null;
  }

  private setCachedData(key: string, data: any, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ...(ttl !== undefined && { ttl })
    });
  }

  // Verificar se as credenciais estão configuradas
  public isConfigured(): boolean {
    return !!(this.accessToken && this.adAccountId);
  }

  // Verificar informações do token atual
  public async getTokenInfo(): Promise<MetaTokenInfo> {
    try {
      const url = `${this.baseURL}/debug_token`;
      const response: AxiosResponse<{ data: MetaTokenInfo }> = await axios.get(url, {
        params: {
          input_token: this.accessToken,
          access_token: this.accessToken
        }
      });
      
      return response.data.data;
    } catch (error: any) {
      console.error('Erro ao verificar token:', error.response?.data || error.message);
      throw error;
    }
  }

  // Renovar token para longa duração (60 dias)
  public async extendToken(): Promise<TokenRenewalResult> {
    try {
      if (!this.appId || !this.appSecret) {
        throw new Error('APP_ID e APP_SECRET são necessários para renovar o token. Configure META_APP_ID e META_APP_SECRET no .env');
      }

      const url = `${this.baseURL}/oauth/access_token`;
      const response: AxiosResponse<TokenRenewalResult> = await axios.get(url, {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: this.appId,
          client_secret: this.appSecret,
          fb_exchange_token: this.accessToken
        }
      });

      return response.data;
    } catch (error: any) {
      console.error('Erro ao renovar token:', error.response?.data || error.message);
      throw error;
    }
  }

  // Verificar se o token está próximo do vencimento (menos de 7 dias)
  public async checkTokenExpiration(): Promise<TokenExpirationInfo> {
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
      const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        isValid: tokenInfo.is_valid,
        expires: expiresAt.toLocaleDateString('pt-BR'),
        daysLeft: daysLeft,
        needsRenewal: daysLeft <= 7,
        expiresAt: tokenInfo.expires_at
      };
    } catch (error: any) {
      return {
        isValid: false,
        error: error.message,
        needsRenewal: true
      };
    }
  }

  // Fazer requisição para a API do Meta
  private async makeRequest<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
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

      const response: AxiosResponse<T> = await axios.get(url, { 
        params: requestParams,
        timeout: 30000
      });

      // Salvar no cache
      this.setCachedData(cacheKey, response.data);
      
      return response.data;
    } catch (error: any) {
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
  public async getCampaigns(statusFilter: 'ACTIVE' | 'PAUSED' | 'ALL' = 'ACTIVE'): Promise<MetaApiResponse<MetaCampaign>> {
    if (!this.isConfigured()) {
      throw new Error('Meta Ads API não configurada. Configure META_ACCESS_TOKEN e META_AD_ACCOUNT_ID');
    }

    const endpoint = `/${this.adAccountId}/campaigns`;
    
    // Definir quais status buscar baseado no filtro
    let statusArray: string[];
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
    return await this.makeRequest<MetaApiResponse<MetaCampaign>>(endpoint, params);
  }

  // Buscar adsets de uma campanha
  public async getAdSets(campaignId: string): Promise<MetaApiResponse<MetaAdSet>> {
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

    const result = await this.makeRequest<MetaApiResponse<MetaAdSet>>(endpoint, params);
    
    // Cache específico para Ad Sets (TTL maior - 10 minutos)
    this.setCachedData(cacheKey, result, 10 * 60 * 1000);

    return result;
  }

  // Buscar insights de campanha
  public async getCampaignInsights(campaignId: string, dateRange: string = 'last_30d'): Promise<MetaApiResponse<MetaInsight>> {
    const endpoint = `/${campaignId}/insights`;
    const params = {
      fields: 'campaign_name,spend,actions,action_values,cost_per_action_type,impressions,clicks,reach,cpm,cpc,ctr,frequency',
      time_range: `{'since':'${this.getDateRange(dateRange).since}','until':'${this.getDateRange(dateRange).until}'}`,
      level: 'campaign'
    };

    return await this.makeRequest<MetaApiResponse<MetaInsight>>(endpoint, params);
  }

  // Buscar leads de uma campanha
  public async getLeads(campaignId: string, dateRange: string = 'last_30d'): Promise<MetaApiResponse<MetaLead>> {
    const endpoint = `/${campaignId}/leads`;
    const params = {
      fields: 'id,created_time,field_data,ad_id,adset_id',
      time_range: `{'since':'${this.getDateRange(dateRange).since}','until':'${this.getDateRange(dateRange).until}'}`
    };

    return await this.makeRequest<MetaApiResponse<MetaLead>>(endpoint, params);
  }

  // Buscar dados de targeting por região
  public async getRegionalInsights(campaignId: string, dateRange: string = 'last_30d'): Promise<MetaApiResponse<MetaInsight>> {
    const endpoint = `/${campaignId}/insights`;
    const params = {
      fields: 'spend,actions,action_values,cost_per_action_type,impressions,clicks,reach,cpm,cpc,ctr',
      time_range: `{'since':'${this.getDateRange(dateRange).since}','until':'${this.getDateRange(dateRange).until}'}`,
      breakdowns: 'country,region'
    };

    return await this.makeRequest<MetaApiResponse<MetaInsight>>(endpoint, params);
  }

  // Buscar custo por lead por região
  public async getCostPerLeadByRegion(campaignId: string, dateRange: string = 'last_30d'): Promise<RegionalInsight[]> {
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

  // Buscar insights detalhados por adset
  public async getDetailedInsightsByAdSet(campaignId: string, dateRange: string = 'last_30d'): Promise<DetailedInsight[]> {
    try {
      console.log(`🔍 Buscando insights detalhados para campanha ${campaignId}`);
      
      // 1. Buscar todos os adsets da campanha
      const adsets = await this.getAdSets(campaignId);
      console.log(`📊 Encontrados ${adsets.data?.length || 0} adsets`);
      
      const detailedData: DetailedInsight[] = [];

      for (const adset of adsets.data) {
        // 2. Buscar insights do adset
        const insightsEndpoint = `/${adset.id}/insights`;
        const insightsParams = {
          fields: 'spend,actions,action_values,cost_per_action_type,adset_name,impressions,clicks,reach,cpm,cpc,ctr',
          time_range: `{'since':'${this.getDateRange(dateRange).since}','until':'${this.getDateRange(dateRange).until}'}`
        };

        try {
          const insights = await this.makeRequest<MetaApiResponse<MetaInsight>>(insightsEndpoint, insightsParams);
          
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
        } catch (error: any) {
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
  private countLeads(actions: Array<{ action_type: string; value: string }>): number {
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
  private getDateRange(range: string): { since: string; until: string } {
    const now = new Date();
    const until = new Date(now);
    let since = new Date(now);

    switch (range) {
      case 'today':
        since.setHours(0, 0, 0, 0);
        until.setHours(23, 59, 59, 999);
        return {
          since: since.toISOString().split('T')[0]!,
          until: until.toISOString().split('T')[0]!
        };
      case 'last_7d':
        until.setDate(now.getDate() - 1);
        since = new Date(until);
        since.setDate(until.getDate() - 6);
        break;
      case 'last_30d':
        until.setDate(now.getDate() - 1);
        since = new Date(until);
        since.setDate(until.getDate() - 29);
        break;
      case 'this_month':
        since = new Date(now.getFullYear(), now.getMonth(), 1);
        until.setDate(now.getDate() - 1);
        break;
      default:
        until.setDate(now.getDate() - 1);
        since = new Date(until);
        since.setDate(until.getDate() - 29);
    }

    return {
      since: since.toISOString().split('T')[0]!,
      until: until.toISOString().split('T')[0]!
    };
  }

  // Sincronizar dados de campanhas com detalhes de cidade
  public async syncCampaignData(statusFilter: 'ACTIVE' | 'PAUSED' | 'ALL' = 'ACTIVE'): Promise<CampaignInsight[]> {
    try {
      const campaigns = await this.getCampaigns(statusFilter);
      const campaignData: CampaignInsight[] = [];

      for (const campaign of campaigns.data) {
        console.log(`🚀 Processando campanha: ${campaign.name}`);
        
        // Usar novo método que pega dados por cidade
        let detailedInsights = await this.getDetailedInsightsByAdSet(campaign.id);
        
        // Fallback: se não tem dados detalhados, usar método regional
        if (!detailedInsights || detailedInsights.length === 0) {
          console.log(`⚠️ Sem dados detalhados, usando método regional para ${campaign.name}`);
          const regionalInsights = await this.getCostPerLeadByRegion(campaign.id);
          
          // Melhorar o parsing dos estados brasileiros
          detailedInsights = regionalInsights.map(insight => ({
            adset_id: 'N/A',
            adset_name: 'Regional',
            city: this.parseRegionToCity(insight.region),
            region: insight.region,
            country: insight.country,
            spend: insight.spend,
            leads: insight.leads,
            costPerLead: insight.costPerLead
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
  private parseRegionToCity(region: string): string {
    if (!region) return 'N/A';
    
    const stateToCityMap: Record<string, string> = {
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
  private extractCityFromAdSetName(adSetName: string): { city: string; state: string } {
    if (!adSetName) return { city: 'N/A', state: 'BR' };
    
    // Padrão 1: "SACADOS | Conversas WhatsApp - Cuiabá"
    let match = adSetName.match(/\|\s*[^-]+\s*-\s*([^-]+)$/);
    if (match && match[1]) {
      return { city: match[1].trim(), state: this.guessStateFromCity(match[1].trim()) };
    }
    
    // Padrão 2: "NOVO HAMBURGO - RS" ou "Foz do Iguaçu - PR"
    match = adSetName.match(/([A-Za-zÀ-ÿ\s]+(?:do\s|da\s|de\s)?[A-Za-zÀ-ÿ\s]*?)\s*-\s*([A-Z]{2})$/);
    if (match && match[1] && match[2]) {
      return { city: match[1].trim(), state: match[2] };
    }
    
    // Padrão 3: Última parte após hífen
    const parts = adSetName.split('-');
    if (parts.length > 1) {
      const lastPart = parts[parts.length - 1]?.trim();
      if (lastPart) {
        return { city: lastPart, state: this.guessStateFromCity(lastPart) };
      }
    }
    
    return { city: adSetName, state: 'BR' };
  }
  
  // Adivinhar estado pela cidade
  private guessStateFromCity(city: string): string {
    const cityToState: Record<string, string> = {
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

  // Converter nomes de região para sigla do estado (mantido para futuras implementações)
  /*
  private parseRegionToState(region: string): string {
    if (!region) return 'BR';
    
    const stateMap: Record<string, string> = {
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
  */

  // Testar conexão com a API
  public async testConnection(): Promise<ConnectionTestResult> {
    try {
      const campaigns = await this.getCampaigns();
      return {
        success: true,
        message: 'Conexão com Meta Ads API estabelecida com sucesso!',
        campaignsCount: campaigns.data?.length || 0
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Erro na conexão: ${error.message}`,
        error: typeof error.response?.data === 'string' 
          ? error.response.data 
          : error.message || 'Erro desconhecido'
      };
    }
  }

  // Método para obter métricas avançadas
  async getAdvancedMetrics(dateRange: string = 'last_30d'): Promise<{
    data: any[];
    summary: {
      total_fechamentos: number;
      valor_total_fechamentos: number;
      periodo: string;
      cidades_com_fechamentos: number;
    };
  }> {
    try {
      console.log(`🔄 Buscando métricas avançadas APENAS campanhas ATIVAS para período: ${dateRange}`);
      
      const campaigns = await this.getCampaigns('ACTIVE'); // SEMPRE buscar apenas ATIVAS
      
      if (!campaigns.data || campaigns.data.length === 0) {
        return {
          data: [],
          summary: {
            total_fechamentos: 0,
            valor_total_fechamentos: 0,
            periodo: dateRange,
            cidades_com_fechamentos: 0
          }
        };
      }
      
      // Filtrar APENAS campanhas ATIVAS (dupla verificação)
      const activeCampaigns = campaigns.data.filter(c => c.status === 'ACTIVE');
      console.log(`✅ ${activeCampaigns.length} campanhas ATIVAS encontradas`);
      
      if (activeCampaigns.length === 0) {
        return {
          data: [],
          summary: {
            total_fechamentos: 0,
            valor_total_fechamentos: 0,
            periodo: dateRange,
            cidades_com_fechamentos: 0
          }
        };
      }

      // Buscar fechamentos do período para calcular CPA real
      const { since, until } = this.getDateRange(dateRange);
      const { createClient } = await import('@supabase/supabase-js');
      
      const supabaseUrl = process.env['SUPABASE_URL']!;
      const supabaseServiceKey = process.env['SUPABASE_SERVICE_KEY']!;
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

      const { data: fechamentos, error: fechError } = await supabaseAdmin
        .from('fechamentos')
        .select(`
          valor_fechado, 
          data_fechamento,
          pacientes(cidade, nome, telefone)
        `)
        .gte('data_fechamento', since)
        .lte('data_fechamento', until);

      if (fechError) {
        console.warn('⚠️ Erro ao buscar fechamentos:', fechError.message);
      }

      const fechamentosAprovados = fechamentos?.filter((f: any) => f.aprovado !== 'reprovado') || [];
      const totalFechamentos = fechamentosAprovados.length;
      const valorTotalFechamentos = fechamentosAprovados.reduce((sum, f) => sum + parseFloat(f.valor_fechado || 0), 0);

      // Inicializar objeto para agrupar fechamentos por cidade
      const fechamentosPorCidade: Record<string, { count: number; valor_total: number }> = {};

      // Agrupar fechamentos por cidade para calcular CPA real por região
      if (fechamentosAprovados && fechamentosAprovados.length > 0) {
        fechamentosAprovados.forEach((fechamento: any) => {
          const cidade = fechamento.pacientes?.cidade || 'N/A';
          if (!fechamentosPorCidade[cidade]) {
            fechamentosPorCidade[cidade] = {
              count: 0,
              valor_total: 0
            };
          }
          fechamentosPorCidade[cidade].count++;
          fechamentosPorCidade[cidade].valor_total += parseFloat(fechamento.valor_fechado || 0);
        });
      }
      
      const advancedMetrics: any[] = [];
      
      // Buscar insights detalhados por Ad Set para cada campanha ATIVA
      for (const campaign of activeCampaigns) {
        try {
          console.log(`📊 Processando métricas avançadas para campanha: ${campaign.name}`);
          
          // Buscar Ad Sets da campanha
          const adSetsResponse = await this.getAdSets(campaign.id);
          
          if (adSetsResponse.data && adSetsResponse.data.length > 0) {
            // Processar cada Ad Set
            for (const adSet of adSetsResponse.data) {
              // Apenas Ad Sets ativos
              if (adSet.status !== 'ACTIVE') continue;
              
              // Extrair cidade do nome do Ad Set
              const locationInfo = this.extractCityFromAdSetName(adSet.name);
              const city = locationInfo.city;
              const state = locationInfo.state;
              
              // Buscar insights do Ad Set
              const adSetInsightsEndpoint = `/${adSet.id}/insights`;
              const adSetInsightsParams = {
                fields: 'spend,impressions,clicks,reach,actions,cost_per_action_type,cpm,cpc,ctr',
                time_range: `{'since':'${this.getDateRange(dateRange).since}','until':'${this.getDateRange(dateRange).until}'}`
              };
              
              try {
                const adSetInsights = await this.makeRequest(adSetInsightsEndpoint, adSetInsightsParams) as any;
                
                if (adSetInsights.data && adSetInsights.data.length > 0) {
                  const insight = adSetInsights.data[0];
                  const spend = parseFloat(insight.spend) || 0;
                  const leads = this.countLeads(insight.actions);
                  const impressions = parseInt(insight.impressions) || 0;
                  const clicks = parseInt(insight.clicks) || 0;
                  const reach = parseInt(insight.reach) || 0;
                  
                  // Calcular métricas
                  const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0; // Cost per Mille
                  const cpc = clicks > 0 ? spend / clicks : 0; // Cost per Click
                  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0; // Click Through Rate
                  const costPerLead = leads > 0 ? spend / leads : 0; // Custo por Lead do Meta
                  
                  // CPA Real baseado em fechamentos do sistema
                  const fechamentosCity = fechamentosPorCidade[city] || { count: 0, valor_total: 0 };
                  const cpaReal = fechamentosCity.count > 0 ? spend / fechamentosCity.count : 0;
                  const roasReal = spend > 0 ? fechamentosCity.valor_total / spend : 0;
                  
                  advancedMetrics.push({
                    campaign_id: campaign.id,
                    name: campaign.name,
                    adset_name: adSet.name,
                    status: campaign.status || 'ACTIVE',
                    objective: campaign.objective || 'OUTCOME_ENGAGEMENT',
                    city: city,
                    state: state,
                    region: `${city} - ${state}`,
                
                    // Métricas básicas
                    spend: spend,
                    leads: leads,
                    impressions: impressions,
                    clicks: clicks,
                    reach: reach,
                    
                    // Métricas calculadas
                    cpm: parseFloat(cpm.toFixed(2)),
                    cpc: parseFloat(cpc.toFixed(2)),
                    ctr: parseFloat(ctr.toFixed(2)),
                    cost_per_lead: parseFloat(costPerLead.toFixed(2)),
                    
                    // Métricas baseadas em fechamentos reais
                    cpa_real: parseFloat(cpaReal.toFixed(2)),
                    fechamentos_reais: fechamentosCity.count,
                    valor_total_fechamentos: fechamentosCity.valor_total,
                    roas_real: parseFloat(roasReal.toFixed(2)),
                    
                    updated_time: campaign.updated_time || campaign.created_time,
                    date_range: dateRange
                  });
                } else {
                  console.log(`⚠️ Sem insights para Ad Set: ${adSet.name}`);
                }
              } catch (adSetError: any) {
                console.warn(`⚠️ Erro ao buscar insights do Ad Set ${adSet.name}:`, adSetError.message);
              }
            }
          } else {
            console.log(`⚠️ Nenhum Ad Set ativo encontrado para campanha: ${campaign.name}`);
          }
          
          // Delay pequeno para evitar rate limit
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (campaignError: any) {
          console.warn(`⚠️ Erro ao processar métricas da campanha ${campaign.name}:`, campaignError.message);
        }
      }
      
      console.log(`✅ Total de métricas avançadas processadas: ${advancedMetrics.length}`);
      console.log(`📊 Resumo dos fechamentos: ${totalFechamentos} fechamentos, R$ ${valorTotalFechamentos.toFixed(2)} em valor total`);
      
      // Ordenar por gasto (maior primeiro)
      advancedMetrics.sort((a, b) => (b.spend || 0) - (a.spend || 0));
      
      return {
        data: advancedMetrics,
        summary: {
          total_fechamentos: totalFechamentos,
          valor_total_fechamentos: valorTotalFechamentos,
          periodo: dateRange,
          cidades_com_fechamentos: Object.keys(fechamentosPorCidade).length
        }
      };
      
    } catch (error: any) {
      console.error('❌ Erro ao buscar métricas avançadas:', error);
      throw error;
    }
  }
}
