# 🧪 GUIA DE TESTE: Emissão e Validação de Boletos Caixa

## 📋 Como funciona a emissão automática

### ⚠️ IMPORTANTE: Boletos só são criados quando o fechamento está **APROVADO**

**Fluxo completo:**

1. **Criar fechamento** (empresa_id 3)
   - Status inicial: `aprovado: 'pendente'` (exceto incorporadora que já cria como `'aprovado'`)
   - ❌ **NÃO cria boletos ainda**

2. **Aprovar fechamento**
   - Admin acessa fechamentos → Clica em "Aprovar"
   - Status muda para: `aprovado: 'aprovado'`
   - ✅ **AQUI os boletos são criados automaticamente na Caixa**

3. **Boletos criados**
   - Um boleto por parcela (se houver parcelamento)
   - Ou um boleto único (se não houver parcelamento)
   - Dados salvos na tabela `boletos_caixa`

---

## 🧪 Como testar

### 1. Preparação

```sql
-- Verificar se você tem um paciente de teste
SELECT id, nome, cpf, email_login, empresa_id 
FROM pacientes 
WHERE empresa_id = 3 
LIMIT 1;

-- Se não tiver, criar um paciente de teste
INSERT INTO pacientes (
  nome, telefone, cpf, email, tipo_tratamento, status, cidade, estado, empresa_id, clinica_id, cadastrado_por_clinica
) VALUES (
  'Paciente Teste Boletos', '11999999999', '12345678901', 'teste@email.com', 'odontologico', 'em_andamento', 'São Paulo', 'SP', 3,
  (SELECT id FROM clinicas LIMIT 1), true
) RETURNING id, nome;
```

### 2. Criar fechamento

**Opção A: Via Frontend**
1. Acesse como admin/consultor da empresa_id 3
2. Vá em "Pacientes" → Selecione o paciente
3. Crie um fechamento preenchendo:
   - Valor Fechado: `R$ 375,00`
   - Data Fechamento: `hoje`
   - Valor Parcela: `R$ 125,00` (opcional)
   - Número Parcelas: `3` (opcional)
   - Vencimento: `data futura` (opcional)
   - ✅ **Enviar contrato PDF**

**Opção B: Via API/SQL**
```sql
-- Criar fechamento diretamente (aprovado)
INSERT INTO fechamentos (
  paciente_id, empresa_id, valor_fechado, data_fechamento, aprovado, numero_parcelas, valor_parcela, vencimento
) VALUES (
  (SELECT id FROM pacientes WHERE empresa_id = 3 LIMIT 1),
  3,
  375.00,
  CURRENT_DATE,
  'aprovado', -- ⚠️ IMPORTANTE: precisa estar 'aprovado'
  3,
  125.00,
  CURRENT_DATE + INTERVAL '30 days'
) RETURNING id, paciente_id, valor_fechado, aprovado;
```

### 3. Verificar logs do backend

Após criar/aprovar o fechamento, verifique os logs:

```
🏦 [CAIXA] Iniciando criação de boletos para empresa_id 3
📦 Criando boletos parcelados...
✅ [CAIXA] X boleto(s) criado(s) com sucesso
```

### 4. Verificar boletos criados

```sql
-- Ver boletos criados
SELECT 
  id,
  nosso_numero,
  numero_documento,
  valor,
  data_vencimento,
  status,
  situacao,
  linha_digitavel,
  url,
  created_at
FROM boletos_caixa
WHERE paciente_id = (SELECT id FROM pacientes WHERE empresa_id = 3 LIMIT 1)
ORDER BY parcela_numero;
```

### 5. Verificar no portal do paciente

1. Faça login como paciente (email_login/senha)
2. Acesse "Meus Boletos"
3. Deve aparecer todos os boletos criados

---

## 🔄 Como validar status (pago, vencido, etc.)

### Opção 1: Sincronização automática (via API Caixa)

**Endpoint para sincronizar um boleto:**
```
GET /api/paciente/boletos/sincronizar/:boleto_id
```

**Endpoint para sincronizar todos:**
```
POST /api/paciente/boletos/sincronizar-todos
```

**Como usar:**

1. **Via Frontend** (será implementado):
   - Botão "Atualizar Status" em cada boleto
   - Botão "Sincronizar Todos" na página

