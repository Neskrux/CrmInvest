import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import TutorialClinicas from './TutorialClinicas';
import ModalEvidencia from './ModalEvidencia';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import config from '../config';

const Clinicas = () => {
  const { makeRequest, user, isAdmin, podeAlterarStatus, isFreelancer, isConsultorInterno, isClinica } = useAuth();
  const { showSuccessToast, showErrorToast, showWarningToast } = useToast();
  const [clinicas, setClinicas] = useState([]);
  const [novasClinicas, setNovasClinicas] = useState([]);
  const [clinicasEmAnalise, setClinicasEmAnalise] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showNovaClinicaModal, setShowNovaClinicaModal] = useState(false);
  const [editingClinica, setEditingClinica] = useState(null);
  const [editingNovaClinica, setEditingNovaClinica] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false); // Estado para prevenir cliques duplos
  const [submittingNovaClinica, setSubmittingNovaClinica] = useState(false); // Estado para nova clínica
  
  // Estados para gerenciar acesso
  const [showAcessoModal, setShowAcessoModal] = useState(false);
  const [clinicaParaAcesso, setClinicaParaAcesso] = useState(null);
  const [acessoFormData, setAcessoFormData] = useState({
    email: '',
    senha: '',
    confirmarSenha: ''
  });
  const [salvandoAcesso, setSalvandoAcesso] = useState(false);
  const [mostrarSenhaAcesso, setMostrarSenhaAcesso] = useState(false);
  const [activeTab, setActiveTab] = useState('clinicas');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroCity, setFiltroCity] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewingClinica, setViewingClinica] = useState(null);
  const [viewNovaClinicaModalOpen, setViewNovaClinicaModalOpen] = useState(false);
  const [viewingNovaClinica, setViewingNovaClinica] = useState(null);
  const [activeViewTab, setActiveViewTab] = useState('informacoes');
  const [pacientesClinica, setPacientesClinica] = useState([]);
  const [loadingPacientes, setLoadingPacientes] = useState(false);
  const [clinicasGeo, setClinicasGeo] = useState([]);
  const [novasClinicasGeo, setNovasClinicasGeo] = useState([]);
  const [geocoding, setGeocoding] = useState(false);

  // Estados para links personalizados
  const [linkPersonalizado, setLinkPersonalizado] = useState(null);
  const [linkClinicas, setLinkClinicas] = useState(null);
  const [loadingLink, setLoadingLink] = useState(true);
  const [formData, setFormData] = useState({
    nome: '',
    cnpj: '',
    endereco: '',
    bairro: '',
    cidade: '',
    estado: '',
    nicho: '',
    telefone: '',
    email: '',
    responsavel: '',
    status: 'ativa',
    // Campos de acesso ao sistema
    criar_acesso: false,
    email_login: '',
    senha: '',
    // Campos de documentação (com URLs)
    doc_cartao_cnpj: false,
    doc_cartao_cnpj_url: '',
    doc_contrato_social: false,
    doc_contrato_social_url: '',
    doc_alvara_sanitario: false,
    doc_alvara_sanitario_url: '',
    doc_balanco: false,
    doc_balanco_url: '',
    doc_comprovante_endereco: false,
    doc_comprovante_endereco_url: '',
    doc_dados_bancarios: false,
    doc_dados_bancarios_url: '',
    doc_socios: false,
    doc_socios_url: '',
    doc_certidao_resp_tecnico: false,
    doc_certidao_resp_tecnico_url: '',
    doc_resp_tecnico: false,
    doc_resp_tecnico_url: '',
    visita_online: false,
    visita_online_url: '',
    visita_online_data: '',
    visita_online_observacoes: '',
    doc_certidao_casamento: false,
    doc_certidao_casamento_url: '',
    // Novos campos de sócios
    telefone_socios: '',
    email_socios: '',
    doc_comprovante_endereco_socios: false,
    doc_comprovante_endereco_socios_url: '',
    doc_carteirinha_cro: false,
    doc_carteirinha_cro_url: '',
    // Dados bancários
    banco_nome: '',
    banco_conta: '',
    banco_agencia: '',
    banco_pix: '',
    // Limite (apenas admin vê)
    limite_credito: ''
  });
  const [cidadeCustomizada, setCidadeCustomizada] = useState(false);
  
  // Estados para controlar seções de documentos (acordeão)
  const [secaoDadosEmpresa, setSecaoDadosEmpresa] = useState(true);
  const [secaoFaturamento, setSecaoFaturamento] = useState(false);
  const [secaoSocios, setSecaoSocios] = useState(false);
  const [secaoRespTecnico, setSecaoRespTecnico] = useState(false);
  
  const [novaClinicaFormData, setNovaClinicaFormData] = useState({
    nome: '',
    cnpj: '',
    endereco: '',
    bairro: '',
    cidade: '',
    estado: '',
    nicho: '',
    telefone: '',
    email: '',
    responsavel: '',
    status: 'sem_primeiro_contato',
    observacoes: ''
  });
  const [cidadeCustomizadaNova, setCidadeCustomizadaNova] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [uploadingDocs, setUploadingDocs] = useState({});
  const [sociosDocsList, setSociosDocsList] = useState([]);

  // Estados para controlar o tutorial
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialCompleted, setTutorialCompleted] = useState(false);

  // Estado para modal de explicação de permissões
  const [showPermissaoModal, setShowPermissaoModal] = useState(false);

  // Estados para modal de evidência
  const [showEvidenciaModal, setShowEvidenciaModal] = useState(false);
  const [evidenciaData, setEvidenciaData] = useState({
    clinicaId: null,
    clinicaNome: '',
    statusAnterior: '',
    statusNovo: '',
    tipoClinica: '', // 'clinica' ou 'nova_clinica'
    evidenciaId: null
  });

  // Status disponíveis para clínicas gerais
  const statusClinicaOptions = [
    { value: 'ativa', label: 'Ativa', color: '#10b981' },
    { value: 'inativa', label: 'Inativa', color: '#ef4444' },
    { value: 'em_contato', label: 'Em Contato', color: '#3b82f6' },
    { value: 'reuniao_marcada', label: 'Reunião Marcada', color: '#8b5cf6' },
    { value: 'aguardando_documentacao', label: 'Aguardando Documentação', color: '#f59e0b' },
    { value: 'nao_fechou', label: 'Não Fechou', color: '#f59e0b' },
    { value: 'nao_e_nosso_publico', label: 'Não é nosso público alvo', color: '#9ca3af' },
    { value: 'nao_responde', label: 'Não responde', color: '#6b7280' },
    { value: 'nao_reconhece', label: 'Não reconhece', color: '#6b7280' }
  ];

  // Status disponíveis para novas clínicas
  const statusNovaClinicaOptions = [
    { value: 'sem_primeiro_contato', label: 'Prospecção Ativa', color: '#6b7280' },
    { value: 'tem_interesse', label: 'Tem Interesse', color: '#10b981' },
    { value: 'nao_tem_interesse', label: 'Não tem Interesse', color: '#ef4444' },
    { value: 'em_contato', label: 'Em Contato', color: '#3b82f6' },
    { value: 'reuniao_marcada', label: 'Reunião Marcada', color: '#8b5cf6' },
    { value: 'aguardando_documentacao', label: 'Aguardando Documentação', color: '#f59e0b' },
    { value: 'nao_fechou', label: 'Não Fechou', color: '#f59e0b' },
    { value: 'nao_e_nosso_publico', label: 'Não é nosso público alvo', color: '#9ca3af' },
    { value: 'nao_responde', label: 'Não responde', color: '#6b7280' },
    { value: 'nao_reconhece', label: 'Não reconhece', color: '#6b7280' }
  ];

  // Status disponíveis para clínicas em análise
  const statusAnaliseOptions = [
    { value: 'aguardando_documentacao', label: 'Aguardando Documentação', color: '#f59e0b' },
    { value: 'documentacao_incompleta', label: 'Documentação Incompleta', color: '#ef4444' },
    { value: 'em_analise', label: 'Em Análise', color: '#3b82f6' },
    { value: 'documentacao_reprovada', label: 'Documentação Reprovada', color: '#dc2626' },
    { value: 'ativa', label: 'Aprovada (Ativa)', color: '#10b981' },
    { value: 'inativa', label: 'Inativa', color: '#6b7280' }
  ];

  // Status que requerem evidência obrigatória
  const STATUS_COM_EVIDENCIA_CLINICAS = [
    'nao_fechou',
    'nao_e_nosso_publico',
    'nao_responde',
    'nao_tem_interesse'
  ];

  // Verificar se usuário é consultor
  const isConsultor = user?.tipo === 'consultor';

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

  // Principais cidades por estado (sample - pode expandir)
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

  useEffect(() => {
    fetchClinicas();
    fetchNovasClinicas(); // Sempre carregar novas clínicas
    
    // Buscar clínicas em análise se for admin ou consultor interno
    if (isAdmin || isConsultorInterno) {
      fetchClinicasEmAnalise();
    }
    
    // Buscar links personalizados se for consultor
    if (isConsultor) {
      buscarLinkPersonalizado();
    } else {
      setLoadingLink(false);
    }
    
    // Verificar se tutorial foi completado
    const completed = localStorage.getItem('tutorial-clinicas-completed');
    setTutorialCompleted(!!completed);
  }, []);

  // Tutorial automático desabilitado
  // Os usuários podem acessá-lo manualmente através do botão "Ver Tutorial"

  // Detectar mudanças de tamanho da tela
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Regeocodificar quando filtros/dados mudarem e a aba for mapa
  useEffect(() => {
    if (activeTab === 'mapa') {
      geocodeDataForMap();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, filtroEstado, filtroCity, filtroStatus, clinicas, novasClinicas]);

  const fetchClinicas = async () => {
    try {
      const response = await makeRequest('/clinicas');
      const data = await response.json();
      
      if (response.ok) {
        // Backend já retorna dados filtrados:
        // - Admin: todas as clínicas
        // - Consultor interno: todas as clínicas
        // - Consultor freelancer SEM empresa: apenas suas clínicas ou públicas
        // - Consultor de empresa: clínicas de todos os consultores da mesma empresa
        // - Empresa: clínicas de todos seus consultores
        setClinicas(data);
      } else {
        console.error('Erro ao carregar clínicas:', data.error);
        showErrorToast('Erro ao carregar clínicas: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao carregar clínicas:', error);
      showErrorToast('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  // ===== Geocodificação e Mapa =====
  const getGeocodeCache = () => {
    try {
      const raw = localStorage.getItem('geocodeCache');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const setGeocodeCache = (cache) => {
    try {
      localStorage.setItem('geocodeCache', JSON.stringify(cache));
    } catch {}
  };

  const normalizeAddress = (endereco, cidade, estado) => {
    const parts = [];
    if (endereco && endereco.trim() !== '') parts.push(endereco.trim());
    if (cidade && cidade.trim() !== '') parts.push(cidade.trim());
    if (estado && estado.trim() !== '') parts.push(estado.trim());
    parts.push('Brasil');
    return parts.join(', ');
  };

  const geocodeAddress = async (address, cache) => {
    if (!address || address.trim() === '') return null;
    const key = address.toLowerCase();
    if (cache[key]) return cache[key];
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&addressdetails=0`;
    try {
      const res = await fetch(url, { headers: { 'Accept-Language': 'pt-BR' } });
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const point = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
        cache[key] = point;
        setGeocodeCache(cache);
        await new Promise(r => setTimeout(r, 1100));
        return point;
      }
    } catch {}
    return null;
  };

  const geocodeDataForMap = async () => {
    if (activeTab !== 'mapa') return;
    setGeocoding(true);
    const cache = getGeocodeCache();

    const clinicasToGeo = clinicasFiltradas.slice(0, 500); // Aumentado limite pois é mais rápido
    const clinicasPoints = [];
    
    for (const c of clinicasToGeo) {
      // Primeiro verifica se já tem coordenadas salvas no banco
      if (c.latitude && c.longitude) {
        clinicasPoints.push({ 
          lat: c.latitude, 
          lon: c.longitude, 
          item: c 
        });
      } else {
        // Se não tem, tenta geocodificar
        const address = normalizeAddress(c.endereco, c.cidade, c.estado);
        const pt = await geocodeAddress(address, cache);
        if (pt) clinicasPoints.push({ ...pt, item: c });
      }
    }

    const novasToGeo = novasClinicas.slice(0, 500); // Aumentado limite
    const novasPoints = [];
    
    for (const c of novasToGeo) {
      // Primeiro verifica se já tem coordenadas salvas no banco
      if (c.latitude && c.longitude) {
        novasPoints.push({ 
          lat: c.latitude, 
          lon: c.longitude, 
          item: c 
        });
      } else {
        // Se não tem, tenta geocodificar
        const address = normalizeAddress(c.endereco || c.nome, c.cidade, c.estado);
        const pt = await geocodeAddress(address, cache);
        if (pt) novasPoints.push({ ...pt, item: c });
      }
    }

    setClinicasGeo(clinicasPoints);
    setNovasClinicasGeo(novasPoints);
    setGeocoding(false);
  };

  const fetchNovasClinicas = async () => {
    try {
      const response = await makeRequest('/novas-clinicas');
      const data = await response.json();
      
      if (response.ok) {
        // Backend já retorna dados filtrados:
        // - Admin: todas as novas clínicas
        // - Consultor interno: todas as novas clínicas
        // - Consultor freelancer SEM empresa: apenas suas clínicas
        // - Consultor de empresa: clínicas de todos os consultores da mesma empresa
        // - Empresa: clínicas de todos seus consultores
        setNovasClinicas(data);
      } else {
        console.error('Erro ao carregar novas clínicas:', data.error);
        showErrorToast('Erro ao carregar novas clínicas: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao carregar novas clínicas:', error);
      showErrorToast('Erro ao conectar com o servidor');
    }
  };

  const fetchClinicasEmAnalise = async () => {
    try {
      const response = await makeRequest('/clinicas/em-analise');
      const data = await response.json();
      
      if (response.ok) {
        setClinicasEmAnalise(data);
      } else {
        console.error('Erro ao carregar clínicas em análise:', data.error);
        showErrorToast('Erro ao carregar clínicas em análise: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao carregar clínicas em análise:', error);
      showErrorToast('Erro ao conectar com o servidor');
    }
  };

  const buscarLinkPersonalizado = async () => {
    try {
      // Usar a rota de perfil que o consultor pode acessar
      const consultorResponse = await makeRequest('/consultores/perfil');
      const responseData = await consultorResponse.json();
      
      if (consultorResponse.ok && responseData.consultor) {
        const consultorData = responseData.consultor;
        
        // Verificar se é consultor interno Invest Money (tem as duas permissões E não tem empresa)
        const isConsultorInterno = consultorData.pode_ver_todas_novas_clinicas === true && 
                                   consultorData.podealterarstatus === true &&
                                   !consultorData.empresa_id;
        
        if (!isConsultorInterno) {
          // Freelancer (solo ou empresa) ou Funcionário de empresa: link personalizado
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

  const aprovarClinica = async (clinicaId) => {
    try {
      const response = await makeRequest(`/novas-clinicas/${clinicaId}/pegar`, {
        method: 'PUT'
      });

      const data = await response.json();
      
      if (response.ok) {
        showSuccessToast('Clínica aprovada e movida para análise com sucesso!');
        fetchNovasClinicas();
        fetchClinicas(); // Atualizar também a lista de clínicas gerais
      } else {
        showErrorToast('Erro ao aprovar clínica: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao aprovar clínica:', error);
      showErrorToast('Erro ao aprovar clínica');
    }
  };

  const handleGerenciarAcesso = (clinica) => {
    setClinicaParaAcesso(clinica);
    setAcessoFormData({
      email: (clinica.email_login || clinica.email || '').toLowerCase(),
      senha: '',
      confirmarSenha: ''
    });
    setShowAcessoModal(true);
  };

  const handleSalvarAcesso = async () => {
    // Validações
    if (!acessoFormData.email) {
      showWarningToast('Por favor, informe o email de login');
      return;
    }

    if (!acessoFormData.senha) {
      showWarningToast('Por favor, informe a senha');
      return;
    }

    if (acessoFormData.senha.length < 6) {
      showWarningToast('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (acessoFormData.senha !== acessoFormData.confirmarSenha) {
      showWarningToast('As senhas não coincidem');
      return;
    }

    setSalvandoAcesso(true);
    try {
      const response = await makeRequest(`/clinicas/${clinicaParaAcesso.id}/criar-acesso`, {
        method: 'POST',
        body: JSON.stringify({
          email: acessoFormData.email.toLowerCase().trim(),
          senha: acessoFormData.senha
        })
      });

      const data = await response.json();

      if (response.ok) {
        showSuccessToast('Acesso criado/atualizado com sucesso!');
        setShowAcessoModal(false);
        setClinicaParaAcesso(null);
        setAcessoFormData({ email: '', senha: '', confirmarSenha: '' });
        fetchClinicas();
      } else {
        showErrorToast(data.error || 'Erro ao criar acesso');
      }
    } catch (error) {
      console.error('Erro ao criar acesso:', error);
      showErrorToast('Erro ao conectar com o servidor');
    } finally {
      setSalvandoAcesso(false);
    }
  };

  const handleRemoverAcesso = async () => {
    if (!window.confirm('Tem certeza que deseja remover o acesso desta clínica ao sistema?')) {
      return;
    }

    try {
      const response = await makeRequest(`/clinicas/${clinicaParaAcesso.id}/remover-acesso`, {
        method: 'DELETE'
      });

      if (response.ok) {
        showSuccessToast('Acesso removido com sucesso');
        setShowAcessoModal(false);
        setClinicaParaAcesso(null);
        fetchClinicas();
      } else {
        const data = await response.json();
        showErrorToast(data.error || 'Erro ao remover acesso');
      }
    } catch (error) {
      console.error('Erro ao remover acesso:', error);
      showErrorToast('Erro ao conectar com o servidor');
    }
  };

  const handleDeleteClinica = async (clinicaId) => {
    if (!window.confirm('Tem certeza que deseja excluir esta clínica? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const response = await makeRequest(`/clinicas/${clinicaId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (response.ok) {
        showSuccessToast('Clínica excluída com sucesso!');
        fetchClinicas();
        fetchClinicasEmAnalise(); // Atualizar também a aba Em Análise
      } else {
        showErrorToast('Erro ao excluir clínica: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao excluir clínica:', error);
      showErrorToast('Erro ao excluir clínica');
    }
  };

  const handleDeleteNovaClinica = async (clinicaId) => {
    if (!window.confirm('Tem certeza que deseja excluir esta nova clínica? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const response = await makeRequest(`/novas-clinicas/${clinicaId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (response.ok) {
        showSuccessToast('Nova clínica excluída com sucesso!');
        fetchNovasClinicas();
      } else {
        showErrorToast('Erro ao excluir nova clínica: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao excluir nova clínica:', error);
      showErrorToast('Erro ao excluir nova clínica');
    }
  };

  const handleNovaClinicaSubmit = async (e) => {
    e.preventDefault();
    
    // Prevenir múltiplos cliques
    if (submittingNovaClinica) return;
    
    setSubmittingNovaClinica(true);
    
    try {
      // Se estiver editando uma nova clínica
      if (editingNovaClinica) {
        const dataToSend = {
          ...novaClinicaFormData,
          cnpj: novaClinicaFormData.cnpj?.replace(/\D/g, '') || '',
          email: novaClinicaFormData.email?.toLowerCase().trim() || ''
        };
        
        const response = await makeRequest(`/novas-clinicas/${editingNovaClinica.id}`, {
          method: 'PUT',
          body: JSON.stringify(dataToSend)
        });

        const data = await response.json();
        
        if (response.ok) {
          showSuccessToast('Nova clínica atualizada com sucesso!');
          setShowNovaClinicaModal(false);
          setEditingNovaClinica(null);
          setNovaClinicaFormData({
            nome: '',
            cnpj: '',
            endereco: '',
            bairro: '',
            cidade: '',
            estado: '',
            nicho: '',
            telefone: '',
            email: '',
            responsavel: '',
            status: 'sem_primeiro_contato',
            observacoes: ''
          });
          setCidadeCustomizadaNova(false);
          fetchNovasClinicas();
          return;
        } else {
          console.error('❌ Erro do servidor (edição nova clínica):', data);
          showErrorToast('Erro ao atualizar nova clínica: ' + data.error);
          setSubmittingNovaClinica(false);
          return;
        }
      }
      
      // Se for consultor interno, deve criar em análise via rota /clinicas
      if (isConsultorInterno) {
      const dataToSend = {
        ...novaClinicaFormData,
          em_analise: true,
          status: 'aguardando_documentacao',
          // Remover formatação do CNPJ (manter apenas números)
          cnpj: novaClinicaFormData.cnpj?.replace(/\D/g, '') || '',
          email: novaClinicaFormData.email?.toLowerCase().trim() || ''
        };
        
        const response = await makeRequest('/clinicas', {
          method: 'POST',
          body: JSON.stringify(dataToSend)
        });

        const data = await response.json();
        
        if (response.ok) {
          showSuccessToast('Clínica cadastrada com sucesso! Ela está em análise aguardando aprovação.');
          setShowNovaClinicaModal(false);
          setNovaClinicaFormData({
            nome: '',
            cnpj: '',
            endereco: '',
            bairro: '',
            cidade: '',
            estado: '',
            nicho: '',
            telefone: '',
            email: '',
            responsavel: '',
            status: 'aguardando_documentacao',
            observacoes: ''
          });
          setCidadeCustomizadaNova(false);
          fetchClinicasEmAnalise();
          return;
        } else {
          console.error('❌ Erro do servidor (consultor interno):', data);
          showErrorToast('Erro ao cadastrar clínica: ' + data.error);
          setSubmittingNovaClinica(false);
          return;
        }
      }
      
      // Para admin ou outros, usar fluxo normal de novas clínicas
      const dataToSend = {
        ...novaClinicaFormData,
        status: 'sem_primeiro_contato'
      };
      
      const response = await makeRequest('/novas-clinicas', {
        method: 'POST',
        body: JSON.stringify(dataToSend)
      });

      const data = await response.json();
      
      if (response.ok) {
        showSuccessToast('Nova clínica cadastrada com sucesso!');
        setShowNovaClinicaModal(false);
        setNovaClinicaFormData({
          nome: '',
          cnpj: '',
          endereco: '',
          bairro: '',
          cidade: '',
          estado: '',
          nicho: '',
          telefone: '',
          email: '',
          responsavel: '',
          status: 'sem_primeiro_contato',
          observacoes: ''
        });
        setCidadeCustomizadaNova(false);
        fetchNovasClinicas();
      } else {
        showErrorToast('Erro ao cadastrar nova clínica: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao cadastrar nova clínica:', error);
      showErrorToast('Erro ao cadastrar nova clínica');
    } finally {
      setSubmittingNovaClinica(false);
    }
  };

  // Funções para upload de documentos
  const handleUploadDocument = async (event, docType) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setUploadingDocs(prev => ({ ...prev, [docType]: true }));
    
    const formData = new FormData();
    formData.append('document', file);
    
    try {
      const response = await fetch(`http://localhost:5000/api/documents/upload/${editingClinica.id}/${docType}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
      
      if (response.ok) {
        const data = await response.json();
        showSuccessToast('Documento enviado com sucesso!');
        
        // Atualizar o estado do formulário com a URL do documento
        const docField = `doc_${docType}`;
        const docUrlField = `doc_${docType}_url`;
        setFormData(prev => ({ 
          ...prev, 
          [docField]: true,
          [docUrlField]: data.publicUrl || ''
        }));
        
        // Recarregar dados da clínica
        await fetchClinicas();
        await fetchClinicasEmAnalise();
      } else {
        const error = await response.json();
        showErrorToast(error.error || 'Erro ao enviar documento');
      }
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      showErrorToast('Erro ao enviar documento');
    } finally {
      setUploadingDocs(prev => ({ ...prev, [docType]: false }));
    }
  };

  // Upload múltiplo de documentos (para doc_socios)
  const handleUploadMultipleDocuments = async (event, docType) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    setUploadingDocs(prev => ({ ...prev, [docType]: true }));
    
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('documents', files[i]);
    }
    
    try {
      const response = await fetch(`http://localhost:5000/api/documents/upload-multiple/${editingClinica.id}/${docType}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
      
      if (response.ok) {
        const data = await response.json();
        showSuccessToast(data.message || 'Documentos enviados com sucesso!');
        
        // Atualizar o estado do formulário
        const docField = `doc_${docType}`;
        setFormData(prev => ({ ...prev, [docField]: true }));
        
        // Recarregar dados da clínica
        await fetchClinicas();
        await fetchClinicasEmAnalise();
        
        // Buscar dados atualizados da clínica e recarregar lista de documentos
        try {
          const clinicaResponse = await makeRequest(`/clinicas/${editingClinica.id}`);
          if (clinicaResponse.ok) {
            const clinicaData = await clinicaResponse.json();
            loadSociosDocsList(clinicaData);
          }
        } catch (error) {
          console.error('Erro ao recarregar lista de documentos:', error);
        }
      } else {
        const error = await response.json();
        showErrorToast(error.error || 'Erro ao enviar documentos');
      }
    } catch (error) {
      console.error('Erro ao fazer upload múltiplo:', error);
      showErrorToast('Erro ao enviar documentos');
    } finally {
      setUploadingDocs(prev => ({ ...prev, [docType]: false }));
      // Limpar o input
      event.target.value = '';
    }
  };
  
  // Carregar lista de documentos dos sócios
  const loadSociosDocsList = async (clinica) => {
    if (clinica && clinica.doc_socios_url) {
      try {
        const docs = JSON.parse(clinica.doc_socios_url);
        if (Array.isArray(docs)) {
          setSociosDocsList(docs);
        } else {
          // Formato antigo (string única)
          setSociosDocsList([{ publicUrl: clinica.doc_socios_url, originalName: 'Documento' }]);
        }
      } catch {
        // Formato antigo (string única)
        setSociosDocsList([{ publicUrl: clinica.doc_socios_url, originalName: 'Documento' }]);
      }
    } else {
      setSociosDocsList([]);
    }
  };

  // Deletar um documento individual do array
  const handleDeleteSociosDocument = async (index) => {
    if (!window.confirm('Tem certeza que deseja excluir este documento?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/documents/delete-from-array/${editingClinica.id}/socios/${index}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        showSuccessToast('Documento excluído com sucesso!');
        
        // Recarregar listas
        await fetchClinicas();
        await fetchClinicasEmAnalise();
        
        // Buscar dados atualizados da clínica e recarregar lista de documentos
        try {
          const clinicaResponse = await makeRequest(`/clinicas/${editingClinica.id}`);
          if (clinicaResponse.ok) {
            const clinicaData = await clinicaResponse.json();
            loadSociosDocsList(clinicaData);
            
            // Atualizar formData se não há mais documentos
            if (!clinicaData.doc_socios) {
              setFormData(prev => ({ ...prev, doc_socios: false }));
            }
          }
        } catch (error) {
          console.error('Erro ao recarregar lista de documentos:', error);
        }
      } else {
        const error = await response.json();
        showErrorToast(error.error || 'Erro ao excluir documento');
      }
    } catch (error) {
      console.error('Erro ao excluir documento:', error);
      showErrorToast('Erro ao excluir documento');
    }
  };

  const handleDownloadDocument = async (docType) => {
    try {
      // Adicionar prefixo 'doc_' se não tiver (para compatibilidade com a rota do backend)
      const tipoCompleto = docType.startsWith('doc_') ? docType : `doc_${docType}`;
      
      // Usar a mesma rota que funciona no modal de visualização
      const response = await makeRequest(`/clinicas/${editingClinica.id}/documentos/${tipoCompleto}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        
        // Limpar o objeto URL após um tempo
        setTimeout(() => window.URL.revokeObjectURL(url), 100);
      } else {
        showErrorToast('Documento não encontrado');
      }
    } catch (error) {
      console.error('Erro ao baixar:', error);
      showErrorToast('Erro ao baixar documento');
    }
  };
  
  const handleDeleteDocument = async (docType) => {
    if (!window.confirm('Tem certeza que deseja excluir este documento?')) return;
    
    try {
      const response = await fetch(`http://localhost:5000/api/documents/delete/${editingClinica.id}/${docType}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        showSuccessToast('Documento excluído com sucesso!');
        
        // Atualizar o estado do formulário
        const docField = `doc_${docType}`;
        const docUrlField = `doc_${docType}_url`;
        setFormData(prev => ({ 
          ...prev, 
          [docField]: false,
          [docUrlField]: ''
        }));
        
        // Recarregar dados da clínica
        await fetchClinicas();
        await fetchClinicasEmAnalise();
      } else {
        showErrorToast('Erro ao excluir documento');
      }
    } catch (error) {
      console.error('Erro ao excluir:', error);
      showErrorToast('Erro ao excluir documento');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prevenir múltiplos cliques
    if (submitting) return;
    
    setSubmitting(true);
    
    try {
      // Normalizar email e remover formatação de CNPJ antes de enviar
      const dadosParaEnviar = {
        ...formData,
        email: formData.email?.toLowerCase().trim(),
        email_login: formData.email_login?.toLowerCase().trim(),
        // Remover formatação do CNPJ (manter apenas números)
        cnpj: formData.cnpj?.replace(/\D/g, '') || ''
      };

      // Se for consultor interno criando uma nova clínica, adicionar flag
      if (!editingClinica && isConsultorInterno) {
        dadosParaEnviar.em_analise = true;
        dadosParaEnviar.status = 'aguardando_documentacao';
      }
      
      let response;
      if (editingClinica) {
        response = await makeRequest(`/clinicas/${editingClinica.id}`, {
          method: 'PUT',
          body: JSON.stringify(dadosParaEnviar)
        });
      } else {
        response = await makeRequest('/clinicas', {
          method: 'POST',
          body: JSON.stringify(dadosParaEnviar)
        });
      }

      const data = await response.json();
      
      if (response.ok) {
        // Se foi criada uma nova clínica e deve criar acesso
        if (!editingClinica && formData.criar_acesso && data.clinica?.id) {
          try {
            const acessoResponse = await makeRequest(`/clinicas/${data.clinica.id}/criar-acesso`, {
              method: 'POST',
              body: JSON.stringify({
                email: formData.email_login,
                senha: formData.senha
              })
            });
            
            if (acessoResponse.ok) {
              showSuccessToast('Clínica cadastrada e acesso criado com sucesso!');
            } else {
              showWarningToast('Clínica cadastrada, mas houve erro ao criar o acesso. Use a tela de Gerenciar Acesso.');
            }
          } catch (error) {
            console.error('Erro ao criar acesso:', error);
            showWarningToast('Clínica cadastrada, mas houve erro ao criar o acesso.');
          }
        } else {
          if (!editingClinica && isConsultorInterno) {
            showSuccessToast('Clínica cadastrada com sucesso! Ela está em análise aguardando aprovação.');
        } else {
          showSuccessToast(editingClinica ? 'Clínica atualizada com sucesso!' : 'Clínica cadastrada com sucesso!');
          }
        }
        
        setShowModal(false);
        setEditingClinica(null);
        setFormData({
          nome: '',
          cnpj: '',
          endereco: '',
          bairro: '',
          cidade: '',
          estado: '',
          nicho: '',
          telefone: '',
          email: '',
          responsavel: '',
          status: 'ativa',
          criar_acesso: false,
          email_login: '',
          senha: ''
        });
        setCidadeCustomizada(false);
        fetchClinicas();
        
        // Atualizar também clínicas em análise
        if (isAdmin || isConsultorInterno) {
          fetchClinicasEmAnalise();
        }
      } else {
        console.error('❌ Erro do servidor:', data);
        showErrorToast('Erro ao salvar clínica: ' + data.error);
      }
    } catch (error) {
      console.error('❌ Erro ao salvar clínica:', error);
      showErrorToast('Erro ao salvar clínica: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (clinica) => {
    setEditingClinica(clinica);
    const estadoClinica = clinica.estado || '';
    const cidadeClinica = clinica.cidade || '';
    const cidadesDoEstado = estadoClinica ? (cidadesPorEstado[estadoClinica] || []) : [];
    const cidadeEhCustomizada = cidadesDoEstado.length > 0 && !cidadesDoEstado.includes(cidadeClinica) && cidadeClinica !== '';
    
    setFormData({
      nome: clinica.nome || '',
      cnpj: clinica.cnpj || '',
      endereco: clinica.endereco || '',
      bairro: clinica.bairro || '',
      cidade: cidadeClinica,
      estado: estadoClinica,
      nicho: clinica.nicho || '',
      telefone: clinica.telefone || '',
      email: (clinica.email || '').toLowerCase(),
      responsavel: clinica.responsavel || '',
      status: clinica.status || 'ativo',
      // Campos de acesso (não editar em clínica existente)
      criar_acesso: false,
      email_login: '',
      senha: '',
      // Campos de documentação (incluindo URLs)
      doc_cartao_cnpj: clinica.doc_cartao_cnpj || false,
      doc_cartao_cnpj_url: clinica.doc_cartao_cnpj_url || '',
      doc_contrato_social: clinica.doc_contrato_social || false,
      doc_contrato_social_url: clinica.doc_contrato_social_url || '',
      doc_alvara_sanitario: clinica.doc_alvara_sanitario || false,
      doc_alvara_sanitario_url: clinica.doc_alvara_sanitario_url || '',
      doc_balanco: clinica.doc_balanco || false,
      doc_balanco_url: clinica.doc_balanco_url || '',
      doc_comprovante_endereco: clinica.doc_comprovante_endereco || false,
      doc_comprovante_endereco_url: clinica.doc_comprovante_endereco_url || '',
      doc_dados_bancarios: clinica.doc_dados_bancarios || false,
      doc_dados_bancarios_url: clinica.doc_dados_bancarios_url || '',
      doc_socios: clinica.doc_socios || false,
      doc_socios_url: clinica.doc_socios_url || '',
      doc_certidao_resp_tecnico: clinica.doc_certidao_resp_tecnico || false,
      doc_certidao_resp_tecnico_url: clinica.doc_certidao_resp_tecnico_url || '',
      doc_resp_tecnico: clinica.doc_resp_tecnico || false,
      doc_resp_tecnico_url: clinica.doc_resp_tecnico_url || '',
      visita_online: clinica.visita_online || false,
      visita_online_url: clinica.visita_online_url || '',
      visita_online_data: clinica.visita_online_data || '',
      visita_online_observacoes: clinica.visita_online_observacoes || '',
      doc_certidao_casamento: clinica.doc_certidao_casamento || false,
      doc_certidao_casamento_url: clinica.doc_certidao_casamento_url || '',
      // Novos campos
      telefone_socios: clinica.telefone_socios || '',
      email_socios: clinica.email_socios || '',
      doc_comprovante_endereco_socios: clinica.doc_comprovante_endereco_socios || false,
      doc_comprovante_endereco_socios_url: clinica.doc_comprovante_endereco_socios_url || '',
      doc_carteirinha_cro: clinica.doc_carteirinha_cro || false,
      doc_carteirinha_cro_url: clinica.doc_carteirinha_cro_url || '',
      banco_nome: clinica.banco_nome || '',
      banco_conta: clinica.banco_conta || '',
      banco_agencia: clinica.banco_agencia || '',
      banco_pix: clinica.banco_pix || '',
      limite_credito: clinica.limite_credito || ''
    });
    setCidadeCustomizada(cidadeEhCustomizada);
    loadSociosDocsList(clinica); // Carregar lista de documentos dos sócios
    setShowModal(true);
  };

  // Função para editar Nova Clínica
  const handleEditNovaClinica = (clinica) => {
    setEditingNovaClinica(clinica);
    const estadoClinica = clinica.estado || '';
    const cidadeClinica = clinica.cidade || '';
    const cidadesDoEstado = estadoClinica ? (cidadesPorEstado[estadoClinica] || []) : [];
    const cidadeEhCustomizada = cidadesDoEstado.length > 0 && !cidadesDoEstado.includes(cidadeClinica) && cidadeClinica !== '';
    
    setNovaClinicaFormData({
      nome: clinica.nome || '',
      cnpj: clinica.cnpj || '',
      endereco: clinica.endereco || '',
      bairro: clinica.bairro || '',
      cidade: cidadeClinica,
      estado: estadoClinica,
      nicho: clinica.nicho || '',
      telefone: clinica.telefone || '',
      email: (clinica.email || '').toLowerCase(),
      responsavel: clinica.responsavel || '',
      status: clinica.status || 'aguardando_contato',
      observacoes: clinica.observacoes || ''
    });
    setCidadeCustomizadaNova(cidadeEhCustomizada);
    setShowNovaClinicaModal(true);
  };

  // Função para editar Clínica em Análise
  const handleEditClinicaAnalise = (clinica) => {
    setEditingClinica(clinica);
    const estadoClinica = clinica.estado || '';
    const cidadeClinica = clinica.cidade || '';
    const cidadesDoEstado = estadoClinica ? (cidadesPorEstado[estadoClinica] || []) : [];
    const cidadeEhCustomizada = cidadesDoEstado.length > 0 && !cidadesDoEstado.includes(cidadeClinica) && cidadeClinica !== '';
    
    setFormData({
      nome: clinica.nome || '',
      cnpj: clinica.cnpj || '',
      endereco: clinica.endereco || '',
      bairro: clinica.bairro || '',
      cidade: cidadeClinica,
      estado: estadoClinica,
      nicho: clinica.nicho || '',
      telefone: clinica.telefone || '',
      email: (clinica.email || '').toLowerCase(),
      responsavel: clinica.responsavel || '',
      status: clinica.status || 'aguardando_documentacao',
      // Campos de acesso (não editar em clínica existente)
      criar_acesso: false,
      email_login: '',
      senha: '',
      // Campos de documentação (incluindo URLs)
      doc_cartao_cnpj: clinica.doc_cartao_cnpj || false,
      doc_cartao_cnpj_url: clinica.doc_cartao_cnpj_url || '',
      doc_contrato_social: clinica.doc_contrato_social || false,
      doc_contrato_social_url: clinica.doc_contrato_social_url || '',
      doc_alvara_sanitario: clinica.doc_alvara_sanitario || false,
      doc_alvara_sanitario_url: clinica.doc_alvara_sanitario_url || '',
      doc_balanco: clinica.doc_balanco || false,
      doc_balanco_url: clinica.doc_balanco_url || '',
      doc_comprovante_endereco: clinica.doc_comprovante_endereco || false,
      doc_comprovante_endereco_url: clinica.doc_comprovante_endereco_url || '',
      doc_dados_bancarios: clinica.doc_dados_bancarios || false,
      doc_dados_bancarios_url: clinica.doc_dados_bancarios_url || '',
      doc_socios: clinica.doc_socios || false,
      doc_socios_url: clinica.doc_socios_url || '',
      doc_certidao_resp_tecnico: clinica.doc_certidao_resp_tecnico || false,
      doc_certidao_resp_tecnico_url: clinica.doc_certidao_resp_tecnico_url || '',
      doc_resp_tecnico: clinica.doc_resp_tecnico || false,
      doc_resp_tecnico_url: clinica.doc_resp_tecnico_url || '',
      visita_online: clinica.visita_online || false,
      visita_online_url: clinica.visita_online_url || '',
      visita_online_data: clinica.visita_online_data || '',
      visita_online_observacoes: clinica.visita_online_observacoes || '',
      doc_certidao_casamento: clinica.doc_certidao_casamento || false,
      doc_certidao_casamento_url: clinica.doc_certidao_casamento_url || '',
      // Novos campos
      telefone_socios: clinica.telefone_socios || '',
      email_socios: clinica.email_socios || '',
      doc_comprovante_endereco_socios: clinica.doc_comprovante_endereco_socios || false,
      doc_comprovante_endereco_socios_url: clinica.doc_comprovante_endereco_socios_url || '',
      doc_carteirinha_cro: clinica.doc_carteirinha_cro || false,
      doc_carteirinha_cro_url: clinica.doc_carteirinha_cro_url || '',
      banco_nome: clinica.banco_nome || '',
      banco_conta: clinica.banco_conta || '',
      banco_agencia: clinica.banco_agencia || '',
      banco_pix: clinica.banco_pix || '',
      limite_credito: clinica.limite_credito || ''
    });
    setCidadeCustomizada(cidadeEhCustomizada);
    loadSociosDocsList(clinica); // Carregar lista de documentos dos sócios
    setShowModal(true);
  };

  const handleView = (clinica) => {
    setViewingClinica(clinica);
    setViewModalOpen(true);
    // Buscar pacientes quando abrir o modal (será carregado quando clicar na aba)
  };

  const closeViewModal = () => {
    setViewModalOpen(false);
    setViewingClinica(null);
    setActiveViewTab('informacoes');
    setPacientesClinica([]);
  };

  const fetchPacientesClinica = async (clinicaId) => {
    setLoadingPacientes(true);
    try {
      const response = await makeRequest('/pacientes');
      const data = await response.json();
      
      if (response.ok) {
        // Filtrar apenas pacientes que tenham agendamentos nesta clínica
        const responseAgendamentos = await makeRequest('/agendamentos');
        const agendamentos = await responseAgendamentos.json();
        
        if (responseAgendamentos.ok) {
          const pacientesIds = agendamentos
            .filter(agendamento => agendamento.clinica_id === clinicaId)
            .map(agendamento => agendamento.paciente_id);
          
          const pacientesFiltrados = data.filter(paciente => 
            pacientesIds.includes(paciente.id)
          );
          
          setPacientesClinica(pacientesFiltrados);
        }
      } else {
        showErrorToast('Erro ao carregar pacientes: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error);
      showErrorToast('Erro ao carregar pacientes');
    } finally {
      setLoadingPacientes(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveViewTab(tab);
    
    // Carregar dados específicos da aba quando necessário
    if (tab === 'pacientes' && viewingClinica && pacientesClinica.length === 0) {
      fetchPacientesClinica(viewingClinica.id);
    }
  };

  const handleViewNovaClinica = (clinica) => {
    setViewingNovaClinica(clinica);
    setViewNovaClinicaModalOpen(true);
  };

  const closeViewNovaClinicaModal = () => {
    setViewNovaClinicaModalOpen(false);
    setViewingNovaClinica(null);
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

  const formatarCNPJ = (value) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      cnpj: '',
      endereco: '',
      bairro: '',
      cidade: '',
      estado: '',
      nicho: '',
      telefone: '',
      email: '',
      responsavel: '',
      status: 'ativa',
      // Campos de documentação
      doc_cartao_cnpj: false,
      doc_contrato_social: false,
      doc_alvara_sanitario: false,
      doc_balanco: false,
      doc_comprovante_endereco: false,
      doc_dados_bancarios: false,
      doc_socios: false,
      doc_certidao_resp_tecnico: false,
      doc_resp_tecnico: false,
      visita_online: false,
      doc_certidao_casamento: false,
      // Novos campos
      telefone_socios: '',
      email_socios: '',
      doc_comprovante_endereco_socios: false,
      doc_carteirinha_cro: false,
      banco_nome: '',
      banco_conta: '',
      banco_agencia: '',
      banco_pix: '',
      limite_credito: '',
      video_validacao: false,
      video_validacao_url: ''
    });
    setCidadeCustomizada(false);
    setEditingClinica(null);
    setShowModal(false);
  };

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
    let { name, value } = e.target;
    
    // Aplicar formatação específica baseada no campo
    if (name === 'telefone' || name === 'telefone_socios') {
      // Remove tudo que não é número
      let numbers = value.replace(/\D/g, '');
      
      // Remove zeros à esquerda (ex: 041 → 41)
      numbers = numbers.replace(/^0+/, '');
      
      // Limita a 11 dígitos
      numbers = numbers.substring(0, 11);
      
      // Formata baseado no tamanho
      if (numbers.length === 0) {
        value = '';
      } else if (numbers.length <= 2) {
        value = `(${numbers}`;
      } else if (numbers.length <= 6) {
        value = `(${numbers.substring(0, 2)}) ${numbers.substring(2)}`;
      } else if (numbers.length <= 10) {
        value = `(${numbers.substring(0, 2)}) ${numbers.substring(2, 6)}-${numbers.substring(6)}`;
      } else {
        value = `(${numbers.substring(0, 2)}) ${numbers.substring(2, 7)}-${numbers.substring(7, 11)}`;
      }
    } else if (name === 'cidade') {
      value = formatarCidade(value);
    } else if (name === 'cnpj') {
      value = formatarCNPJ(value);
    } else if (name === 'email' || name === 'email_login' || name === 'email_socios') {
      // Normalizar emails para minúsculas
      value = value.toLowerCase();
    } else if (name === 'banco_pix') {
      // Detectar e formatar PIX (CPF, CNPJ, telefone ou email)
      const numbers = value.replace(/\D/g, '');
      
      // Se parecer CPF (11 dígitos)
      if (numbers.length === 11 && !value.includes('@') && !value.includes('.')) {
        value = numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      }
      // Se parecer CNPJ (14 dígitos)
      else if (numbers.length === 14 && !value.includes('@') && !value.includes('.')) {
        value = numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
      }
      // Se parecer telefone (10 ou 11 dígitos)
      else if ((numbers.length === 10 || numbers.length === 11) && !value.includes('@')) {
        if (numbers.length === 11) {
          value = numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        } else {
          value = numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
        }
      }
      // Email - normalizar para minúsculas
      else if (value.includes('@')) {
        value = value.toLowerCase();
      }
      // Caso contrário, manter como está
    } else if (name === 'banco_agencia') {
      // Remove tudo que não é número ou hífen
      value = value.replace(/[^\d-]/g, '');
    } else if (name === 'banco_conta') {
      // Remove tudo que não é número ou hífen
      value = value.replace(/[^\d-]/g, '');
    }
    
    // Limpar cidade se estado mudar
    if (name === 'estado') {
      setFormData(prev => ({
        ...prev,
        estado: value,
        cidade: '' // Limpar cidade quando estado muda
      }));
      setCidadeCustomizada(false); // Resetar cidade customizada
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const getStatusClinicaInfo = (status) => {
    return statusClinicaOptions.find(option => option.value === status) || statusClinicaOptions[0];
  };

  const getStatusNovaClinicaInfo = (status) => {
    return statusNovaClinicaOptions.find(option => option.value === status) || statusNovaClinicaOptions[0];
  };

  const getStatusAnaliseInfo = (status) => {
    return statusAnaliseOptions.find(option => option.value === status) || statusAnaliseOptions[0];
  };

  const alterarStatusNovaClinica = async (clinicaId, novoStatus, evidenciaId = null) => {
    // VERIFICAR SE STATUS REQUER EVIDÊNCIA
    if (STATUS_COM_EVIDENCIA_CLINICAS.includes(novoStatus) && !evidenciaId) {
      const clinica = novasClinicas.find(c => c.id === clinicaId);
      if (clinica) {
        // Abrir modal de evidência
        setEvidenciaData({
          clinicaId: clinicaId,
          clinicaNome: clinica.nome,
          statusAnterior: clinica.status,
          statusNovo: novoStatus,
          tipoClinica: 'nova_clinica',
          evidenciaId: null
        });
        setShowEvidenciaModal(true);
      }
      return;
    }

    try {
      const response = await makeRequest(`/novas-clinicas/${clinicaId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ 
          status: novoStatus,
          evidencia_id: evidenciaId 
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        showSuccessToast('Status atualizado com sucesso!');
        fetchNovasClinicas();
      } else {
        showErrorToast('Erro ao alterar status: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      showErrorToast('Erro ao alterar status da clínica');
    }
  };

  // Função chamada quando evidência é enviada com sucesso
  const handleEvidenciaSuccess = async (evidenciaId) => {
    
    // Atualizar status baseado no tipo de clínica
    if (evidenciaData.tipoClinica === 'nova_clinica') {
      await alterarStatusNovaClinica(evidenciaData.clinicaId, evidenciaData.statusNovo, evidenciaId);
    } else {
      // Para clínicas gerais, chamar updateClinicaStatus
      await updateClinicaStatus(evidenciaData.clinicaId, evidenciaData.statusNovo, evidenciaId);
    }
  };

  // Função chamada quando modal de evidência é fechado/cancelado
  const handleEvidenciaClose = () => {
    setShowEvidenciaModal(false);
    setEvidenciaData({
      clinicaId: null,
      clinicaNome: '',
      statusAnterior: '',
      statusNovo: '',
      tipoClinica: '',
      evidenciaId: null
    });
  };

  // Função auxiliar para atualizar status de clínicas gerais
  const updateClinicaStatus = async (clinicaId, novoStatus, evidenciaId = null) => {
    const clinica = clinicas.find(c => c.id === clinicaId);
    if (!clinica) return;
    
    const clinicaParaAtualizar = { ...clinica, status: novoStatus };
    
    try {
      const response = await makeRequest(`/clinicas/${clinicaId}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...clinicaParaAtualizar,
          evidencia_id: evidenciaId
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        showSuccessToast('Status atualizado com sucesso!');
        fetchClinicas();
      } else {
        showErrorToast('Erro ao alterar status: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      showErrorToast('Erro ao alterar status da clínica');
    }
  };

  const handleNovaClinicaInputChange = (e) => {
    let { name, value } = e.target;
    
    // Aplicar formatação específica baseada no campo
    if (name === 'telefone') {
      // Remove tudo que não é número
      let numbers = value.replace(/\D/g, '');
      
      // Remove zeros à esquerda (ex: 041 → 41)
      numbers = numbers.replace(/^0+/, '');
      
      // Limita a 11 dígitos
      numbers = numbers.substring(0, 11);
      
      // Formata baseado no tamanho
      if (numbers.length === 0) {
        value = '';
      } else if (numbers.length <= 2) {
        value = `(${numbers}`;
      } else if (numbers.length <= 6) {
        value = `(${numbers.substring(0, 2)}) ${numbers.substring(2)}`;
      } else if (numbers.length <= 10) {
        value = `(${numbers.substring(0, 2)}) ${numbers.substring(2, 6)}-${numbers.substring(6)}`;
      } else {
        value = `(${numbers.substring(0, 2)}) ${numbers.substring(2, 7)}-${numbers.substring(7, 11)}`;
      }
    } else if (name === 'cnpj') {
      value = formatarCNPJ(value);
    } else if (name === 'cidade') {
      value = formatarCidade(value);
    }
    
    // Limpar cidade se estado mudar
    if (name === 'estado') {
      setNovaClinicaFormData(prev => ({
        ...prev,
        estado: value,
        cidade: '' // Limpar cidade quando estado muda
      }));
      setCidadeCustomizadaNova(false); // Resetar cidade customizada
    } else {
      setNovaClinicaFormData({
        ...novaClinicaFormData,
        [name]: value
      });
    }
  };

  const toggleStatus = async (clinica) => {
    const novaStatus = clinica.status === 'ativa' ? 'inativa' : 'ativa';
    const acao = novaStatus === 'ativa' ? 'ativar' : 'inativar';
    
    if (!window.confirm(`Deseja ${acao} a clínica "${clinica.nome}"?`)) {
      return;
    }

    // Buscar a clínica completa para garantir todos os campos
    const clinicaCompleta = clinicas.find(c => c.id === clinica.id);
    if (!clinicaCompleta) {
      showErrorToast('Erro: clínica não encontrada.');
      return;
    }
    const clinicaParaAtualizar = { ...clinicaCompleta, status: novaStatus };

    try {
      const response = await makeRequest(`/clinicas/${clinica.id}`, {
        method: 'PUT',
        body: JSON.stringify(clinicaParaAtualizar)
      });

      const data = await response.json();
      
      if (response.ok) {
        showSuccessToast(`Clínica ${acao === 'ativar' ? 'ativada' : 'inativada'} com sucesso!`);
        fetchClinicas();
      } else {
        showErrorToast('Erro ao alterar status: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      showErrorToast('Erro ao alterar status da clínica');
    }
  };

  // Filtrar clínicas (excluir as que estão em análise)
  const clinicasFiltradas = clinicas.filter(clinica => {
    // Excluir clínicas em análise (elas aparecem na aba "Em Análise")
    if (clinica.em_analise === true) return false;
    
    const matchEstado = !filtroEstado || clinica.estado === filtroEstado;
    const matchCidade = !filtroCity || clinica.cidade?.toLowerCase().includes(filtroCity.toLowerCase());
    const matchStatus = !filtroStatus || clinica.status === filtroStatus;
    return matchEstado && matchCidade && matchStatus;
  });

  // Obter listas únicas para filtros (excluindo clínicas em análise)
  const estadosDisponiveis = [...new Set(clinicas
    .filter(c => !c.em_analise)
    .map(c => c.estado)
    .filter(estado => estado && estado.trim() !== '')
  )].sort();

  const cidadesDisponiveis = [...new Set(clinicas
    .filter(c => !c.em_analise && (!filtroEstado || c.estado === filtroEstado))
    .map(c => c.cidade)
    .filter(cidade => cidade && cidade.trim() !== '')
  )].sort();

  // Obter cidades sugeridas baseadas no estado selecionado
  const cidadesSugeridas = formData.estado ? (cidadesPorEstado[formData.estado] || []) : [];

  const handleTutorialComplete = () => {
    setShowTutorial(false);
    setTutorialCompleted(true);
    localStorage.setItem('tutorial-clinicas-completed', 'true');
  };

  const handleTutorialClose = () => {
    setShowTutorial(false);
    localStorage.setItem('tutorial-clinicas-dismissed', 'true');
  };

  const startTutorial = () => {
    setShowTutorial(true);
  };

  // Função para visualizar documento com autenticação
  const handleVisualizarDocumento = async (clinicaId, tipoDoc) => {
    try {
      const response = await makeRequest(`/clinicas/${clinicaId}/documentos/${tipoDoc}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        
        // Limpar o objeto URL após um tempo
        setTimeout(() => window.URL.revokeObjectURL(url), 100);
      } else {
        showErrorToast('Erro ao carregar documento');
      }
    } catch (error) {
      console.error('Erro ao visualizar documento:', error);
      showErrorToast('Erro ao visualizar documento');
    }
  };

  // Funções para aprovar/reprovar documentos
  const handleAprovarDocumento = async (clinicaId, tipoDoc) => {
    try {
      const response = await makeRequest(`/clinicas/${clinicaId}/documentos/${tipoDoc}/aprovar`, {
        method: 'PUT'
      });
      
      if (response.ok) {
        showSuccessToast('Documento aprovado com sucesso!');
        // Atualizar a clínica no estado local
        if (viewingClinica) {
          setViewingClinica({
            ...viewingClinica,
            [`${tipoDoc}_aprovado`]: true
          });
        }
        // Recarregar dados da clínica
        await fetchClinicas();
      } else {
        const error = await response.json();
        showErrorToast(error.error || 'Erro ao aprovar documento');
      }
    } catch (error) {
      console.error('Erro ao aprovar documento:', error);
      showErrorToast('Erro ao aprovar documento');
    }
  };

  const handleReprovarDocumento = async (clinicaId, tipoDoc) => {
    try {
      const motivo = prompt('Motivo da reprovação (opcional):');
      
      const response = await makeRequest(`/clinicas/${clinicaId}/documentos/${tipoDoc}/reprovar`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ motivo })
      });
      
      if (response.ok) {
        showSuccessToast('Documento reprovado!');
        // Atualizar a clínica no estado local
        if (viewingClinica) {
          setViewingClinica({
            ...viewingClinica,
            [`${tipoDoc}_aprovado`]: false
          });
        }
        // Recarregar dados da clínica
        await fetchClinicas();
      } else {
        const error = await response.json();
        showErrorToast(error.error || 'Erro ao reprovar documento');
      }
    } catch (error) {
      console.error('Erro ao reprovar documento:', error);
      showErrorToast('Erro ao reprovar documento');
    }
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

  return (
    <div style={{ padding: '1.5rem' }}>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page-title">{isConsultor ? 'Minhas Clínicas' : 'Gerenciar Clínicas'}</h1>
            <p className="page-subtitle">{isConsultor ? 'Visualize as clínicas indicadas' : 'Gerencie as clínicas parceiras'}</p>
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
            title="Ver tutorial da tela de clínicas"
          >
            Ver Tutorial
          </button>
          )}
        </div>

        <div style={{
          borderRadius: '8px',
          padding: '1rem',
          marginTop: '1rem',
          fontSize: '0.875rem'
        }}>
          
          
          {/* Links personalizados para consultores freelancers (não internos) */}
          {isConsultor && !isConsultorInterno && (
            <div style={{ 
              marginTop: '1rem', 
              padding: '0.75rem',  
              borderRadius: '6px' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'blue' }}>
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
                <strong style={{ color: 'blue' }}>Meu Link de Indicação</strong>
              </div>
              
              {loadingLink ? (
                <div style={{ textAlign: 'center', padding: '1rem', color: '#6b7280' }}>
                  <div style={{ 
                    width: '1.5rem', 
                    height: '1.5rem', 
                    border: '2px solid #f0fdf4', 
                    borderTop: '2px solid #f0fdf4', 
                    borderRadius: '50%', 
                    animation: 'spin 1s linear infinite', 
                    margin: '0 auto 0.5rem' 
                  }}></div>
                  Carregando links...
                </div>
              ) : (linkPersonalizado || linkClinicas) ? (
                <div>
                  {/* Link para Clínicas */}
                  {linkClinicas && (
                    <div style={{ 
                      backgroundColor: '#eff6ff', 
                      border: '1px solid #93c5fd', 
                      borderRadius: '8px', 
                      padding: '1rem'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        marginBottom: '0.5rem'
                      }}>
                        <span style={{ 
                          color: '#1d4ed8', 
                          fontWeight: '600',
                          fontSize: '0.9rem'
                        }}>
                          Link para Clínicas:
                        </span>
                        <button
                          onClick={() => copiarLink(linkClinicas)}
                          style={{
                            background: '#2563eb',
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
                        color: '#1d4ed8', 
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        wordBreak: 'break-all',
                        lineHeight: '1.4',
                        backgroundColor: 'rgba(255,255,255,0.7)',
                        padding: '8px',
                        borderRadius: '6px'
                      }}>
                        {linkClinicas}
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

      {/* Navegação por abas - Mostrar para admin, consultor interno E consultores (freelancers) */}
      {(isAdmin || isConsultorInterno || isConsultor) && (
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'clinicas' ? 'active' : ''}`}
            onClick={() => setActiveTab('clinicas')}
          >
            Clínicas
          </button>
          
          {(isAdmin || isConsultorInterno) && (
            <button
              className={`tab ${activeTab === 'em-analise' ? 'active' : ''}`}
              onClick={() => setActiveTab('em-analise')}
              style={{ position: 'relative' }}
            >
              Em Análise
              {clinicasEmAnalise.length > 0 && (
                <span className="tab-badge">{clinicasEmAnalise.length}</span>
              )}
            </button>
          )}
          
          {/* Aba Novas Clínicas: apenas para Admin e Consultores Freelancers (NÃO consultor interno) */}
          {(isAdmin || (isConsultor && !isConsultorInterno)) && (
          <button
            className={`tab ${activeTab === 'novas-clinicas' ? 'active' : ''}`}
            onClick={() => setActiveTab('novas-clinicas')}
            style={{ position: 'relative' }}
          >
              {isAdmin ? 'Novas Clínicas' : 'Minhas Indicações'}
            {novasClinicas.length > 0 && (
              <span className="tab-badge">{novasClinicas.length}</span>
            )}
          </button>
          )}
          
          {(isAdmin || isConsultorInterno) && (
          <button
            className={`tab ${activeTab === 'mapa' ? 'active' : ''}`}
            onClick={() => setActiveTab('mapa')}
          >
            Mapa
          </button>
          )}
        </div>
      )}

      {/* Conteúdo da aba Mapa */}
      {activeTab === 'mapa' && (
        <div className="card" style={{ 
          padding: 0, 
          overflow: 'hidden',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
          borderRadius: '12px',
          zoom: window.innerWidth <= 768 ? '0.75' : '1.00'
        }}>
          {/* Header Moderno */}
          <div style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '1.5rem 2rem',
            color: 'white'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ 
                  fontSize: '1.75rem', 
                  fontWeight: '700',
                  margin: 0,
                  color: 'white',
                  textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  🗺️ Mapa de Clínicas
                </h2>
                <p style={{ 
                  fontSize: '0.95rem', 
                  opacity: 0.95,
                  marginTop: '0.5rem',
                  margin: '0.5rem 0 0 0'
                }}>
                  Visualização geográfica de todas as clínicas parceiras e prospects
                </p>
              </div>
              
              {/* Estatísticas */}
              <div style={{ 
                display: 'flex', 
                gap: '2rem',
                alignItems: 'center'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ 
                    fontSize: '2rem', 
                    fontWeight: '700',
                    lineHeight: 1
                  }}>
                    {clinicasGeo.length}
                  </div>
                  <div style={{ 
                    fontSize: '0.75rem', 
                    opacity: 0.9,
                    marginTop: '0.25rem'
                  }}>
                    Clínicas Parceiras
                  </div>
                </div>
                <div style={{ 
                  width: '1px', 
                  height: '40px', 
                  backgroundColor: 'rgba(255,255,255,0.3)' 
                }}></div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ 
                    fontSize: '2rem', 
                    fontWeight: '700',
                    lineHeight: 1
                  }}>
                    {novasClinicasGeo.length}
                  </div>
                  <div style={{ 
                    fontSize: '0.75rem', 
                    opacity: 0.9,
                    marginTop: '0.25rem'
                  }}>
                    Novas Clínicas
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Barra de Legenda Moderna */}
          <div style={{ 
            backgroundColor: '#f8fafc',
            padding: '1rem 2rem',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                backgroundColor: 'white',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}>
                <div style={{ 
                  width: '12px', 
                  height: '12px', 
                  borderRadius: '50%',
                  backgroundColor: '#10b981',
                  boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.2)'
                }}></div>
                <span style={{ 
                  fontSize: '0.875rem', 
                  fontWeight: '600',
                  color: '#1f2937'
                }}>
                  Clínicas Parceiras
                </span>
              </div>
              
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                backgroundColor: 'white',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}>
                <div style={{ 
                  width: '12px', 
                  height: '12px', 
                  borderRadius: '50%',
                  backgroundColor: '#f59e0b',
                  boxShadow: '0 0 0 3px rgba(245, 158, 11, 0.2)'
                }}></div>
                <span style={{ 
                  fontSize: '0.875rem', 
                  fontWeight: '600',
                  color: '#1f2937'
                }}>
                  Novas Clínicas (Prospects)
                </span>
              </div>
            </div>

            {geocoding && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                backgroundColor: '#fef3c7',
                borderRadius: '8px',
                border: '1px solid #fcd34d'
              }}>
                <div className="spinner" style={{ 
                  width: '16px', 
                  height: '16px',
                  border: '2px solid #f59e0b',
                  borderTopColor: 'transparent'
                }}></div>
                <span style={{ 
                  fontSize: '0.875rem', 
                  color: '#92400e',
                  fontWeight: '500'
                }}>
                  Carregando localizações...
                </span>
              </div>
            )}
          </div>

          {/* Mapa com bordas arredondadas */}
          <div style={{ 
            height: '600px', 
            width: '100%',
            position: 'relative',
            backgroundColor: '#e5e7eb'
          }}>
            <MapContainer
              center={clinicasGeo[0] ? [clinicasGeo[0].lat, clinicasGeo[0].lon] : [-15.7801, -47.9292]}
              zoom={clinicasGeo.length > 0 ? 11 : 5}
              style={{ 
                height: '100%', 
                width: '100%'
              }}
              zoomControl={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Clínicas Parceiras */}
              {clinicasGeo.map(({ lat, lon, item }) => (
                <CircleMarker 
                  key={`c-${item.id}`} 
                  center={[lat, lon]} 
                  radius={10} 
                  pathOptions={{ 
                    color: '#059669',
                    fillColor: '#10b981', 
                    fillOpacity: 0.9,
                    weight: 2
                  }}
                >
                  <Popup>
                    <div style={{ 
                      minWidth: '250px',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                    }}>
                      <div style={{ 
                        backgroundColor: '#10b981',
                        margin: '-12px -12px 12px -12px',
                        padding: '12px',
                        borderRadius: '4px 4px 0 0'
                      }}>
                        <strong style={{ 
                          color: 'white',
                          fontSize: '1.1rem'
                        }}>
                          {item.nome}
                        </strong>
                      </div>
                      
                      {item.nicho && (
                        <div style={{ 
                          marginBottom: '8px',
                          padding: '4px 8px',
                          backgroundColor: '#ecfdf5',
                          borderRadius: '4px',
                          display: 'inline-block'
                        }}>
                          <span style={{ 
                            color: '#065f46',
                            fontSize: '0.875rem',
                            fontWeight: '600'
                          }}>
                            {item.nicho}
                          </span>
                        </div>
                      )}
                      
                      {(item.endereco || item.cidade || item.estado) && (
                        <div style={{ 
                          color: '#4b5563', 
                          marginBottom: '8px',
                          fontSize: '0.875rem'
                        }}>
                          📍 {item.endereco && <span>{item.endereco}<br/></span>}
                          {(item.cidade || item.estado) && (
                            <span style={{ fontWeight: '500' }}>
                              {item.cidade}{item.estado ? `, ${item.estado}` : ''}
                            </span>
                          )}
                        </div>
                      )}
                      
                      {item.telefone && (
                        <div style={{ 
                          color: '#4b5563',
                          fontSize: '0.875rem'
                        }}>
                          📞 {formatarTelefone(item.telefone)}
                        </div>
                      )}
                      
                      {item.email && (
                        <div style={{ 
                          color: '#4b5563',
                          fontSize: '0.875rem',
                          marginTop: '4px'
                        }}>
                          ✉️ {item.email}
                        </div>
                      )}
                    </div>
                  </Popup>
                </CircleMarker>
              ))}

              {/* Novas Clínicas */}
              {novasClinicasGeo.map(({ lat, lon, item }) => (
                <CircleMarker 
                  key={`n-${item.id}`} 
                  center={[lat, lon]} 
                  radius={10} 
                  pathOptions={{ 
                    color: '#d97706',
                    fillColor: '#f59e0b', 
                    fillOpacity: 0.9,
                    weight: 2
                  }}
                >
                  <Popup>
                    <div style={{ 
                      minWidth: '250px',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                    }}>
                      <div style={{ 
                        backgroundColor: '#f59e0b',
                        margin: '-12px -12px 12px -12px',
                        padding: '12px',
                        borderRadius: '4px 4px 0 0'
                      }}>
                        <strong style={{ 
                          color: 'white',
                          fontSize: '1.1rem'
                        }}>
                          {item.nome}
                        </strong>
                        <div style={{ 
                          fontSize: '0.75rem',
                          opacity: 0.9,
                          marginTop: '2px'
                        }}>
                          Nova Clínica (Prospect)
                        </div>
                      </div>
                      
                      {item.status && (
                        <div style={{ marginBottom: '8px' }}>
                          <span style={{ 
                            padding: '4px 8px',
                            backgroundColor: getStatusNovaClinicaInfo(item.status)?.color + '20',
                            color: getStatusNovaClinicaInfo(item.status)?.color,
                            borderRadius: '4px',
                            fontSize: '0.875rem',
                            fontWeight: '600'
                          }}>
                            {getStatusNovaClinicaInfo(item.status)?.label || item.status}
                          </span>
                        </div>
                      )}
                      
                      {item.endereco && (
                        <div style={{ 
                          color: '#4b5563', 
                          marginBottom: '8px',
                          fontSize: '0.875rem'
                        }}>
                          📍 {item.endereco}
                        </div>
                      )}
                      
                      {item.telefone && (
                        <div style={{ 
                          color: '#4b5563',
                          fontSize: '0.875rem'
                        }}>
                          📞 {formatarTelefone(item.telefone)}
                        </div>
                      )}
                      
                      {item.observacoes && (
                        <div style={{ 
                          marginTop: '8px',
                          padding: '8px',
                          backgroundColor: '#fef3c7',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          color: '#78350f'
                        }}>
                          💬 {item.observacoes}
                        </div>
                      )}
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        </div>
      )}
      {/* Conteúdo da aba Clínicas */}
      {activeTab === 'clinicas' && (
        <>
          {/* Resumo de Estatísticas */}
          <div 
            className="stats-grid" 
            style={{ 
              marginBottom: '2rem',
              // Grid 2x2 para freelancers e empresas, 6 colunas para admin/interno
              gridTemplateColumns: (isAdmin || isConsultorInterno) 
                ? 'repeat(auto-fit, minmax(150px, 1fr))' 
                : 'repeat(2, 1fr)'
            }}
          >
            <div className="stat-card">
              <div className="stat-label">Total</div>
              <div className="stat-value">{clinicas.filter(c => !c.em_analise).length}</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-label">Odontológica</div>
              <div className="stat-value">{clinicas.filter(c => c.nicho === 'Odontológico' && !c.em_analise).length}</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-label">Estética</div>
              <div className="stat-value">{clinicas.filter(c => c.nicho === 'Estético' && !c.em_analise).length}</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-label">Ambos</div>
              <div className="stat-value">{clinicas.filter(c => c.nicho === 'Ambos' && !c.em_analise).length}</div>
            </div>
          </div>

          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="card-title">Lista de Clínicas</h2>
              <div style={{ display: 'flex', gap: '1rem' }}>
                {isConsultor && !isConsultorInterno && (
                  <button 
                    className="btn btn-primary"
                    onClick={() => setShowNovaClinicaModal(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    Indicar Clínica
                  </button>
                )}
            {(isAdmin || isConsultorInterno) && (
              <button 
                className="btn btn-primary"
                onClick={() => setShowModal(true)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Cadastrar Nova Clínica
              </button>
            )}
              </div>
          </div>

        {/* Seção de Filtros */}
        <div style={{ 
          marginBottom: '1.5rem',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '1rem 1.5rem'
          }}>
            <h3 style={{ 
              fontSize: '1.1rem', 
              fontWeight: '600', 
              color: '#1a1d23', 
              margin: 0
            }}>
              Filtros
            </h3>
            <button 
              className="btn btn-secondary"
              onClick={() => setMostrarFiltros(!mostrarFiltros)}
              style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
            >
              {mostrarFiltros ? 'Ocultar Filtros' : 'Mostrar Filtros'}
            </button>
          </div>
          
          {mostrarFiltros && (
            <div style={{ padding: '0 1.5rem 1.5rem 1.5rem' }}>
              {(filtroEstado || filtroCity || filtroStatus) && (
                <button 
                  onClick={() => {
                    setFiltroEstado('');
                    setFiltroCity('');
                    setFiltroStatus('');
                  }}
                  className="btn btn-secondary"
                  style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', marginBottom: '1rem' }}
                >
                  Limpar Filtros
                </button>
              )}
              
              <div className="grid grid-4">
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Estado</label>
              <select
                value={filtroEstado}
                onChange={(e) => {
                  setFiltroEstado(e.target.value);
                  setFiltroCity('');
                }}
                className="form-select"
              >
                <option value="">Todos os estados</option>
                {estadosDisponiveis.map(estado => {
                  const estadoInfo = estadosBrasileiros.find(e => e.sigla === estado);
                  return (
                    <option key={estado} value={estado}>
                      {estado} - {estadoInfo?.nome || estado}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Cidade</label>
              <select
                value={filtroCity}
                onChange={(e) => setFiltroCity(e.target.value)}
                className="form-select"
                disabled={!filtroEstado && cidadesDisponiveis.length > 20}
              >
                <option value="">Todas as cidades</option>
                {cidadesDisponiveis.slice(0, 50).map(cidade => (
                  <option key={cidade} value={cidade}>{cidade}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Status</label>
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="form-select"
              >
                <option value="">Todas as clínicas</option>
                <option value="ativa">Ativas</option>
                <option value="inativa">Inativas</option>
                <option value="em_contato">Em Contato</option>
                <option value="nao_fechou">Não Fechou</option>
              </select>
            </div>
          </div>
            </div>
          )}
        </div>

          {(filtroEstado || filtroCity || filtroStatus) && (
            <div style={{ 
              marginTop: '-1rem',
              marginBottom: '1rem', 
              padding: '0.75rem', 
              backgroundColor: '#f3f4f6', 
              borderRadius: '6px',
              color: '#4b5563',
              fontSize: '0.9rem'
            }}>
              Mostrando <strong>{clinicasFiltradas.length}</strong> de {clinicas.length} clínica(s)
            </div>
          )}

        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
          </div>
        ) : clinicasFiltradas.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#6b7280', padding: '2rem' }}>
            {filtroEstado || filtroCity || filtroStatus
              ? 'Nenhuma clínica encontrada com os filtros aplicados.'
              : 'Nenhuma clínica aprovada ainda.'
            }
          </p>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th style={{ display: isMobile ? 'none' : 'table-cell' }}>Nicho</th>
                  <th style={{ display: isMobile ? 'none' : 'table-cell' }}>Contato</th>
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
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {clinicasFiltradas.map(clinica => (
                  <tr key={clinica.id} className={clinica.status === 'inativa' ? 'clinica-bloqueada' : ''}>
                    <td>
                      <strong>{clinica.nome}</strong>
                    </td>
                    <td style={{ display: isMobile ? 'none' : 'table-cell' }}>
                      {clinica.nicho ? (
                        <span className="badge" style={{ backgroundColor: '#e5e7eb', color: '#374151' }}>
                          {clinica.nicho}
                        </span>
                      ) : '-'}
                    </td>
                    <td style={{ display: isMobile ? 'none' : 'table-cell' }}>
                      {clinica.telefone && (
                        <div>{formatarTelefone(clinica.telefone)}</div>
                      )}
                      {clinica.email && (
                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{clinica.email?.toLowerCase()}</div>
                      )}
                      {!clinica.telefone && !clinica.email && '-'}
                    </td>
                    <td>
                      {(isAdmin || podeAlterarStatus) ? (
                        <select
                          value={clinica.status}
                          onChange={(e) => {
                            const novoStatus = e.target.value;
                            
                            // VERIFICAR SE STATUS REQUER EVIDÊNCIA
                            if (STATUS_COM_EVIDENCIA_CLINICAS.includes(novoStatus)) {
                              setEvidenciaData({
                                clinicaId: clinica.id,
                                clinicaNome: clinica.nome,
                                statusAnterior: clinica.status,
                                statusNovo: novoStatus,
                                tipoClinica: 'clinica',
                                evidenciaId: null
                              });
                              setShowEvidenciaModal(true);
                              return;
                            }
                            
                            // Para outros status, atualizar normalmente
                            const clinicaCompleta = clinicas.find(c => c.id === clinica.id);
                            if (clinicaCompleta) {
                              const clinicaParaAtualizar = { ...clinicaCompleta, status: novoStatus };
                              makeRequest(`/clinicas/${clinica.id}`, {
                                method: 'PUT',
                                body: JSON.stringify(clinicaParaAtualizar)
                              }).then(response => response.json()).then(data => {
                                if (data.error) {
                                  showErrorToast('Erro ao alterar status: ' + data.error);
                                } else {
                                  showSuccessToast('Status atualizado com sucesso!');
                                  fetchClinicas();
                                }
                              }).catch(error => {
                                console.error('Erro ao alterar status:', error);
                                showErrorToast('Erro ao alterar status da clínica');
                              });
                            }
                          }}
                          className="form-select"
                          style={{
                            fontSize: '0.75rem',
                            padding: '0.25rem 0.5rem',
                            border: 'none',
                            backgroundColor: getStatusClinicaInfo(clinica.status).color + '20',
                            color: getStatusClinicaInfo(clinica.status).color,
                            fontWeight: '600',
                            borderRadius: '0.375rem'
                          }}
                        >
                          {statusClinicaOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span 
                          className="badge"
                          style={{
                            backgroundColor: getStatusClinicaInfo(clinica.status).color + '20',
                            color: getStatusClinicaInfo(clinica.status).color,
                            fontWeight: '600',
                            borderRadius: '0.375rem'
                          }}
                        >
                          {getStatusClinicaInfo(clinica.status).label}
                        </span>
                      )}
                    </td>
                    <td>
                      {isConsultor ? (
                        <button
                          onClick={() => handleView(clinica)}
                          className="btn-action"
                          title="Visualizar"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => handleView(clinica)}
                            className="btn-action"
                            title="Visualizar"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </button>
                          {(isAdmin || podeAlterarStatus) && (
                            <>
                              <button
                                onClick={() => handleEdit(clinica)}
                                className="btn-action"
                                title="Editar"
                                style={{ marginLeft: '0.5rem' }}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </button>
                            </>
                          )}
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => handleGerenciarAcesso(clinica)}
                                className="btn-action"
                                title={clinica.ativo_no_sistema ? "Editar Acesso" : "Criar Acesso"}
                                style={{ 
                                  marginLeft: '0.5rem', 
                                  color: clinica.ativo_no_sistema ? '#10b981' : '#3b82f6' 
                                }}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteClinica(clinica.id)}
                                className="btn-action"
                                title="Excluir"
                                style={{ marginLeft: '0.5rem', color: '#dc2626' }}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                  <line x1="10" y1="11" x2="10" y2="17" />
                                  <line x1="14" y1="11" x2="14" y2="17" />
                                </svg>
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </div>
        </>
      )}

      {/* Conteúdo da aba Novas Clínicas */}
      {activeTab === 'novas-clinicas' && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="card-title">Novas Clínicas Encontradas</h2>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                {novasClinicas.length} clínica(s) disponível(eis)
              </div>
              <button 
                className="btn btn-primary"
                onClick={() => setShowNovaClinicaModal(true)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                {user?.tipo === 'empresa' ? 'Indicar Nova Clínica' : 'Cadastrar Nova Clínica'}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
            </div>
          ) : novasClinicas.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#6b7280', padding: '3rem' }}>
              Nenhuma nova clínica encontrada no momento.
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th style={{ display: isMobile ? 'none' : 'table-cell' }}>Nicho</th>
                    <th style={{ display: isMobile ? 'none' : 'table-cell' }}>Telefone</th>
                    <th style={{ display: isMobile ? 'none' : 'table-cell' }}>Email</th>
                    <th style={{ display: isMobile ? 'none' : 'table-cell' }}>
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
                    <th style={{ display: isMobile ? 'none' : 'table-cell' }}>Cadastrado</th>
                    <th style={{ width: '220px' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {novasClinicas.map(clinica => {
                    const statusInfo = getStatusNovaClinicaInfo(clinica.status);
                    return (
                      <tr key={clinica.id}>
                        <td>
                          <div>
                            <strong>{clinica.nome}</strong>
                            {clinica.observacoes && (
                              <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                                {clinica.observacoes}
                              </div>
                            )}
                          </div>
                        </td>
                        <td style={{ display: isMobile ? 'none' : 'table-cell' }}>{clinica.nicho || '-'}</td>
                        <td style={{ display: isMobile ? 'none' : 'table-cell' }}>{formatarTelefone(clinica.telefone) || '-'}</td>
                        <td style={{ display: isMobile ? 'none' : 'table-cell' }}>
                          {clinica.email ? (
                            <span style={{ fontSize: '0.875rem' }}>{clinica.email?.toLowerCase()}</span>
                          ) : '-'}
                        </td>
                        <td style={{ display: isMobile ? 'none' : 'table-cell' }}>
                          {(isAdmin || podeAlterarStatus) ? (
                            <select
                              value={clinica.status}
                              onChange={(e) => alterarStatusNovaClinica(clinica.id, e.target.value)}
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
                              {statusNovaClinicaOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span 
                              className="badge"
                              style={{
                                backgroundColor: statusInfo.color + '20',
                                color: statusInfo.color,
                                border: `1px solid ${statusInfo.color}`
                              }}
                            >
                              {statusInfo.label}
                            </span>
                          )}
                        </td>
                        <td style={{ display: isMobile ? 'none' : 'table-cell' }}>{formatarData(clinica.created_at)}</td>
                        <td style={{
                            }}>
                          <button
                            onClick={() => handleViewNovaClinica(clinica)}
                            className="btn-action"
                            title="Visualizar informações"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => handleEditNovaClinica(clinica)}
                                className="btn-action"
                                title="Editar"
                                style={{ marginLeft: '0.5rem' }}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteNovaClinica(clinica.id)}
                                className="btn-action"
                                title="Excluir"
                                style={{ marginLeft: '0.5rem', color: '#dc2626' }}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                  <line x1="10" y1="11" x2="10" y2="17" />
                                  <line x1="14" y1="11" x2="14" y2="17" />
                                </svg>
                              </button>
                              <button
                                onClick={() => aprovarClinica(clinica.id)}
                                className="btn btn-primary"
                                style={{ 
                                  fontSize: '0.875rem', 
                                  padding: '0.5rem 0.75rem', 
                                  whiteSpace: 'nowrap',
                                  marginLeft: '0.5rem'
                                }}
                              >
                                Aprovar
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Conteúdo da aba Em Análise */}
      {activeTab === 'em-analise' && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="card-title">Clínicas em Análise</h2>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                {clinicasEmAnalise.length} clínica(s) em análise
              </div>
            </div>
          </div>

          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
            </div>
          ) : clinicasEmAnalise.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#6b7280', padding: '3rem' }}>
              Nenhuma clínica em análise no momento.
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th style={{ display: isMobile ? 'none' : 'table-cell', width: '100px', maxWidth: '100px' }}>Nicho</th>
                    <th>Status</th>
                    <th style={{ display: isMobile ? 'none' : 'table-cell' }}>Documentação</th>
                    <th style={{ display: isMobile ? 'none' : 'table-cell' }}>Vídeo Validação</th>
                    <th style={{ display: isMobile ? 'none' : 'table-cell' }}>Cadastrado</th>
                    <th style={{ width: '280px' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {clinicasEmAnalise.map(clinica => {
                    const statusInfo = getStatusAnaliseInfo(clinica.status);
                    
                    // Calcular progresso de documentação
                    const totalDocs = 11;
                    const docsEnviados = [
                      clinica.doc_cartao_cnpj,
                      clinica.doc_contrato_social,
                      clinica.doc_alvara_sanitario,
                      clinica.doc_balanco,
                      clinica.doc_comprovante_endereco,
                      clinica.doc_dados_bancarios,
                      clinica.doc_socios,
                      clinica.doc_certidao_resp_tecnico,
                      clinica.doc_resp_tecnico,
                      clinica.doc_comprovante_endereco_socios,
                      clinica.doc_carteirinha_cro
                    ].filter(Boolean).length;
                    
                    const docsAprovados = [
                      clinica.doc_cartao_cnpj_aprovado,
                      clinica.doc_contrato_social_aprovado,
                      clinica.doc_alvara_sanitario_aprovado,
                      clinica.doc_balanco_aprovado,
                      clinica.doc_comprovante_endereco_aprovado,
                      clinica.doc_dados_bancarios_aprovado,
                      clinica.doc_socios_aprovado,
                      clinica.doc_certidao_resp_tecnico_aprovado,
                      clinica.doc_resp_tecnico_aprovado,
                      clinica.doc_comprovante_endereco_socios_aprovado,
                      clinica.doc_carteirinha_cro_aprovado
                    ].filter(v => v === true).length;
                    
                    return (
                      <tr key={clinica.id}>
                        <td>
                          <strong>{clinica.nome}</strong>
                        </td>
                        <td style={{ display: isMobile ? 'none' : 'table-cell', width: '100px', maxWidth: '100px' }}>
                          {clinica.nicho ? (
                            <span className="badge" style={{ 
                              backgroundColor: '#e5e7eb', 
                              color: '#374151',
                              display: 'block',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {clinica.nicho}
                            </span>
                          ) : '-'}
                        </td>
                        <td>
                          {isAdmin ? (
                            <select
                              value={clinica.status}
                              onChange={async (e) => {
                                const novoStatus = e.target.value;
                                
                                try {
                                  const response = await makeRequest(`/clinicas/${clinica.id}`, {
                                    method: 'PUT',
                                    body: JSON.stringify({
                                      ...clinica,
                                      status: novoStatus,
                                      em_analise: novoStatus !== 'ativa' // Remove de análise se status = ativa
                                    })
                                  });
                                  
                                  if (response.ok) {
                                    showSuccessToast('Status atualizado com sucesso!');
                                    fetchClinicasEmAnalise();
                                    fetchClinicas(); // Atualizar clínicas gerais também
                                  } else {
                                    const data = await response.json();
                                    showErrorToast('Erro ao alterar status: ' + data.error);
                                  }
                                } catch (error) {
                                  console.error('Erro ao alterar status:', error);
                                  showErrorToast('Erro ao alterar status da clínica');
                                }
                              }}
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
                              {statusAnaliseOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span 
                              className="badge"
                              style={{
                                backgroundColor: statusInfo.color + '20',
                                color: statusInfo.color,
                                fontWeight: '600',
                                borderRadius: '0.375rem'
                              }}
                            >
                              {statusInfo.label}
                            </span>
                          )}
                        </td>
                        <td style={{ display: isMobile ? 'none' : 'table-cell' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                              {docsEnviados}/{totalDocs} enviados
                            </div>
                            <div style={{ 
                              width: '100px', 
                              height: '6px', 
                              backgroundColor: '#e5e7eb',
                              borderRadius: '3px',
                              overflow: 'hidden'
                            }}>
                              <div style={{ 
                                width: `${(docsEnviados / totalDocs) * 100}%`,
                                height: '100%',
                                backgroundColor: docsAprovados === totalDocs ? '#10b981' : '#3b82f6',
                                transition: 'width 0.3s ease'
                              }} />
                            </div>
                            {docsAprovados > 0 && (
                              <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '600' }}>
                                {docsAprovados} aprovados
                              </div>
                            )}
                          </div>
                        </td>
                        <td style={{ display: isMobile ? 'none' : 'table-cell' }}>
                          {clinica.video_validacao_url ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'center' }}>
                              <span style={{ 
                                fontSize: '0.75rem', 
                                color: '#10b981', 
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <circle cx="12" cy="12" r="10"/>
                                  <polyline points="10 8 16 12 10 16"/>
                                </svg>
                                Enviado
                              </span>
                              <button
                                onClick={() => window.open(`http://localhost:5000/api/documents/download/${clinica.id}/video_validacao`, '_blank')}
                                className="btn btn-sm btn-secondary"
                                style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
                              >
                                Assistir
                              </button>
                            </div>
                          ) : (
                            <label 
                              className="btn btn-sm btn-primary" 
                              style={{ fontSize: '0.7rem', padding: '0.3rem 0.5rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                            >
                              <input
                                type="file"
                                style={{ display: 'none' }}
                                accept="video/mp4,video/avi,video/mov,video/wmv,video/webm,video/mkv"
                                onChange={async (e) => {
                                  const file = e.target.files[0];
                                  if (!file) return;
                                  
                                  if (file.size > 250 * 1024 * 1024) {
                                    showErrorToast('Vídeo muito grande! Máximo 250MB');
                                    return;
                                  }
                                  
                                  setUploadingDocs(prev => ({ ...prev, [`video_validacao_${clinica.id}`]: true }));
                                  
                                  const formData = new FormData();
                                  formData.append('document', file);
                                  
                                  try {
                                    const response = await fetch(`http://localhost:5000/api/documents/upload/${clinica.id}/video_validacao`, {
                                      method: 'POST',
                                      headers: {
                                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                                      },
                                      body: formData
                                    });
                                    
                                    if (response.ok) {
                                      showSuccessToast('Vídeo enviado com sucesso!');
                                      fetchClinicasEmAnalise();
                                    } else {
                                      const error = await response.json();
                                      showErrorToast(error.error || 'Erro ao enviar vídeo');
                                    }
                                  } catch (error) {
                                    console.error('Erro ao fazer upload:', error);
                                    showErrorToast('Erro ao enviar vídeo');
                                  } finally {
                                    setUploadingDocs(prev => ({ ...prev, [`video_validacao_${clinica.id}`]: false }));
                                  }
                                }}
                              />
                              {uploadingDocs[`video_validacao_${clinica.id}`] ? 'Enviando...' : 'Enviar Vídeo'}
                            </label>
                          )}
                        </td>
                        <td style={{ display: isMobile ? 'none' : 'table-cell' }}>
                          {formatarData(clinica.created_at)}
                        </td>
                        <td>
                          <button
                            onClick={() => handleView(clinica)}
                            className="btn-action"
                            title="Visualizar"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => handleEditClinicaAnalise(clinica)}
                                className="btn-action"
                                title="Editar"
                                style={{ marginLeft: '0.5rem' }}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleGerenciarAcesso(clinica)}
                                className="btn-action"
                                title={clinica.ativo_no_sistema ? "Editar Acesso" : "Criar Acesso"}
                                style={{ 
                                  marginLeft: '0.5rem', 
                                  color: clinica.ativo_no_sistema ? '#10b981' : '#3b82f6' 
                                }}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteClinica(clinica.id)}
                                className="btn-action"
                                title="Excluir"
                                style={{ marginLeft: '0.5rem', color: '#dc2626' }}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                  <line x1="10" y1="11" x2="10" y2="17" />
                                  <line x1="14" y1="11" x2="14" y2="17" />
                                </svg>
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal de Cadastro/Edição */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingClinica ? 'Editar Clínica' : 'Nova Clínica'}
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
                <label className="form-label">Nome da Clínica *</label>
                <input
                  type="text"
                  name="nome"
                  className="form-input"
                  value={formData.nome}
                  onChange={handleInputChange}
                  placeholder="Digite o nome da clínica"
                  required
                />
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">CNPJ *</label>
                  <input
                    type="text"
                    name="cnpj"
                    className="form-input"
                    value={formData.cnpj}
                    onChange={handleInputChange}
                    placeholder="00.000.000/0000-00"
                    maxLength="18"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Responsável *</label>
                  <input
                    type="text"
                    name="responsavel"
                    className="form-input"
                    value={formData.responsavel}
                    onChange={handleInputChange}
                    placeholder="Nome do responsável"
                    required
                  />
                </div>
              </div>

              {/* Seção de Acesso ao Sistema - Apenas ao criar nova clínica */}
              {isAdmin && !editingClinica && (
                <div style={{ 
                  marginTop: '1.5rem', 
                  padding: '1rem', 
                  backgroundColor: '#f0f9ff', 
                  borderRadius: '8px',
                  border: '1px solid #0284c7'
                }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: '#0c4a6e' }}>
                    Acesso ao Sistema
                  </h3>
                  
                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        name="criar_acesso"
                        checked={formData.criar_acesso}
                        onChange={(e) => setFormData({ ...formData, criar_acesso: e.target.checked })}
                      />
                      <span style={{ marginLeft: '0.5rem' }}>Criar acesso para a clínica</span>
                    </label>
                  </div>

                  {formData.criar_acesso && (
                    <div className="form-row" style={{ marginTop: '1rem' }}>
                      <div className="form-group">
                        <label className="form-label">Email de Login *</label>
                        <input
                          type="email"
                          name="email_login"
                          className="form-input"
                          value={formData.email_login}
                          onChange={handleInputChange}
                          placeholder="email@clinica.com.br"
                          required={formData.criar_acesso}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Senha *</label>
                        <input
                          type="password"
                          name="senha"
                          className="form-input"
                          value={formData.senha}
                          onChange={handleInputChange}
                          placeholder="Mínimo 6 caracteres"
                          required={formData.criar_acesso}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Endereço (Rua e Número) *</label>
                <input
                  type="text"
                  name="endereco"
                  className="form-input"
                  value={formData.endereco}
                  onChange={handleInputChange}
                  placeholder="Ex: Rua das Flores, 123"
                  required
                />
              </div>

              <div className="grid grid-3">
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
                  {cidadesSugeridas.length > 0 && !cidadeCustomizada ? (
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
                      {cidadesSugeridas.map(cidade => (
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
                      {cidadesSugeridas.length > 0 && cidadeCustomizada && (
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

                <div className="form-group">
                  <label className="form-label">Bairro/Zona</label>
                  <input
                    type="text"
                    name="bairro"
                    className="form-input"
                    value={formData.bairro}
                    onChange={handleInputChange}
                    placeholder="Ex: Centro, Zona Sul"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Nicho da Clínica *</label>
                <select
                  name="nicho"
                  className="form-select"
                  value={formData.nicho}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Selecione o nicho</option>
                  <option value="Estético">Estético</option>
                  <option value="Odontológico">Odontológico</option>
                  <option value="Ambos">Ambos (Estético + Odontológico)</option>
                </select>
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
                  <label className="form-label">Email *</label>
                  <input
                    type="email"
                    name="email"
                    className="form-input"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="contato@clinica.com"
                    required
                  />
                </div>
              </div>

              {/* Status da Clínica - Apenas para Admin */}
              {isAdmin && (
              <div className="form-group">
                <label className="form-label">Status da Clínica</label>
                <select
                  name="status"
                  className="form-select"
                  value={formData.status}
                  onChange={handleInputChange}
                >
                  <option value="ativa">Ativa (padrão)</option>
                  <option value="inativa">Inativa</option>
                  <option value="em_contato">Em Contato</option>
                  <option value="nao_fechou">Não Fechou</option>
                </select>
              </div>
              )}
              
              {/* Seção de Documentação - Apenas para Edição */}
              {editingClinica && (
                <div style={{ 
                  marginTop: '2rem', 
                  paddingTop: '2rem', 
                  borderTop: '2px solid #e5e7eb' 
                }}>
                  <h3 style={{ 
                    fontSize: '1.125rem', 
                    fontWeight: '700', 
                    color: '#1a1d23', 
                    marginBottom: '1rem',
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
                    Documentação da Clínica
                  </h3>
                  
                  <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
                    <strong>Nota:</strong> Faça upload dos documentos clicando no botão "Enviar" ao lado de cada item. Formatos aceitos: PDF, DOC, DOCX, JPG, JPEG e PNG (máx. 10MB).
                  </div>
                  
                  {/* SEÇÃO 1: DADOS DA EMPRESA */}
                  <div style={{ marginBottom: '1rem', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                    <button
                      type="button"
                      onClick={() => setSecaoDadosEmpresa(!secaoDadosEmpresa)}
                      style={{
                        width: '100%',
                        padding: '1rem',
                        backgroundColor: secaoDadosEmpresa ? '#eff6ff' : '#f9fafb',
                        border: 'none',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '1rem',
                        color: '#1e40af'
                      }}
                    >
                      <span>Dados da Empresa</span>
                      <span style={{ fontSize: '1.25rem' }}>{secaoDadosEmpresa ? '−' : '+'}</span>
                    </button>
                    {secaoDadosEmpresa && (
                      <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1rem', backgroundColor: '#ffffff' }}>
                        {/* Documentos da seção */}
                    <div className="form-group" style={{ 
                      padding: '1rem',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input 
                            type="checkbox" 
                            name="doc_cartao_cnpj"
                            checked={formData.doc_cartao_cnpj || false}
                            onChange={(e) => setFormData({...formData, doc_cartao_cnpj: e.target.checked})}
                            disabled
                          />
                          <span style={{ fontWeight: '600' }}>Cartão CNPJ</span>
                        </label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {formData.doc_cartao_cnpj ? (
                            <>
                              <button
                                type="button"
                                className="btn btn-sm btn-secondary"
                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                onClick={() => handleDownloadDocument('cartao_cnpj')}
                              >
                                Baixar
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-danger"
                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                onClick={() => handleDeleteDocument('cartao_cnpj')}
                              >
                                Excluir
                              </button>
                            </>
                          ) : (
                            <label className="btn btn-sm btn-primary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', cursor: 'pointer', color: 'white' }}>
                              <input
                                type="file"
                                style={{ display: 'none' }}
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                onChange={(e) => handleUploadDocument(e, 'cartao_cnpj')}
                              />
                              Enviar
                            </label>
                          )}
                        </div>
                      </div>
                      {uploadingDocs['cartao_cnpj'] && (
                        <div style={{ fontSize: '0.75rem', color: '#3b82f6' }}>Enviando...</div>
                      )}
                    </div>
                    
                    <div className="form-group" style={{ 
                      padding: '1rem',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input 
                            type="checkbox" 
                            name="doc_contrato_social"
                            checked={formData.doc_contrato_social || false}
                            onChange={(e) => setFormData({...formData, doc_contrato_social: e.target.checked})}
                            disabled
                          />
                          <span style={{ fontWeight: '600' }}>Contrato Social</span>
                        </label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {formData.doc_contrato_social ? (
                            <>
                              <button
                                type="button"
                                className="btn btn-sm btn-secondary"
                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                onClick={() => handleDownloadDocument('contrato_social')}
                              >
                                Baixar
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-danger"
                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                onClick={() => handleDeleteDocument('contrato_social')}
                              >
                                Excluir
                              </button>
                            </>
                          ) : (
                            <label className="btn btn-sm btn-primary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', cursor: 'pointer', color: 'white' }}>
                              <input
                                type="file"
                                style={{ display: 'none' }}
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                onChange={(e) => handleUploadDocument(e, 'contrato_social')}
                              />
                              Enviar
                            </label>
                          )}
                        </div>
                      </div>
                      {uploadingDocs['contrato_social'] && (
                        <div style={{ fontSize: '0.75rem', color: '#3b82f6' }}>Enviando...</div>
                      )}
                    </div>
                    
                    <div className="form-group" style={{ 
                      padding: '1rem',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input 
                            type="checkbox" 
                            name="doc_alvara_sanitario"
                            checked={formData.doc_alvara_sanitario || false}
                            onChange={(e) => setFormData({...formData, doc_alvara_sanitario: e.target.checked})}
                            disabled
                          />
                          <span style={{ fontWeight: '600' }}>Alvará de Funcionamento Sanitário</span>
                        </label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {formData.doc_alvara_sanitario ? (
                            <>
                              <button
                                type="button"
                                className="btn btn-sm btn-secondary"
                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                onClick={() => handleDownloadDocument('alvara_sanitario')}
                              >
                                Baixar
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-danger"
                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                onClick={() => handleDeleteDocument('alvara_sanitario')}
                              >
                                Excluir
                              </button>
                            </>
                          ) : (
                            <label className="btn btn-sm btn-primary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', cursor: 'pointer', color: 'white' }}>
                              <input
                                type="file"
                                style={{ display: 'none' }}
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                onChange={(e) => handleUploadDocument(e, 'alvara_sanitario')}
                              />
                              Enviar
                            </label>
                          )}
                        </div>
                      </div>
                      {uploadingDocs['alvara_sanitario'] && (
                        <div style={{ fontSize: '0.75rem', color: '#3b82f6' }}>Enviando...</div>
                      )}
                    </div>
                    
                    <div className="form-group" style={{ 
                      padding: '1rem',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input 
                            type="checkbox" 
                            name="doc_comprovante_endereco"
                            checked={formData.doc_comprovante_endereco || false}
                            onChange={(e) => setFormData({...formData, doc_comprovante_endereco: e.target.checked})}
                            disabled
                          />
                          <span style={{ fontWeight: '600' }}>Comprovante de Endereço da Clínica</span>
                        </label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {formData.doc_comprovante_endereco ? (
                            <>
                              <button
                                type="button"
                                className="btn btn-sm btn-secondary"
                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                onClick={() => handleDownloadDocument('comprovante_endereco')}
                              >
                                Baixar
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-danger"
                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                onClick={() => handleDeleteDocument('comprovante_endereco')}
                              >
                                Excluir
                              </button>
                            </>
                          ) : (
                            <label className="btn btn-sm btn-primary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', cursor: 'pointer', color: 'white' }}>
                              <input
                                type="file"
                                style={{ display: 'none' }}
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                onChange={(e) => handleUploadDocument(e, 'comprovante_endereco')}
                              />
                              Enviar
                            </label>
                          )}
                        </div>
                      </div>
                      {uploadingDocs['comprovante_endereco'] && (
                        <div style={{ fontSize: '0.75rem', color: '#3b82f6' }}>Enviando...</div>
                      )}
                    </div>

                    <div className="form-group" style={{ 
                      padding: '1rem',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input 
                            type="checkbox" 
                            name="doc_carteirinha_cro"
                            checked={formData.doc_carteirinha_cro || false}
                            onChange={(e) => setFormData({...formData, doc_carteirinha_cro: e.target.checked})}
                            disabled
                          />
                          <span style={{ fontWeight: '600' }}>Carteirinha do Conselho (CRO/CFO)</span>
                        </label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {formData.doc_carteirinha_cro ? (
                            <>
                              <button
                                type="button"
                                className="btn btn-sm btn-secondary"
                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                onClick={() => handleDownloadDocument('carteirinha_cro')}
                              >
                                Baixar
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-danger"
                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                onClick={() => handleDeleteDocument('carteirinha_cro')}
                              >
                                Excluir
                              </button>
                            </>
                          ) : (
                            <label className="btn btn-sm btn-primary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', cursor: 'pointer', color: 'white' }}>
                              <input
                                type="file"
                                style={{ display: 'none' }}
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                onChange={(e) => handleUploadDocument(e, 'carteirinha_cro')}
                              />
                              Enviar
                            </label>
                          )}
                        </div>
                      </div>
                      {uploadingDocs['carteirinha_cro'] && (
                        <div style={{ fontSize: '0.75rem', color: '#3b82f6' }}>Enviando...</div>
                      )}
                    </div>
                      </div>
                    )}
                  </div>

                  {/* SEÇÃO 2: FATURAMENTO E BANCÁRIO */}
                  <div style={{ marginBottom: '1rem', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                    <button
                      type="button"
                      onClick={() => setSecaoFaturamento(!secaoFaturamento)}
                      style={{
                        width: '100%',
                        padding: '1rem',
                        backgroundColor: secaoFaturamento ? '#eff6ff' : '#f9fafb',
                        border: 'none',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '1rem',
                        color: '#1e40af'
                      }}
                    >
                      <span>Faturamento e Bancário</span>
                      <span style={{ fontSize: '1.25rem' }}>{secaoFaturamento ? '−' : '+'}</span>
                    </button>
                    {secaoFaturamento && (
                      <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1rem', backgroundColor: '#ffffff' }}>
                    
                    <div className="form-group" style={{ 
                      padding: '1rem',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input 
                            type="checkbox" 
                            name="doc_balanco"
                            checked={formData.doc_balanco || false}
                            onChange={(e) => setFormData({...formData, doc_balanco: e.target.checked})}
                            disabled
                          />
                          <span style={{ fontWeight: '600' }}>Balanço/Balancete Assinado (Últimos 12 meses)</span>
                        </label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {formData.doc_balanco ? (
                            <>
                              <button
                                type="button"
                                className="btn btn-sm btn-secondary"
                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                onClick={() => handleDownloadDocument('balanco')}
                              >
                                Baixar
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-danger"
                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                onClick={() => handleDeleteDocument('balanco')}
                              >
                                Excluir
                              </button>
                            </>
                          ) : (
                            <label className="btn btn-sm btn-primary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', cursor: 'pointer', color: 'white' }}>
                              <input
                                type="file"
                                style={{ display: 'none' }}
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                onChange={(e) => handleUploadDocument(e, 'balanco')}
                              />
                              Enviar
                            </label>
                          )}
                        </div>
                      </div>
                      {uploadingDocs['balanco'] && (
                        <div style={{ fontSize: '0.75rem', color: '#3b82f6' }}>Enviando...</div>
                      )}
                    </div>
                    
                    {/* Campos de dados bancários */}
                    <div style={{ padding: '1rem', backgroundColor: '#f0f9ff', borderRadius: '8px', gridColumn: '1 / -1' }}>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '1rem', color: '#0c4a6e' }}>
                        Dados Bancários da Clínica (PJ)
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        <div className="form-group">
                          <label className="form-label">Banco</label>
                          <input
                            type="text"
                            name="banco_nome"
                            className="form-input"
                            value={formData.banco_nome}
                            onChange={handleInputChange}
                            placeholder="Ex: Banco do Brasil"
                          />
                        </div>
                        
                        <div className="form-group">
                          <label className="form-label">Agência</label>
                          <input
                            type="text"
                            name="banco_agencia"
                            className="form-input"
                            value={formData.banco_agencia}
                            onChange={handleInputChange}
                            placeholder="Ex: 0001"
                          />
                        </div>
                        
                        <div className="form-group">
                          <label className="form-label">Conta</label>
                          <input
                            type="text"
                            name="banco_conta"
                            className="form-input"
                            value={formData.banco_conta}
                            onChange={handleInputChange}
                            placeholder="Ex: 12345-6"
                          />
                        </div>
                        
                        <div className="form-group">
                          <label className="form-label">Chave PIX</label>
                          <input
                            type="text"
                            name="banco_pix"
                            className="form-input"
                            value={formData.banco_pix}
                            onChange={handleInputChange}
                            placeholder="CPF, CNPJ, Email ou Telefone"
                          />
                        </div>
                      </div>
                    </div>
                      </div>
                    )}
                  </div>

                  {/* SEÇÃO 3: DADOS DOS SÓCIOS */}
                  <div style={{ marginBottom: '1rem', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                    <button
                      type="button"
                      onClick={() => setSecaoSocios(!secaoSocios)}
                      style={{
                        width: '100%',
                        padding: '1rem',
                        backgroundColor: secaoSocios ? '#eff6ff' : '#f9fafb',
                        border: 'none',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '1rem',
                        color: '#1e40af'
                      }}
                    >
                      <span>Dados dos Sócios</span>
                      <span style={{ fontSize: '1.25rem' }}>{secaoSocios ? '−' : '+'}</span>
                    </button>
                    {secaoSocios && (
                      <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1rem', backgroundColor: '#ffffff' }}>
                    
                    <div className="form-group" style={{ 
                      padding: '1rem',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <div style={{ marginBottom: '0.5rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <input 
                            type="checkbox" 
                            name="doc_socios"
                            checked={formData.doc_socios || false}
                            onChange={(e) => setFormData({...formData, doc_socios: e.target.checked})}
                            disabled
                          />
                          <span style={{ fontWeight: '600' }}>Documentos dos Sócios</span>
                          {sociosDocsList.length > 0 && (
                            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                              ({sociosDocsList.length} arquivo{sociosDocsList.length !== 1 ? 's' : ''})
                            </span>
                          )}
                        </label>
                        
                        {/* Lista de documentos */}
                        {sociosDocsList.length > 0 && (
                          <div style={{ marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {sociosDocsList.map((doc, index) => (
                              <div key={index} style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                padding: '0.5rem',
                                backgroundColor: '#ffffff',
                                borderRadius: '4px',
                                border: '1px solid #e5e7eb'
                              }}>
                                <span style={{ fontSize: '0.875rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {doc.originalName || `Documento ${index + 1}`}
                                </span>
                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-secondary"
                                    style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem' }}
                                    onClick={() => window.open(doc.publicUrl, '_blank')}
                                    title="Baixar"
                                  >
                                    Baixar
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-danger"
                                    style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem' }}
                                    onClick={() => handleDeleteSociosDocument(index)}
                                    title="Excluir"
                                  >
                                    Excluir
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Botão de upload múltiplo */}
                        <label className="btn btn-sm btn-primary" style={{ 
                          fontSize: '0.75rem', 
                          padding: '0.25rem 0.5rem', 
                          cursor: 'pointer', 
                          color: 'white',
                          display: 'inline-block'
                        }}>
                          <input
                            type="file"
                            multiple
                            style={{ display: 'none' }}
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            onChange={(e) => handleUploadMultipleDocuments(e, 'socios')}
                          />
                          {sociosDocsList.length > 0 ? 'Adicionar mais documentos' : 'Enviar documentos'}
                        </label>
                      </div>
                      {uploadingDocs['socios'] && (
                        <div style={{ fontSize: '0.75rem', color: '#3b82f6', marginTop: '0.5rem' }}>Enviando...</div>
                      )}
                    </div>
                    
                    
                    {/* Novos Documentos */}
                    <div className="form-group" style={{ 
                      padding: '1rem',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input 
                            type="checkbox" 
                            name="doc_comprovante_endereco_socios"
                            checked={formData.doc_comprovante_endereco_socios || false}
                            onChange={(e) => setFormData({...formData, doc_comprovante_endereco_socios: e.target.checked})}
                            disabled
                          />
                          <span style={{ fontWeight: '600' }}>Comprovante de Endereço dos Sócios</span>
                        </label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {formData.doc_comprovante_endereco_socios ? (
                            <>
                              <button
                                type="button"
                                className="btn btn-sm btn-secondary"
                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                onClick={() => handleDownloadDocument('comprovante_endereco_socios')}
                              >
                                Baixar
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-danger"
                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                onClick={() => handleDeleteDocument('comprovante_endereco_socios')}
                              >
                                Excluir
                              </button>
                            </>
                          ) : (
                            <label className="btn btn-sm btn-primary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', cursor: 'pointer', color: 'white' }}>
                              <input
                                type="file"
                                style={{ display: 'none' }}
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                onChange={(e) => handleUploadDocument(e, 'comprovante_endereco_socios')}
                              />
                              Enviar
                            </label>
                          )}
                  </div>
                </div>
                      {uploadingDocs['comprovante_endereco_socios'] && (
                        <div style={{ fontSize: '0.75rem', color: '#3b82f6' }}>Enviando...</div>
                      )}
                    </div>
                    
                    {/* Campos de informação dos sócios */}
                    <div style={{ padding: '1rem', backgroundColor: '#f0f9ff', borderRadius: '8px', gridColumn: '1 / -1' }}>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '1rem', color: '#0c4a6e' }}>
                        Informações de Contato dos Sócios
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                        <div className="form-group">
                          <label className="form-label">Telefone dos Sócios</label>
                          <input
                            type="tel"
                            name="telefone_socios"
                            className="form-input"
                            value={formData.telefone_socios}
                            onChange={handleInputChange}
                            placeholder="(11) 99999-9999"
                          />
                        </div>
                        
                        <div className="form-group">
                          <label className="form-label">Email dos Sócios</label>
                          <input
                            type="email"
                            name="email_socios"
                            className="form-input"
                            value={formData.email_socios}
                            onChange={handleInputChange}
                            placeholder="socios@email.com"
                          />
                        </div>
                      </div>
                    </div>
                      </div>
                    )}
                  </div>

                  {/* SEÇÃO 4: RESPONSÁVEL TÉCNICO */}
                  <div style={{ marginBottom: '1rem', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                    <button
                      type="button"
                      onClick={() => setSecaoRespTecnico(!secaoRespTecnico)}
                      style={{
                        width: '100%',
                        padding: '1rem',
                        backgroundColor: secaoRespTecnico ? '#eff6ff' : '#f9fafb',
                        border: 'none',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '1rem',
                        color: '#1e40af'
                      }}
                    >
                      <span>Responsável Técnico</span>
                      <span style={{ fontSize: '1.25rem' }}>{secaoRespTecnico ? '−' : '+'}</span>
                    </button>
                    {secaoRespTecnico && (
                      <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1rem', backgroundColor: '#ffffff' }}>
                    
                    <div className="form-group" style={{ 
                      padding: '1rem',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input 
                            type="checkbox" 
                            name="doc_certidao_resp_tecnico"
                            checked={formData.doc_certidao_resp_tecnico || false}
                            onChange={(e) => setFormData({...formData, doc_certidao_resp_tecnico: e.target.checked})}
                            disabled
                          />
                          <span style={{ fontWeight: '600' }}>Certidão de Responsabilidade Técnica</span>
                        </label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {formData.doc_certidao_resp_tecnico ? (
                            <>
                              <button
                                type="button"
                                className="btn btn-sm btn-secondary"
                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                onClick={() => handleDownloadDocument('certidao_resp_tecnico')}
                              >
                                Baixar
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-danger"
                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                onClick={() => handleDeleteDocument('certidao_resp_tecnico')}
                              >
                                Excluir
                              </button>
                            </>
                          ) : (
                            <label className="btn btn-sm btn-primary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', cursor: 'pointer', color: 'white' }}>
                              <input
                                type="file"
                                style={{ display: 'none' }}
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                onChange={(e) => handleUploadDocument(e, 'certidao_resp_tecnico')}
                              />
                              Enviar
                            </label>
                          )}
                        </div>
                      </div>
                      {uploadingDocs['certidao_resp_tecnico'] && (
                        <div style={{ fontSize: '0.75rem', color: '#3b82f6' }}>Enviando...</div>
                      )}
                    </div>
                    
                    <div className="form-group" style={{ 
                      padding: '1rem',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input 
                            type="checkbox" 
                            name="doc_resp_tecnico"
                            checked={formData.doc_resp_tecnico || false}
                            onChange={(e) => setFormData({...formData, doc_resp_tecnico: e.target.checked})}
                            disabled
                          />
                          <span style={{ fontWeight: '600' }}>Documentos do Responsável Técnico</span>
                        </label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {formData.doc_resp_tecnico ? (
                            <>
                              <button
                                type="button"
                                className="btn btn-sm btn-secondary"
                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                onClick={() => handleDownloadDocument('resp_tecnico')}
                              >
                                Baixar
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-danger"
                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                onClick={() => handleDeleteDocument('resp_tecnico')}
                              >
                                Excluir
                              </button>
                            </>
                          ) : (
                            <label className="btn btn-sm btn-primary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', cursor: 'pointer', color: 'white' }}>
                              <input
                                type="file"
                                style={{ display: 'none' }}
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                onChange={(e) => handleUploadDocument(e, 'resp_tecnico')}
                              />
                              Enviar
                            </label>
                          )}
                        </div>
                      </div>
                      {uploadingDocs['resp_tecnico'] && (
                        <div style={{ fontSize: '0.75rem', color: '#3b82f6' }}>Enviando...</div>
                      )}
                    </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Seção de Dados Bancários - REMOVIDA (agora está dentro do acordeão) */}
                  {/* Seção de Informações dos Sócios - REMOVIDA (agora está dentro do acordeão) */}
                  
                  {/* Limite de Crédito - Apenas Admin */}
                  {isAdmin && (
                    <div style={{ 
                      marginTop: '2rem', 
                      padding: '1rem', 
                      backgroundColor: '#fef3c7', 
                      borderRadius: '8px',
                      border: '1px solid #f59e0b'
                    }}>
                      <h3 style={{ 
                        fontSize: '1rem', 
                        fontWeight: '700', 
                        color: '#92400e', 
                        marginBottom: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        Limite de Crédito (Visível apenas para Admin)
                      </h3>
                      
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Limite aprovado (R$)</label>
                        <input
                          type="number"
                          name="limite_credito"
                          className="form-input"
                          value={formData.limite_credito}
                          onChange={handleInputChange}
                          placeholder="Ex: 50000"
                          step="0.01"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <button 
                  type="button"
                  className="btn btn-secondary"
                  onClick={resetForm}
                  disabled={submitting}
                  style={{ 
                    opacity: submitting ? 0.6 : 1,
                    cursor: submitting ? 'not-allowed' : 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                  style={{ 
                    opacity: submitting ? 0.6 : 1,
                    cursor: submitting ? 'not-allowed' : 'pointer'
                  }}
                >
                  {submitting ? 'Salvando...' : (editingClinica ? 'Atualizar Clínica' : 'Cadastrar Clínica')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

             {/* Modal de Visualização */}
       {viewModalOpen && viewingClinica && (
         <div className="modal-overlay">
           <div className="modal" style={{ maxWidth: '1000px', maxHeight: '90vh', overflowY: 'auto' }}>
             <div className="modal-header">
               <h2 className="modal-title">
                 {viewingClinica.nome}
               </h2>
               <button 
                 className="close-btn"
                 onClick={closeViewModal}
               >
                 ×
               </button>
             </div>
             
             {/* Abas de Navegação */}
             <div style={{ 
               borderBottom: '1px solid #e5e7eb',
               padding: '0 0.75rem',
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
                   {window.innerWidth <= 768 ? 'Informações' : 'Informações Gerais'}
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
                   {window.innerWidth > 768 && (
                     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '0.5rem', verticalAlign: 'middle' }}>
                       <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                       <polyline points="14 2 14 8 20 8"></polyline>
                       <line x1="16" y1="13" x2="8" y2="13"></line>
                       <line x1="16" y1="17" x2="8" y2="17"></line>
                     </svg>
                   )}
                   Documentos
                 </button>
                 
                 <button
                   onClick={() => handleTabChange('pacientes')}
                   style={{
                     padding: window.innerWidth <= 768 ? '0.75rem 0.5rem' : '1rem 0',
                     border: 'none',
                     background: 'none',
                     fontSize: window.innerWidth <= 768 ? '0.75rem' : '0.875rem',
                     fontWeight: '500',
                     color: activeViewTab === 'pacientes' ? '#3b82f6' : '#6b7280',
                     borderBottom: activeViewTab === 'pacientes' ? '2px solid #3b82f6' : '2px solid transparent',
                     cursor: 'pointer',
                     transition: 'all 0.2s',
                     whiteSpace: 'nowrap'
                   }}
                 >
                   {window.innerWidth > 768 && (
                     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '0.5rem', verticalAlign: 'middle' }}>
                       <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                       <circle cx="12" cy="7" r="4"></circle>
                     </svg>
                   )}
                   Pacientes
                 </button>
                 
                 <button
                   onClick={() => handleTabChange('historico')}
                   style={{
                     padding: window.innerWidth <= 768 ? '0.75rem 0.5rem' : '1rem 0',
                     border: 'none',
                     background: 'none',
                     fontSize: window.innerWidth <= 768 ? '0.75rem' : '0.875rem',
                     fontWeight: '500',
                     color: activeViewTab === 'historico' ? '#3b82f6' : '#6b7280',
                     borderBottom: activeViewTab === 'historico' ? '2px solid #3b82f6' : '2px solid transparent',
                     cursor: 'pointer',
                     transition: 'all 0.2s',
                     whiteSpace: 'nowrap'
                   }}
                 >
                   {window.innerWidth > 768 && (
                     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '0.5rem', verticalAlign: 'middle' }}>
                       <circle cx="12" cy="12" r="10"></circle>
                       <polyline points="12 6 12 12 16 14"></polyline>
                     </svg>
                   )}
                   Histórico
                 </button>
               </div>
             </div>
 
             <div style={{ padding: '1.5rem' }}>
               {/* Aba de Informações Gerais */}
               {activeViewTab === 'informacoes' && (
               <div style={{ display: 'grid', gap: '1rem' }}>
                 <div>
                   <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Nome da Clínica</label>
                   <p style={{ margin: '0.25rem 0 0 0', color: '#1f2937' }}>{viewingClinica.nome}</p>
                 </div>
                 
                 {viewingClinica.cnpj && !isFreelancer && (
                   <div>
                     <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>CNPJ</label>
                     <p style={{ margin: '0.25rem 0 0 0', color: '#1f2937', fontFamily: 'monospace' }}>
                       {viewingClinica.cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')}
                     </p>
                   </div>
                 )}

                 {viewingClinica.responsavel && (
                   <div>
                     <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Responsável</label>
                     <p style={{ margin: '0.25rem 0 0 0', color: '#1f2937' }}>{viewingClinica.responsavel}</p>
                   </div>
                 )}
                 
                 {viewingClinica.endereco && (
                   <div>
                     <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Endereço</label>
                     <p style={{ margin: '0.25rem 0 0 0', color: '#1f2937' }}>{viewingClinica.endereco}</p>
                   </div>
                 )}
                 
                 {viewingClinica.bairro && (
                   <div>
                     <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Bairro</label>
                     <p style={{ margin: '0.25rem 0 0 0', color: '#1f2937' }}>{viewingClinica.bairro}</p>
                   </div>
                 )}
                 
                 {(viewingClinica.cidade || viewingClinica.estado) && (
                   <div>
                     <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Localização</label>
                     <p style={{ margin: '0.25rem 0 0 0', color: '#1f2937' }}>
                       {viewingClinica.cidade && viewingClinica.estado 
                         ? `${viewingClinica.cidade}, ${viewingClinica.estado}`
                         : viewingClinica.cidade || viewingClinica.estado
                       }
                     </p>
                   </div>
                 )}
                 
                 {viewingClinica.nicho && (
                   <div>
                     <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Nicho</label>
                     <p style={{ margin: '0.25rem 0 0 0', color: '#1f2937' }}>{viewingClinica.nicho}</p>
                   </div>
                 )}
                 
                 {viewingClinica.telefone && (
                   <div>
                     <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Telefone</label>
                     <p style={{ margin: '0.25rem 0 0 0', color: '#1f2937' }}>{formatarTelefone(viewingClinica.telefone)}</p>
                   </div>
                 )}
                 
                 {viewingClinica.email && (
                   <div>
                     <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>E-mail</label>
                     <p syle={{ margin: '0.25rem 0 0 0', color: '#1f2937' }}>{viewingClinica.email?.toLowerCase()}</p>
                   </div>
                 )}
                 
                 {viewingClinica.status && (
                   <div>
                     <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Status</label>
                     <p style={{ margin: '0.25rem 0 0 0', color: '#1f2937' }}>
                       <span 
                         className="badge"
                         style={{
                           backgroundColor: getStatusClinicaInfo(viewingClinica.status).color + '20',
                           color: getStatusClinicaInfo(viewingClinica.status).color,
                           fontWeight: '600',
                           borderRadius: '0.375rem'
                         }}
                       >
                         {getStatusClinicaInfo(viewingClinica.status).label}
                       </span>
                     </p>
                   </div>
                 )}
                 
                 {/* Vídeo de Validação */}
                 {viewingClinica.video_validacao && (
                   <div>
                     <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Vídeo de Validação</label>
                     <div style={{ margin: '0.5rem 0 0 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                       <span 
                         className="badge"
                         style={{
                           backgroundColor: '#10b981',
                           color: 'white',
                           fontWeight: '600',
                           borderRadius: '0.375rem',
                           padding: '0.25rem 0.75rem',
                           fontSize: '0.75rem'
                         }}
                       >
                         <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '0.25rem', verticalAlign: 'middle' }}>
                           <polygon points="5 3 19 12 5 21 5 3"/>
                         </svg>
                         Vídeo Enviado
                       </span>
                       <button
                         onClick={() => window.open(`http://localhost:5000/api/documents/download/${viewingClinica.id}/video_validacao`, '_blank')}
                         className="btn btn-sm btn-secondary"
                         style={{ 
                           fontSize: '0.75rem', 
                           padding: '0.25rem 0.75rem',
                           display: 'flex',
                           alignItems: 'center',
                           gap: '0.25rem'
                         }}
                       >
                         <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                           <polygon points="5 3 19 12 5 21 5 3"/>
                         </svg>
                         Assistir
                       </button>
                     </div>
                   </div>
                 )}
                 
                {viewingClinica.consultor_nome && (
                  <div>
                    <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Indicado por</label>
                    <p style={{ margin: '0.25rem 0 0 0', color: '#1f2937' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span className="badge" style={{ backgroundColor: '#3b82f6', color: 'white' }}>
                          {viewingClinica.consultor_nome}
                        </span>
                        {viewingClinica.empresa_nome && (
                          <span className="badge" style={{ backgroundColor: '#8b5cf6', color: 'white' }}>
                            {viewingClinica.empresa_nome}
                          </span>
                        )}
                      </div>
                    </p>
                  </div>
                )}
                 
                 {viewingClinica.created_at && (
                   <div>
                     <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Data de Cadastro</label>
                     <p style={{ margin: '0.25rem 0 0 0', color: '#6b7280', fontSize: '0.875rem' }}>{formatarData(viewingClinica.created_at)}</p>
                   </div>
                 )}
                 
                 {/* Dados dos Sócios */}
                 <div style={{ 
                   marginTop: '1.5rem', 
                   paddingTop: '1.5rem', 
                   borderTop: '2px solid #e5e7eb' 
                 }}>
                   <h4 style={{ fontSize: '1rem', fontWeight: '700', color: '#1a1d23', marginBottom: '1rem' }}>
                    Informações dos Sócios
                   </h4>
                   
                   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                     <div>
                       <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Telefone</label>
                       <p style={{ margin: '0.25rem 0 0 0', color: '#1f2937' }}>
                         {viewingClinica.telefone_socios ? formatarTelefone(viewingClinica.telefone_socios) : 'Não informado'}
                       </p>
                     </div>
                     
                     <div>
                       <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Email</label>
                       <p style={{ margin: '0.25rem 0 0 0', color: '#1f2937' }}>
                         {viewingClinica.email_socios ? viewingClinica.email_socios.toLowerCase() : 'Não informado'}
                       </p>
                     </div>
                   </div>
                 </div>
                 
                 {/* Dados Bancários */}
                 <div style={{ 
                   marginTop: '1.5rem', 
                   paddingTop: '1.5rem', 
                   borderTop: '2px solid #e5e7eb' 
                 }}>
                   <h4 style={{ fontSize: '1rem', fontWeight: '700', color: '#1a1d23', marginBottom: '1rem' }}>
                     Dados Bancários (PJ)
                   </h4>
                   
                   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                     <div>
                       <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Banco</label>
                       <p style={{ margin: '0.25rem 0 0 0', color: '#1f2937' }}>
                         {viewingClinica.banco_nome || 'Não informado'}
                       </p>
                     </div>
                     
                     <div>
                       <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Agência</label>
                       <p style={{ margin: '0.25rem 0 0 0', color: '#1f2937' }}>
                         {viewingClinica.banco_agencia || 'Não informado'}
                       </p>
                     </div>
                     
                     <div>
                       <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Conta</label>
                       <p style={{ margin: '0.25rem 0 0 0', color: '#1f2937' }}>
                         {viewingClinica.banco_conta || 'Não informado'}
                       </p>
                     </div>
                     
                     <div>
                       <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Chave PIX</label>
                       <p style={{ margin: '0.25rem 0 0 0', color: '#1f2937', fontFamily: 'monospace' }}>
                         {viewingClinica.banco_pix || 'Não informado'}
                       </p>
                     </div>
                   </div>
                 </div>
                 
                 {/* Limite de Crédito - Apenas Admin */}
                 {isAdmin && viewingClinica.limite_credito && (
                   <div style={{ 
                     marginTop: '1.5rem', 
                     paddingTop: '1.5rem', 
                     borderTop: '2px solid #e5e7eb',
                     backgroundColor: '#fef3c7',
                     padding: '1rem',
                     borderRadius: '8px',
                     border: '1px solid #f59e0b'
                   }}>
                     <h4 style={{ fontSize: '1rem', fontWeight: '700', color: '#92400e', marginBottom: '0.5rem' }}>
                       Limite de Crédito Aprovad
                     </h4>
                     <p style={{ margin: '0.25rem 0 0 0', color: '#92400e', fontSize: '1.25rem', fontWeight: '700' }}>
                       R$ {parseFloat(viewingClinica.limite_credito).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                     </p>
                     <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: '#92400e' }}>
                       Informação visível apenas para administradores
                     </p>
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
                     <polyline points="10 9 9 9 8 9"></polyline>
                   </svg>
                   Documentação da Clínica
                 </h3>
                 
                 <div style={{ 
                   display: 'grid', 
                   gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                   gap: '1rem'
                 }}>
                   {/* Renderizar todos os documentos dinamicamente */}
                   {(() => {
                     const documentos = [
                       { key: 'doc_cartao_cnpj', label: '1. Cartão CNPJ' },
                       { key: 'doc_contrato_social', label: '2. Contrato Social' },
                       { key: 'doc_alvara_sanitario', label: '3. Alvará Sanitário' },
                       { key: 'doc_balanco', label: '4. Balanço/Balancete (12 meses)' },
                       { key: 'doc_comprovante_endereco', label: '5. Comprovante Endereço Clínica' },
                       { key: 'doc_dados_bancarios', label: '6. Dados Bancários PJ' },
                       { key: 'doc_socios', label: '7. Docs dos Sócios' },
                       { key: 'doc_certidao_resp_tecnico', label: '8. Certidão Resp. Técnico' },
                       { key: 'doc_resp_tecnico', label: '9. Docs Resp. Técnico' },
                       { key: 'doc_comprovante_endereco_socios', label: '10. Comp. Endereço Sócios' },
                       { key: 'doc_carteirinha_cro', label: '11. Carteirinha CRO/Conselho' }
                     ];
                     
                     return documentos.map((doc) => {
                       const docStatus = viewingClinica[doc.key];
                       const aprovadoStatus = viewingClinica[`${doc.key}_aprovado`];
                       
                       return (
                         <div key={doc.key} style={{
                           padding: '1rem',
                           backgroundColor: '#f9fafb',
                           borderRadius: '8px',
                           border: `1px solid ${
                             aprovadoStatus === true ? '#10b981' :
                             aprovadoStatus === false ? '#ef4444' :
                             docStatus ? '#f59e0b' : '#e5e7eb'
                           }`
                         }}>
                           <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                               <div>
                                 <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>{doc.label}</label>
                                 <p style={{ 
                                   margin: '0.25rem 0 0 0', 
                                   fontSize: '0.75rem', 
                                   fontWeight: '600',
                                   color: aprovadoStatus === true ? '#059669' :
                                          aprovadoStatus === false ? '#dc2626' :
                                          docStatus ? '#d97706' : '#6b7280'
                                 }}>
                                   {aprovadoStatus === true ? '✓ Aprovado' :
                                    aprovadoStatus === false ? '✗ Reprovado' :
                                    docStatus ? '⏳ Em Análise' : '⚠️ Pendente'}
                                 </p>
                               </div>
                               {docStatus && (
                                 <button 
                                   className="btn btn-sm btn-secondary" 
                                   style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                   onClick={() => handleVisualizarDocumento(viewingClinica.id, doc.key)}
                                 >
                                   Visualizar
                                 </button>
                               )}
                             </div>
                             {/* Botões de aprovação (apenas admin) */}
                             {isAdmin && docStatus && aprovadoStatus !== true && (
                               <div style={{ display: 'flex', gap: '0.5rem' }}>
                                 <button 
                                   className="btn btn-sm btn-success"
                                   style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', flex: 1 }}
                                   onClick={() => handleAprovarDocumento(viewingClinica.id, doc.key)}
                                 >
                                   Aprovar
                                 </button>
                                 <button 
                                   className="btn btn-sm btn-danger"
                                   style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', flex: 1 }}
                                   onClick={() => handleReprovarDocumento(viewingClinica.id, doc.key)}
                                 >
                                   Reprovar
                                 </button>
                               </div>
                             )}
                           </div>
                         </div>
                       );
                     });
                   })()}
                 </div>
                 
                {/* Resumo dos Documentos */}
                 <div style={{ 
                   marginTop: '1.5rem', 
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
                          const totalDocs = 11;
                          const docsEnviados = [
                            viewingClinica.doc_cartao_cnpj,
                            viewingClinica.doc_contrato_social,
                            viewingClinica.doc_alvara_sanitario,
                            viewingClinica.doc_balanco,
                            viewingClinica.doc_comprovante_endereco,
                            viewingClinica.doc_dados_bancarios,
                            viewingClinica.doc_socios,
                            viewingClinica.doc_certidao_resp_tecnico,
                            viewingClinica.doc_resp_tecnico,
                            viewingClinica.doc_comprovante_endereco_socios,
                            viewingClinica.doc_carteirinha_cro
                          ].filter(Boolean).length;
                          
                          const docsAprovados = [
                            viewingClinica.doc_cartao_cnpj_aprovado,
                            viewingClinica.doc_contrato_social_aprovado,
                            viewingClinica.doc_alvara_sanitario_aprovado,
                            viewingClinica.doc_balanco_aprovado,
                            viewingClinica.doc_comprovante_endereco_aprovado,
                            viewingClinica.doc_dados_bancarios_aprovado,
                            viewingClinica.doc_socios_aprovado,
                            viewingClinica.doc_certidao_resp_tecnico_aprovado,
                            viewingClinica.doc_resp_tecnico_aprovado,
                            viewingClinica.doc_comprovante_endereco_socios_aprovado,
                            viewingClinica.doc_carteirinha_cro_aprovado
                          ].filter(v => v === true).length;
                          
                          return `${docsEnviados} de ${totalDocs} enviados | ${docsAprovados} aprovados`;
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
                           const totalDocs = 11;
                           const docsEnviados = [
                             viewingClinica.doc_cartao_cnpj,
                             viewingClinica.doc_contrato_social,
                             viewingClinica.doc_alvara_sanitario,
                             viewingClinica.doc_balanco,
                             viewingClinica.doc_comprovante_endereco,
                             viewingClinica.doc_dados_bancarios,
                             viewingClinica.doc_socios,
                             viewingClinica.doc_certidao_resp_tecnico,
                             viewingClinica.doc_resp_tecnico,
                             viewingClinica.visita_online,
                             viewingClinica.doc_certidao_casamento
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
               </div>
               )}

               {/* Aba de Pacientes */}
               {activeViewTab === 'pacientes' && (
                 <div>
                   <div style={{ 
                     display: 'flex', 
                     justifyContent: 'space-between', 
                     alignItems: 'center',
                     marginBottom: '1.5rem'
                   }}>
                     <h3 style={{ 
                       fontSize: '1.125rem', 
                       fontWeight: '700', 
                       color: '#1a1d23',
                       display: 'flex',
                       alignItems: 'center',
                       gap: '0.5rem',
                       margin: 0
                     }}>
                       <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                         <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                         <circle cx="12" cy="7" r="4"></circle>
                       </svg>
                       Pacientes Atendidos
                     </h3>
                     <span style={{
                       padding: '0.25rem 0.75rem',
                       backgroundColor: '#3b82f6',
                       color: 'white',
                       borderRadius: '9999px',
                       fontSize: '0.875rem',
                       fontWeight: '500'
                     }}>
                       {pacientesClinica.length} paciente{pacientesClinica.length !== 1 ? 's' : ''}
                     </span>
                   </div>

                   {loadingPacientes ? (
                     <div style={{ textAlign: 'center', padding: '2rem' }}>
                       <div className="loading-spinner"></div>
                       <p style={{ marginTop: '1rem', color: '#6b7280' }}>Carregando pacientes...</p>
                     </div>
                   ) : pacientesClinica.length === 0 ? (
                     <div style={{
                       textAlign: 'center',
                       padding: '3rem',
                       backgroundColor: '#f9fafb',
                       borderRadius: '8px',
                       border: '1px solid #e5e7eb'
                     }}>
                       <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ margin: '0 auto', color: '#9ca3af' }}>
                         <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                         <circle cx="12" cy="7" r="4"></circle>
                       </svg>
                       <h4 style={{ color: '#6b7280', margin: '1rem 0 0.5rem 0' }}>Nenhum paciente encontrado</h4>
                       <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
                         Esta clínica ainda não tem pacientes agendados no sistema.
                       </p>
                     </div>
                   ) : (
                     <div style={{ overflowX: 'auto' }}>
                       <table className="data-table" style={{ width: '100%' }}>
                         <thead>
                           <tr>
                             <th>Nome</th>
                             <th>Telefone</th>
                             <th>Status</th>
                             <th>Data Cadastro</th>
                           </tr>
                         </thead>
                         <tbody>
                           {pacientesClinica.map((paciente) => (
                             <tr key={paciente.id}>
                               <td>
                                 <strong>{paciente.nome}</strong>
                               </td>
                               <td>
                                 {paciente.telefone ? 
                                   formatarTelefone(paciente.telefone) : 
                                   'Não informado'
                                 }
                               </td>
                               <td>
                                 <span style={{
                                   padding: '0.25rem 0.75rem',
                                   borderRadius: '9999px',
                                   fontSize: '0.875rem',
                                   fontWeight: '500',
                                   backgroundColor: 
                                     paciente.status === 'fechado' ? '#10b98120' :
                                     paciente.status === 'agendado' ? '#3b82f620' :
                                     paciente.status === 'lead' ? '#f59e0b20' : '#6b728020',
                                   color:
                                     paciente.status === 'fechado' ? '#10b981' :
                                     paciente.status === 'agendado' ? '#3b82f6' :
                                     paciente.status === 'lead' ? '#f59e0b' : '#6b7280'
                                 }}>
                                   {paciente.status === 'fechado' ? 'Fechado' :
                                    paciente.status === 'agendado' ? 'Agendado' :
                                    paciente.status === 'lead' ? 'Lead' : paciente.status}
                                 </span>
                               </td>
                               <td style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                 {formatarData(paciente.created_at)}
                               </td>
                             </tr>
                           ))}
                         </tbody>
                       </table>
                     </div>
                   )}
                 </div>
               )}

               {/* Aba de Histórico */}
               {activeViewTab === 'historico' && (
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
                       <circle cx="12" cy="12" r="10"></circle>
                       <polyline points="12 6 12 12 16 14"></polyline>
                     </svg>
                     Histórico de Atividades
                   </h3>
                   
                   <div style={{
                     textAlign: 'center',
                     padding: '3rem',
                     backgroundColor: '#f9fafb',
                     borderRadius: '8px',
                     border: '1px solid #e5e7eb'
                   }}>
                     <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ margin: '0 auto', color: '#9ca3af' }}>
                       <circle cx="12" cy="12" r="10"></circle>
                       <polyline points="12 6 12 12 16 14"></polyline>
                     </svg>
                     <h4 style={{ color: '#6b7280', margin: '1rem 0 0.5rem 0' }}>Histórico em Desenvolvimento</h4>
                     <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
                       Em breve você poderá visualizar todas as atividades relacionadas a esta clínica:
                     </p>
                     <ul style={{ 
                       color: '#9ca3af', 
                       fontSize: '0.875rem', 
                       textAlign: 'left', 
                       maxWidth: '300px', 
                       margin: '1rem auto',
                       paddingLeft: '1rem'
                     }}>
                       <li>Alterações nos dados</li>
                       <li>Upload de documentos</li>
                       <li>Mudanças de status</li>
                       <li>Agendamentos realizados</li>
                       <li>Comunicações registradas</li>
                     </ul>
                   </div>
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

      {/* Modal de Visualização de Nova Clínica */}
      {viewNovaClinicaModalOpen && viewingNovaClinica && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 className="modal-title">
                Detalhes da Nova Clínica
              </h2>
              <button 
                className="close-btn"
                onClick={closeViewNovaClinicaModal}
              >
                ×
              </button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Nome da Clínica</label>
                  <p style={{ margin: '0.25rem 0 0 0', color: '#1f2937' }}>{viewingNovaClinica.nome}</p>
                </div>
                
                 {viewingNovaClinica.cnpj && !isFreelancer && (
                   <div>
                     <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>CNPJ</label>
                     <p style={{ margin: '0.25rem 0 0 0', color: '#1f2937', fontFamily: 'monospace' }}>
                       {viewingNovaClinica.cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')}
                     </p>
                   </div>
                 )}

                 {viewingNovaClinica.responsavel && (
                   <div>
                     <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Responsável</label>
                     <p style={{ margin: '0.25rem 0 0 0', color: '#1f2937' }}>{viewingNovaClinica.responsavel}</p>
                   </div>
                 )}
                
                {viewingNovaClinica.endereco && (
                  <div>
                    <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Endereço</label>
                    <p style={{ margin: '0.25rem 0 0 0', color: '#1f2937' }}>{viewingNovaClinica.endereco}</p>
                  </div>
                )}
                
                {viewingNovaClinica.bairro && (
                  <div>
                    <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Bairro</label>
                    <p style={{ margin: '0.25rem 0 0 0', color: '#1f2937' }}>{viewingNovaClinica.bairro}</p>
                  </div>
                )}
                
                {(viewingNovaClinica.cidade || viewingNovaClinica.estado) && (
                  <div>
                    <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Localização</label>
                    <p style={{ margin: '0.25rem 0 0 0', color: '#1f2937' }}>
                      {viewingNovaClinica.cidade && viewingNovaClinica.estado 
                        ? `${viewingNovaClinica.cidade}, ${viewingNovaClinica.estado}`
                        : viewingNovaClinica.cidade || viewingNovaClinica.estado
                      }
                    </p>
                  </div>
                )}
                
                {viewingNovaClinica.nicho && (
                  <div>
                    <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Nicho</label>
                    <p style={{ margin: '0.25rem 0 0 0', color: '#1f2937' }}>{viewingNovaClinica.nicho}</p>
                  </div>
                )}
                
                {viewingNovaClinica.telefone && (
                  <div>
                    <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Telefone</label>
                    <p style={{ margin: '0.25rem 0 0 0', color: '#1f2937' }}>{formatarTelefone(viewingNovaClinica.telefone)}</p>
                  </div>
                )}
                
                {viewingNovaClinica.email && (
                  <div>
                    <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>E-mail</label>
                    <p style={{ margin: '0.25rem 0 0 0', color: '#1f2937' }}>{viewingNovaClinica.email?.toLowerCase()}</p>
                  </div>
                )}
                
                {viewingNovaClinica.status && (
                  <div>
                    <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Status</label>
                    <p style={{ margin: '0.25rem 0 0 0', color: '#1f2937' }}>
                      {(() => {
                        const statusInfo = getStatusNovaClinicaInfo(viewingNovaClinica.status);
                        return (
                          <span 
                            className="badge"
                            style={{
                              backgroundColor: statusInfo.color + '20',
                              color: statusInfo.color,
                              border: `1px solid ${statusInfo.color}`
                            }}
                          >
                            {statusInfo.label}
                          </span>
                        );
                      })()}
                    </p>
                  </div>
                )}
                
                {viewingNovaClinica.observacoes && (
                  <div>
                    <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Observações</label>
                    <p style={{ margin: '0.25rem 0 0 0', color: '#1f2937' }}>{viewingNovaClinica.observacoes}</p>
                  </div>
                )}
                
                {viewingNovaClinica.consultor_nome && (
                  <div>
                    <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Indicado por</label>
                    <p style={{ margin: '0.25rem 0 0 0', color: '#1f2937' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span className="badge" style={{ backgroundColor: '#3b82f6', color: 'white' }}>
                          {viewingNovaClinica.consultor_nome}
                        </span>
                        {viewingNovaClinica.empresa_nome && (
                          <span className="badge" style={{ backgroundColor: '#8b5cf6', color: 'white' }}>
                            {viewingNovaClinica.empresa_nome}
                          </span>
                        )}
                      </div>
                    </p>
                  </div>
                )}
                
                {viewingNovaClinica.created_at && (
                  <div>
                    <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Data de Cadastro</label>
                    <p style={{ margin: '0.25rem 0 0 0', color: '#6b7280', fontSize: '0.875rem' }}>{formatarData(viewingNovaClinica.created_at)}</p>
                  </div>
                )}
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <button 
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeViewNovaClinicaModal}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cadastro de Nova Clínica - Formulário Simples (para freelancers) ou Completo (para admins) */}
      {showNovaClinicaModal && isConsultor && !isAdmin && !isConsultorInterno && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h2 className="modal-title">{editingNovaClinica ? 'Editar Nova Clínica' : 'Indicar Nova Clínica'}</h2>
              <button 
                className="close-btn"
                onClick={() => {
                  setShowNovaClinicaModal(false);
                  setEditingNovaClinica(null);
                  setNovaClinicaFormData({ 
                    nome: '',
                    telefone: '',
                    cidade: '',
                    estado: '',
                    observacoes: ''
                  });
                  setCidadeCustomizadaNova(false);
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleNovaClinicaSubmit} style={{ padding: '2rem' }}>
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
                    Nome da Clínica *
                  </label>
                  <input
                    type="text"
                    name="nome"
                    value={novaClinicaFormData.nome}
                    onChange={handleNovaClinicaInputChange}
                    placeholder="Digite o nome da clínica"
                    disabled={submittingNovaClinica}
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

                {/* Responsável */}
                <div>
                  <label style={{
                    display: 'block',
                    fontWeight: '600',
                    color: '#1e293b',
                    marginBottom: '0.5rem',
                    fontSize: '0.95rem'
                  }}>
                    Responsável pela Clínica *
                  </label>
                  <input
                    type="text"
                    name="responsavel"
                    value={novaClinicaFormData.responsavel}
                    onChange={handleNovaClinicaInputChange}
                    placeholder="Digite o nome do responsável"
                    disabled={submittingNovaClinica}
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
                    value={novaClinicaFormData.telefone}
                    onChange={handleNovaClinicaInputChange}
                    placeholder="(11) 99999-9999"
                    disabled={submittingNovaClinica}
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
                    value={novaClinicaFormData.estado}
                    onChange={handleNovaClinicaInputChange}
                    disabled={submittingNovaClinica}
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
                  {novaClinicaFormData.estado && cidadesPorEstado[novaClinicaFormData.estado] && !cidadeCustomizadaNova ? (
                    <select
                      name="cidade"
                      value={novaClinicaFormData.cidade}
                      onChange={(e) => {
                        if (e.target.value === 'OUTRA') {
                          setCidadeCustomizadaNova(true);
                          setNovaClinicaFormData(prev => ({ ...prev, cidade: '' }));
                        } else {
                          handleNovaClinicaInputChange(e);
                        }
                      }}
                      disabled={submittingNovaClinica}
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
                      {cidadesPorEstado[novaClinicaFormData.estado].map(cidade => (
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
                          value={novaClinicaFormData.cidade}
                          onChange={handleNovaClinicaInputChange}
                          placeholder="Digite o nome da cidade"
                          disabled={submittingNovaClinica || !novaClinicaFormData.estado}
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
                      {novaClinicaFormData.estado && cidadesPorEstado[novaClinicaFormData.estado] && cidadeCustomizadaNova && (
                        <button
                          type="button"
                          onClick={() => {
                            setCidadeCustomizadaNova(false);
                            setNovaClinicaFormData(prev => ({ ...prev, cidade: '' }));
                          }}
                          disabled={submittingNovaClinica}
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
                    value={novaClinicaFormData.observacoes}
                    onChange={handleNovaClinicaInputChange}
                    placeholder="Adicione observações sobre a clínica (opcional)"
                    disabled={submittingNovaClinica}
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
                  onClick={() => {
                    if (!submittingNovaClinica) {
                      setShowNovaClinicaModal(false);
                      setEditingNovaClinica(null);
                      setNovaClinicaFormData({ 
                        nome: '',
                        telefone: '',
                        cidade: '',
                        estado: '',
                        observacoes: ''
                      });
                      setCidadeCustomizadaNova(false);
                    }
                  }}
                  disabled={submittingNovaClinica}
                  style={{
                    padding: '0.75rem 2rem',
                    background: '#e2e8f0',
                    color: '#1e293b',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: submittingNovaClinica ? 'not-allowed' : 'pointer',
                    marginRight: '1rem',
                    opacity: submittingNovaClinica ? 0.6 : 1
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingNovaClinica}
                  style={{
                    padding: '0.75rem 2rem',
                    background: submittingNovaClinica 
                      ? '#94a3b8' 
                      : 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '1rem',
                    fontWeight: '700',
                    cursor: submittingNovaClinica ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {submittingNovaClinica ? (
                    <>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid rgba(255, 255, 255, 0.3)',
                        borderTop: '2px solid white',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                      Cadastrando...
                    </>
                  ) : (
                    'Cadastrar Clínica'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Cadastro de Nova Clínica - Formulário Completo (para admins e internos) */}
      {showNovaClinicaModal && (isAdmin || isConsultorInterno) && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h2 className="modal-title">{editingNovaClinica ? 'Editar Nova Clínica' : 'Cadastrar Nova Clínica'}</h2>
              <button 
                className="close-btn"
                onClick={() => {
                  setShowNovaClinicaModal(false);
                  setEditingNovaClinica(null);
                  setNovaClinicaFormData({ 
                    nome: '',
                    cnpj: '',
                    endereco: '',
                    bairro: '',
                    cidade: '',
                    estado: '',
                    nicho: '',
                    telefone: '',
                    email: '',
                    responsavel: '',
                    status: 'tem_interesse',
                    observacoes: ''
                  });
                  setCidadeCustomizadaNova(false);
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleNovaClinicaSubmit} style={{ padding: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Nome da Clínica *</label>
                <input
                  type="text"
                  name="nome"
                  className="form-input"
                  value={novaClinicaFormData.nome}
                  onChange={handleNovaClinicaInputChange}
                  placeholder="Digite o nome da clínica"
                  required
                />
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">CNPJ *</label>
                  <input
                    type="text"
                    name="cnpj"
                    className="form-input"
                    value={novaClinicaFormData.cnpj}
                    onChange={handleNovaClinicaInputChange}
                    placeholder="00.000.000/0000-00"
                    maxLength="18"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Responsável *</label>
                  <input
                    type="text"
                    name="responsavel"
                    className="form-input"
                    value={novaClinicaFormData.responsavel}
                    onChange={handleNovaClinicaInputChange}
                    placeholder="Nome do responsável"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Endereço (Rua e Número) *</label>
                <input
                  type="text"
                  name="endereco"
                  className="form-input"
                  value={novaClinicaFormData.endereco}
                  onChange={handleNovaClinicaInputChange}
                  placeholder="Ex: Rua das Flores, 123"
                  required
                />
              </div>

              <div className="grid grid-3">
                <div className="form-group">
                  <label className="form-label">Estado *</label>
                  <select
                    name="estado"
                    className="form-select"
                    value={novaClinicaFormData.estado}
                    onChange={handleNovaClinicaInputChange}
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
                  {novaClinicaFormData.estado && cidadesPorEstado[novaClinicaFormData.estado] && !cidadeCustomizadaNova ? (
                    <select
                      name="cidade"
                      className="form-select"
                      value={novaClinicaFormData.cidade}
                      onChange={(e) => {
                        if (e.target.value === 'OUTRA') {
                          setCidadeCustomizadaNova(true);
                          setNovaClinicaFormData(prev => ({ ...prev, cidade: '' }));
                        } else {
                          handleNovaClinicaInputChange(e);
                        }
                      }}
                      required
                    >
                      <option value="">Selecione a cidade</option>
                      {cidadesPorEstado[novaClinicaFormData.estado].map(cidade => (
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
                        value={novaClinicaFormData.cidade}
                        onChange={handleNovaClinicaInputChange}
                        placeholder="Digite o nome da cidade"
                        disabled={!novaClinicaFormData.estado}
                        required
                      />
                      {novaClinicaFormData.estado && cidadesPorEstado[novaClinicaFormData.estado] && cidadeCustomizadaNova && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ whiteSpace: 'nowrap', fontSize: '0.875rem', padding: '0.5rem' }}
                          onClick={() => {
                            setCidadeCustomizadaNova(false);
                            setNovaClinicaFormData(prev => ({ ...prev, cidade: '' }));
                          }}
                        >
                          Voltar
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Bairro</label>
                  <input
                    type="text"
                    name="bairro"
                    className="form-input"
                    value={novaClinicaFormData.bairro}
                    onChange={handleNovaClinicaInputChange}
                    placeholder="Bairro"
                  />
                </div>
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Nicho</label>
                  <select
                    name="nicho"
                    className="form-select"
                    value={novaClinicaFormData.nicho}
                    onChange={handleNovaClinicaInputChange}
                  >
                    <option value="">Selecione o nicho</option>
                    <option value="Estético">Estético</option>
                    <option value="Odontológico">Odontológico</option>
                    <option value="Ambos">Ambos</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Telefone *</label>
                  <input
                    type="tel"
                    name="telefone"
                    className="form-input"
                    value={novaClinicaFormData.telefone}
                    onChange={handleNovaClinicaInputChange}
                    placeholder="(11) 99999-9999"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">E-mail *</label>
                <input
                  type="email"
                  name="email"
                  className="form-input"
                  value={novaClinicaFormData.email}
                  onChange={handleNovaClinicaInputChange}
                  placeholder="email@clinica.com.br"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Observações</label>
                <textarea
                  name="observacoes"
                  className="form-textarea"
                  value={novaClinicaFormData.observacoes}
                  onChange={handleNovaClinicaInputChange}
                  placeholder="Informações adicionais sobre a clínica..."
                  rows="3"
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <button 
                  type="button"
                  className="btn btn-secondary"
                  disabled={submittingNovaClinica}
                  style={{ 
                    opacity: submittingNovaClinica ? 0.6 : 1,
                    cursor: submittingNovaClinica ? 'not-allowed' : 'pointer'
                  }}
                  onClick={() => {
                    if (!submittingNovaClinica) {
                      setShowNovaClinicaModal(false);
                      setEditingNovaClinica(null);
                      setNovaClinicaFormData({ 
                        nome: '',
                        cnpj: '',
                        endereco: '',
                        bairro: '',
                        cidade: '',
                        estado: '',
                        nicho: '',
                        telefone: '',
                        email: '',
                        responsavel: '',
                        status: 'tem_interesse',
                        observacoes: ''
                      });
                      setCidadeCustomizadaNova(false);
                    }
                  }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingNovaClinica}
                  style={{ 
                    opacity: submittingNovaClinica ? 0.6 : 1,
                    cursor: submittingNovaClinica ? 'not-allowed' : 'pointer'
                  }}
                >
                  {submittingNovaClinica ? 'Cadastrando...' : 'Cadastrar Clínica'}
                </button>
              </div>
            </form>
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

      {/* Modal de Evidência de Status */}
      <ModalEvidencia
        isOpen={showEvidenciaModal}
        onClose={handleEvidenciaClose}
        onSuccess={handleEvidenciaSuccess}
        tipo={evidenciaData.tipoClinica}
        registroId={evidenciaData.clinicaId}
        statusAnterior={evidenciaData.statusAnterior}
        statusNovo={evidenciaData.statusNovo}
        nomeRegistro={evidenciaData.clinicaNome}
      />

      {/* Tutorial Overlay */}
      <TutorialClinicas
        isOpen={showTutorial}
        onClose={handleTutorialClose}
        onComplete={handleTutorialComplete}
      />

      {/* Modal de Gerenciar Acesso */}
      {showAcessoModal && clinicaParaAcesso && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 className="modal-title">
                {clinicaParaAcesso.ativo_no_sistema ? 'Editar' : 'Criar'} Acesso - {clinicaParaAcesso.nome}
              </h2>
              <button 
                className="close-btn" 
                onClick={() => {
                  setShowAcessoModal(false);
                  setClinicaParaAcesso(null);
                  setAcessoFormData({ email: '', senha: '', confirmarSenha: '' });
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSalvarAcesso(); }}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Email de Login *</label>
                  <input
                    type="email"
                    className="form-input"
                    value={acessoFormData.email}
                    onChange={(e) => setAcessoFormData({ 
                      ...acessoFormData, 
                      email: e.target.value.toLowerCase() 
                    })}
                    placeholder="email@clinica.com.br"
                    required
                  />
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                    Este será o email usado pela clínica para fazer login no sistema
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Senha *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={mostrarSenhaAcesso ? 'text' : 'password'}
                      className="form-input"
                      value={acessoFormData.senha}
                      onChange={(e) => setAcessoFormData({ 
                        ...acessoFormData, 
                        senha: e.target.value 
                      })}
                      placeholder="Mínimo 6 caracteres"
                      required
                      style={{ paddingRight: '40px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarSenhaAcesso(!mostrarSenhaAcesso)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#6b7280',
                        cursor: 'pointer',
                        padding: '4px'
                      }}
                    >
                      {mostrarSenhaAcesso ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                          <line x1="1" y1="1" x2="23" y2="23"/>
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Confirmar Senha *</label>
                  <input
                    type={mostrarSenhaAcesso ? 'text' : 'password'}
                    className="form-input"
                    value={acessoFormData.confirmarSenha}
                    onChange={(e) => setAcessoFormData({ 
                      ...acessoFormData, 
                      confirmarSenha: e.target.value 
                    })}
                    placeholder="Digite a senha novamente"
                    required
                  />
                </div>

                {clinicaParaAcesso.ativo_no_sistema && (
                  <div style={{
                    backgroundColor: '#fef3c7',
                    border: '1px solid #f59e0b',
                    borderRadius: '6px',
                    padding: '0.75rem',
                    marginTop: '1rem'
                  }}>
                    <strong style={{ color: '#92400e' }}>Atenção:</strong>
                    <p style={{ margin: '0.25rem 0 0 0', color: '#92400e', fontSize: '0.875rem' }}>
                      Ao alterar a senha, a clínica precisará usar a nova senha no próximo login.
                    </p>
                  </div>
                )}
              </div>

              <div className="modal-footer" style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between' }}>
                <div>
                  {clinicaParaAcesso.ativo_no_sistema && (
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={handleRemoverAcesso}
                    >
                      Remover Acesso
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowAcessoModal(false);
                      setClinicaParaAcesso(null);
                      setAcessoFormData({ email: '', senha: '', confirmarSenha: '' });
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={salvandoAcesso}
                  >
                    {salvandoAcesso ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clinicas; 