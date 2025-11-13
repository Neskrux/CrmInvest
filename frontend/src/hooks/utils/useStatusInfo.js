import { useMemo, useCallback } from 'react';
import { getStatusOptions } from '../../constants';

export function useStatusInfo(t) {
  const statusOptions = useMemo(() => getStatusOptions(t), [t]);

  const getStatusInfo = useCallback((status) => {
    return statusOptions.find(option => option.value === status) || statusOptions[0];
  }, [statusOptions]);

  return {
    statusOptions,
    getStatusInfo
  };
}

