# Fluxo Completo de Boletos - De Ponta a Ponta

## 📋 Visão Geral

O sistema de boletos funciona em duas etapas principais:
1. **Gestão Manual**: Boletos são criados na tabela `boletos_gestao` para controle administrativo
2. **Geração na Caixa**: Boletos são gerados na API da Caixa apenas 20 dias antes do vencimento

---

## 🔄 Fluxo Completo Passo a Passo

### **ETAPA 1: Criação do Fechamento**

**Arquivo:** `backend/controllers/fechamentos.controller.js` → `createFechamento()`

1. Clínica cria um fechamento com:
   - Paciente
   - Valor total (`valor_fechado`)
   - Número de parcelas (`numero_parcelas`)
   - Valor da parcela (`valor_parcela`)
   - Data de vencimento inicial (`vencimento`)
   - Empresa (ID 3 = Caixa)

2. Fechamento é salvo na tabela `fechamentos` com status inicial:
   - `aprovado: null` ou `'pendente'` (dependendo da empresa)

**⚠️ IMPORTANTE:** Neste momento, **NENHUM boleto é gerado na Caixa ainda!**

---

### **ETAPA 2: Aprovação do Fechamento**

**Arquivo:** `backend/controllers/fechamentos.controller.js` → `aprovarFechamento()`

Quando um admin aprova o fechamento:

1. **Status do fechamento** muda para `'aprovado'`
2. **Status do paciente** muda para `'fechado'`
3. **Importação automática de boletos** para gestão manual:
   - Chama função RPC: `importar_boletos_fechamento()`
   - Cria registros na tabela `boletos_gestao` para cada parcela
   - Cada registro tem:
     - `fechamento_id`: ID do fechamento
     - `paciente_id`: ID do paciente
     - `numero_parcela`: 1, 2, 3, etc.
     - `valor`: Valor da parcela
     - `data_vencimento`: Data calculada (vencimento inicial + meses)
     - `gerar_boleto: false` (não gera automaticamente ainda)
     - `boleto_gerado: false` (ainda não foi gerado na Caixa)
     - `status: 'pendente'`
     - `dias_antes_vencimento: 20`

**⚠️ IMPORTANTE:** Neste momento, os boletos estão apenas na tabela `boletos_gestao`, mas **AINDA NÃO foram gerados na API da Caixa!**

---

### **ETAPA 3: Gestão Manual de Boletos**

**Arquivo:** `frontend/src/components/GestaoBoletosAdmin.js`

O admin pode:

1. **Visualizar todos os boletos** na interface "Gestão de Boletos"
2. **Filtrar** por:
   - Status (pendente, pago, vencido, cancelado)
   - Data de vencimento
   - Paciente
   - Clínica
   - Se deve gerar boleto
   - Se boleto já foi gerado

3. **Editar manualmente**:
   - Valor do boleto
   - Data de vencimento
   - Status (pendente, pago, vencido, cancelado)
   - Data de pagamento
   - Valor pago
   - Observações

4. **Importar boletos manualmente** (se não foram importados automaticamente):
   - Endpoint: `POST /api/boletos-gestao/importar`
   - Fornece `fechamento_id`
   - Sistema cria registros em `boletos_gestao`

---

### **ETAPA 4: Geração Automática na Caixa (20 dias antes)**

**Arquivo:** `backend/jobs/gerar-boletos-automatico.js`

O job roda periodicamente (configurável, padrão: a cada 60 minutos):

1. **Busca boletos que devem ser gerados hoje:**
   ```sql
   WHERE gerar_boleto = TRUE
     AND boleto_gerado = FALSE
     AND empresa_id = 3
     AND data_vencimento <= (CURRENT_DATE + 20 dias)
     AND status = 'pendente'
   ```

