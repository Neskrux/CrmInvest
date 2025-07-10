# 📱 Página de Captura de Leads

## 🎯 Objetivo

Esta página foi criada especificamente para capturar leads através de redes sociais (Instagram, Facebook, WhatsApp) com um design profissional e otimizado para conversão.

## 🌐 Acesso

### URL da Página de Captura:
- **Produção**: `https://seudominio.com/captura-lead`
- **Desenvolvimento**: `http://localhost:3000/captura-lead`

### URL da Página de Sucesso:
- **Produção**: `https://seudominio.com/captura-sucesso`
- **Desenvolvimento**: `http://localhost:3000/captura-sucesso`

## 🎨 Design e Características

### Visual Profissional
- **Gradiente moderno** com cores azul e roxo
- **Glassmorphism** com blur effects
- **Animações sutis** para melhor experiência
- **Totalmente responsivo** para mobile e desktop

### Elementos de Conversão
- ✨ **Benefícios destacados**: Consulta gratuita, profissionais qualificados, tecnologia avançada
- 🏆 **Depoimentos sociais**: Avaliações 5 estrelas
- 🔒 **Badges de segurança**: Dados protegidos, sem compromisso
- 📱 **Botão WhatsApp** na página de sucesso

## 📝 Formulário de Captura

### Campos Obrigatórios
- **Nome Completo** (mínimo 2 caracteres)
- **WhatsApp** (formato brasileiro com máscara)
- **CPF** (formato brasileiro com máscara)

### Campos Opcionais
- **Tipo de Tratamento** (Estético, Odontológico, Ambos)
- **Observações** (campo livre para expectativas)

### Validações
- Validação em tempo real dos campos
- Formatação automática do telefone
- Mensagens de erro claras e amigáveis

## 🔧 Integração Técnica

### Endpoint da API
```
POST /api/leads/cadastro
Content-Type: application/json

{
  "nome": "João Silva",
  "telefone": "(11) 99999-9999",
  "cpf": "123.456.789-00",
  "tipo_tratamento": "Estético",
  "observacoes": "Quero melhorar meu sorriso"
}
```

### Resposta de Sucesso
```json
{
  "id": 123,
  "message": "Cadastro realizado com sucesso! Entraremos em contato em breve.",
  "nome": "João Silva"
}
```

### Resposta de Erro
```json
{
  "error": "Nome e telefone são obrigatórios!"
}
```

## 📊 Fluxo do Lead

1. **Captura**: Lead preenche formulário
2. **Validação**: Sistema valida dados
3. **Armazenamento**: Lead salvo como "lead" no banco
4. **Sucesso**: Página de sucesso exibida
5. **Atribuição**: Aparece em "Novos Leads" no sistema
6. **Contato**: Consultor pega o lead e faz contato

## 🎯 Como Usar para Marketing

### Instagram Stories
1. Crie um story atrativo
2. Adicione o link: `seudominio.com/captura-lead`
3. Use call-to-action: "Deslize para cima" ou "Link na bio"

### Instagram Posts
1. Poste sobre transformações de sorrisos
2. Mencione "consulta gratuita" 
3. Direcione para o link na bio

### WhatsApp Status
1. Compartilhe o link diretamente
2. Adicione texto: "Agende sua consulta gratuita"

### Facebook Ads
1. Use o link como destino da campanha
2. Segmente por interesses em estética/odontologia
3. Otimize para "Conversões"

## 📱 Personalização

### Alterar Número do WhatsApp
No arquivo `frontend/src/components/CapturaSucesso.js`, linha 11:
```javascript
const phoneNumber = '5541997233138'; // Número configurado
```

### Alterar Textos
- **Título**: Edite em `CapturaLead.js` linha 89
- **Benefícios**: Edite em `CapturaLead.js` linhas 95-107
- **Depoimentos**: Edite em `CapturaLead.js` linhas 205-225

### Alterar Cores
No CSS inline do componente, modifique:
- **Gradiente principal**: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
- **Cor de destaque**: `#ffd700` (dourado)
- **Cor do botão**: `#667eea` (azul)

## 📈 Métricas Importantes

### Acompanhar no Sistema
1. **Dashboard**: Veja total de leads capturados
2. **Pacientes > Novos Leads**: Gerencie leads não atribuídos
3. **Funil de Conversão**: Acompanhe taxa de fechamento

### KPIs Sugeridos
- **Taxa de Conversão**: Visitantes → Leads
- **Tempo de Resposta**: Lead → Primeiro contato
- **Taxa de Fechamento**: Leads → Vendas
- **Ticket Médio**: Valor médio por fechamento

## 🔒 Segurança

### Validações Implementadas
- Sanitização de dados de entrada
- Validação de formato de telefone
- Prevenção de spam (validação de campos)
- Armazenamento seguro no banco de dados

### Dados Coletados
- Nome completo
- Telefone/WhatsApp
- CPF
- Tipo de tratamento (opcional)
- Observações (opcional)
- Data/hora do cadastro

## 🚀 Próximos Passos

1. **Teste a página**: Acesse e faça um cadastro de teste
2. **Verifique o backend**: Confirme que o lead aparece no sistema
3. **Personalize**: Ajuste textos, cores e número do WhatsApp
4. **Publique**: Compartilhe o link nas suas redes sociais
5. **Monitore**: Acompanhe as conversões no dashboard

## 📞 Suporte

Para dúvidas ou personalização adicional:
- Verifique os logs do backend em caso de erro
- Teste sempre em ambiente de desenvolvimento primeiro
- Mantenha backups antes de fazer alterações

---

**✨ Sua página de captura está pronta para converter visitantes em leads qualificados!** 