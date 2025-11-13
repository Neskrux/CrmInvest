/**
 * API functions para Leads
 */
import { apiGet, apiPost, apiPut, apiDelete } from './client';

/**
 * Buscar novos leads
 */
export async function fetchNovosLeads() {
  return apiGet('/novos-leads');
}

/**
 * Buscar leads negativos
 */
export async function fetchLeadsNegativos() {
  return apiGet('/leads-negativos');
}

/**
 * Aprovar lead
 */
export async function approveLead(leadId) {
  return apiPut(`/novos-leads/${leadId}/aprovar`);
}

/**
 * Pegar/atribuir lead
 */
export async function takeLead(leadId, consultorId = null) {
  const data = consultorId ? { consultor_id: consultorId } : {};
  return apiPut(`/novos-leads/${leadId}/pegar`, data);
}

/**
 * Deletar lead
 */
export async function deleteLead(leadId) {
  return apiDelete(`/novos-leads/${leadId}`);
}

/**
 * Atualizar status do lead
 */
export async function updateLeadStatus(leadId, status) {
  return apiPut(`/novos-leads/${leadId}/status`, { status });
}

/**
 * Criar novo lead/cliente (incorporadora)
 */
export async function createLead(data) {
  return apiPost('/leads/cadastro', data);
}

