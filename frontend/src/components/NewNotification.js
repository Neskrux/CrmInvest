import React, { useState, useEffect } from 'react';
import './NewLeadNotification.css';

const NewNotification = ({ isVisible, onClose, type = 'lead', data }) => {
  const [animationClass, setAnimationClass] = useState('');

  useEffect(() => {
    if (isVisible) {
      setAnimationClass('show');
    }
  }, [isVisible]);

  if (!isVisible) return null;

  const isClinica = type === 'clinica';
  const title = isClinica ? 'NOVA CLÍNICA CADASTRADA!' : 'NOVO LEAD CHEGOU!';
  const subtitle = isClinica ? 'Uma nova clínica foi cadastrada no sistema' : 'Um novo lead foi adicionado ao sistema';
  const info = isClinica ? 'Verifique a aba "Novas Clínicas"' : 'Verifique a aba "Novos Leads"';

  return (
    <div className={`new-lead-notification ${animationClass}`}>
      <div className="notification-content">
        <div className="notification-icon">
          <div className="pulse-ring"></div>
          <div className="pulse-ring delay-1"></div>
          <div className="pulse-ring delay-2"></div>
          <div className="icon-bg">
            {isClinica ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path 
                  d="M12 2L2 7V10C2 16 6 20.5 12 22C18 20.5 22 16 22 10V7L12 2M12 4.5L20 8V10C20 15.2 17.2 18.8 12 20.1C6.8 18.8 4 15.2 4 10V8L12 4.5M12 8C9.8 8 8 9.8 8 12S9.8 16 12 16 16 14.2 16 12 14.2 8 12 8M12 10C13.1 10 14 10.9 14 12S13.1 14 12 14 10 13.1 10 12 10.9 10 12 10Z" 
                  fill="currentColor"
                />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path 
                  d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.11 3.89 23 5 23H19C20.11 23 21 22.11 21 21V9M19 9H14V4H5V21H19V9Z" 
                  fill="currentColor"
                />
              </svg>
            )}
          </div>
        </div>
        
        <div className="notification-text">
          <h3>{title}</h3>
          <p>{subtitle}</p>
          <div className="lead-info">
            <span className="lead-name">{info}</span>
            {data && data.nome && (
              <span className="lead-phone">{data.nome}</span>
            )}
            {data && data.cidade && data.estado && (
              <span className="lead-phone">{data.cidade}/{data.estado}</span>
            )}
            <span className="lead-phone">Clique em OK para parar o som</span>
          </div>
        </div>

        <button 
          className="ok-btn" 
          onClick={() => {
            setAnimationClass('hide');
            setTimeout(() => onClose(), 300);
          }}
        >
          OK
        </button>
      </div>
    </div>
  );
};

export default NewNotification;
