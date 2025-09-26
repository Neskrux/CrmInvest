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
  const [linkPersonalizado, setLinkPersonalizado] = useState(null);
  const [linkClinicas, setLinkClinicas] = useState(null);
  const [loadingLink, setLoadingLink] = useState(true);
  
  const [formData, setFormData] = useState({
    nome: user?.nome || '',
    email: user?.email || '',
    tipo: user?.tipo || 'usuario',
    telefone: user?.telefone || '',
    pix: user?.pix || '',
    senhaAtual: '',
    novaSenha: '',
    confirmarSenha: ''
  });
  const [errors, setErrors] = useState({});

  // Funções de validação e formatação (copiadas do CadastroConsultor.js)
  const validateCPF = (cpf) => {
    cpf = cpf.replace(/[^\d]/g, '');
    if (cpf.length !== 11) return false;
    
    if (/^(\d)\1{10}$/.test(cpf)) return false;
    
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.charAt(9))) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.charAt(10))) return false;
    
    return true;
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone) => {
    const phoneRegex = /^\(\d{2}\) \d{4,5}-\d{4}$/;
    return phoneRegex.test(phone);
  };

  const formatCPF = (value) => {
    value = value.replace(/\D/g, '');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    return value;
  };

  const formatPhone = (value) => {
    value = value.replace(/\D/g, '');
    value = value.replace(/(\d{2})(\d)/, '($1) $2');
    value = value.replace(/(\d{4})(\d)/, '$1-$2');
    value = value.replace(/(\d{4})-(\d)(\d{4})/, '$1$2-$3');
    return value;
  };

  // Função para formatar nome (primeira letra maiúscula de cada palavra)
  const formatarNome = (value) => {
    if (!value) return '';
    
    // Remove números e caracteres especiais, mantém apenas letras, espaços e acentos
    let cleanValue = value.replace(/[^a-zA-ZÀ-ÿ\s]/g, '');
    
    // Remove espaços do início
    cleanValue = cleanValue.trimStart();
    
    // Remove espaços duplos ou múltiplos, deixando apenas um espaço entre palavras
    cleanValue = cleanValue.replace(/\s+/g, ' ');

    // Aplica formatação: primeira letra maiúscula de cada palavra
    const nomeFormatado = cleanValue
      .toLowerCase()
      .split(' ')
      .map(palavra => {
        if (!palavra) return '';
        return palavra.charAt(0).toUpperCase() + palavra.slice(1);
      })
      .join(' ');
    
    return nomeFormatado;
  };

  useEffect(() => {
    const buscarPerfilCompleto = async () => {
      try {
        // Determinar qual rota usar baseado no tipo de usuário
        const endpoint = user?.tipo === 'consultor' ? '/consultores/perfil' : '/usuarios/perfil';
        
        const response = await makeRequest(endpoint, {
          method: 'GET'
        });

        if (response.ok) {
          const data = await response.json();
          // Usar a chave correta baseada no tipo de usuário
          const perfilData = user?.tipo === 'consultor' ? data.consultor : data.usuario;
          
          setPerfilCompleto(perfilData);
          
          // Atualizar formData com dados do banco
          setFormData(prev => ({
            ...prev,
            nome: perfilData.nome || '',
            email: perfilData.email || '',
            tipo: perfilData.tipo || 'usuario',
            telefone: perfilData.telefone || '',
            pix: perfilData.pix || ''
          }));

          // Se for consultor, buscar link personalizado
          if (user?.tipo === 'consultor') {
            buscarLinkPersonalizado();
          } else {
            setLoadingLink(false);
          }
        }
      } catch (error) {
        console.error('Erro ao buscar perfil completo:', error);
      }
    };

    const buscarLinkPersonalizado = async () => {
      try {
        // Usar a rota de perfil que o consultor pode acessar
        const consultorResponse = await makeRequest('/consultores/perfil');
        const responseData = await consultorResponse.json();
        
        if (consultorResponse.ok && responseData.consultor) {
          const consultorData = responseData.consultor;
          
          // Verificar se é consultor interno (tem as duas permissões)
          const isConsultorInterno = consultorData.pode_ver_todas_novas_clinicas === true && consultorData.podealterarstatus === true;
          
          if (!isConsultorInterno) {
            // Freelancer: buscar link personalizado baseado no código de referência
            if (consultorData.codigo_referencia) {
              setLinkPersonalizado(`https://crm.investmoneysa.com.br/captura-lead?ref=${consultorData.codigo_referencia}`);
              setLinkClinicas(`https://crm.investmoneysa.com.br/captura-clinica?ref=${consultorData.codigo_referencia}`);
            } else {
              // Se não tem código de referência, mostrar mensagem
              setLinkPersonalizado(null);
              setLinkClinicas(null);
            }
          } else {
            // Interno: usar link geral
            setLinkPersonalizado('https://crm.investmoneysa.com.br/captura-lead');
            setLinkClinicas('https://crm.investmoneysa.com.br/captura-clinica');
          }
        } else {
          console.error('Erro ao buscar dados do consultor:', responseData);
          setLinkPersonalizado(null);
          setLinkClinicas(null);
        }
      } catch (error) {
        console.error('Erro ao buscar link personalizado:', error);
        setLinkPersonalizado(null);
        setLinkClinicas(null);
      } finally {
        setLoadingLink(false);
      }
    };

    if (user) {
      buscarPerfilCompleto();
    }
  }, [user, makeRequest]);

  // Função para copiar link personalizado
  const copiarLink = async (link) => {
    try {
      await navigator.clipboard.writeText(link);
      showSuccessToast('Link copiado para a área de transferência!');
    } catch (error) {
      // Fallback para navegadores mais antigos
      const textArea = document.createElement('textarea');
      textArea.value = link;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showSuccessToast('Link copiado para a área de transferência!');
    }
  };

  const compartilharWhatsApp = (link) => {
    const texto = encodeURIComponent(
      `🌟 Transforme sua autoestima com nossos tratamentos especializados!\n\n` +
      `✨ Consulta gratuita\n` +
      `💎 Profissionais qualificados\n` +
      `📱 Atendimento personalizado\n\n` +
      `Agende agora: ${link}`
    );
    window.open(`https://wa.me/?text=${texto}`, '_blank');
  };

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
    
    let formattedValue = value;
    
    // Aplicar formatações específicas
    if (name === 'telefone') {
      formattedValue = formatPhone(value);
    } else if (name === 'pix') {
      formattedValue = formatCPF(value);
    } else if (name === 'nome') {
      formattedValue = formatarNome(value);
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: formattedValue
    }));
    
    // Limpar erro quando o usuário começa a digitar
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validações básicas
      const newErrors = {};
      
      if (!formData.nome.trim()) {
        newErrors.nome = 'Nome é obrigatório';
      }
      
      if (!formData.email.trim()) {
        newErrors.email = 'E-mail é obrigatório';
      } else if (!validateEmail(formData.email)) {
        newErrors.email = 'E-mail inválido';
      }
      
      // Validações específicas para consultores
      if (user?.tipo === 'consultor') {
        if (!formData.telefone.trim()) {
          newErrors.telefone = 'Telefone é obrigatório';
        } else if (!validatePhone(formData.telefone)) {
          newErrors.telefone = 'Telefone inválido';
        }
        
        if (!formData.pix.trim()) {
          newErrors.pix = 'PIX é obrigatório';
        } else if (!validateCPF(formData.pix)) {
          newErrors.pix = 'PIX deve ser um CPF válido';
        }
      }

      // Se está alterando senha, validar campos
      if (showPasswordFields) {
        if (!formData.senhaAtual) {
          newErrors.senhaAtual = 'Senha atual é obrigatória';
        }
        if (!formData.novaSenha) {
          newErrors.novaSenha = 'Nova senha é obrigatória';
        } else if (formData.novaSenha.length < 6) {
          newErrors.novaSenha = 'Nova senha deve ter pelo menos 6 caracteres';
        }
        if (!formData.confirmarSenha) {
          newErrors.confirmarSenha = 'Confirmação de senha é obrigatória';
        } else if (formData.novaSenha !== formData.confirmarSenha) {
          newErrors.confirmarSenha = 'Senhas não conferem';
        }
      }

      // Se há erros, mostrar e parar
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        setLoading(false);
        return;
      }

      // Preparar dados para envio
      const updateData = {
        nome: formData.nome.trim(),
        email: formData.email.trim(),
        tipo: formData.tipo
      };

      // Adicionar campos específicos de consultor se aplicável
      if (user?.tipo === 'consultor') {
        updateData.telefone = formData.telefone.trim() || null;
        updateData.pix = formData.pix.trim() || null;
      }

      // Incluir senhas se estiver alterando
      if (showPasswordFields) {
        updateData.senhaAtual = formData.senhaAtual;
        updateData.novaSenha = formData.novaSenha;
      }

      // Determinar qual rota usar baseado no tipo de usuário
      const endpoint = user?.tipo === 'consultor' ? '/consultores/perfil' : '/usuarios/perfil';
      
      const response = await makeRequest(endpoint, {
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
          tipo: formData.tipo,
          telefone: formData.telefone.trim() || null,
          pix: formData.pix.trim() || null
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
        
        // Forçar refresh da página após atualização do perfil
        setTimeout(() => {
          window.location.reload();
        }, 1500); // Aguarda 1.5 segundos para mostrar o toast de sucesso
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
          {/* Seção de Foto de Perfil 
            <div 
              className="profile-avatar"
              style={{ 
                backgroundImage: previewPhoto ? `url(${previewPhoto})` : 'none'
              }}
            >
              {!previewPhoto && getUserInitials()}
            </div>

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
          </div>*/}
          

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
              style={{
                borderColor: errors.nome ? '#ef4444' : '#d1d5db'
              }}
            />
            {errors.nome && (
              <span style={{ color: '#ef4444', fontSize: '0.875rem' }}>
                {errors.nome}
              </span>
            )}
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
              style={{
                borderColor: errors.email ? '#ef4444' : '#d1d5db'
              }}
            />
            {errors.email && (
              <span style={{ color: '#ef4444', fontSize: '0.875rem' }}>
                {errors.email}
              </span>
            )}
          </div>

          {/* Campos específicos para consultores */}
          {user?.tipo === 'consultor' && (
            <>
              <div className="form-group">
                <label className="form-label">Telefone *</label>
                <input
                  type="tel"
                  name="telefone"
                  className="form-input"
                  value={formData.telefone}
                  onChange={handleInputChange}
                  placeholder="(11) 99999-9999"
                  maxLength="15"
                  required
                  style={{
                    borderColor: errors.telefone ? '#ef4444' : '#d1d5db'
                  }}
                />
                {errors.telefone && (
                  <span style={{ color: '#ef4444', fontSize: '0.875rem' }}>
                    {errors.telefone}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Chave PIX (CPF) *</label>
                <input
                  type="text"
                  name="pix"
                  className="form-input"
                  value={formData.pix}
                  onChange={handleInputChange}
                  placeholder="000.000.000-00"
                  maxLength="14"
                  required
                  style={{
                    borderColor: errors.pix ? '#ef4444' : '#d1d5db'
                  }}
                />
                {errors.pix && (
                  <span style={{ color: '#ef4444', fontSize: '0.875rem' }}>
                    {errors.pix}
                  </span>
                )}
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">Tipo de Usuário</label>
            {user?.tipo === 'consultor' ? (
              <input
                type="text"
                className="form-input"
                value="Consultor"
                disabled
                readOnly
                style={{ backgroundColor: '#f3f4f6', color: '#6b7280' }}
              />
            ) : (
              <>
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
              </>
            )}
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
                    style={{
                      borderColor: errors.senhaAtual ? '#ef4444' : '#d1d5db'
                    }}
                  />
                  {errors.senhaAtual && (
                    <span style={{ color: '#ef4444', fontSize: '0.875rem' }}>
                      {errors.senhaAtual}
                    </span>
                  )}
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
                    style={{
                      borderColor: errors.novaSenha ? '#ef4444' : '#d1d5db'
                    }}
                  />
                  {errors.novaSenha && (
                    <span style={{ color: '#ef4444', fontSize: '0.875rem' }}>
                      {errors.novaSenha}
                    </span>
                  )}
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
                    style={{
                      borderColor: errors.confirmarSenha ? '#ef4444' : '#d1d5db'
                    }}
                  />
                  {errors.confirmarSenha && (
                    <span style={{ color: '#ef4444', fontSize: '0.875rem' }}>
                      {errors.confirmarSenha}
                    </span>
                  )}
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

      {/* Seção do Link Personalizado - Apenas para consultores */}
      {user?.tipo === 'consultor' && (
        <div className="card" style={{ maxWidth: '600px', margin: '2rem auto 0' }}>
          <div className="card-header">
            <h2 className="card-title">Meus Links de Divulgação</h2>
          </div>
          
          <div className="card-body">
            {loadingLink ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                <div style={{ 
                  width: '2rem', 
                  height: '2rem', 
                  border: '3px solid #e5e7eb', 
                  borderTop: '3px solid #3b82f6', 
                  borderRadius: '50%', 
                  animation: 'spin 1s linear infinite', 
                  margin: '0 auto 1rem' 
                }}></div>
                Carregando link personalizado...
              </div>
            ) : (linkPersonalizado || linkClinicas) ? (
              <div>
                {/* Link para Pacientes */}
                {linkPersonalizado && (
                  <div style={{ 
                    backgroundColor: '#f0fdf4', 
                    border: '2px solid #86efac', 
                    borderRadius: '12px', 
                    padding: '1.5rem', 
                    marginBottom: '1.5rem'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      marginBottom: '1rem'
                    }}>
                      <span style={{ 
                        color: '#166534', 
                        fontWeight: '600',
                        fontSize: '1rem'
                      }}>
                        Link para Pacientes:
                      </span>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => copiarLink(linkPersonalizado)}
                          style={{
                            background: '#16a34a',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            fontSize: '14px',
                            cursor: 'pointer',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          Copiar
                        </button>
                      </div>
                    </div>
                    <div style={{ 
                      color: '#166534', 
                      fontSize: '13px',
                      fontFamily: 'monospace',
                      wordBreak: 'break-all',
                      lineHeight: '1.5',
                      backgroundColor: 'rgba(255,255,255,0.7)',
                      padding: '12px',
                      borderRadius: '8px'
                    }}>
                      {linkPersonalizado}
                    </div>
                  </div>
                )}

                {/* Link para Clínicas */}
                {linkClinicas && (
                  <div style={{ 
                    backgroundColor: '#eff6ff', 
                    border: '2px solid #93c5fd', 
                    borderRadius: '12px', 
                    padding: '1.5rem', 
                    marginBottom: '1.5rem'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      marginBottom: '1rem'
                    }}>
                      <span style={{ 
                        color: '#1d4ed8', 
                        fontWeight: '600',
                        fontSize: '1rem'
                      }}>
                        Link para Clínicas:
                      </span>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => copiarLink(linkClinicas)}
                          style={{
                            background: '#2563eb',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            fontSize: '14px',
                            cursor: 'pointer',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          Copiar
                        </button>
                      </div>
                    </div>
                    <div style={{ 
                      color: '#1d4ed8', 
                      fontSize: '13px',
                      fontFamily: 'monospace',
                      wordBreak: 'break-all',
                      lineHeight: '1.5',
                      backgroundColor: 'rgba(255,255,255,0.7)',
                      padding: '12px',
                      borderRadius: '8px'
                    }}>
                      {linkClinicas}
                    </div>
                  </div>
                )}
                
                <div style={{ 
                  backgroundColor: '#f8fafc', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '8px', 
                  padding: '1rem'
                }}>
                  <div style={{ fontSize: '14px', color: '#374151', fontWeight: '600', marginBottom: '8px' }}>
                    Como usar seus links:
                  </div>
                  <ul style={{ fontSize: '13px', color: '#374151', margin: '0', paddingLeft: '1.5rem', lineHeight: '1.6' }}>
                    <li><strong>Link Verde (Pacientes):</strong> Para indicar pessoas que querem fazer tratamentos parcelados no boleto</li>
                    <li><strong>Link Azul (Clínicas):</strong> Para indicar clínicas que querem receber o valor à vista dos tratamentos</li>
                    <li>Compartilhe os links em suas redes sociais e WhatsApp</li>
                    {linkPersonalizado?.includes('?ref=') ? (
                      <>
                        <li>Todos os cadastros através destes links serão automaticamente associados a você</li>
                        <li>Acompanhe seus leads na tela de "Pacientes" e clínicas na tela de "Clínicas"</li>
                      </>
                    ) : (
                      <>
                        <li>Os cadastros aparecerão nas telas de "Novos Leads" e "Novas Clínicas"</li>
                        <li>Você pode "pegar" os leads e clínicas que desejar atender</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            ) : (
              <div style={{ 
                backgroundColor: '#fef2f2', 
                border: '1px solid #fecaca', 
                borderRadius: '8px', 
                padding: '1.5rem',
                textAlign: 'center'
              }}>
                <div style={{ color: '#dc2626', fontSize: '16px', marginBottom: '8px' }}>
                  ⚠️ Links personalizados não encontrados
                </div>
                <div style={{ color: '#6b7280', fontSize: '14px' }}>
                  Entre em contato com o administrador para gerar seus links personalizados.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Seção do Grupo do WhatsApp - Apenas para consultores */}
      {user?.tipo === 'consultor' && (
        <div className="card" style={{ maxWidth: '600px', margin: '2rem auto 0' }}>
          <div className="card-header">
            <h2 className="card-title">Grupo dos Consultores</h2>
          </div>
          
          <div className="card-body">
            <div style={{ 
              backgroundColor: '#f0fdf4', 
              border: '2px solid #25D366', 
              borderRadius: '12px', 
              padding: '1.5rem', 
              marginBottom: '1.5rem'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: '1rem'
              }}>
                <span style={{ 
                  color: '#166534', 
                  fontWeight: '600',
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#25D366">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                  </svg>
                  Grupo do WhatsApp dos Consultores:
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => copiarLink('https://chat.whatsapp.com/H58PhHmVQpj1mRSj7wlZgs')}
                    style={{
                      background: '#16a34a',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    Copiar Link
                  </button>
                  <button
                    onClick={() => window.open('https://chat.whatsapp.com/H58PhHmVQpj1mRSj7wlZgs', '_blank')}
                    style={{
                      background: '#25D366',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    Entrar no Grupo
                  </button>
                </div>
              </div>
              <div style={{ 
                color: '#166534', 
                fontSize: '13px',
                fontFamily: 'monospace',
                wordBreak: 'break-all',
                lineHeight: '1.5',
                backgroundColor: 'rgba(255,255,255,0.7)',
                padding: '12px',
                borderRadius: '8px'
              }}>
                https://chat.whatsapp.com/H58PhHmVQpj1mRSj7wlZgs
              </div>
            </div>
            
            <div style={{ 
              backgroundColor: '#f8fafc', 
              border: '1px solid #e2e8f0', 
              borderRadius: '8px', 
              padding: '1rem'
            }}>
              <div style={{ fontSize: '14px', color: '#374151', fontWeight: '600', marginBottom: '8px' }}>
                Sobre o grupo:
              </div>
              <ul style={{ fontSize: '13px', color: '#374151', margin: '0', paddingLeft: '1.5rem', lineHeight: '1.6' }}>
                <li>Troque experiências com outros consultores</li>
                <li>Receba dicas e estratégias de vendas</li>
                <li>Participe de discussões sobre o mercado</li>
                <li>Fique por dentro das novidades da plataforma</li>
                <li>Você pode acessar este link a qualquer momento aqui no seu perfil</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default Perfil;
