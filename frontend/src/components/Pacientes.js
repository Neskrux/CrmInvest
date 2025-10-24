import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import useBranding from '../hooks/useBranding';
import { useToast } from '../components/Toast';
import ModalEvidencia from './ModalEvidencia';
import * as XLSX from 'xlsx';
import useSmartPolling from '../hooks/useSmartPolling';

const Pacientes = () => {
  const { t, empresaId, shouldShow } = useBranding();
  const location = useLocation();
  const { makeRequest, user, isAdmin, podeAlterarStatus, isConsultorInterno, podeVerTodosDados, deveFiltrarPorConsultor, isIncorporadora, isFreelancer, isClinica, deveFiltrarPorClinica } = useAuth();
  const navigate = useNavigate();
  // Verificar se usuário é consultor
  const isConsultor = user?.tipo === 'consultor';
  const [pacientes, setPacientes] = useState([]);
  const [novosLeads, setNovosLeads] = useState([]);
  const [leadsNegativos, setLeadsNegativos] = useState([]);
  const [consultores, setConsultores] = useState([]);
  const [empreendimentos, setEmpreendimentos] = useState([]);
  const [agendamentos, setAgendamentos] = useState([]);
  const [fechamentos, setFechamentos] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingPaciente, setEditingPaciente] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Verificar se está na rota de cálculo de carteira
  const isCalculoCarteira = location.pathname === '/calculo-carteira';
  
  // Define aba inicial baseada no tipo de usuário e rota
  const [activeTab, setActiveTab] = useState(() => {
    if (isCalculoCarteira) return 'carteira-existente';
    if (isClinica) return 'meus-pacientes';
    return 'pacientes';
  });
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
  
  // Filtros para Leads Negativos
  const [mostrarFiltrosNegativos, setMostrarFiltrosNegativos] = useState(false);
  const [filtroNomeNegativos, setFiltroNomeNegativos] = useState('');
  const [filtroStatusNegativos, setFiltroStatusNegativos] = useState('');
  const [filtroConsultorNegativos, setFiltroConsultorNegativos] = useState('');
  
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
  const [activeViewTab, setActiveViewTab] = useState('informacoes');
  const [uploadingDocs, setUploadingDocs] = useState({});
  const [activeObservacoesTab, setActiveObservacoesTab] = useState('observacoes');
  const [evidenciasPaciente, setEvidenciasPaciente] = useState([]);
  const [pacienteObservacoes, setPacienteObservacoes] = useState(null);
  
  // Estados para Carteira Existente
  const [showCarteiraModal, setShowCarteiraModal] = useState(false);
  const [carteiraFormData, setCarteiraFormData] = useState({
    cpf: '',
    nomeCompleto: '',
    valorParcela: '',
    numeroParcelasAberto: '',
    primeiraVencimento: '',
    numeroParcelasAntecipar: ''
  });
  const [pacientesCarteira, setPacientesCarteira] = useState([]);
  const [carteiraCalculos, setCarteiraCalculos] = useState(null);
  const [percentualAlvoCarteira, setPercentualAlvoCarteira] = useState(130);
  const [solicitacoesCarteira, setSolicitacoesCarteira] = useState([]);
  const [showSolicitacaoModal, setShowSolicitacaoModal] = useState(false);
  const [solicitacaoSelecionada, setSolicitacaoSelecionada] = useState(null);
  
  // Estados para gerenciar contratos
  const [contratos, setContratos] = useState([]);
  const [showContratosModal, setShowContratosModal] = useState(false);
  const [uploadingContrato, setUploadingContrato] = useState(false);
  const [motivoReprovacao, setMotivoReprovacao] = useState('');
  const [contratoParaReprovar, setContratoParaReprovar] = useState(null);

  // Função para preencher automaticamente dados de teste
  const preencherDadosTeste = () => {
    const dadosTeste = [
      {
        cpf: '123.456.789-01',
        nomeCompleto: 'Bruno Silva',
        valorParcela: '500',
        numeroParcelasAberto: '12',
        primeiraVencimento: '2025-10-20',
        numeroParcelasAntecipar: '8'
      },
      {
        cpf: '987.654.321-00',
        nomeCompleto: 'Diego Santos',
        valorParcela: '750',
        numeroParcelasAberto: '15',
        primeiraVencimento: '2025-11-15',
        numeroParcelasAntecipar: '10'
      },
      {
        cpf: '456.789.123-45',
        nomeCompleto: 'Maria Oliveira',
        valorParcela: '300',
        numeroParcelasAberto: '18',
        primeiraVencimento: '2025-10-25',
        numeroParcelasAntecipar: '6'
      },
      {
        cpf: '111.222.333-44',
        nomeCompleto: 'João Carlos',
        valorParcela: '650',
        numeroParcelasAberto: '20',
        primeiraVencimento: '2025-12-05',
        numeroParcelasAntecipar: '12'
      },
      {
        cpf: '555.666.777-88',
        nomeCompleto: 'Ana Paula',
        valorParcela: '400',
        numeroParcelasAberto: '14',
        primeiraVencimento: '2025-10-30',
        numeroParcelasAntecipar: '7'
      },
      {
        cpf: '999.888.777-66',
        nomeCompleto: 'Pedro Henrique',
        valorParcela: '850',
        numeroParcelasAberto: '16',
        primeiraVencimento: '2025-11-25',
        numeroParcelasAntecipar: '9'
      },
      {
        cpf: '444.333.222-11',
        nomeCompleto: 'Carla Mendes',
        valorParcela: '550',
        numeroParcelasAberto: '22',
        primeiraVencimento: '2025-12-10',
        numeroParcelasAntecipar: '11'
      },
      {
        cpf: '777.888.999-00',
        nomeCompleto: 'Rafael Costa',
        valorParcela: '350',
        numeroParcelasAberto: '13',
        primeiraVencimento: '2025-11-05',
        numeroParcelasAntecipar: '5'
      },
      {
        cpf: '222.333.444-55',
        nomeCompleto: 'Fernanda Lima',
        valorParcela: '700',
        numeroParcelasAberto: '19',
        primeiraVencimento: '2025-12-15',
        numeroParcelasAntecipar: '13'
      },
      {
        cpf: '666.777.888-99',
        nomeCompleto: 'Marcos Antonio',
        valorParcela: '450',
        numeroParcelasAberto: '17',
        primeiraVencimento: '2025-11-10',
        numeroParcelasAntecipar: '8'
      },
      {
        cpf: '333.444.555-66',
        nomeCompleto: 'Juliana Santos',
        valorParcela: '600',
        numeroParcelasAberto: '21',
        primeiraVencimento: '2025-12-20',
        numeroParcelasAntecipar: '10'
      },
      {
        cpf: '888.999.000-11',
        nomeCompleto: 'Lucas Ferreira',
        valorParcela: '380',
        numeroParcelasAberto: '15',
        primeiraVencimento: '2025-10-18',
        numeroParcelasAntecipar: '6'
      },
      {
        cpf: '555.444.333-22',
        nomeCompleto: 'Patricia Alves',
        valorParcela: '520',
        numeroParcelasAberto: '18',
        primeiraVencimento: '2025-11-20',
        numeroParcelasAntecipar: '9'
      },
      {
        cpf: '111.000.999-88',
        nomeCompleto: 'Roberto Silva',
        valorParcela: '680',
        numeroParcelasAberto: '24',
        primeiraVencimento: '2025-12-25',
        numeroParcelasAntecipar: '14'
      },
      {
        cpf: '777.666.555-44',
        nomeCompleto: 'Camila Rodrigues',
        valorParcela: '420',
        numeroParcelasAberto: '16',
        primeiraVencimento: '2025-11-30',
        numeroParcelasAntecipar: '7'
      },
      {
        cpf: '333.222.111-00',
        nomeCompleto: 'Gabriel Martins',
        valorParcela: '580',
        numeroParcelasAberto: '20',
        primeiraVencimento: '2025-12-30',
        numeroParcelasAntecipar: '12'
      },
      {
        cpf: '999.888.777-66',
        nomeCompleto: 'Isabela Costa',
        valorParcela: '480',
        numeroParcelasAberto: '14',
        primeiraVencimento: '2025-10-22',
        numeroParcelasAntecipar: '6'
      },
      {
        cpf: '444.555.666-77',
        nomeCompleto: 'Thiago Oliveira',
        valorParcela: '720',
        numeroParcelasAberto: '23',
        primeiraVencimento: '2026-01-15',
        numeroParcelasAntecipar: '15'
      },
      {
        cpf: '222.111.000-99',
        nomeCompleto: 'Beatriz Souza',
        valorParcela: '390',
        numeroParcelasAberto: '17',
        primeiraVencimento: '2025-11-12',
        numeroParcelasAntecipar: '8'
      },
      {
        cpf: '666.555.444-33',
        nomeCompleto: 'Felipe Pereira',
        valorParcela: '630',
        numeroParcelasAberto: '19',
        primeiraVencimento: '2026-01-20',
        numeroParcelasAntecipar: '11'
      }
    ];

    // Limpar carteira atual
    setPacientesCarteira([]);
    setCarteiraCalculos(null);

    // Adicionar pacientes de teste
    dadosTeste.forEach((dados, index) => {
      setTimeout(() => {
        const novoPaciente = {
          id: Date.now() + index,
          cpf: dados.cpf,
          nomeCompleto: dados.nomeCompleto,
          valorParcela: parseInt(dados.valorParcela),
          numeroParcelasAberto: parseInt(dados.numeroParcelasAberto),
          primeiraVencimento: dados.primeiraVencimento,
          numeroParcelasAntecipar: parseInt(dados.numeroParcelasAntecipar)
        };

        setPacientesCarteira(prev => [...prev, novoPaciente]);
      }, index * 100); // Delay de 100ms entre cada paciente
    });

    // Calcular automaticamente após adicionar todos
    setTimeout(() => {
      calcularCarteiraExistente();
    }, dadosTeste.length * 100 + 500);
  };



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

  // Estados para cadastro completo da clínica
  const [showCadastroCompletoModal, setShowCadastroCompletoModal] = useState(false);
  const [dadosCompletosClinica, setDadosCompletosClinica] = useState({
    // Dados do paciente
    nome: '',
    telefone: '',
    cpf: '',
    cidade: '',
    estado: '',
    tipo_tratamento: '',
    observacoes: '',
    // Dados do fechamento
    valor_fechado: '',
    valor_fechado_formatado: '',
    contrato_arquivo: null,
    observacoes_fechamento: '',
    data_fechamento: new Date().toISOString().split('T')[0],
    // Dados do parcelamento
    valor_parcela: '',
    valor_parcela_formatado: '',
    numero_parcelas: '',
    vencimento: '',
    antecipacao_meses: ''
  });
  const [salvandoCadastroCompleto, setSalvandoCadastroCompleto] = useState(false);

  // Estado para controlar valores temporários dos selects (quando modal está aberto)
  const [statusTemporario, setStatusTemporario] = useState({});
  const { error: showErrorToast, success: showSuccessToast, info: showInfoToast } = useToast();
  const [cidadeCustomizada, setCidadeCustomizada] = useState(false);

  // Estados para modal de evidência
  const [showEvidenciaModal, setShowEvidenciaModal] = useState(false);
  const [evidenciaData, setEvidenciaData] = useState({
    pacienteId: null,
    pacienteNome: '',
    statusAnterior: '',
    statusNovo: '',
    evidenciaId: null
  });

  // Estados para modal de agendamento
  const [showAgendamentoModal, setShowAgendamentoModal] = useState(false);
  const [pacienteParaAgendar, setPacienteParaAgendar] = useState(null);
  const [clinicas, setClinicas] = useState([]);
  const [agendamentoData, setAgendamentoData] = useState({
    clinica_id: '',
    data_agendamento: '',
    horario: '',
    observacoes: '',
    consultor_interno_id: ''
  });
  const [salvandoAgendamento, setSalvandoAgendamento] = useState(false);

  // Estados para modal de atribuir consultor (para admins)
  const [showAtribuirConsultorModal, setShowAtribuirConsultorModal] = useState(false);
  const [leadParaAtribuir, setLeadParaAtribuir] = useState(null);
  const [consultorSelecionado, setConsultorSelecionado] = useState('');
  const [salvandoAtribuicao, setSalvandoAtribuicao] = useState(false);


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
    { value: 'sem_primeiro_contato', label: 'Prospecção Ativa', color: '#6b7280', description: 'Cadastrado manualmente, aguardando primeiro contato' },
    { value: 'lead', label: 'Lead', color: '#f59e0b', description: 'Lead inicial' },
    { value: 'em_conversa', label: 'Em conversa', color: '#0ea5e9', description: 'Conversando com o cliente' },
    { value: 'cpf_aprovado', label: 'CPF Aprovado', color: '#10b981', description: 'CPF foi aprovado' },
    { value: 'cpf_reprovado', label: 'CPF Reprovado', color: '#ef4444', description: 'CPF foi reprovado' },
    { value: 'nao_passou_cpf', label: 'Não forneceu CPF', color: '#6366f1', description: 'Cliente não forneceu CPF' },
    { value: 'nao_tem_outro_cpf', label: 'Não tem outro CPF', color: '#a3a3a3', description: 'Cliente não tem CPF alternativo' },
    { value: 'nao_existe', label: `${t.paciente} não existe`, color: '#17202A', description: 'Cliente não existe' },
    { value: 'nao_tem_interesse', label: `${t.paciente} não tem interesse`, color: '#17202A', description: 'Cliente não tem interesse' },
    { value: 'nao_reconhece', label: `${t.paciente} não reconhece`, color: '#17202A', description: 'Cliente não reconhece' },
    { value: 'nao_responde', label: `${t.paciente} não responde`, color: '#17202A', description: 'Cliente não responde' },
    { value: 'sem_clinica', label: 'Sem clínica', color: '#fbbf24', description: 'Sem clínica' },
    // Demais status no final
    { value: 'agendado', label: 'Agendado', color: '#3b82f6', description: 'Abre modal para criar agendamento' },
    { value: 'compareceu', label: 'Compareceu', color: '#10b981', description: 'Cliente compareceu ao agendamento' },
    { value: 'fechado', label: 'Fechado', color: '#059669', description: 'Abre modal para criar fechamento' },
    { value: 'nao_fechou', label: 'Não Fechou', color: '#dc2626', description: 'Cliente não fechou o negócio' },
    { value: 'nao_compareceu', label: 'Não Compareceu', color: '#ef4444', description: 'Cliente não compareceu' },
    { value: 'reagendado', label: 'Reagendado', color: '#8b5cf6', description: 'Agendamento foi reagendado' }
  ];

  // Status que requerem evidência obrigatória
  const STATUS_COM_EVIDENCIA_PACIENTES = [
    'cpf_reprovado',
    'nao_passou_cpf',
    'nao_tem_outro_cpf',
    'nao_existe',
    'nao_tem_interesse',
    'nao_reconhece',
    'nao_responde',
    'sem_clinica',
    'nao_fechou',
    'nao_compareceu'
  ];

  // Removido: fetchConsultorInfo - agora usando podeAlterarStatus do contexto

  useEffect(() => {
    fetchPacientes();
    fetchConsultores();
    fetchClinicas();
    fetchAgendamentos();
    fetchFechamentos();
    
    // Buscar solicitações de carteira se for admin ou clínica
    if (isAdmin || isClinica) {
      fetchSolicitacoesCarteira();
    }
    
    // Buscar novos leads apenas se pode alterar status (não freelancer) ou é consultor interno
    if (podeAlterarStatus || isConsultorInterno) {
      fetchNovosLeads();
      fetchLeadsNegativos();
    }
    
    // Aplicar filtro automático por consultor se necessário
    if (deveFiltrarPorConsultor && user?.consultor_id) {
      setFiltroConsultor(String(user.consultor_id));
    }
  }, []);


  // Carregar contratos quando modal de análise abrir
  useEffect(() => {
    if (showSolicitacaoModal && solicitacaoSelecionada) {
      fetchContratos(solicitacaoSelecionada.id);
    }
  }, [showSolicitacaoModal, solicitacaoSelecionada]);


  // Garantir que freelancers fiquem na aba "Pacientes"
  useEffect(() => {
    if (isConsultor && !podeAlterarStatus && !isConsultorInterno && activeTab === 'novos-leads') {
      setActiveTab('pacientes');
    }
  }, [podeAlterarStatus, isConsultorInterno, activeTab, isConsultor]);

  // Função de polling inteligente
  const pollingCallback = async () => {
    try {
      // Executar todas as chamadas em paralelo (mais eficiente)
      const promises = [
        fetchPacientes(),
        fetchAgendamentos(),
        fetchFechamentos()
      ];

      // Buscar novos leads apenas se pode alterar status (não freelancer) ou é consultor interno
      if (podeAlterarStatus || isConsultorInterno) {
        promises.push(fetchNovosLeads());
        promises.push(fetchLeadsNegativos());
      }

      await Promise.allSettled(promises);
    } catch (error) {
      console.warn('⚠️ Erro no polling inteligente - Pacientes:', error);
    }
  };

  // Polling inteligente (2 minutos em vez de 30 segundos)
  useSmartPolling(pollingCallback, 120000, [podeAlterarStatus, isConsultorInterno, isConsultor]);

  // Atualizar novos leads quando mudar de aba
  useEffect(() => {
    if (activeTab === 'novos-leads') {
      fetchNovosLeads(); // Atualizar quando entrar na aba
    } else if (activeTab === 'negativas') {
      fetchLeadsNegativos(); // Atualizar quando entrar na aba
    }
  }, [activeTab]);


  // Controlar scroll do body quando modal estiver aberto
  useEffect(() => {
    if (showModal || showViewModal || showObservacoesModal || showAgendamentoModal || showPermissaoModal || showAtribuirConsultorModal || showEvidenciaModal || showCadastroCompletoModal) {
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
  }, [showModal, showViewModal, showObservacoesModal, showAgendamentoModal, showFechamentoModal, showPermissaoModal, showAtribuirConsultorModal, showEvidenciaModal, showCadastroCompletoModal]);
  
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

  const fetchSolicitacoesCarteira = async () => {
    try {
      const response = await makeRequest('/solicitacoes-carteira');
      const data = await response.json();
      
      if (response.ok) {
        setSolicitacoesCarteira(data || []);
      }
    } catch (error) {
      console.error('Erro ao buscar solicitações de carteira:', error);
    }
  };

  const deletarSolicitacao = async (solicitacaoId) => {
    if (!window.confirm('Tem certeza que deseja excluir esta solicitação? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const response = await makeRequest(`/solicitacoes-carteira/${solicitacaoId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        showSuccessToast('Solicitação excluída com sucesso!');
        // Recarregar lista de solicitações
        fetchSolicitacoesCarteira();
      } else {
        // Tentar fazer parse do JSON, mas tratar erro de parsing
        let errorMessage = 'Erro desconhecido';
        try {
          const data = await response.json();
          errorMessage = data.error || errorMessage;
        } catch (parseError) {
          console.error('Erro ao fazer parse da resposta:', parseError);
          const text = await response.text();
          console.error('Resposta do servidor:', text);
          errorMessage = `Erro ${response.status}: ${response.statusText}`;
        }
        showErrorToast('Erro ao excluir solicitação: ' + errorMessage);
      }
    } catch (error) {
      console.error('Erro ao excluir solicitação:', error);
      showErrorToast('Erro ao excluir solicitação: ' + error.message);
    }
  };

  // Funções para gerenciar contratos
  const fetchContratos = async (solicitacaoId) => {
    try {
      const response = await makeRequest(`/contratos-carteira/${solicitacaoId}`);
      const data = await response.json();
      
      if (response.ok) {
        setContratos(data || []);
      }
    } catch (error) {
      console.error('Erro ao buscar contratos:', error);
    }
  };

  const handleUploadContrato = async (e, paciente) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingContrato(true);

    try {
      const formData = new FormData();
      formData.append('arquivo', file);
      formData.append('solicitacao_carteira_id', solicitacaoSelecionada.id);
      formData.append('paciente_cpf', paciente.cpf);
      formData.append('paciente_nome', paciente.nomeCompleto);

      const response = await makeRequest('/contratos-carteira/upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        showSuccessToast('Contrato enviado com sucesso!');
        await fetchContratos(solicitacaoSelecionada.id);
      } else {
        showErrorToast('Erro ao enviar contrato');
      }
    } catch (error) {
      console.error('Erro ao fazer upload de contrato:', error);
      showErrorToast('Erro ao fazer upload de contrato');
    } finally {
      setUploadingContrato(false);
      e.target.value = ''; // Limpar input
    }
  };

  const handleAprovarContrato = async (contratoId) => {
    try {
      const response = await makeRequest(`/contratos-carteira/${contratoId}/aprovar`, {
        method: 'POST'
      });

      if (response.ok) {
        showSuccessToast('Contrato aprovado!');
        await fetchContratos(solicitacaoSelecionada.id);
      } else {
        showErrorToast('Erro ao aprovar contrato');
      }
    } catch (error) {
      console.error('Erro ao aprovar contrato:', error);
      showErrorToast('Erro ao aprovar contrato');
    }
  };

  const handleReprovarContrato = async () => {
    if (!motivoReprovacao.trim()) {
      showErrorToast('Por favor, informe o motivo da reprovação');
      return;
    }

    try {
      const response = await makeRequest(`/contratos-carteira/${contratoParaReprovar.id}/reprovar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo: motivoReprovacao })
      });

      if (response.ok) {
        showSuccessToast('Contrato reprovado');
        setContratoParaReprovar(null);
        setMotivoReprovacao('');
        await fetchContratos(solicitacaoSelecionada.id);
      } else {
        showErrorToast('Erro ao reprovar contrato');
      }
    } catch (error) {
      console.error('Erro ao reprovar contrato:', error);
      showErrorToast('Erro ao reprovar contrato');
    }
  };

  const handleDeletarContrato = async (contratoId) => {
    if (!window.confirm('Tem certeza que deseja deletar este contrato?')) {
      return;
    }

    try {
      const response = await makeRequest(`/contratos-carteira/${contratoId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        showSuccessToast('Contrato deletado com sucesso!');
        await fetchContratos(solicitacaoSelecionada.id);
      } else {
        showErrorToast('Erro ao deletar contrato');
      }
    } catch (error) {
      console.error('Erro ao deletar contrato:', error);
      showErrorToast('Erro ao deletar contrato');
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
        showErrorToast(`Erro ao carregar ${empresaId === 5 ? 'clientes' : 'pacientes'}: ` + data.error);
      }
    } catch (error) {
      console.error(`Erro ao carregar ${empresaId === 5 ? 'clientes' : 'pacientes'}:`, error);
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

  const fetchAgendamentos = async () => {
    try {
      // Usar endpoint geral se for freelancer, endpoint filtrado caso contrário
      const endpoint = isFreelancer ? '/dashboard/agendamentos' : '/dashboard/gerais/agendamentos';
      const response = await makeRequest(endpoint);
      const data = await response.json();
      
      if (response.ok) {
        setAgendamentos(data);
      } else {
        console.error('Erro ao carregar agendamentos:', data.error);
      }
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error);
    }
  };

  const fetchFechamentos = async () => {
    try {
      const response = await makeRequest('/fechamentos');
      const data = await response.json();
      
      if (response.ok) {
        setFechamentos(data);
      } else {
        console.error('Erro ao carregar fechamentos:', data.error);
      }
    } catch (error) {
      console.error('Erro ao carregar fechamentos:', error);
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

  const fetchLeadsNegativos = async () => {
    try {
      const response = await makeRequest('/leads-negativos');
      const data = await response.json();
      
      if (response.ok) {
        setLeadsNegativos(data);
      } else {
        console.error('Erro ao carregar leads negativos:', data.error);
      }
    } catch (error) {
      console.error('Erro ao carregar leads negativos:', error);
    }
  };

  const aprovarLead = async (leadId) => {
    try {
      const response = await makeRequest(`/novos-leads/${leadId}/aprovar`, {
        method: 'PUT'
      });
      
      const data = await response.json();
      
      if (response.ok) {
        showSuccessToast('Lead aprovado com sucesso!');
        await fetchNovosLeads();
        await fetchPacientes();
      } else {
        showErrorToast(data.error || 'Erro ao aprovar lead');
      }
    } catch (error) {
      console.error('Erro ao aprovar lead:', error);
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
        // Atualizar ambas as listas para refletir a exclusão
        fetchNovosLeads();
        fetchLeadsNegativos();
      } else {
        showErrorToast('Erro ao excluir lead: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao excluir lead:', error);
      showErrorToast('Erro ao conectar com o servidor');
    }
  };

  const alterarStatusNovoLead = async (leadId, novoStatus) => {
    // VERIFICAR SE STATUS REQUER EVIDÊNCIA
    if (STATUS_COM_EVIDENCIA_PACIENTES.includes(novoStatus)) {
      // Procurar o lead nos arrays de novos leads e leads negativos
      const lead = novosLeads.find(l => l.id === leadId) || leadsNegativos.find(l => l.id === leadId);
      
      if (lead) {
        // Abrir modal de evidência
        setEvidenciaData({
          pacienteId: leadId,
          pacienteNome: lead.nome,
          statusAnterior: lead.status,
          statusNovo: novoStatus,
          evidenciaId: null
        });
        setShowEvidenciaModal(true);
      }
      return;
    }

    // Para outros status que não requerem evidência, atualizar diretamente
    try {
      const response = await makeRequest(`/novos-leads/${leadId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: novoStatus })
      });

      const data = await response.json();
      
      if (response.ok) {
        showSuccessToast('Status atualizado com sucesso!');
        // Atualizar ambas as listas para refletir a mudança
        fetchNovosLeads();
        fetchLeadsNegativos();
      } else {
        showErrorToast('Erro ao alterar status: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      showErrorToast('Erro ao alterar status do lead');
    }
  };

  // Função chamada quando evidência é enviada com sucesso
  const handleEvidenciaSuccess = async (evidenciaId) => {
    
    // Atualizar status agora que temos a evidência
    await updateStatus(evidenciaData.pacienteId, evidenciaData.statusNovo, evidenciaId);
    
    // Atualizar arrays de novos leads e leads negativos
    fetchNovosLeads();
    fetchLeadsNegativos();
    
    // Limpar status temporário
    setStatusTemporario(prev => {
      const newState = { ...prev };
      delete newState[evidenciaData.pacienteId];
      return newState;
    });
  };

  // Função chamada quando modal de evidência é fechado/cancelado
  const handleEvidenciaClose = () => {
    // Limpar status temporário (voltar ao status anterior)
    setStatusTemporario(prev => {
      const newState = { ...prev };
      delete newState[evidenciaData.pacienteId];
      return newState;
    });
    
    setShowEvidenciaModal(false);
    setEvidenciaData({
      pacienteId: null,
      pacienteNome: '',
      statusAnterior: '',
      statusNovo: '',
      evidenciaId: null
    });
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
        // Ao criar novo paciente, usar status "sem_primeiro_contato" para cadastros manuais
        const dataToSend = {
          ...formData,
          status: 'sem_primeiro_contato'
        };
        
        response = await makeRequest('/pacientes', {
          method: 'POST',
          body: JSON.stringify(dataToSend)
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
        showErrorToast(`Erro ao salvar ${empresaId === 5 ? 'cliente' : 'paciente'}: ` + data.error);
      }
    } catch (error) {
      console.error(`Erro ao salvar ${empresaId === 5 ? 'cliente' : 'paciente'}:`, error);
      showErrorToast(`Erro ao salvar ${empresaId === 5 ? 'cliente' : 'paciente'}`);
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

  const handleView = async (paciente, initialTab = 'informacoes') => {
    setViewPaciente(paciente);
    setActiveViewTab(initialTab);
    
    // Buscar evidências do paciente
    if (paciente && paciente.id) {
      try {
        const response = await makeRequest(`/evidencias/paciente/${paciente.id}`);
        if (response.ok) {
          const data = await response.json();
          setEvidenciasPaciente(Array.isArray(data) ? data : []);
        } else {
          setEvidenciasPaciente([]);
        }
      } catch (error) {
        console.error('Erro ao buscar evidências:', error);
        setEvidenciasPaciente([]);
      }
    }
    
    setShowViewModal(true);
  };

  const handleTabChange = (tab) => {
    setActiveViewTab(tab);
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    setViewPaciente(null);
    setActiveViewTab('informacoes');
  };

  // Funções para Carteira Existente
  const adicionarPacienteCarteira = () => {
    const {
      cpf,
      nomeCompleto,
      valorParcela,
      numeroParcelasAberto,
      primeiraVencimento,
      numeroParcelasAntecipar
    } = carteiraFormData;

    if (!cpf || !nomeCompleto || !valorParcela || !numeroParcelasAberto || !primeiraVencimento || !numeroParcelasAntecipar) {
      showErrorToast('Preencha todos os campos obrigatórios');
      return;
    }

    const novoPaciente = {
      id: Date.now(), // ID temporário
      cpf,
      nomeCompleto,
      valorParcela: parseFloat(valorParcela.replace(/[^\d,]/g, '').replace(',', '.')),
      numeroParcelasAberto: parseInt(numeroParcelasAberto),
      primeiraVencimento,
      numeroParcelasAntecipar: parseInt(numeroParcelasAntecipar)
    };

    setPacientesCarteira(prev => [...prev, novoPaciente]);
    
    // Limpar formulário
    setCarteiraFormData({
      cpf: '',
      nomeCompleto: '',
      valorParcela: '',
      numeroParcelasAberto: '',
      primeiraVencimento: '',
      numeroParcelasAntecipar: ''
    });

    showSuccessToast('Paciente adicionado à carteira!');
  };

  const removerPacienteCarteira = (id) => {
    setPacientesCarteira(prev => prev.filter(p => p.id !== id));
    setCarteiraCalculos(null); // Limpar cálculos quando remover paciente
  };

  const exportarCarteiraSolicitacaoExcel = (solicitacao) => {
    if (!solicitacao || !solicitacao.calculos) {
      showErrorToast('Dados insuficientes para exportar');
      return;
    }

    try {
      // Preparar dados para exportação
      const dadosExportacao = solicitacao.calculos.parcelasDetalhadas.map(parcela => {
        // Verificar tanto 'categoria' quanto 'tipo' para compatibilidade
        const tipoParcela = parcela.categoria || parcela.tipo;
        const tipoFinal = tipoParcela === 'COL' || tipoParcela === 'colateral' ? 'COLATERAL' : 'OPERAÇÃO';
        const isColateral = tipoParcela === 'COL' || tipoParcela === 'colateral';
        
        return {
          'Paciente': parcela.paciente,
          'Tipo': tipoFinal,
          'Parcela': parcela.parcela,
          'Valor Face': parcela.valorFace || parcela.valor,
          'Deságio': isColateral ? 0 : (parcela.desagio || 0), // Colateral não tem deságio
          'Liquidez': parcela.valorEntregue || parcela.liquidez,
          'Vencimento': new Date(parcela.vencimento).toLocaleDateString('pt-BR')
        };
      });

      // Adicionar linha de resumo
      const resumo = [
        {}, // Linha vazia
        {
          'Paciente': 'RESUMO GERAL',
          'Tipo': '',
          'Parcela': '',
          'Valor Face': '',
          'Deságio': '',
          'Liquidez': '',
          'Vencimento': ''
        },
        {
          'Paciente': 'Total Face',
          'Tipo': '',
          'Parcela': '',
          'Valor Face': solicitacao.calculos.valorFaceTotal,
          'Deságio': '',
          'Liquidez': '',
          'Vencimento': ''
        },
        {
          'Paciente': 'Total Entregue',
          'Tipo': '',
          'Parcela': '',
          'Valor Face': '',
          'Deságio': '',
          'Liquidez': solicitacao.calculos.valorEntregueTotal,
          'Vencimento': ''
        },
        {
          'Paciente': 'Deságio Total',
          'Tipo': '',
          'Parcela': '',
          'Valor Face': '',
          'Deságio': solicitacao.calculos.desagioTotal,
          'Liquidez': '',
          'Vencimento': ''
        },
        {
          'Paciente': 'Operação (Face)',
          'Tipo': '',
          'Parcela': '',
          'Valor Face': solicitacao.calculos.valorTotalOperacao,
          'Deságio': '',
          'Liquidez': '',
          'Vencimento': ''
        },
        {
          'Paciente': 'Colateral (Face)',
          'Tipo': '',
          'Parcela': '',
          'Valor Face': solicitacao.calculos.valorColateral,
          'Deságio': '',
          'Liquidez': '',
          'Vencimento': ''
        },
        {
          'Paciente': 'Percentual C/O',
          'Tipo': '',
          'Parcela': `${solicitacao.calculos.percentualFinal?.toFixed(2) || 0}%`,
          'Valor Face': '',
          'Deságio': '',
          'Liquidez': '',
          'Vencimento': ''
        }
      ];

      // Combinar dados com resumo
      const dadosCompletos = [...dadosExportacao, ...resumo];

      // Criar planilha
      const ws = XLSX.utils.json_to_sheet(dadosCompletos);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Carteira Detalhada');

      // Definir larguras das colunas
      ws['!cols'] = [
        { wch: 30 }, // Paciente
        { wch: 15 }, // Tipo
        { wch: 10 }, // Parcela
        { wch: 15 }, // Valor Face
        { wch: 15 }, // Deságio
        { wch: 15 }, // Liquidez
        { wch: 15 }  // Vencimento
      ];

      // Gerar nome do arquivo
      const nomeClinica = solicitacao.clinica_nome || 'Clinica';
      const data = new Date().toISOString().split('T')[0];
      const nomeArquivo = `Carteira_${nomeClinica}_${data}.xlsx`;

      // Salvar arquivo
      XLSX.writeFile(wb, nomeArquivo);
      showSuccessToast('Planilha exportada com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar planilha:', error);
      showErrorToast('Erro ao exportar planilha');
    }
  };

  const exportarCarteiraExcel = () => {
    if (!carteiraCalculos || !carteiraCalculos.parcelasDetalhadas) {
      showErrorToast('Calcule a carteira antes de exportar');
      return;
    }

    try {
      // Preparar dados para exportação
      const dadosExportacao = carteiraCalculos.parcelasDetalhadas.map(parcela => ({
        'Paciente': parcela.paciente,
        'Tipo': parcela.tipo === 'colateral' ? 'COLATERAL' : 'OPERAÇÃO',
        'Detalhe': `Parcela ${parcela.parcela} (${parcela.tipo === 'colateral' ? 'Colateral' : 'Operação'})`,
        'Valor': parcela.valor,
        'Vencimento': new Date(parcela.vencimento).toLocaleDateString('pt-BR'),
        'Dias': parcela.dias,
        'Deságio': parcela.desagio,
        'Liquidez': parcela.liquidez
      }));

      // Adicionar linha de resumo
      const resumo = [
        {}, // Linha vazia
        {
          'Paciente': 'RESUMO GERAL',
          'Tipo': '',
          'Detalhe': '',
          'Valor': '',
          'Vencimento': '',
          'Dias': '',
          'Deságio': '',
          'Liquidez': ''
        },
        {
          'Paciente': 'Total Face',
          'Tipo': '',
          'Detalhe': '',
          'Valor': carteiraCalculos.valorFaceTotal,
          'Vencimento': '',
          'Dias': '',
          'Deságio': '',
          'Liquidez': ''
        },
        {
          'Paciente': 'Total Entregue',
          'Tipo': '',
          'Detalhe': '',
          'Valor': carteiraCalculos.valorEntregueTotal,
          'Vencimento': '',
          'Dias': '',
          'Deságio': '',
          'Liquidez': ''
        },
        {
          'Paciente': 'Deságio Total',
          'Tipo': '',
          'Detalhe': '',
          'Valor': carteiraCalculos.desagioTotal,
          'Vencimento': '',
          'Dias': '',
          'Deságio': '',
          'Liquidez': ''
        },
        {
          'Paciente': 'Operação Face',
          'Tipo': '',
          'Detalhe': '',
          'Valor': carteiraCalculos.valorTotalOperacao,
          'Vencimento': '',
          'Dias': '',
          'Deságio': '',
          'Liquidez': ''
        },
        {
          'Paciente': 'Colateral Face',
          'Tipo': '',
          'Detalhe': '',
          'Valor': carteiraCalculos.valorColateral,
          'Vencimento': '',
          'Dias': '',
          'Deságio': '',
          'Liquidez': ''
        },
        {
          'Paciente': 'Percentual Final',
          'Tipo': '',
          'Detalhe': '',
          'Valor': `${carteiraCalculos.percentualFinal.toFixed(2)}%`,
          'Vencimento': '',
          'Dias': '',
          'Deságio': '',
          'Liquidez': ''
        },
        {
          'Paciente': 'Percentual Alvo',
          'Tipo': '',
          'Detalhe': '',
          'Valor': `${carteiraCalculos.percentualAlvo}%`,
          'Vencimento': '',
          'Dias': '',
          'Deságio': '',
          'Liquidez': ''
        },
        {
          'Paciente': 'Slack',
          'Tipo': '',
          'Detalhe': '',
          'Valor': `${carteiraCalculos.slack.toFixed(2)}%`,
          'Vencimento': '',
          'Dias': '',
          'Deságio': '',
          'Liquidez': ''
        }
      ];

      const dadosCompletos = [...dadosExportacao, ...resumo];

      // Criar workbook e worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(dadosCompletos);

      // Definir larguras das colunas
      ws['!cols'] = [
        { width: 20 }, // Paciente
        { width: 12 }, // Tipo
        { width: 25 }, // Detalhe
        { width: 15 }, // Valor
        { width: 12 }, // Vencimento
        { width: 8 },  // Dias
        { width: 15 }, // Deságio
        { width: 15 }  // Liquidez
      ];

      // Adicionar worksheet ao workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Carteira Existente');

      // Gerar nome do arquivo com data e hora
      const agora = new Date();
      const dataFormatada = agora.toISOString().slice(0, 19).replace(/:/g, '-');
      const nomeArquivo = `Carteira_Existente_${dataFormatada}.xlsx`;

      // Salvar arquivo
      XLSX.writeFile(wb, nomeArquivo);

      showSuccessToast('Planilha exportada com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar planilha:', error);
      showErrorToast('Erro ao exportar planilha');
    }
  };

  const calcularCarteiraExistente = (percentualAlvo = 130) => {
    if (pacientesCarteira.length === 0) {
      showErrorToast(`Adicione pelo menos um ${empresaId === 5 ? 'cliente' : 'paciente'} antes de calcular`);
      return;
    }

    // Valores fixos conforme especificação
    const fatorAMNum = 0.33; // Fator fixo de 0.33%
    const dataAceiteHoje = new Date(); // Data atual (hoje)
    dataAceiteHoje.setHours(0, 0, 0, 0); // Zerar hora para calcular dias completos

    // Primeiro, calcular todas as parcelas
    const todasParcelas = [];
    (pacientesCarteira || []).forEach(paciente => {
      const valorParcelaNum = paciente.valorParcela;
      const numeroParcelasAnteciparNum = paciente.numeroParcelasAntecipar;

      for (let i = 0; i < numeroParcelasAnteciparNum; i++) {
        const dataPrimeira = new Date(paciente.primeiraVencimento);
        const dataVencimento = new Date(dataPrimeira);
        dataVencimento.setMonth(dataVencimento.getMonth() + i);
        dataVencimento.setHours(0, 0, 0, 0); // Zerar hora para calcular dias completos

        // Calcular dias entre hoje e o vencimento
        const diferencaMs = dataVencimento - dataAceiteHoje;
        const dias = Math.ceil(diferencaMs / (1000 * 60 * 60 * 24));

        // Deságio calculado conforme testecarteira
        const desagio = valorParcelaNum * (fatorAMNum / 100) * dias;
        const liquidez = valorParcelaNum - desagio;

        todasParcelas.push({
          paciente: paciente.nomeCompleto,
          parcela: i + 1,
          valor: valorParcelaNum,
          vencimento: dataVencimento.toISOString().split('T')[0],
          dias: dias,
          desagio: desagio,
          liquidez: liquidez,
          pacienteId: paciente.id,
          score: desagio / valorParcelaNum // Perda relativa para heurística
        });
      }
    });

    // AGRUPAR PARCELAS POR PACIENTE (um paciente não pode ser dividido)
    const pacientesAgrupados = {};
    todasParcelas.forEach(parcela => {
      if (!pacientesAgrupados[parcela.pacienteId]) {
        pacientesAgrupados[parcela.pacienteId] = {
          pacienteId: parcela.pacienteId,
          nome: parcela.paciente,
          parcelas: [],
          valorFaceTotal: 0,
          desagioTotal: 0,
          liquidezTotal: 0
        };
      }
      
      pacientesAgrupados[parcela.pacienteId].parcelas.push(parcela);
      pacientesAgrupados[parcela.pacienteId].valorFaceTotal += parcela.valor;
      pacientesAgrupados[parcela.pacienteId].desagioTotal += parcela.desagio;
      pacientesAgrupados[parcela.pacienteId].liquidezTotal += parcela.liquidez;
    });

    // Converter para array e calcular score por paciente
    const pacientesArray = Object.values(pacientesAgrupados).map(paciente => ({
      ...paciente,
      score: paciente.desagioTotal / paciente.valorFaceTotal // Perda relativa do paciente
    }));

    // HEURÍSTICA GULOSA para atingir o percentual alvo
    // 1. Inicializar todos os PACIENTES como OP
    pacientesArray.forEach(p => p.aloc = 'OP');
    
    // 2. Ordenar PACIENTES por score (perda relativa) decrescente
    const pacientesOrdenados = [...pacientesArray].sort((a, b) => b.score - a.score);
    
    // 3. Mover PACIENTES de OP → COL até atingir o percentual alvo
    const percentualAlvoDecimal = percentualAlvo / 100; // Ex: 130% = 1.30
    
    let oFace = pacientesArray.reduce((sum, p) => sum + p.valorFaceTotal, 0);
    let cFace = 0;
    
    for (const paciente of pacientesOrdenados) {
      if (oFace === 0 || cFace / oFace >= percentualAlvoDecimal) {
        break; // Já atingimos o percentual alvo
      }
      
      // Mover PACIENTE de OP para COL
      paciente.aloc = 'COL';
      oFace -= paciente.valorFaceTotal;
      cFace += paciente.valorFaceTotal;
    }
    
    // 4. AJUSTE FINO: tentar reduzir o slack sem ficar abaixo do alvo
    let melhorSlack = oFace > 0 ? (cFace / oFace - percentualAlvoDecimal) : 999;
    let houveMelhoria = true;
    
    while (houveMelhoria) {
      houveMelhoria = false;
      
      // Tentar trocar um PACIENTE de COL por um de OP
      const pacientesCOL = pacientesArray.filter(p => p.aloc === 'COL');
      const pacientesOP = pacientesArray.filter(p => p.aloc === 'OP');
      
      for (const pCol of pacientesCOL) {
        for (const pOp of pacientesOP) {
          // Simular a troca
          const novoOFace = oFace + pCol.valorFaceTotal - pOp.valorFaceTotal;
          const novoCFace = cFace - pCol.valorFaceTotal + pOp.valorFaceTotal;
          
          if (novoOFace > 0) {
            const novoRatio = novoCFace / novoOFace;
            const novoSlack = novoRatio - percentualAlvoDecimal;
            
            // Se melhorou o slack e ainda está acima do alvo
            if (novoSlack >= 0 && novoSlack < melhorSlack) {
              // Fazer a troca
              pCol.aloc = 'OP';
              pOp.aloc = 'COL';
              oFace = novoOFace;
              cFace = novoCFace;
              melhorSlack = novoSlack;
              houveMelhoria = true;
              break;
            }
          }
        }
        if (houveMelhoria) break;
      }
    }

    // Aplicar alocação do PACIENTE para todas as suas PARCELAS
    todasParcelas.forEach(parcela => {
      const paciente = pacientesArray.find(p => p.pacienteId === parcela.pacienteId);
      parcela.aloc = paciente.aloc;
    });
    
    // Calcular valores finais usando a alocação da heurística
    const parcelasDetalhadas = todasParcelas.map(p => {
      const isColateral = p.aloc === 'COL';
      return {
        ...p,
        tipo: isColateral ? 'colateral' : 'operacao',
        categoria: isColateral ? 'COL' : 'OP',
        desagio: isColateral ? 0 : p.desagio, // Colateral não tem deságio
        liquidez: isColateral ? p.valor : p.liquidez, // Colateral recebe valor face completo
        valorEntregue: isColateral ? p.valor : p.liquidez // Colateral = valor face, Operação = com deságio
      };
    });

    // Calcular valores separados por tipo na base de FACE
    const valorColateralFaceCalculado = todasParcelas
      .filter(p => p.aloc === 'COL')
      .reduce((sum, p) => sum + p.valor, 0);

    const valorOperacaoFaceCalculado = todasParcelas
      .filter(p => p.aloc === 'OP')
      .reduce((sum, p) => sum + p.valor, 0);

    // Calcular valores ENTREGUES
    // IMPORTANTE: Deságio aplicado APENAS na operação, colateral não tem deságio
    const valorColateralEntregue = valorColateralFaceCalculado; // Colateral = sem deságio

    const valorOperacaoEntregue = todasParcelas
      .filter(p => p.aloc === 'OP')
      .reduce((sum, p) => sum + p.liquidez, 0); // Com deságio

    // Deságio total = apenas da operação
    const desagioColateral = 0; // Colateral não tem deságio
    const desagioOperacao = todasParcelas
      .filter(p => p.aloc === 'OP')
      .reduce((sum, p) => sum + p.desagio, 0);

    const desagioTotal = desagioOperacao;
    const valorEntregueTotal = valorColateralEntregue + valorOperacaoEntregue;
    const valorFaceTotal = valorColateralFaceCalculado + valorOperacaoFaceCalculado;

    // Calcular percentual final e slack
    const percentualFinalCalculado = valorOperacaoFaceCalculado > 0 ? 
      (valorColateralFaceCalculado / valorOperacaoFaceCalculado) * 100 : 0;
    
    const slack = (valorColateralFaceCalculado / valorOperacaoFaceCalculado) - percentualAlvoDecimal;

    setCarteiraCalculos({
      parcelasDetalhadas,
      valorEntregueTotal,
      desagioTotal,
      valorFaceTotal,
      valorTotalOperacao: valorOperacaoFaceCalculado,
      valorColateral: valorColateralFaceCalculado,
      valorColateralEntregue,
      valorOperacaoEntregue,
      desagioColateral,
      desagioOperacao,
      percentualFinal: percentualFinalCalculado,
      percentualAlvo: percentualAlvo,
      slack: slack * 100, // Convertendo para porcentagem
      pacientesCarteira
    });
  };

  // Função auxiliar para gerar combinações de pacientes
  const gerarCombinacoes = (pacientes, tamanho) => {
    if (tamanho === 0) return [[]];
    if (tamanho > pacientes.length) return [];
    if (tamanho === pacientes.length) return [pacientes];
    
    const combinacoes = [];
    
    // Para evitar explosão combinatória, limitar a 10 pacientes máximo
    if (pacientes.length > 10) {
      // Usar heurística: pegar os primeiros pacientes ordenados por score
      const pacientesLimitados = pacientes.slice(0, Math.min(10, pacientes.length));
      return gerarCombinacoesRecursivo(pacientesLimitados, tamanho);
    }
    
    return gerarCombinacoesRecursivo(pacientes, tamanho);
  };
  
  const gerarCombinacoesRecursivo = (pacientes, tamanho, inicio = 0, combinacaoAtual = []) => {
    if (combinacaoAtual.length === tamanho) {
      return [combinacaoAtual.slice()];
    }
    
    const combinacoes = [];
    for (let i = inicio; i < pacientes.length; i++) {
      combinacaoAtual.push(pacientes[i]);
      combinacoes.push(...gerarCombinacoesRecursivo(pacientes, tamanho, i + 1, combinacaoAtual));
      combinacaoAtual.pop();
    }
    
    return combinacoes;
  };

  // Função para recalcular carteira com percentual específico (usado pelo admin)
  const calcularCarteiraComPercentual = (pacientes, percentualAlvo = 130) => {
    // Valores fixos conforme especificação
    const fatorAMNum = 0.33; // Fator fixo de 0.33%
    const dataAceiteHoje = new Date(); // Data atual (hoje)
    dataAceiteHoje.setHours(0, 0, 0, 0); // Zerar hora para calcular dias completos

    // Primeiro, calcular todas as parcelas
    const todasParcelas = [];
    (pacientes || []).forEach(paciente => {
      const valorParcelaNum = paciente.valorParcela;
      const numeroParcelasAnteciparNum = paciente.numeroParcelasAntecipar;

      for (let i = 0; i < numeroParcelasAnteciparNum; i++) {
        const dataPrimeira = new Date(paciente.primeiraVencimento);
        const dataVencimento = new Date(dataPrimeira);
        dataVencimento.setMonth(dataVencimento.getMonth() + i);
        dataVencimento.setHours(0, 0, 0, 0); // Zerar hora para calcular dias completos

        // Calcular dias entre hoje e o vencimento
        const diferencaMs = dataVencimento - dataAceiteHoje;
        const dias = Math.ceil(diferencaMs / (1000 * 60 * 60 * 24));

        // Deságio calculado conforme testecarteira
        const desagio = valorParcelaNum * (fatorAMNum / 100) * dias;
        const liquidez = valorParcelaNum - desagio;

        todasParcelas.push({
          paciente: paciente.nomeCompleto,
          parcela: i + 1,
          valor: valorParcelaNum,
          vencimento: dataVencimento.toISOString().split('T')[0],
          dias: dias,
          desagio: desagio,
          liquidez: liquidez,
          pacienteId: paciente.id,
          score: desagio / valorParcelaNum // Perda relativa para heurística
        });
      }
    });

    // AGRUPAR PARCELAS POR PACIENTE (um paciente não pode ser dividido)
    const pacientesAgrupados = {};
    todasParcelas.forEach(parcela => {
      if (!pacientesAgrupados[parcela.pacienteId]) {
        pacientesAgrupados[parcela.pacienteId] = {
          pacienteId: parcela.pacienteId,
          nome: parcela.paciente,
          parcelas: [],
          valorFaceTotal: 0,
          valorEntregueTotal: 0,
          score: 0
        };
      }
      pacientesAgrupados[parcela.pacienteId].parcelas.push(parcela);
      pacientesAgrupados[parcela.pacienteId].valorFaceTotal += parcela.valor;
      pacientesAgrupados[parcela.pacienteId].valorEntregueTotal += parcela.liquidez;
      pacientesAgrupados[parcela.pacienteId].score += parcela.score;
    });

    // Converter para array e calcular score médio
    const pacientesArray = Object.values(pacientesAgrupados).map(p => ({
      ...p,
      score: p.score / p.parcelas.length // Score médio das parcelas
    }));

    // Calcular valores totais
    const valorFaceTotal = pacientesArray.reduce((sum, p) => sum + p.valorFaceTotal, 0);
    const valorEntregueTotal = pacientesArray.reduce((sum, p) => sum + p.valorEntregueTotal, 0);
    const desagioTotal = valorFaceTotal - valorEntregueTotal;

    // Calcular valores ideais baseados no percentual alvo
    // Se Colateral = X% da Operação, então: Colateral + Operação = Total
    // X% * Operação + Operação = Total
    // Operação * (1 + X/100) = Total
    // Operação = Total / (1 + X/100)
    const valorOperacaoFaceIdeal = valorFaceTotal / (1 + percentualAlvo / 100);
    const valorColateralFaceIdeal = valorFaceTotal - valorOperacaoFaceIdeal;

    // ALGORITMO OTIMIZADO: Tentar múltiplas combinações para atingir o percentual alvo
    const pacientesOrdenados = [...pacientesArray].sort((a, b) => a.score - b.score);
    
    let melhorDistribuicao = null;
    let menorDiferenca = Infinity;
    
    // Tentar diferentes números de pacientes para colateral
    const totalPacientes = pacientesArray.length;
    const percentualAlvoDecimal = percentualAlvo / 100;
    
    // ALGORITMO HÍBRIDO: Combinar busca exaustiva com heurística inteligente
    if (totalPacientes <= 8) {
      // Para poucos pacientes: busca exaustiva
      for (let numColateral = 1; numColateral < totalPacientes; numColateral++) {
        const combinacoes = gerarCombinacoes(pacientesOrdenados, numColateral);
        
        for (const combinacao of combinacoes) {
          const pacientesColateral = combinacao;
          const pacientesOperacao = pacientesOrdenados.filter(p => !combinacao.includes(p));
          
          const valorColateralAtual = pacientesColateral.reduce((sum, p) => sum + p.valorFaceTotal, 0);
          const valorOperacaoAtual = pacientesOperacao.reduce((sum, p) => sum + p.valorFaceTotal, 0);
          
          if (valorOperacaoAtual > 0) {
            const percentualAtual = (valorColateralAtual / valorOperacaoAtual) * 100;
            const diferenca = Math.abs(percentualAtual - percentualAlvo);
            
            if (diferenca < menorDiferenca) {
              menorDiferenca = diferenca;
              melhorDistribuicao = {
                pacientesColateral,
                pacientesOperacao,
                valorColateralAtual,
                valorOperacaoAtual,
                percentualAtual
              };
            }
          }
        }
      }
    } else {
      // Para muitos pacientes: heurística inteligente com múltiplas tentativas
      const tentativas = [
        // Tentativa 1: Distribuição proporcional baseada no percentual alvo
        () => {
          const pacientesColateral = [];
          const pacientesOperacao = [];
          let valorColateralAtual = 0;
          let valorOperacaoAtual = 0;
          
          // Ordenar por valor face (maiores primeiro para colateral)
          const pacientesPorValor = [...pacientesOrdenados].sort((a, b) => b.valorFaceTotal - a.valorFaceTotal);
          
          for (const paciente of pacientesPorValor) {
            const novoColateral = valorColateralAtual + paciente.valorFaceTotal;
            const novoOperacao = valorOperacaoAtual + paciente.valorFaceTotal;
            
            const percentualComColateral = novoOperacao > 0 ? (novoColateral / valorOperacaoAtual) * 100 : 0;
            const percentualComOperacao = novoOperacao > 0 ? (valorColateralAtual / novoOperacao) * 100 : 0;
            
            const diferencaColateral = Math.abs(percentualComColateral - percentualAlvo);
            const diferencaOperacao = Math.abs(percentualComOperacao - percentualAlvo);
            
            if (diferencaColateral < diferencaOperacao) {
              pacientesColateral.push(paciente);
              valorColateralAtual = novoColateral;
            } else {
              pacientesOperacao.push(paciente);
              valorOperacaoAtual = novoOperacao;
            }
          }
          
          return {
            pacientesColateral,
            pacientesOperacao,
            valorColateralAtual,
            valorOperacaoAtual,
            percentualAtual: valorOperacaoAtual > 0 ? (valorColateralAtual / valorOperacaoAtual) * 100 : 0
          };
        },
        
        // Tentativa 2: Distribuição baseada em score (menor score = colateral)
        () => {
          const pacientesColateral = [];
          const pacientesOperacao = [];
          let valorColateralAtual = 0;
          let valorOperacaoAtual = 0;
          
          for (const paciente of pacientesOrdenados) {
            const novoColateral = valorColateralAtual + paciente.valorFaceTotal;
            const novoOperacao = valorOperacaoAtual + paciente.valorFaceTotal;
            
            const percentualComColateral = novoOperacao > 0 ? (novoColateral / valorOperacaoAtual) * 100 : 0;
            const percentualComOperacao = novoOperacao > 0 ? (valorColateralAtual / novoOperacao) * 100 : 0;
            
            const diferencaColateral = Math.abs(percentualComColateral - percentualAlvo);
            const diferencaOperacao = Math.abs(percentualComOperacao - percentualAlvo);
            
            if (diferencaColateral < diferencaOperacao) {
              pacientesColateral.push(paciente);
              valorColateralAtual = novoColateral;
            } else {
              pacientesOperacao.push(paciente);
              valorOperacaoAtual = novoOperacao;
            }
          }
          
          return {
            pacientesColateral,
            pacientesOperacao,
            valorColateralAtual,
            valorOperacaoAtual,
            percentualAtual: valorOperacaoAtual > 0 ? (valorColateralAtual / valorOperacaoAtual) * 100 : 0
          };
        }
      ];
      
      // Executar todas as tentativas e escolher a melhor
      for (const tentativa of tentativas) {
        const resultado = tentativa();
        const diferenca = Math.abs(resultado.percentualAtual - percentualAlvo);
        
        if (diferenca < menorDiferenca) {
          menorDiferenca = diferenca;
          melhorDistribuicao = resultado;
        }
      }
    }
    
    // Se não encontrou uma boa distribuição, usar heurística gulosa como fallback
    if (!melhorDistribuicao) {
      let valorColateralAtual = 0;
      let valorOperacaoAtual = 0;
      const pacientesColateral = [];
      const pacientesOperacao = [];

      // Atribuir pacientes para aproximar dos valores ideais
      pacientesOrdenados.forEach(paciente => {
        const diferencaColateral = Math.abs((valorColateralAtual + paciente.valorFaceTotal) - valorColateralFaceIdeal);
        const diferencaOperacao = Math.abs((valorOperacaoAtual + paciente.valorFaceTotal) - valorOperacaoFaceIdeal);

        if (diferencaColateral < diferencaOperacao) {
          pacientesColateral.push(paciente);
          valorColateralAtual += paciente.valorFaceTotal;
        } else {
          pacientesOperacao.push(paciente);
          valorOperacaoAtual += paciente.valorFaceTotal;
        }
      });
      
      melhorDistribuicao = {
        pacientesColateral,
        pacientesOperacao,
        valorColateralAtual,
        valorOperacaoAtual,
        percentualAtual: valorOperacaoAtual > 0 ? (valorColateralAtual / valorOperacaoAtual) * 100 : 0
      };
    }
    
    const { pacientesColateral, pacientesOperacao, valorColateralAtual, valorOperacaoAtual } = melhorDistribuicao;

    // Calcular valores entregues
    const valorColateralEntregue = pacientesColateral.reduce((sum, p) => sum + p.valorEntregueTotal, 0);
    const valorOperacaoEntregue = pacientesOperacao.reduce((sum, p) => sum + p.valorEntregueTotal, 0);

    // Calcular percentual final
    const percentualFinal = (valorColateralAtual / valorOperacaoAtual) * 100;
    const slack = percentualFinal - percentualAlvo;

    // Preparar parcelas detalhadas
    const parcelasDetalhadas = [];
    
    // Adicionar parcelas de colateral
    pacientesColateral.forEach(paciente => {
      paciente.parcelas.forEach(parcela => {
        parcelasDetalhadas.push({
          ...parcela,
          categoria: 'COL',
          valorFace: parcela.valor,
          desagio: 0, // Colateral não tem deságio
          valorEntregue: parcela.valor, // Colateral recebe valor face completo
          liquidez: parcela.valor // Liquidez = valor face para colateral
        });
      });
    });

    // Adicionar parcelas de operação
    pacientesOperacao.forEach(paciente => {
      paciente.parcelas.forEach(parcela => {
        parcelasDetalhadas.push({
          ...parcela,
          categoria: 'OP',
          valorFace: parcela.valor,
          valorEntregue: parcela.liquidez // Operação tem deságio aplicado
        });
      });
    });

    return {
      parcelasDetalhadas,
      valorEntregueTotal,
      desagioTotal,
      valorFaceTotal,
      valorTotalOperacao: valorOperacaoAtual,
      valorColateral: valorColateralAtual,
      valorColateralEntregue,
      valorOperacaoEntregue,
      percentualFinal,
      percentualAlvo,
      slack: slack * 100, // Convertendo para porcentagem
      pacientesCarteira: pacientes
    };
  };

  const salvarCarteiraExistente = async () => {
    if (!carteiraCalculos || pacientesCarteira.length === 0) {
      showErrorToast('Calcule os valores antes de salvar');
      return;
    }

    try {
      // Se for clínica, criar solicitação de aprovação
      if (isClinica) {
        const solicitacaoData = {
          clinica_id: user.id,
          pacientes_carteira: pacientesCarteira.map(p => ({
            id: p.id,
            cpf: p.cpf,
            nomeCompleto: p.nomeCompleto,
            valorParcela: p.valorParcela,
            numeroParcelasAberto: p.numeroParcelasAberto,
            primeiraVencimento: p.primeiraVencimento,
            numeroParcelasAntecipar: p.numeroParcelasAntecipar
          })),
          calculos: {
            parcelasDetalhadas: carteiraCalculos.parcelasDetalhadas,
            valorEntregueTotal: carteiraCalculos.valorEntregueTotal,
            desagioTotal: carteiraCalculos.desagioTotal,
            valorFaceTotal: carteiraCalculos.valorFaceTotal,
            valorTotalOperacao: carteiraCalculos.valorTotalOperacao,
            valorColateral: carteiraCalculos.valorColateral,
            valorColateralEntregue: carteiraCalculos.valorColateralEntregue,
            valorOperacaoEntregue: carteiraCalculos.valorOperacaoEntregue,
            percentualFinal: carteiraCalculos.percentualFinal,
            percentualAlvo: carteiraCalculos.percentualAlvo,
            slack: carteiraCalculos.slack
          },
          percentual_alvo: carteiraCalculos.percentualAlvo,
          observacoes_clinica: ''
        };

        const response = await makeRequest('/solicitacoes-carteira', {
          method: 'POST',
          body: JSON.stringify(solicitacaoData)
        });

        if (response.ok) {
          showSuccessToast('Solicitação enviada para aprovação!');
          showInfoToast('Aguarde a aprovação do administrador');
          setShowCarteiraModal(false);
          setCarteiraFormData({
            cpf: '',
            nomeCompleto: '',
            valorParcela: '',
            numeroParcelasAberto: '',
            primeiraVencimento: '',
            numeroParcelasAntecipar: ''
          });
          setPacientesCarteira([]);
          setCarteiraCalculos(null);
          
          // Recarregar solicitações se houver
          if (typeof fetchSolicitacoesCarteira === 'function') {
            fetchSolicitacoesCarteira();
          }
        } else {
          showErrorToast('Erro ao enviar solicitação');
        }
      } else {
        // Admin pode salvar diretamente (lógica antiga)
        const promises = (pacientesCarteira || []).map(paciente => {
          const pacienteData = {
            nome: paciente.nomeCompleto,
            cpf: paciente.cpf,
            telefone: '', // Será preenchido depois
            cidade: '',
            estado: '',
            tipo_tratamento: 'Carteira Existente',
            status: 'fechado',
            observacoes: 'Paciente da carteira existente',
            carteira_existente: true,
            clinica_id: user.id,
            cadastrado_por_clinica: true,
            // Dados específicos da carteira
            valor_parcela: parseFloat(paciente.valorParcela.toString().replace(/[^\d,]/g, '').replace(',', '.')),
            numero_parcelas_aberto: paciente.numeroParcelasAberto,
            primeira_vencimento: paciente.primeiraVencimento,
            numero_parcelas_antecipar: paciente.numeroParcelasAntecipar,
            fator_am: 0.33, // Valor fixo
            data_aceite: new Date().toISOString().split('T')[0], // Data atual
            // Resultados do cálculo global
            valor_entregue_total: carteiraCalculos?.valorEntregueTotal || 0,
            desagio_total: carteiraCalculos?.desagioTotal || 0,
            valor_face_total: carteiraCalculos?.valorFaceTotal || 0,
            valor_total_operacao: carteiraCalculos?.valorTotalOperacao || 0,
            valor_colateral: carteiraCalculos?.valorColateral || 0,
            percentual_final: carteiraCalculos?.percentualFinal || 0
          };

          return makeRequest('/pacientes', {
            method: 'POST',
            body: JSON.stringify(pacienteData)
          });
        });

        const responses = await Promise.all(promises);
        const errors = responses.filter(response => !response.ok);

        if (errors.length === 0) {
          showSuccessToast(`${pacientesCarteira.length} pacientes da carteira existente cadastrados com sucesso!`);
          setShowCarteiraModal(false);
          setCarteiraFormData({
            cpf: '',
            nomeCompleto: '',
            valorParcela: '',
            numeroParcelasAberto: '',
            primeiraVencimento: '',
            numeroParcelasAntecipar: ''
          });
          setPacientesCarteira([]);
          setCarteiraCalculos(null);
          await fetchPacientes();
        } else {
          showErrorToast(`Erro ao cadastrar ${errors.length} pacientes`);
        }
      }
    } catch (error) {
      console.error('Erro ao salvar carteira existente:', error);
      showErrorToast('Erro de conexão: ' + error.message);
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
        
        // Buscar dados atualizados
        const pacientesRes = await makeRequest('/pacientes');
        const pacientesData = await pacientesRes.json();
        setPacientes(Array.isArray(pacientesData) ? pacientesData : []);
        
        // Atualizar visualização se modal estiver aberto
        if (viewPaciente && viewPaciente.id === pacienteId) {
          const pacienteAtualizado = Array.isArray(pacientesData) ? pacientesData.find(p => p.id === pacienteId) : null;
          if (pacienteAtualizado) {
            setViewPaciente(pacienteAtualizado);
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

  const handleViewObservacoes = async (observacoes, paciente) => {
    setObservacoesAtual(observacoes || 'Nenhuma observação cadastrada.');
    setPacienteObservacoes(paciente);
    setActiveObservacoesTab('observacoes');
    
    // Buscar evidências do paciente
    if (paciente && paciente.id) {
      try {
        // Corrigido: usar formato de URL correto /:tipo/:registroId
        const response = await makeRequest(`/evidencias/paciente/${paciente.id}`);
        if (response.ok) {
          const data = await response.json();
          setEvidenciasPaciente(Array.isArray(data) ? data : []);
        } else {
          setEvidenciasPaciente([]);
        }
      } catch (error) {
        console.error('Erro ao buscar evidências:', error);
        setEvidenciasPaciente([]);
      }
    }
    
    setShowObservacoesModal(true);
  };

  // Função para formatar telefone (formato brasileiro correto)
  function maskTelefone(value) {
    if (!value) return '';
    
    // Remove todos os caracteres não numéricos (apenas números)
    let numbers = value.replace(/\D/g, '');
    
    // Remove zeros à esquerda (ex: 041 → 41)
    numbers = numbers.replace(/^0+/, '');
    
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

  const updateStatus = async (pacienteId, newStatus, evidenciaId = null) => {
    // Verificar se o usuário tem permissão para alterar status
    if (!podeAlterarStatus) {
      showErrorToast(`Você não tem permissão para alterar o status dos ${empresaId === 5 ? 'clientes' : 'pacientes'}`);
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

    // VERIFICAR SE STATUS REQUER EVIDÊNCIA
    if (STATUS_COM_EVIDENCIA_PACIENTES.includes(newStatus) && !evidenciaId) {
      const paciente = pacientes.find(p => p.id === pacienteId);
      if (paciente) {
        // Definir status temporário para o select
        setStatusTemporario(prev => ({ ...prev, [pacienteId]: newStatus }));
        // Abrir modal de evidência
        setEvidenciaData({
          pacienteId: pacienteId,
          pacienteNome: paciente.nome,
          statusAnterior: paciente.status,
          statusNovo: newStatus,
          evidenciaId: null
        });
        setShowEvidenciaModal(true);
      }
      return;
    }

    // Para outros status ou quando já tem evidenciaId, atualizar normalmente
    try {
      const response = await makeRequest(`/pacientes/${pacienteId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ 
          status: newStatus,
          evidencia_id: evidenciaId 
        })
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
    if (!window.confirm(`Tem certeza que deseja excluir este ${empresaId === 5 ? 'cliente' : 'paciente'}? Esta ação não pode ser desfeita e removerá todos os agendamentos e fechamentos relacionados.`)) {
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
        showErrorToast(`Erro ao excluir ${empresaId === 5 ? 'cliente' : 'paciente'}: ` + (data.error || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error(`Erro ao excluir ${empresaId === 5 ? 'cliente' : 'paciente'}:`, error);
      showErrorToast(`Erro ao excluir ${empresaId === 5 ? 'cliente' : 'paciente'}`);
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

  const formatarMoeda = (valor) => {
    if (!valor) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
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
      
      showSuccessToast(`Contrato "${nome}" aberto com sucesso!`);
    } catch (error) {
      console.error('Erro ao abrir contrato:', error);
      showErrorToast('Erro ao abrir contrato: ' + error.message);
    }
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
      observacoes: '',
      consultor_interno_id: ''
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
          observacoes: agendamentoData.observacoes || '',
          consultor_interno_id: agendamentoData.consultor_interno_id || null
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

  // Estados adicionais para modal de fechamento
  const [clinicaFechamento, setClinicaFechamento] = useState('');
  const [valorParcelaFechamento, setValorParcelaFechamento] = useState('');
  const [valorParcelaFormatado, setValorParcelaFormatado] = useState('');
  const [numeroParcelasFechamento, setNumeroParcelasFechamento] = useState('');
  const [vencimentoFechamento, setVencimentoFechamento] = useState('');
  const [antecipacaoFechamento, setAntecipacaoFechamento] = useState('');
  
  // Novos campos para admin/consultor interno
  const [dataOperacaoFechamento, setDataOperacaoFechamento] = useState('');
  const [valorEntregue, setValorEntregue] = useState('');
  const [valorEntregueFormatado, setValorEntregueFormatado] = useState('');
  const [printConfirmacao, setPrintConfirmacao] = useState(null);
  const [tipoOperacao, setTipoOperacao] = useState('');

  // Funções do modal de fechamento
  const abrirModalFechamento = (paciente, novoStatus = null) => {
    setPacienteParaFechar({ ...paciente, novoStatus });
    setValorFechamento('');
    setValorFormatado('');
    setContratoFechamento(null);
    setClinicaFechamento('');
    setTipoTratamentoFechamento(paciente.tipo_tratamento || '');
    setObservacoesFechamento('');
    setDataFechamento(new Date().toISOString().split('T')[0]);
    setValorParcelaFechamento('');
    setValorParcelaFormatado('');
    setNumeroParcelasFechamento('');
    setVencimentoFechamento('');
    setAntecipacaoFechamento('');
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
    setClinicaFechamento('');
    setTipoTratamentoFechamento('');
    setObservacoesFechamento('');
    setDataFechamento(new Date().toISOString().split('T')[0]);
    setValorParcelaFechamento('');
    setValorParcelaFormatado('');
    setNumeroParcelasFechamento('');
    setVencimentoFechamento('');
    setAntecipacaoFechamento('');
    // Limpar novos campos
    setDataOperacaoFechamento('');
    setValorEntregue('');
    setValorEntregueFormatado('');
    setPrintConfirmacao(null);
    setTipoOperacao('');
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

  const handleValorParcelaChange = (e) => {
    const valorDigitado = e.target.value;
    const valorFormatado = formatarValorInput(valorDigitado);
    const valorNumerico = desformatarValor(valorFormatado);
    
    setValorParcelaFormatado(valorFormatado);
    setValorParcelaFechamento(valorNumerico);
  };
  
  const handleValorEntregueChange = (e) => {
    const valorDigitado = e.target.value;
    const valorFormatado = formatarValorInput(valorDigitado);
    const valorNumerico = desformatarValor(valorFormatado);
    
    setValorEntregueFormatado(valorFormatado);
    setValorEntregue(valorNumerico);
  };

  // Funções para cadastro completo da clínica
  const resetCadastroCompleto = () => {
    setDadosCompletosClinica({
      // Dados do paciente
      nome: '',
      telefone: '',
      cpf: '',
      cidade: '',
      estado: '',
      tipo_tratamento: '',
      observacoes: '',
      // Dados do fechamento
      valor_fechado: '',
      valor_fechado_formatado: '',
      contrato_arquivo: null,
      observacoes_fechamento: '',
      data_fechamento: new Date().toISOString().split('T')[0],
      // Dados do parcelamento
      valor_parcela: '',
      valor_parcela_formatado: '',
      numero_parcelas: '',
      vencimento: '',
      antecipacao_meses: ''
    });
    setShowCadastroCompletoModal(false);
    setCidadeCustomizada(false);
  };

  const handleInputChangeCadastroCompleto = (e) => {
    let { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      value = checked;
    } else if (type === 'file') {
      value = e.target.files[0];
    } else {
      // Aplicar formatação
      if (name === 'telefone') {
        value = value.replace(/\D/g, '');
        if (value.length > 0) {
          value = maskTelefone(value);
        }
      } else if (name === 'cpf') {
        value = maskCPF(value);
      } else if (name === 'nome') {
        value = value;
      } else if (name === 'cidade') {
        value = formatarCidade(value);
      }
    }
    
    // Se mudou o estado, limpar a cidade
    if (name === 'estado') {
      setCidadeCustomizada(false);
      setDadosCompletosClinica(prev => ({
        ...prev,
        [name]: value,
        cidade: ''
      }));
    } else {
      setDadosCompletosClinica(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleValorFechadoCompleto = (e) => {
    const valorDigitado = e.target.value;
    const valorFormatado = formatarValorInput(valorDigitado);
    const valorNumerico = desformatarValor(valorFormatado);
    
    setDadosCompletosClinica(prev => ({
      ...prev,
      valor_fechado_formatado: valorFormatado,
      valor_fechado: valorNumerico
    }));
  };

  const handleValorParcelaCompleto = (e) => {
    const valorDigitado = e.target.value;
    const valorFormatado = formatarValorInput(valorDigitado);
    const valorNumerico = desformatarValor(valorFormatado);
    
    setDadosCompletosClinica(prev => ({
      ...prev,
      valor_parcela_formatado: valorFormatado,
      valor_parcela: valorNumerico
    }));
  };

  const handleNomeBlurCompleto = (e) => {
    const { value } = e.target;
    if (value && value.trim()) {
      const nomeFormatado = formatarNome(value);
      setDadosCompletosClinica(prev => ({
        ...prev,
        nome: nomeFormatado
      }));
    }
  };

  const confirmarCadastroCompleto = async () => {
    const dados = dadosCompletosClinica;
    
    // Validações básicas
    if (!dados.nome || !dados.telefone || !dados.cpf) {
      showErrorToast('Por favor, preencha nome, telefone e CPF!');
      return;
    }
    
    if (!dados.valor_fechado || dados.valor_fechado <= 0) {
      showErrorToast('Por favor, informe um valor válido para o fechamento!');
      return;
    }
    
    if (!dados.contrato_arquivo) {
      showErrorToast('Por favor, selecione o contrato em PDF!');
      return;
    }
    
    if (dados.contrato_arquivo && dados.contrato_arquivo.type !== 'application/pdf') {
      showErrorToast('Apenas arquivos PDF são permitidos para o contrato!');
      return;
    }
    
    if (dados.contrato_arquivo && dados.contrato_arquivo.size > 10 * 1024 * 1024) {
      showErrorToast('O arquivo deve ter no máximo 10MB!');
      return;
    }

    // Validações dos campos de parcelamento obrigatórios
    if (!dados.valor_parcela || dados.valor_parcela <= 0) {
      showErrorToast('Por favor, informe um valor válido para a parcela!');
      return;
    }
    
    if (!dados.numero_parcelas || dados.numero_parcelas <= 0) {
      showErrorToast('Por favor, informe o número de parcelas!');
      return;
    }
    
    if (!dados.vencimento) {
      showErrorToast('Por favor, informe a data de vencimento!');
      return;
    }
    
    if (!dados.antecipacao_meses || dados.antecipacao_meses <= 0) {
      showErrorToast('Por favor, informe quantas parcelas quer antecipar!');
      return;
    }

    setSalvandoCadastroCompleto(true);
    
    try {
      const clinicaId = user?.clinica_id || user?.id;
      const token = localStorage.getItem('token');
      const API_BASE_URL = process.env.NODE_ENV === 'production' ? 'https://crminvest-backend.fly.dev/api' : 'http://localhost:5000/api';
      
      // 1. Criar o paciente
      const pacienteData = {
        nome: dados.nome,
        telefone: dados.telefone,
        cpf: dados.cpf,
        cidade: dados.cidade,
        estado: dados.estado,
        tipo_tratamento: dados.tipo_tratamento,
        status: 'fechado', // Já criamos como fechado
        observacoes: dados.observacoes
      };
      
      const pacienteResponse = await makeRequest('/pacientes', {
        method: 'POST',
        body: JSON.stringify(pacienteData)
      });
      
      if (!pacienteResponse.ok) {
        const errorData = await pacienteResponse.json();
        throw new Error(errorData.error || 'Erro ao criar paciente');
      }
      
      const pacienteCriado = await pacienteResponse.json();
      console.log('Paciente criado:', pacienteCriado);
      
      // 2. Criar o fechamento com contrato (sem agendamento automático)
      const fechamentoFormData = new FormData();
      fechamentoFormData.append('paciente_id', pacienteCriado.id);
      fechamentoFormData.append('consultor_id', pacienteCriado.consultor_id || '');
      
      // Para incorporadora (empresa_id = 5), usar empreendimento_id do paciente
      if (empresaId === 5) {
        if (pacienteCriado.empreendimento_id) {
          fechamentoFormData.append('clinica_id', pacienteCriado.empreendimento_id); // Backend espera clinica_id mesmo para empreendimentos
        }
      } else {
        // Para securitizadora, usar clinica_id
        fechamentoFormData.append('clinica_id', clinicaId);
        fechamentoFormData.append('tipo_tratamento', dados.tipo_tratamento || '');
      }
      
      fechamentoFormData.append('valor_fechado', parseFloat(dados.valor_fechado));
      fechamentoFormData.append('data_fechamento', dados.data_fechamento);
      fechamentoFormData.append('observacoes', dados.observacoes_fechamento || 'Fechamento criado automaticamente pela clínica');
      
      // Dados do parcelamento (obrigatórios)
      fechamentoFormData.append('valor_parcela', parseFloat(dados.valor_parcela));
      fechamentoFormData.append('numero_parcelas', parseInt(dados.numero_parcelas));
      fechamentoFormData.append('vencimento', dados.vencimento);
      fechamentoFormData.append('antecipacao_meses', parseInt(dados.antecipacao_meses));
      
      // Contrato
      if (dados.contrato_arquivo) {
        fechamentoFormData.append('contrato', dados.contrato_arquivo);
      }
      
      const fechamentoResponse = await fetch(`${API_BASE_URL}/fechamentos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: fechamentoFormData
      });
      
      if (!fechamentoResponse.ok) {
        const errorData = await fechamentoResponse.json();
        throw new Error(errorData.error || 'Erro ao criar fechamento');
      }
      
      showSuccessToast(`Paciente ${dados.nome} cadastrado com sucesso! Valor: ${dados.valor_fechado_formatado}`);
      resetCadastroCompleto();
      
      // Recarregar dados
      await fetchPacientes();
      await fetchAgendamentos();
      await fetchFechamentos();
      
      // Forçar atualização nas outras telas
      const timestamp = Date.now();
      localStorage.setItem('data_sync_trigger', timestamp.toString());
      window.dispatchEvent(new CustomEvent('data_updated', { detail: { timestamp } }));
      
    } catch (error) {
      console.error(`Erro ao cadastrar ${empresaId === 5 ? 'cliente' : 'paciente'} completo:`, error);
      showErrorToast(`Erro ao cadastrar ${empresaId === 5 ? 'cliente' : 'paciente'}: ` + error.message);
    } finally {
      setSalvandoCadastroCompleto(false);
    }
  };

  const confirmarFechamento = async () => {
    if (!valorFechamento || valorFechamento <= 0) {
      showErrorToast('Por favor, informe um valor válido para o fechamento!');
      return;
    }

    if (!clinicaFechamento) {
      showErrorToast('Por favor, selecione a clínica!');
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
      
      // Para incorporadora (empresa_id = 5), usar empreendimento_id do paciente
      if (empresaId === 5) {
        if (pacienteParaFechar.empreendimento_id) {
          formData.append('clinica_id', pacienteParaFechar.empreendimento_id); // Backend espera clinica_id mesmo para empreendimentos
        }
      } else {
        // Para securitizadora, usar clinica_id
        formData.append('clinica_id', clinicaFechamento);
        formData.append('tipo_tratamento', tipoTratamentoFechamento || '');
      }
      
      formData.append('valor_fechado', parseFloat(valorFechamento));
      formData.append('data_fechamento', dataFechamento);
      formData.append('observacoes', observacoesFechamento || 'Fechamento criado pelo pipeline');
      
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
      
      // Campos administrativos (admin/consultor interno)
      if (dataOperacaoFechamento) {
        formData.append('data_operacao', dataOperacaoFechamento);
      }
      if (valorEntregue) {
        formData.append('valor_entregue', parseFloat(valorEntregue));
      }
      if (tipoOperacao) {
        formData.append('tipo_operacao', tipoOperacao);
      }
      if (printConfirmacao) {
        formData.append('print_confirmacao', printConfirmacao);
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
      status: 'sem_primeiro_contato',
      observacoes: '',
      // Se for consultor, pré-preenche com o próprio ID
      consultor_id: isConsultor ? String(user?.consultor_id || user?.id) : ''
    });
    setEditingPaciente(null);
    setShowModal(false);
    setCidadeCustomizada(false);
  };

  const pacientesFiltrados = pacientes.filter(p => {
    // Verificar se é um paciente sem consultor
    const semConsultor = !p.consultor_id || p.consultor_id === '' || p.consultor_id === null || p.consultor_id === undefined || Number(p.consultor_id) === 0;
    
    // Pacientes com status 'fechado' sempre aparecem (cadastrados por clínicas)
    if (p.status === 'fechado' && semConsultor) {
      return true; // Sempre mostrar pacientes fechados, mesmo sem consultor
    }
    
    // Para freelancers: mostrar todos os pacientes indicados por eles (com consultor_id dele)
    // independente do status, incluindo leads
    if (isFreelancer) {
      // Se o paciente tem o consultor_id do freelancer, mostrar
      if (p.consultor_id && Number(p.consultor_id) === Number(user?.consultor_id)) {
        // Continuar com os outros filtros abaixo
      } else {
        return false; // Não mostrar pacientes de outros consultores
      }
    } else {
      // Para não-freelancers: lógica original
    // Admins e consultores internos veem todos os pacientes
    // Leads não atribuídos (sem consultor_id) NÃO devem aparecer aqui para ninguém
      if (!isAdmin && !isConsultorInterno && semConsultor) return false;
    
    // Para consultores internos e admins, também remover leads não atribuídos da aba "Geral"
    // (eles devem aparecer apenas em "Novos Leads")
      if ((isAdmin || isConsultorInterno) && semConsultor) return false;
    }
    
    const matchNome = !filtroNome || p.nome.toLowerCase().includes(filtroNome.toLowerCase());
    const matchTelefone = !filtroTelefone || (p.telefone || '').includes(filtroTelefone);
    const matchCPF = !filtroCPF || (p.cpf || '').includes(filtroCPF);
    const matchTipo = !filtroTipo || (
      isIncorporadora ? (
        // Para incorporadora, comparar nome do empreendimento
        (() => {
          const empreendimentoMap = {
            4: 'Laguna Sky Garden',
            5: 'Residencial Girassol',
            6: 'Sintropia Sky Garden',
            7: 'Residencial Lotus',
            8: 'River Sky Garden',
            9: 'Condomínio Figueira Garcia'
          };
          return empreendimentoMap[p.empreendimento_id] === filtroTipo;
        })()
      ) : (
        // Para outras empresas, comparar tipo de tratamento
        p.tipo_tratamento === filtroTipo
      )
    );
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

  // Filtro para Leads Negativos
  const leadsNegativosFiltrados = leadsNegativos.filter(lead => {
    const matchNome = !filtroNomeNegativos || lead.nome.toLowerCase().includes(filtroNomeNegativos.toLowerCase());
    const matchStatus = !filtroStatusNegativos || lead.status === filtroStatusNegativos;
    const matchConsultor = !filtroConsultorNegativos || String(lead.consultor_id) === filtroConsultorNegativos;
    
    return matchNome && matchStatus && matchConsultor;
  });



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
            <h1 className="page-title">Meus {t.pacientes.toLowerCase()}</h1>
            <p className="page-subtitle">Acompanhe o status de seus {t.paciente.toLowerCase()+'s'}</p>
          </div>
        </div>
        
        <div style={{
          borderRadius: '8px',
          padding: '1rem',
          fontSize: '0.875rem'
        }}>
          
        </div>
      </div>

      {/* Navegação por abas - Diferente para cada tipo de usuário */}
      {/* Para Admin e Consultor Interno */}
      {(isAdmin || isConsultorInterno) && !isClinica && (
        <div className="tabs">
          {!isCalculoCarteira && (
            <>
              <button
                className={`tab ${activeTab === 'pacientes' ? 'active' : ''}`}
                onClick={() => setActiveTab('pacientes')}
              >
                {t.pacientes}
              </button>
              <button
                className={`tab ${activeTab === 'novos-leads' ? 'active' : ''}`}
                onClick={() => setActiveTab('novos-leads')}
                style={{ position: 'relative' }}
              >
                Novos Leads
                {novosLeads.filter(l => l.status === 'lead').length > 0 && (
                  <span className="tab-badge">{novosLeads.filter(l => l.status === 'lead').length}</span>
                )}
              </button>
              <button
                className={`tab ${activeTab === 'negativas' ? 'active' : ''}`}
                onClick={() => setActiveTab('negativas')}
              >
                Leads Negativos
              </button>
            </>
          )}
        {!isIncorporadora && (
          <button
            className={`tab ${activeTab === 'carteira-existente' ? 'active' : ''}`}
            onClick={() => setActiveTab('carteira-existente')}
          >
            Carteira Existente
            <span style={{ marginLeft: '0.5rem', fontSize: '0.875rem', opacity: 0.8 }}>
              ({pacientes.filter(p => p.carteira_existente === true).length})
            </span>
            {isAdmin && solicitacoesCarteira.filter(s => s.status === 'pendente').length > 0 && (
              <span style={{ 
                marginLeft: '0.5rem', 
                backgroundColor: '#ef4444', 
                color: 'white', 
                padding: '0.125rem 0.5rem', 
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: '600'
              }}>
                {solicitacoesCarteira.filter(s => s.status === 'pendente').length} pendente{solicitacoesCarteira.filter(s => s.status === 'pendente').length > 1 ? 's' : ''}
              </span>
            )}
          </button>
         )}
        </div>
      )}
      
      {/* Para Clínicas - Abas especiais */}
      {isClinica && (
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'meus-pacientes' ? 'active' : ''}`}
            onClick={() => setActiveTab('meus-pacientes')}
          >
            Meus Pacientes
            <span style={{ marginLeft: '0.5rem', fontSize: '0.875rem', opacity: 0.8 }}>
              ({(() => {
                const clinicaId = user?.clinica_id || user?.id;
                // MOSTRAR TODOS OS FECHAMENTOS, não só aprovados
                const fechamentosClinica = fechamentos.filter(f => f.clinica_id === clinicaId);
                const pacientesIds = fechamentosClinica.map(f => f.paciente_id);
                return pacientes.filter(p => pacientesIds.includes(p.id) && p.status === 'fechado').length;
              })()})
            </span>
          </button>
          <button
            className={`tab ${activeTab === 'leads-clinica' ? 'active' : ''}`}
            onClick={() => setActiveTab('leads-clinica')}
          >
            Leads
            <span style={{ marginLeft: '0.5rem', fontSize: '0.875rem', opacity: 0.8 }}>
              ({(() => {
                const clinicaId = user?.clinica_id || user?.id;
                return pacientes.filter(p => {
                  // Verificar se tem agendamento nesta clínica
                  const temAgendamento = agendamentos.some(a => a.paciente_id === p.id && a.clinica_id === clinicaId);
                  return temAgendamento && p.status !== 'fechado';
                }).length;
              })()})
            </span>
          </button>
        {!isIncorporadora && (
          <button
            className={`tab ${activeTab === 'carteira-existente' ? 'active' : ''}`}
            onClick={() => setActiveTab('carteira-existente')}
          >
            Carteira Existente
            <span style={{ marginLeft: '0.5rem', fontSize: '0.875rem', opacity: 0.8 }}>
              ({pacientes.filter(p => p.carteira_existente === true).length + solicitacoesCarteira.length})
            </span>
            {isAdmin && solicitacoesCarteira.filter(s => s.status === 'pendente').length > 0 && (
              <span style={{ 
                marginLeft: '0.5rem', 
                backgroundColor: '#ef4444', 
                color: 'white', 
                padding: '0.125rem 0.5rem', 
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: '600'
              }}>
                {solicitacoesCarteira.filter(s => s.status === 'pendente').length} pendente{solicitacoesCarteira.filter(s => s.status === 'pendente').length > 1 ? 's' : ''}
              </span>
            )}
          </button>
        )}
        </div>
      )}

      {/* Conteúdo da aba Pacientes */}
      {activeTab === 'pacientes' && (
        <>
          {/* Resumo de Estatísticas */}
          <div className="stats-grid" style={{ marginBottom: '2rem' }}>
            
            <div className="stat-card">
              <div className="stat-label">Agendamentos</div>
              <div className="stat-value">{agendamentos.length}</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-label">Fechados</div>
              <div className="stat-value">{pacientes.filter(p => p.status === 'fechado').length}</div>
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
                    <label className="form-label">{t.tipoTratamento}</label>
                    <select className="form-select" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
                      <option value="">Todos</option>
                      {isIncorporadora? (
                        // Para incorporadora, mostrar empreendimentos hardcoded
                        <>
                          <option value="Laguna Sky Garden">Laguna Sky Garden</option>
                          <option value="Residencial Girassol">Residencial Girassol</option>
                          <option value="Sintropia Sky Garden">Sintropia Sky Garden</option>
                          <option value="Residencial Lotus">Residencial Lotus</option>
                          <option value="River Sky Garden">River Sky Garden</option>
                          <option value="Condomínio Figueira Garcia">Condomínio Figueira Garcia</option>
                        </>
                      ) : (
                        // Para outras empresas, mostrar tipos fixos
                        <>
                          <option value="Estético">Estético</option>
                          <option value="Odontológico">Odontológico</option>
                        </>
                      )}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Status</label>
                    <select className="form-select" value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
                      <option value="">Todos</option>
                      {statusOptions
                        .filter(option => {
                          // Freelancers veem todos os status
                          if (isFreelancer) return true;
                          // Outros usuários não veem status de leads e negativas
                          return ![
                            'lead',
                            'sem_primeiro_contato',
                            'nao_existe',
                            'nao_tem_interesse',
                            'nao_reconhece',
                            'nao_responde',
                            'sem_clinica',
                            'nao_passou_cpf',
                            'nao_tem_outro_cpf',
                            'cpf_reprovado'
                          ].includes(option.value);
                        })
                        .map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                   <div className="form-group" style={{ margin: 0 }}>
                     <label className="form-label">{t.consultor}</label>
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
              <div>
                <h2 className="card-title">Lista de {t.paciente.toLowerCase()+'s'}</h2>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  {pacientesFiltrados.length} {t.paciente.toLowerCase()}(s)
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  if (isFreelancer) {
                    navigate('/indicacoes');
                    // Scroll para o topo da página após navegação
                    setTimeout(() => {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }, 100);
                    return;
                  }
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
                Nenhum {t.paciente.toLowerCase()} cadastrado ainda.
              </div>
            ) : (
              <>
                <div className="table-container">
                  <table className="table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>Freelancer</th>
                      <th style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>SDR</th>
                      <th style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>Consultor Interno</th>
                      <th style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>Telefone</th>
                      <th style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>CPF</th>
                      <th style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>Cidade</th>
                      <th style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>{isIncorporadora ? 'Empreendimento' : 'Tipo'}</th>
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
                      <th style={{ width: isConsultor || isClinica ? '80px' : '140px' }}>Ações</th>
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
                                    onClick={() => handleViewObservacoes(paciente.observacoes, paciente)}
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
                          <td style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>
                            {paciente.sdr_nome || (
                              <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>
                                Não atribuído
                              </span>
                            )}
                          </td>
                          <td style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>
                            {paciente.consultor_interno_nome || (
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
                            {isIncorporadora ? (
                              // Para incorporadora, mostrar empreendimento
                              paciente.empreendimento_id ? (
                                (() => {
                                  const empreendimentoMap = {
                                    4: 'Laguna Sky Garden',
                                    5: 'Residencial Girassol',
                                    6: 'Sintropia Sky Garden',
                                    7: 'Residencial Lotus',
                                    8: 'River Sky Garden',
                                    9: 'Condomínio Figueira Garcia'
                                  };
                                  return empreendimentoMap[paciente.empreendimento_id] || '-';
                                })()
                              ) : '-'
                            ) : (
                              // Para clínicas, mostrar tipo de tratamento
                              paciente.tipo_tratamento && (
                                <span className={`badge badge-${paciente.tipo_tratamento === 'estetico' ? 'info' : 'warning'}`}>
                                  {paciente.tipo_tratamento === 'estetico' ? 'Estético' : 
                                   paciente.tipo_tratamento === 'odontologico' ? 'Odontológico' : 
                                   paciente.tipo_tratamento === 'ambos' ? 'Ambos' :
                                   paciente.tipo_tratamento}
                                </span>
                              )
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
                              {statusOptions
                                .filter(option => {
                                  // Freelancers veem todos os status
                                  if (isFreelancer) return true;
                                  // Outros usuários não veem status de leads e negativas
                                  return ![
                                    'lead',
                                    'sem_primeiro_contato',
                                    'nao_existe',
                                    'nao_tem_interesse',
                                    'nao_reconhece',
                                    'nao_responde',
                                    'sem_clinica',
                                    'nao_passou_cpf',
                                    'nao_tem_outro_cpf',
                                    'cpf_reprovado'
                                  ].includes(option.value);
                                })
                                .map(option => (
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', padding: '0.5rem' }}>
                  <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                    Página {currentPage} de {totalPages}
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
                      <th style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>Freelancer</th>
                      <th style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>SDR</th>
                      <th style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>Consultor Interno</th>
                      <th style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>Telefone</th>
                      <th style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>CPF</th>
                      <th style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>Cidade</th>
                      <th style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>{isIncorporadora ? 'Empreendimento' : 'Tipo'}</th>
                      <th style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>Status</th>
                      <th style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>Cadastrado</th>
                      <th style={{ width: isConsultor || isClinica ? '80px' : '200px', minWidth: isConsultor || isClinica ? '80px' : '200px' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {novosLeads.map(lead => {
                      const statusInfo = getStatusInfo(lead.status);
                      const consultorAtribuido = consultores.find(c => c.id === lead.consultor_id);
                      const temConsultor = lead.consultor_id && lead.consultor_id !== null;
                      
                      return (
                        <tr key={lead.id}>
                          <td>
                            <div>
                              <strong>{lead.nome}</strong>
                              {lead.observacoes && (
                                <div style={{ marginTop: '0.25rem' }}>
                                  <button
                                    onClick={() => handleViewObservacoes(lead.observacoes, lead)}
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
                            {temConsultor ? (
                              <span style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '0.25rem'

                              }}>
  
                                {consultorAtribuido?.nome || 'Consultor atribuído'}
                              </span>
                            ) : (
                              <span style={{ color: '#6b7280', fontStyle: 'italic' }}>Sem consultor</span>
                            )}
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
                            {isIncorporadora ? (
                              // Para incorporadora, mostrar empreendimento
                              lead.empreendimento_id ? (
                                (() => {
                                  const empreendimentoMap = {
                                    4: 'Laguna Sky Garden',
                                    5: 'Residencial Girassol',
                                    6: 'Sintrop點 Sky Garden',
                                    7: 'Residencial Lotus',
                                    8: 'River Sky Garden',
                                    9: 'Condomínio Figueira Garcia'
                                  };
                                  return empreendimentoMap[lead.empreendimento_id] || '-';
                                })()
                              ) : '-'
                            ) : (
                              // Para clínicas, mostrar tipo de tratamento
                              lead.tipo_tratamento && (
                                <span className={`badge badge-${lead.tipo_tratamento === 'estetico' ? 'info' : 'warning'}`}>
                                  {lead.tipo_tratamento === 'estetico' ? 'Estético' : 
                                   lead.tipo_tratamento === 'odontologico' ? 'Odontológico' : 
                                   lead.tipo_tratamento === 'ambos' ? 'Ambos' :
                                   lead.tipo_tratamento}
                                </span>
                              )
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
                                {statusOptions
                                  .filter(option => [
                                    'lead',
                                    'nao_existe',
                                    'nao_tem_interesse',
                                    'nao_reconhece',
                                    'nao_responde',
                                    'sem_clinica',
                                    'nao_passou_cpf',
                                    'nao_tem_outro_cpf',
                                    'cpf_reprovado'
                                  ].includes(option.value))
                                  .map(option => (
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
                              {temConsultor ? (
                                <button
                                  onClick={() => aprovarLead(lead.id)}
                                  className="btn"
                                  style={{ 
                                    fontSize: window.innerWidth <= 768 ? '0.75rem' : '0.8rem',
                                    padding: window.innerWidth <= 768 ? '0.375rem 0.5rem' : '0.5rem 0.75rem',
                                    minWidth: '80px',
                                    height: '32px',
                                    whiteSpace: 'nowrap',
                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    color: 'white',
                                    border: 'none'
                                  }}
                                >
                                  {window.innerWidth <= 768 ? 'Aprovar' : 'Aprovar Lead'}
                                </button>
                              ) : (
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
                              )}
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

      {activeTab === 'negativas' && (
        <>
          {/* Resumo de Estatísticas - Ocultar para incorporadora */}
          {shouldShow('leadsNegativos', 'mostrarResumoEstatisticas') && (
            <div className="stats-grid" style={{ marginBottom: '2rem' }}>
              <div className="stat-card">
                <div className="stat-label">CPF Reprovado</div>
                <div className="stat-value">{leadsNegativos.filter(l => l.status === 'cpf_reprovado').length}</div>
              </div>
              
              <div className="stat-card">
                <div className="stat-label">Sem Clínica</div>
                <div className="stat-value">{leadsNegativos.filter(l => l.status === 'sem_clinica').length}</div>
              </div>
              
              <div className="stat-card">
                <div className="stat-label">Paciente não responde</div>
                <div className="stat-value">{leadsNegativos.filter(l => l.status === 'nao_responde').length}</div>
              </div>
            </div>
          )}

          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="card-title" style={{ fontSize: '1.1rem' }}>Filtros</h2>
              <button className="btn btn-secondary" onClick={() => setMostrarFiltrosNegativos(!mostrarFiltrosNegativos)}>
                {mostrarFiltrosNegativos ? 'Ocultar Filtros' : 'Filtros'}
              </button>
            </div>
            {mostrarFiltrosNegativos && (
              <div style={{ padding: '1.5rem', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <div className="grid grid-3" style={{ gap: '1rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Nome</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={filtroNomeNegativos} 
                      onChange={e => setFiltroNomeNegativos(e.target.value)} 
                      placeholder="Buscar por nome" 
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Status</label>
                    <select 
                      className="form-select" 
                      value={filtroStatusNegativos} 
                      onChange={e => setFiltroStatusNegativos(e.target.value)}
                    >
                      <option value="">Todos</option>
                      {statusOptions
                        .filter(option => [
                          'lead',
                          'nao_existe',
                          'nao_tem_interesse',
                          'nao_reconhece',
                          'nao_responde',
                          'sem_clinica',
                          'nao_passou_cpf',
                          'nao_tem_outro_cpf',
                          'cpf_reprovado'
                        ].includes(option.value))
                        .map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">{t.consultor}</label>
                    <select 
                      className="form-select" 
                      value={filtroConsultorNegativos} 
                      onChange={e => setFiltroConsultorNegativos(e.target.value)}
                    >
                      <option value="">Todos</option>
                      {consultores.map(c => (
                        <option key={c.id} value={c.id}>{c.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Leads Negativos</h2>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                {leadsNegativosFiltrados.length} lead(s) negativos
              </div>
            </div>

            {loading ? (
              <div className="loading">
                <div className="spinner"></div>
              </div>
            ) : leadsNegativosFiltrados.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#6b7280', padding: '3rem' }}>
                Nenhum lead negativo encontrado.
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>Freelancer</th>
                      <th style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>SDR</th>
                      <th style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>Consultor Interno</th>
                      <th style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>Telefone</th>
                      <th style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>CPF</th>
                      <th style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>Cidade</th>
                      <th style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>{isIncorporadora ? 'Empreendimento' : 'Tipo'}</th>
                      <th>Status</th>
                      <th style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>Cadastrado</th>
                      <th style={{ width: '80px' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leadsNegativosFiltrados.map(lead => {
                      const statusInfo = getStatusInfo(lead.status);
                      const consultorAtribuido = consultores.find(c => c.id === lead.consultor_id);
                      const temConsultor = lead.consultor_id && lead.consultor_id !== null;
                      
                      return (
                        <tr key={lead.id}>
                          <td>
                            <div>
                              <strong>{lead.nome}</strong>
                              {lead.observacoes && (
                                <div style={{ marginTop: '0.25rem' }}>
                                  <button
                                    onClick={() => handleViewObservacoes(lead.observacoes, lead)}
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
                            {temConsultor ? (
                              <span style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '0.25rem'
                              }}>
                                {consultorAtribuido?.nome || 'Consultor atribuído'}
                              </span>
                            ) : (
                              <span style={{ color: '#6b7280', fontStyle: 'italic' }}>Sem consultor</span>
                            )}
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
                            {isIncorporadora ? (
                              // Para incorporadora, mostrar empreendimento
                              lead.empreendimento_id ? (
                                (() => {
                                  const empreendimentoMap = {
                                    4: 'Laguna Sky Garden',
                                    5: 'Residencial Girassol',
                                    6: 'Sintropia Sky Garden',
                                    7: 'Residencial Lotus',
                                    8: 'River Sky Garden',
                                    9: 'Condomínio Figueira Garcia'
                                  };
                                  return empreendimentoMap[lead.empreendimento_id] || '-';
                                })()
                              ) : '-'
                            ) : (
                              // Para clínicas, mostrar tipo de tratamento
                              lead.tipo_tratamento && (
                                <span className={`badge badge-${lead.tipo_tratamento === 'estetico' ? 'info' : 'warning'}`}>
                                  {lead.tipo_tratamento === 'estetico' ? 'Estético' : 
                                   lead.tipo_tratamento === 'odontologico' ? 'Odontológico' : 
                                   lead.tipo_tratamento === 'ambos' ? 'Ambos' :
                                   lead.tipo_tratamento}
                                </span>
                              )
                            )}
                          </td>
                          <td>
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
                                {statusOptions
                                  .filter(option => [
                                    'lead',
                                    'nao_existe',
                                    'nao_tem_interesse',
                                    'nao_reconhece',
                                    'nao_responde',
                                    'sem_clinica',
                                    'nao_passou_cpf',
                                    'nao_tem_outro_cpf',
                                    'cpf_reprovado'
                                  ].includes(option.value))
                                  .map(option => (
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
                          <td style={{ padding: '0.5rem' }}>
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

      {/* Conteúdo da aba Leads (apenas para clínicas) */}
      {activeTab === 'leads-clinica' && isClinica && (
        <>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Pacientes com Agendamento na Clínica</h2>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                Pacientes com agendamentos marcados para sua clínica que ainda não fecharam contrato
              </div>
            </div>

            {loading ? (
              <div className="loading">
                <div className="spinner"></div>
              </div>
            ) : (
              <>
                {(() => {
                  const clinicaId = user?.clinica_id || user?.id;
                  const leadsClinica = pacientes.filter(p => {
                    const temAgendamento = agendamentos.some(a => a.paciente_id === p.id && a.clinica_id === clinicaId);
                    return temAgendamento && p.status !== 'fechado';
                  });
                  
                  return leadsClinica.length === 0;
                })() ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 1rem', opacity: 0.3 }}>
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="9" y1="9" x2="15" y2="9"></line>
                      <line x1="9" y1="13" x2="15" y2="13"></line>
                      <line x1="9" y1="17" x2="11" y2="17"></line>
                    </svg>
                    <p style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                      Nenhum lead atribuído no momento
                    </p>
                    <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
                      Os leads aparecerão aqui quando houver agendamentos marcados para sua clínica.
                    </p>
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Nome</th>
                          <th style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>Telefone</th>
                          <th style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>{isIncorporadora ? 'Empreendimento' : 'Tipo'}</th>
                          <th>Status</th>
                          <th style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>{t.consultor}</th>
                          <th style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>Data Agendamento</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const clinicaId = user?.clinica_id || user?.id;
                          const leadsClinica = pacientes.filter(p => {
                            const temAgendamento = agendamentos.some(a => a.paciente_id === p.id && a.clinica_id === clinicaId);
                            return temAgendamento && p.status !== 'fechado';
                          });
                          
                          return leadsClinica.map(paciente => {
                            const statusInfo = statusOptions.find(s => s.value === paciente.status) || statusOptions[0];
                            const agendamentoPaciente = agendamentos.find(a => a.paciente_id === paciente.id && a.clinica_id === clinicaId);
                            
                            return (
                              <tr key={paciente.id}>
                                <td>
                                  <strong>{paciente.nome}</strong>
                                  {paciente.observacoes && (
                                    <div style={{ marginTop: '0.25rem' }}>
                                      <button
                                        onClick={() => handleViewObservacoes(paciente.observacoes, paciente)}
                                        style={{
                                          background: 'none',
                                          border: 'none',
                                          color: '#6b7280',
                                          cursor: 'pointer',
                                          fontSize: '0.7rem',
                                          padding: '0.2rem',
                                          borderRadius: '4px'
                                        }}
                                        title="Ver observações"
                                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                      >
                                        •••
                                      </button>
                                    </div>
                                  )}
                                </td>
                                <td style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>{formatarTelefone(paciente.telefone)}</td>
                                <td style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>
                                  {isIncorporadora ? (
                                    // Para incorporadora, mostrar empreendimento
                                    paciente.empreendimento_id ? (
                                      (() => {
                                        const empreendimentoMap = {
                                          4: 'Laguna Sky Garden',
                                          5: 'Residencial Girassol',
                                          6: 'Sintropia Sky Garden',
                                          7: 'Residencial Lotus',
                                          8: 'River Sky Garden',
                                          9: 'Condomínio Figueira Garcia'
                                        };
                                        return empreendimentoMap[paciente.empreendimento_id] || '-';
                                      })()
                                    ) : '-'
                                  ) : (
                                    // Para clínicas, mostrar tipo de tratamento
                                    paciente.tipo_tratamento && (
                                      <span className={`badge badge-${paciente.tipo_tratamento === 'estetico' ? 'info' : 'warning'}`}>
                                        {paciente.tipo_tratamento === 'estetico' ? 'Estético' : 
                                         paciente.tipo_tratamento === 'odontologico' ? 'Odontológico' : 
                                         paciente.tipo_tratamento === 'ambos' ? 'Ambos' :
                                         paciente.tipo_tratamento}
                                      </span>
                                    )
                                  )}
                                </td>
                                <td>
                                  <span className="badge" style={{ 
                                    backgroundColor: statusInfo.color + '20', 
                                    color: statusInfo.color,
                                    fontWeight: '600',
                                    border: `1px solid ${statusInfo.color}`
                                  }}>
                                    {statusInfo.label}
                                  </span>
                                </td>
                                <td style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>
                                  {paciente.consultor_nome || (
                                    <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>-</span>
                                  )}
                                </td>
                                <td style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>
                                  {agendamentoPaciente?.data_agendamento ? formatarData(agendamentoPaciente.data_agendamento) : formatarData(paciente.created_at)}
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Conteúdo da aba Meus Pacientes (apenas para clínicas) */}
      {activeTab === 'meus-pacientes' && isClinica && (
        <>
          {/* Resumo de Estatísticas para Clínicas */}
          <div className="stats-grid" style={{ marginBottom: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
            <div className="stat-card">
              <div className="stat-label">Total de Pacientes</div>
              <div className="stat-value">
                {(() => {
                  const clinicaId = user?.clinica_id || user?.id;
                  // TODOS os fechamentos, não só aprovados
                  const fechamentosClinica = fechamentos.filter(f => f.clinica_id === clinicaId);
                  const pacientesIds = fechamentosClinica.map(f => f.paciente_id);
                  return pacientes.filter(p => pacientesIds.includes(p.id) && p.status === 'fechado').length;
                })()}
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-label">Fechamentos Aprovados</div>
              <div className="stat-value">
                {(() => {
                  const clinicaId = user?.clinica_id || user?.id;
                  return fechamentos.filter(f => f.clinica_id === clinicaId && f.aprovado === 'aprovado').length;
                })()}
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-label">Doc. Completa</div>
              <div className="stat-value">
                {(() => {
                  const clinicaId = user?.clinica_id || user?.id;
                  const fechamentosClinica = fechamentos.filter(f => f.clinica_id === clinicaId);
                  const pacientesIds = fechamentosClinica.map(f => f.paciente_id);
                  return pacientes.filter(p => {
                    if (!pacientesIds.includes(p.id) || p.status !== 'fechado') return false;
                    const docsEnviados = [
                      p.selfie_doc_url,
                      p.documento_url,
                      p.comprovante_residencia_url,
                      p.contrato_servico_url
                    ].filter(Boolean).length;
                    return docsEnviados === 4;
                  }).length;
                })()}
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-label">Doc. Pendente</div>
              <div className="stat-value">
                {(() => {
                  const clinicaId = user?.clinica_id || user?.id;
                  const fechamentosClinica = fechamentos.filter(f => f.clinica_id === clinicaId);
                  const pacientesIds = fechamentosClinica.map(f => f.paciente_id);
                  return pacientes.filter(p => {
                    if (!pacientesIds.includes(p.id) || p.status !== 'fechado') return false;
                    const docsEnviados = [
                      p.selfie_doc_url,
                      p.documento_url,
                      p.comprovante_residencia_url,
                      p.contrato_servico_url
                    ].filter(Boolean).length;
                    return docsEnviados < 4;
                  }).length;
                })()}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 className="card-title" style={{ marginBottom: '0.5rem' }}>Lista de {t.paciente.toLowerCase()+'s'} com Fechamento</h2>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  Upload de documentos é necessário para aprovação final.
                </div>
              </div>
              <div>
                <button 
                  className="btn btn-primary" 
                  onClick={() => setShowCadastroCompletoModal(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Cadastrar {t.paciente}
                </button>
              </div>
            </div>

            {loading ? (
              <div className="loading">
                <div className="spinner"></div>
              </div>
            ) : (
              <>
                {(() => {
                  const clinicaId = user?.clinica_id || user?.id;
                  // TODOS os fechamentos, não só aprovados
                  const fechamentosClinica = fechamentos.filter(f => f.clinica_id === clinicaId);
                  const pacientesIds = fechamentosClinica.map(f => f.paciente_id);
                  const pacientesFechados = pacientes.filter(p => pacientesIds.includes(p.id) && p.status === 'fechado');
                  
                  return pacientesFechados.length === 0;
                })() ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 1rem', opacity: 0.3 }}>
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                    <p style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                      Nenhum {t.paciente.toLowerCase()} com fechamento
                    </p>
                    <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
                      Os pacientes aparecerão aqui quando tiverem um fechamento registrado na sua clínica.
                    </p>
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Nome</th>
                          <th style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>Telefone</th>
                          <th style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>{t.consultor}</th>
                          <th style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>Valor</th>
                          <th>Status</th>
                          <th style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>Documentação</th>
                          <th style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>Data</th>
                          <th style={{ width: '80px' }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const clinicaId = user?.clinica_id || user?.id;
                          // TODOS os fechamentos, não só aprovados
                          const fechamentosClinica = fechamentos.filter(f => f.clinica_id === clinicaId);
                          const pacientesIds = fechamentosClinica.map(f => f.paciente_id);
                          
                          return pacientes
                            .filter(p => pacientesIds.includes(p.id) && p.status === 'fechado')
                            .map(paciente => {
                              const totalDocs = 4;
                              const docsEnviados = [
                                paciente.selfie_doc_url,
                                paciente.documento_url,
                                paciente.comprovante_residencia_url,
                                paciente.contrato_servico_url
                              ].filter(Boolean).length;
                              const fechamentoPaciente = fechamentosClinica.find(f => f.paciente_id === paciente.id);
                              
                              // Determinar status do fechamento
                              let statusFechamento = fechamentoPaciente?.aprovado || 'documentacao_pendente';
                              if (docsEnviados < totalDocs && statusFechamento !== 'reprovado') {
                                statusFechamento = 'documentacao_pendente';
                              }
                              
                              const statusColors = {
                                'aprovado': { color: '#10b981', label: 'Aprovado' },
                                'reprovado': { color: '#ef4444', label: 'Reprovado' },
                                'documentacao_pendente': { color: '#f59e0b', label: 'Doc. Pendente' },
                                'pendente': { color: '#f59e0b', label: 'Pendente' }
                              };
                              const statusInfo = statusColors[statusFechamento] || statusColors['pendente'];
                              
                              return (
                            <tr key={paciente.id}>
                                <td>
                                  <strong>{paciente.nome}</strong>
                                </td>
                                <td style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>{formatarTelefone(paciente.telefone)}</td>
                                <td style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>
                                  {paciente.consultor_nome || (
                                    <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>
                                      Não atribuído
                                  </span>
                                )}
                              </td>
                                <td style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell'}}>
                                  {fechamentoPaciente?.valor_fechado ? (
                                    <div style={{ fontWeight: '700', color: '#059669', fontSize: '0.95rem' }}>
                                      {formatarMoeda(fechamentoPaciente.valor_fechado)}
                                    </div>
                                  ) : (
                                    <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>-</span>
                                  )}
                                </td>
                                <td>
                                  <span 
                                    className="badge"
                                    style={{
                                      backgroundColor: statusInfo.color + '20',
                                      color: statusInfo.color,
                                      fontWeight: '600',
                                      border: `1px solid ${statusInfo.color}`,
                                      padding: '0.25rem 0.5rem',
                                      borderRadius: '4px',
                                      fontSize: '0.75rem'
                                    }}
                                    title="Status de aprovação do fechamento pelo admin"
                                  >
                                    {statusInfo.label}
                                  </span>
                                </td>
                              <td style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
                                  <div style={{ 
                                    display: 'flex', 
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    width: '100%'
                                  }}>
                                    <div style={{ fontSize: '0.75rem', color: '#6b7280', whiteSpace: 'nowrap' }}>
                                      {docsEnviados}/{totalDocs}
                                    </div>
                                    <div style={{ 
                                      width: window.innerWidth <= 768 ? '80px' : '120px', 
                                      height: '6px', 
                                      backgroundColor: '#e5e7eb',
                                      borderRadius: '3px',
                                      overflow: 'hidden'
                                    }}>
                                      <div style={{ 
                                        width: `${(docsEnviados / totalDocs) * 100}%`,
                                        height: '100%',
                                        backgroundColor: docsEnviados === totalDocs ? '#10b981' : '#3b82f6',
                                        transition: 'width 0.3s ease'
                                      }} />
                                    </div>
                                    
                                    {docsEnviados === totalDocs ? (
                                      <span style={{ 
                                        fontSize: '0.7rem', 
                                        color: '#10b981', 
                                        fontWeight: '600',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem'
                                      }}>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                          <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                        Completo
                                      </span>
                                    ) : (
                                      <button
                                        onClick={() => handleView(paciente, 'documentos')}
                                        style={{
                                          background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                                          border: 'none',
                                          color: 'white',
                                          cursor: 'pointer',
                                          padding: '0.5rem 1rem',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '0.5rem',
                                          borderRadius: '8px',
                                          fontSize: '0.8rem',
                                          fontWeight: '600',
                                          boxShadow: '0 2px 8px rgba(5, 150, 105, 0.25)',
                                          transition: 'all 0.3s ease',
                                          whiteSpace: 'nowrap',
                                          minWidth: '90px',
                                          justifyContent: 'center'
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.transform = 'translateY(-2px)';
                                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(5, 150, 105, 0.35)';
                                          e.currentTarget.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.transform = 'translateY(0)';
                                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(5, 150, 105, 0.25)';
                                          e.currentTarget.style.background = 'linear-gradient(135deg, #059669 0%, #047857 100%)';
                                        }}
                                      >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                          <polyline points="17 8 12 3 7 8"></polyline>
                                          <line x1="12" y1="3" x2="12" y2="15"></line>
                                        </svg>
                                        Enviar
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td style={{ display: window.innerWidth <= 768 ? 'none' : 'table-cell' }}>
                                {fechamentoPaciente?.data_fechamento ? formatarData(fechamentoPaciente.data_fechamento) : formatarData(paciente.created_at)}
                              </td>
                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
                                  {/* Botão de visualizar - sempre visível */}
                                  <button
                                    className="btn-action"
                                    onClick={() => handleView(paciente)}
                                    title="Visualizar informações do paciente"
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '0.25rem'
                                    }}
                                  >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                      <circle cx="12" cy="12" r="3" />
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                              );
                            });
                        })()}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Conteúdo da aba Carteira Existente (apenas para clínicas, não para incorporadora) */}
      {activeTab === 'carteira-existente' && isClinica && !isIncorporadora && (
        <>
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 className="card-title">Carteira Existente</h2>
                  <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>
                    Cadastre pacientes da sua carteira existente para calcular antecipações
                  </p>
                </div>
                <button
                  onClick={() => setShowCarteiraModal(true)}
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.25)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.35)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.25)';
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Cadastrar {t.paciente}
                </button>
              </div>
            </div>
            <div className="card-content">
              {pacientes.filter(p => p.carteira_existente === true).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ marginBottom: '1rem', opacity: 0.5 }}>
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <path d="M9 9h6v6H9z"></path>
                  </svg>
                  <p>Nenhum {t.paciente.toLowerCase()} da carteira existente cadastrado</p>
                  <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                    Clique em "Cadastrar {t.paciente}" para começar
                  </p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Nome</th>
                        <th>CPF</th>
                        <th>Valor da Parcela</th>
                        <th>Parcelas em Aberto</th>
                        <th>1ª Vencimento</th>
                        <th>Parcelas a Antecipar</th>
                        <th>Valor Entregue</th>
                        <th>Deságio</th>
                        <th>Valor de Face</th>
                        <th>% Final</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pacientes.filter(p => p.carteira_existente === true).map(paciente => (
                        <tr key={paciente.id}>
                          <td><strong>{paciente.nome}</strong></td>
                          <td>{paciente.cpf}</td>
                          <td>{formatarMoeda(paciente.valor_parcela || 0)}</td>
                          <td>{paciente.numero_parcelas_aberto || 0}</td>
                          <td>{paciente.primeira_vencimento ? new Date(paciente.primeira_vencimento).toLocaleDateString('pt-BR') : '-'}</td>
                          <td>{paciente.numero_parcelas_antecipar || 0}</td>
                          <td>{formatarMoeda(paciente.valor_entregue_total || 0)}</td>
                          <td>{formatarMoeda(paciente.desagio_total || 0)}</td>
                          <td>{formatarMoeda(paciente.valor_face_total || 0)}</td>
                          <td>{paciente.percentual_final ? `${paciente.percentual_final.toFixed(2)}%` : '-'}</td>
                          <td>
                            <button
                              onClick={() => handleView(paciente)}
                              style={{
                                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                                border: 'none',
                                color: 'white',
                                cursor: 'pointer',
                                padding: '0.5rem',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: '600'
                              }}
                            >
                              Ver
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Seção de Solicitações Enviadas para Clínicas */}
          {solicitacoesCarteira.length > 0 && (
            <div className="card" style={{ marginTop: '1.5rem' }}>
              <div className="card-header">
                <div>
                  <h2 className="card-title">Suas Solicitações</h2>
                  <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>
                    Acompanhe o status das suas solicitações de carteira
                  </p>
                </div>
              </div>
              <div className="card-content">
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Data Solicitação</th>
                        <th>Pacientes</th>
                        <th>Valor Total</th>
                        <th>Status</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {solicitacoesCarteira.map(solicitacao => (
                        <tr key={solicitacao.id}>
                          <td>{new Date(solicitacao.created_at).toLocaleDateString('pt-BR')}</td>
                          <td>{solicitacao.pacientes_carteira?.length || 0}</td>
                          <td>{formatarMoeda(solicitacao.calculos?.valorFaceTotal || 0)}</td>
                          <td>
                            <span style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              backgroundColor: solicitacao.status === 'pendente' ? '#fef3c7' : 
                                             solicitacao.status === 'aprovado' ? '#d1fae5' : 
                                             solicitacao.status === 'reprovado' ? '#fee2e2' : '#f3f4f6',
                              color: solicitacao.status === 'pendente' ? '#92400e' : 
                                     solicitacao.status === 'aprovado' ? '#065f46' : 
                                     solicitacao.status === 'reprovado' ? '#991b1b' : '#374151'
                            }}>
                              {solicitacao.status === 'pendente' ? 'Em Análise' : 
                               solicitacao.status === 'aprovado' ? 'Aprovado' : 
                               solicitacao.status === 'reprovado' ? 'Reprovado' : solicitacao.status}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <button
                                onClick={() => {
                                  setSolicitacaoSelecionada(solicitacao);
                                  setShowSolicitacaoModal(true);
                                }}
                                style={{
                                  background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                                  border: 'none',
                                  color: 'white',
                                  cursor: 'pointer',
                                  padding: '0.5rem',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: '600'
                                }}
                              >
                                Ver Detalhes
                              </button>
                              {solicitacao.status === 'aprovado' && (
                                <button
                                  onClick={async () => {
                                    setSolicitacaoSelecionada(solicitacao);
                                    await fetchContratos(solicitacao.id);
                                    setShowContratosModal(true);
                                  }}
                                  style={{
                                    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                                    border: 'none',
                                    color: 'white',
                                    cursor: 'pointer',
                                    padding: '0.5rem',
                                    borderRadius: '6px',
                                    fontSize: '0.75rem',
                                    fontWeight: '600'
                                  }}
                                >
                                  📄 Enviar Contratos
                                </button>
                              )}
                              <button
                                onClick={() => deletarSolicitacao(solicitacao.id)}
                                style={{
                                  background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                                  border: 'none',
                                  color: 'white',
                                  cursor: 'pointer',
                                  padding: '0.5rem',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: '600'
                                }}
                              >
                                🗑️ Excluir
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Conteúdo da aba Carteira Existente para Admin - Visualizar solicitações */}
      {activeTab === 'carteira-existente' && isAdmin && (
        <>
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 className="card-title">Solicitações de Carteira Existente</h2>
                  <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>
                    Avalie e aprove solicitações de carteira das clínicas
                  </p>
                </div>
                {solicitacoesCarteira.filter(s => s.status === 'pendente').length > 0 && (
                  <div style={{
                    backgroundColor: '#fef2f2',
                    color: '#dc2626',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    fontWeight: '600'
                  }}>
                    {solicitacoesCarteira.filter(s => s.status === 'pendente').length} solicitaç{solicitacoesCarteira.filter(s => s.status === 'pendente').length > 1 ? 'ões' : 'ão'} pendente{solicitacoesCarteira.filter(s => s.status === 'pendente').length > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
            <div className="card-content">
              {solicitacoesCarteira.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ marginBottom: '1rem', opacity: 0.5 }}>
                    <path d="M9 11l3 3L22 4"></path>
                    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
                  </svg>
                  <p>Nenhuma solicitação de carteira encontrada</p>
                </div>
              ) : (
                <div className="table-container" style={{ width: '100%' }}>
                  <table className="table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '30%' }}>Clínica</th>
                        <th style={{ width: '12%' }}>Data Solicitação</th>
                        <th style={{ width: '8%' }}>Pacientes</th>
                        <th style={{ width: '15%' }}>Valor Total</th>
                        <th style={{ width: '10%' }}>Percentual</th>
                        <th style={{ width: '10%' }}>Status</th>
                        <th style={{ width: '15%' }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {solicitacoesCarteira.map(solicitacao => (
                        <tr key={solicitacao.id}>
                          <td>{solicitacao.clinica_nome}</td>
                          <td>{new Date(solicitacao.created_at).toLocaleDateString('pt-BR')}</td>
                          <td>{solicitacao.pacientes_carteira?.length || 0}</td>
                          <td>{formatarMoeda(solicitacao.calculos?.valorFaceTotal || 0)}</td>
                          <td>
                            <span style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              backgroundColor: solicitacao.calculos?.percentualFinal >= 130 ? '#f0fdf4' : '#fef2f2',
                              color: solicitacao.calculos?.percentualFinal >= 130 ? '#166534' : '#dc2626'
                            }}>
                              {solicitacao.calculos?.percentualFinal?.toFixed(2) || 0}%
                            </span>
                          </td>
                          <td>
                            <span style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              backgroundColor: 
                                solicitacao.status === 'pendente' ? '#fef3c7' : 
                                solicitacao.status === 'aprovado' ? '#f0fdf4' :
                                solicitacao.status === 'reprovado' ? '#fef2f2' : '#f3f4f6',
                              color: 
                                solicitacao.status === 'pendente' ? '#d97706' : 
                                solicitacao.status === 'aprovado' ? '#166534' :
                                solicitacao.status === 'reprovado' ? '#dc2626' : '#6b7280'
                            }}>
                              {solicitacao.status === 'pendente' ? 'Pendente' :
                               solicitacao.status === 'aprovado' ? 'Aprovado' :
                               solicitacao.status === 'reprovado' ? 'Reprovado' : 'Em Análise'}
                            </span>
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <button
                              onClick={() => {
                                setSolicitacaoSelecionada(solicitacao);
                                setShowSolicitacaoModal(true);
                              }}
                              style={{
                                background: '#3b82f6',
                                border: 'none',
                                color: 'white',
                                cursor: 'pointer',
                                padding: '6px 12px',
                                borderRadius: '4px',
                                fontSize: '14px',
                                marginRight: '8px'
                              }}
                            >
                              Analisar
                            </button>
                            <button
                              onClick={() => deletarSolicitacao(solicitacao.id)}
                              style={{
                                background: '#dc2626',
                                border: 'none',
                                color: 'white',
                                cursor: 'pointer',
                                padding: '6px 12px',
                                borderRadius: '4px',
                                fontSize: '14px'
                              }}
                            >
                              Excluir
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
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
                    WhatsApp (Celular) *
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
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    marginTop: '0.25rem',
                    fontStyle: 'italic'
                  }}>
                    Apenas número de celular (não aceita telefone fixo)
                  </div>
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
                  Cadastrar {t.paciente}
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
              <h2 className="modal-title">{empresaId === 5 ? 'Novo Cliente' : 'Novo Paciente'}</h2>
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
                  Cadastrar {t.paciente}
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
              <h2 className="modal-title">{empresaId === 5 ? 'Novo Cliente' : 'Novo Paciente'}</h2>
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
                  <label className="form-label">{empresaId === 5 ? 'Empreendimento *' : 'Tipo de Tratamento *'}</label>
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
                <label className="form-label">{empresaId === 5 ? 'Corretor Responsável' : 'Consultor Responsável'}</label>
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
              <h2 className="modal-title">{empresaId === 5 ? 'Editar Cliente' : 'Editar Paciente'}</h2>
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
                  <label className="form-label">{t.tipoTratamento} *</label>
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
                <label className="form-label">{empresaId === 5 ? 'Corretor Responsável' : 'Consultor Responsável'}</label>
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

      {/* Modal de visualização com abas */}
      {showViewModal && viewPaciente && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '1000px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2 className="modal-title">
                {isIncorporadora ? 'Cliente' : 'Paciente'}: {viewPaciente.nome}
              </h2>
              <button className="close-btn" onClick={closeViewModal}>×</button>
            </div>
            
            {/* Abas de Navegação */}
            <div style={{ 
              borderBottom: '1px solid #e5e7eb',
              padding: '0 1.5rem',
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch'
            }}>
              <div style={{ 
                display: 'flex', 
                gap: window.innerWidth <= 768 ? '0' : '2rem',
                minWidth: 'max-content'
              }}>
                <button
                  onClick={() => handleTabChange('informacoes')}
                  style={{
                    padding: window.innerWidth <= 768 ? '0.75rem 0.5rem' : '1rem 0',
                    border: 'none',
                    background: 'none',
                    fontSize: window.innerWidth <= 768 ? '0.75rem' : '0.875rem',
                    fontWeight: '500',
                    color: activeViewTab === 'informacoes' ? '#3b82f6' : '#6b7280',
                    borderBottom: activeViewTab === 'informacoes' ? '2px solid #3b82f6' : '2px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {isIncorporadora ? 'Informações do Cliente' : 'Informações do Paciente'}
                </button>
                
                {isClinica && (
                  <>
                    <button
                      onClick={() => handleTabChange('fechamento')}
                      style={{
                        padding: window.innerWidth <= 768 ? '0.75rem 0.5rem' : '1rem 0',
                        border: 'none',
                        background: 'none',
                        fontSize: window.innerWidth <= 768 ? '0.75rem' : '0.875rem',
                        fontWeight: '500',
                        color: activeViewTab === 'fechamento' ? '#3b82f6' : '#6b7280',
                        borderBottom: activeViewTab === 'fechamento' ? '2px solid #3b82f6' : '2px solid transparent',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Fechamento
                    </button>

                    <button
                      onClick={() => handleTabChange('parcelamento')}
                      style={{
                        padding: window.innerWidth <= 768 ? '0.75rem 0.5rem' : '1rem 0',
                        border: 'none',
                        background: 'none',
                        fontSize: window.innerWidth <= 768 ? '0.75rem' : '0.875rem',
                        fontWeight: '500',
                        color: activeViewTab === 'parcelamento' ? '#3b82f6' : '#6b7280',
                        borderBottom: activeViewTab === 'parcelamento' ? '2px solid #3b82f6' : '2px solid transparent',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Parcelamento
                    </button>
                    
                    <button
                      onClick={() => handleTabChange('documentos')}
                      style={{
                        padding: window.innerWidth <= 768 ? '0.75rem 0.5rem' : '1rem 0',
                        border: 'none',
                        background: 'none',
                        fontSize: window.innerWidth <= 768 ? '0.75rem' : '0.875rem',
                        fontWeight: '500',
                        color: activeViewTab === 'documentos' ? '#3b82f6' : '#6b7280',
                        borderBottom: activeViewTab === 'documentos' ? '2px solid #3b82f6' : '2px solid transparent',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Documentos
                    </button>
                    
                  </>
                )}
                
                {!isClinica && (
                  <button
                    onClick={() => handleTabChange('evidencias')}
                    style={{
                      padding: window.innerWidth <= 768 ? '0.75rem 0.5rem' : '1rem 0',
                      border: 'none',
                      background: 'none',
                      fontSize: window.innerWidth <= 768 ? '0.75rem' : '0.875rem',
                      fontWeight: '500',
                      color: activeViewTab === 'evidencias' ? '#3b82f6' : '#6b7280',
                      borderBottom: activeViewTab === 'evidencias' ? '2px solid #3b82f6' : '2px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    Evidências
                    {evidenciasPaciente.length > 0 && (
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
                        {evidenciasPaciente.length}
                      </span>
                    )}
                  </button>
                )}
              </div>
            </div>
            
            <div style={{ padding: '1.5rem' }}>
              {/* Aba de Informações do Paciente */}
              {activeViewTab === 'informacoes' && (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div>
                    <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Nome Completo</label>
                    <p style={{ margin: '0.25rem 0 0 0', color: '#1f2937' }}>{viewPaciente.nome}</p>
              </div>
                  
              <div className="grid grid-2">
                    <div>
                      <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Telefone</label>
                      <p style={{ margin: '0.25rem 0 0 0', color: '#1f2937' }}>{formatarTelefone(viewPaciente.telefone) || '-'}</p>
                </div>
                    
                    <div>
                      <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>CPF</label>
                      <p style={{ margin: '0.25rem 0 0 0', color: '#1f2937', fontFamily: 'monospace' }}>{formatarCPF(viewPaciente.cpf) || '-'}</p>
                </div>
              </div>

                  <div className="grid grid-2">
                    <div>
                      <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Cidade</label>
                      <p style={{ margin: '0.25rem 0 0 0', color: '#1f2937' }}>{viewPaciente.cidade || '-'}</p>
                    </div>
                    
                    <div>
                      <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Estado</label>
                      <p style={{ margin: '0.25rem 0 0 0', color: '#1f2937' }}>{viewPaciente.estado || '-'}</p>
                    </div>
              </div>

              <div className="grid grid-2">
                    <div>
                      <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>
                        {isIncorporadora ? 'Empreendimento Desejado' : 'Tipo de Tratamento'}
                      </label>
                      <p style={{ margin: '0.25rem 0 0 0', color: '#1f2937' }}>
        {isIncorporadora ? (
          // Para incorporadora, mostrar empreendimento (mapeamento hardcoded)
          viewPaciente.empreendimento_id ? (
            (() => {
              const empreendimentoMap = {
                4: 'Laguna Sky Garden',
                5: 'Residencial Girassol',
                6: 'Sintropia Sky Garden',
                7: 'Residencial Lotus',
                8: 'River Sky Garden',
                9: 'Condomínio Figueira Garcia'
              };
              return empreendimentoMap[viewPaciente.empreendimento_id] || '-';
            })()
          ) : '-'
        ) : (
                          // Para clínicas, mostrar tipo de tratamento
                          viewPaciente.tipo_tratamento ? (
                            <span className={`badge badge-${viewPaciente.tipo_tratamento === 'Estético' ? 'info' : 'warning'}`}>
                              {viewPaciente.tipo_tratamento === 'estetico' ? 'Estético' : 
                               viewPaciente.tipo_tratamento === 'odontologico' ? 'Odontológico' : 
                               viewPaciente.tipo_tratamento === 'ambos' ? 'Ambos' :
                               viewPaciente.tipo_tratamento}
                            </span>
                          ) : '-'
                        )}
                      </p>
                </div>
                    
                    <div>
                      <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>
                        {isIncorporadora ? 'Status do Cliente' : 'Status do Paciente'}
                      </label>
                      <p style={{ margin: '0.25rem 0 0 0', color: '#1f2937' }}>
                        {viewPaciente.status && (
                          <span 
                            className="badge"
                            style={{
                              backgroundColor: getStatusInfo(viewPaciente.status).color + '20',
                              color: getStatusInfo(viewPaciente.status).color,
                              fontWeight: '600',
                              borderRadius: '0.375rem'
                            }}
                          >
                            {getStatusInfo(viewPaciente.status).label}
                          </span>
                        )}
                      </p>
                </div>
              </div>

              {!isIncorporadora && (
                <div className="grid grid-2">
                  <div>
                    <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Tratamento Específico</label>
                    <p style={{ margin: '0.25rem 0 0 0', color: '#1f2937' }}>{viewPaciente.tratamento_especifico || '-'}</p>
                  </div>
                  
                  <div>
                    <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Grau de Parentesco de Quem Indicou</label>
                    <p style={{ margin: '0.25rem 0 0 0', color: '#1f2937' }}>{viewPaciente.grau_parentesco || '-'}</p>
                  </div>
                </div>
              )}
              
              {isIncorporadora && (
                <div>
                  <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Grau de Parentesco de Quem Indicou</label>
                  <p style={{ margin: '0.25rem 0 0 0', color: '#1f2937' }}>{viewPaciente.grau_parentesco || '-'}</p>
                </div>
              )}
                  
                  <div>
                    <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Responsável</label>
                    <p style={{ margin: '0.25rem 0 0 0', color: '#1f2937' }}>
                      {consultores.find(c => String(c.id) === String(viewPaciente.consultor_id))?.nome || (
                        <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Não atribuído</span>
                      )}
                    </p>
              </div>
                  
                  {viewPaciente.observacoes && (
                    <div>
                      <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Observações</label>
                      <div style={{ 
                        margin: '0.5rem 0 0 0', 
                        padding: '0.75rem',
                        backgroundColor: '#f9fafb',
                        borderRadius: '6px',
                        border: '1px solid #e5e7eb',
                        color: '#374151',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {viewPaciente.observacoes}
              </div>
              </div>
                  )}
                  
                  <div>
                    <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Data de Cadastro</label>
                    <p style={{ margin: '0.25rem 0 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
                      {viewPaciente.created_at ? formatarData(viewPaciente.created_at) : '-'}
                    </p>
            </div>
                </div>
              )}
              
              {/* Aba de Fechamento (apenas para clínicas) */}
              {activeViewTab === 'fechamento' && isClinica && (
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
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Dados do Fechamento
                  </h3>
                  
                  {(() => {
                    const clinicaId = user?.clinica_id || user?.id;
                    const fechamentoPaciente = fechamentos.find(f => f.paciente_id === viewPaciente.id && f.clinica_id === clinicaId);
                    
                    if (!fechamentoPaciente) {
                      return (
                        <div style={{
                          padding: '2rem',
                          textAlign: 'center',
                          backgroundColor: '#fef2f2',
                          borderRadius: '8px',
                          border: '1px solid #fecaca'
                        }}>
                          <div style={{ color: '#dc2626', fontSize: '0.875rem' }}>
                            Nenhum fechamento encontrado para este paciente nesta clínica
                          </div>
                        </div>
                      );
                    }
                    
                    const totalDocs = 4;
                    const docsEnviados = [
                      viewPaciente.selfie_doc_url,
                      viewPaciente.documento_url,
                      viewPaciente.comprovante_residencia_url,
                      viewPaciente.contrato_servico_url
                    ].filter(Boolean).length;
                    
                    let statusFechamento = fechamentoPaciente.aprovado || 'documentacao_pendente';
                    if (docsEnviados < totalDocs && statusFechamento !== 'reprovado') {
                      statusFechamento = 'documentacao_pendente';
                    }
                    
                    const statusColors = {
                      'aprovado': { color: '#10b981', label: 'Aprovado' },
                      'reprovado': { color: '#ef4444', label: 'Reprovado' },
                      'documentacao_pendente': { color: '#f59e0b', label: 'Doc. Pendente' },
                      'pendente': { color: '#f59e0b', label: 'Pendente' }
                    };
                    const statusInfo = statusColors[statusFechamento] || statusColors['pendente'];
                    
                    return (
                      <div style={{ display: 'grid', gap: '1rem' }}>
                        <div>
                          <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Valor do Fechamento</label>
                          <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.5rem', fontWeight: '700', color: '#059669' }}>
                            {formatarMoeda(fechamentoPaciente.valor_fechado)}
                          </p>
                        </div>
                        
                        <div>
                          <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Status de Aprovação</label>
                          <p style={{ margin: '0.5rem 0 0 0' }}>
                            <span 
                              className="badge"
                              style={{
                                backgroundColor: statusInfo.color + '20',
                                color: statusInfo.color,
                                fontWeight: '600',
                                border: `1px solid ${statusInfo.color}`,
                                padding: '0.5rem 1rem',
                                borderRadius: '6px',
                                fontSize: '0.95rem'
                              }}
                            >
                              {statusInfo.label}
                            </span>
                          </p>
                        </div>
                        
                        <div className="grid grid-2">
                          <div>
                            <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Data do Fechamento</label>
                            <p style={{ margin: '0.25rem 0 0 0', color: '#1f2937' }}>
                              {formatarData(fechamentoPaciente.data_fechamento)}
                            </p>
                          </div>
                          
                          <div>
                            <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>{t.tipoTratamento}</label>
                            <p style={{ margin: '0.25rem 0 0 0', color: '#1f2937' }}>
                              {fechamentoPaciente.tipo_tratamento || 'Não informado'}
                            </p>
                          </div>
                        </div>
                        
                        {fechamentoPaciente.observacoes && (
                          <div>
                            <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Observações do Fechamento</label>
                            <div style={{ 
                              margin: '0.5rem 0 0 0', 
                              padding: '0.75rem',
                              backgroundColor: '#f9fafb',
                              borderRadius: '6px',
                              border: '1px solid #e5e7eb',
                              color: '#374151',
                              whiteSpace: 'pre-wrap'
                            }}>
                              {fechamentoPaciente.observacoes}
          </div>
        </div>
      )}

                        {/* Contrato do Fechamento */}
                        <div style={{ 
                          marginTop: '1rem',
                          padding: '1rem',
                          backgroundColor: fechamentoPaciente.contrato_arquivo ? '#f0fdf4' : '#fef2f2',
                          borderRadius: '8px',
                          border: fechamentoPaciente.contrato_arquivo ? '1px solid #86efac' : '1px solid #fecaca'
                        }}>
                          <label style={{ 
                            fontWeight: '600', 
                            color: fechamentoPaciente.contrato_arquivo ? '#065f46' : '#dc2626', 
                            fontSize: '0.875rem', 
                            marginBottom: '0.75rem', 
                            display: 'block' 
                          }}>
                            Contrato do Fechamento
                          </label>
                          {fechamentoPaciente.contrato_arquivo ? (
                            <>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#059669' }}>
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                  <polyline points="14,2 14,8 20,8"></polyline>
                                </svg>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: '600', color: '#065f46', fontSize: '0.875rem' }}>
                                    {fechamentoPaciente.contrato_nome_original || 'contrato.pdf'}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: '#059669' }}>
                                    ✓ Contrato disponível
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => downloadContrato(fechamentoPaciente)}
                                className="btn btn-primary"
                                style={{ 
                                  display: 'inline-flex', 
                                  alignItems: 'center', 
                                  gap: '0.5rem',
                                  padding: '0.5rem 1rem'
                                }}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                                Visualizar Contrato
                              </button>
                            </>
                          ) : (
                            <div style={{ textAlign: 'center', padding: '1rem' }}>
                              <div style={{ color: '#dc2626', fontSize: '0.875rem' }}>
                                Nenhum contrato anexado a este fechamento
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
              
              {/* Aba de Documentos (apenas para clínicas) */}
              {activeViewTab === 'documentos' && isClinica && (
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
                  
                  {(() => {
                    const documentos = [
                      { key: 'selfie_doc_url', label: '1. Selfie com Documento', required: true },
                      { key: 'documento_url', label: '2. Documento (RG/CNH)', required: true },
                      { key: 'comprovante_residencia_url', label: '3. Comprovante de Residência', required: true },
                      { key: 'contrato_servico_url', label: '4. Contrato de Serviço', required: true }
                    ];
                    
                    const totalDocs = 4;
                    const docsEnviados = documentos.filter(doc => viewPaciente[doc.key]).length;
                    
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
                          gridTemplateColumns: 'repeat(2, 1fr)',
                          gap: '1rem'
                        }}>
                          {documentos.map(doc => {
                            const docEnviado = viewPaciente[doc.key];
                            const docKey = doc.key.replace('_url', '');
                            const aprovadoStatus = viewPaciente[`${docKey}_aprovado`];
                            
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
                                  {docEnviado && (
                                    <button 
                                      className="btn btn-sm btn-secondary" 
                                      style={{ 
                                        fontSize: '0.75rem', 
                                        padding: '0.5rem',
                                        justifyContent: 'center'
                                      }}
                                      onClick={() => window.open(viewPaciente[doc.key], '_blank')}
                                    >
                                      Visualizar
                                    </button>
                                  )}
                                  
                                  {/* Botão de upload (clínicas) */}
                                  {isClinica && (
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
                                        onChange={(e) => handleUploadDocumentoPaciente(e, viewPaciente.id, docKey)}
                                        disabled={uploadingDocs[docKey]}
                                      />
                                      {uploadingDocs[docKey] ? 'Enviando...' : (docEnviado ? 'Substituir' : 'Enviar Documento')}
                                    </label>
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
              )}
              
              {/* Aba de Parcelamento (apenas para clínicas) */}
              {activeViewTab === 'parcelamento' && isClinica && (
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
                  
                  {(() => {
                    const fechamentoPaciente = fechamentos.find(f => f.paciente_id === viewPaciente.id);
                    
                    if (!fechamentoPaciente) {
                      return (
                        <div style={{
                          padding: '2rem',
                          textAlign: 'center',
                          backgroundColor: '#fef2f2',
                          borderRadius: '8px',
                          border: '1px solid #fecaca'
                        }}>
                          <div style={{ color: '#dc2626', fontSize: '0.875rem' }}>
                            Nenhum fechamento encontrado para este paciente
                          </div>
                        </div>
                      );
                    }
                    
                    return (
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
                            {fechamentoPaciente.valor_parcela ? 
                              `R$ ${parseFloat(fechamentoPaciente.valor_parcela).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 
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
                            {fechamentoPaciente.numero_parcelas || 'Não informado'}
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
                            {fechamentoPaciente.vencimento ? 
                              new Date(fechamentoPaciente.vencimento).toLocaleDateString('pt-BR') : 
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
                            {fechamentoPaciente.antecipacao_meses ? 
                              `${fechamentoPaciente.antecipacao_meses} meses` : 
                              'Não informado'
                            }
                          </div>
                        </div>
                        
                        {/* Resumo do parcelamento */}
                        {fechamentoPaciente.valor_parcela && fechamentoPaciente.numero_parcelas && (
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
                              <div>Valor total: <strong>R$ {parseFloat(fechamentoPaciente.valor_fechado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div>
                              <div>Parcelas: <strong>{fechamentoPaciente.numero_parcelas}x de R$ {parseFloat(fechamentoPaciente.valor_parcela).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div>
                              {fechamentoPaciente.vencimento && (
                                <div>Primeira parcela: <strong>{new Date(fechamentoPaciente.vencimento).toLocaleDateString('pt-BR')}</strong></div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
              
              {/* Aba de Evidências */}
              {activeViewTab === 'evidencias' && !isClinica && (
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
                  
                  {evidenciasPaciente.length === 0 ? (
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
                      {evidenciasPaciente.map((evidencia) => (
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
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <button 
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeViewModal}
                >
                  Fechar
                </button>
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
                {isIncorporadora ? 'Cliente' : 'Paciente'}: {pacienteObservacoes?.nome || 'Detalhes'}
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
              
                {!isClinica && (
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
                  {evidenciasPaciente.length > 0 && (
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
                      {evidenciasPaciente.length}
                    </span>
                  )}
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
              {activeObservacoesTab === 'evidencias' && !isClinica && (
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
                  
                  {evidenciasPaciente.length === 0 ? (
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
                      {evidenciasPaciente.map((evidencia, index) => (
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
                  setEvidenciasPaciente([]);
                  setPacienteObservacoes(null);
                }}
                >
                  Fechar
                </button>
              </div>
            </div>
        </div>
      )}

      {/* Modal de Cadastro/Edição para Clínicas com Upload de Documentos */}
      {showModal && isClinica && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '900px', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingPaciente ? (empresaId === 5 ? 'Editar Cliente' : 'Editar Paciente') : (empresaId === 5 ? 'Cadastrar Novo Cliente' : 'Cadastrar Novo Paciente')}
              </h2>
              <button className="close-btn" onClick={resetForm}>×</button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '2rem' }}>
              {/* Dados básicos */}
              <h3 style={{ marginBottom: '1rem', color: '#1e293b' }}>Dados Básicos</h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '1.5rem',
                marginBottom: '2rem'
              }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem' }}>
                    Nome do Paciente *
                  </label>
                  <input
                    type="text"
                    name="nome"
                    value={formData.nome}
                    onChange={handleInputChange}
                    placeholder="Digite o nome completo"
                    required
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '10px',
                      fontSize: '1rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem' }}>
                    Telefone/WhatsApp *
                  </label>
                  <input
                    type="text"
                    name="telefone"
                    value={formData.telefone}
                    onChange={handleInputChange}
                    placeholder="(00) 00000-0000"
                    required
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '10px',
                      fontSize: '1rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem' }}>
                    CPF *
                  </label>
                  <input
                    type="text"
                    name="cpf"
                    value={formData.cpf}
                    onChange={handleInputChange}
                    placeholder="000.000.000-00"
                    required
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '10px',
                      fontSize: '1rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem' }}>
                    Cidade
                  </label>
                  <input
                    type="text"
                    name="cidade"
                    value={formData.cidade}
                    onChange={handleInputChange}
                    placeholder="Digite a cidade"
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '10px',
                      fontSize: '1rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem' }}>
                    Estado
                  </label>
                  <input
                    type="text"
                    name="estado"
                    value={formData.estado}
                    onChange={handleInputChange}
                    placeholder="UF"
                    maxLength="2"
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '10px',
                      fontSize: '1rem',
                      textTransform: 'uppercase'
                    }}
                  />
                </div>

                <div>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem' }}>
                    {t.tipoTratamento}
                  </label>
                  <select
                    name="tipo_tratamento"
                    value={formData.tipo_tratamento}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '10px',
                      fontSize: '1rem'
                    }}
                  >
                    <option value="">Selecione</option>
                    <option value="Estético">Estético</option>
                    <option value="Odontológico">Odontológico</option>
                  </select>
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem' }}>
                    Observações
                  </label>
                  <textarea
                    name="observacoes"
                    value={formData.observacoes}
                    onChange={handleInputChange}
                    placeholder="Adicione observações sobre o paciente"
                    rows="3"
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '10px',
                      fontSize: '1rem',
                      resize: 'vertical'
                    }}
                  />
                </div>
              </div>

              {/* Upload de Documentos */}
              <h3 style={{ 
                marginBottom: '1rem', 
                color: '#1e293b', 
                borderTop: '1px solid #e5e7eb', 
                paddingTop: '2rem',
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
                Upload de Documentos do Paciente
                  </h3>
              
              {editingPaciente && (
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
                        Status da Documentação
                      </h4>
                      <p style={{ fontSize: '0.75rem', color: '#3730a3', margin: '0.25rem 0 0 0' }}>
                        {(() => {
                          const totalDocs = 5;
                          const docsEnviados = [
                            editingPaciente.selfie_doc_url,
                            editingPaciente.documento_url,
                            editingPaciente.comprovante_residencia_url,
                            editingPaciente.contrato_servico_url,
                          ].filter(Boolean).length;
                          
                          return `${docsEnviados} de ${totalDocs} documentos enviados`;
                        })()}
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
                        width: `${(() => {
                          const totalDocs = 5;
                          const docsEnviados = [
                            editingPaciente.selfie_doc_url,
                            editingPaciente.documento_url,
                            editingPaciente.comprovante_residencia_url,
                            editingPaciente.contrato_servico_url,
                          ].filter(Boolean).length;
                          return (docsEnviados / totalDocs) * 100;
                        })()}%`,
                        height: '100%',
                        backgroundColor: '#3b82f6',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>
                </div>
              )}
              
              <div className="alert alert-info" style={{ marginBottom: '1.5rem', backgroundColor: '#eff6ff', border: '1px solid #3b82f6', borderRadius: '8px', padding: '1rem' }}>
                <strong style={{ color: '#1e40af' }}>Importante:</strong>
                <p style={{ margin: '0.5rem 0 0 0', color: '#1e40af', fontSize: '0.875rem' }}>
                  {editingPaciente 
                    ? 'Faça upload dos documentos necessários. Formatos aceitos: Imagens (JPG, PNG) ou PDF.'
                    : 'Você pode adicionar os documentos agora ou editá-los posteriormente. Formatos aceitos: Imagens (JPG, PNG) ou PDF.'
                  }
                </p>
              </div>
              
                  <div style={{
                    display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '1.5rem',
                    marginBottom: '2rem'
                  }}>
                    {/* Campo de upload para cada tipo de documento */}
                    {[
                  { key: 'selfie_doc', label: 'Selfie com Documento' },
                  { key: 'documento', label: 'Documento (RG/CNH)' },
                  { key: 'comprovante_residencia', label: 'Comprovante de Residência' },
                  { key: 'contrato_servico', label: 'Contrato de Serviço' },
                    ].map(doc => (
                  <div key={doc.key} style={{
                    padding: '1rem',
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    border: editingPaciente?.[`${doc.key}_url`] ? '2px solid #10b981' : '2px solid #e2e8f0'
                  }}>
                    <label style={{ 
                      display: 'block', 
                      fontWeight: '600', 
                      marginBottom: '0.75rem',
                      color: '#1e293b',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <span style={{ fontSize: '1.25rem' }}>{doc.icon}</span>
                      {doc.label}
                      {doc.required && <span style={{ color: '#ef4444', fontSize: '0.875rem' }}>*</span>}
                        </label>
                    
                    {editingPaciente?.[`${doc.key}_url`] ? (
                      <div>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.5rem',
                          marginBottom: '0.5rem',
                          padding: '0.5rem',
                          backgroundColor: '#ecfdf5',
                          borderRadius: '6px'
                        }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          <span style={{ fontSize: '0.875rem', color: '#059669', fontWeight: '500' }}>
                            Documento enviado
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => window.open(editingPaciente[`${doc.key}_url`], '_blank')}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem'
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                          Visualizar
                        </button>
                      </div>
                    ) : (
                        <input
                          type="file"
                          accept={doc.key === 'contrato_servico' ? '.pdf' : 'image/*,.pdf'}
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              // Aqui você implementaria o upload
                              console.log(`Upload de ${doc.label}:`, file);
                            showSuccessToast(`${doc.label} selecionado: ${file.name}`);
                            }
                          }}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            border: '2px solid #e2e8f0',
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                          cursor: 'pointer'
                          }}
                        />
                        )}
                      </div>
                    ))}
                  </div>

              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                gap: '1rem',
                borderTop: '1px solid #e5e7eb',
                paddingTop: '1.5rem'
              }}>
                <button
                  type="button"
                  onClick={resetForm}
                  style={{
                    padding: '0.875rem 2rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '10px',
                    backgroundColor: '#fff',
                    color: '#64748b',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.875rem 2rem',
                    border: 'none',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: '#fff',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {editingPaciente ? 'Salvar Alterações' : `Cadastrar ${t.paciente}`}
                </button>
              </div>
            </form>
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
                  <strong>{empresaId === 5 ? 'Cliente' : 'Paciente'}:</strong> {pacienteParaAgendar?.nome}
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
                <label className="form-label">{isIncorporadora ? 'Empreendimento *' : 'Clínica *'}</label>
                <select 
                  className="form-select"
                  value={agendamentoData.clinica_id}
                  onChange={(e) => setAgendamentoData({...agendamentoData, clinica_id: e.target.value})}
                >
                  <option value="">{isIncorporadora ? 'Selecione um empreendimento' : 'Selecione uma clínica'}</option>
                  {isIncorporadora ? (
                    // Para incorporadora, mostrar empreendimentos hardcoded
                    <>
                      <option value="4">Laguna Sky Garden</option>
                      <option value="5">Residencial Girassol</option>
                      <option value="6">Sintropia Sky Garden</option>
                      <option value="7">Residencial Lotus</option>
                      <option value="8">River Sky Garden</option>
                      <option value="9">Condomínio Figueira Garcia</option>
                    </>
                  ) : (
                    // Para outras empresas, mostrar clínicas
                    clinicas.map(c => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))
                  )}
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

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">{isIncorporadora ? 'Qual corretor será responsável?' : 'Qual consultor será responsável?'}</label>
                <select 
                  className="form-select"
                  value={agendamentoData.consultor_interno_id || ''}
                  onChange={(e) => setAgendamentoData({...agendamentoData, consultor_interno_id: e.target.value})}
                >
                  <option value="">{isIncorporadora ? 'Selecione um corretor' : 'Selecione um consultor'}</option>
                  {consultores.filter(consultor => !consultor.is_freelancer).map(consultor => (
                    <option key={consultor.id} value={consultor.id}>
                      {consultor.nome}
                    </option>
                  ))}
                </select>
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
          <div className="modal" style={{ maxWidth: '800px' }}>
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
                  <strong>{empresaId === 5 ? 'Cliente' : 'Paciente'}:</strong> {pacienteParaFechar?.nome}
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
                <label className="form-label">{user?.empresa_id === 5 ? 'Empreendimento *' : 'Clínica *'}</label>
                <select 
                  className="form-select"
                  value={clinicaFechamento}
                  onChange={(e) => setClinicaFechamento(e.target.value)}
                >
                  <option value="">{user?.empresa_id === 5 ? 'Selecione um empreendimento' : 'Selecione uma clínica'}</option>
                  {user?.empresa_id === 5 ? (
                    // Para incorporadora, mostrar empreendimentos hardcoded
                    <>
                      <option value="4">Laguna Sky Garden</option>
                      <option value="5">Residencial Girassol</option>
                      <option value="6">Sintropia Sky Garden</option>
                      <option value="7">Residencial Lotus</option>
                      <option value="8">River Sky Garden</option>
                      <option value="9">Condomínio Figueira Garcia</option>
                    </>
                  ) : (
                    // Para outras empresas, mostrar clínicas
                    clinicas.map(c => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))
                  )}
                </select>
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
                {user?.empresa_id !== 5 && (
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
                )}

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

              {/* Seção de Dados Administrativos - Apenas Admin/Consultor Interno e não incorporadora */}
              {(isAdmin || isConsultorInterno) && user?.empresa_id !== 5 && (
                <div style={{ 
                  border: '1px solid #3b82f6', 
                  borderRadius: '8px', 
                  padding: '1rem', 
                  marginBottom: '1rem',
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
                  </h4>
                  
                  <div className="grid grid-2" style={{ gap: '1rem', marginBottom: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Data da Operação</label>
                      <input 
                        type="date"
                        className="form-input"
                        value={dataOperacaoFechamento}
                        onChange={(e) => setDataOperacaoFechamento(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Tipo</label>
                      <select 
                        className="form-select"
                        value={tipoOperacao}
                        onChange={(e) => setTipoOperacao(e.target.value)}
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
                      value={valorEntregueFormatado}
                      onChange={handleValorEntregueChange}
                      placeholder="R$ 0,00"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Print de Confirmação com Sacado</label>
                    <input 
                      type="file"
                      className="form-input"
                      accept="image/*,.pdf"
                      onChange={(e) => setPrintConfirmacao(e.target.files[0])}
                    />
                    {printConfirmacao && (
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
                        {printConfirmacao.name}
                      </div>
                    )}
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
                  disabled={salvandoFechamento || !valorFechamento || !clinicaFechamento}
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

      {/* Modal de Evidência de Status */}
      <ModalEvidencia
        isOpen={showEvidenciaModal}
        onClose={handleEvidenciaClose}
        onSuccess={handleEvidenciaSuccess}
        tipo="paciente"
        registroId={evidenciaData.pacienteId}
        statusAnterior={evidenciaData.statusAnterior}
        statusNovo={evidenciaData.statusNovo}
        nomeRegistro={evidenciaData.pacienteNome}
        empresaId={empresaId}
      />

      {/* Modal de Cadastro Completo para Clínicas */}
      {showCadastroCompletoModal && isClinica && (
        <div className="modal-overlay">
          <div className="modal" style={{ 
            maxWidth: window.innerWidth <= 768 ? '95vw' : '1000px', 
            width: window.innerWidth <= 768 ? '95vw' : 'auto',
            maxHeight: '95vh', 
            overflow: 'auto',
            margin: window.innerWidth <= 768 ? '10px' : 'auto'
          }}>
            <div className="modal-header">
              <h2 className="modal-title">Cadastrar {t.paciente}</h2>
              <button className="close-btn" onClick={resetCadastroCompleto}>×</button>
            </div>

            <div style={{ padding: '2rem' }}>
              {/* Seção 1: Informações do Paciente */}
              <div style={{ 
                marginBottom: '2rem', 
                padding: '1.5rem', 
                backgroundColor: '#f8fafc', 
                borderRadius: '12px',
                border: '1px solid #e2e8f0'
              }}>
                <h3 style={{ 
                  fontSize: '1.25rem', 
                  fontWeight: '700', 
                  color: '#1e293b', 
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  Dados do Paciente
                </h3>
                
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '1.5rem',
                  maxWidth: '600px',
                  margin: '0 auto'
                }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      name="nome"
                      value={dadosCompletosClinica.nome}
                      onChange={handleInputChangeCadastroCompleto}
                      onBlur={handleNomeBlurCompleto}
                      placeholder="Digite o nome completo do paciente"
                      required
                      style={{
                        width: '100%',
                        padding: '0.875rem',
                        border: '2px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                      Telefone/WhatsApp *
                    </label>
                    <input
                      type="tel"
                      name="telefone"
                      value={dadosCompletosClinica.telefone}
                      onChange={handleInputChangeCadastroCompleto}
                      placeholder="(11) 99999-9999"
                      required
                      style={{
                        width: '100%',
                        padding: '0.875rem',
                        border: '2px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                      CPF *
                    </label>
                    <input
                      type="text"
                      name="cpf"
                      value={dadosCompletosClinica.cpf}
                      onChange={handleInputChangeCadastroCompleto}
                      placeholder="000.000.000-00"
                      required
                      maxLength="14"
                      style={{
                        width: '100%',
                        padding: '0.875rem',
                        border: '2px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                      Estado *
                    </label>
                    <select
                      name="estado"
                      value={dadosCompletosClinica.estado}
                      onChange={handleInputChangeCadastroCompleto}
                      required
                      style={{
                        width: '100%',
                        padding: '0.875rem',
                        border: '2px solid #e2e8f0',
                        borderRadius: '8px',
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

                  <div>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                      Cidade *
                    </label>
                    {dadosCompletosClinica.estado && cidadesPorEstado[dadosCompletosClinica.estado] && !cidadeCustomizada ? (
                      <select
                        name="cidade"
                        value={dadosCompletosClinica.cidade}
                        onChange={(e) => {
                          if (e.target.value === 'OUTRA') {
                            setCidadeCustomizada(true);
                            setDadosCompletosClinica(prev => ({ ...prev, cidade: '' }));
                          } else {
                            handleInputChangeCadastroCompleto(e);
                          }
                        }}
                        required
                        style={{
                          width: '100%',
                          padding: '0.875rem',
                          border: '2px solid #e2e8f0',
                          borderRadius: '8px',
                          fontSize: '1rem',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="">Selecione a cidade</option>
                        {cidadesPorEstado[dadosCompletosClinica.estado].map(cidade => (
                          <option key={cidade} value={cidade}>{cidade}</option>
                        ))}
                        <option value="OUTRA">Outra cidade</option>
                      </select>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input
                          type="text"
                          name="cidade"
                          value={dadosCompletosClinica.cidade}
                          onChange={handleInputChangeCadastroCompleto}
                          placeholder="Digite o nome da cidade"
                          disabled={!dadosCompletosClinica.estado}
                          required
                          style={{
                            flex: 1,
                            padding: '0.875rem',
                            border: '2px solid #e2e8f0',
                            borderRadius: '8px',
                            fontSize: '1rem',
                            outline: 'none'
                          }}
                        />
                        {dadosCompletosClinica.estado && cidadesPorEstado[dadosCompletosClinica.estado] && cidadeCustomizada && (
                          <button
                            type="button"
                            onClick={() => {
                              setCidadeCustomizada(false);
                              setDadosCompletosClinica(prev => ({ ...prev, cidade: '' }));
                            }}
                            style={{
                              padding: '0.875rem 1rem',
                              background: '#e2e8f0',
                              color: '#1e293b',
                              border: 'none',
                              borderRadius: '8px',
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

                  <div>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                      {t.tipoTratamento} *
                    </label>
                    <select
                      name="tipo_tratamento"
                      value={dadosCompletosClinica.tipo_tratamento}
                      onChange={handleInputChangeCadastroCompleto}
                      required
                      style={{
                        width: '100%',
                        padding: '0.875rem',
                        border: '2px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="">Selecione</option>
                      <option value="Estético">Estético</option>
                      <option value="Odontológico">Odontológico</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                      Observações sobre o Paciente
                    </label>
                    <textarea
                      name="observacoes"
                      value={dadosCompletosClinica.observacoes}
                      onChange={handleInputChangeCadastroCompleto}
                      placeholder="Informações adicionais sobre o paciente..."
                      rows="3"
                      style={{
                        width: '100%',
                        padding: '0.875rem',
                        border: '2px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        outline: 'none',
                        resize: 'vertical',
                        fontFamily: 'inherit'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Seção 2: Dados do Fechamento */}
              <div style={{ 
                marginBottom: '2rem', 
                padding: '1.5rem', 
                backgroundColor: '#f0fdf4', 
                borderRadius: '12px',
                border: '1px solid #10b981'
              }}>
                <h3 style={{ 
                  fontSize: '1.25rem', 
                  fontWeight: '700', 
                  color: '#065f46', 
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  Dados do Fechamento
                </h3>
                
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '1.5rem',
                  maxWidth: '600px',
                  margin: '0 auto'
                }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                      Valor do Fechamento *
                    </label>
                    <input
                      type="text"
                      name="valor_fechado_formatado"
                      value={dadosCompletosClinica.valor_fechado_formatado}
                      onChange={handleValorFechadoCompleto}
                      placeholder="R$ 0,00"
                      required
                      style={{
                        width: '100%',
                        padding: '0.875rem',
                        border: '2px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                      Data do Fechamento *
                    </label>
                    <input
                      type="date"
                      name="data_fechamento"
                      value={dadosCompletosClinica.data_fechamento}
                      onChange={handleInputChangeCadastroCompleto}
                      required
                      style={{
                        width: '100%',
                        padding: '0.875rem',
                        border: '2px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                      Contrato (PDF) *
                    </label>
                    <input
                      type="file"
                      name="contrato_arquivo"
                      onChange={handleInputChangeCadastroCompleto}
                      accept=".pdf"
                      required
                      style={{
                        width: '100%',
                        padding: '0.875rem',
                        border: '2px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    />
                    {dadosCompletosClinica.contrato_arquivo && (
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
                        {dadosCompletosClinica.contrato_arquivo.name}
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                      Observações do Fechamento
                    </label>
                    <textarea
                      name="observacoes_fechamento"
                      value={dadosCompletosClinica.observacoes_fechamento}
                      onChange={handleInputChangeCadastroCompleto}
                      placeholder="Informações sobre o fechamento..."
                      rows="3"
                      style={{
                        width: '100%',
                        padding: '0.875rem',
                        border: '2px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        outline: 'none',
                        resize: 'vertical',
                        fontFamily: 'inherit'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Seção 3: Dados do Parcelamento */}
              <div style={{ 
                marginBottom: '2rem', 
                padding: '1.5rem', 
                backgroundColor: '#fefce8', 
                borderRadius: '12px',
                border: '1px solid #facc15'
              }}>
                <h3 style={{ 
                  fontSize: '1.25rem', 
                  fontWeight: '700', 
                  color: '#a16207', 
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                    <line x1="8" y1="21" x2="16" y2="21"></line>
                    <line x1="12" y1="17" x2="12" y2="21"></line>
                  </svg>
                  Informações de Parcelamento
                </h3>
                
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '1.5rem',
                  maxWidth: '600px',
                  margin: '0 auto'
                }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                      Valor da Parcela *
                    </label>
                    <input
                      type="text"
                      name="valor_parcela_formatado"
                      value={dadosCompletosClinica.valor_parcela_formatado}
                      onChange={handleValorParcelaCompleto}
                      placeholder="R$ 0,00"
                      required
                      style={{
                        width: '100%',
                        padding: '0.875rem',
                        border: '2px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                      Número de Parcelas *
                    </label>
                    <input
                      type="number"
                      name="numero_parcelas"
                      value={dadosCompletosClinica.numero_parcelas}
                      onChange={handleInputChangeCadastroCompleto}
                      placeholder="Ex: 12"
                      min="1"
                      required
                      style={{
                        width: '100%',
                        padding: '0.875rem',
                        border: '2px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                      Dia do Vencimento *
                    </label>
                    <input
                      type="number"
                      name="vencimento"
                      value={dadosCompletosClinica.vencimento}
                      onChange={handleInputChangeCadastroCompleto}
                      placeholder="Ex: 15"
                      min="1"
                      max="31"
                      required
                      style={{
                        width: '100%',
                        padding: '0.875rem',
                        border: '2px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        outline: 'none'
                      }}
                    />
                    <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem', marginBottom: 0 }}>
                      Digite o dia do mês (1 a 31)
                    </p>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                      Quantas parcelas quer antecipar? *
                    </label>
                    <input
                      type="number"
                      name="antecipacao_meses"
                      value={dadosCompletosClinica.antecipacao_meses}
                      onChange={handleInputChangeCadastroCompleto}
                      placeholder="Ex: 3"
                      min="1"
                      required
                      style={{
                        width: '100%',
                        padding: '0.875rem',
                        border: '2px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div style={{ 
                display: 'flex', 
                flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '1rem',
                borderTop: '1px solid #e5e7eb',
                paddingTop: '1.5rem',
                maxWidth: '600px',
                margin: '0 auto'
              }}>
                <button
                  type="button"
                  onClick={resetCadastroCompleto}
                  disabled={salvandoCadastroCompleto}
                  style={{
                    padding: '0.875rem 2rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    backgroundColor: '#fff',
                    color: '#64748b',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: salvandoCadastroCompleto ? 'not-allowed' : 'pointer',
                    opacity: salvandoCadastroCompleto ? 0.6 : 1,
                    minWidth: window.innerWidth <= 768 ? '100%' : '120px'
                  }}
                >
                  Cancelar
                </button>
                
                <button
                  type="button"
                  onClick={confirmarCadastroCompleto}
                  disabled={salvandoCadastroCompleto}
                  style={{
                    padding: '0.875rem 2rem',
                    border: 'none',
                    borderRadius: '8px',
                    background: salvandoCadastroCompleto 
                      ? '#9ca3af' 
                      : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#fff',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: salvandoCadastroCompleto ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    minWidth: window.innerWidth <= 768 ? '100%' : '180px'
                  }}
                >
                  {salvandoCadastroCompleto ? (
                    <>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid #ffffff',
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }}></div>
                      Cadastrando...
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      Cadastrar {t.paciente}
                    </>
                  )}
                </button>
              </div>

              {/* Resumo dos dados preenchidos */}
              {(dadosCompletosClinica.nome || dadosCompletosClinica.valor_fechado_formatado) && (
                <div style={{
                  marginTop: '1.5rem',
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
                    Resumo do Cadastro
                  </h4>
                  <div style={{ fontSize: '0.875rem', color: '#3730a3', lineHeight: '1.5' }}>
                    {dadosCompletosClinica.nome && (
                      <div><strong>Paciente:</strong> {dadosCompletosClinica.nome}</div>
                    )}
                    {dadosCompletosClinica.valor_fechado_formatado && (
                      <div><strong>Valor do Fechamento:</strong> {dadosCompletosClinica.valor_fechado_formatado}</div>
                    )}
                    {dadosCompletosClinica.valor_parcela_formatado && dadosCompletosClinica.numero_parcelas && (
                      <div><strong>Parcelamento:</strong> {dadosCompletosClinica.numero_parcelas}x de {dadosCompletosClinica.valor_parcela_formatado}</div>
                    )}
                    {dadosCompletosClinica.vencimento && (
                      <div><strong>Dia do Vencimento:</strong> {new Date(dadosCompletosClinica.vencimento).toLocaleDateString('pt-BR')}</div>
                    )}
                    {dadosCompletosClinica.antecipacao_meses && (
                      <div><strong>Antecipação:</strong> {dadosCompletosClinica.antecipacao_meses} parcela(s)</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Carteira Existente */}
      {showCarteiraModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '900px', maxHeight: '90vh' }}>
            <div className="modal-header">
              <h2 className="modal-title">Cadastrar {t.paciente} - Carteira Existente</h2>
              <button className="close-btn" onClick={() => setShowCarteiraModal(false)}>×</button>
            </div>
            
            <div style={{ padding: '2rem', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                {/* Formulário */}
                <div>
                  <h3 style={{ marginBottom: '1.5rem', color: '#1e293b' }}>Adicionar Paciente</h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* CPF */}
                    <div>
                      <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                        CPF *
                      </label>
                      <input
                        type="text"
                        value={carteiraFormData.cpf}
                        onChange={(e) => {
                          const valor = e.target.value.replace(/\D/g, '');
                          const cpfFormatado = valor.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
                          setCarteiraFormData(prev => ({ ...prev, cpf: cpfFormatado }));
                        }}
                        placeholder="000.000.000-00"
                        maxLength="14"
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '2px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '1rem'
                        }}
                      />
                    </div>

                    {/* Nome Completo */}
                    <div>
                      <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                        Nome Completo *
                      </label>
                      <input
                        type="text"
                        value={carteiraFormData.nomeCompleto}
                        onChange={(e) => setCarteiraFormData(prev => ({ ...prev, nomeCompleto: e.target.value }))}
                        placeholder="Nome completo do paciente"
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '2px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '1rem'
                        }}
                      />
                    </div>

                    {/* Valor da Parcela */}
                    <div>
                      <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                        Valor da Parcela (R$) *
                      </label>
                      <input
                        type="text"
                        value={carteiraFormData.valorParcela}
                        onChange={(e) => {
                          // Remover tudo exceto números
                          let valor = e.target.value.replace(/[^\d]/g, '');
                          
                          // Se não há números, limpar o campo
                          if (!valor) {
                            setCarteiraFormData(prev => ({ ...prev, valorParcela: '' }));
                            return;
                          }
                          
                          // Converter para número inteiro
                          const numero = parseInt(valor);
                          
                          // Se zero, limpar
                          if (numero === 0) {
                            setCarteiraFormData(prev => ({ ...prev, valorParcela: '' }));
                            return;
                          }
                          
                          // Formatar simples: apenas o número
                          setCarteiraFormData(prev => ({ ...prev, valorParcela: numero.toString() }));
                        }}
                        onFocus={(e) => {
                          // Se o campo estiver vazio, mostrar placeholder com R$
                          if (!e.target.value) {
                            e.target.placeholder = 'R$ 0,00';
                          }
                        }}
                        onBlur={(e) => {
                          // Adicionar R$ se não estiver presente
                          if (e.target.value && !e.target.value.includes('R$')) {
                            e.target.value = 'R$ ' + e.target.value;
                            setCarteiraFormData(prev => ({ ...prev, valorParcela: 'R$ ' + prev.valorParcela }));
                          }
                        }}
                        placeholder="Ex: 500"
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '2px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '1rem'
                        }}
                      />
                      <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem', marginBottom: 0 }}>
                        Digite apenas números (ex: 500)
                      </p>
                    </div>

                    {/* Número de Parcelas em Aberto */}
                    <div>
                      <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                        Nº de Parcelas em Aberto *
                      </label>
                      <input
                        type="number"
                        value={carteiraFormData.numeroParcelasAberto}
                        onChange={(e) => setCarteiraFormData(prev => ({ ...prev, numeroParcelasAberto: e.target.value }))}
                        placeholder="Ex: 15"
                        min="1"
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '2px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '1rem'
                        }}
                      />
                    </div>

                    {/* 1ª Vencimento */}
                    <div>
                      <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                        1ª Vencimento *
                      </label>
                      <input
                        type="date"
                        value={carteiraFormData.primeiraVencimento}
                        onChange={(e) => setCarteiraFormData(prev => ({ ...prev, primeiraVencimento: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '2px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '1rem'
                        }}
                      />
                    </div>

                    {/* Número de Parcelas a Antecipar */}
                    <div>
                      <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                        Nº de Parcelas a Antecipar *
                      </label>
                      <input
                        type="number"
                        value={carteiraFormData.numeroParcelasAntecipar}
                        onChange={(e) => setCarteiraFormData(prev => ({ ...prev, numeroParcelasAntecipar: e.target.value }))}
                        placeholder="Ex: 6"
                        min="1"
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '2px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '1rem'
                        }}
                      />
                    </div>

                    {/* Botão Adicionar */}
                    <button
                      type="button"
                      onClick={adicionarPacienteCarteira}
                      style={{
                        background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                        border: 'none',
                        color: 'white',
                        cursor: 'pointer',
                        padding: '0.875rem',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        fontWeight: '600',
                        marginTop: '1rem'
                      }}
                    >
                      Adicionar à Carteira
                    </button>
                  </div>
                </div>

                {/* Lista de Pacientes e Cálculos */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0, color: '#1e293b' }}>Pacientes da Carteira ({pacientesCarteira.length})</h3>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={preencherDadosTeste}
                        style={{
                          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                          border: 'none',
                          color: 'white',
                          cursor: 'pointer',
                          padding: '0.5rem 1rem',
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                          fontWeight: '600'
                        }}
                      >
                        🧪 Dados Teste
                      </button>
                      {pacientesCarteira.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          {!isClinica && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <label style={{ fontSize: '0.875rem', color: '#374151', fontWeight: '500' }}>
                                Percentual Alvo:
                              </label>
                              <input
                                type="number"
                                value={percentualAlvoCarteira}
                                onChange={(e) => {
                                  const valor = parseFloat(e.target.value);
                                  if (!isNaN(valor) && valor >= 100 && valor <= 200) {
                                    setPercentualAlvoCarteira(valor);
                                  }
                                }}
                                style={{
                                  width: '80px',
                                  padding: '0.5rem',
                                  border: '1px solid #d1d5db',
                                  borderRadius: '6px',
                                  fontSize: '0.875rem',
                                  textAlign: 'center'
                                }}
                                min="100"
                                max="200"
                                step="1"
                              />
                              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>%</span>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => calcularCarteiraExistente(isClinica ? 130 : percentualAlvoCarteira)}
                            style={{
                              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                              border: 'none',
                              color: 'white',
                              cursor: 'pointer',
                              padding: '0.5rem 1rem',
                              borderRadius: '6px',
                              fontSize: '0.875rem',
                              fontWeight: '600'
                            }}
                          >
                            Calcular Carteira
                          </button>
                          {carteiraCalculos && !isClinica && (
                            <button
                              type="button"
                              onClick={exportarCarteiraExcel}
                              style={{
                                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                                border: 'none',
                                color: 'white',
                                cursor: 'pointer',
                                padding: '0.5rem 1rem',
                                borderRadius: '6px',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                              }}
                            >
                              📊 Exportar Excel
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {pacientesCarteira.length === 0 ? (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '2rem 1rem',
                      color: '#6b7280',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      border: '2px dashed #d1d5db'
                    }}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ marginBottom: '0.5rem', opacity: 0.5 }}>
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <path d="M9 9h6v6H9z"></path>
                      </svg>
                      <p style={{ margin: 0, fontSize: '0.875rem' }}>Nenhum {t.paciente.toLowerCase()} adicionado</p>
                    </div>
                  ) : (
                    <div style={{ marginBottom: '1.5rem' }}>
                      {(pacientesCarteira || []).map(paciente => (
                        <div key={paciente.id} style={{
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          padding: '1rem',
                          marginBottom: '0.5rem',
                          backgroundColor: '#f9fafb'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{paciente.nomeCompleto}</div>
                              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>CPF: {paciente.cpf}</div>
                              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                {formatarMoeda(paciente.valorParcela)} × {paciente.numeroParcelasAntecipar} parcelas
                              </div>
                            </div>
                            <button
                              onClick={() => removerPacienteCarteira(paciente.id)}
                              style={{
                                background: '#ef4444',
                                border: 'none',
                                color: 'white',
                                cursor: 'pointer',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.75rem'
                              }}
                            >
                              Remover
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {carteiraCalculos ? (
                    <div style={{ 
                      backgroundColor: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: '12px',
                      padding: '2rem',
                      textAlign: 'center'
                    }}>
                      <div style={{ 
                        fontSize: '1.5rem', 
                        fontWeight: '700', 
                        color: '#166534',
                        marginBottom: '1rem'
                      }}>
                        ✅ Cálculo Realizado com Sucesso!
                      </div>
                      <p style={{ 
                        margin: 0, 
                        color: '#166534',
                        fontSize: '1rem'
                      }}>
                        A carteira foi calculada e está pronta para envio de aprovação.
                      </p>
                      <p style={{ 
                        margin: '0.5rem 0 0 0', 
                        color: '#6b7280',
                        fontSize: '0.875rem'
                      }}>
                        Clique em "Salvar" para enviar para análise do administrador.
                      </p>
                      
                      {/* Botão Salvar */}
                      <button
                        type="button"
                        onClick={salvarCarteiraExistente}
                        style={{
                          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                          border: 'none',
                          color: 'white',
                          cursor: 'pointer',
                          padding: '0.875rem 2rem',
                          borderRadius: '8px',
                          fontSize: '1rem',
                          fontWeight: '600',
                          marginTop: '1.5rem'
                        }}
                      >
                        Enviar para Aprovação
                      </button>
                    </div>
                  ) : (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '3rem 1rem',
                      color: '#6b7280',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      border: '2px dashed #d1d5db'
                    }}>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ marginBottom: '1rem', opacity: 0.5 }}>
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <path d="M9 9h6v6H9z"></path>
                      </svg>
                      <p>Preencha os dados e clique em "Calcular Valores"</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Análise de Solicitação (Admin) */}
      {showSolicitacaoModal && solicitacaoSelecionada && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '900px', maxHeight: '90vh' }}>
            <div className="modal-header">
              <h2 className="modal-title">Analisar Solicitação de Carteira</h2>
              <button className="close-btn" onClick={() => {
                setShowSolicitacaoModal(false);
                setSolicitacaoSelecionada(null);
              }}>×</button>
            </div>
            
            <div style={{ padding: '2rem', overflowY: 'auto', maxHeight: 'calc(90vh - 80px)' }}>
              {/* Informações da Clínica */}
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1.5rem'
              }}>
                <h3 style={{ marginBottom: '0.5rem', fontSize: '1.125rem', fontWeight: '600' }}>
                  Clínica: {solicitacaoSelecionada.clinica_nome}
                </h3>
                <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                  Solicitado em: {new Date(solicitacaoSelecionada.created_at).toLocaleString('pt-BR')}
                </p>
                {solicitacaoSelecionada.observacoes_clinica && (
                  <p style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
                    Observações: {solicitacaoSelecionada.observacoes_clinica}
                  </p>
                )}
              </div>

              {/* Resumo dos Cálculos - Apenas para Admin */}
              {isAdmin && (
                <div style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '16px',
                  padding: '2rem',
                  marginBottom: '1.5rem',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}>
                <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: '700' }}>
                  Resumo dos Cálculos
                </h3>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1.5rem',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{
                    backgroundColor: '#f8fafc',
                    padding: '1rem',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Valor Face Total</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e293b' }}>
                      {formatarMoeda(solicitacaoSelecionada.calculos?.valorFaceTotal || 0)}
                    </p>
                  </div>
                  
                  <div style={{
                    backgroundColor: '#f0fdf4',
                    padding: '1rem',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Valor Entregue</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: '700', color: '#166534' }}>
                      {formatarMoeda(solicitacaoSelecionada.calculos?.valorEntregueTotal || 0)}
                    </p>
                  </div>
                  
                  <div style={{
                    backgroundColor: '#fef2f2',
                    padding: '1rem',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Deságio Total</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: '700', color: '#dc2626' }}>
                      {formatarMoeda(solicitacaoSelecionada.calculos?.desagioTotal || 0)}
                    </p>
                  </div>
                </div>

                {/* Divisão Operação/Colateral */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1rem',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{
                    backgroundColor: '#eff6ff',
                    padding: '1rem',
                    borderRadius: '8px',
                    border: '1px solid #3b82f6'
                  }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#1d4ed8', marginBottom: '0.5rem' }}>
                      Operação (Face)
                    </h4>
                    <p style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1e293b' }}>
                      {formatarMoeda(solicitacaoSelecionada.calculos?.valorTotalOperacao || 0)}
                    </p>
                  </div>
                  
                  <div style={{
                    backgroundColor: '#fef2f2',
                    padding: '1rem',
                    borderRadius: '8px',
                    border: '1px solid #dc2626'
                  }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#dc2626', marginBottom: '0.5rem' }}>
                      Colateral (Face)
                    </h4>
                    <p style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1e293b' }}>
                      {formatarMoeda(solicitacaoSelecionada.calculos?.valorColateral || 0)}
                    </p>
                  </div>
                </div>

                {/* Percentual */}
                <div style={{
                  backgroundColor: solicitacaoSelecionada.calculos?.percentualFinal >= 130 ? '#f0fdf4' : '#fef2f2',
                  border: `2px solid ${solicitacaoSelecionada.calculos?.percentualFinal >= 130 ? '#166534' : '#dc2626'}`,
                  borderRadius: '12px',
                  padding: '1.5rem',
                  textAlign: 'center'
                }}>
                  <p style={{ fontSize: '1rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                    Percentual Colateral/Operação
                  </p>
                  <p style={{
                    fontSize: '2.5rem',
                    fontWeight: '800',
                    color: solicitacaoSelecionada.calculos?.percentualFinal >= 130 ? '#166534' : '#dc2626'
                  }}>
                    {solicitacaoSelecionada.calculos?.percentualFinal?.toFixed(2) || 0}%
                  </p>
                  <p style={{
                    fontSize: '0.875rem',
                    color: solicitacaoSelecionada.calculos?.percentualFinal >= 130 ? '#166534' : '#dc2626',
                    marginTop: '0.5rem'
                  }}>
                    {solicitacaoSelecionada.calculos?.percentualFinal >= 130 
                      ? '✅ Atende ao mínimo de 130%' 
                      : '❌ Abaixo do mínimo de 130%'}
                  </p>
                </div>
              </div>
              )}

              {/* Lista de Pacientes */}
              <div style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '1.5rem',
                marginBottom: '1.5rem'
              }}>
                <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem', fontWeight: '600' }}>
                  Pacientes da Carteira ({solicitacaoSelecionada.pacientes_carteira?.length || 0})
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', fontSize: '0.875rem' }}>
                    <thead style={{ backgroundColor: '#f8fafc' }}>
                      <tr>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>CPF</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Nome</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Valor Parcela</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Parcelas</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>1ª Vencimento</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(solicitacaoSelecionada.pacientes_carteira || []).map((paciente, index) => (
                        <tr key={index}>
                          <td style={{ padding: '0.5rem' }}>{paciente.cpf}</td>
                          <td style={{ padding: '0.5rem' }}>{paciente.nomeCompleto}</td>
                          <td style={{ padding: '0.5rem' }}>{formatarMoeda(paciente.valorParcela)}</td>
                          <td style={{ padding: '0.5rem' }}>{paciente.numeroParcelasAntecipar}</td>
                          <td style={{ padding: '0.5rem' }}>
                            {new Date(paciente.primeiraVencimento).toLocaleDateString('pt-BR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tabela Detalhada de Parcelas - Apenas para Admin */}
              {isAdmin && solicitacaoSelecionada.calculos?.parcelasDetalhadas && (
                <div style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '1.5rem',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>
                      Detalhamento de Parcelas ({solicitacaoSelecionada.calculos.parcelasDetalhadas.length})
                    </h3>
                    <button
                      onClick={() => exportarCarteiraSolicitacaoExcel(solicitacaoSelecionada)}
                      style={{
                        background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                        border: 'none',
                        color: 'white',
                        cursor: 'pointer',
                        padding: '0.5rem 1rem',
                        borderRadius: '6px',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      📊 Exportar Excel
                    </button>
                  </div>
                  <div style={{ overflowX: 'auto', maxHeight: '400px' }}>
                    <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
                      <thead style={{ backgroundColor: '#f8fafc', position: 'sticky', top: 0 }}>
                        <tr>
                          <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Paciente</th>
                          <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Tipo</th>
                          <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Parcela</th>
                          <th style={{ padding: '0.5rem', textAlign: 'right', borderBottom: '2px solid #e5e7eb' }}>Valor Face</th>
                          <th style={{ padding: '0.5rem', textAlign: 'right', borderBottom: '2px solid #e5e7eb' }}>Deságio</th>
                          <th style={{ padding: '0.5rem', textAlign: 'right', borderBottom: '2px solid #e5e7eb' }}>Liquidez</th>
                          <th style={{ padding: '0.5rem', textAlign: 'center', borderBottom: '2px solid #e5e7eb' }}>Vencimento</th>
                        </tr>
                      </thead>
                      <tbody>
                        {solicitacaoSelecionada.calculos.parcelasDetalhadas.map((parcela, index) => {
                          // Verificar tanto 'categoria' quanto 'tipo' para compatibilidade
                          const tipoParcela = parcela.categoria || parcela.tipo;
                          const isColateral = tipoParcela === 'COL' || tipoParcela === 'colateral';
                          const tipoTexto = isColateral ? 'COLATERAL' : 'OPERAÇÃO';
                          
                          return (
                            <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                              <td style={{ padding: '0.5rem' }}>{parcela.paciente}</td>
                              <td style={{ padding: '0.5rem' }}>
                                <span style={{
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  backgroundColor: isColateral ? '#fef2f2' : '#eff6ff',
                                  color: isColateral ? '#dc2626' : '#1d4ed8'
                                }}>
                                  {tipoTexto}
                                </span>
                              </td>
                              <td style={{ padding: '0.5rem' }}>{parcela.parcela}</td>
                              <td style={{ padding: '0.5rem', textAlign: 'right' }}>{formatarMoeda(parcela.valorFace || parcela.valor)}</td>
                              <td style={{ padding: '0.5rem', textAlign: 'right', color: '#dc2626' }}>
                                {formatarMoeda(parcela.desagio || 0)}
                              </td>
                              <td style={{ padding: '0.5rem', textAlign: 'right', color: '#166534' }}>
                                {formatarMoeda(parcela.valorEntregue || parcela.liquidez)}
                              </td>
                              <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                {new Date(parcela.vencimento).toLocaleDateString('pt-BR')}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Seção de Contratos Pendentes - Apenas para Admin */}
              {isAdmin && solicitacaoSelecionada.status === 'aprovado' && contratos.length > 0 && (
                <div style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  marginBottom: '1.5rem'
                }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
                    📄 Contratos Enviados ({contratos.length})
                  </h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {contratos.map((contrato, index) => (
                      <div key={index} style={{
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '1rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                            {contrato.paciente_nome}
                          </div>
                          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                            {contrato.arquivo_nome}
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            backgroundColor: contrato.status === 'aprovado' ? '#d1fae5' :
                                           contrato.status === 'reprovado' ? '#fee2e2' : '#fef3c7',
                            color: contrato.status === 'aprovado' ? '#065f46' :
                                  contrato.status === 'reprovado' ? '#991b1b' : '#92400e'
                          }}>
                            {contrato.status === 'aprovado' ? 'Aprovado' :
                             contrato.status === 'reprovado' ? 'Reprovado' : 'Pendente'}
                          </span>
                          
                          {contrato.status === 'pendente' && (
                            <>
                              <button
                                onClick={() => handleAprovarContrato(contrato.id)}
                                style={{
                                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                  border: 'none',
                                  color: 'white',
                                  cursor: 'pointer',
                                  padding: '0.4rem 0.8rem',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: '600'
                                }}
                              >
                                ✓ Aprovar
                              </button>
                              <button
                                onClick={() => setContratoParaReprovar(contrato)}
                                style={{
                                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                  border: 'none',
                                  color: 'white',
                                  cursor: 'pointer',
                                  padding: '0.4rem 0.8rem',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: '600'
                                }}
                              >
                                ✗ Reprovar
                              </button>
                            </>
                          )}
                          
                          {contrato.status === 'reprovado' && contrato.motivo_reprovacao && (
                            <div style={{
                              backgroundColor: '#fef2f2',
                              border: '1px solid #fecaca',
                              borderRadius: '4px',
                              padding: '0.5rem',
                              fontSize: '0.75rem',
                              color: '#991b1b',
                              maxWidth: '300px'
                            }}>
                              <strong>Motivo:</strong> {contrato.motivo_reprovacao}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recalcular com outro percentual - Apenas para Admin */}
              {solicitacaoSelecionada.status === 'pendente' && isAdmin && (
                <div style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '1.5rem',
                  marginBottom: '1.5rem'
                }}>
                  <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem', fontWeight: '600' }}>
                    Recalcular com outro percentual
                  </h3>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <input
                      type="number"
                      value={percentualAlvoCarteira}
                      onChange={(e) => setPercentualAlvoCarteira(Number(e.target.value))}
                      min="100"
                      max="200"
                      step="1"
                      style={{
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        width: '100px'
                      }}
                    />
                    <span>%</span>
                    <button
                      onClick={async () => {
                        try {
                          // Recriar a carteira com o novo percentual
                          const pacientesRecalculados = solicitacaoSelecionada.pacientes_carteira.map(paciente => ({
                            id: paciente.id,
                            cpf: paciente.cpf,
                            nomeCompleto: paciente.nomeCompleto,
                            valorParcela: paciente.valorParcela,
                            numeroParcelasAberto: paciente.numeroParcelasAberto,
                            primeiraVencimento: paciente.primeiraVencimento,
                            numeroParcelasAntecipar: paciente.numeroParcelasAntecipar
                          }));

                          // Calcular com o novo percentual
                          const calculosRecalculados = calcularCarteiraComPercentual(pacientesRecalculados, percentualAlvoCarteira);

                          // Atualizar a solicitação selecionada com os novos cálculos
                          setSolicitacaoSelecionada({
                            ...solicitacaoSelecionada,
                            calculos: calculosRecalculados,
                            percentual_alvo: percentualAlvoCarteira
                          });

                          showSuccessToast(`Recálculo realizado com ${percentualAlvoCarteira}%`);
                        } catch (error) {
                          console.error('Erro no recálculo:', error);
                          showErrorToast('Erro ao recalcular');
                        }
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                        border: 'none',
                        color: 'white',
                        padding: '0.5rem 1rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '600'
                      }}
                    >
                      Recalcular
                    </button>
                  </div>
                </div>
              )}

              {/* Botões de Ação - Apenas para Admin */}
              {solicitacaoSelecionada.status === 'pendente' && isAdmin && (
                <div style={{
                  display: 'flex',
                  gap: '1rem',
                  justifyContent: 'flex-end',
                  paddingTop: '1.5rem',
                  borderTop: '1px solid #e5e7eb'
                }}>
                  <button
                    onClick={async () => {
                      try {
                        const response = await makeRequest(`/solicitacoes-carteira/${solicitacaoSelecionada.id}/status`, {
                          method: 'PUT',
                          body: JSON.stringify({
                            status: 'reprovado',
                            observacoes_admin: 'Solicitação reprovada'
                          })
                        });

                        if (response.ok) {
                          showSuccessToast('Solicitação reprovada');
                          setShowSolicitacaoModal(false);
                          setSolicitacaoSelecionada(null);
                          fetchSolicitacoesCarteira();
                        } else {
                          showErrorToast('Erro ao reprovar solicitação');
                        }
                      } catch (error) {
                        showErrorToast('Erro ao reprovar solicitação');
                      }
                    }}
                    style={{
                      background: '#dc2626',
                      border: 'none',
                      color: 'white',
                      padding: '0.75rem 1.5rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '600'
                    }}
                  >
                    Reprovar
                  </button>
                  
                  <button
                    onClick={async () => {
                      try {
                        const response = await makeRequest(`/solicitacoes-carteira/${solicitacaoSelecionada.id}/status`, {
                          method: 'PUT',
                          body: JSON.stringify({
                            status: 'aprovado',
                            observacoes_admin: 'Solicitação aprovada'
                          })
                        });

                        if (response.ok) {
                          showSuccessToast('Solicitação aprovada! Criando pacientes...');
                          
                          // Criar pacientes após aprovação
                          const promises = (solicitacaoSelecionada.pacientes_carteira || []).map(paciente => {
                            const pacienteData = {
                              nome: paciente.nomeCompleto,
                              cpf: paciente.cpf,
                              telefone: '',
                              cidade: '',
                              estado: '',
                              tipo_tratamento: 'Carteira Existente',
                              status: 'fechado',
                              observacoes: 'Paciente da carteira existente - Aprovado',
                              carteira_existente: true,
                              clinica_id: solicitacaoSelecionada.clinica_id,
                              cadastrado_por_clinica: true,
                              valor_parcela: paciente.valorParcela,
                              numero_parcelas_aberto: paciente.numeroParcelasAberto,
                              primeira_vencimento: paciente.primeiraVencimento,
                              numero_parcelas_antecipar: paciente.numeroParcelasAntecipar,
                              fator_am: 0.33,
                              data_aceite: new Date().toISOString().split('T')[0],
                              valor_entregue_total: solicitacaoSelecionada.calculos?.valorEntregueTotal || 0,
                              desagio_total: solicitacaoSelecionada.calculos?.desagioTotal || 0,
                              valor_face_total: solicitacaoSelecionada.calculos?.valorFaceTotal || 0,
                              valor_total_operacao: solicitacaoSelecionada.calculos?.valorTotalOperacao || 0,
                              valor_colateral: solicitacaoSelecionada.calculos?.valorColateral || 0,
                              percentual_final: solicitacaoSelecionada.calculos?.percentualFinal || 0
                            };

                            return makeRequest('/pacientes', {
                              method: 'POST',
                              body: JSON.stringify(pacienteData)
                            });
                          });

                          await Promise.all(promises);
                          showSuccessToast('Pacientes criados com sucesso!');
                          
                          setShowSolicitacaoModal(false);
                          setSolicitacaoSelecionada(null);
                          fetchSolicitacoesCarteira();
                          fetchPacientes();
                        } else {
                          showErrorToast('Erro ao aprovar solicitação');
                        }
                      } catch (error) {
                        showErrorToast('Erro ao aprovar solicitação');
                      }
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      border: 'none',
                      color: 'white',
                      padding: '0.75rem 1.5rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '600'
                    }}
                  >
                    Aprovar
                  </button>
                </div>
              )}

              {/* Mensagem para Clínicas */}
              {isClinica && (
                <div style={{
                  backgroundColor: '#f0f9ff',
                  border: '1px solid #0ea5e9',
                  borderRadius: '8px',
                  padding: '1.5rem',
                  marginTop: '1.5rem',
                  textAlign: 'center'
                }}>
                  <div style={{ 
                    fontSize: '1rem', 
                    fontWeight: '600', 
                    color: '#0c4a6e',
                    marginBottom: '0.5rem'
                  }}>
                    📋 Solicitação Enviada
                  </div>
                  <p style={{ 
                    margin: 0, 
                    color: '#0c4a6e',
                    fontSize: '0.875rem'
                  }}>
                    Sua solicitação foi enviada para análise do administrador. 
                    Você será notificado sobre o resultado em breve.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Gerenciamento de Contratos */}
      {showContratosModal && solicitacaoSelecionada && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '900px', maxHeight: '90vh' }}>
            <div className="modal-header">
              <h2 className="modal-title">Enviar Contratos</h2>
              <button className="close-btn" onClick={() => {
                setShowContratosModal(false);
                setSolicitacaoSelecionada(null);
                setContratos([]);
              }}>×</button>
            </div>
            
            <div style={{ padding: '2rem', overflowY: 'auto', maxHeight: 'calc(90vh - 80px)' }}>
              <div style={{
                backgroundColor: '#f0f9ff',
                border: '1px solid #0ea5e9',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1.5rem'
              }}>
                <p style={{ margin: 0, color: '#0c4a6e', fontSize: '0.875rem' }}>
                  📋 Faça upload do contrato para cada paciente da carteira. Após o envio, o administrador revisará os documentos.
                </p>
              </div>

              {/* Lista de Pacientes */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
                  Pacientes da Carteira
                </h3>
                
                {(solicitacaoSelecionada.pacientes_carteira || []).map((paciente, index) => {
                  const contratoExistente = contratos.find(c => c.paciente_cpf === paciente.cpf);
                  
                  return (
                    <div key={index} style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '1rem',
                      marginBottom: '1rem',
                      backgroundColor: '#ffffff'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                            {paciente.nomeCompleto}
                          </div>
                          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                            CPF: {paciente.cpf}
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          {contratoExistente ? (
                            <>
                              <span style={{
                                padding: '0.25rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                backgroundColor: contratoExistente.status === 'aprovado' ? '#d1fae5' :
                                               contratoExistente.status === 'reprovado' ? '#fee2e2' : '#fef3c7',
                                color: contratoExistente.status === 'aprovado' ? '#065f46' :
                                      contratoExistente.status === 'reprovado' ? '#991b1b' : '#92400e'
                              }}>
                                {contratoExistente.status === 'aprovado' ? 'Aprovado' :
                                 contratoExistente.status === 'reprovado' ? 'Reprovado' : 'Pendente'}
                              </span>
                              {contratoExistente.status === 'reprovado' && contratoExistente.motivo_reprovacao && (
                                <div style={{
                                  backgroundColor: '#fef2f2',
                                  border: '1px solid #fecaca',
                                  borderRadius: '4px',
                                  padding: '0.5rem',
                                  fontSize: '0.75rem',
                                  color: '#991b1b',
                                  maxWidth: '300px'
                                }}>
                                  <strong>Motivo:</strong> {contratoExistente.motivo_reprovacao}
                                </div>
                              )}
                              {isClinica && contratoExistente.status === 'pendente' && (
                                <button
                                  onClick={() => handleDeletarContrato(contratoExistente.id)}
                                  style={{
                                    background: '#ef4444',
                                    border: 'none',
                                    color: 'white',
                                    cursor: 'pointer',
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: '4px',
                                    fontSize: '0.75rem'
                                  }}
                                >
                                  Remover
                                </button>
                              )}
                            </>
                          ) : (
                            <>
                              <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => handleUploadContrato(e, paciente)}
                                disabled={uploadingContrato}
                                style={{ display: 'none' }}
                                id={`file-${index}`}
                              />
                              <label
                                htmlFor={`file-${index}`}
                                style={{
                                  background: uploadingContrato ? '#94a3b8' : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                                  border: 'none',
                                  color: 'white',
                                  cursor: uploadingContrato ? 'not-allowed' : 'pointer',
                                  padding: '0.5rem 1rem',
                                  borderRadius: '6px',
                                  fontSize: '0.875rem',
                                  fontWeight: '600'
                                }}
                              >
                                {uploadingContrato ? 'Enviando...' : '📄 Enviar Contrato'}
                              </label>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Botão Fechar */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  onClick={() => {
                    setShowContratosModal(false);
                    setSolicitacaoSelecionada(null);
                    setContratos([]);
                  }}
                  style={{
                    background: '#6b7280',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    fontWeight: '600'
                  }}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Reprovação de Contrato */}
      {contratoParaReprovar && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Reprovar Contrato</h2>
              <button className="close-btn" onClick={() => {
                setContratoParaReprovar(null);
                setMotivoReprovacao('');
              }}>×</button>
            </div>
            
            <div style={{ padding: '2rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem' }}>
                  Paciente: {contratoParaReprovar.paciente_nome}
                </label>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem' }}>
                  Motivo da Reprovação *
                </label>
                <textarea
                  value={motivoReprovacao}
                  onChange={(e) => setMotivoReprovacao(e.target.value)}
                  placeholder="Informe o motivo da reprovação..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  onClick={() => {
                    setContratoParaReprovar(null);
                    setMotivoReprovacao('');
                  }}
                  style={{
                    background: '#6b7280',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    fontWeight: '600'
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleReprovarContrato}
                  style={{
                    background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    fontWeight: '600'
                  }}
                >
                  Reprovar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      
    </div>
  );
};

export default Pacientes; 
