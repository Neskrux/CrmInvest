import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import { FileImage, Calendar, User, Filter, Search, Eye, X, Download } from 'lucide-react';

const Evidencias = () => {
  const { makeRequest, isAdmin } = useAuth();
  const { showErrorToast, showSuccessToast } = useToast();
  
  const [evidencias, setEvidencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({
    tipo: 'todos',
    usuario: 'todos',
    dataInicio: '',
    dataFim: '',
    busca: ''
  });
  const [showImageModal, setShowImageModal] = useState(false);
  const [imagemSelecionada, setImagemSelecionada] = useState(null);
  const [usuariosUnicos, setUsuariosUnicos] = useState([]);

  useEffect(() => {
    if (!isAdmin) {
      showErrorToast('Você não tem permissão para acessar esta página');
      return;
    }
    fetchEvidencias();
  }, [isAdmin]);

  const fetchEvidencias = async () => {
    setLoading(true);
    try {
      const response = await makeRequest('/evidencias/todas', {
        method: 'GET'
      });

      if (response.ok) {
        const data = await response.json();
        setEvidencias(data.evidencias || []);
        
        // Extrair usuários únicos para filtro
        const usuarios = [...new Set(data.evidencias.map(e => e.alterado_por_nome).filter(Boolean))];
        setUsuariosUnicos(usuarios);
      } else {
        showErrorToast('Erro ao carregar evidências');
      }
    } catch (error) {
      console.error('Erro ao buscar evidências:', error);
      showErrorToast('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const formatarData = (dataString) => {
    if (!dataString) return '-';
    const data = new Date(dataString);
    return data.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusLabel = (status) => {
    const statusMap = {
      // Pacientes
      'sem_primeiro_contato': 'Prospecção Ativa',
      'lead': 'Lead',
      'em_conversa': 'Em Conversa',
      'cpf_aprovado': 'CPF Aprovado',
      'cpf_reprovado': 'CPF Reprovado',
      'nao_passou_cpf': 'Não Forneceu CPF',
      'nao_tem_outro_cpf': 'Não Tem Outro CPF',
      'nao_existe': 'Não Existe',
      'nao_tem_interesse': 'Não Tem Interesse',
      'nao_reconhece': 'Não Reconhece',
      'nao_responde': 'Não Responde',
      'sem_clinica': 'Sem Clínica',
      'agendado': 'Agendado',
      'compareceu': 'Compareceu',
      'fechado': 'Fechado',
      'nao_fechou': 'Não Fechou',
      'nao_compareceu': 'Não Compareceu',
      'reagendado': 'Reagendado',
      // Clínicas
      'ativa': 'Ativa',
      'inativa': 'Inativa',
      'em_contato': 'Em Contato',
      'reuniao_marcada': 'Reunião Marcada',
      'aguardando_documentacao': 'Aguardando Documentação',
      'tem_interesse': 'Tem Interesse',
      'nao_e_nosso_publico': 'Não é Nosso Público'
    };
    return statusMap[status] || status;
  };

  const getTipoLabel = (tipo) => {
    const tipoMap = {
      'paciente': 'Paciente',
      'clinica': 'Clínica',
      'nova_clinica': 'Nova Clínica'
    };
    return tipoMap[tipo] || tipo;
  };

  const getTipoBadgeColor = (tipo) => {
    const cores = {
      'paciente': '#3b82f6',
      'clinica': '#10b981',
      'nova_clinica': '#8b5cf6'
    };
    return cores[tipo] || '#6b7280';
  };

  const abrirImagemModal = (evidencia) => {
    setImagemSelecionada(evidencia);
    setShowImageModal(true);
  };

  const fecharImagemModal = () => {
    setShowImageModal(false);
    setImagemSelecionada(null);
  };

  const downloadImagem = (url, filename) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'evidencia.jpg';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtrar evidências
  const evidenciasFiltradas = evidencias.filter(ev => {
    // Filtro por tipo
    if (filtros.tipo !== 'todos' && ev.tipo !== filtros.tipo) return false;
    
    // Filtro por usuário
    if (filtros.usuario !== 'todos' && ev.alterado_por_nome !== filtros.usuario) return false;
    
    // Filtro por data início
    if (filtros.dataInicio && new Date(ev.created_at) < new Date(filtros.dataInicio)) return false;
    
    // Filtro por data fim
    if (filtros.dataFim && new Date(ev.created_at) > new Date(filtros.dataFim + 'T23:59:59')) return false;
    
    // Busca textual
    if (filtros.busca) {
      const busca = filtros.busca.toLowerCase();
      const campos = [
        ev.alterado_por_nome,
        ev.nome_registro,
        ev.status_novo,
        ev.status_anterior,
        ev.observacao,
        getTipoLabel(ev.tipo)
      ].filter(Boolean).join(' ').toLowerCase();
      
      if (!campos.includes(busca)) return false;
    }
    
    return true;
  });

  // Agrupar por usuário
  const evidenciasPorUsuario = evidenciasFiltradas.reduce((acc, ev) => {
    const usuario = ev.alterado_por_nome || 'Usuário Desconhecido';
    if (!acc[usuario]) {
      acc[usuario] = [];
    }
    acc[usuario].push(ev);
    return acc;
  }, {});

  if (!isAdmin) {
    return (
      <div className="container" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Acesso Negado</h2>
        <p>Você não tem permissão para acessar esta página.</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '2rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          Histórico de Evidências
        </h1>
        <p style={{ color: '#6b7280', fontSize: '1rem' }}>
          Visualize todas as evidências anexadas pelos consultores ao alterar status
        </p>
      </div>

      {/* Filtros */}
      <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Filter size={20} style={{ color: '#6b7280' }} />
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', margin: 0 }}>Filtros</h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {/* Busca */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">
              <Search size={16} style={{ marginRight: '0.25rem' }} />
              Buscar
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="Buscar em todos os campos..."
              value={filtros.busca}
              onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
            />
          </div>

          {/* Tipo */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Tipo</label>
            <select
              className="form-select"
              value={filtros.tipo}
              onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}
            >
              <option value="todos">Todos</option>
              <option value="paciente">Pacientes</option>
              <option value="clinica">Clínicas</option>
              <option value="nova_clinica">Novas Clínicas</option>
            </select>
          </div>

          {/* Usuário */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">
              <User size={16} style={{ marginRight: '0.25rem' }} />
              Usuário
            </label>
            <select
              className="form-select"
              value={filtros.usuario}
              onChange={(e) => setFiltros({ ...filtros, usuario: e.target.value })}
            >
              <option value="todos">Todos</option>
              {usuariosUnicos.map(usuario => (
                <option key={usuario} value={usuario}>{usuario}</option>
              ))}
            </select>
          </div>

          {/* Data Início */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">
              <Calendar size={16} style={{ marginRight: '0.25rem' }} />
              Data Início
            </label>
            <input
              type="date"
              className="form-input"
              value={filtros.dataInicio}
              onChange={(e) => setFiltros({ ...filtros, dataInicio: e.target.value })}
            />
          </div>

          {/* Data Fim */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">
              <Calendar size={16} style={{ marginRight: '0.25rem' }} />
              Data Fim
            </label>
            <input
              type="date"
              className="form-input"
              value={filtros.dataFim}
              onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value })}
            />
          </div>
        </div>

        {/* Botão Limpar Filtros */}
        {(filtros.busca || filtros.tipo !== 'todos' || filtros.usuario !== 'todos' || filtros.dataInicio || filtros.dataFim) && (
          <button
            className="btn btn-secondary"
            onClick={() => setFiltros({ tipo: 'todos', usuario: 'todos', dataInicio: '', dataFim: '', busca: '' })}
            style={{ marginTop: '1rem' }}
          >
            Limpar Filtros
          </button>
        )}
      </div>
      
      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner" style={{ margin: '0 auto' }}></div>
          <p style={{ marginTop: '1rem', color: '#6b7280' }}>Carregando evidências...</p>
        </div>
      )}

      {/* Lista de Evidências Agrupadas por Usuário */}
      {!loading && evidenciasFiltradas.length === 0 && (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <FileImage size={64} style={{ color: '#cbd5e1', margin: '0 auto 1rem' }} />
          <h3 style={{ color: '#6b7280', marginBottom: '0.5rem' }}>Nenhuma evidência encontrada</h3>
          <p style={{ color: '#9ca3af' }}>
            {filtros.busca || filtros.tipo !== 'todos' || filtros.usuario !== 'todos' || filtros.dataInicio || filtros.dataFim
              ? 'Tente ajustar os filtros'
              : 'Evidências aparecerão aqui quando os consultores alterarem status'}
          </p>
        </div>
      )}

      {!loading && Object.entries(evidenciasPorUsuario).map(([usuario, evidenciasUsuario]) => (
        <div key={usuario} style={{ marginBottom: '2rem' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem',
            marginBottom: '1rem',
            padding: '0.75rem 1rem',
            backgroundColor: '#f8fafc',
            borderRadius: '0.5rem',
            borderLeft: '4px solid #3b82f6'
          }}>
            <User size={24} style={{ color: '#3b82f6' }} />
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>{usuario}</h3>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                {evidenciasUsuario.length} evidência{evidenciasUsuario.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1rem' }}>
            {evidenciasUsuario.map((evidencia) => (
              <div 
                key={evidencia.id} 
                className="card" 
                style={{ 
                  padding: '1.25rem',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '';
                }}
              >
                {/* Header do Card */}
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                    <span 
                      className="badge"
                      style={{
                        backgroundColor: getTipoBadgeColor(evidencia.tipo) + '20',
                        color: getTipoBadgeColor(evidencia.tipo),
                        border: `1px solid ${getTipoBadgeColor(evidencia.tipo)}`,
                        fontWeight: '600'
                      }}
                    >
                      {getTipoLabel(evidencia.tipo)}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                      ID: {evidencia.registro_id}
                    </span>
                  </div>
                  <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>
                    {evidencia.nome_registro}
                  </h4>
                </div>

                {/* Preview da Imagem */}
                <div 
                  style={{
                    width: '100%',
                    height: '180px',
                    backgroundColor: '#f1f5f9',
                    borderRadius: '0.5rem',
                    overflow: 'hidden',
                    marginBottom: '1rem',
                    position: 'relative',
                    cursor: 'pointer'
                  }}
                  onClick={() => abrirImagemModal(evidencia)}
                >
                  <img 
                    src={evidencia.evidencia_url} 
                    alt="Evidência"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    color: 'white',
                    padding: '0.5rem 1rem',
                    borderRadius: '0.375rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    opacity: 0,
                    transition: 'opacity 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = 0}
                  >
                    <Eye size={20} />
                    <span>Ver imagem</span>
                  </div>
                </div>

                {/* Status */}
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                    Alteração de Status
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {evidencia.status_anterior && (
                      <>
                        <span style={{ 
                          fontSize: '0.875rem', 
                          padding: '0.25rem 0.5rem',
                          backgroundColor: '#fee2e2',
                          color: '#dc2626',
                          borderRadius: '0.25rem',
                          fontWeight: '500'
                        }}>
                          {getStatusLabel(evidencia.status_anterior)}
                        </span>
                        <span style={{ color: '#9ca3af' }}>→</span>
                      </>
                    )}
                    <span style={{ 
                      fontSize: '0.875rem', 
                      padding: '0.25rem 0.5rem',
                      backgroundColor: '#dbeafe',
                      color: '#2563eb',
                      borderRadius: '0.25rem',
                      fontWeight: '500'
                    }}>
                      {getStatusLabel(evidencia.status_novo)}
                    </span>
                  </div>
                </div>

                {/* Observação */}
                {evidencia.observacao && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                      Observação
                    </div>
                    <p style={{ 
                      fontSize: '0.875rem', 
                      color: '#374151',
                      margin: 0,
                      backgroundColor: '#f9fafb',
                      padding: '0.5rem',
                      borderRadius: '0.375rem',
                      borderLeft: '3px solid #3b82f6'
                    }}>
                      {evidencia.observacao}
                    </p>
                  </div>
                )}

                {/* Footer */}
                <div style={{ 
                  paddingTop: '0.75rem', 
                  borderTop: '1px solid #e5e7eb',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: '#6b7280' }}>
                    <Calendar size={14} />
                    {formatarData(evidencia.created_at)}
                  </div>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                    onClick={() => downloadImagem(evidencia.evidencia_url, evidencia.evidencia_filename)}
                  >
                    <Download size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Modal de Imagem */}
      {showImageModal && imagemSelecionada && (
        <div className="modal-overlay" style={{ zIndex: 10000 }} onClick={fecharImagemModal}>
          <div 
            className="modal" 
            style={{ maxWidth: '90vw', maxHeight: '90vh', padding: 0, overflow: 'hidden' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ padding: '1rem 1.5rem' }}>
              <div>
                <h2 className="modal-title" style={{ marginBottom: '0.25rem' }}>
                  {imagemSelecionada.nome_registro}
                </h2>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                  {getTipoLabel(imagemSelecionada.tipo)} - {getStatusLabel(imagemSelecionada.status_novo)}
                </p>
              </div>
              <button className="close-btn" onClick={fecharImagemModal}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: '1rem 1.5rem', maxHeight: 'calc(90vh - 160px)', overflow: 'auto' }}>
              <img 
                src={imagemSelecionada.evidencia_url} 
                alt="Evidência"
                style={{
                  width: '100%',
                  height: 'auto',
                  borderRadius: '0.5rem'
                }}
              />
              {imagemSelecionada.observacao && (
                <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem' }}>
                  <strong>Observação:</strong> {imagemSelecionada.observacao}
                </div>
              )}
              <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                <strong>Alterado por:</strong> {imagemSelecionada.alterado_por_nome} <br />
                <strong>Data:</strong> {formatarData(imagemSelecionada.created_at)} <br />
                <strong>Arquivo:</strong> {imagemSelecionada.evidencia_filename}
              </div>
            </div>
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button 
                className="btn btn-secondary" 
                onClick={fecharImagemModal}
              >
                Fechar
              </button>
              <button 
                className="btn btn-primary" 
                onClick={() => downloadImagem(imagemSelecionada.evidencia_url, imagemSelecionada.evidencia_filename)}
              >
                <Download size={16} style={{ marginRight: '0.5rem' }} />
                Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Evidencias;

