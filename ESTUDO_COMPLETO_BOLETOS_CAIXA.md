# 📋 ESTUDO COMPLETO: Geração de Boletos Caixa

## 🎯 Visão Geral

Este documento explica **de ponta a ponta** como os boletos da Caixa são gerados no sistema, incluindo:
- Fluxo completo de criação
- Design e layout do boleto
- Integração com API da Caixa
- Estrutura de dados
- Visualização e renderização

---

## 🔄 FLUXO COMPLETO DE GERAÇÃO

### 1. **Ponto de Entrada: Criação de Fechamento**

**Arquivo**: `backend/controllers/fechamentos.controller.js`
**Função**: `createFechamento`

Quando um fechamento é criado:
1. O fechamento é salvo no banco de dados
2. Se houver parcelamento (`numero_parcelas > 0`), o sistema chama `criarBoletosCaixa()`
3. A função cria um boleto para cada parcela

**Código relevante**:
```javascript
// Linha ~589
const boletosCriados = await criarBoletosCaixa(
  data[0],              // Fechamento criado
  pacienteCompleto,     // Dados do paciente
  idBeneficiario,      // ID do beneficiário (ex: "1242669")
  cnpjParaUsar         // CNPJ da empresa beneficiária
);
```

---

### 2. **Helper: Preparação e Criação dos Boletos**

**Arquivo**: `backend/utils/caixa-boletos.helper.js`
**Função**: `criarBoletosCaixa`

#### 2.1. Validações Iniciais
- Verifica se paciente tem CPF e nome
- Verifica se `CAIXA_ID_BENEFICIARIO` está configurado
- Normaliza ID do beneficiário (remove agência se presente: `"0374/1242669"` → `"1242669"`)

#### 2.2. Preparação dos Dados do Pagador
```javascript
const dadosPagador = {
  pagador_cpf: paciente.cpf.replace(/\D/g, ''),  // Apenas números
  pagador_nome: paciente.nome,
  pagador_cidade: paciente.cidade || '',
  pagador_uf: paciente.estado || '',
  pagador_cep: paciente.cep.replace(/\D/g, ''),
  pagador_logradouro: paciente.endereco || '',
  pagador_numero: paciente.numero || '',
  pagador_bairro: paciente.bairro || ''
};
```

#### 2.3. Loop de Criação (Para Cada Parcela)
Para cada parcela (`i` de `0` até `numero_parcelas - 1`):

1. **Calcula data de vencimento**:
   ```javascript
   const dataVencimento = new Date(dataVencimentoBase);
   dataVencimento.setMonth(dataVencimento.getMonth() + i);
   ```

2. **Gera número do documento**:
   ```javascript
   const numeroDocumento = `FEC-${fechamento.id}-P${i + 1}`;
   // Exemplo: "FEC-164-P1", "FEC-164-P2", etc.
   ```

3. **Chama API da Caixa**:
   ```javascript
   const resultadoBoleto = await caixaBoletoService.criarBoleto({
     id_beneficiario: idBeneficiarioNormalizado,
     numero_documento: numeroDocumento,
     data_vencimento: dataVencimento.toISOString().split('T')[0],
     valor: parseFloat(fechamento.valor_parcela),
     descricao: `Parcela ${i + 1} de ${fechamento.numero_parcelas} - Fechamento ${fechamento.id}`,
     instrucoes: ['Não receber após o vencimento'],
     cnpj_beneficiario: cnpjBeneficiario,
     ...dadosPagador
   });
   ```

4. **Normaliza URL do boleto**:
   - Substitui IP interno (`10.116.82.66`) por URL pública (`boletoonline.caixa.gov.br`)

