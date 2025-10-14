import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Calculator, TrendingUp, CreditCard, Calendar, DollarSign, AlertCircle, CheckCircle } from 'lucide-react';

const Simulador = () => {
  const { user, isClinica } = useAuth();
  const [formData, setFormData] = useState({
    valorTratamento: '',
    numeroParcelas: 12,
    antecipacaoMeses: 12
  });
  
  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(false);

  // Função para calcular os valores baseada na lógica da planilha
  const calcularSimulacao = () => {
    const valorTratamento = parseFloat(formData.valorTratamento.replace(/[^\d,]/g, '').replace(',', '.'));
    const numeroParcelas = parseInt(formData.numeroParcelas);
    const antecipacaoMeses = parseInt(formData.antecipacaoMeses);

    if (!valorTratamento || valorTratamento <= 0) {
      setResultado(null);
      return;
    }

    // FÓRMULA 1: Valor da Antecipação (Coluna D)
    // Baseado na fórmula da planilha: valorTratamento * (antecipacaoMeses / numeroParcelas)
    const valorAntecipacao = valorTratamento * (antecipacaoMeses / numeroParcelas);

    // FÓRMULA 2: Total Cliente (Coluna G)
    // Baseado na fórmula da planilha: totalCliente = valorTratamento * (1 + (0.06 * antecipacaoMeses) + adjustmentFactor)
    let adjustmentFactor = 0;
    
    // Fatores de ajuste baseados na planilha
    if (antecipacaoMeses === 12) {
      adjustmentFactor = 0.04;
    } else if (antecipacaoMeses === 11) {
      adjustmentFactor = 0.03;
    } else if (antecipacaoMeses >= 4 && antecipacaoMeses <= 8) {
      adjustmentFactor = 0.02;
    } else if (antecipacaoMeses <= 3) {
      adjustmentFactor = 0.03;
    }

    const totalCliente = valorTratamento * (1 + (0.06 * antecipacaoMeses) + adjustmentFactor);

    // FÓRMULA 3: Valor da Parcela (Coluna F)
    // Baseado na fórmula da planilha: valorParcela = totalCliente / numeroParcelas
    const valorParcela = totalCliente / numeroParcelas;

    // Cálculos adicionais
    const taxaAntecipacao = (valorAntecipacao / valorTratamento) * 100;
    const margemLucro = valorAntecipacao - valorTratamento;
    const custoAntecipacao = valorTratamento - valorAntecipacao;

    setResultado({
      valorTratamento,
      numeroParcelas,
      antecipacaoMeses,
      valorAntecipacao,
      valorParcela,
      totalCliente,
      margemLucro,
      custoAntecipacao,
      taxaAntecipacao: taxaAntecipacao.toFixed(1),
      adjustmentFactor: (adjustmentFactor * 100).toFixed(1)
    });
  };

  // Calcular automaticamente quando os dados mudarem
  useEffect(() => {
    calcularSimulacao();
  }, [formData]);

  // Validação para garantir que apenas clínicas acessem
  if (!isClinica) {
    return (
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Acesso Restrito</h2>
        </div>
        <div className="card-content">
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <AlertCircle size={48} color="#ef4444" style={{ marginBottom: '1rem' }} />
            <p>Esta funcionalidade é exclusiva para clínicas parceiras.</p>
          </div>
        </div>
      </div>
    );
  }

  // Formatar valores para exibição
  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  // Formatar número
  const formatarNumero = (valor) => {
    return valor.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  return (
    <div className="simulador-container">
      {/* Header */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Calculator size={32} color="#2563eb" />
            <div>
              <h2 className="card-title">Simulador de Antecipação</h2>
              <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>
                Simule valores de tratamento com antecipação de pagamentos
              </p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>
        {/* Formulário de Entrada */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Dados do Tratamento</h3>
          </div>
          <div className="card-content">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Valor do Tratamento */}
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                  <DollarSign size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                  Valor do Tratamento (R$)
                </label>
                <input
                  type="text"
                  value={formData.valorTratamento}
                  onChange={(e) => {
                    const valor = e.target.value.replace(/[^\d,]/g, '');
                    setFormData(prev => ({ ...prev, valorTratamento: valor }));
                  }}
                  placeholder="Ex: 10.000,00"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>

              {/* Número de Parcelas */}
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                  <CreditCard size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                  Número de Parcelas
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={formData.numeroParcelas}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (value >= 1 && value <= 60) {
                      setFormData(prev => ({ ...prev, numeroParcelas: value }));
                    }
                  }}
                  placeholder="Ex: 12"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    backgroundColor: 'white',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
                <p style={{ 
                  fontSize: '0.75rem', 
                  color: '#6b7280', 
                  marginTop: '0.25rem',
                  marginBottom: 0
                }}>
                  Digite um valor entre 1 e 60 parcelas
                </p>
              </div>

              {/* Antecipação em Meses */}
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                  <Calendar size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                  Antecipação (Meses)
                </label>
                <select
                  value={formData.antecipacaoMeses}
                  onChange={(e) => setFormData(prev => ({ ...prev, antecipacaoMeses: parseInt(e.target.value) }))}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    backgroundColor: 'white'
                  }}
                >
                  {Array.from({ length: formData.numeroParcelas }, (_, i) => formData.numeroParcelas - i).map(num => (
                    <option key={num} value={num}>{num} meses</option>
                  ))}
                </select>
              </div>

              {/* Informação sobre o simulador */}
              <div style={{ 
                padding: '1rem', 
                backgroundColor: '#f0f9ff', 
                border: '1px solid #0ea5e9', 
                borderRadius: '8px',
                fontSize: '0.875rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <AlertCircle size={16} color="#0ea5e9" />
                  <strong>Como funciona:</strong>
                </div>
                <p style={{ margin: 0, color: '#0369a1' }}>
                  Quanto maior a antecipação, mais você recebe antecipadamente e menor fica a parcela para o paciente.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Resultados */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Resultado da Simulação</h3>
          </div>
          <div className="card-content">
            {resultado ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Valor Antecipado */}
                <div style={{ 
                  padding: '1.5rem', 
                  backgroundColor: '#f0fdf4', 
                  border: '2px solid #22c55e', 
                  borderRadius: '12px',
                  textAlign: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <TrendingUp size={20} color="#22c55e" />
                    <span style={{ fontWeight: '600', color: '#166534' }}>Você Recebe Antecipado</span>
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#166534' }}>
                    {formatarMoeda(resultado.valorAntecipacao)}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#16a34a' }}>
                    {resultado.taxaAntecipacao}% do valor total
                  </div>
                </div>

                {/* Detalhes */}
                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    padding: '1rem', 
                    backgroundColor: '#f8fafc', 
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <span style={{ fontWeight: '500', color: '#475569' }}>Valor da Parcela:</span>
                    <span style={{ fontWeight: '600', color: '#1e293b' }}>
                      {formatarMoeda(resultado.valorParcela)}
                    </span>
                  </div>

                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    padding: '1rem', 
                    backgroundColor: '#f8fafc', 
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <span style={{ fontWeight: '500', color: '#475569' }}>Total do Cliente:</span>
                    <span style={{ fontWeight: '600', color: '#1e293b' }}>
                      {formatarMoeda(resultado.totalCliente)}
                    </span>
                  </div>

                </div>

                {/* Resumo */}
                <div style={{ 
                  padding: '1rem', 
                  backgroundColor: '#fef3c7', 
                  border: '1px solid #f59e0b', 
                  borderRadius: '8px',
                  fontSize: '0.875rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <CheckCircle size={16} color="#f59e0b" />
                    <strong>Resumo:</strong>
                  </div>
                  <p style={{ margin: 0, color: '#92400e' }}>
                    Para um tratamento de <strong>{formatarMoeda(resultado.valorTratamento)}</strong> em{' '}
                    <strong>{resultado.numeroParcelas} parcelas</strong>, com antecipação de{' '}
                    <strong>{resultado.antecipacaoMeses} meses</strong>, você receberá{' '}
                    <strong>{formatarMoeda(resultado.valorAntecipacao)}</strong> antecipadamente.
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ 
                textAlign: 'center', 
                padding: '3rem 1rem',
                color: '#6b7280'
              }}>
                <Calculator size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <p>Preencha os dados do tratamento para ver a simulação</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabela de Comparação */}
      {resultado && (
        <div className="card" style={{ marginTop: '2rem' }}>
          <div className="card-header">
            <h3 className="card-title">Comparação de Cenários</h3>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>
              Veja como diferentes antecipações afetam os valores
            </p>
          </div>
          <div className="card-content">
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Antecipação</th>
                    <th>Você Recebe</th>
                    <th>Parcela do Cliente</th>
                    <th>Total Cliente</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: Math.min(formData.numeroParcelas, 10) }, (_, i) => {
                    const meses = formData.numeroParcelas - i;
                    const valorTratamentoNum = formData.valorTratamento.replace(/[^\d,]/g, '').replace(',', '.') 
                      ? parseFloat(formData.valorTratamento.replace(/[^\d,]/g, '').replace(',', '.'))
                      : 0;
                    
                    // Usar as mesmas fórmulas do cálculo principal
                    const valorAntecipacao = valorTratamentoNum * (meses / formData.numeroParcelas);
                    
                    // Fator de ajuste baseado na planilha
                    let adjustmentFactor = 0;
                    if (meses === 12) {
                      adjustmentFactor = 0.04;
                    } else if (meses === 11) {
                      adjustmentFactor = 0.03;
                    } else if (meses >= 4 && meses <= 8) {
                      adjustmentFactor = 0.02;
                    } else if (meses <= 3) {
                      adjustmentFactor = 0.03;
                    }
                    
                    const totalCliente = valorTratamentoNum * (1 + (0.06 * meses) + adjustmentFactor);
                    const valorParcela = totalCliente / formData.numeroParcelas;

                    return (
                      <tr key={meses} style={{ 
                        backgroundColor: meses === resultado.antecipacaoMeses ? '#f0fdf4' : 'transparent',
                        border: meses === resultado.antecipacaoMeses ? '2px solid #22c55e' : '1px solid #e5e7eb'
                      }}>
                        <td style={{ fontWeight: meses === resultado.antecipacaoMeses ? '600' : 'normal' }}>
                          {meses} meses
                        </td>
                        <td>{formatarMoeda(valorAntecipacao)}</td>
                        <td>{formatarMoeda(valorParcela)}</td>
                        <td>{formatarMoeda(totalCliente)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Simulador;
