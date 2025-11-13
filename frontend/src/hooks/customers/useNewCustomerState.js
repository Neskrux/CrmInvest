import { useState } from 'react';
import { useFormState } from '../state/useFormState';

export function useNewCustomer() {
  const novoClienteForm = useFormState({
    nome: '',
    email: '',
    telefone: '',
    empreendimento_id: '',
    cidade: '',
    estado: '',
    observacoes: '',
    melhor_dia1: '',
    melhor_horario1: '',
    melhor_dia2: '',
    melhor_horario2: '',
    sdr_id: ''
  });
  const [novoClienteLoading, setNovoClienteLoading] = useState(false);
  const [novoClienteErrors, setNovoClienteErrors] = useState({});
  const [cidadeCustomizadaNovo, setCidadeCustomizadaNovo] = useState(false);

  return {
    novoClienteForm,
    novoClienteLoading,
    setNovoClienteLoading,
    novoClienteErrors,
    setNovoClienteErrors,
    cidadeCustomizadaNovo,
    setCidadeCustomizadaNovo
  };
}

