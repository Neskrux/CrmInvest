import React from 'react';
import { dashboardTheme, funnelStageColors } from '../../config/dashboardStyles';

/**
 * Componente de funil compacto para SDR
 * Mostra Leads → Em Andamento → Agendamento → Fechamento
 * Com números grandes (400% maiores) e semicírculos de conversão entre etapas
 */
const FunilSDRCompacto = ({ dados, compact = false }) => {
  // Calcular tamanhos reduzidos em 33% quando compacto
  const sizeMultiplier = compact ? 0.67 : 1; // 33% menor = 67% do tamanho original
  const etapas = [
    { 
      nome: 'Leads', 
      valor: dados.leads || 0, 
      cor: funnelStageColors.leads
    },
    { 
      nome: 'Em Andamento', 
      valor: dados.em_andamento || 0, 
      cor: funnelStageColors.em_andamento
    },
    { 
      nome: 'Agendamento', 
      valor: dados.agendamento || 0, 
      cor: funnelStageColors.agendamento
    },
    { 
      nome: 'Fechamento', 
      valor: dados.fechamento || 0, 
      cor: funnelStageColors.fechamento
    }
  ];

  // Calcular taxas de conversão entre etapas
  const calcularTaxa = (atual, anterior) => {
    if (!anterior || anterior === 0) return 0;
    return ((atual / anterior) * 100).toFixed(0);
  };

  const taxas = [
    null, // Leads não tem taxa anterior
    calcularTaxa(etapas[1].valor, etapas[0].valor), // Em Andamento / Leads
    calcularTaxa(etapas[2].valor, etapas[1].valor), // Agendamento / Em Andamento
    calcularTaxa(etapas[3].valor, etapas[2].valor)  // Fechamento / Agendamento
  ];

  return (
    <div style={{ 
      width: '100%', 
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: `${4 * sizeMultiplier}px`, // Aumentado de 2 para 4
      flexWrap: 'nowrap', // Garante que tudo fique na mesma linha
      overflowX: 'hidden', // SEM SCROLL - nunca
      overflowY: 'hidden', // SEM SCROLL - nunca
      paddingLeft: '0',
      paddingRight: '0',
      maxHeight: '100%', // Limita altura máxima
      maxWidth: '100%' // Limita largura máxima
    }}>
      {etapas.map((etapa, index) => {
        // Definir largura mínima individualizada para cada etapa (reduzida em 33% quando compacto)
        const largurasMinimas = compact ? {
          'Leads': `${70 * sizeMultiplier}px`, // Aumentado de 60 para 70
          'Em Andamento': `${105 * sizeMultiplier}px`, // Aumentado de 90 para 105
          'Agendamento': `${115 * sizeMultiplier}px`, // Aumentado de 100 para 115
          'Fechamento': `${95 * sizeMultiplier}px` // Aumentado de 85 para 95
        } : {
          'Leads': '70px',
          'Em Andamento': '105px',
          'Agendamento': '115px',
          'Fechamento': '95px'
        };
        
        const minWidth = largurasMinimas[etapa.nome] || `${70 * sizeMultiplier}px`;
        
        return (
          <React.Fragment key={index}>
            {/* Etapa */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              minWidth: minWidth,
              flexShrink: 0,
              flex: '0 0 auto'
            }}>
            {/* Número aumentado - reduzido em 33% quando compacto */}
            <div style={{
              fontSize: `${2 * sizeMultiplier}rem`, // Aumentado de 1.4 para 2
              fontWeight: dashboardTheme.fontWeight.bold,
              color: etapa.cor,
              lineHeight: '1',
              marginBottom: `${4 * sizeMultiplier}px` // Aumentado de 2 para 4
            }}>
              {etapa.valor}
            </div>
            {/* Label - nome completo - reduzido em 33% quando compacto */}
            <div style={{
              fontSize: compact ? '0.536rem' : '0.8rem', // Aumentado de 0.402/0.6 para 0.536/0.8
              color: dashboardTheme.colors.gray[500],
              textAlign: 'center',
              overflow: 'visible', // Permite que o texto apareça completo
              textOverflow: 'clip',
              whiteSpace: etapa.nome === 'Em Andamento' ? 'normal' : 'nowrap', // Permite quebra de linha para "Em Andamento"
              maxWidth: minWidth,
              lineHeight: '1.1',
              wordBreak: 'normal'
            }}>
              {etapa.nome}
            </div>
            </div>

            {/* Porcentagem e seta entre etapas - Responsivo */}
            {index < etapas.length - 1 && taxas[index + 1] !== null && (
              <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              justifyContent: 'center',
              paddingTop: `${0.5 * sizeMultiplier}rem`,
              flexShrink: 0,
              gap: `${6 * sizeMultiplier}px` // Aumentado de 4 para 6
            }}>
              {/* Porcentagem - reduzida em 33% quando compacto */}
              <div style={{ 
                fontSize: `${16 * sizeMultiplier}px`, // Aumentado de 12 para 16
                fontWeight: dashboardTheme.fontWeight.bold, 
                color: dashboardTheme.colors.gray[800],
                lineHeight: '1'
              }}>
                {taxas[index + 1]}%
              </div>
              {/* Seta para direita - reduzida em 33% quando compacto */}
              <svg
                style={{
                  width: `${18 * sizeMultiplier}px`, // Aumentado de 14 para 18
                  height: `${18 * sizeMultiplier}px`,
                  color: dashboardTheme.colors.gray[400]
                }}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default FunilSDRCompacto;

