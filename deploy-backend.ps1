# Script para deploy do backend no Fly.io

Write-Host "=== DEPLOY BACKEND FLY.IO ===" -ForegroundColor Green
Write-Host ""

# Verificar se flyctl está instalado
if (Get-Command flyctl -ErrorAction SilentlyContinue) {
    Write-Host "✅ flyctl encontrado" -ForegroundColor Green
} else {
    Write-Host "❌ flyctl não encontrado. Instale primeiro:" -ForegroundColor Red
    Write-Host "   iwr https://fly.io/install.ps1 -useb | iex" -ForegroundColor Yellow
    exit 1
}

# Verificar login
$loginCheck = flyctl auth whoami 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Logado no Fly.io" -ForegroundColor Green
} else {
    Write-Host "🔐 Faça login no Fly.io:" -ForegroundColor Yellow
    flyctl auth login
}

Write-Host ""
Write-Host "📦 Fazendo deploy do backend..." -ForegroundColor Blue

# Navegar para backend e fazer deploy
Set-Location backend
flyctl deploy

Write-Host ""
Write-Host "🔍 Verificando health check..." -ForegroundColor Blue
Start-Sleep -Seconds 10

try {
    $healthResponse = Invoke-RestMethod -Uri "https://crminvest-backend.fly.dev/health" -Method GET
    if ($healthResponse.status -eq "OK") {
        Write-Host "✅ Health Check: OK" -ForegroundColor Green
    } else {
        Write-Host "❌ Health Check: FALHOU" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Health Check: ERRO - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎉 Deploy concluído!" -ForegroundColor Green
Write-Host "🌐 Backend: https://crminvest-backend.fly.dev" -ForegroundColor Cyan
Write-Host "📊 Monitoramento: https://fly.io/apps/crminvest-backend/monitoring" -ForegroundColor Cyan