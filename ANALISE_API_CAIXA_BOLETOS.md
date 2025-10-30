# 📋 Análise: Integração API Caixa - Portal de Boletos para Pacientes (Empresa ID 3)

## 📊 Resumo Executivo

**Objetivo:** Permitir que pacientes da empresa_id 3 acessem seus próprios boletos através de um portal exclusivo, integrado com a API de Gestão de Boletos da Caixa.

**Status:** Análise de requisitos e planejamento - PRONTO PARA IMPLEMENTAÇÃO

---

## 🔑 Credenciais e Configurações Recebidas

### Ambiente Sandbox (Desenvolvimento)

**API Key:**
```
1777123839e09849f9a0d5a3d972d35e6e
```

**OAuth 2.0 - Client Credentials:**
- **ClientID:** `cli-ext-41267440000197-1`
- **Secret:** `90b11321-8363-477d-bf16-8ccf1963916d`
- **Token URL:** `https://loginservicos.caixa.gov.br/auth/realms/internet/protocol/openid-connect/token`
- **Realm:** `internet`

**Ambiente Sandbox (desenvolvimento):**
- **Auth Server URL:** `https://logindes.caixa.gov.br/auth`
- **API Base URL:** `https://api.caixa.gov.br:8443/cobranca-bancaria`

**Limitações:**
- ✅ API Rate Limit: **5 calls/segundo**
- ✅ SSO CAIXA Rate Limit: **1 call/IP/minuto** (token deve ser reutilizado)
- ⚠️ **ATENÇÃO:** Credenciais são apenas para ambiente de teste
- ⚠️ Produção será liberada após implementações IT

---

## 📚 Documentação da API Caixa

### Endpoints Disponíveis

#### 1. **Incluir Boleto**
```
POST /v4/beneficiarios/{id_beneficiario}/boletos
```
- **Descrição:** Cria um novo boleto bancário
- **Body:** `inclui_boleto_requisicao_v4_Mensagem`
- **Response:** `inclui_boleto_resposta_Mensagem_v4`
- **Retorna:** `nosso_numero`, `codigo_barras`, `linha_digitavel`, `url`, `qrcode`, `url_qrcode`

#### 2. **Consultar Boleto**
```
GET /v4/beneficiarios/{id_beneficiario}/boletos/{nosso_numero}
```
- **Descrição:** Busca informações completas de um boleto
- **Response:** `consulta_boleto_resposta_Mensagem_v4`
- **Retorna:** Dados cadastrais completos + dados complementares (código de barras, linha digitável, URL, QRCode)

#### 3. **Alterar Boleto**
```
PUT /v4/beneficiarios/{id_beneficiario}/boletos/{nosso_numero}
```
- **Descrição:** Modifica dados de um boleto existente
- **Body:** `altera_boleto_requisicao_v4_Mensagem`

#### 4. **Baixar Boleto**
```
POST /v2/beneficiarios/{id_beneficiario}/boletos/{nosso_numero}/baixar
```
- **Descrição:** Cancela/baixa um boleto
- **Response:** `baixa_boleto_resposta_v3_Mensagem`

### Autenticação

**Tipo:** OAuth 2.0 - Client Credentials Grant

**Fluxo:**
1. Fazer POST para `/token` com `client_id` e `client_secret`
2. Receber `access_token` com expiração
3. Usar token no header: `Authorization: Bearer {access_token}`
4. **IMPORTANTE:** Reutilizar token (limite de 1 call/IP/minuto para SSO)

**Headers Necessários:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
x-api-key: {API_KEY}
```

---

## 🏗️ Arquitetura Proposta

### Fluxo de Autenticação OAuth 2.0

```
1. Backend faz requisição para SSO CAIXA
   POST https://loginservicos.caixa.gov.br/auth/realms/internet/protocol/openid-connect/token
   Body: grant_type=client_credentials&client_id={CLIENT_ID}&client_secret={SECRET}
   
2. SSO CAIXA retorna access_token
   Response: { "access_token": "...", "expires_in": 3600, ... }
   
