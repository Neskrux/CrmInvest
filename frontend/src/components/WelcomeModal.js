import React, { useState } from 'react';

const WelcomeModal = ({ isOpen, onClose, onStartTutorial }) => {
  const [currentPage, setCurrentPage] = useState(0);

  const pages = [
    {
      title: 'Boas-vindas ao CRM Investmoney!',
      content: 'Ganhe dinheiro indicando pacientes ou clínicas odontológicas e estéticas!',
      buttonText: 'Próxima Página',
      onButtonClick: () => setCurrentPage(1)
    },
    {
      title: 'Como Funciona?',
      content: (
        <div>
          <p style={{ marginBottom: '16px' }}>
            Se você conhece alguém que deseja realizar procedimentos odontológicos ou estéticos 
            que não possui limite suficiente no cartão, ou o valor à vista na conta, 
            indique esse possível paciente para nós!
          </p>
          <p style={{ marginBottom: '16px' }}>
            Aqui trabalhamos com pacientes que desejam fazer os tratamentos parcelados no boleto. 
            Se você conhece alguém nessas condições, envie o link abaixo:
          </p>
          <div style={{ 
            backgroundColor: '#f8fafc', 
            border: '1px solid #e2e8f0', 
            borderRadius: '8px', 
            padding: '12px', 
            marginBottom: '16px',
            textAlign: 'center'
          }}>
            <a 
              href="https://crm.investmoneysa.com.br/captura-lead" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ 
                color: '#2563eb', 
                textDecoration: 'none', 
                fontWeight: '500',
                fontSize: '14px'
              }}
            >
              🔗 https://crm.investmoneysa.com.br/captura-lead
            </a>
          </div>
          <p style={{ marginBottom: '0' }}>
            Ou preencha as informações na tela de pacientes.
          </p>
        </div>
      ),
      buttonText: 'Próxima Página',
      onButtonClick: () => setCurrentPage(2)
    },
    {
      title: 'Para Clínicas Parceiras',
      content: (
        <div>
          <p style={{ marginBottom: '16px' }}>
            Nós enviamos o valor à vista do tratamento para nossas clínicas parceiras, 
            mesmo se o tratamento for parcelado no boleto.
          </p>
          <p style={{ marginBottom: '0' }}>
            Se você conhece alguma clínica que já trabalha com esse método de pagamento, 
            ou que gostaria de antecipar o recebimento do valor do tratamento conosco, 
            preencha as informações dessa clínica na página de clínicas!
          </p>
        </div>
      ),
      buttonText: 'Iniciar Tutorial',
      onButtonClick: onStartTutorial
    }
  ];

  const currentPageData = pages[currentPage];

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #e5e7eb',
          maxWidth: '500px',
          width: '100%',
          position: 'relative',
          animation: 'welcomeSlideIn 0.3s ease-out'
        }}
      >
        {/* Header */}
        <div style={{ 
          padding: '24px 24px 0 24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h2 style={{ 
              fontSize: '20px', 
              fontWeight: 'bold', 
              color: '#111827', 
              margin: 0 
            }}>
              {currentPageData.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              color: '#6b7280',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          <div style={{ 
            color: '#374151', 
            lineHeight: '1.6',
            fontSize: '18px'
          }}>
            {currentPageData.content}
          </div>

          {/* Progress dots */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '8px', 
            marginTop: '24px',
            marginBottom: '24px'
          }}>
            {pages.map((_, index) => (
              <div
                key={index}
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: index === currentPage ? '#3b82f6' : '#d1d5db',
                  transition: 'background-color 0.2s'
                }}
              />
            ))}
          </div>

          {/* Buttons */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center' 
          }}>
            <div>
              {currentPage > 0 && (
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    backgroundColor: 'white',
                    color: '#374151',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#f9fafb';
                    e.target.style.borderColor = '#9ca3af';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'white';
                    e.target.style.borderColor = '#d1d5db';
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6"></polyline>
                  </svg>
                  Anterior
                </button>
              )}
            </div>

            <button
              onClick={currentPageData.onButtonClick}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                border: 'none',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                color: 'white',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'linear-gradient(135deg, #2563eb, #7c3aed)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'linear-gradient(135deg, #3b82f6, #8b5cf6)';
              }}
            >
              <span>{currentPageData.buttonText}</span>
              {currentPage < pages.length - 1 && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              )}
            </button>
          </div>
        </div>

        <style jsx>{`
          @keyframes welcomeSlideIn {
            from {
              opacity: 0;
              transform: scale(0.9) translateY(20px);
            }
            to {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }
        `}</style>
      </div>
    </div>
  );
};

export default WelcomeModal;
