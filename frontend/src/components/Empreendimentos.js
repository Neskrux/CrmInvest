import React, { useState, useEffect } from 'react';
import useBranding from '../hooks/useBranding';
import { useAuth } from '../contexts/AuthContext';

const Empreendimentos = () => {
  const { t } = useBranding();
  const { makeRequest } = useAuth();
  const [empreendimentos, setEmpreendimentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEmpreendimento, setSelectedEmpreendimento] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('informacoes');
  const [showImageLightbox, setShowImageLightbox] = useState(false);

  // Função para buscar empreendimentos do banco
  const fetchEmpreendimentos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const config = await import('../config');
      const response = await fetch(`${config.default.API_BASE_URL}/empreendimentos-public`);
      
      if (!response.ok) {
        throw new Error('Erro ao carregar empreendimentos');
      }
      
      const data = await response.json();
      
       // Mapear dados do banco para o formato esperado
       const empreendimentosFormatados = data.map(emp => {
         let imagemPath = '/images/empreendimentos/default.jpg'; // Imagem padrão

         switch (emp.id) {
           case 4:
             imagemPath = '/images/empreendimentos/laguna.png';
             break;
           case 5:
             imagemPath = '/images/empreendimentos/girassol.jpg';
             break;
           case 6:
             imagemPath = '/images/empreendimentos/sintropia.png';
             break;
           case 7:
             imagemPath = '/images/empreendimentos/lotus.jpg';
             break;
           case 8:
             imagemPath = '/images/empreendimentos/river.jpg';
             break;
           default:
             imagemPath = '/images/empreendimentos/default.jpg'; // Imagem padrão para outros IDs
             break;
         }

         return {
           id: emp.id,
           nome: emp.nome,
           descricao: emp.observacoes || '',
           localizacao: `${emp.cidade} - ${emp.estado}`,
           endereco: emp.endereco || '',
           bairro: emp.bairro || '',
           tipo: emp.tipo || 'Residencial',
           unidades: emp.unidades || 0,
           status: emp.status === 'ativo' ? 'Em construção' : 'Lançamento',
           imagem: imagemPath,
           plantaUrl: emp.planta_url || '',
           plantaHumanizadaUrl: emp.planta_humanizada_url || '',
           condicoesPagamento: (() => {
             try {
               // Se for string JSON, fazer parse
               if (typeof emp.condicoes_pagamento === 'string' && emp.condicoes_pagamento.trim()) {
                 return JSON.parse(emp.condicoes_pagamento);
               }
               // Se já for objeto/array, retornar direto
               if (Array.isArray(emp.condicoes_pagamento) || typeof emp.condicoes_pagamento === 'object') {
                 return emp.condicoes_pagamento;
               }
               return [];
             } catch (e) {
               console.warn('Erro ao processar condições de pagamento:', e);
               return [];
             }
           })(),
         };
       });
      
      setEmpreendimentos(empreendimentosFormatados);
    } catch (err) {
      console.error('❌ Erro ao buscar empreendimentos:', err);
      setError('Erro ao carregar empreendimentos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Carregar dados ao montar o componente
  useEffect(() => {
    fetchEmpreendimentos();
  }, []);

  // Fechar lightbox com tecla ESC
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && showImageLightbox) {
        setShowImageLightbox(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showImageLightbox]);

  // Função para visualizar detalhes (associada ao ID real)
  const handleCardClick = (empreendimento) => {
    setSelectedEmpreendimento(empreendimento);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedEmpreendimento(null);
    setActiveTab('informacoes'); // Resetar aba ao fechar
  };

   // Função formatPrice removida (não mais necessária)

  // Função para obter cor do status
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pronto para morar':
      case 'pronto':
        return '#10b981';
      case 'em construção':
      case 'construção':
        return '#f59e0b';
      case 'lançamento':
        return '#3b82f6';
      default:
        return '#6b7280';
    }
  };

  // Loading state
  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">Gerenciar {t.clinicas}</h1>
            <p className="page-subtitle">Explore nossos empreendimentos</p>
          </div>
        </div>
        <div className="page-content">
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '300px',
            fontSize: '1.125rem',
            color: '#6b7280'
          }}>
            Carregando empreendimentos do banco...
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">Gerenciar {t.clinicas}</h1>
            <p className="page-subtitle">Explore nossos empreendimentos</p>
          </div>
        </div>
        <div className="page-content">
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '300px',
            gap: '1rem'
          }}>
            <div style={{ color: '#ef4444', fontSize: '1.125rem' }}>
              ❌ {error}
            </div>
            <button
              onClick={fetchEmpreendimentos}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (empreendimentos.length === 0) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">Gerenciar {t.clinicas}</h1>
            <p className="page-subtitle">Explore nossos empreendimentos</p>
          </div>
        </div>
        <div className="page-content">
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '300px',
            gap: '1rem'
          }}>
            <div style={{ color: '#6b7280', fontSize: '1.125rem' }}>
              📋 Nenhum empreendimento encontrado no banco
            </div>
            <button
              onClick={fetchEmpreendimentos}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}
            >
              Recarregar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Gerenciar {t.clinicas}</h1>
          <p className="page-subtitle">Explore nossos empreendimentos</p>
        </div>
      </div>
      
      <div className="page-content">
        {/* Grid de Empreendimentos */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          {empreendimentos.map((empreendimento) => (
            <div
              key={empreendimento.id} // ✅ ID real do banco (4, 5, 6, 7, 8, 9)
              onClick={() => handleCardClick(empreendimento)}
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                border: '1px solid #e5e7eb'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
              }}
            >
              {/* Imagem do Empreendimento */}
              <div style={{
                height: '200px',
                backgroundImage: empreendimento.imagem ? `url(${empreendimento.imagem})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                position: 'relative',
                backgroundColor: '#f3f4f6'
              }}>
                {/* Overlay com status */}
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  backgroundColor: getStatusColor(empreendimento.status),
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: '600'
                }}>
                  {empreendimento.status || 'Status não informado'}
                </div>

              </div>

              {/* Conteúdo do Card */}
              <div style={{ padding: '1.5rem' }}>
                <h3 style={{
                  margin: '0 0 0.5rem 0',
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  color: '#1f2937',
                  lineHeight: '1.3'
                }}>
                  {empreendimento.nome || 'Nome não informado'}
                </h3>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.75rem',
                  color: '#6b7280',
                  fontSize: '0.875rem'
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  {empreendimento.localizacao || 'Localização não informada'}
                </div>

                 <div style={{
                   display: 'flex',
                   justifyContent: 'space-between',
                   alignItems: 'center',
                   marginBottom: '1rem'
                 }}>
                   <div>
                     <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                       {empreendimento.tipo || 'Tipo não informado'} • {empreendimento.unidades || 0} unidades
                     </div>
                     {/* Removido: seção de preço */}
                   </div>
                 </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: '#3b82f6',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}>
                  <span>Ver detalhes</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6"></path>
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de Detalhes */}
      {showModal && selectedEmpreendimento && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 25px rgba(0, 0, 0, 0.1)'
          }}>
            {/* Header do Modal */}
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h2 style={{
                  margin: 0,
                  fontSize: '1.5rem',
                  fontWeight: '600',
                  color: '#1f2937'
                }}>
                  {selectedEmpreendimento.nome || 'Nome não informado'}
                </h2>
              </div>
              <button
                onClick={closeModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#f3f4f6';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                }}
              >
                ×
              </button>
            </div>

            {/* Sistema de Abas */}
            <div style={{
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              overflowX: 'auto'
            }}>
              {['informacoes', 'planta', 'planta-humanizada', 'condicoes-pagamento'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '0.75rem 1.25rem',
                    border: 'none',
                    borderBottom: activeTab === tab ? '2px solid #3b82f6' : '2px solid transparent',
                    backgroundColor: 'transparent',
                    color: activeTab === tab ? '#3b82f6' : '#6b7280',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: activeTab === tab ? '600' : '500',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== tab) {
                      e.target.style.color = '#374151';
                      e.target.style.backgroundColor = '#f9fafb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== tab) {
                      e.target.style.color = '#6b7280';
                      e.target.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {tab === 'informacoes' && 'Informações'}
                  {tab === 'planta' && 'Planta'}
                  {tab === 'planta-humanizada' && 'Planta Humanizada'}
                  {tab === 'condicoes-pagamento' && 'Condições de Pagamento'}
                </button>
              ))}
            </div>

            {/* Conteúdo das Abas */}
            <div style={{ padding: '1.5rem', maxHeight: '60vh', overflowY: 'auto' }}>
              {/* Aba: Informações */}
              {activeTab === 'informacoes' && (
                <div>
                  {/* Imagem do Empreendimento */}
                  {selectedEmpreendimento.imagem && (
                    <div style={{
                      position: 'relative',
                      height: '300px',
                      borderRadius: '8px',
                      marginBottom: '1.5rem',
                      overflow: 'hidden',
                      backgroundColor: '#f3f4f6',
                      cursor: 'pointer'
                    }}
                    onClick={() => setShowImageLightbox(true)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '0.95';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '1';
                    }}
                    >
                      <img
                        src={selectedEmpreendimento.imagem}
                        alt={selectedEmpreendimento.nome}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          objectPosition: 'center'
                        }}
                      />
                      {/* Overlay com botão de ampliar */}
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0,
                        transition: 'opacity 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '1';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = '0';
                      }}
                      >
                        <div style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          borderRadius: '8px',
                          padding: '0.75rem 1.25rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                          fontWeight: '500',
                          color: '#1f2937',
                          fontSize: '0.875rem'
                        }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"></path>
                          </svg>
                          Ver foto completa
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Localização Completa */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{
                      fontSize: '1.125rem',
                      fontWeight: '600',
                      marginBottom: '0.75rem',
                      color: '#1f2937'
                    }}>
                      Localização
                    </h3>
                    <div style={{
                      padding: '1rem',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      lineHeight: '1.6'
                    }}>
                      {selectedEmpreendimento.endereco && (
                        <div style={{ marginBottom: '0.5rem', color: '#374151' }}>
                          <strong>Endereço:</strong> {selectedEmpreendimento.endereco}
                        </div>
                      )}
                      {selectedEmpreendimento.bairro && (
                        <div style={{ marginBottom: '0.5rem', color: '#374151' }}>
                          <strong>Bairro:</strong> {selectedEmpreendimento.bairro}
                        </div>
                      )}
                      <div style={{ color: '#374151' }}>
                        <strong>Cidade/Estado:</strong> {selectedEmpreendimento.localizacao || 'Não informado'}
                      </div>
                    </div>
                  </div>

                  {/* Informações Básicas */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                      gap: '1rem'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                          Tipo
                        </div>
                        <div style={{ fontWeight: '500', color: '#1f2937' }}>
                          {selectedEmpreendimento.tipo || 'Não informado'}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                          Unidades
                        </div>
                        <div style={{ fontWeight: '500', color: '#1f2937' }}>
                          {selectedEmpreendimento.unidades || 0}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                          Status
                        </div>
                        <div style={{
                          fontWeight: '500',
                          color: getStatusColor(selectedEmpreendimento.status),
                          display: 'inline-block',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '12px',
                          backgroundColor: `${getStatusColor(selectedEmpreendimento.status)}20`,
                          fontSize: '0.875rem'
                        }}>
                          {selectedEmpreendimento.status || 'Não informado'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Descrição */}
                  {selectedEmpreendimento.descricao && (
                    <div>
                      <h3 style={{
                        fontSize: '1.125rem',
                        fontWeight: '600',
                        marginBottom: '0.75rem',
                        color: '#1f2937'
                      }}>
                        Descrição
                      </h3>
                      <p style={{
                        color: '#6b7280',
                        lineHeight: '1.6',
                        margin: 0,
                        padding: '1rem',
                        backgroundColor: '#f9fafb',
                        borderRadius: '8px'
                      }}>
                        {selectedEmpreendimento.descricao}
                      </p>
                    </div>
                  )}
                  {!selectedEmpreendimento.descricao && (
                    <div>
                      <h3 style={{
                        fontSize: '1.125rem',
                        fontWeight: '600',
                        marginBottom: '0.75rem',
                        color: '#1f2937'
                      }}>
                        Descrição
                      </h3>
                      <p style={{
                        color: '#9ca3af',
                        fontStyle: 'italic',
                        margin: 0,
                        padding: '1rem',
                        backgroundColor: '#f9fafb',
                        borderRadius: '8px'
                      }}>
                        Descrição não disponível
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Aba: Planta */}
              {activeTab === 'planta' && (
                <div>
                  {selectedEmpreendimento.plantaUrl ? (
                    <div style={{
                      width: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      padding: '1rem',
                      minHeight: '400px'
                    }}>
                      <img
                        src={selectedEmpreendimento.plantaUrl}
                        alt={`Planta de ${selectedEmpreendimento.nome}`}
                        style={{
                          maxWidth: '100%',
                          height: 'auto',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                      <div style={{
                        display: 'none',
                        textAlign: 'center',
                        color: '#9ca3af',
                        padding: '2rem'
                      }}>
                        <p>Erro ao carregar a imagem da planta</p>
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      textAlign: 'center',
                      padding: '3rem 1rem',
                      color: '#9ca3af'
                    }}>
                      <p style={{ fontSize: '1rem', margin: 0 }}>
                        Planta não disponível para este empreendimento
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Aba: Planta Humanizada */}
              {activeTab === 'planta-humanizada' && (
                <div>
                  {selectedEmpreendimento.plantaHumanizadaUrl ? (
                    <div style={{
                      width: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      padding: '1rem',
                      minHeight: '400px'
                    }}>
                      <img
                        src={selectedEmpreendimento.plantaHumanizadaUrl}
                        alt={`Planta humanizada de ${selectedEmpreendimento.nome}`}
                        style={{
                          maxWidth: '100%',
                          height: 'auto',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                      <div style={{
                        display: 'none',
                        textAlign: 'center',
                        color: '#9ca3af',
                        padding: '2rem'
                      }}>
                        <p>Erro ao carregar a imagem da planta humanizada</p>
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      textAlign: 'center',
                      padding: '3rem 1rem',
                      color: '#9ca3af'
                    }}>
                      <p style={{ fontSize: '1rem', margin: 0 }}>
                        Planta humanizada não disponível para este empreendimento
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Aba: Condições de Pagamento */}
              {activeTab === 'condicoes-pagamento' && (
                <div>
                  {selectedEmpreendimento.condicoesPagamento && 
                   Array.isArray(selectedEmpreendimento.condicoesPagamento) && 
                   selectedEmpreendimento.condicoesPagamento.length > 0 ? (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                      gap: '1.5rem'
                    }}>
                      {selectedEmpreendimento.condicoesPagamento.map((condicao, index) => (
                        <div
                          key={index}
                          style={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '12px',
                            padding: '1.5rem',
                            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }}
                        >
                          {/* Ícone/Badge */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            marginBottom: '1rem'
                          }}>
                            <div style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '10px',
                              backgroundColor: '#3b82f6',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontWeight: '600',
                              fontSize: '1rem',
                              flexShrink: 0
                            }}>
                              {index + 1}
                            </div>
                            {condicao.titulo && (
                              <h3 style={{
                                margin: 0,
                                fontSize: '1.125rem',
                                fontWeight: '600',
                                color: '#1f2937'
                              }}>
                                {condicao.titulo}
                              </h3>
                            )}
                          </div>

                          {/* Valor destacado */}
                          {condicao.valor && (
                            <div style={{
                              marginBottom: '0.75rem',
                              padding: '0.75rem',
                              backgroundColor: '#eff6ff',
                              borderRadius: '8px',
                              textAlign: 'center'
                            }}>
                              <div style={{
                                fontSize: '1.5rem',
                                fontWeight: '700',
                                color: '#3b82f6',
                                lineHeight: '1.2'
                              }}>
                                {condicao.valor}
                              </div>
                            </div>
                          )}

                          {/* Descrição */}
                          {condicao.descricao && (
                            <p style={{
                              margin: 0,
                              fontSize: '0.875rem',
                              color: '#6b7280',
                              lineHeight: '1.6'
                            }}>
                              {condicao.descricao}
                            </p>
                          )}

                          {/* Campos adicionais (se houver) */}
                          {condicao.detalhes && Array.isArray(condicao.detalhes) && condicao.detalhes.length > 0 && (
                            <div style={{
                              marginTop: '1rem',
                              paddingTop: '1rem',
                              borderTop: '1px solid #e5e7eb'
                            }}>
                              <ul style={{
                                margin: 0,
                                paddingLeft: '1.25rem',
                                listStyle: 'disc',
                                fontSize: '0.875rem',
                                color: '#6b7280'
                              }}>
                                {condicao.detalhes.map((detalhe, idx) => (
                                  <li key={idx} style={{ marginBottom: '0.5rem' }}>
                                    {detalhe}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{
                      textAlign: 'center',
                      padding: '3rem 1rem',
                      color: '#9ca3af'
                    }}>
                      <svg
                        width="64"
                        height="64"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        style={{ margin: '0 auto 1rem', opacity: 0.5 }}
                      >
                        <path d="M12 2v20M2 12h20" strokeLinecap="round" />
                      </svg>
                      <p style={{ fontSize: '1rem', margin: 0 }}>
                        Condições de pagamento não disponíveis para este empreendimento
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer do Modal */}
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center'
            }}>
              <button
                onClick={closeModal}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  backgroundColor: 'white',
                  color: '#374151',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox para foto completa */}
      {showImageLightbox && selectedEmpreendimento?.imagem && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '2rem'
          }}
          onClick={() => setShowImageLightbox(false)}
        >
          {/* Botão fechar */}
          <button
            onClick={() => setShowImageLightbox(false)}
            style={{
              position: 'absolute',
              top: '2rem',
              right: '2rem',
              background: 'rgba(255, 255, 255, 0.9)',
              border: 'none',
              borderRadius: '50%',
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '1.5rem',
              color: '#1f2937',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
              zIndex: 2001,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = 'white';
              e.target.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
              e.target.style.transform = 'scale(1)';
            }}
          >
            ×
          </button>

          {/* Imagem ampliada */}
          <div
            style={{
              maxWidth: '95vw',
              maxHeight: '95vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedEmpreendimento.imagem}
              alt={selectedEmpreendimento.nome}
              style={{
                maxWidth: '100%',
                maxHeight: '95vh',
                objectFit: 'contain',
                borderRadius: '8px',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
              }}
            />
          </div>

          {/* Nome do empreendimento no rodapé */}
          <div
            style={{
              position: 'absolute',
              bottom: '2rem',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              color: '#1f2937',
              fontSize: '1rem',
              fontWeight: '600',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
            }}
          >
            {selectedEmpreendimento.nome}
          </div>
        </div>
      )}
    </div>
  );
};

export default Empreendimentos;