3. Backend armazena token (com cache/TTL)
   - Guardar token + timestamp de expiração
   - Reutilizar enquanto válido
   - Renovar automaticamente quando próximo de expirar

4. Usar token nas requisições à API
   GET/POST/PUT https://api.caixa.gov.br:8443/cobranca-bancaria/v4/...
   Headers: Authorization: Bearer {access_token}
            x-api-key: {API_KEY}
```

### Estrutura de Dados

#### Tabela: `boletos_caixa` (nova)
```sql
- id (PK)
- paciente_id (FK -> pacientes.id)
- fechamento_id (FK -> fechamentos.id, nullable)
- id_beneficiario (INTEGER) - ID do beneficiário na Caixa
- nosso_numero (BIGINT) - Número do boleto na Caixa
- numero_documento (STRING) - Número do documento interno
- codigo_barras (STRING)
- linha_digitavel (STRING)
- url (STRING) - URL para visualização do boleto
- qrcode (TEXT) - Código QRCode
- url_qrcode (STRING) - URL do QRCode
- valor (DECIMAL)
- valor_pago (DECIMAL, nullable)
- data_vencimento (DATE)
- data_emissao (DATE)
- data_hora_pagamento (TIMESTAMP, nullable)
- situacao (STRING) - EM ABERTO, PAGO, BAIXADO, etc.
- empresa_id (INTEGER) - Para filtrar por empresa (3)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Fluxo de Criação de Boleto

```
1. Sistema cria fechamento (ou atualiza paciente financeiro)
   ↓
2. Backend identifica empresa_id = 3
   ↓
3. Sistema gera dados do boleto (valor, vencimento, pagador)
   ↓
4. Backend autentica na API Caixa (obtém token)
   ↓
5. Backend faz POST /v4/beneficiarios/{id_beneficiario}/boletos
   ↓
6. API Caixa retorna nosso_numero, código de barras, etc.
   ↓
7. Backend salva na tabela boletos_caixa
   ↓
8. Sistema notifica paciente (se configurado)
```

### Fluxo de Consulta de Boletos (Paciente)

```
1. Paciente acessa portal (página pública ou autenticada)
   ↓
2. Paciente identifica-se (CPF ou código de acesso)
   ↓
3. Sistema valida e busca boletos do paciente
   ↓
4. Sistema consulta API Caixa para status atualizado
   ↓
5. Sistema exibe lista de boletos com status
   ↓
6. Paciente pode:
   - Visualizar boleto (PDF/HTML)
   - Copiar código de barras
   - Escanear QRCode
   - Ver histórico de pagamentos
```

---

## 🎯 Requisitos Funcionais

### RF1: Gerenciamento de Boletos (Backend)
- ✅ Criar boleto na Caixa quando fechamento é criado (empresa_id 3)
- ✅ Consultar status de boleto na Caixa
- ✅ Atualizar boleto (se necessário)
- ✅ Baixar/cancelar boleto
- ✅ Sincronizar status de pagamento periodicamente

### RF2: Portal do Paciente (Frontend)
- ✅ Listar boletos do paciente
- ✅ Visualizar detalhes do boleto
- ✅ Download de PDF do boleto
- ✅ Copiar código de barras
- ✅ Visualizar QRCode
- ✅ Ver histórico de pagamentos
- ✅ Filtros por status (em aberto, pago, vencido)

### RF3: Autenticação do Paciente
- ✅ Acesso via CPF + código de acesso (token único)
- ✅ Ou acesso autenticado (se já tiver login)
- ✅ Validação de segurança

### RF4: Integração com Sistema Existente
- ✅ Associar boletos a fechamentos existentes
- ✅ Associar boletos a pacientes financeiros
- ✅ Manter sincronização com status do sistema

---

## 🔒 Segurança e Validações

### Segurança
- ✅ **Token OAuth:** Armazenar em variáveis de ambiente (nunca commit)
- ✅ **Rate Limiting:** Implementar cache de token para evitar excesso de calls
- ✅ **Validação de Acesso:** Paciente só vê seus próprios boletos
- ✅ **API Key:** Armazenar em variáveis de ambiente

