const https = require('https');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

console.log('🔍 Testando API REST do Supabase diretamente...');
console.log('📍 URL:', SUPABASE_URL);
console.log('🔑 Service Key:', SUPABASE_KEY ? 'Configurada' : 'NÃO CONFIGURADA');

// Testar GET direto na API REST
const testRestAPI = () => {
  const url = `${SUPABASE_URL}/rest/v1/novas_clinicas?select=*`;
  
  const options = {
    method: 'GET',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    }
  };

  console.log('\n🧪 Fazendo requisição direta para:', url);
  
  const req = https.request(url, options, (res) => {
    let data = '';
    
    console.log('📊 Status Code:', res.statusCode);
    console.log('📋 Headers:', res.headers);
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('\n📄 Resposta:');
      try {
        const jsonData = JSON.parse(data);
        console.log('✅ Dados recebidos:', jsonData);
      } catch (error) {
        console.log('❌ Erro ao fazer parse:', error.message);
        console.log('🔤 Resposta raw:', data);
      }
    });
  });
  
  req.on('error', (error) => {
    console.log('💥 Erro na requisição:', error.message);
  });
  
  req.end();
};

// Testar também listar todas as tabelas disponíveis
const testTables = () => {
  const url = `${SUPABASE_URL}/rest/v1/`;
  
  const options = {
    method: 'GET',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    }
  };

  console.log('\n🧪 Testando endpoint raiz para ver tabelas disponíveis...');
  
  const req = https.request(url, options, (res) => {
    let data = '';
    
    console.log('📊 Status Code:', res.statusCode);
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('\n📄 Resposta do endpoint raiz:');
      console.log(data);
    });
  });
  
  req.on('error', (error) => {
    console.log('💥 Erro na requisição:', error.message);
  });
  
  req.end();
};

// Executar os testes
testRestAPI();
setTimeout(testTables, 2000);

