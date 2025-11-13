import { useEffect } from 'react';

export function useAutoFilterConsultor(deveFiltrarPorConsultor, consultorId, updateFilter) {
  useEffect(() => {
    if (deveFiltrarPorConsultor && consultorId) {
      updateFilter('consultor', String(consultorId));
    }
  }, [deveFiltrarPorConsultor, consultorId, updateFilter]);
}

