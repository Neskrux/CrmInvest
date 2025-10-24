# Sistema de Notificações SDR Personalizadas

## 📋 Visão Geral

O sistema de notificações SDR personalizadas foi implementado para fornecer notificações únicas com fotos e sons específicos para cada SDR quando eles criam agendamentos.

## 🎯 Funcionalidades

### ✅ Notificações Personalizadas
- **Foto do SDR**: Cada notificação exibe a foto do SDR que criou o agendamento
- **Som Personalizado**: Cada SDR tem seu próprio arquivo de áudio de notificação
- **Toast Personalizado**: Notificação visual com foto e informações do SDR
- **Modal Detalhado**: Modal com foto grande do SDR e detalhes do agendamento

### 🎭 SDRs Mapeados

| ID | Nome | Foto | Som |
|---|---|---|---|
| 243 | Hilce | Hilce SDR.jpg | HILCE.mp3 |
| 242 | Richard | Richard SDR.jpg | HILCE.mp3 (temporário) |
| 241 | Jonathan | jonathan Corretor.jpg | JONHATAN.mp3 |
| 244 | Maria Eduarda | Maria Eduarda SDR.jpg | MARIA EDUARDA.mp3 |
| 240 | João | Joao Corretor.jpg | JOAO.mp3 |
| 239 | Renata | Renata SDR.jpg | RENATA.mp3 |

## 🔧 Implementação

### 1. Hook useSDRNotifications.js
- Gerencia conexão Socket.IO
- Mapeia SDRs por ID
- Toca sons personalizados
- Exibe toasts e modais personalizados

### 2. Integração no Dashboard
- Hook importado e usado no Dashboard.js
- Modal NewAgendamentoModal renderizado
- Notificações ativas para incorporadoras

### 3. Backend (agendamentos.controller.js)
- Evento `new-agendamento-incorporadora` atualizado
- Campo `sdr_id` incluído no evento
- Dados do SDR buscados e enviados

## 🎵 Arquivos de Áudio

Os arquivos de áudio estão localizados em `frontend/public/`:
- HILCE.mp3
- JONHATAN.mp3 (para Jonathan)
- MARIA EDUARDA.mp3
- JOAO.mp3
- RENATA.mp3
- audioNovoLead.mp3 (som padrão)

## 📸 Fotos dos SDRs

As fotos estão armazenadas no bucket `fotos-interno` do Supabase:
- URLs públicas configuradas no mapeamento
- Fotos exibidas em toasts e modais
- Fallback para foto padrão se não disponível

## 🚀 Como Funciona

1. **SDR cria agendamento** → Backend processa
2. **Evento Socket.IO emitido** → `new-agendamento-incorporadora`
3. **Hook recebe evento** → Identifica SDR pelo ID
4. **Som personalizado toca** → Arquivo específico do SDR
5. **Toast exibe** → Com foto e informações do SDR
6. **Modal abre** → Para admins/consultores internos

## 🔄 Fluxo de Dados

```
Agendamento Criado
       ↓
Backend (agendamentos.controller.js)
       ↓
Socket.IO Event: new-agendamento-incorporadora
       ↓
Frontend (useSDRNotifications.js)
       ↓
Mapeamento SDR por ID
       ↓
Som + Foto + Toast + Modal
```

## 🎨 Personalização

### Adicionar Novo SDR
1. Adicionar entrada no `sdrMapping` em `useSDRNotifications.js`
2. Adicionar arquivo de áudio em `frontend/public/`
3. Adicionar foto no bucket `fotos-interno`
4. Atualizar URL da foto no mapeamento

### Modificar Som Existente
1. Substituir arquivo em `frontend/public/`
2. Manter mesmo nome do arquivo
3. Reiniciar aplicação

### Modificar Foto Existente
1. Atualizar foto no bucket `fotos-interno`
2. Atualizar URL no `sdrMapping`
3. Reiniciar aplicação

## 🐛 Troubleshooting

### Som não toca
- Verificar se arquivo existe em `frontend/public/`
- Verificar console para erros de áudio
- Verificar permissões do navegador

### Foto não aparece
- Verificar URL da foto no Supabase
- Verificar se bucket `fotos-interno` é público
- Verificar console para erros de imagem

### Notificação não aparece
- Verificar se usuário é incorporadora
- Verificar conexão Socket.IO
- Verificar console para erros

## 📝 Logs

O sistema gera logs detalhados no console:
- `[SDR NOTIFICATIONS]` - Hook de notificações
- `[AUDIO PERSONALIZADO]` - Reprodução de áudio
- `[SOCKET.IO]` - Eventos Socket.IO

## 🔒 Permissões

- Apenas usuários incorporadoras recebem notificações
- Modal só aparece para admins e consultores internos
- Toast aparece para todos os usuários incorporadoras
