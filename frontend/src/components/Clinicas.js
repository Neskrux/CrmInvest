import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
// Mapa (Leaflet)
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const Clinicas = () => {
  const { makeRequest, user, isAdmin } = useAuth();
  const { showSuccessToast, showErrorToast } = useToast();
  const [clinicas, setClinicas] = useState([]);
  const [novasClinicas, setNovasClinicas] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showNovaClinicaModal, setShowNovaClinicaModal] = useState(false);
  const [editingClinica, setEditingClinica] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('clinicas');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroCity, setFiltroCity] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewingClinica, setViewingClinica] = useState(null);
  const [viewNovaClinicaModalOpen, setViewNovaClinicaModalOpen] = useState(false);
  const [viewingNovaClinica, setViewingNovaClinica] = useState(null);
  const [clinicasGeo, setClinicasGeo] = useState([]);
  const [novasClinicasGeo, setNovasClinicasGeo] = useState([]);
  const [geocoding, setGeocoding] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    endereco: '',
    bairro: '',
    cidade: '',
    estado: '',
    nicho: '',
    telefone: '',
    email: '',
    status: 'ativo'
  });
  const [cidadeCustomizada, setCidadeCustomizada] = useState(false);
  const [novaClinicaFormData, setNovaClinicaFormData] = useState({
    nome: '',
    endereco: '',
    bairro: '',
    cidade: '',
    estado: '',
    nicho: '',
    telefone: '',
    email: '',
    status: 'tem_interesse',
    observacoes: ''
  });
  const [cidadeCustomizadaNova, setCidadeCustomizadaNova] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Status disponíveis para novas clínicas
  const statusNovaClinicaOptions = [
    { value: 'tem_interesse', label: 'Tem Interesse', color: '#10b981' },
    { value: 'nao_tem_interesse', label: 'Não tem Interesse', color: '#ef4444' }
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
  }, []);

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

  const handleNovaClinicaSubmit = async (e) => {
    e.preventDefault();
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
          endereco: '',
          bairro: '',
          cidade: '',
          estado: '',
          nicho: '',
          telefone: '',
          email: '',
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
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let response;
      if (editingClinica) {
        response = await makeRequest(`/clinicas/${editingClinica.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
      } else {
        response = await makeRequest('/clinicas', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
      }

      const data = await response.json();
      
      if (response.ok) {
        showSuccessToast(editingClinica ? 'Clínica atualizada com sucesso!' : 'Clínica cadastrada com sucesso!');
        setShowModal(false);
        setEditingClinica(null);
        setFormData({
          nome: '',
          endereco: '',
          bairro: '',
          cidade: '',
          estado: '',
          nicho: '',
          telefone: '',
          email: '',
          status: 'ativo'
        });
        setCidadeCustomizada(false);
        fetchClinicas();
      } else {
        showErrorToast('Erro ao salvar clínica: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao salvar clínica:', error);
      showErrorToast('Erro ao salvar clínica');
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
      endereco: clinica.endereco || '',
      bairro: clinica.bairro || '',
      cidade: cidadeClinica,
      estado: estadoClinica,
      nicho: clinica.nicho || '',
      telefone: clinica.telefone || '',
      email: clinica.email || '',
      status: clinica.status || 'ativo'
    });
    setCidadeCustomizada(cidadeEhCustomizada);
    setShowModal(true);
  };

  const handleView = (clinica) => {
    setViewingClinica(clinica);
    setViewModalOpen(true);
  };

  const closeViewModal = () => {
    setViewModalOpen(false);
    setViewingClinica(null);
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

  const resetForm = () => {
    setFormData({
      nome: '',
      endereco: '',
      bairro: '',
      cidade: '',
      estado: '',
      nicho: '',
      telefone: '',
      email: '',
      status: 'ativo'
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
    
    // Aplicar formatação na cidade
    if (name === 'cidade') {
      value = formatarCidade(value);
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

  const getStatusNovaClinicaInfo = (status) => {
    return statusNovaClinicaOptions.find(option => option.value === status) || statusNovaClinicaOptions[0];
  };

  const handleNovaClinicaInputChange = (e) => {
    let { name, value } = e.target;
    
    // Aplicar máscara de telefone se necessário
    if (name === 'telefone') {
      value = value
        .replace(/\D/g, '')
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .replace(/(-\d{4})\d+?$/, '$1');
    }
    
    // Aplicar formatação na cidade
    if (name === 'cidade') {
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
    const novaStatus = clinica.status === 'ativo' ? 'bloqueado' : 'ativo';
    const acao = novaStatus === 'ativo' ? 'desbloquear' : 'bloquear';
    
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
        showSuccessToast(`Clínica ${acao}da com sucesso!`);
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

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{isConsultor ? 'Visualizar Clínicas' : 'Gerenciar Clínicas'}</h1>
        <p className="page-subtitle">{isConsultor ? 'Visualize as clínicas parceiras' : 'Gerencie as clínicas parceiras'}</p>
      </div>

      {/* Navegação por abas */}
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
          Novas Clínicas
          {novasClinicas.length > 0 && (
            <span className="tab-badge">{novasClinicas.length}</span>
          )}
        </button>
        <button
          className={`tab ${activeTab === 'mapa' ? 'active' : ''}`}
          onClick={() => setActiveTab('mapa')}
        >
          Mapa
        </button>
      </div>

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
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Lista de Clínicas</h2>
            {!isConsultor && (
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

        {/* Seção de Filtros */}
        <div style={{ 
          padding: '1.5rem', 
          marginBottom: '1.5rem',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '1rem' 
          }}>
            <h3 style={{ 
              fontSize: '1.1rem', 
              fontWeight: '600', 
              color: '#1a1d23', 
              margin: 0
            }}>
              Filtros de Busca
            </h3>
            {(filtroEstado || filtroCity || filtroStatus) && (
              <button 
                onClick={() => {
                  setFiltroEstado('');
                  setFiltroCity('');
                  setFiltroStatus('');
                }}
                className="btn btn-secondary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
              >
                Limpar Filtros
              </button>
            )}
          </div>
          
          <div className="grid grid-3">
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
                <option value="ativo">Desbloqueadas</option>
                <option value="bloqueado">Bloqueadas</option>
              </select>
            </div>
          </div>

          {(filtroEstado || filtroCity || filtroStatus) && (
            <div style={{ 
              marginTop: '1rem', 
              padding: '0.75rem', 
              backgroundColor: '#f3f4f6', 
              borderRadius: '6px',
              color: '#4b5563',
              fontSize: '0.9rem'
            }}>
              Mostrando <strong>{clinicasFiltradas.length}</strong> de {clinicas.length} clínica(s)
            </div>
          )}
        </div>

        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
          </div>
        ) : clinicasFiltradas.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#6b7280', padding: '2rem' }}>
            {filtroEstado || filtroCity || filtroStatus
              ? 'Nenhuma clínica encontrada com os filtros aplicados.'
              : 'Nenhuma clínica cadastrada ainda.'
            }
          </p>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th style={{ display: isMobile ? 'none' : 'table-cell' }}>Endereço</th>
                  <th style={{ display: isMobile ? 'none' : 'table-cell' }}>Bairro</th>
                  <th style={{ display: isMobile ? 'none' : 'table-cell' }}>Cidade/Estado</th>
                  <th style={{ display: isMobile ? 'none' : 'table-cell' }}>Nicho</th>
                  <th style={{ display: isMobile ? 'none' : 'table-cell' }}>Contato</th>
                  <th style={{ display: isMobile ? 'none' : 'table-cell' }}>Proprietário</th>
                  <th style={{ display: isMobile ? 'none' : 'table-cell' }}>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {clinicasFiltradas.map(clinica => (
                  <tr key={clinica.id} className={clinica.status === 'bloqueado' ? 'clinica-bloqueada' : ''}>
                    <td>
                      <strong>{clinica.nome}</strong>
                    </td>
                    <td style={{ display: isMobile ? 'none' : 'table-cell' }}>{clinica.endereco || '-'}</td>
                    <td style={{ display: isMobile ? 'none' : 'table-cell' }}>{clinica.bairro || '-'}</td>
                    <td style={{ display: isMobile ? 'none' : 'table-cell' }}>
                      {clinica.cidade && clinica.estado ? (
                        <span>{clinica.cidade}/{clinica.estado}</span>
                      ) : '-'}
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
                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{clinica.email}</div>
                      )}
                      {!clinica.telefone && !clinica.email && '-'}
                    </td>
                    <td style={{ display: isMobile ? 'none' : 'table-cell' }}>
                      {clinica.consultor_id ? (
                        isAdmin ? (
                          <span className="badge" style={{ backgroundColor: '#3b82f6', color: 'white' }}>
                            Exclusiva
                          </span>
                        ) : (
                          <span className="badge" style={{ backgroundColor: '#3b82f6', color: 'white' }}>
                            Você
                          </span>
                        )
                      ) : (
                        <span className="badge" style={{ backgroundColor: '#10b981', color: 'white' }}>
                          Pública
                        </span>
                      )}
                    </td>
                    <td style={{ display: isMobile ? 'none' : 'table-cell' }}>
                      <span className={`badge ${clinica.status === 'ativo' ? 'badge-success' : 'badge-danger'}`}>
                        {clinica.status === 'ativo' ? 'Desbloqueada' : 'Bloqueada'}
                      </span>
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
                            onClick={() => handleEdit(clinica)}
                            className="btn-action"
                            title="Editar"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => toggleStatus(clinica)}
                            className="btn-action"
                            title={clinica.status === 'ativo' ? 'Bloquear clínica' : 'Desbloquear clínica'}
                            style={{ marginLeft: '0.5rem' }}
                          >
                            {clinica.status === 'ativo' ? (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <circle cx="12" cy="16" r="1"></circle>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                              </svg>
                            ) : (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <circle cx="12" cy="16" r="1"></circle>
                                <path d="M7 11V7a5 5 0 0 1 9.9 0"></path>
                              </svg>
                            )}
                          </button>
                          <button
                            onClick={() => handleView(clinica)}
                            className="btn-action"
                            title="Visualizar"
                            style={{ marginLeft: '0.5rem' }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </button>
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
      )}

      {/* Conteúdo da aba Novas Clínicas */}
      {activeTab === 'novas-clinicas' && (
        <div className="card">
          <div className="card-header">
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
                Cadastrar Nova Clínica
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
                    <th style={{ display: isMobile ? 'none' : 'table-cell' }}>Localização</th>
                    <th style={{ display: isMobile ? 'none' : 'table-cell' }}>Nicho</th>
                    <th style={{ display: isMobile ? 'none' : 'table-cell' }}>Telefone</th>
                    <th style={{ display: isMobile ? 'none' : 'table-cell' }}>Email</th>
                    <th style={{ display: isMobile ? 'none' : 'table-cell' }}>Proprietário</th>
                    <th style={{ display: isMobile ? 'none' : 'table-cell' }}>Status</th>
                    <th style={{ display: isMobile ? 'none' : 'table-cell' }}>Cadastrado</th>
                    <th style={{ width: '160px' }}>Ações</th>
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
                        <td style={{ display: isMobile ? 'none' : 'table-cell' }}>
                          <div style={{ fontSize: '0.875rem' }}>
                            {clinica.cidade && clinica.estado ? 
                              `${clinica.cidade}/${clinica.estado}` : 
                              clinica.cidade || clinica.estado || '-'}
                            {clinica.bairro && (
                              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{clinica.bairro}</div>
                            )}
                            {clinica.endereco && (
                              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{clinica.endereco}</div>
                            )}
                          </div>
                        </td>
                        <td style={{ display: isMobile ? 'none' : 'table-cell' }}>{clinica.nicho || '-'}</td>
                        <td style={{ display: isMobile ? 'none' : 'table-cell' }}>{formatarTelefone(clinica.telefone) || '-'}</td>
                        <td style={{ display: isMobile ? 'none' : 'table-cell' }}>
                          {clinica.email ? (
                            <span style={{ fontSize: '0.875rem' }}>{clinica.email}</span>
                          ) : '-'}
                        </td>
                        <td style={{ display: isMobile ? 'none' : 'table-cell' }}>
                          {clinica.criado_por_consultor_id ? (
                            <span className="badge" style={{ backgroundColor: '#3b82f6', color: 'white' }}>
                              Exclusiva
                            </span>
                          ) : (
                            <span className="badge" style={{ backgroundColor: '#10b981', color: 'white' }}>
                              Pública
                            </span>
                          )}
                        </td>
                        <td style={{ display: isMobile ? 'none' : 'table-cell' }}>
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
                        </td>
                        <td style={{ display: isMobile ? 'none' : 'table-cell' }}>{formatarData(clinica.created_at)}</td>
                        <td style={{
                              padding: '0.5rem',
                              display: 'flex',
                              gap: '0.5rem',
                              alignItems: 'center',
                              justifyContent: 'flex-start'
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
                            <button
                              onClick={() => aprovarClinica(clinica.id)}
                              className="btn btn-primary"
                              style={{ fontSize: '0.875rem', padding: '0.5rem 0.75rem', whiteSpace: 'nowrap' }}
                            >
                              Aprovar
                            </button>
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

              <div className="form-group">
                <label className="form-label">Endereço (Rua e Número)</label>
                <input
                  type="text"
                  name="endereco"
                  className="form-input"
                  value={formData.endereco}
                  onChange={handleInputChange}
                  placeholder="Ex: Rua das Flores, 123"
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
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    name="email"
                    className="form-input"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="contato@clinica.com"
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
                  <option value="ativo">Desbloqueada (padrão)</option>
                  <option value="bloqueado">Bloqueada</option>
                </select>
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
                  {editingClinica ? 'Atualizar Clínica' : 'Cadastrar Clínica'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

             {/* Modal de Visualização */}
       {viewModalOpen && viewingClinica && (
         <div className="modal-overlay">
           <div className="modal" style={{ maxWidth: '600px' }}>
             <div className="modal-header">
               <h2 className="modal-title">
                 Detalhes da Clínica
               </h2>
               <button 
                 className="close-btn"
                 onClick={closeViewModal}
               >
                 ×
               </button>
             </div>
 
             <div style={{ padding: '1.5rem' }}>
               <div style={{ display: 'grid', gap: '1rem' }}>
                 <div>
                   <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Nome da Clínica</label>
                   <p style={{ margin: '0.25rem 0 0 0', color: '#1f2937' }}>{viewingClinica.nome}</p>
                 </div>
                 
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
                     <p style={{ margin: '0.25rem 0 0 0', color: '#1f2937' }}>{viewingClinica.email}</p>
                   </div>
                 )}
                 
                 {viewingClinica.status && (
                   <div>
                     <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Status</label>
                     <p style={{ margin: '0.25rem 0 0 0', color: '#1f2937' }}>
                       <span className={`badge ${viewingClinica.status === 'ativo' ? 'badge-success' : 'badge-danger'}`}>
                         {viewingClinica.status === 'ativo' ? 'Desbloqueada' : 'Bloqueada'}
                       </span>
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
                    <p style={{ margin: '0.25rem 0 0 0', color: '#1f2937' }}>{viewingNovaClinica.email}</p>
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

      {/* Modal de Cadastro de Nova Clínica */}
      {showNovaClinicaModal && (
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
                    endereco: '',
                    bairro: '',
                    cidade: '',
                    estado: '',
                    nicho: '',
                    telefone: '',
                    email: '',
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

              <div className="form-group">
                <label className="form-label">Endereço (Rua e Número)</label>
                <input
                  type="text"
                  name="endereco"
                  className="form-input"
                  value={novaClinicaFormData.endereco}
                  onChange={handleNovaClinicaInputChange}
                  placeholder="Ex: Rua das Flores, 123"
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
                  <input
                    type="text"
                    name="nicho"
                    className="form-input"
                    value={novaClinicaFormData.nicho}
                    onChange={handleNovaClinicaInputChange}
                    placeholder="Ex: Odontologia, Estética"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Telefone</label>
                  <input
                    type="tel"
                    name="telefone"
                    className="form-input"
                    value={novaClinicaFormData.telefone}
                    onChange={handleNovaClinicaInputChange}
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">E-mail</label>
                <input
                  type="email"
                  name="email"
                  className="form-input"
                  value={novaClinicaFormData.email}
                  onChange={handleNovaClinicaInputChange}
                  placeholder="email@clinica.com.br"
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
                  onClick={() => {
                    setShowNovaClinicaModal(false);
                    setNovaClinicaFormData({ 
                      nome: '',
                      endereco: '',
                      bairro: '',
                      cidade: '',
                      estado: '',
                      nicho: '',
                      telefone: '',
                      email: '',
                      status: 'tem_interesse',
                      observacoes: ''
                    });
                    setCidadeCustomizadaNova(false);
                  }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="btn btn-primary"
                >
                  Cadastrar Clínica
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clinicas; 