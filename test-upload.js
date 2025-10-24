// Script para testar upload de contrato
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testUpload() {
  try {
    const form = new FormData();
    form.append('solicitacao_carteira_id', 'test-id');
    form.append('paciente_cpf', '12345678901');
    form.append('paciente_nome', 'Teste');
    form.append('arquivo', 'test content', { filename: 'test.txt' });

    const response = await fetch('http://localhost:5000/api/contratos-carteira/upload', {
      method: 'POST',
      body: form,
      headers: {
        'Authorization': 'Bearer YOUR_TOKEN_HERE'
      }
    });

    console.log('Status:', response.status);
    console.log('Response:', await response.text());
  } catch (error) {
    console.error('Erro:', error);
  }
}

testUpload();

