import React from 'react';

const FunilVisual = ({ dados }) => {
  const etapas = [
    { nome: 'Leads', valor: dados.leads_entram || 0, cor: '#3b82f6' },
    { nome: 'Agendamento', valor: dados.agendamento || 0, cor: '#8b5cf6' },
    { nome: 'Comparecimento', valor: dados.comparecimento || 0, cor: '#f59e0b' },
    { nome: 'Fechamento', valor: dados.fechamento || 0, cor: '#10b981' }
    // { nome: 'Pagamento Entrada', valor: dados.pagamento_entrada || 0, cor: '#06b6d4' } // Comentado por enquanto
  ];
  
  const maxValor = dados.leads_entram || 1;
  
  return (
    <div style={{ 
      width: '100%', 
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem'
    }}>
      {etapas.map((etapa, index) => {
        const larguraPercent = (etapa.valor / maxValor) * 100;
        
        // Calcular taxa de conversão
        let taxaConversao = '100';
        if (index > 0) {
          // Para Fechamento, calcular em relação aos Leads (primeira etapa)
          if (etapa.nome === 'Fechamento' && etapas[0].valor > 0) {
            taxaConversao = ((etapa.valor / etapas[0].valor) * 100).toFixed(0);
          }
          // Para outras etapas, calcular em relação à etapa anterior
          else if (etapas[index - 1].valor > 0) {
            taxaConversao = ((etapa.valor / etapas[index - 1].valor) * 100).toFixed(0);
          }
        }
        
        return (
          <div key={index} style={{ 
            display: 'flex',
            flexDirection: 'column',
            gap: '0.2rem'
          }}>
            {/* Cabeçalho com nome e valores */}
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.7rem'
            }}>
              <span style={{ 
                fontWeight: '600',
                color: '#374151'
              }}>
                {etapa.nome}
              </span>
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                {index > 0 && (
                  <span style={{ 
                    color: '#6b7280',
                    fontSize: '0.65rem'
                  }}>
                    {taxaConversao}% conversão
                  </span>
                )}
                <span style={{ 
                  fontWeight: '700',
                  color: '#374151',
                  fontSize: '0.7rem'
                }}>
                  {etapa.valor}
                </span>
              </div>
            </div>
            
            {/* Barra de progresso */}
            <div style={{
              width: '100%',
              height: '32px',
              overflow: 'hidden',
              borderRadius: '6px',
              backgroundColor: '#f3f4f6',
              position: 'relative'
            }}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.max(larguraPercent, 5)}%`,
                  backgroundColor: etapa.cor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  paddingRight: '10px',
                  color: 'white',
                  fontSize: '0.7rem',
                  fontWeight: '700',
                  transition: 'width 0.5s ease',
                  borderRadius: '6px',
                  minWidth: larguraPercent < 15 ? '50px' : 'auto' // Garantir espaço mínimo para mostrar porcentagem
                }}
              >
                {larguraPercent > 0 && `${larguraPercent.toFixed(0)}%`}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default FunilVisual;

