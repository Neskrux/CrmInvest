import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const WelcomeModal = ({ isOpen, onClose, onStartTutorial }) => {
  const { makeRequest, user } = useAuth();
  const [currentPage, setCurrentPage] = useState(0);
  const [linkPersonalizado, setLinkPersonalizado] = useState(null);
  const [linkClinicas, setLinkClinicas] = useState(null);
  const [loadingLink, setLoadingLink] = useState(true);

  // Buscar link personalizado do consultor (apenas freelancers)
  useEffect(() => {
    if (isOpen && user?.tipo === 'consultor') {
      fetchLinkPersonalizado();
    }
  }, [isOpen, user]);

  const fetchLinkPersonalizado = async () => {
    try {
      // Usar a rota de perfil que o consultor pode acessar
      const consultorResponse = await makeRequest('/consultores/perfil');
      const responseData = await consultorResponse.json();
      
      if (consultorResponse.ok && responseData.consultor) {
        const consultorData = responseData.consultor;
        
        // Verificar se é consultor interno (tem as duas permissões)
        const isConsultorInterno = consultorData.pode_ver_todas_novas_clinicas === true && consultorData.podealterarstatus === true;
        
        if (!isConsultorInterno) {
          // Freelancer: buscar link personalizado baseado no código de referência
          if (consultorData.codigo_referencia) {
            setLinkPersonalizado(`https://crm.investmoneysa.com.br/captura-lead?ref=${consultorData.codigo_referencia}`);
            setLinkClinicas(`https://crm.investmoneysa.com.br/captura-clinica?ref=${consultorData.codigo_referencia}`);
          } else {
            // Se não tem código de referência, mostrar mensagem
            setLinkPersonalizado(null);
            setLinkClinicas(null);
          }
        } else {
          // Interno: usar link geral
          setLinkPersonalizado('https://crm.investmoneysa.com.br/captura-lead');
          setLinkClinicas('https://crm.investmoneysa.com.br/captura-clinica');
        }
      } else {
        console.error('Erro ao buscar dados do consultor:', responseData);
        setLinkPersonalizado(null);
        setLinkClinicas(null);
      }
    } catch (error) {
      console.error('Erro ao buscar link personalizado:', error);
      setLinkPersonalizado(null);
      setLinkClinicas(null);
    } finally {
      setLoadingLink(false);
    }
  };

  const copiarLink = async (link) => {
    try {
      await navigator.clipboard.writeText(link);
      alert('Link copiado para a área de transferência!');
    } catch (error) {
      // Fallback para navegadores mais antigos
      const textArea = document.createElement('textarea');
      textArea.value = link;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Link copiado para a área de transferência!');
    }
  };

  const pages = [
    {
      title: 'Boas-vindas ao CRM Investmoney!',
      content: (
        <div>
          <div style={{ 
            textAlign: 'center', 
            marginBottom: '20px',
            borderRadius: '12px',
            overflow: 'hidden'
          }}>
            <video 
              controls 
              style={{ 
                width: '100%', 
                maxWidth: '250px',
                borderRadius: '8px'
              }}
              poster="/logo.png"
            >
              <source src="/IMG_6744.MOV" type="video/quicktime" />
              <source src="/IMG_6744.MOV" type="video/mp4" />
              Seu navegador não suporta o elemento de vídeo.
            </video>
          </div>
          <p style={{ 
            textAlign: 'center', 
            fontSize: '16px', 
            color: '#374151',
            margin: '0'
          }}>
            Ganhe dinheiro indicando pacientes ou clínicas odontológicas e estéticas!
          </p>
        </div>
      ),
      buttonText: 'Próxima Página',
      onButtonClick: () => setCurrentPage(1)
    },
    {
      title: 'Como Funciona?',
      content: (
        <div>
          <p style={{ marginBottom: '16px' }}>
            <strong>Para Pacientes:</strong> Se você conhece alguém que deseja realizar procedimentos 
            odontológicos ou estéticos mas não possui limite suficiente no cartão ou o valor à vista, 
            indique esse possível paciente para nós!
          </p>
          <p style={{ marginBottom: '16px' }}>
            Trabalhamos com pacientes que desejam fazer os tratamentos parcelados no boleto. 
            Use seu link personalizado abaixo para indicar pacientes:
          </p>
          
          {loadingLink ? (
            <div style={{ 
              backgroundColor: '#f8fafc', 
              border: '1px solid #e2e8f0', 
              borderRadius: '8px', 
              padding: '16px', 
              marginBottom: '16px',
              textAlign: 'center'
            }}>
              <div style={{ color: '#6b7280', fontSize: '14px' }}>
                Carregando seu link personalizado...
              </div>
            </div>
          ) : linkPersonalizado ? (
            <div style={{ 
              backgroundColor: '#f0fdf4', 
              border: '2px solid #86efac', 
              borderRadius: '8px', 
              padding: '12px', 
              marginBottom: '16px'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                gap: '8px',
                marginBottom: '8px'
              }}>
                <span style={{ 
                  color: '#166534', 
                  fontWeight: '600',
                  fontSize: '14px'
                }}>
                  Link para Pacientes:
                </span>
                <button
                  onClick={() => copiarLink(linkPersonalizado)}
                  style={{
                    background: '#16a34a',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  Copiar
                </button>
              </div>
              <div style={{ 
                color: '#166534', 
                fontSize: '11px',
                fontFamily: 'monospace',
                wordBreak: 'break-all',
                lineHeight: '1.4',
                backgroundColor: 'rgba(255,255,255,0.5)',
                padding: '8px',
                borderRadius: '4px'
              }}>
                {linkPersonalizado}
              </div>
            </div>
          ) : (
            <div style={{ 
              backgroundColor: '#fef2f2', 
              border: '1px solid #fecaca', 
              borderRadius: '8px', 
              padding: '12px', 
              marginBottom: '16px',
              textAlign: 'center'
            }}>
              <div style={{ color: '#dc2626', fontSize: '14px', marginBottom: '8px' }}>
                Link personalizado não encontrado
              </div>
              <div style={{ color: '#6b7280', fontSize: '12px' }}>
                Entre em contato com o administrador para gerar seu link
              </div>
            </div>
          )}
          
          <p style={{ marginBottom: '16px', fontSize: '14px', color: '#6b7280' }}>
            <strong>Dica:</strong> Seu link estará sempre disponível na seção "Perfil" 
            quando precisar acessá-lo novamente!
          </p>
          <p style={{ marginBottom: '0' }}>
            Ou preencha as informações diretamente na tela de pacientes.
          </p>
        </div>
      ),
      buttonText: 'Próxima Página',
      onButtonClick: () => setCurrentPage(2)
    },
    {
      title: 'Link para Clínicas',
      content: (
        <div>
          <p style={{ marginBottom: '16px' }}>
            <strong>Para Clínicas:</strong> Se você conhece alguma clínica odontológica ou estética 
            que gostaria de trabalhar conosco, use seu link personalizado abaixo!
          </p>
          <p style={{ marginBottom: '16px' }}>
            Nós enviamos o valor à vista do tratamento para nossas clínicas parceiras, 
            mesmo se o tratamento for parcelado no boleto. Isso ajuda as clínicas a 
            receber o dinheiro mais rapidamente!
          </p>
          
          {loadingLink ? (
            <div style={{ 
              backgroundColor: '#f8fafc', 
              border: '1px solid #e2e8f0', 
              borderRadius: '8px', 
              padding: '16px', 
              marginBottom: '16px',
              textAlign: 'center'
            }}>
              <div style={{ color: '#6b7280', fontSize: '14px' }}>
                Carregando seu link personalizado...
              </div>
            </div>
          ) : linkClinicas ? (
            <div style={{ 
              backgroundColor: '#eff6ff', 
              border: '2px solid #93c5fd', 
              borderRadius: '8px', 
              padding: '12px', 
              marginBottom: '16px'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                gap: '8px',
                marginBottom: '8px'
              }}>
                <span style={{ 
                  color: '#1d4ed8', 
                  fontWeight: '600',
                  fontSize: '14px'
                }}>
                  Link para Clínicas:
                </span>
                <button
                  onClick={() => copiarLink(linkClinicas)}
                  style={{
                    background: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  Copiar
                </button>
              </div>
              <div style={{ 
                color: '#1d4ed8', 
                fontSize: '11px',
                fontFamily: 'monospace',
                wordBreak: 'break-all',
                lineHeight: '1.4',
                backgroundColor: 'rgba(255,255,255,0.5)',
                padding: '8px',
                borderRadius: '4px'
              }}>
                {linkClinicas}
              </div>
            </div>
          ) : (
            <div style={{ 
              backgroundColor: '#fef2f2', 
              border: '1px solid #fecaca', 
              borderRadius: '8px', 
              padding: '12px', 
              marginBottom: '16px',
              textAlign: 'center'
            }}>
              <div style={{ color: '#dc2626', fontSize: '14px', marginBottom: '8px' }}>
                Link personalizado não encontrado
              </div>
              <div style={{ color: '#6b7280', fontSize: '12px' }}>
                Entre em contato com o administrador para gerar seu link
              </div>
            </div>
          )}
          
          <p style={{ marginBottom: '16px', fontSize: '14px', color: '#6b7280' }}>
            <strong>Dica:</strong> Seu link estará sempre disponível na seção "Perfil" 
            quando precisar acessá-lo novamente!
          </p>
          <p style={{ marginBottom: '0' }}>
            Ou preencha as informações diretamente na tela de clínicas.
          </p>
        </div>
      ),
      buttonText: 'Próxima Página',
      onButtonClick: () => setCurrentPage(3)
    },
    {
      title: 'Para Clínicas Parceiras',
      content: (
        <div>
          <p style={{ marginBottom: '16px' }}>
            <strong>Resumo:</strong> Agora você tem acesso aos seus links personalizados para 
            indicar tanto pacientes quanto clínicas!
          </p>
          <p style={{ marginBottom: '16px' }}>
            <strong>Para Pacientes:</strong> Use o link personalizado para indicar pessoas que querem 
            fazer tratamentos parcelados no boleto.
          </p>
          <p style={{ marginBottom: '16px' }}>
            <strong>Para Clínicas:</strong> Use o link personalizado para indicar clínicas que querem 
            receber o valor à vista dos tratamentos.
          </p>
          <p style={{ marginBottom: '0', fontSize: '14px', color: '#6b7280' }}>
            <strong>Dica:</strong> Cada indicação bem-sucedida gera comissão para você! 
            Seus links estão sempre disponíveis na seção "Perfil".
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
