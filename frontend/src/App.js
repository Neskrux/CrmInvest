import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import './App.css';

// Contexts
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Importar componentes
import Dashboard from './components/Dashboard';
import Pacientes from './components/Pacientes';
import Clinicas from './components/Clinicas';
import Consultores from './components/Consultores';
import Agendamentos from './components/Agendamentos';
import Fechamentos from './components/Fechamentos';
import Login from './components/Login';

// Ícones (usando emojis para simplicidade)
const NavItem = ({ to, icon, label, isActive }) => (
  <Link to={to} className={`nav-item ${isActive ? 'active' : ''}`}>
    <span className="nav-icon">{icon}</span>
    <span className="nav-label">{label}</span>
  </Link>
);

const Navigation = () => {
  const location = useLocation();
  const { user, logout, isAdmin, isConsultor } = useAuth();
  
  // Navegação para Admin (acesso total)
  const adminNavItems = [
    { to: '/', icon: '📊', label: 'Dashboard' },
    { to: '/pacientes', icon: '👥', label: 'Pacientes' },
    { to: '/agendamentos', icon: '📅', label: 'Agendamentos' },
    { to: '/fechamentos', icon: '💰', label: 'Fechamentos' },
    { to: '/consultores', icon: '🩺', label: 'Consultores' },
    { to: '/clinicas', icon: '🏥', label: 'Clínicas' },
  ];

  // Navegação para Consultor (acesso limitado)
  const consultorNavItems = [
    { to: '/', icon: '📊', label: 'Meu Dashboard' },
    { to: '/pacientes', icon: '👥', label: 'Meus Pacientes' },
    { to: '/agendamentos', icon: '📅', label: 'Meus Agendamentos' },
    { to: '/fechamentos', icon: '💰', label: 'Meus Fechamentos' },
  ];

  const navItems = isAdmin ? adminNavItems : consultorNavItems;

  const handleLogout = () => {
    if (window.confirm('Tem certeza que deseja sair?')) {
      logout();
    }
  };

  return (
    <nav className="sidebar">
      <div className="sidebar-header">
        <h2>🩺 CRM Saúde</h2>
        <div className="user-info">
          <div className="user-avatar">
            {isAdmin ? '👑' : '🩺'}
          </div>
          <div className="user-details">
            <span className="user-name">{user?.nome}</span>
            <span className="user-role">
              {isAdmin ? 'Administrador' : 'Consultor'}
            </span>
          </div>
        </div>
      </div>
      <div className="nav-items">
        {navItems.map(item => (
          <NavItem
            key={item.to}
            to={item.to}
            icon={item.icon}
            label={item.label}
            isActive={location.pathname === item.to}
          />
        ))}
        <button className="logout-button" onClick={handleLogout}>
          <span className="nav-icon">🚪</span>
          <span className="nav-label">Sair</span>
        </button>
      </div>
    </nav>
  );
};

// Componente de Loading
const LoadingScreen = () => (
  <div className="loading-screen">
    <div className="loading-content">
      <div className="loading-spinner"></div>
      <h2>🩺 CRM Saúde</h2>
      <p>Carregando sistema...</p>
    </div>
  </div>
);

// Componente principal protegido
const AuthenticatedApp = () => {
  const { isAdmin } = useAuth();

  return (
    <div className="app">
      <Navigation />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/pacientes" element={<Pacientes />} />
          <Route path="/agendamentos" element={<Agendamentos />} />
          <Route path="/fechamentos" element={<Fechamentos />} />
          
          {/* Rotas apenas para Admin */}
          {isAdmin && (
            <>
              <Route path="/consultores" element={<Consultores />} />
              <Route path="/clinicas" element={<Clinicas />} />
            </>
          )}
          
          {/* Redirecionar rotas não permitidas para home */}
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </main>
    </div>
  );
};

// Componente principal
const AppContent = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return isAuthenticated ? <AuthenticatedApp /> : <Login />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App; 