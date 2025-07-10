import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logoBrasao from '../images/logobrasao.png';
import config from '../config';

const CapturaLead = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    tipo_tratamento: '',
    cpf: '',
    observacoes: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const formatarTelefone = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    } else {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
  };

  const formatarCPF = (value) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'telefone') {
      const formattedValue = formatarTelefone(value);
      setFormData(prev => ({ ...prev, [name]: formattedValue }));
    } else if (name === 'cpf') {
      const formattedValue = formatarCPF(value);
      setFormData(prev => ({ ...prev, [name]: formattedValue }));
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
      newErrors.nome = 'Nome é obrigatório';
    } else if (formData.nome.trim().length < 2) {
      newErrors.nome = 'Nome deve ter pelo menos 2 caracteres';
    }
    
    if (!formData.telefone.trim()) {
      newErrors.telefone = 'Telefone é obrigatório';
    } else if (formData.telefone.replace(/\D/g, '').length < 10) {
      newErrors.telefone = 'Telefone deve ter pelo menos 10 dígitos';
    }
    
    if (!formData.cpf.trim()) {
      newErrors.cpf = 'CPF é obrigatório';
    } else if (formData.cpf.replace(/\D/g, '').length !== 11) {
      newErrors.cpf = 'CPF deve ter 11 dígitos';
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
      const response = await fetch(`${config.API_URL}/leads/cadastro`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        navigate('/captura-sucesso', { 
          state: { 
            nome: data.nome,
            message: data.message 
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
    <div className="captura-lead-container">
      <div className="captura-background">
        <div className="captura-content">
          {/* Header com Logo */}
          <div className="captura-header">
            <img src={logoBrasao} alt="Logo" className="captura-logo" />
            <h1 className="captura-title">
              Transforme seu <span className="highlight">Sorriso</span>
            </h1>
            <p className="captura-subtitle">
              Agende sua consulta gratuita e descubra como podemos te ajudar a conquistar o sorriso dos seus sonhos
            </p>
          </div>

          {/* Benefícios */}
          <div className="captura-benefits">
            <div className="benefit-item">
              <div className="benefit-icon">✨</div>
              <span>Consulta Gratuita</span>
            </div>
            <div className="benefit-item">
              <div className="benefit-icon">🏆</div>
              <span>Profissionais Qualificados</span>
            </div>
            <div className="benefit-item">
              <div className="benefit-icon">💎</div>
              <span>Tecnologia Avançada</span>
            </div>
          </div>

          {/* Formulário */}
          <div className="captura-form-container">
            <h2 className="form-title">Preencha seus dados</h2>
            <p className="form-subtitle">
              Entraremos em contato em até 2 horas para agendar sua consulta
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
                  placeholder="Digite seu nome completo"
                  disabled={loading}
                />
                {errors.nome && <span className="field-error">{errors.nome}</span>}
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
                <label className="form-label">Tipo de Tratamento</label>
                <select
                  name="tipo_tratamento"
                  className="form-select"
                  value={formData.tipo_tratamento}
                  onChange={handleInputChange}
                  disabled={loading}
                >
                  <option value="">Selecione (opcional)</option>
                  <option value="Estético">Tratamento Estético</option>
                  <option value="Odontológico">Tratamento Odontológico</option>
                  <option value="Ambos">Ambos os Tratamentos</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">CPF *</label>
                <input
                  type="text"
                  name="cpf"
                  className={`form-input ${errors.cpf ? 'error' : ''}`}
                  value={formData.cpf}
                  onChange={handleInputChange}
                  placeholder="000.000.000-00"
                  disabled={loading}
                  maxLength="14"
                />
                {errors.cpf && <span className="field-error">{errors.cpf}</span>}
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
                  <span className="loading-spinner">Enviando...</span>
                ) : (
                  <>
                    <span>Agendar Consulta Gratuita</span>
                    <div className="btn-icon">🚀</div>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Depoimentos */}
          <div className="captura-testimonials">
            <h3 className="testimonials-title">O que nossos pacientes dizem</h3>
            <div className="testimonials-grid">
              <div className="testimonial-card">
                <div className="testimonial-stars">⭐⭐⭐⭐⭐</div>
                <p className="testimonial-text">
                  "Profissionais incríveis! Mudaram completamente meu sorriso e minha autoestima."
                </p>
                <div className="testimonial-author">- Maria Silva</div>
              </div>
              <div className="testimonial-card">
                <div className="testimonial-stars">⭐⭐⭐⭐⭐</div>
                <p className="testimonial-text">
                  "Atendimento excepcional e resultados que superaram minhas expectativas."
                </p>
                <div className="testimonial-author">- João Santos</div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="captura-footer">
            <div className="security-badges">
              <div className="security-badge">
                <span className="security-icon">🔒</span>
                <span>Dados Protegidos</span>
              </div>
              <div className="security-badge">
                <span className="security-icon">✅</span>
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
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
          background: linear-gradient(45deg, #ffd700, #ffed4a);
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
          font-size: 0.9rem;
        }

        .benefit-icon {
          font-size: 1.2rem;
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
        }

        .captura-submit-btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
          font-size: 1.2rem;
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

          .benefit-item {
            font-size: 0.8rem;
            padding: 10px 12px;
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

export default CapturaLead; 