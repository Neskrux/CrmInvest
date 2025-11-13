/**
 * Cliente de API reutilizável
 * Usa o mesmo padrão do makeRequest do AuthContext
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://crminvest-backend.fly.dev/api'
    : 'http://localhost:5000/api');

/**
 * Função genérica para fazer requisições à API
 * Compatível com React Query
 */
export async function apiRequest(url, options = {}) {
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

  const response = await fetch(fullUrl, {
    ...options,
    headers
  });

  if (response.status === 401) {
    // Token expirado ou inválido - limpar e redirecionar
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Sessão expirada');
  }

  if (response.status === 429) {
    // Rate limiting
    throw new Error('429 Too Many Requests');
  }

  return response;
}

/**
 * Helper para fazer GET requests
 */
export async function apiGet(url) {
  const response = await apiRequest(url, { method: 'GET' });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
    throw new Error(error.error || `Erro ${response.status}`);
  }
  return response.json();
}

/**
 * Helper para fazer POST requests
 */
export async function apiPost(url, data) {
  const response = await apiRequest(url, {
    method: 'POST',
    body: JSON.stringify(data)
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
    throw new Error(error.error || `Erro ${response.status}`);
  }
  return response.json();
}

/**
 * Helper para fazer PUT requests
 */
export async function apiPut(url, data) {
  const response = await apiRequest(url, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
    throw new Error(error.error || `Erro ${response.status}`);
  }
  return response.json();
}

/**
 * Helper para fazer DELETE requests
 */
export async function apiDelete(url) {
  const response = await apiRequest(url, { method: 'DELETE' });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
    throw new Error(error.error || `Erro ${response.status}`);
  }
  return response.json();
}

/**
 * Helper para fazer POST com FormData (upload de arquivos)
 */
export async function apiPostFormData(url, formData) {
  const currentToken = localStorage.getItem('token');
  const headers = {};
  
  if (currentToken && currentToken !== 'null' && currentToken.trim() !== '') {
    headers.Authorization = `Bearer ${currentToken}`;
  }

  const API_BASE_URL = process.env.REACT_APP_API_URL || 
    (process.env.NODE_ENV === 'production' 
      ? 'https://crminvest-backend.fly.dev/api'
      : 'http://localhost:5000/api');

  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

  const response = await fetch(fullUrl, {
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

