/**
 * Status disponíveis para customers/pacientes
 */
export const getStatusOptions = (t) => [
  { value: 'lead', label: 'Lead', color: '#f59e0b', description: 'Lead inicial' },
  { value: 'em_conversa', label: 'Em conversa', color: '#0ea5e9', description: 'Conversando com o cliente' },
  { value: 'cpf_aprovado', label: 'CPF Aprovado', color: '#10b981', description: 'CPF foi aprovado' },
  { value: 'cpf_reprovado', label: 'CPF Reprovado', color: '#ef4444', description: 'CPF foi reprovado' },
  { value: 'nao_existe', label: `${t.paciente} não existe`, color: '#17202A', description: 'Cliente não existe' },
  { value: 'nao_tem_interesse', label: `${t.paciente} não tem interesse`, color: '#17202A', description: 'Cliente não tem interesse' },
  { value: 'nao_responde', label: `${t.paciente} não responde`, color: '#17202A', description: 'Cliente não responde' },
  { value: 'agendado', label: 'Agendado', color: '#3b82f6', description: 'Abre modal para criar agendamento' },
  { value: 'fechado', label: 'Fechado', color: '#10b981', description: 'Cliente fechou o negócio' },
];

/**
 * Status que requerem evidência obrigatória
 */
export const STATUS_COM_EVIDENCIA = [
  'cpf_reprovado',
  'nao_passou_cpf',
  'nao_tem_outro_cpf',
  'nao_existe',
  'nao_tem_interesse',
  'nao_reconhece',
  'nao_responde',
  'sem_clinica',
  'nao_fechou',
  'nao_compareceu'
];

