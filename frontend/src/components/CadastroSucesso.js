import React from 'react';

const CadastroSucesso = ({ onIrParaLogin }) => {
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
        maxWidth: '500px',
        textAlign: 'center'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 2rem'
        }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>

        <h1 style={{
          fontSize: '2rem',
          fontWeight: '700',
          color: '#1a1d23',
          marginBottom: '1rem'
        }}>
          Cadastro Realizado com Sucesso!
        </h1>

        <p style={{
          fontSize: '1.125rem',
          color: '#6b7280',
          marginBottom: '2rem',
          lineHeight: '1.6'
        }}>
          Parabéns! Você agora é um consultor da nossa plataforma.
        </p>

        <div style={{
          background: '#f0f9ff',
          padding: '1.5rem',
          borderRadius: '12px',
          border: '1px solid #bae6fd',
          marginBottom: '2rem'
        }}>
          <h3 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            color: '#0369a1',
            marginBottom: '1rem'
          }}>
            Próximos Passos:
          </h3>
          <div style={{
            textAlign: 'left',
            color: '#0369a1',
            fontSize: '0.875rem',
            lineHeight: '1.5'
          }}>
            <p style={{ margin: '0 0 0.5rem 0' }}>
              ✅ Seu cadastro foi aprovado automaticamente
            </p>
            <p style={{ margin: '0 0 0.5rem 0' }}>
              📧 Você pode fazer login com seu e-mail
            </p>
            <p style={{ margin: '0 0 0.5rem 0' }}>
              💰 Comece a ganhar R$ 5 por cada R$ 1.000 fechados
            </p>
            <p style={{ margin: '0' }}>
              🎯 Acesse agora sua área de trabalho
            </p>
          </div>
        </div>

        <button
          onClick={onIrParaLogin}
          style={{
            width: '100%',
            padding: '1rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '1.125rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onMouseOver={(e) => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.3)';
          }}
          onMouseOut={(e) => {
            e.target.style.transform = 'translateY(0px)';
            e.target.style.boxShadow = 'none';
          }}
        >
          Fazer Login Agora
        </button>

        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          background: '#fef3c7',
          borderRadius: '8px',
          border: '1px solid #fde68a'
        }}>
          <p style={{
            fontSize: '0.875rem',
            color: '#92400e',
            margin: 0,
            fontWeight: '500'
          }}>
            🎉 Bem-vindo à nossa equipe! Estamos ansiosos para vê-lo crescer conosco.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CadastroSucesso; 