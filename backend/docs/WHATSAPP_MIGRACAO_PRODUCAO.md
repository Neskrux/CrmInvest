# Guia de Migração: WhatsApp Sandbox para Produção

## Visão Geral

Este guia explica como migrar da integração WhatsApp Sandbox para produção com número real do Twilio.

## Diferenças: Sandbox vs Produção

### Sandbox
- Número compartilhado: `+14155238886`
- Requer que destinatários "entrem" no Sandbox primeiro (`join <codigo>`)
- Limite: 1 mensagem a cada 3 segundos
- Ideal para testes e desenvolvimento

### Produção
- Número próprio registrado na WABA (WhatsApp Business Account)
- Pode enviar para qualquer número (respeitando templates aprovados)
- Sem limite de 3 segundos
- Requer templates aprovados para iniciar conversas fora da janela de 24h

## Checklist de Migração

### 1. Registrar WhatsApp Sender no Twilio

1. Acesse o [Twilio Console](https://console.twilio.com/)
2. Vá em **Messaging** > **WhatsApp Senders**
3. Clique em **Create WhatsApp Sender**
4. Escolha **Self/Embedded Signup**
5. Conecte sua WABA (WhatsApp Business Account)
6. Escolha/valide o número
7. Defina o Display Name
8. Complete a verificação da Meta

### 2. Configurar Messaging Service (Recomendado)

1. No Console → **Messaging** > **Services**
2. Crie ou selecione um Messaging Service
3. Vá em **Sender Pool**
4. Clique em **Add Sender**
5. Adicione seu WhatsApp Sender

**Benefícios:**
- Gerenciamento centralizado de números
- Use `MessagingServiceSid` em vez de `from`
- Mais fácil escalar

### 3. Configurar Variáveis de Ambiente

Adicione ao seu `.env`:

```env
# Modo do Twilio (production ou sandbox)
# Se não especificado, auto-detecta pelo número
TWILIO_MODE=production

# Messaging Service SID (recomendado para produção)
TWILIO_MESSAGING_SERVICE_SID=MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# OU número direto (se não usar Messaging Service)
TWILIO_WHATSAPP_NUMBER=whatsapp:+5511999999999

# URLs públicas para webhooks (produção)
TWILIO_WHATSAPP_WEBHOOK_URL=https://seu-dominio.com
TWILIO_WHATSAPP_STATUS_CALLBACK_URL=https://seu-dominio.com/api/whatsapp/status

# Se não especificar STATUS_CALLBACK_URL, usa automaticamente WEBHOOK_URL + /api/whatsapp/status
```

### 4. Configurar Webhooks no Twilio

#### Opção A: Via Messaging Service (Recomendado)

1. No Console → **Messaging** > **Services** > Seu Service
2. Vá em **Integration** > **Webhooks**
3. Configure:
   - **Inbound webhook**: `https://seu-dominio.com/api/whatsapp/webhook`
   - **Status callback**: `https://seu-dominio.com/api/whatsapp/status`

#### Opção B: Via WhatsApp Sender

1. No Console → **Messaging** > **WhatsApp Senders** > Seu Sender
2. Configure os mesmos webhooks acima

### 5. Aprovar Templates no Twilio

1. Acesse **Messaging** > **Content Template Builder**
2. Crie/edite seus templates:
   - `boleto_vence_3_dias`
   - `boleto_vence_1_dia`
   - `boleto_vence_hoje`
3. Submeta para aprovação do WhatsApp
4. Aguarde aprovação (geralmente até 48h)

### 6. Atualizar Content SIDs

Após aprovação dos templates:

1. Copie o Content SID de cada template aprovado
2. Atualize em `backend/config/whatsapp-templates.js`:

```javascript
BOLETO_VENCE_3_DIAS: {
    name: 'boleto_vence_3_dias',
    message: 'Seu boleto vence em 3 dias.',
    body: 'Olá {{1}}, seu boleto vence em 3 dias. Caso já tenha efetuado o pagamento, desconsidere esta mensagem.',
    contentSid: 'HXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', // ← Cole aqui após aprovação
    useSimpleText: false, // ← Mudar para false quando contentSid estiver configurado
    variables: ['nome']
},
```

## Enviando para Números Novos

### Cenário 1: Template Aprovado (Recomendado)

```javascript
// O sistema automaticamente usa template aprovado quando:
// - contentSid está configurado
// - useSimpleText = false

POST /api/whatsapp/notificacoes/boleto
{
  "paciente_id": 1228,
  "template_type": "BOLETO_VENCE_3_DIAS"
}
```

### Cenário 2: Janela de 24h (User-Initiated)

Se o usuário enviar uma mensagem primeiro, você pode responder sem template por 24h:

```javascript
POST /api/whatsapp/send
{
  "to": "+5511999999999",
  "body": "Olá! Como posso ajudar?"
}
```

## Validação de Webhook em Produção

A validação de webhook (`validateTwilioWebhook`) é **automaticamente habilitada** em produção.

**Importante:** Configure `TWILIO_AUTH_TOKEN` no `.env` para validação funcionar.

## Detecção Automática de Ambiente

O sistema detecta automaticamente o ambiente:

1. **Se `TWILIO_MODE` estiver definido**: usa essa configuração
2. **Se não**: detecta pelo número (`+14155238886` = Sandbox)
3. **Padrão**: Produção

## Rate Limiting

- **Sandbox**: 1 mensagem a cada 3 segundos
- **Produção**: 1000 mensagens por minuto

Aplicado automaticamente baseado no ambiente detectado.

## Troubleshooting

### Erro: "Número não autorizado"

**Sandbox:**
- Destinatário precisa enviar `join <codigo>` primeiro

**Produção:**
- Verifique se o número está registrado na WABA
- Verifique se o template está aprovado (para números novos)

### Erro: "Template não encontrado"

- Verifique se o Content SID está correto
- Verifique se o template está com status "Approved" no Twilio
- Verifique se `useSimpleText: false` quando usando contentSid

### Webhook não recebe mensagens

1. Verifique se a URL está acessível publicamente
2. Verifique se está usando HTTPS em produção
3. Verifique logs do servidor para erros
4. Use `verify-whatsapp-config.js` para validar configuração

### Status Callback não funciona

1. Verifique `TWILIO_WHATSAPP_STATUS_CALLBACK_URL`
2. Ou configure `TWILIO_WHATSAPP_WEBHOOK_URL` (usa automaticamente `/status`)
3. Verifique se a rota `/api/whatsapp/status` está acessível

## Script de Verificação

Execute para validar sua configuração:

```bash
node scripts/verify-whatsapp-config.js
```

O script verifica:
- Variáveis de ambiente configuradas
- Ambiente detectado (Sandbox/Produção)
- Conectividade com Twilio
- Configuração de templates

## Exemplo de Configuração Completa

### Arquivo `.env`

```env
# Ativação
TWILIO_ENABLED=true

# Credenciais
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=seu_auth_token_aqui

# Modo (ou auto-detecta)
TWILIO_MODE=production

# Messaging Service (recomendado)
TWILIO_MESSAGING_SERVICE_SID=MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# OU número direto (se não usar Messaging Service)
# TWILIO_WHATSAPP_NUMBER=whatsapp:+5511999999999

# Webhooks (produção)
TWILIO_WHATSAPP_WEBHOOK_URL=https://seu-dominio.com
TWILIO_WHATSAPP_STATUS_CALLBACK_URL=https://seu-dominio.com/api/whatsapp/status
```

### Arquivo `backend/config/whatsapp-templates.js`

```javascript
BOLETO_VENCE_3_DIAS: {
    name: 'boleto_vence_3_dias',
    message: 'Seu boleto vence em 3 dias.',
    body: 'Olá {{1}}, seu boleto vence em 3 dias. Caso já tenha efetuado o pagamento, desconsidere esta mensagem.',
    contentSid: 'HXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', // Após aprovação
    useSimpleText: false, // Mudar para false quando contentSid configurado
    variables: ['nome']
},
```

## Próximos Passos

1. ✅ Registrar WhatsApp Sender
2. ✅ Configurar Messaging Service (opcional mas recomendado)
3. ✅ Configurar variáveis de ambiente
4. ✅ Configurar webhooks no Twilio
5. ✅ Aguardar aprovação dos templates
6. ✅ Atualizar Content SIDs
7. ✅ Testar envio para número novo
8. ✅ Monitorar logs e status callbacks

## Referências

- [Twilio WhatsApp Documentation](https://www.twilio.com/docs/whatsapp)
- [Content Template Builder](https://www.twilio.com/docs/content/content-template-builder)
- [WhatsApp Sender Setup](https://www.twilio.com/docs/whatsapp/tutorial/connect-number-to-whatsapp-business)


