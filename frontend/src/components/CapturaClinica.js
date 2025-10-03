import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sparkles, Trophy, Gem, Lock, Check, Star, Building2, MapPin, Phone, Mail } from 'lucide-react';
import logoBrasao from '../images/logobrasao.png';
import config from '../config';

const CapturaClinica = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    nome: '',
    cnpj: '',
    endereco: '',
    bairro: '',
    cidade: '',
    estado: '',
    telefone: '',
    email: '',
    nicho: '',
    responsavel: '',
    observacoes: '',
    ref_consultor: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [cidadeCustomizada, setCidadeCustomizada] = useState(false);
  const [refConsultor, setRefConsultor] = useState(null);
  const [nomeConsultor, setNomeConsultor] = useState(null);

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
      setFormData(prev => ({ ...prev, ref_consultor: codigoLimpo }));
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

  const formatarTelefone = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    } else {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
  };

  const formatarCNPJ = (value) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
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
    
    if (name === 'telefone') {
      const formattedValue = formatarTelefone(value);
      setFormData(prev => ({ ...prev, [name]: formattedValue }));
    } else if (name === 'cnpj') {
      const formattedValue = formatarCNPJ(value);
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

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome da clínica é obrigatório';
    } else if (formData.nome.trim().length < 2) {
      newErrors.nome = 'Nome deve ter pelo menos 2 caracteres';
    }
    
    if (!formData.cnpj.trim()) {
      newErrors.cnpj = 'CNPJ é obrigatório';
    } else if (formData.cnpj.replace(/\D/g, '').length !== 14) {
      newErrors.cnpj = 'CNPJ deve ter 14 dígitos';
    }
    
    if (!formData.telefone.trim()) {
      newErrors.telefone = 'Telefone é obrigatório';
    } else if (formData.telefone.replace(/\D/g, '').length < 10) {
      newErrors.telefone = 'Telefone deve ter pelo menos 10 dígitos';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }
    
    if (!formData.responsavel.trim()) {
      newErrors.responsavel = 'Nome do responsável é obrigatório';
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
    
    const formDataToSend = {
      ...formData,
      ref_consultor: refConsultor // Incluir código de referência se existir
    };

    try {
      const response = await fetch(`${config.API_BASE_URL}/clinicas/cadastro-publico`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formDataToSend)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        navigate('/captura-clinica-sucesso', { 
          state: { 
            nome: data.nome,
            message: data.message,
            consultor_referencia: data.consultor_referencia
          } 
        });
      } else {
        setErrors({ general: data.error || 'Erro ao enviar cadastro' });
      }
    } catch (error) {
      console.error('Erro no cadastro:', error);
      setErrors({ general: 'Erro de conexão. Tente novamente.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="captura-clinica-container">
      <div className="captura-background">
        <div className="captura-content">
          {/* Header com Logo */}
          <div className="captura-header">
            <img src={logoBrasao} alt="Logo" className="captura-logo" />
            <h1 className="captura-title">
              Seja nossa <span className="highlight">clínica parceira</span>
            </h1>
            <p className="captura-subtitle">
              Cadastre sua clínica, tenha acesso a uma rede de pacientes, e tenha seus valores antecipados à vista de tratamentos parcelados no boleto.
            </p>
          </div>

          {/* Benefícios */}
          <div className="captura-benefits">
            <div className="benefit-item">
              <div className="benefit-icon">
                <Building2 size={20} />
              </div>
              <span>Rede de Parceiros</span>
            </div>
            <div className="benefit-item">
              <div className="benefit-icon">
                <Trophy size={20} />
              </div>
              <span>Pacientes Qualificados</span>
            </div>
            <div className="benefit-item">
              <div className="benefit-icon">
                <Gem size={20} />
              </div>
              <span>Suporte Completo</span>
            </div>
          </div>

          {/* Formulário */}
          <div className="captura-form-container">
            <h2 className="form-title">Cadastre sua clínica</h2>
            <p className="form-subtitle">
              Preencha os dados abaixo e entraremos em contato em até 2 horas
            </p>

            {errors.general && (
              <div className="error-message">
                {errors.general}
              </div>
            )}

            <form onSubmit={handleSubmit} className="captura-form">
              <div className="form-group">
                <label className="form-label">Nome da Clínica *</label>
                <input
                  type="text"
                  name="nome"
                  className={`form-input ${errors.nome ? 'error' : ''}`}
                  value={formData.nome}
                  onChange={handleInputChange}
                  placeholder="Digite o nome da sua clínica"
                  disabled={loading}
                  required
                />
                {errors.nome && <span className="field-error">{errors.nome}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">CNPJ *</label>
                <input
                  type="text"
                  name="cnpj"
                  className={`form-input ${errors.cnpj ? 'error' : ''}`}
                  value={formData.cnpj}
                  onChange={handleInputChange}
                  placeholder="00.000.000/0000-00"
                  disabled={loading}
                  maxLength="18"
                  required
                />
                {errors.cnpj && <span className="field-error">{errors.cnpj}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Responsável *</label>
                <input
                  type="text"
                  name="responsavel"
                  className={`form-input ${errors.responsavel ? 'error' : ''}`}
                  value={formData.responsavel}
                  onChange={handleInputChange}
                  placeholder="Nome do responsável pela clínica"
                  disabled={loading}
                  required
                />
                {errors.responsavel && <span className="field-error">{errors.responsavel}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Telefone/WhatsApp *</label>
                <input
                  type="tel"
                  name="telefone"
                  className={`form-input ${errors.telefone ? 'error' : ''}`}
                  value={formData.telefone}
                  onChange={handleInputChange}
                  placeholder="(11) 99999-9999"
                  disabled={loading}
                  required
                />
                {errors.telefone && <span className="field-error">{errors.telefone}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Email *</label>
                <input
                  type="email"
                  name="email"
                  className={`form-input ${errors.email ? 'error' : ''}`}
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="contato@suaclinica.com"
                  disabled={loading}
                  required
                />
                {errors.email && <span className="field-error">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Nicho de Atuação</label>
                <select
                  name="nicho"
                  className="form-select"
                  value={formData.nicho}
                  onChange={handleInputChange}
                  disabled={loading}
                >
                  <option value="">Selecione (opcional)</option>
                  <option value="Estético">Clínica Estética</option>
                  <option value="Odontológico">Clínica Odontológica</option>
                  <option value="Ambos">Estética e Odontológica</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Estado *</label>
                <select
                  name="estado"
                  className="form-select"
                  value={formData.estado}
                  onChange={handleInputChange}
                  disabled={loading}
                  required
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
                    disabled={loading}
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
                <label className="form-label">Endereço *</label>
                <input
                  type="text"
                  name="endereco"
                  className="form-input"
                  value={formData.endereco}
                  onChange={handleInputChange}
                  placeholder="Rua, número, complemento"
                  disabled={loading}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Bairro *</label>
                <input
                  type="text"
                  name="bairro"
                  className="form-input"
                  value={formData.bairro}
                  onChange={handleInputChange}
                  placeholder="Nome do bairro"
                  disabled={loading}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Observações</label>
                <textarea
                  name="observacoes"
                  className="form-textarea"
                  value={formData.observacoes}
                  onChange={handleInputChange}
                  placeholder="Conte-nos sobre sua clínica, especialidades, horários de funcionamento..."
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
                    <span>Cadastrar Clínica</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Depoimentos */}
          <div className="captura-testimonials">
            <h3 className="testimonials-title">O que nossos parceiros dizem</h3>
            <div className="testimonials-grid">
              <div className="testimonial-card">
                <div className="testimonial-stars">
                  <Star size={16} fill="#ffde34" />
                  <Star size={16} fill="#ffde34" />
                  <Star size={16} fill="#ffde34" />
                  <Star size={16} fill="#ffde34" />
                  <Star size={16} fill="#ffde34" />
                </div>
                <p className="testimonial-text">
                  "Parceria incrível! Aumentamos nosso faturamento em 40% com os pacientes qualificados que recebemos."
                </p>
                <div className="testimonial-author">- Dr. Carlos Silva, Clínica Estética</div>
              </div>
              <div className="testimonial-card">
                <div className="testimonial-stars">
                  <Star size={16} fill="#ffde34" />
                  <Star size={16} fill="#ffde34" />
                  <Star size={16} fill="#ffde34" />
                  <Star size={16} fill="#ffde34" />
                  <Star size={16} fill="#ffde34" />
                </div>
                <p className="testimonial-text">
                  "Suporte excepcional e pacientes de alta qualidade. Recomendo para todas as clínicas."
                </p>
                <div className="testimonial-author">- Dra. Ana Santos, Odontologia</div>
              </div>
            </div>
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
        .captura-clinica-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #1a1d23 0%, #0f1114 100%);
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
          width: 80px;
          height: 80px;
          margin-bottom: 20px;
          filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
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
          gap: 15px;
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
          background: linear-gradient(135deg, #1a1d23 0%, #0f1114 100%);
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

export default CapturaClinica;
