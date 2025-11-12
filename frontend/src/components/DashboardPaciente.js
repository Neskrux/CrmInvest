import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import ModalCadastroCompletoPaciente from './ModalCadastroCompletoPaciente';

const DashboardPaciente = () => {
  const { user, makeRequest, pacienteId } = useAuth();
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showModalCadastro, setShowModalCadastro] = useState(false);
  const [pacienteData, setPacienteData] = useState(null);
  const [cadastroFinalizado, setCadastroFinalizado] = useState(false); // Flag para evitar loop
  const [dados, setDados] = useState({
    proximosAgendamentos: [],
    documentosPendentes: 0,
    boletosPagos: 0,
    boletosPendentes: 0,
    boletosAtrasados: 0
  });
  const pacienteInfoRef = useRef(null);

  const fetchDashboardData = useCallback(async (pacienteInfo = null) => {
    try {
      setLoading(true);
      let boletosPagos = 0;
      let boletosPendentes = 0;
      let boletosAtrasados = 0;

      try {
        const boletosResponse = await makeRequest('/paciente/boletos', { method: 'GET' });
        if (boletosResponse.ok) {
          const boletosData = await boletosResponse.json();
          const lista = Array.isArray(boletosData?.boletos) ? boletosData.boletos : [];
          
          const hoje = new Date();
          hoje.setHours(0, 0, 0, 0);
          
          lista.forEach((boleto) => {
            const status = (boleto.status || '').toLowerCase();
            
            // Verificar data de vencimento se disponível
            let estaVencido = false;
            if (boleto.data_vencimento) {
              const dataVencimento = new Date(boleto.data_vencimento);
              dataVencimento.setHours(0, 0, 0, 0);
              estaVencido = dataVencimento < hoje;
            }
            
            // Boletos Pagos (sempre contam como pagos, independente da data)
            if (status === 'pago' || status === 'liquidado') {
              boletosPagos++;
            }
            // Boletos Atrasados (vencidos ou status vencido)
            else if (status === 'vencido' || estaVencido) {
              boletosAtrasados++;
            }
            // Boletos Pendentes (não pagos e não vencidos)
            else if (status === 'pendente' || !status) {
              boletosPendentes++;
            }
          });
        } else {
          console.warn('⚠️ [DashboardPaciente] Falha ao carregar boletos:', boletosResponse.status);
        }
      } catch (boletosError) {
        console.error('❌ [DashboardPaciente] Erro ao buscar boletos:', boletosError);
      }

      const pacienteReferencia = pacienteInfo || pacienteInfoRef.current;
      let documentosPendentes = 0;
      if (pacienteReferencia) {
        const faltaCPF = !pacienteReferencia.cpf || pacienteReferencia.cpf.trim() === '';
        const faltaComprovante = !pacienteReferencia.comprovante_residencia_url || pacienteReferencia.comprovante_residencia_url.trim() === '';
        documentosPendentes = [faltaCPF, faltaComprovante].filter(Boolean).length;
      }

      setDados({
        proximosAgendamentos: [],
        documentosPendentes,
        boletosPagos,
        boletosPendentes,
        boletosAtrasados
      });
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
      showErrorToast('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [makeRequest, showErrorToast, user?.id, user?.paciente_id]);

  const verificarCadastroCompleto = useCallback(async () => {
    // Se o cadastro já foi finalizado, não verificar novamente
    if (cadastroFinalizado) {
      console.log('✅ [DashboardPaciente] Cadastro já finalizado. Pulando verificação.');
      return;
    }
    
    // Se o modal já está aberto, não verificar novamente (evita reinicialização)
    if (showModalCadastro) {
      console.log('⏸️ [DashboardPaciente] Modal já aberto, pulando verificação para evitar reinicialização');
      return;
    }
    
    try {
      const pacienteId = user?.paciente_id || user?.id;
      
      if (!pacienteId) {
        console.log('⚠️ [DashboardPaciente] pacienteId não encontrado:', { 
          paciente_id: user?.paciente_id, 
          id: user?.id,
          user 
        });
        setLoading(false);
        return;
      }

      console.log('🔍 [DashboardPaciente] Verificando cadastro completo para paciente:', pacienteId);

      const response = await makeRequest(`/pacientes/${pacienteId}`);
      if (response.ok) {
        const paciente = await response.json();
        
        // Só atualizar pacienteData se o modal não estiver aberto
        if (!showModalCadastro) {
          setPacienteData(paciente);
          pacienteInfoRef.current = paciente;
        } else {
          // Se o modal está aberto, apenas atualizar a referência sem atualizar o estado
          pacienteInfoRef.current = paciente;
        }
        
        console.log('📋 [DashboardPaciente] Dados do paciente:', {
          cpf: paciente.cpf ? '✓' : '✗',
          comprovante_residencia_url: paciente.comprovante_residencia_url ? '✓' : '✗',
          contrato_servico_url: paciente.contrato_servico_url ? '✓' : '✗'
        });
        
        // Se o cadastro já foi finalizado, não verificar novamente
        if (cadastroFinalizado) {
          console.log('✅ [DashboardPaciente] Cadastro já foi finalizado. Pulando verificação.');
          fetchDashboardData();
          return;
        }
        
        // Verificar se algum campo obrigatório está faltando
        // IMPORTANTE: Mesmo que o CPF já exista, o paciente deve passar pelo step-by-step
        // para confirmar cada informação
        // NOTA: O contrato não é obrigatório, pois pode não existir fechamento ainda
        const faltaCPF = !paciente.cpf || paciente.cpf.trim() === '';
        const faltaComprovante = !paciente.comprovante_residencia_url || paciente.comprovante_residencia_url.trim() === '';
        
        const cadastroIncompleto = faltaCPF || faltaComprovante;
        
        if (cadastroIncompleto) {
          console.log('⚠️ [DashboardPaciente] Cadastro incompleto. Mostrando modal...');
          // Mostrar modal para completar cadastro
          setShowModalCadastro(true);
          // Atualizar pacienteData apenas quando for abrir o modal
          setPacienteData(paciente);
          setLoading(false);
          return;
        }
        
        console.log('✅ [DashboardPaciente] Cadastro completo!');
        fetchDashboardData(paciente);
      } else {
        console.error('❌ [DashboardPaciente] Erro ao buscar paciente:', response.status);
      }
      
      // Se chegou aqui, cadastro está completo - carregar dados do dashboard
      fetchDashboardData();
    } catch (error) {
      console.error('❌ [DashboardPaciente] Erro ao verificar cadastro:', error);
      // Em caso de erro, tentar carregar dashboard mesmo assim
      fetchDashboardData();
    }
  }, [user, makeRequest, fetchDashboardData, cadastroFinalizado, showModalCadastro]);

  useEffect(() => {
    // Aguardar o user estar disponível antes de verificar
    // Não verificar se o cadastro já foi finalizado
    if (user && !cadastroFinalizado) {
      verificarCadastroCompleto();
    } else if (!user) {
      setLoading(false);
    } else if (cadastroFinalizado) {
      // Se o cadastro foi finalizado, apenas carregar o dashboard
      fetchDashboardData();
    }
  }, [user, cadastroFinalizado, verificarCadastroCompleto, fetchDashboardData]);

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
        {/* Card de Boletos Pagos */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>
            Boletos Pagos
          </h3>
          <p style={{ fontSize: '2rem', fontWeight: '700', color: '#059669', margin: 0 }}>
            {dados.boletosPagos}
          </p>
        </div>

        {/* Card de Boletos Pendentes */}
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
          <p style={{ fontSize: '2rem', fontWeight: '700', color: '#f59e0b', margin: 0 }}>
            {dados.boletosPendentes}
          </p>
        </div>

        {/* Card de Boletos Atrasados */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>
            Boletos Atrasados
          </h3>
          <p style={{ fontSize: '2rem', fontWeight: '700', color: '#ef4444', margin: 0 }}>
            {dados.boletosAtrasados}
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
      
      {/* Modal de Cadastro Completo */}
      {showModalCadastro && pacienteData && (
        <ModalCadastroCompletoPaciente 
          paciente={pacienteData}
          onClose={() => {
            setShowModalCadastro(false);
            // Não verificar imediatamente ao fechar, apenas se o usuário fechar manualmente
          }}
          onComplete={() => {
            console.log('✅ [DashboardPaciente] onComplete chamado - finalizando cadastro');
            
            // Marcar cadastro como finalizado para evitar loop
            setCadastroFinalizado(true);
            
            // Fechar o modal imediatamente
            setShowModalCadastro(false);
            setPacienteData(null);
            
            // Mostrar mensagem de sucesso
            showSuccessToast('Cadastro completado com sucesso! Carregando seu dashboard...');
            
            // Aguardar um pouco e carregar o dashboard
            setTimeout(() => {
              console.log('✅ [DashboardPaciente] Carregando dashboard...');
              setLoading(false);
              fetchDashboardData();
            }, 500);
          }}
        />
      )}
    </div>
  );
};

export default DashboardPaciente;

