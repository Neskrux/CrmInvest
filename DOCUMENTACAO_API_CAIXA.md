# 📚 Documentação Completa - Integração API Caixa Boletos

## 📋 Visão Geral

Este documento registra todas as alterações, melhorias e correções implementadas para a integração com a API de Gestão de Boletos da Caixa (MO 38.431).

---

## 🔧 Alterações Implementadas

### 1. **Correção do Header da API Key**

**Data**: Implementado durante troubleshooting inicial  
**Problema**: API Key não era reconhecida pela Caixa  
**Solução**: Alterado header de `x-api-key` para `apikey` (minúsculas, conforme manual técnico)

**Arquivos Alterados**:
- `backend/services/caixa-boleto.service.js`

**Código**:
```javascript
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json',
  'apikey': this.CAIXA_API_KEY,  // ← Correto: minúsculas
  'User-Agent': 'CrmInvest/1.0'
}
```

---

### 2. **Correção do Formato do ID do Beneficiário na URL**

**Data**: Implementado após erro 400 na API  
**Problema**: URL aceitava apenas inteiro, mas estava sendo enviado formato `0374/1242669`  
**Solução**: Extração automática do código numérico após a barra

**Arquivos Alterados**:
- `backend/services/caixa-boleto.service.js`
- `backend/utils/caixa-boletos.helper.js`
- `backend/controllers/fechamentos.controller.js`

**Código**:
```javascript
// Normalizar ID do beneficiário (pode vir como "0374/1242669" ou apenas "1242669")
// IMPORTANTE: Conforme Swagger, o parâmetro na URL deve ser "integer", não string com barra
let idBeneficiario;
if (idBeneficiarioRaw.includes('/')) {
  // Extrair apenas o código numérico após a barra
  idBeneficiario = idBeneficiarioRaw.split('/')[1].trim();
} else {
  idBeneficiario = idBeneficiarioRaw.trim();
}
```

---

### 3. **Adição do Header User-Agent**

**Data**: Implementado para evitar bloqueio anti-bot  
**Motivo**: Recomendação da Caixa para evitar bloqueios automáticos  
**Solução**: Adicionado `User-Agent: 'CrmInvest/1.0'` em todas as requisições autenticadas

**Arquivos Alterados**:
- `backend/services/caixa-boleto.service.js`

---

### 4. **Remoção do Scope Padrão no Token Request**

**Data**: Implementado durante troubleshooting  
**Problema**: Scope padrão `openid` poderia causar problemas  
**Solução**: Scope só é enviado se explicitamente configurado no `.env`

**Arquivos Alterados**:
- `backend/services/caixa-boleto.service.js`

**Código**:
```javascript
// Adicionar scope apenas se explicitamente configurado no .env
if (process.env.CAIXA_SCOPE) {
  tokenParams.scope = process.env.CAIXA_SCOPE;
}
```

---

### 5. **Implementação de Retry com Exponential Backoff para Rate Limit**

**Data**: Implementado após erros 429 (Too Many Requests)  
**Problema**: API Caixa tem limite de 5 requisições/segundo  
**Solução**: Retry automático com espera progressiva

**Arquivos Alterados**:
- `backend/services/caixa-boleto.service.js`

**Código**:
```javascript
// Retry para token request (1min, 2min, 3min)
if (error.response?.status === 429 && tentativas < maxTentativas) {
  const waitTime = this.MIN_TOKEN_REQUEST_INTERVAL * tentativas;
  await new Promise(resolve => setTimeout(resolve, waitTime));
}

// Retry para API requests (2s, 4s, 6s)
if (error.response?.status === 429 && tentativas < maxTentativas) {
  const waitTime = 2000 * tentativas;
  await new Promise(resolve => setTimeout(resolve, waitTime));
}
```

---

### 6. **Correção da URL Base da API para Sandbox**

**Data**: Implementado após identificação no manual técnico  
**Problema**: URL Sandbox estava incorreta (faltava `/sandbox/` no path)  
**Solução**: Correção da URL base conforme manual técnico MO 38.431

**Arquivos Alterados**:
- `backend/services/caixa-boleto.service.js`

**URLs Corretas**:
- **Sandbox**: `https://api.caixa.gov.br:8443/sandbox/cobranca-bancaria`
- **Produção**: `https://api.caixa.gov.br:8443/cobranca-bancaria`

**Código**:
```javascript
const usarProducao = process.env.CAIXA_USAR_PRODUCAO === 'true';
this.CAIXA_API_BASE_URL = process.env.CAIXA_API_BASE_URL || process.env.CAIXA_BASE_URL || 
  (usarProducao 
    ? 'https://api.caixa.gov.br:8443/cobranca-bancaria'  // Produção
    : 'https://api.caixa.gov.br:8443/sandbox/cobranca-bancaria'); // Sandbox
```

---

### 7. **Correção do Token URL para Sandbox**

**Data**: Implementado após erro INVALID_CREDENTIALS  
**Problema**: Token URL estava apontando para produção com credenciais de sandbox  
**Solução**: Reverter para Sandbox por padrão

**Arquivos Alterados**:
- `backend/services/caixa-boleto.service.js`

**URLs Corretas**:
- **Sandbox**: `https://logindes.caixa.gov.br/auth/realms/internet/protocol/openid-connect/token`
- **Produção**: `https://loginservicos.caixa.gov.br/auth/realms/internet/protocol/openid-connect/token`

---

### 8. **Adição do CNPJ do Beneficiário no Payload**

**Data**: Implementado conforme manual técnico MO 38.431  
**Problema**: Manual técnico indica que `cpf` ou `cnpj` são obrigatórios em `dados_cadastrais`  
**Solução**: Buscar CNPJ da empresa beneficiária e incluir no payload

**Arquivos Alterados**:
- `backend/services/caixa-boleto.service.js`
- `backend/utils/caixa-boletos.helper.js`
- `backend/controllers/fechamentos.controller.js`

**CNPJ da Empresa**: `41267440000197` (INVESTMONEY SECURITIZADORA DE CREDITOS S/A)

**Código**:
```javascript
// Buscar CNPJ da empresa beneficiária
const { data: empresaData, error: empresaError } = await supabaseAdmin
  .from('empresas')
  .select('cnpj')
  .eq('id', fechamento.empresa_id)
  .single();

// Adicionar CNPJ ao payload
if (cnpj_beneficiario) {
  const cnpjNumeros = cnpj_beneficiario.replace(/\D/g, '');
  if (cnpjNumeros.length === 14) {
    dadosCadastrais.cnpj = parseInt(cnpjNumeros, 10); // int64 conforme Swagger
  }
}
```

