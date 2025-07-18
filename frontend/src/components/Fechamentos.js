import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Fechamentos = () => {
  const { makeRequest, isAdmin } = useAuth();
  const [fechamentos, setFechamentos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [consultores, setConsultores] = useState([]);
  const [imobiliarias, setClinicas] = useState([]);
  const [agendamentos, setAgendamentos] = useState([]);
  const [erro, setErro] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [filtroConsultor, setFiltroConsultor] = useState('');
  const [filtroClinica, setFiltroClinica] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [filtrosVisiveis, setFiltrosVisiveis] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [fechamentoEditando, setFechamentoEditando] = useState(null);
  const [ordenacao, setOrdenacao] = useState('data-desc'); // Novo estado para ordenação
  const [novoFechamento, setNovoFechamento] = useState({
    cliente_id: '',
    consultor_id: '',
    imobiliaria_id: '',
    valor_fechado: '',
    valor_formatado: '',
    data_fechamento: new Date().toISOString().split('T')[0],
    tipo_servico: '',
    observacoes: ''
  });
  const [contratoSelecionado, setContratoSelecionado] = useState(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setCarregando(true);
      setErro(null);
      
      const [fechamentosRes, clientesRes, consultoresRes, imobiliariasRes, agendamentosRes] = await Promise.all([
        makeRequest('/fechamentos'),
        makeRequest('/clientes'),
        makeRequest('/consultores'),
        makeRequest('/imobiliarias'),
        makeRequest('/agendamentos')
      ]);

      if (!fechamentosRes.ok) {
        throw new Error(`Erro ao carregar fechamentos: ${fechamentosRes.status} - Tabela 'fechamentos' não encontrada. Execute a migração no Supabase.`);
      }

      const fechamentosData = await fechamentosRes.json();
      const clientesData = await clientesRes.json();
      const consultoresData = await consultoresRes.json();
      const imobiliariasData = await imobiliariasRes.json();
      const agendamentosData = await agendamentosRes.json();

      setFechamentos(Array.isArray(fechamentosData) ? fechamentosData : []);
      setClientes(Array.isArray(clientesData) ? clientesData : []);
      setConsultores(Array.isArray(consultoresData) ? consultoresData : []);
      setClinicas(Array.isArray(imobiliariasData) ? imobiliariasData : []);
      setAgendamentos(Array.isArray(agendamentosData) ? agendamentosData : []);
      
      setCarregando(false);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setErro(error.message);
      setCarregando(false);
      
      setFechamentos([]);
      setClientes([]);
      setConsultores([]);
      setClinicas([]);
      setAgendamentos([]);
    }
  };

  const filtrarFechamentos = () => {
    if (!Array.isArray(fechamentos)) {
      return [];
    }
    return fechamentos.filter(fechamento => {
      const consultorMatch = !filtroConsultor || fechamento.consultor_id === parseInt(filtroConsultor);
      const imobiliariaMatch = !filtroClinica || fechamento.imobiliaria_id === parseInt(filtroClinica);
      
      let mesMatch = true;
      if (filtroMes) {
        const dataFechamento = new Date(fechamento.data_fechamento);
        const [ano, mes] = filtroMes.split('-');
        mesMatch = dataFechamento.getFullYear() === parseInt(ano) && 
                   dataFechamento.getMonth() === parseInt(mes) - 1;
      }

      return consultorMatch && imobiliariaMatch && mesMatch;
    });
  };

  const ordenarFechamentos = (fechamentosFiltrados) => {
    const fechamentosOrdenados = [...fechamentosFiltrados];
    
    switch (ordenacao) {
      case 'credito-desc':
        return fechamentosOrdenados.sort((a, b) => parseFloat(b.valor_fechado || 0) - parseFloat(a.valor_fechado || 0));
      case 'credito-asc':
        return fechamentosOrdenados.sort((a, b) => parseFloat(a.valor_fechado || 0) - parseFloat(b.valor_fechado || 0));
      case 'data-desc':
        return fechamentosOrdenados.sort((a, b) => new Date(b.data_fechamento) - new Date(a.data_fechamento));
      case 'data-asc':
        return fechamentosOrdenados.sort((a, b) => new Date(a.data_fechamento) - new Date(b.data_fechamento));
      case 'cliente':
        return fechamentosOrdenados.sort((a, b) => {
          const clienteA = clientes.find(c => c.id === a.cliente_id)?.nome || '';
          const clienteB = clientes.find(c => c.id === b.cliente_id)?.nome || '';
          return clienteA.localeCompare(clienteB);
        });
      default:
        return fechamentosOrdenados;
    }
  };

  const calcularEstatisticas = () => {
    const fechamentosFiltrados = filtrarFechamentos();
    // Considerar apenas fechamentos aprovados para estatísticas
    const fechamentosAprovados = fechamentosFiltrados.filter(f => f.aprovado === 'aprovado');
    
    const total = fechamentosAprovados.length;
    const valorTotal = fechamentosAprovados.reduce((acc, f) => acc + parseFloat(f.valor_fechado || 0), 0);
    const ticketMedio = total > 0 ? valorTotal / total : 0;
    
    const hoje = new Date().toISOString().split('T')[0];
    const fechamentosHoje = fechamentosAprovados.filter(f => f.data_fechamento === hoje).length;

    const mesAtual = new Date();
    const fechamentosMes = fechamentosAprovados.filter(f => {
      const dataFechamento = new Date(f.data_fechamento);
      return dataFechamento.getMonth() === mesAtual.getMonth() && 
             dataFechamento.getFullYear() === mesAtual.getFullYear();
    }).length;

    return { total, valorTotal, ticketMedio, fechamentosHoje, fechamentosMes };
  };

  const contarFiltrosAtivos = () => {
    let count = 0;
    if (filtroConsultor) count++;
    if (filtroClinica) count++;
    if (filtroMes) count++;
    return count;
  };

  const limparFiltros = () => {
    setFiltroConsultor('');
    setFiltroClinica('');
    setFiltroMes('');
  };

  const abrirModal = (fechamento = null) => {
    if (fechamento) {
      setFechamentoEditando(fechamento);
      const valorFormatado = fechamento.valor_fechado 
        ? parseFloat(fechamento.valor_fechado).toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })
        : '';
      
      setNovoFechamento({ 
        ...fechamento, 
        valor_formatado: valorFormatado 
      });
    } else {
      setFechamentoEditando(null);
      setNovoFechamento({
        cliente_id: '',
        consultor_id: '',
        imobiliaria_id: '',
        valor_fechado: '',
        valor_formatado: '',
        data_fechamento: new Date().toISOString().split('T')[0],
        tipo_servico: '',
        observacoes: ''
      });
    }
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setFechamentoEditando(null);
    setContratoSelecionado(null);
    setNovoFechamento({
      cliente_id: '',
      consultor_id: '',
      imobiliaria_id: '',
      valor_fechado: '',
      valor_formatado: '',
      data_fechamento: new Date().toISOString().split('T')[0],
      tipo_servico: '',
      observacoes: ''
    });
  };

  const salvarFechamento = async () => {
    setSalvando(true);
    try {
      const token = localStorage.getItem('token');
      if (!token || token === 'null' || token.trim() === '') {
        alert('Sua sessão expirou. Faça login novamente.');
        window.location.href = '/login';
        return;
      }

      if (!novoFechamento.cliente_id) {
        alert('Por favor, selecione um cliente!');
        return;
      }
      
      if (!novoFechamento.valor_fechado || parseFloat(novoFechamento.valor_fechado) <= 0) {
        alert('Por favor, informe um valor válido!');
        return;
      }

      if (!fechamentoEditando && !contratoSelecionado) {
        alert('Por favor, selecione o contrato em PDF!');
        return;
      }

      if (contratoSelecionado && contratoSelecionado.type !== 'application/pdf') {
        alert('Apenas arquivos PDF são permitidos para o contrato!');
        return;
      }

      if (contratoSelecionado && contratoSelecionado.size > 10 * 1024 * 1024) {
        alert('O arquivo deve ter no máximo 10MB!');
        return;
      }

      const formData = new FormData();
      
      formData.append('cliente_id', parseInt(novoFechamento.cliente_id));
      
      if (novoFechamento.consultor_id && novoFechamento.consultor_id.trim() !== '') {
        formData.append('consultor_id', parseInt(novoFechamento.consultor_id));
      }
      
      if (novoFechamento.imobiliaria_id && novoFechamento.imobiliaria_id.trim() !== '') {
        formData.append('imobiliaria_id', parseInt(novoFechamento.imobiliaria_id));
      }
      
      formData.append('valor_fechado', parseFloat(novoFechamento.valor_fechado));
      formData.append('data_fechamento', novoFechamento.data_fechamento);
      formData.append('tipo_servico', novoFechamento.tipo_servico || '');
      formData.append('observacoes', novoFechamento.observacoes || '');
      
      if (contratoSelecionado) {
        formData.append('contrato', contratoSelecionado);
      }

      // Corrigir base da URL para evitar /api/api/fechamentos
      const API_BASE_URL = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api';
      
      const url = fechamentoEditando 
        ? `${API_BASE_URL}/fechamentos/${fechamentoEditando.id}`
        : `${API_BASE_URL}/fechamentos`;
      
      console.log('🔐 Enviando requisição com token:', token ? 'presente' : 'ausente');
      
      const response = await fetch(url, {
        method: fechamentoEditando ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // NÃO incluir 'Content-Type' ao usar FormData
        },
        body: formData
      });

      const result = await response.json();

      if (response.ok) {
        carregarDados();
        fecharModal();
        alert(fechamentoEditando ? 'Fechamento atualizado!' : `Fechamento registrado com sucesso! Contrato: ${result.contrato || 'anexado'}`);
      } else {
        console.error('Erro na resposta:', result);
        alert('Erro: ' + (result.error || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error('Erro ao salvar fechamento:', error);
      alert('Erro ao salvar: ' + error.message);
    } finally {
      setSalvando(false);
    }
  };

  const excluirFechamento = async (id) => {
    if (window.confirm('Deseja excluir este fechamento?')) {
      try {
        const response = await makeRequest(`/fechamentos/${id}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          carregarDados();
          alert('Fechamento excluído!');
        } else {
          const data = await response.json();
          alert('Erro ao excluir: ' + (data.error || 'Erro desconhecido'));
        }
      } catch (error) {
        console.error('Erro ao excluir fechamento:', error);
        alert('Erro ao excluir: ' + error.message);
      }
    }
  };

  // Função para alterar status de aprovação
  const alterarStatusAprovacao = async (fechamentoId, novoStatus) => {
    try {
      console.log(`Alterando status do fechamento ${fechamentoId} para ${novoStatus}`);
      
      const endpoint = novoStatus === 'aprovado' ? 'aprovar' : 'reprovar';
      const response = await makeRequest(`/fechamentos/${fechamentoId}/${endpoint}`, { 
        method: 'PUT' 
      });
      
      console.log('Resposta da API:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('Sucesso:', result);
        carregarDados();
        alert(`Fechamento ${novoStatus === 'aprovado' ? 'aprovado' : 'reprovado'} com sucesso!`);
      } else {
        const error = await response.json();
        console.error('Erro da API:', error);
        alert('Erro ao alterar status: ' + (error.error || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error('Erro na requisição:', error);
      alert('Erro de conexão: ' + error.message);
    }
  };

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const formatarData = (data) => {
    return new Date(data + 'T00:00:00').toLocaleDateString('pt-BR');
  };

  const formatarValorInput = (valor) => {
    const numeros = valor.replace(/\D/g, '');
    if (!numeros) return '';
    const numero = parseFloat(numeros) / 100;
    return numero.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const desformatarValor = (valorFormatado) => {
    if (!valorFormatado) return '';
    return valorFormatado.replace(/\./g, '').replace(',', '.');
  };

  const handleValorChange = (e) => {
    const valorDigitado = e.target.value;
    const valorFormatado = formatarValorInput(valorDigitado);
    const valorNumerico = desformatarValor(valorFormatado);
    
    setNovoFechamento({
      ...novoFechamento, 
      valor_fechado: valorNumerico,
      valor_formatado: valorFormatado
    });
  };

  const handleClienteChange = async (clienteId) => {
    setNovoFechamento({...novoFechamento, cliente_id: clienteId});
    
    if (clienteId) {
      // Buscar última visita do cliente para pegar a imobiliária
      const ultimoAgendamento = agendamentos
        .filter(a => a.cliente_id === parseInt(clienteId))
        .sort((a, b) => new Date(b.data_agendamento) - new Date(a.data_agendamento))[0];
      
      if (ultimoAgendamento && ultimoAgendamento.imobiliaria_id) {
        setNovoFechamento(prev => ({
          ...prev,
          cliente_id: clienteId,
          imobiliaria_id: ultimoAgendamento.imobiliaria_id.toString()
        }));
      }
    }
  };

  const downloadContrato = async (fechamento) => {
    try {
      const API_BASE_URL = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000/api';
      
      const token = localStorage.getItem('token');
      if (!token || token === 'null' || token.trim() === '') {
        alert('Sua sessão expirou. Faça login novamente.');
        window.location.href = '/login';
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/fechamentos/${fechamento.id}/contrato`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        alert('Erro ao baixar contrato: ' + (data.error || 'Erro desconhecido'));
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fechamento.contrato_nome_original || 'contrato.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Erro ao baixar contrato:', error);
      alert('Erro ao baixar contrato: ' + error.message);
    }
  };

  if (carregando) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (erro) {
    return (
      <div style={{ padding: '2rem' }}>
        <div className="alert alert-error">
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem' }}>Erro ao carregar dados</h3>
          <p style={{ margin: '0 0 1rem 0' }}>{erro}</p>
          <button className="btn btn-primary" onClick={carregarDados}>
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  const fechamentosFiltrados = ordenarFechamentos(filtrarFechamentos());
  const stats = calcularEstatisticas();
  const filtrosAtivos = contarFiltrosAtivos();

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Gerenciar Fechamentos</h1>
        <p className="page-subtitle">Gerencie os fechamentos de vendas</p>
      </div>

      {/* KPIs */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-label">Total de Indicações</div>
          <div className="stat-value">{stats.total}</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Crédito Acumulado</div>
          <div className="stat-value">{formatarMoeda(stats.valorTotal)}</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Ticket Médio</div>
          <div className="stat-value">{formatarMoeda(stats.ticketMedio)}</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Indicações Hoje</div>
          <div className="stat-value">{stats.fechamentosHoje}</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Indicações no Mês</div>
          <div className="stat-value">{stats.fechamentosMes}</div>
        </div>
      </div>

      {/* Filtros e Ações */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="card-title">Lista de Fechamentos</h2>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
              Classificado por: {
                ordenacao === 'data-desc' ? 'Data (Mais recente)' :
                ordenacao === 'data-asc' ? 'Data (Mais antigo)' :
                ordenacao === 'credito-desc' ? 'Crédito Acumulado (Maior)' :
                ordenacao === 'credito-asc' ? 'Crédito Acumulado (Menor)' :
                ordenacao === 'cliente' ? 'Cliente (A-Z)' : 'Padrão'
              }
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              className="btn btn-secondary"
              onClick={() => setFiltrosVisiveis(!filtrosVisiveis)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
              </svg>
              Filtros {filtrosAtivos > 0 && `(${filtrosAtivos})`}
            </button>
            <button className="btn btn-primary" onClick={() => abrirModal()}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Novo Fechamento
            </button>
          </div>
        </div>

        {/* Filtros */}
        {filtrosVisiveis && (
          <div style={{ 
            padding: '1.5rem', 
            backgroundColor: '#f9fafb',
            borderBottom: '1px solid #e5e7eb'
          }}>
            <div className="grid grid-4" style={{ gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Corretor</label>
                <select 
                  className="form-select"
                  value={filtroConsultor} 
                  onChange={(e) => setFiltroConsultor(e.target.value)}
                >
                  <option value="">Todos</option>
                  {consultores.map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Imobiliária</label>
                <select 
                  className="form-select"
                  value={filtroClinica} 
                  onChange={(e) => setFiltroClinica(e.target.value)}
                >
                  <option value="">Todas</option>
                  {imobiliarias.map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Mês</label>
                <input 
                  type="month" 
                  className="form-input"
                  value={filtroMes} 
                  onChange={(e) => setFiltroMes(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Classificar por</label>
                <select 
                  className="form-select"
                  value={ordenacao} 
                  onChange={(e) => setOrdenacao(e.target.value)}
                >
                  <option value="data-desc">Data (Mais recente)</option>
                  <option value="data-asc">Data (Mais antigo)</option>
                  <option value="credito-desc">Crédito Acumulado (Maior)</option>
                  <option value="credito-asc">Crédito Acumulado (Menor)</option>
                  <option value="cliente">Cliente (A-Z)</option>
                </select>
              </div>
            </div>
            
            {filtrosAtivos > 0 && (
              <button 
                className="btn btn-sm btn-secondary"
                onClick={limparFiltros}
              >
                Limpar Filtros
              </button>
            )}
          </div>
        )}

        <div className="card-body">
          {fechamentosFiltrados.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
              Nenhum fechamento encontrado
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Cliente</th>
                    <th>Corretor</th>
                    <th>Imobiliária</th>
                    <th>Tipo</th>
                    <th style={{ textAlign: 'right' }}>Valor</th>
                    <th>Status</th>
                    <th style={{ width: '180px' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {fechamentosFiltrados.map(fechamento => {
                    const cliente = clientes.find(p => p.id === fechamento.cliente_id);
                    const consultor = consultores.find(c => c.id === fechamento.consultor_id);
                    const imobiliaria = imobiliarias.find(c => c.id === fechamento.imobiliaria_id);

                    return (
                      <tr key={fechamento.id}>
                        <td>{formatarData(fechamento.data_fechamento)}</td>
                        <td>
                          <div>
                            <div style={{ fontWeight: '500' }}>{cliente?.nome || 'N/A'}</div>
                            {fechamento.observacoes && (
                              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                {fechamento.observacoes}
                              </div>
                            )}
                          </div>
                        </td>
                        <td>{consultor?.nome || 'N/A'}</td>
                        <td>{imobiliaria?.nome || 'N/A'}</td>
                        <td>
                          {fechamento.tipo_servico && (
                            <span className="badge badge-info">
                              {fechamento.tipo_servico}
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '600' }}>
                          {formatarMoeda(fechamento.valor_fechado)}
                        </td>
                        <td>
                          {/* Campo select para alterar status (apenas admin) */}
                          {isAdmin ? (
                            <select 
                              value={fechamento.aprovado || 'pendente'} 
                              onChange={(e) => alterarStatusAprovacao(fechamento.id, e.target.value)}
                              className="form-select"
                              style={{ minWidth: '120px' }}
                            >
                              <option value="pendente">Pendente</option>
                              <option value="aprovado">Aprovado</option>
                              <option value="reprovado">Reprovado</option>
                            </select>
                          ) : (
                            <span className={`badge ${
                              fechamento.aprovado === 'aprovado' ? 'badge-success' : 
                              fechamento.aprovado === 'reprovado' ? 'badge-danger' : 
                              'badge-warning'
                            }`}>
                              {fechamento.aprovado === 'aprovado' ? 'Aprovado' : 
                               fechamento.aprovado === 'reprovado' ? 'Reprovado' : 
                               'Pendente'}
                            </span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            {fechamento.contrato_arquivo && (
                              <button 
                                onClick={() => downloadContrato(fechamento)}
                                className="btn btn-sm btn-success"
                                title={`Baixar contrato: ${fechamento.contrato_nome_original || 'contrato.pdf'}`}
                                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                  <polyline points="7 10 12 15 17 10"></polyline>
                                  <line x1="12" y1="15" x2="12" y2="3"></line>
                                </svg>
                                PDF
                              </button>
                            )}
                            <button 
                              className="btn btn-sm btn-secondary"
                              onClick={() => abrirModal(fechamento)}
                              title="Editar fechamento"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                            </button>
                            <button 
                              className="btn btn-sm btn-danger"
                              onClick={() => excluirFechamento(fechamento.id)}
                              title="Excluir fechamento"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modalAberto && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">
                {fechamentoEditando ? 'Editar Fechamento' : 'Novo Fechamento'}
              </h2>
              <button className="close-btn" onClick={fecharModal}>
                ×
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); salvarFechamento(); }}>
              <div className="form-group">
                <label className="form-label">Cliente *</label>
                <select 
                  className="form-select"
                  value={novoFechamento.cliente_id}
                  onChange={(e) => handleClienteChange(e.target.value)}
                  required
                >
                  <option value="">Selecione um cliente</option>
                  {clientes.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nome} {p.telefone && `- ${p.telefone}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Valor (R$) *</label>
                <input 
                  type="text"
                  className="form-input"
                  value={novoFechamento.valor_formatado}
                  onChange={handleValorChange}
                  placeholder="0,00"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Imobiliária</label>
                <select 
                  className="form-select"
                  value={novoFechamento.imobiliaria_id}
                  onChange={(e) => setNovoFechamento({...novoFechamento, imobiliaria_id: e.target.value})}
                >
                  <option value="">Selecione uma clínica</option>
                  {imobiliarias.map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Data do Fechamento</label>
                  <input 
                    type="date"
                    className="form-input"
                    value={novoFechamento.data_fechamento}
                    onChange={(e) => setNovoFechamento({...novoFechamento, data_fechamento: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Tipo de Serviço</label>
                  <select 
                    className="form-select"
                    value={novoFechamento.tipo_servico}
                    onChange={(e) => setNovoFechamento({...novoFechamento, tipo_servico: e.target.value})}
                  >
                    <option value="">Selecione</option>
                    <option value="Compra">Compra</option>
                    <option value="Venda">Venda</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Contrato (PDF) {fechamentoEditando ? '(opcional)' : '*'}</label>
                <input 
                  type="file"
                  className="form-input"
                  accept=".pdf"
                  onChange={(e) => setContratoSelecionado(e.target.files[0])}
                />
                {fechamentoEditando && fechamentoEditando.contrato_arquivo && (
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
                    Contrato atual: {fechamentoEditando.contrato_nome_original || fechamentoEditando.contrato_arquivo}
                  </p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Observações</label>
                <textarea 
                  className="form-textarea"
                  rows="3"
                  value={novoFechamento.observacoes}
                  onChange={(e) => setNovoFechamento({...novoFechamento, observacoes: e.target.value})}
                  placeholder="Informações adicionais..."
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button 
                  type="button"
                  className="btn btn-secondary" 
                  onClick={fecharModal}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="btn btn-primary"
                  disabled={salvando}
                >
                  {salvando ? (
                    <span className="loading-spinner" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 8 }}></span>
                  ) : null}
                  {fechamentoEditando ? (salvando ? 'Atualizando...' : 'Atualizar') : (salvando ? 'Salvando...' : 'Salvar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Fechamentos; 