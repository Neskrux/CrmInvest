import React, { useState } from 'react';
import useBranding from '../hooks/useBranding';

const TesteBranding = () => {
  const [empresaIdSimulado, setEmpresaIdSimulado] = useState(null);
  const [usuarioSimulado, setUsuarioSimulado] = useState(null);

  // Simular diferentes empresa_id
  const simularEmpresa = (empresaId) => {
    const usuarios = {
      1: { empresa_id: 1, nome: 'Usuário Empresa 1', tipo: 'admin' },
      5: { empresa_id: 5, nome: 'Usuário Incorporadora', tipo: 'admin' },
      10: { empresa_id: 10, nome: 'Usuário Empresa 10', tipo: 'admin' }
    };
    
    setUsuarioSimulado(usuarios[empresaId]);
    setEmpresaIdSimulado(empresaId);
    
    // Simular login no localStorage para o hook funcionar
    localStorage.setItem('user', JSON.stringify(usuarios[empresaId]));
    window.location.reload(); // Recarregar para aplicar as mudanças
  };

  // Reset para estado original
  const resetar = () => {
    setUsuarioSimulado(null);
    setEmpresaIdSimulado(null);
    localStorage.removeItem('user');
    window.location.reload();
  };

  return (
    <div style={{ 
      padding: '20px', 
      background: '#f8fafc', 
      minHeight: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ 
        maxWidth: '800px', 
        margin: '0 auto',
        background: 'white',
        padding: '30px',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <h1 style={{ 
          color: '#1a1d23', 
          marginBottom: '20px',
          fontSize: '2rem',
          fontWeight: '700'
        }}>
          🧪 Teste de Branding por Empresa
        </h1>
        
        <p style={{ 
          color: '#6b7280', 
          marginBottom: '30px',
          lineHeight: '1.6'
        }}>
          Este componente permite testar como os textos se adaptam baseado no <code>empresa_id</code> do usuário.
          <br />
          <strong>Empresa ID 5</strong> = Incorporadora (pacientes → clientes, consultores → corretores)
        </p>

        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ color: '#374151', marginBottom: '15px' }}>Simular Login com Empresa:</h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => simularEmpresa(1)}
              style={{
                padding: '10px 20px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Empresa ID 1 (Padrão)
            </button>
            <button
              onClick={() => simularEmpresa(5)}
              style={{
                padding: '10px 20px',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Empresa ID 5 (Incorporadora)
            </button>
            <button
              onClick={() => simularEmpresa(10)}
              style={{
                padding: '10px 20px',
                background: '#f59e0b',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Empresa ID 10 (Outra)
            </button>
            <button
              onClick={resetar}
              style={{
                padding: '10px 20px',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Reset
            </button>
          </div>
        </div>

        {usuarioSimulado && (
          <div style={{ 
            background: '#f0f9ff', 
            padding: '20px', 
            borderRadius: '8px',
            border: '1px solid #0ea5e9',
            marginBottom: '30px'
          }}>
            <h4 style={{ color: '#0c4a6e', marginBottom: '10px' }}>
              ✅ Usuário Simulado Ativo
            </h4>
            <p style={{ color: '#0c4a6e', margin: 0 }}>
              <strong>Nome:</strong> {usuarioSimulado.nome}<br />
              <strong>Empresa ID:</strong> {usuarioSimulado.empresa_id}<br />
              <strong>Tipo:</strong> {usuarioSimulado.tipo}
            </p>
          </div>
        )}

        <div style={{ 
          background: '#f9fafb', 
          padding: '20px', 
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <h3 style={{ color: '#374151', marginBottom: '15px' }}>
            📝 Textos Atuais (baseados no empresa_id):
          </h3>
          <TextoPreview />
        </div>

        <div style={{ 
          marginTop: '30px',
          padding: '20px',
          background: '#fef3c7',
          borderRadius: '8px',
          border: '1px solid #f59e0b'
        }}>
          <h4 style={{ color: '#92400e', marginBottom: '10px' }}>
            💡 Como testar:
          </h4>
          <ol style={{ color: '#92400e', margin: 0, paddingLeft: '20px' }}>
            <li>Clique em "Empresa ID 5 (Incorporadora)"</li>
            <li>Vá para o Dashboard e veja os textos mudarem</li>
            <li>Navegue pelas páginas: Pacientes, Consultores, etc.</li>
            <li>Observe como "Pacientes" vira "Clientes" e "Consultores" vira "Corretores"</li>
            <li>Use "Reset" para voltar ao normal</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

// Componente para mostrar os textos atuais
const TextoPreview = () => {
  const { t, empresaId } = useBranding();

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
      <div>
        <strong>Pacientes:</strong> <span style={{ color: '#059669' }}>{t.pacientes}</span>
      </div>
      <div>
        <strong>Consultores:</strong> <span style={{ color: '#059669' }}>{t.consultores}</span>
      </div>
      <div>
        <strong>Clínicas:</strong> <span style={{ color: '#059669' }}>{t.clinicas}</span>
      </div>
      <div>
        <strong>Agendamentos:</strong> <span style={{ color: '#059669' }}>{t.agendamentos}</span>
      </div>
      <div>
        <strong>Fechamentos:</strong> <span style={{ color: '#059669' }}>{t.fechamentos}</span>
      </div>
      <div>
        <strong>Empresa ID:</strong> <span style={{ color: '#3b82f6' }}>{empresaId || 'null'}</span>
      </div>
    </div>
  );
};

export default TesteBranding;
