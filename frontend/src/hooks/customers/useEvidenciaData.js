import { useFormState } from '../state/useFormState';

export function useEvidenciaData() {
  return useFormState({
    pacienteId: null,
    pacienteNome: '',
    statusAnterior: '',
    statusNovo: '',
    evidenciaId: null
  });
}

