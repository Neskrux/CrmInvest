import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import logoBrasaoPreto from '../assets/images/logobrasaopreto.png';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({ novaSenha: '', confirmarSenha: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [validatingToken, setValidatingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('Token de redefinição não encontrado');
      setValidatingToken(false);
      return;
    }

    // Validar token no servidor
    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/validate-reset-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (response.ok) {
        setTokenValid(true);
      } else {
        setError(data.error || 'Token inválido ou expirado');
      }
    } catch (error) {
      console.error('Erro ao validar token:', error);
      setError('Erro ao conectar com o servidor');
    } finally {
      setValidatingToken(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validações
    if (!formData.novaSenha) {
      setError('Nova senha é obrigatória');
      return;
    }

    if (formData.novaSenha.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (formData.novaSenha !== formData.confirmarSenha) {
      setError('As senhas não conferem');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          token, 
          novaSenha: formData.novaSenha 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Senha redefinida com sucesso! Redirecionando para o login...');
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(data.error || 'Erro ao redefinir senha');
      }
    } catch (error) {
      console.error('Erro ao redefinir senha:', error);
      setError('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  if (validatingToken) {
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
          maxWidth: '400px',
          textAlign: 'center'
        }}>
          <div style={{ marginBottom: '2rem' }}>
            <img 
              src={logoBrasaoPreto} 
              alt="Solumn" 
              style={{ 
                width: '80px', 
                height: '80px', 
                marginBottom: '1rem',
                objectFit: 'contain'
              }} 
            />
            <h2 style={{ margin: 0, color: '#1a1d23' }}>Validando token...</h2>
          </div>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
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
          maxWidth: '400px',
          textAlign: 'center'
        }}>
          <div style={{ marginBottom: '2rem' }}>
            <img 
              src={logoBrasaoPreto} 
              alt="Solumn" 
              style={{ 
                width: '80px', 
                height: '80px', 
                marginBottom: '1rem',
                objectFit: 'contain'
              }} 
            />
            <h2 style={{ margin: 0, color: '#1a1d23', marginBottom: '1rem' }}>Token Inválido</h2>
            <p style={{ color: '#666', marginBottom: '2rem' }}>{error}</p>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/login')}
              style={{ width: '100%' }}
            >
              Voltar ao Login
            </button>
          </div>
        </div>
      </div>
    );
  }

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
            alt="Solumn" 
            style={{ 
              width: '80px', 
              height: '80px', 
              marginBottom: '1rem',
              objectFit: 'contain'
            }} 
          />
          <h2 style={{ margin: 0, color: '#1a1d23' }}>Redefinir Senha</h2>
          <p style={{ color: '#666', margin: '0.5rem 0 0 0' }}>
            Digite sua nova senha
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nova Senha</label>
            <input
              type="password"
              className="form-input"
              placeholder="Digite sua nova senha"
              value={formData.novaSenha}
              onChange={(e) => setFormData({ ...formData, novaSenha: e.target.value })}
              required
              autoFocus
              minLength="6"
            />
            <small style={{ color: '#6b7280', fontSize: '0.75rem' }}>
              Mínimo de 6 caracteres
            </small>
          </div>

          <div className="form-group">
            <label className="form-label">Confirmar Nova Senha</label>
            <input
              type="password"
              className="form-input"
              placeholder="Confirme sua nova senha"
              value={formData.confirmarSenha}
              onChange={(e) => setFormData({ ...formData, confirmarSenha: e.target.value })}
              required
              minLength="6"
            />
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          {success && (
            <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
              {success}
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
            {loading ? 'Redefinindo...' : 'Redefinir Senha'}
          </button>

          <div style={{ textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => navigate('/login')}
              style={{
                background: 'none',
                border: 'none',
                color: '#6b7280',
                textDecoration: 'underline',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              Voltar ao login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
