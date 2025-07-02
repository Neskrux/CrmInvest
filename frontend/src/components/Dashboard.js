import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const { makeRequest, isAdmin, user } = useAuth();
  const [stats, setStats] = useState({
    agendamentosHoje: 0,
    lembradosHoje: 0,
    totalPacientes: 0,
    fechamentosHoje: 0,
    fechamentosMes: 0,
    valorTotalMes: 0,
    ticketMedio: 0,
    totalFechamentos: 0,
    estatisticasConsultores: []
  });
  const [pipelineStats, setPipelineStats] = useState({
    agendamentosTotal: 0,
    agendamentosConfirmados: 0,
    agendamentosCancelados: 0,
    taxaConversao: 0
  });
  const [comissaoData, setComissaoData] = useState({
    comissaoTotalMes: 0,
    comissaoTotalGeral: 0,
    comissoesPorConsultor: []
  });
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      const response = await makeRequest('/dashboard');
      const data = await response.json();
      
      if (response.ok) {
        setStats(data);
      } else {
        console.error('Erro ao carregar dashboard:', data.error);
      }
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, [makeRequest]);

  const fetchPipelineStats = useCallback(async () => {
    try {
      const pacientesResponse = await makeRequest('/pacientes');
      const pacientes = await pacientesResponse.json();

      const agendamentosResponse = await makeRequest('/agendamentos');
      const agendamentos = await agendamentosResponse.json();

      const pipelineData = {
        agendamentosTotal: pacientes.length + agendamentos.length,
        agendamentosConfirmados: pacientes.filter(p => p.status === 'confirmado').length + 
                              agendamentos.filter(a => a.status === 'confirmado').length,
        agendamentosCancelados: pacientes.filter(p => p.status === 'cancelado').length + 
                              agendamentos.filter(a => a.status === 'cancelado').length,
        taxaConversao: (pipelineData.agendamentosConfirmados / pipelineData.agendamentosTotal) * 100
      };

      setPipelineStats(pipelineData);
    } catch (error) {
      console.error('Erro ao carregar estatísticas do pipeline:', error);
    }
  }, [makeRequest]);

  const fetchComissaoData = useCallback(async () => {
    try {
      const response = await makeRequest('/fechamentos');
      const fechamentos = await response.json();
      
      if (response.ok) {
        const agora = new Date();
        const mesAtual = agora.getMonth() + 1;
        const anoAtual = agora.getFullYear();
        
        const fechamentosMes = fechamentos.filter(f => {
          const dataFechamento = new Date(f.data_fechamento);
          return dataFechamento.getMonth() + 1 === mesAtual && 
                 dataFechamento.getFullYear() === anoAtual;
        });
        
        const comissaoMes = fechamentosMes.reduce((total, f) => {
          return total + calcularComissao(f.valor_fechado || 0);
        }, 0);
        
        const comissaoGeral = fechamentos.reduce((total, f) => {
          return total + calcularComissao(f.valor_fechado || 0);
        }, 0);
        
        const comissoesPorConsultor = {};
        
        fechamentos.forEach(f => {
          if (f.consultor_id && f.consultor_nome) {
            if (!comissoesPorConsultor[f.consultor_id]) {
              comissoesPorConsultor[f.consultor_id] = {
                id: f.consultor_id,
                nome: f.consultor_nome,
                valorTotalMes: 0,
                valorTotalGeral: 0,
                comissaoMes: 0,
                comissaoGeral: 0,
                fechamentosMes: 0,
                fechamentosGeral: 0
              };
            }
            
            const comissaoFechamento = calcularComissao(f.valor_fechado || 0);
            
            comissoesPorConsultor[f.consultor_id].valorTotalGeral += f.valor_fechado || 0;
            comissoesPorConsultor[f.consultor_id].comissaoGeral += comissaoFechamento;
            comissoesPorConsultor[f.consultor_id].fechamentosGeral += 1;
            
            const dataFechamento = new Date(f.data_fechamento);
            if (dataFechamento.getMonth() + 1 === mesAtual && 
                dataFechamento.getFullYear() === anoAtual) {
              comissoesPorConsultor[f.consultor_id].valorTotalMes += f.valor_fechado || 0;
              comissoesPorConsultor[f.consultor_id].comissaoMes += comissaoFechamento;
              comissoesPorConsultor[f.consultor_id].fechamentosMes += 1;
            }
          }
        });
        
        setComissaoData({
          comissaoTotalMes: comissaoMes,
          comissaoTotalGeral: comissaoGeral,
          comissoesPorConsultor: Object.values(comissoesPorConsultor)
            .sort((a, b) => b.comissaoMes - a.comissaoMes)
        });
      }
    } catch (error) {
      console.error('Erro ao buscar dados de comissão:', error);
    }
  }, [calcularComissao]);

  const hoje = new Date().toLocaleDateString('pt-BR');

  const taxaConversao = pipelineStats.agendamentosTotal > 0 
    ? Math.round((pipelineStats.agendamentosConfirmados / pipelineStats.agendamentosTotal) * 100)
    : 0;

  const calcularComissao = (valorFechado) => {
    return (valorFechado / 1000) * 5;
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchDashboardData(),
        fetchPipelineStats(),
        fetchComissaoData()
      ]);
      setLoading(false);
    };
    
    loadData();
  }, [fetchDashboardData, fetchPipelineStats, fetchComissaoData]);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '60vh',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{ 
          width: '50px', 
          height: '50px', 
          border: '4px solid #f3f4f6', 
          borderTop: '4px solid #3b82f6', 
          borderRadius: '50%', 
          animation: 'spin 1s linear infinite' 
        }}></div>
        <p style={{ color: '#6b7280', fontSize: '16px' }}>Carregando dashboard...</p>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px 0'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 20px' }}>
        {/* Header Moderno */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          borderRadius: '20px',
          padding: '30px',
          marginBottom: '30px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          color: 'white',
          textAlign: 'center'
        }}>
          <h1 style={{ 
            fontSize: '32px', 
            fontWeight: '700', 
            margin: '0 0 10px 0',
            textShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            {isAdmin ? '📊 Dashboard Executivo' : '👨‍💼 Meu Dashboard'}
          </h1>
          <p style={{ 
            fontSize: '16px', 
            opacity: '0.9', 
            margin: '0',
            fontWeight: '500'
          }}>
            {isAdmin 
              ? 'Visão estratégica da operação' 
              : `Bem-vindo, ${user?.nome}`
            } • {hoje}
          </p>
        </div>

        {/* Métricas Principais - Grid Responsivo */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
          marginBottom: '30px'
        }}>
          {/* Card Faturamento */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '25px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, #10b981, #059669)'
            }}></div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
              <div style={{
                width: '50px',
                height: '50px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '15px'
              }}>
                <span style={{ fontSize: '20px' }}>💰</span>
              </div>
              <div>
                <h3 style={{ margin: '0', fontSize: '18px', color: '#1f2937', fontWeight: '600' }}>
                  Faturamento
                </h3>
                <p style={{ margin: '0', fontSize: '14px', color: '#6b7280' }}>
                  Mês atual
                </p>
              </div>
            </div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#10b981', marginBottom: '8px' }}>
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                maximumFractionDigits: 0
              }).format(stats.valorTotalMes)}
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              {stats.fechamentosMes} fechamentos • Ticket médio: {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(stats.ticketMedio)}
            </div>
          </div>

          {/* Card Comissão Total Geral */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '25px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, #8b5cf6, #7c3aed)'
            }}></div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
              <div style={{
                width: '50px',
                height: '50px',
                background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '15px'
              }}>
                <span style={{ fontSize: '20px' }}>💎</span>
              </div>
              <div>
                <h3 style={{ margin: '0', fontSize: '18px', color: '#1f2937', fontWeight: '600' }}>
                  Comissão Total
                </h3>
                <p style={{ margin: '0', fontSize: '14px', color: '#6b7280' }}>
                  Acumulado geral
                </p>
              </div>
            </div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#8b5cf6', marginBottom: '8px' }}>
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(comissaoData.comissaoTotalGeral)}
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              Todas as vendas registradas
            </div>
          </div>

          {/* Card Agendamentos */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '25px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, #3b82f6, #1d4ed8)'
            }}></div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
              <div style={{
                width: '50px',
                height: '50px',
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '15px'
              }}>
                <span style={{ fontSize: '20px' }}>📅</span>
              </div>
              <div>
                <h3 style={{ margin: '0', fontSize: '18px', color: '#1f2937', fontWeight: '600' }}>
                  Agendamentos
                </h3>
                <p style={{ margin: '0', fontSize: '14px', color: '#6b7280' }}>
                  Hoje
                </p>
              </div>
            </div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#3b82f6', marginBottom: '8px' }}>
              {stats.agendamentosHoje}
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              {stats.lembradosHoje} lembrados • Taxa: {stats.agendamentosHoje > 0 
                ? Math.round((stats.lembradosHoje / stats.agendamentosHoje) * 100)
                : 0}%
            </div>
          </div>

          {/* Card Pipeline */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '25px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, #ef4444, #dc2626)'
            }}></div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
              <div style={{
                width: '50px',
                height: '50px',
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '15px'
              }}>
                <span style={{ fontSize: '20px' }}>📈</span>
              </div>
              <div>
                <h3 style={{ margin: '0', fontSize: '18px', color: '#1f2937', fontWeight: '600' }}>
                  Conversão
                </h3>
                <p style={{ margin: '0', fontSize: '14px', color: '#6b7280' }}>
                  Taxa geral
                </p>
              </div>
            </div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#ef4444', marginBottom: '8px' }}>
              {taxaConversao}%
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              {pipelineStats.agendamentosConfirmados} confirmados de {pipelineStats.agendamentosTotal} agendamentos
            </div>
          </div>
        </div>

        {/* Pipeline de Vendas - Layout Moderno */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '30px',
          marginBottom: '30px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '25px'
          }}>
            <h2 style={{
              fontSize: '22px',
              fontWeight: '600',
              color: '#1f2937',
              margin: '0'
            }}>
              🎯 Pipeline de Vendas
            </h2>
            <div style={{
              background: '#f0fdf4',
              color: '#059669',
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: '600',
              border: '1px solid #bbf7d0'
            }}>
              Conversão: {taxaConversao}%
            </div>
          </div>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '15px'
          }}>
            <div style={{
              textAlign: 'center',
              padding: '20px',
              background: '#fef3c7',
              borderRadius: '12px',
              border: '1px solid #fbbf24'
            }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#d97706', marginBottom: '5px' }}>
                {pipelineStats.agendamentosTotal}
              </div>
              <div style={{ fontSize: '13px', color: '#92400e', fontWeight: '500' }}>🔍 Leads</div>
            </div>
            
            <div style={{
              textAlign: 'center',
              padding: '20px',
              background: '#dbeafe',
              borderRadius: '12px',
              border: '1px solid #60a5fa'
            }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#2563eb', marginBottom: '5px' }}>
                {pipelineStats.agendamentosConfirmados}
              </div>
              <div style={{ fontSize: '13px', color: '#1d4ed8', fontWeight: '500' }}>📅 Confirmados</div>
            </div>
            
            <div style={{
              textAlign: 'center',
              padding: '20px',
              background: '#d1fae5',
              borderRadius: '12px',
              border: '1px solid #34d399'
            }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#059669', marginBottom: '5px' }}>
                {pipelineStats.agendamentosCancelados}
              </div>
              <div style={{ fontSize: '13px', color: '#047857', fontWeight: '500' }}>🎯 Cancelados</div>
            </div>
            
            <div style={{
              textAlign: 'center',
              padding: '20px',
              background: '#ecfdf5',
              borderRadius: '12px',
              border: '1px solid #10b981'
            }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#10b981', marginBottom: '5px' }}>
                {pipelineStats.agendamentosConfirmados}
              </div>
              <div style={{ fontSize: '13px', color: '#059669', fontWeight: '500' }}>💰 Confirmados</div>
            </div>
          </div>
        </div>

        {/* Todos os Consultores com Agendamentos */}
        {stats.estatisticasConsultores.length > 0 && (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '30px',
            marginBottom: '30px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '25px'
            }}>
              <h2 style={{
                fontSize: '22px',
                fontWeight: '600',
                color: '#1f2937',
                margin: '0'
              }}>
                👨‍💼 Consultores e Agendamentos
              </h2>
              <div style={{
                background: '#eff6ff',
                color: '#2563eb',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: '600',
                border: '1px solid #bfdbfe'
              }}>
                Total: {stats.estatisticasConsultores.length} consultores
              </div>
            </div>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '20px'
            }}>
              {stats.estatisticasConsultores
                .sort((a, b) => b.total_agendamentos - a.total_agendamentos) // Ordenar por quantidade de agendamentos
                .map(consultor => {
                  // Buscar dados de comissão deste consultor
                  const dadosComissao = comissaoData.comissoesPorConsultor.find(c => c.id === consultor.id) || {
                    comissaoMes: 0,
                    comissaoGeral: 0,
                    valorTotalMes: 0,
                    fechamentosMes: 0
                  };
                  
                  return (
                    <div key={consultor.id} style={{
                      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                      borderRadius: '12px',
                      padding: '20px',
                      border: '1px solid #cbd5e1',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      {/* Indicador visual baseado na quantidade de agendamentos */}
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '4px',
                        background: consultor.total_agendamentos > 20 
                          ? 'linear-gradient(90deg, #10b981, #059669)' 
                          : consultor.total_agendamentos > 10 
                          ? 'linear-gradient(90deg, #3b82f6, #1d4ed8)'
                          : 'linear-gradient(90deg, #f59e0b, #d97706)'
                      }}></div>
                      
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '15px'
                      }}>
                        <div style={{
                          width: '45px',
                          height: '45px',
                          background: consultor.total_agendamentos > 20 
                            ? 'linear-gradient(135deg, #10b981, #059669)' 
                            : consultor.total_agendamentos > 10 
                            ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)'
                            : 'linear-gradient(135deg, #f59e0b, #d97706)',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: '12px',
                          color: 'white',
                          fontWeight: '700',
                          fontSize: '18px'
                        }}>
                          {consultor.nome.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            color: '#1f2937',
                            margin: '0',
                            lineHeight: '1.2'
                          }}>
                            {consultor.nome}
                          </h3>
                          <p style={{
                            fontSize: '12px',
                            color: '#6b7280',
                            margin: '0',
                            fontWeight: '500'
                          }}>
                            {consultor.total_agendamentos > 20 ? '🏆 Top Performer' : 
                             consultor.total_agendamentos > 10 ? '⭐ Ativo' : '🔄 Iniciante'}
                          </p>
                        </div>
                      </div>
                      
                      {/* Grid de métricas */}
                      <div style={{ display: 'grid', gap: '8px' }}>
                        {/* Agendamentos Totais - Destaque */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px 15px',
                          background: 'white',
                          borderRadius: '8px',
                          fontSize: '14px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                          border: '1px solid #e2e8f0'
                        }}>
                          <span style={{ fontWeight: '600', color: '#374151' }}>📅 Total de Agendamentos:</span>
                          <div style={{
                            background: consultor.total_agendamentos > 20 
                              ? '#dcfce7' : consultor.total_agendamentos > 10 
                              ? '#dbeafe' : '#fef3c7',
                            color: consultor.total_agendamentos > 20 
                              ? '#166534' : consultor.total_agendamentos > 10 
                              ? '#1e40af' : '#92400e',
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontWeight: '700',
                            fontSize: '15px'
                          }}>
                            {consultor.total_agendamentos}
                          </div>
                        </div>
                        
                        {/* Comissão do Mês - NOVO */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px 15px',
                          background: 'white',
                          borderRadius: '8px',
                          fontSize: '14px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                          border: '1px solid #e2e8f0'
                        }}>
                          <span style={{ fontWeight: '600', color: '#374151' }}>💰 Comissão (mês):</span>
                          <div style={{
                            color: '#f59e0b',
                            fontWeight: '700',
                            fontSize: '15px'
                          }}>
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            }).format(dadosComissao.comissaoMes)}
                          </div>
                        </div>
                        
                        {/* Agendamentos Hoje */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '10px 15px',
                          background: 'white',
                          borderRadius: '6px',
                          fontSize: '13px'
                        }}>
                          <span>🔥 Hoje:</span>
                          <strong style={{ color: '#3b82f6' }}>{consultor.agendamentos_hoje || 0}</strong>
                        </div>
                        
                        {/* Taxa de Lembrados */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '10px 15px',
                          background: 'white',
                          borderRadius: '6px',
                          fontSize: '13px'
                        }}>
                          <span>💬 Taxa Lembrados:</span>
                          <strong style={{ color: '#059669' }}>
                            {consultor.total_agendamentos > 0 
                              ? Math.round((consultor.total_lembrados / consultor.total_agendamentos) * 100)
                              : 0}%
                          </strong>
                        </div>
                        
                        {/* Comissão Total - NOVO */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '10px 15px',
                          background: 'white',
                          borderRadius: '6px',
                          fontSize: '13px'
                        }}>
                          <span>💎 Comissão Total:</span>
                          <strong style={{ color: '#8b5cf6' }}>
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            }).format(dadosComissao.comissaoGeral)}
                          </strong>
                        </div>
                        
                        {/* Fechamentos se for admin */}
                        {isAdmin && (
                          <>
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              padding: '10px 15px',
                              background: 'white',
                              borderRadius: '6px',
                              fontSize: '13px'
                            }}>
                              <span>💰 Fechamentos/ano:</span>
                              <strong style={{ color: '#10b981' }}>{consultor.fechamentos_mes || 0}</strong>
                            </div>
                            
                            {/* Valor Total dos Fechamentos */}
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              padding: '10px 15px',
                              background: 'white',
                              borderRadius: '6px',
                              fontSize: '13px'
                            }}>
                              <span>💵 Faturamento/ano:</span>
                              <strong style={{ color: '#059669' }}>
                                {new Intl.NumberFormat('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL',
                                  maximumFractionDigits: 0
                                }).format(consultor.valor_total_mes || 0)}
                              </strong>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Ações Rápidas - Design Moderno */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '30px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{
            fontSize: '22px',
            fontWeight: '600',
            color: '#1f2937',
            marginBottom: '25px',
            textAlign: 'center'
          }}>
            ⚡ Ações Rápidas
          </h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px'
          }}>
            <button
              onClick={() => window.location.href = '/fechamentos'}
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '20px',
                cursor: 'pointer',
                textAlign: 'center',
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
                transition: 'all 0.3s ease',
                position: 'relative'
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>💰</div>
              <div style={{ fontSize: '16px', fontWeight: '600' }}>Novo Fechamento</div>
              <div style={{ fontSize: '12px', opacity: '0.9' }}>Registrar venda</div>
              {stats.fechamentosHoje > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: '#fbbf24',
                  color: '#92400e',
                  fontSize: '10px',
                  fontWeight: '600',
                  padding: '4px 8px',
                  borderRadius: '12px'
                }}>
                  {stats.fechamentosHoje} hoje
                </div>
              )}
            </button>

            <button
              onClick={() => window.location.href = '/agendamentos'}
              style={{
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '20px',
                cursor: 'pointer',
                textAlign: 'center',
                boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)',
                transition: 'all 0.3s ease'
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📅</div>
              <div style={{ fontSize: '16px', fontWeight: '600' }}>Novo Agendamento</div>
              <div style={{ fontSize: '12px', opacity: '0.9' }}>Agendar consulta</div>
            </button>

            <button
              onClick={() => window.location.href = '/pacientes'}
              style={{
                background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '20px',
                cursor: 'pointer',
                textAlign: 'center',
                boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)',
                transition: 'all 0.3s ease'
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>👤</div>
              <div style={{ fontSize: '16px', fontWeight: '600' }}>Novo Paciente</div>
              <div style={{ fontSize: '12px', opacity: '0.9' }}>Cadastrar lead</div>
            </button>

            {isAdmin && (
              <button
                onClick={() => window.location.href = '/consultores'}
                style={{
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '20px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)',
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>👨‍💼</div>
                <div style={{ fontSize: '16px', fontWeight: '600' }}>Novo Consultor</div>
                <div style={{ fontSize: '12px', opacity: '0.9' }}>Gerenciar equipe</div>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 