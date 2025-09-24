# setup-env.ps1 - Script para configurar variáveis de ambiente no Fly.io

Write-Host "🔧 Configurando variáveis de ambiente no Fly.io..." -ForegroundColor Green

# Verificar se flyctl está instalado
try {
    $null = Get-Command flyctl -ErrorAction Stop
    Write-Host "✅ flyctl encontrado" -ForegroundColor Green
} catch {
    Write-Host "❌ flyctl não encontrado. Instale primeiro!" -ForegroundColor Red
    exit 1
}

# Verificar se está logado no Fly.io
try {
    $null = flyctl auth whoami 2>$null
    Write-Host "✅ Logado no Fly.io" -ForegroundColor Green
} catch {
    Write-Host "🔐 Faça login no Fly.io primeiro:" -ForegroundColor Yellow
    flyctl auth login
    exit 1
}

Write-Host ""
Write-Host "📝 Você precisa fornecer as seguintes variáveis de ambiente:" -ForegroundColor Yellow
Write-Host "   (Copie os valores do dashboard do Railway)" -ForegroundColor Gray
Write-Host ""

# Solicitar variáveis de ambiente
$SUPABASE_URL = Read-Host "SUPABASE_URL"
$SUPABASE_SERVICE_KEY = Read-Host "SUPABASE_SERVICE_KEY"
$JWT_SECRET = Read-Host "JWT_SECRET"
$META_ACCESS_TOKEN = Read-Host "META_ACCESS_TOKEN"
$META_AD_ACCOUNT_ID = Read-Host "META_AD_ACCOUNT_ID"
$FRONTEND_URL = Read-Host "FRONTEND_URL (URL do seu frontend no Vercel)"

Write-Host ""
Write-Host "🔧 Configurando variáveis no Fly.io..." -ForegroundColor Blue

# Configurar variáveis de ambiente
flyctl secrets set SUPABASE_URL="$SUPABASE_URL"
flyctl secrets set SUPABASE_SERVICE_KEY="$SUPABASE_SERVICE_KEY"
flyctl secrets set JWT_SECRET="$JWT_SECRET"
flyctl secrets set META_ACCESS_TOKEN="$META_ACCESS_TOKEN"
flyctl secrets set META_AD_ACCOUNT_ID="$META_AD_ACCOUNT_ID"
flyctl secrets set FRONTEND_URL="$FRONTEND_URL"

Write-Host ""
Write-Host "✅ Variáveis de ambiente configuradas com sucesso!" -ForegroundColor Green
Write-Host "🚀 Agora você pode fazer o deploy com: flyctl deploy" -ForegroundColor Cyan


