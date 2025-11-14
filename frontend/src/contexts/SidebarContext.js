import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const SidebarContext = createContext();

const SIDEBAR_STATE_KEY = 'sidebar_collapsed_state';

// Função helper para ler do localStorage de forma segura
const getStoredSidebarState = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem(SIDEBAR_STATE_KEY);
      if (saved !== null) {
        return saved === 'true';
      }
    }
  } catch (error) {
    console.error('Erro ao ler estado da sidebar do localStorage:', error);
  }
  return false; // Padrão: sidebar aberta
};

// Função helper para salvar no localStorage de forma segura
const saveSidebarState = (value) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(SIDEBAR_STATE_KEY, String(value));
    }
  } catch (error) {
    console.error('Erro ao salvar estado da sidebar no localStorage:', error);
  }
};

export const SidebarProvider = ({ children }) => {
  // Carregar estado inicial do localStorage de forma síncrona
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(() => {
    return getStoredSidebarState();
  });

  // Sincronizar com localStorage quando o estado mudar
  useEffect(() => {
    saveSidebarState(sidebarCollapsed);
  }, [sidebarCollapsed]);

  // Função wrapper para atualizar estado e localStorage imediatamente
  const setSidebarCollapsed = useCallback((value) => {
    setSidebarCollapsedState(value);
    // Salvar imediatamente também (além do useEffect para garantir)
    saveSidebarState(value);
  }, []);

  return (
    <SidebarContext.Provider value={{ sidebarCollapsed, setSidebarCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within SidebarProvider');
  }
  return context;
};

