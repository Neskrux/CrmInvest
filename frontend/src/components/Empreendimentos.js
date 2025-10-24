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

  // Função para buscar empreendimentos do banco
  const fetchEmpreendimentos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Buscando empreendimentos do banco...');
      const config = await import('../config');
      const response = await fetch(`${config.default.API_BASE_URL}/empreendimentos-public`);
      
      if (!response.ok) {
        throw new Error('Erro ao carregar empreendimentos');
      }
      
      const data = await response.json();
      console.log('📊 Empreendimentos carregados do banco:', data);
      
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
           id: emp.id, // ✅ ID real do banco
           nome: emp.nome,
           descricao: emp.observacoes || '',
           localizacao: `${emp.cidade} - ${emp.estado}`,
           endereco: emp.endereco || '',
           bairro: emp.bairro || '',
           tipo: emp.tipo || 'Residencial', // ✅ Dados reais do banco
           unidades: emp.unidades || 0, // ✅ Dados reais do banco
           status: emp.status === 'ativo' ? 'Em construção' : 'Lançamento',
           imagem: imagemPath, // ✅ Imagem local baseada no ID
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

  // Função para visualizar detalhes (associada ao ID real)
  const handleCardClick = (empreendimento) => {
    console.log('🔍 Visualizando empreendimento ID:', empreendimento.id, 'Nome:', empreendimento.nome);
    setSelectedEmpreendimento(empreendimento);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedEmpreendimento(null);
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

                {/* ID do empreendimento (para debug) */}
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: '500'
                }}>
                  ID: {empreendimento.id}
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
                <p style={{
                  margin: '0.25rem 0 0 0',
                  fontSize: '0.875rem',
                  color: '#6b7280'
                }}>
                  ID: {selectedEmpreendimento.id}
                </p>
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

            {/* Conteúdo do Modal */}
            <div style={{ padding: '1.5rem' }}>
              {/* Imagem */}
              {selectedEmpreendimento.imagem && (
                <div style={{
                  height: '250px',
                  backgroundImage: `url(${selectedEmpreendimento.imagem})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  borderRadius: '8px',
                  marginBottom: '1.5rem',
                  backgroundColor: '#f3f4f6'
                }} />
              )}

              {/* Informações Básicas */}
              <div style={{ marginBottom: '1.5rem' }}>
                 <div style={{
                   display: 'grid',
                   gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                   gap: '1rem',
                   marginBottom: '1rem'
                 }}>
                   <div>
                     <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                       Localização
                     </div>
                     <div style={{ fontWeight: '500' }}>
                       {selectedEmpreendimento.localizacao || 'Não informado'}
                     </div>
                   </div>
                   <div>
                     <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                       Tipo
                     </div>
                     <div style={{ fontWeight: '500' }}>
                       {selectedEmpreendimento.tipo || 'Não informado'}
                     </div>
                   </div>
                   <div>
                     <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                       Unidades
                     </div>
                     <div style={{ fontWeight: '500' }}>
                       {selectedEmpreendimento.unidades || 0}
                     </div>
                   </div>
                   {/* Removido: seção de preço */}
                 </div>

                {/* Removido: seção de construtora e entrega */}
              </div>

              {/* Descrição */}
              {selectedEmpreendimento.descricao && (
                <div style={{ marginBottom: '1.5rem' }}>
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
                    margin: 0
                  }}>
                    {selectedEmpreendimento.descricao}
                  </p>
                </div>
              )}

               {/* Removido: seção de características */}
            </div>

            {/* Footer do Modal */}
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                ID: {selectedEmpreendimento.id}
              </div>
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
    </div>
  );
};

export default Empreendimentos;
