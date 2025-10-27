import React, { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../config';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';

const PacientesFinanceiro = () => {
  const { user } = useAuth();
  const { error: showErrorToast, success: showSuccessToast } = useToast();
  
  // Função para limitar caracteres e evitar sobreposição
  const limitarCaracteres = (texto, limite = 18) => {
    if (!texto) return '';
    if (texto.length <= limite) return texto;
    return texto.substring(0, limite) + '...';
  };
  
  // Verificar se é clínica
  const isClinica = user?.tipo === 'clinica';
  
  // Estados principais
  const [leads, setLeads] = useState([]); // Pacientes/leads atrelados à clínica
  const [pacientes, setPacientes] = useState([]); // Pacientes cadastrados manualmente
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPaciente, setEditingPaciente] = useState(null);
  const [activeTab, setActiveTab] = useState('leads'); // 'leads' ou 'meus-pacientes'
  
  // Estados para filtros
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtroNome, setFiltroNome] = useState('');
  const [filtroTelefone, setFiltroTelefone] = useState('');
  const [filtroCPF, setFiltroCPF] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroResponsavel, setFiltroResponsavel] = useState('');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  
  // Estados para paginação
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;
  
  // Estados para upload de documentos
  const [uploading, setUploading] = useState(false);
  
  // Estados para formulário
  const [formData, setFormData] = useState({
    cpf: '',
    nome: '',
    contato: '',
    valor_parcela: '',
    numero_parcelas: '',
    vencimento: '',
    valor_tratamento: '',
    antecipacao_meses: '',
    data_operacao: '',
    entregue: false,
    analise: '',
    responsavel: '',
    observacoes_financeiras: '',
    status: 'novo'
  });
  
  // Estados para arquivos
  const [arquivos, setArquivos] = useState({
    selfie_doc: null,
    documento: null,
    comprovante_residencia: null,
    contrato_servico: null,
    confirmacao_sacado: null
  });

  // Opções de status para pacientes financeiros
  const statusOptions = [
    { value: 'novo', label: 'Novo', color: '#6b7280' },
    { value: 'em_analise', label: 'Em Análise', color: '#f59e0b' },
    { value: 'aprovado', label: 'Aprovado', color: '#10b981' },
    { value: 'reprovado', label: 'Reprovado', color: '#ef4444' },
    { value: 'pendente_documentos', label: 'Pendente Documentos', color: '#8b5cf6' },
    { value: 'operacao_realizada', label: 'Operação Realizada', color: '#3b82f6' },
    { value: 'finalizado', label: 'Finalizado', color: '#059669' }
  ];

  // Função para buscar leads (pacientes atrelados)
  const fetchLeads = async () => {
    try {
      setLoading(true);
      // Buscar pacientes normais atrelados à clínica
      // O backend já filtra automaticamente por clinica_id quando o usuário é clínica
        token: user?.token ? 'Token presente' : 'Token ausente',
        url: `${config.API_BASE_URL}/pacientes`
      });
      
      const response = await axios.get(`${config.API_BASE_URL}/pacientes`, {
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      });
      setLeads(response.data || []);
    } catch (error) {
      console.error('Erro ao buscar leads:', error);
      if (error.response) {
        console.error('Resposta do erro:', {
          status: error.response.status,
          data: error.response.data
        });
      }
      showErrorToast('Erro ao carregar leads');
    } finally {
      setLoading(false);
    }
  };

  // Função para buscar pacientes financeiros
  const fetchPacientes = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${config.API_BASE_URL}/pacientes-financeiro`, {
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      });
      setPacientes(response.data || []);
    } catch (error) {
      console.error('Erro ao buscar pacientes:', error);
      showErrorToast('Erro ao carregar pacientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
    fetchPacientes();
  }, []);

  // Função para formatar valores monetários
  const formatarMoeda = (valor) => {
    if (!valor) return '';
    const numero = typeof valor === 'string' ? parseFloat(valor.replace(/[^\d,-]/g, '').replace(',', '.')) : valor;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numero);
  };

  // Função para formatar CPF
  const formatarCPF = (cpf) => {
    if (!cpf) return '';
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  // Função para formatar telefone
  const formatarTelefone = (telefone) => {
    if (!telefone) return '';
    const cleaned = telefone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return telefone;
  };

  // Função para formatar data
  const formatarData = (data) => {
    if (!data) return '';
    const date = new Date(data);
    return date.toLocaleDateString('pt-BR');
  };

  // Filtrar dados baseado na aba ativa
  const dadosAtivos = activeTab === 'leads' ? leads : pacientes;
  const dadosFiltrados = dadosAtivos.filter(item => {
    const matchNome = !filtroNome || item.nome?.toLowerCase().includes(filtroNome.toLowerCase());
    const matchTelefone = !filtroTelefone || (item.contato || item.telefone)?.includes(filtroTelefone);
    const matchCPF = !filtroCPF || item.cpf?.includes(filtroCPF);
    const matchStatus = !filtroStatus || item.status === filtroStatus;
    const matchResponsavel = !filtroResponsavel || item.responsavel?.toLowerCase().includes(filtroResponsavel.toLowerCase());
    
    let matchData = true;
    if (filtroDataInicio || filtroDataFim) {
      const dataOperacao = item.data_operacao ? new Date(item.data_operacao) : null;
      if (dataOperacao) {
        if (filtroDataInicio && dataOperacao < new Date(filtroDataInicio)) matchData = false;
        if (filtroDataFim && dataOperacao > new Date(filtroDataFim)) matchData = false;
      }
    }
    
    return matchNome && matchTelefone && matchCPF && matchStatus && matchResponsavel && matchData;
  });

  // Paginação
  const totalPages = Math.ceil(dadosFiltrados.length / PAGE_SIZE);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const dadosPaginados = dadosFiltrados.slice(startIndex, startIndex + PAGE_SIZE);

  // Função para salvar paciente
  const handleSave = async () => {
    try {
      setLoading(true);
      const formDataToSend = new FormData();
      
      // Adicionar dados do formulário
      Object.keys(formData).forEach(key => {
        formDataToSend.append(key, formData[key]);
      });
      
      // Adicionar arquivos
      Object.keys(arquivos).forEach(key => {
        if (arquivos[key]) {
          formDataToSend.append(key, arquivos[key]);
        }
      });
      
      const url = editingPaciente 
        ? `${config.API_BASE_URL}/pacientes-financeiro/${editingPaciente.id}`
        : `${config.API_BASE_URL}/pacientes-financeiro`;
        
      const method = editingPaciente ? 'put' : 'post';
      
      await axios[method](url, formDataToSend, {
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      showSuccessToast(editingPaciente ? 'Paciente atualizado com sucesso!' : 'Paciente cadastrado com sucesso!');
      setShowModal(false);
      setEditingPaciente(null);
      resetForm();
      fetchPacientes();
    } catch (error) {
      console.error('Erro ao salvar paciente:', error);
      showErrorToast('Erro ao salvar paciente');
    } finally {
      setLoading(false);
    }
  };

  // Função para resetar formulário
  const resetForm = () => {
    setFormData({
      cpf: '',
      nome: '',
      contato: '',
      valor_parcela: '',
      numero_parcelas: '',
      vencimento: '',
      valor_tratamento: '',
      antecipacao_meses: '',
      data_operacao: '',
      entregue: false,
      analise: '',
      responsavel: '',
      observacoes_financeiras: '',
      status: 'novo'
    });
    setArquivos({
      selfie_doc: null,
      documento: null,
      comprovante_residencia: null,
      contrato_servico: null,
      confirmacao_sacado: null
    });
  };

  // Função para editar paciente
  const handleEdit = (paciente) => {
    setEditingPaciente(paciente);
    setFormData({
      cpf: paciente.cpf || '',
      nome: paciente.nome || '',
      contato: paciente.contato || '',
      valor_parcela: paciente.valor_parcela || '',
      numero_parcelas: paciente.numero_parcelas || '',
      vencimento: paciente.vencimento || '',
      valor_tratamento: paciente.valor_tratamento || '',
      antecipacao_meses: paciente.antecipacao_meses || '',
      data_operacao: paciente.data_operacao || '',
      entregue: paciente.entregue || false,
      analise: paciente.analise || '',
      responsavel: paciente.responsavel || '',
      observacoes_financeiras: paciente.observacoes_financeiras || '',
      status: paciente.status || 'novo'
    });
    setShowModal(true);
  };

  // Função para excluir paciente
  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este paciente?')) return;
    
    try {
      await axios.delete(`${config.API_BASE_URL}/pacientes-financeiro/${id}`, {
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      });
      showSuccessToast('Paciente excluído com sucesso!');
      fetchPacientes();
    } catch (error) {
      console.error('Erro ao excluir paciente:', error);
      showErrorToast('Erro ao excluir paciente');
    }
  };

  // Função para download de documento
  const handleDownload = (url, filename) => {
    window.open(url, '_blank');
  };

  // Verificar permissões - clínica pode editar apenas na aba "Meus Pacientes"
  const podeEditar = activeTab === 'meus-pacientes'; // Clínicas podem editar apenas seus cadastros manuais
  const podeExcluir = activeTab === 'meus-pacientes'; // Clínicas podem excluir apenas seus cadastros manuais

  return (
    <div className="pacientes-container">
      <h1 className="page-title">Pacientes</h1>

      {/* Abas */}
      <div className="tabs" style={{ marginBottom: '2rem' }}>
        <button
          className={`tab ${activeTab === 'leads' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('leads');
            setCurrentPage(1);
          }}
        >
          Leads
          <span style={{ marginLeft: '0.5rem', fontSize: '0.875rem', opacity: 0.8 }}>
            ({leads.length})
          </span>
        </button>
        <button
          className={`tab ${activeTab === 'meus-pacientes' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('meus-pacientes');
            setCurrentPage(1);
          }}
        >
          Meus Pacientes
          <span style={{ marginLeft: '0.5rem', fontSize: '0.875rem', opacity: 0.8 }}>
            ({pacientes.length})
          </span>
        </button>
      </div>

      {/* Filtros */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="card-title" style={{ fontSize: '1.1rem' }}>Filtros</h2>
          <button className="btn btn-secondary" onClick={() => setMostrarFiltros(!mostrarFiltros)}>
            {mostrarFiltros ? 'Ocultar Filtros' : 'Mostrar Filtros'}
          </button>
        </div>
        {mostrarFiltros && (
          <div style={{ padding: '1.5rem', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <div className="grid grid-3" style={{ gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Nome</label>
                <input type="text" className="form-input" value={filtroNome} onChange={e => setFiltroNome(e.target.value)} placeholder="Buscar por nome" />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Telefone</label>
                <input type="text" className="form-input" value={filtroTelefone} onChange={e => setFiltroTelefone(e.target.value)} placeholder="Buscar por telefone" />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">CPF</label>
                <input type="text" className="form-input" value={filtroCPF} onChange={e => setFiltroCPF(e.target.value)} placeholder="Buscar por CPF" />
              </div>
            </div>
            <div className="grid grid-3" style={{ gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Status</label>
                <select className="form-select" value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
                  <option value="">Todos</option>
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Responsável</label>
                <input type="text" className="form-input" value={filtroResponsavel} onChange={e => setFiltroResponsavel(e.target.value)} placeholder="Buscar por responsável" />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Data Operação</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input type="date" className="form-input" value={filtroDataInicio} onChange={e => setFiltroDataInicio(e.target.value)} />
                  <input type="date" className="form-input" value={filtroDataFim} onChange={e => setFiltroDataFim(e.target.value)} />
                </div>
              </div>
            </div>
            <button className="btn btn-sm btn-secondary" onClick={() => {
              setFiltroNome('');
              setFiltroTelefone('');
              setFiltroCPF('');
              setFiltroStatus('');
              setFiltroResponsavel('');
              setFiltroDataInicio('');
              setFiltroDataFim('');
            }}>Limpar Filtros</button>
          </div>
        )}
      </div>

      {/* Tabela de Pacientes */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="card-title">
            {activeTab === 'leads' ? 'Lista de Leads' : 'Pacientes Cadastrados'}
          </h2>
          {podeEditar && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Novo Paciente
            </button>
          )}
        </div>

        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
          </div>
        ) : dadosPaginados.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#6b7280', padding: '3rem' }}>
            {activeTab === 'leads' 
              ? 'Nenhum lead encontrado.' 
              : 'Nenhum paciente cadastrado ainda.'}
          </div>
        ) : activeTab === 'leads' ? (
          // Tabela para Leads
          <>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Telefone</th>
                    <th>CPF</th>
                    <th>Cidade</th>
                    <th>Tipo</th>
                    <th>Status</th>
                    <th>Cadastrado</th>
                  </tr>
                </thead>
                <tbody>
                  {dadosPaginados.map(lead => {
                    const statusInfo = statusOptions.find(s => s.value === lead.status) || { label: lead.status, color: '#6b7280' };
                    return (
                      <tr key={lead.id}>
                        <td><strong title={lead.nome}>{limitarCaracteres(lead.nome, 18)}</strong></td>
                        <td>{formatarTelefone(lead.telefone)}</td>
                        <td>{formatarCPF(lead.cpf)}</td>
                        <td>{lead.cidade || '-'}</td>
                        <td>{lead.tipo_tratamento || '-'}</td>
                        <td>
                          <span className="badge" style={{ backgroundColor: statusInfo.color + '20', color: statusInfo.color }}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td>{formatarData(lead.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          // Tabela para Meus Pacientes
          <>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>CPF</th>
                    <th>Nome</th>
                    <th>Contato</th>
                    <th>Valor Parcela</th>
                    <th>Nº Parcelas</th>
                    <th>Dia do Vencimento</th>
                    <th>Valor Tratamento</th>
                    <th>Antecipação</th>
                    <th>Data Operação</th>
                    <th>Entregue</th>
                    <th>Análise</th>
                    <th>Responsável</th>
                    <th>Documentos</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {dadosPaginados.map(paciente => {
                    const statusInfo = statusOptions.find(s => s.value === paciente.status) || statusOptions[0];
                    return (
                      <tr key={paciente.id}>
                        <td>
                          <span className="badge" style={{ backgroundColor: statusInfo.color + '20', color: statusInfo.color }}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td>{formatarCPF(paciente.cpf)}</td>
                        <td>
                          <strong title={paciente.nome}>{limitarCaracteres(paciente.nome, 18)}</strong>
                          {paciente.observacoes_financeiras && (
                            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                              {paciente.observacoes_financeiras}
                            </div>
                          )}
                        </td>
                        <td>{formatarTelefone(paciente.contato)}</td>
                        <td>{formatarMoeda(paciente.valor_parcela)}</td>
                        <td>{paciente.numero_parcelas || '-'}</td>
                        <td>{formatarData(paciente.vencimento)}</td>
                        <td>{formatarMoeda(paciente.valor_tratamento)}</td>
                        <td>{paciente.antecipacao_meses ? `${paciente.antecipacao_meses} meses` : '-'}</td>
                        <td>{formatarData(paciente.data_operacao)}</td>
                        <td>
                          <span className={`badge ${paciente.entregue ? 'badge-success' : 'badge-secondary'}`}>
                            {paciente.entregue ? 'Sim' : 'Não'}
                          </span>
                        </td>
                        <td>{paciente.analise || '-'}</td>
                        <td>{paciente.responsavel || '-'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            {paciente.selfie_doc_url && (
                              <button
                                onClick={() => handleDownload(paciente.selfie_doc_url, 'selfie-doc.jpg')}
                                className="btn-action"
                                title="Selfie com Documento"
                              >
                                📷
                              </button>
                            )}
                            {paciente.documento_url && (
                              <button
                                onClick={() => handleDownload(paciente.documento_url, 'documento.pdf')}
                                className="btn-action"
                                title="Documento"
                              >
                                📄
                              </button>
                            )}
                            {paciente.comprovante_residencia_url && (
                              <button
                                onClick={() => handleDownload(paciente.comprovante_residencia_url, 'comprovante.pdf')}
                                className="btn-action"
                                title="Comprovante de Residência"
                              >
                                🏠
                              </button>
                            )}
                            {paciente.contrato_servico_url && (
                              <button
                                onClick={() => handleDownload(paciente.contrato_servico_url, 'contrato.pdf')}
                                className="btn-action"
                                title="Contrato de Serviço"
                              >
                                📑
                              </button>
                            )}
                            {paciente.confirmacao_sacado_url && (
                              <button
                                onClick={() => handleDownload(paciente.confirmacao_sacado_url, 'confirmacao.jpg')}
                                className="btn-action"
                                title="Confirmação do Sacado"
                              >
                                ✅
                              </button>
                            )}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {podeEditar && (
                              <button
                                onClick={() => handleEdit(paciente)}
                                className="btn-action"
                                title="Editar"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </button>
                            )}
                            {podeExcluir && (
                              <button
                                onClick={() => handleDelete(paciente.id)}
                                className="btn-action"
                                title="Excluir"
                                style={{ color: '#dc2626' }}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="3 6 5 6 21 6"></polyline>
                                  <path d="m19 6-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                                  <path d="m10 11 0 6"></path>
                                  <path d="m14 11 0 6"></path>
                                </svg>
                              </button>
                            )}
                            {!podeEditar && !podeExcluir && (
                              <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>-</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
              <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                Página {currentPage} de {totalPages}
              </div>
              <div>
                <button
                  className="btn"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  style={{ marginRight: '8px' }}
                >
                  Anterior
                </button>
                <button
                  className="btn"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                >
                  Próxima
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal de Edição/Cadastro - apenas para aba Meus Pacientes */}
      {showModal && activeTab === 'meus-pacientes' && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modal-header">
              <h2>{editingPaciente ? 'Editar Paciente' : 'Novo Paciente'}</h2>
              <button className="close-button" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="grid grid-2" style={{ gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">CPF *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.cpf}
                    onChange={e => setFormData({...formData, cpf: e.target.value})}
                    placeholder="000.000.000-00"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Nome *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.nome}
                    onChange={e => setFormData({...formData, nome: e.target.value})}
                    placeholder="Nome completo"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Contato *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.contato}
                    onChange={e => setFormData({...formData, contato: e.target.value})}
                    placeholder="(11) 99999-9999"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value})}
                  >
                    {statusOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Informações Financeiras</h3>
              <div className="grid grid-3" style={{ gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Valor da Parcela</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.valor_parcela}
                    onChange={e => setFormData({...formData, valor_parcela: e.target.value})}
                    placeholder="R$ 0,00"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Número de Parcelas</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.numero_parcelas}
                    onChange={e => setFormData({...formData, numero_parcelas: e.target.value})}
                    placeholder="12"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Dia do Vencimento</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.vencimento}
                    onChange={e => setFormData({...formData, vencimento: e.target.value})}
                    placeholder="Ex: 15"
                    min="1"
                    max="31"
                  />
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem', marginBottom: 0 }}>
                    Digite o dia do mês (1 a 31)
                  </p>
                </div>
                <div className="form-group">
                  <label className="form-label">Valor do Tratamento</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.valor_tratamento}
                    onChange={e => setFormData({...formData, valor_tratamento: e.target.value})}
                    placeholder="R$ 0,00"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Antecipação (meses)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.antecipacao_meses}
                    onChange={e => setFormData({...formData, antecipacao_meses: e.target.value})}
                    placeholder="0"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Data da Operação</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.data_operacao}
                    onChange={e => setFormData({...formData, data_operacao: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-2" style={{ gap: '1rem', marginTop: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Responsável</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.responsavel}
                    onChange={e => setFormData({...formData, responsavel: e.target.value})}
                    placeholder="Nome do responsável"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Análise</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.analise}
                    onChange={e => setFormData({...formData, analise: e.target.value})}
                    placeholder="Status da análise"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <input
                    type="checkbox"
                    checked={formData.entregue}
                    onChange={e => setFormData({...formData, entregue: e.target.checked})}
                    style={{ marginRight: '0.5rem' }}
                  />
                  Entregue
                </label>
              </div>

              <div className="form-group">
                <label className="form-label">Observações</label>
                <textarea
                  className="form-input"
                  value={formData.observacoes_financeiras}
                  onChange={e => setFormData({...formData, observacoes_financeiras: e.target.value})}
                  rows="3"
                  placeholder="Observações sobre o paciente..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
                {loading ? 'Salvando...' : (editingPaciente ? 'Atualizar' : 'Cadastrar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PacientesFinanceiro;
