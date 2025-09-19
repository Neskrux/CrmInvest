import React, { useState, useEffect } from 'react';
import './NewLeadNotification.css';

const NewLeadNotification = ({ isVisible, onClose, leadData }) => {
  const [animationClass, setAnimationClass] = useState('');

  useEffect(() => {
    if (isVisible) {
      setAnimationClass('show');
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className={`new-lead-notification ${animationClass}`}>
      <div className="notification-content">
        <div className="notification-icon">
          <div className="pulse-ring"></div>
          <div className="pulse-ring delay-1"></div>
          <div className="pulse-ring delay-2"></div>
          <div className="icon-bg">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path 
                d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.11 3.89 23 5 23H19C20.11 23 21 22.11 21 21V9M19 9H14V4H5V21H19V9Z" 
                fill="currentColor"
              />
            </svg>
          </div>
        </div>
        
        <div className="notification-text">
          <h3>🎉 NOVO LEAD CHEGOU! 🎉</h3>
          <p>✨ Um novo lead foi adicionado ao sistema ✨</p>
          <div className="lead-info">
            <span className="lead-name">👤 Verifique a aba "Novos Leads"</span>
            <span className="lead-phone">📞 Clique em OK para parar o som</span>
          </div>
        </div>

        <button 
          className="ok-btn" 
          onClick={() => {
            setAnimationClass('hide');
            setTimeout(() => onClose(), 300);
          }}
        >
          ✅ OK
        </button>
      </div>
    </div>
  );
};

export default NewLeadNotification;
