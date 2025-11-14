import React from 'react';
import { cardStyles, dashboardTheme } from '../../config/dashboardStyles';

/**
 * Componente base para cards do dashboard
 * Facilita modificações futuras mantendo consistência visual
 */
const BaseCard = ({ 
  children, 
  title, 
  style = {}, 
  hover = true,
  padding,
  ...props 
}) => {
  // Determina padding-top baseado no padding fornecido ou usa um valor reduzido
  const basePaddingTop = padding 
    ? (typeof padding === 'string' ? padding : (padding.top || padding)) 
    : dashboardTheme.spacing.sm; // Reduz padding-top padrão de md (0.75rem) para sm (0.5rem)
  
  const cardStyle = {
    ...cardStyles.base,
    ...(padding && { padding }),
    paddingTop: basePaddingTop,
    overflow: 'hidden', // SEM SCROLL - nunca
    marginTop: '0', // Remove qualquer margin-top extra
    ...style
  };

  const handleMouseEnter = (e) => {
    if (hover) {
      e.currentTarget.style.boxShadow = cardStyles.hover.boxShadow;
    }
  };

  const handleMouseLeave = (e) => {
    if (hover) {
      e.currentTarget.style.boxShadow = cardStyles.base.boxShadow;
    }
  };

  return (
    <div
      style={cardStyle}
      onMouseEnter={hover ? handleMouseEnter : undefined}
      onMouseLeave={hover ? handleMouseLeave : undefined}
      {...props}
    >
      {title && (
        <div style={{
          fontSize: dashboardTheme.fontSize.md,
          fontWeight: dashboardTheme.fontWeight.semibold,
          color: dashboardTheme.colors.gray[500],
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: dashboardTheme.spacing.xs, // Reduzido de sm para xs para melhor alinhamento
          marginTop: '0', // Remove qualquer margin-top extra
          textAlign: 'center'
        }}>
          {title}
        </div>
      )}
      {children}
    </div>
  );
};

export default BaseCard;

