export interface Agendamento {
  id: string;
  paciente_id: string;
  consultor_id: string;
  clinica_id?: string;
  data_agendamento: string;
  hora_agendamento: string;
  status: 'agendado' | 'confirmado' | 'realizado' | 'cancelado' | 'não_compareceu';
  observacoes?: string;
  created_at: string;
  updated_at: string;
  paciente?: {
    nome: string;
    telefone?: string;
  };
  consultor?: {
    nome: string;
  };
  clinica?: {
    nome: string;
    endereco?: string;
  };
}

export interface AgendamentoFormData {
  paciente_id: string;
  clinica_id?: string;
  data_agendamento: string;
  hora_agendamento: string;
  observacoes?: string;
}

export interface AgendamentoFilters {
  data_inicio?: string;
  data_fim?: string;
  status?: string;
  consultor_id?: string;
  clinica_id?: string;
}
