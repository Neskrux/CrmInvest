import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import TutorialAgendamentos from './TutorialAgendamentos';

const Agendamentos = () => {
  const { makeRequest, user, isAdmin, podeAlterarStatus } = useAuth();
  const { showSuccessToast, showErrorToast } = useToast();
  const [agendamentos, setAgendamentos] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [consultores, setConsultores] = useState([]);
  const [clinicas, setClinicas] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingAgendamento, setEditingAgendamento] = useState(null);
  const [loading, setLoading] = useState(true);
  
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
  const [showDetalhesModal, setShowDetalhesModal] = useState(false);
  const [detalhesAtual, setDetalhesAtual] = useState({ telefone: '', observacoes: '' });

  const isConsultor = user?.tipo === 'consultor';

  // Estados para modal de valor de fechamento
  const [showValorModal, setShowValorModal] = useState(false);
  const [agendamentoParaFechar, setAgendamentoParaFechar] = useState(null);
  const [valorFechamento, setValorFechamento] = useState('');
  const [valorFormatado, setValorFormatado] = useState('');
  const [salvandoFechamento, setSalvandoFechamento] = useState(false);
  const [contratoFechamento, setContratoFechamento] = useState(null);
  const [tipoTratamentoFechamento, setTipoTratamentoFechamento] = useState('');
  const [observacoesFechamento, setObservacoesFechamento] = useState('');
  const [dataFechamento, setDataFechamento] = useState(new Date().toISOString().split('T')[0]);

  // Estados para controlar o tutorial
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialCompleted, setTutorialCompleted] = useState(false);

  // Status disponíveis para agendamentos
  const statusOptions = [
    { value: 'agendado', label: 'Agendado', color: '#2563eb', description: 'Agendamento confirmado' },
    { value: 'lembrado', label: 'Lembrado', color: '#059669', description: 'Cliente foi lembrado' },
    { value: 'compareceu', label: 'Compareceu', color: '#10b981', description: 'Cliente compareceu ao agendamento' },
    { value: 'nao_compareceu', label: 'Não Compareceu', color: '#dc2626', description: 'Cliente não compareceu' },
    { value: 'fechado', label: 'Fechado', color: '#059669', description: '🔄 Cria fechamento automaticamente' },
    { value: 'nao_fechou', label: 'Não Fechou', color: '#ef4444', description: 'Cliente não fechou o negócio' },
    { value: 'reagendado', label: 'Reagendado', color: '#8b5cf6', description: 'Agendamento foi reagendado' },
    { value: 'cancelado', label: 'Cancelado', color: '#6b7280', description: 'Agendamento cancelado' },
    { value: 'nao_passou_cpf', label: 'Não passou CPF', color: '#6366f1', description: 'Cliente não forneceu CPF' },
    { value: 'aguardando_fechamento', label: 'Aguardando Fechamento', color: '#fbbf24', description: 'Aguardando fechamento' },
    { value: 'nao_quer_reagendar', label: 'Não quer reagendar', color: '#9ca3af', description: 'Cliente recusou reagendamento' }
  ];

  useEffect(() => {
    fetchAgendamentos();
    fetchPacientes();
    fetchConsultores();
    fetchClinicas();
    
    // Verificar se tutorial foi completado
    const completed = localStorage.getItem('tutorial-agendamentos-completed');
    setTutorialCompleted(!!completed);
  }, []);

  // Atualização automática dos dados a cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAgendamentos();
      fetchPacientes();
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, []);

  // Listener para sincronização entre telas
  useEffect(() => {
    const handleDataUpdate = () => {
      fetchAgendamentos();
      fetchPacientes();
    };

    window.addEventListener('data_updated', handleDataUpdate);
    
    return () => {
      window.removeEventListener('data_updated', handleDataUpdate);
    };
  }, []);

  // Controlar scroll do body quando modal estiver aberto
  useEffect(() => {
    if (showModal || showDetalhesModal || showValorModal) {
      // Bloquear scroll da página
      document.body.style.overflow = 'hidden';
    } else {
      // Restaurar scroll da página
      document.body.style.overflow = 'unset';
    }

    // Cleanup: garantir que o scroll seja restaurado quando o componente for desmontado
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showModal, showDetalhesModal, showValorModal]);

  const fetchAgendamentos = async () => {
    try {
      const response = await makeRequest('/agendamentos');
      const data = await response.json();
      
      if (response.ok) {
        setAgendamentos(data);
      } else {
        console.error('Erro ao carregar agendamentos:', data.error);
        showErrorToast('Erro ao carregar agendamentos: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error);
      showErrorToast('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const fetchPacientes = async () => {
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

  const fetchClinicas = async () => {
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
  };

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
        showSuccessToast(editingAgendamento ? 'Agendamento atualizado com sucesso!' : 'Agendamento criado com sucesso!');
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
      } else {
        showErrorToast('Erro ao salvar agendamento: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao salvar agendamento:', error);
      showErrorToast('Erro ao salvar agendamento');
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

  const handleViewDetalhes = (telefone, observacoes) => {
    setDetalhesAtual({
      telefone: telefone || 'Nenhum telefone cadastrado.',
      observacoes: observacoes || 'Nenhuma observação cadastrada.'
    });
    setShowDetalhesModal(true);
  };

  const handleViewPaciente = (agendamento) => {
    const paciente = pacientes.find(p => p.id === agendamento.paciente_id);
    setDetalhesAtual({
      nome: agendamento.paciente_nome || 'Nome não informado',
      telefone: agendamento.paciente_telefone || paciente?.telefone || 'Telefone não cadastrado',
      cpf: paciente?.cpf || 'CPF não cadastrado',
      cidade: paciente?.cidade || 'Cidade não informada',
      estado: paciente?.estado || 'Estado não informado',
      tipo_tratamento: paciente?.tipo_tratamento || 'Tipo de tratamento não informado',
      status: paciente?.status || 'Status não informado',
      observacoes: agendamento.observacoes || paciente?.observacoes || 'Nenhuma observação cadastrada',
      data_agendamento: agendamento.data_agendamento || 'Data não informada',
      horario: agendamento.horario || 'Horário não informado'
    });
    setShowDetalhesModal(true);
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Funções para formatação do valor
  const formatarValorInput = (valor) => {
    const numeros = valor.replace(/\D/g, '');
    if (!numeros) return '';
    const numero = parseFloat(numeros) / 100;
    return numero.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const desformatarValor = (valorFormatado) => {
    if (!valorFormatado) return '';
    return valorFormatado.replace(/\./g, '').replace(',', '.');
  };

  const handleValorChange = (e) => {
    const valorDigitado = e.target.value;
    const valorFormatado = formatarValorInput(valorDigitado);
    const valorNumerico = desformatarValor(valorFormatado);
    
    setValorFormatado(valorFormatado);
    setValorFechamento(valorNumerico);
  };

  const updateStatus = async (agendamentoId, newStatus) => {
    // Verificar se o usuário tem permissão para alterar status
    if (!podeAlterarStatus) {
      showErrorToast('Você não tem permissão para alterar o status dos agendamentos');
      return;
    }

    // Se o status for "fechado", abrir modal para inserir valor
    if (newStatus === 'fechado') {
      const agendamento = agendamentos.find(a => a.id === agendamentoId);
      setAgendamentoParaFechar(agendamento);
      setValorFechamento('');
      setValorFormatado('');
      setShowValorModal(true);
      return;
    }

    try {
      const response = await makeRequest(`/agendamentos/${agendamentoId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();
      
      if (response.ok) {
        showSuccessToast('Status atualizado com sucesso!');
        // Recarregar agendamentos e pacientes para manter sincronia
        await Promise.all([
          fetchAgendamentos(),
          fetchPacientes()
        ]);
        
        // Também forçar atualização nas outras telas via localStorage para sincronização imediata
        const timestamp = Date.now();
        localStorage.setItem('data_sync_trigger', timestamp.toString());
        window.dispatchEvent(new CustomEvent('data_updated', { detail: { timestamp } }));
      } else {
        showErrorToast('Erro ao atualizar status: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      showErrorToast('Erro ao atualizar status');
    }
  };

  const getStatusInfo = (status) => {
    return statusOptions.find(option => option.value === status) || statusOptions[0];
  };

  const excluirAgendamento = async (agendamentoId) => {
    // Confirmar antes de excluir
    if (!window.confirm('Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const response = await makeRequest(`/agendamentos/${agendamentoId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        showSuccessToast('Agendamento excluído com sucesso!');
        // Recarregar dados e sincronizar com outras telas
        await Promise.all([
          fetchAgendamentos(),
          fetchPacientes()
        ]);
        
        // Forçar atualização nas outras telas
        const timestamp = Date.now();
        localStorage.setItem('data_sync_trigger', timestamp.toString());
        window.dispatchEvent(new CustomEvent('data_updated', { detail: { timestamp } }));
      } else {
        const data = await response.json();
        showErrorToast('Erro ao excluir agendamento: ' + (data.error || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error('Erro ao excluir agendamento:', error);
      showErrorToast('Erro ao excluir agendamento');
    }
  };

  const confirmarFechamento = async () => {
    if (!valorFechamento || parseFloat(valorFechamento) < 0) {
      showErrorToast('Por favor, informe um valor válido!');
      return;
    }

    if (!contratoFechamento) {
      showErrorToast('Por favor, selecione o contrato em PDF!');
      return;
    }

    if (contratoFechamento && contratoFechamento.type !== 'application/pdf') {
      showErrorToast('Apenas arquivos PDF são permitidos para o contrato!');
      return;
    }

    if (contratoFechamento && contratoFechamento.size > 10 * 1024 * 1024) {
      showErrorToast('O arquivo deve ter no máximo 10MB!');
      return;
    }

    setSalvandoFechamento(true);
    try {
      // Primeiro, atualizar o status do agendamento para "fechado"
      const response = await makeRequest(`/agendamentos/${agendamentoParaFechar.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'fechado' })
      });

      const data = await response.json();
      
      if (response.ok) {
        // Agora criar o fechamento com o valor informado
        const formData = new FormData();
        formData.append('paciente_id', agendamentoParaFechar.paciente_id);
        formData.append('consultor_id', agendamentoParaFechar.consultor_id || '');
        formData.append('clinica_id', agendamentoParaFechar.clinica_id || '');
        formData.append('valor_fechado', parseFloat(valorFechamento));
        formData.append('data_fechamento', dataFechamento);
        formData.append('tipo_tratamento', tipoTratamentoFechamento || '');
        formData.append('observacoes', observacoesFechamento || 'Fechamento criado automaticamente pelo pipeline');
        
        if (contratoFechamento) {
          formData.append('contrato', contratoFechamento);
        }

        const API_BASE_URL = process.env.NODE_ENV === 'production' ? 'https://crminvest-production.up.railway.app/api' : 'http://localhost:5000/api';
        const token = localStorage.getItem('token');
        
        const fechamentoResponse = await fetch(`${API_BASE_URL}/fechamentos`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        if (fechamentoResponse.ok) {
          showSuccessToast(`Status atualizado! Fechamento criado com valor de R$ ${valorFormatado}`);
          cancelarFechamento();
          // Recarregar agendamentos e pacientes para manter sincronia
          await Promise.all([
            fetchAgendamentos(),
            fetchPacientes()
          ]);
        } else {
          const errorData = await fechamentoResponse.json();
          showErrorToast('Erro ao criar fechamento: ' + errorData.error);
        }
      } else {
        showErrorToast('Erro ao atualizar status: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao confirmar fechamento:', error);
      showErrorToast('Erro ao confirmar fechamento: ' + error.message);
    } finally {
      setSalvandoFechamento(false);
    }
  };

  const cancelarFechamento = () => {
    setShowValorModal(false);
    setAgendamentoParaFechar(null);
    setValorFechamento('');
    setValorFormatado('');
    setContratoFechamento(null);
    setTipoTratamentoFechamento('');
    setObservacoesFechamento('');
    setDataFechamento(new Date().toISOString().split('T')[0]);
  };

  const formatarData = (data) => {
    // Corrige problema de fuso horário ao interpretar data
    const [ano, mes, dia] = data.split('-');
    const dataLocal = new Date(ano, mes - 1, dia);
    return dataLocal.toLocaleDateString('pt-BR');
  };

  const formatarHorario = (horario) => {
    return horario.substring(0, 5); // Remove os segundos
  };

  const obterDataLocal = () => {
    const hoje = new Date();
    // Force para timezone local
    const dataStr = hoje.getFullYear() + '-' + 
                   String(hoje.getMonth() + 1).padStart(2, '0') + '-' + 
                   String(hoje.getDate()).padStart(2, '0');
    return dataStr;
  };

  const ehHoje = (data) => {
    // Comparação mais robusta usando objetos Date locais
    const [anoData, mesData, diaData] = data.split('-').map(Number);
    const [anoHoje, mesHoje, diaHoje] = obterDataLocal().split('-').map(Number);
    
    return anoData === anoHoje && mesData === mesHoje && diaData === diaHoje;
  };

  const ehPassado = (data) => {
    const [anoData, mesData, diaData] = data.split('-').map(Number);
    const [anoHoje, mesHoje, diaHoje] = obterDataLocal().split('-').map(Number);
    
    if (anoData < anoHoje) return true;
    if (anoData > anoHoje) return false;
    if (mesData < mesHoje) return true;
    if (mesData > mesHoje) return false;
    return diaData < diaHoje;
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

  // Obter data atual para o input
  const hojeStr = obterDataLocal();

  // Verificar se há filtros ativos
  const temFiltrosAtivos = filtroConsultor || filtroClinica || filtroDataInicio || filtroDataFim || filtroStatus;

  const handleTutorialComplete = () => {
    setShowTutorial(false);
    setTutorialCompleted(true);
    localStorage.setItem('tutorial-agendamentos-completed', 'true');
  };

  const handleTutorialClose = () => {
    setShowTutorial(false);
  };

  const startTutorial = () => {
    setShowTutorial(true);
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page-title">{isConsultor ? 'Visualizar Agendamentos' : 'Gerenciar Agendamentos'}</h1>
            <p className="page-subtitle">{isConsultor ? 'Visualize os agendamentos dos seus pacientes' : 'Gerencie os agendamentos dos pacientes'}</p>
          </div>
          <button
            onClick={startTutorial}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              backgroundColor: 'white',
              color: '#374151',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#f9fafb';
              e.target.style.borderColor = '#9ca3af';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'white';
              e.target.style.borderColor = '#d1d5db';
            }}
            title="Ver tutorial da tela de agendamentos"
          >
            Ver Tutorial
          </button>
        </div>
      </div>

      <div style={{
          backgroundColor: '#f0f9ff',
          border: '1px solid #bae6fd',
          borderRadius: '8px',
          padding: '1rem',
          marginTop: '1rem',
          fontSize: '0.875rem',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <strong style={{ color: '#0c4a6e' }}>Ações</strong>
          </div>
          <div style={{ color: '#0c4a6e', lineHeight: '1.4' }}>
            • Aqui em <strong>Agendamentos</strong> → Você pode visualizar o status dos agendamentos dos seus pacientes e filtrar por consultor, clínica, data e status<br/>
          </div>
      </div>

      {/* Dashboard de Agendamentos */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-label">Agendados</div>
          <div className="stat-value" style={{ color: '#2563eb' }}>
            {agendamentos.filter(a => a.status === 'agendado').length}
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Lembrados</div>
          <div className="stat-value" style={{ color: '#059669' }}>
            {agendamentos.filter(a => a.status === 'lembrado').length}
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Compareceram</div>
          <div className="stat-value" style={{ color: '#10b981' }}>
            {agendamentos.filter(a => a.status === 'compareceu').length}
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Fechados</div>
          <div className="stat-value" style={{ color: '#059669' }}>
            {agendamentos.filter(a => a.status === 'fechado').length}
          </div>
        </div>
      </div>

      {/* Seção de Filtros */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="card-title" style={{ fontSize: '1.1rem' }}>Filtros</h2>
          <button className="btn btn-secondary" onClick={() => setMostrarFiltros(!mostrarFiltros)}>
            {mostrarFiltros ? 'Ocultar Filtros' : 'Filtros'}
          </button>
        </div>
        {mostrarFiltros && (
          <div style={{ padding: '1.5rem', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <div className="grid grid-2" style={{ gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Consultor</label>
                <select
                  value={filtroConsultor}
                  onChange={(e) => setFiltroConsultor(e.target.value)}
                  className="form-select"
                >
                  <option value="">Todos os consultores</option>
                  {consultores.map(consultor => (
                    <option key={consultor.id} value={consultor.id}>
                      {consultor.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Clínica</label>
                <select
                  value={filtroClinica}
                  onChange={(e) => setFiltroClinica(e.target.value)}
                  className="form-select"
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

            <div className="grid grid-3" style={{ gap: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Data Início</label>
                <input
                  type="date"
                  value={filtroDataInicio}
                  onChange={(e) => setFiltroDataInicio(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Data Fim</label>
                <input
                  type="date"
                  value={filtroDataFim}
                  onChange={(e) => setFiltroDataFim(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Status</label>
                <select
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value)}
                  className="form-select"
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

            <button className="btn btn-sm btn-secondary" style={{ marginTop: '1rem' }} onClick={limparFiltros}>
              Limpar Filtros
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="card-title">Lista de Agendamentos</h2>
          {isAdmin && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Novo Agendamento
            </button>
          )}
        </div>

        {loading ? (
          <p>Carregando agendamentos...</p>
        ) : agendamentosFiltrados.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#718096', padding: '2rem' }}>
            {temFiltrosAtivos 
              ? 'Nenhum agendamento encontrado com os filtros aplicados.'
              : 'Nenhum agendamento cadastrado ainda.'
            }
          </p>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>Consultor</th>
                  <th style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>Clínica</th>
                  <th style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>Data</th>
                  <th style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>Horário</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {agendamentosFiltrados.map(agendamento => {
                  const statusInfo = getStatusInfo(agendamento.status);
                  return (
                    <tr key={agendamento.id} style={{
                      backgroundColor: ehHoje(agendamento.data_agendamento) ? '#fef3c7' : 'transparent'
                    }}>
                      <td>
                        <div>
                          <strong>{agendamento.paciente_nome}</strong>
                          {(agendamento.paciente_telefone || agendamento.observacoes) && (
                            <div style={{ marginTop: '0.25rem' }}>
                              <button
                                onClick={() => handleViewDetalhes(agendamento.paciente_telefone, agendamento.observacoes)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#6b7280',
                                  cursor: 'pointer',
                                  fontSize: '0.75rem',
                                  padding: '0.25rem',
                                  borderRadius: '4px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                                title="Ver detalhes"
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                              >
                                •••
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>{agendamento.consultor_nome}</td>
                      <td style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>{agendamento.clinica_nome}</td>
                      <td style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>
                        <span style={{
                          fontWeight: ehHoje(agendamento.data_agendamento) ? 'bold' : 'normal',
                          color: ehHoje(agendamento.data_agendamento) ? '#f59e0b' : 'inherit'
                        }}>
                          {formatarData(agendamento.data_agendamento)}
                          {ehHoje(agendamento.data_agendamento) && (
                            <div style={{ fontSize: '0.75rem', color: '#f59e0b' }}>
                              HOJE
                            </div>
                          )}
                        </span>
                      </td>
                      <td style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>
                        <strong style={{ color: '#2563eb' }}>
                          {formatarHorario(agendamento.horario)}
                        </strong>
                      </td>
                      <td>
                        <select
                          value={agendamento.status}
                          onChange={(e) => updateStatus(agendamento.id, e.target.value)}
                          disabled={!podeAlterarStatus}
                          className="status-select"
                          style={{
                                padding: '0.25rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                backgroundColor: statusInfo.color + '10',
                                color: statusInfo.color,
                                border: `1px solid ${statusInfo.color}`,
                                cursor: podeAlterarStatus ? 'pointer' : 'not-allowed',
                                opacity: podeAlterarStatus ? 1 : 0.5
                          }}
                          title={statusInfo.description || statusInfo.label}
                        >
                          {statusOptions.map(option => (
                            <option key={option.value} value={option.value} title={option.description}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleViewPaciente(agendamento)}
                            className="btn-action"
                            title="Visualizar informações do paciente"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                          </button>
                          {!isConsultor && (
                            <button
                              onClick={() => handleEdit(agendamento)}
                              className="btn-action"
                              title="Editar"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => excluirAgendamento(agendamento.id)}
                              className="btn-action"
                              title="Excluir agendamento"
                              style={{ color: '#dc2626', marginLeft: '0.5rem' }}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="m19 6-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                                <path d="m10 11 0 6"></path>
                                <path d="m14 11 0 6"></path>
                                <path d="M5 6l1-2a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1l1 2"></path>
                              </svg>
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
                {editingAgendamento ? 'Editar Agendamento' : 'Novo Agendamento'}
              </h2>
              <button 
                className="close-btn"
                onClick={resetForm}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} autoComplete="off">
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
                  {pacientes.filter(paciente => 
                    // Mostrar apenas pacientes com status apropriados para agendamento
                    ['lead', 'em_conversa', 'cpf_aprovado', 'sem_cedente', 'agendado', 'compareceu', 'nao_compareceu', 'reagendado'].includes(paciente.status)
                  ).map(paciente => (
                    <option key={paciente.id} value={paciente.id}>
                      {paciente.nome} {paciente.telefone && `- ${paciente.telefone}`}
                    </option>
                  ))}
                </select>
                {pacientes.length === 0 && (
                  <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.25rem' }}>
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
                    required
                    autoComplete="off"
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
                    autoComplete="off"
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
                  autoComplete="off"
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
                  {editingAgendamento ? 'Atualizar Agendamento' : 'Criar Agendamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Detalhes */}
      {showDetalhesModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 className="modal-title">
                {detalhesAtual.nome ? 'Informações do Paciente' : 'Detalhes do agendamento'}
              </h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              {detalhesAtual.nome ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div className="form-group">
                      <label className="form-label">Nome</label>
                      <div className="detail-field">
                        {detalhesAtual.nome}
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Telefone</label>
                      <div className="detail-field">
                        {detalhesAtual.telefone}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div className="form-group">
                      <label className="form-label">CPF</label>
                      <div className="detail-field">
                        {detalhesAtual.cpf}
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Status</label>
                      <div className="detail-field">
                        {detalhesAtual.status}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div className="form-group">
                      <label className="form-label">Cidade</label>
                      <div className="detail-field">
                        {detalhesAtual.cidade}
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Estado</label>
                      <div className="detail-field">
                        {detalhesAtual.estado}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div className="form-group">
                      <label className="form-label">Data do Agendamento</label>
                      <div className="detail-field">
                        {detalhesAtual.data_agendamento ? new Date(detalhesAtual.data_agendamento).toLocaleDateString('pt-BR') : 'Não informada'}
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Horário</label>
                      <div className="detail-field">
                        {detalhesAtual.horario}
                      </div>
                    </div>
                  </div>
                  
                  <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                    <label className="form-label">Tipo de Tratamento</label>
                    <div className="detail-field">
                      {detalhesAtual.tipo_tratamento}
                    </div>
                  </div>
                  
                  <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                    <label className="form-label">Observações</label>
                    <div className="detail-field" style={{
                      minHeight: '80px',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {detalhesAtual.observacoes}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                    <label className="form-label">Telefone do paciente</label>
                    <div className="detail-field">
                      {detalhesAtual.telefone}
                    </div>
                  </div>
                  
                  <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                    <label className="form-label">Observações do agendamento</label>
                    <div className="detail-field" style={{
                      minHeight: '120px',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {detalhesAtual.observacoes}
                    </div>
                  </div>
                </>
              )}
              
              <div style={{ textAlign: 'right' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setShowDetalhesModal(false)}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Valor de Fechamento */}
      {showValorModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Dados do Fechamento</h2>
              <button className="close-btn" onClick={cancelarFechamento}>
                ×
              </button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ 
                  color: '#374151', 
                  marginBottom: '1rem',
                  lineHeight: '1.5'
                }}>
                  <strong>Paciente:</strong> {agendamentoParaFechar?.paciente_nome}
                </p>
                <p style={{ 
                  color: '#6b7280', 
                  fontSize: '0.875rem',
                  lineHeight: '1.5'
                }}>
                  Complete as informações do fechamento:
                </p>
              </div>

              <div className="grid grid-2" style={{ gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Valor da Venda (R$) *</label>
                  <input 
                    type="text"
                    className="form-input"
                    value={valorFormatado}
                    onChange={handleValorChange}
                    placeholder="0,00"
                    style={{ fontSize: '1.125rem', textAlign: 'right' }}
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Data do Fechamento *</label>
                  <input 
                    type="date"
                    className="form-input"
                    value={dataFechamento}
                    onChange={(e) => setDataFechamento(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Tipo de Tratamento</label>
                <select 
                  className="form-select"
                  value={tipoTratamentoFechamento}
                  onChange={(e) => setTipoTratamentoFechamento(e.target.value)}
                >
                  <option value="">Selecione</option>
                  <option value="Estético">Estético</option>
                  <option value="Odontológico">Odontológico</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Contrato (PDF) *</label>
                <input 
                  type="file"
                  className="form-input"
                  accept=".pdf"
                  onChange={(e) => setContratoFechamento(e.target.files[0])}
                />
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  Arquivo deve ser PDF com no máximo 10MB
                </p>
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Observações</label>
                <textarea 
                  className="form-textarea"
                  rows="3"
                  value={observacoesFechamento}
                  onChange={(e) => setObservacoesFechamento(e.target.value)}
                  placeholder="Informações adicionais sobre o fechamento..."
                />
              </div>

              <div style={{ 
                display: 'flex', 
                gap: '1rem', 
                justifyContent: 'flex-end' 
              }}>
                <button 
                  type="button"
                  className="btn btn-secondary" 
                  onClick={cancelarFechamento}
                  disabled={salvandoFechamento}
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  className="btn btn-primary"
                  onClick={confirmarFechamento}
                  disabled={salvandoFechamento || !valorFechamento}
                >
                  {salvandoFechamento ? (
                    <>
                      <span className="loading-spinner" style={{ 
                        display: 'inline-block', 
                        verticalAlign: 'middle', 
                        marginRight: 8 
                      }}></span>
                      {contratoFechamento ? 'Enviando contrato...' : 'Processando...'}
                    </>
                  ) : (
                    'Confirmar Fechamento'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tutorial Overlay */}
      <TutorialAgendamentos
        isOpen={showTutorial}
        onClose={handleTutorialClose}
        onComplete={handleTutorialComplete}
      />
    </div>
  );
};

export default Agendamentos; 