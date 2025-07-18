import React from 'react';

const MobileFormWrapper = ({ children, title, onClose }) => {
  return (
    <div className="mobile-form-wrapper">
      {title && (
        <div className="mobile-form-header">
          <h2>{title}</h2>
          {onClose && (
            <button 
              className="mobile-close-btn"
              onClick={onClose}
              aria-label="Fechar"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      )}
      <div className="mobile-form-content">
        {children}
      </div>
    </div>
  );
};

export default MobileFormWrapper; 