import React from 'react';

const MiniFunilSDR = ({ dados }) => {
  const etapas = [
    { 
      nome: 'Leads', 
      valor: dados.leads || 0, 
      cor: '#3b82f6',
      taxa: null
    },
    { 
      nome: 'Em Andamento', 
      valor: dados.em_andamento || 0, 
      cor: '#8b5cf6',
      taxa: dados.taxas?.leads_para_andamento || 0
    },
    { 
      nome: 'Agendamento', 
      valor: dados.agendamento || 0, 
      cor: '#f59e0b',
      taxa: dados.taxas?.andamento_para_agendamento || 0
    },
    { 
      nome: 'Fechamento', 
      valor: dados.fechamento || 0, 
      cor: '#10b981',
      taxa: dados.taxas?.agendamento_para_fechamento || 0
    }
  ];
  
  return (
    <div style={{ 
      width: '100%', 
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: '0.125rem'
    }}>
      {etapas.map((etapa, index) => (
        <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.125rem' }}>
          {/* Chip da etapa */} 
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '40px' }}>
            <div
              style={{
                borderRadius: '9999px',
                padding: '0.25rem 0.375rem',
                fontSize: '0.65rem',
                fontWeight: '700',
                color: 'white',
                textAlign: 'center',
                backgroundColor: etapa.cor
              }}
            >
              {etapa.valor}
            </div>
            <div style={{
              fontSize: '0.5rem',
              color: '#6b7280',
              marginTop: '0.125rem',
              textAlign: 'center',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '45px'
            }}>
              {etapa.nome}
            </div>
          </div>

          {/* Seta semicircular com porcentagem (exceto após a última etapa) */}
          {index < etapas.length - 1 && etapa.taxa !== null && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '0.5rem' }}>
              {/* Mini semicírculo com porcentagem */}
              <div style={{ position: 'relative', width: '24px', height: '12px', marginBottom: '0.125rem' }}>
                <svg viewBox="0 0 24 12" style={{ width: '100%', height: '100%' }}>
                  {/* Background semicircle */}
                  <path
                    d="M 2 12 A 10 10 0 0 1 22 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    style={{ color: 'rgba(107, 114, 128, 0.3)' }}
                  />
                  {/* Percentage text */}
                  <text 
                    x="12" 
                    y="9.5" 
                    textAnchor="middle" 
                    style={{ 
                      fontSize: '5.5px', 
                      fontWeight: '700', 
                      fill: '#1f2937' 
                    }}
                  >
                    {etapa.taxa.toFixed(0)}%
                  </text>
                </svg>
              </div>
              {/* Small arrow */}
              <svg
                style={{
                  width: '8px',
                  height: '8px',
                  color: '#9ca3af'
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
        </div>
      ))}
    </div>
  );
};

export default MiniFunilSDR;

