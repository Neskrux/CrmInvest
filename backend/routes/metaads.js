const express = require('express');
const { supabase } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const MetaAdsAPI = require('../meta-ads-api');

const router = express.Router();

router.get('/pricing', authenticateToken, requireAdmin, async (req, res) => {
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
});

router.post('/pricing', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { city, state, cost_per_lead, spend, leads } = req.body;
    
    const { data, error } = await supabase
      .from('meta_ads_pricing')
      .insert([{ 
        region: `${city || 'N/A'} - ${state || 'BR'}`,
        city: city,
        state: state,
        country: 'BR',
        cost_per_lead: cost_per_lead || 0,
        spend: spend || 0,
        leads: leads || 0,
        date_range: 'manual'
      }])
      .select();

    if (error) throw error;
    res.json({ id: data[0].id, message: 'Preço por lead cadastrado com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/pricing/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { city, state, cost_per_lead, spend, leads } = req.body;
    
    const updateData = {};
    if (city || state) {
      updateData.region = `${city || 'N/A'} - ${state || 'BR'}`;
      updateData.city = city;
      updateData.state = state;
    }
    if (cost_per_lead !== undefined) updateData.cost_per_lead = cost_per_lead;
    if (spend !== undefined) updateData.spend = spend;
    if (leads !== undefined) updateData.leads = leads;
    
    const { data, error } = await supabase
      .from('meta_ads_pricing')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json({ id: data[0].id, message: 'Preço por lead atualizado com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/leads', authenticateToken, async (req, res) => {
  try {
    let query = supabase
      .from('meta_ads_leads')
      .select(`
        *,
        pacientes(nome, telefone, cpf)
      `)
      .order('created_at', { ascending: false });

    if (req.user.tipo === 'consultor') {
      const { data: pacientesConsultor, error: pacientesError } = await supabase
        .from('pacientes')
        .select('id')
        .eq('consultor_id', req.user.consultor_id);

      if (pacientesError) throw pacientesError;

      const pacienteIds = pacientesConsultor.map(p => p.id);
      
      if (pacienteIds.length > 0) {
        query = query.in('paciente_id', pacienteIds);
      } else {
        return res.json([]);
      }
    }

    const { data, error } = await query;

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/leads', authenticateToken, async (req, res) => {
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
    
    const { data, error } = await supabase
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
});

router.get('/test-connection', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const metaAPI = new MetaAdsAPI();
    const result = await metaAPI.testConnection();
    
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
});

router.get('/token-status', authenticateToken, requireAdmin, async (req, res) => {
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
});

router.post('/extend-token', authenticateToken, requireAdmin, async (req, res) => {
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
});

router.get('/campaigns', authenticateToken, requireAdmin, async (req, res) => {
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
});

router.get('/campaign/:id/adsets', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const metaAPI = new MetaAdsAPI();
    
    const adsets = await metaAPI.getAdSets(id);
    
    res.json(adsets);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao buscar conjuntos de anúncios',
      error: error.message || 'Erro desconhecido'
    });
  }
});

router.get('/campaign/:id/insights', authenticateToken, requireAdmin, async (req, res) => {
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
});

router.post('/sync-campaigns', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status = 'ACTIVE' } = req.body;
    const metaAPI = new MetaAdsAPI();
    const campaignData = await metaAPI.syncCampaignData(status);
    
    const rawData = campaignData.flatMap(campaign => 
      campaign.insights.map(insight => ({
        region: `${insight.city || insight.region || 'N/A'} - ${insight.region || 'BR'}`,
        country: insight.country || 'BR',
        cost_per_lead: insight.costPerLead || 0,
        spend: insight.spend || 0,
        leads: insight.leads || 0,
        date_range: 'last_30d',
        city: insight.city || insight.region || 'N/A',
        state: insight.region || 'BR'
      }))
    );

    const consolidated = {};
    rawData.forEach(item => {
      const key = `${item.region}-${item.country}-${item.date_range}`;
      if (consolidated[key]) {
        consolidated[key].spend += item.spend;
        consolidated[key].leads += item.leads;
        consolidated[key].cost_per_lead = consolidated[key].leads > 0 ? 
          consolidated[key].spend / consolidated[key].leads : 0;
      } else {
        consolidated[key] = { ...item };
      }
    });

    const pricingData = Object.values(consolidated);
    
    const { data, error } = await supabase
      .from('meta_ads_pricing')
      .upsert(pricingData, {
        onConflict: 'region,country,date_range',
        ignoreDuplicates: false
      });

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
});

