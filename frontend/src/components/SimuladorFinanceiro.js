import React, { useState, useEffect } from 'react';
import './SimuladorFinanceiro.css';

const SimuladorFinanceiro = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [modalidadeSelecionada, setModalidadeSelecionada] = useState(null);
  const [parametros, setParametros] = useState({
    valorCarteira: '',
    quantidadeBoletos: '',
    totalClientes: '',
    mesesPlano: '',
    mesesPersonalizado: '',
    vencimentoPrimeiro: '',
    percentualVencidos: '',
    percentualAntecipacao: ''
  });
  const [servicosAtivos, setServicosAtivos] = useState({});
  const [resultados, setResultados] = useState(null);
  const [errors, setErrors] = useState({});

  // Taxas fixas
  const TAXAS = {
    obrigatorias: {
      pix: 1.99,
      emissao: 9.98,
      diversos: 0.99,
      whatsapp: 1.47
    },
    adm: {
      sem: 0.0499,
      des: 0.0490
    },
    opcionais: {
      tac: { nome: 'TAC', valor: 0.0098, tipo: 'percentual' },
      analise: { nome: 'Análise', valor: 9.99, tipo: 'fixo' },
      assinatura: { nome: 'Assinatura', valor: 10.00, tipo: 'fixo' },
      negativacao: { nome: 'Negativação', valor: 11.99, tipo: 'fixo' },
      exclusaoNegativacao: { nome: 'Exclusão de Negativação', valor: 12.99, tipo: 'fixo' },
      manutencaoVencidos: { nome: 'Manutenção de Vencidos', valor: 1.99, tipo: 'fixo' },
      cartaCobranca: { nome: 'Carta de Cobrança', valor: 2.91, tipo: 'fixo' },
      emailSms: { nome: 'E-mail e SMS', valor: 0.99, tipo: 'fixo' },
      taxaBaixa: { nome: 'Taxa de Baixa', valor: 3.99, tipo: 'fixo' },
      taxaAlteracao: { nome: 'Taxa de Alteração', valor: 4.99, tipo: 'fixo' },
      protesto: { nome: 'Protesto', valor: 9.90, tipo: 'fixo' },
      anuencia: { nome: 'Anuência', valor: 9.90, tipo: 'fixo' }
    }
  };

  // Formatar valor monetário
  const formatarMoeda = (valor) => {
    if (!valor) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  // Formatar input de moeda
  const handleMoedaInput = (e, field) => {
    let value = e.target.value.replace(/\D/g, '');
    value = (parseInt(value) / 100).toFixed(2);
    setParametros(prev => ({ ...prev, [field]: value }));
  };

  // Validar formulário
  const validarStep = (step) => {
    const newErrors = {};
    
    if (step === 1 && !modalidadeSelecionada) {
      newErrors.modalidade = 'Selecione uma modalidade';
    }
    
    if (step === 2) {
      if (!parametros.valorCarteira || parseFloat(parametros.valorCarteira) <= 0) {
        newErrors.valorCarteira = 'Valor da carteira é obrigatório';
      }
      if (!parametros.quantidadeBoletos || parseInt(parametros.quantidadeBoletos) <= 0) {
        newErrors.quantidadeBoletos = 'Quantidade de boletos é obrigatória';
      }
      if (!parametros.totalClientes || parseInt(parametros.totalClientes) <= 0) {
        newErrors.totalClientes = 'Total de clientes é obrigatório';
      }
      if (!parametros.mesesPlano && !parametros.mesesPersonalizado) {
        newErrors.mesesPlano = 'Selecione a duração do plano';
      }
      if (!parametros.vencimentoPrimeiro) {
        newErrors.vencimentoPrimeiro = 'Data de vencimento é obrigatória';
      }
      if (modalidadeSelecionada === 'des' && !parametros.percentualAntecipacao) {
        newErrors.percentualAntecipacao = 'Percentual de antecipação é obrigatório';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Calcular resultados
  const calcularResultados = () => {
    const valorCarteira = parseFloat(parametros.valorCarteira) || 0;
    const quantidadeBoletos = parseInt(parametros.quantidadeBoletos) || 0;
    const totalClientes = parseInt(parametros.totalClientes) || 0;
    const meses = parseInt(parametros.mesesPersonalizado || parametros.mesesPlano) || 1;
    const percentualAntecipacao = parseFloat(parametros.percentualAntecipacao) || 0;
    
    // Calcular vencimento mensal
    const vencimentoMensal = valorCarteira / meses;
    
    // Taxas obrigatórias mensais
    const taxasObrigatorias = {
      pix: TAXAS.obrigatorias.pix,
      emissao: TAXAS.obrigatorias.emissao * quantidadeBoletos,
      diversos: TAXAS.obrigatorias.diversos * totalClientes,
      whatsapp: TAXAS.obrigatorias.whatsapp * totalClientes
    };
    
    const totalObrigatorias = Object.values(taxasObrigatorias).reduce((a, b) => a + b, 0);
    
    // Taxa ADM
    let taxaADM = 0;
    if (modalidadeSelecionada === 'sem') {
      taxaADM = vencimentoMensal * TAXAS.adm.sem;
    } else if (modalidadeSelecionada === 'des') {
      const baseADM = vencimentoMensal * (percentualAntecipacao / 100);
      taxaADM = baseADM * TAXAS.adm.des;
    }
    
    // Taxas opcionais
    let totalOpcionais = 0;
    Object.keys(servicosAtivos).forEach(servico => {
      if (servicosAtivos[servico]) {
        const taxa = TAXAS.opcionais[servico];
        if (taxa.tipo === 'percentual') {
          totalOpcionais += valorCarteira * taxa.valor;
        } else {
          totalOpcionais += taxa.valor * totalClientes;
        }
      }
    });
    
    // Total mensal
    const totalMensal = totalObrigatorias + taxaADM + totalOpcionais;
    
    // Cronograma mensal
    const cronograma = [];
    const dataInicio = new Date(parametros.vencimentoPrimeiro);
    
    for (let i = 0; i < meses; i++) {
      const dataVencimento = new Date(dataInicio);
      dataVencimento.setMonth(dataInicio.getMonth() + i);
      
      cronograma.push({
        mes: i + 1,
        dataVencimento: dataVencimento.toLocaleDateString('pt-BR'),
        vencimento: vencimentoMensal,
        taxasObrigatorias: totalObrigatorias,
        taxaADM: taxaADM,
        taxasOpcionais: totalOpcionais,
        total: totalMensal
      });
    }
    
    setResultados({
      vencimentoMensal,
      taxasObrigatorias,
      totalObrigatorias,
      taxaADM,
      totalOpcionais,
      totalMensal,
      totalGeral: totalMensal * meses,
      cronograma,
      parametros: { ...parametros, meses, modalidade: modalidadeSelecionada }
    });
  };

  // Navegação entre steps
  const handleNext = () => {
    if (validarStep(currentStep)) {
      if (currentStep === 3) {
        calcularResultados();
      }
      setCurrentStep(prev => Math.min(prev + 1, 5));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Exportar para CSV
  const exportarCSV = () => {
    if (!resultados) return;
    
    let csv = 'Mês,Data Vencimento,Vencimento,Taxas Obrigatórias,Taxa ADM,Taxas Opcionais,Total\n';
    
    resultados.cronograma.forEach(item => {
      csv += `${item.mes},${item.dataVencimento},${formatarMoeda(item.vencimento)},${formatarMoeda(item.taxasObrigatorias)},${formatarMoeda(item.taxaADM)},${formatarMoeda(item.taxasOpcionais)},${formatarMoeda(item.total)}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `simulacao_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Renderizar step indicator
  const renderStepIndicator = () => {
    const steps = [
      { num: 1, label: 'Modalidade' },
      { num: 2, label: 'Parâmetros' },
      { num: 3, label: 'Revisão' },
      { num: 4, label: 'Resultados' },
      { num: 5, label: 'Serviços' }
    ];
    
    return (
      <div className="step-indicator">
        {steps.map((step, index) => (
          <div key={step.num} className={`step ${currentStep >= step.num ? 'active' : ''} ${currentStep === step.num ? 'current' : ''}`}>
            <div className="step-number">{step.num}</div>
            <div className="step-label">{step.label}</div>
            {index < steps.length - 1 && <div className="step-line" />}
          </div>
        ))}
      </div>
    );
  };

  // Renderizar conteúdo do step
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="step-content">
            <h2>Selecione a Modalidade</h2>
            <div className="modalidade-cards">
              <div 
                className={`modalidade-card ${modalidadeSelecionada === 'sem' ? 'selected' : ''}`}
                onClick={() => setModalidadeSelecionada('sem')}
              >
                <div className="modalidade-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                </div>
                <h3>Gestão da Carteira (SEM)</h3>
                <p>Taxa ADM: 4,99%</p>
                <p className="modalidade-desc">Gestão completa da carteira de boletos sem antecipação</p>
              </div>
              
              <div 
                className={`modalidade-card ${modalidadeSelecionada === 'des' ? 'selected' : ''}`}
                onClick={() => setModalidadeSelecionada('des')}
              >
                <div className="modalidade-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                    <polyline points="16 7 19 10 16 13" />
                  </svg>
                </div>
                <h3>Com Antecipação (DES)</h3>
                <p>Taxa ADM: 4,90%</p>
                <p className="modalidade-desc">Antecipação de até 40% do valor com taxa reduzida</p>
              </div>
            </div>
            {errors.modalidade && <div className="error-message">{errors.modalidade}</div>}
          </div>
        );
        
      case 2:
        return (
          <div className="step-content">
            <h2>Parâmetros do Plano</h2>
            <div className="form-grid">
              <div className="form-group">
                <label>Valor Total da Carteira *</label>
                <input
                  type="text"
                  placeholder="R$ 0,00"
                  value={parametros.valorCarteira ? formatarMoeda(parametros.valorCarteira) : ''}
                  onChange={(e) => handleMoedaInput(e, 'valorCarteira')}
                  className={errors.valorCarteira ? 'error' : ''}
                />
                {errors.valorCarteira && <span className="error-text">{errors.valorCarteira}</span>}
              </div>
              
              <div className="form-group">
                <label>Quantidade de Boletos *</label>
                <input
                  type="number"
                  placeholder="0"
                  value={parametros.quantidadeBoletos}
                  onChange={(e) => setParametros(prev => ({ ...prev, quantidadeBoletos: e.target.value }))}
                  className={errors.quantidadeBoletos ? 'error' : ''}
                />
                {errors.quantidadeBoletos && <span className="error-text">{errors.quantidadeBoletos}</span>}
              </div>
              
              <div className="form-group">
                <label>Total de Clientes Únicos *</label>
                <input
                  type="number"
                  placeholder="0"
                  value={parametros.totalClientes}
                  onChange={(e) => setParametros(prev => ({ ...prev, totalClientes: e.target.value }))}
                  className={errors.totalClientes ? 'error' : ''}
                />
                {errors.totalClientes && <span className="error-text">{errors.totalClientes}</span>}
              </div>
              
              <div className="form-group">
                <label>Duração do Plano (meses) *</label>
                <select
                  value={parametros.mesesPlano}
                  onChange={(e) => setParametros(prev => ({ 
                    ...prev, 
                    mesesPlano: e.target.value,
                    mesesPersonalizado: e.target.value === 'custom' ? prev.mesesPersonalizado : ''
                  }))}
                  className={errors.mesesPlano ? 'error' : ''}
                >
                  <option value="">Selecione...</option>
                  <option value="3">3 meses</option>
                  <option value="6">6 meses</option>
                  <option value="12">12 meses</option>
                  <option value="24">24 meses</option>
                  <option value="36">36 meses</option>
                  <option value="custom">Personalizado</option>
                </select>
                {errors.mesesPlano && <span className="error-text">{errors.mesesPlano}</span>}
              </div>
              
              {parametros.mesesPlano === 'custom' && (
                <div className="form-group">
                  <label>Quantidade de Meses *</label>
                  <input
                    type="number"
                    placeholder="Digite a quantidade de meses"
                    value={parametros.mesesPersonalizado}
                    onChange={(e) => setParametros(prev => ({ ...prev, mesesPersonalizado: e.target.value }))}
                    min="1"
                    max="120"
                  />
                </div>
              )}
              
              <div className="form-group">
                <label>Vencimento do Primeiro Boleto *</label>
                <input
                  type="date"
                  value={parametros.vencimentoPrimeiro}
                  onChange={(e) => setParametros(prev => ({ ...prev, vencimentoPrimeiro: e.target.value }))}
                  className={errors.vencimentoPrimeiro ? 'error' : ''}
                  min={new Date().toISOString().split('T')[0]}
                />
                {errors.vencimentoPrimeiro && <span className="error-text">{errors.vencimentoPrimeiro}</span>}
              </div>
              
              <div className="form-group">
                <label>Percentual de Vencidos Estimado (% ao mês)</label>
                <input
                  type="number"
                  placeholder="0%"
                  value={parametros.percentualVencidos}
                  onChange={(e) => setParametros(prev => ({ ...prev, percentualVencidos: e.target.value }))}
                  min="0"
                  max="100"
                  step="0.1"
                />
              </div>
              
              {modalidadeSelecionada === 'des' && (
                <div className="form-group">
                  <label>Percentual de Antecipação (α) *</label>
                  <input
                    type="number"
                    placeholder="0%"
                    value={parametros.percentualAntecipacao}
                    onChange={(e) => setParametros(prev => ({ ...prev, percentualAntecipacao: Math.min(40, e.target.value) }))}
                    className={errors.percentualAntecipacao ? 'error' : ''}
                    min="0"
                    max="40"
                    step="0.1"
                  />
                  <span className="help-text">Máximo: 40%</span>
                  {errors.percentualAntecipacao && <span className="error-text">{errors.percentualAntecipacao}</span>}
                </div>
              )}
            </div>
          </div>
        );
        
      case 3:
        return (
          <div className="step-content">
            <h2>Revisão dos Dados</h2>
            <div className="review-section">
              <div className="review-card">
                <h3>Modalidade Selecionada</h3>
                <p className="review-value">
                  {modalidadeSelecionada === 'sem' ? 'Gestão da Carteira (SEM)' : 'Com Antecipação (DES)'}
                </p>
                <p className="review-detail">
                  Taxa ADM: {modalidadeSelecionada === 'sem' ? '4,99%' : '4,90%'}
                </p>
              </div>
              
              <div className="review-card">
                <h3>Parâmetros do Plano</h3>
                <div className="review-items">
                  <div className="review-item">
                    <span>Valor da Carteira:</span>
                    <strong>{formatarMoeda(parametros.valorCarteira)}</strong>
                  </div>
                  <div className="review-item">
                    <span>Quantidade de Boletos:</span>
                    <strong>{parametros.quantidadeBoletos}</strong>
                  </div>
                  <div className="review-item">
                    <span>Total de Clientes:</span>
                    <strong>{parametros.totalClientes}</strong>
                  </div>
                  <div className="review-item">
                    <span>Duração do Plano:</span>
                    <strong>{parametros.mesesPersonalizado || parametros.mesesPlano} meses</strong>
                  </div>
                  <div className="review-item">
                    <span>Primeiro Vencimento:</span>
                    <strong>{new Date(parametros.vencimentoPrimeiro).toLocaleDateString('pt-BR')}</strong>
                  </div>
                  {parametros.percentualVencidos && (
                    <div className="review-item">
                      <span>Vencidos Estimado:</span>
                      <strong>{parametros.percentualVencidos}%</strong>
                    </div>
                  )}
                  {modalidadeSelecionada === 'des' && (
                    <div className="review-item">
                      <span>Percentual de Antecipação:</span>
                      <strong>{parametros.percentualAntecipacao}%</strong>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="alert-info">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <p>Confirme os dados antes de prosseguir para o cálculo</p>
              </div>
            </div>
          </div>
        );
        
      case 4:
        return (
          <div className="step-content">
            <h2>Resultados da Simulação</h2>
            {resultados && (
              <>
                <div className="results-summary">
                  <div className="result-card primary">
                    <h3>Vencimento Mensal</h3>
                    <p className="result-value">{formatarMoeda(resultados.vencimentoMensal)}</p>
                  </div>
                  
                  <div className="result-card">
                    <h3>Taxas Obrigatórias</h3>
                    <p className="result-value">{formatarMoeda(resultados.totalObrigatorias)}</p>
                    <div className="result-details">
                      <span>PIX: {formatarMoeda(resultados.taxasObrigatorias.pix)}</span>
                      <span>Emissão: {formatarMoeda(resultados.taxasObrigatorias.emissao)}</span>
                      <span>Diversos: {formatarMoeda(resultados.taxasObrigatorias.diversos)}</span>
                      <span>WhatsApp: {formatarMoeda(resultados.taxasObrigatorias.whatsapp)}</span>
                    </div>
                  </div>
                  
                  <div className="result-card">
                    <h3>Taxa ADM</h3>
                    <p className="result-value">{formatarMoeda(resultados.taxaADM)}</p>
                    <div className="result-details">
                      <span>{resultados.parametros.modalidade === 'sem' ? '4,99% sobre vencimento' : `4,90% sobre ${resultados.parametros.percentualAntecipacao}% do vencimento`}</span>
                    </div>
                  </div>
                  
                  {resultados.totalOpcionais > 0 && (
                    <div className="result-card">
                      <h3>Taxas Opcionais</h3>
                      <p className="result-value">{formatarMoeda(resultados.totalOpcionais)}</p>
                    </div>
                  )}
                  
                  <div className="result-card highlight">
                    <h3>Total Mensal</h3>
                    <p className="result-value large">{formatarMoeda(resultados.totalMensal)}</p>
                  </div>
                  
                  <div className="result-card">
                    <h3>Total do Plano</h3>
                    <p className="result-value">{formatarMoeda(resultados.totalGeral)}</p>
                    <div className="result-details">
                      <span>{resultados.parametros.meses} meses</span>
                    </div>
                  </div>
                </div>
                
                <div className="cronograma-section">
                  <h3>Cronograma Mensal</h3>
                  <div className="table-responsive">
                    <table className="cronograma-table">
                      <thead>
                        <tr>
                          <th>Mês</th>
                          <th>Vencimento</th>
                          <th>Valor</th>
                          <th>Taxas Obrig.</th>
                          <th>Taxa ADM</th>
                          <th>Taxas Opc.</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resultados.cronograma.slice(0, 12).map((item) => (
                          <tr key={item.mes}>
                            <td>{item.mes}</td>
                            <td>{item.dataVencimento}</td>
                            <td>{formatarMoeda(item.vencimento)}</td>
                            <td>{formatarMoeda(item.taxasObrigatorias)}</td>
                            <td>{formatarMoeda(item.taxaADM)}</td>
                            <td>{formatarMoeda(item.taxasOpcionais)}</td>
                            <td className="total">{formatarMoeda(item.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {resultados.cronograma.length > 12 && (
                      <p className="table-note">Mostrando os primeiros 12 meses de {resultados.cronograma.length} meses totais</p>
                    )}
                  </div>
                </div>
                
                <div className="export-buttons">
                  <button className="btn-export csv" onClick={exportarCSV}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="12" y1="18" x2="12" y2="12" />
                      <line x1="9" y1="15" x2="15" y2="15" />
                    </svg>
                    Exportar CSV
                  </button>
                  
                  <button className="btn-export print" onClick={() => window.print()}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 6 2 18 2 18 9" />
                      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                      <rect x="6" y="14" width="12" height="8" />
                    </svg>
                    Imprimir
                  </button>
                </div>
              </>
            )}
          </div>
        );
        
      case 5:
        return (
          <div className="step-content">
            <h2>Gestão de Cobrança (Opcional)</h2>
            <p className="step-subtitle">Selecione os serviços adicionais que deseja incluir na simulação</p>
            
            <div className="servicos-grid">
              {Object.entries(TAXAS.opcionais).map(([key, servico]) => (
                <div key={key} className="servico-card">
                  <label className="servico-label">
                    <input
                      type="checkbox"
                      checked={servicosAtivos[key] || false}
                      onChange={(e) => setServicosAtivos(prev => ({ ...prev, [key]: e.target.checked }))}
                    />
                    <div className="servico-content">
                      <span className="servico-nome">{servico.nome}</span>
                      <span className="servico-valor">
                        {servico.tipo === 'percentual' 
                          ? `${(servico.valor * 100).toFixed(2)}%` 
                          : formatarMoeda(servico.valor)}
                        {servico.tipo === 'fixo' && '/cliente'}
                      </span>
                    </div>
                  </label>
                </div>
              ))}
            </div>
            
            <div className="alert-info">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <p>Os serviços selecionados serão incluídos no cálculo. Clique em "Recalcular" para atualizar os resultados.</p>
            </div>
            
            <div className="recalcular-section">
              <button className="btn-primary large" onClick={() => {
                calcularResultados();
                setCurrentStep(4);
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                Recalcular com Serviços
              </button>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="simulador-container">
      <div className="simulador-header">
        <h1>Simulador Financeiro</h1>
        <p>Calcule os custos mensais de gestão da carteira de boletos</p>
      </div>
      
      {renderStepIndicator()}
      
      <div className="simulador-content">
        {renderStepContent()}
      </div>
      
      <div className="simulador-footer">
        {currentStep > 1 && (
          <button className="btn-secondary" onClick={handlePrevious}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Anterior
          </button>
        )}
        
        {currentStep < 5 && (
          <button className="btn-primary" onClick={handleNext}>
            {currentStep === 3 ? 'Calcular' : 'Próximo'}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        )}
        
        {currentStep === 5 && (
          <button className="btn-primary" onClick={() => {
            setCurrentStep(1);
            setModalidadeSelecionada(null);
            setParametros({});
            setServicosAtivos({});
            setResultados(null);
            setErrors({});
          }}>
            Nova Simulação
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default SimuladorFinanceiro;