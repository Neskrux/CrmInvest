import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts';

const ModalCriarLoginPaciente = ({ paciente, onClose, onSuccess }) => {
  const { makeRequest } = useAuth();
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const [formData, setFormData] = useState({
    email: '',
    senha: '',
    confirmarSenha: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    // Validar email
    if (!formData.email) {
      newErrors.email = 'Email é obrigatório';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Email inválido';
      }
    }

    // Validar senha
    if (!formData.senha) {
      newErrors.senha = 'Senha é obrigatória';
    } else if (formData.senha.length < 6) {
      newErrors.senha = 'A senha deve ter pelo menos 6 caracteres';
    }

    // Validar confirmação de senha
    if (!formData.confirmarSenha) {
      newErrors.confirmarSenha = 'Confirmação de senha é obrigatória';
    } else if (formData.senha !== formData.confirmarSenha) {
      newErrors.confirmarSenha = 'As senhas não coincidem';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await makeRequest(`/pacientes/${paciente.id}/criar-login`, {
        method: 'POST',
        body: JSON.stringify({
          email: formData.email,
          senha: formData.senha
        })
      });

      const data = await response.json();

      if (response.ok) {
        showSuccessToast('Login criado com sucesso!');
        if (onSuccess) {
          onSuccess(data.paciente);
        }
        onClose();
      } else {
        showErrorToast(data.error || data.message || 'Erro ao criar login');
      }
    } catch (error) {
      console.error('Erro ao criar login:', error);
      showErrorToast('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Limpar erro do campo quando usuário começar a digitar
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '2rem',
        maxWidth: '500px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#1a1d23'
          }}>
            Criar Login para Paciente
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '0.25rem',
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>

        <div style={{
          marginBottom: '1.5rem',
          padding: '1rem',
          backgroundColor: '#f3f4f6',
          borderRadius: '6px'
        }}>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#374151' }}>
            <strong>Paciente:</strong> {paciente.nome}
          </p>
          {paciente.cpf && (
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: '#374151' }}>
              <strong>CPF:</strong> {paciente.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '600',
              color: '#374151',
              fontSize: '0.875rem'
            }}>
              Email *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: `1px solid ${errors.email ? '#dc2626' : '#d1d5db'}`,
                borderRadius: '6px',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
              placeholder="exemplo@email.com"
            />
            {errors.email && (
              <p style={{ margin: '0.25rem 0 0 0', color: '#dc2626', fontSize: '0.875rem' }}>
                {errors.email}
              </p>
            )}
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '600',
              color: '#374151',
              fontSize: '0.875rem'
            }}>
              Senha *
            </label>
            <input
              type="password"
              name="senha"
              value={formData.senha}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: `1px solid ${errors.senha ? '#dc2626' : '#d1d5db'}`,
                borderRadius: '6px',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
              placeholder="Mínimo 6 caracteres"
            />
            {errors.senha && (
              <p style={{ margin: '0.25rem 0 0 0', color: '#dc2626', fontSize: '0.875rem' }}>
                {errors.senha}
              </p>
            )}
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '600',
              color: '#374151',
              fontSize: '0.875rem'
            }}>
              Confirmar Senha *
            </label>
            <input
              type="password"
              name="confirmarSenha"
              value={formData.confirmarSenha}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: `1px solid ${errors.confirmarSenha ? '#dc2626' : '#d1d5db'}`,
                borderRadius: '6px',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
              placeholder="Digite a senha novamente"
            />
            {errors.confirmarSenha && (
              <p style={{ margin: '0.25rem 0 0 0', color: '#dc2626', fontSize: '0.875rem' }}>
                {errors.confirmarSenha}
              </p>
            )}
          </div>

          <div style={{
            display: 'flex',
            gap: '0.75rem',
            justifyContent: 'flex-end'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.75rem 1.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                backgroundColor: 'white',
                color: '#374151',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              style={{
                padding: '0.75rem 1.5rem',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: loading ? '#9ca3af' : '#1a1d23',
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
              }}
              disabled={loading}
            >
              {loading ? 'Criando...' : 'Criar Login'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalCriarLoginPaciente;

