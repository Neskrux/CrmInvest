import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';

const MeusDocumentosPaciente = () => {
  const { user, makeRequest, pacienteId } = useAuth();
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [documentos, setDocumentos] = useState([]);

  useEffect(() => {
    fetchDocumentos();
  }, []);

  const fetchDocumentos = async () => {
    try {
      setLoading(true);
      // TODO: Implementar endpoint específico para documentos do paciente
      // Por enquanto, retornar array vazio
      setDocumentos([]);
    } catch (error) {
      console.error('Erro ao buscar documentos:', error);
      showErrorToast('Erro ao carregar documentos');
    } finally {
      setLoading(false);
    }
  };

  const formatarData = (data) => {
    if (!data) return '-';
    const date = new Date(data);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const downloadDocumento = (url, nome) => {
    if (url) {
      window.open(url, '_blank');
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '80vh'
      }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '2rem', fontSize: '2rem', fontWeight: '700', color: '#1a1d23' }}>
        Meus Documentos
      </h1>

      {documentos.length === 0 ? (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '3rem',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <p style={{ color: '#6b7280', fontSize: '1rem' }}>
            Você ainda não possui documentos cadastrados.
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gap: '1rem'
        }}>
          {documentos.map((doc) => (
            <div
              key={doc.id}
              style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '1.5rem',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                border: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1a1d23', margin: 0 }}>
                  {doc.tipo || 'Documento'}
                </h3>
                <p style={{ margin: '0.25rem 0 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
                  Enviado em {formatarData(doc.created_at)}
                </p>
              </div>
              {doc.url && (
                <button
                  onClick={() => downloadDocumento(doc.url, doc.tipo)}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#1a1d23',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Baixar
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MeusDocumentosPaciente;

