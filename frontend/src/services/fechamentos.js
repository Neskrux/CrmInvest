/**
 * API functions para Fechamentos
 */
import { apiGet, apiPostFormData } from './client';

/**
 * Buscar todos os fechamentos
 */
export async function fetchFechamentos() {
  return apiGet('/fechamentos');
}

/**
 * Buscar boletos de um fechamento
 */
export async function fetchBoletosFechamento(fechamentoId) {
  return apiGet(`/fechamentos/${fechamentoId}/boletos`);
}

/**
 * Buscar URL assinada do contrato
 */
export async function fetchContratoUrl(fechamentoId) {
  return apiGet(`/fechamentos/${fechamentoId}/contrato-url`);
}

/**
 * Criar fechamento com contrato (FormData)
 */
export async function createFechamento(formData) {
  const currentToken = localStorage.getItem('token');
  const headers = {};
  
  if (currentToken && currentToken !== 'null' && currentToken.trim() !== '') {
    headers.Authorization = `Bearer ${currentToken}`;
  }

  const API_BASE_URL = process.env.REACT_APP_API_URL || 
    (process.env.NODE_ENV === 'production' 
      ? 'https://crminvest-backend.fly.dev/api'
      : 'http://localhost:5000/api');

  const response = await fetch(`${API_BASE_URL}/fechamentos`, {
    method: 'POST',
    headers,
    body: formData
  });

  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Sessão expirada');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
    throw new Error(error.error || `Erro ${response.status}`);
  }

  return response.json();
}

