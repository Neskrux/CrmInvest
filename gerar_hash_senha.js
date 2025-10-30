// Script Node.js para gerar hash da senha
// Execute: node gerar_hash_senha.js

const bcrypt = require('bcrypt');

async function gerarHash() {
  const senha = '123456'; // Senha de teste
  const hash = await bcrypt.hash(senha, 10);
  
  console.log('\n========================================');
  console.log('Hash gerado com sucesso!');
  console.log('========================================');
  console.log('Senha:', senha);
  console.log('Hash:', hash);
  console.log('\nCopie o hash acima e cole no script SQL');
  console.log('========================================\n');
}

gerarHash().catch(console.error);

