import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Consultores = () => {
  const { makeRequest, isAdmin } = useAuth();
  const [consultores, setConsultores] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingConsultor, setEditingConsultor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [showSenhaModal, setShowSenhaModal] = useState(false);
  const [consultorSenha, setConsultorSenha] = useState(null);
  const [showPixModal, setShowPixModal] = useState(false);
  const [pixSelecionado, setPixSelecionado] = useState('');
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
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
        setMessage('Erro ao carregar consultores: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao carregar consultores:', error);
      setMessage('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  }, [makeRequest]);

  useEffect(() => {
    fetchConsultores();
  }, [fetchConsultores]);

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
        setMessage(editingConsultor ? 'Consultor atualizado com sucesso!' : 'Consultor cadastrado com sucesso!');
        setShowModal(false);
        setEditingConsultor(null);
        setFormData({
          nome: '',
          telefone: '',
          senha: '',
          pix: ''
        });
        fetchConsultores();
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Erro ao salvar consultor: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao salvar consultor:', error);
      setMessage('Erro ao salvar consultor');
    }
  };

  const handleEdit = (consultor) => {
    setEditingConsultor(consultor);
    setFormData({
      nome: consultor.nome || '',
      telefone: consultor.telefone || '',
      senha: consultor.senha || '',
      pix: consultor.pix || ''
    });
    setShowModal(true);
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
        setMessage('Erro ao carregar dados do consultor: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao carregar consultor:', error);
      setMessage('Erro ao conectar com o servidor');
    }
  };

  const copiarPix = async (pix) => {
    try {
      await navigator.clipboard.writeText(pix);
      setMessage('PIX copiado para a área de transferência!');
      setTimeout(() => setMessage(''), 2000);
    } catch (error) {
      // Fallback para navegadores mais antigos
      const textArea = document.createElement('textarea');
      textArea.value = pix;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setMessage('PIX copiado para a área de transferência!');
      setTimeout(() => setMessage(''), 2000);
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
        setMessage('Senha redefinida com sucesso!');
        setShowSenhaModal(false);
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Erro ao redefinir senha: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao redefinir senha:', error);
      setMessage('Erro ao redefinir senha');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Gerenciar Consultores</h1>
        <p className="page-subtitle">Gerencie a equipe de consultores</p>
      </div>

      {message && (
        <div className={`alert ${message.includes('sucesso') ? 'alert-success' : 'alert-error'}`}>
          {message}
        </div>
      )}

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
                  <th>Email de Acesso</th>
                  <th>Telefone</th>
                  <th>PIX</th>
                  <th>Data de Cadastro</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {consultores.map(consultor => (
                  <tr key={consultor.id}>
                    <td>
                      <strong>{consultor.nome}</strong>
                    </td>
                    <td className="text-wrap">
                      <span className="email-cell">
                        {formatarEmail(consultor)}
                      </span>
                    </td>
                    <td>
                      {consultor.telefone ? formatarTelefone(consultor.telefone) : '-'}
                    </td>
                    <td>
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
                    <td>
                      {formatarData(consultor.created_at)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
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
                  O email de acesso será gerado automaticamente baseado no nome
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
                  alert('A senha deve ter pelo menos 3 caracteres');
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