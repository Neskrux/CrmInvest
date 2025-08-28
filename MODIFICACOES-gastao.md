# Histórico de Modificações — branch `gastao`

## Resumo Geral
Esta branch implementou e corrigiu diversas funcionalidades no CRM, incluindo:

- Ajustes e correções no fluxo de perfil de usuário (backend e frontend)
- Refatoração e correção do fluxo de conexão WhatsApp (QR code)
- Padronização de cidades/estados em formulários
- Melhorias de segurança e UX

---

## Backend (`backend/`)

### WhatsApp
- **Forçado reset de sessão e QR code:**
  - Adicionado método `resetSession` na classe `WhatsAppService` para apagar a sessão e garantir novo QR code.
  - `connectToWhatsApp` agora aceita parâmetro `forceReset`.
  - Endpoint `/api/whatsapp/connect` aceita `{ forceReset: true }` no body e passa para o serviço.
- **Ajuste de desconexão:**
  - Endpoint `/api/whatsapp/disconnect` limpa sessão e arquivos de autenticação.
- **Emissão de status:**
  - Sempre emite evento `whatsapp:status` com QR code atualizado.

### Usuários/Perfil
- **Upload de foto de perfil:**
  - Criada coluna `profile_picture` na tabela `usuarios` (no Supabase).
- **Ajustes de segurança:**
  - Correção de checagem de email e senha.

---

## Frontend (`frontend/`)

### Perfil de Usuário
- **Formulário de perfil:**
  - Permite alteração de senha com validação.

### WhatsApp
- **Fluxo de conexão:**
  - Botão "Conectar WhatsApp" agora sempre envia `{ forceReset: true }` para garantir novo QR code.
  - Exibição do QR code corrigida.
- **UX:**
  - Loading, status e mensagens de erro/sucesso aprimorados.

### Formulários de cidades/estados
- **Padronização:**
  - Dropdowns em cascata e normalização de texto nos formulários de Pacientes e Clínicas.

---

## Integrações e Segurança
- **WhatsApp:**
  - Sessão sempre reiniciada ao conectar para garantir QR code novo.

---