import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(() => {
    const savedToken = localStorage.getItem('token');
    // Verificar se o token é válido (não vazio e não 'null' string)
    return savedToken && savedToken !== 'null' && savedToken.trim() !== '' ? savedToken : null;
  });

  // Configurar URL base da API
  const API_BASE_URL = process.env.REACT_APP_API_URL || 
    (process.env.NODE_ENV === 'production' 
      ? '/api' 
      : 'http://localhost:5000/api');

  const clearAllData = () => {
    console.log('Limpando todos os dados de autenticação');
    setUser(null);
    setToken(null);
    localStorage.clear();
  };

  const makeRequest = async (url, options = {}) => {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(fullUrl, {
      ...options,
      headers
    });

    if (response.status === 401) {
      // Token expirado ou inválido
      logout();
      throw new Error('Sessão expirada');
    }

    return response;
  };

  const login = async (email, senha) => {
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, senha })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro no login');
      }

      const { token: newToken, usuario } = data;
      
      setToken(newToken);
      setUser(usuario);
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(usuario));

      return { success: true, user: usuario };
    } catch (error) {
      console.error('Erro no login:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    clearAllData();
  };

  const verifyToken = async () => {
    if (!token || token.trim() === '' || token === 'null') {
      console.log('Nenhum token válido encontrado - redirecionando para login');
      clearAllData();
      setLoading(false);
      return;
    }

    console.log('Verificando token...');
    try {
      const response = await makeRequest('/verify-token');
      
      if (response.ok) {
        const data = await response.json();
        console.log('Token válido - usuário autenticado:', data.usuario.email);
        setUser(data.usuario);
        localStorage.setItem('user', JSON.stringify(data.usuario));
      } else {
        console.log('Token inválido - fazendo logout');
        clearAllData();
      }
    } catch (error) {
      console.error('Erro ao verificar token:', error);
      clearAllData();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('🔄 Iniciando verificação de autenticação...');
    
    // Verificar se há dados corrompidos e limpar se necessário
    try {
      const savedUser = localStorage.getItem('user');
      const savedToken = localStorage.getItem('token');
      
      console.log('📊 Estado inicial:', { 
        hasUser: !!savedUser, 
        hasToken: !!savedToken,
        tokenState: !!token 
      });

      // Se há dados inconsistentes, limpar tudo
      if ((savedUser && !savedToken) || (!savedUser && savedToken)) {
        console.log('⚠️ Dados inconsistentes no localStorage - limpando');
        clearAllData();
        setLoading(false);
        return;
      }
      
      // Se há usuário salvo mas token é inválido
      if (savedUser && savedToken && (!token || token.trim() === '' || token === 'null')) {
        console.log('⚠️ Token inválido mas usuário salvo - limpando');
        clearAllData();
        setLoading(false);
        return;
      }
      
      // Tentar fazer parse do usuário se existir
      if (savedUser) {
        JSON.parse(savedUser);
      }
      
    } catch (error) {
      console.log('💥 Dados corrompidos no localStorage - limpando');
      clearAllData();
      setLoading(false);
      return;
    }

    // Se chegou até aqui, verificar token
    verifyToken();
  }, []);

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    makeRequest,
    isAuthenticated: !!user && !!token,
    isAdmin: user?.tipo === 'admin',
    isConsultor: user?.tipo === 'consultor'
  };

  // Log do estado atual para debug
  console.log('🔍 AuthContext State:', {
    hasUser: !!user,
    hasToken: !!token,
    loading,
    isAuthenticated: !!user && !!token,
    userType: user?.tipo
  });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 