5. **Salva no banco** (`boletos_caixa`):
   ```javascript
   {
     paciente_id: paciente.id,
     fechamento_id: fechamento.id,
     id_beneficiario: idBeneficiarioNormalizado,
     nosso_numero: resultadoBoleto.nosso_numero,
     numero_documento: numeroDocumento,
     codigo_barras: resultadoBoleto.codigo_barras,
     linha_digitavel: resultadoBoleto.linha_digitavel,
     url: urlBoletoPublica,
     qrcode: resultadoBoleto.qrcode,
     url_qrcode: resultadoBoleto.url_qrcode,
     valor: parseFloat(fechamento.valor_parcela),
     data_vencimento: dataVencimento.toISOString().split('T')[0],
     data_emissao: new Date().toISOString().split('T')[0],
     situacao: 'EM ABERTO',
     status: 'pendente',
     empresa_id: fechamento.empresa_id,
     parcela_numero: i + 1
   }
   ```

6. **Delay entre requisições**: 800ms para respeitar rate limit da API

---

### 3. **Serviço: Integração com API Caixa**

**Arquivo**: `backend/services/caixa-boleto.service.js`
**Classe**: `CaixaBoletoService`

#### 3.1. Autenticação OAuth2

**Método**: `getAccessToken()`

1. **Verifica token em cache**: Se válido e não expirado, reutiliza
2. **Rate limiting**: Máximo 1 requisição por minuto (limite da Caixa)
3. **Requisição de token**:
   ```javascript
   POST https://logindes.caixa.gov.br/auth/realms/internet/protocol/openid-connect/token
   Headers:
     - Content-Type: application/x-www-form-urlencoded
     - apikey: [CAIXA_API_KEY]  // 38 caracteres, começa com "l"
   Body:
     - grant_type: client_credentials
     - client_id: cli-ext-41267440000197-1
     - client_secret: 90b11321-8363-477d-bf16-8ccf1963916d
   ```

4. **Resposta**:
   ```json
   {
     "access_token": "eyJhbGciOiJSUzI1NiIs...",
     "expires_in": 3600,
     "token_type": "Bearer"
   }
   ```

#### 3.2. Criação do Boleto

**Método**: `criarBoleto(dadosBoleto)`

**Endpoint**: `POST /v4/beneficiarios/{id_beneficiario}/boletos`

**Headers**:
```javascript
{
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json',
  'apikey': CAIXA_API_KEY,
  'User-Agent': 'CrmInvest/1.0'
}
```

**Payload enviado**:
```json
{
  "dados_cadastrais": {
    "numero_documento": "FEC-164-P1",
    "data_vencimento": "2024-12-10",
    "valor": 1500.00,
    "tipo_especie": 4,  // 4 = Duplicata de serviço
    "flag_aceite": "N",  // Não aceite
    "data_emissao": "2024-11-10",
    "valor_abatimento": 0,
    "codigo_moeda": 9,  // 9 = Real brasileiro (BRL)
    "cnpj": 12345678000190,  // CNPJ do beneficiário (obrigatório)
    "juros_mora": {
      "tipo": "TAXA_MENSAL",
      "data": "2024-12-11",  // 1 dia após vencimento
      "percentual": 8.00  // 8% ao mês
    },
    "multa": {
      "data": "2024-12-10",  // Data de vencimento
      "percentual": 10.00  // 10% de multa
    },
    "pos_vencimento": {
      "acao": "DEVOLVER",
      "numero_dias": 10  // Devolver após 10 dias
    },
    "pagador": {
      "pessoa_fisica": {
        "cpf": 12345678901,  // Integer, sem formatação
        "nome": "JOSE DA SILVA"  // Máximo 40 caracteres
      },
      "endereco": {
        "logradouro": "RUA EXEMPLO, 123",
        "bairro": "CENTRO",
        "cidade": "RECIFE",
        "uf": "PE",
        "cep": 50790000  // Integer, sem formatação
      }
    },
    "instrucoes": [
      "Não receber após o vencimento"
    ],
    "descricao": "Parcela 1 de 10 - Fechamento 164"
  }
}
```

