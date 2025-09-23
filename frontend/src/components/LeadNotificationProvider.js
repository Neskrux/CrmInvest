import React, { createContext, useContext, useEffect, useRef } from 'react';
import useRealtimeLeads from '../hooks/useRealtimeLeads';
import useRealtimeClinicas from '../hooks/useRealtimeClinicas';
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
  const { isConnected, newLeadCount, requestLeadCount } = useRealtimeLeads();
  const { isConnected: clinicasConnected, newClinicasCount, requestClinicasCount } = useRealtimeClinicas();
  const { isAdmin } = useAuth();
  const previousLeadCountRef = useRef(0);
  const previousClinicasCountRef = useRef(0);

  useEffect(() => {
    if (isConnected && isAdmin) {
      requestLeadCount();
    }
  }, [isConnected, isAdmin, requestLeadCount]);

  useEffect(() => {
    if (clinicasConnected && isAdmin) {
      requestClinicasCount();
    }
  }, [clinicasConnected, isAdmin, requestClinicasCount]);

  useEffect(() => {
    // Notificar apenas quando há novos leads (contagem aumentou)
    if (isAdmin && newLeadCount > previousLeadCountRef.current && previousLeadCountRef.current > 0) {
      // A notificação sonora e visual já é gerenciada pelo useRealtimeLeads
      console.log(`🎉 ${newLeadCount - previousLeadCountRef.current} novo(s) lead(s) detectado(s)!`);
    }
    
    // Atualizar contagem de leads
    previousLeadCountRef.current = newLeadCount;
  }, [newLeadCount, isAdmin]);

  useEffect(() => {
    // Notificar apenas quando há novas clínicas (contagem aumentou)
    if (isAdmin && newClinicasCount > previousClinicasCountRef.current && previousClinicasCountRef.current > 0) {
      // A notificação sonora e visual já é gerenciada pelo useRealtimeClinicas
      console.log(`🏥 ${newClinicasCount - previousClinicasCountRef.current} nova(s) clínica(s) detectada(s)!`);
    }
    
    // Atualizar contagem de clínicas
    previousClinicasCountRef.current = newClinicasCount;
  }, [newClinicasCount, isAdmin]);

  const value = {
    isConnected,
    newLeadCount,
    requestLeadCount,
    isConnectedClinicas: clinicasConnected,
    newClinicasCount,
    requestClinicasCount
  };

  return (
    <LeadNotificationContext.Provider value={value}>
      {children}
    </LeadNotificationContext.Provider>
  );
};