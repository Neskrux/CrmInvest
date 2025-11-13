/**
 * API functions para Customers/Pacientes
 */
import { apiGet, apiPost, apiPut, apiDelete, apiPostFormData } from './client';

/**
 * Buscar todos os pacientes/customers
 */
export async function fetchCustomers() {
  return apiGet('/pacientes');
}

/**
 * Buscar paciente por ID
 */
export async function fetchCustomerById(id) {
  return apiGet(`/pacientes/${id}`);
}

/**
 * Criar novo paciente
 */
export async function createCustomer(data) {
  return apiPost('/pacientes', data);
}

/**
 * Atualizar paciente
 */
export async function updateCustomer(id, data) {
  return apiPut(`/pacientes/${id}`, data);
}

/**
 * Deletar paciente
 */
export async function deleteCustomer(id) {
  return apiDelete(`/pacientes/${id}`);
}

/**
 * Atualizar status do paciente
 */
export async function updateCustomerStatus(id, status, evidenciaId = null) {
  return apiPut(`/pacientes/${id}/status`, { status, evidencia_id: evidenciaId });
}

/**
 * Criar login para paciente
 */
export async function createCustomerLogin(id, credentials = {}) {
  return apiPost(`/pacientes/${id}/criar-login`, credentials);
}

/**
 * Upload de documento do paciente
 */
export async function uploadCustomerDocument(pacienteId, docType, file) {
  const formData = new FormData();
  formData.append('document', file);
  return apiPostFormData(`/documents/upload-paciente/${pacienteId}/${docType}`, formData);
}

/**
 * Buscar evidências do paciente
 */
export async function fetchCustomerEvidencias(pacienteId) {
  return apiGet(`/evidencias/paciente/${pacienteId}`);
}

