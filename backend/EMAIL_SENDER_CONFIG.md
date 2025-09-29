# Configuração de Email - Remetente Personalizado

## Problema
Quando você usa Gmail como serviço de email, o remetente sempre aparece como a conta Gmail que está enviando, mesmo configurando um EMAIL_FROM diferente.

## Soluções

### Opção 1: Configurar Alias no Gmail (Recomendada)

1. **Acesse as configurações do Gmail**:
   - Vá para https://mail.google.com
   - Clique na engrenagem > "Ver todas as configurações"

2. **Adicione um alias**:
   - Vá para a aba "Contas e Importação"
   - Em "Enviar email como", clique em "Adicionar outro endereço de email"
   - Digite: `noreply@solumn.com` ou o email que você preferir
   - Nome: `Solumn - Sistema CRM`

3. **Verificação**:
   - O Gmail pedirá para verificar o domínio
   - Você precisará ter acesso ao domínio solumn.com
   - Ou use um endereço que você controle

4. **Configurar no .env**:
   ```env
   EMAIL_SERVICE=gmail
   EMAIL_USER=gasesb26@gmail.com
   EMAIL_PASS=cztl qmho yeoi hbzg
   EMAIL_FROM=noreply@solumn.com
   ```

### Opção 2: Usar Sendgrid (Produção)

```env
EMAIL_SERVICE=sendgrid
EMAIL_USER=apikey
EMAIL_PASS=SG.sua-api-key-aqui
EMAIL_FROM=noreply@solumn.com
```

### Opção 3: Usar Mailgun com domínio próprio

```env
EMAIL_SERVICE=mailgun
EMAIL_USER=postmaster@mg.solumn.com
EMAIL_PASS=sua-api-key-do-mailgun
EMAIL_FROM=noreply@solumn.com
```

## Status Atual

Atualmente configurado com:
- **Nome de exibição**: "Solumn - Sistema CRM"
- **Email de envio**: gasesb26@gmail.com (conta Gmail)
- **Reply-to**: noreply@solumn.com

Isso fará com que:
- O nome apareça como "Solumn - Sistema CRM"
- O email de resposta seja noreply@solumn.com
- Mas o remetente real ainda será gasesb26@gmail.com

Para ter controle total do remetente, use as opções 2 ou 3.
