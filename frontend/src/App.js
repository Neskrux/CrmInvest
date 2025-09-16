import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Link, useNavigate } from 'react-router-dom';
import './App.css';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './components/Toast';
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
import MetaAds from './components/MetaAds';
import WhatsApp from './components/WhatsApp';
import Perfil from './components/Perfil';
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
  const navigate = useNavigate();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  // Função para fechar sidebar ao navegar no mobile
  const handleMobileNavigation = () => {
    if (isMobile) {
      setShowMobileSidebar(false);
    }
  };
  
  // Hook para detectar mudanças no tamanho da tela
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      // Fechar sidebar mobile quando mudança para desktop
      if (window.innerWidth > 768) {
        setShowMobileSidebar(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Determinar aba ativa baseada na rota atual
  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('/pacientes')) return 'pacientes';
    if (path.includes('/consultores')) return 'consultores';
    if (path.includes('/clinicas')) return 'clinicas';
    if (path.includes('/agendamentos')) return 'agendamentos';
    if (path.includes('/fechamentos')) return 'fechamentos';
    if (path.includes('/meta-ads')) return 'meta-ads';
    if (path.includes('/whatsapp')) return 'whatsapp';
    if (path.includes('/perfil')) return 'perfil';
    return 'dashboard';
  };
  
  const activeTab = getActiveTab();

  // Fechar dropdown quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserDropdown && !event.target.closest('[data-user-dropdown]')) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserDropdown]);

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
        <Route path="/meta-ads" element={<MetaAds />} />
        <Route path="/whatsapp" element={<WhatsApp />} />
        <Route path="/perfil" element={<Perfil />} />
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
      {/* Overlay para mobile */}
      {isMobile && showMobileSidebar && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 998
          }}
          onClick={() => setShowMobileSidebar(false)}
        />
      )}
      
      <aside 
        className="sidebar" 
        style={isMobile ? {
          transform: showMobileSidebar ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s ease-in-out',
          position: 'fixed',
          zIndex: 999
        } : {}}
      >
        <div className="sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
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
            {isMobile && (
              <button
                onClick={() => setShowMobileSidebar(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  color: '#6b7280',
                  borderRadius: '0.25rem'
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            )}
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-item">
            <Link
              to="/dashboard"
              className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={handleMobileNavigation}
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
              onClick={handleMobileNavigation}
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
              onClick={handleMobileNavigation}
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
              onClick={handleMobileNavigation}
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
              onClick={handleMobileNavigation}
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
                onClick={handleMobileNavigation}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Consultores
              </Link>
            </div>
          )}

          {user.tipo === 'admin' && (
            <div className="nav-item">
              <Link
                to="/meta-ads"
                className={`nav-link ${activeTab === 'meta-ads' ? 'active' : ''}`}
                onClick={handleMobileNavigation}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
                Meta Ads
              </Link>
            </div>
          )}

          <div className="nav-item">
            <Link
              to="/whatsapp"
              className={`nav-link ${activeTab === 'whatsapp' ? 'active' : ''}`}
              onClick={handleMobileNavigation}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
              Conversas
            </Link>
          </div>

          <div className="nav-item">
            <Link
              to="https://wa.me/554199647120"
              className={`nav-link`}
              target="_blank"
              onClick={handleMobileNavigation}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
              Fale Conosco
            </Link>
          </div>

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
          <Link
            to="/perfil"
            className={`nav-link-profile ${activeTab === 'perfil' ? 'active' : ''}`}
            onClick={handleMobileNavigation}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            Editar Perfil
          </Link>
          <button
            onClick={logout}
            className="nav-link-logout"
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
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '7.5rem' : '1.5rem' }}>
            {isMobile && (
              <button
                onClick={() => setShowMobileSidebar(!showMobileSidebar)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '0.5rem',
                  transition: 'background-color 0.2s',
                  ':hover': {
                    backgroundColor: '#f3f4f6'
                  }
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                <svg 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                  style={{ color: '#374151' }}
                >
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
              </button>
            )}
            <img 
              src={logoHorizontalPreto} 
              alt="CRM System" 
              style={{ 
                height: '90px', 
                objectFit: 'contain'
              }} 
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            {!isMobile && (
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                {new Date().toLocaleDateString('pt-BR', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
            )}
            {!isMobile && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.75rem',
                padding: '0.5rem 1rem',
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                cursor: 'pointer',
                position: 'relative'
              }}
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              data-user-dropdown
              >
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
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
                style={{ 
                  transition: 'transform 0.2s',
                  transform: showUserDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                  color: '#6b7280'
                }}
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>

              {/* Dropdown Menu */}
              {showUserDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '0.5rem',
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                  minWidth: '200px',
                  zIndex: 50
                }}>
                  <div style={{ padding: '0.5rem 0' }}>
                    <button
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        border: 'none',
                        backgroundColor: 'transparent',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        color: '#374151',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowUserDropdown(false);
                        navigate('/perfil');
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                      Editar Perfil
                    </button>
                    
                    <div style={{ height: '1px', backgroundColor: '#e5e7eb', margin: '0.5rem 0' }}></div>
                    
                    <button
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        border: 'none',
                        backgroundColor: 'transparent',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        color: '#ef4444',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#fef2f2'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowUserDropdown(false);
                        logout();
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        <polyline points="16 17 21 12 16 7"></polyline>
                        <line x1="21" y1="12" x2="9" y2="12"></line>
                      </svg>
                      Sair
                    </button>
                  </div>
                </div>
              )}
              </div>
            )}
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
    <ToastProvider>
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
    </ToastProvider>
  );
}

export default App; 