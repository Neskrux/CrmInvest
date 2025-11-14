import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import { 
  FileText,
  Check,
  X,
  Clock,
  DollarSign,
  Users,
  Calendar,
  Eye,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Filter,
  Search
} from 'lucide-react';

const SolicitacoesCobrancaAdmin = () => {
  const { makeRequest, user } = useAuth();
  const { showSuccessToast, showErrorToast } = useToast();
  
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('todas'); // todas, pendentes, aprovadas, rejeitadas
  const [searchTerm, setSearchTerm] = useState('');
  const [solicitacaoDetalhada, setSolicitacaoDetalhada] = useState(null);
  const [showDetalhesModal, setShowDetalhesModal] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [motivoRejeicao, setMotivoRejeicao] = useState('');

  useEffect(() => {
    carregarSolicitacoes();
  }, []);

  const carregarSolicitacoes = async () => {
    setLoading(true);
    try {
      const response = await makeRequest('/solicitacoes-cobranca');
      console.log('📋 Resposta da API:', response.status, response.statusText);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Dados recebidos:', data);
        console.log('📊 Quantidade de solicitações:', data?.length || 0);
        setSolicitacoes(data || []);
      } else {
        const errorText = await response.text();
        console.error('❌ Erro ao carregar solicitações:', response.status, errorText);
        showErrorToast(`Erro ao carregar solicitações: ${response.status}`);
        setSolicitacoes([]);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar solicitações:', error);
      showErrorToast('Erro ao carregar solicitações');
      setSolicitacoes([]);
    }
    setLoading(false);
  };

  const carregarDetalhes = async (id) => {
    try {
      const response = await makeRequest(`/solicitacoes-cobranca/${id}`);
      if (response.ok) {
        const data = await response.json();
        setSolicitacaoDetalhada(data);
        setShowDetalhesModal(true);
      }
    } catch (error) {
      console.error('Erro ao carregar detalhes:', error);
      showErrorToast('Erro ao carregar detalhes da solicitação');
    }
  };

  const aprovarSolicitacao = async (id) => {
    setProcessando(true);
    try {
      const response = await makeRequest(`/solicitacoes-cobranca/${id}/aprovar`, {
        method: 'PUT'
      });
      
      if (response.ok) {
        showSuccessToast('Solicitação aprovada com sucesso!');
        setShowDetalhesModal(false);
        carregarSolicitacoes();
      } else {
        showErrorToast('Erro ao aprovar solicitação');
      }
    } catch (error) {
      console.error('Erro ao aprovar solicitação:', error);
      showErrorToast('Erro ao aprovar solicitação');
    }
    setProcessando(false);
  };

  const rejeitarSolicitacao = async (id) => {
    if (!motivoRejeicao.trim()) {
      showErrorToast('Por favor, informe o motivo da rejeição');
      return;
    }

    setProcessando(true);
    try {
      const response = await makeRequest(`/solicitacoes-cobranca/${id}/rejeitar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo: motivoRejeicao })
      });
      
      if (response.ok) {
        showSuccessToast('Solicitação rejeitada');
        setShowDetalhesModal(false);
        setMotivoRejeicao('');
        carregarSolicitacoes();
      } else {
        showErrorToast('Erro ao rejeitar solicitação');
      }
    } catch (error) {
      console.error('Erro ao rejeitar solicitação:', error);
      showErrorToast('Erro ao rejeitar solicitação');
    }
    setProcessando(false);
  };

  const solicitacoesFiltradas = solicitacoes.filter(sol => {
    const matchFiltro = filtro === 'todas' || sol.status === filtro;
    const matchSearch = !searchTerm || 
      sol.clinicas?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sol.usuarios?.nome?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Debug
    if (!matchFiltro) {
      console.log(`🔍 Solicitação ${sol.id} não passou no filtro: status=${sol.status}, filtro=${filtro}`);
    }
    
    return matchFiltro && matchSearch;
  });
  
  console.log('🔍 Filtros aplicados:', { filtro, searchTerm });
  console.log('📊 Total de solicitações:', solicitacoes.length);
  console.log('✅ Solicitações filtradas:', solicitacoesFiltradas.length);

  const getStatusBadge = (status) => {
    const styles = {
      pendente: { bg: '#fef3c7', color: '#92400e', icon: Clock },
      aprovado: { bg: '#dcfce7', color: '#166534', icon: CheckCircle },
      rejeitado: { bg: '#fee2e2', color: '#991b1b', icon: XCircle },
      processado: { bg: '#dbeafe', color: '#1e40af', icon: Check }
    };

    const style = styles[status] || styles.pendente;
    const Icon = style.icon;

    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        padding: '0.25rem 0.75rem',
        borderRadius: '12px',
        backgroundColor: style.bg,
        color: style.color,
        fontSize: '0.75rem',
        fontWeight: '600'
      }}>
        <Icon size={14} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </div>
    );
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL'
    }).format(value || 0);
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div style={{ padding: '2rem', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ 
          fontSize: '2rem', 
          fontWeight: '800', 
          color: '#1e293b',
          marginBottom: '0.5rem',
          letterSpacing: '-0.025em'
        }}>
          Solicitações de Cobrança
        </h1>
        <p style={{ color: '#64748b', fontSize: '1rem' }}>
          Gerencie as solicitações de serviços adicionais de cobrança
        </p>
      </div>

      {/* Filtros */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '1.5rem',
        marginBottom: '2rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Filtro por Status */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {['todas', 'pendente', 'aprovado', 'rejeitado'].map(status => (
              <button
                key={status}
                onClick={() => setFiltro(status)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: filtro === status ? '#6366f1' : '#f3f4f6',
                  color: filtro === status ? 'white' : '#6b7280',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {status === 'todas' ? 'Todas' : status.charAt(0).toUpperCase() + status.slice(1) + 's'}
              </button>
            ))}
          </div>

          {/* Busca */}
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={18} style={{ 
              position: 'absolute', 
              left: '12px', 
              top: '50%', 
              transform: 'translateY(-50%)',
              color: '#64748b'
            }} />
            <input
              type="text"
              placeholder="Buscar por clínica ou solicitante..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.5rem 0.5rem 2.5rem',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                fontSize: '0.875rem'
              }}
            />
          </div>
        </div>
      </div>

      {/* Lista de Solicitações */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
          Carregando solicitações...
        </div>
      ) : solicitacoesFiltradas.length === 0 ? (
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '4rem',
          textAlign: 'center',
          color: '#64748b'
        }}>
          <FileText size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <p>Nenhuma solicitação encontrada</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {solicitacoesFiltradas.map(solicitacao => (
            <div
              key={solicitacao.id}
              style={{
                background: 'white',
                borderRadius: '16px',
                padding: '1.5rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                transition: 'all 0.2s',
                cursor: 'pointer'
              }}
              onClick={() => carregarDetalhes(solicitacao.id)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                      {solicitacao.clinicas?.nome || 'Clínica'}
                    </h3>
                    {getStatusBadge(solicitacao.status)}
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Users size={16} color="#64748b" />
                      <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
                        {solicitacao.quantidade_pacientes} paciente(s)
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <DollarSign size={16} color="#64748b" />
                      <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
                        {formatCurrency(solicitacao.valor_total)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Calendar size={16} color="#64748b" />
                      <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
                        {formatDate(solicitacao.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Eye size={20} color="#6366f1" />
                  <span style={{ fontSize: '0.875rem', color: '#6366f1', fontWeight: '600' }}>
                    Ver detalhes
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Detalhes */}
      {showDetalhesModal && solicitacaoDetalhada && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(5px)'
        }}
        onClick={() => setShowDetalhesModal(false)}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '2rem',
            maxWidth: '800px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}
          onClick={(e) => e.stopPropagation()}>
            {/* Header do Modal */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '2rem',
              paddingBottom: '1rem',
              borderBottom: '2px solid #e5e7eb'
            }}>
              <div>
                <h2 style={{
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  color: '#1e293b',
                  margin: 0,
                  marginBottom: '0.5rem'
                }}>
                  Solicitação #{solicitacaoDetalhada.id}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontSize: '1rem', color: '#64748b' }}>
                    {solicitacaoDetalhada.clinicas?.nome}
                  </span>
                  {getStatusBadge(solicitacaoDetalhada.status)}
                </div>
              </div>
              <button
                onClick={() => setShowDetalhesModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  borderRadius: '8px'
                }}
              >
                <X size={24} color="#6b7280" />
              </button>
            </div>

            {/* Informações Gerais */}
            <div style={{
              background: '#f8fafc',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '2rem'
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', marginBottom: '1rem' }}>
                Informações Gerais
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Solicitante:</span>
                  <p style={{ margin: '0.25rem 0 0 0', fontWeight: '600', color: '#1e293b' }}>
                    {solicitacaoDetalhada.usuarios?.nome}
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Data da Solicitação:</span>
                  <p style={{ margin: '0.25rem 0 0 0', fontWeight: '600', color: '#1e293b' }}>
                    {formatDate(solicitacaoDetalhada.created_at)}
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Quantidade de Pacientes:</span>
                  <p style={{ margin: '0.25rem 0 0 0', fontWeight: '600', color: '#1e293b' }}>
                    {solicitacaoDetalhada.quantidade_pacientes}
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Valor por Paciente:</span>
                  <p style={{ margin: '0.25rem 0 0 0', fontWeight: '600', color: '#1e293b' }}>
                    {formatCurrency(solicitacaoDetalhada.valor_por_paciente)}
                  </p>
                </div>
              </div>
            </div>

            {/* Serviços Solicitados */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', marginBottom: '1rem' }}>
                Serviços Solicitados
              </h3>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {solicitacaoDetalhada.solicitacao_cobranca_itens?.map((item, index) => (
                  <div key={index} style={{
                    padding: '1rem',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontWeight: '600', color: '#1e293b' }}>
                        {item.nome_servico}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                        {item.quantidade > 1 && `${item.quantidade}x `}
                        {formatCurrency(item.valor_unitario)}
                        {item.tipo_cobranca === 'unitario' && ' por unidade'}
                      </div>
                    </div>
                    <div style={{ fontWeight: '700', color: '#1e293b' }}>
                      {formatCurrency(item.valor_total)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pacientes */}
            {solicitacaoDetalhada.solicitacao_cobranca_pacientes && (
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', marginBottom: '1rem' }}>
                  Pacientes ({solicitacaoDetalhada.solicitacao_cobranca_pacientes.length})
                </h3>
                <div style={{ 
                  maxHeight: '200px', 
                  overflowY: 'auto',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  padding: '1rem'
                }}>
                  {solicitacaoDetalhada.solicitacao_cobranca_pacientes.map((paciente, index) => (
                    <div key={index} style={{
                      padding: '0.5rem 0',
                      borderBottom: index < solicitacaoDetalhada.solicitacao_cobranca_pacientes.length - 1 ? '1px solid #e5e7eb' : 'none'
                    }}>
                      <span style={{ fontWeight: '600', color: '#1e293b' }}>
                        {paciente.pacientes?.nome}
                      </span>
                      {paciente.pacientes?.cpf && (
                        <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '0.5rem' }}>
                          CPF: {paciente.pacientes.cpf}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Total */}
            <div style={{
              padding: '1.5rem',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              borderRadius: '12px',
              color: 'white',
              marginBottom: '2rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '1.125rem', fontWeight: '600' }}>Valor Total:</span>
                <span style={{ fontSize: '2rem', fontWeight: '800' }}>
                  {formatCurrency(solicitacaoDetalhada.valor_total)}
                </span>
              </div>
            </div>

            {/* Ações */}
            {solicitacaoDetalhada.status === 'pendente' && (
              <>
                {/* Campo de Motivo de Rejeição */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
                    Motivo da Rejeição (opcional para aprovar):
                  </label>
                  <textarea
                    value={motivoRejeicao}
                    onChange={(e) => setMotivoRejeicao(e.target.value)}
                    placeholder="Informe o motivo caso vá rejeitar a solicitação..."
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      fontSize: '0.875rem',
                      minHeight: '80px',
                      resize: 'vertical'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button
                    onClick={() => aprovarSolicitacao(solicitacaoDetalhada.id)}
                    disabled={processando}
                    style={{
                      flex: 1,
                      padding: '0.875rem',
                      background: processando ? '#94a3b8' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '1rem',
                      fontWeight: '700',
                      cursor: processando ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <Check size={20} />
                    {processando ? 'Processando...' : 'Aprovar Solicitação'}
                  </button>
                  
                  <button
                    onClick={() => rejeitarSolicitacao(solicitacaoDetalhada.id)}
                    disabled={processando}
                    style={{
                      flex: 1,
                      padding: '0.875rem',
                      background: processando ? '#94a3b8' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '1rem',
                      fontWeight: '700',
                      cursor: processando ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <X size={20} />
                    {processando ? 'Processando...' : 'Rejeitar Solicitação'}
                  </button>
                </div>
              </>
            )}

            {/* Status já processado */}
            {solicitacaoDetalhada.status !== 'pendente' && (
              <div style={{
                padding: '1rem',
                background: solicitacaoDetalhada.status === 'aprovado' ? '#dcfce7' : '#fee2e2',
                borderRadius: '8px',
                border: `1px solid ${solicitacaoDetalhada.status === 'aprovado' ? '#86efac' : '#fecaca'}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {solicitacaoDetalhada.status === 'aprovado' ? (
                    <CheckCircle size={20} color="#16a34a" />
                  ) : (
                    <XCircle size={20} color="#dc2626" />
                  )}
                  <span style={{ 
                    fontWeight: '600', 
                    color: solicitacaoDetalhada.status === 'aprovado' ? '#16a34a' : '#dc2626' 
                  }}>
                    Solicitação {solicitacaoDetalhada.status === 'aprovado' ? 'Aprovada' : 'Rejeitada'}
                  </span>
                </div>
                {solicitacaoDetalhada.data_aprovacao && (
                  <p style={{ margin: '0.5rem 0 0 1.75rem', fontSize: '0.875rem', color: '#64748b' }}>
                    Em {formatDate(solicitacaoDetalhada.data_aprovacao)}
                  </p>
                )}
                {solicitacaoDetalhada.motivo_rejeicao && (
                  <p style={{ margin: '0.5rem 0 0 1.75rem', fontSize: '0.875rem', color: '#64748b' }}>
                    Motivo: {solicitacaoDetalhada.motivo_rejeicao}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SolicitacoesCobrancaAdmin;
