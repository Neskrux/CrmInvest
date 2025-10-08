import React, { useState, useEffect, useRef } from 'react';

const tutorialSteps = [
  {
    id: 'welcome',
    title: 'Boas-vindas às Indicações!',
    content: 'Bem vindo a página de indicações, aqui você encontrará tudo que precisa para começar a ganhar dinheiro.',
    position: 'center'
  },
  {
    id: 'comissoes',
    title: 'Suas Comissões',
    content: 'Veja quanto você ganha: R$ 100 por cada clínica aprovada e 1% do valor do tratamento por cada paciente que fechar. Não há limite de ganhos!',
    targetSelector: '[data-tutorial="comissoes"]',
    position: 'bottom',
    scrollTo: true
  },
  {
    id: 'escolha-tipo',
    title: 'Escolha o Tipo de Indicação',
    content: 'Primeiro escolha oque você quer indicar, clínica ou paciente?',
    targetSelector: '[data-tutorial="escolha-tipo"]',
    position: 'bottom',
    scrollTo: true
  },
  {
    id: 'formulario-cadastro',
    title: 'Cadastro Direto',
    content: 'Você pode cadastrar clínicas e pacientes diretamente aqui! Preencha os dados e eles serão automaticamente atribuídos a você.',
    targetSelector: '[data-tutorial="formulario-cadastro"]',
    position: 'bottom',
    scrollTo: true
  },
  {
    id: 'mensagens',
    title: 'Mensagens Prontas',
    content: 'Em seguida, escolha uma mensagem pronta, elas são opcionais, você pode mudar para o seu jeito!',
    targetSelector: '[data-tutorial="mensagens"]',
    position: 'bottom',
    scrollTo: true
  },
  {
    id: 'imagens',
    title: 'Imagens Profissionais',
    content: 'Escolha uma imagem atrativa para acompanhar sua mensagem. Você pode baixar a imagem selecionada e enviá-la junto com o texto. Imagens aumentam muito a conversão!',
    targetSelector: '[data-tutorial="imagens"]',
    position: 'bottom',
    scrollTo: true
  },
  {
    id: 'link-personalizado',
    title: 'Seu Link Personalizado',
    content: 'Este é seu link único! Todos que se cadastrarem através dele serão automaticamente atribuídos a você. Copie e compartilhe onde quiser!',
    targetSelector: '[data-tutorial="link-personalizado"]',
    position: 'bottom',
    scrollTo: true
  },
  {
    id: 'final',
    title: 'Pronto para Começar!',
    content: 'Agora você já sabe como usar a página de Indicações. Escolha suas mensagens e imagens, copie seu link e comece a ganhar! Boa sorte!',
    position: 'center'
  }
];

const TutorialIndicacoes = ({ isOpen, onClose, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const overlayRef = useRef(null);

  // Resetar para primeira etapa sempre que o tutorial abrir
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen]);

  const currentTutorialStep = tutorialSteps[currentStep];

  // Função para rolar até o elemento
  const scrollToElement = (selector) => {
    const element = document.querySelector(selector);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Ajuste adicional para subir um pouco e evitar corte na parte inferior
      setTimeout(() => {
        window.scrollBy(0, -120);
      }, 500);
    }
  };

  // Função para posicionar a caixinha
  const getTooltipPosition = (selector, position) => {
    const element = document.querySelector(selector);
    if (!element) {
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }

    const rect = element.getBoundingClientRect();
    const tooltipWidth = 400;
    const tooltipHeight = 200;
    const margin = 20;
    const bottomMargin = 80; // Margem maior na parte inferior para evitar corte
    const isMobile = window.innerWidth <= 768;

    // Para mobile, centralizar todos os passos
    if (isMobile) {
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }

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
    // Usar margem maior na parte inferior para evitar corte
    if (top + tooltipHeight > window.innerHeight - bottomMargin) {
      top = window.innerHeight - tooltipHeight - bottomMargin;
    }

    return {
      top: `${Math.max(top, margin)}px`,
      left: `${Math.max(left, margin)}px`,
      transform: 'none'
    };
  };

  const nextStep = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const skipTutorial = () => {
    onComplete();
  };

  // Efeito para rolar até o elemento quando o step muda
  useEffect(() => {
    if (currentTutorialStep?.targetSelector && currentTutorialStep?.scrollTo) {
      setTimeout(() => {
        scrollToElement(currentTutorialStep.targetSelector);
      }, 500);
    }
  }, [currentStep, currentTutorialStep]);

  // Desabilitar overflow do body quando o tutorial estiver aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup: restaurar overflow quando o componente for desmontado
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

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
          ...(currentTutorialStep?.targetSelector && currentTutorialStep?.position !== 'center'
            ? getTooltipPosition(currentTutorialStep.targetSelector, currentTutorialStep.position || 'bottom')
            : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }),
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid #e5e7eb',
          maxWidth: '400px',
          minWidth: window.innerWidth <= 768 ? '320px' : 'auto',
          zIndex: 10001
        }}
      >
        {/* Arrow */}
        {currentTutorialStep?.targetSelector && currentTutorialStep?.position !== 'center' && 
         !(window.innerWidth <= 768) && (
          <div
            style={{
              position: 'absolute',
              width: 0,
              height: 0,
              borderStyle: 'solid',
              ...(currentTutorialStep.position === 'top' && {
                bottom: '-10px',
                left: '50%',
                transform: 'translateX(-50%)',
                borderWidth: '10px 10px 0 10px',
                borderColor: 'white transparent transparent transparent'
              }),
              ...(currentTutorialStep.position === 'bottom' && {
                top: '-10px',
                left: '50%',
                transform: 'translateX(-50%)',
                borderWidth: '0 10px 10px 10px',
                borderColor: 'transparent transparent white transparent'
              }),
              ...(currentTutorialStep.position === 'left' && {
                right: '-10px',
                top: '50%',
                transform: 'translateY(-50%)',
                borderWidth: '10px 0 10px 10px',
                borderColor: 'transparent transparent transparent white'
              }),
              ...(currentTutorialStep.position === 'right' && {
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
        <div style={{ padding: '1.5rem' }}>
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
                onClick={onClose}
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
              {currentTutorialStep?.title}
            </h3>
          </div>

          {/* Content */}
          <p style={{ 
            fontSize: '0.875rem', 
            color: '#4b5563', 
            lineHeight: '1.5',
            marginBottom: '1.5rem'
          }}>
            {currentTutorialStep?.content}
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
    </div>
  );
};

export default TutorialIndicacoes;