**Resposta da API**:
```json
{
  "dados_complementares": {
    "nosso_numero": "14100000000111728",
    "codigo_barras": "10491234567890123456789012345678901234567890",
    "linha_digitavel": "10491.23456 78901.234567 89012.345678 9 01234567890",
    "url": "https://boletoonline.caixa.gov.br/...",
    "qrcode": "...",
    "url_qrcode": "..."
  }
}
```

**Retorno do método**:
```javascript
{
  nosso_numero: "14100000000111728",
  codigo_barras: "10491234567890123456789012345678901234567890",
  linha_digitavel: "10491.23456 78901.234567 89012.345678 9 01234567890",
  url: "https://boletoonline.caixa.gov.br/...",
  qrcode: "...",
  url_qrcode: "...",
  numero_documento: "FEC-164-P1"
}
```

---

## 🎨 DESIGN E LAYOUT DO BOLETO

### Estrutura Visual

O boleto é renderizado em **HTML/CSS** seguindo o padrão **FEBRABAN/Caixa**.

**Arquivo**: `backend/controllers/fechamentos.controller.js`
**Função**: `visualizarBoleto`
**Endpoint**: `GET /api/fechamentos/:id/boletos/:boletoId/visualizar`

### Componentes do Boleto

#### 1. **Header com Gradiente Caixa**

```css
background: linear-gradient(90deg, #00b5a6 0%, #0066cc 100%);
```

**Elementos**:
- Logo: "cobrança **CAIXA**" (com "X" em gradiente dourado)
- Código do banco: **104-0** (em destaque, com bordas brancas)
- Linha digitável: Formatada no header (fonte monospace, espaçamento aumentado)

**Código**:
```html
<div class="header-banco">
  <div class="header-left">
    <span class="logo-banco">cobrança <span class="caixa">CAI<span class="x">X</span>A</span></span>
  </div>
  <div class="codigo-banco">104-0</div>
  <div class="linha-digitavel-header">10491.23456 78901.234567 89012.345678 9 01234567890</div>
</div>
```

#### 2. **Recibo do Pagador** (Parte Superior)

**Campos exibidos**:
- **Beneficiário**: Nome da empresa (INVESTMONEY SECURITIZADORA DE CREDITOS S)
- **CPF/CNPJ**: CNPJ formatado (XX.XXX.XXX/XXXX-XX)
- **Endereço do Beneficiário**: Endereço completo
- **Data Documento**: Data de emissão
- **Dt. de Processamento**: Data de emissão
- **Num. Documento**: Número do documento (ex: "FEC-164-P1")
- **Ag./Cod. Beneficiário**: 0374/1242669
- **Nosso Número**: Número gerado pela Caixa
- **Pagador**: Nome do paciente (em MAIÚSCULAS)
- **CPF/CNPJ do Pagador**: CPF formatado
- **Endereço do Pagador**: Endereço completo do paciente
- **Sacador/Beneficiário Final**: Nome da clínica
- **Instruções**: 
  - "NAO RECEBER APOS 30 DIAS DE ATRASO"
  - "JUROS: 8,00% AO MES (DIAS CORRIDOS) A PARTIR DE: [data]"
  - "MULTA: [valor] REAIS A PARTIR DE [data]"
- **Aceite**: "NAO"
- **Carteira**: "RG"
- **Espécie**: "DS" (Duplicata de Serviço)

**Linha de Corte**: Linha pontilhada com símbolo de tesoura ✂

#### 3. **Ficha de Compensação** (Parte Inferior)

