# Dockerfile para CrmInvest Backend - Fly.io
FROM node:22-alpine

# Instalar dependências básicas do sistema
RUN apk add --no-cache \
    python3 \
    py3-setuptools \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Criar diretório da aplicação
WORKDIR /app

# Definir proprietário do diretório
RUN chown -R node:node /app

# Copiar package files
COPY package*.json ./

# Instalar dependências
RUN npm ci --production

# Copiar código da aplicação
COPY --chown=node:node . .

# Criar diretório para uploads
RUN mkdir -p uploads && chown -R node:node uploads

# Mudar para usuário não-root
USER node

# Expor porta
EXPOSE 8080

# Comando de inicialização
CMD ["npm", "start"]


