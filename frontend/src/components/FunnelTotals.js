import React from 'react';
import BaseCard from './dashboard/BaseCard';
import { dashboardTheme, funnelStageColors } from '../config/dashboardStyles';

const FunnelTotals = ({ data }) => {
  const taxas = {
    leads_para_andamento: data.leads > 0 ? (data.em_andamento / data.leads) * 100 : 0,
    andamento_para_agendamento: data.em_andamento > 0 ? (data.agendamento / data.em_andamento) * 100 : 0,
    agendamento_para_fechamento: data.agendamento > 0 ? (data.fechamento / data.agendamento) * 100 : 0,
  };

  const conversionRate = data.leads > 0 ? ((data.fechamento / data.leads) * 100).toFixed(1) : '0.0';

  const stages = [
    { label: 'Leads', value: data.leads || 0, color: funnelStageColors.leads },
    { label: 'Em Andamento', value: data.em_andamento || 0, color: funnelStageColors.em_andamento },
    { label: 'Agendamento', value: data.agendamento || 0, color: funnelStageColors.agendamento },
    { label: 'Fechamento', value: data.fechamento || 0, color: funnelStageColors.fechamento },
  ];

  // Taxas entre estágios (índice da taxa corresponde ao índice do estágio de origem)
  const taxasEntreEstagios = [
    taxas.leads_para_andamento,      // Entre Leads (0) e Em Andamento (1)
    taxas.andamento_para_agendamento, // Entre Em Andamento (1) e Agendamento (2)
    taxas.agendamento_para_fechamento  // Entre Agendamento (2) e Fechamento (3)
  ];

  return (
    <BaseCard title="Totais do Funil">
      <div style={{ 
        display: 'flex', 
        alignItems: 'flex-start', 
        justifyContent: 'space-around', 
        marginBottom: dashboardTheme.spacing.sm,
        overflow: 'hidden' // SEM SCROLL - nunca
      }}>
        {stages.map((stage, index) => (
          <React.Fragment key={stage.label}>
            {/* Estágio */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: dashboardTheme.fontSize['4xl'] || '2.5rem',
                  fontWeight: dashboardTheme.fontWeight.bold,
                  color: stage.color
                }}>
                  {stage.value}
                </div>
                <div style={{
                  fontSize: dashboardTheme.fontSize.base,
                  color: dashboardTheme.colors.gray[500],
                  marginTop: dashboardTheme.spacing.xs
                }}>
                  {stage.label}
                </div>
              </div>
            </div>

            {/* Porcentagem ENTRE estágios (mostra taxa do estágio atual para o próximo) */}
            {index < stages.length - 1 && taxasEntreEstagios[index] !== null && taxasEntreEstagios[index] !== undefined && (
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                paddingTop: dashboardTheme.spacing.xl,
                gap: dashboardTheme.spacing.xs
              }}>
                {/* Porcentagem */}
                <div style={{ 
                  fontSize: '14px',
                  fontWeight: dashboardTheme.fontWeight.bold, 
                  color: dashboardTheme.colors.gray[800],
                  lineHeight: '1'
                }}>
                  {taxasEntreEstagios[index].toFixed(0)}%
                </div>
                {/* Seta */}
                <svg
                  style={{
                    width: '18px',
                    height: '18px',
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
        ))}
      </div>

      <div style={{
        paddingTop: dashboardTheme.spacing.sm,
        borderTop: `1px solid ${dashboardTheme.colors.gray[200]}`,
        textAlign: 'center'
      }}>
        <div style={{
          fontSize: dashboardTheme.fontSize.base, // Aumentado de sm para base
          color: dashboardTheme.colors.gray[500],
          marginBottom: dashboardTheme.spacing.xs
        }}>
          Taxa Conversão Geral
        </div>
        <div style={{
          fontSize: dashboardTheme.fontSize['4xl'] || '2.5rem', // Aumentado de 3xl para 4xl
          fontWeight: dashboardTheme.fontWeight.bold,
          color: dashboardTheme.colors.gray[800]
        }}>
          {conversionRate}%
        </div>
      </div>
    </BaseCard>
  );
};

export default FunnelTotals;

