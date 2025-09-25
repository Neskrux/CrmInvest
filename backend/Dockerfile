# Dockerfile para CrmInvest Backend - Fly.io
FROM node:18-alpine

# Instalar dependências do sistema necessárias para WhatsApp Web.js e compilação
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    xvfb \
    dbus \
    python3 \
    py3-setuptools \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Configurar Puppeteer para usar Chromium instalado
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV DISPLAY=:99

# Usar usuário node existente (já vem na imagem Alpine)
# O usuário 'node' já existe na imagem node:18-alpine

# Criar diretório da aplicação
WORKDIR /app

# Definir proprietário do diretório
RUN chown -R node:node /app

# Copiar apenas package.json (sem lock file para forçar recompilação)
COPY package.json ./

# Instalar dependências (forçar recompilação completa sem lock file)
RUN npm install --production --build-from-source

# Copiar código da aplicação (excluindo node_modules e arquivos problemáticos)
COPY --chown=node:node . .

# Criar diretório para uploads
RUN mkdir -p uploads && chown -R node:node uploads

# Mudar para usuário não-root
USER node

# Expor porta
EXPOSE 8080

# Comando de inicialização
CMD ["npm", "start"]


