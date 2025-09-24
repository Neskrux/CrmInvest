import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import TutorialOverlay from './TutorialOverlay';
import WelcomeModal from './WelcomeModal';

const Dashboard = () => {
  // Estado separado para KPIs principais (dados filtrados)
  const [kpisPrincipais, setKpisPrincipais] = useState({
    totalPacientes: 0,
    totalAgendamentos: 0,
    totalFechamentos: 0,
    valorTotalFechamentos: 0,
    agendamentosHoje: 0
  });
  const { makeRequest, user, isAdmin, isConsultorInterno, podeVerTodosDados } = useAuth();
  const [periodo, setPeriodo] = useState('total'); // total, semanal, mensal
  const [subPeriodo, setSubPeriodo] = useState(null); // para dias da semana
  const [semanaOpcao, setSemanaOpcao] = useState('atual'); // atual, proxima
  const [mesAno, setMesAno] = useState(new Date()); // para navegação mensal
  const [filtroRegiao, setFiltroRegiao] = useState({ cidade: '', estado: '' });
  const [cidadesDisponiveis, setCidadesDisponiveis] = useState([]);
  const [estadosDisponiveis, setEstadosDisponiveis] = useState([]);
  const [rankingGeral, setRankingGeral] = useState([]);
  const [loadingRanking, setLoadingRanking] = useState(true);
  const [showConsultoresExtrasModal, setShowConsultoresExtrasModal] = useState(false); // Modal dos consultores do 4º em diante
  // Estado para controlar o tutorial
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialCompleted, setTutorialCompleted] = useState(false);
  // Estado para controlar o modal de boas-vindas
  const [showWelcome, setShowWelcome] = useState(false);
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

  // KPIs e dados filtrados: sempre usar as rotas normais (filtradas)
  const [dadosFiltrados, setDadosFiltrados] = useState({ pacientes: [], agendamentos: [], fechamentos: [] });
  const [comissoesFiltradas, setComissoesFiltradas] = useState({ mes: 0, total: 0 });
  const [crescimentosFiltrados, setCrescimentosFiltrados] = useState({
    crescimentoPacientes: 0,
    crescimentoFechamentos: 0,
    crescimentoValor: 0
  });
  const [pipelineFiltrado, setPipelineFiltrado] = useState({});
  useEffect(() => {
    const fetchKPIsPrincipais = async () => {
      try {
        const [pacientesRes, agendamentosRes, fechamentosRes] = await Promise.all([
          makeRequest('/pacientes'),
          makeRequest('/agendamentos'),
          makeRequest('/fechamentos'),
        ]);
        const pacientes = await pacientesRes.json();
        const agendamentos = await agendamentosRes.json();
        const fechamentos = await fechamentosRes.json();
        setDadosFiltrados({ pacientes, agendamentos, fechamentos });
        setKpisPrincipais({
          totalPacientes: pacientes.length,
          totalAgendamentos: agendamentos.length,
          totalFechamentos: fechamentos.filter(f => f.aprovado !== 'reprovado').length,
          valorTotalFechamentos: fechamentos.filter(f => f.aprovado !== 'reprovado').reduce((acc, f) => acc + parseFloat(f.valor_fechado || 0), 0),
          agendamentosHoje: agendamentos.filter(a => a.data_agendamento === new Date().toISOString().split('T')[0]).length
        });
        // Calcular comissões filtradas
        let total = 0, mes = 0;
        const hoje = new Date();
        const mesAtual = hoje.getMonth();
        const anoAtual = hoje.getFullYear();
        fechamentos.filter(f => f.aprovado !== 'reprovado').forEach(f => {
          const valor = parseFloat(f.valor_fechado || 0);
          const comissao = calcularComissao(valor);
          total += comissao;
          const dataFechamento = new Date(f.data_fechamento);
          if (dataFechamento.getMonth() === mesAtual && dataFechamento.getFullYear() === anoAtual) {
            mes += comissao;
          }
        });
        setComissoesFiltradas({ mes, total });
        
        // Calcular crescimentos filtrados
        const mesAnterior = mesAtual === 0 ? 11 : mesAtual - 1;
        const anoMesAnterior = mesAtual === 0 ? anoAtual - 1 : anoAtual;
        
        const isNoMesAtual = (data) => {
          const dataObj = new Date(data);
          return dataObj.getMonth() === mesAtual && dataObj.getFullYear() === anoAtual;
        };
        
        const isNoMesAnterior = (data) => {
          const dataObj = new Date(data);
          return dataObj.getMonth() === mesAnterior && dataObj.getFullYear() === anoMesAnterior;
        };
        
        // Calcular crescimento de pacientes filtrados
        const pacientesNoMesAtual = pacientes.filter(p => isNoMesAtual(p.created_at)).length;
        const pacientesNoMesAnterior = pacientes.filter(p => isNoMesAnterior(p.created_at)).length;
        const crescimentoPacientes = pacientesNoMesAnterior > 0 
          ? ((pacientesNoMesAtual - pacientesNoMesAnterior) / pacientesNoMesAnterior * 100)
          : pacientesNoMesAtual > 0 ? 100 : 0;

        // Calcular crescimento de fechamentos filtrados
        const fechamentosNoMesAtual = fechamentos.filter(f => f.aprovado !== 'reprovado' && isNoMesAtual(f.data_fechamento)).length;
        const fechamentosNoMesAnterior = fechamentos.filter(f => f.aprovado !== 'reprovado' && isNoMesAnterior(f.data_fechamento)).length;
        const crescimentoFechamentos = fechamentosNoMesAnterior > 0 
          ? ((fechamentosNoMesAtual - fechamentosNoMesAnterior) / fechamentosNoMesAnterior * 100)
          : fechamentosNoMesAtual > 0 ? 100 : 0;

        // Calcular crescimento de valor filtrado
        const valorNoMesAtual = fechamentos
          .filter(f => f.aprovado !== 'reprovado' && isNoMesAtual(f.data_fechamento))
          .reduce((sum, f) => sum + parseFloat(f.valor_fechado || 0), 0);
        const valorNoMesAnterior = fechamentos
          .filter(f => f.aprovado !== 'reprovado' && isNoMesAnterior(f.data_fechamento))
          .reduce((sum, f) => sum + parseFloat(f.valor_fechado || 0), 0);
        const crescimentoValor = valorNoMesAnterior > 0 
          ? ((valorNoMesAtual - valorNoMesAnterior) / valorNoMesAnterior * 100)
          : valorNoMesAtual > 0 ? 100 : 0;
        
        setCrescimentosFiltrados({
          crescimentoPacientes,
          crescimentoFechamentos,
          crescimentoValor
        });
        
        // Calcular pipeline filtrado baseado nos dados reais
        const pipeline = pacientes.reduce((acc, p) => {
          acc[p.status] = (acc[p.status] || 0) + 1;
          return acc;
        }, {});
        
        // Corrigir o número de fechados para usar a mesma fonte de dados
        const fechadosReais = fechamentos.filter(f => f.aprovado !== 'reprovado').length;
        pipeline.fechado = fechadosReais;
        
        setPipelineFiltrado(pipeline);
      } catch (error) {
        // fallback: não altera kpisPrincipais
      }
    };
    fetchKPIsPrincipais();
    fetchStats();
    fetchRegioesDisponiveis();
  }, [periodo, subPeriodo, mesAno, semanaOpcao, filtroRegiao]);

  // Verificar se deve mostrar modal de boas-vindas e tutorial
  useEffect(() => {
    if (!user) return; // Aguardar usuário estar logado
    
    const hasSeenWelcome = localStorage.getItem('welcome-completed');
    const hasSeenTutorial = localStorage.getItem('tutorial-completed');
    
    // Mostrar boas-vindas se não viu nem boas-vindas nem tutorial
    // Isso inclui usuários que se cadastraram antes da implementação
    if (!hasSeenWelcome && !hasSeenTutorial) {
      setShowWelcome(true);
    }
  }, [user]);

  // Desabilitar overflow quando modal de boas-vindas estiver ativo
  useEffect(() => {
    if (showWelcome) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup: restaurar overflow quando componente for desmontado
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showWelcome]);

  const handleWelcomeComplete = () => {
    setShowWelcome(false);
    localStorage.setItem('welcome-completed', 'true');
    // Após fechar o modal de boas-vindas, abrir o tutorial
    setShowTutorial(true);
  };

  const handleWelcomeClose = () => {
    setShowWelcome(false);
    localStorage.setItem('welcome-completed', 'true');
  };

  const handleTutorialComplete = () => {
    setShowTutorial(false);
    setTutorialCompleted(true);
    localStorage.setItem('tutorial-completed', 'true');
  };

  const handleTutorialClose = () => {
    setShowTutorial(false);
  };

  const startTutorial = () => {
    setShowTutorial(true);
  };

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
        makeRequest('/dashboard/pacientes'),
        makeRequest('/dashboard/agendamentos'),
        makeRequest('/dashboard/fechamentos'),
        makeRequest('/consultores'),
        makeRequest(`/clinicas?${clinicasParams.toString()}`)
      ]);

      // Para gráfico de cidades e ranking, buscar dados gerais (não filtrados por consultor)
      const [pacientesGeraisRes, agendamentosGeraisRes, fechamentosGeraisRes] = await Promise.all([
        makeRequest('/dashboard/gerais/pacientes'),
        makeRequest('/dashboard/gerais/agendamentos'),
        makeRequest('/dashboard/gerais/fechamentos')
      ]);

      const pacientes = await pacientesRes.json();
      let agendamentos = await agendamentosRes.json();
      let fechamentos = await fechamentosRes.json();
      const consultores = await consultoresRes.json();
      const clinicasFiltradas = await clinicasRes.json();

      // Dados gerais para gráfico de cidades e ranking
      const pacientesGerais = await pacientesGeraisRes.json();
      const agendamentosGerais = await agendamentosGeraisRes.json();
      const fechamentosGerais = await fechamentosGeraisRes.json();


      // Calcular períodos para comparação de crescimento
      const hoje = new Date();
      const mesAtual = hoje.getMonth();
      const anoAtual = hoje.getFullYear();
      
      // Mês anterior
      const mesAnterior = mesAtual === 0 ? 11 : mesAtual - 1;
      const anoMesAnterior = mesAtual === 0 ? anoAtual - 1 : anoAtual;
      
      // Função para verificar se data está no mês atual
      const isNoMesAtual = (data) => {
        const dataObj = new Date(data);
        return dataObj.getMonth() === mesAtual && dataObj.getFullYear() === anoAtual;
      };
      
      // Função para verificar se data está no mês anterior
      const isNoMesAnterior = (data) => {
        const dataObj = new Date(data);
        return dataObj.getMonth() === mesAnterior && dataObj.getFullYear() === anoMesAnterior;
      };

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

      const hojeStr = hoje.toISOString().split('T')[0];
      const agendamentosHoje = agendamentos.filter(a => a.data_agendamento === hojeStr).length;

      // Calcular crescimentos dinâmicos
      const pacientesNoMesAtual = pacientes.filter(p => isNoMesAtual(p.created_at)).length;
      const pacientesNoMesAnterior = pacientes.filter(p => isNoMesAnterior(p.created_at)).length;
      const crescimentoPacientes = pacientesNoMesAnterior > 0 
        ? ((pacientesNoMesAtual - pacientesNoMesAnterior) / pacientesNoMesAnterior * 100)
        : pacientesNoMesAtual > 0 ? 100 : 0;

      const fechamentosNoMesAtual = fechamentos.filter(f => f.aprovado !== 'reprovado' && isNoMesAtual(f.data_fechamento)).length;
      const fechamentosNoMesAnterior = fechamentos.filter(f => f.aprovado !== 'reprovado' && isNoMesAnterior(f.data_fechamento)).length;
      const crescimentoFechamentos = fechamentosNoMesAnterior > 0 
        ? ((fechamentosNoMesAtual - fechamentosNoMesAnterior) / fechamentosNoMesAnterior * 100)
        : fechamentosNoMesAtual > 0 ? 100 : 0;

      const valorNoMesAtual = fechamentos
        .filter(f => f.aprovado !== 'reprovado' && isNoMesAtual(f.data_fechamento))
        .reduce((sum, f) => sum + parseFloat(f.valor_fechado || 0), 0);
      const valorNoMesAnterior = fechamentos
        .filter(f => f.aprovado !== 'reprovado' && isNoMesAnterior(f.data_fechamento))
        .reduce((sum, f) => sum + parseFloat(f.valor_fechado || 0), 0);
      const crescimentoValor = valorNoMesAnterior > 0 
        ? ((valorNoMesAtual - valorNoMesAnterior) / valorNoMesAnterior * 100)
        : valorNoMesAtual > 0 ? 100 : 0;

      const leadsPorStatus = pacientes.reduce((acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
      }, {});

      const valorTotal = fechamentos
        .filter(f => f.aprovado !== 'reprovado')
        .reduce((sum, f) => sum + parseFloat(f.valor_fechado || 0), 0);

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

      const fechamentosPeriodo = dataInicio ? fechamentos
        .filter(f => f.aprovado !== 'reprovado')
        .filter(f => {
          const data = new Date(f.data_fechamento);
          return data >= dataInicio && data <= dataFim;
        }) : fechamentos.filter(f => f.aprovado !== 'reprovado');

      const valorPeriodo = fechamentosPeriodo.reduce((sum, f) => 
        sum + parseFloat(f.valor_fechado || 0), 0
      );

      const novosLeadsPeriodo = dataInicio ? pacientes.filter(p => {
        const data = new Date(p.created_at);
        return data >= dataInicio && data <= dataFim && p.status === 'lead';
      }).length : pacientes.filter(p => p.status === 'lead').length;


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
            fechamentos: fechamentos
              .filter(f => f.aprovado !== 'reprovado')
              .filter(f => f.data_fechamento === diaStr).length,
            valor: fechamentos
              .filter(f => f.aprovado !== 'reprovado')
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
      // Usar dados gerais para gráfico de cidades
      pacientesGerais.forEach(paciente => {
        // Buscar agendamento mais recente do paciente para determinar a cidade
        const agendamentoPaciente = agendamentosGerais.find(a => a.paciente_id === paciente.id);
        let cidade = null;
        
        if (agendamentoPaciente && agendamentoPaciente.clinica_id) {
          const clinica = clinicasMap[agendamentoPaciente.clinica_id];
          if (clinica) {
            cidade = clinica.cidade;
          }
        }
        
        // Se não encontrou cidade pelo agendamento, tentar pelo fechamento
        if (!cidade) {
          const fechamentoPaciente = fechamentosGerais.find(f => f.paciente_id === paciente.id && f.aprovado !== 'reprovado');
          if (fechamentoPaciente && fechamentoPaciente.clinica_id) {
            const clinica = clinicasMap[fechamentoPaciente.clinica_id];
            if (clinica) {
              cidade = clinica.cidade;
            }
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
      
      // Se não há pacientes, mas há fechamentos, criar entradas de cidade baseadas nos fechamentos
      if (pacientesGerais.length === 0 && fechamentosGerais.length > 0) {
        fechamentosGerais
          .filter(f => f.aprovado !== 'reprovado')
          .forEach(fechamento => {
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
                // Não incrementar pacientes aqui, apenas garantir que a cidade existe
              }
            }
          });
      }
      
      
      
      // Agrupar agendamentos por cidade das clínicas
      agendamentosGerais.forEach(agendamento => {
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
      fechamentosGerais
        .filter(f => f.aprovado !== 'reprovado')
        .forEach(fechamento => {
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
      const limiteCidades = window.innerWidth <= 768 ? 3 : 10; // Limitar a 3 cidades em mobile, 10 em desktop
      const agendamentosPorCidadeArray = Object.values(dadosPorCidade)
        .map(item => ({
          ...item,
          total: item.pacientes + item.agendamentos + item.fechamentos,
          conversaoAgendamento: item.pacientes > 0 ? ((item.agendamentos / item.pacientes) * 100).toFixed(1) : 0,
          conversaoFechamento: item.agendamentos > 0 ? ((item.fechamentos / item.agendamentos) * 100).toFixed(1) : 0
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, limiteCidades); // Mostrar top cidades baseado no dispositivo
        
        

      // Calcular comissões
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

      // Atualizar estatísticas dos consultores usando dados gerais para ranking
      pacientesGerais.forEach(p => {
        if (p.consultor_nome && consultoresMap[p.consultor_nome]) {
          consultoresMap[p.consultor_nome].totalPacientes++;
        }
      });

      agendamentosGerais.forEach(a => {
        if (a.consultor_nome && consultoresMap[a.consultor_nome]) {
          consultoresMap[a.consultor_nome].totalAgendamentos++;
        }
      });

      fechamentosGerais
        .filter(f => f.aprovado !== 'reprovado')
        .forEach(f => {
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
        totalFechamentos: fechamentos.filter(f => f.aprovado !== 'reprovado').length,
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
        agendamentosPorCidade: agendamentosPorCidadeArray,
        // Crescimentos dinâmicos
        crescimentoPacientes,
        crescimentoFechamentos,
        crescimentoValor
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

  const formatPercentage = (value) => {
    const absValue = Math.abs(value);
    const signal = value >= 0 ? '+' : '-';
    return `${signal}${absValue.toFixed(1)}%`;
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
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
          <button
            onClick={startTutorial}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              backgroundColor: 'white',
              color: '#374151',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#f9fafb';
              e.target.style.borderColor = '#9ca3af';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'white';
              e.target.style.borderColor = '#d1d5db';
            }}
            title="Ver tutorial do dashboard"
          >
            Ver Tutorial
          </button>
        </div>
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
              data-tutorial="filter-total"
            >
              Total
            </button>
            <button
              onClick={() => { setPeriodo('semanal'); setSubPeriodo(null); }}
              className={`btn ${periodo === 'semanal' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
              data-tutorial="filter-weekly"
            >
              Semanal
            </button>
            <button
              onClick={() => { setPeriodo('mensal'); setSubPeriodo(null); }}
              className={`btn ${periodo === 'mensal' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
              data-tutorial="filter-monthly"
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
              display: window.innerWidth <= 768 ? 'none' : 'flex',
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
        }} data-tutorial="region-filter">
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
            gridTemplateColumns: window.innerWidth <= 768 ? 'repeat(4, 1fr)' : 'repeat(7, 1fr)',
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
      <div style={{ marginBottom: '2rem' }} data-tutorial="main-kpis">
        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1a1d23', marginBottom: '1rem' }}>
          Totais Gerais
        </h3>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total de Pacientes</div>
            <div className="stat-value">{kpisPrincipais.totalPacientes}</div>
            <div className={`stat-change ${(isAdmin ? stats.crescimentoPacientes : crescimentosFiltrados.crescimentoPacientes) >= 0 ? 'positive' : 'negative'}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {(isAdmin ? stats.crescimentoPacientes : crescimentosFiltrados.crescimentoPacientes) >= 0 ? (
                  <>
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                    <polyline points="17 6 23 6 23 12"></polyline>
                  </>
                ) : (
                  <>
                    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline>
                    <polyline points="17 18 23 18 23 12"></polyline>
                  </>
                )}
              </svg>
              {formatPercentage(isAdmin ? stats.crescimentoPacientes : crescimentosFiltrados.crescimentoPacientes)} este mês
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Agendamentos</div>
            <div className="stat-value">{kpisPrincipais.totalAgendamentos}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Fechamentos</div>
            <div className="stat-value">{kpisPrincipais.totalFechamentos}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Valor Total</div>
            <div className="stat-value">{formatCurrency(kpisPrincipais.valorTotalFechamentos)}</div>
            {(isAdmin ? stats.crescimentoValor : crescimentosFiltrados.crescimentoValor) > 0 && (
              <div className="stat-change positive">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                  <polyline points="17 6 23 6 23 12"></polyline>
                </svg>
                {formatPercentage(isAdmin ? stats.crescimentoValor : crescimentosFiltrados.crescimentoValor)} este mês
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cards de Comissão (dados filtrados) */}
      <div className="stats-grid" style={{ marginTop: '2rem', gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <div className="stat-card" style={{ backgroundColor: '#fef3c7' }}>
          <div className="stat-label">Comissão do Mês</div>
          <div className="stat-value" style={{ color: '#f59e0b' }}>
            {formatCurrency(comissoesFiltradas.mes)}
          </div>
          <div className="stat-subtitle" style={{ color: '#92400e' }}>
            Total de comissões este mês
          </div>
        </div>

        <div className="stat-card" style={{ backgroundColor: '#ede9fe' }}>
          <div className="stat-label">Comissão Total Geral</div>
          <div className="stat-value" style={{ color: '#8b5cf6' }}>
            {formatCurrency(comissoesFiltradas.total)}
          </div>
          <div className="stat-subtitle" style={{ color: '#5b21b6' }}>
            Comissões acumuladas
          </div>
        </div>
      </div>

      {/* Gráfico de Pacientes, Agendamentos e Fechamentos por Cidade */}
      {stats.agendamentosPorCidade.length > 0 && (
        <div className="card" style={{ marginTop: '2rem' }} data-tutorial="cities-chart">
          <div className="card-header">
            <h2 className="card-title">Pacientes, Agendamentos e Fechamentos por Cidade</h2>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
              {window.innerWidth <= 768 ? 'Top 3' : 'Top 10'} cidades com mais movimentação no funil de vendas
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
        {/* Pipeline de Vendas (dados filtrados) */}
        <div className="card" style={{ minWidth: 0 }} data-tutorial="sales-pipeline">
          <div className="card-header">
            <h2 className="card-title">Pipeline de Vendas</h2>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {Object.entries(pipelineFiltrado).map(([status, count]) => {
                const total = kpisPrincipais.totalPacientes || 1;
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
        <div className="card" style={{ minWidth: 0 }} data-tutorial="ranking">
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
                  .sort((a, b) => {
                    // 1. Maior valor em vendas (valorFechado)
                    if (b.valorFechado !== a.valorFechado) return b.valorFechado - a.valorFechado;
                    // 2. Maior número de fechamentos
                    if (b.totalFechamentos !== a.totalFechamentos) return b.totalFechamentos - a.totalFechamentos;
                    // 3. Maior número de agendamentos
                    if (b.totalAgendamentos !== a.totalAgendamentos) return b.totalAgendamentos - a.totalAgendamentos;
                    // 4. Maior número de pacientes
                    return b.totalPacientes - a.totalPacientes;
                  });
                
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

                              {/* Estatísticas - apenas em desktop */}
                              <div style={{ 
                                display: window.innerWidth <= 768 ? 'none' : 'flex',
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

                              <button
                                onClick={() => setShowConsultoresExtrasModal(consultor)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: '0.5rem',
                                  borderRadius: '6px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'background-color 0.2s',
                                  minWidth: '40px'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                title="Ver valores financeiros"
                              >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                                  <circle cx="12" cy="12" r="1"></circle>
                                  <circle cx="19" cy="12" r="1"></circle>
                                  <circle cx="5" cy="12" r="1"></circle>
                                </svg>
                              </button>
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

      {/* Gráfico de Conversão (dados filtrados) */}
      <div className="card" style={{ marginTop: '2rem' }} data-tutorial="conversion-rate">
        <div className="card-header">
          <h2 className="card-title">Taxa de Conversão do Funil</h2>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: window.innerWidth <= 768 ? '0.4rem' : '2rem' }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: window.innerWidth <= 768 ? '1rem' : '2rem', fontWeight: '700', color: '#1a1d23' }}>
                {kpisPrincipais.totalPacientes}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                Leads Totais
              </div>
            </div>

            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>

            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: window.innerWidth <= 768 ? '1rem' : '2rem', fontWeight: '700', color: '#1a1d23' }}>
                {pipelineFiltrado.agendado || 0}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                Agendados
              </div>
            </div>

            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>

            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: window.innerWidth <= 768 ? '1rem' : '2rem', fontWeight: '700', color: '#1a1d23' }}>
                {pipelineFiltrado.compareceu || 0}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                Compareceram
              </div>
            </div>

            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>

            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: window.innerWidth <= 768 ? '1rem' : '2rem', fontWeight: '700', color: '#059669' }}>
                {pipelineFiltrado.fechado || 0}
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
              {kpisPrincipais.totalPacientes > 0 
                ? ((pipelineFiltrado.fechado || 0) / kpisPrincipais.totalPacientes * 100).toFixed(1)
                : 0}%
            </div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
              Taxa de Conversão Total
            </div>
          </div>
        </div>
      </div>

      {/* Modal dos Valores Financeiros do Consultor */}
      {showConsultoresExtrasModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowConsultoresExtrasModal(false)}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '2rem',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1e293b', margin: 0 }}>
                💰 Valores Financeiros
              </h3>
              <button
                onClick={() => setShowConsultoresExtrasModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e293b', marginBottom: '0.5rem' }}>
                {showConsultoresExtrasModal.nome}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                {showConsultoresExtrasModal.posicao}ª posição no ranking
              </div>
            </div>

            <div style={{ 
              display: 'grid', 
              gap: '1rem' 
            }}>
              <div style={{
                padding: '1.5rem',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.875rem', color: '#166534', marginBottom: '0.5rem', fontWeight: '600' }}>
                  💵 Valor Total Fechado
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#059669' }}>
                  {formatCurrency(showConsultoresExtrasModal.valorFechado)}
                </div>
              </div>

              <div style={{
                padding: '1.5rem',
                backgroundColor: '#fef3c7',
                border: '1px solid #fde68a',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.875rem', color: '#92400e', marginBottom: '0.5rem', fontWeight: '600' }}>
                  🎯 Comissão Total
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#d97706' }}>
                  {formatCurrency(showConsultoresExtrasModal.comissaoTotal)}
                </div>
              </div>

              <div style={{
                padding: '1rem',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1rem',
                textAlign: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1e293b' }}>
                    {showConsultoresExtrasModal.totalPacientes}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Pacientes</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#3b82f6' }}>
                    {showConsultoresExtrasModal.totalAgendamentos}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Agendamentos</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#10b981' }}>
                    {showConsultoresExtrasModal.totalFechamentos}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Fechamentos</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Welcome Modal */}
      <WelcomeModal
        isOpen={showWelcome}
        onClose={handleWelcomeClose}
        onStartTutorial={handleWelcomeComplete}
      />

      {/* Tutorial Overlay */}
      <TutorialOverlay
        isOpen={showTutorial}
        onClose={handleTutorialClose}
        onComplete={handleTutorialComplete}
      />
    </div>
  );
};

export default Dashboard; 