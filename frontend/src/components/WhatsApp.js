import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useToast } from '../hooks/useToast';
import config from '../config';

const WhatsApp = () => {
  const [conversas, setConversas] = useState([]);
  const [conversaSelecionada, setConversaSelecionada] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [configuracao, setConfiguracao] = useState(null);
  const [automatizacoes, setAutomatizacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enviandoMensagem, setEnviandoMensagem] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState('conversas'); // conversas, configuracoes, automatizacoes
  const [whatsappStatus, setWhatsappStatus] = useState({ isConnected: false, status: 'not_initialized', qrCode: null });
  const [conectando, setConectando] = useState(false);
  const [showLinkPatientModal, setShowLinkPatientModal] = useState(false);
  const [pacientes, setPacientes] = useState([]);
  const [consultores, setConsultores] = useState([]);
  
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    cpf: '',
    cidade: '',
    estado: '',
    tipo_tratamento: '',
    observacoes: '',
    consultor_id: ''
  });
  const [salvandoPaciente, setSalvandoPaciente] = useState(false);
  const [mensagemReply, setMensagemReply] = useState(null); // Mensagem sendo respondida
  const [showDeleteModal, setShowDeleteModal] = useState(false); // Modal de confirmação de exclusão
  const [showAutomationModal, setShowAutomationModal] = useState(false); // Modal de nova automação
  const [automationForm, setAutomationForm] = useState({
    nome: '',
    descricao: '',
    trigger_tipo: 'mensagem_recebida',
    trigger_config: {
      palavras_chave: '',
      horario_inicio: '',
      horario_fim: '',
      dias_semana: [],
      mensagem_tipo: 'primeira_conversa' // primeira_conversa, primeira_dia, qualquer_mensagem
    },
    acao_config: {
      mensagem: ''
    },
    ativo: true
  });
  
  // Estados para mídia
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [enviandoMidia, setEnviandoMidia] = useState(false);
  const [showMediaPreview, setShowMediaPreview] = useState(false);
  const [mediaCaption, setMediaCaption] = useState('');
  const { success, error: showError, warning, info } = useToast();
  const mensagensListRef = useRef(null);

  // Função para scroll automático para o final das mensagens
  const scrollToBottom = () => {
    if (mensagensListRef.current) {
      mensagensListRef.current.scrollTop = mensagensListRef.current.scrollHeight;
    }
  };

  // Função para iniciar reply de uma mensagem
  const iniciarReply = (mensagem) => {
    setMensagemReply(mensagem);
  };

  // Função para cancelar reply
  const cancelarReply = () => {
    setMensagemReply(null);
  };


  // Buscar pacientes
  const buscarPacientes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${config.API_BASE_URL}/pacientes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPacientes(response.data);
    } catch (error) {
      console.error('Erro ao buscar pacientes:', error);
    }
  };

  // Buscar consultores
  const buscarConsultores = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${config.API_BASE_URL}/consultores`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConsultores(response.data);
    } catch (error) {
      console.error('Erro ao buscar consultores:', error);
    }
  };

  // Buscar conversas
  const buscarConversas = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${config.API_BASE_URL}/whatsapp/conversas`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConversas(response.data.conversas || []);
    } catch (error) {
      console.error('Erro ao buscar conversas:', error);
    }
  };

  // Buscar mensagens de uma conversa (todas as mensagens)
  const buscarMensagens = async (conversaId, shouldScroll = false) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${config.API_BASE_URL}/whatsapp/conversas/${conversaId}/mensagens`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Carregar todas as mensagens da conversa
      setMensagens(response.data.mensagens || []);
      
      // Se shouldScroll for true, faz scroll para baixo após carregar
      if (shouldScroll) {
        setTimeout(scrollToBottom, 100);
      }
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
      showError('Erro ao carregar mensagens');
    }
  };

  // Buscar configurações
  const buscarConfiguracao = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${config.API_BASE_URL}/whatsapp/configuracoes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConfiguracao(response.data);
    } catch (error) {
      console.error('Erro ao buscar configuração:', error);
    }
  };

  // Buscar automações
  const buscarAutomatizacoes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${config.API_BASE_URL}/whatsapp/automatizacoes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAutomatizacoes(response.data || []);
    } catch (error) {
      console.error('Erro ao buscar automações:', error);
    }
  };

  // Conectar WhatsApp
  const conectarWhatsApp = async () => {
    setConectando(true);
    try {
      info('Executando limpeza completa das sessões...');
      
      const token = localStorage.getItem('token');
      const response = await axios.post(`${config.API_BASE_URL}/whatsapp/connect`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setWhatsappStatus(response.data);
      success('WhatsApp inicializado com limpeza completa! Aguarde o QR Code...');
      
      // Verificar status periodicamente
      verificarStatusWhatsApp();
    } catch (error) {
      console.error('Erro ao conectar WhatsApp:', error);
      showError('Erro ao conectar WhatsApp');
    } finally {
      setConectando(false);
    }
  };

  // Verificar status do WhatsApp
  const verificarStatusWhatsApp = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${config.API_BASE_URL}/whatsapp/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setWhatsappStatus(response.data);
      
      // Se ainda não conectou, verificar novamente em 2 segundos
      if (response.data.status === 'qr_ready' || response.data.status === 'connecting') {
        setTimeout(verificarStatusWhatsApp, 2000);
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
    }
  };

  // Desconectar WhatsApp
  const desconectarWhatsApp = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${config.API_BASE_URL}/whatsapp/disconnect`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setWhatsappStatus({ isConnected: false, status: 'disconnected', qrCode: null });
      success('WhatsApp desconectado');
    } catch (error) {
      console.error('Erro ao desconectar WhatsApp:', error);
      showError('Erro ao desconectar WhatsApp');
    }
  };

  // Enviar mensagem
  const enviarMensagem = async () => {
    if (!novaMensagem.trim() || !conversaSelecionada) return;

    setEnviandoMensagem(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        numero: conversaSelecionada.numero_contato,
        mensagem: novaMensagem.trim()
      };

      // Se há uma mensagem sendo respondida, incluir os dados do reply
      if (mensagemReply) {
        payload.replyMessageId = mensagemReply.id;
        payload.replyContent = mensagemReply.conteudo;
        payload.replyAuthor = mensagemReply.direcao === 'inbound' ? conversaSelecionada.nome_contato || 'Contato' : 'Você';
      }

      await axios.post(`${config.API_BASE_URL}/whatsapp/enviar-mensagem`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

        setNovaMensagem('');
        setMensagemReply(null); // Limpar reply após enviar
        buscarMensagens(conversaSelecionada.id, true); // Recarregar mensagens
        buscarConversas(); // Atualizar lista de conversas
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      showError('Erro ao enviar mensagem');
    } finally {
      setEnviandoMensagem(false);
    }
  };

  // Selecionar conversa
  const selecionarConversa = (conversa) => {
    // Limpar mensagens da conversa anterior
    setMensagens([]);
    setConversaSelecionada(conversa);
    // Carregar todas as mensagens da nova conversa
    buscarMensagens(conversa.id, true); // true = fazer scroll para baixo
  };

  // Abrir modal de confirmação de exclusão
  const abrirModalExcluir = () => {
    if (!conversaSelecionada) return;
    setShowDeleteModal(true);
  };

  // Fechar modal de confirmação de exclusão
  const fecharModalExcluir = () => {
    setShowDeleteModal(false);
  };

  // Excluir conversa (após confirmação no modal)
  const confirmarExclusaoConversa = async () => {
    if (!conversaSelecionada) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${config.API_BASE_URL}/whatsapp/conversas/${conversaSelecionada.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      success('Conversa excluída com sucesso!');
      setConversaSelecionada(null);
      setMensagens([]);
      setShowDeleteModal(false);
      buscarConversas(); // Atualizar lista de conversas
    } catch (error) {
      console.error('Erro ao excluir conversa:', error);
      showError('Erro ao excluir conversa');
      setShowDeleteModal(false);
    }
  };

  // Abrir modal de nova automação
  const abrirModalAutomacao = () => {
    setShowAutomationModal(true);
  };

  // Fechar modal de nova automação
  const fecharModalAutomacao = () => {
    setShowAutomationModal(false);
    setAutomationForm({
      nome: '',
      descricao: '',
      trigger_tipo: 'mensagem_recebida',
      trigger_config: {
        palavras_chave: '',
        horario_inicio: '',
        horario_fim: '',
        dias_semana: [],
        mensagem_tipo: 'primeira_conversa'
      },
      acao_config: {
        mensagem: ''
      },
      ativo: true
    });
  };

  // Lidar com mudanças no formulário de automação
  const handleAutomationChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAutomationForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Lidar com mudanças nas configurações de trigger
  const handleTriggerConfigChange = (field, value) => {
    setAutomationForm(prev => ({
      ...prev,
      trigger_config: {
        ...prev.trigger_config,
        [field]: value
      }
    }));
  };

  // Lidar com mudanças nas configurações de ação
  const handleActionConfigChange = (field, value) => {
    setAutomationForm(prev => ({
      ...prev,
      acao_config: {
        ...prev.acao_config,
        [field]: value
      }
    }));
  };

  // Lidar com seleção de dias da semana
  const handleDiasSemanaChange = (dia, checked) => {
    setAutomationForm(prev => ({
      ...prev,
      trigger_config: {
        ...prev.trigger_config,
        dias_semana: checked 
          ? [...prev.trigger_config.dias_semana, dia]
          : prev.trigger_config.dias_semana.filter(d => d !== dia)
      }
    }));
  };

  // Salvar nova automação
  const salvarAutomacao = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      
      // Sempre definir como enviar mensagem
      const formData = {
        ...automationForm,
        acao_tipo: 'enviar_mensagem'
      };
      
      await axios.post(`${config.API_BASE_URL}/whatsapp/automatizacoes`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      success('Automação criada com sucesso!');
      fecharModalAutomacao();
      buscarAutomatizacoes(); // Atualizar lista de automações
    } catch (error) {
      console.error('Erro ao criar automação:', error);
      showError('Erro ao criar automação');
    }
  };

  // Formatar data
  const formatarData = (data) => {
    return new Date(data).toLocaleString('pt-BR');
  };

  // Formatar telefone
  const formatarTelefone = (telefone) => {
    if (!telefone) return '';
    let numbers = telefone.replace(/\D/g, '');
    
    
    // Remover código do país (55) se presente
    if ((numbers.length === 13 || numbers.length === 12) && numbers.startsWith('55')) {
      numbers = numbers.substring(2); // Remove os primeiros 2 dígitos (55)
    }
    
    // Formatar para padrão brasileiro (11 dígitos) - celular
    if (numbers.length === 11) {
      const formatted = `(${numbers.substring(0, 2)}) ${numbers.substring(2, 7)}-${numbers.substring(7)}`;
      return formatted;
    }
    
    // Formatar para 10 dígitos - pode ser celular antigo ou fixo
    if (numbers.length === 10) {
      // Se o terceiro dígito for 9, é celular antigo - adicionar 9 no início
      if (numbers.charAt(2) === '9') {
        const noveDigito = numbers.substring(0, 2) + '9' + numbers.substring(2);
        const formatted = `(${noveDigito.substring(0, 2)}) ${noveDigito.substring(2, 7)}-${noveDigito.substring(7)}`;
        return formatted;
      } else {
        // Telefone fixo normal
        const formatted = `(${numbers.substring(0, 2)}) ${numbers.substring(2, 6)}-${numbers.substring(6)}`;
        return formatted;
      }
    }
    
    return telefone;
  };

  // Função para formatar telefone (máscara)
  const maskTelefone = (value) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  // Função para formatar CPF (máscara)
  const maskCPF = (value) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  // Função para formatar nome (sem números)
  const formatarNome = (value) => {
    if (!value) return '';
    
    // Remove números e caracteres especiais, mantém apenas letras, espaços e acentos
    let cleanValue = value.replace(/[^a-zA-ZÀ-ÿ\s]/g, '');
    
    // Remove espaços do início
    cleanValue = cleanValue.trimStart();
    
    // Remove espaços duplos ou múltiplos, deixando apenas um espaço entre palavras
    cleanValue = cleanValue.replace(/\s+/g, ' ');

    // Primeira letra maiúscula no nome
    const nomeFormatado = cleanValue.charAt(0).toUpperCase() + cleanValue.slice(1).toLowerCase();
    
    return nomeFormatado;
  };

  // Função para formatar cidade - padronização completa
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

  // Abrir modal de vincular lead
  const abrirModalVincularLead = () => {
    if (conversaSelecionada) {
      // Preencher dados da conversa no formulário com formatação correta
      const telefoneFormatado = formatarTelefone(conversaSelecionada.numero_contato || '');
      
      setFormData({
        nome: conversaSelecionada.nome_contato || '',
        telefone: telefoneFormatado,
        cpf: '',
        cidade: '',
        estado: '',
        tipo_tratamento: '',
        observacoes: '',
        consultor_id: ''
      });
    }
    setShowLinkPatientModal(true);
  };

  // Fechar modal de vincular lead
  const fecharModalVincularLead = () => {
    setShowLinkPatientModal(false);
    setFormData({
      nome: '',
      telefone: '',
      cpf: '',
      cidade: '',
      estado: '',
      tipo_tratamento: '',
      observacoes: '',
      consultor_id: ''
    });
  };

  // Salvar paciente e vincular à conversa
  const salvarPacienteEVincular = async (e) => {
    e.preventDefault();
    
    if (!formData.nome.trim()) {
      showError('Nome é obrigatório');
      return;
    }

    setSalvandoPaciente(true);
    
    // Preparar dados com telefone limpo (apenas números)
    const dadosParaEnviar = {
      ...formData,
      telefone: formData.telefone.replace(/\D/g, '') // Remove formatação para enviar apenas números
    };
    
    try {
      const token = localStorage.getItem('token');
      
      // Criar paciente
      const response = await axios.post(`${config.API_BASE_URL}/pacientes`, dadosParaEnviar, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const paciente = response.data;

      // Vincular lead à conversa
      await axios.put(`${config.API_BASE_URL}/whatsapp/conversas/${conversaSelecionada.id}`, {
        paciente_id: paciente.id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Determinar mensagem baseada no consultor
      const mensagem = formData.consultor_id ? 
        'Paciente criado e vinculado com sucesso!' : 
        'Lead criado e vinculado com sucesso!';
      success(mensagem);
      fecharModalVincularLead();
      buscarConversas(); // Atualizar lista de conversas
    } catch (error) {
      console.error('Erro ao salvar paciente:', error);
      console.error('Dados enviados:', dadosParaEnviar);
      console.error('Resposta do servidor:', error.response?.data);
      
      // Mostrar erro específico se disponível
      const errorMessage = error.response?.data?.error || 'Erro ao salvar paciente';
      showError(errorMessage);
    } finally {
      setSalvandoPaciente(false);
    }
  };

  // Manipular mudanças no formulário
  const handleInputChange = (e) => {
    let { name, value } = e.target;
    
    if (name === 'telefone') value = maskTelefone(value);
    if (name === 'cpf') value = maskCPF(value);
    if (name === 'nome') value = formatarNome(value);
    if (name === 'cidade') value = formatarCidade(value);
    
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // ===== FUNÇÕES DE MÍDIA =====

  // Validar arquivo no frontend
  const validateFileFrontend = (file) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif',
      'video/mp4', 'video/avi',
      'audio/mpeg', 'audio/wav', 'audio/ogg',
      'application/pdf'
    ];

    const maxSizes = {
      'image/jpeg': 10 * 1024 * 1024, // 10MB
      'image/png': 10 * 1024 * 1024,  // 10MB
      'image/gif': 5 * 1024 * 1024,   // 5MB
      'video/mp4': 50 * 1024 * 1024,  // 50MB
      'video/avi': 50 * 1024 * 1024,  // 50MB
      'audio/mpeg': 20 * 1024 * 1024, // 20MB
      'audio/wav': 20 * 1024 * 1024,  // 20MB
      'audio/ogg': 20 * 1024 * 1024,  // 20MB
      'application/pdf': 10 * 1024 * 1024 // 10MB
    };

    if (!allowedTypes.includes(file.type)) {
      return { isValid: false, error: 'Tipo de arquivo não permitido' };
    }

    const maxSize = maxSizes[file.type];
    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / 1024 / 1024);
      return { isValid: false, error: `Arquivo muito grande. Máximo permitido: ${maxSizeMB}MB` };
    }

    return { isValid: true };
  };

  // Selecionar arquivo
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validar arquivo
    const validation = validateFileFrontend(file);
    if (!validation.isValid) {
      showError(validation.error);
      return;
    }

    setSelectedFile(file);
    setMediaCaption('');

    // Criar preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setFilePreview(e.target.result);
      setShowMediaPreview(true);
    };
    reader.readAsDataURL(file);
  };

  // Cancelar envio de mídia
  const cancelarMidia = () => {
    setSelectedFile(null);
    setFilePreview(null);
    setShowMediaPreview(false);
    setMediaCaption('');
  };

  // Enviar mídia
  const enviarMidia = async () => {
    if (!selectedFile || !conversaSelecionada) return;

    setEnviandoMidia(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      
      formData.append('file', selectedFile);
      formData.append('numero', conversaSelecionada.numero_contato);
      formData.append('caption', mediaCaption.trim());

      // Se há uma mensagem sendo respondida, incluir os dados do reply
      if (mensagemReply) {
        formData.append('replyMessageId', mensagemReply.id);
      }

      await axios.post(`${config.API_BASE_URL}/whatsapp/enviar-midia`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      success('Mídia enviada com sucesso!');
      cancelarMidia();
      setMensagemReply(null); // Limpar reply após enviar
      buscarMensagens(conversaSelecionada.id, true); // Recarregar mensagens
      buscarConversas(); // Atualizar lista de conversas
    } catch (error) {
      console.error('Erro ao enviar mídia:', error);
      showError('Erro ao enviar mídia');
    } finally {
      setEnviandoMidia(false);
    }
  };

  // Abrir seletor de arquivos
  const abrirSeletorArquivos = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*,audio/*,.pdf';
    input.onchange = handleFileSelect;
    input.click();
  };


  // Carregar dados iniciais
  useEffect(() => {
    const carregarDados = async () => {
      setLoading(true);
      await Promise.all([
        buscarConversas(),
        buscarConfiguracao(),
        buscarAutomatizacoes(),
        buscarPacientes(),
        buscarConsultores(),
        verificarStatusWhatsApp()
      ]);
      setLoading(false);
    };

    carregarDados();
  }, []);

  // Removido useEffect de scroll automático - agora controlado manualmente

  // Atualização automática das mensagens da conversa selecionada
  useEffect(() => {
    let interval;
    
    if (conversaSelecionada && conversaSelecionada.id) {
      // Atualizar mensagens a cada 1 segundo
      interval = setInterval(() => {
        buscarMensagens(conversaSelecionada.id);
      }, 1000);
    }

    // Cleanup do intervalo quando a conversa mudar ou componente desmontar
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [conversaSelecionada?.id]);

  // Atualização automática da lista de conversas
  useEffect(() => {
    const interval = setInterval(() => {
      buscarConversas();
    }, 1000); // Atualizar lista de conversas a cada 1 segundo

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="whatsapp-container">
      <div className="page-header">
        <h1>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px', verticalAlign: 'middle' }}>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          Investmoney Conversas
        </h1>
        <p>Gerencie suas conversas e mensagens automáticas</p>
      </div>

      {/* Navegação por abas */}
      <div className="tabs-container">
        <button
          className={`tab-button ${abaAtiva === 'conversas' ? 'active' : ''}`}
          onClick={() => setAbaAtiva('conversas')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          Conversas
        </button>
        <button
          className={`tab-button ${abaAtiva === 'configuracoes' ? 'active' : ''}`}
          onClick={() => setAbaAtiva('configuracoes')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          Configurações
        </button>
        <button
          className={`tab-button ${abaAtiva === 'automatizacoes' ? 'active' : ''}`}
          onClick={() => setAbaAtiva('automatizacoes')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="9" cy="9" r="2"/>
            <path d="M21 15.5c-.6 0-1.2-.2-1.7-.7l-3.5-3.5c-.3-.3-.8-.3-1.1 0s-.3.8 0 1.1l3.5 3.5c.5.5.7 1.1.7 1.7s-.2 1.2-.7 1.7"/>
          </svg>
          Automações
        </button>
      </div>

      {/* Aba de Conversas */}
      {abaAtiva === 'conversas' && (
        <>
          {/* Mensagem de desconexão */}
          {!whatsappStatus.isConnected && (
            <div className="disconnection-banner">
              <div className="disconnection-content">
                <div className="disconnection-text">
                  <h4>WhatsApp Web Desconectado</h4>
                  <p>Para usar as conversas, você precisa conectar o WhatsApp Web primeiro na aba de configurações.</p>
                </div>
              </div>
            </div>
          )}

          <div className="conversas-layout">
          {/* Lista de conversas */}
          <div className="conversas-sidebar">
            <div className="conversas-header">
              <h3>Conversas ({conversas.length})</h3>
              <button 
                className="btn btn-primary btn-sm"
                onClick={buscarConversas}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                  <polyline points="23 4 23 10 17 10"/>
                  <polyline points="1 20 1 14 7 14"/>
                  <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"/>
                </svg>
                Atualizar
              </button>
            </div>
            
            <div className="conversas-list">
              {conversas.map((conversa) => (
                <div
                  key={conversa.id}
                  className={`conversa-item ${conversaSelecionada?.id === conversa.id ? 'active' : ''}`}
                  onClick={() => selecionarConversa(conversa)}
                >
                  <div className="conversa-avatar">
                    {conversa.nome_contato ? conversa.nome_contato[0].toUpperCase() : '?'}
                  </div>
                  <div className="conversa-info">
                    <div className="conversa-nome">
                      {conversa.nome_contato || formatarTelefone(conversa.numero_contato)}
                    </div>
                    <div className="conversa-telefone">
                      {formatarTelefone(conversa.numero_contato)}
                    </div>
                    {conversa.ultima_mensagem_at && (
                      <div className="conversa-tempo">
                        {formatarData(conversa.ultima_mensagem_at)}
                      </div>
                    )}
                  </div>
                  {conversa.pacientes && (
                    <div className="conversa-paciente">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px', verticalAlign: 'middle' }}>
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                      {conversa.pacientes.nome}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Área de mensagens */}
          <div className="mensagens-area">
            {conversaSelecionada ? (
              <>
                <div className="mensagens-header">
                  <div className="contato-info">
                    <h3>{conversaSelecionada.nome_contato || formatarTelefone(conversaSelecionada.numero_contato)}</h3>
                    <p>{formatarTelefone(conversaSelecionada.numero_contato)}</p>
                    {mensagens.length > 0 && (
                      <div className="conversa-stats">
                        <small>{mensagens.length} mensagens</small>
                      </div>
                    )}
                  </div>
                  <div className="contato-actions">
                    {conversaSelecionada.pacientes ? (
                      <span className="badge badge-success">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                          <circle cx="12" cy="7" r="4"/>
                        </svg>
                        Vinculado: {conversaSelecionada.pacientes.nome}
                      </span>
                    ) : (
                      <button className="btn btn-outline btn-sm" onClick={abrirModalVincularLead}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                        </svg>
                        Vincular Lead
                      </button>
                    )}
                    <button 
                      className="btn btn-outline btn-sm" 
                      onClick={abrirModalExcluir}
                      style={{ marginLeft: '0.5rem', color: '#dc2626', borderColor: '#dc2626' }}
                      title="Excluir conversa"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        <line x1="10" y1="11" x2="10" y2="17"/>
                        <line x1="14" y1="11" x2="14" y2="17"/>
                      </svg>
                      Excluir
                    </button>
                  </div>
                </div>

                <div className="mensagens-container" ref={mensagensListRef}>
                  {mensagens.map((mensagem) => {
                    return (
                    <div
                      key={mensagem.id}
                      className={`mensagem ${mensagem.direcao === 'outbound' ? 'outbound' : 'inbound'}`}
                    >
                      {/* Exibir mensagem sendo respondida */}
                      {mensagem.mensagem_pai_conteudo && (
                        <div className="mensagem-reply">
                          <div className="reply-indicator"></div>
                          <div className="reply-content">
                            <div className="reply-author">{mensagem.mensagem_pai_autor}</div>
                            <div className="reply-text">{mensagem.mensagem_pai_conteudo}</div>
                          </div>
                        </div>
                      )}
                      <div className="mensagem-conteudo">
                        {/* Renderizar mídia baseada no tipo */}
                        {mensagem.midia_url ? (
                          <>
                            {/* Imagem */}
                            {mensagem.tipo === 'image' && (
                              <div className="image-message">
                                <img 
                                  src={`${config.MEDIA_BASE_URL}${mensagem.midia_url}`} 
                                  alt="Imagem" 
                                  className="message-image"
                                  onClick={() => window.open(`${config.MEDIA_BASE_URL}${mensagem.midia_url}`, '_blank')}
                                />
                                {mensagem.conteudo && mensagem.conteudo !== `Mídia: ${mensagem.tipo}` && (
                                  <div className="image-caption">{mensagem.conteudo}</div>
                                )}
                              </div>
                            )}
                            
                            {/* Vídeo */}
                            {mensagem.tipo === 'video' && (
                              <div className="video-message">
                                <video controls className="message-video">
                                  <source src={`${config.MEDIA_BASE_URL}${mensagem.midia_url}`} type={mensagem.midia_tipo || 'video/mp4'} />
                                  Seu navegador não suporta vídeo.
                                </video>
                                {mensagem.conteudo && mensagem.conteudo !== `Mídia: ${mensagem.tipo}` && (
                                  <div className="video-caption">{mensagem.conteudo}</div>
                                )}
                              </div>
                            )}
                            
                            {/* Áudio */}
                            {(mensagem.tipo === 'audio' || mensagem.tipo === 'voice' || mensagem.tipo === 'ptt') && (
                              <div className="audio-message">
                                <div className="audio-info">
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
                                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
                                  </svg>
                                  Áudio
                                </div>
                                <audio controls className="audio-player">
                                  <source src={`${config.MEDIA_BASE_URL}${mensagem.midia_url}`} type={mensagem.midia_tipo || 'audio/ogg'} />
                                  Seu navegador não suporta áudio.
                                </audio>
                              </div>
                            )}
                            
                            {/* Documento */}
                            {mensagem.tipo === 'document' && (
                              <div className="document-message">
                                <div className="document-info">
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                    <polyline points="14,2 14,8 20,8"/>
                                    <line x1="16" y1="13" x2="8" y2="13"/>
                                    <line x1="16" y1="17" x2="8" y2="17"/>
                                    <polyline points="10,9 9,9 8,9"/>
                                  </svg>
                                  <div className="document-details">
                                    <div className="document-name">{mensagem.midia_nome || 'Documento'}</div>
                                  </div>
                                </div>
                                <a 
                                  href={`${config.MEDIA_BASE_URL}${mensagem.midia_url}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="btn btn-outline btn-sm"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                                    <polyline points="15,3 21,3 21,9"/>
                                    <line x1="10" y1="14" x2="21" y2="3"/>
                                  </svg>
                                  Abrir
                                </a>
                              </div>
                            )}
                          </>
                        ) : (
                          // Conteúdo de texto normal
                          mensagem.conteudo
                        )}
                      </div>
                      <div className="mensagem-meta">
                        <span className="mensagem-tempo">
                          {formatarData(mensagem.timestamp_whatsapp)}
                        </span>
                        <button 
                          className="reply-button"
                          onClick={() => iniciarReply(mensagem)}
                          title="Responder mensagem"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="9 17 4 12 9 7"/>
                            <path d="M20 18v-2a4 4 0 0 0-4-4H4"/>
                          </svg>
                        </button>
                        <span className={`mensagem-status status-${mensagem.status}`}>
                          {mensagem.status === 'enviada' && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          )}
                          {mensagem.status === 'entregue' && (
                            <div style={{ display: 'flex', gap: '2px' }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                            </div>
                          )}
                          {mensagem.status === 'lida' && (
                            <div style={{ display: 'flex', gap: '2px' }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                            </div>
                          )}
                          {mensagem.status === 'recebida' && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          )}
                        </span>
                      </div>
                    </div>
                    );
                  })}
                </div>

                <div className="mensagem-input">
                  {/* Visualização da mensagem sendo respondida */}
                  {mensagemReply && (
                    <div className="reply-preview">
                      <div className="reply-preview-content">
                        <div className="reply-preview-header">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                            <polyline points="9 17 4 12 9 7"/>
                            <path d="M20 18v-2a4 4 0 0 0-4-4H4"/>
                          </svg>
                          Respondendo {mensagemReply.direcao === 'inbound' ? (conversaSelecionada.nome_contato || 'Contato') : 'Você'}
                        </div>
                        <div className="reply-preview-text">
                          {mensagemReply.conteudo.length > 50 
                            ? mensagemReply.conteudo.substring(0, 50) + '...' 
                            : mensagemReply.conteudo}
                        </div>
                      </div>
                      <button 
                        className="reply-cancel-button"
                        onClick={cancelarReply}
                        title="Cancelar resposta"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18"/>
                          <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                  )}
                  
                  {/* Preview de mídia */}
                  {showMediaPreview && selectedFile && (
                    <div className="media-preview">
                      <div className="media-preview-header">
                        <div className="media-preview-info">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                            {selectedFile.type.startsWith('image/') && (
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                            )}
                            {selectedFile.type.startsWith('video/') && (
                              <g>
                                <polygon points="23 7 16 12 23 17 23 7"/>
                                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                              </g>
                            )}
                            {selectedFile.type.startsWith('audio/') && (
                              <g>
                                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
                              </g>
                            )}
                            {selectedFile.type === 'application/pdf' && (
                              <g>
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14,2 14,8 20,8"/>
                                <line x1="16" y1="13" x2="8" y2="13"/>
                                <line x1="16" y1="17" x2="8" y2="17"/>
                                <polyline points="10,9 9,9 8,9"/>
                              </g>
                            )}
                          </svg>
                          <span className="media-filename">{selectedFile.name}</span>
                          <span className="media-size">({Math.round(selectedFile.size / 1024)} KB)</span>
                        </div>
                        <button 
                          className="media-cancel-btn"
                          onClick={cancelarMidia}
                          title="Cancelar envio"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      </div>
                      
                      {/* Preview visual */}
                      {selectedFile.type.startsWith('image/') && (
                        <div className="media-preview-content">
                          <img src={filePreview} alt="Preview" className="media-preview-image" />
                        </div>
                      )}
                      
                      {/* Caption input */}
                      <div className="media-caption">
                        <input
                          type="text"
                          value={mediaCaption}
                          onChange={(e) => setMediaCaption(e.target.value)}
                          placeholder="Adicionar legenda (opcional)..."
                          className="form-input"
                        />
                      </div>
                      
                      {/* Botões de ação */}
                      <div className="media-actions">
                        <button
                          onClick={cancelarMidia}
                          className="btn btn-outline btn-sm"
                          disabled={enviandoMidia}
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={enviarMidia}
                          className="btn btn-primary btn-sm"
                          disabled={enviandoMidia}
                        >
                          {enviandoMidia ? (
                            <span style={{ display: 'flex', alignItems: 'center' }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                                <circle cx="12" cy="12" r="10"/>
                                <polyline points="12 6 12 12 16 14"/>
                              </svg>
                              Enviando...
                            </span>
                          ) : (
                            <span style={{ display: 'flex', alignItems: 'center' }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                                <line x1="22" y1="2" x2="11" y2="13"/>
                                <polygon points="22,2 15,22 11,13 2,9"/>
                              </svg>
                              Enviar Mídia
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="input-row">
                    <button
                      onClick={abrirSeletorArquivos}
                      className="btn-attachment"
                      title="Anexar arquivo"
                      disabled={enviandoMensagem || enviandoMidia}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.64 16.2a2 2 0 0 1-2.83-2.83l8.49-8.49"/>
                      </svg>
                    </button>
                    <input
                      type="text"
                      value={novaMensagem}
                      onChange={(e) => setNovaMensagem(e.target.value)}
                      placeholder="Digite sua mensagem..."
                      onKeyPress={(e) => e.key === 'Enter' && enviarMensagem()}
                      disabled={enviandoMensagem || enviandoMidia}
                    />
                    <button
                      onClick={enviarMensagem}
                      disabled={!novaMensagem.trim() || enviandoMensagem || enviandoMidia}
                      className="btn btn-primary"
                    >
                      {enviandoMensagem ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/>
                          <polyline points="12 6 12 12 16 14"/>
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="22" y1="2" x2="11" y2="13"/>
                          <polygon points="22,2 15,22 11,13 2,9"/>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="mensagens-empty">
                <div className="empty-state">
                  <h3>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px', verticalAlign: 'middle' }}>
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    Selecione uma conversa
                  </h3>
                  <p>Escolha uma conversa na lista ao lado para visualizar as mensagens</p>
                </div>
              </div>
            )}
          </div>
        </div>
        </>
      )}

      {/* Aba de Configurações */}
      {abaAtiva === 'configuracoes' && (
        <div className="configuracoes-container">
          <div className="config-card">
            <h3>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px', verticalAlign: 'middle' }}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              Conexão WhatsApp Web
            </h3>
            <div className="whatsapp-connection">
              <div className="connection-status">
                <div className={`status-indicator ${whatsappStatus.isConnected ? 'connected' : 'disconnected'}`}>
                  {whatsappStatus.isConnected ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px', verticalAlign: 'middle', color: '#22c55e' }}>
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                      </svg>
                      Conectado
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px', verticalAlign: 'middle', color: '#ef4444' }}>
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="15" y1="9" x2="9" y2="15"/>
                        <line x1="9" y1="9" x2="15" y2="15"/>
                      </svg>
                      Desconectado
                    </>
                  )}
                </div>
                <p className="status-text">
                  {whatsappStatus.status === 'connected' && 'WhatsApp Web conectado com sucesso!'}
                  {whatsappStatus.status === 'qr_ready' && 'Escaneie o QR Code com seu WhatsApp'}
                  {whatsappStatus.status === 'connecting' && 'Conectando...'}
                  {whatsappStatus.status === 'disconnected' && 'WhatsApp não está conectado'}
                  {whatsappStatus.status === 'not_initialized' && 'Clique em "Conectar" para iniciar'}
                </p>
              </div>

              {whatsappStatus.qrCode && (
                <div className="qr-code-container">
                  <h4>
                    Escaneie este QR Code:
                  </h4>
                  <div className="qr-code">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(whatsappStatus.qrCode)}`}
                      alt="QR Code WhatsApp"
                      style={{ maxWidth: '200px', height: 'auto' }}
                    />
                  </div>
                  <p className="qr-instructions">
                    1. Abra o WhatsApp no seu celular<br/>
                    2. Toque em "Menu" ou "Configurações"<br/>
                    3. Toque em "Dispositivos conectados"<br/>
                    4. Toque em "Conectar um dispositivo"<br/>
                    5. Escaneie este QR Code
                  </p>
                </div>
              )}

              <div className="connection-actions">
                {!whatsappStatus.isConnected ? (
                  <button 
                    className="btn btn-primary"
                    onClick={conectarWhatsApp}
                    disabled={conectando}
                  >
                    {conectando ? (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                          <circle cx="12" cy="12" r="10"/>
                          <polyline points="12 6 12 12 16 14"/>
                        </svg>
                        Conectando...
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                        </svg>
                        Conectar WhatsApp
                      </>
                    )}
                  </button>
                ) : (
                  <button 
                    className="btn btn-danger"
                    onClick={desconectarWhatsApp}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                      <polyline points="16 6 12 2 8 6"/>
                      <line x1="12" y1="2" x2="12" y2="15"/>
                    </svg>
                    Desconectar
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="config-card">
            <h3>
              Como Funciona?
            </h3>
            <div className="info-content">
              <h4>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px', verticalAlign: 'middle', color: '#22c55e' }}>
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                Vantagens do Investmoney Conversas:
              </h4>
              <ul>
                <li>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <circle cx="12" cy="16" r="1"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <strong>Seguro:</strong> Usa sua conta pessoal do WhatsApp
                </li>
                <li>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                    <circle cx="12" cy="12" r="10"/>
                    <polygon points="10,8 16,12 10,16 10,8"/>
                  </svg>
                  <strong>Simples:</strong> Apenas escaneie o QR Code
                </li>
                <li>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                    <line x1="12" y1="1" x2="12" y2="23"/>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                  </svg>
                  <strong>Gratuito:</strong> Sem custos para você
                </li>
                <li>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                    <line x1="12" y1="18" x2="12.01" y2="18"/>
                  </svg>
                  <strong>Familiar:</strong> Interface similar ao WhatsApp Web
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Aba de Automações */}
      {abaAtiva === 'automatizacoes' && (
        <div className="automatizacoes-container">
          <div className="automatizacoes-header">
            <h3>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px', verticalAlign: 'middle' }}>
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="9" cy="9" r="2"/>
                <path d="M21 15.5c-.6 0-1.2-.2-1.7-.7l-3.5-3.5c-.3-.3-.8-.3-1.1 0s-.3.8 0 1.1l3.5 3.5c.5.5.7 1.1.7 1.7s-.2 1.2-.7 1.7"/>
              </svg>
              Automações Investmoney Conversas
            </h3>
            <button className="btn btn-primary" onClick={abrirModalAutomacao}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Nova Automação
            </button>
          </div>

          <div className="automatizacoes-list">
            {automatizacoes.map((automatizacao) => (
              <div key={automatizacao.id} className="automatizacao-card">
                <div className="automatizacao-header">
                  <h4>{automatizacao.nome}</h4>
                  <span className={`status ${automatizacao.ativo ? 'ativo' : 'inativo'}`}>
                    {automatizacao.ativo ? (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px', verticalAlign: 'middle', color: '#22c55e' }}>
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                          <polyline points="22 4 12 14.01 9 11.01"/>
                        </svg>
                        Ativa
                      </>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px', verticalAlign: 'middle', color: '#ef4444' }}>
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="15" y1="9" x2="9" y2="15"/>
                          <line x1="9" y1="9" x2="15" y2="15"/>
                        </svg>
                        Inativa
                      </>
                    )}
                  </span>
                </div>
                <p className="automatizacao-descricao">{automatizacao.descricao}</p>
                <div className="automatizacao-details">
                  <div className="detail-item">
                    <strong>Trigger:</strong> {automatizacao.trigger_tipo}
                  </div>
                  <div className="detail-item">
                    <strong>Ação:</strong> {automatizacao.acao_tipo}
                  </div>
                  <div className="detail-item">
                    <strong>Prioridade:</strong> {automatizacao.prioridade}
                  </div>
                </div>
                <div className="automatizacao-actions">
                  <button className="btn btn-outline btn-sm">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px', verticalAlign: 'middle' }}>
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Editar
                  </button>
                  <button className="btn btn-outline btn-sm">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px', verticalAlign: 'middle' }}>
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      <line x1="10" y1="11" x2="10" y2="17"/>
                      <line x1="14" y1="11" x2="14" y2="17"/>
                    </svg>
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de Vincular lead */}
      {showLinkPatientModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Vincular lead</h2>
              <button className="close-btn" onClick={fecharModalVincularLead}>
                ×
              </button>
            </div>

            <form onSubmit={salvarPacienteEVincular} className="modal-body">
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ 
                  color: '#374151', 
                  marginBottom: '1rem',
                  lineHeight: '1.5'
                }}>
                  <strong>Conversa:</strong> {conversaSelecionada?.nome_contato} {formatarTelefone(conversaSelecionada?.numero_contato)}
                </p>
                <p style={{ 
                  color: '#6b7280', 
                  fontSize: '0.875rem',
                  lineHeight: '1.5'
                }}>
                  Preencha os dados do paciente para vincular à conversa:
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Nome Completo *</label>
                <input
                  type="text"
                  name="nome"
                  className="form-input"
                  value={formData.nome}
                  onChange={handleInputChange}
                  placeholder="Digite o nome do paciente"
                  required
                />
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
                  <label className="form-label">CPF</label>
                  <input
                    type="text"
                    name="cpf"
                    className="form-input"
                    value={formData.cpf}
                    onChange={handleInputChange}
                    placeholder="000.000.000-00"
                    maxLength="14"
                  />
                </div>
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Estado</label>
                  <select
                    name="estado"
                    className="form-select"
                    value={formData.estado}
                    onChange={handleInputChange}
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
                  <label className="form-label">Cidade</label>
                  {formData.estado && cidadesPorEstado[formData.estado] ? (
                    <select
                      name="cidade"
                      className="form-select"
                      value={formData.cidade}
                      onChange={handleInputChange}
                    >
                      <option value="">Selecione a cidade</option>
                      {cidadesPorEstado[formData.estado].map(cidade => (
                        <option key={cidade} value={cidade}>{cidade}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      name="cidade"
                      className="form-input"
                      value={formData.cidade}
                      onChange={handleInputChange}
                      placeholder="Digite o nome da cidade"
                      disabled={!formData.estado}
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Tipo de Tratamento</label>
                  <select
                    name="tipo_tratamento"
                    className="form-select"
                    value={formData.tipo_tratamento}
                    onChange={handleInputChange}
                  >
                    <option value="">Selecione</option>
                    <option value="Estético">Estético</option>
                    <option value="Odontológico">Odontológico</option>
                    <option value="Ambos">Ambos</option>
                  </select>
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
                    {Array.isArray(consultores) && consultores.map(consultor => (
                      <option key={consultor.id} value={consultor.id}>
                        {consultor.nome}
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
                  placeholder="Informações adicionais..."
                  rows="3"
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={fecharModalVincularLead}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={salvandoPaciente}>
                  {salvandoPaciente ? (
                    <>
                      <span className="loading-spinner" style={{ 
                        display: 'inline-block', 
                        verticalAlign: 'middle', 
                        marginRight: 8 
                      }}></span>
                      Salvando...
                    </>
                  ) : (
                    'Salvar e Vincular'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Confirmar Exclusão</h3>
              <button className="modal-close" onClick={fecharModalExcluir}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            
            <div className="modal-body">
              <div className="warning-content">
                <h4>Tem certeza que deseja excluir esta conversa?</h4>
                <p>
                  A conversa com <strong>{conversaSelecionada?.nome_contato || formatarTelefone(conversaSelecionada?.numero_contato)}</strong> será excluída permanentemente.
                </p>
                <p className="warning-text">
                  <strong>Esta ação não pode ser desfeita!</strong><br/>
                  Todas as mensagens desta conversa serão removidas definitivamente.
                </p>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={fecharModalExcluir}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                  <path d="M18 6L6 18"/>
                  <path d="M6 6l12 12"/>
                </svg>
                Cancelar
              </button>
              <button type="button" className="btn btn-danger" onClick={confirmarExclusaoConversa}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  <line x1="10" y1="11" x2="10" y2="17"/>
                  <line x1="14" y1="11" x2="14" y2="17"/>
                </svg>
                Excluir Conversa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Nova Automação */}
      {showAutomationModal && (
        <div className="modal-overlay">
          <div className="modal-content large">
            <div className="modal-header">
              <h3>Nova Automação</h3>
              <button className="modal-close" onClick={fecharModalAutomacao}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            
            <form onSubmit={salvarAutomacao}>
              <div className="modal-body">
                <div className="grid grid-1">
                  <div className="form-group">
                    <label className="form-label">Nome da Automação *</label>
                    <input
                      type="text"
                      name="nome"
                      className="form-input"
                      value={automationForm.nome}
                      onChange={handleAutomationChange}
                      placeholder="Ex: Mensagem de boas-vindas"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Descrição</label>
                    <textarea
                      name="descricao"
                      className="form-textarea"
                      value={automationForm.descricao}
                      onChange={handleAutomationChange}
                      placeholder="Descreva o que esta automação faz..."
                      rows="3"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Tipo de Gatilho *</label>
                  <select
                    name="trigger_tipo"
                    className="form-select"
                    value={automationForm.trigger_tipo}
                    onChange={handleAutomationChange}
                    required
                  >
                    <option value="mensagem_recebida">Mensagem Recebida</option>
                    <option value="palavra_chave">Palavra-chave</option>
                    <option value="horario">Horário Específico</option>
                  </select>
                </div>

                {/* Configurações específicas do gatilho */}
                {automationForm.trigger_tipo === 'mensagem_recebida' && (
                  <div className="form-group">
                    <label className="form-label">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                      </svg>
                      Tipo de Mensagem *
                    </label>
                    <select
                      className="form-select"
                      value={automationForm.trigger_config.mensagem_tipo}
                      onChange={(e) => handleTriggerConfigChange('mensagem_tipo', e.target.value)}
                      required
                    >
                      <option value="primeira_conversa">Primeira mensagem da conversa</option>
                      <option value="primeira_dia">Primeira mensagem do dia</option>
                      <option value="qualquer_mensagem">Qualquer mensagem recebida</option>
                    </select>
                    <div className="automation-explanation">
                      {automationForm.trigger_config.mensagem_tipo === 'primeira_conversa' && (
                        <div className="explanation-card">
                          <div className="explanation-content">
                            <strong>Primeira mensagem da conversa</strong>
                            <p>Ideal para mensagens de boas-vindas. A automação será ativada apenas quando um novo contato enviar sua primeira mensagem.</p>
                            <small>Exemplo: "Olá! Bem-vindo ao nosso atendimento..."</small>
                          </div>
                        </div>
                      )}
                      {automationForm.trigger_config.mensagem_tipo === 'primeira_dia' && (
                        <div className="explanation-card">
                          <div className="explanation-content">
                            <strong>Primeira mensagem do dia</strong>
                            <p>Perfeito para mensagens de bom dia ou lembretes diários. A automação será ativada na primeira mensagem recebida de cada dia.</p>
                            <small>Exemplo: "Bom dia! Como posso ajudá-lo hoje?"</small>
                          </div>
                        </div>
                      )}
                      {automationForm.trigger_config.mensagem_tipo === 'qualquer_mensagem' && (
                        <div className="explanation-card warning">
                          <div className="explanation-content">
                            <strong>Qualquer mensagem recebida</strong>
                            <p>Use com cuidado! A automação será ativada em todas as mensagens recebidas, o que pode gerar spam.</p>
                            <small>Recomendado apenas para casos específicos ou com delay entre mensagens.</small>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {automationForm.trigger_tipo === 'palavra_chave' && (
                  <div className="form-group">
                    <label className="form-label">Palavras-chave *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={automationForm.trigger_config.palavras_chave}
                      onChange={(e) => handleTriggerConfigChange('palavras_chave', e.target.value)}
                      placeholder="Digite as palavras-chave separadas por vírgula (ex: preço, valor, orçamento)"
                      required
                    />
                    <small className="form-help">
                      Separe múltiplas palavras-chave com vírgulas. A automação será ativada quando qualquer uma dessas palavras for mencionada.
                    </small>
                  </div>
                )}

                {automationForm.trigger_tipo === 'horario' && (
                  <div className="grid grid-2">
                    <div className="form-group">
                      <label className="form-label">Horário de Início *</label>
                      <input
                        type="time"
                        className="form-input"
                        value={automationForm.trigger_config.horario_inicio}
                        onChange={(e) => handleTriggerConfigChange('horario_inicio', e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Horário de Fim *</label>
                      <input
                        type="time"
                        className="form-input"
                        value={automationForm.trigger_config.horario_fim}
                        onChange={(e) => handleTriggerConfigChange('horario_fim', e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}

                {automationForm.trigger_tipo === 'horario' && (
                  <div className="form-group">
                    <label className="form-label">Dias da Semana</label>
                    <div className="checkbox-grid">
                      {[
                        { value: 'segunda', label: 'Segunda' },
                        { value: 'terca', label: 'Terça' },
                        { value: 'quarta', label: 'Quarta' },
                        { value: 'quinta', label: 'Quinta' },
                        { value: 'sexta', label: 'Sexta' },
                        { value: 'sabado', label: 'Sábado' },
                        { value: 'domingo', label: 'Domingo' }
                      ].map(dia => (
                        <label key={dia.value} className="checkbox-container">
                          <input
                            type="checkbox"
                            checked={automationForm.trigger_config.dias_semana.includes(dia.value)}
                            onChange={(e) => handleDiasSemanaChange(dia.value, e.target.checked)}
                          />
                          <span className="checkmark"></span>
                          {dia.label}
                        </label>
                      ))}
                    </div>
                    <small className="form-help">
                      Selecione os dias da semana em que a automação deve estar ativa.
                    </small>
                  </div>
                )}

                {/* Mensagem a ser enviada */}
                <div className="form-group">
                  <label className="form-label">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                      <line x1="22" y1="2" x2="11" y2="13"/>
                      <polygon points="22,2 15,22 11,13 2,9 22,2"/>
                    </svg>
                    Mensagem a Enviar *
                  </label>
                  <textarea
                    className="form-textarea"
                    value={automationForm.acao_config.mensagem}
                    onChange={(e) => handleActionConfigChange('mensagem', e.target.value)}
                    placeholder="Digite a mensagem que será enviada automaticamente..."
                    rows="4"
                    required
                  />
                  <small className="form-help">
                    Esta mensagem será enviada automaticamente quando o gatilho for ativado.
                  </small>
                </div>

                <div className="form-group">
                  <label className="checkbox-container">
                    <input
                      type="checkbox"
                      name="ativo"
                      checked={automationForm.ativo}
                      onChange={handleAutomationChange}
                    />
                    <span className="checkmark"></span>
                    Ativar automação imediatamente
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={fecharModalAutomacao}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                    <path d="M18 6L6 18"/>
                    <path d="M6 6l12 12"/>
                  </svg>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                    <polyline points="17,21 17,13 7,13 7,21"/>
                    <polyline points="7,3 7,8 15,8"/>
                  </svg>
                  Criar Automação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsApp;