**Campos exibidos**:
- **Local de Pagamento**: "PREFERENCIALMENTE NAS CASAS LOTÉRICAS ATÉ O VALOR LIMITE"
- **Vencimento**: Data formatada (DD/MM/AAAA) - **DESTACADO EM CINZA**
- **Beneficiário**: Nome da empresa
- **Ag./Cod. Beneficiário**: 0374/1242669
- **Endereço do Beneficiário**: Endereço completo
- **Data do Documento**: Data de emissão
- **Num. Documento**: Número do documento
- **Espécie Doc.**: "DS"
- **Aceite**: "NAO"
- **Data do Processamento**: Data de emissão
- **Nosso Número**: Número gerado pela Caixa
- **Uso do Banco**: Vazio
- **Carteira**: "RG"
- **Espécie Moeda**: "R$"
- **Qtde. Moeda**: Vazio
- **Valor**: Vazio
- **Vencimento**: Data formatada - **DESTACADO EM CINZA**
- **Instruções**: Mesmas instruções do recibo
- **(=) Valor do Documento**: Valor formatado (R$ X.XXX,XX) - **DESTACADO EM CINZA**
- **(-) Desconto**: Vazio
- **(-) Outras Deduções/Abatimento**: Vazio
- **(+) Mora/Multa/Juros**: Vazio
- **(+) Outros Acréscimos**: Vazio
- **Pagador**: Nome do paciente
- **CPF/CNPJ**: CPF formatado
- **Endereço**: Endereço completo
- **Beneficiário Final**: Nome da clínica
- **CPF/CNPJ**: CNPJ da clínica

#### 4. **Código de Barras**

**Localização**: Abaixo da Ficha de Compensação

**Renderização**:
- Código de barras visual (gerado via CSS usando padrão ITF - Interleaved 2 of 5)
- Número do código de barras abaixo (fonte monospace)

**Código CSS**:
```css
.codigo-barras {
  text-align: center;
  padding: 6px;
  border: 2px solid #000;
  border-top: none;
  background: white;
}
```

#### 5. **Footer**

**Informações de contato**:
- SAC CAIXA: 0800 726 0101
- Para pessoas com deficiência auditiva: 0800 726 2492
- Ouvidoria: 0800 725 7474
- www.caixa.gov.br

---

## 📊 ESTRUTURA DE DADOS

### Tabela: `boletos_caixa`

**Campos principais**:
```sql
- id (INTEGER, PK)
- paciente_id (INTEGER, FK → pacientes.id)
- fechamento_id (INTEGER, FK → fechamentos.id)
- id_beneficiario (VARCHAR)  -- Ex: "1242669"
- nosso_numero (VARCHAR)     -- Gerado pela Caixa
- numero_documento (VARCHAR) -- Ex: "FEC-164-P1"
- codigo_barras (VARCHAR)    -- 44 dígitos
- linha_digitavel (VARCHAR)  -- Formatada com pontos e espaços
- url (TEXT)                 -- URL do boleto na Caixa
- qrcode (TEXT)              -- QR Code PIX (se disponível)
- url_qrcode (TEXT)          -- URL do QR Code
- valor (DECIMAL)
- data_vencimento (DATE)
- data_emissao (DATE)
- situacao (VARCHAR)         -- "EM ABERTO", "PAGO", "VENCIDO", "CANCELADO", "ERRO"
- status (VARCHAR)           -- "pendente", "pago", "vencido", "cancelado", "erro"
- empresa_id (INTEGER)
- parcela_numero (INTEGER)   -- Número da parcela (1, 2, 3...)
- sincronizado_em (TIMESTAMP)
```

---

## 🔧 CONFIGURAÇÕES NECESSÁRIAS

### Variáveis de Ambiente (.env)

```env
# API Key da Caixa (38 caracteres, começa com "l")
CAIXA_API_KEY=l777123839e09849f9a0d5a3d972d35e6e

# Client ID e Secret (Sandbox)
CAIXA_CLIENT_ID=cli-ext-41267440000197-1
CAIXA_CLIENT_SECRET=90b11321-8363-477d-bf16-8ccf1963916d

# ID do Beneficiário (pode ser "0374/1242669" ou apenas "1242669")
CAIXA_ID_BENEFICIARIO=0374/1242669

# Ambiente (opcional, padrão: sandbox)
CAIXA_USAR_PRODUCAO=false
```

