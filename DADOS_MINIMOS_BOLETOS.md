# 📋 Dados Mínimos para Gerar Boletos Caixa

## ✅ Campos OBRIGATÓRIOS

### 1. **Do Paciente** (tabela `pacientes`)
- ✅ **CPF** (`paciente.cpf`) - **OBRIGATÓRIO**
- ✅ **Nome** (`paciente.nome`) - **OBRIGATÓRIO**

### 2. **Do Fechamento** (tabela `fechamentos`)
- ✅ **Valor** (`fechamento.valor_fechado` OU `fechamento.valor_parcela`) - **OBRIGATÓRIO**
- ✅ **Data de Vencimento** (`fechamento.vencimento` OU `fechamento.data_fechamento`) - **OBRIGATÓRIO**
- ✅ **Empresa ID** (`fechamento.empresa_id = 3`) - **OBRIGATÓRIO**
- ✅ **Aprovado** (`fechamento.aprovado = 'aprovado'`) - **OBRIGATÓRIO**

### 3. **Configuração do Sistema** (variáveis de ambiente `.env`)
- ✅ **ID do Beneficiário** (`CAIXA_ID_BENEFICIARIO`) - **OBRIGATÓRIO**
- ✅ **Credenciais API** (`CAIXA_CLIENT_ID`, `CAIXA_CLIENT_SECRET`, `CAIXA_API_KEY`) - **OBRIGATÓRIO**

---

## 📝 Campos OPCIONAIS (mas recomendados)

### Do Paciente:
- ⚪ **Cidade** (`paciente.cidade`) - Opcional, mas recomendado
- ⚪ **Estado** (`paciente.estado`) - Opcional, mas recomendado
- ⚪ **CEP** (`paciente.cep`) - Opcional (endereço completo)
- ⚪ **Logradouro** (`paciente.logradouro`) - Opcional (endereço completo)
- ⚪ **Número** (`paciente.numero`) - Opcional (endereço completo)
- ⚪ **Bairro** (`paciente.bairro`) - Opcional (endereço completo)

### Do Fechamento:
- ⚪ **Número de Parcelas** (`fechamento.numero_parcelas`) - Opcional
- ⚪ **Valor Parcela** (`fechamento.valor_parcela`) - Opcional (se houver parcelamento)
- ⚪ **Descrição** (`fechamento.observacoes`) - Opcional

---

## 🔍 Validações Implementadas

O sistema verifica automaticamente antes de criar boletos:

```javascript
// 1. Verifica dados do paciente
if (!paciente.cpf || !paciente.nome) {
  console.warn('⚠️ Paciente sem CPF ou nome. Não é possível criar boleto.');
  return; // Para execução
}

// 2. Verifica ID do beneficiário
if (!idBeneficiario) {
  console.warn('⚠️ ID do beneficiário não configurado.');
  return; // Para execução
}

// 3. Verifica se fechamento está aprovado
if (fechamento.aprovado !== 'aprovado') {
  // Não cria boletos
  return;
}

// 4. Verifica se é empresa_id 3
if (fechamento.empresa_id !== 3) {
  // Não cria boletos
  return;
}
```

---

## 📊 Payload Mínimo para API Caixa

Quando o sistema chama a API Caixa, envia este payload mínimo:

```json
{
  "numero_documento": "FEC-123",  // Gerado automaticamente se não fornecido
  "data_vencimento": "2025-12-31", // YYYY-MM-DD
  "valor": "375.00", // Decimal com 2 casas
  "pagador": {
    "cpf": "12345678901", // Apenas números
    "nome": "Nome do Paciente"
  }
}
```

**Endereço completo** (opcional, mas recomendado):
```json
{
  "pagador": {
    "cpf": "12345678901",
    "nome": "Nome do Paciente",
    "endereco": {
      "logradouro": "Rua Exemplo",
      "numero": "123",
      "bairro": "Centro",
      "cidade": "São Paulo",
      "uf": "SP",
      "cep": "01234567"
    }
  }
}
```

