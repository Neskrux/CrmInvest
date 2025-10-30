import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';

const DashboardPaciente = () => {
  const { user, makeRequest, pacienteId } = useAuth();
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState({
    proximosAgendamentos: [],
    documentosPendentes: 0,
    boletosPendentes: 0,
    totalBoletos: 0
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // TODO: Implementar endpoint específico para dashboard do paciente
      // Por enquanto, retornar dados básicos
      setDados({
        proximosAgendamentos: [],
        documentosPendentes: 0,
        boletosPendentes: 0,
        totalBoletos: 0
      });
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
      showErrorToast('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '80vh'
      }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '2rem', fontSize: '2rem', fontWeight: '700', color: '#1a1d23' }}>
        Bem-vindo, {user?.nome || 'Paciente'}!
      </h1>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {/* Card de Próximos Agendamentos */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>
            Próximos Agendamentos
          </h3>
          <p style={{ fontSize: '2rem', fontWeight: '700', color: '#1a1d23', margin: 0 }}>
            {dados.proximosAgendamentos.length}
          </p>
        </div>

        {/* Card de Documentos */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>
            Documentos Pendentes
          </h3>
          <p style={{ fontSize: '2rem', fontWeight: '700', color: '#1a1d23', margin: 0 }}>
            {dados.documentosPendentes}
          </p>
        </div>

        {/* Card de Boletos */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>
            Boletos Pendentes
          </h3>
          <p style={{ fontSize: '2rem', fontWeight: '700', color: '#1a1d23', margin: 0 }}>
            {dados.boletosPendentes}
          </p>
        </div>
      </div>

      {/* Seção de Informações */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '2rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb'
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1a1d23', marginBottom: '1rem' }}>
          Informações do Paciente
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem'
        }}>
          <div>
            <label style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: '600' }}>Nome</label>
            <p style={{ margin: '0.25rem 0 0 0', color: '#1a1d23' }}>{user?.nome || '-'}</p>
          </div>
          {user?.cpf && (
            <div>
              <label style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: '600' }}>CPF</label>
              <p style={{ margin: '0.25rem 0 0 0', color: '#1a1d23', fontFamily: 'monospace' }}>
                {user.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
              </p>
            </div>
          )}
          {user?.telefone && (
            <div>
              <label style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: '600' }}>Telefone</label>
              <p style={{ margin: '0.25rem 0 0 0', color: '#1a1d23' }}>{user.telefone}</p>
            </div>
          )}
          {user?.email_login && (
            <div>
              <label style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: '600' }}>Email</label>
              <p style={{ margin: '0.25rem 0 0 0', color: '#1a1d23' }}>{user.email_login}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPaciente;

