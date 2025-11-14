import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import { 
  Search, 
  Users, 
  DollarSign, 
  Check, 
  X, 
  AlertCircle,
  Calculator,
  FileText,
  Send,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Mail,
  FileX,
  FileWarning,
  Clock,
  Edit,
  Download,
  Shield,
  Gavel
} from 'lucide-react';

const CobrancaClinica = () => {
  const { makeRequest, user } = useAuth();
  const { showSuccessToast, showErrorToast } = useToast();
  
  const [pacientes, setPacientes] = useState([]);
  const [pacientesFiltrados, setPacientesFiltrados] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [pacientesSelecionados, setPacientesSelecionados] = useState([]);
  const [servicos, setServicos] = useState({
    whatsapp: { 
      ativo: false, 
      quantidade: 1, 
      nome: 'Notificação WhatsApp', 
      valor: 0.49, 
      tipo: 'unitario',
      icon: MessageSquare,
      color: '#25D366'
    },
    exclusaoNegativacao: { 
      ativo: false, 
      nome: 'Exclusão Negativação', 
      valor: 12.99, 
      tipo: 'fixo',
      icon: FileX,
      color: '#ef4444'
    },
    negativacao: { 
      ativo: false, 
      nome: 'Negativação', 
      valor: 11.99, 
      tipo: 'fixo',
      icon: FileWarning,
      color: '#f59e0b'
    },
    manutencaoVencidos: { 
      ativo: false, 
      nome: 'Manutenção Vencidos', 
      valor: 1.99, 
      tipo: 'fixo',
      icon: Clock,
      color: '#8b5cf6'
    },
    notificacaoCarta: { 
      ativo: false, 
      nome: 'Notificação por Carta', 
      valor: 2.91, 
      tipo: 'fixo',
      icon: FileText,
      color: '#3b82f6'
    },
    emailSms: { 
      ativo: false, 
      nome: 'E-mail e SMS', 
      valor: 0.99, 
      tipo: 'fixo',
      icon: Mail,
      color: '#10b981'
    },
    taxaBaixa: { 
      ativo: false, 
      nome: 'Taxa de Baixa', 
      valor: 3.99, 
      tipo: 'fixo',
      icon: Download,
      color: '#6366f1'
    },
    taxaAlteracao: { 
      ativo: false, 
      nome: 'Taxa de Alteração', 
      valor: 4.99, 
      tipo: 'fixo',
      icon: Edit,
      color: '#ec4899'
    },
    taxaProtesto: { 
      ativo: false, 
      nome: 'Taxa de Protesto (1%)', 
      valor: 9.90, 
      tipo: 'percentual',
      percentual: 1,
      icon: Gavel,
      color: '#dc2626'
    },
    taxaAnuencia: { 
      ativo: false, 
      nome: 'Taxa de Anuência (1%)', 
      valor: 9.90, 
      tipo: 'percentual',
      percentual: 1,
      icon: Shield,
      color: '#059669'
    }
  });
  
  const [loading, setLoading] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [expandedPaciente, setExpandedPaciente] = useState(null);

  useEffect(() => {
    carregarPacientes();
  }, []);

  useEffect(() => {
    const filtered = pacientes.filter(paciente => 
      paciente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      paciente.cpf?.includes(searchTerm) ||
      paciente.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setPacientesFiltrados(filtered);
  }, [searchTerm, pacientes]);

  const carregarPacientes = async () => {
    setLoading(true);
    try {
      const response = await makeRequest('/pacientes');
      if (response.ok) {
        const data = await response.json();
        setPacientes(data);
        setPacientesFiltrados(data);
      }
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error);
      showErrorToast('Erro ao carregar pacientes');
    }
    setLoading(false);
  };

  const togglePaciente = (paciente) => {
    setPacientesSelecionados(prev => {
      const exists = prev.find(p => p.id === paciente.id);
      if (exists) {
        return prev.filter(p => p.id !== paciente.id);
      }
      return [...prev, paciente];
    });
  };

  const toggleServico = (key) => {
    setServicos(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        ativo: !prev[key].ativo
      }
    }));
  };

  const updateQuantidade = (key, quantidade) => {
    setServicos(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        quantidade: Math.max(1, quantidade)
      }
    }));
  };

  const calcularTotal = () => {
    let total = 0;
    const servicosAtivos = Object.entries(servicos).filter(([_, servico]) => servico.ativo);
    
    servicosAtivos.forEach(([key, servico]) => {
      if (servico.tipo === 'unitario') {
        total += servico.valor * (servico.quantidade || 1);
      } else if (servico.tipo === 'fixo') {
        total += servico.valor;
      } else if (servico.tipo === 'percentual') {
        // Para taxas percentuais, usar o valor mínimo
        total += servico.valor;
      }
    });
    
    return total * pacientesSelecionados.length;
  };

  const calcularTotalPorPaciente = () => {
    let total = 0;
    const servicosAtivos = Object.entries(servicos).filter(([_, servico]) => servico.ativo);
    
    servicosAtivos.forEach(([key, servico]) => {
      if (servico.tipo === 'unitario') {
        total += servico.valor * (servico.quantidade || 1);
      } else if (servico.tipo === 'fixo') {
        total += servico.valor;
      } else if (servico.tipo === 'percentual') {
        total += servico.valor;
      }
    });
    
    return total;
  };

  const enviarSolicitacao = async () => {
    if (pacientesSelecionados.length === 0) {
      showErrorToast('Selecione pelo menos um paciente');
      return;
    }

    const servicosAtivos = Object.entries(servicos)
      .filter(([_, servico]) => servico.ativo)
      .map(([key, servico]) => ({
        tipo: key,
        nome: servico.nome,
        valor: servico.valor,
        quantidade: servico.quantidade || 1,
        tipo_cobranca: servico.tipo
      }));

    if (servicosAtivos.length === 0) {
      showErrorToast('Selecione pelo menos um serviço');
      return;
    }

    setEnviando(true);
    try {
      const response = await makeRequest('/solicitacoes-cobranca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pacientes_ids: pacientesSelecionados.map(p => p.id),
          servicos: servicosAtivos,
          valor_total: calcularTotal(),
          valor_por_paciente: calcularTotalPorPaciente(),
          clinica_id: user.clinica_id
        })
      });

      if (response.ok) {
        showSuccessToast('Solicitação enviada para aprovação!');
        // Limpar seleções
        setPacientesSelecionados([]);
        setServicos(prev => {
          const newServicos = { ...prev };
          Object.keys(newServicos).forEach(key => {
            newServicos[key].ativo = false;
            if (newServicos[key].quantidade !== undefined) {
              newServicos[key].quantidade = 1;
            }
          });
          return newServicos;
        });
      } else {
        showErrorToast('Erro ao enviar solicitação');
      }
    } catch (error) {
      console.error('Erro ao enviar solicitação:', error);
      showErrorToast('Erro ao enviar solicitação');
    }
    setEnviando(false);
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
          Cobrança
        </h1>
        <p style={{ color: '#64748b', fontSize: '1rem' }}>
          Solicite serviços adicionais de cobrança para seus pacientes
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : '1fr 1fr', gap: '2rem' }}>
        {/* Painel de Seleção de Pacientes */}
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '1.5rem',
          boxShadow: '0 4px 6px rgba(0,0,0,0.07)'
        }}>
          <h2 style={{ 
            fontSize: '1.25rem', 
            fontWeight: '700', 
            color: '#1e293b',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Users size={20} />
            Selecionar Pacientes
          </h2>

          {/* Barra de Pesquisa */}
          <div style={{ position: 'relative', marginBottom: '1rem' }}>
            <Search size={20} style={{ 
              position: 'absolute', 
              left: '12px', 
              top: '50%', 
              transform: 'translateY(-50%)',
              color: '#64748b'
            }} />
            <input
              type="text"
              placeholder="Buscar por nome, CPF ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                fontSize: '0.875rem',
                transition: 'all 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#6366f1'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>

          {/* Badge de Selecionados */}
          {pacientesSelecionados.length > 0 && (
            <div style={{
              padding: '0.75rem',
              background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
              borderRadius: '12px',
              marginBottom: '1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '0.875rem', color: '#3b82f6', fontWeight: '600' }}>
                {pacientesSelecionados.length} paciente(s) selecionado(s)
              </span>
              <button
                onClick={() => setPacientesSelecionados([])}
                style={{
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.75rem',
                  background: 'white',
                  color: '#3b82f6',
                  border: '1px solid #3b82f6',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Limpar
              </button>
            </div>
          )}

          {/* Lista de Pacientes */}
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                Carregando pacientes...
              </div>
            ) : pacientesFiltrados.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                Nenhum paciente encontrado
              </div>
            ) : (
              pacientesFiltrados.map(paciente => {
                const isSelected = pacientesSelecionados.find(p => p.id === paciente.id);
                return (
                  <div
                    key={paciente.id}
                    onClick={() => togglePaciente(paciente)}
                    style={{
                      padding: '1rem',
                      marginBottom: '0.5rem',
                      borderRadius: '12px',
                      border: `2px solid ${isSelected ? '#6366f1' : '#e5e7eb'}`,
                      background: isSelected ? '#eff6ff' : 'white',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: '600', color: '#1e293b' }}>
                          {paciente.nome}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                          CPF: {paciente.cpf || 'Não informado'}
                        </div>
                      </div>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        border: `2px solid ${isSelected ? '#6366f1' : '#e5e7eb'}`,
                        background: isSelected ? '#6366f1' : 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {isSelected && <Check size={14} color="white" />}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Painel de Serviços */}
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '1.5rem',
          boxShadow: '0 4px 6px rgba(0,0,0,0.07)'
        }}>
          <h2 style={{ 
            fontSize: '1.25rem', 
            fontWeight: '700', 
            color: '#1e293b',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <DollarSign size={20} />
            Serviços de Cobrança
          </h2>

          {/* Lista de Serviços */}
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {Object.entries(servicos).map(([key, servico]) => {
              const Icon = servico.icon;
              return (
                <div
                  key={key}
                  style={{
                    padding: '1rem',
                    marginBottom: '0.75rem',
                    borderRadius: '12px',
                    border: `2px solid ${servico.ativo ? servico.color : '#e5e7eb'}`,
                    background: servico.ativo ? `${servico.color}10` : 'white',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: servico.ativo ? servico.color : '#f3f4f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Icon size={18} color={servico.ativo ? 'white' : '#9ca3af'} />
                      </div>
                      <div>
                        <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '0.875rem' }}>
                          {servico.nome}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.125rem' }}>
                          R$ {servico.valor.toFixed(2).replace('.', ',')}
                          {servico.tipo === 'unitario' && ' por mensagem'}
                          {servico.tipo === 'percentual' && ' (mínimo)'}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {servico.tipo === 'unitario' && servico.ativo && (
                        <input
                          type="number"
                          min="1"
                          value={servico.quantidade}
                          onChange={(e) => updateQuantidade(key, parseInt(e.target.value) || 1)}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            width: '60px',
                            padding: '0.25rem',
                            borderRadius: '6px',
                            border: '1px solid #e5e7eb',
                            fontSize: '0.875rem',
                            textAlign: 'center'
                          }}
                        />
                      )}
                      <button
                        onClick={() => toggleServico(key)}
                        style={{
                          padding: '0.5rem 1rem',
                          borderRadius: '8px',
                          border: 'none',
                          background: servico.ativo ? servico.color : '#f3f4f6',
                          color: servico.ativo ? 'white' : '#6b7280',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        {servico.ativo ? 'Ativo' : 'Ativar'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Resumo de Valores */}
          <div style={{
            marginTop: '1.5rem',
            padding: '1.5rem',
            background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
            borderRadius: '16px',
            color: 'white'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Calculator size={20} />
              <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>
                Resumo do Pedido
              </h3>
            </div>

            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>Pacientes selecionados:</span>
                <span style={{ fontSize: '1rem', fontWeight: '600' }}>{pacientesSelecionados.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>Valor por paciente:</span>
                <span style={{ fontSize: '1rem', fontWeight: '600' }}>
                  R$ {calcularTotalPorPaciente().toFixed(2).replace('.', ',')}
                </span>
              </div>
              <div style={{ 
                paddingTop: '0.75rem', 
                borderTop: '1px solid rgba(255,255,255,0.2)',
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center' 
              }}>
                <span style={{ fontSize: '1rem', fontWeight: '600' }}>Total:</span>
                <span style={{ fontSize: '1.5rem', fontWeight: '800' }}>
                  R$ {calcularTotal().toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>

            <button
              onClick={enviarSolicitacao}
              disabled={enviando || pacientesSelecionados.length === 0 || calcularTotal() === 0}
              style={{
                width: '100%',
                padding: '0.875rem',
                marginTop: '1.5rem',
                background: enviando || pacientesSelecionados.length === 0 || calcularTotal() === 0 
                  ? '#64748b' 
                  : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: '700',
                cursor: enviando || pacientesSelecionados.length === 0 || calcularTotal() === 0 
                  ? 'not-allowed' 
                  : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s'
              }}
            >
              <Send size={18} />
              {enviando ? 'Enviando...' : 'Solicitar Aprovação'}
            </button>

            {(pacientesSelecionados.length === 0 || calcularTotal() === 0) && (
              <div style={{
                marginTop: '0.75rem',
                padding: '0.75rem',
                background: 'rgba(251, 191, 36, 0.1)',
                borderRadius: '8px',
                border: '1px solid rgba(251, 191, 36, 0.3)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem'
              }}>
                <AlertCircle size={16} style={{ color: '#fbbf24', marginTop: '2px' }} />
                <p style={{ fontSize: '0.75rem', color: '#fbbf24', margin: 0, lineHeight: 1.5 }}>
                  {pacientesSelecionados.length === 0 
                    ? 'Selecione pelo menos um paciente para continuar.'
                    : 'Selecione pelo menos um serviço de cobrança.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CobrancaClinica;
