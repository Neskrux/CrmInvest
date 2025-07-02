import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
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
  const { user, logout } = useAuth();
  
  if (!user) return null;

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/pacientes', label: 'Pacientes', icon: '👥' },
    { path: '/agendamentos', label: 'Agendamentos', icon: '📅' },
    { path: '/fechamentos', label: 'Fechamentos', icon: '💰' },
    ...(user.tipo === 'admin' ? [
      { path: '/clinicas', label: 'Clínicas', icon: '🏥' },
      { path: '/consultores', label: 'Consultores', icon: '👨‍💼' }
    ] : [])
  ];

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <h2>CRM InvestMoney</h2>
        <span className="user-info">
          👋 {user.nome} ({user.tipo === 'admin' ? 'Admin' : 'Consultor'})
        </span>
      </div>
      
      <div className="nav-menu">
        {menuItems.map(item => (
          <a key={item.path} href={item.path} className="nav-link">
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </a>
        ))}
        
        <button onClick={logout} className="logout-btn">
          🚪 Sair
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

// Componente de rota protegida
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="loading">Carregando...</div>;
  }
  
  return user ? children : <Navigate to="/login" />;
};

// Componente principal
const AppContent = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return isAuthenticated ? (
    <ProtectedRoute>
      <Navigation />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/pacientes" element={<Pacientes />} />
          <Route path="/agendamentos" element={<Agendamentos />} />
          <Route path="/fechamentos" element={<Fechamentos />} />
          
          {/* Rotas apenas para Admin */}
          {user.tipo === 'admin' && (
            <>
              <Route path="/consultores" element={<Consultores />} />
              <Route path="/clinicas" element={<Clinicas />} />
            </>
          )}
          
          {/* Redirecionar rotas não permitidas para home */}
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </main>
    </ProtectedRoute>
  ) : <Login />;
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