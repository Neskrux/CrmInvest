import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import useBranding from '../hooks/common/useBranding';
import { useToast } from '../contexts';

const Consultores = () => {
  const { t, shouldShow } = useBranding();
  
  // Função para limitar caracteres e evitar sobreposição
  const limitarCaracteres = (texto, limite = 20) => {
    if (!texto) return '';
    if (texto.length <= limite) return texto;
    return texto.substring(0, limite) + '...';
  };
  const { makeRequest, isAdmin, user } = useAuth();
  const { showErrorToast, showSuccessToast } = useToast();
  const [consultores, setConsultores] = useState([]);
  const [consultoresFiltrados, setConsultoresFiltrados] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingConsultor, setEditingConsultor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSenhaModal, setShowSenhaModal] = useState(false);
  const [consultorSenha, setConsultorSenha] = useState(null);
  const [showPixModal, setShowPixModal] = useState(false);
  const [pixSelecionado, setPixSelecionado] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingConsultor, setViewingConsultor] = useState(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkConsultor, setLinkConsultor] = useState(null);
  // Estados para filtros
  const [filtros, setFiltros] = useState({
    busca: '',
    tipo: 'todos', // 'todos', 'freelancer', 'interno'
    statusSenha: 'todos', // 'todos', 'com_senha', 'sem_senha'
    statusPix: 'todos', // 'todos', 'com_pix', 'sem_pix'
    statusLink: 'todos' // 'todos', 'com_link', 'sem_link'
  });
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    email: '',
    senha: '',
    pix: '',
    cidade: '',
    estado: '',
    is_freelancer: true // Por padrão, freelancer
  });
  const [cidadeCustomizada, setCidadeCustomizada] = useState(false);
  const [errors, setErrors] = useState({});

  const fetchConsultores = useCallback(async () => {
    try {
      const response = await makeRequest('/consultores');
      const data = await response.json();
      
      if (response.ok) {
        setConsultores(data);
        setConsultoresFiltrados(data);
      } else {
        console.error('Erro ao carregar consultores:', data.error);
        showErrorToast('Erro ao carregar consultores: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao carregar consultores:', error);
      showErrorToast('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  }, [makeRequest]);

  useEffect(() => {
    fetchConsultores();
  }, [fetchConsultores]);

  // Função para aplicar filtros
  const aplicarFiltros = useCallback(() => {
    let filtrados = [...consultores];

    // Filtro por busca (nome)
    if (filtros.busca.trim()) {
      const busca = filtros.busca.toLowerCase();
      filtrados = filtrados.filter(consultor => 
        consultor.nome.toLowerCase().includes(busca)
      );
    }

    // Filtro por tipo
    if (filtros.tipo !== 'todos') {
      filtrados = filtrados.filter(consultor => {
        if (filtros.tipo === 'freelancer') {
          return consultor.is_freelancer !== false;
        } else if (filtros.tipo === 'interno') {
          return consultor.is_freelancer === false;
        }
        return true;
      });
    }

    // Filtro por status de senha
    if (filtros.statusSenha !== 'todos') {
      filtrados = filtrados.filter(consultor => {
        if (filtros.statusSenha === 'com_senha') {
          return consultor.senha && consultor.senha.trim() !== '';
        } else if (filtros.statusSenha === 'sem_senha') {
          return !consultor.senha || consultor.senha.trim() === '';
        }
        return true;
      });
    }

    // Filtro por status de PIX
    if (filtros.statusPix !== 'todos') {
      filtrados = filtrados.filter(consultor => {
        if (filtros.statusPix === 'com_pix') {
          return consultor.pix && consultor.pix.trim() !== '';
        } else if (filtros.statusPix === 'sem_pix') {
          return !consultor.pix || consultor.pix.trim() === '';
        }
        return true;
      });
    }

    // Filtro por status de link personalizado
    if (filtros.statusLink !== 'todos') {
      filtrados = filtrados.filter(consultor => {
        if (filtros.statusLink === 'com_link') {
          return consultor.codigo_referencia && consultor.codigo_referencia.trim() !== '';
        } else if (filtros.statusLink === 'sem_link') {
          return !consultor.codigo_referencia || consultor.codigo_referencia.trim() === '';
        }
        return true;
      });
    }

    setConsultoresFiltrados(filtrados);
  }, [consultores, filtros]);

  // Aplicar filtros quando os dados ou filtros mudarem
  useEffect(() => {
    aplicarFiltros();
  }, [aplicarFiltros]);

  // Função para atualizar filtros
  const atualizarFiltro = (campo, valor) => {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  // Função para limpar filtros
  const limparFiltros = () => {
    setFiltros({
      busca: '',
      tipo: 'todos',
      statusSenha: 'todos',
      statusPix: 'todos',
      statusLink: 'todos'
    });
  };

  // Detectar mudanças de tamanho da tela
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      let response;
      if (editingConsultor) {
        response = await makeRequest(`/consultores/${editingConsultor.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
      } else {
        response = await makeRequest('/consultores', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
      }

      const data = await response.json();
      
      if (response.ok) {
        showSuccessToast(editingConsultor ? `${t.consultor.toLowerCase()} atualizado com sucesso!` : `${t.consultor.toLowerCase()} cadastrado com sucesso!`);
        setShowModal(false);
        setEditingConsultor(null);
        setFormData({
          nome: '',
          telefone: '',
          email: '',
          senha: '',
          pix: '',
          cidade: '',
          estado: '',
          is_freelancer: true
        });
        setCidadeCustomizada(false);
        setErrors({});
        fetchConsultores();
      } else {
        showErrorToast('Erro ao salvar consultor: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao salvar consultor:', error);
      showErrorToast('Erro ao salvar consultor');
    }
  };

  const handleEdit = (consultor) => {
    setEditingConsultor(consultor);
    setFormData({
      nome: consultor.nome || '',
      telefone: consultor.telefone || '',
      email: consultor.email || '',
      senha: consultor.senha || '',
      pix: consultor.pix || '',
      cidade: consultor.cidade || '',
      estado: consultor.estado || '',
      is_freelancer: consultor.is_freelancer !== undefined ? consultor.is_freelancer : true
    });
    
    // Se tem estado e cidade, verifica se precisa ativar cidade customizada
    if (consultor.estado && consultor.cidade) {
      const cidadesDoEstado = cidadesPorEstado[consultor.estado];
      if (cidadesDoEstado && !cidadesDoEstado.includes(consultor.cidade)) {
        setCidadeCustomizada(true);
      } else {
        setCidadeCustomizada(false);
      }
    } else {
      setCidadeCustomizada(false);
    }
    
    setShowModal(true);
  };

  const handleView = (consultor) => {
    setViewingConsultor(consultor);
    setShowViewModal(true);
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    setViewingConsultor(null);
  };

  const handleInputChange = (e) => {
    let { name, value } = e.target;
    
    // Aplicar formatação específica baseada no campo
    if (name === 'nome') {
      value = formatarNome(value);
    } else if (name === 'telefone') {
      value = formatPhone(value);
    } else if (name === 'pix') {
      value = formatCPF(value);
    } else if (name === 'cidade') {
      value = formatarCidade(value);
    } else if (name === 'estado') {
      // Resetar cidade e cidadeCustomizada quando estado muda
      setFormData({
        ...formData,
        [name]: value,
        cidade: ''
      });
      setCidadeCustomizada(false);
      // Limpar erro quando o usuário começa a digitar
      if (errors[name]) {
        setErrors(prev => ({
          ...prev,
          [name]: ''
        }));
      }
      return; // Retorna aqui para não executar o setFormData novamente
    }
    
    setFormData({
      ...formData,
      [name]: value
    });

    // Limpar erro quando o usuário começa a digitar
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    }
    
    if (formData.telefone && !validatePhone(formData.telefone)) {
      newErrors.telefone = 'Telefone inválido';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'E-mail é obrigatório';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'E-mail inválido';
    }
    
    if (formData.pix && !validateCPF(formData.pix)) {
      newErrors.pix = 'PIX deve ser um CPF válido';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const formatarData = (data) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

  const formatarTelefone = (telefone) => {
    if (!telefone) return '';
    // Remove todos os caracteres não numéricos
    const numbers = telefone.replace(/\D/g, '');
    
    // Formata baseado no tamanho
    if (numbers.length === 11) {
      // Celular: (11) 99999-9999
      return `(${numbers.substring(0, 2)}) ${numbers.substring(2, 7)}-${numbers.substring(7)}`;
    } else if (numbers.length === 10) {
      // Fixo: (11) 9999-9999
      return `(${numbers.substring(0, 2)}) ${numbers.substring(2, 6)}-${numbers.substring(6)}`;
    } else if (numbers.length === 9 && numbers[0] === '9') {
      // Celular sem DDD: 99999-9999
      return `${numbers.substring(0, 5)}-${numbers.substring(5)}`;
    } else if (numbers.length === 8) {
      // Fixo sem DDD: 9999-9999
      return `${numbers.substring(0, 4)}-${numbers.substring(4)}`;
    }
    // Se não se encaixar em nenhum formato padrão, retorna como está
    return telefone;
  };

  const formatarEmail = (consultor) => {
    if (consultor.email) {
      return consultor.email;
    }
    // Gera email padronizado se não existir
    const nomeNormalizado = consultor.nome
      ?.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '');
    
    return `${nomeNormalizado}@investmoneysa.com.br`;
  };

  // Função para formatar nome (primeira letra maiúscula de cada palavra)
  const formatarNome = (value) => {
    if (!value) return '';
    
    // Remove números e caracteres especiais, mantém apenas letras, espaços e acentos
    let cleanValue = value.replace(/[^a-zA-ZÀ-ÿ\s]/g, '');
    
    // Remove espaços do início
    cleanValue = cleanValue.trimStart();
    
    // Remove espaços duplos ou múltiplos, deixando apenas um espaço entre palavras
    cleanValue = cleanValue.replace(/\s+/g, ' ');

    // Aplica formatação: primeira letra maiúscula de cada palavra
    const nomeFormatado = cleanValue
      .toLowerCase()
      .split(' ')
      .map(palavra => {
        if (!palavra) return '';
        return palavra.charAt(0).toUpperCase() + palavra.slice(1);
      })
      .join(' ');
    
    return nomeFormatado;
  };

  // Função para formatar telefone
  const formatPhone = (value) => {
    value = value.replace(/\D/g, '');
    value = value.replace(/(\d{2})(\d)/, '($1) $2');
    value = value.replace(/(\d{4})(\d)/, '$1-$2');
    value = value.replace(/(\d{4})-(\d)(\d{4})/, '$1$2-$3');
    return value;
  };

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

  const formatarCidade = (value) => {
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
  };

  // Função para formatar CPF
  const formatCPF = (value) => {
    value = value.replace(/\D/g, '');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    return value;
  };

  // Função para validar CPF
  const validateCPF = (cpf) => {
    cpf = cpf.replace(/[^\d]/g, '');
    if (cpf.length !== 11) return false;
    
    if (/^(\d)\1{10}$/.test(cpf)) return false;
    
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.charAt(9))) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.charAt(10))) return false;
    
    return true;
  };

  // Função para validar email
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Função para validar telefone
  const validatePhone = (phone) => {
    const phoneRegex = /^\(\d{2}\) \d{4,5}-\d{4}$/;
    return phoneRegex.test(phone);
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      telefone: '',
      email: '',
      senha: '',
      pix: '',
      cidade: '',
      estado: '',
      is_freelancer: true
    });
    setCidadeCustomizada(false);
    setErrors({});
    setEditingConsultor(null);
    setShowModal(false);
  };

  const visualizarSenha = async (consultor) => {
    try {
      const response = await makeRequest(`/consultores/${consultor.id}`);
      const data = await response.json();
      
      if (response.ok) {
        setConsultorSenha({
          ...consultor,
          temSenha: !!data.senha,
          hashSenha: data.senha
        });
        setShowSenhaModal(true);
      } else {
        showErrorToast('Erro ao carregar dados do consultor: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao carregar consultor:', error);
      showErrorToast('Erro ao conectar com o servidor');
    }
  };

  const copiarPix = async (pix) => {
    try {
      await navigator.clipboard.writeText(pix);
      showSuccessToast('PIX copiado para a área de transferência!');
    } catch (error) {
      // Fallback para navegadores mais antigos
      const textArea = document.createElement('textarea');
      textArea.value = pix;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showSuccessToast('PIX copiado para a área de transferência!');
    }
  };

  const mostrarPixCompleto = (pix) => {
    setPixSelecionado(pix);
    setShowPixModal(true);
  };

  const formatarPixExibicao = (pix) => {
    if (!pix) return '-';
    if (pix.length > 15) {
      return pix.substring(0, 15) + '...';
    }
    return pix;
  };

  const redefinirSenha = async (consultorId, novaSenha) => {
    try {
      const consultor = consultores.find(c => c.id === consultorId);
      const response = await makeRequest(`/consultores/${consultorId}`, {
        method: 'PUT',
        body: JSON.stringify({
          nome: consultor.nome,
          telefone: consultor.telefone,
          senha: novaSenha
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        showSuccessToast('Senha redefinida com sucesso!');
        setShowSenhaModal(false);
      } else {
        showErrorToast('Erro ao redefinir senha: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao redefinir senha:', error);
      showErrorToast('Erro ao redefinir senha');
    }
  };

  const gerarCodigoReferencia = async (consultorId) => {
    try {
      const response = await makeRequest(`/consultores/${consultorId}/gerar-codigo`, {
        method: 'POST'
      });

      const data = await response.json();
      
      if (response.ok) {
        showSuccessToast('Código de referência gerado com sucesso!');
        fetchConsultores(); // Recarregar lista para mostrar novo código
        
        // Mostrar modal com link gerado
        setLinkConsultor({
          ...consultores.find(c => c.id === consultorId),
          codigo_referencia: data.codigo_referencia,
          link_personalizado: data.link_personalizado
        });
        setShowLinkModal(true);
      } else {
        showErrorToast('Erro ao gerar código: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao gerar código:', error);
      showErrorToast('Erro ao gerar código de referência');
    }
  };

  const visualizarLinkPersonalizado = async (consultor) => {
    try {
      const response = await makeRequest(`/consultores/${consultor.id}/link-personalizado`);
      const data = await response.json();
      
      if (response.ok) {
        setLinkConsultor({
          ...consultor,
          ...data
        });
        setShowLinkModal(true);
      } else {
        showErrorToast('Erro ao obter link: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao obter link personalizado:', error);
      showErrorToast('Erro ao conectar com o servidor');
    }
  };

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

  const executarDiagnostico = async () => {
    try {
      const response = await makeRequest('/consultores/diagnostico');
      const data = await response.json();
      
      if (response.ok) {
        if (!data.estrutura_tabela.tem_coluna_codigo_referencia) {
          showErrorToast('Migração necessária! A coluna codigo_referencia não existe na tabela consultores.');
        } else if (data.consultores.sem_codigo > 0) {
          showSuccessToast(`✅ Estrutura OK. ${data.consultores.sem_codigo} consultores precisam de códigos de referência.`);
        } else {
          showSuccessToast('✅ Todos os consultores já possuem códigos de referência!');
        }
      } else {
        showErrorToast('Erro no diagnóstico: ' + data.error);
      }
    } catch (error) {
      console.error('Erro no diagnóstico:', error);
      showErrorToast('Erro ao executar diagnóstico');
    }
  };


  const limparCodigosInternos = async () => {
    if (!window.confirm('Tem certeza que deseja remover os códigos de referência dos consultores internos?')) {
      return;
    }

    try {
      const response = await makeRequest('/consultores/limpar-codigos-internos', {
        method: 'POST'
      });

      const data = await response.json();
      
      if (response.ok) {
        showSuccessToast(data.message);
        if (data.processados > 0) {
          fetchConsultores(); // Recarregar lista
        }
      } else {
        showErrorToast('Erro ao limpar códigos: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao limpar códigos internos:', error);
      showErrorToast('Erro ao conectar com o servidor');
    }
  };

  const gerarCodigosFaltantes = async () => {
    try {
      const response = await makeRequest('/consultores/gerar-codigos-faltantes', {
        method: 'POST'
      });

      const data = await response.json();
      
      if (response.ok) {
        showSuccessToast(data.message);
        if (data.processados > 0) {
          fetchConsultores(); // Recarregar lista
        }
      } else {
        showErrorToast('Erro ao gerar códigos: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao gerar códigos faltantes:', error);
      showErrorToast('Erro ao conectar com o servidor');
    }
  };

  const excluirConsultor = async (consultor) => {
    try {
      const response = await makeRequest(`/consultores/${consultor.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (response.ok) {
        showSuccessToast(data.message);
        fetchConsultores(); // Recarregar lista
      } else {
        // Se o erro indica que há pacientes associados
        if (data.pacientes_associados !== undefined) {
          mostrarModalOpcoesExclusao(consultor, data);
        } else {
          showErrorToast('Erro ao excluir consultor: ' + data.error);
        }
      }
    } catch (error) {
      console.error('Erro ao excluir consultor:', error);
      showErrorToast('Erro ao conectar com o servidor');
    }
  };

  const mostrarModalOpcoesExclusao = (consultor, dadosErro) => {
    const opcoes = `
Este consultor possui ${dadosErro.pacientes_associados} paciente(s) associado(s).

Escolha uma opção:
1. Transferir pacientes para outro consultor
2. Apenas desativar o consultor (não excluir)
3. Cancelar

Digite o número da opção desejada:`;

    const opcao = prompt(opcoes);
    
    if (opcao === '1') {
      // Transferir pacientes
      mostrarModalTransferencia(consultor);
    } else if (opcao === '2') {
      // Apenas desativar
      if (window.confirm(`Tem certeza que deseja desativar o consultor "${consultor.nome}"?\n\nO consultor será desativado mas não excluído.`)) {
        excluirConsultorComOpcoes(consultor, { apenas_desativar: true });
      }
    }
    // Se opcao === '3' ou qualquer outra coisa, cancela
  };

  const mostrarModalTransferencia = (consultor) => {
    // Criar modal simples para seleção de consultor
    const consultoresDisponiveis = consultores.filter(c => c.id !== consultor.id && c.ativo !== false);
    
    if (consultoresDisponiveis.length === 0) {
      showErrorToast('Não há outros consultores disponíveis para transferir os pacientes.');
      return;
    }

    let opcoesTexto = 'Selecione o consultor para transferir os pacientes:\n\n';
    consultoresDisponiveis.forEach((c, index) => {
      opcoesTexto += `${index + 1}. ${c.nome}\n`;
    });
    opcoesTexto += '\nDigite o número do consultor:';

    const selecao = prompt(opcoesTexto);
    const indice = parseInt(selecao) - 1;

    if (indice >= 0 && indice < consultoresDisponiveis.length) {
      const consultorDestino = consultoresDisponiveis[indice];
      if (window.confirm(`Transferir todos os pacientes de "${consultor.nome}" para "${consultorDestino.nome}" e excluir o consultor?`)) {
        excluirConsultorComOpcoes(consultor, { 
          transferir_para_consultor_id: consultorDestino.id 
        });
      }
    }
  };

  const excluirConsultorComOpcoes = async (consultor, opcoes) => {
    try {
      const response = await makeRequest(`/consultores/${consultor.id}`, {
        method: 'DELETE',
        body: JSON.stringify(opcoes)
      });

      const data = await response.json();
      
      if (response.ok) {
        showSuccessToast(data.message);
        fetchConsultores(); // Recarregar lista
      } else {
        showErrorToast('Erro ao processar exclusão: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao processar exclusão:', error);
      showErrorToast('Erro ao conectar com o servidor');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          {user?.tipo === 'parceiro' ? `Minha Equipe de ${t.consultores.toLowerCase()}` : `Gerenciar ${t.consultores.toLowerCase()}`}
        </h1>
        <p className="page-subtitle">
          {user?.tipo === 'parceiro' ? `Gerencie os ${t.consultores.toLowerCase()} da sua parceiro` : `Gerencie a equipe de ${t.consultores.toLowerCase()}`}
        </p>
      </div>

      {/* Resumo de Estatísticas */}
      {shouldShow('consultores', 'mostrarCardsEstatisticas') && (
        <div className="stats-grid" style={{ 
          marginBottom: '2rem',
          gridTemplateColumns: user?.tipo === 'parceiro' 
            ? 'repeat(3, 1fr)'  // Grid 3 colunas para parceiros
            : 'repeat(auto-fit, minmax(150px, 1fr))' // Grid responsivo para admin
        }}>
          <div className="stat-card">
            <div className="stat-label">Total</div>
            <div className="stat-value">{consultores.length}</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-label">
              {user?.tipo === 'parceiro' ? 'Freelancers' : 'Freelancers'}
            </div>
            <div className="stat-value">{consultores.filter(c => c.is_freelancer !== false).length}</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-label">
              {user?.tipo === 'parceiro' ? 'Funcionários' : 'Internos'}
            </div>
            <div className="stat-value">{consultores.filter(c => c.is_freelancer === false).length}</div>
          </div>
          
          {/* KPIs de link - apenas para admin */}
          {isAdmin && (
            <>
          <div className="stat-card">
            <div className="stat-label">Com Link</div>
            <div className="stat-value">{consultores.filter(c => c.codigo_referencia && c.codigo_referencia.trim() !== '').length}</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-label">Sem Link</div>
            <div className="stat-value">{consultores.filter(c => !c.codigo_referencia || c.codigo_referencia.trim() === '').length}</div>
          </div>
            </>
          )}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Equipe de {t.consultores.toLowerCase()}</h2>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {/* Botão de gerar links - apenas para admin */}
            {isAdmin && shouldShow('consultores', 'mostrarBotaoGerarLinks') && (
            <button 
              className="btn btn-secondary"
              onClick={gerarCodigosFaltantes}
              title="Gerar códigos de referência para consultores freelancers que não possuem"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              Gerar Links Freelancers
            </button>
            )}
            <button 
              className="btn btn-primary"
              onClick={() => setShowModal(true)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Novo {t.consultor.toLowerCase()}
            </button>
          </div>
        </div>

        {/* Seção de Filtros */}
        {shouldShow('consultores', 'mostrarFiltroCorretores') && (
        <div className="filters-section" style={{ 
          marginBottom: '1.5rem', 
          padding: '1rem', 
          backgroundColor: '#f8fafc', 
          borderRadius: '8px',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            {/* Campo de busca */}
            <div style={{ flex: '1', minWidth: '200px' }}>
              <input
                type="text"
                placeholder="Buscar por nome..."
                value={filtros.busca}
                onChange={(e) => atualizarFiltro('busca', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            {/* Filtro por tipo */}
            <div>
              <select
                value={filtros.tipo}
                onChange={(e) => atualizarFiltro('tipo', e.target.value)}
                style={{
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  backgroundColor: 'white'
                }}
              >
                <option value="todos">Todos os tipos</option>
                <option value="freelancer">Freelancer</option>
                <option value="interno">Interno</option>
              </select>
            </div>

            {/* Filtro por status de link */}
            <div>
              <select
                value={filtros.statusLink}
                onChange={(e) => atualizarFiltro('statusLink', e.target.value)}
                style={{
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  backgroundColor: 'white'
                }}
              >
                <option value="todos">Link personalizado</option>
                <option value="com_link">Com link</option>
                <option value="sem_link">Sem link</option>
              </select>
            </div>

            {/* Botão para limpar filtros */}
            <button
              onClick={limparFiltros}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.875rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
              </svg>
              Limpar
            </button>
          </div>

          {/* Contador de resultados */}
          <div style={{ 
            marginTop: '0.75rem', 
            fontSize: '0.875rem', 
            color: '#6b7280',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span>
              Mostrando {consultoresFiltrados.length} de {consultores.length} {t.consultores.toLowerCase()}
            </span>
            {(filtros.busca || filtros.tipo !== 'todos' || filtros.statusSenha !== 'todos' || 
              filtros.statusPix !== 'todos' || filtros.statusLink !== 'todos') && (
              <span style={{ 
                backgroundColor: '#3b82f6', 
                color: 'white', 
                padding: '0.25rem 0.5rem', 
                borderRadius: '4px',
                fontSize: '0.75rem'
              }}>
                Filtros ativos
              </span>
            )}
          </div>
        </div>
        )}

        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
          </div>
        ) : consultoresFiltrados.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#6b7280', padding: '2rem' }}>
            {consultores.length === 0 
              ? `Nenhum ${t.consultor.toLowerCase()} cadastrado ainda.`
              : `Nenhum ${t.consultor.toLowerCase()} encontrado com os filtros aplicados.`
            }
          </p>
        ) : (
          <div className="table-container">
            <table className="table consultores-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th style={{ display: isMobile ? 'none' : 'table-cell' }}>Tipo</th>
                  <th style={{ display: isMobile ? 'none' : 'table-cell' }}>Email de Acesso</th>
                  <th style={{ display: isMobile ? 'none' : 'table-cell' }}>Telefone</th>
                  <th style={{ display: isMobile ? 'none' : 'table-cell' }}>PIX</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {consultoresFiltrados.map(consultor => (
                  <tr key={consultor.id}>
                    <td>
                      <strong title={consultor.nome}>{limitarCaracteres(consultor.nome, 20)}</strong>
                    </td>
                    <td style={{ display: isMobile ? 'none' : 'table-cell' }}>
                      {consultor.empresa_id ? (
                        // Consultor de parceiro (mostra se é freelancer ou funcionário)
                        <span className={`status-badge ${consultor.is_freelancer !== false ? 'freelancer' : 'interno'}`}>
                          {consultor.is_freelancer !== false ? 'Freelancer' : 'Funcionário'}
                        </span>
                      ) : (
                        // Consultor sem parceiro (Invest Money)
                      <span className={`status-badge ${consultor.is_freelancer !== false ? 'freelancer' : 'interno'}`}>
                        {consultor.is_freelancer !== false ? 'Freelancer' : 'Interno'}
                      </span>
                      )}
                    </td>
                    <td className="text-wrap" style={{ display: isMobile ? 'none' : 'table-cell' }}>
                      <span className="email-cell">
                        {formatarEmail(consultor)}
                      </span>
                    </td>
                    <td style={{ display: isMobile ? 'none' : 'table-cell' }}>
                      {consultor.telefone ? formatarTelefone(consultor.telefone) : '-'}
                    </td>
                    <td style={{ display: isMobile ? 'none' : 'table-cell' }}>
                      {consultor.pix ? (
                        <div className="pix-container">
                          <span 
                            className="pix-text pix-tooltip"
                            data-pix={consultor.pix}
                            style={{ 
                              fontFamily: 'monospace', 
                              fontSize: '0.8rem',
                              color: '#1f2937'
                            }}
                          >
                            {formatarPixExibicao(consultor.pix)}
                          </span>
                            <button
                              onClick={() => copiarPix(consultor.pix)}
                              className="btn-action"
                              title="Copiar PIX"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                              </svg>
                            </button>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleView(consultor)}
                          className="btn-action"
                          title="Visualizar informações"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>
                        {(isAdmin || user?.tipo === 'parceiro') && (
                          <button
                            onClick={() => handleEdit(consultor)}
                            className="btn-action"
                            title="Editar"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                        )}
                        {shouldShow('consultores', 'mostrarBotaoLink') && (
                          <button
                            onClick={() => visualizarLinkPersonalizado(consultor)}
                            className="btn-action"
                            title="Link personalizado"
                            style={{ color: '#f59e0b' }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                            </svg>
                          </button>
                        )}
                        {(isAdmin || user?.tipo === 'parceiro') && (
                          <button
                            onClick={() => excluirConsultor(consultor)}
                            className="btn-action"
                            title="Excluir consultor"
                            style={{ color: '#ef4444' }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Visualização */}
      {showViewModal && viewingConsultor && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 className="modal-title">
                Detalhes do {t.consultores.toLowerCase()}
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
                  <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Nome</label>
                  <p style={{ margin: '0.25rem 0 0 0', color: '#1f2937' }}>{viewingConsultor.nome}</p>
                </div>
                
                {viewingConsultor.email && (
                  <div>
                    <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Email de Acesso</label>
                    <p style={{ margin: '0.25rem 0 0 0', color: '#1f2937' }}>{formatarEmail(viewingConsultor)}</p>
                  </div>
                )}
                
                {viewingConsultor.telefone && (
                  <div>
                    <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Telefone</label>
                    <p style={{ margin: '0.25rem 0 0 0', color: '#1f2937' }}>{formatarTelefone(viewingConsultor.telefone)}</p>
                  </div>
                )}
                
                {viewingConsultor.estado && (
                  <div>
                    <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Estado</label>
                    <p style={{ margin: '0.25rem 0 0 0', color: '#1f2937' }}>
                      {viewingConsultor.estado} - {estadosBrasileiros.find(e => e.sigla === viewingConsultor.estado)?.nome || viewingConsultor.estado}
                    </p>
                  </div>
                )}
                
                {viewingConsultor.cidade && (
                  <div>
                    <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Cidade</label>
                    <p style={{ margin: '0.25rem 0 0 0', color: '#1f2937' }}>{viewingConsultor.cidade}</p>
                  </div>
                )}
                
                {viewingConsultor.pix && (
                  <div>
                    <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>PIX</label>
                    <div style={{ margin: '0.25rem 0 0 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <p style={{ margin: '0', color: '#1f2937', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                        {formatarPixExibicao(viewingConsultor.pix)}
                      </p>
                      <button
                        onClick={() => mostrarPixCompleto(viewingConsultor.pix)}
                        className="btn-action"
                        title="Ver PIX completo"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      </button>
                      <button
                        onClick={() => copiarPix(viewingConsultor.pix)}
                        className="btn-action"
                        title="Copiar PIX"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Tipo de Vínculo - Para consultores de parceiro */}
                <div>
                  <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>
                    {viewingConsultor.empresa_id ? 'Tipo de Vínculo' : 'Tipo'}
                  </label>
                  <p style={{ margin: '0.25rem 0 0 0', color: '#1f2937' }}>
                    {viewingConsultor.empresa_id ? (
                      // Consultor de parceiro
                      <span className={`status-badge ${viewingConsultor.is_freelancer !== false ? 'freelancer' : 'interno'}`}>
                        {viewingConsultor.is_freelancer !== false ? 'Freelancer (terceirizado)' : 'Funcionário (fixo)'}
                      </span>
                    ) : (
                      // Consultor Invest Money
                      <span className={`status-badge ${viewingConsultor.is_freelancer !== false ? 'freelancer' : 'interno'}`}>
                        {viewingConsultor.is_freelancer !== false ? 'Freelancer' : 'Interno'}
                      </span>
                    )}
                  </p>
                </div>
                
                {viewingConsultor.created_at && (
                  <div>
                    <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Data de Cadastro</label>
                    <p style={{ margin: '0.25rem 0 0 0', color: '#6b7280', fontSize: '0.875rem' }}>{formatarData(viewingConsultor.created_at)}</p>
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

      {/* Modal de Cadastro/Edição */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">
                {editingConsultor ? `Editar ${t.consultor.toLowerCase()}` : `Novo ${t.consultor.toLowerCase()}`}
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
                <label className="form-label">Nome Completo *</label>
                <input
                  type="text"
                  name="nome"
                  className="form-input"
                  value={formData.nome}
                  onChange={handleInputChange}
                  placeholder={`Digite o nome do ${t.consultor.toLowerCase()}`}
                  required
                  autoComplete="off"
                  style={{
                    borderColor: errors.nome ? '#ef4444' : '#d1d5db'
                  }}
                />
                {errors.nome && (
                  <span style={{ color: '#ef4444', fontSize: '0.875rem' }}>
                    {errors.nome}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Telefone</label>
                <input
                  type="tel"
                  name="telefone"
                  className="form-input"
                  value={formData.telefone}
                  onChange={handleInputChange}
                  placeholder="(11) 99999-9999"
                  autoComplete="off"
                  maxLength="15"
                  style={{
                    borderColor: errors.telefone ? '#ef4444' : '#d1d5db'
                  }}
                />
                {errors.telefone && (
                  <span style={{ color: '#ef4444', fontSize: '0.875rem' }}>
                    {errors.telefone}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Email para Login *</label>
                <input
                  type="email"
                  name="email"
                  className="form-input"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="consultor@email.com"
                  required
                  autoComplete="off"
                  style={{
                    borderColor: errors.email ? '#ef4444' : '#d1d5db'
                  }}
                />
                <small style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                  Email que será usado para fazer login no sistema
                </small>
                {errors.email && (
                  <span style={{ color: '#ef4444', fontSize: '0.875rem' }}>
                    {errors.email}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Senha</label>
                <input
                  type="password"
                  name="senha"
                  className="form-input"
                  value={formData.senha}
                  onChange={handleInputChange}
                  placeholder="Digite a senha do consultor"
                  autoComplete="new-password"
                />
                <small style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                  Senha para acesso ao sistema
                </small>
              </div>

              <div className="form-group">
                <label className="form-label">Chave PIX</label>
                <input
                  type="text"
                  name="pix"
                  className="form-input"
                  value={formData.pix}
                  onChange={handleInputChange}
                  placeholder="000.000.000-00"
                  autoComplete="off"
                  maxLength="14"
                  style={{
                    borderColor: errors.pix ? '#ef4444' : '#d1d5db'
                  }}
                />
                <small style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                  Chave PIX para recebimento de comissões (formato CPF)
                </small>
                {errors.pix && (
                  <span style={{ color: '#ef4444', fontSize: '0.875rem' }}>
                    {errors.pix}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Estado</label>
                <select
                  name="estado"
                  className="form-input"
                  value={formData.estado}
                  onChange={handleInputChange}
                  autoComplete="off"
                  style={{
                    borderColor: errors.estado ? '#ef4444' : '#d1d5db'
                  }}
                >
                  <option value="">Selecione o estado</option>
                  {estadosBrasileiros.map(estado => (
                    <option key={estado.sigla} value={estado.sigla}>
                      {estado.sigla} - {estado.nome}
                    </option>
                  ))}
                </select>
                {errors.estado && (
                  <span style={{ color: '#ef4444', fontSize: '0.875rem' }}>
                    {errors.estado}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Cidade</label>
                {formData.estado && cidadesPorEstado[formData.estado] && !cidadeCustomizada ? (
                  <select
                    name="cidade"
                    className="form-input"
                    value={formData.cidade}
                    onChange={(e) => {
                      if (e.target.value === 'OUTRA') {
                        setCidadeCustomizada(true);
                        setFormData(prev => ({ ...prev, cidade: '' }));
                      } else {
                        handleInputChange(e);
                      }
                    }}
                    autoComplete="off"
                    style={{
                      borderColor: errors.cidade ? '#ef4444' : '#d1d5db'
                    }}
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
                      autoComplete="off"
                      style={{
                        borderColor: errors.cidade ? '#ef4444' : '#d1d5db',
                        flex: 1
                      }}
                    />
                    {formData.estado && cidadesPorEstado[formData.estado] && cidadeCustomizada && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ whiteSpace: 'nowrap', fontSize: '0.875rem', padding: '0.625rem 1rem' }}
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
                <small style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                  Cidade onde o {t.consultor.toLowerCase()} reside ou atua
                </small>
                {errors.cidade && (
                  <span style={{ color: '#ef4444', fontSize: '0.875rem' }}>
                    {errors.cidade}
                  </span>
                )}
              </div>

              {shouldShow('consultores', 'mostrarTipoCorretor') && (
                <div className="form-group">
                  <label className="form-label">
                    {user?.tipo === 'parceiro' ? 'Tipo de Vínculo' : `Tipo de ${t.consultor.toLowerCase()}`}
                  </label>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="is_freelancer"
                        value="true"
                        checked={formData.is_freelancer === true}
                        onChange={() => setFormData(prev => ({ ...prev, is_freelancer: true }))}
                      />
                      <span>{user?.tipo === 'parceiro' ? 'Freelancer (terceirizado)' : 'Freelancer (link personalizado)'}</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="is_freelancer"
                        value="false"
                        checked={formData.is_freelancer === false}
                        onChange={() => setFormData(prev => ({ ...prev, is_freelancer: false }))}
                      />
                      <span>{user?.tipo === 'parceiro' ? 'Funcionário (fixo)' : 'Interno (link geral)'}</span>
                    </label>
                  </div>
                  <small style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                    {user?.tipo === 'parceiro' 
                      ? 'Ambos os tipos veem as clínicas da parceiro. Diferença apenas para controle interno.'
                      : 'Freelancers veem apenas leads do seu código. Internos veem leads gerais.'}
                  </small>
                </div>
              )}

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
                  {editingConsultor ? `Atualizar ${t.consultor}` : `Cadastrar ${t.consultor}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Modal de Visualização/Alteração de Senha */}
      {showSenhaModal && consultorSenha && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">
                Gerenciar Senha - {consultorSenha.nome}
              </h2>
              <button 
                className="close-btn"
                onClick={() => setShowSenhaModal(false)}
              >
                ×
              </button>
            </div>

            <div style={{ padding: '1rem 0' }}>
              <div style={{ 
                padding: '1rem',
                borderRadius: '8px',
                backgroundColor: consultorSenha.temSenha ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${consultorSenha.temSenha ? '#86efac' : '#fecaca'}`,
                marginBottom: '1.5rem'
              }}>
                <div style={{ fontSize: '0.875rem', color: consultorSenha.temSenha ? '#166534' : '#dc2626' }}>
                  {consultorSenha.temSenha ? 'Senha configurada' : 'Sem senha definida'}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  {consultorSenha.temSenha 
                    ? 'Este consultor pode fazer login no sistema' 
                    : 'Este consultor não pode fazer login'
                  }
                </div>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                const novaSenha = e.target.novaSenha.value;
                if (novaSenha.length < 3) {
                  showErrorToast('A senha deve ter pelo menos 3 caracteres');
                  return;
                }
                if (window.confirm(`Tem certeza que deseja ${consultorSenha.temSenha ? 'alterar' : 'definir'} a senha?`)) {
                  redefinirSenha(consultorSenha.id, novaSenha);
                }
              }}>
                <div className="form-group">
                  <label className="form-label">Nova Senha</label>
                  <input
                    type="password"
                    name="novaSenha"
                    className="form-input"
                    placeholder="Digite a nova senha (mínimo 3 caracteres)"
                    required
                    minLength="3"
                  />
                  <small style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                    Use uma senha simples e fácil de lembrar
                  </small>
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                  <button 
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowSenhaModal(false)}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="btn btn-primary"
                  >
                    {consultorSenha.temSenha ? 'Alterar Senha' : 'Definir Senha'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Visualização do PIX */}
      {showPixModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 className="modal-title">PIX Completo</h2>
              <button 
                className="close-btn"
                onClick={() => setShowPixModal(false)}
              >
                ×
              </button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              <div style={{ 
                padding: '1rem',
                borderRadius: '8px',
                backgroundColor: '#f3f4f6',
                border: '1px solid #e5e7eb',
                marginBottom: '1.5rem'
              }}>
                <div style={{ 
                  fontFamily: 'monospace', 
                  fontSize: '1rem', 
                  color: '#1f2937',
                  wordBreak: 'break-all',
                  lineHeight: '1.5'
                }}>
                  {pixSelecionado}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button 
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowPixModal(false)}
                >
                  Fechar
                </button>
                <button 
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    copiarPix(pixSelecionado);
                    setShowPixModal(false);
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                  Copiar PIX
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Link Personalizado */}
      {showLinkModal && linkConsultor && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 className="modal-title">
                Link Personalizado - {linkConsultor.nome}
              </h2>
              <button 
                className="close-btn"
                onClick={() => setShowLinkModal(false)}
              >
                ×
              </button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              {linkConsultor.link_personalizado || linkConsultor.link_clinicas ? (
                <div>
                  <div style={{ 
                    padding: '1rem',
                    borderRadius: '8px',
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #86efac',
                    marginBottom: '1.5rem'
                  }}>
                    <div style={{ fontSize: '0.875rem', color: '#166534', fontWeight: '600' }}>
                      {linkConsultor.empresa_id ? 'Links de Indicação da Empresa' : 'Link Personalizado Ativo'}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                      {linkConsultor.empresa_id 
                        ? 'Use estes links para indicar clínicas em nome da parceiro'
                        : 'Use este link para divulgar e capturar leads com sua referência'}
                    </div>
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>
                      Código de Referência
                    </label>
                    <div style={{ 
                      padding: '0.75rem',
                      borderRadius: '8px',
                      backgroundColor: '#f3f4f6',
                      border: '1px solid #e5e7eb',
                      fontFamily: 'monospace',
                      fontSize: '1rem',
                      color: '#1f2937'
                    }}>
                      {linkConsultor.codigo_referencia}
                    </div>
                  </div>

                  {/* Link para Pacientes - Apenas para consultores SEM parceiro */}
                  {linkConsultor.link_personalizado && !linkConsultor.empresa_id && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>
                        Link para Pacientes
                    </label>
                    <div style={{ 
                      padding: '0.75rem',
                      borderRadius: '8px',
                        backgroundColor: '#ecfdf5',
                        border: '1px solid #86efac',
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                      color: '#1f2937',
                      wordBreak: 'break-all',
                      lineHeight: '1.5'
                    }}>
                      {linkConsultor.link_personalizado}
                    </div>
                      <button 
                        type="button"
                        className="btn btn-sm btn-secondary"
                        onClick={() => copiarLink(linkConsultor.link_personalizado)}
                        style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '0.25rem' }}>
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        Copiar Link de Pacientes
                      </button>
                  </div>
                  )}

                  {/* Link para Clínicas - Para TODOS os consultores com link */}
                  {linkConsultor.link_clinicas && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>
                        Link para Clínicas
                      </label>
                      <div style={{ 
                        padding: '0.75rem',
                        borderRadius: '8px',
                        backgroundColor: '#eff6ff',
                        border: '1px solid #93c5fd',
                        fontFamily: 'monospace',
                        fontSize: '0.875rem',
                        color: '#1f2937',
                        wordBreak: 'break-all',
                        lineHeight: '1.5'
                      }}>
                        {linkConsultor.link_clinicas}
                      </div>
                      <button 
                        type="button"
                        className="btn btn-sm btn-secondary"
                        onClick={() => copiarLink(linkConsultor.link_clinicas)}
                        style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '0.25rem' }}>
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        Copiar Link de Clínicas
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div style={{ 
                    padding: '1rem',
                    borderRadius: '8px',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    marginBottom: '1.5rem'
                  }}>
                    <div style={{ fontSize: '0.875rem', color: '#dc2626', fontWeight: '600' }}>
                      Link não gerado
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                      Este consultor ainda não possui um link personalizado
                    </div>
                  </div>

                  {isAdmin && (
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                      <button 
                        type="button"
                        className="btn btn-primary"
                        onClick={() => {
                          setShowLinkModal(false);
                          gerarCodigoReferencia(linkConsultor.id);
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                        </svg>
                        Gerar Link Personalizado
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button 
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowLinkModal(false)}
                >
                  Fechar
                </button>
                {linkConsultor.link_personalizado && (
                  <button 
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      copiarLink(linkConsultor.link_personalizado);
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    Copiar Link
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Consultores; 