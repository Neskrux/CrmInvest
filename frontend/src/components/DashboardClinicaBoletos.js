import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  AlertCircle, 
  CheckCircle,
  Clock,
  Calendar,
  CreditCard,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Activity
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Area, AreaChart } from 'recharts';

const DashboardClinicaBoletos = ({ kpisFinanceirosClinica }) => {
  const { user, makeRequest } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('30'); // 7, 30, 90 dias
  const [showDetalhesModal, setShowDetalhesModal] = useState(false);
  const [gastosExtras, setGastosExtras] = useState({ totalGastosExtras: 0, detalhamento: [] });
  
  // Carregar gastos extras das solicitações de cobrança
  useEffect(() => {
    carregarGastosExtras();
  }, []);
  
  const carregarGastosExtras = async () => {
    try {
      const response = await makeRequest('/solicitacoes-cobranca/gastos-mensais');
      if (response.ok) {
        const data = await response.json();
        setGastosExtras(data);
      }
    } catch (error) {
      console.error('Erro ao carregar gastos extras:', error);
    }
  };
  
  // Cálculo do gasto mensal
  const CUSTO_EMISSAO = 9.98;
  const CUSTO_DIVERSOS = 0.99;
  const totalBoletos = kpisFinanceirosClinica.totalBoletos || 0;
  const gastoEmissao = totalBoletos * CUSTO_EMISSAO;
  const gastoDiversos = totalBoletos * CUSTO_DIVERSOS;
  const gastoBase = gastoEmissao + gastoDiversos;
  const gastoMensal = gastoBase + (gastosExtras.totalGastosExtras || 0);
  
  // Cores do tema
  const colors = {
    primary: '#6366f1',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',
    dark: '#1e293b',
    light: '#f8fafc',
    muted: '#64748b'
  };

  // Dados para o gráfico de pizza - Status dos Boletos
  const statusData = [
    { name: 'Pagos', value: kpisFinanceirosClinica.valorPago, color: colors.success },
    { name: 'Pendentes', value: kpisFinanceirosClinica.valorPendente, color: colors.info },
    { name: 'Vencidos', value: kpisFinanceirosClinica.valorVencido, color: colors.danger }
  ];

  // Dados para o gráfico de barras - Faixas de Atraso
  const faixasData = Object.entries(kpisFinanceirosClinica.faixasAtraso || {})
    .filter(([key]) => key !== 'faixaOutros')
    .map(([key, data]) => ({
      faixa: data.label,
      valor: data.valor,
      quantidade: data.quantidade,
      color: key === 'faixa0a15' ? colors.warning : 
             key === 'faixa30a60' ? '#f97316' : 
             colors.danger
    }));

  // Formatadores
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0);
  };

  const formatCurrencyCompact = (value) => {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(0)}k`;
    }
    return formatCurrency(value);
  };

  const formatPercent = (value) => {
    return `${(value || 0).toFixed(1)}%`;
  };

  // Calcular percentual de recuperação
  const taxaRecuperacao = kpisFinanceirosClinica.totalEmitido > 0 
    ? ((kpisFinanceirosClinica.valorPago / kpisFinanceirosClinica.totalEmitido) * 100).toFixed(1)
    : 0;

  // Custom Tooltip para o gráfico de pizza
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: 'white',
          padding: '12px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          border: '1px solid #e5e7eb'
        }}>
          <p style={{ margin: 0, fontWeight: '600', color: payload[0].payload.color }}>
            {payload[0].name}
          </p>
          <p style={{ margin: '4px 0 0 0', fontSize: '1.125rem', fontWeight: '700' }}>
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ padding: '2rem', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ 
          fontSize: '2rem', 
          fontWeight: '800', 
          color: colors.dark,
          marginBottom: '0.5rem',
          letterSpacing: '-0.025em'
        }}>
          Gestão Financeira
        </h1>
        <p style={{ color: colors.muted, fontSize: '1rem' }}>
          Acompanhe seus boletos e indicadores financeiros em tempo real
        </p>
      </div>

      {/* Cards Principais - KPIs */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {/* Card 1: Gasto Mensal */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '20px',
          padding: '1.5rem',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 10px 30px rgba(102, 126, 234, 0.4)'
        }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <DollarSign size={20} />
              <span style={{ fontSize: '0.875rem', fontWeight: '600', opacity: 0.9 }}>
                GASTO MENSAL
              </span>
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '0.5rem' }}>
              {formatCurrencyCompact(gastoMensal)}
            </div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginTop: '0.5rem'
            }}>
              <span style={{ fontSize: '0.875rem', opacity: 0.85 }}>
                {totalBoletos} boletos emitidos
              </span>
              <button
                onClick={() => setShowDetalhesModal(true)}
                style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid rgba(255,255,255,0.3)',
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  backdropFilter: 'blur(10px)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(255,255,255,0.2)';
                  e.target.style.borderColor = 'rgba(255,255,255,0.5)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(255,255,255,0.1)';
                  e.target.style.borderColor = 'rgba(255,255,255,0.3)';
                }}
              >
                Detalhes
              </button>
            </div>
          </div>
          <div style={{
            position: 'absolute',
            top: '-50%',
            right: '-50%',
            width: '200%',
            height: '200%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
            animation: 'pulse 4s ease-in-out infinite'
          }} />
        </div>

        {/* Card 2: Total Recebido */}
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '1.5rem',
          border: '2px solid #e5e7eb',
          position: 'relative',
          transition: 'all 0.3s ease',
          cursor: 'pointer'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ 
              width: '48px', 
              height: '48px', 
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CheckCircle size={24} color={colors.success} />
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: colors.success
            }}>
              <ArrowUpRight size={16} />
              {taxaRecuperacao}%
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: colors.muted, marginBottom: '0.5rem', fontWeight: '600' }}>
            TOTAL RECEBIDO
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: colors.dark }}>
            {formatCurrencyCompact(kpisFinanceirosClinica.valorPago)}
          </div>
        </div>

        {/* Card 3: A Receber */}
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '1.5rem',
          border: '2px solid #e5e7eb',
          position: 'relative',
          transition: 'all 0.3s ease',
          cursor: 'pointer'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ 
              width: '48px', 
              height: '48px', 
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Clock size={24} color={colors.info} />
            </div>
            <Activity size={20} color={colors.info} />
          </div>
          <div style={{ fontSize: '0.75rem', color: colors.muted, marginBottom: '0.5rem', fontWeight: '600' }}>
            A RECEBER
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: colors.dark }}>
            {formatCurrencyCompact(kpisFinanceirosClinica.valorPendente)}
          </div>
        </div>

        {/* Card 4: Em Atraso */}
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '1.5rem',
          border: '2px solid #fee2e2',
          position: 'relative',
          transition: 'all 0.3s ease',
          cursor: 'pointer'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 10px 30px rgba(239,68,68,0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ 
              width: '48px', 
              height: '48px', 
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AlertCircle size={24} color={colors.danger} />
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: colors.danger
            }}>
              <ArrowDownRight size={16} />
              {formatPercent(kpisFinanceirosClinica.inadimplencia)}
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: colors.muted, marginBottom: '0.5rem', fontWeight: '600' }}>
            EM ATRASO
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: colors.dark }}>
            {formatCurrencyCompact(kpisFinanceirosClinica.valorVencido)}
          </div>
        </div>
      </div>

      {/* Segunda linha - Gráficos */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : '1fr 1fr',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {/* Gráfico de Pizza - Distribuição */}
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '1.5rem',
          boxShadow: '0 4px 6px rgba(0,0,0,0.07)'
        }}>
          <h3 style={{ 
            fontSize: '1.125rem', 
            fontWeight: '700', 
            color: colors.dark,
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <DollarSign size={20} />
            Distribuição Financeira
          </h3>
          
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-around',
            marginTop: '1rem',
            paddingTop: '1rem',
            borderTop: '1px solid #e5e7eb'
          }}>
            {statusData.map((item) => (
              <div key={item.name} style={{ textAlign: 'center' }}>
                <div style={{ 
                  width: '12px', 
                  height: '12px', 
                  borderRadius: '50%',
                  backgroundColor: item.color,
                  margin: '0 auto 0.5rem'
                }} />
                <div style={{ fontSize: '0.75rem', color: colors.muted, marginBottom: '0.25rem' }}>
                  {item.name}
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: '700', color: colors.dark }}>
                  {formatCurrencyCompact(item.value)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gráfico de Barras - Faixas de Atraso */}
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '1.5rem',
          boxShadow: '0 4px 6px rgba(0,0,0,0.07)'
        }}>
          <h3 style={{ 
            fontSize: '1.125rem', 
            fontWeight: '700', 
            color: colors.dark,
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Calendar size={20} />
            Contas a Receber
          </h3>

          {faixasData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={faixasData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="faixa" 
                  tick={{ fontSize: 12, fill: colors.muted }}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: colors.muted }}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickFormatter={(value) => formatCurrencyCompact(value)}
                />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === 'valor') return formatCurrency(value);
                    return value;
                  }}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                />
                <Bar 
                  dataKey="valor" 
                  radius={[8, 8, 0, 0]}
                  fill={colors.warning}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{
              height: '250px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              color: colors.muted
            }}>
              <CheckCircle size={48} color={colors.success} style={{ marginBottom: '1rem' }} />
              <p style={{ fontSize: '1rem', fontWeight: '600' }}>Nenhum boleto em atraso!</p>
              <p style={{ fontSize: '0.875rem' }}>Parabéns pela gestão financeira</p>
            </div>
          )}
        </div>
      </div>

      {/* Resumo Executivo */}
      <div style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
        borderRadius: '20px',
        padding: '2rem',
        color: 'white',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
      }}>
        <h3 style={{ 
          fontSize: '1.25rem', 
          fontWeight: '700',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <FileText size={24} />
          Resumo Executivo
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '2rem'
        }}>
          <div>
            <div style={{ fontSize: '0.875rem', opacity: 0.8, marginBottom: '0.5rem' }}>
              Total Emitido
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '700' }}>
              {formatCurrencyCompact(kpisFinanceirosClinica.totalEmitido)}
            </div>
            <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '0.25rem' }}>
              {kpisFinanceirosClinica.totalBoletos} boletos
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.875rem', opacity: 0.8, marginBottom: '0.5rem' }}>
              Taxa de Recuperação
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '700' }}>
              {taxaRecuperacao}%
            </div>
            <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '0.25rem' }}>
              do total emitido
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.875rem', opacity: 0.8, marginBottom: '0.5rem' }}>
              Inadimplência
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '700' }}>
              {formatPercent(kpisFinanceirosClinica.inadimplencia)}
            </div>
            <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '0.25rem' }}>
              sobre o faturamento
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.875rem', opacity: 0.8, marginBottom: '0.5rem' }}>
              Ticket Médio
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '700' }}>
              {formatCurrencyCompact(
                kpisFinanceirosClinica.totalBoletos > 0 
                  ? kpisFinanceirosClinica.totalEmitido / kpisFinanceirosClinica.totalBoletos 
                  : 0
              )}
            </div>
            <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '0.25rem' }}>
              por boleto
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Detalhes dos Gastos */}
      {showDetalhesModal && (
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
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}
          onClick={(e) => e.stopPropagation()}>
            {/* Header do Modal */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '2rem',
              paddingBottom: '1rem',
              borderBottom: '2px solid #e5e7eb'
            }}>
              <div>
                <h2 style={{
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  color: colors.dark,
                  margin: 0,
                  marginBottom: '0.25rem'
                }}>
                  Detalhamento de Gastos
                </h2>
                <p style={{
                  fontSize: '0.875rem',
                  color: colors.muted,
                  margin: 0
                }}>
                  Custos mensais com emissão de boletos
                </p>
              </div>
              <button
                onClick={() => setShowDetalhesModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  borderRadius: '8px',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = '#f8fafc'}
                onMouseLeave={(e) => e.target.style.background = 'none'}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.muted} strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Resumo */}
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '16px',
              padding: '1.5rem',
              marginBottom: '2rem',
              color: 'white'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem'
              }}>
                <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>Total de Boletos Emitidos</span>
                <span style={{ fontSize: '1.5rem', fontWeight: '700' }}>{totalBoletos}</span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>Gasto Total do Mês</span>
                <span style={{ fontSize: '2rem', fontWeight: '800' }}>{formatCurrency(gastoMensal)}</span>
              </div>
            </div>

            {/* Detalhamento */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: colors.dark,
                marginBottom: '1rem'
              }}>
                Composição dos Custos
              </h3>

              {/* Taxa de Emissão */}
              <div style={{
                padding: '1rem',
                background: '#f8fafc',
                borderRadius: '12px',
                marginBottom: '1rem',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.5rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <FileText size={20} color={colors.info} />
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', color: colors.dark }}>Taxa de Emissão</div>
                      <div style={{ fontSize: '0.75rem', color: colors.muted }}>
                        R$ {CUSTO_EMISSAO.toFixed(2).replace('.', ',')} por boleto
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: '700', color: colors.dark }}>
                      {formatCurrency(gastoEmissao)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: colors.muted }}>
                      {totalBoletos} × R$ {CUSTO_EMISSAO.toFixed(2).replace('.', ',')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Taxa de Diversos */}
              <div style={{
                padding: '1rem',
                background: '#f8fafc',
                borderRadius: '12px',
                marginBottom: '1rem',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.5rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Activity size={20} color={colors.warning} />
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', color: colors.dark }}>Taxa de Diversos</div>
                      <div style={{ fontSize: '0.75rem', color: colors.muted }}>
                        R$ {CUSTO_DIVERSOS.toFixed(2).replace('.', ',')} por boleto
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: '700', color: colors.dark }}>
                      {formatCurrency(gastoDiversos)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: colors.muted }}>
                      {totalBoletos} × R$ {CUSTO_DIVERSOS.toFixed(2).replace('.', ',')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Gastos Extras de Cobrança */}
              {gastosExtras.detalhamento && gastosExtras.detalhamento.length > 0 && (
                <>
                  <h3 style={{
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    color: colors.dark,
                    marginBottom: '1rem',
                    marginTop: '1.5rem'
                  }}>
                    Serviços de Cobrança Solicitados
                  </h3>
                  {gastosExtras.detalhamento.map((item, index) => (
                    <div key={index} style={{
                      padding: '1rem',
                      background: '#f8fafc',
                      borderRadius: '12px',
                      marginBottom: '1rem',
                      border: '1px solid #e5e7eb'
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            background: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <DollarSign size={20} color="#9333ea" />
                          </div>
                          <div>
                            <div style={{ fontWeight: '600', color: colors.dark }}>{item.nome}</div>
                            <div style={{ fontSize: '0.75rem', color: colors.muted }}>
                              Quantidade: {item.quantidade}
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.25rem', fontWeight: '700', color: colors.dark }}>
                            {formatCurrency(item.valor)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Total de Gastos Extras */}
                  <div style={{
                    padding: '1rem',
                    background: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)',
                    borderRadius: '12px',
                    marginBottom: '1rem',
                    border: '2px solid #9333ea'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{ fontWeight: '700', color: '#6b21a8' }}>
                        Total de Serviços de Cobrança
                      </div>
                      <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#6b21a8' }}>
                        {formatCurrency(gastosExtras.totalGastosExtras)}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Informação Adicional */}
            <div style={{
              padding: '1rem',
              background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
              borderRadius: '12px',
              border: '1px solid #7dd3fc'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <AlertCircle size={20} color={colors.info} style={{ marginTop: '2px' }} />
                <div>
                  <div style={{ fontWeight: '600', color: colors.info, marginBottom: '0.25rem' }}>
                    Informação Importante
                  </div>
                  <p style={{ fontSize: '0.875rem', color: '#0369a1', margin: 0, lineHeight: 1.5 }}>
                    Os valores apresentados referem-se aos custos operacionais de emissão e processamento de boletos. 
                    Estes custos são calculados automaticamente com base na quantidade de boletos emitidos no mês.
                  </p>
                </div>
              </div>
            </div>

            {/* Botão Fechar */}
            <button
              onClick={() => setShowDetalhesModal(false)}
              style={{
                width: '100%',
                padding: '0.75rem',
                marginTop: '2rem',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
              }}
              onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}>
              Fechar
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 0.4;
          }
          50% {
            opacity: 0.2;
          }
        }
      `}</style>
    </div>
  );
};

export default DashboardClinicaBoletos;