**Payload Final**:
```json
{
  "dados_cadastrais": {
    "cnpj": 41267440000197,
    "numero_documento": "FEC-143-P1",
    "data_vencimento": "2025-11-30",
    "valor": 10.00,
    "tipo_especie": 4,
    "flag_aceite": "N",
    "data_emissao": "2025-10-31",
    "valor_abatimento": 0,
    "pagador": {
      "pessoa_fisica": {
        "cpf": 11888503939,
        "nome": "Bruno Sandoval Ribeiro"
      }
    }
  }
}
```

---

### 9. **Aumento do Delay Entre Criações de Boletos**

**Data**: Implementado para respeitar rate limit  
**Problema**: Múltiplos boletos criados rapidamente causavam 429  
**Solução**: Aumentado delay de 200ms para 500ms entre requisições

**Arquivos Alterados**:
- `backend/utils/caixa-boletos.helper.js`

**Código**:
```javascript
// Delay entre criações para respeitar rate limit (5 req/segundo)
if (i < fechamento.numero_parcelas - 1) {
  await new Promise(resolve => setTimeout(resolve, 500)); // 500ms entre requisições
}
```

---

## 🔑 Configurações Necessárias no `.env`

```env
# API Key (obrigatório)
CAIXA_API_KEY=l777123839e09849f9a0d5a3d972d35e6e

# Credenciais OAuth2 (Sandbox)
CAIXA_CLIENT_ID=cli-ext-41267440000197-1
CAIXA_CLIENT_SECRET=90b11321-8363-477d-bf16-8ccf1963916d

# ID do Beneficiário (pode ser formato completo ou apenas código)
CAIXA_ID_BENEFICIARIO=1242669
# OU
CAIXA_ID_BENEFICIARIO=0374/1242669

# URLs (opcional - já configuradas por padrão para Sandbox)
# CAIXA_TOKEN_URL=https://logindes.caixa.gov.br/auth/realms/internet/protocol/openid-connect/token
# CAIXA_API_BASE_URL=https://api.caixa.gov.br:8443/sandbox/cobranca-bancaria

# Ambiente (opcional - padrão é Sandbox)
# CAIXA_USAR_PRODUCAO=false

# Scope (opcional - não enviar por padrão)
# CAIXA_SCOPE=openid
```

---

## 📊 Estrutura do Payload Enviado

### Campos Obrigatórios (Conforme Manual)

| Campo | Tipo | Descrição | Valor Atual |
|-------|------|-----------|-------------|
| `cnpj` | `int64` | CNPJ do beneficiário | `41267440000197` |
| `numero_documento` | `string` | Número do documento (máx 11 chars) | `FEC-{id}-P{parcela}` |
| `data_vencimento` | `string` | Data de vencimento (YYYY-MM-DD) | Data calculada |
| `valor` | `number` | Valor do boleto (13,2) | Valor da parcela |
| `tipo_especie` | `int64` | Tipo do título | `4` (Duplicata de serviço) |
| `flag_aceite` | `string` | Aceite do boleto | `"N"` (Não aceite) |
| `data_emissao` | `string` | Data de emissão (YYYY-MM-DD) | Data atual |
| `valor_abatimento` | `number` | Valor de abatimento | `0` |
| `pagador.pessoa_fisica.cpf` | `int64` | CPF do pagador | CPF do paciente |
| `pagador.pessoa_fisica.nome` | `string` | Nome do pagador (máx 40 chars) | Nome do paciente |

### Campos Opcionais Enviados

| Campo | Tipo | Descrição | Valor Atual |
|-------|------|-----------|-------------|
| `pagador.endereco` | `object` | Endereço completo do pagador | Enviado se disponível |
| `instrucoes` | `array` | Instruções do boleto | `["Não receber após o vencimento"]` |
| `descricao` | `string` | Descrição do boleto | `"Parcela X de Y - Fechamento Z"` |

---

## 🌐 Endpoints Utilizados

### 1. OAuth2 Token Endpoint

#### Sandbox
```
POST https://logindes.caixa.gov.br/auth/realms/internet/protocol/openid-connect/token
```

#### Produção
```
POST https://loginservicos.caixa.gov.br/auth/realms/internet/protocol/openid-connect/token
```

**Headers**:
```http
Content-Type: application/x-www-form-urlencoded
apikey: l777123839e09849f9a0d5a3d972d35e6e
User-Agent: CrmInvest/1.0
```

**Body (Grant Client Credentials)**:
```
grant_type=client_credentials&client_id=cli-ext-41267440000197-1&client_secret=90b11321-8363-477d-bf16-8ccf1963916d
```

**Observações**:
- Método: `POST`
- Content-Type: `application/x-www-form-urlencoded`
- Parâmetros obrigatórios: `grant_type`, `client_id`, `client_secret`
- Parâmetro `scope` é opcional e só deve ser enviado se explicitamente necessário conforme Swagger da API
- Resposta: JSON contendo `access_token`, `token_type`, `expires_in`, `refresh_token`

### 2. Criar Boleto (POST)
```
POST https://api.caixa.gov.br:8443/sandbox/cobranca-bancaria/v4/beneficiarios/{id_beneficiario}/boletos
```

**Headers**:
```http
Authorization: Bearer {access_token}
Content-Type: application/json
apikey: l777123839e09849f9a0d5a3d972d35e6e
User-Agent: CrmInvest/1.0
```

**Path Parameters**:
- `id_beneficiario`: `1242669` (integer, máximo 7 dígitos)

**Request Body**: Ver seção "Estrutura do Payload Enviado"

### 3. Alterar Boleto (PUT)
```
PUT https://api.caixa.gov.br:8443/sandbox/cobranca-bancaria/v4/beneficiarios/{id_beneficiario}/boletos/{nosso_numero}
```

**Headers**:
```http
Authorization: Bearer {access_token}
Content-Type: application/json
apikey: l777123839e09849f9a0d5a3d972d35e6e
User-Agent: CrmInvest/1.0
```

**Path Parameters**:
- `id_beneficiario`: `1242669` (integer, máximo 7 dígitos)
- `nosso_numero`: `14000000137150303` (int64, 17 dígitos)

**Request Body**: Estrutura similar ao criar boleto, dentro de `dados_cadastrais`:
```json
{
  "dados_cadastrais": {
    "cpf": 99999999999,  // OU cnpj (obrigatório - beneficiário)
    "cnpj": 41267440000197,  // OU cpf (obrigatório - beneficiário)
    "data_vencimento": "2025-11-30",  // Obrigatório
    "valor": 100.00,  // Obrigatório
    // ... outros campos
  }
}
```

**Nota**: A função `atualizarBoleto` já está implementada em `backend/services/caixa-boleto.service.js`

