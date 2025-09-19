import React, { createContext, useContext, useEffect, useRef } from 'react';
import useRealtimeLeads from '../hooks/useRealtimeLeads';
import { useAuth } from '../contexts/AuthContext';

const LeadNotificationContext = createContext();

export const useLeadNotification = () => {
  const context = useContext(LeadNotificationContext);
  if (!context) {
    throw new Error('useLeadNotification deve ser usado dentro de LeadNotificationProvider');
  }
  return context;
};

export const LeadNotificationProvider = ({ children }) => {
  const { isConnected, newLeadCount, requestLeadCount, AudioComponent } = useRealtimeLeads();
  const { isAdmin } = useAuth();
  const previousLeadCountRef = useRef(0);

  useEffect(() => {
    if (isConnected && isAdmin) {
      requestLeadCount();
    }
  }, [isConnected, isAdmin, requestLeadCount]);

  useEffect(() => {
    // Atualizar contagem de leads sem mostrar toast
    previousLeadCountRef.current = newLeadCount;
  }, [newLeadCount]);

  const value = {
    isConnected,
    newLeadCount,
    requestLeadCount
  };

  return (
    <LeadNotificationContext.Provider value={value}>
      {children}
      <AudioComponent />
    </LeadNotificationContext.Provider>
  );
};