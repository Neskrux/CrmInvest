# 🔍 Diagnóstico: Erro "API Key Inválida"

## 📋 Checklist de Verificação

### 1. ✅ Verificar API Key no `.env`

Abra o arquivo `backend/.env` e verifique:

```env
CAIXA_API_KEY=l777123839e09849f9a0d5a3d972d35e6e
```

**Pontos a verificar:**
- [ ] API Key começa com letra **minúscula "l"** (não número "1")
- [ ] Não há espaços antes ou depois do valor
- [ ] Não há aspas ao redor do valor
- [ ] Total de 38 caracteres (incluindo o "l" inicial)
- [ ] Formato: `l` + 37 caracteres hexadecimais

**Formato correto:**
```
CAIXA_API_KEY=l777123839e09849f9a0d5a3d972d35e6e
```

**Formato incorreto (exemplos):**
```
CAIXA_API_KEY="l777123839e09849f9a0d5a3d972d35e6e"  ❌ (com aspas)
CAIXA_API_KEY= l777123839e09849f9a0d5a3d972d35e6e   ❌ (com espaço após =)
CAIXA_API_KEY=l777123839e09849f9a0d5a3d972d35e6e     ❌ (com espaços no final)
CAIXA_API_KEY=1777123839e09849f9a0d5a3d972d35e6e    ❌ (começa com número 1)
```

### 2. ✅ Verificar Ambiente (Sandbox vs Produção)

**Sandbox** (ambiente atual):
```env
CAIXA_TOKEN_URL=https://logindes.caixa.gov.br/auth/realms/internet/protocol/openid-connect/token
CAIXA_API_BASE_URL=https://api.caixa.gov.br:8443/sandbox/cobranca-bancaria
CAIXA_CLIENT_ID=cli-ext-41267440000197-1
CAIXA_CLIENT_SECRET=90b11321-8363-477d-bf16-8ccf1963916d
```

**Produção** (não usar com credenciais de Sandbox):
```env
CAIXA_TOKEN_URL=https://loginservicos.caixa.gov.br/auth/realms/internet/protocol/openid-connect/token
CAIXA_API_BASE_URL=https://api.caixa.gov.br:8443/cobranca-bancaria
```

### 3. ✅ Verificar se API Key está Vinculada ao Client ID

A API Key deve estar **vinculada** ao Client ID `cli-ext-41267440000197-1` no ambiente da Caixa.

**Como verificar:**
- Contactar área negocial da Caixa
- Confirmar que a API Key `l777123839e09849f9a0d5a3d972d35e6e` está:
  - ✅ Ativa
  - ✅ Vinculada ao Client ID `cli-ext-41267440000197-1`
  - ✅ Habilitada para o ambiente **Sandbox**

### 4. ✅ Logs Detalhados

Após reiniciar o servidor, os logs vão mostrar:

```
🔑 CAIXA_API_KEY carregada: l7771...35e6e
✅ CAIXA_API_KEY formato válido (length: 38)
```

Se aparecer:
```
⚠️ CAIXA_API_KEY pode estar incorreta...
```

Significa que o formato está errado.

### 5. ✅ Headers Enviados

Os logs também vão mostrar os headers sendo enviados:

```
📤 Headers da requisição: {
  'apikey (primeiros 15 chars)': 'l777123839e0984',
  'API Key length': 38,
  'API Key primeiro caractere': '"l"',
  'Ambiente': 'SANDBOX'
}
```

**Verificar se:**
- Primeiro caractere é `"l"` (não `"1"`)
- Length é 38
- Ambiente está correto

---

## 🔧 Correções Aplicadas no Código

1. **Trim automático** da API Key (remove espaços)
2. **Validação de formato** no construtor
3. **Logs detalhados** mostrando primeiro/último caractere e length
4. **Detecção específica** de erros de API Key
5. **Mensagens de erro melhoradas** com checklist de verificação

---

## 🚨 Próximos Passos

1. **Reiniciar o servidor backend** para carregar as mudanças
2. **Verificar os logs** ao iniciar o servidor
3. **Tentar gerar um boleto** e observar os logs detalhados
4. **Se ainda der erro "API Key inválida"**:
   - Verificar os logs que agora são mais detalhados
   - Confirmar com a Caixa se a API Key está vinculada ao Client ID
   - Confirmar se está ativa no ambiente Sandbox

---

## 📞 Informações para Contatar a Caixa

Ao contatar a área negocial da Caixa, forneça:

- **API Key**: `l777123839e09849f9a0d5a3d972d35e6e`
- **Client ID**: `cli-ext-41267440000197-1`
- **Ambiente**: Sandbox
- **CNPJ**: `41267440000197`
- **Empresa**: INVESTMONEY SECURITIZADORA DE CREDITOS S/A

**Perguntas específicas:**
1. A API Key `l777123839e09849f9a0d5a3d972d35e6e` está vinculada ao Client ID `cli-ext-41267440000197-1`?
2. A API Key está ativa e habilitada para o ambiente Sandbox?
3. Há algum processo de ativação pendente?
4. A API Key está associada ao CNPJ `41267440000197`?


