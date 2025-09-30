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
      ? 'https://crminvest-backend.fly.dev/api'
      : 'http://localhost:5000/api');
  
  

  const clearAllData = () => {
    setUser(null);
    setToken(null);
    
    // Limpar apenas dados sensíveis do usuário, mantendo preferências de UI (tutoriais)
    // Dados de autenticação
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Caches que podem conter dados de outros usuários
    localStorage.removeItem('metaAds_campaigns');
    localStorage.removeItem('metaAds_adSets');
    localStorage.removeItem('metaAds_selectedCampaign');
    localStorage.removeItem('metaAds_timestamp');
    localStorage.removeItem('geocodeCache');
    localStorage.removeItem('data_sync_trigger');
    
    // Manter: tutorial-*-completed, tutorial-*-dismissed, welcome-completed, whatsapp-group-modal-shown
    // Essas são preferências de UI por navegador/máquina, não por usuário
  };

  const makeRequest = async (url, options = {}) => {
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
      
      // Salvar token no localStorage e no state
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(usuario));
      setToken(newToken);
      setUser(usuario);

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
    const currentToken = localStorage.getItem('token');
    
    if (!currentToken || currentToken === 'null' || currentToken.trim() === '') {
      clearAllData();
      setLoading(false);
      return;
    }

    try {
      const response = await makeRequest('/verify-token');
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.usuario);
        setToken(currentToken);
        localStorage.setItem('user', JSON.stringify(data.usuario));
      } else {
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
    
    // Verificar se há dados corrompidos e limpar se necessário
    try {
      const savedUser = localStorage.getItem('user');
      const savedToken = localStorage.getItem('token');
      

      // Se há dados inconsistentes, limpar tudo
      if ((savedUser && !savedToken) || (!savedUser && savedToken)) {
        clearAllData();
        setLoading(false);
        return;
      }
      
      // Se há usuário salvo mas token é inválido
      if (savedUser && savedToken && (!token || token.trim() === '' || token === 'null')) {
        clearAllData();
        setLoading(false);
        return;
      }
      
      // Tentar fazer parse do usuário se existir
      if (savedUser) {
        JSON.parse(savedUser);
      }
      
    } catch (error) {
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
    isConsultor: user?.tipo === 'consultor',
    isFreelancer: user?.is_freelancer === true,
    // Consultor interno: tem pode_ver_todas_novas_clinicas=true E podealterarstatus=true
    isConsultorInterno: user?.tipo === 'consultor' && user?.pode_ver_todas_novas_clinicas === true && user?.podealterarstatus === true,
    podeAlterarStatus: user?.podealterarstatus === true || user?.tipo === 'admin',
    // Pode ver todos os dados: admin OU consultor interno (com ambas as permissões)
    podeVerTodosDados: user?.tipo === 'admin' || (user?.tipo === 'consultor' && user?.pode_ver_todas_novas_clinicas === true && user?.podealterarstatus === true),
    // Deve filtrar por consultor: é consultor mas NÃO é interno (não tem as duas permissões)
    deveFiltrarPorConsultor: user?.tipo === 'consultor' && !(user?.pode_ver_todas_novas_clinicas === true && user?.podealterarstatus === true)
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 