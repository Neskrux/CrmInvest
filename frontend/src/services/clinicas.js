/**
 * API functions para Clínicas
 */
import { apiGet } from './client';

/**
 * Buscar todas as clínicas
 */
export async function fetchClinicas() {
  return apiGet('/clinicas');
}

/**
 * Buscar clínica por ID
 */
export async function fetchClinicaById(id) {
  return apiGet(`/clinicas/${id}`);
}

