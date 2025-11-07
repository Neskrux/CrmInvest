import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import logoBrasaoPreto from '../images/logohorizontalpreto.png';

const ModalCadastroPacienteClinica = ({ onClose, onComplete }) => {
  console.log('✅ [ModalCadastroPacienteClinica] Componente renderizado!');
  const { user, makeRequest } = useAuth();
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const modalRef = useRef(null);
  
  const [passoAtual, setPassoAtual] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  
  // Dados do formulário
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    cpf: '',
    data_nascimento: '',
    cidade: '',
    estado: '',
    tipo_tratamento: '',
    endereco: '',
    bairro: '',
    numero: '',
    cep: '',
    observacoes: ''
  });
  
  // Detectar mudanças no tamanho da tela
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Formatar telefone
  const formatarTelefone = (valor) => {
    const apenasNumeros = valor.replace(/\D/g, '');
    if (apenasNumeros.length <= 10) {
      return apenasNumeros.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    } else {
      return apenasNumeros.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
  };
  
  // Formatar CPF
  const formatarCPF = (valor) => {
    const apenasNumeros = valor.replace(/\D/g, '');
    if (apenasNumeros.length <= 11) {
      return apenasNumeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return valor;
  };
  
  // Formatar data
  const formatarData = (valor) => {
    const apenasNumeros = valor.replace(/\D/g, '');
    if (apenasNumeros.length <= 8) {
      return apenasNumeros.replace(/(\d{2})(\d{2})(\d{4})/, '$1/$2/$3');
    }
    return valor;
  };
  
  // Formatar CEP
  const formatarCEP = (valor) => {
    const apenasNumeros = valor.replace(/\D/g, '');
    if (apenasNumeros.length <= 8) {
      return apenasNumeros.replace(/(\d{5})(\d{3})/, '$1-$2');
    }
    return valor;
  };
  
  // Handler de mudança de input
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    let valorFormatado = value;
    
    if (name === 'telefone') {
      valorFormatado = formatarTelefone(value);
    } else if (name === 'cpf') {
      valorFormatado = formatarCPF(value);
    } else if (name === 'data_nascimento') {
      valorFormatado = formatarData(value);
    } else if (name === 'cep') {
      valorFormatado = formatarCEP(value);
    } else if (name === 'estado') {
      valorFormatado = value.toUpperCase().slice(0, 2);
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: valorFormatado
    }));
  };
  
  // Validar passo 1
  const validarPasso1 = () => {
    if (!formData.nome.trim()) {
      showErrorToast('Por favor, informe o nome do paciente');
      return false;
    }
    if (!formData.telefone.trim() || formData.telefone.replace(/\D/g, '').length < 10) {
      showErrorToast('Por favor, informe um telefone válido');
      return false;
    }
    if (!formData.cpf.trim() || formData.cpf.replace(/\D/g, '').length !== 11) {
      showErrorToast('Por favor, informe um CPF válido');
      return false;
    }
    return true;
  };
  
  // Validar passo 2
  const validarPasso2 = () => {
    // Passo 2 é opcional, pode avançar sem preencher
    return true;
  };
  
  // Validar passo 3
  const validarPasso3 = () => {
    // Passo 3 é opcional, pode avançar sem preencher
    return true;
  };
  
  // Avançar passo
  const avancarPasso = () => {
    if (passoAtual === 1 && !validarPasso1()) return;
    if (passoAtual === 2 && !validarPasso2()) return;
    if (passoAtual === 3 && !validarPasso3()) return;
    
    if (passoAtual < 4) {
      setPassoAtual(passoAtual + 1);
    }
  };
  
  // Voltar passo
  const voltarPasso = () => {
    if (passoAtual > 1) {
      setPassoAtual(passoAtual - 1);
    }
  };
  
  // Finalizar cadastro
  const handleFinalizarCadastro = async () => {
    if (!validarPasso1()) {
      setPassoAtual(1);
      return;
    }
    
    setLoading(true);
    
    try {
      // Preparar dados para envio
      const pacienteData = {
        nome: formData.nome.trim(),
        telefone: formData.telefone.replace(/\D/g, ''),
        cpf: formData.cpf.replace(/\D/g, ''),
        data_nascimento: formData.data_nascimento && formData.data_nascimento.length === 10
          ? `${formData.data_nascimento.split('/')[2]}-${formData.data_nascimento.split('/')[1]}-${formData.data_nascimento.split('/')[0]}`
          : null,
        cidade: formData.cidade.trim() || null,
        estado: formData.estado.trim().toUpperCase() || null,
        tipo_tratamento: formData.tipo_tratamento || null,
        endereco: formData.endereco.trim() || null,
        bairro: formData.bairro.trim() || null,
        numero: formData.numero.trim() || null,
        cep: formData.cep.replace(/\D/g, '') || null,
        observacoes: formData.observacoes.trim() || null,
        status: 'sem_primeiro_contato'
      };
      
      const response = await makeRequest('/pacientes', {
        method: 'POST',
        body: JSON.stringify(pacienteData)
      });
      
      if (response.ok) {
        showSuccessToast('Paciente cadastrado com sucesso!');
        onComplete();
      } else {
        const errorData = await response.json();
        showErrorToast(errorData.error || errorData.message || 'Erro ao cadastrar paciente');
      }
    } catch (error) {
      console.error('Erro ao cadastrar paciente:', error);
      showErrorToast('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };
  
  const totalPassos = 4;
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: isMobile ? '1rem' : '2rem'
    }}>
      <div 
        ref={modalRef}
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '600px',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '2px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#f9fafb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img src={logoBrasaoPreto} alt="Logo" style={{ height: '32px' }} />
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: '#1e293b' }}>
              Cadastrar Paciente
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '0.25rem 0.5rem',
              borderRadius: '4px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            ×
          </button>
        </div>
        
        {/* Indicador de Progresso */}
        <div style={{
          padding: '1.5rem 1.5rem 1rem',
          backgroundColor: '#f9fafb',
          borderBottom: '1px solid #e2e8f0'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '0.75rem'
          }}>
            {[1, 2, 3, 4].map((passo) => (
              <React.Fragment key={passo}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: passoAtual >= passo ? '#059669' : '#e2e8f0',
                  color: passoAtual >= passo ? 'white' : '#6b7280',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  transition: 'all 0.3s'
                }}>
                  {passoAtual > passo ? '✓' : passo}
                </div>
                {passo < totalPassos && (
                  <div style={{
                    flex: 1,
                    height: '3px',
                    backgroundColor: passoAtual > passo ? '#059669' : '#e2e8f0',
                    margin: '0 0.5rem',
                    transition: 'all 0.3s'
                  }} />
                )}
              </React.Fragment>
            ))}
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            color: '#6b7280',
            marginTop: '0.5rem'
          }}>
            <span style={{ fontWeight: passoAtual === 1 ? '600' : '400', color: passoAtual === 1 ? '#059669' : '#6b7280' }}>Dados Básicos</span>
            <span style={{ fontWeight: passoAtual === 2 ? '600' : '400', color: passoAtual === 2 ? '#059669' : '#6b7280' }}>Informações</span>
            <span style={{ fontWeight: passoAtual === 3 ? '600' : '400', color: passoAtual === 3 ? '#059669' : '#6b7280' }}>Endereço</span>
            <span style={{ fontWeight: passoAtual === 4 ? '600' : '400', color: passoAtual === 4 ? '#059669' : '#6b7280' }}>Finalizar</span>
          </div>
        </div>
        
        {/* Conteúdo */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '2rem'
        }}>
          {/* Passo 1: Dados Básicos */}
          {passoAtual === 1 && (
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem', color: '#1e293b' }}>
                Dados Básicos
              </h2>
              <p style={{ color: '#6b7280', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                Informe os dados principais do paciente
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#1e293b' }}>
                    Nome do Paciente *
                  </label>
                  <input
                    type="text"
                    name="nome"
                    value={formData.nome}
                    onChange={handleInputChange}
                    placeholder="Digite o nome completo"
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      outline: 'none',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#059669'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#1e293b' }}>
                    Telefone/WhatsApp *
                  </label>
                  <input
                    type="text"
                    name="telefone"
                    value={formData.telefone}
                    onChange={handleInputChange}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      outline: 'none',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#059669'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#1e293b' }}>
                    CPF *
                  </label>
                  <input
                    type="text"
                    name="cpf"
                    value={formData.cpf}
                    onChange={handleInputChange}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      outline: 'none',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#059669'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Passo 2: Informações Adicionais */}
          {passoAtual === 2 && (
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem', color: '#1e293b' }}>
                Informações Adicionais
              </h2>
              <p style={{ color: '#6b7280', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                Complete as informações do paciente (opcional)
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#1e293b' }}>
                    Data de Nascimento
                  </label>
                  <input
                    type="text"
                    name="data_nascimento"
                    value={formData.data_nascimento}
                    onChange={handleInputChange}
                    placeholder="DD/MM/AAAA"
                    maxLength={10}
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      outline: 'none',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#059669'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#1e293b' }}>
                      Cidade
                    </label>
                    <input
                      type="text"
                      name="cidade"
                      value={formData.cidade}
                      onChange={handleInputChange}
                      placeholder="Digite a cidade"
                      style={{
                        width: '100%',
                        padding: '0.875rem',
                        border: '2px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        outline: 'none',
                        transition: 'all 0.2s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#059669'}
                      onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                    />
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#1e293b' }}>
                      Estado (UF)
                    </label>
                    <input
                      type="text"
                      name="estado"
                      value={formData.estado}
                      onChange={handleInputChange}
                      placeholder="UF"
                      maxLength={2}
                      style={{
                        width: '100%',
                        padding: '0.875rem',
                        border: '2px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        outline: 'none',
                        transition: 'all 0.2s',
                        textTransform: 'uppercase'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#059669'}
                      onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                    />
                  </div>
                </div>
                
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#1e293b' }}>
                    Tipo de Tratamento
                  </label>
                  <select
                    name="tipo_tratamento"
                    value={formData.tipo_tratamento}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      outline: 'none',
                      transition: 'all 0.2s',
                      backgroundColor: 'white'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#059669'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  >
                    <option value="">Selecione</option>
                    <option value="Estético">Estético</option>
                    <option value="Odontológico">Odontológico</option>
                  </select>
                </div>
              </div>
            </div>
          )}
          
          {/* Passo 3: Endereço */}
          {passoAtual === 3 && (
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem', color: '#1e293b' }}>
                Endereço
              </h2>
              <p style={{ color: '#6b7280', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                Informe o endereço do paciente (opcional)
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#1e293b' }}>
                    Rua
                  </label>
                  <input
                    type="text"
                    name="endereco"
                    value={formData.endereco}
                    onChange={handleInputChange}
                    placeholder="Digite o nome da rua"
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      outline: 'none',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#059669'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#1e293b' }}>
                      Bairro
                    </label>
                    <input
                      type="text"
                      name="bairro"
                      value={formData.bairro}
                      onChange={handleInputChange}
                      placeholder="Digite o bairro"
                      style={{
                        width: '100%',
                        padding: '0.875rem',
                        border: '2px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        outline: 'none',
                        transition: 'all 0.2s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#059669'}
                      onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                    />
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#1e293b' }}>
                      Número
                    </label>
                    <input
                      type="text"
                      name="numero"
                      value={formData.numero}
                      onChange={handleInputChange}
                      placeholder="Nº"
                      style={{
                        width: '100%',
                        padding: '0.875rem',
                        border: '2px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        outline: 'none',
                        transition: 'all 0.2s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#059669'}
                      onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                    />
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#1e293b' }}>
                      CEP
                    </label>
                    <input
                      type="text"
                      name="cep"
                      value={formData.cep}
                      onChange={handleInputChange}
                      placeholder="00000-000"
                      maxLength={9}
                      style={{
                        width: '100%',
                        padding: '0.875rem',
                        border: '2px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        outline: 'none',
                        transition: 'all 0.2s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#059669'}
                      onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Passo 4: Observações e Finalizar */}
          {passoAtual === 4 && (
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem', color: '#1e293b' }}>
                Observações
              </h2>
              <p style={{ color: '#6b7280', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                Adicione observações sobre o paciente (opcional)
              </p>
              
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#1e293b' }}>
                  Observações
                </label>
                <textarea
                  name="observacoes"
                  value={formData.observacoes}
                  onChange={handleInputChange}
                  placeholder="Adicione observações sobre o paciente..."
                  rows="6"
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'all 0.2s',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#059669'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>
              
              <div style={{
                marginTop: '1.5rem',
                padding: '1rem',
                backgroundColor: '#fef3c7',
                border: '1px solid #fde68a',
                borderRadius: '8px',
                fontSize: '0.875rem',
                color: '#92400e'
              }}>
                <strong>⚠️ Revisão:</strong> Verifique se todos os dados estão corretos antes de finalizar o cadastro.
              </div>
            </div>
          )}
        </div>
        
        {/* Footer com botões */}
        <div style={{
          padding: '1.5rem',
          borderTop: '2px solid #e2e8f0',
          backgroundColor: '#f9fafb',
          display: 'flex',
          gap: '0.75rem',
          flexWrap: 'wrap'
        }}>
          {passoAtual > 1 && (
            <button
              onClick={voltarPasso}
              disabled={loading}
              style={{
                flex: passoAtual === 4 ? 1 : 'none',
                minWidth: passoAtual === 4 ? '100px' : '120px',
                padding: '0.875rem',
                backgroundColor: 'white',
                color: '#6b7280',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '0.95rem',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                touchAction: 'manipulation'
              }}
            >
              Voltar
            </button>
          )}
          
          {passoAtual < 4 ? (
            <button
              onClick={avancarPasso}
              disabled={loading}
              style={{
                flex: 2,
                minWidth: '150px',
                padding: '0.875rem',
                backgroundColor: loading ? '#9ca3af' : '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.95rem',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                touchAction: 'manipulation'
              }}
            >
              Continuar
            </button>
          ) : (
            <button
              onClick={handleFinalizarCadastro}
              disabled={loading}
              style={{
                flex: 2,
                minWidth: '150px',
                padding: '0.875rem',
                backgroundColor: loading ? '#9ca3af' : '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.95rem',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                touchAction: 'manipulation',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              {loading ? (
                <>
                  <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                  Cadastrando...
                </>
              ) : (
                'Finalizar Cadastro'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalCadastroPacienteClinica;

