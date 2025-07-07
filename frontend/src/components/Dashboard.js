import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const { makeRequest, user } = useAuth();
  const [periodo, setPeriodo] = useState('total'); // total, semanal, mensal
  const [subPeriodo, setSubPeriodo] = useState(null); // para dias da semana
  const [semanaOpcao, setSemanaOpcao] = useState('atual'); // atual, proxima
  const [mesAno, setMesAno] = useState(new Date()); // para navegação mensal
  const [filtroRegiao, setFiltroRegiao] = useState({ cidade: '', estado: '' });
  const [cidadesDisponiveis, setCidadesDisponiveis] = useState([]);
  const [estadosDisponiveis, setEstadosDisponiveis] = useState([]);
  const [stats, setStats] = useState({
    totalPacientes: 0,
    totalAgendamentos: 0,
    totalFechamentos: 0,
    valorTotalFechamentos: 0,
    agendamentosHoje: 0,
    leadsPorStatus: {},
    fechamentosPorMes: [],
    consultoresStats: [],
    comissaoTotalMes: 0,
    comissaoTotalGeral: 0,
    // Novas estatísticas por período
    agendamentosPeriodo: 0,
    fechamentosPeriodo: 0,
    valorPeriodo: 0,
    novosLeadsPeriodo: 0,
    // Estatísticas por dia da semana
    estatisticasPorDia: {}
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchRegioesDisponiveis();
  }, [periodo, subPeriodo, mesAno, semanaOpcao, filtroRegiao]);

  // Buscar cidades quando estado for alterado
  useEffect(() => {
    const fetchCidades = async () => {
      try {
        if (filtroRegiao.estado) {
          const cidadesRes = await makeRequest(`/clinicas/cidades?estado=${filtroRegiao.estado}`);
          if (cidadesRes.ok) {
            const cidades = await cidadesRes.json();
            setCidadesDisponiveis(cidades);
          }
        } else {
          const cidadesRes = await makeRequest('/clinicas/cidades');
          if (cidadesRes.ok) {
            const cidades = await cidadesRes.json();
            setCidadesDisponiveis(cidades);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar cidades:', error);
      }
    };

    fetchCidades();
  }, [filtroRegiao.estado]);

  const calcularComissao = (valorFechado) => {
    return (valorFechado / 1000) * 5;
  };

  const fetchStats = async () => {
    try {
      // Construir parâmetros de busca para clínicas
      const clinicasParams = new URLSearchParams();
      if (filtroRegiao.estado) clinicasParams.append('estado', filtroRegiao.estado);
      if (filtroRegiao.cidade) clinicasParams.append('cidade', filtroRegiao.cidade);
      
      const [pacientesRes, agendamentosRes, fechamentosRes, consultoresRes, clinicasRes] = await Promise.all([
        makeRequest('/pacientes'),
        makeRequest('/agendamentos'),
        makeRequest('/fechamentos'),
        makeRequest('/consultores'),
        makeRequest(`/clinicas?${clinicasParams.toString()}`)
      ]);

      const pacientes = await pacientesRes.json();
      let agendamentos = await agendamentosRes.json();
      let fechamentos = await fechamentosRes.json();
      const consultores = await consultoresRes.json();
      const clinicasFiltradas = await clinicasRes.json();

      // Aplicar filtros por região se especificados
      if (filtroRegiao.cidade || filtroRegiao.estado) {
        const clinicasIds = clinicasFiltradas.map(c => c.id);
        
        // Filtrar agendamentos por região (via clínicas)
        agendamentos = agendamentos.filter(agendamento => {
          if (!agendamento.clinica_id) return false; // excluir agendamentos sem clínica quando há filtro
          return clinicasIds.includes(agendamento.clinica_id);
        });

        // Filtrar fechamentos por região (via clínicas)
        fechamentos = fechamentos.filter(fechamento => {
          if (!fechamento.clinica_id) return false; // excluir fechamentos sem clínica quando há filtro
          return clinicasIds.includes(fechamento.clinica_id);
        });
      }

      const hoje = new Date();
      const hojeStr = hoje.toISOString().split('T')[0];
      const agendamentosHoje = agendamentos.filter(a => a.data_agendamento === hojeStr).length;

      const leadsPorStatus = pacientes.reduce((acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
      }, {});

      const valorTotal = fechamentos.reduce((sum, f) => sum + parseFloat(f.valor_fechado || 0), 0);

      // Calcular data de início e fim baseado no período selecionado
      let dataInicio = null;
      let dataFim = null;
      
      if (periodo === 'total') {
        // Sem filtro de data para total
        dataInicio = null;
        dataFim = null;
      } else if (periodo === 'semanal') {
        if (subPeriodo) {
          // Dia específico da semana
          dataInicio = new Date(subPeriodo);
          dataInicio.setHours(0, 0, 0, 0);
          dataFim = new Date(subPeriodo);
          dataFim.setHours(23, 59, 59, 999);
        } else {
          // Semana atual ou próxima
          dataInicio = new Date(hoje);
          
          if (semanaOpcao === 'proxima') {
            // Próxima semana
            dataInicio.setDate(hoje.getDate() + 7 - hoje.getDay()); // Próximo domingo
          } else {
            // Semana atual
            dataInicio.setDate(hoje.getDate() - hoje.getDay()); // Domingo atual
          }
          
          dataInicio.setHours(0, 0, 0, 0);
          dataFim = new Date(dataInicio);
          dataFim.setDate(dataInicio.getDate() + 6); // Sábado
          dataFim.setHours(23, 59, 59, 999);
        }
      } else if (periodo === 'mensal') {
        // Mês selecionado
        dataInicio = new Date(mesAno.getFullYear(), mesAno.getMonth(), 1);
        dataFim = new Date(mesAno.getFullYear(), mesAno.getMonth() + 1, 0);
        dataFim.setHours(23, 59, 59, 999);
      }

      // Filtrar dados por período
      const agendamentosPeriodo = dataInicio ? agendamentos.filter(a => {
        const data = new Date(a.data_agendamento);
        return data >= dataInicio && data <= dataFim;
      }).length : agendamentos.length;

      const fechamentosPeriodo = dataInicio ? fechamentos.filter(f => {
        const data = new Date(f.data_fechamento);
        return data >= dataInicio && data <= dataFim;
      }) : fechamentos;

      const valorPeriodo = fechamentosPeriodo.reduce((sum, f) => 
        sum + parseFloat(f.valor_fechado || 0), 0
      );

      const novosLeadsPeriodo = dataInicio ? pacientes.filter(p => {
        const data = new Date(p.created_at);
        return data >= dataInicio && data <= dataFim;
      }).length : pacientes.length;

      // Calcular estatísticas por dia da semana (apenas para visualização semanal)
      let estatisticasPorDia = {};
      if (periodo === 'semanal' && !subPeriodo) {
        const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        
        for (let i = 0; i < 7; i++) {
          const diaData = new Date(dataInicio);
          diaData.setDate(dataInicio.getDate() + i);
          const diaStr = diaData.toISOString().split('T')[0];
          
          estatisticasPorDia[diasSemana[i]] = {
            data: diaData,
            agendamentos: agendamentos.filter(a => a.data_agendamento === diaStr).length,
            fechamentos: fechamentos.filter(f => f.data_fechamento === diaStr).length,
            valor: fechamentos
              .filter(f => f.data_fechamento === diaStr)
              .reduce((sum, f) => sum + parseFloat(f.valor_fechado || 0), 0)
          };
        }
      }

      // Calcular comissões
      const mesAtual = new Date().getMonth();
      const anoAtual = new Date().getFullYear();
      
      let comissaoTotalMes = 0;
      let comissaoTotalGeral = 0;

      // Inicializar mapa de consultores com TODOS os consultores
      const consultoresMap = {};
      consultores.forEach(c => {
        consultoresMap[c.nome] = {
          nome: c.nome,
          totalPacientes: 0,
          totalAgendamentos: 0,
          totalFechamentos: 0,
          valorFechado: 0,
          valorFechadoMes: 0,
          comissaoTotal: 0,
          comissaoMes: 0
        };
      });

      // Atualizar estatísticas dos consultores
      pacientes.forEach(p => {
        if (p.consultor_nome && consultoresMap[p.consultor_nome]) {
          consultoresMap[p.consultor_nome].totalPacientes++;
        }
      });

      agendamentos.forEach(a => {
        if (a.consultor_nome && consultoresMap[a.consultor_nome]) {
          consultoresMap[a.consultor_nome].totalAgendamentos++;
        }
      });

      fechamentos.forEach(f => {
        if (f.consultor_nome && consultoresMap[f.consultor_nome]) {
          const valor = parseFloat(f.valor_fechado || 0);
          consultoresMap[f.consultor_nome].totalFechamentos++;
          consultoresMap[f.consultor_nome].valorFechado += valor;
          
          const comissao = calcularComissao(valor);
          consultoresMap[f.consultor_nome].comissaoTotal += comissao;
          comissaoTotalGeral += comissao;

          // Verificar se é do mês atual
          const dataFechamento = new Date(f.data_fechamento);
          if (dataFechamento.getMonth() === mesAtual && dataFechamento.getFullYear() === anoAtual) {
            consultoresMap[f.consultor_nome].valorFechadoMes += valor;
            consultoresMap[f.consultor_nome].comissaoMes += comissao;
            comissaoTotalMes += comissao;
          }
        }
      });

      const consultoresStats = Object.values(consultoresMap);

      setStats({
        totalPacientes: pacientes.length,
        totalAgendamentos: agendamentos.length,
        totalFechamentos: fechamentos.length,
        valorTotalFechamentos: valorTotal,
        agendamentosHoje,
        leadsPorStatus,
        consultoresStats,
        comissaoTotalMes,
        comissaoTotalGeral,
        agendamentosPeriodo,
        fechamentosPeriodo: fechamentosPeriodo.length,
        valorPeriodo,
        novosLeadsPeriodo,
        estatisticasPorDia
      });
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      setLoading(false);
    }
  };

  const fetchRegioesDisponiveis = async () => {
    try {
      const estadosRes = await makeRequest('/clinicas/estados');
      if (estadosRes.ok) {
        const estados = await estadosRes.json();
        setEstadosDisponiveis(estados);
      }
    } catch (error) {
      console.error('Erro ao carregar estados:', error);
    }
  };

  const formatCurrency = (value) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatCurrencyCompact = (value) => {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(1).replace('.', ',')}M`;
    } else if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(0)}k`;
    } else {
      return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
  };

  const formatarMesAno = (data) => {
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                   'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${meses[data.getMonth()]} ${data.getFullYear()}`;
  };

  const navegarMes = (direcao) => {
    const novoMes = new Date(mesAno);
    novoMes.setMonth(mesAno.getMonth() + direcao);
    setMesAno(novoMes);
  };

  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const obterPeriodoTexto = () => {
    let textoBase = '';
    
    if (periodo === 'total') {
      textoBase = 'Todos os dados';
    } else if (periodo === 'semanal') {
      if (subPeriodo) {
        const data = new Date(subPeriodo);
        textoBase = `${diasSemana[data.getDay()]}, ${data.toLocaleDateString('pt-BR')}`;
      } else {
        textoBase = semanaOpcao === 'proxima' ? 'Próxima semana' : 'Semana atual';
      }
    } else if (periodo === 'mensal') {
      textoBase = formatarMesAno(mesAno);
    }

    // Adicionar informação de filtro regional
    const filtrosRegiao = [];
    if (filtroRegiao.estado) filtrosRegiao.push(`${filtroRegiao.estado}`);
    if (filtroRegiao.cidade) filtrosRegiao.push(`${filtroRegiao.cidade}`);
    
    if (filtrosRegiao.length > 0) {
      textoBase += ` - ${filtrosRegiao.join(', ')}`;
    }

    return textoBase;
  };

  const getStatusColor = (status) => {
    const colors = {
      lead: '#f59e0b',
      agendado: '#3b82f6',
      compareceu: '#10b981',
      fechado: '#059669',
      nao_fechou: '#ef4444',
      nao_compareceu: '#f87171',
      reagendado: '#8b5cf6'
    };
    return colors[status] || '#6b7280';
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">
          Bem-vindo, {user?.nome}
          {(filtroRegiao.cidade || filtroRegiao.estado) && (
            <span style={{ 
              marginLeft: '1rem',
              padding: '0.25rem 0.5rem',
              backgroundColor: '#dbeafe',
              color: '#1e40af',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: '500'
            }}>
              📍 Filtrado por região
            </span>
          )}
        </p>
      </div>

      {/* Filtro de Período */}
      <div style={{ 
        marginBottom: '2rem',
        padding: '1rem',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
            Visualizar por:
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => { setPeriodo('total'); setSubPeriodo(null); }}
              className={`btn ${periodo === 'total' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
            >
              Total
            </button>
            <button
              onClick={() => { setPeriodo('semanal'); setSubPeriodo(null); }}
              className={`btn ${periodo === 'semanal' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
            >
              Semanal
            </button>
            <button
              onClick={() => { setPeriodo('mensal'); setSubPeriodo(null); }}
              className={`btn ${periodo === 'mensal' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
            >
              Mensal
            </button>
          </div>
        </div>

        {/* Controles específicos por período */}
        {periodo === 'semanal' && (
          <div style={{ 
            paddingTop: '1rem',
            borderTop: '1px solid #e5e7eb'
          }}>
            {/* Seleção de semana atual/próxima */}
            <div style={{ 
              display: 'flex', 
              gap: '0.5rem', 
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              <span style={{ fontSize: '0.75rem', color: '#6b7280', marginRight: '0.5rem' }}>
                Período:
              </span>
              <button
                onClick={() => { setSemanaOpcao('atual'); setSubPeriodo(null); }}
                className={`btn ${semanaOpcao === 'atual' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
              >
                Semana Atual
              </button>
              <button
                onClick={() => { setSemanaOpcao('proxima'); setSubPeriodo(null); }}
                className={`btn ${semanaOpcao === 'proxima' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
              >
                Próxima Semana
              </button>
            </div>

            {/* Filtrar por dia específico */}
            <div style={{ 
              display: 'flex', 
              gap: '0.5rem', 
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '0.75rem', color: '#6b7280', marginRight: '0.5rem' }}>
                Filtrar por dia:
              </span>
              <button
                onClick={() => setSubPeriodo(null)}
                className={`btn ${!subPeriodo ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
              >
                Semana Completa
              </button>
              {Object.entries(stats.estatisticasPorDia).map(([dia, dados]) => (
                <button
                  key={dia}
                  onClick={() => setSubPeriodo(dados.data)}
                  className={`btn ${subPeriodo && new Date(subPeriodo).getDay() === dados.data.getDay() ? 
                    'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                >
                  {dia}
                </button>
              ))}
            </div>
          </div>
        )}

        {periodo === 'mensal' && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '1rem',
            borderTop: '1px solid #e5e7eb'
          }}>
            <button
              onClick={() => navegarMes(-1)}
              className="btn btn-secondary"
              style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            
            <span style={{ 
              fontSize: '1rem', 
              fontWeight: '600', 
              color: '#1a1d23',
              minWidth: '200px',
              textAlign: 'center'
            }}>
              {formatarMesAno(mesAno)}
            </span>
            
            <button
              onClick={() => navegarMes(1)}
              className="btn btn-secondary"
              style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        )}

        {/* Filtros por Região */}
        <div style={{ 
          marginTop: '1rem',
          paddingTop: '1rem',
          borderTop: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600' }}>
              Filtrar por região:
            </span>
            
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <select
                value={filtroRegiao.estado}
                onChange={(e) => setFiltroRegiao({ ...filtroRegiao, estado: e.target.value, cidade: '' })}
                style={{
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  minWidth: '120px'
                }}
              >
                <option value="">Todos os Estados</option>
                {estadosDisponiveis.map(estado => (
                  <option key={estado} value={estado}>{estado}</option>
                ))}
              </select>

              <select
                value={filtroRegiao.cidade}
                onChange={(e) => setFiltroRegiao({ ...filtroRegiao, cidade: e.target.value })}
                style={{
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  minWidth: '120px'
                }}
                disabled={!filtroRegiao.estado && cidadesDisponiveis.length > 20} // Desabilitar se muitas cidades
              >
                <option value="">Todas as Cidades</option>
                {cidadesDisponiveis.map(cidade => (
                  <option key={cidade} value={cidade}>{cidade}</option>
                ))}
              </select>

              {(filtroRegiao.estado || filtroRegiao.cidade) && (
                <button
                  onClick={() => setFiltroRegiao({ cidade: '', estado: '' })}
                  className="btn btn-secondary"
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                  title="Limpar filtros regionais"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Estatísticas detalhadas por dia (apenas no modo semanal) */}
      {periodo === 'semanal' && !subPeriodo && Object.keys(stats.estatisticasPorDia).length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1a1d23', marginBottom: '1rem' }}>
            Detalhamento por Dia da Semana
          </h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(7, 1fr)', 
            gap: '0.75rem' 
          }}>
            {Object.entries(stats.estatisticasPorDia).map(([dia, dados]) => (
              <div 
                key={dia}
                className="stat-card"
                style={{ 
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  ':hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                  }
                }}
                onClick={() => setSubPeriodo(dados.data)}
              >
                <div style={{ 
                  fontSize: '0.875rem', 
                  fontWeight: '600', 
                  color: '#1a1d23',
                  marginBottom: '0.5rem'
                }}>
                  {dia}
                </div>
                <div style={{ 
                  fontSize: '0.75rem', 
                  color: '#6b7280',
                  marginBottom: '0.75rem'
                }}>
                  {dados.data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                </div>
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '0.25rem',
                  fontSize: '0.75rem'
                }}>
                  <div style={{ color: '#2563eb' }}>
                    <strong>{dados.agendamentos}</strong> agend.
                  </div>
                  <div style={{ color: '#10b981' }}>
                    <strong>{dados.fechamentos}</strong> fech.
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '0.7rem' }}>
                    {formatCurrency(dados.valor)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPIs do Período - Apenas quando não é Total */}
      {periodo !== 'total' && (
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1a1d23', marginBottom: '1rem' }}>
            Resumo do Período - {obterPeriodoTexto()}
          </h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Novos Leads</div>
              <div className="stat-value">{stats.novosLeadsPeriodo}</div>
              <div className="stat-subtitle" style={{ color: '#6b7280' }}>
                No período selecionado
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Agendamentos</div>
              <div className="stat-value">{stats.agendamentosPeriodo}</div>
              <div className="stat-subtitle" style={{ color: '#6b7280' }}>
                No período selecionado
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Fechamentos</div>
              <div className="stat-value">{stats.fechamentosPeriodo}</div>
              <div className="stat-subtitle" style={{ color: '#6b7280' }}>
                No período selecionado
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Valor Fechado</div>
              <div className="stat-value">{formatCurrency(stats.valorPeriodo)}</div>
              <div className="stat-subtitle" style={{ color: '#6b7280' }}>
                No período selecionado
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPIs Principais */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1a1d23', marginBottom: '1rem' }}>
          Totais Gerais
        </h3>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total de Pacientes</div>
            <div className="stat-value">{stats.totalPacientes}</div>
            <div className="stat-change positive">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                <polyline points="17 6 23 6 23 12"></polyline>
              </svg>
              +12% este mês
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Agendamentos</div>
            <div className="stat-value">{stats.totalAgendamentos}</div>
            <div className="stat-change positive">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                <polyline points="17 6 23 6 23 12"></polyline>
              </svg>
              {stats.agendamentosHoje} hoje
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Fechamentos</div>
            <div className="stat-value">{stats.totalFechamentos}</div>
            <div className="stat-change positive">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                <polyline points="17 6 23 6 23 12"></polyline>
              </svg>
              +8% este mês
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Valor Total</div>
            <div className="stat-value">{formatCurrency(stats.valorTotalFechamentos)}</div>
            <div className="stat-change positive">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                <polyline points="17 6 23 6 23 12"></polyline>
              </svg>
              +15% este mês
            </div>
          </div>
        </div>
      </div>

      {/* Cards de Comissão */}
      <div className="stats-grid" style={{ marginTop: '2rem', gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <div className="stat-card" style={{ backgroundColor: '#fef3c7' }}>
          <div className="stat-label">Comissão do Mês</div>
          <div className="stat-value" style={{ color: '#f59e0b' }}>
            {formatCurrency(stats.comissaoTotalMes)}
          </div>
          <div className="stat-subtitle" style={{ color: '#92400e' }}>
            Total de comissões este mês
          </div>
        </div>

        <div className="stat-card" style={{ backgroundColor: '#ede9fe' }}>
          <div className="stat-label">Comissão Total Geral</div>
          <div className="stat-value" style={{ color: '#8b5cf6' }}>
            {formatCurrency(stats.comissaoTotalGeral)}
          </div>
          <div className="stat-subtitle" style={{ color: '#5b21b6' }}>
            Comissões acumuladas
          </div>
        </div>
      </div>

      <div className="grid grid-2" style={{ gap: '2rem' }}>
        {/* Pipeline de Vendas */}
        <div className="card" style={{ minWidth: 0 }}>
          <div className="card-header">
            <h2 className="card-title">Pipeline de Vendas</h2>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {Object.entries(stats.leadsPorStatus).map(([status, count]) => {
                const total = stats.totalPacientes || 1;
                const percentage = (count / total) * 100;
                return (
                  <div key={status}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: '500', textTransform: 'capitalize' }}>
                        {status.replace(/_/g, ' ')}
                      </span>
                      <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        {count} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div style={{ 
                      width: '100%', 
                      height: '8px', 
                      backgroundColor: '#e5e7eb',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${percentage}%`,
                        height: '100%',
                        backgroundColor: getStatusColor(status),
                        transition: 'width 0.5s ease'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Performance dos Consultores */}
        <div className="card" style={{ minWidth: 0 }}>
          <div className="card-header">
            <h2 className="card-title">Performance dos Consultores</h2>
          </div>
          <div className="card-body" style={{ padding: '0' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Consultor</th>
                  <th className="text-center">Pac.</th>
                  <th className="text-center">Agend.</th>
                  <th className="text-center">Fech.</th>
                  <th className="text-right">Valor</th>
                  <th className="text-right">Comissão</th>
                </tr>
              </thead>
              <tbody>
                {stats.consultoresStats.length > 0 ? (
                  stats.consultoresStats.map((consultor, index) => (
                    <tr key={index}>
                      <td className="font-medium">{consultor.nome}</td>
                      <td className="text-center">{consultor.totalPacientes}</td>
                      <td className="text-center">{consultor.totalAgendamentos}</td>
                      <td className="text-center">{consultor.totalFechamentos}</td>
                      <td className="text-right font-semibold">
                        {formatCurrencyCompact(consultor.valorFechado)}
                      </td>
                      <td className="text-right font-semibold" style={{ color: '#059669' }}>
                        {formatCurrencyCompact(consultor.comissaoTotal)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center" style={{ color: '#9ca3af' }}>
                      Nenhum dado disponível
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Gráfico de Conversão */}
      <div className="card" style={{ marginTop: '2rem' }}>
        <div className="card-header">
          <h2 className="card-title">Taxa de Conversão do Funil</h2>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '2rem' }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: '#1a1d23' }}>
                {stats.totalPacientes}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                Leads Totais
              </div>
            </div>

            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>

            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: '#1a1d23' }}>
                {stats.leadsPorStatus.agendado || 0}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                Agendados
              </div>
            </div>

            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>

            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: '#1a1d23' }}>
                {stats.leadsPorStatus.compareceu || 0}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                Compareceram
              </div>
            </div>

            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>

            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: '#059669' }}>
                {stats.leadsPorStatus.fechado || 0}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                Fechados
              </div>
            </div>
          </div>

          <div style={{ 
            marginTop: '2rem', 
            padding: '1rem', 
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            textAlign: 'center' 
          }}>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#059669' }}>
              {stats.totalPacientes > 0 
                ? ((stats.leadsPorStatus.fechado || 0) / stats.totalPacientes * 100).toFixed(1)
                : 0}%
            </div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
              Taxa de Conversão Total
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 