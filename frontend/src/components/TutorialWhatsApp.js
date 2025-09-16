import React, { useState, useEffect, useRef } from 'react';

const TutorialWhatsApp = ({ isOpen, onClose, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const overlayRef = useRef(null);

  const tutorialSteps = [
    {
      id: 'welcome-whatsapp',
      title: 'Bem-vindo ao Investmoney Conversas!',
      content: 'Esta ferramenta permite gerenciar conversas do WhatsApp, criar automações e vincular leads diretamente das conversas. Vamos conhecer tudo!',
      selector: '.page-header',
      position: 'center'
    },
    {
      id: 'tabs-whatsapp',
      title: 'Abas de Funcionalidades',
      content: 'Use as abas para alternar entre "Conversas" (chat), "Configurações" (conexão) e "Automações" (mensagens automáticas).',
      selector: '.tabs-container',
      position: 'bottom'
    },
    {
      id: 'conversas-sidebar',
      title: 'Lista de Conversas',
      content: 'Todas as conversas do WhatsApp aparecem aqui. Clique em uma conversa para ver as mensagens e responder.',
      selector: '.conversas-sidebar',
      position: 'right'
    },
    {
      id: 'area-mensagens',
      title: 'Área de Mensagens',
      content: 'Aqui você vê o histórico completo da conversa e pode enviar mensagens de texto, imagens, documentos e áudios.',
      selector: '.btn-outline',
      position: 'left'
    },
    {
      id: 'vincular-lead',
      title: 'Vincular Lead',
      content: 'Dentro de uma conversa, clique em "Vincular Lead" para transformar uma conversa do WhatsApp em um paciente no seu CRM. Muito útil para captar leads!',
      selector: '.btn-outline',
      position: 'left'
    },
    {
      id: 'configuracoes-whatsapp',
      title: 'Configurações e Conexão',
      content: 'Na aba "Configurações", conecte seu WhatsApp escaneando o QR Code. É seguro e usa sua própria conta do WhatsApp.',
      selector: '.tabs-container',
      position: 'bottom'
    },
    {
      id: 'automatizacoes-whatsapp',
      title: 'Automações Inteligentes',
      content: 'Crie mensagens automáticas para boas-vindas, respostas por palavras-chave ou horários específicos. Economize tempo!',
      selector: '.tabs-container',
      position: 'bottom'
    },
    {
      id: 'final-whatsapp',
      title: 'Incrível!',
      content: 'Agora você pode usar o WhatsApp integrado ao CRM. Conecte, converse, vincule leads e automatize respostas para ser mais eficiente!',
      selector: '.page-header',
      position: 'center'
    }
  ];

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      
      const mainContent = document.querySelector('.main-content');
      if (mainContent) {
        mainContent.style.zoom = '90%';
        mainContent.style.transformOrigin = 'top left';
      }
      
      setCurrentStep(0);
    } else {
      document.body.style.overflow = 'unset';
      
      const mainContent = document.querySelector('.main-content');
      if (mainContent) {
        mainContent.style.zoom = '100%';
        mainContent.style.transformOrigin = 'unset';
      }
    }

    return () => {
      document.body.style.overflow = 'unset';
      
      const mainContent = document.querySelector('.main-content');
      if (mainContent) {
        mainContent.style.zoom = '100%';
        mainContent.style.transformOrigin = 'unset';
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && currentStep < tutorialSteps.length) {
      const step = tutorialSteps[currentStep];
      scrollToElement(step.selector);
    }
  }, [currentStep, isOpen]);

  const scrollToElement = (selector) => {
    const element = document.querySelector(selector);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const nextStep = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTutorial();
    }
  };

  const skipTutorial = () => {
    onClose();
  };

  const completeTutorial = () => {
    onComplete();
  };

  const getTooltipPosition = (selector, position) => {
    const element = document.querySelector(selector);
    if (!element) {
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }

    const rect = element.getBoundingClientRect();
    const tooltipWidth = window.innerWidth <= 768 ? 400 : 400;
    const tooltipHeight = 200;
    const margin = 20;
    const isMobile = window.innerWidth <= 768;

    let top, left;

    // Para mobile, centralizar steps específicos (2, 3, 4, 5, 6, 7)
    if (isMobile && (currentStep === 2 || currentStep === 3 || currentStep === 4 || currentStep === 5 || currentStep === 6 || currentStep === 7)) {
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }

    // Posicionamento especial para desktop nos steps 6 e 7
    if (!isMobile && currentStep === 5) {
      top = Math.max(rect.top - tooltipHeight - 240, 240);
      left = Math.max(rect.left + (rect.width / 2) - (tooltipWidth / 2), 20);
      if (left + tooltipWidth > window.innerWidth - 20) {
        left = window.innerWidth - tooltipWidth - 20;
      }
      return {
        top: `${top}px`,
        left: `${left}px`,
        transform: 'none'
      };
    }
    if (!isMobile && currentStep === 6) {
        top = Math.max(rect.top - tooltipHeight - 220, 220);
        left = Math.max(rect.left + (rect.width / 2) - (tooltipWidth / 2), 20);
        if (left + tooltipWidth > window.innerWidth - 20) {
          left = window.innerWidth - tooltipWidth - 20;
        }
        return {
          top: `${top}px`,
          left: `${left}px`,
          transform: 'none'
        };
    }

    switch (position) {
      case 'top':
        top = rect.top - tooltipHeight - margin;
        left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
        break;
      case 'bottom':
        top = rect.bottom + margin;
        left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
        break;
      case 'left':
        top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
        left = rect.left - tooltipWidth - margin;
        break;
      case 'right':
        top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
        left = rect.right + margin;
        break;
      default:
        top = rect.bottom + margin;
        left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
    }

    // Ajustar se sair da tela
    if (left < margin) left = margin;
    if (left + tooltipWidth > window.innerWidth - margin) {
      left = window.innerWidth - tooltipWidth - margin;
    }
    if (top < margin) top = margin;
    if (top + tooltipHeight > window.innerHeight - margin) {
      top = window.innerHeight - tooltipHeight - margin;
    }

    return {
      top: `${Math.max(top, margin)}px`,
      left: `${Math.max(left, margin)}px`,
      transform: 'none'
    };
  };

  if (!isOpen) return null;

  const currentStepData = tutorialSteps[currentStep];
  const tooltipStyle = getTooltipPosition(currentStepData.selector, currentStepData.position);

  return (
    <div 
      ref={overlayRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        zIndex: 9999,
        pointerEvents: 'auto'
      }}
    >
      {/* Tutorial Card */}
      <div
        style={{
          position: 'absolute',
          ...tooltipStyle,
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid #e5e7eb',
          maxWidth: '400px',
          minWidth: window.innerWidth <= 768 ? '400px' : 'auto',
          zIndex: 10001
        }}
      >
        {/* Arrow */}
        {!(window.innerWidth <= 768 && (currentStep === 2 || currentStep === 3 || currentStep === 4 || currentStep === 5 || currentStep === 6 || currentStep === 7)) && (
          <div
            style={{
              position: 'absolute',
              width: 0,
              height: 0,
              borderStyle: 'solid',
              ...(currentStepData.position === 'top' && {
                bottom: '-10px',
                left: '50%',
                transform: 'translateX(-50%)',
                borderWidth: '10px 10px 0 10px',
                borderColor: 'white transparent transparent transparent'
              }),
              ...(currentStepData.position === 'center' && {
                  display: 'none'
                }),
              ...(currentStepData.position === 'bottom' && {
                top: '-10px',
                left: '50%',
                transform: 'translateX(-50%)',
                borderWidth: '0 10px 10px 10px',
                borderColor: 'transparent transparent white transparent'
              }),
              ...(currentStepData.position === 'left' && {
                right: '-10px',
                top: '50%',
                transform: 'translateY(-50%)',
                borderWidth: '10px 0 10px 10px',
                borderColor: 'transparent transparent transparent white'
              }),
              ...(currentStepData.position === 'right' && {
                left: '-10px',
                top: '50%',
                transform: 'translateY(-50%)',
                borderWidth: '10px 10px 10px 0',
                borderColor: 'transparent white transparent transparent'
              })
            }}
          />
        )}

        {/* Header */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '0.5rem'
          }}>
            <span style={{ 
              fontSize: '0.875rem', 
              color: '#6b7280',
              fontWeight: '500'
            }}>
              Passo {currentStep + 1} de {tutorialSteps.length}
            </span>
            <button
              onClick={skipTutorial}
              style={{
                background: 'none',
                border: 'none',
                color: '#9ca3af',
                cursor: 'pointer',
                fontSize: '1.5rem',
                padding: '0',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Fechar tutorial"
            >
              ×
            </button>
          </div>
          
          <h3 style={{ 
            fontSize: '1.125rem', 
            fontWeight: '600', 
            color: '#1f2937',
            margin: 0,
            lineHeight: '1.4'
          }}>
            {currentStepData.title}
          </h3>
        </div>

        {/* Content */}
        <p style={{ 
          fontSize: '0.875rem', 
          color: '#4b5563', 
          lineHeight: '1.5',
          marginBottom: '1.5rem'
        }}>
          {currentStepData.content}
        </p>

        {/* Progress Bar */}
        <div style={{ 
          width: '100%', 
          height: '4px', 
          backgroundColor: '#e5e7eb',
          borderRadius: '2px',
          marginBottom: '1.5rem',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${((currentStep + 1) / tutorialSteps.length) * 100}%`,
            height: '100%',
            backgroundColor: '#3b82f6',
            borderRadius: '2px',
            transition: 'width 0.3s ease'
          }} />
        </div>

        {/* Actions */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center'
        }}>
          <button
            onClick={skipTutorial}
            style={{
              background: 'none',
              border: '1px solid #d1d5db',
              color: '#6b7280',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#f9fafb';
              e.target.style.borderColor = '#9ca3af';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.borderColor = '#d1d5db';
            }}
          >
            Pular
          </button>

          <button
            onClick={nextStep}
            style={{
              backgroundColor: '#3b82f6',
              border: 'none',
              color: 'white',
              padding: '0.5rem 1.5rem',
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#2563eb';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#3b82f6';
            }}
          >
            {currentStep === tutorialSteps.length - 1 ? 'Finalizar' : 'Próximo'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TutorialWhatsApp;