### Validações
- ✅ Validar CPF do pagador antes de criar boleto
- ✅ Validar dados obrigatórios (valor, vencimento, etc.)
- ✅ Validar empresa_id = 3 antes de criar boleto
- ✅ Tratar erros da API Caixa adequadamente

---

## 📁 Estrutura de Arquivos Proposta

```
backend/
├── config/
│   └── caixa.js                    # Configurações da API Caixa
├── services/
│   └── caixa-boleto.service.js    # Serviço de integração com API Caixa
├── controllers/
│   └── boletos-caixa.controller.js # Controllers de boletos
├── routes/
│   └── boletos-caixa.routes.js    # Rotas de boletos
└── middleware/
    └── caixa-auth.js               # Middleware de autenticação OAuth

frontend/
└── src/
    └── components/
        └── PortalBoletos.js        # Componente do portal do paciente
```

---

## 🚀 Plano de Implementação

### Fase 1: Configuração e Infraestrutura
1. ✅ Criar arquivo de configuração da API Caixa
2. ✅ Adicionar variáveis de ambiente
3. ✅ Criar serviço de autenticação OAuth 2.0
4. ✅ Implementar cache de token

### Fase 2: Integração Backend
1. ✅ Criar tabela `boletos_caixa` no banco
2. ✅ Criar serviço de integração com API Caixa
3. ✅ Implementar criação de boleto
4. ✅ Implementar consulta de boleto
5. ✅ Implementar atualização de status

### Fase 3: Portal do Paciente
1. ✅ Criar componente PortalBoletos
2. ✅ Implementar autenticação de paciente
3. ✅ Listar boletos do paciente
4. ✅ Visualizar detalhes do boleto
5. ✅ Download de PDF/visualização

### Fase 4: Integração com Sistema Existente
1. ✅ Integrar criação automática de boleto em fechamentos (empresa_id 3)
2. ✅ Adicionar campo de boletos em pacientes financeiro
3. ✅ Sincronização periódica de status

### Fase 5: Testes e Ajustes
1. ✅ Testes em ambiente sandbox
2. ✅ Validação de fluxos
3. ✅ Ajustes finais

---

## ⚠️ Pontos de Atenção

### 1. ID do Beneficiário
- **CRÍTICO:** Precisamos saber o `id_beneficiario` da empresa na Caixa
- Este ID deve ser fornecido pela Caixa ou configurado no sistema

### 2. Ambiente de Produção
- Credenciais de produção serão diferentes
- Configurar variáveis de ambiente separadas
- URL de produção pode ser diferente

### 3. Rate Limiting
- Implementar cache de token (TTL baseado em expires_in)
- Implementar queue/throttling para API calls
- Monitorar limites de rate

### 4. Tratamento de Erros
- Erros da API Caixa podem ser específicos
- Implementar retry logic para erros temporários
- Logs detalhados para debug

### 5. Sincronização
- Status de pagamento pode mudar na Caixa
- Implementar job periódico para sincronizar
- Notificar paciente quando boleto for pago

---

## 📝 Próximos Passos

1. **Confirmar informações:**
   - ID do beneficiário (`id_beneficiario`) na Caixa
   - Se pacientes já têm CPF cadastrado
   - Forma de autenticação do paciente no portal

2. **Criar estrutura base:**
   - Variáveis de ambiente
   - Arquivos de configuração
   - Estrutura de banco de dados

3. **Implementar autenticação OAuth:**
   - Serviço de token
   - Cache de token

4. **Implementar endpoints básicos:**
   - Criar boleto
   - Consultar boleto
   - Listar boletos do paciente

5. **Criar portal do paciente:**
   - Interface de visualização
   - Autenticação
   - Listagem e detalhes

---

## 🔗 Referências

- **Swagger API:** `swagger_caixa_gestao_boletos_producao_052023.json`
- **Documentação:** `API Gestão de Boletos CAIXA.pdf`
- **Email de Credenciais:** Recebido e documentado acima

---

**Data da Análise:** Dezembro 2024
**Status:** ✅ PRONTO PARA IMPLEMENTAÇÃO

