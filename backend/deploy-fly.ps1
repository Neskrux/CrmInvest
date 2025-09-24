# deploy-fly.ps1 - Script PowerShell para deploy no Fly.io

Write-Host "🚀 Iniciando deploy do CrmInvest Backend para Fly.io..." -ForegroundColor Green

# Verificar se flyctl está instalado
try {
    $null = Get-Command flyctl -ErrorAction Stop
    Write-Host "✅ flyctl encontrado" -ForegroundColor Green
} catch {
    Write-Host "❌ flyctl não encontrado. Instale em: https://fly.io/docs/hands-on/install-flyctl/" -ForegroundColor Red
    exit 1
}

# Verificar se está logado no Fly.io
try {
    $null = flyctl auth whoami 2>$null
    Write-Host "✅ Logado no Fly.io" -ForegroundColor Green
} catch {
    Write-Host "🔐 Faça login no Fly.io:" -ForegroundColor Yellow
    flyctl auth login
}

# Navegar para o diretório do backend
Set-Location backend

# Deploy da aplicação
Write-Host "📦 Fazendo deploy..." -ForegroundColor Blue
flyctl deploy

Write-Host "✅ Deploy concluído!" -ForegroundColor Green
Write-Host "🌐 Sua aplicação estará disponível em: https://crminvest-backend.fly.dev" -ForegroundColor Cyan


