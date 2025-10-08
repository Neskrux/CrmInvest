import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import TutorialClinicas from './TutorialClinicas';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import config from '../config';

const Clinicas = () => {
  const { makeRequest, user, isAdmin, podeAlterarStatus, isFreelancer, isConsultorInterno, isClinica } = useAuth();
  const { showSuccessToast, showErrorToast, showWarningToast } = useToast();
  const [clinicas, setClinicas] = useState([]);
  const [novasClinicas, setNovasClinicas] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showNovaClinicaModal, setShowNovaClinicaModal] = useState(false);
  const [editingClinica, setEditingClinica] = useState(null);
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
    visita_online_url: '',
    visita_online_data: '',
    visita_online_observacoes: '',
    doc_certidao_casamento: false
  });
  const [cidadeCustomizada, setCidadeCustomizada] = useState(false);
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
    status: 'tem_interesse',
    observacoes: ''
  });
  const [cidadeCustomizadaNova, setCidadeCustomizadaNova] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [uploadingDocs, setUploadingDocs] = useState({});

  // Estados para controlar o tutorial
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialCompleted, setTutorialCompleted] = useState(false);

  // Estado para modal de explicação de permissões
  const [showPermissaoModal, setShowPermissaoModal] = useState(false);

  // Status disponíveis para clínicas gerais
  const statusClinicaOptions = [
    { value: 'ativa', label: 'Ativa', color: '#10b981' },
    { value: 'inativa', label: 'Inativa', color: '#ef4444' },
    { value: 'em_contato', label: 'Em Contato', color: '#3b82f6' },
    { value: 'reuniao_marcada', label: 'Reunião Marcada', color: '#8b5cf6' },
    { value: 'aguardando_documentacao', label: 'Aguardando Documentação', color: '#f59e0b' },
    { value: 'nao_fechou', label: 'Não Fechou', color: '#f59e0b' }
  ];

  // Status disponíveis para novas clínicas
  const statusNovaClinicaOptions = [
    { value: 'sem_primeiro_contato', label: 'Sem Primeiro Contato', color: '#6b7280' },
    { value: 'tem_interesse', label: 'Tem Interesse', color: '#10b981' },
    { value: 'nao_tem_interesse', label: 'Não tem Interesse', color: '#ef4444' },
    { value: 'em_contato', label: 'Em Contato', color: '#3b82f6' },
    { value: 'reuniao_marcada', label: 'Reunião Marcada', color: '#8b5cf6' },
    { value: 'aguardando_documentacao', label: 'Aguardando Documentação', color: '#f59e0b' },
    { value: 'nao_fechou', label: 'Não Fechou', color: '#f59e0b' }
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
        showSuccessToast('Clínica aprovada e movida para clínicas parceiras com sucesso!');
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
      const response = await makeRequest('/novas-clinicas', {
        method: 'POST',
        body: JSON.stringify(novaClinicaFormData)
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
          status: 'tem_interesse',
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
        
        // Atualizar o estado do formulário
        const docField = `doc_${docType}`;
        setFormData(prev => ({ ...prev, [docField]: true }));
        
        // Recarregar dados da clínica
        fetchClinicas();
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
  
  const handleDownloadDocument = async (docType) => {
    try {
      // Buscar a URL do documento no banco de dados
      const response = await fetch(`http://localhost:5000/api/clinicas/${editingClinica.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const clinica = await response.json();
        const docField = `doc_${docType}_url`;
        const docUrl = clinica[docField];
        
        if (docUrl) {
          // Abrir o documento em uma nova aba
          window.open(docUrl, '_blank');
        } else {
          showErrorToast('Documento não encontrado');
        }
      } else {
        showErrorToast('Erro ao buscar documento');
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
        setFormData(prev => ({ ...prev, [docField]: false }));
        
        // Recarregar dados da clínica
        fetchClinicas();
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
      // Normalizar email antes de enviar
      const dadosParaEnviar = {
        ...formData,
        email: formData.email?.toLowerCase().trim(),
        email_login: formData.email_login?.toLowerCase().trim()
      };
      
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
          showSuccessToast(editingClinica ? 'Clínica atualizada com sucesso!' : 'Clínica cadastrada com sucesso!');
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
      } else {
        showErrorToast('Erro ao salvar clínica: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao salvar clínica:', error);
      showErrorToast('Erro ao salvar clínica');
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
      // Campos de documentação
      doc_cartao_cnpj: clinica.doc_cartao_cnpj || false,
      doc_contrato_social: clinica.doc_contrato_social || false,
      doc_alvara_sanitario: clinica.doc_alvara_sanitario || false,
      doc_balanco: clinica.doc_balanco || false,
      doc_comprovante_endereco: clinica.doc_comprovante_endereco || false,
      doc_dados_bancarios: clinica.doc_dados_bancarios || false,
      doc_socios: clinica.doc_socios || false,
      doc_certidao_resp_tecnico: clinica.doc_certidao_resp_tecnico || false,
      doc_resp_tecnico: clinica.doc_resp_tecnico || false,
      visita_online: clinica.visita_online || false,
      visita_online_url: clinica.visita_online_url || '',
      visita_online_data: clinica.visita_online_data || '',
      visita_online_observacoes: clinica.visita_online_observacoes || '',
      doc_certidao_casamento: clinica.doc_certidao_casamento || false
    });
    setCidadeCustomizada(cidadeEhCustomizada);
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
      doc_certidao_casamento: false
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
    if (name === 'cidade') {
      value = formatarCidade(value);
    } else if (name === 'cnpj') {
      value = formatarCNPJ(value);
    } else if (name === 'email' || name === 'email_login') {
      // Normalizar emails para minúsculas
      value = value.toLowerCase();
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

  const alterarStatusNovaClinica = async (clinicaId, novoStatus) => {
    try {
      const response = await makeRequest(`/novas-clinicas/${clinicaId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: novoStatus })
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

  const handleNovaClinicaInputChange = (e) => {
    let { name, value } = e.target;
    
    // Aplicar formatação específica baseada no campo
    if (name === 'telefone') {
      value = value
        .replace(/\D/g, '')
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .replace(/(-\d{4})\d+?$/, '$1');
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

  // Filtrar clínicas
  const clinicasFiltradas = clinicas.filter(clinica => {
    const matchEstado = !filtroEstado || clinica.estado === filtroEstado;
    const matchCidade = !filtroCity || clinica.cidade?.toLowerCase().includes(filtroCity.toLowerCase());
    const matchStatus = !filtroStatus || clinica.status === filtroStatus;
    return matchEstado && matchCidade && matchStatus;
  });

  // Obter listas únicas para filtros
  const estadosDisponiveis = [...new Set(clinicas
    .map(c => c.estado)
    .filter(estado => estado && estado.trim() !== '')
  )].sort();

  const cidadesDisponiveis = [...new Set(clinicas
    .filter(c => !filtroEstado || c.estado === filtroEstado)
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
          
          
          {/* Links personalizados para consultores */}
          {isConsultor && (
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
          
          <button
            className={`tab ${activeTab === 'novas-clinicas' ? 'active' : ''}`}
            onClick={() => setActiveTab('novas-clinicas')}
            style={{ position: 'relative' }}
          >
            {isAdmin || isConsultorInterno ? 'Novas Clínicas' : 'Minhas Indicações'}
            {novasClinicas.length > 0 && (
              <span className="tab-badge">{novasClinicas.length}</span>
            )}
          </button>
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
              <div className="stat-value">{clinicas.length}</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-label">Odontológica</div>
              <div className="stat-value">{clinicas.filter(c => c.nicho === 'Odontológico').length}</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-label">Estética</div>
              <div className="stat-value">{clinicas.filter(c => c.nicho === 'Estético').length}</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-label">Ambos</div>
              <div className="stat-value">{clinicas.filter(c => c.nicho === 'Ambos').length}</div>
            </div>
          </div>

          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="card-title">Lista de Clínicas</h2>
              <div style={{ display: 'flex', gap: '1rem' }}>
                {isConsultor && (
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
                {!isConsultor && user?.tipo !== 'empresa' && (
                  <button 
                    className="btn btn-primary"
                    onClick={() => setShowModal(true)}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    Nova Clínica
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

              {/* Seção de Acesso ao Sistema */}
              {isAdmin && (
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
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1rem' }}>
                    {/* Upload de documentos */}
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
                          <span style={{ fontWeight: '600' }}>1. Cartão CNPJ</span>
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
                          <span style={{ fontWeight: '600' }}>2. Contrato Social</span>
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
                          <span style={{ fontWeight: '600' }}>3. Alvará de Funcionamento Sanitário</span>
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
                            name="doc_balanco"
                            checked={formData.doc_balanco || false}
                            onChange={(e) => setFormData({...formData, doc_balanco: e.target.checked})}
                            disabled
                          />
                          <span style={{ fontWeight: '600' }}>4. Balanço/Balancete Assinado</span>
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
                          <span style={{ fontWeight: '600' }}>5. Comprovante de Endereço da Clínica</span>
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
                            name="doc_dados_bancarios"
                            checked={formData.doc_dados_bancarios || false}
                            onChange={(e) => setFormData({...formData, doc_dados_bancarios: e.target.checked})}
                            disabled
                          />
                          <span style={{ fontWeight: '600' }}>6. Dados Bancários PJ</span>
                        </label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {formData.doc_dados_bancarios ? (
                            <>
                              <button
                                type="button"
                                className="btn btn-sm btn-secondary"
                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                onClick={() => handleDownloadDocument('dados_bancarios')}
                              >
                                Baixar
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-danger"
                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                onClick={() => handleDeleteDocument('dados_bancarios')}
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
                                onChange={(e) => handleUploadDocument(e, 'dados_bancarios')}
                              />
                              Enviar
                            </label>
                          )}
                        </div>
                      </div>
                      {uploadingDocs['dados_bancarios'] && (
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
                            name="doc_socios"
                            checked={formData.doc_socios || false}
                            onChange={(e) => setFormData({...formData, doc_socios: e.target.checked})}
                            disabled
                          />
                          <span style={{ fontWeight: '600' }}>7. Documentos dos Sócios</span>
                        </label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {formData.doc_socios ? (
                            <>
                              <button
                                type="button"
                                className="btn btn-sm btn-secondary"
                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                onClick={() => handleDownloadDocument('socios')}
                              >
                                Baixar
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-danger"
                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                onClick={() => handleDeleteDocument('socios')}
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
                                onChange={(e) => handleUploadDocument(e, 'socios')}
                              />
                              Enviar
                            </label>
                          )}
                        </div>
                      </div>
                      {uploadingDocs['socios'] && (
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
                            name="doc_certidao_resp_tecnico"
                            checked={formData.doc_certidao_resp_tecnico || false}
                            onChange={(e) => setFormData({...formData, doc_certidao_resp_tecnico: e.target.checked})}
                            disabled
                          />
                          <span style={{ fontWeight: '600' }}>8. Certidão de Responsabilidade Técnica</span>
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
                          <span style={{ fontWeight: '600' }}>9. Documentos do Responsável Técnico</span>
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
                            name="visita_online"
                            checked={formData.visita_online || false}
                            onChange={(e) => setFormData({...formData, visita_online: e.target.checked})}
                            disabled={formData.visita_online_url ? true : false}
                          />
                          <span style={{ fontWeight: '600' }}>10. Visita Online (Vídeo)</span>
                        </label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {formData.visita_online_url ? (
                            <>
                              <button
                                type="button"
                                className="btn btn-sm btn-secondary"
                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                onClick={() => window.open(formData.visita_online_url, '_blank')}
                              >
                                Assistir
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-danger"
                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                onClick={() => handleDeleteDocument('visita_online')}
                              >
                                Excluir
                              </button>
                            </>
                          ) : (
                            <label className="btn btn-sm btn-primary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', cursor: 'pointer', color: 'white' }}>
                              <input
                                type="file"
                                style={{ display: 'none' }}
                                accept="video/mp4,video/avi,video/mov,video/wmv,video/webm,video/mkv"
                                onChange={(e) => handleUploadDocument(e, 'visita_online')}
                              />
                              Enviar Vídeo
                            </label>
                          )}
                        </div>
                      </div>
                      {uploadingDocs['visita_online'] && (
                        <div style={{ fontSize: '0.75rem', color: '#3b82f6' }}>Enviando vídeo... (pode demorar alguns segundos)</div>
                      )}
                      {formData.visita_online_url && (
                        <div style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                          <input
                            type="date"
                            className="form-control"
                            value={formData.visita_online_data || ''}
                            onChange={(e) => setFormData({...formData, visita_online_data: e.target.value})}
                            placeholder="Data da visita"
                            style={{ marginBottom: '0.5rem' }}
                          />
                          <textarea
                            className="form-control"
                            value={formData.visita_online_observacoes || ''}
                            onChange={(e) => setFormData({...formData, visita_online_observacoes: e.target.value})}
                            placeholder="Observações sobre a visita..."
                            rows="2"
                          />
                        </div>
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
                            name="doc_certidao_casamento"
                            checked={formData.doc_certidao_casamento || false}
                            onChange={(e) => setFormData({...formData, doc_certidao_casamento: e.target.checked})}
                            disabled
                          />
                          <span style={{ fontWeight: '600' }}>11. Certidão de Casamento (se aplicável)</span>
                        </label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {formData.doc_certidao_casamento ? (
                            <>
                              <button
                                type="button"
                                className="btn btn-sm btn-secondary"
                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                onClick={() => handleDownloadDocument('certidao_casamento')}
                              >
                                Baixar
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-danger"
                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                onClick={() => handleDeleteDocument('certidao_casamento')}
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
                                onChange={(e) => handleUploadDocument(e, 'certidao_casamento')}
                              />
                              Enviar
                            </label>
                          )}
                        </div>
                      </div>
                      {uploadingDocs['certidao_casamento'] && (
                        <div style={{ fontSize: '0.75rem', color: '#3b82f6' }}>Enviando...</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
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
                     <p style={{ margin: '0.25rem 0 0 0', color: '#1f2937' }}>{viewingClinica.email?.toLowerCase()}</p>
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
                       { key: 'doc_balanco', label: '4. Balanço/Balancete' },
                       { key: 'doc_comprovante_endereco', label: '5. Comprovante Endereço' },
                       { key: 'doc_dados_bancarios', label: '6. Dados Bancários PJ' },
                       { key: 'doc_socios', label: '7. Docs dos Sócios' },
                       { key: 'doc_certidao_resp_tecnico', label: '8. Certidão Resp. Técnico' },
                       { key: 'doc_resp_tecnico', label: '9. Docs Resp. Técnico' }
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
                          const totalDocs = 9;
                          const docsEnviados = [
                            viewingClinica.doc_cartao_cnpj,
                            viewingClinica.doc_contrato_social,
                            viewingClinica.doc_alvara_sanitario,
                            viewingClinica.doc_balanco,
                            viewingClinica.doc_comprovante_endereco,
                            viewingClinica.doc_dados_bancarios,
                            viewingClinica.doc_socios,
                            viewingClinica.doc_certidao_resp_tecnico,
                            viewingClinica.doc_resp_tecnico
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
                            viewingClinica.doc_resp_tecnico_aprovado
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
              <h2 className="modal-title">Indicar Nova Clínica</h2>
              <button 
                className="close-btn"
                onClick={() => {
                  setShowNovaClinicaModal(false);
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
              <h2 className="modal-title">Cadastrar Nova Clínica</h2>
              <button 
                className="close-btn"
                onClick={() => {
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
                <label className="form-label">Status da Clínica *</label>
                <select
                  name="status"
                  className="form-select"
                  value={novaClinicaFormData.status}
                  onChange={handleNovaClinicaInputChange}
                  required
                >
                  {statusNovaClinicaOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
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