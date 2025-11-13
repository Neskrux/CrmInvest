import { useState } from 'react';
import { useFormState } from '../state/useFormState';

export function useAgendamentoState() {
  const [pacienteParaAgendar, setPacienteParaAgendar] = useState(null);
  const [salvandoAgendamento, setSalvandoAgendamento] = useState(false);
  const agendamentoForm = useFormState({
    clinica_id: '',
    empreendimento_id: '',
    empreendimento_externo: '',
    data_agendamento: '',
    horario: '',
    observacoes: '',
    consultor_interno_id: ''
  });

  return {
    pacienteParaAgendar,
    setPacienteParaAgendar,
    agendamentoForm,
    salvandoAgendamento,
    setSalvandoAgendamento
  };
}

