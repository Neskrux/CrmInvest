import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sparkles, Trophy, Gem, Lock, Check, Star } from 'lucide-react';
import logoBrasao from '../assets/images/logobrasao-selo.png';
import { apiConfig } from '../config';

const CapturaClientes = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    empreendimento_id: '',
    cidade: '',
    estado: '',
    observacoes: '',
    melhor_dia1: '',
    melhor_horario1: '',
    melhor_dia2: '',
    melhor_horario2: '',
    sdr_id: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [cidadeCustomizada, setCidadeCustomizada] = useState(false);
  const [refConsultor, setRefConsultor] = useState(null);
  const [nomeConsultor, setNomeConsultor] = useState(null);
  const [sdrsIncorporadora, setSdrsIncorporadora] = useState([]);

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

  // Capturar parâmetro de referência da URL
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const refParam = urlParams.get('ref');
    
    if (refParam && refParam.trim() !== '') {
      const codigoLimpo = refParam.trim();
      setRefConsultor(codigoLimpo);
      
    } else {
      setRefConsultor(null);
    }
  }, [location]);

  // Google Analytics
  useEffect(() => {
    // Carregar o script do Google Analytics
    const script1 = document.createElement('script');
    script1.async = true;
    script1.src = 'https://www.googletagmanager.com/gtag/js?id=AW-17515519025';
    document.head.appendChild(script1);

    // Configurar o gtag
    window.dataLayer = window.dataLayer || [];
    function gtag(){window.dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'AW-17515519025');

    // Cleanup function
    return () => {
      // Remover o script quando o componente for desmontado
      const existingScript = document.querySelector('script[src="https://www.googletagmanager.com/gtag/js?id=AW-17515519025"]');
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
  }, []);

  // Buscar SDRs da incorporadora
  useEffect(() => {
    fetchSDRsIncorporadora();
  }, []);

  const fetchSDRsIncorporadora = async () => {
    try {
      const response = await fetch(`${apiConfig.API_BASE_URL}/consultores/sdrs-incorporadora`);
      const data = await response.json();
      if (response.ok) {
        setSdrsIncorporadora(data);
      }
    } catch (error) {
      console.error('Erro ao carregar SDRs:', error);
    }
  };

  // Função para formatar telefone (formato brasileiro correto)
  const formatarTelefone = (value) => {
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
  };

  // Função para formatar nome (mesmo padrão da migração do banco)
  const formatarNome = (value) => {
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'nome') {
      // Para nome, permitir digitação normal (incluindo espaços) e formatar apenas no final
      setFormData(prev => ({ ...prev, [name]: value }));
    } else if (name === 'telefone') {
      // Para telefone, permitir apenas números durante a digitação
      const numbersOnly = value.replace(/\D/g, '');
      const formattedValue = numbersOnly.length > 0 ? formatarTelefone(numbersOnly) : '';
      setFormData(prev => ({ ...prev, [name]: formattedValue }));
    } else if (name === 'cidade') {
      const formattedValue = formatarCidade(value);
      setFormData(prev => ({ ...prev, [name]: formattedValue }));
    } else if (name === 'estado') {
      // Resetar cidade e cidadeCustomizada quando estado muda
      setFormData(prev => ({ ...prev, [name]: value, cidade: '' }));
      setCidadeCustomizada(false);
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Limpar erro do campo quando o usuário começar a digitar
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
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

  // Função para formatar data com máscara DD/MM/YYYY
  const formatarData = (value) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');
    
    // Aplica máscara conforme vai digitando
    if (numbers.length <= 2) {
      return numbers;
    } else if (numbers.length <= 4) {
      return `${numbers.substring(0, 2)}/${numbers.substring(2)}`;
    } else if (numbers.length <= 8) {
      return `${numbers.substring(0, 2)}/${numbers.substring(2, 4)}/${numbers.substring(4)}`;
    } else {
      // Limita a 8 dígitos (DDMMYYYY)
      return `${numbers.substring(0, 2)}/${numbers.substring(2, 4)}/${numbers.substring(4, 8)}`;
    }
  };

  // Função para validar data formatada (mantém formato DD/MM/YYYY)
  const validarDataFormatada = (dataFormatada) => {
    if (!dataFormatada || dataFormatada.length < 10) return '';
    
    const [dia, mes, ano] = dataFormatada.split('/');
    if (dia && mes && ano && ano.length === 4) {
      // Validar se é uma data válida
      const data = new Date(`${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`);
      if (!isNaN(data.getTime())) {
        return dataFormatada; // Retorna no formato DD/MM/YYYY
      }
    }
    return '';
  };

  // Função para validar e formatar data (onBlur)
  const handleDataChange = (e) => {
    const { name, value } = e.target;
    
    if (value && value.length === 10) {
      // Validar data formatada
      const dataValidada = validarDataFormatada(value);
      
      if (dataValidada) {
        const [dia, mes, ano] = value.split('/');
        const anoNum = parseInt(ano);
        
        // Verificar se ano está entre 2024-2030
        if (anoNum >= 2024 && anoNum <= 2030) {
          // Data válida, manter como está
          return;
        } else {
          // Ano inválido, limpar campo
          setFormData(prev => ({
            ...prev,
            [name]: ''
          }));
        }
      } else {
        // Data inválida, limpar campo
        setFormData(prev => ({
          ...prev,
          [name]: ''
        }));
      }
    }
  };

  // Função para lidar com digitação manual de data
  const handleDataInput = (e) => {
    const { name, value } = e.target;
    
    // Aplicar máscara de formatação
    const dataFormatada = formatarData(value);
    
    setFormData(prev => ({
      ...prev,
      [name]: dataFormatada
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    } else if (formData.nome.trim().length < 2) {
      newErrors.nome = 'Nome deve ter pelo menos 2 caracteres';
    }
    
    if (!formData.telefone.trim()) {
      newErrors.telefone = 'Telefone é obrigatório';
    } else if (formData.telefone.replace(/\D/g, '').length < 10) {
      newErrors.telefone = 'Telefone deve ter pelo menos 10 dígitos';
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
    
    // Concatenar os melhores dias/horários à observação
    let observacoesComDias = formData.observacoes || '';
    if (formData.melhor_dia1 && formData.melhor_horario1) {
      observacoesComDias += `\n1º Melhor dia/horário: ${formData.melhor_dia1} às ${formData.melhor_horario1}`;
    }
    if (formData.melhor_dia2 && formData.melhor_horario2) {
      observacoesComDias += `\n2º Melhor dia/horário: ${formData.melhor_dia2} às ${formData.melhor_horario2}`;
    }
    const formDataToSend = {
      ...formData,
      observacoes: observacoesComDias,
      ref_consultor: refConsultor, // Incluir código de referência se existir
      origem_formulario: 'captura-clientes', // Identificar origem do formulário
      sdr_id: formData.sdr_id || null // ADICIONAR
    };


    try {
      const response = await fetch(`${apiConfig.API_BASE_URL}/leads/cadastro`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formDataToSend)
      });
      
      console.log('📡 Resposta do servidor:', response.status, response.statusText);
      
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('❌ Erro ao parsear JSON:', jsonError);
        const text = await response.text();
        console.error('❌ Resposta em texto:', text);
        setErrors({ general: 'Erro ao processar resposta do servidor.' });
        setLoading(false);
        return;
      }
      
      console.log('📦 Dados recebidos:', data);
      
      if (response.ok) {
        navigate('/captura-sucesso-clientes', { 
          state: { 
            nome: data.nome,
            message: data.message,
            consultor_referencia: data.consultor_referencia
          } 
        });
      } else {
        console.error('❌ Erro na resposta:', data);
        setErrors({ general: data.error || 'Erro ao enviar cadastro' });
      }
    } catch (error) {
      console.error('❌ Erro no cadastro:', error);
      setErrors({ general: 'Erro de conexão. Tente novamente.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="captura-lead-container">
      <div className="captura-background">
        <div className="captura-content">
          {/* Header com Logo */}
          <div className="captura-header">
            <img src={logoBrasao} alt="Logo" className="captura-logo" />
            <h1 className="captura-title">
              Realize o sonho do seu <span className="highlight">novo lar</span>
            </h1>
            <p className="captura-subtitle">
            Descubra um novo padrão de conforto, design e exclusividade.
            Agende sua visita e veja como é possível conquistar seu espaço dos sonhos com condições facilitadas.
            </p>
          </div>

          
                     
          {/* Formulário */}
          <div className="captura-form-container">
            <h2 className="form-title">Preencha seus dados</h2>
            <p className="form-subtitle">
            Em breve entraremos em contato para agendar sua visita.
            </p>

            {errors.general && (
              <div className="error-message">
                {errors.general}
              </div>
            )}

            <form onSubmit={handleSubmit} className="captura-form">
              <div className="form-group">
                <label className="form-label">Nome Completo *</label>
                <input
                  type="text"
                  name="nome"
                  className={`form-input ${errors.nome ? 'error' : ''}`}
                  value={formData.nome}
                  onChange={handleInputChange}
                  onBlur={handleNomeBlur}
                  placeholder="Digite seu nome completo"
                  disabled={loading}
                />
                {errors.nome && <span className="field-error">{errors.nome}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Email (opcional)</label>   
                <input
                  type="email"
                  name="email"
                  className={`form-input ${errors.email ? 'error' : ''}`}
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Digite um email válido (opcional)"
                  disabled={loading}
                />
                {errors.email && <span className="field-error">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">WhatsApp *</label>
                <input
                  type="tel"
                  name="telefone"
                  className={`form-input ${errors.telefone ? 'error' : ''}`}
                  value={formData.telefone}
                  onChange={handleInputChange}
                  placeholder="(11) 99999-9999"
                  disabled={loading}
                />
                {errors.telefone && <span className="field-error">{errors.telefone}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Escolha um empreendimento de interesse</label>
                <select
                  name="empreendimento_id"
                  className="form-select"
                  value={formData.empreendimento_id}
                  onChange={handleInputChange}
                  disabled={loading}
                >
                  <option value="">Selecione (opcional)</option>
                  <option value="4">Laguna Sky Garden</option>
                  <option value="5">Residencial Girassol</option>
                  <option value="6">Sintropia Sky Garden</option>
                  <option value="7">Residencial Lotus</option>
                  <option value="8">River Sky Garden</option>
                  <option value="9">Condomínio Figueira Garcia</option>
                  <option value="">Ainda não decidi</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Estado</label>
                <select
                  name="estado"
                  className="form-select"
                  value={formData.estado}
                  onChange={handleInputChange}
                  disabled={loading}
                >
                  <option value="">Selecione seu estado</option>
                  {estadosBrasileiros.map(estado => (
                    <option key={estado.sigla} value={estado.sigla}>
                      {estado.sigla} - {estado.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Cidade</label>
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
                    disabled={loading}
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
                      disabled={loading || !formData.estado}
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
                        disabled={loading}
                      >
                        Voltar
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Quer ser atendido por quem?</label>
                <select
                  name="sdr_id"
                  className="form-select"
                  value={formData.sdr_id}
                  onChange={handleInputChange}
                  disabled={loading}
                >
                  <option value="">Selecione um atendente (opcional)</option>
                  {sdrsIncorporadora.map(sdr => (
                    <option key={sdr.id} value={sdr.id}>
                      {sdr.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">1ª Opção - Melhor dia para agendamento</label>
                <input
                  type="text"
                  name="melhor_dia1"
                  className="form-input"
                  value={formData.melhor_dia1}
                  onChange={handleDataInput}
                  onBlur={handleDataChange}
                  disabled={loading}
                  placeholder="DD/MM/YYYY"
                  maxLength="10"
                />
              </div>
              <div className="form-group">
                <label className="form-label">1ª Opção - Melhor horário</label>
                <select
                  name="melhor_horario1"
                  className="form-select"
                  value={formData.melhor_horario1}
                  onChange={handleInputChange}
                  disabled={loading}
                >
                  <option value="">Selecione o horário</option>
                  <option value="08:00">08:00</option>
                  <option value="08:30">08:30</option>
                  <option value="09:00">09:00</option>
                  <option value="09:30">09:30</option>
                  <option value="10:00">10:00</option>
                  <option value="10:30">10:30</option>
                  <option value="11:00">11:00</option>
                  <option value="11:30">11:30</option>
                  <option value="12:00">12:00</option>
                  <option value="12:30">12:30</option>
                  <option value="13:00">13:00</option>
                  <option value="13:30">13:30</option>
                  <option value="14:00">14:00</option>
                  <option value="14:30">14:30</option>
                  <option value="15:00">15:00</option>
                  <option value="15:30">15:30</option>
                  <option value="16:00">16:00</option>
                  <option value="16:30">16:30</option>
                  <option value="17:00">17:00</option>
                  <option value="17:30">17:30</option>
                  <option value="18:00">18:00</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">2ª Opção - Melhor dia para agendamento</label>
                <input
                  type="text"
                  name="melhor_dia2"
                  className="form-input"
                  value={formData.melhor_dia2}
                  onChange={handleDataInput}
                  onBlur={handleDataChange}
                  disabled={loading}
                  placeholder="DD/MM/YYYY"
                  maxLength="10"
                />
              </div>
              <div className="form-group">
                <label className="form-label">2ª Opção - Melhor horário</label>
                <select
                  name="melhor_horario2"
                  className="form-select"
                  value={formData.melhor_horario2}
                  onChange={handleInputChange}
                  disabled={loading}
                >
                  <option value="">Selecione o horário</option>
                  <option value="08:00">08:00</option>
                  <option value="08:30">08:30</option>
                  <option value="09:00">09:00</option>
                  <option value="09:30">09:30</option>
                  <option value="10:00">10:00</option>
                  <option value="10:30">10:30</option>
                  <option value="11:00">11:00</option>
                  <option value="11:30">11:30</option>
                  <option value="12:00">12:00</option>
                  <option value="12:30">12:30</option>
                  <option value="13:00">13:00</option>
                  <option value="13:30">13:30</option>
                  <option value="14:00">14:00</option>
                  <option value="14:30">14:30</option>
                  <option value="15:00">15:00</option>
                  <option value="15:30">15:30</option>
                  <option value="16:00">16:00</option>
                  <option value="16:30">16:30</option>
                  <option value="17:00">17:00</option>
                  <option value="17:30">17:30</option>
                  <option value="18:00">18:00</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Como podemos te ajudar?</label>
                <textarea
                  name="observacoes"
                  className="form-textarea"
                  value={formData.observacoes}
                  onChange={handleInputChange}
                  placeholder="Conte-nos sobre seus objetivos e expectativas..."
                  rows="3"
                  disabled={loading}
                />
              </div>

              <button 
                type="submit" 
                className="captura-submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <div className="loading-spinner"></div>
                ) : (
                  <>
                    <span>Agendar gratuitamente</span>
                  </>
                )}
              </button>
            </form>
          </div>


          {/* Footer */}
          <div className="captura-footer">
                         <div className="security-badges">
               <div className="security-badge">
                 <span className="security-icon">
                   <Lock size={16} />
                 </span>
                 <span>Dados Protegidos</span>
               </div>
               <div className="security-badge">
                 <span className="security-icon">
                   <Check size={16} />
                 </span>
                 <span>Sem Compromisso</span>
               </div>
             </div>
            <p className="footer-text">
              Seus dados estão seguros conosco. Não fazemos spam.
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .captura-lead-container {
          min-height: 100vh;
          background: linear-gradient(135deg, rgb(9, 42, 108) 0%, rgb(7, 50, 116) 100%);
          position: relative;
          overflow-x: hidden;
        }

        .captura-background {
          position: relative;
          min-height: 100vh;
          padding: 20px;
        }

        .captura-background::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: 
            radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
          pointer-events: none;
        }

        .captura-content {
          max-width: 600px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        .captura-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .captura-logo {
          height: 170px;
          margin-bottom: 20px;
          filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));

          @media (max-width: 768px) {
            height: 100px;
          }
        }

        .captura-title {
          font-size: 2.5rem;
          font-weight: 800;
          color: white;
          margin-bottom: 15px;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
          line-height: 1.2;
        }

        .highlight {
          background: #ffde34;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .captura-subtitle {
          font-size: 1.2rem;
          color: rgba(255, 255, 255, 0.9);
          margin-bottom: 30px;
          line-height: 1.5;
        }

        .captura-benefits {
          display: flex;
          justify-content: space-around;
          margin-bottom: 40px;
          flex-wrap: wrap;
        }

        .benefit-item {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.15);
          padding: 12px 16px;
          border-radius: 25px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: white;
          font-weight: 600;
          font-size: 0.78rem;

          span {
            color: white !important;
          }
        }

        .benefit-icon {
          font-size: 1.2rem;
          
          svg {
            color: #ffde34 !important;
          }
        }

        .captura-form-container {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-radius: 20px;
          padding: 40px 30px;
          margin-bottom: 40px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .form-title {
          font-size: 1.8rem;
          font-weight: 700;
          color: #2d3748;
          margin-bottom: 10px;
          text-align: center;
        }

        .form-subtitle {
          color: #4a5568;
          text-align: center;
          margin-bottom: 30px;
          font-size: 1rem;
        }

        .error-message {
          background: #fed7d7;
          color: #c53030;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 20px;
          text-align: center;
          font-weight: 500;
        }

        .captura-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .form-label {
          font-weight: 600;
          color: #2d3748;
          margin-bottom: 8px;
          font-size: 0.95rem;
        }

        .form-input,
        .form-select,
        .form-textarea {
          padding: 15px;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          font-size: 1rem;
          transition: all 0.3s ease;
          background: white;
        }

        .form-input:focus,
        .form-select:focus,
        .form-textarea:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .form-input.error,
        .form-select.error,
        .form-textarea.error {
          border-color: #e53e3e;
        }

        .field-error {
          color: #e53e3e;
          font-size: 0.875rem;
          margin-top: 5px;
          font-weight: 500;
        }

        .form-textarea {
          resize: vertical;
          min-height: 80px;
          font-family: inherit;
        }

        .captura-submit-btn {
          background: linear-gradient(135deg, rgb(9, 42, 108) 0%, rgb(9, 42, 108) 100%);
          color: white;
          border: none;
          padding: 18px 30px;
          border-radius: 12px;
          font-size: 1.1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-top: 10px;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }

        .captura-submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
        }

        .captura-submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .loading-spinner {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .btn-icon {
          font-size: 1.2rem;
        }

        .captura-testimonials {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 30px;
          margin-bottom: 30px;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .testimonials-title {
          color: white;
          font-size: 1.5rem;
          font-weight: 700;
          text-align: center;
          margin-bottom: 25px;
        }

        .testimonials-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
        }

        .testimonial-card {
          background: rgba(255, 255, 255, 0.15);
          padding: 20px;
          border-radius: 15px;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

                 .testimonial-stars {
           display: flex;
           gap: 4px;
           margin-bottom: 10px;
         }

        .testimonial-text {
          color: white;
          font-style: italic;
          margin-bottom: 15px;
          line-height: 1.5;
        }

        .testimonial-author {
          color: rgba(255, 255, 255, 0.8);
          font-weight: 600;
          font-size: 0.9rem;
        }

        .captura-footer {
          text-align: center;
          color: rgba(255, 255, 255, 0.8);
        }

        .security-badges {
          display: flex;
          justify-content: center;
          gap: 30px;
          margin-bottom: 15px;
          flex-wrap: wrap;
        }

        .security-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.9rem;
          font-weight: 600;
        }

        .security-icon {
          font-size: 1.1rem;
        }

        .footer-text {
          font-size: 0.9rem;
          opacity: 0.8;
        }

        .btn {
          padding: 10px 15px;
          border: none;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-secondary {
          background: #e2e8f0;
          color: #4a5568;
          border: 1px solid #cbd5e0;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #cbd5e0;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .captura-title {
            font-size: 2rem;
          }

          .captura-subtitle {
            font-size: 1.1rem;
          }

          .captura-form-container {
            padding: 30px 20px;
          }

          .security-badges {
            gap: 20px;
          }
        }

        @media (max-width: 480px) {
          .captura-content {
            padding: 0 10px;
          }

          .captura-title {
            font-size: 1.8rem;
          }

          .testimonials-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default CapturaClientes; 