### 4. Consultar Boleto (GET)
```
GET https://api.caixa.gov.br:8443/sandbox/cobranca-bancaria/v4/beneficiarios/{id_beneficiario}/boletos/{nosso_numero}
```

**Headers**:
```http
Authorization: Bearer {access_token}
Content-Type: application/json
apikey: l777123839e09849f9a0d5a3d972d35e6e
User-Agent: CrmInvest/1.0
```

### 5. Baixar Boleto (POST)
```
POST https://api.caixa.gov.br:8443/sandbox/cobranca-bancaria/v2/beneficiarios/{id_beneficiario}/boletos/{nosso_numero}/baixar
```

**Headers**: Mesmos do consultar

---

## 🔍 Rate Limits e Tempo de Vida (Conforme Manual MO 38.431)

### Tempo de Vida dos Tokens

- **Access Token**: 15 minutos de validade (expiração em segundos)
- **Refresh Token**: 30 minutos de validade
- **Tempo máximo de sessão**: 24 horas
- **Importante**: O token deve ser utilizado durante toda sua validade. Após expiração do `access_token`, deve-se usar o `refresh_token`
- **Independência de data**: O tempo de validade é fixo conforme descrito na geração, independente de mudanças de data

### Rate Limits

- **API Caixa**: 5 requisições/segundo
- **SSO CAIXA (Token Endpoint)**: 1 requisição/IP/minuto
- **Bloqueio automático**: Se o limite for ultrapassado, o acesso será bloqueado automaticamente pela ferramenta de segurança

### Regras e Proibições

1. **Reutilização do token**: O `access_token` DEVE ser reutilizado durante sua validade
2. **Proibido processos BATCH**: Uso de processos em lote/burst é proibido (impacta SSO CAIXA e infraestrutura da API)
3. **Proibido listagem sem consentimento**: Uso da API para listar registros de banco de dados sem consentimento do usuário final é proibido

### Recomendações

- Verificar preenchimento do parâmetro `http_user_agent` no header da requisição
- Evitar valores genéricos que possam ser confundidos com bots
- Valores genéricos podem causar bloqueio pela ferramenta anti-bot da CAIXA

### Implementação no Sistema

- **Delay entre requisições**: 500ms entre criações de boletos (máx 2/segundo)
- **Retry automático**: Backoff exponencial para erros 429
  - Token request: 1min, 2min, 3min
  - API requests: 2s, 4s, 6s
- **Cache de token**: Token reutilizado enquanto válido (15 minutos)
- **User-Agent**: `CrmInvest/1.0` (evita bloqueio anti-bot)

---

## 📝 Logs e Debug

O sistema gera logs detalhados para facilitar o debug:

```
🔑 CAIXA_API_KEY carregada: l7771...35e6e
📋 CNPJ do beneficiário adicionado ao payload: 41267440000197
📤 Criando boleto na Caixa: { id_beneficiario, numero_documento, valor, vencimento }
✅ Boleto 1/9 criado: 14000000137150303
⚠️ Rate limit 429 detectado. Aguardando 2s antes de tentar novamente...
```

---

## ✅ Checklist de Validação

- [x] Header `apikey` correto (minúsculas)
- [x] URL Sandbox com `/sandbox/` no path
- [x] Token URL apontando para Sandbox
- [x] ID do beneficiário como integer na URL
- [x] CNPJ do beneficiário no payload (int64)
- [x] CPF do pagador como integer no payload
- [x] Retry automático para erros 429
- [x] Delay entre requisições respeitando rate limit
- [x] Headers User-Agent para evitar bloqueio anti-bot
- [x] Validação de CNPJ antes de adicionar ao payload

---

## 🐛 Problemas Conhecidos e Soluções

### Ações de Contorno para Erros de Integração (Conforme Manual)

| Erro HTTP | Descrição | Ação de Contorno |
|-----------|-----------|------------------|
| **302** | Antibot (bloqueio de IP) | Verificar com equipe de segurança CAIXA qual comportamento gerou bloqueio do IP origem, quanto tempo durará o bloqueio e se é necessário solicitar desbloqueio |
| **400** | Bad request (Web Application Firewall) | Verificar formato do payload, headers e encoding |
| **401** | Token não encontrado | Incluir o token gerado na chamada |
| **401** | Token expirado | Fazer refresh token ou gerar novo token. **IMPORTANTE**: Verificar se horário do APIM CAIXA ou do host está sincronizado (sincronização NTP) |
| **401** | Token inválido | Verificar se Client ID e Secret estão corretos; verificar se Client ID está autorizado nos realms de produção e não-produção; verificar se Client ID está cadastrado no SSO da CAIXA com roles, claims, scopes necessários |
| **401** | unauthorized_client - Public client not allowed | Ocorre para qualquer cliente web que tenta gerar um token de serviço. Usar Client Credentials grant type |
| **401** | unauthorized_client - INVALID_CREDENTIALS | Ocorre para uso de client do tipo public que tenta utilizar um client credential de serviço. Verificar se está usando Client Credentials |
| **403** | Forbidden | Erros relacionado a segurança de borda no SSO. Verificar com equipe de segurança CAIXA qual comportamento gerou bloqueio do IP origem, quanto tempo durará o bloqueio e se é necessário solicitar desbloqueio |
| **429** | Too Many Requests | Sistema já implementa retry automático com backoff exponencial. Aguardar e tentar novamente |

### Problemas Específicos

### Problema: "API Key inválida" (400 - BK076)
**Causa Possível**: 
- API Key não vinculada ao Client ID no ambiente da Caixa
- JSON malformado no payload
- Tipos de dados incorretos

**Solução**: 
- Contactar área negocial da Caixa para verificar vinculação
- Verificar formato JSON do payload
- Confirmar tipos de dados (CPF/CNPJ/CEP como integer)

### Problema: "INVALID_CREDENTIALS" (401)
**Causa Possível**: 
- Credenciais de Sandbox sendo usadas com URL de Produção
- Client ID não autorizado no realm
- Client ID não cadastrado no SSO com roles/claims/scopes necessários

**Solução**: 
- Garantir que `CAIXA_TOKEN_URL` aponte para Sandbox se usar credenciais de Sandbox
- Verificar autorização do Client ID com a Caixa
- Confirmar que Client ID tem permissões necessárias

### Problema: "Token expirado" (401)
**Causa Possível**: 
- Horário do servidor não sincronizado com APIM CAIXA

**Solução**: 
- **Sincronizar horário do servidor usando NTP**
- Fazer refresh token ou gerar novo token

### Problema: "403 Forbidden"
**Causa Possível**: 
- IP bloqueado pela ferramenta anti-bot da Caixa
- Comportamento suspeito detectado

