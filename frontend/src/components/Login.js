import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Login = ({ onVoltar }) => {
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: '', senha: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Limpeza preventiva quando o Login é exibido
    console.log('🧹 Login exibido - fazendo limpeza preventiva do localStorage');
    localStorage.clear();
    sessionStorage.clear();
  }, []);

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
          <h1 style={{
            fontSize: '2rem',
            fontWeight: '700',
            color: '#1a1d23',
            marginBottom: '0.5rem',
            letterSpacing: '-0.025em'
          }}>
            CRM System
          </h1>
          <p style={{
            fontSize: '0.875rem',
            color: '#6b7280',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Enterprise Edition
          </p>
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
              marginBottom: '1rem'
            }}
            disabled={loading}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          <div style={{
            textAlign: 'center',
            paddingTop: '1rem',
            borderTop: '1px solid #e5e7eb'
          }}>
            <button
              type="button"
              onClick={handleDemoLogin}
              style={{
                background: 'none',
                border: 'none',
                color: '#2563eb',
                fontSize: '0.875rem',
                cursor: 'pointer',
                textDecoration: 'underline',
                marginBottom: '0.5rem'
              }}
            >
              Usar conta demonstração
            </button>
            <p style={{
              fontSize: '0.75rem',
              color: '#9ca3af',
              marginBottom: '1rem'
            }}>
              admin@investmoneysa.com.br / 123456
            </p>
            
            {onVoltar && (
              <button
                type="button"
                onClick={onVoltar}
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
            )}
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
        <p>&copy; 2024 CRM System. Todos os direitos reservados.</p>
      </div>
    </div>
  );
};

export default Login; 