import React, { useState, useEffect, useRef } from 'react';

const tutorialSteps = [
  {
    id: 'welcome',
    title: 'Boas-vindas ao Dashboard!',
    content: 'Boas-vindas ao Dashboard, onde você consultor freelancer pode visualizar suas informações de forma rápida e fácil.',
    position: 'center'
  },
  {
    id: 'filters-total',
    title: 'Filtro por Período - Total',
    content: 'Com essa opção ativa você verá as informações de todo o período desde que você começou a ser consultor freelancer.',
    targetSelector: '[data-tutorial="filter-total"]',
    position: 'left'
  },
  {
    id: 'filters-weekly',
    title: 'Filtro por Período - Semanal',
    content: 'Ou visualize apenas os dados da semana atual.',
    targetSelector: '[data-tutorial="filter-weekly"]',
    position: 'left'
  },
  {
    id: 'filters-monthly',
    title: 'Filtro por Período - Mensal',
    content: 'E também pode visualizar os dados do mês atual.',
    targetSelector: '[data-tutorial="filter-monthly"]',
    position: 'left'
  },
  {
    id: 'region-filter',
    title: 'Filtro por Região',
    content: 'Você pode filtrar seus dados por região, selecionando o Estado a ser visualizado e depois a cidade se necessário.',
    targetSelector: '[data-tutorial="region-filter"]',
    position: 'bottom'
  },
  {
    id: 'main-kpis',
    title: 'KPIs Principais',
    content: 'Aqui você visualiza seus dados principais: o total de pacientes que você possui em sua conta e seu crescimento comparado ao mês anterior, quantos desses pacientes tiveram agendamentos marcados com clínicas, quantos fechamentos após agendamento e também o valor total gerado por seus fechamentos. Logo abaixo você também pode ver a sua comissão adquirida no mês atual e também o total geral ao lado.',
    targetSelector: '[data-tutorial="main-kpis"]',
    position: 'bottom',
    scrollTo: true
  },
  {
    id: 'cities-chart',
    title: 'Gráfico de Cidades',
    content: 'Aqui você pode visualizar as cidades com maior movimentação, pra facilitar ainda mais sua prospecção de novos leads. Você poderá ver o número de pacientes, agendamentos e fechamentos em cada cidade com base nos dados de outros consultores que também utilizam a plataforma. Embaixo do gráfico você também pode visualizar a taxa de conversão por cada cidade que aparece no gráfico.',
    targetSelector: '[data-tutorial="cities-chart"]',
    position: 'bottom',
    scrollTo: true
  },
  {
    id: 'sales-pipeline',
    title: 'Pipeline de Vendas',
    content: 'Aqui no Pipeline de Vendas você poderá ter outra visualização sobre o estado de todos os seus pacientes mostrando o número e a porcentagem de seus pacientes que estão naquele status específico.',
    targetSelector: '[data-tutorial="sales-pipeline"]',
    position: 'bottom',
    scrollTo: true
  },
  {
    id: 'ranking',
    title: 'Ranking de Consultores',
    content: 'Aqui você pode visualizar o Ranking de Consultores de toda a plataforma, visualizando todos os seus números e informações sobre fechamentos. Os três melhores consultores ganham bonificações todo mês em que terminam no top 3!',
    targetSelector: '[data-tutorial="ranking"]',
    position: 'bottom',
    scrollTo: true
  },
  {
    id: 'conversion-rate',
    title: 'Taxa de Conversão',
    content: 'Aqui você poderá visualizar o número de cada status atual dos seus pacientes e também a taxa de conversão total, para acompanhar ainda melhor como está sendo a sua produtividade.',
    targetSelector: '[data-tutorial="conversion-rate"]',
    position: 'bottom',
    scrollTo: true
  }
];

const TutorialOverlay = ({ isOpen, onClose, onComplete }) => {
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
      // Para os KPIs principais (step 6), fazer scroll mais para baixo
      if (currentStep === 5) { // Step 6 - KPIs principais
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } 
      // Para cidades (step 7), fazer scroll menos para baixo
      else if (currentStep === 6) { // Step 7 - cidades
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Scroll adicional menor para cima para não ir tão para baixo
        setTimeout(() => {
          window.scrollBy(0, -100);
        }, 500);
      }
      // Para pipeline de vendas (step 8), fazer scroll menos para baixo
      else if (currentStep === 7) { // Step 8 - pipeline de vendas
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Scroll adicional para cima para não ir tão para baixo
        setTimeout(() => {
          window.scrollBy(0, -150);
        }, 500);
      }
      else if (currentStep === 8) { // Step 9 - ranking
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Scroll adicional para cima para não ir tão para baixo
        setTimeout(() => {
          window.scrollBy(0, -70);
        }, 500);
      }
      else {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
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
    const isMobile = window.innerWidth <= 768;

    let top, left;

    // Para mobile, centralizar filtros de período (steps 2, 3, 4)
    if (isMobile && (currentStep === 1 || currentStep === 2 || currentStep === 3)) {
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }

    // Para mobile, centralizar KPIs principais, gráfico de cidades, pipeline e ranking (steps 6, 7, 8, 9)
    if (isMobile && (currentStep === 5 || currentStep === 6 || currentStep === 7 || currentStep === 8)) {
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }

    // Posicionamento especial para KPIs principais (step 6) - apenas desktop
    if (!isMobile && currentStep === 5) { // Step 6 - KPIs principais
      top = Math.max(rect.top - tooltipHeight - 200, 200);
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

    // Posicionamento especial para cidades (step 7) - apenas desktop
    if (!isMobile && currentStep === 6) { // Step 7 - cidades
      top = Math.max(rect.top - tooltipHeight - 200, 200);
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

    // Posicionamento especial para pipeline de vendas (step 8) - apenas desktop
    if (!isMobile && currentStep === 7) { // Step 8 - pipeline de vendas
      top = Math.max(rect.top - tooltipHeight - 480, 480);
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

    // Posicionamento especial para ranking (step 9) - apenas desktop
    if (!isMobile && currentStep === 8) { // Step 9 - ranking
      top = Math.max(rect.top - tooltipHeight - 400, 400);
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
      }, 500); // Aumentar delay para garantir que o elemento esteja renderizado
    }
  }, [currentStep, currentTutorialStep]);

  // Desabilitar overflow do body e ajustar zoom quando o tutorial estiver aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      
      // Aplicar zoom apenas no conteúdo principal (excluindo sidebar)
      const mainContent = document.querySelector('.main-content');
      
      if (mainContent) {
        mainContent.style.zoom = '90%';
        mainContent.style.transformOrigin = 'top left';
      }
    } else {
      document.body.style.overflow = 'unset';
      
      // Restaurar zoom do conteúdo principal
      const mainContent = document.querySelector('.main-content');
      
      if (mainContent) {
        mainContent.style.zoom = '100%';
        mainContent.style.transformOrigin = 'unset';
      }
    }

    // Cleanup: restaurar overflow e zoom quando o componente for desmontado
    return () => {
      document.body.style.overflow = 'unset';
      
      const mainContent = document.querySelector('.main-content');
      
      if (mainContent) {
        mainContent.style.zoom = '100%';
        mainContent.style.transformOrigin = 'unset';
      }
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
          minWidth: window.innerWidth <= 768 ? '400px' : 'auto',
          zIndex: 10001
        }}
      >
        {/* Arrow */}
        {currentTutorialStep?.targetSelector && currentTutorialStep?.position !== 'center' && 
         !(window.innerWidth <= 768 && (currentStep === 1 || currentStep === 2 || currentStep === 3)) && (
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
    </div>
  );
};

export default TutorialOverlay;