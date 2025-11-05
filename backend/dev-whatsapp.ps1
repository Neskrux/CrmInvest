# ===== CONFIG =====
$BackendUrlLocal = "http://localhost:5000"
$NgrokCmd = "ngrok http 5000"
$TwilioSandboxConsoleUrl = "https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn"
$EMAIL = "admin@crm.com"                               # ajuste aqui
$SENHA = "adminsolumn@2025"                            # ajuste aqui
$AutoLogin = $true
# ===================

function Wait-UrlOk($url, $timeoutSec=30) {
  $sw = [Diagnostics.Stopwatch]::StartNew()
  while ($sw.Elapsed.TotalSeconds -lt $timeoutSec) {
    try { Invoke-RestMethod -Method Get -Uri $url | Out-Null; return $true } catch { Start-Sleep -Milliseconds 500 }
  }
  return $false
}

# 1) Backend up?
if (-not (Wait-UrlOk "$BackendUrlLocal/health" 30)) {
  Write-Host "Backend não respondeu em $BackendUrlLocal/health. Suba o backend e rode de novo." -ForegroundColor Red
  exit 1
}
Write-Host "Backend OK." -ForegroundColor Green

# 2) ngrok: tenta ler URL pública da API local
function Get-NgrokUrl() {
  try {
    $tunnels = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -Method Get
    # pega o primeiro túnel HTTPS
    $pub = $tunnels.tunnels | Where-Object { $_.proto -eq "https" } | Select-Object -First 1
    return $pub.public_url
  } catch {
    return $null
  }
}

$NgrokUrl = Get-NgrokUrl
if (-not $NgrokUrl) {
  Write-Host "Abrindo ngrok... (deixe aberto em outra janela caso já use)" -ForegroundColor Yellow
  Start-Process powershell -ArgumentList "-NoExit","-Command",$NgrokCmd | Out-Null
  Start-Sleep 2
  if (-not (Wait-UrlOk "http://127.0.0.1:4040/api/tunnels" 20)) {
    Write-Host "A API do ngrok não respondeu. Abra o ngrok manualmente: $NgrokCmd" -ForegroundColor Red
    exit 1
  }
  $NgrokUrl = Get-NgrokUrl
}
if (-not $NgrokUrl) { Write-Host "Não foi possível obter a URL pública do ngrok." -ForegroundColor Red; exit 1 }
Write-Host "ngrok URL: $NgrokUrl" -ForegroundColor Green

# SALVAR NGROK_URL na sessão
$env:NGROK_URL = $NgrokUrl
Write-Host "✅ NGROK_URL salvo em `$env:NGROK_URL" -ForegroundColor Green

# 3) Atualizar webhook do Sandbox (passo manual guiado)
Write-Host "Abra o Console do Twilio (Sandbox) e cole a URL:" -ForegroundColor Yellow
Write-Host "WHEN A MESSAGE COMES IN (POST): $NgrokUrl/api/whatsapp/webhook" -ForegroundColor Cyan
Write-Host "Link: $TwilioSandboxConsoleUrl" -ForegroundColor DarkCyan
Start-Process $TwilioSandboxConsoleUrl

# 4) Login automático para obter TOKEN
$TOKEN = $null
if ($AutoLogin) {
  try {
    $loginResp = Invoke-RestMethod -Method Post -Uri "$BackendUrlLocal/api/login" -ContentType 'application/json' -Body (@{ email=$EMAIL; senha=$SENHA } | ConvertTo-Json)
    $TOKEN = $loginResp.token
    if ($TOKEN) {
      # SALVAR TOKEN na sessão
      $env:API_BEARER = $TOKEN
      Write-Host "✅ TOKEN obtido e salvo em `$env:API_BEARER" -ForegroundColor Green
    }
  } catch { Write-Host "Falha no login automático: $($_.Exception.Message)" -ForegroundColor Yellow }
}

# 5) Função helper para enviar mensagem (usa variáveis de ambiente)
function Send-WhatsAppMessage {
  param(
    [Parameter(Mandatory=$true)]
    [string]$To,
    [Parameter(Mandatory=$true)]
    [string]$Body
  )
  
  if (-not $env:NGROK_URL) {
    Write-Host "❌ NGROK_URL não definido. Execute o script novamente." -ForegroundColor Red
    return
  }
  
  if (-not $env:API_BEARER) {
    Write-Host "❌ API_BEARER não definido. Faça login primeiro:" -ForegroundColor Red
    Write-Host "`$loginResp = Invoke-RestMethod -Method Post -Uri `"$BackendUrlLocal/api/login`" -ContentType 'application/json' -Body (@{ email='$EMAIL'; senha='$SENHA' } | ConvertTo-Json)"
    Write-Host "`$env:API_BEARER = `$loginResp.token" -ForegroundColor Yellow
    return
  }
  
  try {
    $result = Invoke-RestMethod -Method Post `
      -Uri "$env:NGROK_URL/api/whatsapp/send" `
      -Headers @{ Authorization = "Bearer $env:API_BEARER" } `
      -ContentType 'application/json' `
      -Body (@{ to=$To; body=$Body } | ConvertTo-Json)
    
    Write-Host "✅ Mensagem enviada! SID: $($result.data.sid)" -ForegroundColor Green
    return $result
  } catch {
    Write-Host "❌ Erro ao enviar: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
      Write-Host "Detalhes: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
    }
  }
}

# 6) Instruções finais
Write-Host "`n=== VARIÁVEIS SALVAS NA SESSÃO ===" -ForegroundColor Cyan
Write-Host "`$env:NGROK_URL = $env:NGROK_URL"
Write-Host "`$env:API_BEARER = $env:API_BEARER"
Write-Host "`n=== COMO USAR ===" -ForegroundColor Cyan
Write-Host "Opção 1 - Função helper:" -ForegroundColor Yellow
Write-Host "  Send-WhatsAppMessage -To '+554199196790' -Body 'Teste via função helper'" -ForegroundColor White
Write-Host "`nOpção 2 - Manual com variáveis:" -ForegroundColor Yellow
Write-Host "  Invoke-RestMethod -Method Post -Uri `"`$env:NGROK_URL/api/whatsapp/send`" -Headers @{ Authorization = `"Bearer `$env:API_BEARER`" } -ContentType 'application/json' -Body (@{ to='+554199196790'; body='Teste' } | ConvertTo-Json)" -ForegroundColor White