# Configuração SendGrid para Produção

## Passo 1: Criar conta no SendGrid

1. Acesse: https://sendgrid.com/
2. Clique em "Start for Free"
3. Cadastre-se com seu email empresarial
4. Confirme o email

## Passo 2: Gerar API Key

1. Faça login no SendGrid
2. Vá para Settings > API Keys
3. Clique em "Create API Key"
4. Nome: "CRM Production"
5. Escolha "Restricted Access"
6. Permissões necessárias:
   - Mail Send: Full Access
   - Template Engine: Read Access (opcional)
   - Tracking: Read Access (opcional)
7. Clique em "Create & View"
8. **COPIE A API KEY** (só aparece uma vez)

## Passo 3: Verificar Domínio (Opcional mas Recomendado)

1. Vá para Settings > Sender Authentication
2. Clique em "Authenticate Your Domain"
3. Adicione seu domínio (ex: solumn.com)
4. Siga as instruções para adicionar os registros DNS

## Passo 4: Configurar Single Sender (Alternativa Rápida)

Se não conseguir verificar o domínio:
1. Vá para Settings > Sender Authentication
2. Clique em "Create a Single Sender"
3. Preencha:
   - From Name: Solumn - Sistema CRM
   - From Email: noreply@solumn.com (ou seu domínio verificado)
   - Reply To: noreply@solumn.com
   - Company: Solumn
   - Address, City, State, Country: Seus dados

## Passo 5: Configurar no .env de Produção

```env
# SendGrid Configuration for Production
EMAIL_SERVICE=sendgrid
EMAIL_USER=apikey
EMAIL_PASS=SG.sua-api-key-aqui-copiada-do-sendgrid
EMAIL_FROM=noreply@solumn.com
FRONTEND_URL=https://seu-dominio-producao.com
```

## Passo 6: Testar

1. Deploy da aplicação com as novas configurações
2. Teste o fluxo de "Esqueci minha senha"
3. Verifique se o email chega corretamente

## Vantagens do SendGrid vs Mailgun

### SendGrid ✅
- ✅ 100 emails/dia grátis
- ✅ Setup mais simples
- ✅ Melhor deliverability
- ✅ Interface mais amigável
- ✅ Não precisa domínio próprio inicialmente

### Mailgun
- ❌ Plano gratuito limitado
- ❌ Requer domínio próprio
- ❌ Setup mais complexo
- ❌ Interface menos intuitiva

## Configuração Alternativa com Domínio Próprio

Se você tiver um domínio verificado no SendGrid:

```env
EMAIL_SERVICE=sendgrid
EMAIL_USER=apikey
EMAIL_PASS=SG.sua-api-key
EMAIL_FROM=sistema@seudominio.com
```

## Monitoramento

No painel do SendGrid você pode ver:
- Emails enviados
- Taxa de entrega
- Bounces e spam
- Estatísticas de abertura

## Limites do Plano Gratuito

- 100 emails/dia
- Todas as funcionalidades básicas
- Suporte por email

Para mais emails, planos pagos começam em $15/mês.
