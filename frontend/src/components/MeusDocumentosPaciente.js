import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts';

const MeusDocumentosPaciente = () => {
  const { user, makeRequest, pacienteId } = useAuth();
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [documentos, setDocumentos] = useState([]);
  const [paciente, setPaciente] = useState(null);

  useEffect(() => {
    fetchDocumentos();
  }, [pacienteId]);

  const fetchDocumentos = async () => {
    try {
      setLoading(true);
      
      // Buscar dados do paciente
      const id = pacienteId || user?.paciente_id || user?.id;
      if (!id) {
        console.error('❌ [MeusDocumentosPaciente] ID do paciente não encontrado');
        showErrorToast('Erro ao carregar documentos: ID do paciente não encontrado');
        return;
      }

      console.log('📄 [MeusDocumentosPaciente] Buscando documentos do paciente:', id);
      const response = await makeRequest(`/pacientes/${id}`);
      
      if (!response.ok) {
        throw new Error('Erro ao buscar dados do paciente');
      }

      const pacienteData = await response.json();
      setPaciente(pacienteData);
      
      // Montar lista de documentos
      const docs = [];
      
      if (pacienteData.selfie_biometrica_url) {
        docs.push({
          id: 'selfie_biometrica',
          tipo: 'Selfie Biométrica',
          url: pacienteData.selfie_biometrica_url,
          created_at: pacienteData.biometria_aprovada_em || pacienteData.created_at,
          icon: '📸',
          descricao: 'Foto facial capturada durante a validação biométrica'
        });
      }
      
      if (pacienteData.documento_biometrica_url) {
        docs.push({
          id: 'documento_biometrica',
          tipo: 'Documento (RG/CNH)',
          url: pacienteData.documento_biometrica_url,
          created_at: pacienteData.biometria_aprovada_em || pacienteData.created_at,
          icon: '🆔',
          descricao: 'Foto do documento capturada durante a validação biométrica'
        });
      }
      
      if (pacienteData.comprovante_residencia_url) {
        docs.push({
          id: 'comprovante_residencia',
          tipo: 'Comprovante de Residência',
          url: pacienteData.comprovante_residencia_url,
          created_at: pacienteData.updated_at || pacienteData.created_at,
          icon: '🏠',
          descricao: 'Comprovante de residência enviado durante o cadastro'
        });
      }
      
      if (pacienteData.contrato_servico_url) {
        docs.push({
          id: 'contrato_servico',
          tipo: 'Contrato de Serviço',
          url: pacienteData.contrato_servico_url,
          created_at: pacienteData.updated_at || pacienteData.created_at,
          icon: '📄',
          descricao: 'Contrato de serviço assinado digitalmente'
        });
      }
      
      console.log('✅ [MeusDocumentosPaciente] Documentos encontrados:', docs.length);
      setDocumentos(docs);
      
    } catch (error) {
      console.error('❌ [MeusDocumentosPaciente] Erro ao buscar documentos:', error);
      showErrorToast('Erro ao carregar documentos');
    } finally {
      setLoading(false);
    }
  };

  const formatarData = (data) => {
    if (!data) return '-';
    try {
      const date = new Date(data);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return '-';
    }
  };

  const visualizarDocumento = (url, tipo) => {
    if (url) {
      window.open(url, '_blank');
    }
  };

  const downloadDocumento = (url, nome) => {
    if (url) {
      // Criar link temporário para download
      const link = document.createElement('a');
      link.href = url;
      link.download = nome || 'documento';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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
    <div style={{ padding: '0.5rem', maxWidth: '1200px', margin: '0 auto' }}>
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
          <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            Complete seu cadastro para que seus documentos apareçam aqui.
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
                alignItems: 'center',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                e.currentTarget.style.borderColor = '#3b82f6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                e.currentTarget.style.borderColor = '#e5e7eb';
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>{doc.icon}</span>
                  <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1a1d23', margin: 0 }}>
                    {doc.tipo}
                  </h3>
                </div>
                {doc.descricao && (
                  <p style={{ margin: '0.25rem 0 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
                    {doc.descricao}
                  </p>
                )}
                <p style={{ margin: '0.5rem 0 0 0', color: '#9ca3af', fontSize: '0.75rem' }}>
                  Enviado em {formatarData(doc.created_at)}
                </p>
              </div>
              {doc.url && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => visualizarDocumento(doc.url, doc.tipo)}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#2563eb';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#3b82f6';
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    Visualizar
                  </button>
                  <button
                    onClick={() => downloadDocumento(doc.url, doc.tipo)}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#059669';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#10b981';
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Baixar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MeusDocumentosPaciente;

