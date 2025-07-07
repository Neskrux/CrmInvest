import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Pacientes = () => {
  const { makeRequest } = useAuth();
  const [pacientes, setPacientes] = useState([]);
  const [novosLeads, setNovosLeads] = useState([]);
  const [consultores, setConsultores] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingPaciente, setEditingPaciente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('pacientes');
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    cpf: '',
    tipo_tratamento: '',
    status: 'lead',
    observacoes: '',
    consultor_id: ''
  });

  // Status disponíveis para o pipeline
  const statusOptions = [
    { value: 'lead', label: 'Lead', color: '#f59e0b' },
    { value: 'agendado', label: 'Agendado', color: '#3b82f6' },
    { value: 'compareceu', label: 'Compareceu', color: '#10b981' },
    { value: 'fechado', label: 'Fechado', color: '#059669' },
    { value: 'nao_fechou', label: 'Não Fechou', color: '#dc2626' },
    { value: 'nao_compareceu', label: 'Não Compareceu', color: '#ef4444' },
    { value: 'reagendado', label: 'Reagendado', color: '#8b5cf6' }
  ];

  useEffect(() => {
    fetchPacientes();
    fetchConsultores();
    if (activeTab === 'novos-leads') {
      fetchNovosLeads();
    }
  }, [activeTab]);

  const fetchPacientes = async () => {
    try {
      const response = await makeRequest('/pacientes');
      const data = await response.json();
      
      if (response.ok) {
        setPacientes(data);
      } else {
        console.error('Erro ao carregar pacientes:', data.error);
        setMessage('Erro ao carregar pacientes: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error);
      setMessage('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const fetchConsultores = async () => {
    try {
      const response = await makeRequest('/consultores');
      const data = await response.json();
      
      if (response.ok) {
        setConsultores(data);
      } else {
        console.error('Erro ao carregar consultores:', data.error);
      }
    } catch (error) {
      console.error('Erro ao carregar consultores:', error);
    }
  };

  const fetchNovosLeads = async () => {
    try {
      const response = await makeRequest('/novos-leads');
      const data = await response.json();
      
      if (response.ok) {
        setNovosLeads(data);
      } else {
        console.error('Erro ao carregar novos leads:', data.error);
        setMessage('Erro ao carregar novos leads: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao carregar novos leads:', error);
      setMessage('Erro ao conectar com o servidor');
    }
  };

  const pegarLead = async (leadId) => {
    try {
      const response = await makeRequest(`/novos-leads/${leadId}/pegar`, {
        method: 'PUT'
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage('Lead atribuído com sucesso!');
        fetchNovosLeads();
        fetchPacientes();
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Erro ao pegar lead: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao pegar lead:', error);
      setMessage('Erro ao pegar lead');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let response;
      if (editingPaciente) {
        response = await makeRequest(`/pacientes/${editingPaciente.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
      } else {
        response = await makeRequest('/pacientes', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
      }

      const data = await response.json();
      
      if (response.ok) {
        setMessage(editingPaciente ? 'Paciente atualizado com sucesso!' : 'Paciente cadastrado com sucesso!');
        setShowModal(false);
        setEditingPaciente(null);
        setFormData({
          nome: '',
          telefone: '',
          cpf: '',
          tipo_tratamento: '',
          status: 'lead',
          observacoes: '',
          consultor_id: ''
        });
        fetchPacientes();
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Erro ao salvar paciente: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao salvar paciente:', error);
      setMessage('Erro ao salvar paciente');
    }
  };

  const handleEdit = (paciente) => {
    setEditingPaciente(paciente);
    setFormData({
      nome: paciente.nome || '',
      telefone: paciente.telefone || '',
      cpf: paciente.cpf || '',
      tipo_tratamento: paciente.tipo_tratamento || '',
      status: paciente.status || 'lead',
      observacoes: paciente.observacoes || '',
      consultor_id: paciente.consultor_id || ''
    });
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const updateStatus = async (pacienteId, newStatus) => {
    try {
      const response = await makeRequest(`/pacientes/${pacienteId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage('Status atualizado com sucesso!');
        fetchPacientes();
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Erro ao atualizar status: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      setMessage('Erro ao atualizar status');
    }
  };

  const getStatusInfo = (status) => {
    return statusOptions.find(option => option.value === status) || statusOptions[0];
  };

  const formatarData = (data) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

  const formatarTelefone = (telefone) => {
    if (!telefone) return '';
    const numbers = telefone.replace(/\D/g, '');
    if (numbers.length === 11) {
      return `(${numbers.substring(0, 2)}) ${numbers.substring(2, 7)}-${numbers.substring(7)}`;
    }
    return telefone;
  };

  const formatarCPF = (cpf) => {
    if (!cpf) return '';
    const numbers = cpf.replace(/\D/g, '');
    if (numbers.length === 11) {
      return `${numbers.substring(0, 3)}.${numbers.substring(3, 6)}.${numbers.substring(6, 9)}-${numbers.substring(9)}`;
    }
    return cpf;
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      telefone: '',
      cpf: '',
      tipo_tratamento: '',
      status: 'lead',
      observacoes: '',
      consultor_id: ''
    });
    setEditingPaciente(null);
    setShowModal(false);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Gestão de Pacientes</h1>
        <p className="page-subtitle">Cadastre e acompanhe seus pacientes e leads</p>
      </div>

      {/* Navegação por abas */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'pacientes' ? 'active' : ''}`}
          onClick={() => setActiveTab('pacientes')}
        >
          Pacientes
        </button>
        <button
          className={`tab ${activeTab === 'novos-leads' ? 'active' : ''}`}
          onClick={() => setActiveTab('novos-leads')}
          style={{ position: 'relative' }}
        >
          Novos Leads
          {novosLeads.length > 0 && (
            <span className="tab-badge">{novosLeads.length}</span>
          )}
        </button>
      </div>

      {/* Conteúdo da aba Pacientes */}
      {activeTab === 'pacientes' && (
        <>
          {message && (
            <div className={`alert ${message.includes('sucesso') ? 'alert-success' : 'alert-error'}`}>
              {message}
            </div>
          )}

          {/* Resumo de Estatísticas */}
          <div className="stats-grid" style={{ marginBottom: '2rem' }}>
            <div className="stat-card">
              <div className="stat-label">Leads</div>
              <div className="stat-value">{pacientes.filter(p => p.status === 'lead').length}</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-label">Agendados</div>
              <div className="stat-value">{pacientes.filter(p => p.status === 'agendado').length}</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-label">Fechados</div>
              <div className="stat-value">{pacientes.filter(p => p.status === 'fechado').length}</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-label">Total</div>
              <div className="stat-value">{pacientes.length}</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-label">Taxa Conversão</div>
              <div className="stat-value">
                {pacientes.length > 0 
                  ? Math.round((pacientes.filter(p => p.status === 'fechado').length / pacientes.length) * 100)
                  : 0}%
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="card-title">Lista de Pacientes</h2>
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Novo Paciente
              </button>
            </div>

            {loading ? (
              <div className="loading">
                <div className="spinner"></div>
              </div>
            ) : pacientes.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#6b7280', padding: '3rem' }}>
                Nenhum paciente cadastrado ainda.
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Consultor</th>
                      <th>Telefone</th>
                      <th>CPF</th>
                      <th>Tipo</th>
                      <th>Status</th>
                      <th>Cadastrado</th>
                      <th style={{ width: '100px' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pacientes.map(paciente => {
                      const statusInfo = getStatusInfo(paciente.status);
                      return (
                        <tr key={paciente.id}>
                          <td>
                            <div>
                              <strong>{paciente.nome}</strong>
                              {paciente.observacoes && (
                                <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                                  {paciente.observacoes}
                                </div>
                              )}
                            </div>
                          </td>
                          <td>
                            {paciente.consultor_nome || (
                              <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>
                                Não atribuído
                              </span>
                            )}
                          </td>
                          <td>{formatarTelefone(paciente.telefone)}</td>
                          <td>{formatarCPF(paciente.cpf)}</td>
                          <td>
                            {paciente.tipo_tratamento && (
                              <span className={`badge badge-${paciente.tipo_tratamento === 'Estético' ? 'info' : 'warning'}`}>
                                {paciente.tipo_tratamento}
                              </span>
                            )}
                          </td>
                          <td>
                            <select
                              value={paciente.status}
                              onChange={(e) => updateStatus(paciente.id, e.target.value)}
                              style={{
                                padding: '0.25rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                backgroundColor: statusInfo.color + '10',
                                color: statusInfo.color,
                                border: `1px solid ${statusInfo.color}`,
                                cursor: 'pointer'
                              }}
                            >
                              {statusOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>{formatarData(paciente.created_at)}</td>
                          <td>
                            <button
                              onClick={() => handleEdit(paciente)}
                              className="btn btn-sm btn-secondary"
                            >
                              Editar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Conteúdo da aba Novos Leads */}
      {activeTab === 'novos-leads' && (
        <>
          {message && (
            <div className={`alert ${message.includes('sucesso') ? 'alert-success' : 'alert-error'}`}>
              {message}
            </div>
          )}

          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Novos Leads Disponíveis</h2>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                {novosLeads.length} lead(s) disponível(eis)
              </div>
            </div>

            {loading ? (
              <div className="loading">
                <div className="spinner"></div>
              </div>
            ) : novosLeads.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#6b7280', padding: '3rem' }}>
                Nenhum lead novo disponível no momento.
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Telefone</th>
                      <th>CPF</th>
                      <th>Tipo</th>
                      <th>Status</th>
                      <th>Cadastrado</th>
                      <th style={{ width: '120px' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {novosLeads.map(lead => {
                      const statusInfo = getStatusInfo(lead.status);
                      return (
                        <tr key={lead.id}>
                          <td>
                            <div>
                              <strong>{lead.nome}</strong>
                              {lead.observacoes && (
                                <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                                  {lead.observacoes}
                                </div>
                              )}
                            </div>
                          </td>
                          <td>{formatarTelefone(lead.telefone)}</td>
                          <td>{formatarCPF(lead.cpf)}</td>
                          <td>
                            {lead.tipo_tratamento && (
                              <span className={`badge badge-${lead.tipo_tratamento === 'Estético' ? 'info' : 'warning'}`}>
                                {lead.tipo_tratamento}
                              </span>
                            )}
                          </td>
                          <td>
                            <span className="badge badge-warning">
                              {statusInfo.label}
                            </span>
                          </td>
                          <td>{formatarData(lead.created_at)}</td>
                          <td>
                            <button
                              onClick={() => pegarLead(lead.id)}
                              className="btn btn-primary"
                            >
                              Pegar Lead
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal de Cadastro/Edição */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">
                {editingPaciente ? 'Editar Paciente' : 'Novo Paciente'}
              </h2>
              <button className="close-btn" onClick={resetForm}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-group">
                <label className="form-label">Nome Completo *</label>
                <input
                  type="text"
                  name="nome"
                  className="form-input"
                  value={formData.nome}
                  onChange={handleInputChange}
                  placeholder="Digite o nome do paciente"
                  required
                />
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Telefone</label>
                  <input
                    type="tel"
                    name="telefone"
                    className="form-input"
                    value={formData.telefone}
                    onChange={handleInputChange}
                    placeholder="(11) 99999-9999"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">CPF</label>
                  <input
                    type="text"
                    name="cpf"
                    className="form-input"
                    value={formData.cpf}
                    onChange={handleInputChange}
                    placeholder="000.000.000-00"
                  />
                </div>
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Tipo de Tratamento</label>
                  <select
                    name="tipo_tratamento"
                    className="form-select"
                    value={formData.tipo_tratamento}
                    onChange={handleInputChange}
                  >
                    <option value="">Selecione</option>
                    <option value="Estético">Estético</option>
                    <option value="Odontológico">Odontológico</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    name="status"
                    className="form-select"
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    {statusOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Consultor Responsável</label>
                <select
                  name="consultor_id"
                  className="form-select"
                  value={formData.consultor_id}
                  onChange={handleInputChange}
                >
                  <option value="">Selecione (opcional)</option>
                  {consultores.map(consultor => (
                    <option key={consultor.id} value={consultor.id}>
                      {consultor.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Observações</label>
                <textarea
                  name="observacoes"
                  className="form-textarea"
                  value={formData.observacoes}
                  onChange={handleInputChange}
                  placeholder="Informações adicionais..."
                  rows="3"
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingPaciente ? 'Atualizar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pacientes; 