/**
 * API functions para Carteira
 */
import { apiGet, apiPost, apiPut, apiDelete, apiPostFormData } from './client';

/**
 * Buscar solicitações de carteira
 */
export async function fetchSolicitacoesCarteira() {
  return apiGet('/solicitacoes-carteira');
}

/**
 * Buscar solicitação de carteira por ID
 */
export async function fetchSolicitacaoCarteira(id) {
  return apiGet(`/solicitacoes-carteira/${id}`);
}

/**
 * Criar solicitação de carteira
 */
export async function createSolicitacaoCarteira(data) {
  return apiPost('/solicitacoes-carteira', data);
}

/**
 * Deletar solicitação de carteira
 */
export async function deleteSolicitacaoCarteira(id) {
  return apiDelete(`/solicitacoes-carteira/${id}`);
}

/**
 * Atualizar status da solicitação de carteira
 */
export async function updateSolicitacaoCarteiraStatus(id, status, observacoesAdmin = '') {
  return apiPut(`/solicitacoes-carteira/${id}/status`, { status, observacoes_admin: observacoesAdmin });
}

/**
 * Criar solicitação de antecipação
 */
export async function createSolicitacaoAntecipacao(data) {
  return apiPost('/solicitacoes-carteira/antecipacao', data);
}

/**
 * Buscar contratos de uma solicitação
 */
export async function fetchContratosCarteira(solicitacaoId) {
  return apiGet(`/contratos-carteira/${solicitacaoId}`);
}

/**
 * Buscar solicitações de antecipação
 * Filtra as solicitações de carteira por tipo_solicitacao === 'antecipacao'
 */
export async function fetchSolicitacoesAntecipacao() {
  const data = await apiGet('/solicitacoes-carteira');
  return Array.isArray(data) 
    ? data.filter(s => s.tipo_solicitacao === 'antecipacao')
    : [];
}

/**
 * Upload de contrato
 */
export async function uploadContratoCarteira(formData) {
  const currentToken = localStorage.getItem('token');
  const headers = {};
  
  if (currentToken && currentToken !== 'null' && currentToken.trim() !== '') {
    headers.Authorization = `Bearer ${currentToken}`;
  }

  const API_BASE_URL = process.env.REACT_APP_API_URL || 
    (process.env.NODE_ENV === 'production' 
      ? 'https://crminvest-backend.fly.dev/api'
      : 'http://localhost:5000/api');

  const response = await fetch(`${API_BASE_URL}/contratos-carteira/upload`, {
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

/**
 * Aprovar contrato
 */
export async function approveContratoCarteira(contratoId) {
  return apiPost(`/contratos-carteira/${contratoId}/aprovar`);
}

/**
 * Reprovar contrato
 */
export async function reproveContratoCarteira(contratoId, motivo) {
  return apiPost(`/contratos-carteira/${contratoId}/reprovar`, { motivo });
}

/**
 * Deletar contrato
 */
export async function deleteContratoCarteira(contratoId) {
  return apiDelete(`/contratos-carteira/${contratoId}`);
}

