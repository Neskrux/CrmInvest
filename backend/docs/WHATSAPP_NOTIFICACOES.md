# Documentação - Sistema de Notificações de Boletos via WhatsApp

## 📋 Visão Geral

Sistema aprimorado para envio de notificações de boletos via WhatsApp usando templates pré-configurados. A estrutura foi projetada para facilitar a integração com o banco de dados e permitir envios automáticos.

## 🗂️ Estrutura de Arquivos

```
backend/
├── config/
│   └── whatsapp-templates.js          # Configuração dos templates de mensagens
├── services/
│   └── whatsapp.service.js            # Serviço principal (já existia, foi expandido)
├── controllers/
│   ├── whatsapp.controller.js        # Controller principal (já existia)
│   └── whatsapp-notificacoes.controller.js  # Controller de notificações (NOVO)
├── routes/
│   └── whatsapp.routes.js           # Rotas (já existia, foi expandido)
└── scripts/
    └── test-whatsapp.js              # Script de teste (já existia, foi expandido)
```

## 📝 Templates Configurados

Os templates estão definidos em `backend/config/whatsapp-templates.js`:

- **BOLETO_VENCE_3_DIAS**: "Seu boleto vence em 3 dias."
- **BOLETO_VENCE_1_DIA**: "Seu boleto vence em 1 dia."
- **BOLETO_VENCE_HOJE**: "Seu boleto vence hoje!"

## 🚀 Como Usar

### 1. Enviar Notificação para um Paciente Específico

**Endpoint:** `POST /api/whatsapp/notificacoes/boleto`

**Autenticação:** Requerida (JWT token)

**Body:**
```json
{
  "paciente_id": 123,
  "template_type": "BOLETO_VENCE_3_DIAS"
}
```

**Tipos de template disponíveis:**
- `BOLETO_VENCE_3_DIAS`
- `BOLETO_VENCE_1_DIA`
- `BOLETO_VENCE_HOJE`

**Exemplo de resposta:**
```json
{
  "success": true,
  "data": {
    "sid": "SMb7aedbe0ae975d37e68e05bb80ef1bc3",
    "status": "queued",
    "to": "whatsapp:+554199196790",
    "from": "whatsapp:+14155238886",
    "dateCreated": "2025-10-31T16:45:02.000Z",
    "paciente_nome": "João Silva",
    "template_type": "BOLETO_VENCE_3_DIAS"
  }
}
```

**Exemplo de erro - Paciente não encontrado:**
```json
{
  "success": false,
  "error": "Paciente não encontrado"
}
```

**Exemplo de erro - Paciente sem telefone:**
```json
{
  "success": false,
  "error": "Paciente sem telefone",
  "message": "O paciente não possui número de telefone cadastrado"
}
```

### 2. Enviar Notificações Automáticas

**Endpoint:** `POST /api/whatsapp/notificacoes/boletos/automaticas`

**Autenticação:** Requerida (JWT token)

**Body:**
```json
{
  "dias_vencimento": 3
}
```

**Valores aceitos para `dias_vencimento`:**
- `3` - Boletos vencendo em 3 dias (usa template `BOLETO_VENCE_3_DIAS`)
- `1` - Boletos vencendo em 1 dia (usa template `BOLETO_VENCE_1_DIA`)
- `0` - Boletos vencendo hoje (usa template `BOLETO_VENCE_HOJE`)

**Exemplo de resposta - Sucesso:**
```json
{
  "success": true,
  "data": {
    "template_type": "BOLETO_VENCE_3_DIAS",
    "dias_vencimento": 3,
    "total_encontrados": 5,
    "total_enviados": 4,
    "total_erros": 1,
    "resultados": [
      {
        "paciente_id": 123,
        "paciente_nome": "João Silva",
        "sid": "SMb7aedbe0ae975d37e68e05bb80ef1bc3",
        "status": "queued"
      },
      {
        "paciente_id": 125,
        "paciente_nome": "Maria Santos",
        "sid": "SMc1a5a788206c1b101a22d0d038c721d9",
        "status": "queued"
      }
    ],
    "erros": [
      {
        "paciente_id": 124,
        "paciente_nome": "Pedro Oliveira",
        "error": "Número não está no Sandbox",
        "code": 63015
      }
    ]
  }
}
```