**Solução**: 
- Verificar com equipe de segurança CAIXA
- Confirmar se é necessário solicitar desbloqueio
- Verificar se `User-Agent` está sendo enviado corretamente

### Problema: "429 Too Many Requests"
**Causa Possível**: 
- Excedido limite de 5 requisições/segundo na API
- Excedido limite de 1 requisição/IP/minuto no SSO

**Solução**: 
- Sistema já implementa retry automático com backoff exponencial
- Delay de 500ms entre criações de boletos (respeitando limite)

### Problema: "Beneficiário não encontrado" (404)
**Causa Possível**: 
- ID do beneficiário incorreto ou não cadastrado
- Beneficiário inativo

**Solução**: 
- Verificar `CAIXA_ID_BENEFICIARIO` no `.env`
- Confirmar com Caixa se beneficiário está ativo

---

## 🔐 Autenticação e Segurança OAuth 2.0

### Arquitetura de Segurança

A CAIXA implementa um protocolo de autenticação e autorização baseado em **OpenID Connect (OIDC)**, que por sua vez é construído sobre o framework **OAuth 2.0**.

**Componentes**:
- **OpenID Connect (OIDC)**: Protocolo de autenticação para conectar usuários de forma segura em aplicativos Web
- **OAuth 2.0**: Framework de autorização que permite acesso limitado a recursos
- **JWT (JSON Web Token)**: Formato de token utilizado para transferência de dados de identidade
- **Authorization Server (AS)**: Servidor de autorização que emite tokens de acesso

### Fluxo de Autenticação Básico

1. **Aplicação** verifica que não possui token de acesso válido
2. **Aplicação** solicita token ao **Authorization Server** usando `client_id` e `client_secret`
3. **Authorization Server** autentica e retorna `access_token` (JWT)
4. **Aplicação** usa o `access_token` para acessar recursos protegidos na **API Caixa**

**Nota**: No nosso caso (Client Credentials), não há interação do usuário - é server-to-server.

### Token JWT (JSON Web Token)

O JWT é uma forma compacta e segura de representar claims (afirmações) transferidas entre duas partes.

**Estrutura do JWT**:
- **Header**: Identifica o tipo de token e algoritmo de assinatura (Base64)
- **Payload**: Claims em formato JSON (Base64)
- **Signature**: Assinatura digital para verificação de integridade

**Formato**: `header.payload.signature` (separados por pontos)

**Exemplo**: `eyJhbG[...]V1QifQ.e2lzcz[...]QifQ0K.g5g6HN[...]j2Lsuw`

**Características**:
- Compacto (ideal para HTTP)
- URL-Safe
- Assinado digitalmente (integridade)
- Pode ser criptografado (confidencialidade)

---

## 🔐 Autenticação OAuth 2.0 - Grant Client Credentials

### Informações do Token Endpoint

O Token Endpoint é um serviço REST através do qual a aplicação interage com o Servidor de Autorização para obter ou renovar tokens.

**Método**: `POST`

**Atributos Obrigatórios**:
- `grant_type`: Especifica o grant sendo utilizado (`client_credentials` para nosso caso)
- `client_id`: Identifica a aplicação que está solicitando o token
- `client_secret`: Credencial (senha) da aplicação

**Atributos Opcionais**:
- `scope`: Especifica o escopo da autorização. Identificar no Swagger da API o scope necessário para acesso ao recurso desejado

### Renovação de Token

O Token Endpoint também é utilizado para renovar o token de acesso por meio do refresh token:

**Atributos para Renovação**:
- `grant_type`: `refresh_token`
- `refresh_token`: Token de renovação fornecido anteriormente
- `client_id`: Identifica a aplicação
- `client_secret`: Credencial da aplicação

### Hosts do Servidor de Autorização

**Sandbox (Ambiente de Testes)**:
```
https://logindes.caixa.gov.br/auth/realms/internet/protocol/openid-connect/token
```

**Produção**:
```
https://loginservicos.caixa.gov.br/auth/realms/internet/protocol/openid-connect/token
```

---

## 📚 Referências

- **Manual Técnico**: MO 38.431 v002 - API Gestão de Boletos CAIXA
- **Swagger**: `swagger_caixa_gestao_boletos_producao_052023.json`
- **Email de Credenciais**: Fornecido pela Caixa
- **Seção 4.5**: Acessando o Token Endpoint
- **Seção 4.5.2**: Grant Client Credentials
- **Seção 4.5.3**: Tempo de vida e rate limit
- **Seção 4.6**: Hosts do Servidor de Autorização
- **Seção 5.1**: Incluir Boleto (POST)
- **Seção 5.2**: Alterar Boleto (PUT)

---

## 🔄 Funcionalidades Implementadas vs Disponíveis

### ✅ Implementado

- [x] Criar boletos **NORMAL** (POST) - com código de barras
- [x] Consultar boletos (GET)
- [x] Baixar/cancelar boletos (POST /baixar)
- [x] Atualizar boletos (PUT) - função existe mas não está sendo utilizada
- [x] OAuth 2.0 Client Credentials com JWT
- [x] Integração com API Sandbox

### ⏳ Pendente / Futuro

- [ ] Implementar uso da função `atualizarBoleto` no frontend/controllers quando necessário
- [ ] Adicionar interface para alterar dados de boletos existentes (ex: vencimento, valor)
- [ ] Implementar renovação automática de token usando `refresh_token`
- [ ] **Boletos HÍBRIDOS** (com QR Code PIX) - quando necessário
  - Requer `TIPO_BOLETO: "HIBRIDO"` no payload
  - Gera QR Code para pagamento PIX instantâneo
  - Retorna `url_qrcode` e `qr_code` (copia-e-cola) na resposta
  - Não permite data vencida
  - Requer confirmação no SPI (Sistema de Pagamentos Instantâneos)

---

## 📋 Tipos de Boletos Suportados pela API

### 1. Boleto NORMAL (Atual Implementação)
- **Uso**: Cobrança de dívidas convencionais
- **Forma de Pagamento**: Código de barras (sistema bancário tradicional)
- **Tipo Especie**: Suporta vários tipos (ex: 4 = Duplicata de serviço)
- **Status**: ✅ Implementado e funcionando

### 2. Boleto HÍBRIDO (Disponível para Implementação Futura)
- **Uso**: Cobrança que permite pagamento via código de barras OU PIX
- **Forma de Pagamento**: 
  - Código de barras (sistema bancário tradicional)
  - QR Code PIX (pagamento instantâneo)
