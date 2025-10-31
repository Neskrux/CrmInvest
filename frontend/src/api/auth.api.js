/**
 * Funções de API para autenticação
 * Query functions puras para uso com React Query
 */

import { get, post, parseJSON } from './client';

const API_BASE_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://crminvest-backend.fly.dev/api'
    : 'http://localhost:5000/api');

/**
 * Login
 * @param {object} credentials - { email, senha }
 * @returns {Promise<{token: string, usuario: object}>}
 */
export const login = async (credentials) => {
  const response = await fetch(`${API_BASE_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(credentials)
  });

  const data = await parseJSON(response);

  if (!response.ok) {
    throw new Error(data.error || 'Erro no login');
  }

  return data;
};

/**
 * Verificar token
 * @returns {Promise<{usuario: object}>}
 */
export const verifyToken = async (onLogout = null) => {
  const response = await get('/verify-token', {}, onLogout);
  const data = await parseJSON(response);
  
  if (!response.ok) {
    throw new Error(data.error || 'Token inválido');
  }
  
  return data;
};

/**
 * Solicitar reset de senha
 * @param {string} email
 * @returns {Promise<{message: string}>}
 */
export const forgotPassword = async (email) => {
  const response = await post('/forgot-password', { email });
  const data = await parseJSON(response);
  
  if (!response.ok) {
    throw new Error(data.error || 'Erro ao solicitar reset de senha');
  }
  
  return data;
};

/**
 * Resetar senha com token
 * @param {string} token - Token de reset
 * @param {string} senha - Nova senha
 * @returns {Promise<{message: string}>}
 */
export const resetPassword = async (token, senha) => {
  const response = await post('/reset-password', { token, senha });
  const data = await parseJSON(response);
  
  if (!response.ok) {
    throw new Error(data.error || 'Erro ao resetar senha');
  }
  
  return data;
};

