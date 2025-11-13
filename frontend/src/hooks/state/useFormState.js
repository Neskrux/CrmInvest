/**
 * Hook genérico para gerenciar estados de formulários
 */
import { useState, useCallback, useRef } from 'react';

export function useFormState(initialState) {
  // Usar ref para manter o initialState original
  const initialStateRef = useRef(initialState);
  
  const [formData, setFormData] = useState(initialState);

  const updateField = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const updateFields = useCallback((fields) => {
    setFormData(prev => ({ ...prev, ...fields }));
  }, []);

  const resetForm = useCallback(() => {
    setFormData(initialStateRef.current);
  }, []);

  const setForm = useCallback((data) => {
    setFormData(data);
  }, []);

  return {
    formData,
    setFormData,
    updateField,
    updateFields,
    resetForm,
    setForm
  };
}

