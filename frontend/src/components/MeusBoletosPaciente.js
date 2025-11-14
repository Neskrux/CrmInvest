import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';

const MeusBoletosPaciente = () => {
  const { user, makeRequest, pacienteId } = useAuth();
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [boletos, setBoletos] = useState([]);

  useEffect(() => {
    fetchBoletos();
  }, []);

  const fetchBoletos = async () => {
    try {
      setLoading(true);
      const response = await makeRequest('/paciente/boletos', {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar boletos');
      }

      const data = await response.json();
      setBoletos(data.boletos || []);
    } catch (error) {
      console.error('Erro ao buscar boletos:', error);
      showErrorToast('Erro ao carregar boletos');
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

  const formatarValor = (valor) => {
    if (!valor) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pago':
        return { bg: '#d1fae5', color: '#065f46' };
      case 'pendente':
        return { bg: '#fef3c7', color: '#92400e' };
      case 'vencido':
        return { bg: '#fee2e2', color: '#991b1b' };
      default:
        return { bg: '#f3f4f6', color: '#374151' };
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
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#1a1d23', margin: 0 }}>
          Meus Boletos
        </h1>
      </div>

      {/* Resumo de boletos */}
      {boletos.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e5e7eb'
          }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>
              Total de Boletos
            </h3>
            <p style={{ fontSize: '2rem', fontWeight: '700', color: '#1a1d23', margin: 0 }}>
              {boletos.length}
            </p>
          </div>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e5e7eb'
          }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>
              Pendentes
            </h3>
            <p style={{ fontSize: '2rem', fontWeight: '700', color: '#92400e', margin: 0 }}>
              {boletos.filter(b => b.status === 'pendente').length}
            </p>
          </div>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e5e7eb'
          }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>
              Vencidos
            </h3>
            <p style={{ fontSize: '2rem', fontWeight: '700', color: '#991b1b', margin: 0 }}>
              {boletos.filter(b => b.status === 'vencido').length}
            </p>
          </div>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e5e7eb'
          }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>
              Pagos
            </h3>
            <p style={{ fontSize: '2rem', fontWeight: '700', color: '#065f46', margin: 0 }}>
              {boletos.filter(b => b.status === 'pago').length}
            </p>
          </div>
        </div>
      )}

      {boletos.length === 0 ? (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '3rem',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <p style={{ color: '#6b7280', fontSize: '1rem' }}>
            Você ainda não possui boletos cadastrados.
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gap: '1rem'
        }}>
          {boletos.map((boleto) => {
            const statusColors = getStatusColor(boleto.status);
            return (
              <div
                key={boleto.id}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  padding: '1.5rem',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  border: '1px solid #e5e7eb'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '1rem'
                }}>
                  <div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1a1d23', margin: 0 }}>
                      Boleto {boleto.numero_documento || boleto.id}
                    </h3>
                    <p style={{ margin: '0.25rem 0 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
                      Vencimento: {formatarData(boleto.data_vencimento)}
                    </p>
                    {boleto.data_emissao && (
                      <p style={{ margin: '0.25rem 0 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
                        Emissão: {formatarData(boleto.data_emissao)}
                      </p>
                    )}
                  </div>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    backgroundColor: statusColors.bg,
                    color: statusColors.color
                  }}>
                    {boleto.status === 'pago' ? 'Pago' : 
                     boleto.status === 'pendente' ? 'Pendente' : 
                     boleto.status === 'vencido' ? 'Vencido' : boleto.status}
                  </span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}>
                  <div>
                    <p style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1a1d23', margin: 0 }}>
                      {formatarValor(boleto.valor)}
                    </p>
                    {boleto.valor_pago && boleto.status === 'pago' && (
                      <p style={{ margin: '0.25rem 0 0 0', color: '#065f46', fontSize: '0.875rem', fontWeight: '600' }}>
                        Valor pago: {formatarValor(boleto.valor_pago)}
                      </p>
                    )}
                  </div>
                  <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    flexWrap: 'wrap'
                  }}>
                    {/* Botão para ver boleto usando url_boleto ou url */}
                    {(boleto.url_boleto || boleto.url) ? (
                      <button
                        onClick={() => {
                          // Abrir URL do boleto oficial diretamente em nova aba
                          const urlBoleto = boleto.url_boleto || boleto.url;
                          window.open(urlBoleto, '_blank', 'noopener,noreferrer');
                        }}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#1a1d23',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = '#374151';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = '#1a1d23';
                        }}
                      >
                        Ver Boleto
                      </button>
                    ) : boleto.fechamento_id && boleto.id ? (
                      <button
                        onClick={async () => {
                          try {
                            // Fazer requisição autenticada para obter o HTML do boleto (fallback)
                            const response = await makeRequest(`/fechamentos/${boleto.fechamento_id}/boletos/${boleto.id}/visualizar`, {
                              method: 'GET'
                            });
                            
                            if (!response.ok) {
                              throw new Error('Erro ao carregar boleto');
                            }
                            
                            // Obter o HTML da resposta
                            const html = await response.text();
                            
                            // Criar uma nova janela e escrever o HTML nela
                            const newWindow = window.open('', '_blank');
                            if (newWindow) {
                              newWindow.document.write(html);
                              newWindow.document.close();
                            }
                          } catch (error) {
                            console.error('Erro ao abrir boleto:', error);
                            showErrorToast('Erro ao abrir boleto. Verifique se você tem permissão.');
                          }
                        }}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#1a1d23',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = '#374151';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = '#1a1d23';
                        }}
                      >
                        Ver Boleto
                      </button>
                    ) : null}
                    {boleto.linha_digitavel && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(boleto.linha_digitavel);
                          showSuccessToast('Linha digitável copiada!');
                        }}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: 'white',
                          color: '#1a1d23',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = '#f9fafb';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = 'white';
                        }}
                      >
                        Copiar Linha Digitável
                      </button>
                    )}
                  </div>
                </div>
                {boleto.situacao && (
                  <p style={{ margin: '1rem 0 0 0', color: '#6b7280', fontSize: '0.75rem' }}>
                    Situação: {boleto.situacao}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MeusBoletosPaciente;