2. **Para cada boleto encontrado:**
   - Busca dados completos do paciente
   - Valida que paciente tem CPF
   - Chama `criarBoletosCaixa()` do helper
   - Helper cria boleto na API da Caixa
   - Atualiza registro em `boletos_gestao` com:
     - `boleto_gerado: true`
     - `data_geracao_boleto: NOW()`
     - `boleto_caixa_id`: ID do boleto na tabela `boletos_caixa`
     - `nosso_numero`: Número retornado pela Caixa
     - `numero_documento`: Número do documento
     - `linha_digitavel`: Linha digitável
     - `codigo_barras`: Código de barras
     - `url_boleto`: URL para visualizar o boleto

3. **Também salva na tabela `boletos_caixa`:**
   - Registro completo do boleto gerado na Caixa
   - Usado para histórico e visualização

**⚠️ IMPORTANTE:** O boleto só é gerado na Caixa quando faltam 20 dias ou menos para o vencimento!

---

### **ETAPA 5: Geração Manual na Caixa**

**Arquivo:** `backend/controllers/boletos-gestao.controller.js` → `gerarBoletosPendentes()`

O admin pode gerar boletos manualmente antes dos 20 dias:

1. **Interface:** Botão "Gerar Boletos Pendentes" em `GestaoBoletosAdmin`
2. **Endpoint:** `POST /api/boletos-gestao/gerar-pendentes`
3. **Processo:**
   - Busca boletos com `gerar_boleto = true` e `boleto_gerado = false`
   - Gera na Caixa imediatamente (não espera 20 dias)
   - Atualiza `boletos_gestao` e cria em `boletos_caixa`

---

### **ETAPA 6: Visualização de Boletos**

#### **Para o Admin:**
- **Interface:** `GestaoBoletosAdmin`
- Visualiza todos os boletos com filtros
- Pode ver URL do boleto se já foi gerado
- Pode alterar status manualmente

#### **Para o Paciente:**
- **Interface:** `MeusBoletosPaciente`
- Endpoint: `GET /api/paciente/boletos`
- Visualiza apenas seus próprios boletos
- Pode sincronizar status com a Caixa
- Pode visualizar boleto se já foi gerado

---

### **ETAPA 7: Atualização de Status**

#### **Manual (Admin):**
- Admin altera status diretamente em `boletos_gestao`
- Pode marcar como "pago", "vencido", "cancelado"
- Pode informar data de pagamento e valor pago

#### **Sincronização com Caixa (Paciente):**
- Endpoint: `GET /api/paciente/boletos/sincronizar/:boletoId`
- Busca status atualizado na API da Caixa
- Atualiza `boletos_gestao` e `boletos_caixa`

---

## 📊 Estrutura de Dados

### **Tabela: `boletos_gestao`**
Gerencia o ciclo de vida dos boletos:
- Controle de geração (`gerar_boleto`, `boleto_gerado`)
- Status (`pendente`, `pago`, `vencido`, `cancelado`)
- Datas e valores
- Vínculo com fechamento e paciente

### **Tabela: `boletos_caixa`**
Armazena boletos gerados na Caixa:
- Dados retornados pela API da Caixa
- `nosso_numero`, `linha_digitavel`, `codigo_barras`
- URL do boleto
- Status sincronizado com a Caixa

### **View: `vw_boletos_gestao_completo`**
Facilita consultas combinando:
- Dados de `boletos_gestao`
- Dados do paciente
- Dados da clínica
- Dados do fechamento
- Campos calculados:
  - `deve_gerar_hoje`: Se deve gerar hoje (20 dias antes)
  - `dias_ate_vencimento`: Dias até o vencimento
  - `status_display`: Status formatado

---

## 🔧 Componentes Principais

### **Backend:**

1. **`fechamentos.controller.js`**
   - `createFechamento()`: Cria fechamento
   - `aprovarFechamento()`: Aprova e importa boletos

2. **`boletos-gestao.controller.js`**
   - `listarBoletos()`: Lista com filtros
   - `importarBoletos()`: Importa manualmente
   - `atualizarBoleto()`: Atualiza dados
   - `gerarBoletosPendentes()`: Gera manualmente na Caixa

