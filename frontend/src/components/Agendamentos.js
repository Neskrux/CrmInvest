import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Agendamentos = () => {
  const { makeRequest, isAdmin } = useAuth();
  const [agendamentos, setAgendamentos] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [consultores, setConsultores] = useState([]);
  const [clinicas, setClinicas] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingAgendamento, setEditingAgendamento] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  
  // Estados dos filtros
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtroConsultor, setFiltroConsultor] = useState('');
  const [filtroClinica, setFiltroClinica] = useState('');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  
  const [formData, setFormData] = useState({
    paciente_id: '',
    consultor_id: '',
    clinica_id: '',
    data_agendamento: '',
    horario: '',
    status: 'agendado',
    observacoes: ''
  });

  // Status disponíveis para agendamentos
  const statusOptions = [
    { value: 'agendado', label: '📅 Agendado', color: '#60a5fa' },
    { value: 'lembrado', label: '✅ Lembrado', color: '#34d399' },
    { value: 'compareceu', label: '🎯 Compareceu', color: '#10b981' },
    { value: 'nao_compareceu', label: '🚫 Não Compareceu', color: '#f87171' },
    { value: 'fechado', label: '💰 Fechado', color: '#059669' },
    { value: 'nao_fechou', label: '❌ Não Fechou', color: '#ef4444' },
    { value: 'reagendado', label: '🔄 Reagendado', color: '#a78bfa' },
    { value: 'cancelado', label: '⛔ Cancelado', color: '#6b7280' }
  ];

  const fetchAgendamentos = useCallback(async () => {
    try {
      setLoading(true);
      const response = await makeRequest('/agendamentos');
      const data = await response.json();
      
      if (response.ok) {
        setAgendamentos(data);
      } else {
        setMessage('Erro ao carregar agendamentos: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error);
      setMessage('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  }, [makeRequest]);

  const fetchPacientes = useCallback(async () => {
    try {
      const response = await makeRequest('/pacientes');
      const data = await response.json();
      
      if (response.ok) {
        setPacientes(data);
      } else {
        console.error('Erro ao carregar pacientes:', data.error);
      }
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error);
    }
  }, [makeRequest]);

  const fetchConsultores = useCallback(async () => {
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
  }, [makeRequest]);

  const fetchClinicas = useCallback(async () => {
    try {
      const response = await makeRequest('/clinicas');
      const data = await response.json();
      
      if (response.ok) {
        setClinicas(data);
      } else {
        console.error('Erro ao carregar clínicas:', data.error);
      }
    } catch (error) {
      console.error('Erro ao carregar clínicas:', error);
    }
  }, [makeRequest]);

  useEffect(() => {
    fetchAgendamentos();
    fetchPacientes();
    fetchConsultores(); 
    fetchClinicas();
  }, [fetchAgendamentos, fetchPacientes, fetchConsultores, fetchClinicas]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let response;
      if (editingAgendamento) {
        response = await makeRequest(`/agendamentos/${editingAgendamento.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
      } else {
        response = await makeRequest('/agendamentos', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
      }

      const data = await response.json();
      
      if (response.ok) {
        setMessage(editingAgendamento ? 'Agendamento atualizado com sucesso!' : 'Agendamento criado com sucesso!');
        setShowModal(false);
        setEditingAgendamento(null);
        setFormData({
          paciente_id: '',
          consultor_id: '',
          clinica_id: '',
          data_agendamento: '',
          horario: '',
          status: 'agendado',
          observacoes: ''
        });
        fetchAgendamentos();
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Erro ao salvar agendamento: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao salvar agendamento:', error);
      setMessage('Erro ao salvar agendamento');
    }
  };

  const handleEdit = (agendamento) => {
    setEditingAgendamento(agendamento);
    setFormData({
      paciente_id: agendamento.paciente_id || '',
      consultor_id: agendamento.consultor_id || '',
      clinica_id: agendamento.clinica_id || '',
      data_agendamento: agendamento.data_agendamento || '',
      horario: agendamento.horario || '',
      status: agendamento.status || 'agendado',
      observacoes: agendamento.observacoes || ''
    });
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Se o paciente foi alterado, tentar pré-selecionar o consultor responsável
    if (name === 'paciente_id' && value) {
      const pacienteSelecionado = pacientes.find(p => p.id.toString() === value);
      if (pacienteSelecionado && pacienteSelecionado.consultor_id) {
        setFormData({
          ...formData,
          [name]: value,
          consultor_id: pacienteSelecionado.consultor_id.toString()
        });
        return;
      }
    }
    
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const updateStatus = async (agendamentoId, newStatus) => {
    try {
      const response = await makeRequest(`/agendamentos/${agendamentoId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage('Status atualizado com sucesso!');
        fetchAgendamentos();
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

  const marcarComoLembrado = async (agendamentoId) => {
    try {
      const response = await makeRequest(`/agendamentos/${agendamentoId}/lembrado`, {
        method: 'PUT'
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage('Paciente marcado como lembrado!');
        fetchAgendamentos();
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Erro ao marcar como lembrado: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao marcar como lembrado:', error);
      setMessage('Erro ao marcar como lembrado');
    }
  };

  const deletarAgendamento = async (agendamentoId, pacienteNome) => {
    if (!window.confirm(`Tem certeza que deseja DELETAR o agendamento de ${pacienteNome}?\n\nEsta ação não pode ser desfeita!`)) {
      return;
    }

    try {
      const response = await makeRequest(`/agendamentos/${agendamentoId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage('Agendamento removido com sucesso!');
        fetchAgendamentos();
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Erro ao remover agendamento: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao remover agendamento:', error);
      setMessage('Erro ao remover agendamento');
    }
  };

  const formatarData = (data) => {
    // Garantir que a data seja interpretada corretamente
    const dataObj = new Date(data + 'T12:00:00'); // Forçar meio-dia para evitar timezone
    return dataObj.toLocaleDateString('pt-BR');
  };

  const formatarHorario = (horario) => {
    return horario.substring(0, 5); // Remove os segundos
  };

  // Função utilitária para obter data de hoje no formato correto (dinâmica/real)
  const obterDataHoje = () => {
    const hoje = new Date();
    // Garantir que seja no timezone local, sempre atualizada
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    
    return `${ano}-${mes}-${dia}`;
  };

  const ehHoje = (data) => {
    const hoje = obterDataHoje(); // Data real atual do sistema
    
    // Normalizar a data do agendamento (remover qualquer hora se existir)
    const dataLimpa = data.split('T')[0]; // Pega só a parte da data (YYYY-MM-DD)
    
    return dataLimpa === hoje;
  };

  const ehPassado = (data) => {
    const hoje = obterDataHoje();
    const dataLimpa = data.split('T')[0]; // Pega só a parte da data
    return dataLimpa < hoje;
  };

  const resetForm = () => {
    setFormData({
      paciente_id: '',
      consultor_id: '',
      clinica_id: '',
      data_agendamento: '',
      horario: '',
      status: 'agendado',
      observacoes: ''
    });
    setEditingAgendamento(null);
    setShowModal(false);
  };

  const limparFiltros = () => {
    setFiltroConsultor('');
    setFiltroClinica('');
    setFiltroDataInicio('');
    setFiltroDataFim('');
    setFiltroStatus('');
  };

  // Aplicar filtros
  const agendamentosFiltrados = agendamentos.filter(agendamento => {
    // Filtro por consultor
    const matchConsultor = !filtroConsultor || agendamento.consultor_id.toString() === filtroConsultor;
    
    // Filtro por clínica
    const matchClinica = !filtroClinica || agendamento.clinica_id.toString() === filtroClinica;
    
    // Filtro por status
    const matchStatus = !filtroStatus || agendamento.status === filtroStatus;
    
    // Filtro por data
    let matchData = true;
    if (filtroDataInicio && filtroDataFim) {
      matchData = agendamento.data_agendamento >= filtroDataInicio && 
                  agendamento.data_agendamento <= filtroDataFim;
    } else if (filtroDataInicio) {
      matchData = agendamento.data_agendamento >= filtroDataInicio;
    } else if (filtroDataFim) {
      matchData = agendamento.data_agendamento <= filtroDataFim;
    }
    
    return matchConsultor && matchClinica && matchStatus && matchData;
  });

  // Obter data atual para o input (formato consistente)
  const hoje = obterDataHoje();

  // Verificar se há filtros ativos
  const temFiltrosAtivos = filtroConsultor || filtroClinica || filtroDataInicio || filtroDataFim || filtroStatus;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">📅 Sistema de Agendamentos</h1>
        <p className="page-subtitle">Gerencie consultas e acompanhe o pipeline de vendas</p>
      </div>

      {message && (
        <div className={`alert ${message.includes('sucesso') ? 'alert-success' : 'alert-error'}`}>
          {message}
        </div>
      )}

      {/* Resumo de Estatísticas dos Agendamentos */}
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
            📊 Dashboard de Agendamentos
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
            ➕ Novo Agendamento
          </button>
        </div>
        
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <div style={{ 
            background: 'white', 
            padding: '1.5rem', 
            borderRadius: '12px', 
            textAlign: 'center',
            border: '1px solid #e2e8f0',
            borderLeft: '4px solid #60a5fa'
          }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#60a5fa', marginBottom: '0.5rem' }}>
              {agendamentos.filter(a => a.status === 'agendado').length}
            </div>
            <div style={{ color: '#718096', fontSize: '0.9rem', fontWeight: '500' }}>📅 Agendados</div>
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
              {agendamentos.filter(a => a.status === 'lembrado').length}
            </div>
            <div style={{ color: '#718096', fontSize: '0.9rem', fontWeight: '500' }}>✅ Lembrados</div>
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
              {agendamentos.filter(a => a.status === 'compareceu').length}
            </div>
            <div style={{ color: '#718096', fontSize: '0.9rem', fontWeight: '500' }}>🎯 Compareceram</div>
          </div>
          
          <div style={{ 
            background: 'white', 
            padding: '1.5rem', 
            borderRadius: '12px', 
            textAlign: 'center',
            border: '1px solid #e2e8f0',
            borderLeft: '4px solid #059669'
          }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#059669', marginBottom: '0.5rem' }}>
              {agendamentos.filter(a => a.status === 'fechado').length}
            </div>
            <div style={{ color: '#718096', fontSize: '0.9rem', fontWeight: '500' }}>💰 Fechados</div>
          </div>
          
          <div style={{ 
            background: 'white', 
            padding: '1.5rem', 
            borderRadius: '12px', 
            textAlign: 'center',
            border: '1px solid #e2e8f0',
            borderLeft: '4px solid #ef4444'
          }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#ef4444', marginBottom: '0.5rem' }}>
              {agendamentos.filter(a => a.status === 'nao_fechou').length}
            </div>
            <div style={{ color: '#718096', fontSize: '0.9rem', fontWeight: '500' }}>❌ Não Fecharam</div>
          </div>
          
          <div style={{ 
            background: 'white', 
            padding: '1.5rem', 
            borderRadius: '12px', 
            textAlign: 'center',
            border: '1px solid #e2e8f0',
            borderLeft: '4px solid #f97316'
          }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#f97316', marginBottom: '0.5rem' }}>
              {agendamentos.filter(a => ehHoje(a.data_agendamento)).length}
            </div>
            <div style={{ color: '#718096', fontSize: '0.9rem', fontWeight: '500' }}>🔥 Hoje</div>
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
              {agendamentos.length}
            </div>
            <div style={{ color: '#718096', fontSize: '0.9rem', fontWeight: '500' }}>📋 Total</div>
          </div>
          
          <div style={{ 
            background: 'white', 
            padding: '1.5rem', 
            borderRadius: '12px', 
            textAlign: 'center',
            border: '1px solid #e2e8f0',
            borderLeft: '4px solid #a78bfa'
          }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#a78bfa', marginBottom: '0.5rem' }}>
              {agendamentos.length > 0 
                ? Math.round((agendamentos.filter(a => a.status === 'fechado').length / agendamentos.length) * 100)
                : 0}%
            </div>
            <div style={{ color: '#718096', fontSize: '0.9rem', fontWeight: '500' }}>📈 Taxa Fechamento</div>
          </div>
        </div>

        {/* Alerta para agendamentos de hoje */}
        {agendamentos.filter(a => ehHoje(a.data_agendamento)).length > 0 && (
          <div style={{ 
            marginTop: '1.5rem', 
            padding: '1rem 1.5rem', 
            background: 'linear-gradient(135deg, #fef3c7 0%, #fbbf24 20%)', 
            borderRadius: '12px',
            border: '1px solid #f59e0b',
            color: '#92400e',
            fontSize: '1rem',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            🔥 <strong>Atenção!</strong> Você tem <strong>{agendamentos.filter(a => ehHoje(a.data_agendamento)).length}</strong> 
            agendamento(s) para hoje! Não se esqueça de fazer os lembretes.
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">📋 Lista Completa de Agendamentos</h2>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ fontSize: '0.9rem', color: '#718096' }}>
              {agendamentos.length} agendamento(s) cadastrado(s)
            </div>
            {/* Botão Filtros */}
            <button 
              className="btn btn-secondary"
              onClick={() => setMostrarFiltros(!mostrarFiltros)}
              style={{ 
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              🔍 Filtros
              {temFiltrosAtivos && (
                <span style={{
                  position: 'absolute',
                  top: '-0.25rem',
                  right: '-0.25rem',
                  background: '#ef4444',
                  color: 'white',
                  borderRadius: '50%',
                  width: '1.25rem',
                  height: '1.25rem',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {[filtroConsultor, filtroClinica, filtroDataInicio, filtroDataFim, filtroStatus].filter(Boolean).length}
                </span>
              )}
              <span style={{ marginLeft: '0.25rem' }}>
                {mostrarFiltros ? '▲' : '▼'}
              </span>
            </button>
          </div>
        </div>

        {/* Filtros - Só aparece quando mostrarFiltros é true */}
        {mostrarFiltros && (
          <div style={{ 
            background: '#f8fafc', 
            padding: '1.5rem', 
            borderRadius: '12px', 
            marginBottom: '1.5rem',
            border: '2px solid #e2e8f0',
            animation: 'slideDown 0.3s ease-out'
          }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            marginBottom: '1rem' 
          }}>
            <h3 style={{ 
              fontSize: '1.1rem', 
              fontWeight: '600', 
              color: '#2d3748', 
              margin: 0,
              display: 'flex',
              alignItems: 'center'
            }}>
              🔍 Filtros de Busca
            </h3>
            {temFiltrosAtivos && (
              <button 
                onClick={limparFiltros}
                className="btn btn-secondary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
              >
                🗑️ Limpar Filtros
              </button>
            )}
          </div>
          
          <div className="grid grid-2" style={{ marginBottom: '1rem' }}>
            {/* Filtro por Consultor */}
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.9rem', color: '#4a5568', marginBottom: '0.5rem' }}>
                👨‍⚕️ Consultor:
              </label>
              <select
                value={filtroConsultor}
                onChange={(e) => setFiltroConsultor(e.target.value)}
                style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '2px solid #cbd5e0',
                  fontSize: '0.95rem',
                  background: 'white'
                }}
              >
                <option value="">Todos os consultores</option>
                {consultores.map(consultor => (
                  <option key={consultor.id} value={consultor.id}>
                    {consultor.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por Clínica */}
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.9rem', color: '#4a5568', marginBottom: '0.5rem' }}>
                🏥 Clínica:
              </label>
              <select
                value={filtroClinica}
                onChange={(e) => setFiltroClinica(e.target.value)}
                style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '2px solid #cbd5e0',
                  fontSize: '0.95rem',
                  background: 'white'
                }}
              >
                <option value="">Todas as clínicas</option>
                {clinicas.map(clinica => (
                  <option key={clinica.id} value={clinica.id}>
                    {clinica.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-3">
            {/* Filtro por Data Início */}
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.9rem', color: '#4a5568', marginBottom: '0.5rem' }}>
                📅 Data Início:
              </label>
              <input
                type="date"
                value={filtroDataInicio}
                onChange={(e) => setFiltroDataInicio(e.target.value)}
                style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '2px solid #cbd5e0',
                  fontSize: '0.95rem',
                  background: 'white'
                }}
              />
            </div>

            {/* Filtro por Data Fim */}
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.9rem', color: '#4a5568', marginBottom: '0.5rem' }}>
                📅 Data Fim:
              </label>
              <input
                type="date"
                value={filtroDataFim}
                onChange={(e) => setFiltroDataFim(e.target.value)}
                style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '2px solid #cbd5e0',
                  fontSize: '0.95rem',
                  background: 'white'
                }}
              />
            </div>

            {/* Filtro por Status */}
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.9rem', color: '#4a5568', marginBottom: '0.5rem' }}>
                📊 Status:
              </label>
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '2px solid #cbd5e0',
                  fontSize: '0.95rem',
                  background: 'white'
                }}
              >
                <option value="">Todos os status</option>
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Contador de resultados */}
          {temFiltrosAtivos && (
            <div style={{ 
              marginTop: '1rem', 
              padding: '0.75rem', 
              background: '#e3f2fd', 
              borderRadius: '8px',
              color: '#1565c0',
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center'
            }}>
              📍 Mostrando <strong style={{ margin: '0 0.25rem' }}>{agendamentosFiltrados.length}</strong> 
              de {agendamentos.length} agendamento(s)
              {filtroConsultor && ` • Consultor: ${consultores.find(c => c.id.toString() === filtroConsultor)?.nome}`}
              {filtroClinica && ` • Clínica: ${clinicas.find(c => c.id.toString() === filtroClinica)?.nome}`}
              {filtroStatus && ` • Status: ${statusOptions.find(s => s.value === filtroStatus)?.label}`}
              {(filtroDataInicio || filtroDataFim) && ` • Período: ${filtroDataInicio ? formatarData(filtroDataInicio) : '...'} até ${filtroDataFim ? formatarData(filtroDataFim) : '...'}`}
            </div>
          )}
        </div>
        )}

        {loading ? (
          <p>Carregando agendamentos...</p>
        ) : agendamentosFiltrados.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#718096', padding: '2rem' }}>
            {temFiltrosAtivos 
              ? 'Nenhum agendamento encontrado com os filtros aplicados.'
              : 'Nenhum agendamento cadastrado ainda. Clique em "Novo Agendamento" para começar.'
            }
          </p>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Consultor</th>
                  <th>Clínica</th>
                  <th>Data</th>
                  <th>Horário</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {agendamentosFiltrados.map(agendamento => {
                  const statusInfo = getStatusInfo(agendamento.status);
                  return (
                    <tr key={agendamento.id} style={{
                      backgroundColor: ehHoje(agendamento.data_agendamento) ? '#fffbf0' : 'transparent'
                    }}>
                      <td>
                        <strong>{agendamento.paciente_nome}</strong>
                        {agendamento.paciente_telefone && (
                          <div style={{ fontSize: '0.85rem', color: '#718096' }}>
                            📞 {agendamento.paciente_telefone}
                          </div>
                        )}
                        {agendamento.observacoes && (
                          <div style={{ fontSize: '0.85rem', color: '#718096', marginTop: '0.25rem' }}>
                            💭 {agendamento.observacoes}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ marginRight: '0.5rem' }}>🩺</span>
                          {agendamento.consultor_nome}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ marginRight: '0.5rem' }}>🏥</span>
                          {agendamento.clinica_nome}
                        </div>
                      </td>
                      <td>
                        <span style={{
                          fontWeight: ehHoje(agendamento.data_agendamento) ? 'bold' : 'normal',
                          color: ehHoje(agendamento.data_agendamento) ? '#ff9800' : 'inherit'
                        }}>
                          {formatarData(agendamento.data_agendamento)}
                          {ehHoje(agendamento.data_agendamento) && (
                            <div style={{ fontSize: '0.75rem', color: '#ff9800' }}>
                              HOJE
                            </div>
                          )}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: '#667eea' }}>
                          {formatarHorario(agendamento.horario)}
                        </strong>
                      </td>
                      <td>
                        <select
                          value={agendamento.status}
                          onChange={(e) => updateStatus(agendamento.id, e.target.value)}
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
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => handleEdit(agendamento)}
                            className="btn btn-secondary"
                            style={{ padding: '0.5rem', fontSize: '0.85rem' }}
                            title="Editar agendamento"
                          >
                            ✏️
                          </button>
                          {!agendamento.lembrado && !ehPassado(agendamento.data_agendamento) && agendamento.status === 'agendado' && (
                            <button
                              onClick={() => marcarComoLembrado(agendamento.id)}
                              className="btn btn-success"
                              style={{ padding: '0.5rem', fontSize: '0.85rem' }}
                            >
                              ✅
                            </button>
                          )}
                          {/* Botão Deletar - só admin */}
                          {isAdmin && (
                            <button
                              onClick={() => deletarAgendamento(agendamento.id, agendamento.paciente_nome)}
                              className="btn"
                              style={{ 
                                padding: '0.5rem', 
                                fontSize: '0.85rem',
                                background: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px'
                              }}
                              title="Deletar agendamento"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
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
                {editingAgendamento ? '✏️ Editar Agendamento' : '📅 Novo Agendamento'}
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
                <label className="form-label">Paciente *</label>
                <select
                  name="paciente_id"
                  className="form-select"
                  value={formData.paciente_id}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Selecione um paciente</option>
                  {pacientes.map(paciente => (
                    <option key={paciente.id} value={paciente.id}>
                      {paciente.nome} {paciente.telefone && `- ${paciente.telefone}`}
                    </option>
                  ))}
                </select>
                {pacientes.length === 0 && (
                  <p style={{ fontSize: '0.85rem', color: '#718096', marginTop: '0.25rem' }}>
                    Nenhum paciente cadastrado. Cadastre um paciente primeiro.
                  </p>
                )}
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Consultor *</label>
                  <select
                    name="consultor_id"
                    className="form-select"
                    value={formData.consultor_id}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Selecione um consultor</option>
                    {consultores.map(consultor => (
                      <option key={consultor.id} value={consultor.id}>
                        {consultor.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Clínica</label>
                  <select
                    name="clinica_id"
                    className="form-select"
                    value={formData.clinica_id}
                    onChange={handleInputChange}
                  >
                    <option value="">Selecione uma clínica</option>
                    {clinicas.map(clinica => (
                      <option key={clinica.id} value={clinica.id}>
                        {clinica.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-3">
                <div className="form-group">
                  <label className="form-label">Data do Agendamento *</label>
                  <input
                    type="date"
                    name="data_agendamento"
                    className="form-input"
                    value={formData.data_agendamento}
                    onChange={handleInputChange}
                    min={hoje}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Horário *</label>
                  <input
                    type="time"
                    name="horario"
                    className="form-input"
                    value={formData.horario}
                    onChange={handleInputChange}
                    required
                  />
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
                <label className="form-label">Observações</label>
                <textarea
                  name="observacoes"
                  className="form-textarea"
                  value={formData.observacoes}
                  onChange={handleInputChange}
                  placeholder="Informações adicionais sobre o agendamento..."
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
                  {editingAgendamento ? '💾 Atualizar Agendamento' : '📅 Criar Agendamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Agendamentos; 