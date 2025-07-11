import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import './App.css';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LandingPage from './components/LandingPage';
import CadastroConsultor from './components/CadastroConsultor';
import CadastroSucesso from './components/CadastroSucesso';
import CapturaLead from './components/CapturaLead';
import CapturaSucesso from './components/CapturaSucesso';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Pacientes from './components/Pacientes';
import Consultores from './components/Consultores';
import Clinicas from './components/Clinicas';
import Agendamentos from './components/Agendamentos';
import Fechamentos from './components/Fechamentos';
import logoBrasao from './images/logobrasao.png';
import logoHorizontal from './images/logohorizontal.png';
import logoHorizontalPreto from './images/logohorizontalpreto.png';

// Componente para proteger rotas
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function AppContent() {
  const { user, logout, loading } = useAuth();
  const location = useLocation();
  
  // Determinar aba ativa baseada na rota atual
  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('/pacientes')) return 'pacientes';
    if (path.includes('/consultores')) return 'consultores';
    if (path.includes('/clinicas')) return 'clinicas';
    if (path.includes('/agendamentos')) return 'agendamentos';
    if (path.includes('/fechamentos')) return 'fechamentos';
    return 'dashboard';
  };
  
  const activeTab = getActiveTab();

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  // Se o usuário não está autenticado, mostrar as páginas de entrada
  if (!user) {
    return (
      <Routes>
        <Route path="/cadastro" element={<CadastroConsultor />} />
        <Route path="/cadastro-sucesso" element={<CadastroSucesso />} />
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<LandingPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // Se o usuário está autenticado, mostrar a aplicação principal
  const renderContent = () => {
    return (
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/pacientes" element={<Pacientes />} />
        <Route path="/consultores" element={<Consultores />} />
        <Route path="/clinicas" element={<Clinicas />} />
        <Route path="/agendamentos" element={<Agendamentos />} />
        <Route path="/fechamentos" element={<Fechamentos />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    );
  };

  const getUserInitials = () => {
    if (user.nome) {
      const names = user.nome.split(' ');
      if (names.length >= 2) {
        return names[0][0] + names[names.length - 1][0];
      }
      return names[0][0] + names[0][1];
    }
    return 'U';
  };

  return (
    <div className="App">
      <aside className="sidebar">
        <div className="sidebar-header">
          <img 
            src={logoBrasao} 
            alt="CRM System" 
            style={{ 
              width: '60px', 
              height: '60px', 
              marginBottom: '0.75rem',
              objectFit: 'contain'
            }} 
          />
        </div>

        <nav className="sidebar-nav">
          <div className="nav-item">
            <Link
              to="/dashboard"
              className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              Dashboard
            </Link>
          </div>

          <div className="nav-item">
            <Link
              to="/pacientes"
              className={`nav-link ${activeTab === 'pacientes' ? 'active' : ''}`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Pacientes
            </Link>
          </div>

          <div className="nav-item">
            <Link
              to="/agendamentos"
              className={`nav-link ${activeTab === 'agendamentos' ? 'active' : ''}`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Agendamentos
            </Link>
          </div>

          <div className="nav-item">
            <Link
              to="/fechamentos"
              className={`nav-link ${activeTab === 'fechamentos' ? 'active' : ''}`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              Fechamentos
            </Link>
          </div>

          <div className="nav-item">
            <Link
              to="/clinicas"
              className={`nav-link ${activeTab === 'clinicas' ? 'active' : ''}`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              Clínicas
            </Link>
          </div>

          {user.tipo === 'admin' && (
            <div className="nav-item">
              <Link
                to="/consultores"
                className={`nav-link ${activeTab === 'consultores' ? 'active' : ''}`}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Consultores
              </Link>
            </div>
          )}
        </nav>

        <div style={{ marginTop: 'auto', padding: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <div className="user-info">
            <div className="user-avatar">
              {getUserInitials()}
            </div>
            <div className="user-details">
              <h3>{user.nome}</h3>
              <p>{user.tipo === 'admin' ? 'Administrador' : 'Consultor'}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="nav-link"
            style={{ marginTop: '1rem', color: '#ef4444' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sair
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="main-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <img 
              src={logoHorizontalPreto} 
              alt="CRM System" 
              style={{ 
                height: '32px', 
                objectFit: 'contain'
              }} 
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              {new Date().toLocaleDateString('pt-BR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ 
                width: '32px', 
                height: '32px',
                backgroundColor: '#e5e7eb',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#4b5563'
              }}>
                {getUserInitials()}
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#1f2937' }}>
                  {user.nome}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  {user.tipo === 'admin' ? 'Administrador' : 'Consultor'}
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="page-content">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Rotas públicas - Captura de leads */}
          <Route path="/captura-lead" element={<CapturaLead />} />
          <Route path="/captura-sucesso" element={<CapturaSucesso />} />
          
          {/* Rotas da aplicação principal */}
          <Route path="/*" element={<AppContent />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App; 