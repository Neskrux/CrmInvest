import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import TutorialFechamentos from './TutorialFechamentos';
import ModalEvidencia from './ModalEvidencia';

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
    observacoes: '',
    // Campos de parcelamento
    valor_parcela: '',
    valor_parcela_formatado: '',
    numero_parcelas: '',
    vencimento: '',
    antecipacao_meses: '',
    // Campos administrativos
    data_operacao: '',
    valor_entregue: '',
    valor_entregue_formatado: '',
    tipo_operacao: ''
  });
  const [contratoSelecionado, setContratoSelecionado] = useState(null);
  const [printConfirmacaoSelecionado, setPrintConfirmacaoSelecionado] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [showObservacoesModal, setShowObservacoesModal] = useState(false);
  const [observacoesAtual, setObservacoesAtual] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const { error: showErrorToast, success: showSuccessToast, warning: showWarningToast, info: showInfoToast } = useToast();
  const [uploadingDocs, setUploadingDocs] = useState({});
  const [activeObservacoesTab, setActiveObservacoesTab] = useState('observacoes');
  const [evidenciasFechamento, setEvidenciasFechamento] = useState([]);
  const [fechamentoObservacoes, setFechamentoObservacoes] = useState(null);

  // Estados para controlar o tutorial
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialCompleted, setTutorialCompleted] = useState(false);

  // Estado para modal de explicação de permissões
  const [showPermissaoModal, setShowPermissaoModal] = useState(false);

  // Estados para modal de evidência
  const [showEvidenciaModal, setShowEvidenciaModal] = useState(false);
  const [evidenciaData, setEvidenciaData] = useState({
    fechamentoId: null,
    fechamentoNome: '',
    statusAnterior: '',
    statusNovo: '',
    evidenciaId: null
  });

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

  // Listener para sincronização entre telas (com dependência correta)
  useEffect(() => {
    const handleDataUpdate = () => {
      // Recarregar dados apenas se não estiver com modal aberto
      if (!modalAberto && !viewModalOpen && !showObservacoesModal) {
        carregarDados();
      }
    };

    window.addEventListener('data_updated', handleDataUpdate);
    
    return () => {
      window.removeEventListener('data_updated', handleDataUpdate);
    };
  }, [modalAberto, viewModalOpen, showObservacoesModal]);

  // Controlar scroll do body quando modal estiver aberto
  useEffect(() => {
    if (modalAberto || showObservacoesModal || viewModalOpen || showEvidenciaModal) {
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
  }, [modalAberto, showObservacoesModal, viewModalOpen, showEvidenciaModal]);

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

  const handleViewObservacoes = async (observacoes, fechamento) => {
    setObservacoesAtual(observacoes || 'Nenhuma observação cadastrada.');
    setFechamentoObservacoes(fechamento);
    setActiveObservacoesTab('observacoes');
    
    // Buscar evidências do fechamento
    if (fechamento && fechamento.id) {
      try {
        // Corrigido: usar formato de URL correto /:tipo/:registroId
        const response = await makeRequest(`/evidencias/fechamento/${fechamento.id}`);
        if (response.ok) {
          const data = await response.json();
          setEvidenciasFechamento(Array.isArray(data) ? data : []);
        } else {
          setEvidenciasFechamento([]);
        }
      } catch (error) {
        console.error('Erro ao buscar evidências:', error);
        setEvidenciasFechamento([]);
      }
    }
    
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
      
      // Processar valor_entregue
      const valorEntregueOriginal = fechamento.valor_entregue;
      let valorEntregueNumerico = '';
      let valorEntregueFormatado = '';
      
      if (valorEntregueOriginal !== null && valorEntregueOriginal !== undefined && valorEntregueOriginal !== '') {
        const numeroLimpo = typeof valorEntregueOriginal === 'string' 
          ? parseFloat(valorEntregueOriginal.replace(/[^\d.,-]/g, '').replace(',', '.'))
          : parseFloat(valorEntregueOriginal);
        
        if (!isNaN(numeroLimpo)) {
          valorEntregueNumerico = numeroLimpo.toString();
          valorEntregueFormatado = numeroLimpo.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          });
        }
      }
      
      // Processar valor_parcela
      const valorParcelaOriginal = fechamento.valor_parcela;
      let valorParcelaNumerico = '';
      let valorParcelaFormatado = '';
      
      if (valorParcelaOriginal !== null && valorParcelaOriginal !== undefined && valorParcelaOriginal !== '') {
        const numeroLimpo = typeof valorParcelaOriginal === 'string' 
          ? parseFloat(valorParcelaOriginal.replace(/[^\d.,-]/g, '').replace(',', '.'))
          : parseFloat(valorParcelaOriginal);
        
        if (!isNaN(numeroLimpo)) {
          valorParcelaNumerico = numeroLimpo.toString();
          valorParcelaFormatado = numeroLimpo.toLocaleString('pt-BR', {
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
        valor_formatado: valorFormatado,
        // Campos de parcelamento
        valor_parcela: valorParcelaNumerico,
        valor_parcela_formatado: valorParcelaFormatado,
        numero_parcelas: fechamento.numero_parcelas || '',
        vencimento: fechamento.vencimento || '',
        antecipacao_meses: fechamento.antecipacao_meses || '',
        // Campos administrativos
        data_operacao: fechamento.data_operacao || '',
        valor_entregue: valorEntregueNumerico,
        valor_entregue_formatado: valorEntregueFormatado,
        tipo_operacao: fechamento.tipo_operacao || ''
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
        observacoes: '',
        // Campos de parcelamento
        valor_parcela: '',
        valor_parcela_formatado: '',
        numero_parcelas: '',
        vencimento: '',
        antecipacao_meses: '',
        // Campos administrativos
        data_operacao: '',
        valor_entregue: '',
        valor_entregue_formatado: '',
        tipo_operacao: ''
      });
    }
    setPrintConfirmacaoSelecionado(null);
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setFechamentoEditando(null);
    setContratoSelecionado(null);
    setPrintConfirmacaoSelecionado(null);
    setNovoFechamento({
      paciente_id: '',
      consultor_id: '',
      clinica_id: '',
      valor_fechado: '',
      valor_formatado: '',
      data_fechamento: new Date().toISOString().split('T')[0],
      tipo_tratamento: '',
      observacoes: '',
      // Campos de parcelamento
      valor_parcela: '',
      valor_parcela_formatado: '',
      numero_parcelas: '',
      vencimento: '',
      antecipacao_meses: '',
      // Campos administrativos
      data_operacao: '',
      valor_entregue: '',
      valor_entregue_formatado: '',
      tipo_operacao: ''
    });
  };

  // Funções para modal de visualização
  const abrirViewModal = async (fechamento) => {
    setViewingFechamento(fechamento);
    setActiveViewTab('informacoes');
    
    // Buscar evidências do fechamento
    if (fechamento && fechamento.id) {
      try {
        const response = await makeRequest(`/evidencias/fechamento/${fechamento.id}`);
        if (response.ok) {
          const data = await response.json();
          setEvidenciasFechamento(Array.isArray(data) ? data : []);
        } else {
          setEvidenciasFechamento([]);
        }
      } catch (error) {
        console.error('Erro ao buscar evidências:', error);
        setEvidenciasFechamento([]);
      }
    }
    
    setViewModalOpen(true);
  };

  const fecharViewModal = () => {
    setViewModalOpen(false);
    setViewingFechamento(null);
    setActiveViewTab('informacoes');
    setEvidenciasFechamento([]);
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
      
      // Campos de parcelamento
      if (novoFechamento.valor_parcela) {
        formData.append('valor_parcela', parseFloat(novoFechamento.valor_parcela));
      }
      if (novoFechamento.numero_parcelas) {
        formData.append('numero_parcelas', parseInt(novoFechamento.numero_parcelas));
      }
      if (novoFechamento.vencimento) {
        formData.append('vencimento', novoFechamento.vencimento);
      }
      if (novoFechamento.antecipacao_meses) {
        formData.append('antecipacao_meses', parseInt(novoFechamento.antecipacao_meses));
      }
      
      // Campos administrativos (admin/consultor interno)
      if (novoFechamento.data_operacao) {
        formData.append('data_operacao', novoFechamento.data_operacao);
      }
      if (novoFechamento.valor_entregue) {
        formData.append('valor_entregue', parseFloat(novoFechamento.valor_entregue));
      }
      if (novoFechamento.tipo_operacao) {
        formData.append('tipo_operacao', novoFechamento.tipo_operacao);
      }
      if (printConfirmacaoSelecionado) {
        formData.append('print_confirmacao', printConfirmacaoSelecionado);
      }
      
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
  const alterarStatusAprovacao = async (fechamentoId, novoStatus, evidenciaId = null) => {
    // Verificar se o usuário tem permissão para alterar status (apenas admin)
    if (!isAdmin) {
      showErrorToast('Apenas administradores podem alterar o status dos fechamentos');
      return;
    }

    // VERIFICAR SE STATUS REQUER EVIDÊNCIA (apenas para reprovado)
    if (novoStatus === 'reprovado' && !evidenciaId) {
      const fechamento = fechamentos.find(f => f.id === fechamentoId);
      if (fechamento) {
        // Abrir modal de evidência
        setEvidenciaData({
          fechamentoId: fechamentoId,
          fechamentoNome: fechamento.paciente_nome,
          statusAnterior: fechamento.aprovado || 'pendente',
          statusNovo: novoStatus,
          evidenciaId: null
        });
        setShowEvidenciaModal(true);
      }
      return;
    }

    try {
      
      const endpoint = novoStatus === 'aprovado' ? 'aprovar' : 'reprovar';
      const response = await makeRequest(`/fechamentos/${fechamentoId}/${endpoint}`, { 
        method: 'PUT',
        body: evidenciaId ? JSON.stringify({ evidencia_id: evidenciaId }) : undefined
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
  
  const handleValorEntregueChange = (e) => {
    const valorDigitado = e.target.value;
    const valorFormatado = formatarValorInput(valorDigitado);
    const valorNumerico = desformatarValor(valorFormatado);
    
    setNovoFechamento({
      ...novoFechamento, 
      valor_entregue: valorNumerico,
      valor_entregue_formatado: valorFormatado
    });
  };
  
  const handleValorParcelaChange = (e) => {
    const valorDigitado = e.target.value;
    const valorFormatado = formatarValorInput(valorDigitado);
    const valorNumerico = desformatarValor(valorFormatado);
    
    setNovoFechamento({
      ...novoFechamento, 
      valor_parcela: valorNumerico,
      valor_parcela_formatado: valorFormatado
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
      if (!fechamento || !fechamento.id) {
        showErrorToast('Fechamento inválido');
        console.error('Fechamento sem ID:', fechamento);
        return;
      }

      if (!fechamento.contrato_arquivo) {
        showErrorToast('Nenhum contrato anexado a este fechamento');
        return;
      }

      // Solicitar URL assinada ao backend (gerada sob demanda)
      const response = await makeRequest(`/fechamentos/${fechamento.id}/contrato-url`);
      
      if (!response.ok) {
        const data = await response.json();
        showErrorToast('Erro ao gerar link de download: ' + (data.error || 'Erro desconhecido'));
        return;
      }

      const { url, nome } = await response.json();

      // Abrir URL assinada em nova aba
      window.open(url, '_blank');
    } catch (error) {
      console.error('Erro ao abrir contrato:', error);
      showErrorToast('Erro ao abrir contrato: ' + error.message);
    }
  };

  // Função para upload de documentos do paciente
  const handleUploadDocumentoPaciente = async (event, pacienteId, docType) => {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validar tamanho (10MB)
    if (file.size > 10 * 1024 * 1024) {
      showErrorToast('Arquivo muito grande! Máximo 10MB');
      return;
    }
    
    setUploadingDocs(prev => ({ ...prev, [docType]: true }));
    
    const formData = new FormData();
    formData.append('document', file);
    
    try {
      const API_BASE_URL = process.env.NODE_ENV === 'production' ? 'https://crminvest-backend.fly.dev/api' : 'http://localhost:5000/api';
      const response = await fetch(`${API_BASE_URL}/documents/upload-paciente/${pacienteId}/${docType}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
      
      if (response.ok) {
        showSuccessToast('Documento enviado com sucesso!');
        await carregarDados();
        
        // Atualizar visualização se modal estiver aberto
        if (viewingFechamento && viewingFechamento.paciente_id === pacienteId) {
          const pacienteAtualizado = pacientes.find(p => p.id === pacienteId);
          if (pacienteAtualizado) {
            // O paciente será atualizado no próximo carregarDados
          }
        }
      } else {
        const error = await response.json();
        showErrorToast(error.error || 'Erro ao enviar documento');
      }
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      showErrorToast('Erro ao enviar documento');
    } finally {
      setUploadingDocs(prev => ({ ...prev, [docType]: false }));
      // Limpar o input
      event.target.value = '';
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

  // Função chamada quando evidência é enviada com sucesso
  const handleEvidenciaSuccess = async (evidenciaId) => {
    // Atualizar status agora que temos a evidência
    await alterarStatusAprovacao(evidenciaData.fechamentoId, evidenciaData.statusNovo, evidenciaId);
  };

  // Função chamada quando modal de evidência é fechado/cancelado
  const handleEvidenciaClose = () => {
    setShowEvidenciaModal(false);
    setEvidenciaData({
      fechamentoId: null,
      fechamentoNome: '',
      statusAnterior: '',
      statusNovo: '',
      evidenciaId: null
    });
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
            {(isAdmin || isConsultorInterno) && (
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
                    {(isAdmin || isConsultorInterno) && (
                      <th style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>Dados Op.</th>
                    )}
                    <th style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>
                      Status
                      {!isAdmin && (
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
                                  onClick={() => handleViewObservacoes(fechamento.observacoes, fechamento)}
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
                        {(isAdmin || isConsultorInterno) && (
                          <td style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>
                            {(() => {
                              // Verificar se dados administrativos estão completos
                              const temDataOperacao = !!fechamento.data_operacao;
                              const temValorEntregue = fechamento.valor_entregue !== null && fechamento.valor_entregue !== undefined;
                              const temTipo = !!fechamento.tipo_operacao;
                              const temPrint = !!fechamento.print_confirmacao_arquivo;
                              
                              const totalCampos = 4;
                              const camposPreenchidos = [temDataOperacao, temValorEntregue, temTipo, temPrint].filter(Boolean).length;
                              const completo = camposPreenchidos === totalCampos;
                              
                              return (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                                  <span style={{
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    color: completo ? '#059669' : '#dc2626',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem'
                                  }}>
                                    {completo ? (
                                      <>
                                        Completo
                                      </>
                                    ) : (
                                      <>
                                        Incompleto
                                      </>
                                    )}
                                  </span>
                                  <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                                    {camposPreenchidos}/{totalCampos}
                                  </div>
                                </div>
                              );
                            })()}
                          </td>
                        )}
                        <td style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>
                          {/* Calcular progresso de documentação */}
                          {(() => {
                            const pacienteFechamento = pacientes.find(p => p.id === fechamento.paciente_id);
                            if (!pacienteFechamento) {
                              return <span className="badge badge-warning">Paciente não encontrado</span>;
                            }
                            
                            const totalDocs = 4;
                            const docsEnviados = [
                              pacienteFechamento.selfie_doc_url,
                              pacienteFechamento.documento_url,
                              pacienteFechamento.comprovante_residencia_url,
                              pacienteFechamento.contrato_servico_url
                            ].filter(Boolean).length;
                            
                            // Determinar status baseado em documentação e aprovação
                            let statusFechamento = fechamento.aprovado || 'documentacao_pendente';
                            
                            // Se documentação incompleta, sempre mostrar "Documentação Pendente"
                            if (docsEnviados < totalDocs && statusFechamento !== 'reprovado') {
                              statusFechamento = 'documentacao_pendente';
                            }
                            
                            const statusOptions = [
                              { value: 'documentacao_pendente', label: 'Doc. Pendente', color: '#f59e0b' },
                              { value: 'aprovado', label: 'Aprovado', color: '#10b981' },
                              { value: 'reprovado', label: 'Reprovado', color: '#ef4444' }
                            ];
                            
                            const currentStatus = statusOptions.find(s => s.value === statusFechamento) || statusOptions[0];
                            
                            return isAdmin ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <select 
                                  value={statusFechamento} 
                                  onChange={(e) => alterarStatusAprovacao(fechamento.id, e.target.value)}
                                  className="form-select"
                                  style={{ 
                                    fontSize: '0.75rem',
                                    padding: '0.25rem 0.5rem',
                                    border: 'none',
                                    backgroundColor: currentStatus.color + '20',
                                    color: currentStatus.color,
                                    fontWeight: '600',
                                    borderRadius: '0.375rem',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {statusOptions.map(option => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                                <div style={{ fontSize: '0.7rem', color: '#6b7280', textAlign: 'center' }}>
                                  Docs: {docsEnviados}/{totalDocs}
                                </div>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'center' }}>
                                <span 
                                  className="badge"
                                  style={{
                                    backgroundColor: currentStatus.color + '20',
                                    color: currentStatus.color,
                                    fontWeight: '600',
                                    border: `1px solid ${currentStatus.color}`,
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: '0.375rem',
                                    fontSize: '0.75rem'
                                  }}
                                >
                                  {currentStatus.label}
                                </span>
                                <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                                  {docsEnviados}/{totalDocs} docs
                                </div>
                              </div>
                            );
                          })()}
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
                            {(isAdmin || (isConsultorInterno && fechamento.consultor_id === user?.id)) && (
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
                  disabled={isConsultorInterno && !isAdmin && fechamentoEditando}
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
                {isConsultorInterno && !isAdmin && fechamentoEditando && (
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                    Consultor pode editar apenas dados de operação
                  </p>
                )}
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
                    disabled={isConsultorInterno && !isAdmin && fechamentoEditando}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Consultor</label>
                  <select 
                    className="form-select"
                    value={novoFechamento.consultor_id || ''}
                    onChange={(e) => setNovoFechamento({...novoFechamento, consultor_id: e.target.value})}
                    disabled={isConsultorInterno && !isAdmin && fechamentoEditando}
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
                  disabled={isConsultorInterno && !isAdmin && fechamentoEditando}
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
                    disabled={isConsultorInterno && !isAdmin && fechamentoEditando}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Tipo de Tratamento</label>
                  <select 
                    className="form-select"
                    value={novoFechamento.tipo_tratamento || ''}
                    onChange={(e) => setNovoFechamento({...novoFechamento, tipo_tratamento: e.target.value})}
                    disabled={isConsultorInterno && !isAdmin && fechamentoEditando}
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
                  disabled={isConsultorInterno && !isAdmin && fechamentoEditando}
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
                  disabled={isConsultorInterno && !isAdmin && fechamentoEditando}
                />
              </div>

              {/* Seção de Parcelamento */}
              <div style={{ 
                border: '1px solid #10b981', 
                borderRadius: '8px', 
                padding: '1rem', 
                marginTop: '1.5rem',
                backgroundColor: '#f0fdf4',
                opacity: isConsultorInterno && !isAdmin && fechamentoEditando ? 0.6 : 1
              }}>
                <h4 style={{ 
                  margin: '0 0 1rem 0', 
                  fontSize: '1rem', 
                  fontWeight: '600', 
                  color: '#065f46',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  Dados de Parcelamento
                  {isConsultorInterno && !isAdmin && fechamentoEditando && (
                    <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 'normal' }}>
                      (Bloqueado para consultor)
                    </span>
                  )}
                </h4>
                
                <div className="grid grid-2" style={{ gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Valor da Parcela (R$)</label>
                    <input 
                      type="text"
                      className="form-input"
                      value={novoFechamento.valor_parcela_formatado || ''}
                      onChange={handleValorParcelaChange}
                      placeholder="0,00"
                      disabled={isConsultorInterno && !isAdmin && fechamentoEditando}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Nº de Parcelas</label>
                    <input 
                      type="number"
                      className="form-input"
                      value={novoFechamento.numero_parcelas || ''}
                      onChange={(e) => setNovoFechamento({...novoFechamento, numero_parcelas: e.target.value})}
                      placeholder="Ex: 12"
                      min="1"
                      disabled={isConsultorInterno && !isAdmin && fechamentoEditando}
                    />
                  </div>
                </div>

                <div className="grid grid-2" style={{ gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Dia do Vencimento</label>
                    <input 
                      type="date"
                      className="form-input"
                      value={novoFechamento.vencimento || ''}
                      onChange={(e) => setNovoFechamento({...novoFechamento, vencimento: e.target.value})}
                      disabled={isConsultorInterno && !isAdmin && fechamentoEditando}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Antecipação (em meses)</label>
                    <input 
                      type="number"
                      className="form-input"
                      value={novoFechamento.antecipacao_meses || ''}
                      onChange={(e) => setNovoFechamento({...novoFechamento, antecipacao_meses: e.target.value})}
                      placeholder="Ex: 3"
                      min="1"
                      disabled={isConsultorInterno && !isAdmin && fechamentoEditando}
                    />
                  </div>
                </div>
              </div>

              {/* Seção de Dados Administrativos - Apenas Admin/Consultor Interno */}
              {(isAdmin || isConsultorInterno) && (
                <div style={{ 
                  border: '1px solid #3b82f6', 
                  borderRadius: '8px', 
                  padding: '1rem', 
                  marginTop: '1.5rem',
                  marginBottom: '1.5rem',
                  backgroundColor: '#eff6ff'
                }}>
                  <h4 style={{ 
                    margin: '0 0 1rem 0', 
                    fontSize: '1rem', 
                    fontWeight: '600', 
                    color: '#1e40af',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    Dados da Operação
                    {isConsultorInterno && !isAdmin && fechamentoEditando && (
                      <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 'normal' }}>
                        (Editável para consultor)
                      </span>
                    )}
                  </h4>
                  
                  <div className="grid grid-2" style={{ gap: '1rem', marginBottom: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Data da Operação</label>
                      <input 
                        type="date"
                        className="form-input"
                        value={novoFechamento.data_operacao || ''}
                        onChange={(e) => setNovoFechamento({...novoFechamento, data_operacao: e.target.value})}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Tipo</label>
                      <select 
                        className="form-select"
                        value={novoFechamento.tipo_operacao || ''}
                        onChange={(e) => setNovoFechamento({...novoFechamento, tipo_operacao: e.target.value})}
                      >
                        <option value="">Selecione</option>
                        <option value="operacao">Operação</option>
                        <option value="colateral">Colateral</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="form-label">Valor Entregue (R$)</label>
                    <input 
                      type="text"
                      className="form-input"
                      value={novoFechamento.valor_entregue_formatado || ''}
                      onChange={handleValorEntregueChange}
                      placeholder="0,00"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Print de Confirmação com Sacado</label>
                    <input 
                      type="file"
                      className="form-input"
                      accept="image/*,.pdf"
                      onChange={(e) => setPrintConfirmacaoSelecionado(e.target.files[0])}
                    />
                    {printConfirmacaoSelecionado && (
                      <div style={{ 
                        marginTop: '0.5rem', 
                        fontSize: '0.875rem', 
                        color: '#059669',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        {printConfirmacaoSelecionado.name}
                      </div>
                    )}
                    {fechamentoEditando && fechamentoEditando.print_confirmacao_arquivo && !printConfirmacaoSelecionado && (
                      <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
                        Print atual: {fechamentoEditando.print_confirmacao_nome || 'anexado'}
                      </p>
                    )}
                  </div>
                </div>
              )}

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
          <div className="modal" style={{ maxWidth: '900px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
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
              padding: '1.5rem 1.5rem 0 1.5rem',
              flexShrink: 0
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
                onClick={() => handleTabChange('parcelamento')}
                style={{
                  padding: '1rem 0',
                  border: 'none',
                  background: 'none',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: activeViewTab === 'parcelamento' ? '#3b82f6' : '#6b7280',
                  borderBottom: activeViewTab === 'parcelamento' ? '2px solid #3b82f6' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Parcelamento
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
              
              <button
                onClick={() => handleTabChange('evidencias')}
                style={{
                  padding: '1rem 0',
                  border: 'none',
                  background: 'none',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: activeViewTab === 'evidencias' ? '#3b82f6' : '#6b7280',
                  borderBottom: activeViewTab === 'evidencias' ? '2px solid #3b82f6' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                Evidências
                {evidenciasFechamento.length > 0 && (
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
                    {evidenciasFechamento.length}
                  </span>
                )}
              </button>
              
              {(isAdmin || isConsultorInterno) && (
                <button
                  onClick={() => handleTabChange('operacao')}
                  style={{
                    padding: '1rem 0',
                    border: 'none',
                    background: 'none',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: activeViewTab === 'operacao' ? '#3b82f6' : '#6b7280',
                    borderBottom: activeViewTab === 'operacao' ? '2px solid #3b82f6' : '2px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  Dados da Operação
                  {(() => {
                    const temDataOperacao = !!viewingFechamento.data_operacao;
                    const temValorEntregue = viewingFechamento.valor_entregue !== null && viewingFechamento.valor_entregue !== undefined;
                    const temTipo = !!viewingFechamento.tipo_operacao;
                    const temPrint = !!viewingFechamento.print_confirmacao_arquivo;
                    const camposPreenchidos = [temDataOperacao, temValorEntregue, temTipo, temPrint].filter(Boolean).length;
                    const incompleto = camposPreenchidos < 4;
                    
                    return incompleto ? (
                      <span style={{
                        backgroundColor: '#dc2626',
                        color: 'white',
                        fontSize: '0.7rem',
                        fontWeight: '600',
                        padding: '0.125rem 0.375rem',
                        borderRadius: '9999px',
                        minWidth: '20px',
                        textAlign: 'center'
                      }}>
                        !
                      </span>
                    ) : null;
                  })()}
                </button>
              )}
            </div>

            <div style={{ padding: '0 1.5rem 1.5rem 1.5rem', flex: 1, overflowY: 'auto' }}>
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
                    fontWeight: '700', 
                    color: '#1a1d23', 
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                    </svg>
                    Documentação do Paciente
                  </h3>
                  
                  {/* Contrato de Fechamento */}
                  <div style={{ marginBottom: '2rem' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: '600', color: '#374151', marginBottom: '0.75rem' }}>
                      Contrato de Fechamento
                    </h4>
                    {viewingFechamento.contrato_arquivo ? (
                      <div style={{
                        padding: '1rem',
                        backgroundColor: '#f0fdf4',
                        borderRadius: '8px',
                        border: '1px solid #86efac'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#059669' }}>
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14,2 14,8 20,8"></polyline>
                          </svg>
                          <div>
                            <div style={{ fontWeight: '600', color: '#065f46' }}>
                              {viewingFechamento.contrato_nome_original || 'contrato.pdf'}
                            </div>
                            <div style={{ fontSize: '0.875rem', color: '#059669' }}>
                              ✓ Contrato anexado ao fechamento
                            </div>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => downloadContrato(viewingFechamento)}
                          className="btn btn-primary"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                          </svg>
                          Baixar Contrato
                        </button>
                      </div>
                    ) : (
                      <div style={{
                        padding: '1rem',
                        textAlign: 'center',
                        backgroundColor: '#fef2f2',
                        borderRadius: '8px',
                        border: '1px solid #fecaca'
                      }}>
                        <div style={{ color: '#dc2626', fontSize: '0.875rem' }}>
                          Nenhum contrato foi anexado a este fechamento
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Documentos do Paciente */}
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: '600', color: '#374151', marginBottom: '0.75rem' }}>
                      Documentos do Paciente
                    </h4>
                    
                    {(() => {
                      const pacienteFechamento = pacientes.find(p => p.id === viewingFechamento.paciente_id);
                      
                      if (!pacienteFechamento) {
                        return (
                          <div style={{ padding: '1rem', backgroundColor: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
                            <div style={{ color: '#dc2626', fontSize: '0.875rem' }}>
                              Paciente não encontrado
                            </div>
                          </div>
                        );
                      }
                      
                      const documentos = [
                        { key: 'selfie_doc_url', label: '1. Selfie com Documento', required: true },
                        { key: 'documento_url', label: '2. Documento (RG/CNH)', required: true },
                        { key: 'comprovante_residencia_url', label: '3. Comprovante de Residência', required: true },
                        { key: 'contrato_servico_url', label: '4. Contrato de Serviço', required: true }
                      ];
                      
                      const totalDocs = 4;
                      const docsEnviados = documentos.filter(doc => pacienteFechamento[doc.key]).length;
                      
                      return (
                        <>
                          {/* Barra de progresso */}
                          <div style={{ 
                            marginBottom: '1.5rem', 
                            padding: '1rem', 
                            backgroundColor: '#f0f9ff',
                            borderRadius: '8px',
                            border: '1px solid #3b82f6'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1e40af', margin: 0 }}>
                                  Progresso da Documentação
                                </h4>
                                <p style={{ fontSize: '0.75rem', color: '#3730a3', margin: '0.25rem 0 0 0' }}>
                                  {docsEnviados} de {totalDocs} documentos enviados
                                </p>
                              </div>
                              <div style={{ 
                                width: '120px', 
                                height: '8px', 
                                backgroundColor: '#e5e7eb',
                                borderRadius: '4px',
                                overflow: 'hidden'
                              }}>
                                <div style={{ 
                                  width: `${(docsEnviados / totalDocs) * 100}%`,
                                  height: '100%',
                                  backgroundColor: docsEnviados === totalDocs ? '#10b981' : '#3b82f6',
                                  transition: 'width 0.3s ease'
                                }} />
                              </div>
                            </div>
                          </div>
                          
                          {/* Lista de documentos */}
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                            gap: '1rem'
                          }}>
                            {documentos.map(doc => {
                              const docEnviado = pacienteFechamento[doc.key];
                              const docKey = doc.key.replace('_url', '');
                              const aprovadoStatus = pacienteFechamento[`${docKey}_aprovado`];
                              
                              return (
                                <div key={doc.key} style={{
                                  padding: '1rem',
                                  backgroundColor: '#f9fafb',
                                  borderRadius: '8px',
                                  border: `2px solid ${
                                    aprovadoStatus === true ? '#10b981' :
                                    aprovadoStatus === false ? '#ef4444' :
                                    docEnviado ? '#f59e0b' : '#e5e7eb'
                                  }`
                                }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <div>
                                      <label style={{ 
                                        fontWeight: '600', 
                                        color: '#374151', 
                                        fontSize: '0.875rem'
                                      }}>
                                        {doc.label}
                                        {doc.required && <span style={{ color: '#ef4444', marginLeft: '0.25rem' }}>*</span>}
                                      </label>
                                      <p style={{ 
                                        margin: '0.25rem 0 0 0', 
                                        fontSize: '0.75rem', 
                                        fontWeight: '600',
                                        color: aprovadoStatus === true ? '#059669' :
                                               aprovadoStatus === false ? '#dc2626' :
                                               docEnviado ? '#d97706' : '#6b7280'
                                      }}>
                                        {aprovadoStatus === true ? '✓ Aprovado' :
                                         aprovadoStatus === false ? '✗ Reprovado' :
                                         docEnviado ? 'Em Análise' : 'Pendente'}
                                      </p>
                                    </div>
                                    
                                    {/* Botão de visualizar (se documento existe) */}
                                    {docEnviado && (
                                      <button 
                                        className="btn btn-sm btn-secondary" 
                                        style={{ fontSize: '0.75rem', padding: '0.5rem', 'justify-content': 'center' }}
                                        onClick={() => window.open(pacienteFechamento[doc.key], '_blank')}
                                      >
                                        Visualizar
                                      </button>
                                    )}
                                    
                                    {/* Botão de upload (admin e clínicas) */}
                                    {(isAdmin || isClinica) && (
                                      <label 
                                        className="btn btn-sm btn-primary" 
                                        style={{ 
                                          fontSize: '0.75rem', 
                                          padding: '0.5rem', 
                                          cursor: uploadingDocs[docKey] ? 'not-allowed' : 'pointer',
                                          opacity: uploadingDocs[docKey] ? 0.6 : 1,
                                          textAlign: 'center',
                                          margin: 0,
                                          display: 'block'
                                        }}
                                      >
                                        <input
                                          type="file"
                                          style={{ display: 'none' }}
                                          accept={docKey === 'contrato_servico' ? '.pdf' : 'image/*,.pdf'}
                                          onChange={(e) => handleUploadDocumentoPaciente(e, viewingFechamento.paciente_id, docKey)}
                                          disabled={uploadingDocs[docKey]}
                                        />
                                        {uploadingDocs[docKey] ? 'Enviando...' : (docEnviado ? 'Substituir' : 'Enviar Documento')}
                                      </label>
                                    )}
                                    
                                    {/* Botões de aprovação (apenas admin e se documento existe) */}
                                    {isAdmin && docEnviado && aprovadoStatus !== true && (
                                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                                        <button 
                                          className="btn btn-sm btn-success"
                                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', flex: 1 }}
                                          onClick={async () => {
                                            try {
                                              const response = await makeRequest(`/documents/approve-paciente/${viewingFechamento.paciente_id}/${docKey}`, {
                                                method: 'PUT'
                                              });
                                              
                                              if (response.ok) {
                                                showSuccessToast('Documento aprovado com sucesso!');
                                                await carregarDados();
                                              } else {
                                                const error = await response.json();
                                                showErrorToast(error.error || 'Erro ao aprovar documento');
                                              }
                                            } catch (error) {
                                              showErrorToast('Erro ao aprovar documento');
                                            }
                                          }}
                                        >
                                          Aprovar
                                        </button>
                                        <button 
                                          className="btn btn-sm btn-danger"
                                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', flex: 1 }}
                                          onClick={async () => {
                                            try {
                                              const response = await makeRequest(`/documents/reject-paciente/${viewingFechamento.paciente_id}/${docKey}`, {
                                                method: 'PUT'
                                              });
                                              
                                              if (response.ok) {
                                                showWarningToast('Documento reprovado');
                                                await carregarDados();
                                              } else {
                                                const error = await response.json();
                                                showErrorToast(error.error || 'Erro ao reprovar documento');
                                              }
                                            } catch (error) {
                                              showErrorToast('Erro ao reprovar documento');
                                            }
                                          }}
                                        >
                                          Reprovar
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Aba de Parcelamento */}
              {activeViewTab === 'parcelamento' && (
                <div>
                  <h3 style={{ 
                    fontSize: '1.125rem', 
                    fontWeight: '700', 
                    color: '#1a1d23', 
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    Informações de Parcelamento
                  </h3>
                  
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    <div>
                      <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Valor da Parcela</label>
                      <div style={{ 
                        padding: '0.75rem', 
                        backgroundColor: '#f9fafb', 
                        borderRadius: '6px',
                        border: '1px solid #e5e7eb',
                        fontWeight: '600',
                        color: '#059669'
                      }}>
                        {viewingFechamento.valor_parcela ? 
                          `R$ ${parseFloat(viewingFechamento.valor_parcela).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 
                          'Não informado'
                        }
                      </div>
                    </div>
                    
                    <div>
                      <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Número de Parcelas</label>
                      <div style={{ 
                        padding: '0.75rem', 
                        backgroundColor: '#f9fafb', 
                        borderRadius: '6px',
                        border: '1px solid #e5e7eb'
                      }}>
                        {viewingFechamento.numero_parcelas || 'Não informado'}
                      </div>
                    </div>
                    
                    <div>
                      <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Dia do Vencimento</label>
                      <div style={{ 
                        padding: '0.75rem', 
                        backgroundColor: '#f9fafb', 
                        borderRadius: '6px',
                        border: '1px solid #e5e7eb'
                      }}>
                        {viewingFechamento.vencimento ? 
                          new Date(viewingFechamento.vencimento).toLocaleDateString('pt-BR') : 
                          'Não informado'
                        }
                      </div>
                    </div>
                    
                    <div>
                      <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Antecipação (em meses)</label>
                      <div style={{ 
                        padding: '0.75rem', 
                        backgroundColor: '#f9fafb', 
                        borderRadius: '6px',
                        border: '1px solid #e5e7eb'
                      }}>
                        {viewingFechamento.antecipacao_meses ? 
                          `${viewingFechamento.antecipacao_meses} meses` : 
                          'Não informado'
                        }
                      </div>
                    </div>
                    
                    {/* Resumo do parcelamento */}
                    {viewingFechamento.valor_parcela && viewingFechamento.numero_parcelas && (
                      <div style={{
                        marginTop: '1rem',
                        padding: '1rem',
                        backgroundColor: '#f0f9ff',
                        borderRadius: '8px',
                        border: '1px solid #3b82f6'
                      }}>
                        <h4 style={{ 
                          fontSize: '0.95rem', 
                          fontWeight: '600', 
                          color: '#1e40af', 
                          margin: '0 0 0.5rem 0' 
                        }}>
                          Resumo do Parcelamento
                        </h4>
                        <div style={{ fontSize: '0.875rem', color: '#3730a3' }}>
                          <div>Valor total: <strong>R$ {parseFloat(viewingFechamento.valor_fechado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div>
                          <div>Parcelas: <strong>{viewingFechamento.numero_parcelas}x de R$ {parseFloat(viewingFechamento.valor_parcela).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div>
                          {viewingFechamento.vencimento && (
                            <div>Primeira parcela: <strong>{new Date(viewingFechamento.vencimento).toLocaleDateString('pt-BR')}</strong></div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
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
              
              {/* Aba de Dados da Operação - Admin/Consultor Interno */}
              {(isAdmin || isConsultorInterno) && activeViewTab === 'operacao' && (
                <div>
                  <h3 style={{ 
                    fontSize: '1.125rem', 
                    fontWeight: '700', 
                    color: '#1a1d23', 
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    </svg>
                    Dados Administrativos da Operação
                  </h3>
                  
                  {(() => {
                    const temDataOperacao = !!viewingFechamento.data_operacao;
                    const temValorEntregue = viewingFechamento.valor_entregue !== null && viewingFechamento.valor_entregue !== undefined;
                    const temTipo = !!viewingFechamento.tipo_operacao;
                    const temPrint = !!viewingFechamento.print_confirmacao_arquivo;
                    const camposPreenchidos = [temDataOperacao, temValorEntregue, temTipo, temPrint].filter(Boolean).length;
                    const completo = camposPreenchidos === 4;
                    
                    return (
                      <>
                        {/* Alerta de dados incompletos */}
                        {!completo && (
                          <div style={{
                            backgroundColor: '#fef2f2',
                            border: '1px solid #fecaca',
                            borderRadius: '8px',
                            padding: '1rem',
                            marginBottom: '1.5rem',
                            display: 'flex',
                            alignItems: 'start',
                            gap: '0.75rem'
                          }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#dc2626', flexShrink: 0 }}>
                              <circle cx="12" cy="12" r="10"></circle>
                              <line x1="12" y1="8" x2="12" y2="12"></line>
                              <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                            <div>
                              <div style={{ fontWeight: '600', color: '#991b1b', marginBottom: '0.25rem' }}>
                                Dados Administrativos Incompletos
                              </div>
                              <div style={{ fontSize: '0.875rem', color: '#dc2626' }}>
                                {camposPreenchidos} de 4 campos preenchidos. Clique em "Editar Fechamento" para completar os dados da operação.
                              </div>
                            </div>
                          </div>
                        )}
                        
                        <div style={{ display: 'grid', gap: '1rem' }}>
                          <div>
                            <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Data da Operação</label>
                            <div style={{ 
                              padding: '0.75rem', 
                              backgroundColor: temDataOperacao ? '#f0fdf4' : '#fef2f2', 
                              borderRadius: '6px',
                              border: `1px solid ${temDataOperacao ? '#86efac' : '#fecaca'}`
                            }}>
                              {viewingFechamento.data_operacao ? 
                                new Date(viewingFechamento.data_operacao).toLocaleDateString('pt-BR') : 
                                <span style={{ color: '#dc2626', fontStyle: 'italic' }}>Não informado</span>
                              }
                            </div>
                          </div>
                          
                          <div>
                            <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Tipo de Operação</label>
                            <div style={{ 
                              padding: '0.75rem', 
                              backgroundColor: temTipo ? '#f0fdf4' : '#fef2f2', 
                              borderRadius: '6px',
                              border: `1px solid ${temTipo ? '#86efac' : '#fecaca'}`
                            }}>
                              {viewingFechamento.tipo_operacao ? (
                                <span className="badge" style={{
                                  backgroundColor: viewingFechamento.tipo_operacao === 'operacao' ? '#3b82f6' : '#8b5cf6',
                                  color: 'white',
                                  padding: '0.25rem 0.75rem'
                                }}>
                                  {viewingFechamento.tipo_operacao === 'operacao' ? 'Operação' : 'Colateral'}
                                </span>
                              ) : (
                                <span style={{ color: '#dc2626', fontStyle: 'italic' }}>Não informado</span>
                              )}
                            </div>
                          </div>
                          
                          <div>
                            <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Valor Entregue</label>
                            <div style={{ 
                              padding: '0.75rem', 
                              backgroundColor: temValorEntregue ? '#f0fdf4' : '#fef2f2', 
                              borderRadius: '6px',
                              border: `1px solid ${temValorEntregue ? '#86efac' : '#fecaca'}`,
                              fontWeight: '600',
                              color: temValorEntregue ? '#059669' : '#dc2626'
                            }}>
                              {temValorEntregue ? 
                                `R$ ${parseFloat(viewingFechamento.valor_entregue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 
                                <span style={{ fontStyle: 'italic' }}>Não informado</span>
                              }
                            </div>
                          </div>
                          
                          <div>
                            <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Print de Confirmação com Sacado</label>
                            {temPrint ? (
                              <div style={{
                                padding: '1rem',
                                backgroundColor: '#f0fdf4',
                                borderRadius: '8px',
                                border: '1px solid #86efac'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#059669' }}>
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                    <polyline points="21 15 16 10 5 21"></polyline>
                                  </svg>
                                  <div>
                                    <div style={{ fontWeight: '600', color: '#065f46' }}>
                                      {viewingFechamento.print_confirmacao_nome || 'print_confirmacao'}
                                    </div>
                                    <div style={{ fontSize: '0.875rem', color: '#059669' }}>
                                      ✓ Arquivo anexado
                                    </div>
                                  </div>
                                </div>
                                
                                <button
                                  onClick={async () => {
                                    try {
                                      const response = await makeRequest(`/fechamentos/${viewingFechamento.id}/print-confirmacao-url`);
                                      
                                      if (!response.ok) {
                                        const data = await response.json();
                                        showErrorToast('Erro ao gerar link: ' + (data.error || 'Erro desconhecido'));
                                        return;
                                      }

                                      const { url, nome } = await response.json();
                                      window.open(url, '_blank');
                                      showSuccessToast(`Print "${nome}" aberto. Link válido por 24 horas.`);
                                    } catch (error) {
                                      console.error('Erro ao abrir print:', error);
                                      showErrorToast('Erro ao abrir print: ' + error.message);
                                    }
                                  }}
                                  className="btn btn-primary"
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                  </svg>
                                  Visualizar Print
                                </button>
                              </div>
                            ) : (
                              <div style={{
                                padding: '1rem',
                                textAlign: 'center',
                                backgroundColor: '#fef2f2',
                                borderRadius: '8px',
                                border: '1px solid #fecaca'
                              }}>
                                <div style={{ color: '#dc2626', fontSize: '0.875rem', fontStyle: 'italic' }}>
                                  Nenhum print foi anexado
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
              
              {/* Aba de Evidências */}
              {activeViewTab === 'evidencias' && (
                <div>
                  <h3 style={{ 
                    fontSize: '1.125rem', 
                    fontWeight: '700', 
                    color: '#1a1d23', 
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                    </svg>
                    Evidências de Mudanças de Status
                  </h3>
                  
                  {evidenciasFechamento.length === 0 ? (
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
                      {evidenciasFechamento.map((evidencia) => (
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
                          
                          {evidencia.observacao && (
                            <div style={{
                              marginBottom: '0.75rem',
                              padding: '0.75rem',
                              backgroundColor: 'white',
                              borderRadius: '6px',
                              fontSize: '0.875rem',
                              color: '#374151',
                              whiteSpace: 'pre-wrap'
                            }}>
                              {evidencia.observacao}
                            </div>
                          )}
                          
                          {evidencia.evidencia_url && (
                            <button
                              onClick={() => window.open(evidencia.evidencia_url, '_blank')}
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
                display: 'flex',
                justifyContent: 'space-between',
                gap: '1rem',
                flexShrink: 0
              }}>
                <div>
                  {isAdmin && activeViewTab === 'documentos' && (
                    <div style={{
                      backgroundColor: '#eff6ff',
                      border: '1px solid #3b82f6',
                      borderRadius: '6px',
                      padding: '0.75rem 1rem',
                      fontSize: '0.875rem',
                      color: '#1e40af',
                      maxWidth: '450px'
                    }}>
                      <strong>Gestão de Documentos:</strong> Você pode fazer upload, aprovar ou reprovar documentos nos cards acima.
                    </div>
                  )}
                  {isConsultorInterno && activeViewTab === 'documentos' && (
                    <div style={{
                      backgroundColor: '#f0f9ff',
                      border: '1px solid #3b82f6',
                      borderRadius: '6px',
                      padding: '0.75rem 1rem',
                      fontSize: '0.875rem',
                      color: '#1e40af',
                      maxWidth: '450px'
                    }}>
                      <strong>ℹ️ Visualização:</strong> Documentos podem ser anexados ao criar o fechamento via mudança de status do paciente.
                    </div>
                  )}
                  {isClinica && activeViewTab === 'documentos' && (
                    <div style={{
                      backgroundColor: '#f0fdf4',
                      border: '1px solid #10b981',
                      borderRadius: '6px',
                      padding: '0.75rem 1rem',
                      fontSize: '0.875rem',
                      color: '#065f46',
                      maxWidth: '450px'
                    }}>
                      <strong>📤 Upload de Documentos:</strong> Você pode enviar e substituir documentos. A aprovação será feita pelo administrador.
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button 
                    className="btn btn-secondary" 
                    onClick={fecharViewModal}
                  >
                    Fechar
                  </button>
                  {(isAdmin || (isConsultorInterno && viewingFechamento.consultor_id === user?.id)) && (
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
        </div>
      )}

      {/* Modal de Observações com Evidências */}
      {showObservacoesModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '700px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <h2 className="modal-title">
                {fechamentoObservacoes?.paciente_nome || 'Detalhes do Fechamento'}
              </h2>
              <button className="close-btn" onClick={() => setShowObservacoesModal(false)}>×</button>
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
                onClick={() => setActiveObservacoesTab('observacoes')}
                style={{
                  padding: '0.75rem 0',
                  border: 'none',
                  background: 'none',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: activeObservacoesTab === 'observacoes' ? '#3b82f6' : '#6b7280',
                  borderBottom: activeObservacoesTab === 'observacoes' ? '2px solid #3b82f6' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Observações
              </button>
              
              {evidenciasFechamento.length > 0 && (
                <button
                  onClick={() => setActiveObservacoesTab('evidencias')}
                  style={{
                    padding: '0.75rem 0',
                    border: 'none',
                    background: 'none',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: activeObservacoesTab === 'evidencias' ? '#3b82f6' : '#6b7280',
                    borderBottom: activeObservacoesTab === 'evidencias' ? '2px solid #3b82f6' : '2px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  Evidências
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
                    {evidenciasFechamento.length}
                  </span>
                </button>
              )}
            </div>
            
            <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
              {/* Aba de Observações */}
              {activeObservacoesTab === 'observacoes' && (
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
              )}
              
              {/* Aba de Evidências */}
              {activeObservacoesTab === 'evidencias' && (
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
                  
                  {evidenciasFechamento.length === 0 ? (
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
                      {evidenciasFechamento.map((evidencia, index) => (
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
                  setShowObservacoesModal(false);
                  setActiveObservacoesTab('observacoes');
                  setEvidenciasFechamento([]);
                  setFechamentoObservacoes(null);
                }}
              >
                Fechar
              </button>
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
                  Você não pode alterar o status dos fechamentos. Aguarde que iremos atualizar o status conforme o processo avançar.
                </p>
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ color: '#374151', marginBottom: '0.5rem', fontSize: '1rem' }}>
                  Quem pode alterar status?
                </h3>
                <ul style={{ color: '#6b7280', lineHeight: '1.6', paddingLeft: '1.5rem' }}>
                  <li><strong>Apenas Administradores:</strong> Podem alterar o status dos fechamentos</li>
                  <li><strong>Consultores e Clínicas:</strong> Apenas visualizam os status</li>
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
        tipo="fechamento"
        registroId={evidenciaData.fechamentoId}
        statusAnterior={evidenciaData.statusAnterior}
        statusNovo={evidenciaData.statusNovo}
        nomeRegistro={evidenciaData.fechamentoNome}
      />

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