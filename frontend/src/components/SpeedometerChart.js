import React from 'react';

const SpeedometerChart = ({ valor, meta, titulo, cor = '#3b82f6' }) => {
  const percentual = meta > 0 ? Math.min((valor / meta) * 100, 100) : 0;
  const faltante = Math.max(meta - valor, 0);
  
  // Determinar cor baseada no percentual
  // Até 50%: azul, depois de 50%: verde
  let corBarra = cor;
  if (percentual > 50) {
    corBarra = '#10b981'; // Verde para acima de 50%
  } else {
    corBarra = '#3b82f6'; // Azul para até 50%
  }
  
  // Formatar valor monetário
  const formatarValor = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(valor);
  };
  
  return (
    <div style={{ 
      width: '100%', 
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0.75rem',
      gap: '0.5rem'
    }}>
      {/* Título no topo */}
      <div style={{ 
        fontSize: '0.7rem',
        fontWeight: '600',
        color: '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        textAlign: 'center',
        width: '100%'
      }}>
        {titulo}
      </div>
      
      {/* Speedometer centralizado */}
      <div style={{ 
        position: 'relative',
        width: '120px',
        height: '60px',
        margin: '0.3rem 0'
      }}>
        {/* SVG do arco */}
        <svg 
          style={{ 
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%'
          }} 
          viewBox="0 0 100 50"
          preserveAspectRatio="none"
        >
          {/* Arco de fundo */}
          <path
            d="M 10 45 A 40 40 0 0 1 90 45"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Arco de progresso */}
          <path
            d="M 10 45 A 40 40 0 0 1 90 45"
            fill="none"
            stroke={corBarra}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${percentual * 1.26} 126`}
            style={{
              transition: 'stroke-dasharray 0.5s ease'
            }}
          />
        </svg>
        
        {/* Porcentagem no centro do speedometer (parte branca no meio) */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '35%',
            transform: 'translateX(-50%)',
            fontSize: '1.4rem',
            fontWeight: '700',
            color: corBarra,
            zIndex: 5,
            textAlign: 'center',
            lineHeight: '1.2',
            pointerEvents: 'none'
          }}
        >
          {percentual.toFixed(0)}%
        </div>
      </div>
      
      {/* Dados organizados verticalmente */}
      <div style={{ 
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.4rem',
        textAlign: 'center'
      }}>
        {/* Valor atual */}
        <div style={{ 
          fontSize: '1rem',
          fontWeight: '700',
          color: '#374151',
          lineHeight: '1.2'
        }}>
          {formatarValor(valor)}
        </div>
        
        {/* Meta */}
        <div style={{ 
          fontSize: '0.65rem',
          color: '#6b7280',
          marginTop: '0.15rem'
        }}>
          Meta: <strong style={{ color: '#374151' }}>{formatarValor(meta)}</strong>
        </div>
        
        {/* Faltam */}
        <div style={{ 
          fontSize: '0.6rem',
          color: '#9ca3af',
          marginTop: '0.1rem'
        }}>
          Faltam: {formatarValor(faltante)}
        </div>
      </div>
    </div>
  );
};

export default SpeedometerChart;

