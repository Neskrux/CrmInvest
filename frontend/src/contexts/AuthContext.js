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
      // CRÍTICO: Limpar TODOS os dados antes de fazer login para evitar cache/sessões cruzadas
      const keysToKeep = []; // Não manter nada do localStorage
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (!keysToKeep.includes(key)) {
          localStorage.removeItem(key);
        }
      });
      sessionStorage.clear(); // Limpa session storage também
      setUser(null);
      setToken(null);
      
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
      
      console.log('🔐 Usuario recebido do backend:', usuario);
      console.log('🔑 clinica_id:', usuario?.clinica_id);
      
      // Limpar flags de tutoriais e modais (importante para evitar confusion entre tipos de usuário)
      localStorage.removeItem('welcome-completed');
      localStorage.removeItem('tutorial-completed');
      localStorage.removeItem('whatsapp-group-modal-shown');
      localStorage.removeItem('tutorial-pacientes-completed');
      localStorage.removeItem('tutorial-agendamentos-completed');
      localStorage.removeItem('tutorial-fechamentos-completed');
      localStorage.removeItem('tutorial-clinicas-completed');
      localStorage.removeItem('tutorial-whatsapp-completed');
      
      // Salvar token no localStorage e no state
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(usuario));
      localStorage.setItem('login_timestamp', new Date().toISOString()); // Timestamp do login
      localStorage.setItem('login_email', email); // Email usado no login (para debug)
      setToken(newToken);
      setUser(usuario);

      return { success: true, user: usuario };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    clearAllData();
  };

  const verifyToken = async () => {
    const currentToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    const loginEmail = localStorage.getItem('login_email');
    
    if (!currentToken || currentToken === 'null' || currentToken.trim() === '') {
      clearAllData();
      setLoading(false);
      return;
    }

    try {
      const response = await makeRequest('/verify-token');
      
      if (response.ok) {
        const data = await response.json();
        const usuarioBackend = data.usuario;
        
        // Verificar se o tipo de usuário mudou (segurança adicional)
        let savedUserParsed = null;
        try {
          savedUserParsed = JSON.parse(savedUser);
        } catch (e) {
          clearAllData();
          return;
        }
        
        // Se o tipo de usuário mudou, forçar novo login
        if (savedUserParsed && savedUserParsed.tipo !== usuarioBackend.tipo) {
          clearAllData();
          return;
        }
        
        // Atualizar com dados do backend (fonte da verdade)
        setUser(usuarioBackend);
        setToken(currentToken);
        localStorage.setItem('user', JSON.stringify(usuarioBackend));
      } else {
        clearAllData();
      }
    } catch (error) {
      clearAllData();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // CRÍTICO: Validação de integridade dos dados ao carregar
    // Verificar se há dados corrompidos e limpar se necessário
    try {
      const savedUser = localStorage.getItem('user');
      const savedToken = localStorage.getItem('token');
      const loginEmail = localStorage.getItem('login_email');
      

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
        const parsedUser = JSON.parse(savedUser);
        
        // VALIDAÇÃO CRÍTICA: Verificar se o email do usuário salvo bate com o email de login
        // (apenas se login_email existir - para compatibilidade com sessões antigas)
        if (loginEmail && parsedUser.email) {
          if (parsedUser.email.toLowerCase() !== loginEmail.toLowerCase()) {
            clearAllData();
            setLoading(false);
            return;
          }
        }
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
    isEmpresa: user?.tipo === 'empresa',
    isClinica: user?.tipo === 'clinica',
    isFreelancer: user?.is_freelancer === true,
    // Consultor interno: tem pode_ver_todas_novas_clinicas=true E podealterarstatus=true
    isConsultorInterno: user?.tipo === 'consultor' && user?.pode_ver_todas_novas_clinicas === true && user?.podealterarstatus === true,
    podeAlterarStatus: user?.podealterarstatus === true || user?.tipo === 'admin',
    // Pode ver todos os dados: admin OU consultor interno (com ambas as permissões)
    podeVerTodosDados: user?.tipo === 'admin' || (user?.tipo === 'consultor' && user?.pode_ver_todas_novas_clinicas === true && user?.podealterarstatus === true),
    // Deve filtrar por consultor: é consultor mas NÃO é interno (não tem as duas permissões)
    deveFiltrarPorConsultor: user?.tipo === 'consultor' && !(user?.pode_ver_todas_novas_clinicas === true && user?.podealterarstatus === true),
    // Deve filtrar por clínica: é clínica e deve ver apenas seus dados
    deveFiltrarPorClinica: user?.tipo === 'clinica'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 