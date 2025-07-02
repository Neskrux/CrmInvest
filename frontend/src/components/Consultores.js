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
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    senha: ''
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
          senha: ''
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
      senha: consultor.senha || ''
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
    const numbers = telefone.replace(/\D/g, '');
    if (numbers.length === 11) {
      return `(${numbers.substring(0, 2)}) ${numbers.substring(2, 7)}-${numbers.substring(7)}`;
    }
    return telefone;
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      telefone: '',
      senha: ''
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
        <h1 className="page-title">🩺 Gestão de Consultores</h1>
        <p className="page-subtitle">Cadastre os consultores da sua empresa</p>
      </div>

      {message && (
        <div className={`alert ${message.includes('sucesso') ? 'alert-success' : 'alert-error'}`}>
          {message}
        </div>
      )}

      {/* Resumo de Informações */}
      <div style={{ 
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', 
        padding: '2rem', 
        borderRadius: '16px', 
        marginBottom: '2rem',
        border: '1px solid #cbd5e0',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '1.5rem' 
        }}>
          <h3 style={{ 
            fontSize: '1.2rem', 
            fontWeight: '600', 
            color: '#2d3748', 
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            📊 Informações da Equipe
          </h3>
          <button 
            className="btn btn-primary"
            onClick={() => setShowModal(true)}
            style={{ 
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              fontWeight: '600'
            }}
          >
            ➕ Novo Consultor
          </button>
        </div>
        
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
          <div style={{ 
            background: 'white', 
            padding: '2rem', 
            borderRadius: '12px', 
            textAlign: 'center',
            border: '1px solid #e2e8f0',
            borderLeft: '4px solid #667eea'
          }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#667eea', marginBottom: '0.5rem' }}>
              {consultores.length}
            </div>
            <div style={{ color: '#718096', fontSize: '1rem', fontWeight: '500' }}>🩺 Total de Consultores</div>
          </div>
          
          <div style={{ 
            background: 'white', 
            padding: '2rem', 
            borderRadius: '12px', 
            textAlign: 'center',
            border: '1px solid #e2e8f0',
            borderLeft: '4px solid #10b981'
          }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#10b981', marginBottom: '0.5rem' }}>
              {consultores.filter(c => c.telefone && c.telefone.trim() !== '').length}
            </div>
            <div style={{ color: '#718096', fontSize: '1rem', fontWeight: '500' }}>📞 Com Telefone</div>
          </div>
          
          <div style={{ 
            background: 'white', 
            padding: '2rem', 
            borderRadius: '12px', 
            textAlign: 'center',
            border: '1px solid #e2e8f0',
            borderLeft: '4px solid #fbbf24'
          }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#fbbf24', marginBottom: '0.5rem' }}>
              {consultores.length > 0 
                ? Math.round((consultores.filter(c => c.telefone && c.telefone.trim() !== '').length / consultores.length) * 100)
                : 0}%
            </div>
            <div style={{ color: '#718096', fontSize: '1rem', fontWeight: '500' }}>📈 Taxa Contato</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">👨‍⚕️ Equipe de Consultores</h2>
          <div style={{ fontSize: '0.9rem', color: '#718096' }}>
            {consultores.length} consultor(es) cadastrado(s)
          </div>
        </div>

        {loading ? (
          <p>Carregando consultores...</p>
        ) : consultores.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#718096', padding: '2rem' }}>
            Nenhum consultor cadastrado ainda. Clique em "Novo Consultor" para começar.
          </p>
        ) : (
          <div className="grid grid-2">
            {consultores.map(consultor => (
              <div key={consultor.id} style={{ 
                background: 'white', 
                padding: '2rem', 
                borderRadius: '16px', 
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
                transition: 'all 0.3s ease',
                position: 'relative'
              }}
              className="card-grid-item">
                {/* Botões de Ação no Canto */}
                <div style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  display: 'flex',
                  gap: '0.5rem'
                }}>
                  <button
                    onClick={() => handleEdit(consultor)}
                    style={{
                      background: 'rgba(102, 126, 234, 0.1)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '40px',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontSize: '1.1rem'
                    }}
                    className="card-edit-btn"
                    title="Editar consultor"
                  >
                    ✏️
                  </button>

                  {/* Botão de Visualizar Senha - apenas admin */}
                  {isAdmin && (
                    <button
                      onClick={() => visualizarSenha(consultor)}
                      style={{
                        background: 'rgba(245, 158, 11, 0.1)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        fontSize: '1.1rem'
                      }}
                      title="Visualizar/Alterar senha"
                    >
                      🔐
                    </button>
                  )}
                </div>

                {/* Header com Avatar e Nome */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  marginBottom: '1.5rem',
                  paddingBottom: '1rem',
                  borderBottom: '3px solid #667eea'
                }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.8rem',
                    marginRight: '1rem',
                    boxShadow: '0 4px 8px rgba(102, 126, 234, 0.3)'
                  }}>
                    🩺
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ 
                      fontSize: '1.4rem', 
                      fontWeight: '700', 
                      color: '#2d3748',
                      margin: 0,
                      marginBottom: '0.25rem'
                    }}>
                      {consultor.nome}
                    </h3>
                    <div style={{ 
                      fontSize: '0.9rem', 
                      color: '#667eea',
                      fontWeight: '500'
                    }}>
                      Consultor
                    </div>
                  </div>
                </div>
                
                {/* Informações */}
                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div style={{ 
                    background: '#f0f4ff', 
                    padding: '1rem', 
                    borderRadius: '12px',
                    border: '1px solid #c7d2fe'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ 
                        fontSize: '1.2rem', 
                        marginRight: '0.75rem',
                        background: '#ddd6fe',
                        padding: '0.5rem',
                        borderRadius: '8px'
                      }}>📧</span>
                      <strong style={{ color: '#374151', fontSize: '0.95rem' }}>Login</strong>
                    </div>
                    <div style={{ 
                      color: '#4338ca', 
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      marginLeft: '2.5rem',
                      fontFamily: 'monospace',
                      background: 'rgba(255, 255, 255, 0.7)',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid #c7d2fe'
                    }}>
                      {consultor.email || `${consultor.nome?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')}@investmoneysa.com.br`}
                    </div>
                  </div>

                  <div style={{ 
                    background: '#f8fafc', 
                    padding: '1rem', 
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ 
                        fontSize: '1.2rem', 
                        marginRight: '0.75rem',
                        background: '#e3f2fd',
                        padding: '0.5rem',
                        borderRadius: '8px'
                      }}>📞</span>
                      <strong style={{ color: '#374151', fontSize: '0.95rem' }}>Contato</strong>
                    </div>
                    <div style={{ 
                      color: consultor.telefone ? '#4a5568' : '#9ca3af', 
                      fontSize: '1rem',
                      fontWeight: '500',
                      marginLeft: '2.5rem'
                    }}>
                      {consultor.telefone ? formatarTelefone(consultor.telefone) : 'Não informado'}
                    </div>
                  </div>
                  
                  <div style={{ 
                    background: '#f8fafc', 
                    padding: '1rem', 
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ 
                        fontSize: '1.2rem', 
                        marginRight: '0.75rem',
                        background: '#ecfdf5',
                        padding: '0.5rem',
                        borderRadius: '8px'
                      }}>📅</span>
                      <strong style={{ color: '#374151', fontSize: '0.95rem' }}>Cadastrado</strong>
                    </div>
                    <div style={{ 
                      color: '#4a5568', 
                      fontSize: '1rem',
                      fontWeight: '500',
                      marginLeft: '2.5rem'
                    }}>
                      {formatarData(consultor.created_at)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Cadastro/Edição */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">
                {editingConsultor ? '✏️ Editar Consultor' : '🩺 Novo Consultor'}
              </h2>
              <button 
                className="close-btn"
                onClick={resetForm}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
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
                />
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
                  {editingConsultor ? '💾 Atualizar Consultor' : '💾 Cadastrar Consultor'}
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
                🔐 Senha de {consultorSenha.nome}
              </h2>
              <button 
                className="close-btn"
                onClick={() => setShowSenhaModal(false)}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '1rem 0' }}>
              {/* Informações do Consultor */}
              <div style={{ 
                background: '#f8fafc', 
                padding: '1.5rem', 
                borderRadius: '12px',
                marginBottom: '2rem',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{
                    background: '#667eea',
                    color: 'white',
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    marginRight: '1rem'
                  }}>
                    🩺
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#2d3748' }}>
                      {consultorSenha.nome}
                    </h3>
                    <p style={{ margin: 0, color: '#718096', fontSize: '0.9rem' }}>
                      Email: {consultorSenha.email || 'Não definido'}
                    </p>
                  </div>
                </div>

                {/* Status da Senha */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  padding: '1rem',
                  borderRadius: '8px',
                  background: consultorSenha.temSenha ? '#ecfdf5' : '#fef2f2',
                  border: `1px solid ${consultorSenha.temSenha ? '#d1fae5' : '#fecaca'}`
                }}>
                  <span style={{ fontSize: '1.5rem', marginRight: '0.75rem' }}>
                    {consultorSenha.temSenha ? '✅' : '❌'}
                  </span>
                  <div>
                    <strong style={{ 
                      color: consultorSenha.temSenha ? '#065f46' : '#dc2626',
                      fontSize: '1rem'
                    }}>
                      {consultorSenha.temSenha ? 'Senha Configurada' : 'Sem Senha'}
                    </strong>
                    <p style={{ 
                      margin: 0, 
                      fontSize: '0.85rem',
                      color: consultorSenha.temSenha ? '#047857' : '#b91c1c'
                    }}>
                      {consultorSenha.temSenha 
                        ? 'Este consultor pode fazer login no sistema' 
                        : 'Este consultor não pode fazer login (defina uma senha)'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Formulário para Nova Senha */}
              <div>
                <h4 style={{ 
                  fontSize: '1.1rem', 
                  marginBottom: '1rem',
                  color: '#2d3748',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  🔄 {consultorSenha.temSenha ? 'Alterar Senha' : 'Definir Senha'}
                </h4>
                
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const novaSenha = e.target.novaSenha.value;
                  if (novaSenha.length < 3) {
                    alert('A senha deve ter pelo menos 3 caracteres');
                    return;
                  }
                  if (window.confirm(`Tem certeza que deseja ${consultorSenha.temSenha ? 'alterar' : 'definir'} a senha de ${consultorSenha.nome}?`)) {
                    redefinirSenha(consultorSenha.id, novaSenha);
                  }
                }}>
                  <div className="form-group">
                    <label className="form-label">Nova Senha *</label>
                    <input
                      type="password"
                      name="novaSenha"
                      className="form-input"
                      placeholder="Digite a nova senha (mínimo 3 caracteres)"
                      required
                      minLength="3"
                      style={{ fontSize: '1rem', padding: '0.75rem' }}
                    />
                    <small style={{ color: '#718096', fontSize: '0.85rem' }}>
                      💡 Dica: Use uma senha simples e fácil de lembrar (ex: 123456)
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
                      className="btn"
                      style={{ 
                        background: '#f59e0b',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0.75rem 1.5rem'
                      }}
                    >
                      🔐 {consultorSenha.temSenha ? 'Alterar Senha' : 'Definir Senha'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Consultores; 