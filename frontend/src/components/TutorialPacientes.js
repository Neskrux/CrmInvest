import React, { useState, useEffect, useRef } from 'react';

const TutorialPacientes = ({ isOpen, onClose, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const overlayRef = useRef(null);

  const tutorialSteps = [
    {
      id: 'video-tutorial',
      title: 'Tutorial em Vídeo',
      content: 'Assista ao vídeo para entender como usar a área de pacientes:',
      selector: '.page-header',
      position: 'center',
      hasVideo: true,
      videoSrc: '/IMG_6823.MOV'
    },
    {
      id: 'stats-pacientes',
      title: 'Estatísticas Rápidas',
      content: 'Veja um resumo dos seus pacientes por status: Leads, Agendados, Fechados e taxa de conversão geral.',
      selector: '.stats-grid',
      position: 'bottom'
    },
    {
      id: 'filtros-pacientes',
      title: 'Filtros de Busca',
      content: 'Use os filtros para encontrar pacientes específicos por nome, telefone, CPF, tipo de tratamento, status, consultor ou data de cadastro.',
      selector: '.card .card-header',
      position: 'bottom'
    },
    {
      id: 'lista-pacientes',
      title: 'Lista de Pacientes Indicados',
      content: 'Aqui estão todos os seus pacientes onde você pode visualizar detalhes completos.',
      selector: '.table-container',
      position: 'top'
    },
    {
      id: 'final-pacientes',
      title: 'Pronto!',
      content: 'Agora você sabe como gerenciar seus pacientes indicados. Use os filtros para organizar, acompanhe o pipeline através dos status e não esqueça de verificar seus status regularmente!',
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
      
      // Reset para primeira etapa sempre que abrir
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

    // Para vídeo, sempre centralizar
    if (currentStepData.hasVideo) {
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }

    const rect = element.getBoundingClientRect();
    const tooltipWidth = window.innerWidth <= 768 ? 400 : 400;
    const tooltipHeight = 200;
    const margin = 20;

    let top, left;

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
          zoom: '80%',
          position: 'absolute',
          ...tooltipStyle,
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid #e5e7eb',
          maxWidth: currentStepData.hasVideo ? '420px' : '400px',
          minWidth: window.innerWidth <= 768 ? '350px' : 'auto',
          zIndex: 10001
        }}
      >
        {/* Arrow */}
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
            ...(currentStepData.position === 'bottom' && {
              top: '-10px',
              left: '50%',
              transform: 'translateX(-50%)',
              borderWidth: '0 10px 10px 10px',
              borderColor: 'transparent transparent white transparent'
            }),
            ...(currentStepData.position === 'center' && {
                display: 'none'
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

        {/* Video Player */}
        {currentStepData.hasVideo && (
          <div style={{ 
            marginBottom: '1.5rem',
            textAlign: 'center'
          }}>
            <video
              controls
              style={{
                width: '100%',
                maxWidth: '280px',
                height: 'auto',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            >
              <source src={currentStepData.videoSrc} type="video/mp4" />
              Seu navegador não suporta o elemento de vídeo.
            </video>
          </div>
        )}

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
            onClick={currentStep === 0 ? skipTutorial : () => setCurrentStep(currentStep - 1)}
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
            {currentStep === 0 ? 'Pular' : 'Voltar'}
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

export default TutorialPacientes;
