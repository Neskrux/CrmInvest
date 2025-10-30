# 📋 Análise: Fluxo de Cadastro de Pacientes pela Clínica

## 🎯 Objetivo

Entender como funciona o processo completo de cadastro de pacientes pela parte da clínica, desde o cadastro inicial até a criação de fechamentos/pagamentos, para integrar a criação automática de boletos da Caixa para empresa_id 3.

---

## 🔄 Fluxo Completo de Cadastro

### 1. **Cadastro Básico do Paciente pela Clínica**

**Endpoint:** `POST /api/pacientes`

**Campos Coletados:**
- `nome` (obrigatório)
- `telefone` (obrigatório, normalizado - apenas números)
- `email` (opcional)
- `cpf` (opcional, normalizado - apenas números)
- `tipo_tratamento` (opcional)
- `cidade` (opcional)
- `estado` (opcional)
- `observacoes` (opcional)
- `grau_parentesco` (opcional)
- `tratamento_especifico` (opcional)

**Comportamento Específico para Clínica:**
```javascript
if (req.user.tipo === 'clinica') {
  finalClinicaId = req.user.clinica_id || req.user.id;
  finalCadastradoPorClinica = true;
  empresa_id = req.user.empresa_id; // ⚠️ IMPORTANTE: empresa_id vem da clínica
}
```

**Validações:**
- ✅ Telefone único por empresa_id
- ✅ CPF único por empresa_id
- ✅ Status automático: se tem `consultor_id` → `'paciente'`, senão → `'lead'`

**Resultado:**
- Paciente criado com `clinica_id` da clínica logada
- Campo `cadastrado_por_clinica = true`
- Campo `empresa_id` herdado da clínica

---

### 2. **Cadastro Completo com Fechamento (Modal Completo)**

**Fluxo no Frontend (`Pacientes.js`):**

Quando clínica faz cadastro completo direto (com fechamento):

```javascript
// 1. Criar paciente primeiro
const pacienteData = {
  nome, telefone, cpf, cidade, estado,
  tipo_tratamento, status: 'fechado', // ⚠️ Já cria como fechado
  observacoes
};

const pacienteResponse = await makeRequest('/pacientes', {
  method: 'POST',
  body: JSON.stringify(pacienteData)
});

// 2. Criar fechamento com contrato
const fechamentoFormData = new FormData();
fechamentoFormData.append('paciente_id', pacienteCriado.id);
fechamentoFormData.append('clinica_id', clinicaId);
fechamentoFormData.append('valor_fechado', dados.valor_fechado);
fechamentoFormData.append('data_fechamento', dados.data_fechamento);
fechamentoFormData.append('tipo_tratamento', dados.tipo_tratamento);
// ... outros campos do fechamento
// Upload de contrato se houver

await makeRequest('/fechamentos', {
  method: 'POST',
  body: fechamentoFormData
});
```

**Campos do Fechamento:**
- `paciente_id` (obrigatório)
- `clinica_id` (obrigatório, exceto empresa_id 5)
- `valor_fechado` (obrigatório)
- `data_fechamento` (obrigatório)
- `tipo_tratamento` (opcional)
- `valor_parcela` (opcional - para parcelamento)
- `numero_parcelas` (opcional)
- `vencimento` (opcional - primeira parcela)
- `antecipacao_meses` (opcional)
- `observacoes` (opcional)
- `contrato_arquivo` (upload de PDF)

---

### 3. **Cadastro via Carteira Existente**

**Fluxo:** Clínica cadastra múltiplos pacientes de uma vez através de "Carteira Existente"

**Endpoint:** `POST /api/solicitacoes-carteira`

**Processo:**
1. Clínica preenche formulário com:
   - Lista de pacientes (CPF, nome completo, valor parcela, parcelas abertas, primeira vencimento, parcelas para antecipar)
   - Percentual alvo da carteira
   
2. Sistema calcula valores automaticamente:
   - Valor entregue total
   - Deságio total
   - Valor face total
   - Percentual C/O (Colateral/Operação)

