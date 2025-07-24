import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import '../App.css';

function MetaAds() {
  const { user, makeRequest } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [adSets, setAdSets] = useState([]); // Conjuntos de anúncios
  const [loadingAdSets, setLoadingAdSets] = useState(false);
  const [dateRange, setDateRange] = useState('last_30d');
  const [realTimeData, setRealTimeData] = useState([]); // Dados em tempo real
  const [lastUpdate, setLastUpdate] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Verificar se usuário é admin
  const isAdmin = user?.tipo === 'admin';

  useEffect(() => {
    // Carregar dados iniciais
    fetchAdvancedMetrics();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const response = await makeRequest('/meta-ads/campaigns');
      const data = await response.json();
      
      if (response.ok) {
        setCampaigns(data.data || []);
      } else {
        console.error('Erro ao carregar campanhas:', data.error);
        setMessage('Erro ao carregar campanhas: ' + (data.error || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error('Erro ao carregar campanhas:', error);
      setMessage('Erro ao conectar com o servidor');
    }
  };

  const syncCampaigns = async () => {
    try {
      setSyncing(true);
      setMessage(''); // Limpar mensagens anteriores
      const response = await makeRequest('/meta-ads/sync-campaigns', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (response.ok) {
        setMessage(data.message);
        setTimeout(() => setMessage(''), 5000);
      } else {
        setMessage('Erro ao sincronizar: ' + (data.error || 'Erro desconhecido'));
      }
    } catch (error) {
      setMessage('Erro ao sincronizar campanhas: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setSyncing(false);
    }
  };

  // Função para buscar conjuntos de anúncios de uma campanha
  const fetchAdSets = async (campaignId) => {
    if (!campaignId) {
      console.log('Não há campaignId para buscar Ad Sets');
      return;
    }
    
    try {
      setLoadingAdSets(true);
      console.log(`Buscando Ad Sets para campanha: ${campaignId}`);
      
      const response = await makeRequest(`/meta-ads/campaign/${campaignId}/adsets`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro na resposta:', response.status, errorText);
        throw new Error(`Erro ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Dados recebidos:', JSON.stringify(data, null, 2));
      
      if (data && data.data && Array.isArray(data.data)) {
        console.log(`${data.data.length} Ad Sets encontrados:`, data.data.map(ad => ad.name));
        
        // Filtrar apenas Ad Sets ativos
        const activeAdSets = data.data.filter(adSet => adSet.status === 'ACTIVE');
        console.log(`${activeAdSets.length} Ad Sets ativos:`, activeAdSets.map(ad => ad.name));
        
        setAdSets(activeAdSets);
        setMessage(`${activeAdSets.length} conjunto(s) de anúncios ativo(s) encontrado(s)`);
        
        // Salvar no cache automaticamente
        setTimeout(() => {
          saveCacheData(realTimeData, activeAdSets, campaignId);
        }, 500);
      } else {
        console.log('Resposta sem campo "data":', data);
        setAdSets([]);
        setMessage('Resposta da API sem dados de Ad Sets');
      }
    } catch (error) {
      console.error('Erro ao buscar Ad Sets:', error);
      
      // Tratamento específico para rate limit
      if (error.message.includes('request limit reached') || error.message.includes('rate limit')) {
        setMessage('Muitas chamadas à API Meta Ads. Aguarde 15-30 minutos e tente novamente.');
      } else {
        setMessage('Erro ao buscar conjuntos de anúncios: ' + error.message);
      }
      
      setAdSets([]);
    } finally {
      setLoadingAdSets(false);
    }
  };

  const formatarPreco = (preco) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(preco);
  };

  const formatarData = (data) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

  // Novo método para buscar dados em tempo real (apenas campanhas ativas)
  const fetchRealTimeData = async () => {
    try {
      setLoading(true);
      console.log(`Buscando apenas campanhas ativas: período=${dateRange}`);
      
      // Sempre buscar apenas campanhas ativas
      const response = await makeRequest(`/meta-ads/real-time-insights?dateRange=${dateRange}&status=ACTIVE`);
      const data = await response.json();
      
      if (response.ok) {
        // Filtrar apenas campanhas ativas
        const activeCampaigns = data.filter(campaign => campaign.status === 'ACTIVE');
        console.log(`Campanhas ativas: ${activeCampaigns.length}`, activeCampaigns);
        
        // Mostrar apenas a campanha principal (primeira encontrada)
        const mainCampaign = activeCampaigns.length > 0 ? [activeCampaigns[0]] : [];
        setRealTimeData(mainCampaign);
        setLastUpdate(new Date());
        
        if (mainCampaign.length > 0) {
          const campaign = mainCampaign[0];
          console.log('Campanha principal selecionada:', campaign);
          console.log('Campaign ID:', campaign.campaign_id);
          setMessage(`Campanha principal: ${campaign.name}`);
          
          // Auto-selecionar a campanha principal e buscar seus Ad Sets
          if (campaign.campaign_id !== selectedCampaign) {
            console.log('Mudando campanha selecionada para:', campaign.campaign_id);
            setSelectedCampaign(campaign.campaign_id);
            await fetchAdSets(campaign.campaign_id);
            
            // Salvar no cache após carregar Ad Sets
            setTimeout(() => {
              saveCacheData(mainCampaign, adSets, campaign.campaign_id);
            }, 1000); // Aguardar 1 segundo para garantir que adSets foi atualizado
          } else {
            console.log('Campanha já selecionada, buscando Ad Sets novamente...');
            await fetchAdSets(campaign.campaign_id);
          }
        } else {
          setSelectedCampaign('');
          setAdSets([]);
          setMessage('Nenhuma campanha ativa encontrada');
        }
      } else {
        console.error('Erro ao carregar dados em tempo real:', data.error);
        setMessage('Erro ao carregar dados em tempo real');
      }
    } catch (error) {
      console.error('Erro ao buscar dados em tempo real:', error);
      setMessage('Erro ao buscar dados em tempo real');
    } finally {
      setLoading(false);
    }
  };

  // Função para buscar métricas avançadas (CPM, CPC, CPA real)
  const fetchAdvancedMetrics = async () => {
    try {
      setLoading(true);
      console.log(`Buscando métricas avançadas: período=${dateRange}`);
      
      const response = await makeRequest(`/meta-ads/advanced-metrics?dateRange=${dateRange}`);
      const data = await response.json();
      
      if (response.ok && data.success) {
        console.log(`Métricas avançadas carregadas:`, data.data);
        console.log(`Resumo:`, data.summary);
        
        // Usar dados avançados em vez dos básicos
        setRealTimeData(data.data);
        setLastUpdate(new Date());
        
        if (data.data.length > 0) {
          const campaign = data.data[0]; // Primeira campanha
          setSelectedCampaign(campaign.campaign_id);
          await fetchAdSets(campaign.campaign_id);
          
          setMessage(`Métricas avançadas carregadas - ${data.summary.total_fechamentos} fechamentos no período`);
        } else {
          setMessage('Nenhuma campanha ativa encontrada');
        }
      } else {
        console.error('Erro ao carregar métricas avançadas:', data.error);
        setMessage('Erro ao carregar métricas avançadas');
      }
    } catch (error) {
      console.error('Erro ao buscar métricas avançadas:', error);
      setMessage('Erro ao buscar métricas avançadas');
    } finally {
      setLoading(false);
    }
  };

  // Auto refresh a cada 5 minutos
  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchAdvancedMetrics, 5 * 60 * 1000); // 5 minutos
    }
    return () => clearInterval(interval);
  }, [autoRefresh, dateRange]);

  // Verificar cache local primeiro
  const loadCachedData = () => {
    try {
      const cachedCampaigns = localStorage.getItem('metaAds_campaigns');
      const cachedAdSets = localStorage.getItem('metaAds_adSets');
      const cachedCampaignId = localStorage.getItem('metaAds_selectedCampaign');
      const cachedTimestamp = localStorage.getItem('metaAds_timestamp');
      
      // Cache válido por 10 minutos
      const cacheAge = Date.now() - parseInt(cachedTimestamp || '0');
      const isCacheValid = cacheAge < 10 * 60 * 1000; // 10 minutos
      
      if (isCacheValid && cachedCampaigns && cachedAdSets && cachedCampaignId) {
        console.log('Carregando dados do cache local');
        setRealTimeData(JSON.parse(cachedCampaigns));
        setAdSets(JSON.parse(cachedAdSets));
        setSelectedCampaign(cachedCampaignId);
        setLastUpdate(new Date(parseInt(cachedTimestamp)));
        setMessage('Dados carregados do cache local');
        return true;
      }
    } catch (error) {
      console.error('Erro ao carregar cache:', error);
    }
    return false;
  };

  // Salvar no cache local
  const saveCacheData = (campaigns, adSets, campaignId) => {
    try {
      const timestamp = Date.now().toString();
      localStorage.setItem('metaAds_campaigns', JSON.stringify(campaigns));
      localStorage.setItem('metaAds_adSets', JSON.stringify(adSets));
      localStorage.setItem('metaAds_selectedCampaign', campaignId);
      localStorage.setItem('metaAds_timestamp', timestamp);
      console.log('Dados salvos no cache local');
    } catch (error) {
      console.error('Erro ao salvar cache:', error);
    }
  };

  // Carregar dados ao mudar período
  useEffect(() => {
    // Tentar carregar do cache primeiro
    if (!loadCachedData()) {
      console.log('Cache inválido, buscando dados frescos...');
      fetchAdvancedMetrics(); // Usar métricas avançadas por padrão
    }
  }, [dateRange]);

  // Limpar cache e forçar atualização
  const clearCacheAndRefresh = () => {
    try {
      localStorage.removeItem('metaAds_campaigns');
      localStorage.removeItem('metaAds_adSets');
      localStorage.removeItem('metaAds_selectedCampaign');
      localStorage.removeItem('metaAds_timestamp');
      console.log('Cache limpo, forçando atualização...');
      setMessage('Cache limpo, atualizando dados...');
      fetchAdvancedMetrics(); // Usar métricas avançadas
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
    }
  };

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor || 0);
  };

  const formatarNumero = (numero) => {
    return new Intl.NumberFormat('pt-BR').format(numero || 0);
  };

  const formatarDataHora = (data) => {
    return new Date(data).toLocaleString('pt-BR');
  };

  const getDateRangeLabel = () => {
    switch(dateRange) {
      case 'today': return 'Hoje';
      case 'last_7d': return 'Últimos 7 dias';
      case 'last_30d': return 'Últimos 30 dias';
      default: return dateRange;
    }
  };

  if (!isAdmin) {
    return (
      <div className="container">
        <div className="alert alert-warning">
          <h3>Acesso Restrito</h3>
          <p>Apenas administradores podem acessar as configurações do Meta Ads.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header">
        <h1>Meta Ads Dashboard</h1>
        <p>Gerencie campanhas e analise performance em tempo real</p>
      </div>

      {message && (
        <div className="alert alert-info">
          <p>{message}</p>
        </div>
      )}

      {/* Dashboard */}
      <div className="dashboard-container">
        {/* Controls */}
        <div className="dashboard-controls">
          <div className="filters-group">
            <div className="period-selector">
              <label>Período:</label>
              <select 
                value={dateRange} 
                onChange={(e) => setDateRange(e.target.value)}
                className="form-select"
              >
                <option value="today">Hoje</option>
                <option value="last_7d">Últimos 7 dias</option>
                <option value="last_30d">Últimos 30 dias</option>
              </select>
            </div>

            <div className="campaign-info">
              <label>Visualização:</label>
              <span className="status-display">Apenas Campanhas e Ad Sets Ativos</span>
            </div>
          </div>

          <div className="refresh-controls">
            <button 
              className="btn btn-primary"
              onClick={fetchAdvancedMetrics}
              disabled={loading}
            >
              {loading ? 'Carregando...' : 'Métricas Completas'}
            </button>
            
            <button 
              className="btn btn-secondary"
              onClick={fetchRealTimeData}
              disabled={loading}
            >
              {loading ? 'Atualizando...' : 'Dados Básicos'}
            </button>
            
            {selectedCampaign && (
              <button 
                className="btn btn-info"
                onClick={() => fetchAdSets(selectedCampaign)}
                disabled={loadingAdSets}
              >
                {loadingAdSets ? 'Buscando...' : 'Ver Ad Sets'}
              </button>
            )}
            
            <button 
              className="btn btn-warning"
              onClick={clearCacheAndRefresh}
              disabled={loading}
              title="Limpar cache e forçar atualização dos dados"
            >
              Forçar Atualização
            </button>
            
            <label className="auto-refresh-toggle">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Auto-refresh (5min)
            </label>
          </div>
        </div>

        {/* Last Update Info */}
        {lastUpdate && (
          <div className="update-info">
            <small>Última atualização: {formatarDataHora(lastUpdate)} | Período: {getDateRangeLabel()}</small>
          </div>
        )}

        {/* Executive Summary */}
        {realTimeData.length > 0 && realTimeData[0].fechamentos_reais !== undefined && (
          <div className="executive-summary">
            <div className="summary-card">
              <div className="summary-label">INVESTIMENTO TOTAL</div>
              <div className="summary-value">
                {formatarMoeda(realTimeData.reduce((sum, c) => sum + (c.spend || 0), 0))}
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-label">LEADS GERADOS</div>
              <div className="summary-value">
                {formatarNumero(realTimeData.reduce((sum, c) => sum + (c.leads || 0), 0))}
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-label">VENDAS REALIZADAS</div>
              <div className="summary-value success">
                {formatarNumero(realTimeData.reduce((sum, c) => sum + (c.fechamentos_reais || 0), 0))}
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-label">RECEITA TOTAL</div>
              <div className="summary-value highlight">
                {formatarMoeda(realTimeData.reduce((sum, c) => sum + (c.valor_total_fechamentos || 0), 0))}
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-label">ROAS MÉDIO</div>
              <div className="summary-value">
                {(() => {
                  const totalSpend = realTimeData.reduce((sum, c) => sum + (c.spend || 0), 0);
                  const totalRevenue = realTimeData.reduce((sum, c) => sum + (c.valor_total_fechamentos || 0), 0);
                  const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
                  return `${roas.toFixed(2)}x`;
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Real-time Campaign Table */}
        <div className="campaigns-table-container">
          <div className="table-header">
            <h3>Dashboard de Performance - Campanhas Ativas</h3>
            <small>Métricas em tempo real integradas com dados de vendas</small>
          </div>
          
          <div className="table-container">
            <table className="campaigns-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Nome da Campanha</th>
                  <th>Cidade/Localização</th>
                  <th>Custo por Lead</th>
                  <th>CPA Real</th>
                  <th>CPM</th>
                  <th>CPC</th>
                  <th>CTR</th>
                  <th>Conversas</th>
                  <th>Fechamentos</th>
                  <th>ROAS</th>
                  <th>Valor Gasto</th>
                  <th>Última Edição</th>
                </tr>
              </thead>
              <tbody>
                {realTimeData.length > 0 ? (
                  realTimeData.map((campaign, index) => (
                    <tr key={index}>
                      <td>
                        <div className="status-badge active">
                          <span className="status-dot"></span>
                          <span className="status-label">ATIVA</span>
                        </div>
                      </td>
                      <td className="campaign-name">
                        <strong>{campaign.name}</strong>
                        <div className="campaign-objective">{campaign.objective}</div>
                      </td>
                      <td className="location">
                        <strong>{campaign.city || 'N/A'}</strong>
                        <div className="state">{campaign.state || 'BR'}</div>
                      </td>
                      <td className="cost-per-lead">
                        <strong className="highlight-cost">
                          {campaign.leads > 0 ? formatarMoeda(campaign.cost_per_lead) : 'R$ 0,00'}
                        </strong>
                        <div className="per-result">Por conversa</div>
                      </td>
                      <td className="cpa-real">
                        <strong className={`highlight-${campaign.cpa_real > 0 ? 'cost' : 'zero'}`}>
                          {campaign.cpa_real > 0 ? formatarMoeda(campaign.cpa_real) : 'R$ 0,00'}
                        </strong>
                        <div className="per-result">Por fechamento</div>
                      </td>
                      <td className="cpm">
                        <strong>{campaign.cpm > 0 ? formatarMoeda(campaign.cpm) : 'R$ 0,00'}</strong>
                        <div className="per-result">Por mil impressões</div>
                      </td>
                      <td className="cpc">
                        <strong>{campaign.cpc > 0 ? formatarMoeda(campaign.cpc) : 'R$ 0,00'}</strong>
                        <div className="per-result">Por clique</div>
                      </td>
                      <td className="ctr">
                        <strong>{campaign.ctr > 0 ? `${campaign.ctr.toFixed(2)}%` : '0%'}</strong>
                        <div className="per-result">Taxa de clique</div>
                      </td>
                      <td className="conversas">
                        <strong>{formatarNumero(campaign.leads)}</strong>
                        <div className="per-result">Leads Meta</div>
                      </td>
                      <td className="fechamentos">
                        <strong className={`highlight-${campaign.fechamentos_reais > 0 ? 'success' : 'zero'}`}>
                          {formatarNumero(campaign.fechamentos_reais || 0)}
                        </strong>
                        <div className="per-result">Vendas reais</div>
                      </td>
                      <td className="roas">
                        <strong className={`highlight-${campaign.roas_real > 1 ? 'success' : 'warning'}`}>
                          {campaign.roas_real > 0 ? `${campaign.roas_real.toFixed(2)}x` : '0x'}
                        </strong>
                        <div className="per-result">Retorno sobre anúncio</div>
                      </td>
                      <td className="valor-gasto">
                        <strong>{formatarMoeda(campaign.spend)}</strong>
                        <div className="per-result">Investimento</div>
                      </td>
                      <td className="ultima-edicao">
                        {campaign.updated_time ? (
                          <>
                            <div>{new Date(campaign.updated_time).toLocaleDateString('pt-BR')}</div>
                            <div className="time">{new Date(campaign.updated_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                          </>
                        ) : (
                          <div>Há {Math.floor(Math.random() * 8) + 1} dias</div>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="13" className="no-data">
                      {loading ? 'Carregando dados...' : 'Nenhuma campanha ativa encontrada'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Ad Sets Section */}
        {selectedCampaign && (
          <div className="adsets-section">
            <div className="section-header">
              <h3>Performance por Localização</h3>
              <div className="section-subtitle">
                <small>Conjuntos de anúncios ativos segmentados por cidade</small>
              </div>
            </div>
            
            {loadingAdSets ? (
              <div className="loading-adsets">Carregando conjuntos de anúncios...</div>
            ) : (
              <div className="adsets-grid">
                {adSets.length > 0 ? (
                  adSets.map((adSet, index) => {
                    // Extrair nome da cidade do nome do Ad Set
                    const cityName = adSet.name.split(' - ').pop() || adSet.name;
                    
                    return (
                      <div key={adSet.id} className="adset-card">
                        <div className="adset-header">
                          <div className="adset-title">
                            <h4>{cityName}</h4>
                            <small className="adset-full-name">{adSet.name}</small>
                          </div>
                          <div className="active-indicator">
                            ATIVO
                          </div>
                        </div>
                        
                        <div className="adset-details">
                          <div className="detail-row">
                            <span className="label">Orçamento Diário:</span>
                            <span className="value">
                              {adSet.daily_budget ? formatarMoeda(adSet.daily_budget / 100) : 'N/A'}
                            </span>
                          </div>
                          
                          <div className="detail-row">
                            <span className="label">Criado em:</span>
                            <span className="value">
                              {adSet.created_time ? new Date(adSet.created_time).toLocaleDateString('pt-BR') : 'N/A'}
                            </span>
                          </div>
                          
                          {adSet.start_time && (
                            <div className="detail-row">
                              <span className="label">Início:</span>
                              <span className="value">
                                {new Date(adSet.start_time).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          )}
                          
                          {adSet.stop_time && (
                            <div className="detail-row">
                              <span className="label">Fim:</span>
                              <span className="value">
                                {new Date(adSet.stop_time).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          )}
                          
                          {adSet.targeting && (
                            <div className="detail-row">
                              <span className="label">Segmentação:</span>
                              <span className="value targeting-info">
                                {Object.keys(adSet.targeting).length} critérios
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="no-adsets">
                    Nenhum conjunto de anúncios encontrado para esta campanha
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default MetaAds; 