### URLs da API

**Sandbox**:
- Token: `https://logindes.caixa.gov.br/auth/realms/internet/protocol/openid-connect/token`
- API: `https://api.caixa.gov.br:8443/sandbox/cobranca-bancaria`

**Produção**:
- Token: `https://loginservicos.caixa.gov.br/auth/realms/internet/protocol/openid-connect/token`
- API: `https://api.caixa.gov.br:8443/cobranca-bancaria`

---

## 📋 REGRAS DE NEGÓCIO

### Juros e Multa

- **Juros**: 8% ao mês (TAXA_MENSAL)
  - Aplicado a partir de **1 dia após o vencimento**
  - Campo obrigatório no payload

- **Multa**: 10% do valor
  - Aplicada a partir da **data de vencimento**
  - Campo obrigatório no payload

### Pós-Vencimento

- **Ação**: DEVOLVER
- **Prazo**: 10 dias após vencimento
- Após 10 dias, o boleto é automaticamente devolvido pela Caixa

### Validações

1. **CPF do pagador**: Obrigatório, deve ser válido
2. **Nome do pagador**: Máximo 40 caracteres
3. **CNPJ do beneficiário**: Obrigatório no payload
4. **Data de juros**: DEVE SER MAIOR que data de vencimento
5. **Valor**: Deve ser positivo

---

## 🎯 PONTOS IMPORTANTES

### 1. Rate Limiting
- **SSO (Token)**: Máximo 1 requisição por minuto por IP
- **API**: Máximo 5 requisições por segundo
- O sistema implementa delays automáticos para respeitar esses limites

### 2. Tratamento de Erros
- Se `nosso_numero` duplicado (problema conhecido da API Sandbox):
  - Sistema salva boleto com `nosso_numero = NULL`
  - Registra erro em `erro_criacao`
  - Continua criando outros boletos

### 3. Normalização de URLs
- URLs retornadas pela API podem conter IP interno (`10.116.82.66`)
- Sistema substitui automaticamente por URL pública (`boletoonline.caixa.gov.br`)

### 4. Verificação de Duplicatas
- Verifica por `numero_documento` (único por parcela)
- **NÃO** verifica por `nosso_numero` (pode ser duplicado na Sandbox)

---

## 📱 VISUALIZAÇÃO NO FRONTEND

### Componente: `MeusBoletosPaciente.js`

**Funcionalidades**:
- Lista todos os boletos do paciente
- Mostra status (pendente, pago, vencido)
- Botão "Visualizar Boleto" que abre em nova aba
- Botão "Baixar Boleto" (para boletos importados manualmente)

### Visualização do Boleto

**URL**: `/api/fechamentos/:id/boletos/:boletoId/visualizar`

**Recursos**:
- Botão "🖨️ Imprimir" (usa `window.print()`)
- Botão "📥 Baixar PDF" (usa biblioteca `html2pdf.js`)
- Layout responsivo
- CSS otimizado para impressão

---

## 🔍 FLUXO DE DADOS COMPLETO

```
1. Admin/Clínica cria fechamento
   ↓
2. Sistema valida dados do paciente
   ↓
3. Para cada parcela:
   a. Calcula data de vencimento
   b. Gera número do documento (FEC-{id}-P{parcela})
   c. Prepara payload com dados do pagador
   d. Chama API Caixa (POST /v4/beneficiarios/{id}/boletos)
   e. Recebe: nosso_numero, codigo_barras, linha_digitavel, url
   f. Normaliza URL (substitui IP interno)
   g. Salva em boletos_caixa
   h. Aguarda 800ms (rate limit)
   ↓
4. Boletos aparecem para:
   - Paciente (em "Meus Boletos")
   - Clínica (em "Fechamentos" → boletos do paciente)
   - Admin (em "Gestão de Boletos")
   ↓
5. Ao clicar em "Visualizar":
   - Sistema busca dados completos do boleto
   - Busca dados do paciente e clínica
   - Renderiza HTML com design FEBRABAN/Caixa
   - Exibe código de barras visual
   - Permite impressão e download PDF
```

