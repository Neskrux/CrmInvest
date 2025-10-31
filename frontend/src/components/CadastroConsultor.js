import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logoBrasaoPreto from '../images/logohorizontalpreto.png';

const CadastroConsultor = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ 
    nome: '',
    telefone: '',
    email: '',
    senha: '',
    confirmarSenha: '',
    cpf: '',
    pix: '',
    cidade: '',
    estado: '',
    aceitaTermos: false
  });
  
  // Verificar se é cliente da incorporadora (empresa_id = 5)
  const [isClienteIncorporadora, setIsClienteIncorporadora] = useState(() => {
    // Inicializar com o valor correto desde o início
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('cliente') === 'incorporadora';
  });
  const [cidadeCustomizada, setCidadeCustomizada] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  
  // Modal de vídeo obrigatório (consultores normais)
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoTimeWatched, setVideoTimeWatched] = useState(0);
  const [canCloseModal, setCanCloseModal] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [showPlayButton, setShowPlayButton] = useState(false);
  const [showControlButton, setShowControlButton] = useState(false);
  const videoRef = React.useRef(null);

  // Modal de vídeo obrigatório (clientes incorporadora)
  const [showVideoModalIncorporadora, setShowVideoModalIncorporadora] = useState(false);
  const [videoTimeWatchedIncorporadora, setVideoTimeWatchedIncorporadora] = useState(0);
  const [canCloseModalIncorporadora, setCanCloseModalIncorporadora] = useState(false);
  const [videoPlayingIncorporadora, setVideoPlayingIncorporadora] = useState(false);
  const [showPlayButtonIncorporadora, setShowPlayButtonIncorporadora] = useState(false);
  const [showControlButtonIncorporadora, setShowControlButtonIncorporadora] = useState(false);
  const videoRefIncorporadora = React.useRef(null);


  // Meta Pixel - Carregar script do Facebook
  useEffect(() => {
    // Carregar o script do Meta Pixel
    const script = document.createElement('script');
    script.innerHTML = `
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '1981637492627156');
      ${isClienteIncorporadora 
        ? `fbq('track', 'PageView', { content_name: 'Página Cadastro - Incorporadora' });`
        : `fbq('track', 'PageView', { content_name: 'Página Cadastro - Consultor' });`
      }
    `;
    document.head.appendChild(script);

    // Cleanup function
    return () => {
      const existingScript = document.querySelector('script[src="https://connect.facebook.net/en_US/fbevents.js"]');
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
  }, [isClienteIncorporadora]);

  // Modal de vídeo - Abrir na primeira visualização (apenas para consultores normais)
  useEffect(() => {
    // Não mostrar vídeo para clientes da incorporadora
    if (isClienteIncorporadora) {
      return;
    }
    
    // Verificar se já foi mostrado antes (usando localStorage)
    const hasSeenVideo = localStorage.getItem('cadastro-consultor-video-seen');
    
    if (!hasSeenVideo) {
      setShowVideoModal(true);
      setShowControlButton(true); // Mostrar botão inicial
    }
  }, [isClienteIncorporadora]);

  // Modal de vídeo - Abrir na primeira visualização (apenas para clientes incorporadora)
  useEffect(() => {
    // Não mostrar vídeo para consultores normais
    if (!isClienteIncorporadora) {
      return;
    }
    
    // Verificar se já foi mostrado antes (usando localStorage)
    const hasSeenVideo = localStorage.getItem('cadastro-consultor-video-incorporadora-seen');
    
    if (!hasSeenVideo) {
      setShowVideoModalIncorporadora(true);
      setShowControlButtonIncorporadora(true); // Mostrar botão inicial
      setCanCloseModalIncorporadora(false); // Só pode fechar quando vídeo acabar
    }
  }, [isClienteIncorporadora]);

  // Bloquear scroll quando modal estiver aberto (consultores normais)
  useEffect(() => {
    // Não aplicar bloqueio de scroll para clientes da incorporadora
    if (isClienteIncorporadora) {
      return;
    }
    
    if (showVideoModal) {
      // Bloquear scroll
      document.body.style.overflow = 'hidden';
    } else {
      // Liberar scroll
      document.body.style.overflow = 'unset';
    }

    // Cleanup - sempre liberar scroll quando componente desmontar
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showVideoModal, isClienteIncorporadora]);

  // Bloquear scroll quando modal estiver aberto (clientes incorporadora)
  useEffect(() => {
    // Não aplicar bloqueio de scroll para consultores normais
    if (!isClienteIncorporadora) {
      return;
    }
    
    if (showVideoModalIncorporadora) {
      // Bloquear scroll
      document.body.style.overflow = 'hidden';
    } else {
      // Liberar scroll
      document.body.style.overflow = 'unset';
    }

    // Cleanup - sempre liberar scroll quando componente desmontar
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showVideoModalIncorporadora, isClienteIncorporadora]);

  // Forçar play do vídeo quando modal abrir (consultores normais)
  useEffect(() => {
    // Não aplicar para clientes da incorporadora
    if (isClienteIncorporadora) {
      return;
    }
    
    if (showVideoModal && videoRef.current) {
      // Pequeno delay para garantir que o vídeo esteja carregado
      const timer = setTimeout(() => {
        if (videoRef.current) {
          // Garantir que o áudio esteja ativado
          videoRef.current.muted = false;
          videoRef.current.volume = 1;
          
          // Tentar tocar o vídeo
          videoRef.current.play().then(() => {
            setVideoPlaying(true);
            setShowPlayButton(false);
          }).catch(error => {
            setShowPlayButton(true);
            setVideoPlaying(false);
          });
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [showVideoModal, isClienteIncorporadora]);

  // Forçar play do vídeo quando modal abrir (clientes incorporadora)
  useEffect(() => {
    // Não aplicar para consultores normais
    if (!isClienteIncorporadora) {
      return;
    }
    
    if (showVideoModalIncorporadora && videoRefIncorporadora.current) {
      // Pequeno delay para garantir que o vídeo esteja carregado
      const timer = setTimeout(() => {
        if (videoRefIncorporadora.current) {
          // Garantir que o áudio esteja ativado
          videoRefIncorporadora.current.muted = false;
          videoRefIncorporadora.current.volume = 1;
          
          // Tentar tocar o vídeo
          videoRefIncorporadora.current.play().then(() => {
            setVideoPlayingIncorporadora(true);
            setShowPlayButtonIncorporadora(false);
          }).catch(error => {
            setShowPlayButtonIncorporadora(true);
            setVideoPlayingIncorporadora(false);
          });
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [showVideoModalIncorporadora, isClienteIncorporadora]);

  // Função para tocar o vídeo manualmente
  const handlePlayVideo = async () => {
    if (videoRef.current) {
      try {
        videoRef.current.muted = false;
        videoRef.current.volume = 1;
        await videoRef.current.play();
        setVideoPlaying(true);
        setShowPlayButton(false);
        setShowControlButton(true);
        
        // Esconder botão após 2 segundos
        setTimeout(() => {
          setShowControlButton(false);
        }, 2000);
      } catch (error) {
        // Erro ao tocar vídeo
      }
    }
  };

  // Função para pausar o vídeo
  const handlePauseVideo = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      setVideoPlaying(false);
      setShowControlButton(true);
      
      // Esconder botão após 2 segundos
      setTimeout(() => {
        setShowControlButton(false);
      }, 2000);
    }
  };

  // Função para alternar play/pause ao clicar no vídeo
  const handleVideoClick = () => {
    if (videoRef.current) {
      if (videoPlaying) {
        // Se está tocando, pausar
        videoRef.current.pause();
        setVideoPlaying(false);
      } else {
        // Se está pausado, tocar
        videoRef.current.play();
        setVideoPlaying(true);
      }
      
      // Mostrar botão e esconder após 2 segundos
      setShowControlButton(true);
      setTimeout(() => {
        setShowControlButton(false);
      }, 2000);
    }
  };

  // Função para controlar o tempo assistido do vídeo
  const handleVideoTimeUpdate = (e) => {
    const currentTime = e.target.currentTime;
    setVideoTimeWatched(currentTime);
    
    // Permitir fechar após 20 segundos
    if (currentTime >= 20 && !canCloseModal) {
      setCanCloseModal(true);
    }
  };

  // Função para fechar o modal (consultores normais)
  const handleCloseModal = () => {
    if (canCloseModal) {
      setShowVideoModal(false);
      // Marcar como visto no localStorage
      localStorage.setItem('cadastro-consultor-video-seen', 'true');
    }
  };

  // Funções para vídeo da incorporadora
  const handlePlayVideoIncorporadora = async () => {
    if (videoRefIncorporadora.current) {
      try {
        videoRefIncorporadora.current.muted = false;
        videoRefIncorporadora.current.volume = 1;
        await videoRefIncorporadora.current.play();
        setVideoPlayingIncorporadora(true);
        setShowPlayButtonIncorporadora(false);
        setShowControlButtonIncorporadora(true);
        
        // Esconder botão após 2 segundos
        setTimeout(() => {
          setShowControlButtonIncorporadora(false);
        }, 2000);
      } catch (error) {
        // Erro ao tocar vídeo
      }
    }
  };

  const handlePauseVideoIncorporadora = () => {
    if (videoRefIncorporadora.current) {
      videoRefIncorporadora.current.pause();
      setVideoPlayingIncorporadora(false);
      setShowControlButtonIncorporadora(true);
      
      // Esconder botão após 2 segundos
      setTimeout(() => {
        setShowControlButtonIncorporadora(false);
      }, 2000);
    }
  };

  const handleVideoClickIncorporadora = () => {
    if (videoRefIncorporadora.current) {
      if (videoPlayingIncorporadora) {
        // Se está tocando, pausar
        videoRefIncorporadora.current.pause();
        setVideoPlayingIncorporadora(false);
      } else {
        // Se está pausado, tocar
        videoRefIncorporadora.current.play();
        setVideoPlayingIncorporadora(true);
      }
      
      // Mostrar botão e esconder após 2 segundos
      setShowControlButtonIncorporadora(true);
      setTimeout(() => {
        setShowControlButtonIncorporadora(false);
      }, 2000);
    }
  };

  const handleVideoTimeUpdateIncorporadora = (e) => {
    const currentTime = e.target.currentTime;
    setVideoTimeWatchedIncorporadora(currentTime);
    // Sem bloqueio de tempo para incorporadora - vídeo é curto
  };

  const handleVideoEndIncorporadora = () => {
    // Quando vídeo acabar, permitir fechar
    setCanCloseModalIncorporadora(true);
  };

  const handleCloseModalIncorporadora = () => {
    // Só permite fechar quando vídeo terminou
    if (canCloseModalIncorporadora) {
      setShowVideoModalIncorporadora(false);
      // Marcar como visto no localStorage
      localStorage.setItem('cadastro-consultor-video-incorporadora-seen', 'true');
    }
  };

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

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone) => {
    const phoneRegex = /^\(\d{2}\) \d{4,5}-\d{4}$/;
    return phoneRegex.test(phone);
  };

  const formatCPF = (value) => {
    value = value.replace(/\D/g, '');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    return value;
  };

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

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Meta Pixel - Tracking quando usuário inicia preenchimento do formulário
    if (window.fbq && formData.nome === '' && name === 'nome' && value.trim()) {
      if (isClienteIncorporadora) {
        window.fbq('track', 'InitiateCheckout', {
          content_name: 'Formulário de Cadastro - Incorporadora',
          content_category: 'Lead Generation - Incorporadora'
        });
      } else {
        window.fbq('track', 'InitiateCheckout', {
          content_name: 'Formulário de Cadastro - Consultor',
          content_category: 'Lead Generation - Consultor'
        });
      }
    }
    
    let formattedValue = value;
    
    if (name === 'cpf') {
      formattedValue = formatCPF(value);
    } else if (name === 'telefone') {
      formattedValue = formatPhone(value);
    } else if (name === 'pix') {
      formattedValue = formatCPF(value);
    } else if (name === 'nome') {
      formattedValue = formatarNome(value);
    } else if (name === 'cidade') {
      formattedValue = formatarCidade(value);
    } else if (name === 'estado') {
      // Resetar cidade e cidadeCustomizada quando estado muda
      setFormData(prev => ({ ...prev, [name]: value, cidade: '' }));
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
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : formattedValue
    }));
    
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
    
    if (!formData.telefone.trim()) {
      newErrors.telefone = 'Telefone é obrigatório';
    } else if (!validatePhone(formData.telefone)) {
      newErrors.telefone = 'Telefone inválido';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'E-mail é obrigatório';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'E-mail inválido';
    }
    
    if (!formData.senha) {
      newErrors.senha = 'Senha é obrigatória';
    } else if (formData.senha.length < 6) {
      newErrors.senha = 'Senha deve ter pelo menos 6 caracteres';
    }
    
    if (!formData.confirmarSenha) {
      newErrors.confirmarSenha = 'Confirmação de senha é obrigatória';
    } else if (formData.senha !== formData.confirmarSenha) {
      newErrors.confirmarSenha = 'Senhas não conferem';
    }
    
    if (!formData.cpf.trim()) {
      newErrors.cpf = 'CPF é obrigatório';
    } else if (!validateCPF(formData.cpf)) {
      newErrors.cpf = 'CPF inválido';
    }
    
    if (!formData.pix.trim()) {
      newErrors.pix = 'PIX é obrigatório';
    } else if (!validateCPF(formData.pix)) {
      newErrors.pix = 'PIX deve ser um CPF válido';
    } else if (formData.pix.replace(/\D/g, '') !== formData.cpf.replace(/\D/g, '')) {
      newErrors.pix = 'PIX deve ser igual ao CPF informado';
    }
    
    if (!formData.estado.trim()) {
      newErrors.estado = 'Estado é obrigatório';
    }
    
    if (!formData.cidade.trim()) {
      newErrors.cidade = 'Cidade é obrigatória';
    }
    
    if (!formData.aceitaTermos) {
      newErrors.aceitaTermos = 'Você deve aceitar os termos de uso';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL || 
        (process.env.NODE_ENV === 'production' 
          ? 'https://crminvest-backend.fly.dev/api'
          : 'http://localhost:5000/api');
      
      const response = await fetch(`${API_BASE_URL}/consultores/cadastro`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome: formData.nome,
          telefone: formData.telefone,
          email: formData.email,
          senha: formData.senha,
          cpf: formData.cpf.replace(/\D/g, ''),
          pix: formData.pix.replace(/\D/g, ''),
          cidade: formData.cidade,
          estado: formData.estado,
          tipo: 'consultor',
          empresa_id: isClienteIncorporadora ? 5 : null, // Incorporadora
          is_freelancer: isClienteIncorporadora ? true : false
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Meta Pixel - Evento de cadastro bem-sucedido
        if (window.fbq) {
          if (isClienteIncorporadora) {
            // Evento específico para clientes da incorporadora
            window.fbq('track', 'CompleteRegistration', {
              content_name: 'Cadastro Concluído - Incorporadora',
              content_category: 'Lead Generation - Incorporadora'
            });
          } else {
            // Evento para consultores normais
            window.fbq('track', 'CompleteRegistration', {
              content_name: 'Cadastro Concluído - Consultor',
              content_category: 'Lead Generation - Consultor'
            });
          }
        }
        
        if (isClienteIncorporadora) {
          navigate('/indicacoes');
        } else {
          navigate('/cadastro-sucesso');
        }
      } else {
        // Meta Pixel - Evento de erro no cadastro
        if (window.fbq) {
          if (isClienteIncorporadora) {
            window.fbq('track', 'Lead', {
              content_name: 'Tentativa de Cadastro - Erro - Incorporadora',
              content_category: 'Lead Generation - Incorporadora'
            });
          } else {
            window.fbq('track', 'Lead', {
              content_name: 'Tentativa de Cadastro - Erro - Consultor',
              content_category: 'Lead Generation - Consultor'
            });
          }
        }
        
        let errorMsg = data.error || 'Erro ao cadastrar consultor';
        if (errorMsg && errorMsg.toLowerCase().includes('consultores_email_key')) {
          errorMsg = 'Já existe um consultor cadastrado com este e-mail. Por favor, utilize outro e-mail.';
        }
        setErrors({ general: errorMsg });
      }
    } catch (error) {
      setErrors({ general: 'Erro de conexão. Tente novamente.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1d23 0%, #2d3748 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '8px',
        padding: '2rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
        border: '1px solid #e5e7eb',
        width: '100%',
        maxWidth: '600px'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img 
            src={logoBrasaoPreto} 
            alt="Solumn" 
            style={{ 
              height: '85px', 
              objectFit: 'contain',
              marginBottom: '1rem'
            }} 
          />
          <h1 style={{
            fontSize: '2rem',
            fontWeight: '700',
            color: '#1a1d23',
            marginBottom: '0.75rem',
            letterSpacing: '-0.025em'
          }}>
            Faça seu cadastro
          </h1>
          <p style={{
            fontSize: '1rem',
            color: '#4b5563',
            lineHeight: '1.5',
            marginBottom: '1rem'
          }}>
            {isClienteIncorporadora 
              ? 'Preencha os dados abaixo para acessar o sistema de indicações'
              : 'Preencha os dados abaixo para criar sua conta'
            }
          </p>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
            color: '#6b7280'
          }}>
            <span>{isClienteIncorporadora ? 'Já possui acesso?' : 'Já possui uma conta?'}</span>
            <button
              type="button"
              onClick={() => navigate('/login')}
              style={{
                background: 'none',
                border: 'none',
                color: '#1a1d23',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: 0,
                transition: 'color 0.15s ease'
              }}
              onMouseOver={(e) => e.target.style.color = '#0f1114'}
              onMouseOut={(e) => e.target.style.color = '#1a1d23'}
            >
              {isClienteIncorporadora ? 'Fazer login' : 'Fazer login'}
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label">Nome Completo *</label>
              <input
                type="text"
                name="nome"
                className="form-input"
                placeholder="Digite seu nome completo"
                value={formData.nome}
                onChange={handleChange}
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Telefone *</label>
                <input
                  type="text"
                  name="telefone"
                  className="form-input"
                  placeholder="(11) 99999-9999"
                  value={formData.telefone}
                  onChange={handleChange}
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
                <label className="form-label">E-mail *</label>
                <input
                  type="email"
                  name="email"
                  className="form-input"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  style={{
                    borderColor: errors.email ? '#ef4444' : '#d1d5db'
                  }}
                />
                {errors.email && (
                  <span style={{ color: '#ef4444', fontSize: '0.875rem' }}>
                    {errors.email}
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Senha *</label>
                <input
                  type="password"
                  name="senha"
                  className="form-input"
                  placeholder="••••••••"
                  value={formData.senha}
                  onChange={handleChange}
                  style={{
                    borderColor: errors.senha ? '#ef4444' : '#d1d5db'
                  }}
                />
                {errors.senha && (
                  <span style={{ color: '#ef4444', fontSize: '0.875rem' }}>
                    {errors.senha}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Repetir Senha *</label>
                <input
                  type="password"
                  name="confirmarSenha"
                  className="form-input"
                  placeholder="••••••••"
                  value={formData.confirmarSenha}
                  onChange={handleChange}
                  style={{
                    borderColor: errors.confirmarSenha ? '#ef4444' : '#d1d5db'
                  }}
                />
                {errors.confirmarSenha && (
                  <span style={{ color: '#ef4444', fontSize: '0.875rem' }}>
                    {errors.confirmarSenha}
                  </span>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Estado *</label>
              <select
                name="estado"
                className="form-input"
                value={formData.estado}
                onChange={handleChange}
                required
                style={{
                  borderColor: errors.estado ? '#ef4444' : '#d1d5db'
                }}
              >
                <option value="">Selecione seu estado</option>
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
              <label className="form-label">Cidade *</label>
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
                      handleChange(e);
                    }
                  }}
                  required
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
                    onChange={handleChange}
                    placeholder="Digite o nome da cidade"
                    disabled={!formData.estado}
                    required
                    style={{
                      borderColor: errors.cidade ? '#ef4444' : '#d1d5db',
                      flex: 1
                    }}
                  />
                  {formData.estado && cidadesPorEstado[formData.estado] && cidadeCustomizada && (
                    <button
                      type="button"
                      onClick={() => {
                        setCidadeCustomizada(false);
                        setFormData(prev => ({ ...prev, cidade: '' }));
                      }}
                      style={{
                        whiteSpace: 'nowrap',
                        fontSize: '0.875rem',
                        padding: '0.75rem 1rem',
                        background: 'white',
                        color: '#1a1d23',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.background = '#f9fafb';
                        e.target.style.borderColor = '#9ca3af';
                      }}
                      onMouseOut={(e) => {
                        e.target.style.background = 'white';
                        e.target.style.borderColor = '#d1d5db';
                      }}
                    >
                      Voltar
                    </button>
                  )}
                </div>
              )}
              {errors.cidade && (
                <span style={{ color: '#ef4444', fontSize: '0.875rem' }}>
                  {errors.cidade}
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">CPF *</label>
                <input
                  type="text"
                  name="cpf"
                  className="form-input"
                  placeholder="000.000.000-00"
                  value={formData.cpf}
                  onChange={handleChange}
                  maxLength="14"
                  style={{
                    borderColor: errors.cpf ? '#ef4444' : '#d1d5db'
                  }}
                />
                {errors.cpf && (
                  <span style={{ color: '#ef4444', fontSize: '0.875rem' }}>
                    {errors.cpf}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">PIX (CPF) *</label>
                <input
                  type="text"
                  name="pix"
                  className="form-input"
                  placeholder="000.000.000-00"
                  value={formData.pix}
                  onChange={handleChange}
                  maxLength="14"
                  style={{
                    borderColor: errors.pix ? '#ef4444' : '#d1d5db'
                  }}
                />
                {errors.pix && (
                  <span style={{ color: '#ef4444', fontSize: '0.875rem' }}>
                    {errors.pix}
                  </span>
                )}
              </div>
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  name="aceitaTermos"
                  checked={formData.aceitaTermos}
                  onChange={handleChange}
                  style={{
                    width: '1.25rem',
                    height: '1.25rem',
                    accentColor: '#1a1d23'
                  }}
                />
                <span style={{ fontSize: '0.875rem', color: '#374151' }}>
                  Aceito os{' '}
                  <a href="https://idicuetpukxjqripbpwa.supabase.co/storage/v1/object/public/materiais-apoio/documento_1761076690439_294882875.docx" style={{ color: '#1a1d23', textDecoration: 'underline' }}>
                    termos de uso
                  </a>{' '}
                  para utilizar o sistema
                </span>
              </label>
              {errors.aceitaTermos && (
                <span style={{ color: '#ef4444', fontSize: '0.875rem' }}>
                  {errors.aceitaTermos}
                </span>
              )}
            </div>

            {errors.general && (
              <div style={{
                padding: '1rem',
                background: '#fee2e2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                color: '#dc2626',
                fontSize: '0.875rem'
              }}>
                {errors.general}
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button
                type="button"
                onClick={() => navigate('/')}
                style={{
                  flex: '1',
                  padding: '0.75rem',
                  background: 'white',
                  color: '#1a1d23',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '1rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = '#f9fafb';
                  e.target.style.borderColor = '#9ca3af';
                }}
                onMouseOut={(e) => {
                  e.target.style.background = 'white';
                  e.target.style.borderColor = '#d1d5db';
                }}
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  flex: '2',
                  padding: '0.75rem',
                  background: loading ? '#9ca3af' : '#1a1d23',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '1rem',
                  fontWeight: '500',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseOver={(e) => {
                  if (!loading) {
                    e.target.style.background = '#0f1114';
                    e.target.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!loading) {
                    e.target.style.background = '#1a1d23';
                    e.target.style.transform = 'translateY(0)';
                  }
                }}
              >
                {loading ? 'Cadastrando...' : (isClienteIncorporadora ? 'Acessar Sistema' : 'Cadastrar')}
              </button>
            </div>
          </div>
        </form>

        {/* Info Box */}
        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          background: '#f9fafb',
          borderRadius: '6px',
          border: '1px solid #e5e7eb'
        }}>
          <h4 style={{ 
            color: '#374151', 
            fontSize: '0.875rem', 
            fontWeight: '600', 
            marginBottom: '0.5rem' 
          }}>
            Informações importantes:
          </h4>
          <ul style={{ 
            color: '#6b7280', 
            fontSize: '0.75rem', 
            margin: 0, 
            paddingLeft: '1rem',
            lineHeight: '1.4'
          }}>
            {isClienteIncorporadora ? (
              <>
                <li>Seu PIX deve ser o mesmo CPF informado</li>
                <li>Você receberá R$ 3.000 para estúdios e R$ 5.000 para apartamentos</li>
                <li>Seu login será feito com o e-mail informado</li>
                <li>Acesso direto ao sistema de indicações</li>
              </>
            ) : (
              <>
                <li>Seu PIX deve ser o mesmo CPF informado</li>
                <li>Você receberá R$ 50 de comissão a cada R$ 5.000 fechados</li>
                <li>Seu login será feito com o e-mail informado</li>
              </>
            )}
          </ul>
        </div>
      </div>

      {/* Modal de Vídeo Obrigatório */}
      {showVideoModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '2rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '400px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'hidden',
            position: 'relative'
          }}>
            {/* Header do Modal */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h2 style={{
                fontSize: '1.2rem',
                fontWeight: '700',
                color: '#1a1d23',
                margin: 0
              }}>
                Boas vindas ao Solumn
              </h2>
              {canCloseModal ? (
                <button
                  onClick={handleCloseModal}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.2rem',
                    color: '#6b7280',
                    cursor: 'pointer',
                    padding: '0.5rem',
                    borderRadius: '50%',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.backgroundColor = '#f3f4f6';
                    e.target.style.color = '#374151';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.color = '#6b7280';
                  }}
                >
                  ✕
                </button>
              ) : (
                <div style={{
                  position: 'relative',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {/* Círculo de fundo */}
                  <div style={{
                    position: 'absolute',
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    border: '3px solid #e5e7eb',
                    background: 'transparent'
                  }} />
                  
                  {/* Círculo de progresso - preenchimento */}
                  <div style={{
                    position: 'absolute',
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: `conic-gradient(#1a1d23 0deg, #1a1d23 ${(videoTimeWatched / 20) * 360}deg, transparent ${(videoTimeWatched / 20) * 360}deg)`,
                    transition: 'background 0.3s ease'
                  }} />
                  
                  {/* Máscara interna para criar o efeito de anel */}
                  <div style={{
                    position: 'absolute',
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    background: 'white',
                    top: '3px',
                    left: '3px'
                  }} />
                  
                  {/* Texto do tempo */}
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#1a1d23',
                    zIndex: 1
                  }}>
                    {Math.ceil(20 - videoTimeWatched)}
                  </span>
                </div>
              )}
            </div>

            {/* Vídeo */}
            <div style={{
              borderRadius: '8px',
              overflow: 'hidden',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              position: 'relative'
            }}>
               <video
                 ref={videoRef}
                 src="/video-produto.mp4" // Substitua pelo nome do seu vídeo
                 controls={false} // Controles sempre desabilitados
                 autoPlay
                 muted={false} // Sempre com áudio
                 onTimeUpdate={handleVideoTimeUpdate}
                 onPlay={() => setVideoPlaying(true)}
                 onPause={() => setVideoPlaying(false)}
                 onClick={handleVideoClick}
                onSeeked={(e) => {
                  // Bloquear avanço - voltar para posição atual se tentar pular
                  if (!canCloseModal && e.target.currentTime > videoTimeWatched) {
                    e.target.currentTime = videoTimeWatched;
                  }
                }}
                onSeeking={(e) => {
                  // Bloquear navegação temporal se ainda não pode fechar
                  if (!canCloseModal) {
                    e.target.currentTime = videoTimeWatched;
                  }
                }}
                style={{
                  width: '80%',
                  objectFit: 'cover',
                  cursor: 'pointer' // Cursor de clique
                }}
              >
                Seu navegador não suporta vídeos.
              </video>

              {/* Botão de Play - quando vídeo está pausado */}
              {!videoPlaying && showControlButton && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 10
                }}>
                  <button
                    onClick={handlePlayVideo}
                    style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      background: 'rgba(0, 0, 0, 0.8)',
                      border: 'none',
                      color: 'white',
                      fontSize: '2rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.background = 'rgba(0, 0, 0, 0.9)';
                      e.target.style.transform = 'scale(1.1)';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.background = 'rgba(0, 0, 0, 0.8)';
                      e.target.style.transform = 'scale(1)';
                    }}
                  >
                    ▶
                  </button>
                </div>
              )}

              {/* Botão de Pause - quando vídeo está tocando */}
              {videoPlaying && showControlButton && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 10
                }}>
                  <button
                    onClick={handlePauseVideo}
                    style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      background: 'rgba(0, 0, 0, 0.8)',
                      border: 'none',
                      color: 'white',
                      fontSize: '2rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.background = 'rgba(0, 0, 0, 0.9)';
                      e.target.style.transform = 'scale(1.1)';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.background = 'rgba(0, 0, 0, 0.8)';
                      e.target.style.transform = 'scale(1)';
                    }}
                  >
                    ⏸
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Modal de Vídeo Obrigatório - Incorporadora */}
      {showVideoModalIncorporadora && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '2rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '400px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'hidden',
            position: 'relative'
          }}>
            {/* Header do Modal */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h2 style={{
                fontSize: '1.2rem',
                fontWeight: '700',
                color: '#1a1d23',
                margin: 0
              }}>
                Boas vindas ao Solumn
              </h2>
              {canCloseModalIncorporadora && (
                <button
                  onClick={handleCloseModalIncorporadora}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.2rem',
                    color: '#6b7280',
                    cursor: 'pointer',
                    padding: '0.5rem',
                    borderRadius: '50%',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.backgroundColor = '#f3f4f6';
                    e.target.style.color = '#374151';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.color = '#6b7280';
                  }}
                >
                  ✕
                </button>
              )}
              {!canCloseModalIncorporadora && (
                <div style={{ width: '40px', height: '40px' }}></div>
              )}
            </div>

            {/* Vídeo */}
            <div style={{
              borderRadius: '8px',
              overflow: 'hidden',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              position: 'relative'
            }}>
               <video
                 ref={videoRefIncorporadora}
                 src="/video-produto-incorp.mp4"
                 controls={false} // Controles sempre desabilitados
                 autoPlay
                 muted={false} // Sempre com áudio
                 onTimeUpdate={handleVideoTimeUpdateIncorporadora}
                 onPlay={() => setVideoPlayingIncorporadora(true)}
                 onPause={() => setVideoPlayingIncorporadora(false)}
                 onEnded={handleVideoEndIncorporadora}
                 onClick={handleVideoClickIncorporadora}
                 style={{
                  width: '80%',
                  objectFit: 'cover',
                  cursor: 'pointer' // Cursor de clique
                }}
              >
                Seu navegador não suporta vídeos.
              </video>

              {/* Botão de Play - quando vídeo está pausado */}
              {!videoPlayingIncorporadora && showControlButtonIncorporadora && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 10
                }}>
                  <button
                    onClick={handlePlayVideoIncorporadora}
                    style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      background: 'rgba(0, 0, 0, 0.8)',
                      border: 'none',
                      color: 'white',
                      fontSize: '2rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.background = 'rgba(0, 0, 0, 0.9)';
                      e.target.style.transform = 'scale(1.1)';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.background = 'rgba(0, 0, 0, 0.8)';
                      e.target.style.transform = 'scale(1)';
                    }}
                  >
                    ▶
                  </button>
                </div>
              )}

              {/* Botão de Pause - quando vídeo está tocando */}
              {videoPlayingIncorporadora && showControlButtonIncorporadora && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 10
                }}>
                  <button
                    onClick={handlePauseVideoIncorporadora}
                    style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      background: 'rgba(0, 0, 0, 0.8)',
                      border: 'none',
                      color: 'white',
                      fontSize: '2rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.background = 'rgba(0, 0, 0, 0.9)';
                      e.target.style.transform = 'scale(1.1)';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.background = 'rgba(0, 0, 0, 0.8)';
                      e.target.style.transform = 'scale(1)';
                    }}
                  >
                    ⏸
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CadastroConsultor; 
