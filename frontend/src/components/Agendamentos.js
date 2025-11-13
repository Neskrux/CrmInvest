import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import useBranding from '../hooks/common/useBranding';
import { useToast } from '../contexts';
import ModalEvidencia from './ModalEvidencia';
import useSmartPolling from '../hooks/common/useSmartPolling';
import './Agendamentos.css';

const Agendamentos = () => {
  const { t } = useBranding();
  const { makeRequest, user, isAdmin, podeAlterarStatus, isIncorporadora, isConsultorInterno, podeVerTodosDados, deveFiltrarPorConsultor, isClinica } = useAuth();
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
    consultor_interno_id: '',
    clinica_id: '',
    empreendimento_externo: '',
    data_agendamento: '',
    horario: '',
    status: 'agendado',
    observacoes: ''
  });
  const [showDetalhesModal, setShowDetalhesModal] = useState(false);
  const [detalhesAtual, setDetalhesAtual] = useState({ telefone: '', observacoes: '' });
  const [activeDetalhesTab, setActiveDetalhesTab] = useState('observacoes');
  const [evidenciasAgendamento, setEvidenciasAgendamento] = useState([]);
  const [agendamentoDetalhes, setAgendamentoDetalhes] = useState(null);

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
  const [empreendimentoFechamento, setEmpreendimentoFechamento] = useState('');
  const [empreendimentoExternoFechamento, setEmpreendimentoExternoFechamento] = useState('');
  const [valorParcelaFechamento, setValorParcelaFechamento] = useState('');
  const [valorParcelaFormatado, setValorParcelaFormatado] = useState('');
  const [numeroParcelasFechamento, setNumeroParcelasFechamento] = useState('');
  const [vencimentoFechamento, setVencimentoFechamento] = useState('');
  const [antecipacaoFechamento, setAntecipacaoFechamento] = useState('');


  // Estado para modal de explicação de permissões
  const [showPermissaoModal, setShowPermissaoModal] = useState(false);

  // Estados para modal de evidência
  const [showEvidenciaModal, setShowEvidenciaModal] = useState(false);
  const [evidenciaData, setEvidenciaData] = useState({
    agendamentoId: null,
    agendamentoNome: '',
    statusAnterior: '',
    statusNovo: '',
    evidenciaId: null
  });

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

  // Status que requerem evidência obrigatória
  const STATUS_COM_EVIDENCIA_AGENDAMENTOS = [
    'nao_compareceu',
    'nao_fechou',
    'cancelado',
    'nao_passou_cpf',
    'nao_quer_reagendar'
  ];

  useEffect(() => {
    fetchAgendamentos();
    fetchPacientes();
    fetchConsultores();
    fetchClinicas();
    
    // Aplicar filtro automático por consultor se necessário
    if (deveFiltrarPorConsultor && user?.consultor_id) {
      setFiltroConsultor(String(user.consultor_id));
    }
    
  }, [deveFiltrarPorConsultor, user?.consultor_id]);

  // Função de polling inteligente
  const pollingCallback = async () => {
    try {
      // Executar chamadas em paralelo (mais eficiente)
      await Promise.allSettled([
        fetchAgendamentos(),
        fetchPacientes()
      ]);
    } catch (error) {
      console.warn('⚠️ Erro no polling inteligente - Agendamentos:', error);
    }
  };

  // Polling inteligente (2 minutos em vez de 30 segundos)
  useSmartPolling(pollingCallback, 120000, []);

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
    if (showModal || showDetalhesModal || showValorModal || showPermissaoModal || showEvidenciaModal) {
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
  }, [showModal, showDetalhesModal, showValorModal, showPermissaoModal, showEvidenciaModal]);

  const fetchAgendamentos = async () => {
    try {
      setLoading(true);
      const response = await makeRequest('/agendamentos');
      const data = await response.json();
      
      if (response.ok) {
        const isUserAdmin = Boolean(isAdmin);
        const currentUserId = Number(user?.id || 0);
        const currentConsultorId = Number(user?.consultor_id || 0);
        const filtered = isUserAdmin ? data : (Array.isArray(data) ? data.filter(a => {
          const sdrMatch = Number(a.sdr_id || 0) === currentUserId;
          const consultorMatch = Number(a.consultor_id || 0) === currentConsultorId;
          const consultorInternoMatch = Number(a.consultor_interno_id || 0) === currentConsultorId;
          return sdrMatch || consultorMatch || consultorInternoMatch;
        }) : []);
        setAgendamentos(filtered);
      } else {
        console.error('Erro ao carregar agendamentos:', data.error);
      }
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error);
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
        showErrorToast('Erro ao carregar pacientes: ' + data.error);
      }
    } catch (error) {
      showErrorToast('Erro ao conectar com o servidor');
    }
  };

  const fetchConsultores = async () => {
    try {
      const response = await makeRequest('/consultores');
      const data = await response.json();
      
      if (response.ok) {
        setConsultores(data);
      } else {
        showErrorToast('Erro ao carregar consultores: ' + data.error);
      }
    } catch (error) {
      showErrorToast('Erro ao conectar com o servidor');
    }
  };

  const fetchClinicas = async () => {
    try {
      const response = await makeRequest('/clinicas');
      const data = await response.json();
      
      if (response.ok) {
        setClinicas(data);
      } else {
        showErrorToast('Erro ao carregar clínicas: ' + data.error);
      }
    } catch (error) {
      showErrorToast('Erro ao conectar com o servidor');
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

  const handleViewDetalhes = async (telefone, observacoes, agendamento = null) => {
    setDetalhesAtual({
      telefone: telefone || 'Nenhum telefone cadastrado.',
      observacoes: observacoes || 'Nenhuma observação cadastrada.'
    });
    setAgendamentoDetalhes(agendamento);
    setActiveDetalhesTab('observacoes');
    
    // Buscar evidências do agendamento
    if (agendamento && agendamento.id) {
      try {
        // Corrigido: usar formato de URL correto /:tipo/:registroId
        const response = await makeRequest(`/evidencias/agendamento/${agendamento.id}`);
        if (response.ok) {
          const data = await response.json();
          setEvidenciasAgendamento(Array.isArray(data) ? data : []);
        } else {
          setEvidenciasAgendamento([]);
        }
      } catch (error) {
        console.error('Erro ao buscar evidências:', error);
        setEvidenciasAgendamento([]);
      }
    }
    
    setShowDetalhesModal(true);
  };

  const handleViewPaciente = async (agendamento) => {
    const paciente = pacientes.find(p => p.id === agendamento.paciente_id);
    setDetalhesAtual({
      nome: agendamento.paciente_nome || 'Nome não informado',
      telefone: agendamento.paciente_telefone || paciente?.telefone || 'Telefone não cadastrado',
      cpf: paciente?.cpf || 'CPF não cadastrado',
      cidade: paciente?.cidade || 'Cidade não informada',
      estado: paciente?.estado || 'Estado não informado',
      tipo_tratamento: paciente?.tipo_tratamento || 'Tipo de tratamento não informado',
      empreendimento_id: paciente?.empreendimento_id || agendamento.empreendimento_id, // Incluir empreendimento_id
      status: paciente?.status || 'Status não informado',
      observacoes: agendamento.observacoes || paciente?.observacoes || 'Nenhuma observação cadastrada',
      data_agendamento: agendamento.data_agendamento || 'Data não informada',
      horario: agendamento.horario || 'Horário não informado',
      freelancer_nome: agendamento.consultor_nome || 'Não informado',
      sdr_nome: agendamento.sdr_nome || 'Não informado',
      corretor_nome: agendamento.consultor_interno_nome || 'Não informado'
    });
    setAgendamentoDetalhes(agendamento);
    setActiveDetalhesTab('observacoes');
    
    // Buscar evidências do agendamento
    if (agendamento && agendamento.id) {
      try {
        const response = await makeRequest(`/evidencias/agendamento/${agendamento.id}`);
        if (response.ok) {
          const data = await response.json();
          setEvidenciasAgendamento(Array.isArray(data) ? data : []);
        } else {
          setEvidenciasAgendamento([]);
        }
      } catch (error) {
        console.error('Erro ao buscar evidências:', error);
        setEvidenciasAgendamento([]);
      }
    }
    
    setShowDetalhesModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'clinica_id') {
      setFormData({
        ...formData,
        [name]: value,
        empreendimento_externo: value === 'externo' ? formData.empreendimento_externo : ''
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
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

  const handleValorParcelaChange = (e) => {
    const valorDigitado = e.target.value;
    const valorFormatado = formatarValorInput(valorDigitado);
    const valorNumerico = desformatarValor(valorFormatado);
    
    setValorParcelaFormatado(valorFormatado);
    setValorParcelaFechamento(valorNumerico);
  };

  const updateStatus = async (agendamentoId, newStatus, evidenciaId = null) => {
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
      setValorParcelaFechamento('');
      setValorParcelaFormatado('');
      setNumeroParcelasFechamento('');
      setVencimentoFechamento('');
      setAntecipacaoFechamento('');
      setShowValorModal(true);
      return;
    }

    // VERIFICAR SE STATUS REQUER EVIDÊNCIA
    if (STATUS_COM_EVIDENCIA_AGENDAMENTOS.includes(newStatus) && !evidenciaId) {
      const agendamento = agendamentos.find(a => a.id === agendamentoId);
      if (agendamento) {
        // Abrir modal de evidência
        setEvidenciaData({
          agendamentoId: agendamentoId,
          agendamentoNome: agendamento.paciente_nome,
          statusAnterior: agendamento.status,
          statusNovo: newStatus,
          evidenciaId: null
        });
        setShowEvidenciaModal(true);
      }
      return;
    }

    try {
      const response = await makeRequest(`/agendamentos/${agendamentoId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ 
          status: newStatus,
          evidencia_id: evidenciaId 
        })
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
        
        // Para incorporadora (empresa_id = 5), usar empreendimento_id ou empreendimento_externo
        if (user?.empresa_id === 5) {
          if (empreendimentoFechamento === 'externo') {
            const nomeExterno = (empreendimentoExternoFechamento || '').trim() || 'Empreendimento Externo';
            formData.append('empreendimento_externo', nomeExterno);
          } else if (empreendimentoFechamento) {
            formData.append('empreendimento_id', parseInt(empreendimentoFechamento));
          }
        } else {
          // Para securitizadora, usar clinica_id e não enviar empreendimento_id
          formData.append('clinica_id', agendamentoParaFechar.clinica_id || '');
          formData.append('tipo_tratamento', tipoTratamentoFechamento || '');
        }
        
        formData.append('valor_fechado', parseFloat(valorFechamento));
        formData.append('data_fechamento', dataFechamento);
        formData.append('observacoes', observacoesFechamento || 'Fechamento criado automaticamente pelo pipeline');
        
        // Novos campos de parcelamento
        if (valorParcelaFechamento) {
          formData.append('valor_parcela', parseFloat(valorParcelaFechamento));
        }
        if (numeroParcelasFechamento) {
          formData.append('numero_parcelas', parseInt(numeroParcelasFechamento));
        }
        if (vencimentoFechamento) {
          formData.append('vencimento', vencimentoFechamento);
        }
        if (antecipacaoFechamento) {
          formData.append('antecipacao_meses', parseInt(antecipacaoFechamento));
        }
        
        if (contratoFechamento) {
          formData.append('contrato', contratoFechamento);
        }

        const API_BASE_URL = process.env.NODE_ENV === 'production' ? 'https://crminvest-backend.fly.dev/api' : 'http://localhost:5000/api';
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
          let errorMessage = 'Erro ao criar fechamento';
          try {
            const errorData = await fechamentoResponse.json();
            errorMessage = errorData.error || errorMessage;
          } catch (parseError) {
            // Se não conseguir fazer parse do JSON, usar o status text
            errorMessage = `Erro ${fechamentoResponse.status}: ${fechamentoResponse.statusText}`;
          }
          showErrorToast(errorMessage);
        }
      } else {
        showErrorToast('Erro ao atualizar status: ' + data.error);
      }
    } catch (error) {
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
    setEmpreendimentoFechamento('');
    setValorParcelaFechamento('');
    setValorParcelaFormatado('');
    setNumeroParcelasFechamento('');
    setVencimentoFechamento('');
    setAntecipacaoFechamento('');
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
      consultor_interno_id: '',
      clinica_id: '',
      empreendimento_externo: '',
      data_agendamento: '',
      horario: '',
      status: 'agendado',
      observacoes: ''
    });
    setEditingAgendamento(null);
    setShowModal(false);
  };

  const limparFiltros = () => {
    // Só limpar filtro de consultor se não estiver com filtro automático ativo
    if (!deveFiltrarPorConsultor) {
      setFiltroConsultor('');
    }
    setFiltroClinica('');
    setFiltroDataInicio('');
    setFiltroDataFim('');
    setFiltroStatus('');
  };

  // Aplicar filtros
  const baseAgendamentos = isIncorporadora && user?.consultor_id
    ? agendamentos.filter(a => [a.consultor_id, a.consultor_interno_id, a.sdr_id].map(v => String(v || '')).includes(String(user.consultor_id)))
    : agendamentos;

  const agendamentosFiltrados = baseAgendamentos.filter(agendamento => {
    // Filtro por consultor
    const matchConsultor = !filtroConsultor || agendamento.consultor_id.toString() === filtroConsultor;
    
    // Filtro por clínica/empreendimento
    const matchClinica = !filtroClinica || (
      user?.empresa_id === 5 ? (
        // Para incorporadora, comparar empreendimento (igual Pacientes.js)
        (() => {
          const empreendimentoMap = {
            4: 'Laguna Sky Garden',
            5: 'Residencial Girassol',
            6: 'Sintropia Sky Garden',
            7: 'Residencial Lotus',
            8: 'River Sky Garden',
            9: 'Condomínio Figueira Garcia'
          };
          const empreendimentoId = agendamento.empreendimento_id || agendamento.clinica_id;
          return empreendimentoMap[empreendimentoId] === filtroClinica;
        })()
      ) : (
        // Para outras empresas, comparar clínica
        agendamento.clinica_id.toString() === filtroClinica
      )
    );
    
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


  // Função chamada quando evidência é enviada com sucesso
  const handleEvidenciaSuccess = async (evidenciaId) => {
    // Atualizar status agora que temos a evidência
    await updateStatus(evidenciaData.agendamentoId, evidenciaData.statusNovo, evidenciaId);
  };

  // Função chamada quando modal de evidência é fechado/cancelado
  const handleEvidenciaClose = () => {
    setShowEvidenciaModal(false);
    setEvidenciaData({
      agendamentoId: null,
      agendamentoNome: '',
      statusAnterior: '',
      statusNovo: '',
      evidenciaId: null
    });
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page-title">{isConsultor ? 'Visualizar Agendamentos' : 'Gerenciar Agendamentos'}</h1>
            <p className="page-subtitle">{isConsultor ? `Visualize os agendamentos dos seus ${t.paciente.toLowerCase()+'s'}` : `Gerencie os agendamentos dos ${t.paciente.toLowerCase()+'s'}`}</p>
          </div>
        </div>
      </div>
      {/* Dashboard de Agendamentos */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-label">Total</div>
          <div className="stat-value" style={{ color: '#2563eb' }}>
            {agendamentos.length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Agendados</div>
          <div className="stat-value" style={{ color: '#2563eb' }}>
            {agendamentos.filter(a => a.status === 'agendado').length}
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
                <label className="form-label">{t.consultor}</label>
                <select
                  value={filtroConsultor}
                  onChange={(e) => setFiltroConsultor(e.target.value)}
                  className="form-select"
                  disabled={deveFiltrarPorConsultor}
                  style={{ 
                    opacity: deveFiltrarPorConsultor ? 0.6 : 1,
                    cursor: deveFiltrarPorConsultor ? 'not-allowed' : 'pointer'
                  }}
                >
                  <option value="">Todos os consultores</option>
                  {consultores.filter(consultor => consultor.empresa_id === user?.empresa_id).map(consultor => (
                    <option key={consultor.id} value={consultor.id}>
                      {consultor.nome}
                    </option>
                  ))}
                </select>
                {deveFiltrarPorConsultor && (
                  <div style={{ 
                    fontSize: '0.75rem', 
                    color: '#6b7280', 
                    marginTop: '0.25rem',
                    fontStyle: 'italic'
                  }}>
                    Filtro automático ativo - mostrando apenas seus dados
                  </div>
                )}
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">{user?.empresa_id === 5 ? 'Empreendimento' : t.clinica}</label>
                <select
                  value={filtroClinica}
                  onChange={(e) => setFiltroClinica(e.target.value)}
                  className="form-select"
                >
                  <option value="">{user?.empresa_id === 5 ? 'Todos os empreendimentos' : `Todas as ${t.clinica.toLowerCase()}s`}</option>
                  {user?.empresa_id === 5 ? (
                    // Para incorporadora, mostrar empreendimentos hardcoded (igual Pacientes.js)
                    <>
                      <option value="Laguna Sky Garden">Laguna Sky Garden</option>
                      <option value="Residencial Girassol">Residencial Girassol</option>
                      <option value="Sintropia Sky Garden">Sintropia Sky Garden</option>
                      <option value="Residencial Lotus">Residencial Lotus</option>
                      <option value="River Sky Garden">River Sky Garden</option>
                      <option value="Condomínio Figueira Garcia">Condomínio Figueira Garcia</option>
                    </>
                  ) : (
                    // Para outras empresas, mostrar clínicas
                    clinicas.map(clinica => (
                      <option key={clinica.id} value={clinica.id}>
                        {clinica.nome}
                      </option>
                    ))
                  )}
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
          {(isAdmin || isConsultorInterno) && (
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
          <>
            {/* Layout Desktop - Tabela */}
            <div className="table-container">
              <table className="table tabela-agendamentos-desktop">
                <thead>
                  <tr>
                    <th className="col-agendamento-paciente">{t.paciente}</th>
                    {user?.empresa_id !== 5 && (
                      <th className="col-agendamento-freelancer">Freelancer</th>
                    )}
                    <th className="col-agendamento-sdr">SDR</th>
                    <th className="col-agendamento-consultor">{isIncorporadora ? 'Corretor' : 'Consultor'}</th>
                    <th className="col-agendamento-clinica">{user?.empresa_id === 5 ? 'Empreendimento' : 'Clínica'}</th>
                    <th className="col-agendamento-data">Data</th>
                    <th className="col-agendamento-horario">Horário</th>
                    <th className="col-agendamento-status">
                      Status
                      {!podeAlterarStatus && (
                        <button
                          onClick={() => setShowPermissaoModal(true)}
                          className="permissao-info-btn"
                          title="Clique para saber mais sobre permissões"
                        >
                          ?
                        </button>
                      )}
                    </th>
                    <th className="col-agendamento-acoes">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {agendamentosFiltrados.map(agendamento => {
                    const statusInfo = getStatusInfo(agendamento.status);
                    return (
                      <tr key={agendamento.id} style={{
                        backgroundColor: ehHoje(agendamento.data_agendamento) ? '#fef3c7' : 'transparent'
                      }}>
                        <td className="col-agendamento-paciente">
                          <div>
                            <strong>{agendamento.paciente_nome}</strong>
                          </div>
                        </td>
                        {user?.empresa_id !== 5 && (
                          <td className="col-agendamento-freelancer">{agendamento.consultor_nome || '-'}</td>
                        )}
                        <td className="col-agendamento-sdr">{agendamento.sdr_nome || '-'}</td>
                        <td className="col-agendamento-consultor">{agendamento.consultor_interno_nome || '-'}</td>
                        <td className="col-agendamento-clinica" style={{ maxWidth: '150px' }}>
                        {user?.empresa_id === 5 ? (
                          // Para incorporadora, mostrar empreendimento baseado em externo ou id com truncamento (sempre com fallback)
                          (() => {
                            const empreendimentoMap = {
                              4: 'Laguna Sky Garden',
                              5: 'Residencial Girassol',
                              6: 'Sintropia Sky Garden',
                              7: 'Residencial Lotus',
                              8: 'River Sky Garden',
                              9: 'Condomínio Figueira Garcia'
                            };
                            const externoNome = (agendamento.empreendimento_externo || '').trim();
                            const nomeBase = externoNome || empreendimentoMap[agendamento.empreendimento_id || agendamento.clinica_id] || 'Empreendimento Externo';
                            return nomeBase.length > 15 ? (
                              <div style={{ fontSize: '0.8rem', lineHeight: '1.2' }}>
                                {nomeBase.substring(0, 15)}...
                              </div>
                            ) : nomeBase;
                          })()
                        ) : (
                            // Para outras empresas, mostrar nome da clínica
                            agendamento.clinica_nome ? (
                              agendamento.clinica_nome.length > 15 ? (
                                <div style={{ fontSize: '0.8rem', lineHeight: '1.2' }}>
                                  {agendamento.clinica_nome.substring(0, 15)}...
                                </div>
                              ) : agendamento.clinica_nome
                            ) : '-'
                          )}
                        </td>
                        <td className="col-agendamento-data">
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
                        <td className="col-agendamento-horario">
                          <strong style={{ color: '#2563eb' }}>
                            {formatarHorario(agendamento.horario)}
                          </strong>
                        </td>
                        <td className="col-agendamento-status">
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
                        <td className="col-agendamento-acoes">
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              onClick={() => handleViewPaciente(agendamento)}
                              className="btn-action"
                              title={`Visualizar informações do ${t.paciente.toLowerCase()}`}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                              </svg>
                            </button>
                            {!isConsultor && !isClinica && (
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
                                style={{ color: '#dc2626' }}
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

            {/* Layout Mobile - Cards para Clínicas */}
            {isClinica && (
              <div className="agendamentos-cards-mobile">
                {agendamentosFiltrados.map(agendamento => {
                  const statusInfo = getStatusInfo(agendamento.status);
                  return (
                    <div key={agendamento.id} className="agendamento-card" style={{
                      backgroundColor: ehHoje(agendamento.data_agendamento) ? '#fef3c7' : 'white'
                    }}>
                      <div className="agendamento-card-header">
                        <div className="agendamento-card-nome">{agendamento.paciente_nome}</div>
                      </div>
                      <div className="agendamento-card-body">
                        <div className="agendamento-card-row">
                          <span className="agendamento-card-label">Data:</span>
                          <span className="agendamento-card-value" style={{
                            fontWeight: ehHoje(agendamento.data_agendamento) ? 'bold' : 'normal',
                            color: ehHoje(agendamento.data_agendamento) ? '#f59e0b' : 'inherit'
                          }}>
                            {formatarData(agendamento.data_agendamento)}
                            {ehHoje(agendamento.data_agendamento) && (
                              <span style={{ fontSize: '0.7rem', marginLeft: '0.25rem' }}>HOJE</span>
                            )}
                          </span>
                        </div>
                        <div className="agendamento-card-row">
                          <span className="agendamento-card-label">Horário:</span>
                          <span className="agendamento-card-value" style={{ color: '#2563eb', fontWeight: '600' }}>
                            {formatarHorario(agendamento.horario)}
                          </span>
                        </div>
                        <div className="agendamento-card-row">
                          <span className="agendamento-card-label">Status:</span>
                          <select
                            value={agendamento.status}
                            onChange={(e) => updateStatus(agendamento.id, e.target.value)}
                            disabled={!podeAlterarStatus}
                            className="agendamento-card-status-select"
                            style={{
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
                        </div>
                      </div>
                      <div className="agendamento-card-actions">
                        <button
                          onClick={() => handleViewPaciente(agendamento)}
                          className="btn-action"
                          title={`Visualizar informações do ${t.paciente.toLowerCase()}`}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </svg>
                          Visualizar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
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
                <label className="form-label">{t.paciente} *</label>
                <select
                  name="paciente_id"
                  className="form-select"
                  value={formData.paciente_id}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Selecione um {t.paciente.toLowerCase()}</option>
                  {(
                    (isIncorporadora && user?.consultor_id)
                      ? pacientes.filter(p => [p.consultor_id, p.consultor_interno_id, p.sdr_id].map(v => String(v || '')).includes(String(user.consultor_id)))
                      : pacientes
                  ).filter(paciente => 
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
                    Nenhum {t.paciente.toLowerCase()} cadastrado. Cadastre um {t.paciente.toLowerCase()} primeiro.
                  </p>
                )}
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">{t.consultor} *</label>
                  <select
                    name="consultor_id"
                    className="form-select"
                    value={formData.consultor_id}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Selecione um {t.consultor.toLowerCase()}</option>
                    {consultores.filter(consultor => consultor.empresa_id === user?.empresa_id).map(consultor => (
                      <option key={consultor.id} value={consultor.id}>
                        {consultor.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">{user?.empresa_id === 5 ? 'Empreendimento' : t.clinica}</label>
                  {user?.empresa_id === 5 ? (
                    <>
                      <select
                        name="clinica_id"
                        className="form-select"
                        value={formData.clinica_id}
                        onChange={handleInputChange}
                      required>
                        <option value="">Selecione um empreendimento</option>
                        <option value="4">Laguna Sky Garden</option>
                        <option value="5">Residencial Girassol</option>
                        <option value="6">Sintropia Sky Garden</option>
                        <option value="7">Residencial Lotus</option>
                        <option value="8">River Sky Garden</option>
                        <option value="9">Condomínio Figueira Garcia</option>
                        <option value="externo">Empreendimento Externo</option>
                      </select>
                      {formData.clinica_id === 'externo' && (
                        <input
                          type="text"
                          name="empreendimento_externo"
                          className="form-input"
                          value={formData.empreendimento_externo || ''}
                          onChange={handleInputChange}
                          style={{ marginTop: '0.5rem' }}
                          placeholder="Digite o nome do empreendimento externo"
                          required
                        />
                      )}
                    </>
                  ) : (
                    <select
                      name="clinica_id"
                      className="form-select"
                      value={formData.clinica_id}
                      onChange={handleInputChange}
                    >
                      <option value="">{`Selecione um ${t.clinica.toLowerCase()}`}</option>
                      {clinicas.map(clinica => (
                        <option key={clinica.id} value={clinica.id}>
                          {clinica.nome}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="grid grid-2">
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
          <div className="modal" style={{ maxWidth: '700px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <h2 className="modal-title">
                {detalhesAtual.nome || agendamentoDetalhes?.paciente_nome || 'Detalhes'}
              </h2>
              <button className="close-btn" onClick={() => setShowDetalhesModal(false)}>×</button>
            </div>
            
            {/* Navegação por abas */}
            <div style={{ 
              display: 'flex', 
              gap: '2rem',
              padding: '1rem 1.5rem 0 1.5rem',
              borderBottom: '1px solid #e5e7eb',
              flexShrink: 0
            }}>
              <button
                onClick={() => setActiveDetalhesTab('observacoes')}
                style={{
                  padding: '0.75rem 0',
                  border: 'none',
                  background: 'none',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: activeDetalhesTab === 'observacoes' ? '#3b82f6' : '#6b7280',
                  borderBottom: activeDetalhesTab === 'observacoes' ? '2px solid #3b82f6' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {detalhesAtual.nome ? 'Informações' : 'Detalhes'}
              </button>
              
              <button
                onClick={() => setActiveDetalhesTab('evidencias')}
                style={{
                  padding: '0.75rem 0',
                  border: 'none',
                  background: 'none',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: activeDetalhesTab === 'evidencias' ? '#3b82f6' : '#6b7280',
                  borderBottom: activeDetalhesTab === 'evidencias' ? '2px solid #3b82f6' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                Evidências
                {evidenciasAgendamento.length > 0 && (
                  <span style={{
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    fontSize: '0.7rem',
                    fontWeight: '600',
                    padding: '0.125rem 0.375rem',
                    borderRadius: '9999px',
                    minWidth: '20px',
                    textAlign: 'center'
                  }}>
                    {evidenciasAgendamento.length}
                  </span>
                )}
              </button>
            </div>
            
            <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto', display: 'block' }}>
              {/* Aba de Informações/Detalhes */}
              {activeDetalhesTab === 'observacoes' && detalhesAtual.nome && (
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
                    <label className="form-label">{user?.empresa_id === 5 ? 'Empreendimento' : 'Tipo de Tratamento'}</label>
                    <div className="detail-field">
                      {user?.empresa_id === 5 ? (
                        // Para incorporadora, mostrar empreendimento baseado no empreendimento_id
                        detalhesAtual.empreendimento_id ? (
                          (() => {
                            const empreendimentoMap = {
                              4: 'Laguna Sky Garden',
                              5: 'Residencial Girassol',
                              6: 'Sintropia Sky Garden',
                              7: 'Residencial Lotus',
                              8: 'River Sky Garden',
                              9: 'Condomínio Figueira Garcia'
                            };
                            return empreendimentoMap[detalhesAtual.empreendimento_id] || '-';
                          })()
                        ) : '-'
                      ) : (
                        // Para outras empresas, mostrar tipo de tratamento
                        detalhesAtual.tipo_tratamento
                      )}
                    </div>
                  </div>
                  
                  {/* Informações de equipe */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                    {!isIncorporadora && (
                      <div className="form-group">
                        <label className="form-label">Freelancer que Indicou</label>
                        <div className="detail-field">
                          {detalhesAtual.freelancer_nome}
                        </div>
                      </div>
                    )}
                    <div className="form-group">
                      <label className="form-label">SDR</label>
                      <div className="detail-field">
                        {detalhesAtual.sdr_nome}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div className="form-group">
                      <label className="form-label">{isIncorporadora ? 'Corretor' : 'Consultor Interno'}</label>
                      <div className="detail-field">
                        {detalhesAtual.corretor_nome}
                      </div>
                    </div>
                    {!isIncorporadora && (
                      <div className="form-group">
                        <label className="form-label">Status do Agendamento</label>
                        <div className="detail-field">
                          {agendamentoDetalhes?.status || 'Não informado'}
                        </div>
                      </div>
                    )}
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
              )}
              
              {/* Aba de Detalhes Simples (telefone e observações) */}
              {activeDetalhesTab === 'observacoes' && !detalhesAtual.nome && (
                <>
                  <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                    <label className="form-label">Telefone do {t.paciente.toLowerCase()}</label>
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
              
              {/* Aba de Evidências */}
              {activeDetalhesTab === 'evidencias' && (
                <div>
                  <h3 style={{ 
                    fontSize: '1rem', 
                    fontWeight: '600', 
                    color: '#374151', 
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                    </svg>
                    Evidências de Mudanças de Status
                  </h3>
                  
                  {evidenciasAgendamento.length === 0 ? (
                    <div style={{
                      padding: '2rem',
                      textAlign: 'center',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 1rem', opacity: 0.3 }}>
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                      </svg>
                      <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                        Nenhuma evidência registrada
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: '1rem' }}>
                      {evidenciasAgendamento.map((evidencia, index) => (
                        <div key={evidencia.id} style={{
                          backgroundColor: '#f9fafb',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          padding: '1rem'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                            <div>
                              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                                {new Date(evidencia.created_at).toLocaleString('pt-BR')}
                              </div>
                              <div style={{ fontWeight: '600', color: '#374151' }}>
                                {evidencia.status_anterior || 'N/A'} → {evidencia.status_novo || 'N/A'}
                              </div>
                            </div>
                          </div>
                          
                          {evidencia.descricao && (
                            <div style={{
                              marginBottom: '0.75rem',
                              padding: '0.75rem',
                              backgroundColor: 'white',
                              borderRadius: '6px',
                              fontSize: '0.875rem',
                              color: '#374151',
                              whiteSpace: 'pre-wrap'
                            }}>
                              {evidencia.descricao}
                            </div>
                          )}
                          
                          {evidencia.arquivo_url && (
                            <button
                              onClick={() => window.open(evidencia.arquivo_url, '_blank')}
                              className="btn btn-sm btn-primary"
                              style={{
                                fontSize: '0.75rem',
                                padding: '0.5rem 0.75rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                              Visualizar Evidência
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div style={{ 
              padding: '1rem 1.5rem', 
              borderTop: '1px solid #e5e7eb',
              flexShrink: 0,
              textAlign: 'right'
            }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  setShowDetalhesModal(false);
                  setActiveDetalhesTab('observacoes');
                  setEvidenciasAgendamento([]);
                  setAgendamentoDetalhes(null);
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Valor de Fechamento */}
      {showValorModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '800px' }}>
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
                  <strong>{t.paciente}:</strong> {agendamentoParaFechar?.paciente_nome}
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

              {user?.empresa_id === 5 && (
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Empreendimento *</label>
                  <select
                    className="form-select"
                    value={empreendimentoFechamento}
                    onChange={(e) => setEmpreendimentoFechamento(e.target.value)}
                  >
                    <option value="">Selecione um empreendimento</option>
                    <option value="4">Laguna Sky Garden</option>
                    <option value="5">Residencial Girassol</option>
                    <option value="6">Sintropia Sky Garden</option>
                    <option value="7">Residencial Lotus</option>
                    <option value="8">River Sky Garden</option>
                    <option value="9">Condomínio Figueira Garcia</option>
                    <option value="externo">Empreendimento Externo</option>
                  </select>
                  {empreendimentoFechamento === 'externo' && (
                    <input
                      type="text"
                      className="form-input"
                      value={empreendimentoExternoFechamento}
                      onChange={(e) => setEmpreendimentoExternoFechamento(e.target.value)}
                      style={{ marginTop: '0.5rem' }}
                      placeholder="Digite o nome do empreendimento externo"
                      required
                    />
                  )}
                </div>
              )}

              {user?.empresa_id !== 5 && (
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
              )}


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

              {/* Seção de Parcelamento - Apenas para não incorporadora */}
              {user?.empresa_id !== 5 && (
                <div style={{ 
                  border: '1px solid #e5e7eb', 
                  borderRadius: '8px', 
                  padding: '1rem', 
                  marginBottom: '1rem',
                  backgroundColor: '#f9fafb'
                }}>
                  <h4 style={{ 
                    margin: '0 0 1rem 0', 
                    fontSize: '1rem', 
                    fontWeight: '600', 
                    color: '#374151' 
                  }}>
                    Dados de Parcelamento
                  </h4>
                  
                  <div className="grid grid-2" style={{ gap: '1rem', marginBottom: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Valor da Parcela (R$)</label>
                      <input 
                        type="text"
                        className="form-input"
                        value={valorParcelaFormatado}
                        onChange={handleValorParcelaChange}
                        placeholder="R$ 0,00"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Nº de Parcelas</label>
                      <input 
                        type="number"
                        className="form-input"
                        value={numeroParcelasFechamento}
                        onChange={(e) => setNumeroParcelasFechamento(e.target.value)}
                        placeholder="Ex: 12"
                        min="1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-2" style={{ gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Dia do Vencimento</label>
                      <input 
                        type="date"
                        className="form-input"
                        value={vencimentoFechamento}
                        onChange={(e) => setVencimentoFechamento(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Antecipação (em meses)</label>
                      <input 
                        type="number"
                        className="form-input"
                        value={antecipacaoFechamento}
                        onChange={(e) => setAntecipacaoFechamento(e.target.value)}
                        placeholder="Ex: 3"
                        min="1"
                      />
                    </div>
                  </div>
                </div>
              )}


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
                  disabled={salvandoFechamento || !valorFechamento || (user?.empresa_id === 5 && !empreendimentoFechamento)}
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

      {/* Modal de Explicação de Permissões */}
      {showPermissaoModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Permissões de Status</h2>
              <button className="close-btn" onClick={() => setShowPermissaoModal(false)}>
                ×
              </button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <div style={{
                backgroundColor: '#fef3c7',
                border: '1px solid #f59e0b',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.25rem' }}></span>
                  <strong style={{ color: '#92400e' }}>Limitação de Permissão</strong>
                </div>
                <p style={{ color: '#92400e', margin: 0, lineHeight: '1.5' }}>
                  Como consultor freelancer, você não pode alterar o status dos {t.paciente.toLowerCase()+'s'}, aguarde que iremos atualizar o status conforme a negociação avançar.
                </p>
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ color: '#374151', marginBottom: '0.5rem', fontSize: '1rem' }}>
                  Quem pode alterar status?
                </h3>
                <ul style={{ color: '#6b7280', lineHeight: '1.6', paddingLeft: '1.5rem' }}>
                  <li><strong>Administradores e Consultores Internos:</strong> Podem alterar qualquer status</li>
                  <li><strong>Consultores Freelancers:</strong> Apenas visualizam os status</li>
                </ul>
              </div>
              <div style={{ textAlign: 'right', marginTop: '1.5rem' }}>
                <button 
                  className="btn btn-primary" 
                  onClick={() => setShowPermissaoModal(false)}
                >
                  Entendi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de Evidência de Status */}
      <ModalEvidencia
        isOpen={showEvidenciaModal}
        onClose={handleEvidenciaClose}
        onSuccess={handleEvidenciaSuccess}
        tipo="agendamento"
        registroId={evidenciaData.agendamentoId}
        statusAnterior={evidenciaData.statusAnterior}
        statusNovo={evidenciaData.statusNovo}
        nomeRegistro={evidenciaData.agendamentoNome}
      />

    </div>
  );
};

export default Agendamentos; 