- **Vantagem**: Quando pago por um meio, o outro é automaticamente baixado
- **Requisitos**:
  - `TIPO_BOLETO: "HIBRIDO"` no payload
  - Não permite `DATA_VENCIMENTO` vencida ou anterior ao dia atual
  - Não aceita certas espécies (ex: Cartão de Crédito, Depósito/Aporte)
  - Requer registro no SPI (Sistema de Pagamentos Instantâneos do Banco Central)
- **Resposta da API**:
  - `url`: URL do boleto híbrido padrão CAIXA
  - `url_qrcode`: URL da imagem do QR Code
  - `qr_code`: String PIX copia-e-cola
  - `codigo_barras`: Código de barras tradicional
  - `linha_digitavel`: Linha digitável

### 3. Boleto de Depósito/Aporte (NE041)
- **Uso**: Depósitos em carteiras digitais ou contas bancárias digitais
- **Premissa**: Pagador e beneficiário final são a **mesma pessoa**
- **Requisitos**:
  - `tipo_especie` **DEVE** ser `33`
  - Campo `beneficiario_final` **obrigatório**
  - CPF/CNPJ e Nome do beneficiário final **DEVEM SER IGUAIS** aos dados do pagador
  - Requer autorização prévia da Caixa e parametrização do convênio
- **Restrições**:
  - Não permite instrução para protesto
  - Não permite desconto e abatimento
  - Não permite juros e multa
  - Permite apenas 1 possibilidade de pagamento

### 4. Boleto de Terceiro Habilitado (NE042)
- **Uso**: Marketplaces, e-commerce, plataformas de serviço
- **Premissa**: Pagador e beneficiário final são **pessoas diferentes**
- **Requisitos**:
  - Campo `beneficiario_final` **obrigatório**
  - CPF/CNPJ e Nome do beneficiário final **DEVEM SER DIFERENTES** dos dados do pagador
  - Pode ser usado para qualquer espécie de boleto (exceto espécie `33`)
- **Restrições**:
  - Não permite instrução para protesto
  - Não permite desconto e abatimento
  - Não permite juros e multa
  - Permite apenas 1 possibilidade de pagamento

---

## ⚠️ Informações Importantes sobre Boletos Híbridos

### Condição para Geração do QR Code
**"A geração do boleto com QRCODE só ocorre com a confirmação de que houve registro da informação na base central do PIX."**

Isso significa que:
- A Caixa registra as informações no SPI (Banco Central)
- Se houver erro na comunicação com o SPI, o QR Code não é gerado
- Deve-se ter fallback para boleto normal se necessário

### Tratamento de Erro 71 (PIX Indisponível)
Se retornar erro `71 - ERRO OBTER SISPI`, recomendações:
1. Implementar rotina interna para gerar boleto convencional (sem QR Code)
2. Informar ao cliente que o boleto híbrido não pôde ser emitido devido à indisponibilidade temporária de comunicação com PIX

### Retorno CNAB (Obrigatório)
Mesmo usando API, a CAIXA exige manter o fluxo CNAB 240 ou 400:
- **Retorno diário consolidado**: Informações de liquidação/baixa ao final do movimento diário
- **Retorno online**: Informações a cada 15 minutos (baixas e liquidações)

**Notas Explicativas CNAB:**
- CNAB 240: NE047-A (Confirmação/Rejeição), NE047-C (Liquidação)
- CNAB 400: NE032 (Rejeição), NE033 (Confirmação), NE035 (Liquidação/Baixa)

---

## 🔄 Próximos Passos

1. ✅ Testar criação de boletos com CNPJ no payload
2. ✅ Verificar se a API aceita o payload completo
3. ⏳ Aguardar confirmação da Caixa sobre vinculação API Key / Client ID
4. ⏳ Testar em ambiente de produção após homologação
5. ⏳ Implementar interface para alterar boletos (PUT) se necessário
6. ⏳ Implementar renovação automática de token

---

## 📞 Contatos e Suporte

- **Área Negocial Caixa**: [Informações de contato]
- **API Key**: `l777123839e09849f9a0d5a3d972d35e6e`
- **Client ID**: `cli-ext-41267440000197-1`
- **CNPJ Beneficiário**: `41267440000197`

---

---

## 📝 Exemplos Práticos do Manual

### Exemplo de Requisição Completa (Manual Página 38)

**Inclui/Altera boleto - Request:**
```json
{
  "dados_cadastrais": {
    "cnpj": 360305000104,
    "numero_documento": "12345678901",
    "data_vencimento": "2022-11-27",
    "valor": 200.00,
    "tipo_especie": 02,
    "flag_aceite": "S",
    "data_emissao": "2022-10-13",
    "juros_mora": {
      "tipo": "ISENTO",
      "valor": 0.00
    },
    "valor_abatimento": 0.00,
    "pos_vencimento": {
      "acao": "DEVOLVER",
      "numero_dias": 0
    },
    "codigo_moeda": 9,
    "pagador": {
      "pessoa_fisica": {
        "cpf": 191,
        "nome": "PAGADOR EXEMPLO"
      },
      "endereco": {
        "logradouro": "SAUS QD 3 MATRIZ I CEF",
        "bairro": "BRASILIA",
        "cidade": "BRASILIA",
        "uf": "DF",
        "cep": 12345678
      }
    },
    "descontos": {
      "desconto": [
        {
          "data": "2022-11-20",
          "valor": 44.65
        },
        {
          "data": "2022-11-08",
          "valor": 1.65
        }
      ]
    },
    "ficha_compensacao": {
      "mensagens": {
        "mensagem": [
          "NAO RECEBER APOS VENCIMENTO"
        ]
      }
    },
    "tipo_boleto": "HIBRIDO",
    "carteira": "COBRANCA_SIMPLES"
  }
}
```

### Exemplo de Resposta de Sucesso (Manual Página 39)

**Inclui/Altera boleto - Response (200):**
```json
{
  "dados_complementares": {
    "codigo_barras": "10499918200000001001100000000100041371503030",
    "linha_digitavel": "10491100080000010004013715030303991820000000100",
    "url": "https://boletoonline.caixa.gov.br/ecobranca/SIGCB/imprimir/1100000/14000000137150303",
    "nosso_numero": 14000000137150303
  }
}
```

### Exemplo de Erro (Manual Página 40)

**Erro 400 - Sintaxe Inválida (BK076):**
```json
{
  "integracao": {
    "codigo": "BK076",
    "mensagem": "(BK76) ERRO NA FORMATACAO DA MENSAGEM.",
    "excecao": {
      "RecoverableException": {
        "Text": "JSON parsing errors have occurred",
        "ParserException": {
          "Text": "A JSON parsing error has occurred whilst parsing the JSON document",
          "Insert": [
            {"Type": 2, "Text": "44"},
            {"Type": 2, "Text": "1"}
          ]
        }
      }
    }
  }
}
```

