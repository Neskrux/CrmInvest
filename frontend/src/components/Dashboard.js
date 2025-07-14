import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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
    estatisticasPorDia: {},
    // Estatísticas de pacientes, agendamentos e fechamentos por cidade
    agendamentosPorCidade: []
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

      // Calcular pacientes, agendamentos e fechamentos por cidade
      const dadosPorCidade = {};
      
      // Buscar todas as clínicas se não houver filtro de região
      let todasClinicas = clinicasFiltradas;
      if (!filtroRegiao.cidade && !filtroRegiao.estado) {
        // Se não há filtro de região, buscar todas as clínicas do banco
        try {
          const todasClinicasRes = await makeRequest('/clinicas');
          if (todasClinicasRes.ok) {
            todasClinicas = await todasClinicasRes.json();
          }
        } catch (error) {
          console.error('Erro ao buscar todas as clínicas:', error);
        }
      }

      // Criar mapa de clínicas por ID para facilitar a busca
      const clinicasMap = {};
      todasClinicas.forEach(clinica => {
        clinicasMap[clinica.id] = clinica;
      });
      
      // Agrupar pacientes por cidade (usando a clínica do agendamento mais recente ou primeira clínica)
      pacientes.forEach(paciente => {
        // Buscar agendamento mais recente do paciente para determinar a cidade
        const agendamentoPaciente = agendamentos.find(a => a.paciente_id === paciente.id);
        let cidade = null;
        
        if (agendamentoPaciente && agendamentoPaciente.clinica_id) {
          const clinica = clinicasMap[agendamentoPaciente.clinica_id];
          if (clinica) {
            cidade = clinica.cidade;
          }
        }
        
        if (cidade) {
          if (!dadosPorCidade[cidade]) {
            dadosPorCidade[cidade] = {
              cidade: cidade,
              pacientes: 0,
              agendamentos: 0,
              fechamentos: 0
            };
          }
          dadosPorCidade[cidade].pacientes++;
        }
      });
      
      // Agrupar agendamentos por cidade das clínicas
      agendamentos.forEach(agendamento => {
        if (agendamento.clinica_id) {
          const clinica = clinicasMap[agendamento.clinica_id];
          if (clinica && clinica.cidade) {
            const cidade = clinica.cidade;
            if (!dadosPorCidade[cidade]) {
              dadosPorCidade[cidade] = {
                cidade: cidade,
                pacientes: 0,
                agendamentos: 0,
                fechamentos: 0
              };
            }
            dadosPorCidade[cidade].agendamentos++;
          }
        }
      });

      // Agrupar fechamentos por cidade das clínicas
      fechamentos.forEach(fechamento => {
        if (fechamento.clinica_id) {
          const clinica = clinicasMap[fechamento.clinica_id];
          if (clinica && clinica.cidade) {
            const cidade = clinica.cidade;
            if (!dadosPorCidade[cidade]) {
              dadosPorCidade[cidade] = {
                cidade: cidade,
                pacientes: 0,
                agendamentos: 0,
                fechamentos: 0
              };
            }
            dadosPorCidade[cidade].fechamentos++;
          }
        }
      });

      // Converter para array e ordenar por total (pacientes + agendamentos + fechamentos)
      const agendamentosPorCidadeArray = Object.values(dadosPorCidade)
        .map(item => ({
          ...item,
          total: item.pacientes + item.agendamentos + item.fechamentos,
          conversaoAgendamento: item.pacientes > 0 ? ((item.agendamentos / item.pacientes) * 100).toFixed(1) : 0,
          conversaoFechamento: item.agendamentos > 0 ? ((item.fechamentos / item.agendamentos) * 100).toFixed(1) : 0
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10); // Mostrar apenas top 10 cidades

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
        estatisticasPorDia,
        agendamentosPorCidade: agendamentosPorCidadeArray
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
      reagendado: '#8b5cf6',
      nao_passou_cpf: '#6366f1'
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

      {/* Gráfico de Pacientes, Agendamentos e Fechamentos por Cidade */}
      {stats.agendamentosPorCidade.length > 0 && (
        <div className="card" style={{ marginTop: '2rem' }}>
          <div className="card-header">
            <h2 className="card-title">Pacientes, Agendamentos e Fechamentos por Cidade</h2>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
              Top 10 cidades com mais movimentação no funil de vendas
            </p>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={stats.agendamentosPorCidade}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="cidade" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  interval={0}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => `Cidade: ${value}`}
                  formatter={(value, name, props) => {
                    const labels = {
                      pacientes: 'Pacientes',
                      agendamentos: 'Agendamentos',
                      fechamentos: 'Fechamentos',
                      total: 'Total'
                    };
                    return [value, labels[name] || name];
                  }}
                  labelStyle={{ fontWeight: 'bold' }}
                  contentStyle={{ 
                    backgroundColor: '#f9fafb', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px'
                  }}
                />
                <Legend />
                <Bar dataKey="pacientes" fill="#f59e0b" name="Pacientes" />
                <Bar dataKey="agendamentos" fill="#3b82f6" name="Agendamentos" />
                <Bar dataKey="fechamentos" fill="#059669" name="Fechamentos" />
              </BarChart>
            </ResponsiveContainer>
            
            {/* Tabela de Conversão por Cidade */}
            <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem' }}>
                Taxa de Conversão por Cidade
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                {stats.agendamentosPorCidade.map((cidade, index) => (
                  <div key={index} style={{ 
                    padding: '0.75rem',
                    backgroundColor: 'white',
                    borderRadius: '6px',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                  }}>
                    <div style={{ fontWeight: '600', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                      {cidade.cidade}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Pacientes → Agendamentos:</span>
                        <span style={{ 
                          fontSize: '0.75rem', 
                          fontWeight: '600',
                          color: parseFloat(cidade.conversaoAgendamento) > 50 ? '#059669' : 
                                 parseFloat(cidade.conversaoAgendamento) > 20 ? '#f59e0b' : '#ef4444'
                        }}>
                          {cidade.conversaoAgendamento}%
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Agendamentos → Fechamentos:</span>
                        <span style={{ 
                          fontSize: '0.75rem', 
                          fontWeight: '600',
                          color: parseFloat(cidade.conversaoFechamento) > 50 ? '#059669' : 
                                 parseFloat(cidade.conversaoFechamento) > 20 ? '#f59e0b' : '#ef4444'
                        }}>
                          {cidade.conversaoFechamento}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

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

        {/* Ranking dos Consultores */}
        <div className="card" style={{ minWidth: 0 }}>
          <div className="card-header">
            <h2 className="card-title">🏆 Ranking dos Consultores</h2>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
              Classificação por valor fechado
            </p>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {(() => {
                // Ordenar consultores e calcular posições
                const consultoresOrdenados = [...stats.consultoresStats]
                  .sort((a, b) => b.valorFechado - a.valorFechado);
                
                let posicaoAtual = 0;
                const consultoresComPosicao = consultoresOrdenados.map((consultor) => {
                  const temAtividade = consultor.valorFechado > 0 || 
                                      consultor.totalAgendamentos > 0 || 
                                      consultor.totalPacientes > 0;
                  if (temAtividade) {
                    posicaoAtual++;
                    return { ...consultor, posicao: posicaoAtual, temAtividade };
                  }
                  return { ...consultor, posicao: null, temAtividade };
                });

                // Separar ativos e inativos
                const consultoresAtivos = consultoresComPosicao.filter(c => c.temAtividade);
                const consultoresInativos = consultoresComPosicao.filter(c => !c.temAtividade);

                return (
                  <>
                    {/* Top 3 em destaque */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                      gap: '1rem',
                      marginBottom: '2rem'
                    }}>
                      {consultoresAtivos.slice(0, 3).map((consultor, idx) => (
                        <div 
                          key={idx}
                          style={{
                            padding: '1.5rem',
                            borderRadius: '16px',
                            background: idx === 0 ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' :
                                       idx === 1 ? 'linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)' :
                                                  'linear-gradient(135deg, #fed7aa 0%, #fdba74 100%)',
                            border: '2px solid',
                            borderColor: idx === 0 ? '#fbbf24' :
                                        idx === 1 ? '#9ca3af' : '#fb923c',
                            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                            textAlign: 'center',
                            position: 'relative',
                            overflow: 'hidden'
                          }}
                        >
                          {/* Medalha */}
                          <div style={{ 
                            fontSize: '3rem', 
                            marginBottom: '0.5rem' 
                          }}>
                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                          </div>
                          
                          {/* Nome */}
                          <h3 style={{ 
                            fontSize: '1.25rem', 
                            fontWeight: '700',
                            marginBottom: '0.5rem',
                            color: '#1e293b'
                          }}>
                            {consultor.nome}
                          </h3>
                          
                          {/* Posição */}
                          <div style={{ 
                            fontSize: '0.875rem', 
                            color: '#64748b',
                            marginBottom: '1rem'
                          }}>
                            {idx === 0 ? '👑 Líder do Ranking' :
                             idx === 1 ? '⭐ Vice-líder' : 
                                        '🌟 3º Lugar'}
                          </div>

                          {/* Estatísticas */}
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '0.5rem',
                            marginBottom: '1rem'
                          }}>
                            <div>
                              <div style={{ fontSize: '1.25rem', fontWeight: '700' }}>
                                {consultor.totalPacientes}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                Pacientes
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#3b82f6' }}>
                                {consultor.totalAgendamentos}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                Agendamentos
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#10b981' }}>
                                {consultor.totalFechamentos}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                Fechamentos
                              </div>
                            </div>
                          </div>

                          {/* Valores */}
                          <div style={{ 
                            padding: '1rem', 
                            background: 'rgba(255, 255, 255, 0.8)',
                            borderRadius: '12px',
                            marginTop: '1rem'
                          }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#059669' }}>
                              {formatCurrency(consultor.valorFechado)}
                            </div>
                            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                              Comissão: {formatCurrency(consultor.comissaoTotal)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Restante dos consultores */}
                    {consultoresAtivos.length > 3 && (
                      <div style={{ marginBottom: '2rem' }}>
                        <h4 style={{ 
                          fontSize: '1rem', 
                          fontWeight: '600', 
                          color: '#1e293b',
                          marginBottom: '1rem'
                        }}>
                          Demais Posições
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {consultoresAtivos.slice(3).map((consultor, idx) => (
                            <div 
                              key={idx}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '1rem',
                                background: '#ffffff',
                                borderRadius: '12px',
                                border: '1px solid #e5e7eb',
                                gap: '1rem'
                              }}
                            >
                              <div style={{ 
                                fontSize: '1.25rem', 
                                fontWeight: '600',
                                color: '#6b7280',
                                minWidth: '50px'
                              }}>
                                {consultor.posicao}º
                              </div>
                              
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: '600' }}>{consultor.nome}</div>
                                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                  {consultor.posicao}ª posição
                                </div>
                              </div>

                              <div style={{ 
                                display: 'flex', 
                                gap: '2rem',
                                fontSize: '0.875rem'
                              }}>
                                <div style={{ textAlign: 'center' }}>
                                  <div style={{ fontWeight: '600' }}>{consultor.totalPacientes}</div>
                                  <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>pacientes</div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                  <div style={{ fontWeight: '600', color: '#3b82f6' }}>{consultor.totalAgendamentos}</div>
                                  <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>agendamentos</div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                  <div style={{ fontWeight: '600', color: '#10b981' }}>{consultor.totalFechamentos}</div>
                                  <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>fechamentos</div>
                                </div>
                              </div>

                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: '700', color: '#059669' }}>
                                  {formatCurrency(consultor.valorFechado)}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                  Comissão: {formatCurrency(consultor.comissaoTotal)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Consultores inativos */}
                    {consultoresInativos.length > 0 && (
                      <div>
                        <h4 style={{ 
                          fontSize: '1rem', 
                          fontWeight: '600', 
                          color: '#6b7280',
                          marginBottom: '1rem'
                        }}>
                          💤 Aguardando Primeira Venda
                        </h4>
                        <div style={{ 
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                          gap: '0.75rem'
                        }}>
                          {consultoresInativos.map((consultor, idx) => (
                            <div 
                              key={idx}
                              style={{
                                padding: '1rem',
                                background: '#f8fafc',
                                borderRadius: '8px',
                                border: '1px solid #e2e8f0',
                                textAlign: 'center',
                                opacity: 0.7
                              }}
                            >
                              <div style={{ 
                                fontSize: '1.5rem', 
                                marginBottom: '0.5rem' 
                              }}>
                                ⭕
          </div>
                              <div style={{ fontWeight: '600', color: '#64748b' }}>
                                {consultor.nome}
                              </div>
                              <div style={{ 
                                fontSize: '0.75rem', 
                                color: '#94a3b8',
                                marginTop: '0.25rem'
                              }}>
                                Sem vendas
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
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