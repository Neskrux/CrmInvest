# 🚀 DEPLOY CRM PARA PRODUÇÃO - VERCEL

## 📋 **PRÉ-REQUISITOS**

1. ✅ Conta no GitHub (gratuita)
2. ✅ Conta na Vercel (gratuita) - conectada ao GitHub
3. ✅ Dados do Supabase em mãos

---

## 🔧 **PASSO 1: Preparar Repositório Git**

```bash
# 1. Inicializar Git (se ainda não foi feito)
git init

# 2. Adicionar todos os arquivos
git add .

# 3. Commit inicial
git commit -m "CRM InvestMoney - Sistema completo"

# 4. Criar repositório no GitHub e conectar
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/crm-investmoney.git
git push -u origin main
```

---

## 🌐 **PASSO 2: Deploy na Vercel**

### **Via Website (Mais Fácil):**

1. Acesse: https://vercel.com
2. Clique em **"Import Project"**
3. Conecte seu GitHub
4. Selecione o repositório do CRM
5. Configure as variáveis de ambiente ⬇️

### **Variáveis de Ambiente Obrigatórias:**

```
SUPABASE_URL=https://sua-url-supabase.supabase.co
SUPABASE_ANON_KEY=sua-chave-anonima-supabase
JWT_SECRET=uma-chave-super-secreta-aqui
NODE_ENV=production
```

### **Como encontrar dados do Supabase:**
1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Settings > API**
4. Copie:
   - **URL** = SUPABASE_URL
   - **anon/public key** = SUPABASE_ANON_KEY

---

## ⚡ **PASSO 3: Build Automático**

A Vercel vai automaticamente:
1. ✅ Instalar dependências
2. ✅ Fazer build do React
3. ✅ Configurar servidor Node.js
4. ✅ Gerar URL de produção

**Deploy demora ~3-5 minutos**

---

## 🎯 **RESULTADO FINAL**

Você terá:
- 🌐 **URL pública** (ex: `crm-investmoney.vercel.app`)
- 📱 **Responsivo** (funciona mobile/desktop)
- 🔄 **Deploy automático** (toda mudança no Git = deploy novo)
- 🆓 **Gratuito** para projetos pequenos/médios

---

## 👥 **COMPARTILHAR COM EQUIPE**

1. Acesse a URL gerada pela Vercel
2. Compartilhe com a equipe:
   - **Admin**: `admin@investmoneysa.com.br` / `admin123`
   - **Consultores**: `nome@investmoneysa.com.br` / `123456`

---

## 🛠️ **UPDATES FUTUROS**

Para atualizações:
1. Faça mudanças no código
2. `git add .`
3. `git commit -m "Descrição da mudança"`
4. `git push`
5. **Deploy automático!** 🚀

---

## 🆘 **SUPORTE**

Se der erro:
1. Verifique variáveis de ambiente na Vercel
2. Confirme se Supabase está rodando
3. Veja logs no painel da Vercel

**🎉 Sistema pronto para produção!** 