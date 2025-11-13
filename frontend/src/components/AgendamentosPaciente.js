import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts';

const AgendamentosPaciente = () => {
  const { user, makeRequest, pacienteId } = useAuth();
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [agendamentos, setAgendamentos] = useState([]);

  useEffect(() => {
    fetchAgendamentos();
  }, []);

  const fetchAgendamentos = async () => {
    try {
      setLoading(true);
      // TODO: Implementar endpoint específico para agendamentos do paciente
      // Por enquanto, retornar array vazio
      setAgendamentos([]);
    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error);
      showErrorToast('Erro ao carregar agendamentos');
    } finally {
      setLoading(false);
    }
  };

  const formatarData = (data) => {
    if (!data) return '-';
    const date = new Date(data);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
        Meus Agendamentos
      </h1>

      {agendamentos.length === 0 ? (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '3rem',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <p style={{ color: '#6b7280', fontSize: '1rem' }}>
            Você ainda não possui agendamentos cadastrados.
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gap: '1rem'
        }}>
          {agendamentos.map((agendamento) => (
            <div
              key={agendamento.id}
              style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '1.5rem',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                border: '1px solid #e5e7eb'
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '0.5rem'
              }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1a1d23', margin: 0 }}>
                  {agendamento.clinica_nome || 'Clínica'}
                </h3>
                <span style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  backgroundColor: agendamento.status === 'confirmado' ? '#d1fae5' : '#fef3c7',
                  color: agendamento.status === 'confirmado' ? '#065f46' : '#92400e'
                }}>
                  {agendamento.status === 'confirmado' ? 'Confirmado' : agendamento.status}
                </span>
              </div>
              <p style={{ margin: '0.5rem 0', color: '#6b7280', fontSize: '0.875rem' }}>
                <strong>Data:</strong> {formatarData(agendamento.data_agendamento)}
              </p>
              {agendamento.observacoes && (
                <p style={{ margin: '0.5rem 0 0 0', color: '#374151', fontSize: '0.875rem' }}>
                  {agendamento.observacoes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AgendamentosPaciente;

