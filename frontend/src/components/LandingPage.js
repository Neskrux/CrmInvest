import React from 'react';

const LandingPage = ({ onCadastro, onLogin }) => {
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
        {/* Logo e Título */}
        <div style={{ marginBottom: '3rem' }}>
          <h1 style={{
            fontSize: '2.5rem',
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
            letterSpacing: '0.05em',
            fontWeight: '500'
          }}>
            Enterprise Edition
          </p>
          <p style={{
            fontSize: '1rem',
            color: '#4b5563',
            marginTop: '1rem',
            lineHeight: '1.5'
          }}>
            Sistema profissional de gestão de consultores e vendas
          </p>
        </div>

        {/* Botões de Ação */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <button
            onClick={onCadastro}
            style={{
              background: '#1a1d23',
              color: 'white',
              border: 'none',
              padding: '1rem 2rem',
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
            Cadastrar como Consultor
          </button>

          <button
            onClick={onLogin}
            style={{
              background: 'white',
              color: '#1a1d23',
              border: '1px solid #d1d5db',
              padding: '1rem 2rem',
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
            Acessar Sistema
          </button>
        </div>

        {/* Informações do Sistema */}
        <div style={{
          marginTop: '3rem',
          paddingTop: '2rem',
          borderTop: '1px solid #e5e7eb'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1rem',
            textAlign: 'center'
          }}>
            <div>
              <div style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#1a1d23',
                marginBottom: '0.25rem'
              }}>
                R$ 5
              </div>
              <div style={{
                fontSize: '0.75rem',
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Por mil
              </div>
            </div>
            <div>
              <div style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#1a1d23',
                marginBottom: '0.25rem'
              }}>
                100%
              </div>
              <div style={{
                fontSize: '0.75rem',
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Online
              </div>
            </div>
            <div>
              <div style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#1a1d23',
                marginBottom: '0.25rem'
              }}>
                24/7
              </div>
              <div style={{
                fontSize: '0.75rem',
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Suporte
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '2rem',
          fontSize: '0.75rem',
          color: '#9ca3af'
        }}>
          <p>&copy; 2024 CRM System. Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage; 