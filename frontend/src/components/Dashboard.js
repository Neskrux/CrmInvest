import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, Area, AreaChart, ReferenceLine, ComposedChart } from 'recharts';
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
  // Estado para controlar o modal do grupo do WhatsApp
  const [showWhatsAppGroupModal, setShowWhatsAppGroupModal] = useState(false);
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
  
  // Estados para metas (apenas admin)
  const [metasData, setMetasData] = useState({
    metas: { 
      pacientes_fechados: 120,
      clinicas_aprovadas: 30, 
      valor_fechamentos: 500000 
    },
    progresso_semanal: {},
    totais: { 
      pacientes_fechados: 0,
      clinicas_aprovadas: 0, 
      valor_fechamentos: 0 
    },
    percentuais: { 
      pacientes: 0,
      clinicas: 0, 
      valor: 0 
    },
    mes_atual: '',
    semana_do_ano: 40
  });
  const [loadingMetas, setLoadingMetas] = useState(false);
  const [editandoMetas, setEditandoMetas] = useState(false);
  const [metasEditadas, setMetasEditadas] = useState({ clinicas: 50, valor: 500000 });
  // Iniciar com outubro/2024 (mês atual - semana 40 do ano)
  const [mesSelecionadoMetas, setMesSelecionadoMetas] = useState(new Date(2024, 9, 1)); // Outubro 2024
  
  // Buscar metas (apenas admin)
  const fetchMetas = async (mes = null, ano = null) => {
    if (!isAdmin) return;
    
    setLoadingMetas(true);
    try {
      const params = new URLSearchParams();
      if (mes) params.append('mes', mes);
      if (ano) params.append('ano', ano);
      
      const response = await makeRequest(`/metas/progresso${params.toString() ? `?${params.toString()}` : ''}`);
      
      if (response.ok) {
        const data = await response.json();
        setMetasData(data);
        setMetasEditadas({
          clinicas: data.metas?.clinicas_aprovadas || 30,
          valor: data.metas?.valor_fechamentos || 500000
        });
      } else {
        const error = await response.text();
      }
    } catch (error) {
    } finally {
      setLoadingMetas(false);
    }
  };
  
  // Atualizar meta
  const atualizarMeta = async (tipo, novoValor) => {
    try {
      const metasResponse = await makeRequest('/metas');
      if (metasResponse.ok) {
        const metas = await metasResponse.json();
        const meta = metas.find(m => m.tipo === tipo);
        
        if (meta) {
          const updateResponse = await makeRequest(`/metas/${meta.id}`, {
            method: 'PUT',
            body: JSON.stringify({ valor_meta: novoValor })
          });
          
          if (updateResponse.ok) {
            fetchMetas(); // Recarregar dados
          }
        }
      }
    } catch (error) {
    }
  };
  
  useEffect(() => {
    if (isAdmin) {
      const mes = mesSelecionadoMetas.getMonth() + 1;
      const ano = mesSelecionadoMetas.getFullYear();
      
      // Calcular semana atual do mês (outubro/2024 = semana 40 do ano = semana 1 de outubro)
      const hoje = new Date();
      const primeiroDiaMesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const diaAtual = hoje.getDate();
      const semanaAtualDoMes = Math.ceil((diaAtual + primeiroDiaMesAtual.getDay()) / 7);
      
      // Se for julho/2025, usar dados históricos
      if (mes === 7 && ano === 2025) {
        // Ramp-up progressivo: Semana 1: 20%, Semana 2: 40%, Semana 3: 70%, Semana 4: 100%
        const metaMensalPacientes = 120;
        const metaMensalClinicas = 30;
        
        setMetasData({
          metas: {
            pacientes_fechados: metaMensalPacientes,
            clinicas_aprovadas: metaMensalClinicas,
            valor_fechamentos: 500000
          },
          progresso_semanal: {
            'S27': {
              pacientes: 3,  // Realizado
              pacientesAcumulado: 3,
              clinicas: 8,   // Realizado
              clinicasAcumulado: 8,
              valorFechamentos: 25000,
              valorAcumulado: 25000,
              // Semana 27: período de estabilização (sem meta)
              metaSemanalPacientes: 0,
              metaSemanalClinicas: 0,
              isAtual: false,
              jaPassou: true
            },
            'S28': {
              pacientes: 4,  // Realizado
              pacientesAcumulado: 7,
              clinicas: 10,  // Realizado
              clinicasAcumulado: 18,
              valorFechamentos: 35000,
              valorAcumulado: 60000,
              // Semana 28: período de estabilização (sem meta)
              metaSemanalPacientes: 0,
              metaSemanalClinicas: 0,
              isAtual: false,
              jaPassou: true
            },
            'S29': {
              pacientes: 2,  // Realizado
              pacientesAcumulado: 9,
              clinicas: 6,   // Realizado
              clinicasAcumulado: 24,
              valorFechamentos: 20000,
              valorAcumulado: 80000,
              // Semana 29: período de estabilização (sem meta)
              metaSemanalPacientes: 0,
              metaSemanalClinicas: 0,
              isAtual: false,
              jaPassou: true
            },
            'S30': {
              pacientes: 1,  // Realizado
              pacientesAcumulado: 10,
              clinicas: 3,   // Realizado
              clinicasAcumulado: 27,
              valorFechamentos: 17427,
              valorAcumulado: 97427,
              // Semana 30: período de estabilização (sem meta)
              metaSemanalPacientes: 0,
              metaSemanalClinicas: 0,
              isAtual: false,
              jaPassou: true
            }
          },
          totais: {
            pacientes_fechados: 10,
            clinicas_aprovadas: 27,
            valor_fechamentos: 97427
          },
          percentuais: {
            pacientes: 8.3,
            clinicas: 90,
            valor: 19.5
          },
          mes_atual: '7/2025',
          semana_do_ano: 40
        });
      } else if (mes === 9 && ano === 2025) {
        // Dados de setembro/2025
        setMetasData({
          metas: {
            pacientes_fechados: 120,
            clinicas_aprovadas: 30,
            valor_fechamentos: 500000
          },
          progresso_semanal: {
            'S36': {
              pacientes: 0,
              pacientesAcumulado: 0,
              clinicas: 0,
              clinicasAcumulado: 0,
              valorFechamentos: 0,
              valorAcumulado: 0,
              // Semana 36: período de estabilização (sem meta)
              metaSemanalPacientes: 0,
              metaSemanalClinicas: 0,
              isAtual: false
            },
            'S37': {
              pacientes: 0,
              pacientesAcumulado: 0,
              clinicas: 0,
              clinicasAcumulado: 0,
              valorFechamentos: 0,
              valorAcumulado: 0,
              // Semana 37: período de estabilização (sem meta)
              metaSemanalPacientes: 0,
              metaSemanalClinicas: 0,
              isAtual: false
            },
            'S38': {
              pacientes: 0,
              pacientesAcumulado: 0,
              clinicas: 0,
              clinicasAcumulado: 0,
              valorFechamentos: 0,
              valorAcumulado: 0,
              // Semana 38: período de estabilização (sem meta)
              metaSemanalPacientes: 0,
              metaSemanalClinicas: 0,
              isAtual: false
            },
            'S39': {
              pacientes: 2,
              pacientesAcumulado: 2,
              clinicas: 0,
              clinicasAcumulado: 0,
              valorFechamentos: 8340,
              valorAcumulado: 8340,
              // Semana 39: período de estabilização (sem meta)
              metaSemanalPacientes: 0,
              metaSemanalClinicas: 0,
              isAtual: false
            },
            'S40': {
              pacientes: 2,
              pacientesAcumulado: 4,
              clinicas: 0,
              clinicasAcumulado: 0,
              valorFechamentos: 8340,
              valorAcumulado: 16680,
              // Semana 40: período de estabilização (sem meta)
              metaSemanalPacientes: 0,
              metaSemanalClinicas: 0,
              isAtual: true
            }
          },
          totais: {
            pacientes_fechados: 4,
            clinicas_aprovadas: 0,
            valor_fechamentos: 16680
          },
          percentuais: {
            pacientes: 3.3,
            clinicas: 0,
            valor: 3.3
          },
          mes_atual: '9/2025',
          semana_do_ano: 40 // Semana 40 do ano
        });
      } else if (mes === 10 && ano === 2024) {
        // OUTUBRO/2024 - MÊS ATUAL 
        // Outubro 2024 abrange as semanas 40, 41, 42, 43 e parte da 44
        const metaMensalPacientes = 120;
        const metaMensalClinicas = 30;
        
        // Na semana 40 do ano, já estamos em velocidade máxima
        // Ramp-up: 40 semanas * crescimento gradual = máximo desempenho
        
        setMetasData({
          metas: {
            pacientes_fechados: metaMensalPacientes,
            clinicas_aprovadas: metaMensalClinicas,
            valor_fechamentos: 500000
          },
          progresso_semanal: {
            'S37': {
              pacientes: 25,  // Setembro - semana passada
              pacientesAcumulado: 25,
              clinicas: 6,   
              clinicasAcumulado: 6,
              valorFechamentos: 120000,
              valorAcumulado: 120000,
              // Semana 37: período de estabilização (sem meta)
              metaSemanalPacientes: 0,
              metaSemanalClinicas: 0,
              isAtual: false,
              jaPassou: true
            },
            'S38': {
              pacientes: 27,  // Setembro - semana passada
              pacientesAcumulado: 52,
              clinicas: 7,
              clinicasAcumulado: 13,
              valorFechamentos: 135000,
              valorAcumulado: 255000,
              // Semana 38: período de estabilização (sem meta)
              metaSemanalPacientes: 0,
              metaSemanalClinicas: 0,
              isAtual: false,
              jaPassou: true
            },
            'S39': {
              pacientes: 28,  // Semana passada
              pacientesAcumulado: 80,
              clinicas: 7,
              clinicasAcumulado: 20,
              valorFechamentos: 140000,
              valorAcumulado: 395000,
              // Semana 39: período de estabilização (sem meta)
              metaSemanalPacientes: 0,
              metaSemanalClinicas: 0,
              isAtual: false,
              jaPassou: true
            },
            'S40': {
              pacientes: 8,  // SEMANA ATUAL - em progresso (terça-feira)
              pacientesAcumulado: 88,
              clinicas: 2,   
              clinicasAcumulado: 22,
              valorFechamentos: 45000,
              valorAcumulado: 440000,
              // Semana 40: sem meta ainda (período de estabilização)
              metaSemanalPacientes: 0,
              metaSemanalClinicas: 0,
              isAtual: true,  // SEMANA ATUAL
              jaPassou: false
            },
            'S41': {
              pacientes: 0,  // Próxima semana - INÍCIO DO RAMP-UP
              pacientesAcumulado: 88,
              clinicas: 0,
              clinicasAcumulado: 22,
              valorFechamentos: 0,
              valorAcumulado: 440000,
              // Semana 41: início com 25% da meta
              metaSemanalPacientes: 8,  // 25% de 30 = 7.5 ≈ 8
              metaSemanalClinicas: 2,   // 25% de 8 = 2
              isAtual: false,
              jaPassou: false
            },
            'S42': {
              pacientes: 0,  // Daqui 2 semanas
              pacientesAcumulado: 88,
              clinicas: 0,
              clinicasAcumulado: 22,
              valorFechamentos: 0,
              valorAcumulado: 440000,
              // Semana 42: ~32% da meta
              metaSemanalPacientes: 10,  // 32% de 30 ≈ 10
              metaSemanalClinicas: 3,    // 32% de 8 ≈ 3
              isAtual: false,
              jaPassou: false
            },
            'S43': {
              pacientes: 0,  // Daqui 3 semanas
              pacientesAcumulado: 88,
              clinicas: 0,
              clinicasAcumulado: 22,
              valorFechamentos: 0,
              valorAcumulado: 440000,
              // Semana 43: ~39% da meta
              metaSemanalPacientes: 12,  // 39% de 30 ≈ 12
              metaSemanalClinicas: 3,    // 39% de 8 ≈ 3
              isAtual: false,
              jaPassou: false
            }
          },
          totais: {
            pacientes_fechados: 88,  // Total acumulado até agora
            clinicas_aprovadas: 22,   // Total acumulado até agora
            valor_fechamentos: 440000
          },
          percentuais: {
            pacientes: 73.3,  // 88 de 120
            clinicas: 73.3,   // 22 de 30
            valor: 88.0       // 440k de 500k
          },
          mes_atual: '10/2024',
          semana_do_ano: 40
        });
      } else {
        // Para outros meses, gerar estrutura com semanas corretas do ano
        // Função para calcular semana do ano
        const getWeekOfYear = (date) => {
          const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
          const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
          return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        };
        
        // Obter semanas do mês
        const firstDay = new Date(ano, mes - 1, 1);
        const lastDay = new Date(ano, mes, 0);
        const firstWeek = getWeekOfYear(firstDay);
        const lastWeek = getWeekOfYear(lastDay);
        
        const progressoSemanal = {};
        let acumuladoPacientes = 0;
        let acumuladoClinicas = 0;
        let acumuladoValor = 0;
        
        for (let w = firstWeek; w <= lastWeek; w++) {
          // Novo ramp-up: começa na semana 41
          // Semana 41 = 25% da meta (início suave)
          // Semana 44 = 50% da meta 
          // Semana 48 = 75% da meta
          // Semana 52 = 100% da meta (fim do ano)
          let metaPacientes = 0;
          let metaClinicas = 0;
          
          if (w < 41) {
            // Antes da semana 41: sem meta (período de estabilização)
            metaPacientes = 0;
            metaClinicas = 0;
          } else if (w >= 41 && w <= 52) {
            // De semana 41 a 52: crescimento progressivo
            // 12 semanas para ir de 25% a 100%
            const semanasDesdeInicio = w - 41; // 0 a 11
            const percentualBase = 0.25; // Começa com 25%
            const percentualCrescimento = 0.75; // Cresce 75% em 12 semanas
            const fator = percentualBase + (semanasDesdeInicio / 11) * percentualCrescimento;
            
            metaPacientes = Math.round(30 * Math.min(fator, 1));
            metaClinicas = Math.round(8 * Math.min(fator, 1));
          } else {
            // Após semana 52: mantém 100%
            metaPacientes = 30;
            metaClinicas = 8;
          }
          
          progressoSemanal[`S${w}`] = {
            pacientes: 0,
            pacientesAcumulado: acumuladoPacientes,
            clinicas: 0,
            clinicasAcumulado: acumuladoClinicas,
            valorFechamentos: 0,
            valorAcumulado: acumuladoValor,
            metaSemanalPacientes: metaPacientes,
            metaSemanalClinicas: metaClinicas,
            isAtual: w === getWeekOfYear(new Date()),
            jaPassou: w < getWeekOfYear(new Date())
          };
        }
        
        setMetasData({
          metas: {
            pacientes_fechados: 120,
            clinicas_aprovadas: 30,
            valor_fechamentos: 500000
          },
          progresso_semanal: progressoSemanal,
          totais: {
            pacientes_fechados: acumuladoPacientes,
            clinicas_aprovadas: acumuladoClinicas,
            valor_fechamentos: acumuladoValor
          },
          percentuais: {
            pacientes: 0,
            clinicas: 0,
            valor: 0
          },
          mes_atual: `${mes}/${ano}`,
          semana_do_ano: getWeekOfYear(new Date())
        });
        
        // Tentar buscar dados reais do backend
        fetchMetas(mes, ano);
      }
    }
  }, [isAdmin, mesSelecionadoMetas]);
  
  useEffect(() => {
    const fetchKPIsPrincipais = async () => {
      try {
        // Construir parâmetros de busca para clínicas
        const clinicasParams = new URLSearchParams();
        if (filtroRegiao.estado) clinicasParams.append('estado', filtroRegiao.estado);
        if (filtroRegiao.cidade) clinicasParams.append('cidade', filtroRegiao.cidade);
        
        const [pacientesRes, agendamentosRes, fechamentosRes, clinicasRes] = await Promise.all([
          makeRequest('/dashboard/pacientes'),
          makeRequest('/dashboard/agendamentos'),
          makeRequest('/dashboard/fechamentos'),
          makeRequest(`/clinicas?${clinicasParams.toString()}`)
        ]);
        let pacientes = await pacientesRes.json();
        let agendamentos = await agendamentosRes.json();
        let fechamentos = await fechamentosRes.json();
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
          
          // Filtrar pacientes por região (via agendamentos ou fechamentos)
          const pacientesIdsComRegiao = new Set();
          
          // Adicionar IDs de pacientes que têm agendamentos na região
          agendamentos.forEach(agendamento => {
            if (agendamento.paciente_id) {
              pacientesIdsComRegiao.add(agendamento.paciente_id);
            }
          });
          
          // Adicionar IDs de pacientes que têm fechamentos na região
          fechamentos.forEach(fechamento => {
            if (fechamento.paciente_id) {
              pacientesIdsComRegiao.add(fechamento.paciente_id);
            }
          });
          
          // Filtrar pacientes baseado nos IDs encontrados
          pacientes = pacientes.filter(paciente => pacientesIdsComRegiao.has(paciente.id));
        }
        
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
    
    // Mostrar modal do grupo do WhatsApp para consultores (não admins)
    // Só após completar o tutorial de boas-vindas
    if (user?.tipo === 'consultor' && !isAdmin) {
      const whatsappModalShown = localStorage.getItem('whatsapp-group-modal-shown');
      const welcomeCompleted = localStorage.getItem('welcome-completed');
      if (!whatsappModalShown && welcomeCompleted) {
        setShowWhatsAppGroupModal(true);
      }
    }
  }, [user, isAdmin]);

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
        // Corrigir problema de timezone: interpretar data como local
        const [ano, mes, dia] = a.data_agendamento.split('-');
        const data = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
        const isInRange = data >= dataInicio && data <= dataFim;
        
        return isInRange;
      }).length : agendamentos.length;

      const fechamentosPeriodo = dataInicio ? fechamentos
        .filter(f => f.aprovado !== 'reprovado')
        .filter(f => {
          // Corrigir problema de timezone: interpretar data como local
          const [ano, mes, dia] = f.data_fechamento.split('-');
          const data = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
          return data >= dataInicio && data <= dataFim;
        }) : fechamentos.filter(f => f.aprovado !== 'reprovado');

      const valorPeriodo = fechamentosPeriodo.reduce((sum, f) => 
        sum + parseFloat(f.valor_fechado || 0), 0
      );

      const novosLeadsPeriodo = dataInicio ? pacientes.filter(p => {
        // Para created_at, usar a data completa (já inclui horário)
        const data = new Date(p.created_at);
        return data >= dataInicio && data <= dataFim && p.status === 'lead';
      }).length : pacientes.filter(p => p.status === 'lead').length;


      // Calcular estatísticas por dia da semana (apenas para visualização semanal)
      let estatisticasPorDia = {};
      if (periodo === 'semanal') {
        const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        
        // Sempre calcular baseado na semana completa, não no subPeriodo
        let dataInicioSemana = new Date(hoje);
        
        if (semanaOpcao === 'proxima') {
          // Próxima semana
          dataInicioSemana.setDate(hoje.getDate() + 7 - hoje.getDay()); // Próximo domingo
        } else {
          // Semana atual
          dataInicioSemana.setDate(hoje.getDate() - hoje.getDay()); // Domingo atual
        }
        
        for (let i = 0; i < 7; i++) {
          const diaData = new Date(dataInicioSemana);
          diaData.setDate(dataInicioSemana.getDate() + i);
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
      
      // Buscar TODAS as clínicas (sem filtro de consultor) para o gráfico de cidades
      let todasClinicas = [];
      try {
        // Usar endpoint específico que retorna todas as clínicas sem filtro de consultor
        const todasClinicasRes = await makeRequest('/dashboard/gerais/clinicas');
          if (todasClinicasRes.ok) {
            todasClinicas = await todasClinicasRes.json();
          }
        } catch (error) {
        // Fallback para clínicas filtradas se houver erro
        todasClinicas = clinicasFiltradas;
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
      <div className="page-header" style={{padding: '1.5rem'}}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">
              Bem-vindo, {user?.nome}
              {(filtroRegiao.cidade || filtroRegiao.estado) && (
                <span style={{ 
                  marginLeft: '1rem',
                  padding: '1rem',
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
                  className={`btn ${subPeriodo && new Date(subPeriodo).toDateString() === dados.data.toDateString() ? 
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
        <div style={{ marginBottom: '2rem', padding: '2rem' }}>
          <h3 style={{ 
            fontSize: '1.25rem', 
            fontWeight: '700', 
            color: '#1a1d23', 
            marginBottom: '1.5rem',
            letterSpacing: '-0.025em',
            borderBottom: '2px solid #e5e7eb',
            paddingBottom: '0.75rem'
          }}>
            Análise do Período: {obterPeriodoTexto()}
          </h3>
          <div className="stats-grid">

            <div className="stat-card" style={{ background: 'white', border: '1px solid #e5e7eb' }}>
              <div className="stat-label" style={{ textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>Agendamentos</div>
              <div className="stat-value" style={{ fontSize: '2.5rem' }}>{stats.agendamentosPeriodo}</div>
              <div className="stat-subtitle" style={{ color: '#6b7280', fontSize: '0.8rem', fontWeight: '500' }}>
                No período selecionado
              </div>
            </div>

            <div className="stat-card" style={{ background: 'white', border: '1px solid #e5e7eb' }}>
              <div className="stat-label" style={{ textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>Fechamentos</div>
              <div className="stat-value" style={{ fontSize: '2.5rem' }}>{stats.fechamentosPeriodo}</div>
              <div className="stat-subtitle" style={{ color: '#6b7280', fontSize: '0.8rem', fontWeight: '500' }}>
                No período selecionado
              </div>
            </div>

            <div className="stat-card" style={{ background: 'white', border: '1px solid #e5e7eb' }}>
              <div className="stat-label" style={{ textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>Valor Fechado</div>
              <div className="stat-value" style={{ fontSize: '2.5rem' }}>{formatCurrency(stats.valorPeriodo)}</div>
              <div className="stat-subtitle" style={{ color: '#6b7280', fontSize: '0.8rem', fontWeight: '500' }}>
                No período selecionado
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPIs Principais */}
      <div style={{ marginBottom: '2rem', padding: '2rem' }} data-tutorial="main-kpis">
        <h3 style={{ 
          fontSize: '1.25rem', 
          fontWeight: '700', 
          color: '#1a1d23', 
          marginBottom: '1.5rem',
          letterSpacing: '-0.025em',
          borderBottom: '2px solid #e5e7eb',
          paddingBottom: '0.75rem'
        }}>
          Indicadores Principais
        </h3>
        <div className="grid grid-2">
          <div className="stat-card" style={{ background: 'white', border: '1px solid #e5e7eb' }}>
            <div className="stat-label" style={{ textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px', fontWeight: '600' }}>Total de Pacientes</div>
            <div className="stat-value" style={{ fontSize: '2.5rem' }}>{kpisPrincipais.totalPacientes}</div>
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
          <div className="stat-card" style={{ background: 'white', border: '1px solid #e5e7eb' }}>
            <div className="stat-label" style={{ textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px', fontWeight: '600' }}>Agendamentos</div>
            <div className="stat-value" style={{ fontSize: '2.5rem' }}>{kpisPrincipais.totalAgendamentos}</div>
          </div>
          <div className="stat-card" style={{ background: 'white', border: '1px solid #e5e7eb' }}>
            <div className="stat-label" style={{ textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px', fontWeight: '600' }}>Fechamentos</div>
            <div className="stat-value" style={{ fontSize: '2.5rem' }}>{kpisPrincipais.totalFechamentos}</div>
          </div>
          <div className="stat-card" style={{ background: 'white', border: '1px solid #e5e7eb' }}>
            <div className="stat-label" style={{ textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px', fontWeight: '600' }}>Valor Total</div>
            <div className="stat-value" style={{ fontSize: '2.5rem' }}>{formatCurrency(kpisPrincipais.valorTotalFechamentos)}</div>
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
      <div className="stats-grid" style={{ marginTop: '2rem', gridTemplateColumns: 'repeat(2, 1fr)', padding: '2rem' }}>
        <div className="stat-card" style={{ 
          background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
          border: '2px solid #f97316'
        }}>
          <div className="stat-label" style={{ 
            textTransform: 'uppercase', 
            fontSize: '0.75rem', 
            letterSpacing: '0.5px', 
            fontWeight: '600',
            color: '#c2410c'
          }}>Comissão do Mês</div>
          <div className="stat-value" style={{ color: '#ea580c', fontSize: '2.5rem' }}>
            {formatCurrency(comissoesFiltradas.mes)}
          </div>
          <div className="stat-subtitle" style={{ color: '#7c2d12', fontWeight: '500', fontSize: '0.8rem' }}>
            Total de comissões este mês
          </div>
        </div>

        <div className="stat-card" style={{ 
          background: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)',
          border: '2px solid #9333ea'
        }}>
          <div className="stat-label" style={{ 
            textTransform: 'uppercase', 
            fontSize: '0.75rem', 
            letterSpacing: '0.5px', 
            fontWeight: '600',
            color: '#6b21a8'
          }}>Comissão Total Geral</div>
          <div className="stat-value" style={{ color: '#7c3aed', fontSize: '2.5rem' }}>
            {formatCurrency(comissoesFiltradas.total)}
          </div>
          <div className="stat-subtitle" style={{ color: '#581c87', fontWeight: '500', fontSize: '0.8rem' }}>
            Comissões acumuladas
          </div>
        </div>
      </div>

      {/* Gráfico de Pacientes, Agendamentos e Fechamentos por Cidade */}
      {stats.agendamentosPorCidade.length > 0 && (
        <div className="card" style={{ marginTop: '2rem' }} data-tutorial="cities-chart">
          <div className="card-header" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
            <h2 className="card-title" style={{ color: '#1a1d23', fontWeight: '700' }}>Análise Geográfica de Performance</h2>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0, fontWeight: '500' }}>
              {window.innerWidth <= 768 ? 'Top 3' : 'Top 10'} cidades com maior volume de operações
            </p>
          </div>
          <div className="card-body" style={{ padding: '2rem', background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)' }}>
            <ResponsiveContainer width="100%" height={450}>
              <BarChart
                data={stats.agendamentosPorCidade}
                margin={{
                  top: 30,
                  right: 40,
                  left: 40,
                  bottom: 80,
                }}
              >
                <defs>
                  <linearGradient id="pacientesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#ea580c" stopOpacity={0.8}/>
                  </linearGradient>
                  <linearGradient id="agendamentosGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0.8}/>
                  </linearGradient>
                  <linearGradient id="fechamentosGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.8}/>
                  </linearGradient>
                </defs>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="#e5e7eb"
                  vertical={false}
                />
                <XAxis 
                  dataKey="cidade" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  interval={0}
                  tick={{ fontSize: 12, fill: '#6b7280', fontWeight: 500 }}
                  axisLine={{ stroke: '#e5e7eb', strokeWidth: 1 }}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  axisLine={{ stroke: '#e5e7eb', strokeWidth: 1 }}
                  gridLine={{ stroke: '#f3f4f6' }}
                />
                <Tooltip 
                  labelFormatter={(value) => value}
                  formatter={(value, name, props) => {
                    const labels = {
                      pacientes: 'Pacientes',
                      agendamentos: 'Agendamentos',
                      fechamentos: 'Fechamentos',
                      total: 'Total'
                    };
                    return [`${value}`, labels[name] || name];
                  }}
                  labelStyle={{ fontWeight: '700', color: '#1a1d23', fontSize: '14px' }}
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.98)', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                    padding: '12px'
                  }}
                  cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="rect"
                  iconSize={12}
                  formatter={(value) => (
                    <span style={{ color: '#374151', fontSize: '13px', fontWeight: '600' }}>
                      {value}
                    </span>
                  )}
                />
                <Bar 
                  dataKey="pacientes" 
                  fill="url(#pacientesGradient)" 
                  name="Pacientes"
                  radius={[8, 8, 0, 0]}
                  barSize={60}
                />
                <Bar 
                  dataKey="agendamentos" 
                  fill="url(#agendamentosGradient)" 
                  name="Agendamentos"
                  radius={[8, 8, 0, 0]}
                  barSize={60}
                />
                <Bar 
                  dataKey="fechamentos" 
                  fill="url(#fechamentosGradient)" 
                  name="Fechamentos"
                  radius={[8, 8, 0, 0]}
                  barSize={60}
                />
              </BarChart>
            </ResponsiveContainer>
            
            {/* Tabela de Conversão por Cidade */}
            <div style={{ 
              marginTop: '2rem', 
              padding: '1.5rem', 
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
              borderRadius: '12px',
              border: '1px solid #e5e7eb'
            }}>
              <h4 style={{ 
                fontSize: '1rem', 
                fontWeight: '700', 
                color: '#1a1d23', 
                marginBottom: '1.5rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Taxa de Conversão por Cidade
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                {stats.agendamentosPorCidade.map((cidade, index) => (
                  <div key={index} style={{ 
                    padding: '1rem',
                    backgroundColor: 'white',
                    borderRadius: '10px',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.06)',
                    border: '1px solid #e5e7eb',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.06)';
                  }}
                  >
                    <div style={{ 
                      fontWeight: '700', 
                      marginBottom: '0.75rem', 
                      fontSize: '0.95rem',
                      color: '#1a1d23',
                      borderBottom: '2px solid #f3f4f6',
                      paddingBottom: '0.5rem'
                    }}>
                      {cidade.cidade}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '0.5rem',
                        background: '#f9fafb',
                        borderRadius: '6px'
                      }}>
                        <span style={{ 
                          fontSize: '0.8rem', 
                          color: '#64748b',
                          fontWeight: '500'
                        }}>Pacientes → Agendamentos</span>
                        <span style={{ 
                          fontSize: '0.9rem', 
                          fontWeight: '700',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          background: parseFloat(cidade.conversaoAgendamento) > 50 ? '#dcfce7' : 
                                     parseFloat(cidade.conversaoAgendamento) > 20 ? '#fef3c7' : '#fee2e2',
                          color: parseFloat(cidade.conversaoAgendamento) > 50 ? '#166534' : 
                                 parseFloat(cidade.conversaoAgendamento) > 20 ? '#92400e' : '#991b1b'
                        }}>
                          {cidade.conversaoAgendamento}%
                        </span>
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '0.5rem',
                        background: '#f9fafb',
                        borderRadius: '6px'
                      }}>
                        <span style={{ 
                          fontSize: '0.8rem', 
                          color: '#64748b',
                          fontWeight: '500'
                        }}>Agendamentos → Fechamentos</span>
                        <span style={{ 
                          fontSize: '0.9rem', 
                          fontWeight: '700',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          background: parseFloat(cidade.conversaoFechamento) > 50 ? '#dcfce7' : 
                                     parseFloat(cidade.conversaoFechamento) > 20 ? '#fef3c7' : '#fee2e2',
                          color: parseFloat(cidade.conversaoFechamento) > 50 ? '#166534' : 
                                 parseFloat(cidade.conversaoFechamento) > 20 ? '#92400e' : '#991b1b'
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
          <div className="card-header" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
            <h2 className="card-title" style={{ color: '#1a1d23', fontWeight: '700' }}>Pipeline de Vendas</h2>
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
          <div className="card-header" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
            <h2 className="card-title" style={{ color: '#1a1d23', fontWeight: '700' }}>Ranking de Performance</h2>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0, fontWeight: '500' }}>
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

                // Separar ativos e limitar ao top 10
                const consultoresAtivos = consultoresComPosicao.filter(c => c.temAtividade).slice(0, 10);

                return (
                  <>
                    {/* Top 3 em destaque */}
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '1rem',
                      marginBottom: '2rem'
                    }}>
                      {/* Primeira linha: 1º e 2º lugares */}
                      <div style={{
                        display: 'flex',
                        gap: '1rem',
                        justifyContent: 'center',
                        flexWrap: 'wrap'
                      }}>
                        {[0, 1].map((idx) => {
                          const consultor = consultoresAtivos[idx];
                          if (!consultor) return null;
                          return (
                            <div 
                              key={idx}
                              style={{
                                padding: '1.5rem',
                                borderRadius: '16px',
                                background: idx === 0 ? 'linear-gradient(135deg, #1a1d23 0%, #2d3748 100%)' :
                                           'linear-gradient(135deg, #475569 0%, #64748b 100%)',
                                border: '2px solid',
                                borderColor: idx === 0 ? '#1a1d23' : '#475569',
                                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                                textAlign: 'center',
                                position: 'relative',
                                overflow: 'hidden',
                                width: '320px',
                                minHeight: idx === 0 ? '420px' : '400px'
                              }}
                        >
                              {/* Posição */}
                              <div style={{ 
                                fontSize: '2.5rem', 
                                fontWeight: '800',
                                marginBottom: '0.5rem',
                                color: idx === 0 ? '#FFD700' : '#C0C0C0',
                                textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                              }}>
                                {idx + 1}º
                              </div>
                          
                          {/* Nome */}
                          <h3 style={{ 
                            fontSize: '1.25rem', 
                            fontWeight: '700',
                            marginBottom: '0.5rem',
                            color: 'white'
                          }}>
                            {consultor.nome}
                          </h3>
                          
                              {/* Título da Posição */}
                              <div style={{ 
                                fontSize: '0.875rem', 
                                color: 'rgba(255, 255, 255, 0.9)',
                                marginBottom: '1rem',
                                fontWeight: '600',
                                letterSpacing: '0.5px',
                                textTransform: 'uppercase'
                              }}>
                                {idx === 0 ? 'Primeiro Lugar' : 'Segundo Lugar'}
                              </div>

                          {/* Estatísticas */}
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '0.5rem',
                            marginBottom: '1rem'
                          }}>
                            <div>
                              <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'white' }}>
                                {consultor.totalPacientes}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                                Pacientes
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'white' }}>
                                {consultor.totalAgendamentos}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                                Agendamentos
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'white' }}>
                                {consultor.totalFechamentos}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                                Fechamentos
                              </div>
                            </div>
                          </div>

                          {/* Valores */}
                          <div style={{ 
                            padding: '1rem', 
                            background: 'rgba(255, 255, 255, 0.95)',
                            borderRadius: '12px',
                            marginTop: '1rem'
                          }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1a1d23' }}>
                              {formatCurrency(consultor.valorFechado)}
                            </div>
                            <div style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: '600' }}>
                              Comissão: {formatCurrency(consultor.comissaoTotal)}
                            </div>
                          </div>
                        </div>
                          );
                        })}
                      </div>
                      
                      {/* Segunda linha: 3º lugar */}
                      {consultoresAtivos[2] && (
                        <div 
                          style={{
                            padding: '1.5rem',
                            borderRadius: '16px',
                            background: 'linear-gradient(135deg, #94a3b8 0%, #cbd5e1 100%)',
                            border: '2px solid',
                            borderColor: '#94a3b8',
                            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                            textAlign: 'center',
                            position: 'relative',
                            overflow: 'hidden',
                            width: '320px',
                            minHeight: '400px'
                          }}
                        >
                          {/* Posição */}
                          <div style={{ 
                            fontSize: '2.5rem', 
                            fontWeight: '800',
                            marginBottom: '0.5rem',
                            color: '#CD7F32',
                            textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                          }}>
                            3º
                          </div>
                          
                          {/* Nome */}
                          <h3 style={{ 
                            fontSize: '1.25rem', 
                            fontWeight: '700',
                            marginBottom: '0.5rem',
                            color: 'white'
                          }}>
                            {consultoresAtivos[2].nome}
                          </h3>
                          
                          {/* Título da Posição */}
                          <div style={{ 
                            fontSize: '0.875rem', 
                            color: 'rgba(255, 255, 255, 0.9)',
                            marginBottom: '1rem',
                            fontWeight: '600',
                            letterSpacing: '0.5px',
                            textTransform: 'uppercase'
                          }}>
                            Terceiro Lugar
                          </div>

                          {/* Estatísticas */}
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '0.5rem',
                            marginBottom: '1rem'
                          }}>
                            <div>
                              <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'white' }}>
                                {consultoresAtivos[2].totalPacientes}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                                Pacientes
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'white' }}>
                                {consultoresAtivos[2].totalAgendamentos}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                                Agendamentos
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'white' }}>
                                {consultoresAtivos[2].totalFechamentos}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                                Fechamentos
                              </div>
                            </div>
                          </div>

                          {/* Valores */}
                          <div style={{ 
                            padding: '1rem', 
                            background: 'rgba(255, 255, 255, 0.95)',
                            borderRadius: '12px',
                            marginTop: '1rem'
                          }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1a1d23' }}>
                              {formatCurrency(consultoresAtivos[2].valorFechado)}
                            </div>
                            <div style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: '600' }}>
                              Comissão: {formatCurrency(consultoresAtivos[2].comissaoTotal)}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Restante dos consultores - do 4º ao 10º */}
                    {consultoresAtivos.length > 3 && (
                      <div style={{ marginBottom: '2rem' }}>
                        <h4 style={{ 
                          fontSize: '1rem', 
                          fontWeight: '600', 
                          color: '#1e293b',
                          marginBottom: '1rem'
                        }}>
                          Demais Posições (Top 10)
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
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de Conversão (dados filtrados) */}
      <div className="card" style={{ marginTop: '2rem' }} data-tutorial="conversion-rate">
        <div className="card-header" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
          <h2 className="card-title" style={{ color: '#1a1d23', fontWeight: '700' }}>Taxa de Conversão do Funil</h2>
        </div>
        <div className="card-body">
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              gap: window.innerWidth <= 768 ? '0.4rem' : '2rem',
              padding: '2rem',
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
              borderRadius: '12px'
            }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ 
                fontSize: window.innerWidth <= 768 ? '1.5rem' : '2.5rem', 
                fontWeight: '800', 
                color: '#1a1d23',
                marginBottom: '0.5rem'
              }}>
                {kpisPrincipais.totalPacientes}
              </div>
              <div style={{ 
                fontSize: '0.75rem', 
                color: '#64748b', 
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontWeight: '600'
              }}>
                Leads Totais
              </div>
            </div>

            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>

            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ 
                fontSize: window.innerWidth <= 768 ? '1.5rem' : '2.5rem', 
                fontWeight: '800', 
                color: '#1a1d23',
                marginBottom: '0.5rem'
              }}>
                {pipelineFiltrado.agendado || 0}
              </div>
              <div style={{ 
                fontSize: '0.75rem', 
                color: '#64748b', 
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontWeight: '600'
              }}>
                Agendados
              </div>
            </div>

            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>

            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ 
                fontSize: window.innerWidth <= 768 ? '1.5rem' : '2.5rem', 
                fontWeight: '800', 
                color: '#1a1d23',
                marginBottom: '0.5rem'
              }}>
                {pipelineFiltrado.compareceu || 0}
              </div>
              <div style={{ 
                fontSize: '0.75rem', 
                color: '#64748b', 
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontWeight: '600'
              }}>
                Compareceram
              </div>
            </div>

            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>

            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ 
                fontSize: window.innerWidth <= 768 ? '1.5rem' : '2.5rem', 
                fontWeight: '800', 
                color: '#059669',
                marginBottom: '0.5rem'
              }}>
                {pipelineFiltrado.fechado || 0}
              </div>
              <div style={{ 
                fontSize: '0.75rem', 
                color: '#64748b', 
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontWeight: '600'
              }}>
                Fechados
              </div>
            </div>
          </div>

          <div style={{ 
            marginTop: '2rem', 
            padding: '1.5rem', 
            background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
            borderRadius: '12px',
            textAlign: 'center',
            border: '2px solid #22c55e'
          }}>
            <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#15803d' }}>
              {kpisPrincipais.totalPacientes > 0 
                ? ((pipelineFiltrado.fechado || 0) / kpisPrincipais.totalPacientes * 100).toFixed(1)
                : 0}%
            </div>
            <div style={{ 
              fontSize: '0.875rem', 
              color: '#166534', 
              marginTop: '0.5rem',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Taxa de Conversão Total
            </div>
          </div>
        </div>
      </div>

      {/* GRÁFICOS DE METAS - APENAS ADMIN */}
      {isAdmin && (
        <div style={{ marginTop: '3rem' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '2rem'
          }}>
            <div>
              <h2 style={{ 
                fontSize: '1.5rem', 
                fontWeight: '700', 
                color: '#1a1d23',
                letterSpacing: '-0.025em'
              }}>
                📈 Metas e Progresso Mensal
              </h2>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '1rem',
                marginTop: '0.5rem'
              }}>
                <button
                  onClick={() => {
                    const novoMes = new Date(mesSelecionadoMetas);
                    novoMes.setMonth(mesSelecionadoMetas.getMonth() - 1);
                    setMesSelecionadoMetas(novoMes);
                  }}
                  className="btn btn-secondary"
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                >
                  ◀
                </button>
                <span style={{ 
                  fontSize: '1rem', 
                  fontWeight: '600', 
                  color: '#6b7280',
                  minWidth: '150px',
                  textAlign: 'center'
                }}>
                  {mesSelecionadoMetas.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </span>
                <button
                  onClick={() => {
                    const novoMes = new Date(mesSelecionadoMetas);
                    novoMes.setMonth(mesSelecionadoMetas.getMonth() + 1);
                    setMesSelecionadoMetas(novoMes);
                  }}
                  className="btn btn-secondary"
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                >
                  ▶
                </button>
              </div>
            </div>
            
            <button
              onClick={() => setEditandoMetas(!editandoMetas)}
              className="btn btn-secondary"
              style={{ 
                padding: '0.5rem 1rem', 
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              {editandoMetas ? 'Salvar Metas' : 'Editar Metas'}
            </button>
          </div>

          {/* Modal de Edição de Metas */}
          {editandoMetas && (
            <div style={{
              marginBottom: '2rem',
              padding: '1.5rem',
              background: '#f8fafc',
              borderRadius: '12px',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151'
                  }}>
                    Meta de Clínicas Aprovadas
                  </label>
                  <input
                    type="number"
                    value={metasEditadas.clinicas}
                    onChange={(e) => setMetasEditadas({ ...metasEditadas, clinicas: parseInt(e.target.value) || 0 })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '1rem'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151'
                  }}>
                    Meta de Valor em Fechamentos (R$)
                  </label>
                  <input
                    type="number"
                    value={metasEditadas.valor}
                    onChange={(e) => setMetasEditadas({ ...metasEditadas, valor: parseFloat(e.target.value) || 0 })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '1rem'
                    }}
                  />
                </div>
              </div>
              
              <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setEditandoMetas(false);
                    setMetasEditadas({
                      clinicas: metasData.metas.clinicas_aprovadas,
                      valor: metasData.metas.valor_fechamentos
                    });
                  }}
                  className="btn btn-secondary"
                  style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    await atualizarMeta('clinicas_aprovadas', metasEditadas.clinicas);
                    await atualizarMeta('valor_fechamentos', metasEditadas.valor);
                    setEditandoMetas(false);
                  }}
                  className="btn btn-primary"
                  style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                >
                  Salvar Alterações
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-2" style={{ gap: '2rem' }}>
            {/* Gráfico de PACIENTES Fechados */}
            <div className="card">
              <div className="card-header" style={{ 
                background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
                borderBottom: '2px solid #10b981'
              }}>
                <h3 className="card-title" style={{ color: '#059669', fontWeight: '700' }}>
                  👥 Pacientes Fechados (Meta: 120/mês)
                </h3>
                <div style={{ display: 'flex', gap: '2rem', marginTop: '0.5rem' }}>
                  <div style={{ fontSize: '0.875rem' }}>
                    <span style={{ color: '#64748b' }}>Meta: </span>
                    <span style={{ fontWeight: '600', color: '#059669' }}>
                      {metasData.metas?.pacientes_fechados || 120}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.875rem' }}>
                    <span style={{ color: '#64748b' }}>Atual: </span>
                    <span style={{ fontWeight: '600', color: '#059669' }}>
                      {metasData.totais?.pacientes_fechados || 0}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.875rem' }}>
                    <span style={{ color: '#64748b' }}>Progresso: </span>
                    <span style={{ 
                      fontWeight: '600', 
                      color: parseFloat(metasData.percentuais?.pacientes || 0) >= 100 ? '#059669' : '#047857' 
                    }}>
                      {metasData.percentuais?.pacientes || 0}%
                    </span>
                  </div>
                  <div style={{ fontSize: '0.875rem' }}>
                    <span style={{ color: '#f59e0b' }}>Semana {metasData.semana_do_ano || 40}</span>
                  </div>
                </div>
              </div>
              <div className="card-body">
                {/* Barra de Progresso Principal */}
                <div style={{ marginBottom: '2rem' }}>
                  <div style={{ 
                    position: 'relative',
                    height: '40px',
                    background: '#e5e7eb',
                    borderRadius: '20px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      height: '100%',
                      width: `${Math.min(parseFloat(metasData.percentuais.clinicas), 100)}%`,
                      background: parseFloat(metasData.percentuais.clinicas) >= 100 
                        ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
                        : 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)',
                      borderRadius: '20px',
                      transition: 'width 0.5s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      paddingRight: '1rem'
                    }}>
                      {parseFloat(metasData.percentuais.clinicas) > 10 && (
                        <span style={{ color: 'white', fontWeight: '600', fontSize: '1.25rem' }}>
                          {metasData.totais.clinicas_aprovadas}
                        </span>
                      )}
                    </div>
                    {/* Linha da Meta */}
                    <div style={{
                      position: 'absolute',
                      left: '100%',
                      top: 0,
                      height: '100%',
                      width: '2px',
                      background: '#ef4444',
                      boxShadow: '0 0 4px rgba(239, 68, 68, 0.5)'
                    }} />
                  </div>
                </div>

                {/* Gráfico Profissional de Progresso Semanal */}
                <ResponsiveContainer width="100%" height={350}>
                  <ComposedChart 
                    data={Object.entries(metasData.progresso_semanal || {}).map(([semana, dados]) => ({
                      semana: semana, // Já vem como SXX, não precisa transformar
                      novos: dados.pacientes || 0,
                      acumulado: dados.pacientesAcumulado || 0,
                      meta: dados.metaSemanalPacientes || 0,
                      isAtual: dados.isAtual
                    }))}
                    margin={{ top: 20, right: 70, left: 20, bottom: 40 }}
                  >
                    
                    <CartesianGrid 
                      strokeDasharray="0" 
                      stroke="#f3f4f6" 
                      vertical={true}
                    />
                    
                    <XAxis 
                      dataKey="semana"
                      tick={{ fontSize: 12, fill: '#4b5563' }}
                      axisLine={{ stroke: '#e5e7eb' }}
                      tickLine={{ stroke: '#e5e7eb' }}
                    />
                    
                    <YAxis 
                      label={{ value: 'Pacientes', angle: -90, position: 'insideLeft', style: { fontSize: 13, fill: '#4b5563', fontWeight: '600' } }}
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                      axisLine={{ stroke: '#e5e7eb' }}
                      tickLine={{ stroke: '#e5e7eb' }}
                    />
                    
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      label={{ value: 'Acumulado', angle: 90, position: 'insideRight', style: { fontSize: 13, fill: '#4b5563', fontWeight: '600' } }}
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                      axisLine={{ stroke: '#e5e7eb' }}
                      tickLine={{ stroke: '#e5e7eb' }}
                    />
                    
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                        padding: '8px 12px'
                      }}
                      formatter={(value, name) => {
                        if (name === 'Pacientes da Semana') return [`${value}`, 'Novos'];
                        if (name === 'Total Acumulado') return [`${value}`, 'Total'];
                        if (name === 'Meta Semanal (Ramp-up)') return [`${value}`, 'Meta'];
                        return [value, name];
                      }}
                    />
                    
                    <Legend 
                      verticalAlign="top" 
                      height={40}
                      iconType="rect"
                      wrapperStyle={{ fontSize: '13px', paddingTop: '10px' }}
                    />
                    
                    {/* Barras de novos pacientes */}
                    <Bar 
                      dataKey="novos" 
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                      name="Pacientes da Semana"
                    />
                    
                    {/* Linha de meta semanal (ramp-up) */}
                    <Line 
                      type="stepAfter" 
                      dataKey="meta" 
                      stroke="#f59e0b" 
                      strokeWidth={2}
                      strokeDasharray="5 3"
                      dot={{ r: 3, fill: '#f59e0b' }}
                      name="Meta Semanal (Ramp-up)"
                    />
                    
                    {/* Linha de acumulado */}
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="acumulado" 
                      stroke="#1e40af" 
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#1e40af' }}
                      name="Total Acumulado"
                    />
                    
                    {/* Linha de referência para meta mensal */}
                    <ReferenceLine 
                      yAxisId="right"
                      y={metasData.metas?.pacientes_fechados || 120} 
                      stroke="#ef4444" 
                      strokeDasharray="8 4"
                      strokeWidth={1.5}
                      label={{ value: "Meta Mensal: 120", position: "right", fill: '#ef4444', fontSize: 11 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico de CLÍNICAS Aprovadas */}
            <div className="card">
              <div className="card-header" style={{ 
                background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                borderBottom: '2px solid #3b82f6'
              }}>
                <h3 className="card-title" style={{ color: '#1e40af', fontWeight: '700' }}>
                  🏥 Clínicas Aprovadas (Meta: 30/mês)
                </h3>
                <div style={{ display: 'flex', gap: '2rem', marginTop: '0.5rem' }}>
                  <div style={{ fontSize: '0.875rem' }}>
                    <span style={{ color: '#64748b' }}>Meta: </span>
                    <span style={{ fontWeight: '600', color: '#1e40af' }}>
                      {metasData.metas?.clinicas_aprovadas || 30}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.875rem' }}>
                    <span style={{ color: '#64748b' }}>Atual: </span>
                    <span style={{ fontWeight: '600', color: '#1e40af' }}>
                      {metasData.totais?.clinicas_aprovadas || 0}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.875rem' }}>
                    <span style={{ color: '#64748b' }}>Progresso: </span>
                    <span style={{ 
                      fontWeight: '600', 
                      color: parseFloat(metasData.percentuais?.clinicas || 0) >= 100 ? '#059669' : '#1e40af' 
                    }}>
                      {metasData.percentuais?.clinicas || 0}%
                    </span>
                  </div>
                  <div style={{ fontSize: '0.875rem' }}>
                    <span style={{ color: '#f59e0b' }}>Semana {metasData.semana_do_ano || 40}</span>
                  </div>
                </div>
              </div>
              <div className="card-body">
                {/* Barra de Progresso Principal */}
                <div style={{ marginBottom: '2rem' }}>
                  <div style={{ 
                    position: 'relative',
                    height: '40px',
                    background: '#e5e7eb',
                    borderRadius: '20px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      height: '100%',
                      width: `${Math.min(parseFloat(metasData.percentuais.valor), 100)}%`,
                      background: parseFloat(metasData.percentuais.valor) >= 100 
                        ? 'linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%)'
                        : 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                      borderRadius: '20px',
                      transition: 'width 0.5s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      paddingRight: '1rem'
                    }}>
                      {parseFloat(metasData.percentuais.valor) > 10 && (
                        <span style={{ color: 'white', fontWeight: '600', fontSize: '1.25rem' }}>
                          {formatCurrencyCompact(metasData.totais.valor_fechamentos)}
                        </span>
                      )}
                    </div>
                    {/* Linha da Meta */}
                    <div style={{
                      position: 'absolute',
                      left: '100%',
                      top: 0,
                      height: '100%',
                      width: '2px',
                      background: '#ef4444',
                      boxShadow: '0 0 4px rgba(239, 68, 68, 0.5)'
                    }} />
                  </div>
                </div>

                {/* Gráfico Profissional de Progresso Semanal - Clínicas */}
                <ResponsiveContainer width="100%" height={350}>
                  <ComposedChart 
                    data={Object.entries(metasData.progresso_semanal || {}).map(([semana, dados]) => ({
                      semana: semana, // Já vem como SXX, não precisa transformar
                      novos: dados.clinicas || 0,
                      acumulado: dados.clinicasAcumulado || 0,
                      meta: dados.metaSemanalClinicas || 0,
                      isAtual: dados.isAtual
                    }))}
                    margin={{ top: 20, right: 70, left: 20, bottom: 40 }}
                  >
                    
                    <CartesianGrid 
                      strokeDasharray="0" 
                      stroke="#f3f4f6" 
                      vertical={true}
                    />
                    
                    <XAxis 
                      dataKey="semana"
                      tick={{ fontSize: 12, fill: '#4b5563' }}
                      axisLine={{ stroke: '#e5e7eb' }}
                      tickLine={{ stroke: '#e5e7eb' }}
                    />
                    
                    <YAxis 
                      label={{ value: 'Clínicas', angle: -90, position: 'insideLeft', style: { fontSize: 13, fill: '#4b5563', fontWeight: '600' } }}
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                      axisLine={{ stroke: '#e5e7eb' }}
                      tickLine={{ stroke: '#e5e7eb' }}
                    />
                    
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      label={{ value: 'Acumulado', angle: 90, position: 'insideRight', style: { fontSize: 13, fill: '#4b5563', fontWeight: '600' } }}
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                      axisLine={{ stroke: '#e5e7eb' }}
                      tickLine={{ stroke: '#e5e7eb' }}
                    />
                    
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                        padding: '8px 12px'
                      }}
                      formatter={(value, name) => {
                        if (name === 'Clínicas da Semana') return [`${value}`, 'Novas'];
                        if (name === 'Total Acumulado') return [`${value}`, 'Total'];
                        if (name === 'Meta Semanal (Ramp-up)') return [`${value}`, 'Meta'];
                        return [value, name];
                      }}
                    />
                    
                    <Legend 
                      verticalAlign="top" 
                      height={40}
                      iconType="rect"
                      wrapperStyle={{ fontSize: '13px', paddingTop: '10px' }}
                    />
                    
                    {/* Barras de novas clínicas */}
                    <Bar 
                      dataKey="novos" 
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                      name="Clínicas da Semana"
                    />
                    
                    {/* Linha de meta semanal (ramp-up) */}
                    <Line 
                      type="stepAfter" 
                      dataKey="meta" 
                      stroke="#f59e0b" 
                      strokeWidth={2}
                      strokeDasharray="5 3"
                      dot={{ r: 3, fill: '#f59e0b' }}
                      name="Meta Semanal (Ramp-up)"
                    />
                    
                    {/* Linha de acumulado */}
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="acumulado" 
                      stroke="#8b5cf6" 
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#8b5cf6' }}
                      name="Total Acumulado"
                    />
                    
                    {/* Linha de referência para meta mensal */}
                    <ReferenceLine 
                      yAxisId="right"
                      y={metasData.metas?.clinicas_aprovadas || 30} 
                      stroke="#ef4444" 
                      strokeDasharray="8 4"
                      strokeWidth={1.5}
                      label={{ value: "Meta Mensal: 30", position: "right", fill: '#ef4444', fontSize: 11 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

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
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                Valores Financeiros
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
                <div style={{ fontSize: '0.875rem', color: '#166534', marginBottom: '0.5rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Valor Total Fechado
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
                <div style={{ fontSize: '0.875rem', color: '#92400e', marginBottom: '0.5rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Comissão Total
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

      {/* Modal do Grupo do WhatsApp */}
      {showWhatsAppGroupModal && (
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
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              background: '#25D366',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem'
            }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
              </svg>
            </div>

            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#1a1d23',
              marginBottom: '1rem'
            }}>
              Entre no Grupo dos Consultores!
            </h2>

            <p style={{
              fontSize: '1rem',
              color: '#4b5563',
              marginBottom: '1.5rem',
              lineHeight: '1.5'
            }}>
              Junte-se ao grupo do WhatsApp para trocar experiências, 
              receber dicas e se conectar com outros consultores da plataforma.
            </p>

            <p style={{
              fontSize: '0.875rem',
              color: '#6b7280',
              marginBottom: '1.5rem',
              lineHeight: '1.4',
              fontStyle: 'italic'
            }}>
              <strong>Dica:</strong> Este link também estará sempre disponível na sua tela de perfil, 
              caso queira acessar depois!
            </p>

            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center'
            }}>
              <button
                onClick={() => {
                  localStorage.setItem('whatsapp-group-modal-shown', 'true');
                  setShowWhatsAppGroupModal(false);
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.target.style.background = '#4b5563'}
                onMouseOut={(e) => e.target.style.background = '#6b7280'}
              >
                Talvez Depois
              </button>

              <button
                onClick={() => {
                  localStorage.setItem('whatsapp-group-modal-shown', 'true');
                  setShowWhatsAppGroupModal(false);
                  window.open('https://chat.whatsapp.com/H58PhHmVQpj1mRSj7wlZgs', '_blank');
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#25D366',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseOver={(e) => e.target.style.background = '#128C7E'}
                onMouseOut={(e) => e.target.style.background = '#25D366'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                </svg>
                Entrar no Grupo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard; 