import React, { useState } from 'react';
import useBranding from '../hooks/useBranding';

const Empreendimentos = () => {
  const { t } = useBranding();
  const [selectedEmpreendimento, setSelectedEmpreendimento] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Dados dos empreendimentos (em produção viria de uma API)
  const empreendimentos = [
    {
      id: 1,
      nome: 'Residencial Jardim das Flores',
      imagem: '/images/empreendimentos/empreendimento1.jpg',
      localizacao: 'São Paulo - SP',
      tipo: 'Residencial',
      unidades: 120,
      status: 'Em construção',
      preco: 'R$ 350.000',
      descricao: 'Apartamentos de 2 e 3 quartos com excelente localização e infraestrutura completa.',
      caracteristicas: ['Piscina', 'Academia', 'Salão de festas', 'Playground', 'Portaria 24h'],
      construtora: 'Construtora ABC',
      entrega: 'Dezembro 2024'
    },
    {
      id: 2,
      nome: 'Condomínio Vista Mar',
      imagem: '/images/empreendimentos/empreendimento2.jpg',
      localizacao: 'Santos - SP',
      tipo: 'Residencial',
      unidades: 80,
      status: 'Lançamento',
      preco: 'R$ 420.000',
      descricao: 'Apartamentos com vista para o mar, localizados na orla de Santos.',
      caracteristicas: ['Vista para o mar', 'Piscina', 'Academia', 'Salão de festas', 'Garagem'],
      construtora: 'Construtora XYZ',
      entrega: 'Março 2025'
    },
    {
      id: 3,
      nome: 'Torre Executiva Business',
      imagem: '/images/empreendimentos/empreendimento3.jpg',
      localizacao: 'São Paulo - SP',
      tipo: 'Comercial',
      unidades: 50,
      status: 'Pronto para morar',
      preco: 'R$ 280.000',
      descricao: 'Salas comerciais no centro financeiro de São Paulo.',
      caracteristicas: ['Ar condicionado', 'Elevador', 'Segurança 24h', 'Estacionamento', 'Wi-Fi'],
      construtora: 'Construtora Business',
      entrega: 'Pronto'
    },
    {
      id: 4,
      nome: 'Residencial Parque Verde',
      imagem: '/images/empreendimentos/empreendimento4.jpg',
      localizacao: 'Campinas - SP',
      tipo: 'Residencial',
      unidades: 200,
      status: 'Em construção',
      preco: 'R$ 290.000',
      descricao: 'Condomínio fechado com muito verde e área de lazer completa.',
      caracteristicas: ['Área verde', 'Piscina', 'Quadra', 'Playground', 'Salão de festas'],
      construtora: 'Construtora Verde',
      entrega: 'Junho 2025'
    },
    {
      id: 5,
      nome: 'Edifício Premium Center',
      imagem: '/images/empreendimentos/empreendimento5.jpg',
      localizacao: 'São Paulo - SP',
      tipo: 'Comercial',
      unidades: 30,
      status: 'Lançamento',
      preco: 'R$ 450.000',
      descricao: 'Edifício comercial de alto padrão no centro da cidade.',
      caracteristicas: ['Alto padrão', 'Ar condicionado', 'Elevador', 'Segurança', 'Estacionamento'],
      construtora: 'Construtora Premium',
      entrega: 'Dezembro 2025'
    },
    {
      id: 6,
      nome: 'Residencial Família Feliz',
      imagem: '/images/empreendimentos/empreendimento6.jpg',
      localizacao: 'Guarulhos - SP',
      tipo: 'Residencial',
      unidades: 150,
      status: 'Em construção',
      preco: 'R$ 320.000',
      descricao: 'Apartamentos ideais para famílias com excelente custo-benefício.',
      caracteristicas: ['Familiar', 'Piscina', 'Playground', 'Salão de festas', 'Portaria'],
      construtora: 'Construtora Família',
      entrega: 'Setembro 2024'
    }
  ];

  const handleCardClick = (empreendimento) => {
    setSelectedEmpreendimento(empreendimento);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedEmpreendimento(null);
  };

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
              key={empreendimento.id}
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
                backgroundImage: `url(${empreendimento.imagem})`,
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
                  backgroundColor: empreendimento.status === 'Pronto para morar' ? '#10b981' : 
                                  empreendimento.status === 'Em construção' ? '#f59e0b' : '#3b82f6',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: '600'
                }}>
                  {empreendimento.status}
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
                  {empreendimento.nome}
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
                  {empreendimento.localizacao}
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem'
                }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                      {empreendimento.tipo} • {empreendimento.unidades} unidades
                    </div>
                    <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#059669' }}>
                      {empreendimento.preco}
                    </div>
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
              <h2 style={{
                margin: 0,
                fontSize: '1.5rem',
                fontWeight: '600',
                color: '#1f2937'
              }}>
                {selectedEmpreendimento.nome}
              </h2>
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
              <div style={{
                height: '250px',
                backgroundImage: `url(${selectedEmpreendimento.imagem})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                backgroundColor: '#f3f4f6'
              }} />

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
                    <div style={{ fontWeight: '500' }}>{selectedEmpreendimento.localizacao}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                      Tipo
                    </div>
                    <div style={{ fontWeight: '500' }}>{selectedEmpreendimento.tipo}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                      Unidades
                    </div>
                    <div style={{ fontWeight: '500' }}>{selectedEmpreendimento.unidades}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                      Preço
                    </div>
                    <div style={{ fontWeight: '500', color: '#059669' }}>{selectedEmpreendimento.preco}</div>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  gap: '1rem',
                  marginBottom: '1rem'
                }}>
                  <div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                      Construtora
                    </div>
                    <div style={{ fontWeight: '500' }}>{selectedEmpreendimento.construtora}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                      Previsão de Entrega
                    </div>
                    <div style={{ fontWeight: '500' }}>{selectedEmpreendimento.entrega}</div>
                  </div>
                </div>
              </div>

              {/* Descrição */}
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

              {/* Características */}
              <div>
                <h3 style={{
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  marginBottom: '0.75rem',
                  color: '#1f2937'
                }}>
                  Características
                </h3>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.5rem'
                }}>
                  {selectedEmpreendimento.caracteristicas.map((caracteristica, index) => (
                    <span
                      key={index}
                      style={{
                        backgroundColor: '#eff6ff',
                        color: '#1e40af',
                        padding: '0.375rem 0.75rem',
                        borderRadius: '20px',
                        fontSize: '0.875rem',
                        fontWeight: '500'
                      }}
                    >
                      {caracteristica}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer do Modal */}
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'flex-end'
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
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#f9fafb';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'white';
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
