import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import TutorialPacientes from './TutorialPacientes';

const Pacientes = () => {
  const { makeRequest, user, isAdmin, podeAlterarStatus, isConsultorInterno, podeVerTodosDados, deveFiltrarPorConsultor, isFreelancer, isClinica, deveFiltrarPorClinica } = useAuth();
  // Verificar se usuário é consultor
  const isConsultor = user?.tipo === 'consultor';
  const [pacientes, setPacientes] = useState([]);
  const [novosLeads, setNovosLeads] = useState([]);
  const [consultores, setConsultores] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingPaciente, setEditingPaciente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pacientes');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtroNome, setFiltroNome] = useState('');
  const [filtroTelefone, setFiltroTelefone] = useState('');
  const [filtroCPF, setFiltroCPF] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const [filtroConsultor, setFiltroConsultor] = useState('');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    cpf: '',
    cidade: '',
    estado: '',
    tipo_tratamento: '',
    status: 'lead',
    observacoes: '',
    consultor_id: ''
  });
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewPaciente, setViewPaciente] = useState(null);
  const [showObservacoesModal, setShowObservacoesModal] = useState(false);
  const [observacoesAtual, setObservacoesAtual] = useState('');

  // Estados para controlar o tutorial
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialCompleted, setTutorialCompleted] = useState(false);

  // Estado para modal de explicação de permissões
  const [showPermissaoModal, setShowPermissaoModal] = useState(false);

  // Estados para modal de fechamento
  const [showFechamentoModal, setShowFechamentoModal] = useState(false);
  const [pacienteParaFechar, setPacienteParaFechar] = useState(null);
  const [valorFechamento, setValorFechamento] = useState('');
  const [valorFormatado, setValorFormatado] = useState('');
  const [salvandoFechamento, setSalvandoFechamento] = useState(false);
  const [contratoFechamento, setContratoFechamento] = useState(null);
  const [tipoTratamentoFechamento, setTipoTratamentoFechamento] = useState('');
  const [observacoesFechamento, setObservacoesFechamento] = useState('');
  const [dataFechamento, setDataFechamento] = useState(new Date().toISOString().split('T')[0]);

  // Estado para controlar valores temporários dos selects (quando modal está aberto)
  const [statusTemporario, setStatusTemporario] = useState({});
  const { error: showErrorToast, success: showSuccessToast } = useToast();
  const [cidadeCustomizada, setCidadeCustomizada] = useState(false);

  // Estados para modal de agendamento
  const [showAgendamentoModal, setShowAgendamentoModal] = useState(false);
  const [pacienteParaAgendar, setPacienteParaAgendar] = useState(null);
  const [clinicas, setClinicas] = useState([]);
  const [agendamentoData, setAgendamentoData] = useState({
    clinica_id: '',
    data_agendamento: '',
    horario: '',
    observacoes: ''
  });
  const [salvandoAgendamento, setSalvandoAgendamento] = useState(false);

  // Estados para modal de atribuir consultor (para admins)
  const [showAtribuirConsultorModal, setShowAtribuirConsultorModal] = useState(false);
  const [leadParaAtribuir, setLeadParaAtribuir] = useState(null);
  const [consultorSelecionado, setConsultorSelecionado] = useState('');
  const [salvandoAtribuicao, setSalvandoAtribuicao] = useState(false);

  // Estados para links personalizados
  const [linkPersonalizado, setLinkPersonalizado] = useState(null);
  const [linkClinicas, setLinkClinicas] = useState(null);
  const [loadingLink, setLoadingLink] = useState(true);

  // Estados brasileiros
  const estadosBrasileiros = [
    { sigla: 'AC', nome: 'Acre' },
    { sigla: 'AL', nome: 'Alagoas' },
    { sigla: 'AP', nome: 'Amapá' },
    { sigla: 'AM', nome: 'Amazonas' },
    { sigla: 'BA', nome: 'Bahia' },
    { sigla: 'CE', nome: 'Ceará' },
    { sigla: 'DF', nome: 'Distrito Federal' },
    { sigla: 'ES', nome: 'Espírito Santo' },
    { sigla: 'GO', nome: 'Goiás' },
    { sigla: 'MA', nome: 'Maranhão' },
    { sigla: 'MT', nome: 'Mato Grosso' },
    { sigla: 'MS', nome: 'Mato Grosso do Sul' },
    { sigla: 'MG', nome: 'Minas Gerais' },
    { sigla: 'PA', nome: 'Pará' },
    { sigla: 'PB', nome: 'Paraíba' },
    { sigla: 'PR', nome: 'Paraná' },
    { sigla: 'PE', nome: 'Pernambuco' },
    { sigla: 'PI', nome: 'Piauí' },
    { sigla: 'RJ', nome: 'Rio de Janeiro' },
    { sigla: 'RN', nome: 'Rio Grande do Norte' },
    { sigla: 'RS', nome: 'Rio Grande do Sul' },
    { sigla: 'RO', nome: 'Rondônia' },
    { sigla: 'RR', nome: 'Roraima' },
    { sigla: 'SC', nome: 'Santa Catarina' },
    { sigla: 'SP', nome: 'São Paulo' },
    { sigla: 'SE', nome: 'Sergipe' },
    { sigla: 'TO', nome: 'Tocantins' }
  ];

  // Principais cidades por estado
  const cidadesPorEstado = {
    'SP': ['São Paulo', 'Campinas', 'Santos', 'São Bernardo do Campo', 'Santo André', 'Osasco', 'Ribeirão Preto', 'Sorocaba'],
    'RJ': ['Rio de Janeiro', 'Niterói', 'Nova Iguaçu', 'Duque de Caxias', 'Campos dos Goytacazes', 'Petrópolis', 'Volta Redonda'],
    'MG': ['Belo Horizonte', 'Uberlândia', 'Contagem', 'Juiz de Fora', 'Betim', 'Montes Claros', 'Ribeirão das Neves'],
    'ES': ['Vitória', 'Serra', 'Vila Velha', 'Cariacica', 'Linhares', 'Cachoeiro de Itapemirim', 'Colatina'],
    'PR': ['Curitiba', 'Londrina', 'Maringá', 'Ponta Grossa', 'Cascavel', 'São José dos Pinhais', 'Foz do Iguaçu'],
    'RS': ['Porto Alegre', 'Caxias do Sul', 'Pelotas', 'Canoas', 'Santa Maria', 'Gravataí', 'Viamão'],
    'SC': ['Florianópolis', 'Joinville', 'Blumenau', 'São José', 'Criciúma', 'Chapecó', 'Itajaí'],
    'BA': ['Salvador', 'Feira de Santana', 'Vitória da Conquista', 'Camaçari', 'Juazeiro', 'Ilhéus', 'Itabuna'],
    'GO': ['Goiânia', 'Aparecida de Goiânia', 'Anápolis', 'Rio Verde', 'Luziânia', 'Águas Lindas de Goiás'],
    'PE': ['Recife', 'Jaboatão dos Guararapes', 'Olinda', 'Caruaru', 'Petrolina', 'Paulista', 'Cabo de Santo Agostinho'],
    'CE': ['Fortaleza', 'Caucaia', 'Juazeiro do Norte', 'Maracanaú', 'Sobral', 'Crato', 'Itapipoca'],
    'DF': ['Brasília', 'Taguatinga', 'Ceilândia', 'Samambaia', 'Planaltina', 'Águas Claras', 'Guará'],
    'MT': ['Cuiabá', 'Várzea Grande', 'Rondonópolis', 'Sinop', 'Tangará da Serra', 'Cáceres', 'Barra do Garças'],
    'MS': ['Campo Grande', 'Dourados', 'Três Lagoas', 'Corumbá', 'Ponta Porã', 'Aquidauana', 'Naviraí'],
    'AL': ['Maceió', 'Arapiraca', 'Rio Largo', 'Palmeira dos Índios', 'União dos Palmares', 'Penedo'],
    'SE': ['Aracaju', 'Nossa Senhora do Socorro', 'Lagarto', 'Itabaiana', 'Estância', 'Tobias Barreto'],
    'PB': ['João Pessoa', 'Campina Grande', 'Santa Rita', 'Patos', 'Bayeux', 'Sousa', 'Cajazeiras'],
    'RN': ['Natal', 'Mossoró', 'Parnamirim', 'São Gonçalo do Amarante', 'Macaíba', 'Ceará-Mirim'],
    'PI': ['Teresina', 'Parnaíba', 'Picos', 'Piripiri', 'Floriano', 'Campo Maior', 'Barras'],
    'MA': ['São Luís', 'Imperatriz', 'São José de Ribamar', 'Timon', 'Caxias', 'Codó', 'Paço do Lumiar'],
    'TO': ['Palmas', 'Araguaína', 'Gurupi', 'Porto Nacional', 'Paraíso do Tocantins', 'Colinas do Tocantins'],
    'AC': ['Rio Branco', 'Cruzeiro do Sul', 'Sena Madureira', 'Tarauacá', 'Feijó', 'Brasileia'],
    'RO': ['Porto Velho', 'Ji-Paraná', 'Ariquemes', 'Vilhena', 'Cacoal', 'Rolim de Moura'],
    'RR': ['Boa Vista', 'Rorainópolis', 'Caracaraí', 'Alto Alegre', 'Mucajaí', 'Cantá'],
    'AP': ['Macapá', 'Santana', 'Laranjal do Jari', 'Oiapoque', 'Mazagão', 'Porto Grande'],
    'AM': ['Manaus', 'Parintins', 'Itacoatiara', 'Manacapuru', 'Coari', 'Tefé', 'Tabatinga'],
    'PA': ['Belém', 'Ananindeua', 'Santarém', 'Marabá', 'Parauapebas', 'Castanhal', 'Abaetetuba']
  };

  // Status disponíveis para o pipeline
  const statusOptions = [
    { value: 'lead', label: 'Lead', color: '#f59e0b', description: 'Lead inicial' },
    { value: 'em_conversa', label: 'Em conversa', color: '#0ea5e9', description: 'Conversando com o cliente' },
    { value: 'cpf_aprovado', label: 'CPF Aprovado', color: '#10b981', description: 'CPF foi aprovado' },
    { value: 'cpf_reprovado', label: 'CPF Reprovado', color: '#ef4444', description: 'CPF foi reprovado' },
    { value: 'nao_passou_cpf', label: 'Não forneceu CPF', color: '#6366f1', description: 'Cliente não forneceu CPF' },
    { value: 'nao_tem_outro_cpf', label: 'Não tem outro CPF', color: '#a3a3a3', description: 'Cliente não tem CPF alternativo' },
    { value: 'nao_existe', label: 'Paciente não existe', color: '#9ca3af', description: 'Cliente não existe' },
    { value: 'nao_tem_interesse', label: 'Paciente não tem interesse', color: '#9ca3af', description: 'Cliente não tem interesse' },
    { value: 'nao_reconhece', label: 'Paciente não reconhece', color: '#9ca3af', description: 'Cliente não reconhece' },
    { value: 'nao_responde', label: 'Paciente não responde', color: '#9ca3af', description: 'Cliente não responde' },
    { value: 'sem_clinica', label: 'Sem clínica', color: '#fbbf24', description: 'Sem clínica' },
    // Demais status no final
    { value: 'agendado', label: 'Agendado', color: '#3b82f6', description: 'Abre modal para criar agendamento' },
    { value: 'compareceu', label: 'Compareceu', color: '#10b981', description: 'Cliente compareceu ao agendamento' },
    { value: 'fechado', label: 'Fechado', color: '#059669', description: 'Abre modal para criar fechamento' },
    { value: 'nao_fechou', label: 'Não Fechou', color: '#dc2626', description: 'Cliente não fechou o negócio' },
    { value: 'nao_compareceu', label: 'Não Compareceu', color: '#ef4444', description: 'Cliente não compareceu' },
    { value: 'reagendado', label: 'Reagendado', color: '#8b5cf6', description: 'Agendamento foi reagendado' }
  ];

  // Removido: fetchConsultorInfo - agora usando podeAlterarStatus do contexto

  useEffect(() => {
    fetchPacientes();
    fetchConsultores();
    fetchClinicas();
    
    // Buscar novos leads apenas se pode alterar status (não freelancer) ou é consultor interno
    if (podeAlterarStatus || isConsultorInterno) {
      fetchNovosLeads();
    }
    
    // Aplicar filtro automático por consultor se necessário
    if (deveFiltrarPorConsultor && user?.consultor_id) {
      setFiltroConsultor(String(user.consultor_id));
    }
    
    // Buscar links personalizados se for consultor
    if (isConsultor) {
      buscarLinkPersonalizado();
    } else {
      setLoadingLink(false);
    }
    
  // Verificar se tutorial foi completado
  const completed = localStorage.getItem('tutorial-pacientes-completed');
  setTutorialCompleted(!!completed);
  }, [podeAlterarStatus, isConsultorInterno, deveFiltrarPorConsultor, user?.consultor_id]);

  // Tutorial automático desabilitado
  // Os usuários podem acessá-lo manualmente através do botão "Ver Tutorial"

  // Garantir que freelancers fiquem na aba "Pacientes"
  useEffect(() => {
    if (isConsultor && !podeAlterarStatus && !isConsultorInterno && activeTab === 'novos-leads') {
      setActiveTab('pacientes');
    }
  }, [podeAlterarStatus, isConsultorInterno, activeTab, isConsultor]);

  // Atualização automática dos dados a cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPacientes();
      // Buscar novos leads apenas se pode alterar status (não freelancer) ou é consultor interno
      if (podeAlterarStatus || isConsultorInterno) {
        fetchNovosLeads();
      }
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, [podeAlterarStatus, isConsultorInterno, isConsultor]);

  // Atualizar novos leads quando mudar de aba
  useEffect(() => {
    if (activeTab === 'novos-leads') {
      fetchNovosLeads(); // Atualizar quando entrar na aba
    }
  }, [activeTab]);


  // Controlar scroll do body quando modal estiver aberto
  useEffect(() => {
    if (showModal || showViewModal || showObservacoesModal || showAgendamentoModal || showPermissaoModal || showAtribuirConsultorModal) {
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
  }, [showModal, showViewModal, showObservacoesModal, showAgendamentoModal, showFechamentoModal, showPermissaoModal, showAtribuirConsultorModal]);
  
  //Sempre que FILTROS mudarem, voltar para a primeira página
  useEffect(() => {
    setCurrentPage(1);
  }, [
    filtroNome,
    filtroTelefone,
    filtroCPF,
    filtroTipo,
    filtroStatus,
    filtroConsultor,
    filtroDataInicio,
    filtroDataFim
  ]);

  const fetchPacientes = async () => {
    try {
      const response = await makeRequest('/pacientes');
      const data = await response.json();
      
      if (response.ok) {
        setPacientes(data);
      } else {
        console.error('Erro ao carregar pacientes:', data.error);
        showErrorToast('Erro ao carregar pacientes: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error);
      showErrorToast('Erro ao conectar com o servidor');
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

  const buscarLinkPersonalizado = async () => {
    try {
      // Usar a rota de perfil que o consultor pode acessar
      const consultorResponse = await makeRequest('/consultores/perfil');
      const responseData = await consultorResponse.json();
      
      if (consultorResponse.ok && responseData.consultor) {
        const consultorData = responseData.consultor;
        
        // Verificar se é consultor interno (tem as duas permissões)
        const isConsultorInterno = consultorData.pode_ver_todas_novas_clinicas === true && consultorData.podealterarstatus === true;
        
        if (!isConsultorInterno) {
          // Freelancer: buscar link personalizado baseado no código de referência
          if (consultorData.codigo_referencia) {
            setLinkPersonalizado(`https://solumn.com.br/captura-lead?ref=${consultorData.codigo_referencia}`);
            setLinkClinicas(`https://solumn.com.br/captura-clinica?ref=${consultorData.codigo_referencia}`);
          } else {
            // Se não tem código de referência, mostrar mensagem
            setLinkPersonalizado(null);
            setLinkClinicas(null);
          }
        } else {
          // Interno: usar link geral
          setLinkPersonalizado('https://solumn.com.br/captura-lead');
          setLinkClinicas('https://solumn.com.br/captura-clinica');
        }
      } else {
        console.error('Erro ao buscar dados do consultor:', responseData);
        setLinkPersonalizado(null);
        setLinkClinicas(null);
      }
    } catch (error) {
      console.error('Erro ao buscar link personalizado:', error);
      setLinkPersonalizado(null);
      setLinkClinicas(null);
    } finally {
      setLoadingLink(false);
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
        showErrorToast('Erro ao carregar novos leads: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao carregar novos leads:', error);
      showErrorToast('Erro ao conectar com o servidor');
    }
  };

  const pegarLead = async (leadId) => {
    // Se for admin, abrir modal para escolher consultor
    if (isAdmin) {
      const lead = novosLeads.find(l => l.id === leadId);
      if (lead) {
        setLeadParaAtribuir(lead);
        setConsultorSelecionado('');
        setShowAtribuirConsultorModal(true);
      }
      return;
    }

    // Para consultores, usar o fluxo normal
    try {
      const response = await makeRequest(`/novos-leads/${leadId}/pegar`, {
        method: 'PUT'
      });

      const data = await response.json();
      
      if (response.ok) {
        showSuccessToast('Lead atribuído com sucesso!');
        fetchNovosLeads();
        fetchPacientes();
      } else {
        showErrorToast('Erro ao atribuir lead: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao atribuir lead:', error);
      showErrorToast('Erro ao atribuir lead');
    }
  };

  const excluirLead = async (leadId) => {
    // Confirmar antes de excluir
    if (!window.confirm('Tem certeza que deseja excluir este lead? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const response = await makeRequest(`/novos-leads/${leadId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (response.ok) {
        showSuccessToast('Lead excluído com sucesso!');
        fetchNovosLeads();
      } else {
        showErrorToast('Erro ao excluir lead: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao excluir lead:', error);
      showErrorToast('Erro ao conectar com o servidor');
    }
  };

  const alterarStatusNovoLead = async (leadId, novoStatus) => {
    try {
      const response = await makeRequest(`/novos-leads/${leadId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: novoStatus })
      });

      const data = await response.json();
      
      if (response.ok) {
        showSuccessToast('Status atualizado com sucesso!');
        fetchNovosLeads();
      } else {
        showErrorToast('Erro ao alterar status: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      showErrorToast('Erro ao alterar status do lead');
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
        showSuccessToast(editingPaciente ? 'Paciente atualizado com sucesso!' : 'Paciente cadastrado com sucesso!');
        setShowModal(false);
        setEditingPaciente(null);
        setFormData({
          nome: '',
          telefone: '',
          cpf: '',
          cidade: '',
          estado: '',
          tipo_tratamento: '',
          status: 'lead',
          observacoes: '',
          consultor_id: ''
        });
        fetchPacientes();
      } else {
        showErrorToast('Erro ao salvar paciente: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao salvar paciente:', error);
      showErrorToast('Erro ao salvar paciente');
    }
  };

  const handleEdit = (paciente) => {
    setEditingPaciente(paciente);
    setFormData({
      nome: paciente.nome || '',
      telefone: paciente.telefone || '',
      cpf: paciente.cpf || '',
      cidade: paciente.cidade || '',
      estado: paciente.estado || '',
      tipo_tratamento: paciente.tipo_tratamento || '',
      status: paciente.status || 'lead',
      observacoes: paciente.observacoes || '',
      consultor_id: paciente.consultor_id || ''
    });
    
    // Verificar se a cidade é customizada (não está na lista de cidades do estado)
    const cidadesDoEstado = paciente.estado ? (cidadesPorEstado[paciente.estado] || []) : [];
    const isCidadeCustomizada = paciente.cidade && paciente.estado && 
      !cidadesDoEstado.includes(paciente.cidade);
    setCidadeCustomizada(isCidadeCustomizada);
    
    setShowModal(true);
  };

  const handleView = (paciente) => {
    setViewPaciente(paciente);
    setShowViewModal(true);
  };

  const handleViewObservacoes = (observacoes) => {
    setObservacoesAtual(observacoes || 'Nenhuma observação cadastrada.');
    setShowObservacoesModal(true);
  };

  // Função para formatar telefone (formato brasileiro correto)
  function maskTelefone(value) {
    if (!value) return '';
    
    // Remove todos os caracteres não numéricos (apenas números)
    const numbers = value.replace(/\D/g, '');
    
    // Limita a 11 dígitos (máximo para celular brasileiro)
    const limitedNumbers = numbers.substring(0, 11);
    
    // Aplica formatação baseada no tamanho
    if (limitedNumbers.length === 11) {
      // Celular: (XX) 9XXXX-XXXX
      return `(${limitedNumbers.substring(0, 2)}) ${limitedNumbers.substring(2, 7)}-${limitedNumbers.substring(7, 11)}`;
    } else if (limitedNumbers.length === 10) {
      // Fixo: (XX) XXXX-XXXX
      return `(${limitedNumbers.substring(0, 2)}) ${limitedNumbers.substring(2, 6)}-${limitedNumbers.substring(6, 10)}`;
    } else if (limitedNumbers.length > 0) {
      // Formatação parcial conforme vai digitando
      if (limitedNumbers.length <= 2) {
        return `(${limitedNumbers}`;
      } else if (limitedNumbers.length <= 7) {
        return `(${limitedNumbers.substring(0, 2)}) ${limitedNumbers.substring(2)}`;
      } else if (limitedNumbers.length <= 11) {
        return `(${limitedNumbers.substring(0, 2)}) ${limitedNumbers.substring(2, 7)}-${limitedNumbers.substring(7)}`;
      }
    }
    
    return limitedNumbers;
  }
  // Função para formatar CPF
  function maskCPF(value) {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }

  // Função para formatar nome (mesmo padrão da migração do banco)
  function formatarNome(value) {
    if (!value) return '';
    
    // Remove números e caracteres especiais, mantém apenas letras, espaços e acentos
    let cleanValue = value.replace(/[^a-zA-ZÀ-ÿ\s]/g, '');
    
    // Remove espaços duplos/múltiplos, mas mantém espaços simples
    cleanValue = cleanValue.replace(/\s+/g, ' ');
    
    // Remove espaços apenas do início e fim
    cleanValue = cleanValue.trim();
    
    if (!cleanValue) return '';
    
    // Aplica INITCAP - primeira letra de cada palavra maiúscula
    const nomeFormatado = cleanValue
      .toLowerCase()
      .split(' ')
      .map(palavra => {
        if (!palavra) return '';
        return palavra.charAt(0).toUpperCase() + palavra.slice(1);
      })
      .join(' ');
    
    return nomeFormatado;
  }

  // Função para formatar cidade - padronização completa
  function formatarCidade(value) {
    if (!value) return '';
    
    // Remove apenas números e caracteres especiais perigosos, mantém letras, espaços, acentos e hífen
    let cleanValue = value.replace(/[0-9!@#$%^&*()_+=\[\]{}|\\:";'<>?,./~`]/g, '');

    // Não aplicar formatação completa se o usuário ainda está digitando (termina com espaço)
    const isTyping = value.endsWith(' ') && value.length > 0;
    
    if (isTyping) {
      // Durante a digitação, apenas remove caracteres inválidos
      return cleanValue;
    }
    
    // Remove espaços extras apenas quando não está digitando
    cleanValue = cleanValue.replace(/\s+/g, ' ').trim();
    
    // Não permite string vazia
    if (!cleanValue) return '';
    
    // Se tem menos de 2 caracteres, não formatar ainda
    if (cleanValue.length < 2) return cleanValue;
    
    // Verifica se está todo em maiúscula (mais de 3 caracteres) e converte para title case
    const isAllUpperCase = cleanValue.length > 3 && cleanValue === cleanValue.toUpperCase();
    
    if (isAllUpperCase) {
      // Converte para title case
      return cleanValue.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
    }
    
    // Para entradas normais, aplica title case
    return cleanValue
      .toLowerCase()
      .split(' ')
      .map((palavra, index) => {
        // Palavras que devem ficar em minúscula (exceto se for a primeira)
        const preposicoes = ['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'na', 'no', 'nas', 'nos'];
        
        // Primeira palavra sempre maiúscula
        if (index === 0) {
          return palavra.charAt(0).toUpperCase() + palavra.slice(1);
        }
        
        if (preposicoes.includes(palavra)) {
          return palavra;
        }
        
        // Primeira letra maiúscula
        return palavra.charAt(0).toUpperCase() + palavra.slice(1);
      })
      .join(' ');
  }

  const handleInputChange = (e) => {
    let { name, value, type, checked } = e.target;
    
    // Para checkbox, usar checked em vez de value
    if (type === 'checkbox') {
      value = checked;
    } else {
      // Aplicar formatação apenas quando necessário
      if (name === 'telefone') {
        // Para telefone, permitir apenas números durante a digitação
        value = value.replace(/\D/g, '');
        if (value.length > 0) {
          value = maskTelefone(value);
        }
      } else if (name === 'cpf') {
        value = maskCPF(value);
      } else if (name === 'nome') {
        // Para nome, permitir digitação normal (incluindo espaços) e formatar apenas no final
        // Não aplicar formatação durante a digitação para permitir espaços
        value = value;
      } else if (name === 'cidade') {
        value = formatarCidade(value);
      }
    }
    
    // Se mudou o estado, limpar a cidade e resetar cidade customizada
    if (name === 'estado') {
      setCidadeCustomizada(false);
      setFormData({
        ...formData,
        [name]: value,
        cidade: '' // Limpar cidade quando estado muda
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  // Função para formatar nome quando sair do campo (onBlur)
  const handleNomeBlur = (e) => {
    const { value } = e.target;
    if (value && value.trim()) {
      const nomeFormatado = formatarNome(value);
      setFormData(prev => ({
        ...prev,
        nome: nomeFormatado
      }));
    }
  };

  const updateStatus = async (pacienteId, newStatus) => {
    // Verificar se o usuário tem permissão para alterar status
    if (!podeAlterarStatus) {
      showErrorToast('Você não tem permissão para alterar o status dos pacientes');
      return;
    }

    // Se o status for "agendado" ou "fechado", abrir modal primeiro sem atualizar status
    if (newStatus === 'agendado') {
      const paciente = pacientes.find(p => p.id === pacienteId);
      if (paciente) {
        // Definir status temporário para o select
        setStatusTemporario(prev => ({ ...prev, [pacienteId]: newStatus }));
        abrirModalAgendamento(paciente, newStatus);
      }
      return;
    }
    
    if (newStatus === 'fechado') {
      const paciente = pacientes.find(p => p.id === pacienteId);
      if (paciente) {
        // Definir status temporário para o select
        setStatusTemporario(prev => ({ ...prev, [pacienteId]: newStatus }));
        abrirModalFechamento(paciente, newStatus);
      }
      return;
    }

    // Para outros status, atualizar normalmente
    try {
      const response = await makeRequest(`/pacientes/${pacienteId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();
      
      if (response.ok) {
        // Atualizar o estado local imediatamente para melhor UX
        setPacientes(prevPacientes => 
          prevPacientes.map(paciente => 
            paciente.id === pacienteId 
              ? { ...paciente, status: newStatus }
              : paciente
          )
        );

        // Mensagem personalizada baseada no status
        let message = 'Status atualizado com sucesso!';
        
        showSuccessToast(message);
        
        // Recarregar dados completos para garantir sincronia entre todas as telas
        await fetchPacientes();
        
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

  // Função auxiliar para atualizar status após confirmação do modal
  const atualizarStatusPaciente = async (pacienteId, newStatus) => {
    try {
      const response = await makeRequest(`/pacientes/${pacienteId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();
      
      if (response.ok) {
        // Atualizar o estado local imediatamente para melhor UX
        setPacientes(prevPacientes => 
          prevPacientes.map(paciente => 
            paciente.id === pacienteId 
              ? { ...paciente, status: newStatus }
              : paciente
          )
        );

        // Recarregar dados completos para garantir sincronia entre todas as telas
        await fetchPacientes();
        
        // Também forçar atualização nas outras telas via localStorage para sincronização imediata
        const timestamp = Date.now();
        localStorage.setItem('data_sync_trigger', timestamp.toString());
        window.dispatchEvent(new CustomEvent('data_updated', { detail: { timestamp } }));
        
        return true;
      } else {
        showErrorToast('Erro ao atualizar status: ' + data.error);
        return false;
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      showErrorToast('Erro ao atualizar status');
      return false;
    }
  };

  const excluirPaciente = async (pacienteId) => {
    // Confirmar antes de excluir
    if (!window.confirm('Tem certeza que deseja excluir este paciente? Esta ação não pode ser desfeita e removerá todos os agendamentos e fechamentos relacionados.')) {
      return;
    }

    try {
      const response = await makeRequest(`/pacientes/${pacienteId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        showSuccessToast('Paciente excluído com sucesso!');
        
        // Atualizar estado local removendo o paciente
        setPacientes(prevPacientes => 
          prevPacientes.filter(paciente => paciente.id !== pacienteId)
        );
        
        // Recarregar dados para garantir sincronia
        await fetchPacientes();
        
        // Forçar atualização nas outras telas
        const timestamp = Date.now();
        localStorage.setItem('data_sync_trigger', timestamp.toString());
        window.dispatchEvent(new CustomEvent('data_updated', { detail: { timestamp } }));
      } else {
        const data = await response.json();
        showErrorToast('Erro ao excluir paciente: ' + (data.error || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error('Erro ao excluir paciente:', error);
      showErrorToast('Erro ao excluir paciente');
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

  // Funções do modal de agendamento
  const abrirModalAgendamento = (paciente, novoStatus = null) => {
    setPacienteParaAgendar({ ...paciente, novoStatus });
    setAgendamentoData({
      clinica_id: '',
      data_agendamento: '',
      horario: '',
      observacoes: ''
    });
    setShowAgendamentoModal(true);
  };

  const fecharModalAgendamento = () => {
    // Limpar status temporário quando cancelar
    if (pacienteParaAgendar && pacienteParaAgendar.novoStatus) {
      setStatusTemporario(prev => {
        const newState = { ...prev };
        delete newState[pacienteParaAgendar.id];
        return newState;
      });
    }
    
    setShowAgendamentoModal(false);
    setPacienteParaAgendar(null);
    setAgendamentoData({
      clinica_id: '',
      data_agendamento: '',
      horario: '',
      observacoes: ''
    });
  };

  const salvarAgendamento = async () => {
    if (!agendamentoData.clinica_id || !agendamentoData.data_agendamento || !agendamentoData.horario) {
      showErrorToast('Por favor, preencha todos os campos obrigatórios!');
      return;
    }

    setSalvandoAgendamento(true);
    try {
      const response = await makeRequest('/agendamentos', {
        method: 'POST',
        body: JSON.stringify({
          paciente_id: pacienteParaAgendar.id,
          consultor_id: pacienteParaAgendar.consultor_id,
          clinica_id: parseInt(agendamentoData.clinica_id),
          data_agendamento: agendamentoData.data_agendamento,
          horario: agendamentoData.horario,
          status: 'agendado',
          observacoes: agendamentoData.observacoes || ''
        })
      });

      if (response.ok) {
        // Se há um novo status para atualizar, atualizar o status do paciente
        if (pacienteParaAgendar.novoStatus) {
          await atualizarStatusPaciente(pacienteParaAgendar.id, pacienteParaAgendar.novoStatus);
          // Limpar status temporário após confirmação
          setStatusTemporario(prev => {
            const newState = { ...prev };
            delete newState[pacienteParaAgendar.id];
            return newState;
          });
        }
        
        showSuccessToast('Agendamento criado com sucesso!');
        fecharModalAgendamento();
      } else {
        const data = await response.json();
        showErrorToast('Erro ao criar agendamento: ' + (data.error || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error('Erro ao salvar agendamento:', error);
      showErrorToast('Erro ao salvar agendamento: ' + error.message);
    } finally {
      setSalvandoAgendamento(false);
    }
  };

  // Funções do modal de fechamento
  const abrirModalFechamento = (paciente, novoStatus = null) => {
    setPacienteParaFechar({ ...paciente, novoStatus });
    setValorFechamento('');
    setValorFormatado('');
    setContratoFechamento(null);
    setTipoTratamentoFechamento(paciente.tipo_tratamento || '');
    setObservacoesFechamento('');
    setDataFechamento(new Date().toISOString().split('T')[0]);
    setShowFechamentoModal(true);
  };

  const fecharModalFechamento = () => {
    // Limpar status temporário quando cancelar
    if (pacienteParaFechar && pacienteParaFechar.novoStatus) {
      setStatusTemporario(prev => {
        const newState = { ...prev };
        delete newState[pacienteParaFechar.id];
        return newState;
      });
    }
    
    setShowFechamentoModal(false);
    setPacienteParaFechar(null);
    setValorFechamento('');
    setValorFormatado('');
    setContratoFechamento(null);
    setTipoTratamentoFechamento('');
    setObservacoesFechamento('');
    setDataFechamento(new Date().toISOString().split('T')[0]);
  };

  // Funções do modal de atribuir consultor
  const fecharModalAtribuirConsultor = () => {
    setShowAtribuirConsultorModal(false);
    setLeadParaAtribuir(null);
    setConsultorSelecionado('');
  };

  const confirmarAtribuicaoConsultor = async () => {
    if (!consultorSelecionado) {
      showErrorToast('Por favor, selecione um consultor!');
      return;
    }

    setSalvandoAtribuicao(true);
    try {
      const response = await makeRequest(`/novos-leads/${leadParaAtribuir.id}/pegar`, {
        method: 'PUT',
        body: JSON.stringify({ consultor_id: parseInt(consultorSelecionado) })
      });

      const data = await response.json();
      
      if (response.ok) {
        showSuccessToast('Lead atribuído com sucesso!');
        fecharModalAtribuirConsultor();
        fetchNovosLeads();
        fetchPacientes();
      } else {
        showErrorToast('Erro ao atribuir lead: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao atribuir lead:', error);
      showErrorToast('Erro ao atribuir lead');
    } finally {
      setSalvandoAtribuicao(false);
    }
  };

  const formatarValorInput = (valor) => {
    const numbers = valor.replace(/[^\d]/g, '');
    const formatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numbers / 100);
    return formatted;
  };

  const desformatarValor = (valorFormatado) => {
    return valorFormatado.replace(/[^\d]/g, '') / 100;
  };

  const handleValorChange = (e) => {
    const valorDigitado = e.target.value;
    const valorFormatado = formatarValorInput(valorDigitado);
    const valorNumerico = desformatarValor(valorFormatado);
    
    setValorFormatado(valorFormatado);
    setValorFechamento(valorNumerico);
  };

  const confirmarFechamento = async () => {
    if (!valorFechamento || valorFechamento <= 0) {
      showErrorToast('Por favor, informe um valor válido para o fechamento!');
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
      // Criar o fechamento com o valor informado
      const formData = new FormData();
      formData.append('paciente_id', pacienteParaFechar.id);
      formData.append('consultor_id', pacienteParaFechar.consultor_id || '');
      formData.append('clinica_id', ''); // Não temos clínica associada diretamente ao paciente
      formData.append('valor_fechado', parseFloat(valorFechamento));
      formData.append('data_fechamento', dataFechamento);
      formData.append('tipo_tratamento', tipoTratamentoFechamento || '');
      formData.append('observacoes', observacoesFechamento || 'Fechamento criado pelo pipeline');
      
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
        // Se há um novo status para atualizar, atualizar o status do paciente
        if (pacienteParaFechar.novoStatus) {
          await atualizarStatusPaciente(pacienteParaFechar.id, pacienteParaFechar.novoStatus);
          // Limpar status temporário após confirmação
          setStatusTemporario(prev => {
            const newState = { ...prev };
            delete newState[pacienteParaFechar.id];
            return newState;
          });
        }
        
        showSuccessToast(`Fechamento criado com sucesso! Valor: R$ ${valorFormatado}`);
        fecharModalFechamento();
        
        // Recarregar dados para manter sincronia
        await fetchPacientes();
        
        // Forçar atualização nas outras telas
        const timestamp = Date.now();
        localStorage.setItem('data_sync_trigger', timestamp.toString());
        window.dispatchEvent(new CustomEvent('data_updated', { detail: { timestamp } }));
      } else {
        const errorData = await fechamentoResponse.json();
        showErrorToast('Erro ao criar fechamento: ' + errorData.error);
      }
    } catch (error) {
      console.error('Erro ao confirmar fechamento:', error);
      showErrorToast('Erro ao confirmar fechamento: ' + error.message);
    } finally {
      setSalvandoFechamento(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      telefone: '',
      cpf: '',
      cidade: '',
      estado: '',
      tipo_tratamento: '',
      status: 'lead',
      observacoes: '',
      // Se for consultor, pré-preenche com o próprio ID
      consultor_id: isConsultor ? String(user?.consultor_id || user?.id) : ''
    });
    setEditingPaciente(null);
    setShowModal(false);
    setCidadeCustomizada(false);
  };

  const pacientesFiltrados = pacientes.filter(p => {
    // Admins e consultores internos veem todos os pacientes
    // Freelancers veem apenas os atribuídos a eles
    // Leads não atribuídos (sem consultor_id) NÃO devem aparecer aqui para ninguém
    if (!isAdmin && !isConsultorInterno && (!p.consultor_id || p.consultor_id === '' || p.consultor_id === null || p.consultor_id === undefined || Number(p.consultor_id) === 0)) return false;
    
    // Para consultores internos e admins, também remover leads não atribuídos da aba "Geral"
    // (eles devem aparecer apenas em "Novos Leads")
    if ((isAdmin || isConsultorInterno) && (!p.consultor_id || p.consultor_id === '' || p.consultor_id === null || p.consultor_id === undefined || Number(p.consultor_id) === 0)) return false;
    
    const matchNome = !filtroNome || p.nome.toLowerCase().includes(filtroNome.toLowerCase());
    const matchTelefone = !filtroTelefone || (p.telefone || '').includes(filtroTelefone);
    const matchCPF = !filtroCPF || (p.cpf || '').includes(filtroCPF);
    const matchTipo = !filtroTipo || p.tipo_tratamento === filtroTipo;
    const matchStatus = !filtroStatus || p.status === filtroStatus;

    const matchConsultor = !filtroConsultor || String(p.consultor_id) === filtroConsultor;
    
    // Filtro por data de cadastro
    let matchData = true;
    if (filtroDataInicio || filtroDataFim) {
      const dataCadastro = p.created_at ? new Date(p.created_at) : null;
      if (dataCadastro) {
        // Normalizar a data de cadastro para comparação (apenas a data, sem hora)
        const dataCadastroNormalizada = new Date(dataCadastro.getFullYear(), dataCadastro.getMonth(), dataCadastro.getDate());
        

        
        if (filtroDataInicio) {
          const dataInicio = new Date(filtroDataInicio);
          const dataInicioNormalizada = new Date(dataInicio.getFullYear(), dataInicio.getMonth(), dataInicio.getDate());
          matchData = matchData && dataCadastroNormalizada >= dataInicioNormalizada;
        }
        if (filtroDataFim) {
          const dataFim = new Date(filtroDataFim);
          const dataFimNormalizada = new Date(dataFim.getFullYear(), dataFim.getMonth(), dataFim.getDate());
          matchData = matchData && dataCadastroNormalizada <= dataFimNormalizada;
        }
      } else {
        // Se não tem data de cadastro mas não há filtro restritivo, mostrar
        matchData = !filtroDataInicio && !filtroDataFim;
      }
    }
    
    return matchNome && matchTelefone && matchCPF && matchTipo && matchStatus && matchConsultor && matchData;
  });

  const handleTutorialComplete = () => {
    setShowTutorial(false);
    setTutorialCompleted(true);
    localStorage.setItem('tutorial-pacientes-completed', 'true');
  };

  const handleTutorialClose = () => {
    setShowTutorial(false);
    localStorage.setItem('tutorial-pacientes-dismissed', 'true');
  };

  const startTutorial = () => {
    setShowTutorial(true);
  };

  // Função para copiar link personalizado
  const copiarLink = async (link) => {
    try {
      await navigator.clipboard.writeText(link);
      showSuccessToast('Link copiado para a área de transferência!');
    } catch (error) {
      // Fallback para navegadores mais antigos
      const textArea = document.createElement('textarea');
      textArea.value = link;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showSuccessToast('Link copiado para a área de transferência!');
    }
  };

  // Paginação em memória
  const totalPages = Math.max(1, Math.ceil(pacientesFiltrados.length / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;
  const pacientesPaginados = pacientesFiltrados.slice(startIndex, endIndex);

  return (
    <div style={{ padding: '1.5rem' }}>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page-title">Meus Pacientes</h1>
            <p className="page-subtitle">Acompanhe o status de seus pacientes indicados</p>
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
              title="Ver tutorial da tela de pacientes"
            >
              Ver Tutorial
            </button>
          )}
        </div>
        
        <div style={{
          borderRadius: '8px',
          padding: '1rem',
          fontSize: '0.875rem'
        }}>
          
          {/* Links personalizados para consultores */}
          {isConsultor && (
            <div style={{ 
              marginTop: '1rem', 
              padding: '0.75rem', 
              borderRadius: '6px' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#16a34a' }}>
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
                <strong style={{ color: '#16a34a' }}>Meu Link de Indicação</strong>
              </div>
              
              {loadingLink ? (
                <div style={{ textAlign: 'center', padding: '1rem', color: '#6b7280' }}>
                  <div style={{ 
                    width: '1.5rem', 
                    height: '1.5rem', 
                    border: '2px solid #e5e7eb', 
                    borderTop: '2px solid #3b82f6', 
                    borderRadius: '50%', 
                    animation: 'spin 1s linear infinite', 
                    margin: '0 auto 0.5rem' 
                  }}></div>
                  Carregando links...
                </div>
              ) : (linkPersonalizado || linkClinicas) ? (
                <div>
                  {/* Link para Pacientes */}
                  {linkPersonalizado && (
                    <div style={{ 
                      backgroundColor: '#f0fdf4', 
                      border: '1px solid #86efac', 
                      borderRadius: '8px', 
                      padding: '1rem', 
                      marginBottom: '0.75rem'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        marginBottom: '0.5rem'
                      }}>
                        <span style={{ 
                          color: '#166534', 
                          fontWeight: '600',
                          fontSize: '0.9rem'
                        }}>
                          Link para Pacientes:
                        </span>
                        <button
                          onClick={() => copiarLink(linkPersonalizado)}
                          style={{
                            background: '#16a34a',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 10px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            fontWeight: '500'
                          }}
                        >
                          Copiar
                        </button>
                      </div>
                      <div style={{ 
                        color: '#166534', 
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        wordBreak: 'break-all',
                        lineHeight: '1.4',
                        backgroundColor: 'rgba(255,255,255,0.7)',
                        padding: '8px',
                        borderRadius: '6px'
                      }}>
                        {linkPersonalizado}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ 
                  backgroundColor: '#fef2f2', 
                  border: '1px solid #fecaca', 
                  borderRadius: '6px', 
                  padding: '1rem',
                  textAlign: 'center'
                }}>
                  <div style={{ color: '#dc2626', fontSize: '14px', marginBottom: '4px' }}>
                    ⚠️ Links personalizados não encontrados
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '12px' }}>
                    Entre em contato com o administrador para gerar seus links.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Navegação por abas - Ocultar para freelancers */}
      {(isAdmin || isConsultorInterno) && (
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
      )}

      {/* Conteúdo da aba Pacientes */}
      {activeTab === 'pacientes' && (
        <>
          {/* Resumo de Estatísticas */}
          <div className="stats-grid" style={{ marginBottom: '2rem' }}>
            <div className="stat-card">
              <div className="stat-label">Leads</div>
              <div className="stat-value">{pacientesFiltrados.filter(p => p.status === 'lead').length}</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-label">Agendados</div>
              <div className="stat-value">{pacientesFiltrados.filter(p => p.status === 'agendado').length}</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-label">Fechados</div>
              <div className="stat-value">{pacientesFiltrados.filter(p => p.status === 'fechado').length}</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-label">Exibindo</div>
              <div className="stat-value">{pacientesFiltrados.length}</div>
              <div className="stat-sublabel">de {isConsultorInterno ? pacientes.length : pacientes.filter(p => p.consultor_id && p.consultor_id !== '' && p.consultor_id !== null && p.consultor_id !== undefined && Number(p.consultor_id) !== 0).length}</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-label">Taxa Conversão</div>
              <div className="stat-value">
                {pacientesFiltrados.length > 0 
                  ? Math.round((pacientesFiltrados.filter(p => p.status === 'fechado').length / pacientesFiltrados.length) * 100)
                  : 0}%
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="card-title" style={{ fontSize: '1.1rem' }}>Filtros</h2>
              <button className="btn btn-secondary" onClick={() => setMostrarFiltros(!mostrarFiltros)}>
                {mostrarFiltros ? 'Ocultar Filtros' : 'Filtros'}
              </button>
            </div>
            {mostrarFiltros && (
              <div style={{ padding: '1.5rem', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <div className="grid grid-3" style={{ gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Nome</label>
                    <input type="text" className="form-input" value={filtroNome} onChange={e => setFiltroNome(e.target.value)} placeholder="Buscar por nome" />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Telefone</label>
                    <input type="text" className="form-input" value={filtroTelefone} onChange={e => setFiltroTelefone(e.target.value)} placeholder="Buscar por telefone" />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">CPF</label>
                    <input type="text" className="form-input" value={filtroCPF} onChange={e => setFiltroCPF(e.target.value)} placeholder="Buscar por CPF" />
                  </div>
                </div>
                <div className="grid grid-4" style={{ gap: '1rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Tipo de Tratamento</label>
                    <select className="form-select" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
                      <option value="">Todos</option>
                      <option value="Estético">Estético</option>
                      <option value="Odontológico">Odontológico</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Status</label>
                    <select className="form-select" value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
                      <option value="">Todos</option>
                      {statusOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                   <div className="form-group" style={{ margin: 0 }}>
                     <label className="form-label">Consultor</label>
                     <select 
                       className="form-select" 
                       value={filtroConsultor} 
                       onChange={e => setFiltroConsultor(e.target.value)}
                       disabled={deveFiltrarPorConsultor}
                       style={{ 
                         opacity: deveFiltrarPorConsultor ? 0.6 : 1,
                         cursor: deveFiltrarPorConsultor ? 'not-allowed' : 'pointer'
                       }}
                     >
                       <option value="">Todos</option>
                       {consultores.map(c => (
                         <option key={c.id} value={String(c.id)}>{c.nome}</option>
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
                </div>
                <div className="grid grid-2" style={{ gap: '1rem', marginTop: '1rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Data de Cadastro - Início</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      value={filtroDataInicio} 
                      onChange={e => setFiltroDataInicio(e.target.value)} 
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Data de Cadastro - Fim</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      value={filtroDataFim} 
                      onChange={e => setFiltroDataFim(e.target.value)} 
                    />
                  </div>
                </div>
                 <button className="btn btn-sm btn-secondary" style={{ marginTop: '1rem' }} onClick={() => {
                   setFiltroNome(''); 
                   setFiltroTelefone(''); 
                   setFiltroCPF(''); 
                   setFiltroTipo(''); 
                   setFiltroStatus(''); 
                   // Só limpar filtro de consultor se não estiver com filtro automático ativo
                   if (!deveFiltrarPorConsultor) {
                     setFiltroConsultor('');
                   }
                   setFiltroDataInicio('');
                   setFiltroDataFim('');
                 }}>Limpar Filtros</button>
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="card-title">Lista de Pacientes</h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  className="btn btn-primary" 
                  onClick={() => {
                    setShowModal(true);
                    // Se for consultor, pré-preenche o consultor_id automaticamente
                    if (isConsultor) {
                      setFormData(prev => ({
                        ...prev,
                        consultor_id: String(user?.consultor_id || user?.id)
                      }));
                    }
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Novo Paciente
                </button>
              </div>
            </div>

            {loading ? (
              <div className="loading">
                <div className="spinner"></div>
              </div>
            ) : pacientesFiltrados.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#6b7280', padding: '3rem' }}>
                Nenhum paciente cadastrado ainda.
              </div>
            ) : (
              <>
                <div className="table-container">
                  <table className="table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>Consultor</th>
                      <th style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>Telefone</th>
                      <th style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>CPF</th>
                      <th style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>Cidade</th>
                      <th style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>Tipo</th>
                      <th>
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
                      <th style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>Cadastrado</th>
                      <th style={{ width: '140px' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pacientesPaginados.map(paciente => {
                      const statusInfo = getStatusInfo(paciente.status);
                      return (
                        <tr key={paciente.id}>
                          <td>
                            <div>
                              <strong>{paciente.nome}</strong>
                              {paciente.observacoes && (
                                <div style={{ marginTop: '0.25rem' }}>
                                  <button
                                    onClick={() => handleViewObservacoes(paciente.observacoes)}
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
                          <td style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>
                            {paciente.consultor_nome || (
                              <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>
                                Não atribuído
                              </span>
                            )}
                          </td>
                          <td style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>{formatarTelefone(paciente.telefone)}</td>
                          <td style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>{formatarCPF(paciente.cpf)}</td>
                          <td style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>
                            {paciente.cidade || paciente.estado ? (
                              <>
                                {paciente.cidade && <div>{paciente.cidade}</div>}
                                {paciente.estado && <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{paciente.estado}</div>}
                              </>
                            ) : '-'}
                          </td>
                          <td style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>
                            {paciente.tipo_tratamento && (
                              <span className={`badge badge-${paciente.tipo_tratamento === 'Estético' ? 'info' : 'warning'}`}>
                                {paciente.tipo_tratamento}
                              </span>
                            )}
                          </td>
                          <td>
                            <select
                              value={statusTemporario[paciente.id] || paciente.status}
                              onChange={(e) => updateStatus(paciente.id, e.target.value)}
                              disabled={!podeAlterarStatus}
                              style={{
                                padding: '0.25rem 0.5rem',
                                borderRadius: '4px',
                                opacity: podeAlterarStatus ? 1 : 0.5,
                                cursor: podeAlterarStatus ? 'pointer' : 'not-allowed',
                                fontSize: '0.75rem',
                                backgroundColor: statusInfo.color + '10',
                                color: statusInfo.color,
                                border: `1px solid ${statusInfo.color}`
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
                          <td style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>{formatarData(paciente.created_at)}</td>
                          <td style={{ display: 'flex', gap: '0.5rem' }}> 
                              <button
                                onClick={() => handleView(paciente)}
                                className="btn-action"
                                title="Visualizar"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                              </button>
                            {!isConsultor && !isClinica ? (
                              <button
                                onClick={() => handleEdit(paciente)}
                                className="btn-action"
                                title="Editar"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </button>
                            ) : null}
                            {isAdmin && (
                              <button
                                onClick={() => excluirPaciente(paciente.id)}
                                className="btn-action"
                                title="Excluir Paciente"
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
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  </table>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                  <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                    Página {currentPage} de {totalPages} — exibindo {pacientesPaginados.length} de {pacientesFiltrados.length}
                  </div>
                  <div style={{ display: window.innerWidth <= 768 ? 'flex' : 'block' }}>
                    <button
                      className="btn"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      style={{ marginRight: '8px' }}
                    >
                      Anterior
                    </button>
                    <button
                      className="btn"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* Conteúdo da aba Novos Leads */}
      {activeTab === 'novos-leads' && (
        <>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Novos Leads</h2>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                {novosLeads.length} lead(s)
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
                      <th style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>Telefone</th>
                      <th style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>CPF</th>
                      <th style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>Cidade</th>
                      <th style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>Tipo</th>
                      <th style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>Status</th>
                      <th style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>Cadastrado</th>
                      <th style={{ width: '200px', minWidth: '200px' }}>Ações</th>
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
                                <div style={{ marginTop: '0.25rem' }}>
                                  <button
                                    onClick={() => handleViewObservacoes(lead.observacoes)}
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
                          <td style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>{formatarTelefone(lead.telefone)}</td>
                          <td style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>{formatarCPF(lead.cpf)}</td>
                          <td style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>
                            {lead.cidade || lead.estado ? (
                              <>
                                {lead.cidade && <div>{lead.cidade}</div>}
                                {lead.estado && <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{lead.estado}</div>}
                              </>
                            ) : '-'}
                          </td>
                          <td style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>
                            {lead.tipo_tratamento && (
                              <span className={`badge badge-${lead.tipo_tratamento === 'Estético' ? 'info' : 'warning'}`}>
                                {lead.tipo_tratamento}
                              </span>
                            )}
                          </td>
                          <td style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>
                            {(isAdmin || podeAlterarStatus) ? (
                              <select
                                value={lead.status}
                                onChange={(e) => alterarStatusNovoLead(lead.id, e.target.value)}
                                className="form-select"
                                style={{
                                  fontSize: '0.75rem',
                                  padding: '0.25rem 0.5rem',
                                  border: 'none',
                                  backgroundColor: statusInfo.color + '20',
                                  color: statusInfo.color,
                                  fontWeight: '600',
                                  borderRadius: '0.375rem'
                                }}
                              >
                                {statusOptions.map(option => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="badge badge-warning">
                                {statusInfo.label}
                              </span>
                            )}
                          </td>
                          <td style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>{formatarData(lead.created_at)}</td>
                          <td style={{ padding: '0.5rem', minWidth: '200px' }}>
                            <div style={{ 
                              display: 'flex', 
                              gap: '0.25rem', 
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              justifyContent: 'flex-start'
                            }}>
                              <button
                                onClick={() => handleView(lead)}
                                className="btn-action"
                                title="Visualizar"
                                style={{ 
                                  padding: '0.375rem',
                                  minWidth: '32px',
                                  height: '32px'
                                }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                              </button>
                              <button
                                onClick={() => pegarLead(lead.id)}
                                className="btn btn-primary"
                                style={{ 
                                  fontSize: window.innerWidth <= 768 ? '0.75rem' : '0.8rem',
                                  padding: window.innerWidth <= 768 ? '0.375rem 0.5rem' : '0.5rem 0.75rem',
                                  minWidth: '80px',
                                  height: '32px',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {window.innerWidth <= 768 ? 'Atribuir' : 'Atribuir Lead'}
                              </button>
                              {/* Botão de excluir - apenas para admin */}
                              {isAdmin && (
                                <button
                                  onClick={() => excluirLead(lead.id)}
                                  className="btn-action"
                                  title="Excluir Lead"
                                  style={{ 
                                    color: '#dc2626',
                                    padding: '0.375rem',
                                    minWidth: '32px',
                                    height: '32px',
                                    backgroundColor: '#fef2f2',
                                    border: '1px solid #fecaca',
                                    borderRadius: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="3,6 5,6 21,6"></polyline>
                                    <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                                    <line x1="10" y1="11" x2="10" y2="17"></line>
                                    <line x1="14" y1="11" x2="14" y2="17"></line>
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
        </>
      )}

      {/* Modal de Cadastro - Formulário Simples (para freelancers) */}
      {showModal && !editingPaciente && isConsultor && !isAdmin && !isConsultorInterno && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Cadastrar Novo Paciente</h2>
              <button className="close-btn" onClick={resetForm}>×</button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '2rem' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : 'repeat(2, 1fr)',
                gap: '1.5rem',
                marginBottom: '1.5rem'
              }}>
                {/* Nome */}
                <div style={{ gridColumn: window.innerWidth <= 768 ? '1' : 'span 2' }}>
                  <label style={{
                    display: 'block',
                    fontWeight: '600',
                    color: '#1e293b',
                    marginBottom: '0.5rem',
                    fontSize: '0.95rem'
                  }}>
                    Nome do Paciente *
                  </label>
                  <input
                    type="text"
                    name="nome"
                    value={formData.nome}
                    onChange={handleInputChange}
                    placeholder="Digite o nome do paciente"
                    required
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '10px',
                      fontSize: '1rem',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* WhatsApp */}
                <div>
                  <label style={{
                    display: 'block',
                    fontWeight: '600',
                    color: '#1e293b',
                    marginBottom: '0.5rem',
                    fontSize: '0.95rem'
                  }}>
                    WhatsApp *
                  </label>
                  <input
                    type="tel"
                    name="telefone"
                    value={formData.telefone}
                    onChange={handleInputChange}
                    placeholder="(11) 99999-9999"
                    required
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '10px',
                      fontSize: '1rem',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Estado */}
                <div>
                  <label style={{
                    display: 'block',
                    fontWeight: '600',
                    color: '#1e293b',
                    marginBottom: '0.5rem',
                    fontSize: '0.95rem'
                  }}>
                    Estado *
                  </label>
                  <select
                    name="estado"
                    value={formData.estado}
                    onChange={handleInputChange}
                    required
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '10px',
                      fontSize: '1rem',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">Selecione o estado</option>
                    {estadosBrasileiros.map(estado => (
                      <option key={estado.sigla} value={estado.sigla}>
                        {estado.sigla} - {estado.nome}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Cidade */}
                <div style={{ gridColumn: window.innerWidth <= 768 ? '1' : 'span 2' }}>
                  <label style={{
                    display: 'block',
                    fontWeight: '600',
                    color: '#1e293b',
                    marginBottom: '0.5rem',
                    fontSize: '0.95rem'
                  }}>
                    Cidade *
                  </label>
                  {formData.estado && cidadesPorEstado[formData.estado] && !cidadeCustomizada ? (
                    <select
                      name="cidade"
                      value={formData.cidade}
                      onChange={(e) => {
                        if (e.target.value === 'OUTRA') {
                          setCidadeCustomizada(true);
                          setFormData(prev => ({ ...prev, cidade: '' }));
                        } else {
                          handleInputChange(e);
                        }
                      }}
                      required
                      style={{
                        width: '100%',
                        padding: '0.875rem',
                        border: '2px solid #e2e8f0',
                        borderRadius: '10px',
                        fontSize: '1rem',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="">Selecione a cidade</option>
                      {cidadesPorEstado[formData.estado].map(cidade => (
                        <option key={cidade} value={cidade}>{cidade}</option>
                      ))}
                      <option value="OUTRA">Outra cidade</option>
                    </select>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <input
                          type="text"
                          name="cidade"
                          value={formData.cidade}
                          onChange={handleInputChange}
                          placeholder="Digite o nome da cidade"
                          disabled={!formData.estado}
                          required
                          style={{
                            width: '100%',
                            padding: '0.875rem',
                            border: '2px solid #e2e8f0',
                            borderRadius: '10px',
                            fontSize: '1rem',
                            outline: 'none'
                          }}
                        />
                      </div>
                      {formData.estado && cidadesPorEstado[formData.estado] && cidadeCustomizada && (
                        <button
                          type="button"
                          onClick={() => {
                            setCidadeCustomizada(false);
                            setFormData(prev => ({ ...prev, cidade: '' }));
                          }}
                          style={{
                            padding: '0.875rem 1rem',
                            background: '#e2e8f0',
                            color: '#1e293b',
                            border: 'none',
                            borderRadius: '10px',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          Voltar
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Observações */}
                <div style={{ gridColumn: window.innerWidth <= 768 ? '1' : 'span 2' }}>
                  <label style={{
                    display: 'block',
                    fontWeight: '600',
                    color: '#1e293b',
                    marginBottom: '0.5rem',
                    fontSize: '0.95rem'
                  }}>
                    Observações
                  </label>
                  <textarea
                    name="observacoes"
                    value={formData.observacoes}
                    onChange={handleInputChange}
                    placeholder="Adicione observações sobre o paciente (opcional)"
                    rows="3"
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '10px',
                      fontSize: '1rem',
                      outline: 'none',
                      resize: 'vertical',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>
              </div>

              {/* Botão de Submit */}
              <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={resetForm}
                  style={{
                    padding: '0.75rem 2rem',
                    background: '#e2e8f0',
                    color: '#1e293b',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    marginRight: '1rem'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.75rem 2rem',
                    background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '1rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Cadastrar Paciente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Cadastro - Formulário Completo (para admins e internos) */}
      {showModal && !editingPaciente && (isAdmin || isConsultorInterno || !isConsultor) && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Novo Paciente</h2>
              <button className="close-btn" onClick={resetForm}>×</button>
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
                  onBlur={handleNomeBlur}
                  placeholder="Digite o nome do paciente"
                  required
                />
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Telefone *</label>
                  <input
                    type="tel"
                    name="telefone"
                    className="form-input"
                    value={formData.telefone}
                    onChange={handleInputChange}
                    placeholder="(11) 99999-9999"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">CPF *</label>
                  <input
                    type="text"
                    name="cpf"
                    className="form-input"
                    value={formData.cpf}
                    onChange={handleInputChange}
                    placeholder="000.000.000-00"
                    maxLength="14"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Estado *</label>
                  <select
                    name="estado"
                    className="form-select"
                    value={formData.estado}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Selecione o estado</option>
                    {estadosBrasileiros.map(estado => (
                      <option key={estado.sigla} value={estado.sigla}>
                        {estado.sigla} - {estado.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Cidade *</label>
                  {formData.estado && cidadesPorEstado[formData.estado] && !cidadeCustomizada ? (
                    <select
                      name="cidade"
                      className="form-select"
                      value={formData.cidade}
                      onChange={(e) => {
                        if (e.target.value === 'OUTRA') {
                          setCidadeCustomizada(true);
                          setFormData(prev => ({ ...prev, cidade: '' }));
                        } else {
                          handleInputChange(e);
                        }
                      }}
                      required
                    >
                      <option value="">Selecione a cidade</option>
                      {cidadesPorEstado[formData.estado].map(cidade => (
                        <option key={cidade} value={cidade}>{cidade}</option>
                      ))}
                      <option value="OUTRA">Outra cidade</option>
                    </select>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        type="text"
                        name="cidade"
                        className="form-input"
                        value={formData.cidade}
                        onChange={handleInputChange}
                        placeholder="Digite o nome da cidade"
                        disabled={!formData.estado}
                        required
                      />
                      {formData.estado && cidadesPorEstado[formData.estado] && cidadeCustomizada && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ whiteSpace: 'nowrap', fontSize: '0.875rem', padding: '0.5rem' }}
                          onClick={() => {
                            setCidadeCustomizada(false);
                            setFormData(prev => ({ ...prev, cidade: '' }));
                          }}
                        >
                          Voltar
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Observações */}
                <div style={{ gridColumn: window.innerWidth <= 768 ? '1' : 'span 2' }}>
                  <label style={{
                    display: 'block',
                    fontWeight: '600',
                    color: '#1e293b',
                    marginBottom: '0.5rem',
                    fontSize: '0.95rem'
                  }}>
                    Observações
                  </label>
                  <textarea
                    name="observacoes"
                    value={formData.observacoes}
                    onChange={handleInputChange}
                    placeholder="Adicione observações sobre o paciente (opcional)"
                    rows="3"
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '10px',
                      fontSize: '1rem',
                      outline: 'none',
                      resize: 'vertical',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>
              </div>

              {/* Botão de Submit */}
              <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={resetForm}
                  style={{
                    padding: '0.75rem 2rem',
                    background: '#e2e8f0',
                    color: '#1e293b',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    marginRight: '1rem'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.75rem 2rem',
                    background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '1rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Cadastrar Paciente
                </button>
              </div>

              {/* Mensagem informativa */}
              <div style={{
                marginTop: '1.5rem',
                padding: '1rem',
                background: 'rgba(59, 130, 246, 0.1)',
                borderLeft: '4px solid #3b82f6',
                borderRadius: '8px'
              }}>
                <p style={{
                  margin: 0,
                  fontSize: '0.9rem',
                  color: '#1e40af',
                  lineHeight: '1.6'
                }}>
                  <strong>Dica:</strong> Ao cadastrar um paciente, ele será automaticamente atribuído a você e aparecerá na sua página de pacientes.
                </p>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Cadastro - Formulário Completo (para admins e internos) */}
      {showModal && !editingPaciente && (isAdmin || isConsultorInterno || !isConsultor) && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Novo Paciente</h2>
              <button className="close-btn" onClick={resetForm}>×</button>
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
                  onBlur={handleNomeBlur}
                  placeholder="Digite o nome do paciente"
                  required
                />
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Telefone *</label>
                  <input
                    type="tel"
                    name="telefone"
                    className="form-input"
                    value={formData.telefone}
                    onChange={handleInputChange}
                    placeholder="(11) 99999-9999"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">CPF *</label>
                  <input
                    type="text"
                    name="cpf"
                    className="form-input"
                    value={formData.cpf}
                    onChange={handleInputChange}
                    placeholder="000.000.000-00"
                    maxLength="14"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Estado *</label>
                  <select
                    name="estado"
                    className="form-select"
                    value={formData.estado}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Selecione o estado</option>
                    {estadosBrasileiros.map(estado => (
                      <option key={estado.sigla} value={estado.sigla}>
                        {estado.sigla} - {estado.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Cidade *</label>
                  {formData.estado && cidadesPorEstado[formData.estado] && !cidadeCustomizada ? (
                    <select
                      name="cidade"
                      className="form-select"
                      value={formData.cidade}
                      onChange={(e) => {
                        if (e.target.value === 'OUTRA') {
                          setCidadeCustomizada(true);
                          setFormData(prev => ({ ...prev, cidade: '' }));
                        } else {
                          handleInputChange(e);
                        }
                      }}
                      required
                    >
                      <option value="">Selecione a cidade</option>
                      {cidadesPorEstado[formData.estado].map(cidade => (
                        <option key={cidade} value={cidade}>{cidade}</option>
                      ))}
                      <option value="OUTRA">Outra cidade</option>
                    </select>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        type="text"
                        name="cidade"
                        className="form-input"
                        value={formData.cidade}
                        onChange={handleInputChange}
                        placeholder="Digite o nome da cidade"
                        disabled={!formData.estado}
                        required
                      />
                      {formData.estado && cidadesPorEstado[formData.estado] && cidadeCustomizada && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ whiteSpace: 'nowrap', fontSize: '0.875rem', padding: '0.5rem' }}
                          onClick={() => {
                            setCidadeCustomizada(false);
                            setFormData(prev => ({ ...prev, cidade: '' }));
                          }}
                        >
                          Voltar
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Tipo de Tratamento *</label>
                  <select
                    name="tipo_tratamento"
                    className="form-select"
                    value={formData.tipo_tratamento}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Selecione</option>
                    <option value="Estético">Estético</option>
                    <option value="Odontológico">Odontológico</option>
                    <option value="Ambos">Ambos</option>
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
                  Cadastrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Modal de Edição - Formulário Completo (para todos que podem editar) */}
      {showModal && editingPaciente && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Editar Paciente</h2>
              <button className="close-btn" onClick={resetForm}>×</button>
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
                  onBlur={handleNomeBlur}
                  placeholder="Digite o nome do paciente"
                  required
                />
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Telefone *</label>
                  <input
                    type="tel"
                    name="telefone"
                    className="form-input"
                    value={formData.telefone}
                    onChange={handleInputChange}
                    placeholder="(11) 99999-9999"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">CPF *</label>
                  <input
                    type="text"
                    name="cpf"
                    className="form-input"
                    value={formData.cpf}
                    onChange={handleInputChange}
                    placeholder="000.000.000-00"
                    maxLength="14"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Estado *</label>
                  <select
                    name="estado"
                    className="form-select"
                    value={formData.estado}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Selecione o estado</option>
                    {estadosBrasileiros.map(estado => (
                      <option key={estado.sigla} value={estado.sigla}>
                        {estado.sigla} - {estado.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Cidade *</label>
                  {formData.estado && cidadesPorEstado[formData.estado] && !cidadeCustomizada ? (
                    <select
                      name="cidade"
                      className="form-select"
                      value={formData.cidade}
                      onChange={(e) => {
                        if (e.target.value === 'OUTRA') {
                          setCidadeCustomizada(true);
                          setFormData(prev => ({ ...prev, cidade: '' }));
                        } else {
                          handleInputChange(e);
                        }
                      }}
                      required
                    >
                      <option value="">Selecione a cidade</option>
                      {cidadesPorEstado[formData.estado].map(cidade => (
                        <option key={cidade} value={cidade}>{cidade}</option>
                      ))}
                      <option value="OUTRA">Outra cidade</option>
                    </select>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        type="text"
                        name="cidade"
                        className="form-input"
                        value={formData.cidade}
                        onChange={handleInputChange}
                        placeholder="Digite o nome da cidade"
                        disabled={!formData.estado}
                        required
                      />
                      {formData.estado && cidadesPorEstado[formData.estado] && cidadeCustomizada && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ whiteSpace: 'nowrap', fontSize: '0.875rem', padding: '0.5rem' }}
                          onClick={() => {
                            setCidadeCustomizada(false);
                            setFormData(prev => ({ ...prev, cidade: '' }));
                          }}
                        >
                          Voltar
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Tipo de Tratamento *</label>
                  <select
                    name="tipo_tratamento"
                    className="form-select"
                    value={formData.tipo_tratamento}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Selecione</option>
                    <option value="Estético">Estético</option>
                    <option value="Odontológico">Odontológico</option>
                    <option value="Ambos">Ambos</option>
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
                  Atualizar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de visualização: */}
      {showViewModal && viewPaciente && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Visualizar Paciente</h2>
              <button className="close-btn" onClick={() => setShowViewModal(false)}>×</button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Nome Completo</label>
                <input type="text" className="form-input" value={viewPaciente.nome || '-'} readOnly />
              </div>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Telefone</label>
                  <input type="text" className="form-input" value={viewPaciente.telefone || '-'} readOnly />
                </div>
                <div className="form-group">
                  <label className="form-label">CPF</label>
                  <input type="text" className="form-input" value={viewPaciente.cpf || '-'} readOnly />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Cidade</label>
                <input type="text" className="form-input" value={viewPaciente.cidade || '-'} readOnly />
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Tipo de Tratamento</label>
                  <input type="text" className="form-input" value={viewPaciente.tipo_tratamento || '-'} readOnly />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <input type="text" className="form-input" value={getStatusInfo(viewPaciente.status).label || '-'} readOnly />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Consultor Responsável</label>
                <input type="text" className="form-input" value={consultores.find(c => String(c.id) === String(viewPaciente.consultor_id))?.nome || '-'} readOnly />
              </div>
              <div className="form-group">
                <label className="form-label">Observações</label>
                <textarea className="form-textarea" value={viewPaciente.observacoes || '-'} readOnly rows="3" />
              </div>
              <div className="form-group">
                <label className="form-label">Cadastrado em</label>
                <input type="text" className="form-input" value={viewPaciente.created_at ? formatarData(viewPaciente.created_at) : '-'} readOnly />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Observações */}
      {showObservacoesModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Observações sobre o paciente</h2> 
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

      {/* Modal de Agendamento */}
      {showAgendamentoModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Criar Agendamento</h2>
              <button className="close-btn" onClick={fecharModalAgendamento}>
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
                  <strong>Paciente:</strong> {pacienteParaAgendar?.nome}
                </p>
                <p style={{ 
                  color: '#6b7280', 
                  fontSize: '0.875rem',
                  lineHeight: '1.5'
                }}>
                  Preencha os dados do agendamento:
                </p>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Clínica *</label>
                <select 
                  className="form-select"
                  value={agendamentoData.clinica_id}
                  onChange={(e) => setAgendamentoData({...agendamentoData, clinica_id: e.target.value})}
                >
                  <option value="">Selecione uma clínica</option>
                  {clinicas.map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-2" style={{ gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Data do Agendamento *</label>
                  <input 
                    type="date"
                    className="form-input"
                    value={agendamentoData.data_agendamento}
                    onChange={(e) => setAgendamentoData({...agendamentoData, data_agendamento: e.target.value})}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Horário *</label>
                  <input 
                    type="time"
                    className="form-input"
                    value={agendamentoData.horario}
                    onChange={(e) => setAgendamentoData({...agendamentoData, horario: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Observações</label>
                <textarea 
                  className="form-textarea"
                  rows="3"
                  value={agendamentoData.observacoes}
                  onChange={(e) => setAgendamentoData({...agendamentoData, observacoes: e.target.value})}
                  placeholder="Informações adicionais sobre o agendamento..."
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
                  onClick={fecharModalAgendamento}
                  disabled={salvandoAgendamento}
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  className="btn btn-primary"
                  onClick={salvarAgendamento}
                  disabled={salvandoAgendamento || !agendamentoData.clinica_id || !agendamentoData.data_agendamento || !agendamentoData.horario}
                >
                  {salvandoAgendamento ? (
                    <>
                      <span className="loading-spinner" style={{ 
                        display: 'inline-block', 
                        verticalAlign: 'middle', 
                        marginRight: 8 
                      }}></span>
                      Criando...
                    </>
                  ) : (
                    'Criar Agendamento'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Fechamento */}
      {showFechamentoModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Criar Fechamento</h2>
              <button className="close-btn" onClick={fecharModalFechamento}>
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
                  <strong>Paciente:</strong> {pacienteParaFechar?.nome}
                </p>
                <p style={{ 
                  color: '#6b7280', 
                  fontSize: '0.875rem',
                  lineHeight: '1.5'
                }}>
                  Preencha os dados do fechamento:
                </p>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Valor do Fechamento *</label>
                <input 
                  type="text"
                  className="form-input"
                  value={valorFormatado}
                  onChange={handleValorChange}
                  placeholder="R$ 0,00"
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Contrato (PDF) *</label>
                <input 
                  type="file"
                  className="form-input"
                  accept=".pdf"
                  onChange={(e) => setContratoFechamento(e.target.files[0])}
                />
                {contratoFechamento && (
                  <div style={{ 
                    marginTop: '0.5rem', 
                    fontSize: '0.875rem', 
                    color: '#059669' 
                  }}>
                    ✓ {contratoFechamento.name}
                  </div>
                )}
              </div>

              <div className="grid grid-2" style={{ gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
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

                <div className="form-group">
                  <label className="form-label">Data do Fechamento</label>
                  <input 
                    type="date"
                    className="form-input"
                    value={dataFechamento}
                    onChange={(e) => setDataFechamento(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Observações</label>
                <textarea 
                  className="form-textarea"
                  rows="3"
                  value={observacoesFechamento}
                  onChange={(e) => setObservacoesFechamento(e.target.value)}
                  placeholder="Observações sobre o fechamento..."
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
                  onClick={fecharModalFechamento}
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
                      Criando...
                    </>
                  ) : (
                    'Criar Fechamento'
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

      {/* Modal de Atribuir Consultor */}
      {showAtribuirConsultorModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Atribuir Lead a Consultor</h2>
              <button className="close-btn" onClick={fecharModalAtribuirConsultor}>
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
                  <strong>Lead:</strong> {leadParaAtribuir?.nome}
                </p>
                <p style={{ 
                  color: '#6b7280', 
                  fontSize: '0.875rem',
                  lineHeight: '1.5'
                }}>
                  Selecione o consultor que irá atender este lead:
                </p>
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Consultor *</label>
                <select 
                  className="form-select"
                  value={consultorSelecionado}
                  onChange={(e) => setConsultorSelecionado(e.target.value)}
                >
                  <option value="">Selecione um consultor</option>
                  {consultores.map(consultor => (
                    <option key={consultor.id} value={consultor.id}>
                      {consultor.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ 
                display: 'flex', 
                gap: '1rem', 
                justifyContent: 'flex-end' 
              }}>
                <button 
                  type="button"
                  className="btn btn-secondary" 
                  onClick={fecharModalAtribuirConsultor}
                  disabled={salvandoAtribuicao}
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  className="btn btn-primary"
                  onClick={confirmarAtribuicaoConsultor}
                  disabled={salvandoAtribuicao || !consultorSelecionado}
                >
                  {salvandoAtribuicao ? (
                    <>
                      <span className="loading-spinner" style={{ 
                        display: 'inline-block', 
                        verticalAlign: 'middle', 
                        marginRight: 8 
                      }}></span>
                      Atribuindo...
                    </>
                  ) : (
                    'Atribuir Lead'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tutorial Overlay */}
      <TutorialPacientes
        isOpen={showTutorial}
        onClose={handleTutorialClose}
        onComplete={handleTutorialComplete}
      />
      
    </div>
  );
};

export default Pacientes; 