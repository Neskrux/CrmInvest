import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';

const Perfil = () => {
  const { user, makeRequest, login } = useAuth();
  const { error: showErrorToast, success: showSuccessToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [perfilCompleto, setPerfilCompleto] = useState(null);
  
  const [formData, setFormData] = useState({
    nome: user?.nome || '',
    email: user?.email || '',
    tipo: user?.tipo || 'usuario',
    senhaAtual: '',
    novaSenha: '',
    confirmarSenha: ''
  });

  useEffect(() => {
    const buscarPerfilCompleto = async () => {
      try {
        const response = await makeRequest('/usuarios/perfil', {
          method: 'GET'
        });

        if (response.ok) {
          const data = await response.json();
          setPerfilCompleto(data.usuario);
          
          // Atualizar formData com dados do banco
          setFormData(prev => ({
            ...prev,
            nome: data.usuario.nome || '',
            email: data.usuario.email || '',
            tipo: data.usuario.tipo || 'usuario'
          }));
        }
      } catch (error) {
        console.error('Erro ao buscar perfil completo:', error);
      }
    };

    if (user) {
      buscarPerfilCompleto();
    }
  }, [user, makeRequest]);

  // Função para obter iniciais do nome
  const getUserInitials = () => {
    if (user.nome) {
      const names = user.nome.split(' ');
      if (names.length >= 2) {
        return names[0][0] + names[names.length - 1][0];
      }
      return names[0][0] + names[0][1];
    }
    return 'U';
  };

  // Função para lidar com upload de foto
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setProfilePhoto(file);
        
        // Criar preview da imagem
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreviewPhoto(e.target.result);
        };
        reader.readAsDataURL(file);
      } else {
        showErrorToast('Por favor, selecione apenas arquivos de imagem');
      }
    }
  };

  // Função para remover foto
  const removePhoto = () => {
    setProfilePhoto(null);
    setPreviewPhoto(null);
    // Limpar o input file
    const fileInput = document.getElementById('profile-photo-input');
    if (fileInput) fileInput.value = '';
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validações
      
      if (!formData.nome.trim()) {
        showErrorToast('Nome é obrigatório');
        setLoading(false);
        return;
      }

      // Se está alterando senha, validar campos
      if (showPasswordFields) {
        if (!formData.senhaAtual) {
          showErrorToast('Senha atual é obrigatória');
          setLoading(false);
          return;
        }
        if (!formData.novaSenha) {
          showErrorToast('Nova senha é obrigatória');
          setLoading(false);
          return;
        }
        if (formData.novaSenha !== formData.confirmarSenha) {
          showErrorToast('Confirmação de senha não confere');
          setLoading(false);
          return;
        }
        if (formData.novaSenha.length < 6) {
          showErrorToast('Nova senha deve ter pelo menos 6 caracteres');
          setLoading(false);
          return;
        }
      }

      // Preparar dados para envio
      const updateData = {
        nome: formData.nome.trim(),
        email: formData.email.trim(),
        tipo: formData.tipo
      };

      // Incluir senhas se estiver alterando
      if (showPasswordFields) {
        updateData.senhaAtual = formData.senhaAtual;
        updateData.novaSenha = formData.novaSenha;
      }

      const response = await makeRequest('/usuarios/perfil', {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });

      const data = await response.json();

      if (response.ok) {
        showSuccessToast('Perfil atualizado com sucesso!');
        
        // Atualizar dados do usuário no contexto
        const updatedUser = { 
          ...user, 
          nome: formData.nome.trim(), 
          email: formData.email.trim(),
          tipo: formData.tipo 
        };
        login(updatedUser, localStorage.getItem('token'));
        
        // Limpar campos de senha
        setFormData(prev => ({
          ...prev,
          senhaAtual: '',
          novaSenha: '',
          confirmarSenha: ''
        }));
        setShowPasswordFields(false);
      } else {
        showErrorToast(data.error || 'Erro ao atualizar perfil');
      }
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      showErrorToast('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordFields = () => {
    setShowPasswordFields(!showPasswordFields);
    // Limpar campos quando ocultar
    if (showPasswordFields) {
      setFormData(prev => ({
        ...prev,
        senhaAtual: '',
        novaSenha: '',
        confirmarSenha: ''
      }));
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Meu Perfil</h1>
        <p className="page-subtitle">Gerencie suas informações pessoais e configurações de conta</p>
      </div>

      <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div className="card-header">
          <h2 className="card-title">Informações Pessoais</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="card-body">
          {/* Seção de Foto de Perfil */}
          <div className="form-group profile-photo-container">
            <label className="form-label">Foto de Perfil</label>
            
            {/* Avatar */}
            <div 
              className="profile-avatar"
              style={{ 
                backgroundImage: previewPhoto ? `url(${previewPhoto})` : 'none'
              }}
            >
              {!previewPhoto && getUserInitials()}
            </div>
            
            {/* Botões de Ação */}
            <div className="profile-photo-actions">
              <label 
                htmlFor="profile-photo-input" 
                className="btn btn-secondary" 
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '0.5rem' }}>
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="9" cy="9" r="2"/>
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                </svg>
                {previewPhoto ? 'Alterar Foto' : 'Adicionar Foto'}
              </label>
              
              {previewPhoto && (
                <button 
                  type="button" 
                  onClick={removePhoto}
                  className="btn btn-danger"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '0.5rem' }}>
                    <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                    <line x1="10" y1="11" x2="10" y2="17"/>
                    <line x1="14" y1="11" x2="14" y2="17"/>
                  </svg>
                  Remover
                </button>
              )}
            </div>
            
            {/* Input file oculto */}
            <input
              id="profile-photo-input"
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="profile-photo-input"
            />
            
            <div className="profile-photo-hint">
              Formatos aceitos: JPG, PNG, GIF. Tamanho máximo: 5MB
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Nome Completo *</label>
            <input
              type="text"
              name="nome"
              className="form-input"
              value={formData.nome}
              onChange={handleInputChange}
              placeholder="Digite seu nome completo"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email *</label>
            <input
              type="email"
              name="email"
              className="form-input"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Digite seu email"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Tipo de Usuário</label>
            <select
              name="tipo"
              className="form-select"
              value={formData.tipo}
              onChange={handleInputChange}
            >
              <option value="admin">Administrador</option>
              <option value="consultor">Consultor</option>
            </select>
            <small style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
              {formData.tipo === 'admin' && 'Acesso total ao sistema'}
              {formData.tipo === 'consultor' && 'Acesso às funcionalidades de consultor'}
            </small>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <button
                type="button"
                className={`btn ${showPasswordFields ? 'btn-secondary' : 'btn-primary'}`}
                onClick={togglePasswordFields}
                style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
              >
                {showPasswordFields ? 'Cancelar' : 'Alterar Senha'}
              </button>
            </div>

            {showPasswordFields && (
              <div style={{ 
                padding: '1rem', 
                backgroundColor: '#f8fafc', 
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
              }}>
                <div className="form-group">
                  <label className="form-label">Senha Atual *</label>
                  <input
                    type="password"
                    name="senhaAtual"
                    className="form-input"
                    value={formData.senhaAtual}
                    onChange={handleInputChange}
                    placeholder="Digite sua senha atual"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Nova Senha *</label>
                  <input
                    type="password"
                    name="novaSenha"
                    className="form-input"
                    value={formData.novaSenha}
                    onChange={handleInputChange}
                    placeholder="Digite a nova senha (mín. 6 caracteres)"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Confirmar Nova Senha *</label>
                  <input
                    type="password"
                    name="confirmarSenha"
                    className="form-input"
                    value={formData.confirmarSenha}
                    onChange={handleInputChange}
                    placeholder="Confirme a nova senha"
                  />
                </div>
              </div>
            )}
          </div>

          <div style={{ 
            display: 'flex', 
            gap: '1rem', 
            justifyContent: 'flex-end', 
            marginTop: '2rem',
            paddingTop: '1rem',
            borderTop: '1px solid #e5e7eb'
          }}>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
              style={{ minWidth: '120px' }}
            >
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>

    </div>
  );
};

export default Perfil;
