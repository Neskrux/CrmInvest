import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import useBranding from '../hooks/common/useBranding';

const Movimentacoes = () => {
  const { t } = useBranding();
  const { makeRequest, user, isAdmin } = useAuth();
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const PAGE_SIZE = 20;

  // Estados dos filtros
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtros, setFiltros] = useState({
    tipo: '',
    consultor_id: '',
    data_inicio: '',
    data_fim: '',
    empresa_id: ''
  });

  const [consultores, setConsultores] = useState([]);

  // Carregar consultores para filtro
  useEffect(() => {
    const carregarConsultores = async () => {
      try {
        const response = await makeRequest('/consultores');
        if (response.ok) {
          const data = await response.json();
          setConsultores(data);
        }
      } catch (error) {
        console.error('Erro ao carregar consultores:', error);
      }
    };

    carregarConsultores();
  }, [makeRequest]);

  // Carregar movimentações
  const carregarMovimentacoes = async (page = 1) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
        ...Object.fromEntries(Object.entries(filtros).filter(([_, value]) => value !== ''))
      });

      const response = await makeRequest(`/movimentacoes/relatorio?${queryParams}`);
      if (response.ok) {
        const data = await response.json();
        setMovimentacoes(data.movimentacoes || []);
        setTotalItems(data.total || 0);
        setTotalPages(Math.ceil((data.total || 0) / PAGE_SIZE));
      }
    } catch (error) {
      console.error('Erro ao carregar movimentações:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarMovimentacoes(currentPage);
  }, [currentPage, filtros]);

  // Função para formatar data
  const formatarData = (data) => {
    return new Date(data).toLocaleString('pt-BR');
  };

  // Função para formatar tipo de movimentação
  const formatarTipo = (tipo) => {
    const tipos = {
      'lead_atribuido': 'Lead Atribuído',
      'agendamento_criado': 'Agendamento Criado',
      'agendamento_atribuido': 'Agendamento Atribuído',
      'fechamento_criado': 'Fechamento Criado'
    };
    return tipos[tipo] || tipo;
  };

  // Função para formatar tipo de registro
  const formatarTipoRegistro = (tipo) => {
    const tipos = {
      'paciente': 'Paciente',
      'agendamento': 'Agendamento',
      'fechamento': 'Fechamento'
    };
    return tipos[tipo] || tipo;
  };

  // Função para aplicar filtros
  const aplicarFiltros = () => {
    setCurrentPage(1);
    carregarMovimentacoes(1);
  };

  // Função para limpar filtros
  const limparFiltros = () => {
    setFiltros({
      tipo: '',
      consultor_id: '',
      data_inicio: '',
      data_fim: '',
      empresa_id: ''
    });
    setCurrentPage(1);
  };

  // Função para mudar página
  const mudarPagina = (novaPagina) => {
    setCurrentPage(novaPagina);
    carregarMovimentacoes(novaPagina);
  };

  return (
    <div className="container">
      <div className="header">
        <h1>Movimentações do Sistema</h1>
        <p>Acompanhe todas as movimentações internas do sistema</p>
      </div>

      {/* Filtros */}
      <div className="card">
        <div className="card-header">
          <h3>Filtros</h3>
          <button
            className="btn btn-secondary"
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
          >
            {mostrarFiltros ? 'Ocultar Filtros' : 'Mostrar Filtros'}
          </button>
        </div>

        {mostrarFiltros && (
          <div className="card-body">
            <div className="grid grid-3">
              <div className="form-group">
                <label className="form-label">Tipo de Movimentação</label>
                <select
                  className="form-select"
                  value={filtros.tipo}
                  onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}
                >
                  <option value="">Todos os tipos</option>
                  <option value="lead_atribuido">Lead Atribuído</option>
                  <option value="agendamento_criado">Agendamento Criado</option>
                  <option value="agendamento_atribuido">Agendamento Atribuído</option>
                  <option value="fechamento_criado">Fechamento Criado</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Consultor</label>
                <select
                  className="form-select"
                  value={filtros.consultor_id}
                  onChange={(e) => setFiltros({ ...filtros, consultor_id: e.target.value })}
                >
                  <option value="">Todos os consultores</option>
                  {consultores.filter(consultor => consultor.empresa_id === user?.empresa_id).map(consultor => (
                    <option key={consultor.id} value={consultor.id}>
                      {consultor.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Data Início</label>
                <input
                  type="date"
                  className="form-input"
                  value={filtros.data_inicio}
                  onChange={(e) => setFiltros({ ...filtros, data_inicio: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Data Fim</label>
                <input
                  type="date"
                  className="form-input"
                  value={filtros.data_fim}
                  onChange={(e) => setFiltros({ ...filtros, data_fim: e.target.value })}
                />
              </div>

              {isAdmin && (
                <div className="form-group">
                  <label className="form-label">Empresa</label>
                  <select
                    className="form-select"
                    value={filtros.empresa_id}
                    onChange={(e) => setFiltros({ ...filtros, empresa_id: e.target.value })}
                  >
                    <option value="">Todas as empresas</option>
                    <option value="3">Invest Money</option>
                    <option value="5">Incorporadora</option>
                  </select>
                </div>
              )}
            </div>

            <div className="form-actions">
              <button className="btn btn-primary" onClick={aplicarFiltros}>
                Aplicar Filtros
              </button>
              <button className="btn btn-secondary" onClick={limparFiltros}>
                Limpar Filtros
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lista de Movimentações */}
      <div className="card">
        <div className="card-header">
          <h3>Movimentações ({totalItems})</h3>
        </div>

        <div className="card-body">
          {loading ? (
            <div className="loading">Carregando movimentações...</div>
          ) : movimentacoes.length === 0 ? (
            <div className="empty-state">
              <p>Nenhuma movimentação encontrada com os filtros aplicados.</p>
            </div>
          ) : (
            <>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Data/Hora</th>
                      <th>Tipo</th>
                      <th>Registro</th>
                      <th>Freelancer</th>
                      <th>SDR</th>
                      <th>Consultor Interno</th>
                      <th>Executado Por</th>
                      <th>Descrição</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimentacoes.map((movimentacao) => (
                      <tr key={movimentacao.id}>
                        <td>{formatarData(movimentacao.created_at)}</td>
                        <td>
                          <span className={`badge badge-${movimentacao.tipo}`}>
                            {formatarTipo(movimentacao.tipo)}
                          </span>
                        </td>
                        <td>
                          {formatarTipoRegistro(movimentacao.registro_tipo)} #{movimentacao.registro_id}
                        </td>
                        <td>{movimentacao.consultores?.nome || '-'}</td>
                        <td>{movimentacao.sdr?.nome || '-'}</td>
                        <td>{movimentacao.consultor_interno?.nome || '-'}</td>
                        <td>
                          {movimentacao.executado_por_nome}
                          <br />
                          <small className="text-muted">{movimentacao.executado_por_tipo}</small>
                        </td>
                        <td>{movimentacao.acao_descricao || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    className="btn btn-secondary"
                    disabled={currentPage === 1}
                    onClick={() => mudarPagina(currentPage - 1)}
                  >
                    Anterior
                  </button>
                  
                  <span className="pagination-info">
                    Página {currentPage} de {totalPages}
                  </span>
                  
                  <button
                    className="btn btn-secondary"
                    disabled={currentPage === totalPages}
                    onClick={() => mudarPagina(currentPage + 1)}
                  >
                    Próxima
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Movimentacoes;