---

## 🎨 DETALHES DO DESIGN

### Cores Principais

- **Gradiente Header**: `#00b5a6` → `#0066cc` (verde-água para azul)
- **Logo "X"**: Gradiente dourado `#ffd700` → `#ff8c00`
- **Campos destacados**: Fundo cinza `#e8e8e8`
- **Bordas**: Preto `#000`
- **Texto**: Preto `#000`

### Tipografia

- **Fonte principal**: Arial, sans-serif
- **Tamanho base**: 7px
- **Labels**: 5.5px
- **Valores**: 8px (bold)
- **Valores destacados**: 10-12px
- **Linha digitável**: Courier New, monospace, 12px

### Layout

- **Largura máxima**: 800px
- **Bordas**: 2px sólidas pretas
- **Padding células**: 1px 3px
- **Espaçamento**: Mínimo (line-height: 1.1)

---

## 📝 RESUMO EXECUTIVO

### O que acontece quando um boleto é gerado:

1. ✅ **Fechamento criado** → Sistema detecta parcelamento
2. ✅ **Loop de parcelas** → Para cada parcela:
   - Calcula vencimento
   - Gera número único
   - Chama API Caixa
   - Recebe dados do boleto
   - Salva no banco
3. ✅ **Boleto disponível** → Aparece para paciente, clínica e admin
4. ✅ **Visualização** → HTML renderizado com design FEBRABAN/Caixa
5. ✅ **Download/Impressão** → Funcionalidades disponíveis

### Dados enviados para Caixa:

- ✅ Dados do pagador (CPF, nome, endereço)
- ✅ Valor e vencimento
- ✅ Juros (8% mensal)
- ✅ Multa (10%)
- ✅ Instruções
- ✅ CNPJ do beneficiário (obrigatório)

### Dados retornados pela Caixa:

- ✅ `nosso_numero` (identificador único)
- ✅ `codigo_barras` (44 dígitos)
- ✅ `linha_digitavel` (formatada)
- ✅ `url` (link para visualização)
- ✅ `qrcode` (se PIX disponível)

---

## 🔗 ARQUIVOS RELACIONADOS

1. **`backend/services/caixa-boleto.service.js`**
   - Autenticação OAuth2
   - Criação de boletos na API
   - Consulta de boletos
   - Atualização de boletos

2. **`backend/utils/caixa-boletos.helper.js`**
   - Preparação de dados
   - Loop de criação
   - Salvamento no banco
   - Tratamento de erros

3. **`backend/controllers/fechamentos.controller.js`**
   - Endpoint de criação de fechamento
   - Endpoint de visualização do boleto
   - Renderização HTML

4. **`frontend/src/components/MeusBoletosPaciente.js`**
   - Listagem de boletos
   - Visualização para paciente

5. **`backend/controllers/boletos-gestao.controller.js`**
   - Gestão manual de boletos
   - Importação de boletos existentes

---

## ✅ CHECKLIST DE FUNCIONALIDADES

- [x] Autenticação OAuth2 com cache de token
- [x] Criação de boletos via API Caixa
- [x] Suporte a parcelamento
- [x] Salvamento no banco de dados
- [x] Normalização de URLs
- [x] Tratamento de duplicatas
- [x] Rate limiting
- [x] Renderização HTML FEBRABAN/Caixa
- [x] Código de barras visual
- [x] Download PDF
- [x] Impressão
- [x] Visualização para paciente
- [x] Visualização para clínica
- [x] Gestão para admin

---

**Última atualização**: 2024-11-10
**Versão do documento**: 1.0

