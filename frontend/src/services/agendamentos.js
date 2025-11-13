/**
 * API functions para Agendamentos
 */
import { apiGet, apiPost } from './client';

/**
 * Buscar agendamentos gerais
 */
export async function fetchAgendamentosGerais() {
  return apiGet('/dashboard/gerais/agendamentos');
}

/**
 * Buscar agendamentos do dashboard (para freelancers)
 */
export async function fetchAgendamentosDashboard() {
  return apiGet('/dashboard/agendamentos');
}

/**
 * Criar agendamento
 */
export async function createAgendamento(data) {
  return apiPost('/agendamentos', data);
}