router.get('/regional-insights', authenticateToken, requireAdmin, async (req, res) => {
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
});

router.get('/real-time-insights', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { dateRange = 'last_30d', status = 'ACTIVE' } = req.query;
    
    const metaAPI = new MetaAdsAPI();
    const campaigns = await metaAPI.getCampaigns(status);
    
    if (!campaigns.data || campaigns.data.length === 0) {
      return res.json([]);
    }
    
    const realTimeData = [];
    
    for (const campaign of campaigns.data) {
      try {
        
        const adSetsResponse = await metaAPI.getAdSets(campaign.id);
        
        if (adSetsResponse.data && adSetsResponse.data.length > 0) {
          for (const adSet of adSetsResponse.data) {
            if (adSet.status !== 'ACTIVE') continue;
            
            const locationInfo = metaAPI.extractCityFromAdSetName(adSet.name);
            const city = locationInfo.city;
            const state = locationInfo.state;
            
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
              }
            } catch (adSetError) {
            }
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (campaignError) {
        
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
    
    realTimeData.sort((a, b) => (b.spend || 0) - (a.spend || 0));
    
    res.json(realTimeData);
    
  } catch (error) {
    res.status(500).json({ 
      error: 'Erro ao buscar insights em tempo real',
      details: error.message,
      success: false 
    });
  }
});

router.get('/advanced-metrics', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { dateRange = 'last_30d' } = req.query;
    
    const metaAPI = new MetaAdsAPI();
    const campaigns = await metaAPI.getCampaigns('ACTIVE');
    
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
    
    const activeCampaigns = campaigns.data.filter(c => c.status === 'ACTIVE');
    
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

    const { since, until } = metaAPI.getDateRange(dateRange);
    const { data: fechamentos, error: fechError } = await supabase
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

    const fechamentosPorCidade = {};
    const totalFechamentos = fechamentos?.length || 0;
    const valorTotalFechamentos = fechamentos?.reduce((sum, f) => sum + parseFloat(f.valor_fechado || 0), 0) || 0;

    if (fechamentos && fechamentos.length > 0) {
      fechamentos.forEach(fechamento => {
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
    
    for (const campaign of activeCampaigns) {
      try {
        const adSetsResponse = await metaAPI.getAdSets(campaign.id);
        
        if (adSetsResponse.data && adSetsResponse.data.length > 0) {
          for (const adSet of adSetsResponse.data) {
            if (adSet.status !== 'ACTIVE') continue;
            
            const locationInfo = metaAPI.extractCityFromAdSetName(adSet.name);
            const city = locationInfo.city;
            const state = locationInfo.state;
            
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
                
                const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
                const cpc = clicks > 0 ? spend / clicks : 0;
                const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
                const costPerLead = leads > 0 ? spend / leads : 0;
                
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
              
              spend: spend,
              leads: leads,
              impressions: impressions,
              clicks: clicks,
              reach: reach,
              
              cpm: parseFloat(cpm.toFixed(2)),
              cpc: parseFloat(cpc.toFixed(2)),
              ctr: parseFloat(ctr.toFixed(2)),
              cost_per_lead: parseFloat(costPerLead.toFixed(2)),
              
              cpa_real: parseFloat(cpaReal.toFixed(2)),
              fechamentos_reais: fechamentosCity.count,
              valor_total_fechamentos: fechamentosCity.valor_total,
              roas_real: parseFloat(roasReal.toFixed(2)),
              
                  updated_time: campaign.updated_time || campaign.created_time,
                  date_range: dateRange
                });
              }
            } catch (adSetError) {
            }
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (campaignError) {
      }
    }
    
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
    res.status(500).json({ 
      error: 'Erro ao buscar métricas avançadas',
      details: error.message,
      success: false 
    });
  }
});

module.exports = router;