**Exemplo de resposta - Nenhum boleto encontrado:**
```json
{
  "success": true,
  "message": "Nenhum boleto encontrado vencendo em 3 dia(s)",
  "data": {
    "total_encontrados": 0,
    "total_enviados": 0,
    "erros": []
  }
}
```

### Como Funciona a Busca Automática

A busca é feita na tabela `pacientes` usando a seguinte query:

```javascript
// Para boletos vencendo em 3 dias (2025-11-03)
const { data: pacientes } = await supabaseAdmin
  .from('pacientes')
  .select('id, nome, telefone, vencimento, valor_parcela')
  .eq('vencimento', '2025-11-03')
  .not('telefone', 'is', null)
  .not('telefone', 'eq', '');
```

**Critérios de busca:**
- `vencimento` deve ser exatamente igual à data calculada (hoje + dias_vencimento)
- `telefone` não pode ser `NULL` ou vazio
- Retorna apenas campos necessários: `id`, `nome`, `telefone`, `vencimento`, `valor_parcela`

### Estrutura da Tabela `pacientes` (Supabase)

**Campos utilizados para notificações:**
- `id` (integer, PK) - ID único do paciente
- `nome` (text) - Nome completo do paciente
- `telefone` (text) - Número de telefone (obrigatório, formato: apenas números, ex: "554199196790")

**Campos opcionais (para uso futuro com boletos):**
- `vencimento` (date) - Data de vencimento do boleto (formato: YYYY-MM-DD)
- `valor_parcela` (numeric) - Valor da parcela

### Exemplo de Dados Reais no Banco

```sql
-- Consulta exemplo na tabela pacientes
SELECT id, nome, telefone, vencimento, valor_parcela 
FROM pacientes 
WHERE id = 123;

-- Resultado esperado:
-- id: 123
-- nome: "João Silva"
-- telefone: "554199196790"  (apenas números, sem formatação - como está armazenado no Supabase)
-- vencimento: "2025-11-03"  (ou NULL se não houver)
-- valor_parcela: 1500.00    (ou NULL se não houver)
```

### Validações Implementadas

1. **Paciente existe**: Verifica se o `paciente_id` existe na tabela `pacientes` usando `.eq('id', paciente_id).single()`
2. **Telefone obrigatório**: Retorna erro se `telefone` for `NULL` ou string vazia
3. **Formato do telefone**: O sistema normaliza automaticamente o telefone para formato internacional (`whatsapp:+55...`)
4. **Vencimento**: Para envios automáticos, busca pacientes onde `vencimento = data_alvo` (formato YYYY-MM-DD)

## 📱 Testando Manualmente

### Via Script de Teste

```bash
# Testar envio simples
node scripts/test-whatsapp.js

# Testar envio com template
node scripts/test-whatsapp.js template

# Testar notificação de boleto
node scripts/test-whatsapp.js boleto
```

### Via API (usando curl ou Postman)

```bash
# 1. Obter token de autenticação (via login)
# POST /api/auth/login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@exemplo.com",
    "password": "senha123"
  }'
# Resposta: { "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }

# 2. Enviar notificação para paciente específico
# POST /api/whatsapp/notificacoes/boleto
curl -X POST http://localhost:5000/api/whatsapp/notificacoes/boleto \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "paciente_id": 123,
    "template_type": "BOLETO_VENCE_3_DIAS"
  }'

# 3. Enviar notificações automáticas para todos os boletos vencendo em 3 dias
# POST /api/whatsapp/notificacoes/boletos/automaticas
curl -X POST http://localhost:5000/api/whatsapp/notificacoes/boletos/automaticas \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "dias_vencimento": 3
  }'
```

### Exemplo Real com Dados do Banco

**Cenário**: Você tem um paciente cadastrado na tabela `pacientes`:

```sql
-- Paciente no banco
id: 123
nome: "João Silva"
telefone: "554199196790"
vencimento: "2025-11-03"
valor_parcela: 1500.00
```

**Chamada da API:**
```bash
POST /api/whatsapp/notificacoes/boleto
{
  "paciente_id": 123,
  "template_type": "BOLETO_VENCE_3_DIAS"
}
```

**O sistema irá:**
1. Buscar o paciente `id=123` na tabela `pacientes`
2. Validar que existe e tem telefone
3. Normalizar o telefone `"554199196790"` → `"whatsapp:+554199196790"`
4. Enviar mensagem: "Seu boleto vence em 3 dias."
5. Retornar resultado com `sid` do Twilio

## 🔄 Automação (Cron Job ou Agendador)

Para automatizar o envio de notificações, você pode criar um job agendado que chame o endpoint de notificações automáticas:

**Exemplo com cron (Linux/Mac):**
```bash
# Executar diariamente às 08:00 AM
0 8 * * * curl -X POST http://localhost:5000/api/whatsapp/notificacoes/boletos/automaticas \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{"dias_vencimento": 3}'
```

**Exemplo com Node.js (node-cron):**
```javascript
const cron = require('node-cron');
const axios = require('axios');

// Executar diariamente às 08:00 AM
cron.schedule('0 8 * * *', async () => {
  try {
    // 1. Buscar token de autenticação (se necessário)
    const token = await getAuthToken();
    
    // 2. Enviar notificações para boletos vencendo em 3 dias
    await axios.post('http://localhost:5000/api/whatsapp/notificacoes/boletos/automaticas', {
      dias_vencimento: 3
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Notificações de 3 dias enviadas');
    
    // 3. Enviar notificações para boletos vencendo em 1 dia (às 14:00)
    // Similar para vencendo hoje (às 16:00)
  } catch (error) {
    console.error('❌ Erro ao enviar notificações:', error);
  }
});
```

## ⚙️ Configuração de Templates

Para modificar ou adicionar novos templates, edite o arquivo `backend/config/whatsapp-templates.js`:

```javascript
const templates = {
  BOLETO_VENCE_3_DIAS: {
    name: 'boleto_vence_3_dias',
    message: 'Seu boleto vence em 3 dias.',
    contentSid: null, // Configure quando tiver template aprovado no Twilio
    useSimpleText: true
  },
  // Adicione novos templates aqui
};
```

## 🎯 Próximos Passos

### Fase Atual (Implementado)
✅ Estrutura básica de templates  
✅ Integração com tabela `pacientes` do Supabase  
✅ Busca por `id`, `nome`, `telefone`  
✅ Envio individual e automático  

### Fase Futura (Quando Suporte a Boletos Estiver Disponível)

1. **Expandir Campos Utilizados:**
   - Adicionar suporte para `vencimento` e `valor_parcela` quando disponíveis
   - Criar tabela específica para boletos (se necessário)
   - Vincular pacientes a múltiplos boletos

2. **Templates Aprovados no Twilio:**
   - Quando os templates forem aprovados no Twilio, adicione o `contentSid` em `whatsapp-templates.js`
   - Altere `useSimpleText: false` para usar templates aprovados

3. **Histórico de Envios:**
   - Criar tabela `notificacoes_enviadas` para registrar histórico
   - Campos sugeridos: `id`, `paciente_id`, `template_type`, `twilio_sid`, `status`, `data_envio`, `erro`
   - Permitir consulta de status das mensagens

4. **Automação Completa:**
   - Configurar cron jobs ou agendadores para envio automático diário
   - Implementar lógica para evitar envios duplicados (verificar último envio por paciente)
   - Adicionar retry automático para falhas temporárias

5. **Variáveis Dinâmicas nos Templates:**
   - Suportar `{nome}`, `{valor}`, `{data_vencimento}` nos templates
   - Formatação automática de valores monetários e datas

## 📞 Suporte

Para dúvidas ou problemas, consulte:
- Documentação do Twilio: https://www.twilio.com/docs/whatsapp
- Logs do servidor para diagnóstico de erros
- Console do Twilio para verificar status das mensagens

