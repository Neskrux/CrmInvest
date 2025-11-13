import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts';

const ModalEvidencia = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  tipo, 
  registroId, 
  statusAnterior, 
  statusNovo,
  nomeRegistro,
  empresaId 
}) => {
  const { makeRequest } = useAuth();
  const { showSuccessToast, showErrorToast } = useToast();
  const fileInputRef = useRef(null);
  
  const [arquivo, setArquivo] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [observacao, setObservacao] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFileSelect = (file) => {
    // Validar tipo de arquivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      showErrorToast('Apenas arquivos JPG e PNG são permitidos!');
      return;
    }
    
    // Validar tamanho (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showErrorToast('Arquivo muito grande! Máximo 5MB.');
      return;
    }
    
    setArquivo(file);
    
    // Criar preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!arquivo) {
      showErrorToast('Por favor, selecione um arquivo de evidência!');
      return;
    }
    
    setUploading(true);
    
    try {
      // Criar FormData para enviar arquivo
      const formData = new FormData();
      formData.append('evidencia', arquivo);
      formData.append('tipo', tipo);
      formData.append('registro_id', registroId);
      formData.append('status_anterior', statusAnterior || '');
      formData.append('status_novo', statusNovo);
      formData.append('observacao', observacao);
      
      // Upload da evidência
      const API_BASE_URL = process.env.NODE_ENV === 'production' 
        ? 'https://crminvest-backend.fly.dev/api' 
        : 'http://localhost:5000/api';
      
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE_URL}/evidencias/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      const data = await response.json();
      
      if (response.ok) {
        showSuccessToast('Evidência enviada com sucesso!');
        // Chamar callback de sucesso passando o ID da evidência
        onSuccess(data.id);
        handleClose();
      } else {
        showErrorToast(data.error || 'Erro ao enviar evidência');
      }
    } catch (error) {
      console.error('Erro ao enviar evidência:', error);
      showErrorToast('Erro ao enviar evidência');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setArquivo(null);
    setPreviewUrl(null);
    setObservacao('');
    setDragActive(false);
    onClose();
  };

  // Bloquear scroll quando modal estiver aberto - DEVE VIR ANTES DO RETURN
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal" style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2 className="modal-title">Evidência Obrigatória</h2>
          <button className="close-btn" onClick={handleClose} disabled={uploading}>
            ×
          </button>
        </div>

        <div style={{ padding: '1.5rem' }}>
          {/* Alerta de Obrigatoriedade */}
          <div style={{
            backgroundColor: '#fef3c7',
            border: '1px solid #f59e0b',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <strong style={{ color: '#92400e' }}>Evidência Obrigatória</strong>
            </div>
            <p style={{ color: '#92400e', margin: 0, lineHeight: '1.5', fontSize: '0.9rem' }}>
              Para alterar o status para <strong>"{statusNovo}"</strong> você precisa anexar um print como evidência.
            </p>
          </div>

          {/* Informações do Registro */}
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ color: '#374151', marginBottom: '0.5rem' }}>
              <strong>{tipo === 'paciente' ? (empresaId === 5 ? 'Cliente' : 'Paciente') : 'Clínica'}:</strong> {nomeRegistro}
            </p>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>
              {statusAnterior && (
                <>De: <span style={{ fontWeight: '600' }}>{statusAnterior}</span> → </>
              )}
              Para: <span style={{ fontWeight: '600', color: '#ef4444' }}>{statusNovo}</span>
            </p>
          </div>

          {/* Área de Upload */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ 
              display: 'block', 
              fontWeight: '600', 
              color: '#374151', 
              marginBottom: '0.5rem',
              fontSize: '0.95rem'
            }}>
              Anexar Print (Evidência) *
            </label>
            
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: dragActive ? '3px dashed #3b82f6' : '2px dashed #d1d5db',
                borderRadius: '12px',
                padding: '2rem',
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: dragActive ? '#eff6ff' : '#f9fafb',
                transition: 'all 0.3s ease',
                minHeight: '200px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                onChange={handleFileInputChange}
                style={{ display: 'none' }}
              />
              
              {previewUrl ? (
                <div style={{ width: '100%' }}>
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    style={{
                      maxWidth: '100%',
                      maxHeight: '300px',
                      borderRadius: '8px',
                      marginBottom: '1rem',
                      objectFit: 'contain'
                    }}
                  />
                  <p style={{ 
                    color: '#059669', 
                    fontWeight: '600',
                    margin: 0,
                    fontSize: '0.875rem'
                  }}>
                    ✓ {arquivo.name}
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setArquivo(null);
                      setPreviewUrl(null);
                    }}
                    style={{
                      marginTop: '0.5rem',
                      padding: '0.5rem 1rem',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      cursor: 'pointer'
                    }}
                  >
                    Remover Arquivo
                  </button>
                </div>
              ) : (
                <>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" style={{ marginBottom: '1rem' }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  <p style={{ color: '#6b7280', margin: 0, marginBottom: '0.5rem', fontWeight: '600' }}>
                    Clique para selecionar ou arraste o arquivo aqui
                  </p>
                  <p style={{ color: '#9ca3af', margin: 0, fontSize: '0.875rem' }}>
                    PNG ou JPG (máx. 5MB)
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Campo de Observação */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ 
              display: 'block', 
              fontWeight: '600', 
              color: '#374151', 
              marginBottom: '0.5rem',
              fontSize: '0.95rem'
            }}>
              Observação (Opcional)
            </label>
            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Adicione detalhes sobre a mudança de status..."
              rows="3"
              disabled={uploading}
              style={{
                width: '100%',
                padding: '0.875rem',
                border: '2px solid #e2e8f0',
                borderRadius: '10px',
                fontSize: '0.95rem',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
            />
          </div>

          {/* Botões */}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={handleClose}
              disabled={uploading}
              className="btn btn-secondary"
              style={{
                opacity: uploading ? 0.6 : 1,
                cursor: uploading ? 'not-allowed' : 'pointer'
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!arquivo || uploading}
              className="btn btn-primary"
              style={{
                opacity: (!arquivo || uploading) ? 0.6 : 1,
                cursor: (!arquivo || uploading) ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              {uploading ? (
                <>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Enviando...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  Confirmar e Enviar Evidência
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ModalEvidencia;

