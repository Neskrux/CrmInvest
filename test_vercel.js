const https = require('https');
const http = require('http');

async function testEndpoint(url, data = null) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;
    
    const options = {
      method: data ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Test-Script'
      }
    };

    const req = client.request(url, options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: responseData
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function main() {
  console.log('🧪 TESTE COMPLETO DO BACKEND VERCEL');
  console.log('===================================');
  
  const baseUrl = 'https://crm-invest.vercel.app';
  
  // Teste 1: Endpoint básico
  console.log('\n1️⃣ Testando endpoint raiz...');
  try {
    const response = await testEndpoint(`${baseUrl}/`);
    console.log(`✅ Status: ${response.status}`);
    console.log(`📄 Resposta: ${response.data.substring(0, 100)}...`);
  } catch (error) {
    console.log(`❌ Erro: ${error.message}`);
  }

  // Teste 2: API Health Check
  console.log('\n2️⃣ Testando API health...');
  try {
    const response = await testEndpoint(`${baseUrl}/api/`);
    console.log(`✅ Status: ${response.status}`);
    console.log(`📄 Resposta: ${response.data}`);
  } catch (error) {
    console.log(`❌ Erro: ${error.message}`);
  }

  // Teste 3: Login endpoint
  console.log('\n3️⃣ Testando endpoint de login...');
  try {
    const loginData = {
      email: 'admin@crm.com',
      senha: 'admin123'
    };
    
    const response = await testEndpoint(`${baseUrl}/api/login`, loginData);
    console.log(`✅ Status: ${response.status}`);
    
    if (response.status === 200) {
      console.log(`🎉 LOGIN FUNCIONOU!`);
      const data = JSON.parse(response.data);
      console.log(`👤 Usuário: ${data.usuario?.nome}`);
      console.log(`🔑 Token: ${data.token ? 'Presente' : 'Ausente'}`);
    } else {
      console.log(`❌ Erro no login: ${response.data}`);
    }
  } catch (error) {
    console.log(`❌ Erro: ${error.message}`);
  }

  // Teste 4: Verificar variáveis de ambiente
  console.log('\n4️⃣ Testando endpoint de debug...');
  try {
    const response = await testEndpoint(`${baseUrl}/api/debug-env`);
    console.log(`✅ Status: ${response.status}`);
    console.log(`📄 Resposta: ${response.data}`);
  } catch (error) {
    console.log(`❌ Erro: ${error.message}`);
  }

  console.log('\n🏁 TESTE CONCLUÍDO');
}

main().catch(console.error);
