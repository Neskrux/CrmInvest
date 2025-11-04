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
  const [activeTab, setActiveTab] = useState('unidades');
  const [showImageLightbox, setShowImageLightbox] = useState(false);
  const [lightboxImageIndex, setLightboxImageIndex] = useState(0);
  const [filtroGaleria, setFiltroGaleria] = useState('Fotos');

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
           unidades: emp.unidades != null ? parseInt(emp.unidades, 10) || 0 : 0,
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
          // Novos campos
          galeriaImagens: (() => {
            try {
              if (typeof emp.galeria_imagens === 'string' && emp.galeria_imagens.trim()) {
                return JSON.parse(emp.galeria_imagens);
              }
              if (Array.isArray(emp.galeria_imagens)) {
                return emp.galeria_imagens;
              }
              return [];
            } catch (e) {
              console.warn('Erro ao processar galeria de imagens:', e);
              return [];
            }
          })(),
          diferenciaisGerais: emp.diferenciais_gerais || '',
          progressoObra: emp.progresso_obra || 0,
          dataInicioObra: emp.data_inicio_obra || null,
          dataEntrega: emp.data_entrega || null,
          valorCondominio: emp.valor_condominio || null,
          valorIptu: emp.valor_iptu || null,
          dataUltimaAtualizacao: emp.data_ultima_atualizacao || null,
          telefone: emp.telefone || '',
          email: emp.email || '',
          siteIncorporadora: emp.site_incorporadora || '',
          pdfUrl: emp.pdf_url || '',
          catalogoUrl: emp.catalogo_url || '',
          tourVirtualUrl: emp.tour_virtual_url || '',
          simuladorCaixaUrl: emp.simulador_caixa_url || '',
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

  // Fechar lightbox com tecla ESC e navegação por setas
  useEffect(() => {
    const handleKeyboard = (e) => {
      if (showImageLightbox && selectedEmpreendimento) {
        const images = selectedEmpreendimento.galeriaImagens && selectedEmpreendimento.galeriaImagens.length > 0
          ? selectedEmpreendimento.galeriaImagens
          : (selectedEmpreendimento.imagem ? [selectedEmpreendimento.imagem] : []);
        
        if (e.key === 'Escape') {
          setShowImageLightbox(false);
        } else if (e.key === 'ArrowLeft' && images.length > 1) {
          setLightboxImageIndex((lightboxImageIndex - 1 + images.length) % images.length);
        } else if (e.key === 'ArrowRight' && images.length > 1) {
          setLightboxImageIndex((lightboxImageIndex + 1) % images.length);
        }
      }
    };
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [showImageLightbox, lightboxImageIndex, selectedEmpreendimento]);

  // Função para visualizar detalhes (associada ao ID real)
  const handleCardClick = async (empreendimento) => {
    setSelectedEmpreendimento(empreendimento);
    setShowModal(true);
    setActiveTab('unidades'); // Aba padrão agora é unidades
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedEmpreendimento(null);
    setActiveTab('unidades'); // Resetar aba ao fechar
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
                height: '240px',
                backgroundImage: empreendimento.imagem ? `url(${empreendimento.imagem})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                position: 'relative',
                backgroundColor: '#1f2937',
                borderTopLeftRadius: '12px',
                borderTopRightRadius: '12px'
              }}>
                {/* Overlay escuro gradiente na parte inferior */}
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '100px',
                  background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)'
                }} />
                
                {/* Barra de progresso da obra */}
                {empreendimento.progressoObra !== undefined && (
                  <div style={{
                    position: 'absolute',
                    bottom: '12px',
                    left: '12px',
                    right: '12px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '0.25rem'
                    }}>
                      <span style={{
                        color: 'white',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                      }}>
                        Obra: {empreendimento.progressoObra || 0}%
                      </span>
                    </div>
                    <div style={{
                      width: '100%',
                      height: '4px',
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      borderRadius: '2px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${empreendimento.progressoObra || 0}%`,
                        height: '100%',
                        backgroundColor: '#10b981',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>
                )}

                {/* Badge de status no canto superior direito */}
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  backgroundColor: getStatusColor(empreendimento.status),
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                }}>
                  {empreendimento.status || 'Status não informado'}
                </div>
              </div>

              {/* Conteúdo do Card */}
              <div style={{ 
                padding: '1.5rem',
                backgroundColor: '#1f2937',
                color: 'white',
                borderBottomLeftRadius: '12px',
                borderBottomRightRadius: '12px'
              }}>
                <h3 style={{
                  margin: '0 0 0.75rem 0',
                  fontSize: '1.125rem',
                  fontWeight: '700',
                  color: 'white',
                  lineHeight: '1.3',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {empreendimento.nome || 'Nome não informado'}
                </h3>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.75rem',
                  color: '#9ca3af',
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
                  marginTop: '1rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                    {empreendimento.tipo || 'Tipo não informado'}
                    {(empreendimento.unidades && empreendimento.unidades > 0) && ` • ${empreendimento.unidades} unidades`}
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: '#60a5fa',
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
            </div>
          ))}
        </div>
      </div>

      {/* Modal de Detalhes - Layout de Dois Painéis */}
      {showModal && selectedEmpreendimento && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#1f2937',
            borderRadius: '12px',
            maxWidth: '1400px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden'
          }}>
            {/* Header do Modal */}
            <div style={{
              padding: '1rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#1f2937'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button
                  onClick={closeModal}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    color: '#9ca3af',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ←
                </button>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {selectedEmpreendimento.telefone && (
                  <button
                    onClick={() => window.open(`tel:${selectedEmpreendimento.telefone}`)}
                    style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#9ca3af'
                  }}
                >
                  📞
                </button>
                )}
                <button
                  onClick={() => {
                    // Função para copiar link ou compartilhar
                    const url = window.location.href;
                    navigator.clipboard.writeText(url).then(() => {
                      alert('Link copiado para a área de transferência!');
                    }).catch(() => {
                      alert('Erro ao copiar link');
                    });
                  }}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem',
                    color: '#9ca3af'
                  }}
                  title="Copiar link"
                >
                  🔗
                </button>
                <button
                  onClick={closeModal}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem',
                    color: '#9ca3af'
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            {/* Container Principal - Dois Painéis */}
            <div style={{
              display: 'flex',
              flex: 1,
              overflow: 'hidden'
            }}>
              {/* Painel Esquerdo - Informações Fixas */}
              <div style={{
                width: '400px',
                backgroundColor: '#1f2937',
                color: 'white',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                borderRight: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                {/* Abas de Navegação - Navbar no topo */}
                <div style={{
                  display: 'flex',
                  padding: '0.5rem 1rem',
                  gap: '0.25rem',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  backgroundColor: 'rgba(0, 0, 0, 0.2)'
                }}>
                  {['unidades', 'galeria', 'hotsite', 'catalogo'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      style={{
                        padding: '0.5rem 0.75rem',
                        border: 'none',
                        borderRadius: '4px',
                        backgroundColor: activeTab === tab ? 'rgba(59, 130, 246, 0.3)' : 'transparent',
                        color: activeTab === tab ? '#60a5fa' : '#9ca3af',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: activeTab === tab ? '600' : '400',
                        textAlign: 'center',
                        transition: 'all 0.2s ease',
                        whiteSpace: 'nowrap'
                      }}
                      onMouseEnter={(e) => {
                        if (activeTab !== tab) {
                          e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (activeTab !== tab) {
                          e.target.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      {tab === 'galeria' && 'Galeria'}
                      {tab === 'hotsite' && 'Hotsite'}
                      {tab === 'catalogo' && 'Catálogo'}
                      {tab === 'unidades' && 'Unidades'}
                    </button>
                  ))}
                </div>

                {/* Informações do Empreendimento */}
                <div style={{
                  padding: '1.5rem',
                  flex: 1,
                  overflowY: 'auto'
                }}>
                  <h2 style={{
                    margin: '0 0 1rem 0',
                    fontSize: '1.25rem',
                    fontWeight: '700',
                    color: 'white',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {selectedEmpreendimento.nome || 'Nome não informado'}
                  </h2>

                  {/* Localização */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.5rem',
                    marginBottom: '1.5rem',
                    color: '#9ca3af',
                    fontSize: '0.875rem'
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginTop: '2px', flexShrink: 0 }}>
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    <div>
                      {selectedEmpreendimento.endereco && <div>{selectedEmpreendimento.endereco}</div>}
                      {selectedEmpreendimento.bairro && <div>{selectedEmpreendimento.bairro}</div>}
                      <div>{selectedEmpreendimento.localizacao || 'Localização não informada'}</div>
                    </div>
                  </div>

                  {/* Datas da Obra */}
                  {(selectedEmpreendimento.dataInicioObra || selectedEmpreendimento.dataEntrega) && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      {selectedEmpreendimento.dataInicioObra && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          marginBottom: '0.5rem',
                          color: '#9ca3af',
                          fontSize: '0.875rem'
                        }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                          </svg>
                          <span>INÍCIO DA OBRA {new Date(selectedEmpreendimento.dataInicioObra).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}</span>
                        </div>
                      )}
                      {selectedEmpreendimento.dataEntrega && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          color: '#9ca3af',
                          fontSize: '0.875rem'
                        }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                          </svg>
                          <span>DATA DE ENTREGA {new Date(selectedEmpreendimento.dataEntrega).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Progresso da Obra */}
                  {selectedEmpreendimento.progressoObra !== undefined && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0.5rem'
                      }}>
                        <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
                          {selectedEmpreendimento.progressoObra || 0}% concluído
                        </span>
                      </div>
                      <div style={{
                        width: '100%',
                        height: '6px',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '3px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${selectedEmpreendimento.progressoObra || 0}%`,
                          height: '100%',
                          backgroundColor: '#10b981',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                    </div>
                  )}

                  {/* Características */}
                  <div style={{
                    display: 'flex',
                    gap: '1rem',
                    marginBottom: '1.5rem',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#9ca3af', fontSize: '0.875rem' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                        <polyline points="9 22 9 12 15 12 15 22"></polyline>
                      </svg>
                      <span>3 Dorm.</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#9ca3af', fontSize: '0.875rem' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                      </svg>
                      <span>1 Suites</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#9ca3af', fontSize: '0.875rem' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1"></path>
                        <polygon points="12 15 17 21 7 21 12 15"></polygon>
                      </svg>
                      <span>2 Vagas</span>
                    </div>
                  </div>

                  {/* Valor Condomínio */}
                  {selectedEmpreendimento.valorCondominio && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '1.5rem',
                      color: '#9ca3af',
                      fontSize: '0.875rem'
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="1" x2="12" y2="23"></line>
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                      </svg>
                      <span>R$ {parseFloat(selectedEmpreendimento.valorCondominio).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} Condomínio</span>
                    </div>
                  )}

                  {/* Imagem do Empreendimento */}
                  {selectedEmpreendimento.imagem && (
                    <div style={{
                      marginTop: '2rem',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      height: '200px'
                    }}>
                      <img
                        src={selectedEmpreendimento.imagem}
                        alt={selectedEmpreendimento.nome}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Painel Direito - Conteúdo das Abas */}
              <div style={{
                flex: 1,
                backgroundColor: '#1f2937',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}>
                <div style={{
                  padding: '1.5rem',
                  flex: 1,
                  overflowY: 'auto',
                  color: 'white'
                }}>
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
                    onClick={() => {
                      // Se tiver galeria, começar pela primeira imagem da galeria
                      if (selectedEmpreendimento.galeriaImagens && selectedEmpreendimento.galeriaImagens.length > 0) {
                        setLightboxImageIndex(0);
                      } else {
                        setLightboxImageIndex(0); // Imagem principal
                      }
                      setShowImageLightbox(true);
                    }}
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

                  {/* Aba: Galeria */}
                  {activeTab === 'galeria' && (
                    <div>
                      {/* Filtros da Galeria */}
                      <div style={{
                        display: 'flex',
                        gap: '0.5rem',
                        marginBottom: '1.5rem',
                        flexWrap: 'wrap'
                      }}>
                        {['Fotos', 'Plantas', 'Videos', 'Tour virtual'].map((filtro) => (
                          <button
                            key={filtro}
                            onClick={() => setFiltroGaleria(filtro)}
                            style={{
                              padding: '0.5rem 1rem',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              borderRadius: '6px',
                              backgroundColor: filtroGaleria === filtro ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                              color: filtroGaleria === filtro ? '#60a5fa' : '#9ca3af',
                              cursor: 'pointer',
                              fontSize: '0.875rem',
                              fontWeight: '500',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              if (filtroGaleria !== filtro) {
                                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (filtroGaleria !== filtro) {
                                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                              }
                            }}
                          >
                            {filtro}
                          </button>
                        ))}
                      </div>

                      {/* Conteúdo baseado no filtro selecionado */}
                      {filtroGaleria === 'Fotos' && selectedEmpreendimento.galeriaImagens && selectedEmpreendimento.galeriaImagens.length > 0 && (
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                          gap: '0.75rem'
                        }}>
                          {selectedEmpreendimento.galeriaImagens.map((imgUrl, index) => (
                            <div
                              key={index}
                              onClick={() => {
                                setLightboxImageIndex(index);
                                setShowImageLightbox(true);
                              }}
                              style={{
                                position: 'relative',
                                aspectRatio: '1',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                cursor: 'pointer',
                                backgroundColor: '#f3f4f6',
                                transition: 'transform 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'scale(1.05)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1)';
                                e.currentTarget.style.boxShadow = 'none';
                              }}
                            >
                              <img
                                src={imgUrl}
                                alt={`Imagem ${index + 1} de ${selectedEmpreendimento.nome}`}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover'
                                }}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {filtroGaleria === 'Plantas' && (
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
                            </div>
                          ) : (
                            <div style={{
                              textAlign: 'center',
                              padding: '3rem 1rem',
                              color: '#9ca3af'
                            }}>
                              <p style={{ fontSize: '1rem', margin: 0, color: '#9ca3af' }}>
                                Planta não disponível para este empreendimento
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {filtroGaleria === 'Videos' && (
                        <div style={{
                          textAlign: 'center',
                          padding: '3rem 1rem',
                          color: '#9ca3af'
                        }}>
                          <p style={{ fontSize: '1rem', margin: 0, color: '#9ca3af' }}>
                            Vídeos não disponíveis para este empreendimento
                          </p>
                        </div>
                      )}

                      {filtroGaleria === 'Tour virtual' && (
                        <div>
                          {selectedEmpreendimento.tourVirtualUrl ? (
                            <div style={{
                              width: '100%',
                              height: '600px',
                              borderRadius: '8px',
                              overflow: 'hidden',
                              backgroundColor: '#f9fafb'
                            }}>
                              <iframe
                                src={selectedEmpreendimento.tourVirtualUrl}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  border: 'none'
                                }}
                                title="Tour Virtual"
                                allowFullScreen
                              />
                            </div>
                          ) : (
                            <div style={{
                              textAlign: 'center',
                              padding: '3rem 1rem',
                              color: '#9ca3af'
                            }}>
                              <p style={{ fontSize: '1rem', margin: 0, color: '#9ca3af' }}>
                                Tour virtual não disponível para este empreendimento
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Mensagem quando não há conteúdo de Fotos */}
                      {filtroGaleria === 'Fotos' && (!selectedEmpreendimento.galeriaImagens || selectedEmpreendimento.galeriaImagens.length === 0) && (
                        <div style={{
                          textAlign: 'center',
                          padding: '3rem 1rem',
                          color: '#9ca3af'
                        }}>
                          <p style={{ fontSize: '1rem', margin: 0, color: '#9ca3af' }}>
                            Galeria de imagens não disponível para este empreendimento
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Aba: Unidades */}
                  {activeTab === 'unidades' && (
                    <div>
                      {/* Resumo de Disponibilidade */}
                      <div style={{
                        marginBottom: '2rem',
                        padding: '1.5rem',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        borderRadius: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                        border: '1px solid rgba(16, 185, 129, 0.2)'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1rem'
                        }}>
                          <div style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            backgroundColor: '#10b981'
                          }} />
                          <span style={{ fontSize: '1rem', color: '#10b981', fontWeight: '700' }}>
                            {selectedEmpreendimento.unidades || 0} UNIDADES DISPONÍVEIS
                          </span>
                        </div>
                        
                        {selectedEmpreendimento.dataUltimaAtualizacao && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontSize: '0.875rem',
                            color: '#9ca3af'
                          }}>
                            <span>
                              Última atualização: {new Date(selectedEmpreendimento.dataUltimaAtualizacao).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                        )}

                        {/* Informações adicionais do empreendimento */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                          gap: '1rem',
                          marginTop: '1rem',
                          paddingTop: '1rem',
                          borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                        }}>
                          {selectedEmpreendimento.valorCondominio && (
                            <div>
                              <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>
                                Condomínio
                              </div>
                              <div style={{ fontSize: '1rem', color: 'white', fontWeight: '600' }}>
                                R$ {parseFloat(selectedEmpreendimento.valorCondominio).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </div>
                            </div>
                          )}
                          {selectedEmpreendimento.valorIptu && (
                            <div>
                              <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>
                                IPTU
                              </div>
                              <div style={{ fontSize: '1rem', color: 'white', fontWeight: '600' }}>
                                R$ {parseFloat(selectedEmpreendimento.valorIptu).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </div>
                            </div>
                          )}
                          {selectedEmpreendimento.dataEntrega && (
                            <div>
                              <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>
                                Previsão de Entrega
                              </div>
                              <div style={{ fontSize: '1rem', color: 'white', fontWeight: '600' }}>
                                {new Date(selectedEmpreendimento.dataEntrega).toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric'
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Informações sobre o empreendimento */}
                      <div style={{
                        padding: '1.5rem',
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      }}>
                        <h3 style={{
                          fontSize: '1.125rem',
                          fontWeight: '600',
                          color: 'white',
                          marginBottom: '1rem'
                        }}>
                          Informações do Empreendimento
                        </h3>
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.75rem'
                        }}>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            paddingBottom: '0.75rem',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                          }}>
                            <span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>Tipo</span>
                            <span style={{ fontSize: '0.875rem', color: 'white', fontWeight: '500' }}>
                              {selectedEmpreendimento.tipo || 'Não informado'}
                            </span>
                          </div>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            paddingBottom: '0.75rem',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                          }}>
                            <span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>Total de Unidades</span>
                            <span style={{ fontSize: '0.875rem', color: 'white', fontWeight: '500' }}>
                              {selectedEmpreendimento.unidades || 0}
                            </span>
                          </div>
                          {selectedEmpreendimento.dataInicioObra && (
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              paddingBottom: '0.75rem',
                              borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                            }}>
                              <span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>Início da Obra</span>
                              <span style={{ fontSize: '0.875rem', color: 'white', fontWeight: '500' }}>
                                {new Date(selectedEmpreendimento.dataInicioObra).toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                          )}
                          {selectedEmpreendimento.progressoObra !== undefined && (
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.5rem',
                              paddingTop: '0.75rem'
                            }}>
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}>
                                <span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>Progresso da Obra</span>
                                <span style={{ fontSize: '0.875rem', color: 'white', fontWeight: '500' }}>
                                  {selectedEmpreendimento.progressoObra || 0}%
                                </span>
                              </div>
                              <div style={{
                                width: '100%',
                                height: '8px',
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                borderRadius: '4px',
                                overflow: 'hidden'
                              }}>
                                <div style={{
                                  width: `${selectedEmpreendimento.progressoObra || 0}%`,
                                  height: '100%',
                                  backgroundColor: '#10b981',
                                  transition: 'width 0.3s ease'
                                }} />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Aba: Hotsite */}
                  {activeTab === 'hotsite' && (
                    <div style={{
                      textAlign: 'center',
                      padding: '3rem 1rem',
                      color: '#9ca3af'
                    }}>
                      <p style={{ fontSize: '1rem', margin: 0, color: '#9ca3af' }}>
                        Hotsite será implementado em breve
                      </p>
                      {selectedEmpreendimento.tourVirtualUrl && (
                        <a
                          href={selectedEmpreendimento.tourVirtualUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-block',
                            marginTop: '1rem',
                            padding: '0.75rem 1.5rem',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            textDecoration: 'none',
                            borderRadius: '6px',
                            fontWeight: '500'
                          }}
                        >
                          Ver Tour Virtual
                        </a>
                      )}
                    </div>
                  )}

                  {/* Aba: Catálogo */}
                  {activeTab === 'catalogo' && (
                    <div style={{
                      textAlign: 'center',
                      padding: '3rem 1rem',
                      color: '#9ca3af'
                    }}>
                      {selectedEmpreendimento.catalogoUrl ? (
                        <iframe
                          src={selectedEmpreendimento.catalogoUrl}
                          style={{
                            width: '100%',
                            height: '600px',
                            border: 'none',
                            borderRadius: '8px',
                            backgroundColor: 'rgba(0, 0, 0, 0.2)'
                          }}
                          title="Catálogo do Empreendimento"
                        />
                      ) : (
                        <p style={{ fontSize: '1rem', margin: 0, color: '#9ca3af' }}>
                          Catálogo não disponível para este empreendimento
                        </p>
                      )}
                    </div>
                  )}

                  {/* Aba: Progresso Obra (antiga - manter por compatibilidade mas não mostrar nas abas) */}
                  {activeTab === 'progresso-obra' && (
                <div>
                  <div style={{ marginBottom: '2rem' }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.5rem'
                    }}>
                      <h3 style={{
                        fontSize: '1.125rem',
                        fontWeight: '600',
                        margin: 0,
                        color: '#1f2937'
                      }}>
                        Progresso da Obra
                      </h3>
                      <span style={{
                        fontSize: '1.5rem',
                        fontWeight: '700',
                        color: '#3b82f6'
                      }}>
                        {selectedEmpreendimento.progressoObra || 0}%
                      </span>
                    </div>
                    <div style={{
                      width: '100%',
                      height: '24px',
                      backgroundColor: '#e5e7eb',
                      borderRadius: '12px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${selectedEmpreendimento.progressoObra || 0}%`,
                        height: '100%',
                        backgroundColor: '#3b82f6',
                        transition: 'width 0.3s ease',
                        borderRadius: '12px'
                      }} />
                    </div>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1rem',
                    marginBottom: '2rem'
                  }}>
                    {selectedEmpreendimento.dataInicioObra && (
                      <div style={{
                        padding: '1rem',
                        backgroundColor: '#f9fafb',
                        borderRadius: '8px'
                      }}>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                          Início da Obra
                        </div>
                        <div style={{ fontWeight: '600', color: '#1f2937' }}>
                          {new Date(selectedEmpreendimento.dataInicioObra).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    )}
                    {selectedEmpreendimento.dataEntrega && (
                      <div style={{
                        padding: '1rem',
                        backgroundColor: '#f9fafb',
                        borderRadius: '8px'
                      }}>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                          Previsão de Entrega
                        </div>
                        <div style={{ fontWeight: '600', color: '#1f2937' }}>
                          {new Date(selectedEmpreendimento.dataEntrega).toLocaleDateString('pt-BR')}
                        </div>
                        {selectedEmpreendimento.dataEntrega && (() => {
                          const hoje = new Date();
                          const entrega = new Date(selectedEmpreendimento.dataEntrega);
                          const diffTime = entrega - hoje;
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          return diffDays > 0 ? (
                            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                              {diffDays} dias restantes
                            </div>
                          ) : null;
                        })()}
                      </div>
                    )}
                    {selectedEmpreendimento.valorCondominio && (
                      <div style={{
                        padding: '1rem',
                        backgroundColor: '#f9fafb',
                        borderRadius: '8px'
                      }}>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                          Condomínio
                        </div>
                        <div style={{ fontWeight: '600', color: '#1f2937' }}>
                          R$ {parseFloat(selectedEmpreendimento.valorCondominio).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    )}
                    {selectedEmpreendimento.valorIptu && (
                      <div style={{
                        padding: '1rem',
                        backgroundColor: '#f9fafb',
                        borderRadius: '8px'
                      }}>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                          IPTU
                        </div>
                        <div style={{ fontWeight: '600', color: '#1f2937' }}>
                          R$ {parseFloat(selectedEmpreendimento.valorIptu).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedEmpreendimento.dataUltimaAtualizacao && (
                    <div style={{
                      fontSize: '0.875rem',
                      color: '#6b7280',
                      fontStyle: 'italic',
                      textAlign: 'center'
                    }}>
                      Última atualização: {new Date(selectedEmpreendimento.dataUltimaAtualizacao).toLocaleString('pt-BR')}
                    </div>
                  )}
                </div>
              )}

              {/* Aba: Diferenciais */}
              {activeTab === 'diferenciais' && (
                <div>
                  {selectedEmpreendimento.diferenciaisGerais ? (
                    <div>
                      <h3 style={{
                        fontSize: '1.125rem',
                        fontWeight: '600',
                        marginBottom: '1rem',
                        color: '#1f2937'
                      }}>
                        Diferenciais do Empreendimento
                      </h3>
                      <div style={{
                        padding: '1.5rem',
                        backgroundColor: '#f9fafb',
                        borderRadius: '8px',
                        lineHeight: '1.8',
                        color: '#374151',
                        whiteSpace: 'pre-line'
                      }}>
                        {selectedEmpreendimento.diferenciaisGerais}
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      textAlign: 'center',
                      padding: '3rem 1rem',
                      color: '#9ca3af'
                    }}>
                      <p style={{ fontSize: '1rem', margin: 0 }}>
                        Diferenciais não informados para este empreendimento
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
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox para foto completa - suporta galeria */}
      {showImageLightbox && selectedEmpreendimento && (() => {
        const images = selectedEmpreendimento.galeriaImagens && selectedEmpreendimento.galeriaImagens.length > 0
          ? selectedEmpreendimento.galeriaImagens
          : (selectedEmpreendimento.imagem ? [selectedEmpreendimento.imagem] : []);
        const currentIndex = lightboxImageIndex >= 0 && lightboxImageIndex < images.length ? lightboxImageIndex : 0;
        const currentImage = images[currentIndex];
        
        return currentImage && (
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

          {/* Botões de navegação (se houver múltiplas imagens) */}
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const newIndex = (lightboxImageIndex - 1 + images.length) % images.length;
                  setLightboxImageIndex(newIndex);
                }}
                style={{
                  position: 'absolute',
                  left: '2rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
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
                  zIndex: 2001
                }}
              >
                ‹
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const newIndex = (lightboxImageIndex + 1) % images.length;
                  setLightboxImageIndex(newIndex);
                }}
                style={{
                  position: 'absolute',
                  right: '2rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
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
                  zIndex: 2001
                }}
              >
                ›
              </button>
            </>
          )}

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
              src={currentImage}
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

          {/* Nome do empreendimento e contador no rodapé */}
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
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
              textAlign: 'center'
            }}
          >
            {selectedEmpreendimento.nome}
            {images.length > 1 && (
              <div style={{ fontSize: '0.875rem', fontWeight: '400', marginTop: '0.25rem', color: '#6b7280' }}>
                {(currentIndex >= 0 ? currentIndex : 0) + 1} / {images.length}
              </div>
            )}
          </div>
        </div>
        );
      })()}
    </div>
  );
};

export default Empreendimentos;
