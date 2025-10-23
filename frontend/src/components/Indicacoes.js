import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import './Indicacoes.css';

const Indicacoes = () => {
  const { user, makeRequest } = useAuth();
  const { showSuccessToast, showInfoToast, showErrorToast } = useToast();
  const [loading, setLoading] = useState(false);
  

  // Estados para o formulário de indicação de pacientes
  const [formPaciente, setFormPaciente] = useState({
    nome: '',
    telefone: '',
    estado: '',
    cidade: '',
    grauParentesco: '',
    grauParentescoOutros: '',
    tipoTratamento: '',
    tratamentoEspecifico: '',
    tratamentoOutros: '',
    observacoes: ''
  });
  const [submittingPaciente, setSubmittingPaciente] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [cidadeCustomizada, setCidadeCustomizada] = useState(false);

  // Opções para o formulário
  const opcoesGrauParentesco = [
    { value: 'familiar', label: 'Familiar' },
    { value: 'amigo', label: 'Amigo' },
    { value: 'conhecido', label: 'Conhecido' },
    { value: 'colega', label: 'Colega de trabalho' },
    { value: 'outros', label: 'Outros' }
  ];

  const opcoesTipoTratamento = [
    { value: 'estetico', label: 'Estético' },
    { value: 'odontologico', label: 'Odontológico' },
    { value: 'ambos', label: 'Ambos' }
  ];

  const opcoesTratamentoEstetico = [
    { value: 'harmonizacao', label: 'Harmonização facial' },
    { value: 'preenchimento', label: 'Preenchimento labial' },
    { value: 'botox', label: 'Botox' },
    { value: 'limpeza', label: 'Limpeza de pele' },
    { value: 'peeling', label: 'Peeling' },
    { value: 'depilacao', label: 'Depilação a laser' },
    { value: 'outros', label: 'Outros' }
  ];

  const opcoesTratamentoOdontologico = [
    { value: 'implantes', label: 'Implantes' },
    { value: 'ortodontia', label: 'Ortodontia/Aparelho' },
    { value: 'clareamento', label: 'Clareamento' },
    { value: 'lentes', label: 'Lentes de contato' },
    { value: 'protese', label: 'Prótese' },
    { value: 'extracao', label: 'Extração' },
    { value: 'outros', label: 'Outros' }
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
      return;
    }
  }, [user]);


  // Cleanup: restaurar scroll quando componente for desmontado
  useEffect(() => {
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);



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


  // Manipulação do formulário de indicação de pacientes
  const handlePacienteInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'telefone') {
      const formattedValue = formatarTelefone(value);
      setFormPaciente(prev => ({ ...prev, [name]: formattedValue }));
    } else if (name === 'cidade') {
      const formattedValue = formatarCidade(value);
      setFormPaciente(prev => ({ ...prev, [name]: formattedValue }));
    } else if (name === 'estado') {
      setFormPaciente(prev => ({ ...prev, [name]: value, cidade: '' }));
      setCidadeCustomizada(false);
    } else if (name === 'grauParentesco') {
      setFormPaciente(prev => ({ 
        ...prev, 
        [name]: value, 
        grauParentescoOutros: value !== 'outros' ? '' : prev.grauParentescoOutros
      }));
    } else if (name === 'tipoTratamento') {
      setFormPaciente(prev => ({ 
        ...prev, 
        [name]: value, 
        tratamentoEspecifico: '',
        tratamentoOutros: ''
      }));
    } else if (name === 'tratamentoEspecifico') {
      setFormPaciente(prev => ({ 
        ...prev, 
        [name]: value, 
        tratamentoOutros: value !== 'outros' ? '' : prev.tratamentoOutros
      }));
    } else {
      setFormPaciente(prev => ({ ...prev, [name]: value }));
    }
    
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Validação do formulário de indicação de pacientes
  const validatePacienteForm = () => {
    const newErrors = {};
    
    if (!formPaciente.nome.trim()) {
      newErrors.nome = 'Nome do paciente é obrigatório';
    } else if (formPaciente.nome.trim().length < 2) {
      newErrors.nome = 'Nome deve ter pelo menos 2 caracteres';
    }
    
    if (!formPaciente.telefone.trim()) {
      newErrors.telefone = 'WhatsApp é obrigatório';
    } else if (formPaciente.telefone.replace(/\D/g, '').length < 10) {
      newErrors.telefone = 'WhatsApp deve ter pelo menos 10 dígitos';
    }
    
    if (!formPaciente.estado) {
      newErrors.estado = 'Estado é obrigatório';
    }
    
    if (!formPaciente.cidade.trim()) {
      newErrors.cidade = 'Cidade é obrigatória';
    }
    
    if (!formPaciente.grauParentesco) {
      newErrors.grauParentesco = 'Sua relação com a pessoa é obrigatória';
    } else if (formPaciente.grauParentesco === 'outros' && !formPaciente.grauParentescoOutros.trim()) {
      newErrors.grauParentescoOutros = 'Especifique sua relação com a pessoa';
    }
    
    if (!formPaciente.tipoTratamento) {
      newErrors.tipoTratamento = 'Tipo de tratamento é obrigatório';
    } else if (formPaciente.tratamentoEspecifico === 'outros' && !formPaciente.tratamentoOutros.trim()) {
      newErrors.tratamentoOutros = 'Especifique o tratamento desejado';
    }
    
    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit do formulário de indicação de pacientes
  const handlePacienteSubmit = async (e) => {
    e.preventDefault();
    
    if (!validatePacienteForm()) {
      showErrorToast('Por favor, preencha todos os campos obrigatórios');
      return;
    }
    
    setSubmittingPaciente(true);
    
    try {
      const dataToSend = {
        nome: formPaciente.nome,
        telefone: formPaciente.telefone,
        cidade: formPaciente.cidade,
        estado: formPaciente.estado,
        grau_parentesco: formPaciente.grauParentesco === 'outros' ? formPaciente.grauParentescoOutros : formPaciente.grauParentesco,
        tipo_tratamento: formPaciente.tipoTratamento,
        tratamento_especifico: formPaciente.tratamentoEspecifico === 'outros' ? formPaciente.tratamentoOutros : formPaciente.tratamentoEspecifico,
        observacoes: formPaciente.observacoes,
        consultor_id: user.id,
        status: 'lead'
      };
      
      const response = await makeRequest('/pacientes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        showSuccessToast('Paciente indicado com sucesso!');
        // Limpar formulário
        setFormPaciente({
          nome: '',
          telefone: '',
          estado: '',
          cidade: '',
          grauParentesco: '',
          grauParentescoOutros: '',
          tipoTratamento: '',
          tratamentoEspecifico: '',
          tratamentoOutros: '',
          observacoes: ''
        });
        setCidadeCustomizada(false);
        setFormErrors({});
        // Redirecionar para a página de pacientes
        window.location.href = '/pacientes';
      } else {
        showErrorToast(data.error || 'Erro ao indicar paciente');
      }
    } catch (error) {
      console.error('Erro ao indicar paciente:', error);
      showErrorToast('Erro de conexão. Tente novamente.');
    } finally {
      setSubmittingPaciente(false);
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
          
          <div>
            <p style={{
              fontSize: window.innerWidth <= 768 ? '1rem' : '1.1rem',
              color: '#475569',
              lineHeight: '1.6',
              marginBottom: '1.5rem',
              maxWidth: '800px',
              margin: '0 auto 1.5rem'
            }}>
              <strong>Você indicará pacientes que possam se interessar em nossa solução.</strong><br /> <br />
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
              Indique um parente, um amigo, um conhecido, ou até você mesmo!
            </div>
          </div>

          <h2 style={{
            fontSize: window.innerWidth <= 768 ? '1.5rem' : '2rem',
            fontWeight: '700',
            color: '#1e293b',
            marginTop: '3rem'
          }}>
            Como funciona?
          </h2>
          
          <p style={{
            fontSize: window.innerWidth <= 768 ? '1rem' : '1.1rem',
            color: '#475569',
            lineHeight: '1.6',
            marginBottom: '1.5rem',
            maxWidth: '800px',
            margin: '0 auto 1.5rem'
          }}>
            Preencha o formulário abaixo com as informações do paciente que você quer indicar. 
            Após o cadastro, o paciente será contatado por nossa equipe para dar continuidade ao processo.
          </p>
        </div>
      </div>

      {/* Formulário de Indicação de Pacientes */}
      <div className="formulario-container" style={{ padding: window.innerWidth <= 768 ? '0 1.5rem' : '0'}}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '16px',
          padding: '2.5rem',
          maxWidth: '800px',
          margin: '0 auto',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
          border: '3px solid rgba(255, 255, 255, 0.3)'
        }}>
          <h2 style={{
            fontSize: window.innerWidth <= 768 ? '1.5rem' : '2rem',
            fontWeight: '700',
            color: '#1e293b',
            textAlign: 'center',
            marginBottom: '2rem'
          }}>
            Indique um Paciente
          </h2>
          
          <form onSubmit={handlePacienteSubmit}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : 'repeat(2, 1fr)',
              gap: '1.5rem',
              marginBottom: '1.5rem'
            }}>
              {/* Nome */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Nome do Paciente *
                </label>
                <input
                  type="text"
                  name="nome"
                  value={formPaciente.nome}
                  onChange={handlePacienteInputChange}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: formErrors.nome ? '2px solid #ef4444' : '2px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    transition: 'border-color 0.2s'
                  }}
                  placeholder="Digite o nome completo"
                />
                {formErrors.nome && (
                  <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                    {formErrors.nome}
                  </p>
                )}
              </div>

              {/* Telefone */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  WhatsApp *
                </label>
                <input
                  type="text"
                  name="telefone"
                  value={formPaciente.telefone}
                  onChange={handlePacienteInputChange}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: formErrors.telefone ? '2px solid #ef4444' : '2px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    transition: 'border-color 0.2s'
                  }}
                  placeholder="(11) 99999-9999"
                />
                {formErrors.telefone && (
                  <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                    {formErrors.telefone}
                  </p>
                )}
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : 'repeat(2, 1fr)',
              gap: '1.5rem',
              marginBottom: '1.5rem'
            }}>
              {/* Estado */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Estado *
                </label>
                <select
                  name="estado"
                  value={formPaciente.estado}
                  onChange={handlePacienteInputChange}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: formErrors.estado ? '2px solid #ef4444' : '2px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    transition: 'border-color 0.2s'
                  }}
                >
                  <option value="">Selecione o estado</option>
                  {estadosBrasileiros.map(estado => (
                    <option key={estado.sigla} value={estado.sigla}>
                      {estado.nome}
                    </option>
                  ))}
                </select>
                {formErrors.estado && (
                  <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                    {formErrors.estado}
                  </p>
                )}
              </div>

              {/* Cidade */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Cidade *
                </label>
                {formPaciente.estado && cidadesPorEstado[formPaciente.estado] ? (
                  <>
                    <select
                      name="cidade"
                      value={formPaciente.cidade}
                      onChange={handlePacienteInputChange}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: formErrors.cidade ? '2px solid #ef4444' : '2px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        transition: 'border-color 0.2s'
                      }}
                    >
                      <option value="">Selecione a cidade</option>
                      {cidadesPorEstado[formPaciente.estado].map(cidade => (
                        <option key={cidade} value={cidade}>
                          {cidade}
                        </option>
                      ))}
                      <option value="outros">Outros</option>
                    </select>
                    {formPaciente.cidade === 'outros' && (
                      <input
                        type="text"
                        name="cidade"
                        value={formPaciente.cidade}
                        onChange={handlePacienteInputChange}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '2px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '1rem',
                          marginTop: '0.5rem'
                        }}
                        placeholder="Digite o nome da cidade"
                      />
                    )}
                  </>
                ) : (
                  <input
                    type="text"
                    name="cidade"
                    value={formPaciente.cidade}
                    onChange={handlePacienteInputChange}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: formErrors.cidade ? '2px solid #ef4444' : '2px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      transition: 'border-color 0.2s'
                    }}
                    placeholder="Digite o nome da cidade"
                    disabled={!formPaciente.estado}
                  />
                )}
                {formErrors.cidade && (
                  <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                    {formErrors.cidade}
                  </p>
                )}
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : 'repeat(2, 1fr)',
              gap: '1.5rem',
              marginBottom: '1.5rem'
            }}>
              {/* Grau de Parentesco */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Você é o que dessa pessoa? *
                </label>
                <select
                  name="grauParentesco"
                  value={formPaciente.grauParentesco}
                  onChange={handlePacienteInputChange}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: formErrors.grauParentesco ? '2px solid #ef4444' : '2px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    transition: 'border-color 0.2s'
                  }}
                >
                  <option value="">Selecione sua relação com a pessoa</option>
                  {opcoesGrauParentesco.map(opcao => (
                    <option key={opcao.value} value={opcao.value}>
                      {opcao.label}
                    </option>
                  ))}
                </select>
                {formPaciente.grauParentesco === 'outros' && (
                  <input
                    type="text"
                    name="grauParentescoOutros"
                    value={formPaciente.grauParentescoOutros}
                    onChange={handlePacienteInputChange}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: formErrors.grauParentescoOutros ? '2px solid #ef4444' : '2px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      marginTop: '0.5rem',
                      transition: 'border-color 0.2s'
                    }}
                    placeholder="Especifique sua relação com a pessoa"
                  />
                )}
                {formErrors.grauParentesco && (
                  <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                    {formErrors.grauParentesco}
                  </p>
                )}
                {formErrors.grauParentescoOutros && (
                  <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                    {formErrors.grauParentescoOutros}
                  </p>
                )}
              </div>

              {/* Tipo de Tratamento */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Tipo de Tratamento *
                </label>
                <select
                  name="tipoTratamento"
                  value={formPaciente.tipoTratamento}
                  onChange={handlePacienteInputChange}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: formErrors.tipoTratamento ? '2px solid #ef4444' : '2px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    transition: 'border-color 0.2s'
                  }}
                >
                  <option value="">Selecione o tipo</option>
                  {opcoesTipoTratamento.map(opcao => (
                    <option key={opcao.value} value={opcao.value}>
                      {opcao.label}
                    </option>
                  ))}
                </select>
                {formErrors.tipoTratamento && (
                  <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                    {formErrors.tipoTratamento}
                  </p>
                )}
              </div>
            </div>

            {/* Tratamento Específico */}
            {formPaciente.tipoTratamento && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Tratamento Específico
                </label>
                {formPaciente.tipoTratamento === 'ambos' ? (
                  <input
                    type="text"
                    name="tratamentoEspecifico"
                    value={formPaciente.tratamentoEspecifico}
                    onChange={handlePacienteInputChange}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: formErrors.tratamentoEspecifico ? '2px solid #ef4444' : '2px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      transition: 'border-color 0.2s'
                    }}
                    placeholder="Descreva os tratamentos desejados"
                  />
                ) : (
                  <select
                    name="tratamentoEspecifico"
                    value={formPaciente.tratamentoEspecifico}
                    onChange={handlePacienteInputChange}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: formErrors.tratamentoEspecifico ? '2px solid #ef4444' : '2px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      transition: 'border-color 0.2s'
                    }}
                  >
                    <option value="">Selecione o tratamento</option>
                    {(formPaciente.tipoTratamento === 'estetico' ? opcoesTratamentoEstetico : opcoesTratamentoOdontologico).map(opcao => (
                      <option key={opcao.value} value={opcao.value}>
                        {opcao.label}
                      </option>
                    ))}
                  </select>
                )}
                {formPaciente.tratamentoEspecifico === 'outros' && (
                  <input
                    type="text"
                    name="tratamentoOutros"
                    value={formPaciente.tratamentoOutros}
                    onChange={handlePacienteInputChange}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: formErrors.tratamentoOutros ? '2px solid #ef4444' : '2px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      marginTop: '0.5rem',
                      transition: 'border-color 0.2s'
                    }}
                    placeholder="Especifique o tratamento desejado"
                  />
                )}
                {formErrors.tratamentoEspecifico && (
                  <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                    {formErrors.tratamentoEspecifico}
                  </p>
                )}
                {formErrors.tratamentoOutros && (
                  <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                    {formErrors.tratamentoOutros}
                  </p>
                )}
              </div>
            )}


            {/* Observações */}
            <div style={{ marginBottom: '2rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.9rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Observações (Opcional)
              </label>
              <textarea
                name="observacoes"
                value={formPaciente.observacoes}
                onChange={handlePacienteInputChange}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  minHeight: '100px',
                  resize: 'vertical',
                  transition: 'border-color 0.2s',
                  fontFamily: 'inherit'
                }}
                placeholder="Adicione informações adicionais sobre o paciente ou tratamento desejado"
              />
            </div>

            {/* Botão de Submit */}
            <button
              type="submit"
              disabled={submittingPaciente}
              style={{
                width: '100%',
                padding: '1rem 2rem',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '1.1rem',
                fontWeight: '700',
                cursor: submittingPaciente ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                opacity: submittingPaciente ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              {submittingPaciente ? (
                <>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid transparent',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  Cadastrando...
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                  Indicar Paciente
                </>
              )}
            </button>
          </form>
        </div>
      </div>

        {/* Ações Finais */}
        <div className="final-actions" style={{ padding: window.innerWidth <= 768 ? '0 1.5rem' : '0' }}>
          {/* Seção de Comissões em Destaque */}
          <div 
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
              display: 'flex',
              justifyContent: 'center',
              maxWidth: '500px',
              margin: '0 auto'
            }}>
              {/* Card Pacientes */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '12px',
                padding: '2rem',
                textAlign: 'center',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                border: '3px solid rgba(255, 255, 255, 0.3)',
                transition: 'transform 0.3s ease',
                width: '100%'
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
                  Pacientes indicados
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
          <p style={{ fontSize: window.innerWidth <= 768 ? '0.9rem' : '1rem', padding: window.innerWidth <= 768 ? '0 1rem' : '0' }}>Após cadastrar o paciente, nossa equipe entrará em contato para dar continuidade ao processo. <strong>O paciente será atribuído a você no sistema e você receberá comissão quando ele realizar o tratamento.</strong></p>
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
              onClick={() => window.location.href = '/pacientes'}
              style={{ fontSize: window.innerWidth <= 768 ? '0.85rem' : '1rem' }}
            >
              Minhas Indicações
            </button>
          </div>
        </div>
      


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
