/**
 * API functions para Consultores
 */
import { apiGet } from './client';

/**
 * Buscar todos os consultores
 */
export async function fetchConsultores() {
  return apiGet('/consultores');
}

/**
 * Buscar consultor por ID
 */
export async function fetchConsultorById(id) {
  return apiGet(`/consultores/${id}`);
}

/**
 * Buscar SDRs da incorporadora
 */
export async function fetchSdrsIncorporadora() {
  const API_BASE_URL = process.env.REACT_APP_API_URL || 
    (process.env.NODE_ENV === 'production' 
      ? 'https://crminvest-backend.fly.dev/api'
      : 'http://localhost:5000/api');
  
  const currentToken = localStorage.getItem('token');
  const headers = {};
  
  if (currentToken && currentToken !== 'null' && currentToken.trim() !== '') {
    headers.Authorization = `Bearer ${currentToken}`;
  }

  const response = await fetch(`${API_BASE_URL}/consultores/sdrs-incorporadora`, {
    method: 'GET',
    headers
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
    throw new Error(error.error || `Erro ${response.status}`);
  }

  return response.json();
}

