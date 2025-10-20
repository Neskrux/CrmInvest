// Script de teste para simular diferentes empresa_id
// Execute este código no console do navegador para testar

// Função para simular login com empresa_id específico
function simularEmpresa(empresaId) {
  const usuarios = {
    1: { 
      empresa_id: 1, 
      nome: 'Usuário Empresa 1', 
      tipo: 'admin',
      email: 'teste1@empresa.com'
    },
    5: { 
      empresa_id: 5, 
      nome: 'Usuário Incorporadora', 
      tipo: 'admin',
      email: 'teste5@incorporadora.com'
    },
    10: { 
      empresa_id: 10, 
      nome: 'Usuário Empresa 10', 
      tipo: 'admin',
      email: 'teste10@empresa.com'
    }
  };
  
  const usuario = usuarios[empresaId];
  if (!usuario) {
    console.error('Empresa ID inválido. Use: 1, 5 ou 10');
    return;
  }
  
  // Simular dados no localStorage
  localStorage.setItem('user', JSON.stringify(usuario));
  localStorage.setItem('token', 'token-teste-' + empresaId);
  
  console.log(`✅ Simulando empresa_id: ${empresaId}`);
  console.log('Usuário:', usuario);
  console.log('🔄 Recarregue a página para ver as mudanças');
  
  return usuario;
}

// Função para resetar
function resetarTeste() {
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  console.log('🔄 Resetado. Recarregue a página');
}

// Função para verificar estado atual
function verificarEstado() {
  const user = localStorage.getItem('user');
  const token = localStorage.getItem('token');
  
  console.log('📊 Estado atual:');
  console.log('Usuário:', user ? JSON.parse(user) : 'null');
  console.log('Token:', token ? 'presente' : 'ausente');
  
  if (user) {
    const userData = JSON.parse(user);
    console.log(`🏢 Empresa ID: ${userData.empresa_id}`);
    console.log(`👤 Nome: ${userData.nome}`);
  }
}

// Função para testar textos específicos
function testarTextos() {
  // Simular o hook useBranding
  const user = localStorage.getItem('user');
  if (!user) {
    console.log('❌ Nenhum usuário logado. Use simularEmpresa(5) primeiro');
    return;
  }
  
  const userData = JSON.parse(user);
  const empresaId = userData.empresa_id;
  
  // Configuração de textos (mesma do branding.js)
  const textos = {
    default: {
      pacientes: 'Pacientes',
      consultores: 'Consultores',
      clinicas: 'Clínicas',
      agendamentos: 'Agendamentos',
      fechamentos: 'Fechamentos'
    },
    5: {
      pacientes: 'Clientes',
      consultores: 'Corretores', 
      clinicas: 'Empreendimentos',
      agendamentos: 'Agendamentos',
      fechamentos: 'Fechamentos'
    }
  };
  
  const textosAtuais = textos[empresaId] || textos.default;
  
  console.log('📝 Textos atuais:');
  console.log(`Pacientes → ${textosAtuais.pacientes}`);
  console.log(`Consultores → ${textosAtuais.consultores}`);
  console.log(`Clínicas → ${textosAtuais.clinicas}`);
  console.log(`Agendamentos → ${textosAtuais.agendamentos}`);
  console.log(`Fechamentos → ${textosAtuais.fechamentos}`);
}

// Expor funções globalmente
window.simularEmpresa = simularEmpresa;
window.resetarTeste = resetarTeste;
window.verificarEstado = verificarEstado;
window.testarTextos = testarTextos;

console.log('🧪 Script de teste carregado!');
console.log('Comandos disponíveis:');
console.log('- simularEmpresa(5)  // Simular incorporadora');
console.log('- simularEmpresa(1)  // Simular empresa padrão');
console.log('- resetarTeste()     // Resetar');
console.log('- verificarEstado()  // Ver estado atual');
console.log('- testarTextos()     // Ver textos atuais');
