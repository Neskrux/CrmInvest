#!/bin/bash
# deploy-fly.sh - Script para deploy no Fly.io

echo "🚀 Iniciando deploy do CrmInvest Backend para Fly.io..."

# Verificar se flyctl está instalado
if ! command -v flyctl &> /dev/null; then
    echo "❌ flyctl não encontrado. Instale em: https://fly.io/docs/hands-on/install-flyctl/"
    exit 1
fi

# Verificar se está logado no Fly.io
if ! flyctl auth whoami &> /dev/null; then
    echo "🔐 Faça login no Fly.io:"
    flyctl auth login
fi

# Navegar para o diretório do backend
cd backend

# Deploy da aplicação
echo "📦 Fazendo deploy..."
flyctl deploy

echo "✅ Deploy concluído!"
echo "🌐 Sua aplicação estará disponível em: https://crminvest-backend.fly.dev"