---

## ⚠️ Casos Especiais

### Parcelamento
Se `fechamento.numero_parcelas > 0` e `fechamento.valor_parcela` existe:
- ✅ Cria **um boleto por parcela**
- ✅ Cada parcela tem sua própria data de vencimento (calculada automaticamente)
- ✅ Valor de cada boleto = `valor_parcela`

### Boleto Único
Se não há parcelamento:
- ✅ Cria **um único boleto**
- ✅ Valor = `valor_fechado`
- ✅ Data de vencimento = `vencimento` OU `data_fechamento`

---

## 🧪 Teste de Validação

Para garantir que um fechamento pode gerar boletos, execute:

```sql
-- Verificar se paciente tem dados mínimos
SELECT 
  id,
  nome,
  cpf,
  cidade,
  estado,
  CASE 
    WHEN cpf IS NULL OR cpf = '' THEN '❌ CPF faltando'
    WHEN nome IS NULL OR nome = '' THEN '❌ Nome faltando'
    ELSE '✅ Dados OK'
  END as validacao_paciente
FROM pacientes
WHERE id = SEU_PACIENTE_ID;

-- Verificar se fechamento tem dados mínimos
SELECT 
  id,
  paciente_id,
  empresa_id,
  aprovado,
  valor_fechado,
  valor_parcela,
  numero_parcelas,
  vencimento,
  data_fechamento,
  CASE 
    WHEN empresa_id != 3 THEN '❌ Empresa incorreta'
    WHEN aprovado != 'aprovado' THEN '❌ Não aprovado'
    WHEN valor_fechado IS NULL AND (valor_parcela IS NULL OR numero_parcelas IS NULL) THEN '❌ Valor faltando'
    WHEN vencimento IS NULL AND data_fechamento IS NULL THEN '❌ Data de vencimento faltando'
    ELSE '✅ Dados OK'
  END as validacao_fechamento
FROM fechamentos
WHERE id = SEU_FECHAMENTO_ID;
```

---

## 📋 Checklist Antes de Criar Boletos

- [ ] Paciente tem `cpf` preenchido
- [ ] Paciente tem `nome` preenchido
- [ ] Fechamento tem `empresa_id = 3`
- [ ] Fechamento tem `aprovado = 'aprovado'`
- [ ] Fechamento tem `valor_fechado` OU (`valor_parcela` + `numero_parcelas`)
- [ ] Fechamento tem `vencimento` OU `data_fechamento`
- [ ] Variável `CAIXA_ID_BENEFICIARIO` está configurada no `.env`
- [ ] Credenciais Caixa estão configuradas (`CAIXA_CLIENT_ID`, `CAIXA_CLIENT_SECRET`, `CAIXA_API_KEY`)

---

## 🎯 Resumo Visual

```
┌─────────────────────────────────────┐
│   DADOS MÍNIMOS PARA BOLETOS       │
├─────────────────────────────────────┤
│                                     │
│  PACIENTE:                          │
│  ✅ CPF                             │
│  ✅ Nome                            │
│                                     │
│  FECHAMENTO:                        │
│  ✅ Valor (valor_fechado OU         │
│         valor_parcela)              │
│  ✅ Data Vencimento                 │
│  ✅ empresa_id = 3                  │
│  ✅ aprovado = 'aprovado'           │
│                                     │
│  CONFIGURAÇÃO:                      │
│  ✅ CAIXA_ID_BENEFICIARIO           │
│  ✅ Credenciais API                 │
│                                     │
└─────────────────────────────────────┘
```

---

## 💡 Dicas

1. **Sempre preencha cidade e estado** quando possível - melhora a qualidade dos dados
2. **Valide CPF** antes de criar boletos - evita erros na API
3. **Use data de vencimento futura** - boletos com vencimento no passado podem ter problemas
4. **Configure ID do beneficiário corretamente** - use apenas o código numérico (ex: `1242669`)

