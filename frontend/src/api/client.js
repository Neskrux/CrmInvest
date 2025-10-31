/**
 * Cliente HTTP centralizado para todas as chamadas de API
 * Substitui o makeRequest do AuthContext
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://crminvest-backend.fly.dev/api'
    : 'http://localhost:5000/api');

/**
 * Cliente HTTP base com interceptors
 * @param {string} url - URL da requisição (relativa ou absoluta)
 * @param {object} options - Opções do fetch (method, body, headers, etc)
 * @param {function} onLogout - Callback opcional para logout em caso de 401
 * @returns {Promise<Response>}
 */
export const apiClient = async (url, options = {}, onLogout = null) => {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  // Sempre buscar o token atual do localStorage
  const currentToken = localStorage.getItem('token');
  if (currentToken && currentToken !== 'null' && currentToken.trim() !== '') {
    headers.Authorization = `Bearer ${currentToken}`;
  }

  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers
    });

    // Tratar 401 - Token expirado ou inválido
    if (response.status === 401) {
      if (onLogout && typeof onLogout === 'function') {
        onLogout();
      }
      throw new Error('Sessão expirada');
    }

    // Tratar 429 - Rate limiting
    if (response.status === 429) {
      throw new Error('429 Too Many Requests');
    }

    return response;
  } catch (error) {
    // Se já é um erro que lançamos (401, 429), apenas propagar
    if (error.message === 'Sessão expirada' || error.message === '429 Too Many Requests') {
      throw error;
    }
    
    // Outros erros de rede
    throw new Error(`Erro de conexão: ${error.message}`);
  }
};

/**
 * Helper para requisições GET
 */
export const get = async (url, options = {}, onLogout = null) => {
  return apiClient(url, { ...options, method: 'GET' }, onLogout);
};

/**
 * Helper para requisições POST
 */
export const post = async (url, data = null, options = {}, onLogout = null) => {
  return apiClient(url, {
    ...options,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  }, onLogout);
};

/**
 * Helper para requisições PUT
 */
export const put = async (url, data = null, options = {}, onLogout = null) => {
  return apiClient(url, {
    ...options,
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  }, onLogout);
};

/**
 * Helper para requisições DELETE
 */
export const del = async (url, options = {}, onLogout = null) => {
  return apiClient(url, { ...options, method: 'DELETE' }, onLogout);
};

/**
 * Helper para requisições PATCH
 */
export const patch = async (url, data = null, options = {}, onLogout = null) => {
  return apiClient(url, {
    ...options,
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  }, onLogout);
};

/**
 * Helper para parsear resposta JSON com tratamento de erro
 */
export const parseJSON = async (response) => {
  try {
    const text = await response.text();
    if (!text) {
      return null;
    }
    return JSON.parse(text);
  } catch (error) {
    throw new Error('Erro ao processar resposta do servidor');
  }
};

export default {
  apiClient,
  get,
  post,
  put,
  del,
  patch,
  parseJSON,
};

