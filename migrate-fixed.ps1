# Script corrigido de migracao para Fly.io

Write-Host "=== MIGRACAO RAILWAY -> FLY.IO ===" -ForegroundColor Green

# Verificar flyctl
if (Get-Command flyctl -ErrorAction SilentlyContinue) {
    Write-Host "flyctl encontrado" -ForegroundColor Green
} else {
    Write-Host "flyctl nao encontrado. Instale primeiro:" -ForegroundColor Red
    Write-Host "iwr https://fly.io/install.ps1 -useb | iex" -ForegroundColor Yellow
    exit
}

# Verificar login
$loginCheck = flyctl auth whoami 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "Logado no Fly.io" -ForegroundColor Green
} else {
    Write-Host "Faca login no Fly.io:" -ForegroundColor Yellow
    flyctl auth login
}

Write-Host ""
Write-Host "PASSO 1: Criando aplicacao no Fly.io..." -ForegroundColor Blue

# Navegar para backend
Set-Location backend

# Criar aplicacao no Fly.io
Write-Host "Criando aplicacao crminvest-backend..." -ForegroundColor Yellow
flyctl apps create crminvest-backend

Write-Host ""
Write-Host "PASSO 2: Configurando variaveis de ambiente..." -ForegroundColor Blue

# Solicitar variaveis
$SUPABASE_URL = Read-Host "SUPABASE_URL"
$SUPABASE_SERVICE_KEY = Read-Host "SUPABASE_SERVICE_KEY" 
$JWT_SECRET = Read-Host "JWT_SECRET"
$META_ACCESS_TOKEN = Read-Host "META_ACCESS_TOKEN"
$META_AD_ACCOUNT_ID = Read-Host "META_AD_ACCOUNT_ID"
$FRONTEND_URL = Read-Host "FRONTEND_URL"

# Configurar no Fly.io
Write-Host "Configurando variaveis..." -ForegroundColor Yellow
flyctl secrets set SUPABASE_URL="$SUPABASE_URL"
flyctl secrets set SUPABASE_SERVICE_KEY="$SUPABASE_SERVICE_KEY"
flyctl secrets set JWT_SECRET="$JWT_SECRET"
flyctl secrets set META_ACCESS_TOKEN="$META_ACCESS_TOKEN"
flyctl secrets set META_AD_ACCOUNT_ID="$META_AD_ACCOUNT_ID"
flyctl secrets set FRONTEND_URL="$FRONTEND_URL"

Write-Host ""
Write-Host "PASSO 3: Fazendo deploy..." -ForegroundColor Blue

# Deploy da aplicacao
flyctl deploy

Write-Host ""
Write-Host "MIGRACAO CONCLUIDA!" -ForegroundColor Green
Write-Host "Backend: https://crminvest-backend.fly.dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "Teste o backend: https://crminvest-backend.fly.dev/health" -ForegroundColor White