2. **Via API direta:**
```bash
# Sincronizar um boleto específico
curl -X GET "http://localhost:5000/api/paciente/boletos/sincronizar/1" \
  -H "Authorization: Bearer SEU_TOKEN_PACIENTE"

# Sincronizar todos os boletos
curl -X POST "http://localhost:5000/api/paciente/boletos/sincronizar-todos" \
  -H "Authorization: Bearer SEU_TOKEN_PACIENTE"
```

### Opção 2: Consulta manual no banco

```sql
-- Ver status atual de todos os boletos
SELECT 
  id,
  nosso_numero,
  valor,
  data_vencimento,
  CASE 
    WHEN data_vencimento < CURRENT_DATE AND status != 'pago' THEN 'vencido'
    WHEN status = 'pago' THEN 'pago'
    ELSE 'pendente'
  END as status_calculado,
  status as status_salvo,
  situacao,
  valor_pago,
  data_hora_pagamento,
  sincronizado_em
FROM boletos_caixa
WHERE paciente_id = (SELECT id FROM pacientes WHERE empresa_id = 3 LIMIT 1)
ORDER BY data_vencimento;
```

### Opção 3: Cálculo automático no frontend

O sistema já calcula automaticamente:
- **Pendente**: Data de vencimento ainda não chegou
- **Vencido**: Data de vencimento passou e status não é 'pago'
- **Pago**: Status explícito 'pago' ou situação 'PAGO'/'LIQUIDADO' da Caixa

---

## 📊 Status possíveis

### Status interno (campo `status`):
- `pendente` - Aguardando pagamento
- `vencido` - Data de vencimento passou
- `pago` - Boleto foi pago
- `cancelado` - Boleto foi cancelado/baixado

### Situação Caixa (campo `situacao`):
- `EM ABERTO` - Boleto em aberto
- `PAGO` - Boleto pago
- `LIQUIDADO` - Boleto liquidado
- `BAIXADO` - Boleto baixado
- `CANCELADO` - Boleto cancelado

---

## 🔍 Troubleshooting

### Boletos não estão sendo criados?

1. **Verificar se fechamento está aprovado:**
```sql
SELECT id, paciente_id, empresa_id, aprovado 
FROM fechamentos 
WHERE id = SEU_FECHAMENTO_ID;
```

2. **Verificar se empresa_id é 3:**
```sql
SELECT empresa_id FROM fechamentos WHERE id = SEU_FECHAMENTO_ID;
```

3. **Verificar variáveis de ambiente:**
```bash
# No backend, verificar se estas variáveis estão configuradas:
echo $CAIXA_ID_BENEFICIARIO
echo $CAIXA_CLIENT_ID
echo $CAIXA_CLIENT_SECRET
echo $CAIXA_API_KEY
```

4. **Verificar logs do backend:**
   - Procure por `🏦 [CAIXA]` nos logs
   - Procure por erros relacionados à API Caixa

### Boletos criados mas não aparecem no portal?

1. **Verificar se paciente tem login:**
```sql
SELECT id, nome, email_login, tem_login, login_ativo 
FROM pacientes 
WHERE id = SEU_PACIENTE_ID;
```

2. **Verificar se boletos estão associados ao paciente:**
```sql
SELECT COUNT(*) 
FROM boletos_caixa 
WHERE paciente_id = SEU_PACIENTE_ID;
```

### Status não está atualizando?

1. **Verificar se sincronização foi executada:**
```sql
SELECT id, nosso_numero, sincronizado_em, status, situacao
FROM boletos_caixa
WHERE id = SEU_BOLETO_ID;
```

2. **Tentar sincronizar manualmente via API** (veja Opção 1 acima)

---

## ✅ Checklist de teste completo

- [ ] Paciente existe na empresa_id 3
- [ ] Fechamento criado
- [ ] Fechamento aprovado (aprovado = 'aprovado')
- [ ] Variáveis de ambiente configuradas
- [ ] Logs mostram criação de boletos
- [ ] Boletos salvos na tabela `boletos_caixa`
- [ ] Boletos aparecem no portal do paciente
- [ ] Status é calculado corretamente (pendente/vencido)
- [ ] Sincronização funciona (atualiza status da Caixa)
- [ ] Status 'pago' é detectado corretamente após pagamento

---

## 🎯 Próximos passos

1. **Implementar botão de sincronização no frontend**
2. **Criar job automático para sincronizar periodicamente** (ex: a cada hora)
3. **Implementar webhook da Caixa** (se disponível) para atualização instantânea

