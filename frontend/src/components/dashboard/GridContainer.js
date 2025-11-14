import React from 'react';
import { createGridStyle } from '../../config/dashboardStyles';

/**
 * Componente container com grid flexível
 * Facilita mudanças no layout sem modificar múltiplos arquivos
 */
const GridContainer = ({ 
  children, 
  columns = 3, 
  gap, 
  style = {},
  ...props 
}) => {
  const gridStyle = {
    ...createGridStyle(columns, gap),
    overflow: 'hidden', // SEM SCROLL - nunca
    ...style
  };

  return (
    <div style={gridStyle} {...props}>
      {children}
    </div>
  );
};

export default GridContainer;

