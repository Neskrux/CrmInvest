import React from 'react';
import { useNavigate } from 'react-router-dom';

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
              • Entre no grupo do WhatsApp dos consultores
            </p>
            <p style={{ margin: '0 0 0.5rem 0' }}>
              • Comece a ganhar R$ 10 por cada R$ 1.000 fechados
            </p>
            <p style={{ margin: '0' }}>
              • Acesse agora sua área de trabalho
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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

          <button
            onClick={() => window.open('https://chat.whatsapp.com/H58PhHmVQpj1mRSj7wlZgs', '_blank')}
            style={{
              width: '100%',
              padding: '1rem',
              background: '#25D366',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
            onMouseOver={(e) => {
              e.target.style.background = '#128C7E';
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              e.target.style.background = '#25D366';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
            </svg>
            Entrar no Grupo dos Consultores
          </button>
        </div>

        <div style={{
          marginTop: '2rem',
          fontSize: '0.875rem',
          color: '#6b7280'
        }}>
          <p style={{ margin: 0 }}>
            Boas-vindas à nossa equipe!
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