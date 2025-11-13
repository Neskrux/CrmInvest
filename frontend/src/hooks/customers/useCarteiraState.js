import { useState } from 'react';
import { useFormState } from '../state/useFormState';

export function useCarteiraState() {
  const carteiraForm = useFormState({
    cpf: '',
    nomeCompleto: '',
    valorParcela: '',
    numeroParcelasAberto: '',
    primeiraVencimento: '',
    numeroParcelasAntecipar: ''
  });
  const [pacientesCarteira, setPacientesCarteira] = useState([]);
  const [carteiraCalculos, setCarteiraCalculos] = useState(null);
  const [percentualAlvoCarteira, setPercentualAlvoCarteira] = useState(130);

  return {
    carteiraForm,
    pacientesCarteira,
    setPacientesCarteira,
    carteiraCalculos,
    setCarteiraCalculos,
    percentualAlvoCarteira,
    setPercentualAlvoCarteira
  };
}

