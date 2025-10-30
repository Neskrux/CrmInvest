# ✅ Checklist de Implementação - Portal do Paciente

## ✅ O que já está implementado:

### Backend
- [x] Campos adicionados na tabela pacientes (via código)
- [x] Endpoints criados:
  - [x] `POST /api/pacientes/:id/criar-login`
  - [x] `PUT /api/pacientes/:id/atualizar-login`
  - [x] `PUT /api/pacientes/:id/desativar-login`
- [x] Sistema de autenticação atualizado para suportar pacientes
- [x] Rotas registradas no `pacientes.routes.js`

### Frontend
- [x] Componente `ModalCriarLoginPaciente` criado
- [x] Botão "Criar Login" no modal de visualização de paciente
- [x] Rotas do paciente criadas no `App.js`
- [x] Componentes criados:
  - [x] `DashboardPaciente`
  - [x] `AgendamentosPaciente`
  - [x] `MeusDocumentosPaciente`
  - [x] `MeusBoletosPaciente`
- [x] Navegação no sidebar para pacientes
- [x] `AuthContext` atualizado com `isPaciente` e `pacienteId`

### Banco de Dados
- [x] Script SQL de migration criado (`migration_adicionar_login_pacientes.sql`)
- [x] Script SQL para criar paciente de teste (`script_criar_paciente_teste.sql`)

---

## ⚠️ O que falta implementar:

### 1. Banco de Dados
- [ ] **EXECUTAR** a migration SQL (`migration_adicionar_login_pacientes.sql`) no Supabase
- [ ] **EXECUTAR** o script de teste (`script_criar_paciente_teste.sql`) para criar paciente de teste

### 2. Backend - Endpoints específicos do paciente
- [ ] `GET /api/paciente/dashboard` - Dados do dashboard do paciente
- [ ] `GET /api/paciente/agendamentos` - Listar agendamentos do paciente
- [ ] `GET /api/paciente/documentos` - Listar documentos do paciente
- [ ] `GET /api/paciente/boletos` - Listar boletos do paciente

### 3. Frontend - Lógica de busca de dados
- [ ] Implementar `fetchDashboardData()` no `DashboardPaciente`
- [ ] Implementar `fetchAgendamentos()` no `AgendamentosPaciente`
- [ ] Implementar `fetchDocumentos()` no `MeusDocumentosPaciente`
- [ ] Implementar `fetchBoletos()` no `MeusBoletosPaciente`

### 4. Integração com API Caixa (empresa_id 3)
- [ ] Criar serviço de autenticação OAuth2 com Caixa
- [ ] Implementar criação de boletos via API Caixa
- [ ] Implementar consulta de boletos via API Caixa
- [ ] Implementar atualização de status de boletos

### 5. Segurança e Validações
- [ ] Verificar se paciente só vê seus próprios dados (filtros automáticos)
- [ ] Validar permissões em todos os endpoints do paciente
- [ ] Adicionar logs de acesso do paciente

---

## 🧪 Como testar:

### Passo 1: Executar Migration
```sql
-- Execute no Supabase SQL Editor
-- Arquivo: migration_adicionar_login_pacientes.sql
```

### Passo 2: Criar Paciente de Teste
```sql
-- Execute no Supabase SQL Editor
-- Arquivo: script_criar_paciente_teste.sql
-- 
-- Credenciais de teste:
-- Email: paciente.teste@email.com
-- Senha: 123456
```

### Passo 3: Testar Login
1. Acesse a página de login
2. Use as credenciais: `paciente.teste@email.com` / `123456`
3. Verifique se redireciona para o dashboard do paciente
4. Verifique se as rotas estão funcionando

### Passo 4: Testar Criação de Login pela Clínica
1. Faça login como clínica
2. Acesse um paciente
3. Clique em "Criar Login"
4. Preencha email e senha
5. Verifique se o login foi criado com sucesso

---

## 📝 Notas Importantes:

1. **Hash da Senha**: O hash no script de teste pode precisar ser regenerado. Use o script `gerar_hash_senha.js` ou gere diretamente:
   ```bash
   node -e "const bcrypt = require('bcrypt'); bcrypt.hash('123456', 10).then(hash => console.log(hash));"
   ```

2. **empresa_id**: Ajuste o `empresa_id` no script de teste conforme necessário (padrão: 3)

3. **clinica_id**: O script pega automaticamente a primeira clínica disponível. Se quiser especificar uma clínica específica, altere a linha:
   ```sql
   clinica_id,
   ```
   Para:
   ```sql
   clinica_id, -- Substitua pelo ID da clínica desejada
   ```

4. **Campos Opcionais**: Alguns campos podem não existir na sua tabela. Ajuste conforme necessário.

---

## 🚀 Próximos Passos Recomendados:

1. Executar migrations SQL
2. Criar paciente de teste
3. Testar login do paciente
4. Implementar endpoints backend específicos
5. Implementar busca de dados nos componentes
6. Integrar com API Caixa (fase 2)

