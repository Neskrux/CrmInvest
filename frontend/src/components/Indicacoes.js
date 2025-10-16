import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import { Copy, Check, CheckCircle, Lightbulb, HelpCircle } from 'lucide-react';
import './Indicacoes.css';
import TutorialIndicacoes from './TutorialIndicacoes';

const Indicacoes = () => {
  const { user, makeRequest } = useAuth();
  const { showSuccessToast, showInfoToast, showErrorToast } = useToast();
  const [activeTab, setActiveTab] = useState('clinicas');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [linkPacientes, setLinkPacientes] = useState('');
  const [linkClinicas, setLinkClinicas] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingLink, setLoadingLink] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImage, setModalImage] = useState(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [modalMessage, setModalMessage] = useState(null);
  
  // Estados para controlar o tutorial
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialCompleted, setTutorialCompleted] = useState(false);

  // Estados para o formulário de cadastro direto
  const [formCadastro, setFormCadastro] = useState({
    nome: '',
    telefone: '',
    responsavel: '',
    cidade: '',
    estado: '',
    observacoes: ''
  });
  const [cidadeCustomizadaCadastro, setCidadeCustomizadaCadastro] = useState(false);
  const [submittingCadastro, setSubmittingCadastro] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Imagens para o carrossel
  const imagensClinicas = [
    {
      id: 1,
      url: '/images/clinicas/cli1.png',
      titulo: 'Clínica Parceira',
      descricao: 'Receba à vista, paciente paga parcelado'
    },
    {
      id: 2,
      url: '/images/clinicas/cli2.png',
      titulo: 'Aumente seu Faturamento',
      descricao: 'Mais pacientes, sem inadimplência'
    },
    {
      id: 3,
      url: '/images/clinicas/cli3.png',
      titulo: 'Gestão Completa',
      descricao: 'Nós cuidamos da cobrança'
    },
    {
      id: 4,
      url: '/images/clinicas/cli4.png',
      titulo: 'Fluxo de Caixa Garantido',
      descricao: 'Pagamento em D+1 útil'
    },
    {
      id: 5,
      url: '/images/clinicas/cli5.png',
      titulo: 'Pacientes Pré-aprovados',
      descricao: 'Sem perda de tempo com negociação'
    },
    {
      id: 6,
      url: '/images/clinicas/cli6.png',
      titulo: 'Parceria de Sucesso',
      descricao: 'Mais de 200 clínicas parceiras'
    }
  ];

  const imagensPacientes = [
    {
      id: 1,
      url: '/images/pacientes/pac1.png',
      titulo: 'Tratamento Odontológico',
      descricao: 'Comece hoje e pague no boleto em até 36x'
    },
    {
      id: 2,
      url: '/images/pacientes/pac2.png',
      titulo: 'Parcelamento Facilitado',
      descricao: 'Só a InvestMoney parcela no boleto'
    },
    {
      id: 3,
      url: '/images/pacientes/pac3.png',
      titulo: 'Sorriso Novo',
      descricao: 'Implantes parcelados em até 36x'
    },
    {
      id: 4,
      url: '/images/pacientes/pac4.png',
      titulo: 'Sorriso dos Sonhos',
      descricao: 'Sem entrada, parcelas que cabem no bolso'
    },
    {
      id: 5,
      url: '/images/pacientes/pac5.png',
      titulo: 'Procedimento Estético',
      descricao: 'Harmonização facial parcelada'
    },
    {
      id: 6,
      url: '/images/pacientes/pac6.png',
      titulo: 'Tratamento Completo',
      descricao: 'Aprovação rápida, sem burocracia'
    }
  ];

  // Templates premium profissionais
  const templatesDisponiveis = activeTab === 'clinicas' ? imagensClinicas : imagensPacientes;

  // Modelos de mensagens corporativas
  const mensagensPacientes = [
    {
      id: 1,
      titulo: 'Tratamento Aprovado - Sem Cartão',
      texto: `Olá!\n\nTemos uma boa notícia: conseguimos aprovar seu tratamento mesmo sem cartão de crédito.\n\nComo funciona:\n• Pagamento 100% no boleto mensal\n• Sem entrada obrigatória\n• Primeira consulta gratuita\n• Início do tratamento após aprovação\n\nVantagens:\n• Sem consulta ao SPC/Serasa\n• Parcelas que cabem no seu orçamento\n• Clínicas parceiras qualificadas\n• Profissionais especializados\n\nEsta é uma oportunidade real para você realizar seu tratamento. Entre em contato para mais informações:`
    },
    {
      id: 2,
      titulo: 'Tratamento Odontológico Facilitado',
      texto: `Prezado(a),\n\nOferecemos uma solução para quem precisa de tratamento odontológico mas não possui cartão de crédito ou dinheiro à vista.\n\nNossa proposta:\n• Parcelamento no boleto bancário\n• Avaliação inicial gratuita\n• Aprovação rápida e simples\n• Clínicas parceiras certificadas\n\nTratamentos disponíveis:\n• Ortodontia\n• Implantes\n• Próteses\n• Estética dental\n\nMais de 3.000 pacientes já foram atendidos através do nosso sistema. Queremos ajudar você também.\n\nEntre em contato para agendar sua avaliação:`
    },
    {
      id: 3,
      titulo: 'Procedimentos Estéticos - Pagamento Facilitado',
      texto: `Olá!\n\nSe você deseja realizar procedimentos estéticos mas não tem cartão de crédito, temos uma solução para você.\n\nNossa proposta:\n• Parcelamento no boleto\n• Sem entrada obrigatória\n• Aprovação em até 24h\n• Clínicas parceiras qualificadas\n\nProcedimentos disponíveis:\n• Harmonização facial\n• Preenchimentos\n• Limpeza de pele\n• Tratamentos corporais\n\nTrabalhamos com clínicas que utilizam produtos originais e contam com profissionais especializados.\n\nAgende sua consulta gratuita:`
    }
  ];

  const mensagensClinicas = [
    {
      id: 1,
      titulo: 'Gestão de Boletos - Sem Taxas',
      texto: `Prezado(a) proprietário(a),\n\nOferecemos gestão completa de boletos bancários para clínicas estéticas e odontológicas.\n\nNossa proposta:\n• Gestão total de boletos bancários\n• Cobrança automatizada e eficiente\n• Zero taxa de mensalidade\n• Zero taxa de adesão\n• Zero taxa de setup\n\nComo funciona:\n• Pacientes parcelam no boleto (até 36x)\n• Nós gerenciamos toda emissão\n• Nós executamos toda cobrança\n• Nós acompanhamos os pagamentos\n• Nós trazemos mais pacientes para sua clínica\n\nSem burocracias, sem custos ocultos.\n\nInteressado em nossa parceria?`
    },
    {
      id: 2,
      titulo: 'Aumente seu Faturamento',
      texto: `Clínica parceira,\n\nVocê está perdendo vendas por falta de opções de pagamento?\n\nNossa solução:\n• Pacientes pagam no boleto (sem cartão)\n• Cobrança bancária automatizada\n• Controle total dos pagamentos\n• Relatórios financeiros detalhados\n• Suporte técnico dedicado\n\nSem custos:\n• Sem taxa mensal\n• Sem taxa de adesão\n• Sem taxa de setup\n• Sem taxa de manutenção\n\nResultados comprovados:\n• +40% no faturamento médio\n• +25 novos pacientes/mês\n• 0% inadimplência para você\n• Mais pacientes para sua clínica\n\nQuer aumentar suas vendas sem risco?`
    },
    {
      id: 3,
      titulo: 'Gestão Financeira Completa',
      texto: `Prezado(a) proprietário(a),\n\nTrabalhamos exclusivamente com clínicas estéticas e odontológicas há mais de 3 anos.\n\nNossa especialidade:\n• Gestão completa de boletos bancários\n• Emissão e controle automatizado\n• Cobrança bancária eficiente\n• Aprovação em 24 horas\n• Pagamento D+1\n\nNossa proposta:\n• Zero taxa de mensalidade\n• Zero taxa de adesão\n• Zero custos ocultos\n• Zero burocracias\n\nComo funciona:\n1. Paciente faz tratamento\n2. Parcela no boleto\n3. Nós cuidamos da cobrança\n4. Você recebe sem inadimplência\n5. Nós trazemos mais pacientes para sua clínica\n\nInteressado em uma parceria de sucesso?`
    }
  ];

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

  // Verificação de permissão - executada sempre
  useEffect(() => {
    if (!user?.is_freelancer || user?.tipo !== 'consultor') {
      return; // Sai sem executar fetchLinks
    }

    // Só executa fetchLinks se o usuário tiver permissão
    fetchLinks();
  }, [user]);

  // Verificar se deve mostrar tutorial
  useEffect(() => {
    if (!user) return;
    
    const hasSeenTutorialIndicacoes = localStorage.getItem('tutorial-indicacoes-completed');
    
    // Não mostrar tutorial automaticamente, apenas se o usuário clicar
    // if (!hasSeenTutorialIndicacoes) {
    //   setShowTutorial(true);
    // }
  }, [user]);

  const handleTutorialComplete = () => {
    setShowTutorial(false);
    setTutorialCompleted(true);
    localStorage.setItem('tutorial-indicacoes-completed', 'true');
  };

  const handleTutorialClose = () => {
    setShowTutorial(false);
  };

  const startTutorial = () => {
    setShowTutorial(true);
  };

  // Cleanup: restaurar scroll quando componente for desmontado
  useEffect(() => {
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const fetchLinks = async () => {
    try {
      setLoading(true);
      setLoadingLink(true);
      
      // Usar a rota de perfil que o consultor pode acessar
      const consultorResponse = await makeRequest('/consultores/perfil');
      const responseData = await consultorResponse.json();
      
      if (consultorResponse.ok && responseData.consultor) {
        const consultorData = responseData.consultor;
        
        // Verificar se é consultor interno (tem as duas permissões)
        const isConsultorInterno = consultorData.pode_ver_todas_novas_clinicas === true && 
                                   consultorData.podealterarstatus === true;
        
        if (!isConsultorInterno) {
          // Freelancer: buscar link personalizado baseado no código de referência
          if (consultorData.codigo_referencia) {
            setLinkPacientes(`https://solumn.com.br/captura-lead?ref=${consultorData.codigo_referencia}`);
            setLinkClinicas(`https://solumn.com.br/captura-clinica?ref=${consultorData.codigo_referencia}`);
          } else {
            // Se não tem código de referência, mostrar mensagem
            setLinkPacientes(null);
            setLinkClinicas(null);
          }
        } else {
          // Interno: usar link geral
          setLinkPacientes('https://solumn.com.br/captura-lead');
          setLinkClinicas('https://solumn.com.br/captura-clinica');
        }
      } else {
        console.error('Erro ao buscar dados do consultor:', responseData);
        setLinkPacientes(null);
        setLinkClinicas(null);
      }
    } catch (error) {
      console.error('Erro ao buscar link personalizado:', error);
      setLinkPacientes(null);
      setLinkClinicas(null);
    } finally {
      setLoading(false);
      setLoadingLink(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    showSuccessToast('Link copiado com sucesso!');
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const copyFullMessage = () => {
    const mensagem = selectedMessage;
    const link = activeTab === 'clinicas' ? linkClinicas : linkPacientes;
    const fullText = `${mensagem.texto}\n\n${link}`;

    navigator.clipboard.writeText(fullText);
    showSuccessToast('Mensagem completa copiada!');
  };

  const handlePrevImage = () => {
    setSelectedImageIndex((prev) => 
      prev === 0 ? templatesDisponiveis.length - 1 : prev - 1
    );
  };

  const handleNextImage = () => {
    setSelectedImageIndex((prev) => 
      (prev + 1) % templatesDisponiveis.length
    );
  };

  const openImageModal = (image) => {
    setModalImage(image);
    setShowImageModal(true);
    // Prevenir scroll da página principal
    document.body.style.overflow = 'hidden';
  };

  const closeImageModal = () => {
    setShowImageModal(false);
    setModalImage(null);
    // Restaurar scroll da página principal
    document.body.style.overflow = 'unset';
  };

  const openMessageModal = (message) => {
    setModalMessage(message);
    setShowMessageModal(true);
    // Prevenir scroll da página principal
    document.body.style.overflow = 'hidden';
  };

  const closeMessageModal = () => {
    setShowMessageModal(false);
    setModalMessage(null);
    // Restaurar scroll da página principal
    document.body.style.overflow = 'unset';
  };

  const selectMessageFromModal = () => {
    if (modalMessage) {
      handleMessageSelect(modalMessage);
      closeMessageModal();
    }
  };

  const downloadSelectedImage = async () => {
    if (!selectedTemplate) return;

    try {
      // Detectar se é iOS
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      
      // Tentar usar a API de compartilhamento nativa (funciona melhor no iOS)
      if (isIOS && navigator.share) {
        try {
          // Fazer fetch da imagem e converter para blob
          const response = await fetch(selectedTemplate.url);
          const blob = await response.blob();
          const file = new File([blob], `${selectedTemplate.titulo}.jpg`, { type: 'image/jpeg' });
          
          await navigator.share({
            files: [file],
            title: selectedTemplate.titulo,
            text: 'Imagem selecionada para indicação'
          });
          
          showSuccessToast('Compartilhe e escolha "Salvar Imagem" para salvar nas fotos!');
          return;
        } catch (shareError) {
        }
      }
      
      // Método alternativo: converter para blob e criar link de download
      try {
        const response = await fetch(selectedTemplate.url);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `${selectedTemplate.titulo}.jpg`;
        
        // Para iOS, abrir em nova aba permite salvar nas fotos
        if (isIOS) {
          link.target = '_blank';
          showSuccessToast('Toque e segure na imagem para salvar nas fotos!');
        } else {
          showSuccessToast('Imagem baixada com sucesso!');
        }
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Limpar o blob URL
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
      } catch (blobError) {
        // Fallback final: abrir em nova aba
        window.open(selectedTemplate.url, '_blank');
        showInfoToast('Toque e segure na imagem para salvar!');
      }
    } catch (error) {
      console.error('Erro ao baixar imagem:', error);
      showErrorToast('Erro ao baixar imagem. Tente novamente.');
    }
  };

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    showInfoToast(`Template "${template.titulo}" selecionado`);
  };

  const handleMessageSelect = (message) => {
    setSelectedMessage(message);
    showInfoToast(`Modelo "${message.titulo}" selecionado`);
  };

  const handleTabChange = (newTab) => {
    // Limpar todas as seleções ao mudar de tab
    setSelectedTemplate(null);
    setSelectedMessage(null);
    setSelectedImageIndex(0);
    setActiveTab(newTab);
    // Limpar formulário de cadastro ao trocar de tab
    setFormCadastro({
      nome: '',
      telefone: '',
      responsavel: '',
      cidade: '',
      estado: '',
      observacoes: ''
    });
    setCidadeCustomizadaCadastro(false);
    setFormErrors({});
  };

  // Funções de formatação
  const formatarTelefone = (value) => {
    // Remove tudo que não é número
    let numbers = value.replace(/\D/g, '');
    
    // Remove zeros à esquerda (ex: 041 → 41)
    numbers = numbers.replace(/^0+/, '');
    
    // Limita a 11 dígitos
    numbers = numbers.substring(0, 11);
    
    // Formata baseado no tamanho
    if (numbers.length === 0) {
      return '';
    } else if (numbers.length <= 2) {
      return `(${numbers}`;
    } else if (numbers.length <= 6) {
      return `(${numbers.substring(0, 2)}) ${numbers.substring(2)}`;
    } else if (numbers.length <= 10) {
      return `(${numbers.substring(0, 2)}) ${numbers.substring(2, 6)}-${numbers.substring(6)}`;
    } else {
      return `(${numbers.substring(0, 2)}) ${numbers.substring(2, 7)}-${numbers.substring(7, 11)}`;
    }
  };

  const formatarCidade = (value) => {
    if (!value) return '';
    
    let cleanValue = value.replace(/[0-9!@#$%^&*()_+=\[\]{}|\\:";'<>?,./~`]/g, '');
    const isTyping = value.endsWith(' ') && value.length > 0;
    
    if (isTyping) {
      return cleanValue;
    }
    
    cleanValue = cleanValue.replace(/\s+/g, ' ').trim();
    
    if (!cleanValue) return '';
    if (cleanValue.length < 2) return cleanValue;
    
    const isAllUpperCase = cleanValue.length > 3 && cleanValue === cleanValue.toUpperCase();
    
    if (isAllUpperCase) {
      return cleanValue.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
    }
    
    return cleanValue
      .toLowerCase()
      .split(' ')
      .map((palavra, index) => {
        const preposicoes = ['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'na', 'no', 'nas', 'nos'];
        
        if (index === 0) {
          return palavra.charAt(0).toUpperCase() + palavra.slice(1);
        }
        
        if (preposicoes.includes(palavra)) {
          return palavra;
        }
        
        return palavra.charAt(0).toUpperCase() + palavra.slice(1);
      })
      .join(' ');
  };

  // Manipulação do formulário de cadastro
  const handleCadastroInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'telefone') {
      const formattedValue = formatarTelefone(value);
      setFormCadastro(prev => ({ ...prev, [name]: formattedValue }));
    } else if (name === 'cidade') {
      const formattedValue = formatarCidade(value);
      setFormCadastro(prev => ({ ...prev, [name]: formattedValue }));
    } else if (name === 'estado') {
      setFormCadastro(prev => ({ ...prev, [name]: value, cidade: '' }));
      setCidadeCustomizadaCadastro(false);
    } else {
      setFormCadastro(prev => ({ ...prev, [name]: value }));
    }
    
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Validação do formulário de cadastro
  const validateCadastroForm = () => {
    const newErrors = {};
    
    if (!formCadastro.nome.trim()) {
      newErrors.nome = `Nome ${activeTab === 'clinicas' ? 'da clínica' : 'do paciente'} é obrigatório`;
    } else if (formCadastro.nome.trim().length < 2) {
      newErrors.nome = 'Nome deve ter pelo menos 2 caracteres';
    }
    
    // Validar responsável apenas para clínicas
    if (activeTab === 'clinicas') {
      if (!formCadastro.responsavel.trim()) {
        newErrors.responsavel = 'Nome do responsável é obrigatório';
      } else if (formCadastro.responsavel.trim().length < 2) {
        newErrors.responsavel = 'Nome do responsável deve ter pelo menos 2 caracteres';
      }
    }
    
    if (!formCadastro.telefone.trim()) {
      newErrors.telefone = 'WhatsApp é obrigatório';
    } else if (formCadastro.telefone.replace(/\D/g, '').length < 10) {
      newErrors.telefone = 'WhatsApp deve ter pelo menos 10 dígitos';
    }
    
    if (!formCadastro.estado) {
      newErrors.estado = 'Estado é obrigatório';
    }
    
    if (!formCadastro.cidade.trim()) {
      newErrors.cidade = 'Cidade é obrigatória';
    }
    
    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit do formulário de cadastro
  const handleCadastroSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateCadastroForm()) {
      showErrorToast('Por favor, preencha todos os campos obrigatórios');
      return;
    }
    
    setSubmittingCadastro(true);
    
    try {
      const endpoint = activeTab === 'clinicas' ? '/novas-clinicas' : '/pacientes';
      
      const dataToSend = activeTab === 'clinicas' 
        ? {
            nome: formCadastro.nome,
            telefone: formCadastro.telefone,
            responsavel: formCadastro.responsavel,
            cidade: formCadastro.cidade,
            estado: formCadastro.estado,
            observacoes: formCadastro.observacoes,
            status: 'sem_primeiro_contato'
          }
        : {
            nome: formCadastro.nome,
            telefone: formCadastro.telefone,
            cidade: formCadastro.cidade,
            estado: formCadastro.estado,
            observacoes: formCadastro.observacoes,
            consultor_id: user.id,
            status: 'sem_primeiro_contato'
          };
      
      const response = await makeRequest(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        showSuccessToast(`${activeTab === 'clinicas' ? 'Clínica' : 'Paciente'} cadastrado com sucesso!`);
        // Limpar formulário
        setFormCadastro({
          nome: '',
          telefone: '',
          responsavel: '',
          cidade: '',
          estado: '',
          observacoes: ''
        });
        setCidadeCustomizadaCadastro(false);
        setFormErrors({});
      } else {
        showErrorToast(data.error || 'Erro ao cadastrar');
      }
    } catch (error) {
      console.error('Erro ao cadastrar:', error);
      showErrorToast('Erro de conexão. Tente novamente.');
    } finally {
      setSubmittingCadastro(false);
    }
  };

  // Verificação final de permissão antes do render
  if (!user?.is_freelancer || user?.tipo !== 'consultor') {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '1.5rem',
        color: '#666'
      }}>
        Acesso restrito a freelancers consultores
      </div>
    );
  }

  return (
    <div className="indicacoes-container">
      {/* Header executivo */}
      <div className="indicacoes-header" style={{ position: 'relative' }}>
        <div className="header-content">
          <h1 className="header-title">
            Comece a Indicar
          </h1>
          <p className="header-subtitle">
            Siga os passos abaixo para começar a ganhar dinheiro apenas enviando mensagens
          </p>
          
          {/* Botão Ver Tutorial - Mobile: abaixo do texto */}
          <button
            onClick={startTutorial}
            style={{
              display: window.innerWidth <= 768 ? 'flex' : 'none',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 20px',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              color: 'white',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
              backdropFilter: 'blur(10px)',
              marginTop: '1rem',
              width: 'fit-content',
              margin: '1rem auto 0'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.25)';
              e.target.style.borderColor = 'rgba(255, 255, 255, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
              e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            }}
            title="Ver tutorial da página"
          >
            Ver Tutorial
          </button>
        </div>
        
        {/* Botão Ver Tutorial - Desktop: posição absoluta no canto superior direito */}
        <button
          onClick={startTutorial}
          style={{
            position: 'absolute',
            top: '1.5rem',
            right: '1.5rem',
            display: window.innerWidth <= 768 ? 'none' : 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            color: 'white',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
            backdropFilter: 'blur(10px)',
            zIndex: 10
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.25)';
            e.target.style.borderColor = 'rgba(255, 255, 255, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
            e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)';
          }}
          title="Ver tutorial da página"
        >
          Ver Tutorial
        </button>
      </div>

        {/* Tabs executivas */}
      <h2 style={{
        fontSize: window.innerWidth <= 768 ? '1.5rem' : '2rem',
        fontWeight: '700',
        marginBottom: '1rem',
        color: '#1e293b ',
        textAlign: 'center',
        marginTop: '2rem',
        padding: window.innerWidth <= 768 ? '0 1.5rem' : '0'
      }}>Clique no que você quer indicar</h2>
      <div className="tabs-container" data-tutorial="escolha-tipo" style={{ padding: window.innerWidth <= 768 ? '0 1.5rem' : '0' }}>
        <div className="tabs-wrapper">
          <button
            className={`tab-button ${activeTab === 'clinicas' ? 'active' : ''}`}
            onClick={() => handleTabChange('clinicas')}
          >
            <div className="tab-content">
              <div className="tab-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </div>
                     <div className="tab-info">
                       <span className="tab-text">Clínicas</span>
                       <span className="tab-subtitle">Indicar clínicas estéticas <br/> ou odontológicas</span>
                       <span style={{
                         display: 'inline-block',
                         marginTop: '0.25rem',
                         padding: '0.25rem 0.5rem',
                         background: '#10b981',
                         color: 'white',
                         fontSize: window.innerWidth <= 768 ? '0.6rem' : '0.75rem',
                         fontWeight: '700',
                         borderRadius: '6px'
                       }}>
                         R$ 100 por clínica indicada <br />
                         que fechar parceria conosco
                       </span>
                     </div>
            </div>
          </button>
          <button
            className={`tab-button ${activeTab === 'pacientes' ? 'active' : ''}`}
            onClick={() => handleTabChange('pacientes')}
          >
            <div className="tab-content">
              <div className="tab-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                </svg>
                    </div>
                     <div className="tab-info">
                       <span className="tab-text">Pacientes</span>
                       <span className="tab-subtitle">Indicar pacientes</span>
                       <span style={{
                         display: 'inline-block',
                         marginTop: '0.25rem',
                         padding: '0.25rem 0.5rem',
                         background: '#3b82f6',
                         color: 'white',
                         fontSize: window.innerWidth <= 768 ? '0.6rem' : '0.75rem',
                         fontWeight: '700',
                         borderRadius: '6px'
                       }}>
                         1% do valor do tratamento <br />
                         que fizer conosco
                       </span>
                     </div>
                    </div>
              </button>
            </div>
          </div>

      {/* Seção explicativa - O que vou indicar? */}
      <div className="explicacao-container" style={{ padding: window.innerWidth <= 768 ? '0 1.5rem' : '0', marginTop: '3rem' }}>
        <div style={{
          borderRadius: '16px',
          padding: '2.5rem',
          textAlign: 'center',
          maxWidth: '900px',
          margin: '0 auto'
        }}>
          <h2 style={{
            fontSize: window.innerWidth <= 768 ? '1.5rem' : '2rem',
            fontWeight: '700',
            color: '#1e293b',
            marginBottom: '1.5rem'
          }}>
            O que vou indicar?
          </h2>
          
          {activeTab === 'clinicas' ? (
            <div>
              <p style={{
                fontSize: window.innerWidth <= 768 ? '1rem' : '1.1rem',
                color: '#475569',
                lineHeight: '1.6',
                marginBottom: '1.5rem',
                maxWidth: '800px',
                margin: '0 auto 1.5rem'
              }}>
                <strong>Você indicará nosso produto para clínicas estéticas e odontológicas.</strong> <br /> <br />
                <strong>O que é nosso produto?</strong> <br />
                <p>Nosso produto é uma parceria, onde realizamos a gestão de boletos e cobranças dessas clínicas sem taxas de adesão ou mensalidade.</p>
              </p>
              <div style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                padding: '1rem 1.5rem',
                borderRadius: '12px',
                fontSize: window.innerWidth <= 768 ? '0.9rem' : '1rem',
                fontWeight: '600',
                display: 'inline-block'
              }}>
                Indique para clínicas que querem fazer a gestão de boletos e cobranças sem taxas de adesão ou mensalidade.
              </div>
            </div>
          ) : (
            <div>
              <p style={{
                fontSize: window.innerWidth <= 768 ? '1rem' : '1.1rem',
                color: '#475569',
                lineHeight: '1.6',
                marginBottom: '1.5rem',
                maxWidth: '800px',
                margin: '0 auto 1.5rem'
              }}>
                <strong>Você indicará nossa solução para os pacientes.</strong><br /> <br />
                <strong>O que é nossa solução?</strong> <br />
                <p>Nossa solução é a possibilidade de fazer tratamentos estéticos ou odontológicos parcelados no boleto, conectamos qualquer pessoa, à uma clinica parceira.</p>
              </p>
              <div style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: 'white',
                padding: '1rem 1.5rem',
                borderRadius: '12px',
                fontSize: window.innerWidth <= 768 ? '0.9rem' : '1rem',
                fontWeight: '600',
                display: 'inline-block'
              }}>
                Indique um parente, um amigo, um conhecido, ou até mesmo você..
              </div>
            </div>
          )}

          <h2 style={{
            fontSize: window.innerWidth <= 768 ? '1.5rem' : '2rem',
            fontWeight: '700',
            color: '#1e293b',
            marginTop: '3rem'
          }}>
            E agora, o que eu faço?
          </h2>
        </div>
      </div>

      {/* Processo executivo */}
      <div className="process-container" style={{ padding: window.innerWidth <= 768 ? '0 1.5rem' : '0' }}>
        <div className="process-step" data-tutorial="mensagens">
        <h2 style={{
        fontSize: window.innerWidth <= 768 ? '1.4rem' : '2rem',
        fontWeight: '700',
        color: '#1e293b ',
        textAlign: 'center',
        marginBottom: window.innerWidth <= 768 ? '2rem' : '4rem',
        padding: window.innerWidth <= 768 ? '1rem 0.5rem' : '1rem'}}>
        Agora faça o primeiro contato com {activeTab === 'pacientes' ? 'os pacientes' : 'as clínicas'}!
        </h2>
          <div className="step-header"> 
            <div className="step-number">1</div>
            <div className="step-content">
                   <h2 style={{ fontSize: window.innerWidth <= 768 ? '1.1rem' : '1.25rem' }}>Clique em uma Mensagem</h2>
                   <p style={{ fontSize: window.innerWidth <= 768 ? '0.9rem' : '1rem' }}>Use uma das nossas mensagens pré-prontas para entrar em contato e explicar nossa proposta</p>
            </div>
          </div>
          <div className="messages-grid">
            {(activeTab === 'clinicas' ? mensagensClinicas : mensagensPacientes).map(message => (
              <div
                key={message.id}
                className={`message-card ${selectedMessage?.id === message.id ? 'selected' : ''}`}
                onClick={() => handleMessageSelect(message)}
              >
                <div className="message-header">
                  <h3>{message.titulo}</h3>
                </div>
                <div className="message-content">
                  <div className="message-preview">
                    <p>{message.texto.substring(0, 150)}...</p>
                  </div>
                  <div className="message-actions">
                    <button 
                      className="view-full-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openMessageModal(message);
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                      Ver completo
                    </button>
                    {selectedMessage?.id === message.id && (
                      <div className="selected-indicator">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Passo 3: Templates Premium */}
        <div className="process-step" data-tutorial="imagens">
          <div className="step-header">
            <div className="step-number">2</div>
            <div className="step-content">
                   <h2 style={{ fontSize: window.innerWidth <= 768 ? '1.1rem' : '1.25rem' }}>Clique em uma Imagem (Opcional)</h2>
                   <p style={{ fontSize: window.innerWidth <= 768 ? '0.9rem' : '1rem' }}>Selecione a imagem que mais combina com sua mensagem, ou envie apenas a mensagem de texto sem imagem</p>
            </div>
          </div>
          <div className="carousel-container">
            <button className="carousel-arrow carousel-arrow-left" onClick={handlePrevImage}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            
            <div className="carousel-content">
              <div className="carousel-main-image">
                <img 
                  src={templatesDisponiveis[selectedImageIndex].url} 
                  alt={templatesDisponiveis[selectedImageIndex].titulo}
                  onClick={() => openImageModal(templatesDisponiveis[selectedImageIndex])}
                />
                <div className="carousel-image-info">
                  <h3>{templatesDisponiveis[selectedImageIndex].titulo}</h3>
                  <p>{templatesDisponiveis[selectedImageIndex].descricao}</p>
                </div>
                {selectedTemplate?.id === templatesDisponiveis[selectedImageIndex].id && (
                  <div className="selected-badge-carousel">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <span>Selecionada</span>
                  </div>
                )}
                <button 
                  className="select-image-button"
                  onClick={() => handleTemplateSelect(templatesDisponiveis[selectedImageIndex])}
                >
                  {selectedTemplate?.id === templatesDisponiveis[selectedImageIndex].id ? 'Selecionada' : 'Selecionar'}
                </button>
              </div>
              
              <div className="carousel-thumbnails">
                {templatesDisponiveis.map((image, index) => (
                  <div
                    key={image.id}
                    className={`thumbnail ${index === selectedImageIndex ? 'active' : ''} ${selectedTemplate?.id === image.id ? 'selected' : ''}`}
                    onClick={() => setSelectedImageIndex(index)}
                  >
                    <img src={image.url} alt={image.titulo} />
                    {selectedTemplate?.id === image.id && (
                      <div className="thumbnail-selected">
                        <CheckCircle size={20} color="white" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <button className="carousel-arrow carousel-arrow-right" onClick={handleNextImage}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
          
          {/* Botão de baixar imagem */}
          {selectedTemplate && (
            <div className="download-image-section">
              <button
                className="action-button download"
                onClick={downloadSelectedImage}
                disabled={!selectedTemplate}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Baixar Imagem Selecionada
              </button>
            </div>
          )}

          {/* Mensagem Completa - Preview Final */}
          {selectedMessage && (
            <div className="complete-message-card">
              <div className="message-header">
                  <h4>Envie essa mensagem para {activeTab === 'pacientes' ? 'os pacientes' : 'as clínicas'}!</h4>
                <button className="copy-all-button" onClick={copyFullMessage}>
                  <Copy size={16} />
                  Clique para copiar a mensagem
                </button>
              </div>
              <div className="message-full-content">
                {/* Preview da imagem selecionada */}
                {selectedTemplate && (
                  <div className="selected-image-preview">
                    <div className="preview-header">
                      <h5>Imagem Selecionada</h5>
                      <div className="preview-badge">
                        <CheckCircle size={16} color="#10b981" />
                        <span>Selecionada</span>
                      </div>
                    </div>
                    <div className="preview-image-container">
                      <img 
                        src={selectedTemplate.url} 
                        alt={selectedTemplate.titulo}
                        className="preview-image"
                      />
                      <div className="preview-info">
                        <h6>{selectedTemplate.titulo}</h6>
                        <p>{selectedTemplate.descricao}</p>
                      </div>
                    </div>
                    <div className="image-warning" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div className="warning-text">
                        <strong>Importante:</strong> Lembre-se de baixar a imagem selecionada e enviá-la junto com a mensagem para garantir que tudo fique perfeito!
                      </div>
                      <button
                        className="action-button download"
                        onClick={downloadSelectedImage}
                        style={{
                          marginTop: '1rem',
                          padding: '0.5rem 1rem',
                          fontSize: '0.8rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="7 10 12 15 17 10"/>
                          <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        Baixar Imagem
                      </button>
                    </div>
                  </div>
                )}
                
                <div className="message-text">
                  <p>{selectedMessage.texto}</p>
                  <div className="link-attachment">
                    <div className="link-box">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                      </svg>
                      {activeTab === 'clinicas' ? linkClinicas : linkPacientes}
                    </div>
                  </div>
                </div>
                
                {/* Botões de ação no final */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center',
                  gap: '1rem',
                  marginTop: '1.5rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid #e5e7eb',
                  flexWrap: 'wrap'
                }}>
                  <button 
                    className="action-button primary" 
                    onClick={copyFullMessage}
                    style={{
                      padding: window.innerWidth <= 768 ? '0.6rem 1.5rem' : '0.75rem 2rem',
                      fontSize: window.innerWidth <= 768 ? '0.8rem' : '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      minWidth: window.innerWidth <= 768 ? '150px' : '200px'
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                    Clique para copiar a mensagem completa
                  </button>

                  {/* Botão para encontrar clínicas próximas - apenas para tab clínicas */}
                  {activeTab === 'clinicas' && (
                    <button 
                      className="action-button secondary"
                      onClick={() => {
                        // Detectar iOS/Safari
                        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                        const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
                        const isAndroid = /Android/.test(navigator.userAgent);
                        
                        // Função simples para iOS/Safari
                        const openForIOS = () => {
                          // URL do Google Maps que funciona no Safari
                          const googleMapsUrl = `https://www.google.com/maps/search/clínicas+estéticas+ou+odontológicas+near+me`;
                          window.open(googleMapsUrl, '_blank');
                        };
                        
                        // Função para Android
                        const openForAndroid = (lat, lng) => {
                          const mapsUrl = `geo:${lat},${lng}?q=clínicas+estéticas+ou+odontológicas`;
                          window.open(mapsUrl, '_blank');
                        };
                        
                        // Função para outros navegadores
                        const openForOthers = (lat, lng) => {
                          const mapsUrl = `https://www.google.com/maps/search/clínicas+estéticas+ou+odontológicas/@${lat},${lng},15z`;
                          window.open(mapsUrl, '_blank');
                        };
                        
                        // Para iOS/Safari, abrir diretamente sem geolocalização
                        if (isIOS || isSafari) {
                          openForIOS();
                          return;
                        }
                        
                        // Para outros dispositivos, tentar geolocalização
                        if (navigator.geolocation && !isIOS && !isSafari) {
                          navigator.geolocation.getCurrentPosition(
                            (position) => {
                              const { latitude, longitude } = position.coords;
                              if (isAndroid) {
                                openForAndroid(latitude, longitude);
                              } else {
                                openForOthers(latitude, longitude);
                              }
                            },
                            () => {
                              // Se falhar, abrir sem localização
                              if (isAndroid) {
                                openForAndroid(0, 0);
                              } else {
                                openForOthers(0, 0);
                              }
                            },
                            { timeout: 3000 }
                          );
                        } else {
                          // Fallback para todos
                          if (isAndroid) {
                            openForAndroid(0, 0);
                          } else {
                            openForOthers(0, 0);
                          }
                        }
                      }}
                      style={{
                        padding: window.innerWidth <= 768 ? '0.6rem 1.5rem' : '0.75rem 2rem',
                        fontSize: window.innerWidth <= 768 ? '0.8rem' : '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                        border: '2px solid #d1d5db',
                        color: '#374151',
                        fontWeight: '600',
                        minWidth: window.innerWidth <= 768 ? '150px' : '200px'
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                      </svg>
                      Ver clínicas próximas a mim
                    </button>
                  )}
                </div>
              </div>

              
            </div>
          )}
        </div>

        {/* Ações Finais */}
        <div className="final-actions" style={{ padding: window.innerWidth <= 768 ? '0 1.5rem' : '0' }}>
          {/* Seção de Comissões em Destaque */}
          <div 
            data-tutorial="comissoes"
            style={{
              borderRadius: '16px',
              margin: '2rem auto'
            }}>
            <div style={{
              textAlign: 'center',
              color: '#1e293b ',
              marginBottom: '2rem'
            }}>
              <h2 style={{
                fontSize: '2rem',
                fontWeight: '700',
                marginBottom: '0.5rem',
                color: '#1e293b '
              }}>
                Quanto você ganha com suas indicações?
              </h2>
              <p style={{
                fontSize: '1.1rem',
                opacity: 0.95,
                maxWidth: '800px',
                margin: '0 auto'
              }}>
                Receba comissões atrativas por cada indicação que fechar conosco
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : 'repeat(2, 1fr)',
              gap: '1.5rem',
              maxWidth: '900px',
              margin: '0 auto'
            }}>
              {/* Card Clínicas */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '12px',
                padding: '2rem',
                textAlign: 'center',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                border: '3px solid rgba(255, 255, 255, 0.3)',
                transition: 'transform 0.3s ease',
                position: 'relative'
              }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem'
                }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                </div>
                <h3 style={{
                  fontSize: '1.3rem',
                  fontWeight: '700',
                  color: '#1f2937',
                  marginBottom: '1rem'
                }}>
                 Clínicas Estéticas ou Odontológicas
                </h3>
                <div style={{
                  fontSize: '3rem',
                  fontWeight: '800',
                  color: '#10b981',
                  marginBottom: '0.5rem',
                  lineHeight: '1'
                }}>
                  R$ 100
                </div>
                <p style={{
                  fontSize: '1rem',
                  color: '#6b7280',
                  fontWeight: '500',
                  marginBottom: '1rem'
                }}>
                  por clínica indicada
                </p>
                
                {/* Destaque do Bônus ES */}
                <div style={{
                  background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
                  padding: '1rem',
                  borderRadius: '8px',
                  border: '2px solid #f59e0b',
                  marginBottom: '1rem',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: 'linear-gradient(90deg, #f59e0b 0%, #d97706 50%, #f59e0b 100%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 2s linear infinite'
                  }}></div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#92400e',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    marginBottom: '0.25rem',
                    letterSpacing: '0.5px'
                  }}>
                    Bônus Especial
                  </div>
                  <div style={{
                    fontSize: '1.5rem',
                    fontWeight: '800',
                    color: '#f59e0b',
                    marginBottom: '0.25rem'
                  }}>
                    R$ 200
                  </div>
                  <div style={{
                    fontSize: '0.85rem',
                    color: '#92400e',
                    fontWeight: '600'
                  }}>
                    Para clínicas no Espírito Santo ou Curitiba
                  </div>
                </div>
                
                <div style={{
                  background: '#f0fdf4',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #bbf7d0'
                }}>
                  <p style={{
                    fontSize: '0.9rem',
                    color: '#065f46',
                    fontWeight: '600',
                    margin: 0
                  }}>
                    ✓ Pagamento quando a clínica fechar parceria conosco
                  </p>
                </div>
              </div>

              {/* Card Pacientes */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '12px',
                padding: '2rem',
                textAlign: 'center',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                border: '3px solid rgba(255, 255, 255, 0.3)',
                transition: 'transform 0.3s ease'
              }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem'
                }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" style={{ marginLeft: '0.5rem' }}>
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                  </svg>
                </div>
                <h3 style={{
                  fontSize: '1.3rem',
                  fontWeight: '700',
                  color: '#1f2937',
                  marginBottom: '1rem'
                }}>
                  Pacientes
                </h3>
                <div style={{
                  fontSize: '3rem',
                  fontWeight: '800',
                  color: '#3b82f6',
                  marginBottom: '0.5rem',
                  lineHeight: '1'
                }}>
                  R$ 50
                </div>
                <p style={{
                  fontSize: '1rem',
                  color: '#6b7280',
                  fontWeight: '500',
                  marginBottom: '1rem'
                }}>
                  a cada R$ 5.000 do tratamento
                </p>
                <div style={{
                  background: '#eff6ff',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #bfdbfe'
                }}>
                  <p style={{
                    fontSize: '0.9rem',
                    color: '#1e40af',
                    fontWeight: '600',
                    margin: 0
                  }}>
                      Ex: Tratamento de R$ 3.000 = R$ 30 de comissão<br /><br />
                    ✓ Comissão após primeiro pagamento do tratamento
                  </p>
                </div>
              </div>
            </div>
          </div>
          <h3 style={{ fontSize: window.innerWidth <= 768 ? '1.3rem' : '1.5rem', padding: window.innerWidth <= 768 ? '0 1rem' : '0' }}>Tudo pronto!</h3>
          <p style={{ fontSize: window.innerWidth <= 768 ? '0.9rem' : '1rem', padding: window.innerWidth <= 768 ? '0 1rem' : '0' }}>Agora é só compartilhar e acompanhar o status das suas indicações na página Clínicas ou Pacientes. <strong>Todos que se cadastrarem pelo seu link serão atribuídos a você no sistema
          </strong></p>
          <div className="action-buttons" style={{ padding: window.innerWidth <= 768 ? '0 1rem' : '0' }}>
            <button 
              className="action-button primary" 
              onClick={() => window.location.href = '/dashboard'}
              style={{ fontSize: window.innerWidth <= 768 ? '0.85rem' : '1rem' }}
            >
              Ver Dashboard
            </button>
            <button 
              className="action-button secondary" 
              onClick={() => window.location.href = activeTab === 'clinicas' ? '/clinicas' : '/pacientes'}
              style={{ fontSize: window.innerWidth <= 768 ? '0.85rem' : '1rem' }}
            >
              Minhas Indicações
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Visualização de Imagem */}
      {showImageModal && modalImage && (
        <div className="image-modal-overlay" onClick={closeImageModal}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeImageModal}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            <img src={modalImage.url} alt={modalImage.titulo} />
            <div className="modal-image-info">
              <h3>{modalImage.titulo}</h3>
              <p>{modalImage.descricao}</p>
              <button 
                className="modal-select-button"
                onClick={() => {
                  handleTemplateSelect(modalImage);
                  closeImageModal();
                }}
              >
                Selecionar esta imagem
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Visualização de Mensagem */}
      {showMessageModal && modalMessage && (
        <div className="message-modal-overlay" onClick={closeMessageModal}>
          <div className="message-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeMessageModal}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            
            <div className="message-modal-header">
              <h3>{modalMessage.titulo}</h3>
            </div>
            
            <div className="message-modal-body">
              <p>{modalMessage.texto}</p>
            </div>
            
            <div className="message-modal-footer">
              <button 
                className="modal-button secondary"
                onClick={closeMessageModal}
              >
                Fechar
              </button>
              <button 
                className="modal-button primary"
                onClick={selectMessageFromModal}
              >
                Selecionar Modelo
              </button>
            </div>
          </div>
        </div>
      )}

      

      {/* Tutorial Overlay */}
      <TutorialIndicacoes
        isOpen={showTutorial}
        onClose={handleTutorialClose}
        onComplete={handleTutorialComplete}
      />

      {/* Animações CSS */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Indicacoes;
