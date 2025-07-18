import React from 'react';
import { useNavigate } from 'react-router-dom';
import logoBrasaoAzul from '../images/logobrasaoazul.png';

const CadastroSucesso = () => {
  const navigate = useNavigate();
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
        maxWidth: '500px',
        textAlign: 'center'
      }}>
        <img 
                      src={logoBrasaoAzul} 
          alt="CRM System" 
          style={{ 
            width: '80px', 
            height: '80px', 
            marginBottom: '1rem',
            objectFit: 'contain'
          }} 
        />

        <div style={{
          width: '60px',
          height: '60px',
          background: '#059669',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 2rem'
        }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>

        <h1 style={{
          fontSize: '2rem',
          fontWeight: '700',
          color: '#1a1d23',
          marginBottom: '0.5rem',
          letterSpacing: '-0.025em'
        }}>
          Cadastro Realizado com Sucesso!
        </h1>

        <p style={{
          fontSize: '1rem',
          color: '#4b5563',
          marginBottom: '2rem',
          lineHeight: '1.5'
        }}>
          Você agora é um consultor da nossa plataforma.
        </p>

        <div style={{
          background: '#f9fafb',
          padding: '1.5rem',
          borderRadius: '6px',
          border: '1px solid #e5e7eb',
          marginBottom: '2rem',
          textAlign: 'left'
        }}>
          <h3 style={{
            fontSize: '1rem',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '1rem'
          }}>
            Próximos Passos:
          </h3>
          <div style={{
            color: '#6b7280',
            fontSize: '0.875rem',
            lineHeight: '1.6'
          }}>
            <p style={{ margin: '0 0 0.5rem 0' }}>
              • Seu cadastro foi aprovado automaticamente
            </p>
            <p style={{ margin: '0 0 0.5rem 0' }}>
              • Você pode fazer login com seu e-mail
            </p>
            <p style={{ margin: '0 0 0.5rem 0' }}>
              • Comece a ganhar R$ 5 por cada R$ 1.000 fechados
            </p>
            <p style={{ margin: '0' }}>
              • Acesse agora sua área de trabalho
            </p>
          </div>
        </div>

        <button
                      onClick={() => navigate('/login')}
          style={{
            width: '100%',
            padding: '1rem',
            background: '#1a1d23',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '1rem',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          onMouseOver={(e) => {
            e.target.style.background = '#0f1114';
            e.target.style.transform = 'translateY(-1px)';
          }}
          onMouseOut={(e) => {
            e.target.style.background = '#1a1d23';
            e.target.style.transform = 'translateY(0)';
          }}
        >
          Fazer Login Agora
        </button>

        <div style={{
          marginTop: '2rem',
          fontSize: '0.875rem',
          color: '#6b7280'
        }}>
          <p style={{ margin: 0 }}>
            Bem-vindo à nossa equipe!
          </p>
          <p style={{ margin: '0.5rem 0 0 0' }}>
            Estamos ansiosos para vê-lo crescer conosco.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CadastroSucesso; 