3. Cria solicitação pendente de aprovação

4. **Quando aprovado**, cria pacientes automaticamente:
```javascript
if (status === 'aprovado') {
  for (const paciente of data.pacientes_carteira) {
    const pacienteData = {
      nome: paciente.nomeCompleto,
      cpf: paciente.cpf,
      tipo_tratamento: 'Carteira Existente',
      status: 'fechado', // ⚠️ Já criado como fechado
      carteira_existente: true,
      clinica_id: data.clinica_id,
      cadastrado_por_clinica: true,
      valor_parcela: paciente.valorParcela,
      numero_parcelas_aberto: paciente.numeroParcelasAberto,
      primeira_vencimento: paciente.primeiraVencimento,
      numero_parcelas_antecipar: paciente.numeroParcelasAntecipar,
      empresa_id: req.user.empresa_id
    };
    
    // Criar paciente
    await supabaseAdmin.from('pacientes').insert([pacienteData]);
  }
}
```

---

### 4. **Fluxo de Agendamento → Fechamento**

**Quando paciente tem agendamento:**

1. Clínica cria agendamento:
   - `POST /api/agendamentos`
   - Vincula paciente à clínica

2. Status do paciente muda para `'agendado'`

3. **Quando status do paciente muda para `'fechado'`** (automático):
   ```javascript
   if (status === 'fechado') {
     // Atualiza agendamento para 'fechado'
     await supabaseAdmin
       .from('agendamentos')
       .update({ status: 'fechado' })
       .eq('paciente_id', id);
     
     // Cria fechamento automaticamente se não existir
     if (!fechamentoExistente) {
       await supabaseAdmin.from('fechamentos').insert({
         paciente_id: id,
         consultor_id: paciente.consultor_id,
         clinica_id: agendamento?.clinica_id,
         valor_fechado: 0, // ⚠️ Valor inicial = 0
         data_fechamento: new Date().toISOString().split('T')[0],
         tipo_tratamento: paciente.tipo_tratamento,
         forma_pagamento: 'A definir',
         observacoes: 'Fechamento criado automaticamente pelo pipeline',
         aprovado: 'aprovado',
         empresa_id: req.user.empresa_id
       });
     }
   }
   ```

---

## 📊 Campos Importantes para Integração com Boletos

### Tabela `pacientes`:

**Campos relacionados a pagamento:**
- `valor_parcela` (DECIMAL) - Valor de cada parcela
- `numero_parcelas_aberto` (INTEGER) - Número de parcelas em aberto
- `primeira_vencimento` (DATE) - Data de vencimento da primeira parcela
- `numero_parcelas_antecipar` (INTEGER) - Parcelas para antecipar
- `cpf` (STRING) - CPF do paciente (necessário para boleto)
- `nome` (STRING) - Nome completo (necessário para boleto)
- `cidade` (STRING) - Cidade
- `estado` (STRING) - Estado
- `cadastrado_por_clinica` (BOOLEAN) - Flag indicando cadastro pela clínica
- `clinica_id` (INTEGER) - ID da clínica
- `empresa_id` (INTEGER) - **CRÍTICO: empresa_id 3 para integração Caixa**

### Tabela `fechamentos`:

**Campos relacionados a pagamento:**
- `valor_fechado` (DECIMAL) - Valor total do fechamento
- `valor_parcela` (DECIMAL) - Valor de cada parcela
- `numero_parcelas` (INTEGER) - Número de parcelas
- `vencimento` (DATE) - Data de vencimento
- `antecipacao_meses` (INTEGER) - Meses de antecipação
- `paciente_id` (FK) - Referência ao paciente
- `clinica_id` (FK) - Referência à clínica
- `empresa_id` (INTEGER) - **CRÍTICO: empresa_id 3 para integração Caixa**

---

## 🎯 Pontos de Integração Identificados

### **Ponto 1: Criação de Fechamento (Manual ou Automático)**

**Quando:** Fechamento é criado (manual ou automático pelo pipeline)

**Onde:** `backend/controllers/fechamentos.controller.js` - `createFechamento`

