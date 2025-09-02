import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';

const Consultores = () => {
  const { makeRequest, isAdmin } = useAuth();
  const { showErrorToast, showSuccessToast } = useToast();
  const [consultores, setConsultores] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingConsultor, setEditingConsultor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSenhaModal, setShowSenhaModal] = useState(false);
  const [consultorSenha, setConsultorSenha] = useState(null);
  const [showPixModal, setShowPixModal] = useState(false);
  const [pixSelecionado, setPixSelecionado] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingConsultor, setViewingConsultor] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    email: '',
    senha: '',
    pix: ''
  });

  const fetchConsultores = useCallback(async () => {
    try {
      const response = await makeRequest('/consultores');
      const data = await response.json();
      
      if (response.ok) {
        setConsultores(data);
      } else {
        console.error('Erro ao carregar consultores:', data.error);
        showErrorToast('Erro ao carregar consultores: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao carregar consultores:', error);
      showErrorToast('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  }, [makeRequest]);

  useEffect(() => {
    fetchConsultores();
  }, [fetchConsultores]);

  // Detectar mudanças de tamanho da tela
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let response;
      if (editingConsultor) {
        response = await makeRequest(`/consultores/${editingConsultor.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
      } else {
        response = await makeRequest('/consultores', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
      }

      const data = await response.json();
      
      if (response.ok) {
        showSuccessToast(editingConsultor ? 'Consultor atualizado com sucesso!' : 'Consultor cadastrado com sucesso!');
        setShowModal(false);
        setEditingConsultor(null);
        setFormData({
          nome: '',
          telefone: '',
          email: '',
          senha: '',
          pix: ''
        });
        fetchConsultores();
      } else {
        showErrorToast('Erro ao salvar consultor: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao salvar consultor:', error);
      showErrorToast('Erro ao salvar consultor');
    }
  };

  const handleEdit = (consultor) => {
    setEditingConsultor(consultor);
    setFormData({
      nome: consultor.nome || '',
      telefone: consultor.telefone || '',
      email: consultor.email || '',
      senha: consultor.senha || '',
      pix: consultor.pix || ''
    });
    setShowModal(true);
  };

  const handleView = (consultor) => {
    setViewingConsultor(consultor);
    setShowViewModal(true);
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    setViewingConsultor(null);
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const formatarData = (data) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

  const formatarTelefone = (telefone) => {
    if (!telefone) return '';
    // Remove todos os caracteres não numéricos
    const numbers = telefone.replace(/\D/g, '');
    
    // Formata baseado no tamanho
    if (numbers.length === 11) {
      // Celular: (11) 99999-9999
      return `(${numbers.substring(0, 2)}) ${numbers.substring(2, 7)}-${numbers.substring(7)}`;
    } else if (numbers.length === 10) {
      // Fixo: (11) 9999-9999
      return `(${numbers.substring(0, 2)}) ${numbers.substring(2, 6)}-${numbers.substring(6)}`;
    } else if (numbers.length === 9 && numbers[0] === '9') {
      // Celular sem DDD: 99999-9999
      return `${numbers.substring(0, 5)}-${numbers.substring(5)}`;
    } else if (numbers.length === 8) {
      // Fixo sem DDD: 9999-9999
      return `${numbers.substring(0, 4)}-${numbers.substring(4)}`;
    }
    // Se não se encaixar em nenhum formato padrão, retorna como está
    return telefone;
  };

  const formatarEmail = (consultor) => {
    if (consultor.email) {
      return consultor.email;
    }
    // Gera email padronizado se não existir
    const nomeNormalizado = consultor.nome
      ?.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '');
    
    return `${nomeNormalizado}@investmoneysa.com.br`;
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      telefone: '',
      email: '',
      senha: '',
      pix: ''
    });
    setEditingConsultor(null);
    setShowModal(false);
  };

  const visualizarSenha = async (consultor) => {
    try {
      const response = await makeRequest(`/consultores/${consultor.id}`);
      const data = await response.json();
      
      if (response.ok) {
        setConsultorSenha({
          ...consultor,
          temSenha: !!data.senha,
          hashSenha: data.senha
        });
        setShowSenhaModal(true);
      } else {
        showErrorToast('Erro ao carregar dados do consultor: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao carregar consultor:', error);
      showErrorToast('Erro ao conectar com o servidor');
    }
  };

  const copiarPix = async (pix) => {
    try {
      await navigator.clipboard.writeText(pix);
      showSuccessToast('PIX copiado para a área de transferência!');
    } catch (error) {
      // Fallback para navegadores mais antigos
      const textArea = document.createElement('textarea');
      textArea.value = pix;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showSuccessToast('PIX copiado para a área de transferência!');
    }
  };

  const mostrarPixCompleto = (pix) => {
    setPixSelecionado(pix);
    setShowPixModal(true);
  };

  const formatarPixExibicao = (pix) => {
    if (!pix) return '-';
    if (pix.length > 15) {
      return pix.substring(0, 15) + '...';
    }
    return pix;
  };

  const redefinirSenha = async (consultorId, novaSenha) => {
    try {
      const consultor = consultores.find(c => c.id === consultorId);
      const response = await makeRequest(`/consultores/${consultorId}`, {
        method: 'PUT',
        body: JSON.stringify({
          nome: consultor.nome,
          telefone: consultor.telefone,
          senha: novaSenha
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        showSuccessToast('Senha redefinida com sucesso!');
        setShowSenhaModal(false);
      } else {
        showErrorToast('Erro ao redefinir senha: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao redefinir senha:', error);
      showErrorToast('Erro ao redefinir senha');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Gerenciar Consultores</h1>
        <p className="page-subtitle">Gerencie a equipe de consultores</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Equipe de Consultores</h2>
          <button 
            className="btn btn-primary"
            onClick={() => setShowModal(true)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Novo Consultor
          </button>
        </div>

        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
          </div>
        ) : consultores.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#6b7280', padding: '2rem' }}>
            Nenhum consultor cadastrado ainda.
          </p>
        ) : (
          <div className="table-container">
            <table className="table consultores-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th style={{ display: isMobile ? 'none' : 'table-cell' }}>Email de Acesso</th>
                  <th style={{ display: isMobile ? 'none' : 'table-cell' }}>Telefone</th>
                  <th style={{ display: isMobile ? 'none' : 'table-cell' }}>PIX</th>
                  <th style={{ display: isMobile ? 'none' : 'table-cell' }}>Data de Cadastro</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {consultores.map(consultor => (
                  <tr key={consultor.id}>
                    <td>
                      <strong>{consultor.nome}</strong>
                    </td>
                    <td className="text-wrap" style={{ display: isMobile ? 'none' : 'table-cell' }}>
                      <span className="email-cell">
                        {formatarEmail(consultor)}
                      </span>
                    </td>
                    <td style={{ display: isMobile ? 'none' : 'table-cell' }}>
                      {consultor.telefone ? formatarTelefone(consultor.telefone) : '-'}
                    </td>
                    <td style={{ display: isMobile ? 'none' : 'table-cell' }}>
                      {consultor.pix ? (
                        <div className="pix-container">
                          <span 
                            className="pix-text pix-tooltip"
                            data-pix={consultor.pix}
                            style={{ 
                              fontFamily: 'monospace', 
                              fontSize: '0.8rem',
                              color: '#1f2937'
                            }}
                          >
                            {formatarPixExibicao(consultor.pix)}
                          </span>
                          <div className="pix-buttons">
                            <button
                              onClick={() => mostrarPixCompleto(consultor.pix)}
                              className="btn-action"
                              title="Ver PIX completo"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                              </svg>
                            </button>
                            <button
                              onClick={() => copiarPix(consultor.pix)}
                              className="btn-action"
                              title="Copiar PIX"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                              </svg>
                            </button>
                          </div>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td style={{ display: isMobile ? 'none' : 'table-cell' }}>
                      {formatarData(consultor.created_at)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleView(consultor)}
                          className="btn-action"
                          title="Visualizar informações"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleEdit(consultor)}
                          className="btn-action"
                          title="Editar"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => visualizarSenha(consultor)}
                            className="btn-action"
                            title="Gerenciar senha"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Visualização */}
      {showViewModal && viewingConsultor && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 className="modal-title">
                Detalhes do Consultor
              </h2>
              <button 
                className="close-btn"
                onClick={closeViewModal}
              >
                ×
              </button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Nome</label>
                  <p style={{ margin: '0.25rem 0 0 0', color: '#1f2937' }}>{viewingConsultor.nome}</p>
                </div>
                
                {viewingConsultor.email && (
                  <div>
                    <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Email de Acesso</label>
                    <p style={{ margin: '0.25rem 0 0 0', color: '#1f2937' }}>{formatarEmail(viewingConsultor)}</p>
                  </div>
                )}
                
                {viewingConsultor.telefone && (
                  <div>
                    <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Telefone</label>
                    <p style={{ margin: '0.25rem 0 0 0', color: '#1f2937' }}>{formatarTelefone(viewingConsultor.telefone)}</p>
                  </div>
                )}
                
                {viewingConsultor.pix && (
                  <div>
                    <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>PIX</label>
                    <div style={{ margin: '0.25rem 0 0 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <p style={{ margin: '0', color: '#1f2937', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                        {formatarPixExibicao(viewingConsultor.pix)}
                      </p>
                      <button
                        onClick={() => mostrarPixCompleto(viewingConsultor.pix)}
                        className="btn-action"
                        title="Ver PIX completo"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      </button>
                      <button
                        onClick={() => copiarPix(viewingConsultor.pix)}
                        className="btn-action"
                        title="Copiar PIX"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
                
                {viewingConsultor.created_at && (
                  <div>
                    <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Data de Cadastro</label>
                    <p style={{ margin: '0.25rem 0 0 0', color: '#6b7280', fontSize: '0.875rem' }}>{formatarData(viewingConsultor.created_at)}</p>
                  </div>
                )}
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <button 
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeViewModal}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cadastro/Edição */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">
                {editingConsultor ? 'Editar Consultor' : 'Novo Consultor'}
              </h2>
              <button 
                className="close-btn"
                onClick={resetForm}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} autoComplete="off">
              <div className="form-group">
                <label className="form-label">Nome Completo *</label>
                <input
                  type="text"
                  name="nome"
                  className="form-input"
                  value={formData.nome}
                  onChange={handleInputChange}
                  placeholder="Digite o nome do consultor"
                  required
                  autoComplete="off"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Telefone</label>
                <input
                  type="tel"
                  name="telefone"
                  className="form-input"
                  value={formData.telefone}
                  onChange={handleInputChange}
                  placeholder="(11) 99999-9999"
                  autoComplete="off"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email para Login *</label>
                <input
                  type="email"
                  name="email"
                  className="form-input"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="consultor@email.com"
                  required
                  autoComplete="off"
                />
                <small style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                  Email que será usado para fazer login no sistema
                </small>
              </div>

              <div className="form-group">
                <label className="form-label">Senha</label>
                <input
                  type="password"
                  name="senha"
                  className="form-input"
                  value={formData.senha}
                  onChange={handleInputChange}
                  placeholder="Digite a senha do consultor"
                  autoComplete="new-password"
                />
                <small style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                  Senha para acesso ao sistema
                </small>
              </div>

              <div className="form-group">
                <label className="form-label">Chave PIX</label>
                <input
                  type="text"
                  name="pix"
                  className="form-input"
                  value={formData.pix}
                  onChange={handleInputChange}
                  placeholder="CPF, Email, Telefone ou Chave Aleatória"
                  autoComplete="off"
                />
                <small style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                  Chave PIX para recebimento de comissões
                </small>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button 
                  type="button"
                  className="btn btn-secondary"
                  onClick={resetForm}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="btn btn-primary"
                >
                  {editingConsultor ? 'Atualizar Consultor' : 'Cadastrar Consultor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Modal de Visualização/Alteração de Senha */}
      {showSenhaModal && consultorSenha && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">
                Gerenciar Senha - {consultorSenha.nome}
              </h2>
              <button 
                className="close-btn"
                onClick={() => setShowSenhaModal(false)}
              >
                ×
              </button>
            </div>

            <div style={{ padding: '1rem 0' }}>
              <div style={{ 
                padding: '1rem',
                borderRadius: '8px',
                backgroundColor: consultorSenha.temSenha ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${consultorSenha.temSenha ? '#86efac' : '#fecaca'}`,
                marginBottom: '1.5rem'
              }}>
                <div style={{ fontSize: '0.875rem', color: consultorSenha.temSenha ? '#166534' : '#dc2626' }}>
                  {consultorSenha.temSenha ? 'Senha configurada' : 'Sem senha definida'}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  {consultorSenha.temSenha 
                    ? 'Este consultor pode fazer login no sistema' 
                    : 'Este consultor não pode fazer login'
                  }
                </div>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                const novaSenha = e.target.novaSenha.value;
                if (novaSenha.length < 3) {
                  showErrorToast('A senha deve ter pelo menos 3 caracteres');
                  return;
                }
                if (window.confirm(`Tem certeza que deseja ${consultorSenha.temSenha ? 'alterar' : 'definir'} a senha?`)) {
                  redefinirSenha(consultorSenha.id, novaSenha);
                }
              }}>
                <div className="form-group">
                  <label className="form-label">Nova Senha</label>
                  <input
                    type="password"
                    name="novaSenha"
                    className="form-input"
                    placeholder="Digite a nova senha (mínimo 3 caracteres)"
                    required
                    minLength="3"
                  />
                  <small style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                    Use uma senha simples e fácil de lembrar
                  </small>
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                  <button 
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowSenhaModal(false)}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="btn btn-primary"
                  >
                    {consultorSenha.temSenha ? 'Alterar Senha' : 'Definir Senha'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Visualização do PIX */}
      {showPixModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 className="modal-title">PIX Completo</h2>
              <button 
                className="close-btn"
                onClick={() => setShowPixModal(false)}
              >
                ×
              </button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              <div style={{ 
                padding: '1rem',
                borderRadius: '8px',
                backgroundColor: '#f3f4f6',
                border: '1px solid #e5e7eb',
                marginBottom: '1.5rem'
              }}>
                <div style={{ 
                  fontFamily: 'monospace', 
                  fontSize: '1rem', 
                  color: '#1f2937',
                  wordBreak: 'break-all',
                  lineHeight: '1.5'
                }}>
                  {pixSelecionado}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button 
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowPixModal(false)}
                >
                  Fechar
                </button>
                <button 
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    copiarPix(pixSelecionado);
                    setShowPixModal(false);
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                  Copiar PIX
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Consultores; 