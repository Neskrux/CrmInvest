import React from 'react';

const LandingPage = ({ onCadastro, onLogin }) => {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '3rem',
        boxShadow: '0 30px 60px rgba(0, 0, 0, 0.2)',
        width: '100%',
        maxWidth: '600px',
        textAlign: 'center'
      }}>
        <div style={{ marginBottom: '3rem' }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: '800',
            color: '#1a1d23',
            marginBottom: '1rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Bem-vindo ao CRM
          </h1>
          <p style={{
            fontSize: '1.125rem',
            color: '#6b7280',
            marginBottom: '2rem',
            lineHeight: '1.6'
          }}>
            Transforme sua vida profissional com nossa plataforma
          </p>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem'
        }}>
          <button
            onClick={onCadastro}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              padding: '1.5rem 2rem',
              borderRadius: '12px',
              fontSize: '1.25rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 8px 20px rgba(102, 126, 234, 0.3)'
            }}
            onMouseOver={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 12px 30px rgba(102, 126, 234, 0.4)';
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'translateY(0px)';
              e.target.style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.3)';
            }}
          >
            <div style={{ marginBottom: '0.5rem' }}>
              💰 Quer ganhar uma renda extra?
            </div>
            <div style={{ fontSize: '0.875rem', opacity: '0.9' }}>
              Cadastre-se e comece a lucrar conosco
            </div>
          </button>

          <button
            onClick={onLogin}
            style={{
              background: 'white',
              color: '#667eea',
              border: '2px solid #667eea',
              padding: '1.5rem 2rem',
              borderRadius: '12px',
              fontSize: '1.25rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              e.target.style.background = '#667eea';
              e.target.style.color = 'white';
              e.target.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
              e.target.style.background = 'white';
              e.target.style.color = '#667eea';
              e.target.style.transform = 'translateY(0px)';
            }}
          >
            <div style={{ marginBottom: '0.5rem' }}>
              👤 Já sou um consultor...
            </div>
            <div style={{ fontSize: '0.875rem', opacity: '0.8' }}>
              Entre em sua conta
            </div>
          </button>
        </div>

        <div style={{
          marginTop: '3rem',
          padding: '1.5rem',
          background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
          borderRadius: '12px',
          border: '1px solid #e2e8f0'
        }}>
          <h3 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '1rem'
          }}>
            Por que escolher nosso CRM?
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '1rem',
            fontSize: '0.875rem',
            color: '#6b7280'
          }}>
            <div>
              <strong>💼 Comissões</strong>
              <br />
              R$ 5 por cada R$ 1000 fechados
            </div>
            <div>
              <strong>📊 Gestão</strong>
              <br />
              Plataforma completa
            </div>
            <div>
              <strong>🚀 Crescimento</strong>
              <br />
              Oportunidades ilimitadas
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage; 