import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const MetaAds = () => {
  const { makeRequest, user } = useAuth();
  const [pricing, setPricing] = useState([]);
  const [leads, setLeads] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingPricing, setEditingPricing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('pricing');
  const [filtroCidade, setFiltroCidade] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [dateRange, setDateRange] = useState('last_30d');
  const [apiStatus, setApiStatus] = useState(null);
  const [formData, setFormData] = useState({
    cidade: '',
    estado: '',
    preco_por_lead: '',
    campanha_id: '',
    campanha_nome: '',
    periodo_inicio: '',
    periodo_fim: '',
    observacoes: '',
    status: 'ativo'
  });

  // Verificar se usuário é admin
  const isAdmin = user?.tipo === 'admin';

  useEffect(() => {
    if (activeTab === 'pricing') {
      fetchPricing();
      fetchCampaigns();
    } else {
      fetchLeads();
    }
  }, [activeTab]);

  useEffect(() => {
    testApiConnection();
  }, []);

  const fetchPricing = async () => {
    try {
      const params = new URLSearchParams();
      if (filtroCidade) params.append('cidade', filtroCidade);
      if (filtroEstado) params.append('estado', filtroEstado);
      if (filtroStatus) params.append('status', filtroStatus);

      const response = await makeRequest(`/meta-ads/pricing?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        setPricing(data);
      } else {
        console.error('Erro ao carregar preços:', data.error);
        setMessage('Erro ao carregar preços: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao carregar preços:', error);
      setMessage('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeads = async () => {
    try {
      const response = await makeRequest('/meta-ads/leads');
      const data = await response.json();
      
      if (response.ok) {
        setLeads(data);
      } else {
        console.error('Erro ao carregar leads:', data.error);
        setMessage('Erro ao carregar leads: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao carregar leads:', error);
      setMessage('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

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

  const testApiConnection = async () => {
    try {
      const response = await makeRequest('/meta-ads/test-connection');
      const data = await response.json();
      setApiStatus(data);
    } catch (error) {
      setApiStatus({ 
        success: false, 
        message: 'Erro ao testar conexão',
        error: error.message || 'Erro desconhecido'
      });
    }
  };

  const syncCampaigns = async () => {
    try {
      setLoading(true);
      const response = await makeRequest('/meta-ads/sync-campaigns', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (response.ok) {
        setMessage(data.message);
        fetchPricing();
        setTimeout(() => setMessage(''), 5000);
      } else {
        setMessage('Erro ao sincronizar: ' + (data.error || 'Erro desconhecido'));
      }
    } catch (error) {
      setMessage('Erro ao sincronizar campanhas: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let response;
      if (editingPricing) {
        response = await makeRequest(`/meta-ads/pricing/${editingPricing.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
      } else {
        response = await makeRequest('/meta-ads/pricing', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
      }

      const data = await response.json();
      
      if (response.ok) {
        setMessage(editingPricing ? 'Preço atualizado com sucesso!' : 'Preço cadastrado com sucesso!');
        setShowModal(false);
        setEditingPricing(null);
        setFormData({
          cidade: '',
          estado: '',
          preco_por_lead: '',
          campanha_id: '',
          campanha_nome: '',
          periodo_inicio: '',
          periodo_fim: '',
          observacoes: '',
          status: 'ativo'
        });
        fetchPricing();
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Erro ao salvar preço: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao salvar preço:', error);
      setMessage('Erro ao salvar preço');
    }
  };

  const handleEdit = (pricing) => {
    setEditingPricing(pricing);
    setFormData({
      cidade: pricing.cidade || '',
      estado: pricing.estado || '',
      preco_por_lead: pricing.preco_por_lead || '',
      campanha_id: pricing.campanha_id || '',
      campanha_nome: pricing.campanha_nome || '',
      periodo_inicio: pricing.periodo_inicio || '',
      periodo_fim: pricing.periodo_fim || '',
      observacoes: pricing.observacoes || '',
      status: pricing.status || 'ativo'
    });
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
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

  const estados = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ];

  if (!isAdmin) {
    return (
      <div className="container">
        <div className="alert alert-warning">
          <h3>🔒 Acesso Restrito</h3>
          <p>Apenas administradores podem acessar as configurações do Meta Ads.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header">
        <h1>Meta Ads - Preços por Lead</h1>
        <p>Gerencie os preços por lead do Meta Ads por cidade</p>
      </div>

      {message && (
        <div className={`alert ${message.includes('sucesso') ? 'alert-success' : 'alert-error'}`}>
          {typeof message === 'string' ? message : JSON.stringify(message)}
        </div>
      )}

      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'pricing' ? 'active' : ''}`}
          onClick={() => setActiveTab('pricing')}
        >
          Preços por Cidade
        </button>
        <button 
          className={`tab ${activeTab === 'leads' ? 'active' : ''}`}
          onClick={() => setActiveTab('leads')}
        >
          Leads do Meta Ads
        </button>
        <button 
          className={`tab ${activeTab === 'api' ? 'active' : ''}`}
          onClick={() => setActiveTab('api')}
        >
          🔗 API Integration
        </button>
      </div>

      {activeTab === 'pricing' && (
        <>
          <div className="actions">
            <button 
              className="btn btn-primary"
              onClick={() => setShowModal(true)}
            >
              ➕ Adicionar Preço
            </button>
          </div>

          <div className="filters">
            <input
              type="text"
              placeholder="Filtrar por cidade..."
              value={filtroCidade}
              onChange={(e) => setFiltroCidade(e.target.value)}
              className="filter-input"
            />
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="filter-select"
            >
              <option value="">Todos os estados</option>
              {estados.map(estado => (
                <option key={estado} value={estado}>{estado}</option>
              ))}
            </select>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="filter-select"
            >
              <option value="">Todos os status</option>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
            <button 
              className="btn btn-secondary"
              onClick={fetchPricing}
            >
              🔍 Filtrar
            </button>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Cidade</th>
                  <th>Estado</th>
                  <th>Preço por Lead</th>
                  <th>Campanha</th>
                  <th>Período</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {pricing.map(item => (
                  <tr key={item.id}>
                    <td>{item.cidade}</td>
                    <td>{item.estado}</td>
                    <td>
                      <span className="price">{formatarPreco(item.preco_por_lead)}</span>
                    </td>
                    <td>{item.campanha_nome || '-'}</td>
                    <td>
                      {item.periodo_inicio && item.periodo_fim ? (
                        `${formatarData(item.periodo_inicio)} - ${formatarData(item.periodo_fim)}`
                      ) : '-'}
                    </td>
                    <td>
                      <span className={`badge badge-${item.status === 'ativo' ? 'success' : 'warning'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="btn btn-sm btn-secondary"
                        onClick={() => handleEdit(item)}
                      >
                        ✏️ Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'leads' && (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Campanha</th>
                <th>Custo do Lead</th>
                <th>Cidade</th>
                <th>Data</th>
                <th>Fonte</th>
              </tr>
            </thead>
            <tbody>
              {leads.map(lead => (
                <tr key={lead.id}>
                  <td>
                    <div>
                      <strong>{lead.pacientes?.nome}</strong>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                        {lead.pacientes?.telefone}
                      </div>
                    </div>
                  </td>
                  <td>{lead.campanha_nome || '-'}</td>
                  <td>
                    {lead.custo_lead ? (
                      <span className="price">{formatarPreco(lead.custo_lead)}</span>
                    ) : '-'}
                  </td>
                  <td>{lead.cidade_lead || '-'}</td>
                  <td>{lead.data_lead ? formatarData(lead.data_lead) : '-'}</td>
                  <td>
                    <span className="badge badge-info">{lead.fonte_lead}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'api' && (
        <div className="api-integration">
          <div className="api-status">
            <h3>🔗 Status da API</h3>
            {apiStatus && (
              <div className={`status-card ${apiStatus.success ? 'success' : 'error'}`}>
                <div className="status-icon">
                  {apiStatus.success ? '✅' : '❌'}
                </div>
                <div className="status-content">
                  <h4>{apiStatus.message}</h4>
                  {apiStatus.campaignsCount && (
                    <p>Campanhas encontradas: {apiStatus.campaignsCount}</p>
                  )}
                  {apiStatus.error && (
                    <p className="error-details">
                      {typeof apiStatus.error === 'string' 
                        ? apiStatus.error 
                        : JSON.stringify(apiStatus.error, null, 2)
                      }
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="api-actions">
            <h3>🔄 Ações da API</h3>
            
            <div className="action-buttons">
              <button 
                className="btn btn-primary"
                onClick={testApiConnection}
                disabled={loading}
              >
                🔍 Testar Conexão
              </button>
              
              <button 
                className="btn btn-secondary"
                onClick={syncCampaigns}
                disabled={loading}
              >
                🔄 Sincronizar Campanhas
              </button>
            </div>

            {campaigns.length > 0 && (
              <div className="campaigns-list">
                <h4>📊 Campanhas Disponíveis</h4>
                <div className="campaigns-grid">
                  {campaigns.map(campaign => (
                    <div key={campaign.id} className="campaign-card">
                      <div className="campaign-header">
                        <h5>{campaign.name}</h5>
                        <span className={`status-badge ${campaign.status.toLowerCase()}`}>
                          {campaign.status}
                        </span>
                      </div>
                      <div className="campaign-details">
                        <p><strong>ID:</strong> {campaign.id}</p>
                        <p><strong>Objetivo:</strong> {campaign.objective}</p>
                        <p><strong>Criada:</strong> {formatarData(campaign.created_time)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal para adicionar/editar preço */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{editingPricing ? 'Editar Preço' : 'Adicionar Preço'}</h3>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowModal(false);
                  setEditingPricing(null);
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body">
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Cidade *</label>
                  <input
                    type="text"
                    name="cidade"
                    className="form-input"
                    value={formData.cidade}
                    onChange={handleInputChange}
                    placeholder="São Paulo"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Estado *</label>
                  <select
                    name="estado"
                    className="form-select"
                    value={formData.estado}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Selecione</option>
                    {estados.map(estado => (
                      <option key={estado} value={estado}>{estado}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Preço por Lead (R$) *</label>
                <input
                  type="number"
                  name="preco_por_lead"
                  className="form-input"
                  value={formData.preco_por_lead}
                  onChange={handleInputChange}
                  placeholder="45.00"
                  step="0.01"
                  min="0"
                  required
                />
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">ID da Campanha</label>
                  <input
                    type="text"
                    name="campanha_id"
                    className="form-input"
                    value={formData.campanha_id}
                    onChange={handleInputChange}
                    placeholder="123456789"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Nome da Campanha</label>
                  <input
                    type="text"
                    name="campanha_nome"
                    className="form-input"
                    value={formData.campanha_nome}
                    onChange={handleInputChange}
                    placeholder="Campanha SP - Estético"
                  />
                </div>
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Data Início</label>
                  <input
                    type="date"
                    name="periodo_inicio"
                    className="form-input"
                    value={formData.periodo_inicio}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Data Fim</label>
                  <input
                    type="date"
                    name="periodo_fim"
                    className="form-input"
                    value={formData.periodo_fim}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  name="status"
                  className="form-select"
                  value={formData.status}
                  onChange={handleInputChange}
                >
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Observações</label>
                <textarea
                  name="observacoes"
                  className="form-textarea"
                  value={formData.observacoes}
                  onChange={handleInputChange}
                  placeholder="Observações sobre o preço..."
                  rows="3"
                />
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowModal(false);
                    setEditingPricing(null);
                  }}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingPricing ? 'Atualizar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .container {
          padding: 20px;
        }

        .header {
          margin-bottom: 30px;
        }

        .header h1 {
          color: #2d3748;
          margin-bottom: 10px;
        }

        .header p {
          color: #718096;
        }

        .tabs {
          display: flex;
          margin-bottom: 20px;
          border-bottom: 2px solid #e2e8f0;
        }

        .tab {
          padding: 12px 24px;
          background: none;
          border: none;
          cursor: pointer;
          font-weight: 600;
          color: #718096;
          border-bottom: 2px solid transparent;
          transition: all 0.3s ease;
        }

        .tab.active {
          color: #667eea;
          border-bottom-color: #667eea;
        }

        .tab:hover {
          color: #667eea;
        }

        .actions {
          margin-bottom: 20px;
        }

        .filters {
          display: flex;
          gap: 15px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .filter-input,
        .filter-select {
          padding: 8px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 14px;
        }

        .table-container {
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .table {
          width: 100%;
          border-collapse: collapse;
        }

        .table th,
        .table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #e2e8f0;
        }

        .table th {
          background: #f7fafc;
          font-weight: 600;
          color: #4a5568;
        }

        .price {
          font-weight: 600;
          color: #059669;
        }

        .badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }

        .badge-success {
          background: #d1fae5;
          color: #065f46;
        }

        .badge-warning {
          background: #fef3c7;
          color: #92400e;
        }

        .badge-info {
          background: #dbeafe;
          color: #1e40af;
        }

        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.3s ease;
        }

        .btn-primary {
          background: #667eea;
          color: white;
        }

        .btn-primary:hover {
          background: #5a67d8;
        }

        .btn-secondary {
          background: #718096;
          color: white;
        }

        .btn-secondary:hover {
          background: #4a5568;
        }

        .btn-sm {
          padding: 4px 8px;
          font-size: 12px;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal {
          background: white;
          border-radius: 8px;
          width: 90%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header {
          padding: 20px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #718096;
        }

        .modal-body {
          padding: 20px;
        }

        .grid {
          display: grid;
          gap: 15px;
        }

        .grid-2 {
          grid-template-columns: 1fr 1fr;
        }

        .form-group {
          margin-bottom: 15px;
        }

        .form-label {
          display: block;
          margin-bottom: 5px;
          font-weight: 600;
          color: #4a5568;
        }

        .form-input,
        .form-select,
        .form-textarea {
          width: 100%;
          padding: 10px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 14px;
        }

        .form-textarea {
          resize: vertical;
          min-height: 80px;
        }

        .modal-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          margin-top: 20px;
        }

        .alert {
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 20px;
        }

        .alert-success {
          background: #d1fae5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }

        .alert-error {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .alert-warning {
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #fde68a;
        }

        .api-integration {
          display: flex;
          flex-direction: column;
          gap: 30px;
        }

        .api-status {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .status-card {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 15px;
          border-radius: 8px;
          margin-top: 15px;
        }

        .status-card.success {
          background: #d1fae5;
          border: 1px solid #a7f3d0;
        }

        .status-card.error {
          background: #fee2e2;
          border: 1px solid #fecaca;
        }

        .status-icon {
          font-size: 24px;
        }

        .status-content h4 {
          margin: 0 0 5px 0;
          color: #1f2937;
        }

        .status-content p {
          margin: 0;
          color: #6b7280;
          font-size: 14px;
        }

        .error-details {
          color: #dc2626 !important;
          font-family: monospace;
          font-size: 12px;
          margin-top: 10px;
        }

        .api-actions {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .action-buttons {
          display: flex;
          gap: 15px;
          margin-top: 15px;
          flex-wrap: wrap;
        }

        .campaigns-list {
          margin-top: 30px;
        }

        .campaigns-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
          margin-top: 15px;
        }

        .campaign-card {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 15px;
        }

        .campaign-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .campaign-header h5 {
          margin: 0;
          color: #1f2937;
        }

        .status-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }

        .status-badge.active {
          background: #d1fae5;
          color: #065f46;
        }

        .status-badge.paused {
          background: #fef3c7;
          color: #92400e;
        }

        .campaign-details p {
          margin: 5px 0;
          font-size: 14px;
          color: #6b7280;
        }

        @media (max-width: 768px) {
          .grid-2 {
            grid-template-columns: 1fr;
          }

          .filters {
            flex-direction: column;
          }

          .table {
            font-size: 14px;
          }

          .table th,
          .table td {
            padding: 8px;
          }

          .action-buttons {
            flex-direction: column;
          }

          .campaigns-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default MetaAds; 