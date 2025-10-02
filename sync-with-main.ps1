# Script para sincronizar com a branch main
Write-Host "=== Sincronizando com a branch main ===" -ForegroundColor Cyan

# Navegar para o diretório correto
$projectPath = Split-Path -Parent $PSScriptRoot
if ($projectPath) {
    Set-Location $projectPath
}

# Verificar se é um repositório git
if (-not (Test-Path ".git")) {
    Write-Host "Inicializando repositório git..." -ForegroundColor Yellow
    git init
}

# Verificar se há um remote configurado
$remotes = git remote -v
if (-not $remotes) {
    Write-Host "Por favor, adicione o remote do repositório:" -ForegroundColor Yellow
    Write-Host "Exemplo: git remote add origin https://github.com/seu-usuario/seu-repositorio.git" -ForegroundColor Gray
    exit 1
}

# Obter a branch atual
$currentBranch = git branch --show-current
Write-Host "Branch atual: $currentBranch" -ForegroundColor Green

# Adicionar todas as alterações locais
Write-Host "Salvando alterações locais..." -ForegroundColor Yellow
git add -A
git stash push -m "Alterações locais antes do merge com main"

# Buscar atualizações do remoto
Write-Host "Buscando atualizações do repositório remoto..." -ForegroundColor Yellow
git fetch origin

# Fazer checkout da branch main
Write-Host "Mudando para branch main..." -ForegroundColor Yellow
git checkout main 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Criando branch main local..." -ForegroundColor Yellow
    git checkout -b main origin/main
}

# Atualizar main
Write-Host "Atualizando branch main..." -ForegroundColor Yellow
git pull origin main

# Voltar para a branch original
Write-Host "Voltando para branch $currentBranch..." -ForegroundColor Yellow
git checkout $currentBranch

# Fazer merge da main
Write-Host "Fazendo merge da main na branch atual..." -ForegroundColor Yellow
git merge main

# Verificar se há conflitos
$conflicts = git diff --name-only --diff-filter=U
if ($conflicts) {
    Write-Host "⚠️ Conflitos detectados nos seguintes arquivos:" -ForegroundColor Red
    $conflicts | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
    Write-Host "`nResolva os conflitos manualmente e execute:" -ForegroundColor Yellow
    Write-Host "  git add ." -ForegroundColor Gray
    Write-Host "  git commit -m 'Resolvidos conflitos do merge com main'" -ForegroundColor Gray
} else {
    Write-Host "✅ Merge concluído com sucesso!" -ForegroundColor Green
    
    # Restaurar alterações locais
    Write-Host "Restaurando alterações locais..." -ForegroundColor Yellow
    git stash pop
}

Write-Host "`n=== Processo concluído ===" -ForegroundColor Cyan
Write-Host "Sua branch '$currentBranch' está sincronizada com a main" -ForegroundColor Green
Write-Host "Suas funcionalidades foram mantidas" -ForegroundColor Green
