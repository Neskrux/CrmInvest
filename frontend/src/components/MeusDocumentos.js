import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import { Check, X, Clock, AlertCircle, FileText, Upload } from 'lucide-react';
import config from '../config';

const MeusDocumentos = () => {
  const { makeRequest, user } = useAuth();
  const { showSuccessToast, showErrorToast } = useToast();
  
  const [clinica, setClinica] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingDoc, setUploadingDoc] = useState(null);

  const documentos = [
    { key: 'doc_cartao_cnpj', label: '1. Cartão CNPJ' },
    { key: 'doc_contrato_social', label: '2. Contrato Social' },
    { key: 'doc_alvara_sanitario', label: '3. Alvará Sanitário' },
    { key: 'doc_balanco', label: '4. Balanço Patrimonial' },
    { key: 'doc_comprovante_endereco', label: '5. Comprovante de Endereço' },
    { key: 'doc_dados_bancarios', label: '6. Dados Bancários' },
    { key: 'doc_socios', label: '7. Documentos dos Sócios' },
    { key: 'doc_certidao_resp_tecnico', label: '8. Certidão Resp. Técnico' },
    { key: 'doc_resp_tecnico', label: '9. Docs Resp. Técnico' }
  ];

  useEffect(() => {
    carregarDadosClinica();
  }, []);

  const carregarDadosClinica = async () => {
    try {
      setLoading(true);
      
      // Verificar se o clinica_id está presente
      if (!user?.clinica_id) {
        console.error('❌ clinica_id não encontrado no usuário:', user);
        showErrorToast('Erro: ID da clínica não encontrado. Por favor, faça logout e login novamente.');
        setLoading(false);
        return;
      }
      
      // Buscar a clínica usando o clinica_id do usuário
      const response = await makeRequest(`/clinicas/${user.clinica_id}`);
      const data = await response.json();
      
      if (response.ok) {
        setClinica(data);
      } else {
        showErrorToast('Erro ao carregar dados da clínica');
      }
    } catch (error) {
      console.error('Erro ao carregar clínica:', error);
      showErrorToast('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (doc) => {
    if (!clinica) return { status: 'pendente', icon: Clock, color: '#9ca3af', text: 'Pendente' };
    
    const docKey = doc.key;
    const aprovadoKey = `${docKey}_aprovado`;
    
    // Se tem o documento enviado
    if (clinica[docKey]) {
      // Verificar se foi aprovado ou reprovado
      if (clinica[aprovadoKey] === true) {
        return { status: 'aprovado', icon: Check, color: '#10b981', text: 'Aprovado' };
      } else if (clinica[aprovadoKey] === false) {
        return { status: 'reprovado', icon: X, color: '#ef4444', text: 'Reprovado' };
      } else {
        return { status: 'enviado', icon: Clock, color: '#f59e0b', text: 'Em Análise' };
      }
    }
    
    return { status: 'pendente', icon: AlertCircle, color: '#9ca3af', text: 'Pendente' };
  };

  const handleUploadDocumento = async (docKey, file) => {
    if (!file) return;

    // Validar tipo de arquivo
    if (file.type !== 'application/pdf') {
      showErrorToast('Apenas arquivos PDF são permitidos');
      return;
    }

    // Validar tamanho (10MB)
    if (file.size > 10 * 1024 * 1024) {
      showErrorToast('O arquivo deve ter no máximo 10MB');
      return;
    }

    setUploadingDoc(docKey);
    try {
      const formData = new FormData();
      formData.append('documento', file);
      formData.append('tipo', docKey);

      // Para FormData, não usar makeRequest pois ele adiciona Content-Type automaticamente
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.API_BASE_URL}/clinicas/${user.clinica_id}/documentos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        showSuccessToast('Documento enviado com sucesso!');
        carregarDadosClinica();
      } else {
        showErrorToast(data.error || 'Erro ao enviar documento');
      }
    } catch (error) {
      console.error('Erro ao enviar documento:', error);
      showErrorToast('Erro ao enviar documento');
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleDownloadDocumento = async (docKey) => {
    try {
      const response = await makeRequest(`/clinicas/${user.clinica_id}/documentos/${docKey}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${docKey}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        showErrorToast('Erro ao baixar documento');
      }
    } catch (error) {
      console.error('Erro ao baixar documento:', error);
      showErrorToast('Erro ao baixar documento');
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Carregando documentos...</p>
      </div>
    );
  }

  if (!clinica && !loading) {
    return (
      <div className="card">
        <div className="card-body" style={{ textAlign: 'center', padding: '3rem' }}>
          <AlertCircle size={48} color="#ef4444" style={{ marginBottom: '1rem' }} />
          <h3>Erro ao carregar dados</h3>
          <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
            {!user?.clinica_id 
              ? 'ID da clínica não encontrado. Por favor, faça logout e login novamente.'
              : 'Não foi possível carregar os dados da clínica'}
          </p>
          <button 
            className="btn btn-primary"
            onClick={() => window.location.href = '/'}
            style={{ marginTop: '1rem' }}
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Meus Documentos</h1>
          <p className="page-subtitle">Gerencie e acompanhe o status dos documentos da sua clínica</p>
        </div>
      </div>

      {/* Informações da Clínica */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-body">
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
            {clinica.nome}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {clinica.cnpj && (
              <div>
                <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>CNPJ:</span>
                <p style={{ fontWeight: '500', margin: '0.25rem 0 0 0' }}>{clinica.cnpj}</p>
              </div>
            )}
            {clinica.cidade && (
              <div>
                <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>Localização:</span>
                <p style={{ fontWeight: '500', margin: '0.25rem 0 0 0' }}>{clinica.cidade}/{clinica.estado}</p>
              </div>
            )}
            {clinica.status && (
              <div>
                <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>Status:</span>
                <p style={{ fontWeight: '500', margin: '0.25rem 0 0 0', textTransform: 'capitalize' }}>
                  {clinica.status}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lista de Documentos */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Documentação Necessária</h2>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gap: '1rem' }}>
            {documentos.map((doc) => {
              const statusInfo = getStatusInfo(doc);
              const StatusIcon = statusInfo.icon;
              
              return (
                <div
                  key={doc.key}
                  style={{
                    padding: '1.5rem',
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    flexWrap: 'wrap'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: '1', minWidth: '200px' }}>
                    <FileText size={24} color="#6b7280" />
                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: '600', margin: '0' }}>
                        {doc.label}
                      </h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                        <StatusIcon size={16} color={statusInfo.color} />
                        <span style={{ fontSize: '0.875rem', color: statusInfo.color, fontWeight: '500' }}>
                          {statusInfo.text}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {/* Botão de Download - só aparece se o documento foi enviado */}
                    {clinica[doc.key] && (
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => handleDownloadDocumento(doc.key)}
                        title="Baixar documento"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="7 10 12 15 17 10"/>
                          <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        Baixar
                      </button>
                    )}

                    {/* Botão de Upload/Reenviar */}
                    <label
                      htmlFor={`upload-${doc.key}`}
                      className={`btn btn-sm ${clinica[doc.key] ? 'btn-primary' : 'btn-primary'}`}
                      style={{ cursor: uploadingDoc === doc.key ? 'not-allowed' : 'pointer' }}
                    >
                      {uploadingDoc === doc.key ? (
                        <>
                          <div className="spinner" style={{ width: '14px', height: '14px', marginRight: '4px' }}></div>
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Upload size={16} style={{ marginRight: '4px' }} />
                          {clinica[doc.key] ? 'Reenviar' : 'Enviar'}
                        </>
                      )}
                    </label>
                    <input
                      id={`upload-${doc.key}`}
                      type="file"
                      accept=".pdf"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleUploadDocumento(doc.key, e.target.files[0]);
                        }
                      }}
                      disabled={uploadingDoc === doc.key}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Avisos */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="card-body" style={{ backgroundColor: '#eff6ff' }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <AlertCircle size={24} color="#3b82f6" style={{ flexShrink: 0 }} />
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: '600', margin: '0 0 0.5rem 0', color: '#1e40af' }}>
                Informações Importantes
              </h4>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#1e40af' }}>
                <li>Apenas arquivos PDF são aceitos</li>
                <li>Tamanho máximo por arquivo: 10MB</li>
                <li>Os documentos serão analisados pela equipe administrativa</li>
                <li>Você será notificado sobre aprovações ou solicitações de reenvio</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeusDocumentos;