**Significado**: Este erro indica problema na formatação JSON do payload, geralmente na posição de caractere 44, linha 1.

---

## 🚨 Códigos de Erro (NE039 - Manual Páginas 49-51)

### Erros de Integração

| Código | Descrição |
|--------|-----------|
| **BK01** | Transação temporariamente indisponível |
| **BK56** | Operação não prevista |
| **BK76** | **ERRO NA FORMATACAO DA MENSAGEM** (JSON malformado) |
| **BK78** | Tempo excedido na requisição do serviço |
| **BK79** | Erro na formatação da mensagem de resposta do sistema de negócio |
| **CI01-CI199** | Transação temporariamente indisponível |
| **RA01** | Usuário não cadastrado/autorizado ou revogado |
| **RA03** | Usuário não autorizado a executar a transação |

### Erros de Negócio (Mais Comuns)

| Código | Descrição |
|--------|-----------|
| **0001** | Código do beneficiário inválido |
| **0002** | Nosso número inválido |
| **0003** | Número do documento inválido |
| **0004** | Data de vencimento inválida |
| **0005** | Valor do título inválido |
| **0017** | Tipo pessoa pagador inválido |
| **0018** | CPF do pagador inválido |
| **0022** | Nome/Razão do pagador não informado |
| **0025** | CEP pagador não informado |
| **0026** | Cidade do pagador não informada |
| **0035** | Beneficiário informado não cadastrado |
| **0036** | Beneficiário inativo |
| **0044** | Código do desconto inválido |
| **0048** | Alteração não permitida - apenas títulos "EM ABERTO" podem ser alterados |
| **0054** | Operação não permitida - hash divergente |
| **0071** | **Erro obtido do SISPI** (PIX indisponível - usar fallback para boleto normal) |
| **0090** | CPF/CNPJ do pagador deve ser diferente do CPF/CNPJ do beneficiário |
| **0098** | Valor do título maior que o permitido |
| **0112** | CPF-CNPJ/Nome beneficiário final devem ser os mesmos dos dados do pagador |

### Observações Importantes sobre Erros

1. **BK076**: Indica problema no formato JSON do payload. Verificar:
   - Tipos de dados (CPF/CNPJ/CEP como integer)
   - Caracteres especiais não permitidos
   - Estrutura JSON válida
   - Encoding UTF-8

2. **0071**: Erro do SISPI (PIX) - Quando gerar boleto HÍBRIDO e PIX estiver indisponível:
   - Implementar fallback para boleto NORMAL
   - Ou informar cliente sobre indisponibilidade temporária

3. **0001, 0035, 0036**: Problemas com beneficiário:
   - Verificar se `id_beneficiario` está correto
   - Confirmar se beneficiário está ativo na Caixa
   - Verificar se CNPJ do beneficiário está correto

---

## 📋 Campos Opcionais Disponíveis

### Campos que Podemos Adicionar no Futuro

**1. Juros de Mora:**
```json
"juros_mora": {
  "tipo": "ISENTO" | "VALOR_POR_DIA" | "TAXA_MENSAL",
  "data": "2022-11-27",  // Obrigatório se tipo != "ISENTO"
  "valor": 0.00,         // Para VALOR_POR_DIA
  "percentual": 0.00     // Para TAXA_MENSAL
}
```

**2. Multa:**
```json
"multa": {
  "data": "2022-11-27",
  "valor": 10.00,
  "percentual": 2.00
}
```

**3. Descontos (até 3 faixas):**
```json
"descontos": {
  "desconto": [
    {
      "data": "2022-11-20",
      "valor": 44.65,
      "tipo": "VALOR_FIXO_ATE_DATA"
    },
    {
      "data": "2022-11-08",
      "valor": 1.65,
      "tipo": "VALOR_FIXO_ATE_DATA"
    }
  ]
}
```

**Tipos de Desconto:**
- `ISENTO`: Sem desconto
- `VALOR_FIXO_ATE_DATA`: Valor fixo até uma data
- `PERCENTUAL_ATE_DATA`: Percentual fixo até uma data
- `VALOR_ANTECIPACAO_DIA_CORRIDO`: Valor por dia corrido antecipado
- `VALOR_ANTECIPACAO_DIA_UTIL`: Valor por dia útil antecipado
- `PERCENTUAL_ANTECIPACAO_DIA_CORRIDO`: Percentual por dia corrido antecipado

**4. Pós-Vencimento:**
```json
"pos_vencimento": {
  "acao": "PROTESTAR" | "DEVOLVER",
  "numero_dias": 30,
  "codigo_moeda": 9
}
```

**5. Mensagens:**
```json
"ficha_compensacao": {
  "mensagens": {
    "mensagem": [
      "NAO RECEBER APOS VENCIMENTO",
      "Mensagem 2"
    ]
  }
},
"recibo_pagador": {
  "mensagens": {
    "mensagem": [
      "Mensagem para o pagador"
    ]
  }
}
```

**6. Pagamento Parcial:**
```json
"pagamento": {
  "quantidade_permitida": 1,
  "tipo": "ACEITA_QUALQUER_VALOR" | "ACEITA_VALORES_ENTRE_MINIMO_MAXIMO" | "NAO_ACEITA_VALOR_DIVERGENTE",
  "flag_pagamento_parcial": "S" | "N",
  "valor": {
    "minimo": 100.00,
    "maximo": 200.00
  },
  "percentual": {
    "minimo": 50.00,
    "maximo": 100.00
  }
}
```

---

## ✅ Comparação: Payload Atual vs Exemplo do Manual

### ✅ Campos que Estamos Enviando Corretamente:
- ✅ `cnpj` (beneficiário) como integer
- ✅ `numero_documento` como string
- ✅ `data_vencimento` no formato YYYY-MM-DD
- ✅ `valor` como number
- ✅ `tipo_especie` como integer (4 = Duplicata de serviço)
- ✅ `flag_aceite` como string ("N")
- ✅ `data_emissao` no formato YYYY-MM-DD
- ✅ `valor_abatimento` como number (0)
- ✅ `pagador.pessoa_fisica.cpf` como integer
- ✅ `pagador.pessoa_fisica.nome` como string

### ⏳ Campos Opcionais que Podemos Adicionar (Futuro):
- ⏳ `juros_mora` (atualmente não enviamos)
- ⏳ `pos_vencimento` (atualmente não enviamos)
- ⏳ `codigo_moeda` (padrão: 9 = REAL)
- ⏳ `descontos` (atualmente não enviamos)
- ⏳ `ficha_compensacao` (mensagens - enviamos como `instrucoes`)
- ⏳ `recibo_pagador` (atualmente não enviamos)
- ⏳ `pagamento` (atualmente não enviamos)
- ⏳ `tipo_boleto` (atualmente não enviamos - padrão seria "NORMAL")
- ⏳ `carteira` (atualmente não enviamos - padrão seria "COBRANCA_SIMPLES")

