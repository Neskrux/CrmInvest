# 🔍 Análise Completa do Sistema de Notificações - Main

## 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Arquitetura Backend](#arquitetura-backend)
3. [Arquitetura Frontend](#arquitetura-frontend)
4. [Fluxo de Notificações](#fluxo-de-notificações)
5. [Eventos Socket.IO](#eventos-socketio)
6. [Comportamento Especial - Reload](#comportamento-especial---reload)
7. [Problemas Identificados](#problemas-identificados)

---

## 1. Visão Geral

O sistema de notificações da Incorporadora (`empresa_id = 5`) funciona através de **Socket.IO** para notificações em tempo real. Ele notifica sobre:
- ✅ **Novos Leads** (`new-lead-incorporadora`)
- ✅ **Novos Agendamentos** (`new-agendamento-incorporadora`)
- ✅ **Novos Fechamentos** (`new-fechamento-incorporadora`)

### Acesso
- **Permitido**: Apenas usuários com `empresa_id === 5` (Incorporadora)
- **Tipo de usuário**: Atualmente apenas `admin` pode receber notificações (linha 247 de `useIncorporadoraNotifications.js`)

---

## 2. Arquitetura Backend

### 2.1 Socket.IO Server (`backend/server.js`)

#### Inicialização
```javascript
// Linhas 196-208
if (!process.env.VERCEL && !process.env.DISABLE_WEBSOCKET) {
  io = new Server(server, {
    cors: {
      origin: ['http://localhost:3000', 'https://localhost:3000', process.env.FRONTEND_URL, /\.vercel\.app$/],
      methods: ['GET', 'POST']
    }
  });
}
```

#### Handler: `join-incorporadora-notifications` (Linhas 326-353)
```javascript
socket.on('join-incorporadora-notifications', (data) => {
  // Verifica se empresa_id === 5
  if (data.empresaId === 5) {
    socket.join('incorporadora-notifications');
    // Log de sucesso
  } else {
    // Acesso negado
  }
});
```

**Características:**
- ✅ Permite **TODOS** os usuários da incorporadora (qualquer tipo)
- ✅ Sala: `incorporadora-notifications`
- ✅ Validação: apenas `empresa_id === 5`

#### Handler: `lead-capturado` (Linhas 356-377)
```javascript
socket.on('lead-capturado', (data) => {
  // Notifica outros usuários (exceto quem capturou)
  socket.to('incorporadora-notifications').emit('lead-capturado-incorporadora', {...});
});
```

---

### 2.2 Controller: Novos Leads (`backend/controllers/pacientes.controller.js`)

#### Rota: `POST /api/leads/cadastro` (Linha 1361-1414)

**Condições para emitir evento:**
1. ✅ `req.io` existe (Socket.IO disponível)
2. ✅ `empresa_id === 5` (Incorporadora)
3. ✅ `!sdr_id` (Lead NÃO pré-atribuído a SDR)

**Dados enviados:**
```javascript
req.io.to('incorporadora-notifications').emit('new-lead-incorporadora', {
  leadId: data[0].id,
  nome: data[0].nome,
  telefone: data[0].telefone,
  cidade: data[0].cidade,
  estado: data[0].estado,
  empreendimento_id: data[0].empreendimento_id,
  consultor_nome: consultorData?.nome || 'Sem consultor',
  consultor_foto: consultorData?.foto_url || null,
  timestamp: new Date().toISOString()
});
```

**Busca dados do consultor/SDR** se `consultorId` existir:
- Nome e foto do consultor para exibir na notificação

---

### 2.3 Controller: Novos Agendamentos (`backend/controllers/agendamentos.controller.js`)

#### Rota: `POST /api/agendamentos` (Linhas 289-358)

**Condições para emitir evento:**
1. ✅ `req.io` existe
2. ✅ `(temSDR || temCorretor)` - tem `sdr_id` OU `consultor_interno_id`
3. ✅ `empresa_id === 5`

**Dados enviados:**
```javascript
req.io.to('incorporadora-notifications').emit('new-agendamento-incorporadora', {
  agendamentoId: data[0].id,
  paciente_nome: pacienteData?.nome || 'Cliente',
  paciente_telefone: pacienteData?.telefone || '',
  data_agendamento: data_agendamento,
  horario: horario,
  sdr_id: dadosAgendamento.sdr_id,
  sdr_nome: sdrData?.nome || 'SDR',
  sdr_foto: sdrData?.foto_url || null,
  sdr_musica: sdrData?.musica_url || null,
  consultor_interno_id: dadosAgendamento.consultor_interno_id,
  timestamp: new Date().toISOString()
});
```

**Busca dados do SDR/Corretor:**
- Nome, foto e música personalizada
- Dados do paciente

---

### 2.4 Controller: Novos Fechamentos (`backend/controllers/fechamentos.controller.js`)

#### Rota: `POST /api/fechamentos` (Linhas 383-445)

**Condições para emitir evento:**
1. ✅ `req.io` existe
2. ✅ `consultorInternoIdFinal` existe (tem corretor interno)
3. ✅ `req.user.empresa_id === 5`

**Dados enviados:**
```javascript
req.io.to('incorporadora-notifications').emit('new-fechamento-incorporadora', {
  fechamentoId: data[0].id,
  paciente_nome: pacienteData?.nome || 'Cliente',
  paciente_telefone: pacienteData?.telefone || '',
  valor_fechado: valorFechado,
  data_fechamento: data_fechamento,
  consultor_interno_id: consultorInternoIdFinal,
  corretor_nome: corretorData?.nome || 'Corretor',
  corretor_foto: corretorData?.foto_url || null,
  corretor_musica: corretorData?.musica_url || null,
  timestamp: new Date().toISOString()
});
```

**Busca dados do corretor:**
- Nome, foto e música personalizada
- Dados do paciente

---

## 3. Arquitetura Frontend

### 3.1 Hook: `useIncorporadoraNotifications` (`frontend/src/hooks/useIncorporadoraNotifications.js`)

#### Restrições de Acesso (Linha 247)
```javascript
// Permitir entrada APENAS para admin da incorporadora
if (user?.tipo !== 'admin' || user?.empresa_id !== 5) {
  return;
}
```

⚠️ **PROBLEMA IDENTIFICADO**: Apenas `admin` pode receber notificações, mas o backend permite qualquer tipo de usuário!

#### Conexão Socket.IO (Linhas 252-267)
```javascript
const newSocket = io(API_BASE_URL, {
  transports: ['websocket', 'polling'],
  forceNew: true, // Forçar nova conexão
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 20000,
  query: {
    tabId: `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId: user.id
  }
});
```

**Características:**
- ✅ `forceNew: true` - força nova conexão (permite múltiplas abas)
- ✅ Query params com `tabId` único
- ✅ Reconnection automático

#### Entrada no Grupo (Linhas 272-276)
```javascript
newSocket.emit('join-incorporadora-notifications', {
  userType: 'admin',
  userId: user.id,
  empresaId: user.empresa_id
});
```

---

### 3.2 Comportamento Especial: RELOAD Automático

#### ⚠️ COMPORTAMENTO CRÍTICO (Linhas 279-324)

Quando um novo lead chega via Socket.IO, o hook faz **RELOAD IMEDIATO DA PÁGINA**:

```javascript
newSocket.on('new-lead-incorporadora', (data) => {
  // 1. Salva notificação no localStorage
  localStorage.setItem('pending_notification', JSON.stringify({
    type: 'new-lead',
    data: data,
    timestamp: now
  }));
  
  // 2. RELOAD IMEDIATO
  window.location.reload();
  
  // Não executa resto do código (página recarrega)
});
```

**Motivo do Reload:**
- Linha 286: "Fazer refresh ANTES de mostrar a notificação para garantir sockets ativos"
- Isso força uma "limpeza" dos sockets e reconexão

#### Processamento Após Reload (Linhas 190-243)

Após o reload, o hook verifica se há notificação pendente no `localStorage`:

```javascript
useEffect(() => {
  const pendingNotification = localStorage.getItem('pending_notification');
  
  if (pendingNotification) {
    const notification = JSON.parse(pendingNotification);
    
    if (notification.type === 'new-lead') {
      // 1. Limpa localStorage
      localStorage.removeItem('pending_notification');
      
      // 2. Pré-carrega áudio
      const preloadAudio = new Audio(audioSource);
      preloadedAudioRef.current = preloadAudio;
      
      // 3. Mostra modal
      setNewLeadData(notification.data);
      setShowNewLeadModal(true);
    }
  }
}, [user?.id, user?.tipo, user?.empresa_id]);
```

---

### 3.3 Modal de Novo Lead

#### Componente `NewLeadModal` (Linhas 499-715)

**Características:**
- ✅ Modal fullscreen com backdrop blur
- ✅ z-index: 9999
- ✅ Exibe: Nome, Telefone, Cidade/Estado
- ✅ Animação: slideDown + pulse
- ✅ Badge "URGENTE" vermelho
- ✅ Logo no topo

**⚠️ PROBLEMA**: Modal não tem botão para capturar o lead! Apenas mostra informações.

#### Timer de 20 Segundos (Linhas 411-423)

```javascript
const mainTimer = setTimeout(() => {
  // Fecha modal automaticamente após 20s
  stopNotificationSound();
  setShowNewLeadModal(false);
  setNewLeadData(null);
}, 20000);
```

---

### 3.4 Sistema de Áudio

#### Função `playNotificationSound` (Linhas 29-186)

**Características:**
- ✅ Suporta música personalizada do corretor (`musicaUrl`)
- ✅ Fallback para `audioNovoLead.mp3` se não houver música personalizada
- ✅ Loop: `false` (toca uma vez e para)
- ✅ Volume: 1.0 (máximo)
- ✅ Pré-carregamento para iniciar mais rápido
- ✅ Múltiplas tentativas de autoplay (retry agressivo)

**Estratégia de Retry:**
- Tenta tocar imediatamente
- Retry com delays: 25ms, 50ms, 75ms, 100ms, 150ms, 200ms
- Listener para eventos: `loadstart`, `loadeddata`, `canplay`, `canplaythrough`
- Retry adicional: delays de 50ms até 3000ms

**Listener `ended`:**
- Quando música termina, fecha modal automaticamente (linha 73-88)

---

### 3.5 Uso no Dashboard (`frontend/src/components/Dashboard.js`)

```javascript
// Linha 20
const { showNewLeadModal, NewLeadModal } = useIncorporadoraNotifications();

// Renderização da modal (precisa ser encontrada no JSX)
```

---

## 4. Fluxo de Notificações

### 4.1 Fluxo de Novo Lead

```
1. Lead cadastrado via POST /api/leads/cadastro
   ↓
2. Backend verifica condições:
   - Socket.IO disponível? ✅
   - empresa_id === 5? ✅
   - !sdr_id? ✅
   ↓
3. Backend busca dados do consultor (se existir)
   ↓
4. Backend emite evento: new-lead-incorporadora
   → Sala: incorporadora-notifications
   ↓
5. Frontend recebe evento via Socket.IO
   ↓
6. Frontend salva no localStorage
   ↓
7. Frontend faz RELOAD DA PÁGINA ⚠️
   ↓
8. Após reload, frontend verifica localStorage
   ↓
9. Frontend mostra modal + toca música
   ↓
10. Timer de 20s fecha modal automaticamente
```

### 4.2 Fluxo de Novo Agendamento

```
1. Agendamento criado via POST /api/agendamentos
   ↓
2. Backend verifica condições:
   - Socket.IO disponível? ✅
   - (temSDR || temCorretor)? ✅
   - empresa_id === 5? ✅
   ↓
3. Backend busca dados do SDR/Corretor + Paciente
   ↓
4. Backend emite evento: new-agendamento-incorporadora
   ↓
5. Frontend recebe evento
   ↓
6. Frontend adiciona à lista de notificações
   ⚠️ NÃO há modal para agendamentos neste hook!
```

### 4.3 Fluxo de Novo Fechamento

```
1. Fechamento criado via POST /api/fechamentos
   ↓
2. Backend verifica condições:
   - Socket.IO disponível? ✅
   - consultorInternoIdFinal existe? ✅
   - empresa_id === 5? ✅
   ↓
3. Backend busca dados do corretor + paciente
   ↓
4. Backend emite evento: new-fechamento-incorporadora
   ↓
5. Frontend recebe evento
   ↓
6. Frontend adiciona à lista de notificações
   ⚠️ NÃO há modal para fechamentos neste hook!
```

---

## 5. Eventos Socket.IO

### 5.1 Eventos Recebidos pelo Frontend

| Evento | Handler | Ação |
|--------|---------|------|
| `new-lead-incorporadora` | Linha 279 | Salva localStorage + **RELOAD** |
| `lead-capturado-incorporadora` | Linha 327 | Fecha modal se for o lead capturado |
| `new-agendamento-incorporadora` | Linha 341 | Adiciona à lista de notificações |
| `connect` | Linha 352 | Re-entra no grupo ao reconectar |

### 5.2 Eventos Enviados pelo Frontend

| Evento | Quando | Dados |
|--------|--------|-------|
| `join-incorporadora-notifications` | Conexão inicial e reconexão | `{ userType, userId, empresaId }` |
| `lead-capturado` | (Não implementado no hook atual) | - |

---

## 6. Comportamento Especial - Reload

### 6.1 Por que Reload?

**Motivo mencionado no código (linha 286):**
> "Fazer refresh ANTES de mostrar a notificação para garantir sockets ativos"

**Análise:**
- ⚠️ Isso pode causar problemas de UX (flicker, perda de contexto)
- ⚠️ Pode perder notificações se múltiplas chegarem rapidamente
- ⚠️ Debounce de 2 segundos previne múltiplos reloads (linha 284)

### 6.2 Proteções Contra Reload Múltiplo

```javascript
// Linha 282-296
const lastRefresh = localStorage.getItem('last_notification_refresh');
const timeSinceLastRefresh = lastRefresh ? now - parseInt(lastRefresh) : Infinity;

if (existingNotification && timeSinceLastRefresh < 2000) {
  // Ignora se reload aconteceu há menos de 2s
  return;
}
```

---

## 7. Problemas Identificados

### 🔴 Problema 1: Restrição de Tipo de Usuário

**Frontend (`useIncorporadoraNotifications.js` linha 247):**
```javascript
if (user?.tipo !== 'admin' || user?.empresa_id !== 5) {
  return; // Só admin pode receber
}
```

**Backend (`server.js` linha 337):**
```javascript
if (data.empresaId === 5) {
  socket.join('incorporadora-notifications'); // Qualquer tipo pode entrar
}
```

**Consequência:**
- Backend permite qualquer tipo de usuário
- Frontend bloqueia tudo exceto `admin`
- ⚠️ Inconsistência!

### 🔴 Problema 2: Reload Automático

**Comportamento:**
- Toda vez que um novo lead chega, a página recarrega
- Isso pode causar:
  - Perda de contexto do usuário
  - Flicker visual
  - Problemas se múltiplas notificações chegarem rapidamente

**Sugestão:**
- Remover reload e usar notificação direta via Socket.IO
- Manter localStorage apenas como fallback para offline

### 🔴 Problema 3: Modal Sem Ação

**Problema:**
- Modal mostra informações do lead
- Mas não tem botão para "Capturar Lead"
- Timer fecha após 20s sem ação do usuário

**Consequência:**
- Usuário vê notificação mas não pode agir diretamente
- Precisa fechar modal e ir para página de pacientes

### 🔴 Problema 4: Agendamentos e Fechamentos Sem Modal

**Problema:**
- Eventos `new-agendamento-incorporadora` e `new-fechamento-incorporadora` são recebidos
- Mas apenas adicionados à lista de notificações
- ⚠️ Não há modal nem música para esses eventos

**Consequência:**
- Usuário pode não perceber novos agendamentos/fechamentos
- Apenas leads têm tratamento especial (modal + música)

### 🟡 Problema 5: Múltiplas Tentativas de Áudio

**Problema:**
- Sistema de retry muito agressivo (múltiplos delays)
- Pode causar múltiplas instâncias de áudio tentando tocar

**Consequência:**
- Logs excessivos no console
- Possível consumo de recursos

---

## 8. Resumo Executivo

### ✅ Funcionando
- Backend emite eventos corretamente
- Socket.IO conecta e entra no grupo
- Modal aparece após reload
- Música toca (com retry agressivo)
- Timer fecha modal após 20s

### ⚠️ Problemas
- Reload automático pode causar UX ruim
- Apenas `admin` pode receber (inconsistente com backend)
- Modal sem ação (não pode capturar lead)
- Agendamentos/fechamentos sem modal
- Retry de áudio muito agressivo

### 💡 Recomendações
1. Remover reload automático
2. Alinhar restrições frontend/backend
3. Adicionar botão "Capturar Lead" no modal
4. Criar modais para agendamentos e fechamentos
5. Reduzir agressividade do retry de áudio

---

**Documento gerado em:** 2025-10-29
**Baseado na branch:** main (commit 3fcd29c2)

