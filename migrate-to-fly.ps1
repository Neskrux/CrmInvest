# migrate-to-fly.ps1 - Script completo de migracao Railway -> Fly.io

Write-Host "MIGRACAO RAILWAY -> FLY.IO" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se flyctl esta instalado
try {
    $null = Get-Command flyctl -ErrorAction Stop
    Write-Host "flyctl encontrado" -ForegroundColor Green
} catch {
    Write-Host "flyctl nao encontrado. Instale primeiro:" -ForegroundColor Red
    Write-Host "   iwr https://fly.io/install.ps1 -useb | iex" -ForegroundColor Yellow
    exit 1
}

# Verificar se esta logado no Fly.io
try {
    $null = flyctl auth whoami 2>$null
    Write-Host "Logado no Fly.io" -ForegroundColor Green
} catch {
    Write-Host "Faca login no Fly.io:" -ForegroundColor Yellow
    flyctl auth login
}

Write-Host ""
Write-Host "PASSO 1: Configurar variaveis de ambiente" -ForegroundColor Blue
Write-Host "   (Copie os valores do dashboard do Railway)" -ForegroundColor Gray
Write-Host ""

# Solicitar variaveis de ambiente
$SUPABASE_URL = Read-Host "SUPABASE_URL"
$SUPABASE_SERVICE_KEY = Read-Host "SUPABASE_SERVICE_KEY"
$JWT_SECRET = Read-Host "JWT_SECRET"
$META_ACCESS_TOKEN = Read-Host "META_ACCESS_TOKEN"
$META_AD_ACCOUNT_ID = Read-Host "META_AD_ACCOUNT_ID"
$FRONTEND_URL = Read-Host "FRONTEND_URL (URL do seu frontend no Vercel)"

Write-Host ""
Write-Host "Configurando variaveis no Fly.io..." -ForegroundColor Blue

# Configurar variaveis de ambiente
flyctl secrets set SUPABASE_URL="$SUPABASE_URL"
flyctl secrets set SUPABASE_SERVICE_KEY="$SUPABASE_SERVICE_KEY"
flyctl secrets set JWT_SECRET="$JWT_SECRET"
flyctl secrets set META_ACCESS_TOKEN="$META_ACCESS_TOKEN"
flyctl secrets set META_AD_ACCOUNT_ID="$META_AD_ACCOUNT_ID"
flyctl secrets set FRONTEND_URL="$FRONTEND_URL"

Write-Host ""
Write-Host "PASSO 2: Fazendo deploy no Fly.io..." -ForegroundColor Blue

# Navegar para o diretorio do backend
Set-Location backend

# Deploy da aplicacao
flyctl deploy

Write-Host ""
Write-Host "MIGRACAO CONCLUIDA!" -ForegroundColor Green
Write-Host "Backend disponivel em: https://crminvest-backend.fly.dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "PROXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host "1. Teste o backend: https://crminvest-backend.fly.dev/health" -ForegroundColor White
Write-Host "2. Faca deploy do frontend atualizado no Vercel" -ForegroundColor White
Write-Host "3. Teste a aplicacao completa" -ForegroundColor White
Write-Host "4. Remova a aplicacao do Railway (apos confirmar que tudo funciona)" -ForegroundColor White