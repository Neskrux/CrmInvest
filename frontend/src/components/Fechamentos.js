import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import TutorialFechamentos from './TutorialFechamentos';

const Fechamentos = () => {
  const { makeRequest, isAdmin, user, podeAlterarStatus, isConsultorInterno, podeVerTodosDados, deveFiltrarPorConsultor, isClinica } = useAuth();
  const [fechamentos, setFechamentos] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [consultores, setConsultores] = useState([]);
  const [clinicas, setClinicas] = useState([]);
  const [agendamentos, setAgendamentos] = useState([]);
  const [erro, setErro] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [filtroConsultor, setFiltroConsultor] = useState('');
  const [filtroClinica, setFiltroClinica] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [filtrosVisiveis, setFiltrosVisiveis] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [fechamentoEditando, setFechamentoEditando] = useState(null);
  
  // Estados para modal de visualização com abas
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewingFechamento, setViewingFechamento] = useState(null);
  const [activeViewTab, setActiveViewTab] = useState('informacoes');
  const [novoFechamento, setNovoFechamento] = useState({
    paciente_id: '',
    consultor_id: '',
    clinica_id: '',
    valor_fechado: '',
    valor_formatado: '',
    data_fechamento: new Date().toISOString().split('T')[0],
    tipo_tratamento: '',
    observacoes: ''
  });
  const [contratoSelecionado, setContratoSelecionado] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [showObservacoesModal, setShowObservacoesModal] = useState(false);
  const [observacoesAtual, setObservacoesAtual] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const { error: showErrorToast, success: showSuccessToast, warning: showWarningToast, info: showInfoToast } = useToast();

  // Estados para controlar o tutorial
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialCompleted, setTutorialCompleted] = useState(false);

  // Estado para modal de explicação de permissões
  const [showPermissaoModal, setShowPermissaoModal] = useState(false);

  const isConsultor = user?.tipo === 'consultor';

  useEffect(() => {
    carregarDados();
    
    // Aplicar filtro automático por consultor se necessário
    if (deveFiltrarPorConsultor && user?.consultor_id) {
      setFiltroConsultor(String(user.consultor_id));
    }
    
    // Tutorial automático desabilitado
    // Os usuários podem acessá-lo manualmente através do botão "Ver Tutorial"
  }, [deveFiltrarPorConsultor, user?.consultor_id]);

  // Detectar mudanças de tamanho da tela
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Atualização automática dos dados a cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      carregarDados();
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, []);

  // Listener para sincronização entre telas
  useEffect(() => {
    const handleDataUpdate = () => {
      carregarDados();
    };

    window.addEventListener('data_updated', handleDataUpdate);
    
    return () => {
      window.removeEventListener('data_updated', handleDataUpdate);
    };
  }, []);

  // Controlar scroll do body quando modal estiver aberto
  useEffect(() => {
    if (modalAberto || showObservacoesModal || viewModalOpen) {
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
  }, [modalAberto, showObservacoesModal, viewModalOpen]);

  const carregarDados = async () => {
    try {
      setCarregando(true);
      setErro(null);
      
      const [fechamentosRes, pacientesRes, consultoresRes, clinicasRes, agendamentosRes] = await Promise.all([
        makeRequest('/fechamentos'),
        makeRequest('/pacientes'),
        makeRequest('/consultores'),
        makeRequest('/clinicas'),
        makeRequest('/agendamentos')
      ]);

      if (!fechamentosRes.ok) {
        throw new Error(`Erro ao carregar fechamentos: ${fechamentosRes.status} - Tabela 'fechamentos' não encontrada. Execute a migração no Supabase.`);
      }

      const fechamentosData = await fechamentosRes.json();
      const pacientesData = await pacientesRes.json();
      const consultoresData = await consultoresRes.json();
      const clinicasData = await clinicasRes.json();
      const agendamentosData = await agendamentosRes.json();

      setFechamentos(Array.isArray(fechamentosData) ? fechamentosData : []);
      setPacientes(Array.isArray(pacientesData) ? pacientesData : []);
      setConsultores(Array.isArray(consultoresData) ? consultoresData : []);
      setClinicas(Array.isArray(clinicasData) ? clinicasData : []);
      setAgendamentos(Array.isArray(agendamentosData) ? agendamentosData : []);

      setCarregando(false);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setErro(error.message);
      setCarregando(false);
      
      setFechamentos([]);
      setPacientes([]);
      setConsultores([]);
      setClinicas([]);
      setAgendamentos([]);
    }
  };

  const filtrarFechamentos = () => {
    if (!Array.isArray(fechamentos)) {
      return [];
    }
    return fechamentos.filter(fechamento => {
      const consultorMatch = !filtroConsultor || fechamento.consultor_id === parseInt(filtroConsultor);
      const clinicaMatch = !filtroClinica || fechamento.clinica_id === parseInt(filtroClinica);
      
      let mesMatch = true;
      if (filtroMes) {
        const dataFechamento = new Date(fechamento.data_fechamento);
        const [ano, mes] = filtroMes.split('-');
        mesMatch = dataFechamento.getFullYear() === parseInt(ano) && 
                   dataFechamento.getMonth() === parseInt(mes) - 1;
      }

      return consultorMatch && clinicaMatch && mesMatch;
    });
  };

  const calcularEstatisticas = () => {
    const fechamentosFiltrados = filtrarFechamentos();

    // Filtrar apenas fechamentos aprovados (excluir reprovados)
    const fechamentosParaCalculo = fechamentosFiltrados.filter(fechamento => 
      fechamento.aprovado !== 'reprovado'
    );

    // Calcular total
    const total = fechamentosParaCalculo.length;

    // Calcular valor total com validação robusta
    let valorTotal = 0;
    fechamentosParaCalculo.forEach(f => {
      let valor = 0;
      if (f.valor_fechado !== null && f.valor_fechado !== undefined && f.valor_fechado !== '') {
        // Tentar diferentes formatos
        if (typeof f.valor_fechado === 'string') {
          // Remover formatação de moeda se existir
          const valorLimpo = f.valor_fechado.toString().replace(/[^\d.,-]/g, '').replace(',', '.');
          valor = parseFloat(valorLimpo) || 0;
        } else {
          valor = parseFloat(f.valor_fechado) || 0;
        }
      }
      valorTotal += valor;
    });

    const ticketMedio = total > 0 ? valorTotal / total : 0;

    // Calcular fechamentos de hoje
    const hoje = new Date();
    const hojeStr = hoje.getFullYear() + '-' +
                   String(hoje.getMonth() + 1).padStart(2, '0') + '-' +
                   String(hoje.getDate()).padStart(2, '0');

    const fechamentosHoje = fechamentosParaCalculo.filter(f => {
      if (!f.data_fechamento) return false;
      const dataFechamento = f.data_fechamento.split('T')[0]; // Remover hora se existir
      return dataFechamento === hojeStr;
    }).length;

    // Calcular fechamentos do mês
    const fechamentosMes = fechamentosParaCalculo.filter(f => {
      if (!f.data_fechamento) return false;
      const dataFechamento = new Date(f.data_fechamento);
      return dataFechamento.getMonth() === hoje.getMonth() &&
             dataFechamento.getFullYear() === hoje.getFullYear();
    }).length;

    const resultado = { total, valorTotal, ticketMedio, fechamentosHoje, fechamentosMes };

    return resultado;
  };

  const contarFiltrosAtivos = () => {
    let count = 0;
    if (filtroConsultor) count++;
    if (filtroClinica) count++;
    if (filtroMes) count++;
    return count;
  };

  const limparFiltros = () => {
    // Só limpar filtro de consultor se não estiver com filtro automático ativo
    if (!deveFiltrarPorConsultor) {
      setFiltroConsultor('');
    }
    setFiltroClinica('');
    setFiltroMes('');
  };

  const handleViewObservacoes = (observacoes) => {
    setObservacoesAtual(observacoes || 'Nenhuma observação cadastrada.');
    setShowObservacoesModal(true);
  };

  const abrirModal = (fechamento = null) => {
    if (fechamento) {
      setFechamentoEditando(fechamento);
      
      // Garantir que valor_fechado seja um número válido
      const valorOriginal = fechamento.valor_fechado;
      let valorNumerico = '';
      let valorFormatado = '';
      
      if (valorOriginal !== null && valorOriginal !== undefined && valorOriginal !== '') {
        // Converter para número, independente se vier como string ou número
        const numeroLimpo = typeof valorOriginal === 'string' 
          ? parseFloat(valorOriginal.replace(/[^\d.,-]/g, '').replace(',', '.'))
          : parseFloat(valorOriginal);
        
        if (!isNaN(numeroLimpo)) {
          valorNumerico = numeroLimpo.toString();
          valorFormatado = numeroLimpo.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          });
        }
      }
      
      setNovoFechamento({ 
        ...fechamento, 
        consultor_id: fechamento.consultor_id || '',
        clinica_id: fechamento.clinica_id || '',
        tipo_tratamento: fechamento.tipo_tratamento || '',
        valor_fechado: valorNumerico,
        valor_formatado: valorFormatado 
      });
    } else {
      setFechamentoEditando(null);
      setNovoFechamento({
        paciente_id: '',
        consultor_id: '',
        clinica_id: '',
        valor_fechado: '',
        valor_formatado: '',
        data_fechamento: new Date().toISOString().split('T')[0],
        tipo_tratamento: '',
        observacoes: ''
      });
    }
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setFechamentoEditando(null);
    setContratoSelecionado(null);
    setNovoFechamento({
      paciente_id: '',
      consultor_id: '',
      clinica_id: '',
      valor_fechado: '',
      valor_formatado: '',
      data_fechamento: new Date().toISOString().split('T')[0],
      tipo_tratamento: '',
      observacoes: ''
    });
  };

  // Funções para modal de visualização
  const abrirViewModal = (fechamento) => {
    setViewingFechamento(fechamento);
    setActiveViewTab('informacoes');
    setViewModalOpen(true);
  };

  const fecharViewModal = () => {
    setViewModalOpen(false);
    setViewingFechamento(null);
    setActiveViewTab('informacoes');
  };

  const handleTabChange = (tab) => {
    setActiveViewTab(tab);
  };

  const salvarFechamento = async () => {
    setSalvando(true);
    try {
      const token = localStorage.getItem('token');
      if (!token || token === 'null' || token.trim() === '') {
        showErrorToast('Sua sessão expirou. Faça login novamente.');
        window.location.href = '/login';
        return;
      }

      if (!novoFechamento.paciente_id) {
        showWarningToast('Por favor, selecione um paciente!');
        return;
      }

      if (!fechamentoEditando && !contratoSelecionado) {
        showWarningToast('Por favor, selecione o contrato em PDF!');
        return;
      }

      if (contratoSelecionado && contratoSelecionado.type !== 'application/pdf') {
        showErrorToast('Apenas arquivos PDF são permitidos para o contrato!');
        return;
      }

      if (contratoSelecionado && contratoSelecionado.size > 10 * 1024 * 1024) {
        showErrorToast('O arquivo deve ter no máximo 10MB!');
        return;
      }

      const formData = new FormData();
      
      formData.append('paciente_id', parseInt(novoFechamento.paciente_id));
      
      if (novoFechamento.consultor_id && novoFechamento.consultor_id !== '') {
        formData.append('consultor_id', parseInt(novoFechamento.consultor_id));
      }
      
      if (novoFechamento.clinica_id && novoFechamento.clinica_id !== '') {
        formData.append('clinica_id', parseInt(novoFechamento.clinica_id));
      }
      
      // Validar e enviar valor_fechado
      const valorFechado = parseFloat(novoFechamento.valor_fechado);

      const valorMinimo = fechamentoEditando ? 0 : 0.01;
      
      if (isNaN(valorFechado) || valorFechado < 0) {
        showWarningToast('Por favor, informe um valor válido!');
        return;
      }
      
      if (valorFechado < valorMinimo) {
        showWarningToast(fechamentoEditando ? 
          'Valor deve ser maior ou igual a zero!' : 
          'Valor deve ser maior que zero!');
        return;
      }
      
      formData.append('valor_fechado', valorFechado);
      formData.append('data_fechamento', novoFechamento.data_fechamento);
      formData.append('tipo_tratamento', novoFechamento.tipo_tratamento || '');
      formData.append('observacoes', novoFechamento.observacoes || '');
      
      if (contratoSelecionado) {
        formData.append('contrato', contratoSelecionado);
      }

      // Base da URL da API
      const API_BASE_URL = process.env.NODE_ENV === 'production' ? 'https://crminvest-backend.fly.dev/api' : 'http://localhost:5000/api';
      
      const url = fechamentoEditando 
        ? `${API_BASE_URL}/fechamentos/${fechamentoEditando.id}`
        : `${API_BASE_URL}/fechamentos`;
      
             const response = await fetch(url, {
         method: fechamentoEditando ? 'PUT' : 'POST',
         headers: {
           'Authorization': `Bearer ${token}`
           // NÃO incluir 'Content-Type' ao usar FormData
         },
         body: formData,
         // Timeout de 2 minutos para uploads grandes
         signal: AbortSignal.timeout(120000)
       });

      const result = await response.json();

      if (response.ok) {
        carregarDados();
        fecharModal();
        showSuccessToast(fechamentoEditando ? 'Fechamento atualizado!' : `Fechamento registrado com sucesso! Contrato: ${result.contrato || 'anexado'}`);
      } else {
        console.error('Erro na resposta:', result);
        showErrorToast('Erro: ' + (result.error || 'Erro desconhecido'));
      }
         } catch (error) {
       console.error('Erro ao salvar fechamento:', error);
       
       let mensagemErro = 'Erro ao salvar fechamento';
       
       if (error.message.includes('timeout') || error.message.includes('AbortError')) {
         mensagemErro = 'Timeout no upload - arquivo muito grande ou conexão lenta. Tente novamente.';
       } else if (error.message.includes('fetch failed')) {
         mensagemErro = 'Erro de conexão durante o upload. Tente novamente.';
       } else {
         mensagemErro += ': ' + error.message;
       }
       
       showErrorToast(mensagemErro);
     } finally {
       setSalvando(false);
     }
  };

  const excluirFechamento = async (id) => {
    if (window.confirm('Deseja excluir este fechamento?')) {
      try {
        const response = await makeRequest(`/fechamentos/${id}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          carregarDados();
          showSuccessToast('Fechamento excluído!');
        } else {
          const data = await response.json();
          showErrorToast('Erro ao excluir: ' + (data.error || 'Erro desconhecido'));
        }
      } catch (error) {
        console.error('Erro ao excluir fechamento:', error);
        showErrorToast('Erro ao excluir: ' + error.message);
      }
    }
  };

  // Função para alterar status de aprovação
  const alterarStatusAprovacao = async (fechamentoId, novoStatus) => {
    // Verificar se o usuário tem permissão para alterar status
    if (!podeAlterarStatus) {
      showErrorToast('Você não tem permissão para alterar o status dos fechamentos');
      return;
    }

    try {
      
      const endpoint = novoStatus === 'aprovado' ? 'aprovar' : 'reprovar';
      const response = await makeRequest(`/fechamentos/${fechamentoId}/${endpoint}`, { 
        method: 'PUT' 
      });
      
      
      if (response.ok) {
        const result = await response.json();
        
        // Recarregar dados após alteração
        try {
          await carregarDados();
          showSuccessToast(`Fechamento ${novoStatus === 'aprovado' ? 'aprovado' : 'reprovado'} com sucesso!`);
        } catch (reloadError) {
          console.error('Erro ao recarregar dados:', reloadError);
          showWarningToast('Status alterado, mas houve erro ao atualizar a tela. Recarregue a página.');
        }
      } else {
        const error = await response.json();
        console.error('Erro da API:', error);
        showErrorToast('Erro ao alterar status: ' + (error.error || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error('Erro na requisição:', error);
      showErrorToast('Erro de conexão: ' + error.message);
    }
  };

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const formatarData = (data) => {
    return new Date(data + 'T00:00:00').toLocaleDateString('pt-BR');
  };

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
    
    setNovoFechamento({
      ...novoFechamento, 
      valor_fechado: valorNumerico,
      valor_formatado: valorFormatado
    });
  };

  const handlePacienteChange = async (pacienteId) => {
    setNovoFechamento({...novoFechamento, paciente_id: pacienteId});
    
    if (pacienteId) {
      // Buscar o paciente selecionado
      const paciente = pacientes.find(p => p.id === parseInt(pacienteId));
      
      if (paciente && paciente.consultor_id) {
        // Se o paciente tem consultor, selecionar automaticamente
        setNovoFechamento(prev => ({
          ...prev,
          paciente_id: pacienteId,
          consultor_id: paciente.consultor_id.toString()
        }));
      } else {
        // Se não tem consultor, manter vazio
        setNovoFechamento(prev => ({
          ...prev,
          paciente_id: pacienteId,
          consultor_id: ''
        }));
      }
      
      // Buscar último agendamento do paciente para pegar a clínica
      const ultimoAgendamento = agendamentos
        .filter(a => a.paciente_id === parseInt(pacienteId))
        .sort((a, b) => new Date(b.data_agendamento) - new Date(a.data_agendamento))[0];
      
      if (ultimoAgendamento && ultimoAgendamento.clinica_id) {
        setNovoFechamento(prev => ({
          ...prev,
          clinica_id: ultimoAgendamento.clinica_id.toString()
        }));
      } else {
        // Se não tem clínica, manter vazio
        setNovoFechamento(prev => ({
          ...prev,
          clinica_id: ''
        }));
      }
    }
  };

  const downloadContrato = async (fechamento) => {
    try {
      const API_BASE_URL = process.env.NODE_ENV === 'production' ? 'https://crminvest-backend.fly.dev/api' : 'http://localhost:5000/api';
      
      const token = localStorage.getItem('token');
      if (!token || token === 'null' || token.trim() === '') {
        showErrorToast('Sua sessão expirou. Faça login novamente.');
        window.location.href = '/login';
        return;
      }

      const response = await fetch(`${API_BASE_URL}/fechamentos/${fechamento.id}/contrato`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        showErrorToast('Erro ao baixar contrato: ' + (data.error || 'Erro desconhecido'));
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fechamento.contrato_nome_original || 'contrato.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Erro ao baixar contrato:', error);
      showErrorToast('Erro ao baixar contrato: ' + error.message);
    }
  };

  const handleTutorialComplete = () => {
    setShowTutorial(false);
    setTutorialCompleted(true);
    localStorage.setItem('tutorial-fechamentos-completed', 'true');
  };

  const handleTutorialClose = () => {
    setShowTutorial(false);
  };

  const startTutorial = () => {
    setShowTutorial(true);
  };

  if (carregando) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (erro) {
    return (
      <div style={{ padding: '2rem' }}>
        <div className="alert alert-error">
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem' }}>Erro ao carregar dados</h3>
          <p style={{ margin: '0 0 1rem 0' }}>{erro}</p>
          <button className="btn btn-primary" onClick={carregarDados}>
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  const fechamentosFiltrados = filtrarFechamentos();
  const stats = calcularEstatisticas();
  const filtrosAtivos = contarFiltrosAtivos();

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page-title">{isConsultor ? 'Visualizar Fechamentos' : 'Gerenciar Fechamentos'}</h1>
            <p className="page-subtitle">{isConsultor ? 'Visualize os fechamentos dos tratamentos dos seus pacientes' : 'Gerencie os fechamentos dos tratamentos dos pacientes'}</p>
          </div>
          {!isClinica && (
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
              title="Ver tutorial da tela de fechamentos"
            >
              Ver Tutorial
            </button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-label">Total de Fechamentos</div>
          <div className="stat-value">{stats.total || 0}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Valor Total</div>
          <div className="stat-value">{formatarMoeda(stats.valorTotal || 0)}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Ticket Médio</div>
          <div className="stat-value">{formatarMoeda(stats.ticketMedio || 0)}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Fechamentos Hoje</div>
          <div className="stat-value">{stats.fechamentosHoje || 0}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Fechamentos no Mês</div>
          <div className="stat-value">{stats.fechamentosMes || 0}</div>
        </div>
      </div>

      {/* Filtros e Ações */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ display: window.innerWidth <= 768 ? 'none' : 'flex' }} className="card-title">Lista de Fechamentos</h2>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              className="btn btn-secondary"
              onClick={() => setFiltrosVisiveis(!filtrosVisiveis)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
              </svg>
              Filtros {filtrosAtivos > 0 && `(${filtrosAtivos})`}
            </button>
            {isAdmin && (
              <button className="btn btn-primary" onClick={() => abrirModal()}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Novo Fechamento
              </button>
            )}
          </div>
        </div>

        {/* Filtros */}
        {filtrosVisiveis && (
          <div style={{ 
            padding: '1.5rem', 
            backgroundColor: '#f9fafb',
            borderBottom: '1px solid #e5e7eb'
          }}>
            <div className="grid grid-3" style={{ gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Consultor</label>
                <select 
                  className="form-select"
                  value={filtroConsultor} 
                  onChange={(e) => setFiltroConsultor(e.target.value)}
                  disabled={deveFiltrarPorConsultor}
                  style={{ 
                    opacity: deveFiltrarPorConsultor ? 0.6 : 1,
                    cursor: deveFiltrarPorConsultor ? 'not-allowed' : 'pointer'
                  }}
                >
                  <option value="">Todos</option>
                  {consultores.map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
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
                <label className="form-label">Clínica</label>
                <select 
                  className="form-select"
                  value={filtroClinica} 
                  onChange={(e) => setFiltroClinica(e.target.value)}
                >
                  <option value="">Todas</option>
                  {clinicas.map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Mês</label>
                <input 
                  type="month" 
                  className="form-input"
                  value={filtroMes} 
                  onChange={(e) => setFiltroMes(e.target.value)}
                />
              </div>
            </div>
            
            {filtrosAtivos > 0 && (
              <button 
                className="btn btn-sm btn-secondary"
                onClick={limparFiltros}
              >
                Limpar Filtros
              </button>
            )}
          </div>
        )}

        <div className="card-body">
          {fechamentosFiltrados.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
              Nenhum fechamento encontrado
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>Data</th>
                    <th>Paciente</th>
                    <th style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>Consultor</th>
                    <th style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>Clínica</th>
                    <th style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>Tipo</th>
                    <th style={{ textAlign: 'right', display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>Valor</th>
                    <th style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>
                      Status
                      {!podeAlterarStatus && (
                        <button
                          onClick={() => setShowPermissaoModal(true)}
                          style={{
                            marginLeft: '8px',
                            color: '#6b7280',
                            cursor: 'pointer',
                            fontSize: '12px',
                            position: 'relative',
                            display: 'inline-block',
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            backgroundColor: '#e5e7eb',
                            border: '1px solid #d1d5db',
                            textAlign: 'center',
                            lineHeight: '14px',
                            fontWeight: 'bold',
                            padding: 0,
                            outline: 'none'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = '#d1d5db';
                            e.target.style.borderColor = '#9ca3af';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = '#e5e7eb';
                            e.target.style.borderColor = '#d1d5db';
                          }}
                          title="Clique para saber mais sobre permissões"
                        >
                          ?
                        </button>
                      )}
                    </th>
                    <th style={{ width: '180px' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {fechamentosFiltrados.map(fechamento => {
                    const paciente = pacientes.find(p => p.id === fechamento.paciente_id);
                    const consultor = consultores.find(c => c.id === fechamento.consultor_id);
                    const clinica = clinicas.find(c => c.id === fechamento.clinica_id);

                    return (
                      <tr key={fechamento.id}>
                        <td style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>{formatarData(fechamento.data_fechamento)}</td>
                        <td>
                          <div>
                            <div style={{ fontWeight: '500' }}>{paciente?.nome || 'N/A'}</div>
                            {fechamento.observacoes && (
                              <div style={{ marginTop: '0.25rem' }}>
                                <button
                                  onClick={() => handleViewObservacoes(fechamento.observacoes)}
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
                                  title="Ver observações"
                                  onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                >
                                  •••
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                        <td style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>{consultor?.nome || 'N/A'}</td>
                        <td style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>{clinica?.nome || 'N/A'}</td>
                        <td style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>
                          {fechamento.tipo_tratamento && (
                            <span className="badge badge-info">
                              {fechamento.tipo_tratamento}
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '600', display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>
                          {formatarMoeda(fechamento.valor_fechado)}
                        </td>
                        <td style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>
                          {/* Campo select para alterar status (apenas com permissão) */}
                          {podeAlterarStatus ? (
                            <select 
                              value={fechamento.aprovado || 'pendente'} 
                              onChange={(e) => alterarStatusAprovacao(fechamento.id, e.target.value)}
                              className="form-select"
                            >
                              <option value="aprovado">Aprovado</option>
                              <option value="reprovado">Reprovado</option>
                            </select>
                          ) : (
                            <span className={`badge ${
                              fechamento.aprovado === 'aprovado' ? 'badge-success' : 
                              fechamento.aprovado === 'reprovado' ? 'badge-danger' : 
                              'badge-warning'
                            }`}>
                              {fechamento.aprovado === 'aprovado' ? 'Aprovado' : 
                               fechamento.aprovado === 'reprovado' ? 'Reprovado' : 
                               'Pendente'}
                            </span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button 
                              className="btn-action"
                              onClick={() => abrirViewModal(fechamento)}
                              title="Visualizar fechamento"
                              style={{ color: '#3b82f6' }}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                              </svg>
                            </button>
                            {!isConsultor && (
                              <button 
                                className="btn-action"
                                onClick={() => abrirModal(fechamento)}
                                title="Editar fechamento"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                              </button>
                            )}
                            {isAdmin && (
                              <button 
                                className="btn-action"
                                onClick={() => excluirFechamento(fechamento.id)}
                                title="Excluir fechamento"
                                style={{ color: '#dc2626'}}
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
      </div>

      {/* Modal */}
      {modalAberto && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">
                {fechamentoEditando ? 'Editar Fechamento' : 'Novo Fechamento'}
              </h2>
              <button className="close-btn" onClick={fecharModal}>
                ×
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); salvarFechamento(); }}>
              <div className="form-group">
                <label className="form-label">Paciente *</label>
                <select 
                  className="form-select"
                  value={novoFechamento.paciente_id || ''}
                  onChange={(e) => handlePacienteChange(e.target.value)}
                  required
                >
                  <option value="">Selecione um paciente</option>
                  {pacientes.filter(p => 
                    // Mostrar apenas pacientes com status apropriados para fechamento
                    ['agendado', 'compareceu', 'fechado'].includes(p.status)
                  ).map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nome} {p.telefone && `- ${p.telefone}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Valor (R$) *</label>
                  <input 
                    type="text"
                    className="form-input"
                    value={novoFechamento.valor_formatado}
                    onChange={handleValorChange}
                    placeholder="0,00"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Consultor</label>
                  <select 
                    className="form-select"
                    value={novoFechamento.consultor_id || ''}
                    onChange={(e) => setNovoFechamento({...novoFechamento, consultor_id: e.target.value})}
                  >
                    <option value="">Selecione um consultor</option>
                    {consultores.map(c => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Clínica</label>
                <select 
                  className="form-select"
                  value={novoFechamento.clinica_id || ''}
                  onChange={(e) => setNovoFechamento({...novoFechamento, clinica_id: e.target.value})}
                >
                  <option value="">Selecione uma clínica</option>
                  {clinicas.map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Data do Fechamento</label>
                  <input 
                    type="date"
                    className="form-input"
                    value={novoFechamento.data_fechamento}
                    onChange={(e) => setNovoFechamento({...novoFechamento, data_fechamento: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Tipo de Tratamento</label>
                  <select 
                    className="form-select"
                    value={novoFechamento.tipo_tratamento || ''}
                    onChange={(e) => setNovoFechamento({...novoFechamento, tipo_tratamento: e.target.value})}
                  >
                    <option value="">Selecione</option>
                    <option value="Estético">Estético</option>
                    <option value="Odontológico">Odontológico</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Contrato (PDF) {fechamentoEditando ? '(opcional)' : '*'}</label>
                <input 
                  type="file"
                  className="form-input"
                  accept=".pdf"
                  onChange={(e) => setContratoSelecionado(e.target.files[0])}
                />
                {fechamentoEditando && fechamentoEditando.contrato_arquivo && (
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
                    Contrato atual: {fechamentoEditando.contrato_nome_original || fechamentoEditando.contrato_arquivo}
                  </p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Observações</label>
                <textarea 
                  className="form-textarea"
                  rows="3"
                  value={novoFechamento.observacoes}
                  onChange={(e) => setNovoFechamento({...novoFechamento, observacoes: e.target.value})}
                  placeholder="Informações adicionais..."
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button 
                  type="button"
                  className="btn btn-secondary" 
                  onClick={fecharModal}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="btn btn-primary"
                  disabled={salvando}
                >
                                     {salvando ? (
                     <span className="loading-spinner" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 8 }}></span>
                   ) : null}
                   {fechamentoEditando ? 
                     (salvando ? 'Atualizando...' : 'Atualizar') : 
                     (salvando ? (contratoSelecionado ? 'Enviando contrato...' : 'Salvando...') : 'Salvar')
                   }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Visualização com Abas */}
      {viewModalOpen && viewingFechamento && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '900px', maxHeight: '90vh' }}>
            <div className="modal-header">
              <h2 className="modal-title">
                Fechamento - {viewingFechamento.paciente_nome}
              </h2>
              <button className="close-btn" onClick={fecharViewModal}>
                ×
              </button>
            </div>

            {/* Navegação por abas */}
            <div style={{ 
              display: 'flex', 
              gap: '2rem',
              padding: '1.5rem 1.5rem 0 1.5rem'
            }}>
              <button
                onClick={() => handleTabChange('informacoes')}
                style={{
                  padding: '1rem 0',
                  border: 'none',
                  background: 'none',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: activeViewTab === 'informacoes' ? '#3b82f6' : '#6b7280',
                  borderBottom: activeViewTab === 'informacoes' ? '2px solid #3b82f6' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Informações
              </button>
              
              <button
                onClick={() => handleTabChange('documentos')}
                style={{
                  padding: '1rem 0',
                  border: 'none',
                  background: 'none',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: activeViewTab === 'documentos' ? '#3b82f6' : '#6b7280',
                  borderBottom: activeViewTab === 'documentos' ? '2px solid #3b82f6' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Documentos
              </button>
              
              <button
                onClick={() => handleTabChange('historico')}
                style={{
                  padding: '1rem 0',
                  border: 'none',
                  background: 'none',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: activeViewTab === 'historico' ? '#3b82f6' : '#6b7280',
                  borderBottom: activeViewTab === 'historico' ? '2px solid #3b82f6' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Histórico
              </button>
            </div>

            <div style={{ padding: '0 1.5rem 1.5rem 1.5rem', maxHeight: '60vh', overflowY: 'auto' }}>
              {/* Aba de Informações */}
              {activeViewTab === 'informacoes' && (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div>
                    <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Paciente</label>
                    <div style={{ 
                      padding: '0.75rem', 
                      backgroundColor: '#f9fafb', 
                      borderRadius: '6px',
                      border: '1px solid #e5e7eb'
                    }}>
                      {viewingFechamento.paciente_nome}
                    </div>
                  </div>
                  
                  <div>
                    <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Valor Fechado</label>
                    <div style={{ 
                      padding: '0.75rem', 
                      backgroundColor: '#f9fafb', 
                      borderRadius: '6px',
                      border: '1px solid #e5e7eb',
                      fontWeight: '600',
                      color: '#059669'
                    }}>
                      R$ {parseFloat(viewingFechamento.valor_fechado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div>
                    <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Consultor</label>
                    <div style={{ 
                      padding: '0.75rem', 
                      backgroundColor: '#f9fafb', 
                      borderRadius: '6px',
                      border: '1px solid #e5e7eb'
                    }}>
                      {viewingFechamento.consultor_nome || 'Não informado'}
                    </div>
                  </div>
                  
                  <div>
                    <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Clínica</label>
                    <div style={{ 
                      padding: '0.75rem', 
                      backgroundColor: '#f9fafb', 
                      borderRadius: '6px',
                      border: '1px solid #e5e7eb'
                    }}>
                      {viewingFechamento.clinica_nome || 'Não informado'}
                    </div>
                  </div>

                  <div>
                    <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Data do Fechamento</label>
                    <div style={{ 
                      padding: '0.75rem', 
                      backgroundColor: '#f9fafb', 
                      borderRadius: '6px',
                      border: '1px solid #e5e7eb'
                    }}>
                      {new Date(viewingFechamento.data_fechamento).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  
                  <div>
                    <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Tipo de Tratamento</label>
                    <div style={{ 
                      padding: '0.75rem', 
                      backgroundColor: '#f9fafb', 
                      borderRadius: '6px',
                      border: '1px solid #e5e7eb'
                    }}>
                      {viewingFechamento.tipo_tratamento || 'Não informado'}
                    </div>
                  </div>

                  <div>
                    <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Status de Aprovação</label>
                    <div style={{ 
                      padding: '0.75rem', 
                      backgroundColor: '#f9fafb', 
                      borderRadius: '6px',
                      border: '1px solid #e5e7eb',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        backgroundColor: viewingFechamento.aprovado === 1 ? '#dcfce7' : '#fef3c7',
                        color: viewingFechamento.aprovado === 1 ? '#166534' : '#92400e'
                      }}>
                        {viewingFechamento.aprovado === 1 ? 'Aprovado' : 'Pendente'}
                      </span>
                    </div>
                  </div>

                  {viewingFechamento.observacoes && (
                    <div>
                      <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Observações</label>
                      <div style={{ 
                        padding: '0.75rem', 
                        backgroundColor: '#f9fafb', 
                        borderRadius: '6px',
                        border: '1px solid #e5e7eb',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {viewingFechamento.observacoes}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Aba de Documentos */}
              {activeViewTab === 'documentos' && (
                <div>
                  <h3 style={{ 
                    fontSize: '1.125rem', 
                    fontWeight: '600', 
                    color: '#374151', 
                    marginBottom: '1rem' 
                  }}>
                    Documentos do Fechamento
                  </h3>
                  
                  {viewingFechamento.contrato_arquivo ? (
                    <div style={{
                      padding: '1rem',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#dc2626' }}>
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14,2 14,8 20,8"></polyline>
                        </svg>
                        <div>
                          <div style={{ fontWeight: '600', color: '#374151' }}>
                            {viewingFechamento.contrato_nome_original || 'contrato.pdf'}
                          </div>
                          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                            Contrato anexado ao fechamento
                          </div>
                        </div>
                      </div>
                      
                      <a
                        href={`/api/fechamentos/download-contrato/${viewingFechamento.id}`}
                        download
                        className="btn btn-primary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="7 10 12 15 17 10"></polyline>
                          <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Baixar Contrato
                      </a>
                    </div>
                  ) : (
                    <div style={{
                      padding: '2rem',
                      textAlign: 'center',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#9ca3af', margin: '0 auto 1rem' }}>
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14,2 14,8 20,8"></polyline>
                      </svg>
                      <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                        Nenhum contrato foi anexado a este fechamento
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Aba de Histórico */}
              {activeViewTab === 'historico' && (
                <div>
                  <h3 style={{ 
                    fontSize: '1.125rem', 
                    fontWeight: '600', 
                    color: '#374151', 
                    marginBottom: '1rem' 
                  }}>
                    Histórico do Fechamento
                  </h3>
                  
                  <div style={{
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    padding: '1rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#10b981'
                      }}></div>
                      <div>
                        <div style={{ fontWeight: '600', color: '#374151' }}>
                          Fechamento criado
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                          {new Date(viewingFechamento.created_at).toLocaleString('pt-BR')}
                        </div>
                      </div>
                    </div>
                    
                    {viewingFechamento.aprovado === 1 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: '#3b82f6'
                        }}></div>
                        <div>
                          <div style={{ fontWeight: '600', color: '#374151' }}>
                            Fechamento aprovado
                          </div>
                          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                            {viewingFechamento.updated_at && new Date(viewingFechamento.updated_at).toLocaleString('pt-BR')}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div style={{ 
              padding: '1rem 1.5rem', 
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '1rem'
            }}>
              <button 
                className="btn btn-secondary" 
                onClick={fecharViewModal}
              >
                Fechar
              </button>
              {!isConsultor && (
                <button 
                  className="btn btn-primary" 
                  onClick={() => {
                    fecharViewModal();
                    abrirModal(viewingFechamento);
                  }}
                >
                  Editar Fechamento
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Observações */}
      {showObservacoesModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Observações do fechamento</h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <div style={{
                backgroundColor: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '1rem',
                minHeight: '120px',
                fontSize: '0.875rem',
                lineHeight: '1.5',
                color: '#374151',
                whiteSpace: 'pre-wrap'
              }}>
                {observacoesAtual}
              </div>
              <div style={{ marginTop: '1rem', textAlign: 'right' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setShowObservacoesModal(false)}
                >
                  Fechar
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
                  Como consultor freelancer, você não pode alterar o status dos pacientes, aguarde que iremos atualizar o status conforme a negociação avançar.
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

      {/* Tutorial Overlay */}
      <TutorialFechamentos
        isOpen={showTutorial}
        onClose={handleTutorialClose}
        onComplete={handleTutorialComplete}
      />
    </div>
  );
};

export default Fechamentos; 