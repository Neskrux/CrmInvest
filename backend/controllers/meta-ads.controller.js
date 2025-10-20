const { supabase, supabaseAdmin } = require('../config/database');
const MetaAdsAPI = require('../services/meta-ads.service');

// === META ADS PRICING ===

// GET /api/meta-ads/pricing - Listar pricing
const getPricing = async (req, res) => {
  try {
    const { cidade, estado, status } = req.query;
    
    let query = supabase
      .from('meta_ads_pricing')
      .select('*')
      .order('region');

    if (cidade) {
      query = query.ilike('region', `%${cidade}%`);
    }

    if (estado) {
      query = query.ilike('region', `%${estado}%`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/meta-ads/pricing - Criar pricing
const createPricing = async (req, res) => {
  try {
    const { city, state, cost_per_lead, spend, leads } = req.body;
    
    // Adaptar para a estrutura da tabela meta_ads_pricing
    const { data, error } = await supabaseAdmin
      .from('meta_ads_pricing')
      .insert([{ 
        region: `${city || 'N/A'} - ${state || 'BR'}`,
        city: city,
        state: state,
        country: 'BR',
        cost_per_lead: cost_per_lead || 0,
        spend: spend || 0,
        leads: leads || 0,
        date_range: 'manual' // indicar que foi inserido manualmente
      }])
      .select();

    if (error) throw error;
    res.json({ id: data[0].id, message: 'Preço por lead cadastrado com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/meta-ads/pricing/:id - Atualizar pricing
const updatePricing = async (req, res) => {
  try {
    const { id } = req.params;
    const { city, state, cost_per_lead, spend, leads } = req.body;
    
    // Adaptar dados para a estrutura da tabela
    const updateData = {};
    if (city || state) {
      updateData.region = `${city || 'N/A'} - ${state || 'BR'}`;
      updateData.city = city;
      updateData.state = state;
    }
    if (cost_per_lead !== undefined) updateData.cost_per_lead = cost_per_lead;
    if (spend !== undefined) updateData.spend = spend;
    if (leads !== undefined) updateData.leads = leads;
    
    const { data, error } = await supabaseAdmin
      .from('meta_ads_pricing')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json({ id: data[0].id, message: 'Preço por lead atualizado com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// === META ADS LEADS ===

// GET /api/meta-ads/leads - Listar leads do Meta Ads
const getLeads = async (req, res) => {
  try {
    let query = supabase
      .from('meta_ads_leads')
      .select(`
        *,
        pacientes(nome, telefone, cpf)
      `)
      .order('created_at', { ascending: false });

    // Se for consultor, filtrar apenas leads de pacientes atribuídos a ele
    if (req.user.tipo === 'consultor') {
      const { data: pacientesConsultor, error: pacientesError } = await supabaseAdmin
        .from('pacientes')
        .select('id')
        .eq('consultor_id', req.user.id);

      if (pacientesError) throw pacientesError;

      const pacienteIds = pacientesConsultor.map(p => p.id);
      
      if (pacienteIds.length > 0) {
        query = query.in('paciente_id', pacienteIds);
      } else {
        // Se não tem pacientes, retornar array vazio
        return res.json([]);
      }
    }

    const { data, error } = await query;

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/meta-ads/leads - Criar lead do Meta Ads
const createLead = async (req, res) => {
  try {
    const { 
      paciente_id, 
      campanha_id, 
      campanha_nome, 
      adset_id, 
      adset_nome, 
      ad_id, 
      ad_nome, 
      custo_lead, 
      data_lead, 
      cidade_lead, 
      estado_lead 
    } = req.body;
    
    const { data, error } = await supabaseAdmin
      .from('meta_ads_leads')
      .insert([{ 
        paciente_id, 
        campanha_id, 
        campanha_nome, 
        adset_id, 
        adset_nome, 
        ad_id, 
        ad_nome, 
        custo_lead, 
        data_lead, 
        cidade_lead, 
        estado_lead 
      }])
      .select();

    if (error) throw error;
    res.json({ id: data[0].id, message: 'Lead do Meta Ads registrado com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// === META ADS API INTEGRATION ===

// GET /api/meta-ads/test-connection - Testar conexão com Meta Ads API
const testConnection = async (req, res) => {
  try {
    const metaAPI = new MetaAdsAPI();
    const result = await metaAPI.testConnection();
    
    // Verificar expiração do token
    const tokenStatus = await metaAPI.checkTokenExpiration();
    
    res.json({
      ...result,
      tokenStatus
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao testar conexão com Meta Ads API',
      error: error.message || 'Erro desconhecido'
    });
  }
};

// GET /api/meta-ads/token-status - Verificar status do token
const getTokenStatus = async (req, res) => {
  try {
    const metaAPI = new MetaAdsAPI();
    const tokenStatus = await metaAPI.checkTokenExpiration();
    res.json(tokenStatus);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao verificar token',
      error: error.message || 'Erro desconhecido'
    });
  }
};

// POST /api/meta-ads/extend-token - Renovar token
const extendToken = async (req, res) => {
  try {
    const metaAPI = new MetaAdsAPI();
    const newToken = await metaAPI.extendToken();
    
    res.json({
      success: true,
      message: 'Token renovado com sucesso! Atualize o META_ACCESS_TOKEN no arquivo .env',
      newToken: newToken.access_token,
      expiresIn: newToken.expires_in,
      expiresAt: newToken.expires_at
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao renovar token',
      error: error.message || 'Erro desconhecido'
    });
  }
};

// GET /api/meta-ads/campaigns - Buscar campanhas
const getCampaigns = async (req, res) => {
  try {
    const metaAPI = new MetaAdsAPI();
    const campaigns = await metaAPI.getCampaigns();
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao buscar campanhas',
      error: error.message || 'Erro desconhecido'
    });
  }
};

// GET /api/meta-ads/campaign/:id/adsets - Buscar Ad Sets de uma campanha
const getAdSets = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 [AdSets] Buscando Ad Sets para campanha: ${id}`);
    console.log(`👤 [AdSets] Usuário: ${req.user?.nome || 'Unknown'}`);
    
    const metaAPI = new MetaAdsAPI();
    console.log(`📡 [AdSets] Chamando metaAPI.getAdSets(${id})`);
    
    const adsets = await metaAPI.getAdSets(id);
    console.log(`✅ [AdSets] Dados recebidos:`, JSON.stringify(adsets, null, 2));
    
    res.json(adsets);
  } catch (error) {
    console.error(`❌ [AdSets] Erro ao buscar Ad Sets para campanha ${req.params.id}:`, error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao buscar conjuntos de anúncios',
      error: error.message || 'Erro desconhecido'
    });
  }
};

// GET /api/meta-ads/campaign/:id/insights - Buscar insights de uma campanha
const getCampaignInsights = async (req, res) => {
  try {
    const { id } = req.params;
    const { dateRange = 'last_30d' } = req.query;
    
    const metaAPI = new MetaAdsAPI();
    const insights = await metaAPI.getCostPerLeadByRegion(id, dateRange);
    res.json(insights);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao buscar insights da campanha',
      error: error.message || 'Erro desconhecido'
    });
  }
};

// POST /api/meta-ads/sync-campaigns - Sincronizar campanhas
const syncCampaigns = async (req, res) => {
  try {
    const { status = 'ACTIVE' } = req.body;
    const metaAPI = new MetaAdsAPI();
    const campaignData = await metaAPI.syncCampaignData(status);
    
    // Salvar dados reais do Meta Ads - agora com cidade + estado
    const rawData = campaignData.flatMap(campaign => 
      campaign.insights.map(insight => ({
        region: `${insight.city || insight.region || 'N/A'} - ${insight.region || 'BR'}`,
        country: insight.country || 'BR',
        cost_per_lead: insight.costPerLead || 0,
        spend: insight.spend || 0,
        leads: insight.leads || 0,
        date_range: 'last_30d',
        // Campos extras para filtros
        city: insight.city || insight.region || 'N/A',
        state: insight.region || 'BR'
      }))
    );

    // Consolidar dados por região (somar valores duplicados)
    const consolidated = {};
    rawData.forEach(item => {
      const key = `${item.region}-${item.country}-${item.date_range}`;
      if (consolidated[key]) {
        consolidated[key].spend += item.spend;
        consolidated[key].leads += item.leads;
        // Recalcular cost_per_lead
        consolidated[key].cost_per_lead = consolidated[key].leads > 0 ? 
          consolidated[key].spend / consolidated[key].leads : 0;
      } else {
        consolidated[key] = { ...item };
      }
    });

    const pricingData = Object.values(consolidated);
    
    console.log('=== DADOS CONSOLIDADOS DO META ADS ===');
    console.log('Total de itens únicos para sincronizar:', pricingData.length);
    console.log('Dados:', JSON.stringify(pricingData, null, 2));

    console.log('Total items:', pricingData.length);
    
    console.log('Tentando inserir dados:', JSON.stringify(pricingData, null, 2));
    
    const { data, error } = await supabaseAdmin
      .from('meta_ads_pricing')
      .upsert(pricingData, {
        onConflict: 'region,country,date_range',
        ignoreDuplicates: false
      });
      
    if (error) {
      console.log('Erro detalhado:', error);
      console.log('Código do erro:', error.code);
      console.log('Mensagem do erro:', error.message);
      console.log('Detalhes do erro:', error.details);
    }

    if (error) throw error;
    
    res.json({ 
      success: true, 
      message: 'Campanhas sincronizadas com sucesso!',
      campaignsCount: campaignData.length,
      pricingCount: data?.length || 0
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao sincronizar campanhas',
      error: error.message || 'Erro desconhecido'
    });
  }
};

// GET /api/meta-ads/regional-insights - Buscar insights regionais
const getRegionalInsights = async (req, res) => {
  try {
    const { campaignId, dateRange = 'last_30d' } = req.query;
    
    if (!campaignId) {
      return res.status(400).json({ error: 'ID da campanha é obrigatório' });
    }
    
    const metaAPI = new MetaAdsAPI();
    const insights = await metaAPI.getRegionalInsights(campaignId, dateRange);
    res.json(insights);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao buscar insights regionais',
      error: error.message || 'Erro desconhecido'
    });
  }
};

// GET /api/meta-ads/real-time-insights - Buscar insights em tempo real
const getRealTimeInsights = async (req, res) => {
  try {
    const { dateRange = 'last_30d', status = 'ACTIVE' } = req.query;
    
    console.log(`🔄 Buscando insights em tempo real para período: ${dateRange}, status: ${status}`);
    
    const metaAPI = new MetaAdsAPI();
    const campaigns = await metaAPI.getCampaigns(status);
    
    if (!campaigns.data || campaigns.data.length === 0) {
      return res.json([]);
    }
    
    const realTimeData = [];
    
    // Buscar insights por Ad Set para cada campanha ativa
    for (const campaign of campaigns.data) {
      try {
        console.log(`📊 Processando campanha: ${campaign.name}`);
        
        // Buscar Ad Sets da campanha
        const adSetsResponse = await metaAPI.getAdSets(campaign.id);
        
        if (adSetsResponse.data && adSetsResponse.data.length > 0) {
          // Processar cada Ad Set
          for (const adSet of adSetsResponse.data) {
            // Apenas Ad Sets ativos
            if (adSet.status !== 'ACTIVE') continue;
            
            // Extrair cidade do nome do Ad Set
            const locationInfo = metaAPI.extractCityFromAdSetName(adSet.name);
            const city = locationInfo.city;
            const state = locationInfo.state;
            
            // Buscar insights do Ad Set
            const adSetInsightsEndpoint = `/${adSet.id}/insights`;
            const adSetInsightsParams = {
              fields: 'spend,impressions,clicks,reach,actions,cost_per_action_type,cpm,cpc,ctr',
              time_range: `{'since':'${metaAPI.getDateRange(dateRange).since}','until':'${metaAPI.getDateRange(dateRange).until}'}`
            };
            
            try {
              const adSetInsights = await metaAPI.makeRequest(adSetInsightsEndpoint, adSetInsightsParams);
              
              if (adSetInsights.data && adSetInsights.data.length > 0) {
                const insight = adSetInsights.data[0];
                const spend = parseFloat(insight.spend) || 0;
                const leads = metaAPI.countLeads(insight.actions);
                const impressions = parseInt(insight.impressions) || 0;
                const clicks = parseInt(insight.clicks) || 0;
                const reach = parseInt(insight.reach) || 0;
                
                // Calcular métricas
                const costPerLead = leads > 0 ? spend / leads : 0;
                const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
                const cpc = clicks > 0 ? spend / clicks : 0;
                const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
                
                realTimeData.push({
                  campaign_id: campaign.id,
                  name: campaign.name,
                  adset_name: adSet.name,
                  status: campaign.status || 'ACTIVE',
                  objective: campaign.objective || 'OUTCOME_ENGAGEMENT',
                  city: city,
                  state: state,
                  region: `${city} - ${state}`,
                  cost_per_lead: parseFloat(costPerLead.toFixed(2)),
                  spend: spend,
                  leads: leads,
                  impressions: impressions,
                  reach: reach,
                  clicks: clicks,
                  cpm: parseFloat(cpm.toFixed(2)),
                  cpc: parseFloat(cpc.toFixed(2)),
                  ctr: parseFloat(ctr.toFixed(2)),
                  updated_time: campaign.updated_time || campaign.created_time,
                  date_range: dateRange
                });
              } else {
                console.log(`⚠️ Sem insights para Ad Set: ${adSet.name}`);
              }
            } catch (adSetError) {
              console.warn(`⚠️ Erro ao buscar insights do Ad Set ${adSet.name}:`, adSetError.message);
            }
          }
        } else {
          console.log(`⚠️ Nenhum Ad Set ativo encontrado para campanha: ${campaign.name}`);
        }
        
        // Delay pequeno para evitar rate limit
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (campaignError) {
        console.warn(`⚠️ Erro ao processar campanha ${campaign.name}:`, campaignError.message);
        
        // Adicionar campanha com erro/dados básicos
        realTimeData.push({
          campaign_id: campaign.id,
          name: campaign.name,
          status: campaign.status || 'ACTIVE',
          objective: campaign.objective || 'UNKNOWN',
          city: 'N/A',
          state: 'BR',
          region: 'Erro ao carregar',
          cost_per_lead: 0,
          spend: 0,
          leads: 0,
          impressions: 0,
          reach: 0,
          clicks: 0,
          cpm: 0,
          cpc: 0,
          ctr: 0,
          updated_time: campaign.updated_time || campaign.created_time,
          date_range: dateRange,
          error: campaignError.message
        });
      }
    }
    
    console.log(`✅ Total de campanhas processadas: ${realTimeData.length}`);
    
    // Ordenar por gasto (maior primeiro)
    realTimeData.sort((a, b) => (b.spend || 0) - (a.spend || 0));
    
    res.json(realTimeData);
    
  } catch (error) {
    console.error('❌ Erro ao buscar insights em tempo real:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar insights em tempo real',
      details: error.message,
      success: false 
    });
  }
};

// GET /api/meta-ads/advanced-metrics - Buscar métricas avançadas
const getAdvancedMetrics = async (req, res) => {
  try {
    const { dateRange = 'last_30d' } = req.query;
    
    console.log(`🔄 Buscando métricas avançadas APENAS campanhas ATIVAS para período: ${dateRange}`);
    
    const metaAPI = new MetaAdsAPI();
    const campaigns = await metaAPI.getCampaigns('ACTIVE'); // SEMPRE buscar apenas ATIVAS
    
    if (!campaigns.data || campaigns.data.length === 0) {
      return res.json({
        success: true,
        data: [],
        summary: {
          total_fechamentos: 0,
          valor_total_fechamentos: 0,
          periodo: dateRange,
          cidades_com_fechamentos: 0,
          mensagem: 'Nenhuma campanha ativa encontrada'
        }
      });
    }
    
    // Filtrar APENAS campanhas ATIVAS (dupla verificação)
    const activeCampaigns = campaigns.data.filter(c => c.status === 'ACTIVE');
    console.log(`✅ ${activeCampaigns.length} campanhas ATIVAS encontradas`);
    
    if (activeCampaigns.length === 0) {
      return res.json({
        success: true,
        data: [],
        summary: {
          total_fechamentos: 0,
          valor_total_fechamentos: 0,
          periodo: dateRange,
          cidades_com_fechamentos: 0,
          mensagem: 'Nenhuma campanha ativa encontrada após filtro'
        }
      });
    }

    // Buscar fechamentos do período para calcular CPA real
    const { since, until } = metaAPI.getDateRange(dateRange);
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

    const fechamentosAprovados = fechamentos?.filter(f => f.aprovado !== 'reprovado') || [];
    const totalFechamentos = fechamentosAprovados.length;
    const valorTotalFechamentos = fechamentosAprovados.reduce((sum, f) => sum + parseFloat(f.valor_fechado || 0), 0);

    // Inicializar objeto para agrupar fechamentos por cidade
    const fechamentosPorCidade = {};

    // Agrupar fechamentos por cidade para calcular CPA real por região
    if (fechamentosAprovados && fechamentosAprovados.length > 0) {
      fechamentosAprovados.forEach(fechamento => {
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
    
    const advancedMetrics = [];
    
    // Buscar insights detalhados por Ad Set para cada campanha ATIVA
    for (const campaign of activeCampaigns) {
      try {
        console.log(`📊 Processando métricas avançadas para campanha: ${campaign.name}`);
        
        // Buscar Ad Sets da campanha
        const adSetsResponse = await metaAPI.getAdSets(campaign.id);
        
        if (adSetsResponse.data && adSetsResponse.data.length > 0) {
          // Processar cada Ad Set
          for (const adSet of adSetsResponse.data) {
            // Apenas Ad Sets ativos
            if (adSet.status !== 'ACTIVE') continue;
            
            // Extrair cidade do nome do Ad Set
            const locationInfo = metaAPI.extractCityFromAdSetName(adSet.name);
            const city = locationInfo.city;
            const state = locationInfo.state;
            
            // Buscar insights do Ad Set
            const adSetInsightsEndpoint = `/${adSet.id}/insights`;
            const adSetInsightsParams = {
              fields: 'spend,impressions,clicks,reach,actions,cost_per_action_type,cpm,cpc,ctr',
              time_range: `{'since':'${metaAPI.getDateRange(dateRange).since}','until':'${metaAPI.getDateRange(dateRange).until}'}`
            };
            
            try {
              const adSetInsights = await metaAPI.makeRequest(adSetInsightsEndpoint, adSetInsightsParams);
              
              if (adSetInsights.data && adSetInsights.data.length > 0) {
                const insight = adSetInsights.data[0];
                const spend = parseFloat(insight.spend) || 0;
                const leads = metaAPI.countLeads(insight.actions);
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
            } catch (adSetError) {
              console.warn(`⚠️ Erro ao buscar insights do Ad Set ${adSet.name}:`, adSetError.message);
            }
          }
        } else {
          console.log(`⚠️ Nenhum Ad Set ativo encontrado para campanha: ${campaign.name}`);
        }
        
        // Delay pequeno para evitar rate limit
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (campaignError) {
        console.warn(`⚠️ Erro ao processar métricas da campanha ${campaign.name}:`, campaignError.message);
      }
    }
    
    console.log(`✅ Total de métricas avançadas processadas: ${advancedMetrics.length}`);
    console.log(`📊 Resumo dos fechamentos: ${totalFechamentos} fechamentos, R$ ${valorTotalFechamentos.toFixed(2)} em valor total`);
    
    // Ordenar por gasto (maior primeiro)
    advancedMetrics.sort((a, b) => (b.spend || 0) - (a.spend || 0));
    
    res.json({
      success: true,
      data: advancedMetrics,
      summary: {
        total_fechamentos: totalFechamentos,
        valor_total_fechamentos: valorTotalFechamentos,
        periodo: dateRange,
        cidades_com_fechamentos: Object.keys(fechamentosPorCidade).length
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar métricas avançadas:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar métricas avançadas',
      details: error.message,
      success: false 
    });
  }
};

module.exports = {
  // Pricing
  getPricing,
  createPricing,
  updatePricing,
  // Leads
  getLeads,
  createLead,
  // API Integration
  testConnection,
  getTokenStatus,
  extendToken,
  getCampaigns,
  getAdSets,
  getCampaignInsights,
  syncCampaigns,
  getRegionalInsights,
  getRealTimeInsights,
  getAdvancedMetrics
};