**Nota**: Para boletos NORMAL, não é obrigatório enviar esses campos opcionais. O payload atual está funcional e correto conforme o manual.

---

## 📊 Status de Boletos (NE040)

Quando consultar um boleto, a API retorna o status na resposta. Possíveis valores:

| Status | Descrição |
|--------|-----------|
| **EM ABERTO** | Boleto ainda não foi pago |
| **LIQUIDADO** | Boleto foi pago |
| **BAIXA POR DEVOLUCAO** | Boleto foi baixado por devolução |
| **BAIXA POR ESTORNO** | Boleto foi baixado por estorno |
| **BAIXA POR PROTESTO** | Boleto foi baixado por protesto |
| **ENVIADO AO CARTORIO** | Boleto foi enviado ao cartório |
| **LIQUIDADO NO CARTORIO** | Boleto foi liquidado no cartório |
| **SOMENTE PARA PROTESTO** | Boleto marcado apenas para protesto |
| **SUSTADO CARTORIO** | Protesto foi sustado no cartório |
| **TITULO JA PAGO NO DIA** | Título já foi pago no dia |

---

## 🎯 Tipo de Boleto e Carteira (NE043 e NE044)

### Carteira (NE043)

Tipo de carteira onde o boleto será registrado:

| Carteira | Descrição | Status |
|----------|-----------|--------|
| **COBRANCA_SIMPLES** | Carteira simples (padrão) | ✅ Padrão se não informado |
| **COBRANCA_CAUCIONADA** | Carteira caucionada | Disponível |
| **COBRANCA_CESSAO** | Carteira de cessão | Requer parametrização especial na Caixa |
| **COBRANCA_DESCONTADA** | Carteira descontada | Disponível |

**Nota**: Atualmente não enviamos `carteira` no payload. O padrão `COBRANCA_SIMPLES` é aplicado automaticamente.

### Tipo de Boleto (NE044)

| Tipo | Descrição | Requisitos |
|------|-----------|------------|
| **NORMAL** | Apenas código de barras | Padrão se não informado |
| **HIBRIDO** | Código de barras + QR Code PIX | Não permite data vencida |

**Regras para Boleto HÍBRIDO:**
- ❌ Não permite `DATA_VENCIMENTO` vencida ou anterior à data de emissão
- ❌ Não permite espécie `31 - Cartão de Crédito`
- ❌ Não permite espécie `32 - Boleto de Depósito e Aporte`
- ❌ Não permite espécie `33` quando `tipo_pagamento = ACEITA_QUALQUER_VALOR`
- ⚠️ Requer confirmação no SPI (Sistema de Pagamentos Instantâneos)
- ⚠️ Se PIX indisponível (erro 0071), deve ter fallback para NORMAL

**Comportamento de Liquidação:**
- Se pago via código de barras → QR Code PIX é automaticamente cancelado
- Se pago via QR Code PIX → código de barras é automaticamente baixado

**Atualmente**: Não enviamos `tipo_boleto` no payload. O padrão `NORMAL` é aplicado automaticamente.

---

---

## ⚙️ Configurações e Padrões

### Valores Padrão Aplicados Automaticamente

Quando não informados no payload, a Caixa aplica os seguintes valores padrão:

| Campo | Valor Padrão |
|-------|--------------|
| `tipo_boleto` | `"NORMAL"` |
| `carteira` | `"COBRANCA_SIMPLES"` |
| `codigo_moeda` | `9` (REAL - BRL) |
| `flag_aceite` | `"N"` (Não aceite) - mas enviamos explicitamente |
| `tipo_especie` | N/A - sempre informamos (`4` = Duplicata de serviço) |
| `pagamento.tipo` | `"NAO_ACEITA_VALOR_DIVERGENTE"` (se campo `pagamento` não for enviado) |

**Nota**: Mesmo sendo padrão, é recomendado enviar explicitamente `carteira: "COBRANCA_SIMPLES"` e `tipo_boleto: "NORMAL"` para maior clareza.

---

---

## 🎨 Visualização e Layout do Boleto

### Implementação Completa do Layout Padrão Caixa/FEBRABAN

**Status**: ✅ Implementado e funcionando

#### Recursos Implementados:

1. **Duas Vias do Boleto**:
   - ✅ **Recibo do Pagador**: Parte superior que fica com o pagador
   - ✅ **Ficha de Compensação**: Parte inferior que vai para o banco
   - ✅ Linha de corte visual entre as duas vias

2. **Header Personalizado**:
   - ✅ Gradiente azul/verde com logo "cobrança CAIXA"
   - ✅ Código do banco "104-0"
   - ✅ Linha digitável formatada no header
   - ✅ Logo da InvestMoney (brasão) integrado

3. **Código de Barras Visual**:
   - ✅ Geração de código de barras ITF (Interleaved 2 of 5) usando CSS
   - ✅ Barras verticais pretas e brancas com larguras variáveis
   - ✅ Código numérico abaixo das barras
   - ✅ Altura de 50px para boa legibilidade

4. **Campos Padronizados**:
   - ✅ Todos os campos obrigatórios do boleto bancário
   - ✅ Formatação correta de valores, datas e CPF/CNPJ
   - ✅ Instruções de juros e multa configuradas
   - ✅ Dados do beneficiário, pagador e beneficiário final

5. **Otimizações de Impressão**:
   - ✅ CSS otimizado para impressão
   - ✅ Quebras de página apropriadas
   - ✅ Tamanhos e fontes padrão FEBRABAN

**Arquivos**: 
- `backend/controllers/fechamentos.controller.js` - Função `visualizarBoleto`
- `backend/routes/static.routes.js` - Servir imagens estáticas
- `frontend/src/components/Fechamentos.js` - Integração frontend
- `frontend/src/components/MeusBoletosPaciente.js` - Integração frontend paciente

**Endpoint**: `GET /api/fechamentos/:id/boletos/:boletoId/visualizar`

---

## 💰 Configuração de Juros e Multa

### Valores Padrão Configurados

**Status**: ✅ Implementado e funcionando

#### Configuração Atual:

1. **Juros de Mora**:
   - **Tipo**: `TAXA_MENSAL`
   - **Percentual**: `8.00%` ao mês
   - **Data de Início**: Data de vencimento + 1 dia
   - **Formato**: Dias corridos

2. **Multa**:
   - **Percentual**: `10.00%`
   - **Data de Início**: Data de vencimento
   - **Tipo**: Percentual fixo

