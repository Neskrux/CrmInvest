import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts';

const Materiais = () => {
  const { makeRequest, user, isAdmin } = useAuth();
  const { showSuccessToast, showErrorToast } = useToast();
  
  const [materiais, setMateriais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroTitulo, setFiltroTitulo] = useState('');

  const [novoMaterial, setNovoMaterial] = useState({
    titulo: '',
    descricao: '',
    tipo: 'documento',
    arquivo: null
  });

  const tiposMaterial = [
    { value: 'documento', label: 'Documento', icon: 'file-text' },
    { value: 'video', label: 'Vídeo', icon: 'play-circle' }
  ];

  useEffect(() => {
    fetchMateriais();
  }, []);

  // Prevenir scroll do body quando modal estiver aberto
  useEffect(() => {
    if (showUploadModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showUploadModal]);

  const fetchMateriais = async () => {
    try {
      setLoading(true);
      const response = await makeRequest('/materiais');
      const data = await response.json();
      
      if (response.ok) {
        setMateriais(data);
      } else {
        console.error('Erro ao carregar materiais:', data.error);
        showErrorToast('Erro ao carregar materiais: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao carregar materiais:', error);
      showErrorToast('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    setNovoMaterial(prev => ({
      ...prev,
      [name]: files ? files[0] : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!novoMaterial.titulo.trim()) {
      showErrorToast('Título é obrigatório');
      return;
    }

    if (!novoMaterial.arquivo) {
      showErrorToast('Arquivo é obrigatório');
      return;
    }

    try {
      setUploading(true);
      
      const formData = new FormData();
      formData.append('titulo', novoMaterial.titulo);
      formData.append('descricao', novoMaterial.descricao);
      formData.append('tipo', novoMaterial.tipo);
      formData.append('arquivo', novoMaterial.arquivo);

      // Usar fetch diretamente para FormData
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/materiais`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

              if (response.ok) {
                showSuccessToast('Material adicionado com sucesso!');
                setShowUploadModal(false);
                setNovoMaterial({
                  titulo: '',
                  descricao: '',
                  tipo: 'documento',
                  arquivo: null
                });
                fetchMateriais();
              } else {
                if (data.error && data.error.includes('File too large')) {
                  showErrorToast('Arquivo muito grande! Tamanho máximo permitido: 200MB');
                } else {
                  showErrorToast('Erro ao adicionar material: ' + data.error);
                }
              }
    } catch (error) {
      console.error('Erro ao adicionar material:', error);
      showErrorToast('Erro ao conectar com o servidor');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este material?')) {
      return;
    }

    try {
      const response = await makeRequest(`/materiais/${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (response.ok) {
        showSuccessToast('Material excluído com sucesso!');
        fetchMateriais();
      } else {
        showErrorToast('Erro ao excluir material: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao excluir material:', error);
      showErrorToast('Erro ao conectar com o servidor');
    }
  };

  const downloadMaterial = async (material) => {
    try {
      if (material.arquivo_url) {
        const response = await makeRequest(`/materiais/${material.id}/download`);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = material.arquivo_nome || material.titulo;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Erro ao baixar material:', error);
      showErrorToast('Erro ao baixar material');
    }
  };

  const materiaisFiltrados = materiais.filter(material => {
    const matchTipo = !filtroTipo || material.tipo === filtroTipo;
    const matchTitulo = !filtroTitulo || material.titulo.toLowerCase().includes(filtroTitulo.toLowerCase());
    return matchTipo && matchTitulo;
  });

  const getTipoInfo = (tipo) => {
    return tiposMaterial.find(t => t.value === tipo) || tiposMaterial[0];
  };

  const renderIcon = (iconName, size = 20) => {
    const iconProps = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" };
    
    switch (iconName) {
      case 'file-text':
        return (
          <svg {...iconProps}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
        );
      case 'play-circle':
        return (
          <svg {...iconProps}>
            <circle cx="12" cy="12" r="10"/>
            <polygon points="10,8 16,12 10,16 10,8"/>
          </svg>
        );
      case 'presentation':
        return (
          <svg {...iconProps}>
            <path d="M2 3h20v18H2z"/>
            <path d="M8 21l4-7 4 7"/>
          </svg>
        );
      case 'book-open':
        return (
          <svg {...iconProps}>
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
        );
      case 'layout':
        return (
          <svg {...iconProps}>
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <line x1="9" y1="9" x2="21" y2="9"/>
            <line x1="9" y1="15" x2="21" y2="15"/>
            <line x1="3" y1="9" x2="3" y2="15"/>
          </svg>
        );
      case 'folder':
        return (
          <svg {...iconProps}>
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
        );
      default:
        return (
          <svg {...iconProps}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
          </svg>
        );
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid" style={{ padding: '1.5rem' }}>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      {/* Header */}
      <div className="page-header">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h1 className="page-title">Materiais de Apoio</h1>
            <p className="page-subtitle">
              Repositório de documentos, vídeos e outros materiais para consultores
            </p>
          </div>
          {isAdmin && (
            <button
              className="btn btn-primary"
              onClick={() => setShowUploadModal(true)}
              style={{ marginTop: '1rem' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10,9 9,9 8,9"/>
              </svg>
              Adicionar Material
            </button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="row mb-4">
        <div className="col-md-6">
          <div className="form-group">
            <label className="form-label">Filtrar por tipo:</label>
            <select
              className="form-select"
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
            >
              <option value="">Todos os tipos</option>
              {tiposMaterial.map(tipo => (
                <option key={tipo.value} value={tipo.value}>
                  {tipo.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="col-md-6">
          <div className="form-group">
            <label className="form-label">Buscar por título:</label>
            <input
              type="text"
              className="form-control"
              placeholder="Digite o título do material..."
              value={filtroTitulo}
              onChange={(e) => setFiltroTitulo(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Lista de Materiais */}
      <div className="grid grid-2">
        {materiaisFiltrados.length === 0 ? (
          <div className="col-12">
            <div className="text-center py-5">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-muted mb-3">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10,9 9,9 8,9"/>
              </svg>
              <h5 className="text-muted">Nenhum material encontrado</h5>
              <p className="text-muted">Não há materiais disponíveis com os filtros aplicados.</p>
            </div>
          </div>
        ) : (
          materiaisFiltrados.map(material => {
            const tipoInfo = getTipoInfo(material.tipo);
            return (
              <div key={material.id} className="col-md-6 col-lg-4 mb-4">
                <div 
                  className="card border-0 shadow-sm" 
                  style={{ 
                    minHeight: '280px',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '1.5rem'
                  }}
                >
                  <div 
                    className="card-body p-4" 
                    style={{ 
                      display: 'flex',
                      flexDirection: 'column',
                      height: '100%'
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div className="d-flex align-items-center">
                        <div className="me-3" style={{ color: '#6b7280' }}>
                          {renderIcon(tipoInfo.icon, 24)}
                        </div>
                        <div className="flex-grow-1">
                          <h5 className="card-title mb-1 fw-bold text-dark" style={{ fontSize: '1.1rem', lineHeight: '1.3' }}>
                            {material.titulo}
                          </h5>
                          <small className="text-muted text-uppercase" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                            {tipoInfo.label}
                          </small>
                        </div>
                      </div>
                    </div>
                    
                    <div 
                      style={{ 
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        minHeight: 0
                      }}
                    >
                      {material.descricao && (
                        <p 
                          className="card-text text-muted mb-3" 
                          style={{ 
                            fontSize: '0.9rem', 
                            lineHeight: '1.5', 
                            marginBottom: '1rem',
                            flex: 1
                          }}
                        >
                          {material.descricao}
                        </p>
                      )}
                    </div>
                    
                    <div 
                      className="d-flex justify-content-between align-items-center"
                      style={{ 
                        marginTop: 'auto',
                        paddingTop: '1rem'
                      }}
                    >
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => downloadMaterial(material)}
                          style={{ 
                            padding: '6px 16px',
                            fontSize: '0.85rem',
                            fontWeight: '500',
                            borderRadius: '6px'
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-1">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7,10 12,15 17,10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                          </svg>
                          Baixar
                        </button>
                        {isAdmin && (
                          <button
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => handleDelete(material.id)}
                            style={{ 
                              padding: '6px 12px',
                              fontSize: '0.85rem',
                              fontWeight: '500',
                              borderRadius: '6px'
                            }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3,6 5,6 21,6"/>
                              <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"/>
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal de Upload */}
      {showUploadModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowUploadModal(false);
            }
          }}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
            }}
          >
            <div 
              style={{ 
                padding: '20px 24px',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <h5 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>Adicionar Material</h5>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '4px'
                }}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div 
                style={{ 
                  flex: 1,
                  overflowY: 'auto',
                  padding: '24px'
                }}
              >
                <div className="row">
                  <div className="col-md-6">
                    <div className="form-group mb-3">
                      <label className="form-label">Título *</label>
                      <input
                        type="text"
                        className="form-control"
                        name="titulo"
                        value={novoMaterial.titulo}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="form-group mb-3">
                      <label className="form-label">Tipo *</label>
                      <select
                        className="form-select"
                        name="tipo"
                        value={novoMaterial.tipo}
                        onChange={handleInputChange}
                        required
                      >
                        {tiposMaterial.map(tipo => (
                          <option key={tipo.value} value={tipo.value}>
                            {tipo.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                
                <div className="form-group mb-3">
                  <label className="form-label">Descrição</label>
                  <textarea
                    className="form-control"
                    name="descricao"
                    value={novoMaterial.descricao}
                    onChange={handleInputChange}
                    rows="3"
                  />
                </div>
                
                <div className="form-group mb-3">
                  <label className="form-label">Arquivo *</label>
                  <input
                    type="file"
                    className="form-control"
                    name="arquivo"
                    onChange={handleInputChange}
                    accept={
                      novoMaterial.tipo === 'video' 
                        ? '.mp4,.mov' 
                        : '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt'
                    }
                    required
                  />
                    <small className="form-text text-muted">
                      {novoMaterial.tipo === 'video' 
                        ? 'Formatos aceitos: MP4, MOV (máximo 200MB)' 
                        : 'Formatos aceitos: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT (máximo 200MB)'
                      }
                    </small>
                </div>
              </div>
              
              <div 
                style={{ 
                  padding: '20px 24px',
                  borderTop: '1px solid #e5e7eb',
                  backgroundColor: '#f9fafb',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px'
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    backgroundColor: 'white',
                    color: '#374151',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: 'black',
                    color: 'white',
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  {uploading ? (
                    <>
                      <span style={{ 
                        display: 'inline-block',
                        width: '12px',
                        height: '12px',
                        border: '2px solid transparent',
                        borderTop: '2px solid white',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        marginRight: '8px'
                      }}></span>
                      Enviando...
                    </>
                  ) : (
                    'Adicionar Material'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Materiais;