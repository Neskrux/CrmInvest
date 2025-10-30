# 📧 Roteiro para Contato com a Caixa - API Key não encontrada

## 📋 Informações para Fornecer à Caixa

### 1. Credenciais Recebidas
- **API Key:** `l777123839e09849f9a0d5a3d972d35e6e`
- **ClientID:** `cli-ext-41267440000197-1`
- **Secret:** `90b11321-8363-477d-bf16-8ccf1963916d`
- **Ambiente:** Sandbox (Testes)

### 2. Erro Recebido
```
Status: 400 Bad Request
Mensagem: "API Key não encontrada"
Endpoint: POST /v4/beneficiarios/1242669/boletos
```

### 3. O que Está Funcionando
✅ Token OAuth2 está sendo obtido com sucesso  
✅ Headers estão sendo enviados corretamente:
```
Authorization: Bearer {token}
Content-Type: application/json
x-api-key: l777123839e09849f9a0d5a3d972d35e6e
```

✅ Payload está no formato correto conforme Swagger:
```json
{
  "dados_cadastrais": {
    "numero_documento": "FEC-143-P1",
    "data_vencimento": "2025-11-30",
    "valor": 10,
    "tipo_especie": 4,
    "flag_aceite": "N",
    "data_emissao": "2025-10-30",
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

### 4. Perguntas para a Caixa

1. **A API Key precisa ser ativada/registrada na plataforma antes de usar?**
   - Se sim, qual o processo?
   - Quanto tempo leva para ativação?

2. **A API Key está realmente ativa no ambiente Sandbox?**
   - Podem confirmar se ela está registrada no sistema?

3. **O formato do header está correto?**
   - Estamos usando `x-api-key` (minúsculas)
   - Deve ser outro formato (`X-API-Key`, `api-key`, etc.)?

4. **Há algum processo adicional necessário?**
   - Alguma configuração no portal da Caixa?
   - Algum cadastro adicional do beneficiário com a API Key?

5. **Há algum delay/propagação após receber o e-mail?**
   - Quanto tempo leva para a API Key estar disponível?

6. **Podem verificar nos logs do lado deles?**
   - O que aparece quando tentamos fazer a requisição?
   - A API Key está chegando nos headers?

### 5. Informações Técnicas Adicionais

**URL Base:** `https://api.caixa.gov.br:8443/cobranca-bancaria`  
**Token URL:** `https://logindes.caixa.gov.br/auth/realms/internet/protocol/openid-connect/token`  
**ID Beneficiário:** `1242669`

**Request Headers Enviados:**
```
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
Content-Type: application/json
x-api-key: l777123839e09849f9a0d5a3d972d35e6e
```

**Response Recebida:**
```json
{
  "erro": "400",
  "mensagem": "API Key não encontrada"
}
```

## 📧 Contato

- **Email:** gefat11@caixa.gov.br
- **GEFAT** - Gerência Nacional Fábrica de Atacado

## ✅ Confirmação do E-mail Recebido

O e-mail oficial da Caixa confirma que:
- ✅ API Key está associada à empresa INVESTMONEY SECURITIZADORA DE CREDITOS S/A
- ✅ É de uso exclusivo
- ✅ Deve ser usada com ClientID e Secret para integração OAuth 2.0
- ✅ É para ambiente de testes (Sandbox)

---

**Conclusão:** O código está correto, o payload está correto, os headers estão corretos. O problema parece ser na configuração/ativação da API Key no lado da Caixa.

