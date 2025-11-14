import React from 'react';
import FunilSDRCompacto from './dashboard/FunilSDRCompacto';
import BaseCard from './dashboard/BaseCard';
import { dashboardTheme } from '../config/dashboardStyles';

const SDRRankingCard = ({ sdr, funnel, rank, compact = false }) => {
  const funilData = funnel || { 
    leads: 0, 
    em_andamento: 0, 
    agendamento: 0, 
    fechamento: 0, 
    taxas: {} 
  };

  // Calcular taxa de conversão do SDR (Agendamento / Leads)
  const taxaConversao = funilData.leads > 0 
    ? ((funilData.agendamento / funilData.leads) * 100).toFixed(1)
    : '0.0';

  // Cores das bordas por ranking (ouro, prata, bronze)
  const rankBorderColors = {
    0: '#FFD700', // Ouro - 1° lugar
    1: '#C0C0C0', // Prata - 2° lugar
    2: '#CD7F32'  // Bronze - 3° lugar
  };

  const borderColor = rankBorderColors[rank] || dashboardTheme.colors.gray[200];
  const borderWidth = rank < 3 ? '3px' : '1px';
  const fotoSize = '48px'; // Aumentado de 36px para 48px

  // Calcular tamanhos reduzidos em 33% quando compacto
  const sizeMultiplier = compact ? 0.67 : 1; // 33% menor = 67% do tamanho original
  
  return (
    <BaseCard
      hover
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%', // Ocupa 100% da altura do grid (1fr)
        minHeight: 0, // Permite que o card encolha se necessário
        cursor: 'default',
        border: `${borderWidth} solid ${borderColor}`, // Borda colorida baseada no ranking
        overflow: 'hidden', // Previne sobreposição
        padding: compact ? `${0.75 * sizeMultiplier}rem` : '0.75rem' // Padding proporcional
      }}
    >
      {/* Cabeçalho do Card - Responsivo */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: compact ? '0.335rem' : dashboardTheme.spacing.sm, // 0.5rem * 0.67 = 0.335rem
        marginBottom: `${8 * sizeMultiplier}px`,
        flexShrink: 0,
        minHeight: 'fit-content' // Altura mínima baseada no conteúdo
      }}>
        {sdr.foto_url ? (
          <img
            src={sdr.foto_url}
            alt={sdr.nome}
            style={{
              width: `${parseInt(fotoSize) * sizeMultiplier}px`,
              height: `${parseInt(fotoSize) * sizeMultiplier}px`,
              borderRadius: '50%',
              objectFit: 'cover',
              border: `${3 * sizeMultiplier}px solid ${borderColor}` // Borda da foto com cor do ranking
            }}
          />
        ) : (
          <div style={{
            width: `${parseInt(fotoSize) * sizeMultiplier}px`,
            height: `${parseInt(fotoSize) * sizeMultiplier}px`,
            borderRadius: '50%',
            backgroundColor: dashboardTheme.colors.gray[100],
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: borderColor,
            fontWeight: dashboardTheme.fontWeight.bold,
            border: `${3 * sizeMultiplier}px solid ${borderColor}`, // Borda com cor do ranking
            fontSize: compact ? '0.67rem' : dashboardTheme.fontSize.xl // 1 * 0.67 = 0.67
          }}>
            {sdr.nome?.charAt(0)?.toUpperCase() || '?'}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: compact ? '1.072rem' : '1.6rem', // Aumentado em 60% (0.67*1.6=1.072, 1*1.6=1.6)
            fontWeight: dashboardTheme.fontWeight.semibold,
            color: dashboardTheme.colors.gray[800],
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginBottom: `${4 * sizeMultiplier}px`
          }}>
            {sdr.nome}
          </div>
          {/* Taxa Conversão abaixo do nome - Responsivo */}
          <div style={{ 
            display: 'flex',
            alignItems: 'baseline',
            gap: `${6 * sizeMultiplier}px`,
            lineHeight: '1.2'
          }}>
            <span style={{
              fontSize: compact ? '0.67rem' : '1rem', // Mesmo tamanho do nome do SDR
              color: dashboardTheme.colors.gray[500]
            }}>
              Taxa Conversão
            </span>
            <span style={{
              fontSize: `${1.6 * sizeMultiplier}rem`, // Aumentado de 1.2 para 1.6
              fontWeight: dashboardTheme.fontWeight.bold,
              color: dashboardTheme.colors.primary,
              lineHeight: '1'
            }}>
              {taxaConversao}%
            </span>
          </div>
        </div>
      </div>

      {/* Funil Compacto - COM CONTROLE DE OVERFLOW */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 0,
        maxHeight: '100%', // Limita altura máxima
        paddingTop: `${8 * sizeMultiplier}px`,
        paddingBottom: `${8 * sizeMultiplier}px`,
        paddingLeft: `${4 * sizeMultiplier}px`,
        paddingRight: `${4 * sizeMultiplier}px`,
        overflow: 'hidden' // Previne overflow
      }}>
        <FunilSDRCompacto dados={funilData} compact={compact} />
      </div>
    </BaseCard>
  );
};

export default SDRRankingCard;

