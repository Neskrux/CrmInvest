export interface Paciente {
  id: string;
  nome: string;
  email?: string;
  telefone?: string;
  data_nascimento?: string;
  cpf?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  consultor_id: string;
  clinica_id?: string;
  status: 'ativo' | 'inativo' | 'convertido';
  created_at: string;
  updated_at: string;
}

export interface PacienteFormData {
  nome: string;
  email?: string;
  telefone?: string;
  data_nascimento?: string;
  cpf?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  clinica_id?: string;
}

export interface PacienteFilters {
  search?: string;
  status?: string;
  consultor_id?: string;
  clinica_id?: string;
  cidade?: string;
  estado?: string;
}
