import React from 'react';
import { BarChart, Bar, ResponsiveContainer, Cell } from 'recharts';
import { dashboardTheme, funnelStageColors } from '../../config/dashboardStyles';

/**
 * Componente de pipeline compacto usando Recharts
 * Mostra Leads → Em Andamento → Agendamento → Fechamento proporcionalmente
 * Layout vertical (horizontal bar) com stackOffset="expand" para ocupar 100% da largura
 */
const PipelineCompacto = ({ dados }) => {
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

  // Calcular total para normalização
  const total = etapas.reduce((sum, etapa) => sum + etapa.valor, 0);

  // Se não houver dados, mostrar gráfico vazio
  if (total === 0) {
    return (
      <div style={{ 
        height: '60px', 
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: dashboardTheme.colors.gray[500],
        fontSize: dashboardTheme.fontSize.sm
      }}>
        Sem dados
      </div>
    );
  }

  // Preparar dados para o gráfico (stacked bar)
  const chartData = [{
    name: 'Pipeline',
    leads: etapas[0].valor,
    em_andamento: etapas[1].valor,
    agendamento: etapas[2].valor,
    fechamento: etapas[3].valor
  }];

  const colors = [
    funnelStageColors.leads,
    funnelStageColors.em_andamento,
    funnelStageColors.agendamento,
    funnelStageColors.fechamento
  ];

  return (
    <div style={{ width: '100%', height: '60px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={chartData} 
          layout="vertical"
          margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
          barCategoryGap={0}
          stackOffset="expand"
        >
          <Bar 
            dataKey="leads" 
            stackId="a" 
            fill={colors[0]}
            radius={[0, 0, 0, 0]}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-leads-${index}`} fill={colors[0]} />
            ))}
          </Bar>
          <Bar 
            dataKey="em_andamento" 
            stackId="a" 
            fill={colors[1]}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-andamento-${index}`} fill={colors[1]} />
            ))}
          </Bar>
          <Bar 
            dataKey="agendamento" 
            stackId="a" 
            fill={colors[2]}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-agendamento-${index}`} fill={colors[2]} />
            ))}
          </Bar>
          <Bar 
            dataKey="fechamento" 
            stackId="a" 
            fill={colors[3]}
            radius={[0, 0, 0, 0]}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-fechamento-${index}`} fill={colors[3]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      
      {/* Legenda compacta abaixo do gráfico */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        marginTop: '4px',
        gap: '4px'
      }}>
        {etapas.map((etapa, index) => (
          <div key={index} style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            flex: 1,
            minWidth: 0
          }}>
            <div style={{
              fontSize: dashboardTheme.fontSize.xs,
              fontWeight: dashboardTheme.fontWeight.bold,
              color: etapa.cor
            }}>
              {etapa.valor}
            </div>
            <div style={{
              fontSize: '0.5rem',
              color: dashboardTheme.colors.gray[500],
              textAlign: 'center',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '100%'
            }}>
              {etapa.nome.split(' ')[0]}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PipelineCompacto;

