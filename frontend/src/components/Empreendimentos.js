import React from 'react';
import useBranding from '../hooks/useBranding';

const Empreendimentos = () => {
  const { t } = useBranding();

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Gerenciar {t.clinicas}</h1>
          <p className="page-subtitle">Gerencie os {t.clinica.toLowerCase()}s da sua empresa</p>
        </div>
      </div>
      
      <div className="page-content">
        <div style={{ 
          padding: '2rem', 
          textAlign: 'center', 
          backgroundColor: '#f9fafb', 
          borderRadius: '8px',
          border: '2px dashed #d1d5db'
        }}>
          <h2 style={{ color: '#6b7280', marginBottom: '1rem' }}>
            🏗️ Página de Empreendimentos
          </h2>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
            Esta página será implementada em breve para gerenciar empreendimentos.
          </p>
          <div style={{ 
            backgroundColor: '#fef3c7', 
            padding: '1rem', 
            borderRadius: '6px',
            border: '1px solid #f59e0b'
          }}>
            <p style={{ color: '#92400e', margin: 0, fontSize: '0.875rem' }}>
              <strong>Nota:</strong> Esta é uma página temporária. A funcionalidade completa será desenvolvida posteriormente.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Empreendimentos;