3. **Prazo de Devolução**:
   - **Ação**: `DEVOLVER`
   - **Número de Dias**: `10` dias após vencimento

4. **Código da Moeda**:
   - **Valor**: `9` (Real brasileiro - BRL)
   - **Obrigatório**: Sim, conforme manual técnico

**Payload Implementado**:
```json
{
  "juros_mora": {
    "tipo": "TAXA_MENSAL",
    "data": "2025-11-21",  // Data de vencimento + 1 dia
    "percentual": 8.00
  },
  "multa": {
    "data": "2025-11-20",  // Data de vencimento
    "percentual": 10.00
  },
  "pos_vencimento": {
    "acao": "DEVOLVER",
    "numero_dias": 10
  },
  "codigo_moeda": 9
}
```

**Arquivos**: 
- `backend/services/caixa-boleto.service.js` - Função `criarBoleto`

**Observação**: A data de juros deve ser maior que a data de vencimento. O sistema adiciona automaticamente 1 dia ao vencimento para a data dos juros.

---

## 🔧 Funcionalidades de Geração de Boletos

### Geração Manual de Boletos

**Status**: ✅ Implementado e funcionando

#### Endpoint de Geração Manual:

```
POST /api/fechamentos/:id/gerar-boletos
```

**Funcionalidades**:
- ✅ Geração manual de boletos para fechamentos aprovados
- ✅ Validação de permissões (admin, consultor, clínica)
- ✅ Verificação se fechamento está aprovado
- ✅ Verificação se boletos já foram gerados
- ✅ Suporte a parcelamento múltiplo
- ✅ Tratamento de erros e duplicatas

**Frontend**:
- ✅ Botão "Gerar Boletos" na aba de boletos do fechamento
- ✅ Indicador de carregamento durante geração
- ✅ Mensagens de sucesso/erro
- ✅ Atualização automática da lista após geração

**Arquivos**:
- `backend/controllers/fechamentos.controller.js` - Função `gerarBoletosFechamento`
- `backend/routes/fechamentos.routes.js` - Rota registrada
- `frontend/src/components/Fechamentos.js` - Interface de geração

---

## 🔐 Autenticação e Visualização Frontend

### Problema Resolvido: Redirecionamento ao Visualizar Boleto

**Status**: ✅ Corrigido

**Problema Identificado**:
- `window.open()` não enviava header `Authorization`
- Backend retornava 401 (não autorizado)
- Frontend redirecionava para página inicial

**Solução Implementada**:
1. Frontend faz requisição autenticada com `makeRequest`
2. Obtém HTML da resposta
3. Abre nova janela e escreve o HTML diretamente

**Código**:
```javascript
const response = await makeRequest(`/fechamentos/${fechamentoId}/boletos/${boletoId}/visualizar`);
const html = await response.text();
const newWindow = window.open('', '_blank');
if (newWindow) {
  newWindow.document.write(html);
  newWindow.document.close();
}
```

**Arquivos**:
- `frontend/src/components/Fechamentos.js`
- `frontend/src/components/MeusBoletosPaciente.js`

---

## ✅ Validação de Dados e Proteção contra Duplicatas

### Validação de CNPJ do Beneficiário

**Status**: ✅ Implementado

**Funcionalidade**:
- ✅ Busca CNPJ da empresa beneficiária no banco de dados
- ✅ Valida se CNPJ está correto (`41267440000197`)
- ✅ Fallback automático para CNPJ correto se o do banco estiver incorreto
- ✅ Logs de aviso quando CNPJ incorreto é detectado

**Arquivos**:
- `backend/controllers/fechamentos.controller.js` - Em todas as funções que geram boletos

### Proteção contra Duplicatas

**Status**: ✅ Implementado

**Funcionalidade**:
- ✅ Verifica se boleto já existe antes de inserir (por `nosso_numero` ou `numero_documento`)
- ✅ Se já existir, busca o boleto existente e continua
- ✅ Tratamento de erros de duplicata sem interromper o processo
- ✅ Logs informativos quando duplicata é detectada

**Arquivos**:
- `backend/utils/caixa-boletos.helper.js` - Função `criarBoletosCaixa`

---

## 📋 Scripts SQL de Gerenciamento

### Scripts Disponíveis

1. **`script_limpar_boletos_teste.sql`**:
   - Visualizar boletos antes de deletar
   - Remover por fechamento
   - Remover por erro
   - Remover por data
   - Estatísticas após remoção

2. **`script_atualizar_urls_boletos.sql`**:
   - Atualizar URLs com IPs internos para URL pública
   - Verificar URLs antes de atualizar
   - Estatísticas de URLs

3. **`script_remover_boletos_teste.sql`**:
   - Remover boletos de teste
   - Múltiplas opções de remoção
   - Verificações de segurança

---

## 🔍 Validação de Boletos

### Ferramentas de Validação Online

1. **Serasa**:
   - Site: https://www.serasa.com.br
   - Validar autenticidade do boleto
   - Requer login

2. **Toolspace**:
   - Site: https://www.toolspace.com.br/tools/boleto-validator
   - Validar linha digitável
   - Verificar dígitos verificadores
   - Gerar código de barras
   - Identificar vencimento e valor

3. **Caixa Econômica Federal**:
   - Site: https://boletoonline.caixa.gov.br
   - Validação oficial pela Caixa
   - Inserir linha digitável ou código de barras

---

## 📊 Resumo do Progresso

### ✅ Funcionalidades Completas

- [x] Integração com API Caixa (Sandbox)
- [x] Autenticação OAuth 2.0 com JWT
- [x] Criação de boletos NORMAL
- [x] Configuração de juros (8%) e multa (10%)
- [x] Prazo de devolução (10 dias)
- [x] Código da moeda (9 - Real)
- [x] Validação de CNPJ do beneficiário
- [x] Geração manual de boletos
- [x] Visualização HTML do boleto
- [x] Layout padrão Caixa/FEBRABAN
- [x] Código de barras visual funcional
- [x] Logo da InvestMoney integrado
- [x] Proteção contra duplicatas
- [x] Tratamento de rate limits
- [x] Retry automático com backoff exponencial

### ⏳ Próximos Passos

- [ ] Implementar renovação automática de token usando `refresh_token`
- [ ] Implementar boletos HÍBRIDOS (com QR Code PIX)
- [ ] Criar endpoint de validação de boletos no backend
- [ ] Implementar sincronização automática de status de boletos
- [ ] Criar relatórios de boletos gerados
- [ ] Otimizar performance de geração em lote

---

**Última Atualização**: Dezembro 2024  
**Versão do Documento**: 3.0 - Integração completa com visualização, layout padrão Caixa, e todas as configurações implementadas