**Condição:** `req.user.empresa_id === 3` (empresa_id 3)

**Ação Proposta:**
```javascript
// Após criar fechamento com sucesso
if (req.user.empresa_id === 3 && data[0].paciente_id) {
  // Buscar dados do paciente
  const paciente = await buscarPaciente(data[0].paciente_id);
  
  // Verificar se tem dados necessários para boleto
  if (paciente.cpf && paciente.nome && data[0].valor_fechado > 0) {
    // Criar boleto na Caixa
    await criarBoletoCaixa({
      paciente,
      fechamento: data[0],
      empresa_id: 3
    });
  }
}
```

### **Ponto 2: Cadastro via Carteira Existente**

**Quando:** Solicitação de carteira existente é aprovada

**Onde:** `backend/routes/solicitacoes-carteira.routes.js` - PUT `/solicitacoes-carteira/:id/status`

**Condição:** `status === 'aprovado'` e `req.user.empresa_id === 3`

**Ação Proposta:**
```javascript
// Após criar paciente da carteira
if (req.user.empresa_id === 3 && paciente.cpf && paciente.valor_parcela) {
  // Criar múltiplos boletos (um por parcela)
  for (let i = 0; i < paciente.numero_parcelas_antecipar; i++) {
    await criarBoletoCaixa({
      paciente,
      parcela: i + 1,
      valor: paciente.valor_parcela,
      vencimento: calcularVencimento(paciente.primeira_vencimento, i),
      empresa_id: 3
    });
  }
}
```

### **Ponto 3: Cadastro Completo com Fechamento**

**Quando:** Clínica faz cadastro completo diretamente (com fechamento)

**Onde:** `frontend/src/components/Pacientes.js` - `confirmarCadastroCompleto`

**Ação Proposta:**
- Integração deve acontecer no backend quando fechamento é criado
- Mesmo fluxo do Ponto 1

---

## ⚠️ Dados Necessários para Criar Boleto

### Obrigatórios:
- ✅ **CPF do paciente** (`paciente.cpf`)
- ✅ **Nome do paciente** (`paciente.nome`)
- ✅ **Valor** (`fechamento.valor_fechado` ou `paciente.valor_parcela`)
- ✅ **Data de vencimento** (`fechamento.vencimento` ou calcular de `paciente.primeira_vencimento`)
- ✅ **ID do beneficiário** (`id_beneficiario` - precisa ser configurado)

### Opcionais mas Importantes:
- ✅ **Endereço completo** (`paciente.cidade`, `paciente.estado`)
- ✅ **Número do documento** (gerar único por boleto)
- ✅ **Observações** (mensagens no boleto)

---

## 🔍 Dúvidas a Esclarecer

1. **ID do Beneficiário:**
   - Qual é o `id_beneficiario` da empresa_id 3 na Caixa?
   - É único por empresa ou há diferentes beneficiários?

2. **Criação de Boletos:**
   - Criar boleto único com valor total ou múltiplos boletos (um por parcela)?
   - Quando criar: imediatamente ao criar fechamento ou quando fechamento é aprovado?

3. **Dados do Paciente:**
   - Todos os pacientes cadastrados pela clínica têm CPF?
   - O que fazer se paciente não tiver CPF? (Bloquear cadastro? Criar boleto sem CPF?)

4. **Valores:**
   - Quando há parcelamento, criar um boleto por parcela?
   - Como calcular vencimentos das parcelas?

5. **Aprovação:**
   - Boletos devem ser criados apenas quando fechamento está `aprovado`?
   - Ou criar mesmo quando `pendente`?

---

## 📝 Próximos Passos

1. ✅ **Confirmar dúvidas acima** com o usuário
2. ✅ **Definir estratégia de criação** de boletos
3. ✅ **Implementar integração** nos pontos identificados
4. ✅ **Testar fluxo completo** em ambiente sandbox

---

**Data da Análise:** Dezembro 2024
**Status:** ✅ ANÁLISE COMPLETA - AGUARDANDO CONFIRMAÇÕES

