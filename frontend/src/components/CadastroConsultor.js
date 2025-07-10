import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logoBrasaoPreto from '../images/logobrasaopreto.png';

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
    aceitaTermos: false
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

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

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    let formattedValue = value;
    
    if (name === 'cpf') {
      formattedValue = formatCPF(value);
    } else if (name === 'telefone') {
      formattedValue = formatPhone(value);
    } else if (name === 'pix') {
      formattedValue = formatCPF(value);
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
      const response = await fetch('http://localhost:5000/api/consultores/cadastro', {
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
          tipo: 'consultor'
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        navigate('/cadastro-sucesso');
      } else {
        let errorMsg = data.error || 'Erro ao cadastrar consultor';
        if (errorMsg && errorMsg.toLowerCase().includes('consultores_email_key')) {
          errorMsg = 'Já existe um consultor cadastrado com este e-mail. Por favor, utilize outro e-mail.';
        }
        setErrors({ general: errorMsg });
      }
    } catch (error) {
      console.error('Erro no cadastro:', error);
      setErrors({ general: 'Erro de conexão. Tente novamente.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f9fafb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '8px',
        padding: '3rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
        border: '1px solid #e5e7eb',
        width: '100%',
        maxWidth: '600px'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img 
            src={logoBrasaoPreto} 
            alt="CRM System" 
            style={{ 
              width: '70px', 
              height: '70px', 
              marginBottom: '1rem',
              objectFit: 'contain'
            }} 
          />
          <h1 style={{
            fontSize: '2rem',
            fontWeight: '700',
            color: '#1a1d23',
            marginBottom: '0.75rem',
            letterSpacing: '-0.025em'
          }}>
            Cadastro de Consultor
          </h1>
          <p style={{
            fontSize: '1rem',
            color: '#4b5563',
            lineHeight: '1.5'
          }}>
            Preencha os dados abaixo para criar sua conta
          </p>
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
                  <a href="#" style={{ color: '#1a1d23', textDecoration: 'underline' }}>
                    termos de uso
                  </a>{' '}
                  e{' '}
                  <a href="#" style={{ color: '#1a1d23', textDecoration: 'underline' }}>
                    política de privacidade
                  </a>
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
                {loading ? 'Cadastrando...' : 'Cadastrar'}
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
            <li>Seu PIX deve ser o mesmo CPF informado</li>
            <li>Você receberá R$ 5 de comissão a cada R$ 1.000 fechados</li>
            <li>Seu login será feito com o e-mail informado</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CadastroConsultor; 