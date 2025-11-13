import { useEffect } from 'react';

export function useTabValidation(user, podeAlterarStatus, isConsultorInterno, activeTab, setActiveTab) {
  useEffect(() => {
    const isConsultor = user?.tipo === 'consultor';
    if (isConsultor && !podeAlterarStatus && !isConsultorInterno && activeTab === 'novos-leads') {
      setActiveTab('pacientes');
    }
  }, [podeAlterarStatus, isConsultorInterno, activeTab, user?.tipo, setActiveTab]);
}

