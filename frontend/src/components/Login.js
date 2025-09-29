import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import logoBrasaoPreto from '../images/logobrasaopreto.png';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: '', senha: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(formData.email, formData.senha);
    
    if (!result.success) {
      setError(result.error || 'Credenciais inválidas. Verifique email e senha.');
    }
    setLoading(false);
  };

  const handleDemoLogin = () => {
    setFormData({ email: 'admin@investmoneysa.com.br', senha: '123456' });
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotPasswordMessage('');
    setForgotPasswordLoading(true);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: forgotPasswordEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        setForgotPasswordMessage('Instruções para redefinir sua senha foram enviadas para seu email. Caso não veja o e-mail, verifique sua caixa de spam.');
        setForgotPasswordEmail('');
        setTimeout(() => {
          setShowForgotPassword(false);
          setForgotPasswordMessage('');
        }, 3000);
      } else {
        setForgotPasswordMessage(data.error || 'Erro ao enviar email. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao solicitar redefinição de senha:', error);
      setForgotPasswordMessage('Erro ao conectar com o servidor. Tente novamente.');
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1a1d23 0%, #2d3748 100%)'
    }}>
      <div style={{
        background: 'white',
        padding: '3rem',
        borderRadius: '12px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img 
            src={logoBrasaoPreto} 
            alt="CRM System" 
            style={{ 
              width: '80px', 
              height: '80px', 
              marginBottom: '2rem',
              objectFit: 'contain'
            }} 
          />
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">E-mail</label>
            <input
              type="email"
              className="form-input"
              placeholder="seu@email.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              autoFocus
            />
            <div style={{ 
              fontSize: '0.75rem', 
              color: '#6b7280', 
              marginTop: '0.25rem' 
            }}>
              Use o email informado no seu cadastro
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Senha</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={formData.senha}
              onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
              required
            />
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '0.75rem',
              fontSize: '1rem',
              marginBottom: '1rem',
              justifyContent: 'center'
            }}
            disabled={loading}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#3b82f6',
                fontSize: '0.875rem',
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: '0.5rem'
              }}
            >
              Esqueci minha senha
            </button>
          </div>

          <div style={{
            textAlign: 'center',
            paddingTop: '1rem',
            borderTop: '1px solid #e5e7eb'
          }}>
           
            
            <button
              type="button"
              onClick={() => navigate('/')}
              style={{
                  background: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                ← Voltar
              </button>
          </div>
        </form>
      </div>

      <div style={{
        position: 'absolute',
        bottom: '2rem',
        left: '50%',
        transform: 'translateX(-50%)',
        textAlign: 'center',
        color: 'white',
        fontSize: '0.875rem',
        opacity: 0.8
      }}>
        <p>&copy; 2025 GIMTECH Solutions. Todos os direitos reservados.</p>
      </div>

      {/* Modal Esqueci Minha Senha */}
      {showForgotPassword && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowForgotPassword(false);
              setForgotPasswordMessage('');
            }
          }}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              maxWidth: '400px',
              width: '100%',
              padding: '2rem',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
            }}
          >
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: '#1a1d23' }}>
                Esqueci minha senha
              </h3>
              <p style={{ margin: '0.5rem 0 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
                Digite seu email para receber instruções de redefinição de senha.
              </p>
            </div>

            <form onSubmit={handleForgotPassword}>
              <div className="form-group">
                <label className="form-label">E-mail</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="seu@email.com"
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              {forgotPasswordMessage && (
                <div 
                  className="alert" 
                  style={{ 
                    marginBottom: '1rem',
                    backgroundColor: forgotPasswordMessage.includes('enviadas') ? '#d1fae5' : '#fee2e2',
                    color: forgotPasswordMessage.includes('enviadas') ? '#065f46' : '#dc2626',
                    border: `1px solid ${forgotPasswordMessage.includes('enviadas') ? '#a7f3d0' : '#fecaca'}`,
                    padding: '0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.875rem'
                  }}
                >
                  {forgotPasswordMessage}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotPasswordMessage('');
                    setForgotPasswordEmail('');
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    backgroundColor: 'white',
                    color: '#374151',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={forgotPasswordLoading}
                  style={{
                    padding: '0.5rem 1rem',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: forgotPasswordLoading ? '#9ca3af' : '#3b82f6',
                    color: 'white',
                    cursor: forgotPasswordLoading ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}
                >
                  {forgotPasswordLoading ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login; 