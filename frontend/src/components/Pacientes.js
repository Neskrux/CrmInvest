import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Pacientes = () => {
  const { makeRequest } = useAuth();
  const [pacientes, setPacientes] = useState([]);
  const [consultores, setConsultores] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingPaciente, setEditingPaciente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
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
    { value: 'lead', label: '🔍 Lead', color: '#fbbf24' },
    { value: 'agendado', label: '📅 Agendado', color: '#60a5fa' },
    { value: 'compareceu', label: '✅ Compareceu', color: '#34d399' },
    { value: 'fechado', label: '💰 Fechado', color: '#10b981' },
    { value: 'nao_fechou', label: '❌ Não Fechou', color: '#ef4444' },
    { value: 'nao_compareceu', label: '🚫 Não Compareceu', color: '#f87171' },
    { value: 'reagendado', label: '🔄 Reagendado', color: '#a78bfa' }
  ];

  useEffect(() => {
    fetchPacientes();
    fetchConsultores();
  }, []);

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
    // Remove caracteres não numéricos
    const numbers = telefone.replace(/\D/g, '');
    // Aplica máscara (xx) xxxxx-xxxx
    if (numbers.length === 11) {
      return `(${numbers.substring(0, 2)}) ${numbers.substring(2, 7)}-${numbers.substring(7)}`;
    }
    return telefone;
  };

  const formatarCPF = (cpf) => {
    if (!cpf) return '';
    // Remove caracteres não numéricos
    const numbers = cpf.replace(/\D/g, '');
    // Aplica máscara xxx.xxx.xxx-xx
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
        <h1 className="page-title">👥 Gestão de Pacientes</h1>
        <p className="page-subtitle">Cadastre e acompanhe seus pacientes e leads</p>
      </div>

      {message && (
        <div className={`alert ${message.includes('sucesso') ? 'alert-success' : 'alert-error'}`}>
          {message}
        </div>
      )}

      {/* Resumo de Estatísticas */}
      <div style={{ 
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', 
        padding: '2rem', 
        borderRadius: '16px', 
        marginBottom: '2rem',
        border: '1px solid #cbd5e0',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '1.5rem' 
        }}>
          <h3 style={{ 
            fontSize: '1.2rem', 
            fontWeight: '600', 
            color: '#2d3748', 
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            📊 Resumo do Pipeline
          </h3>
          <button 
            className="btn btn-primary"
            onClick={() => setShowModal(true)}
            style={{ 
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              fontWeight: '600'
            }}
          >
            ➕ Novo Paciente
          </button>
        </div>
        
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
          <div style={{ 
            background: 'white', 
            padding: '1.5rem', 
            borderRadius: '12px', 
            textAlign: 'center',
            border: '1px solid #e2e8f0',
            borderLeft: '4px solid #fbbf24'
          }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#fbbf24', marginBottom: '0.5rem' }}>
              {pacientes.filter(p => p.status === 'lead').length}
            </div>
            <div style={{ color: '#718096', fontSize: '0.9rem', fontWeight: '500' }}>🔍 Leads</div>
          </div>
          
          <div style={{ 
            background: 'white', 
            padding: '1.5rem', 
            borderRadius: '12px', 
            textAlign: 'center',
            border: '1px solid #e2e8f0',
            borderLeft: '4px solid #60a5fa'
          }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#60a5fa', marginBottom: '0.5rem' }}>
              {pacientes.filter(p => p.status === 'agendado').length}
            </div>
            <div style={{ color: '#718096', fontSize: '0.9rem', fontWeight: '500' }}>📅 Agendados</div>
          </div>
          
          <div style={{ 
            background: 'white', 
            padding: '1.5rem', 
            borderRadius: '12px', 
            textAlign: 'center',
            border: '1px solid #e2e8f0',
            borderLeft: '4px solid #10b981'
          }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#10b981', marginBottom: '0.5rem' }}>
              {pacientes.filter(p => p.status === 'fechado').length}
            </div>
            <div style={{ color: '#718096', fontSize: '0.9rem', fontWeight: '500' }}>💰 Fechados</div>
          </div>
          
          <div style={{ 
            background: 'white', 
            padding: '1.5rem', 
            borderRadius: '12px', 
            textAlign: 'center',
            border: '1px solid #e2e8f0',
            borderLeft: '4px solid #667eea'
          }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#667eea', marginBottom: '0.5rem' }}>
              {pacientes.length}
            </div>
            <div style={{ color: '#718096', fontSize: '0.9rem', fontWeight: '500' }}>👥 Total</div>
          </div>
          
          <div style={{ 
            background: 'white', 
            padding: '1.5rem', 
            borderRadius: '12px', 
            textAlign: 'center',
            border: '1px solid #e2e8f0',
            borderLeft: '4px solid #34d399'
          }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#34d399', marginBottom: '0.5rem' }}>
              {pacientes.length > 0 
                ? Math.round((pacientes.filter(p => p.status === 'fechado').length / pacientes.length) * 100)
                : 0}%
            </div>
            <div style={{ color: '#718096', fontSize: '0.9rem', fontWeight: '500' }}>📈 Taxa Conversão</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">📋 Lista Completa de Pacientes</h2>
          <div style={{ fontSize: '0.9rem', color: '#718096' }}>
            {pacientes.length} paciente(s) cadastrado(s)
          </div>
        </div>

        {loading ? (
          <p>Carregando pacientes...</p>
        ) : pacientes.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#718096', padding: '2rem' }}>
            Nenhum paciente cadastrado ainda. Clique em "Novo Paciente" para começar.
          </p>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Consultor</th>
                  <th>Telefone</th>
                  <th>CPF</th>
                  <th>Tipo de Tratamento</th>
                  <th>Status</th>
                  <th>Cadastrado em</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {pacientes.map(paciente => {
                  const statusInfo = getStatusInfo(paciente.status);
                  return (
                    <tr key={paciente.id}>
                      <td>
                        <strong>{paciente.nome}</strong>
                        {paciente.observacoes && (
                          <div style={{ fontSize: '0.85rem', color: '#718096', marginTop: '0.25rem' }}>
                            {paciente.observacoes}
                          </div>
                        )}
                      </td>
                      <td>
                        {paciente.consultor_nome ? (
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.5rem',
                            padding: '0.25rem 0.75rem',
                            background: '#f0f4ff',
                            borderRadius: '8px',
                            border: '1px solid #c7d2fe'
                          }}>
                            <span style={{ fontSize: '1rem' }}>👨‍⚕️</span>
                            <span style={{ 
                              fontSize: '0.9rem', 
                              fontWeight: '500',
                              color: '#4338ca' 
                            }}>
                              {paciente.consultor_nome}
                            </span>
                          </div>
                        ) : (
                          <span style={{ 
                            color: '#9ca3af', 
                            fontSize: '0.9rem',
                            fontStyle: 'italic'
                          }}>
                            Não atribuído
                          </span>
                        )}
                      </td>
                      <td>{formatarTelefone(paciente.telefone)}</td>
                      <td>{formatarCPF(paciente.cpf)}</td>
                      <td>
                        {paciente.tipo_tratamento && (
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '12px',
                            fontSize: '0.85rem',
                            background: paciente.tipo_tratamento === 'Estético' ? '#e3f2fd' : '#f3e5f5',
                            color: paciente.tipo_tratamento === 'Estético' ? '#1565c0' : '#7b1fa2',
                            border: `1px solid ${paciente.tipo_tratamento === 'Estético' ? '#1976d2' : '#9c27b0'}`
                          }}>
                            {paciente.tipo_tratamento === 'Estético' ? '✨ Estético' : '🦷 Odontológico'}
                          </span>
                        )}
                      </td>
                      <td>
                        <select
                          value={paciente.status}
                          onChange={(e) => updateStatus(paciente.id, e.target.value)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            backgroundColor: statusInfo.color + '20',
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
                          className="btn btn-secondary"
                          style={{ padding: '0.5rem', fontSize: '0.85rem' }}
                        >
                          ✏️ Editar
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

      {/* Modal de Cadastro/Edição */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">
                {editingPaciente ? '✏️ Editar Paciente' : '➕ Novo Paciente/Lead'}
              </h2>
              <button 
                className="close-btn"
                onClick={resetForm}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
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
                    <option value="">Selecione o tipo de tratamento</option>
                    <option value="Estético">✨ Estético</option>
                    <option value="Odontológico">🦷 Odontológico</option>
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
                  <option value="">Selecione o consultor responsável</option>
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
                  placeholder="Informações adicionais sobre o paciente..."
                  rows="3"
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button 
                  type="button"
                  className="btn btn-secondary"
                  onClick={resetForm}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="btn btn-primary"
                >
                  {editingPaciente ? '💾 Atualizar Paciente' : '💾 Cadastrar Paciente'}
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