3. **`caixa-boletos.helper.js`**
   - `criarBoletosCaixa()`: Cria boletos na API da Caixa
   - Salva em `boletos_caixa`
   - Trata erros e duplicatas

4. **`gerar-boletos-automatico.js`**
   - Job que roda periodicamente
   - Gera boletos 20 dias antes do vencimento
   - Processa em lotes

### **Frontend:**

1. **`GestaoBoletosAdmin.js`**
   - Interface completa de gestão
   - Filtros, edição, importação
   - Geração manual

2. **`MeusBoletosPaciente.js`**
   - Visualização para pacientes
   - Sincronização de status

---

## ⚙️ Configurações Importantes

### **Variáveis de Ambiente:**
```env
CAIXA_ID_BENEFICIARIO=0374/1242669  # ID do beneficiário na Caixa
CAIXA_API_KEY=sua_api_key           # Chave da API Caixa
CAIXA_API_URL=https://api.caixa.gov.br/cobranca/v2
```

### **Parâmetros do Sistema:**
- **Dias antes do vencimento:** 20 dias (configurável por boleto)
- **Status iniciais:** `pendente`
- **Geração automática:** `false` por padrão (admin controla)

---

## 🎯 Regras de Negócio

1. **Boletos NÃO são gerados automaticamente na Caixa ao aprovar fechamento**
   - Apenas importados para `boletos_gestao`

2. **Geração automática acontece apenas 20 dias antes do vencimento**
   - Job verifica periodicamente
   - Admin pode gerar manualmente antes

3. **Um boleto pode ter dois estados:**
   - **Em gestão** (`boletos_gestao`): Controle administrativo
   - **Gerado na Caixa** (`boletos_caixa`): Boleto real na Caixa

4. **Status pode ser atualizado:**
   - Manualmente pelo admin
   - Via sincronização com a Caixa (paciente)

5. **Boletos não podem ser excluídos se já foram gerados na Caixa**

---

## 📈 Fluxograma Visual

```
┌─────────────────┐
│ Criar Fechamento│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Fechamento Criado│
│ (status: pendente)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Aprovar Fechamento│
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ Importar para boletos_gestao│
│ (1 registro por parcela) │
│ gerar_boleto = false     │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Admin pode editar:       │
│ - Valor                 │
│ - Data vencimento       │
│ - Status                │
│ - Marcar gerar_boleto   │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ 20 dias antes vencimento│
│ Job verifica e gera     │
│ na Caixa automaticamente│
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Boleto gerado na Caixa  │
│ - Salvo em boletos_caixa│
│ - Atualizado em         │
│   boletos_gestao        │
│ - URL disponível        │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Paciente visualiza e    │
│ pode sincronizar status │
└─────────────────────────┘
```

---

## 🔍 Pontos de Atenção

1. **Duas tabelas diferentes:**
   - `boletos_gestao`: Gestão administrativa
   - `boletos_caixa`: Boletos reais na Caixa

2. **Geração não é automática:**
   - Admin controla quando gerar
   - Job gera apenas 20 dias antes

3. **Status pode divergir:**
   - Status em `boletos_gestao` (manual)
   - Status em `boletos_caixa` (da Caixa)
   - Sincronização resolve divergências

4. **View facilita consultas:**
   - `vw_boletos_gestao_completo` combina tudo
   - Campos calculados automáticos

---

## 📝 Resumo Executivo

**Fluxo Simplificado:**
1. Fechamento criado → Nenhum boleto gerado
2. Fechamento aprovado → Boletos importados para gestão (`boletos_gestao`)
3. Admin gerencia → Edita valores, datas, marca para gerar
4. 20 dias antes → Job gera automaticamente na Caixa
5. Boleto gerado → Disponível para paciente visualizar
6. Status atualizado → Manualmente ou via sincronização

**Princípio:** Gestão manual primeiro, geração na Caixa apenas quando necessário (20 dias antes).

