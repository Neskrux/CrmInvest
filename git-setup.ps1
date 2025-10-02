# Script para configurar git e sincronizar com main
Write-Host "=== Configuração Git e Sincronização ===" -ForegroundColor Cyan

# Verificar se é um repositório git
if (-not (Test-Path ".git")) {
    Write-Host "❌ Este diretório não é um repositório git" -ForegroundColor Red
    Write-Host "`nPara configurar, execute os seguintes comandos:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  git init" -ForegroundColor Gray
    Write-Host "  git remote add origin [URL_DO_SEU_REPOSITORIO]" -ForegroundColor Gray
    Write-Host "  git fetch origin" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Depois execute este script novamente" -ForegroundColor Yellow
    exit 1
}

# Verificar remote
$remote = git remote -v | Select-String "origin"
if (-not $remote) {
    Write-Host "❌ Nenhum repositório remoto configurado" -ForegroundColor Red
    Write-Host "`nAdicione o remote com:" -ForegroundColor Yellow
    Write-Host "  git remote add origin [URL_DO_SEU_REPOSITORIO]" -ForegroundColor Gray
    exit 1
}

Write-Host "✅ Repositório configurado:" -ForegroundColor Green
Write-Host $remote -ForegroundColor Gray

# Verificar branch atual
$branch = git branch --show-current
if (-not $branch) {
    Write-Host "Criando branch inicial..." -ForegroundColor Yellow
    git checkout -b Boletos
    $branch = "Boletos"
}

Write-Host "`n📌 Branch atual: $branch" -ForegroundColor Cyan

# Salvar trabalho atual
Write-Host "`n💾 Salvando seu trabalho atual..." -ForegroundColor Yellow
git add -A
$hasChanges = git status --porcelain
if ($hasChanges) {
    git commit -m "WIP: Salvando alterações antes do merge com main"
}

# Buscar atualizações
Write-Host "`n🔄 Buscando atualizações do repositório..." -ForegroundColor Yellow
git fetch origin

# Verificar se main existe no remoto
$mainExists = git ls-remote --heads origin main
if (-not $mainExists) {
    Write-Host "❌ Branch 'main' não encontrada no remoto" -ForegroundColor Red
    Write-Host "Verifique o nome da branch principal (pode ser 'master')" -ForegroundColor Yellow
    exit 1
}

# Fazer merge com main
Write-Host "`n🔀 Fazendo merge com a branch main..." -ForegroundColor Cyan
git merge origin/main --no-edit

# Verificar conflitos
$conflicts = git diff --name-only --diff-filter=U
if ($conflicts) {
    Write-Host "`n⚠️ CONFLITOS DETECTADOS!" -ForegroundColor Red
    Write-Host "Arquivos com conflitos:" -ForegroundColor Yellow
    $conflicts | ForEach-Object { Write-Host "  📄 $_" -ForegroundColor Yellow }
    Write-Host "`nPara resolver:" -ForegroundColor Cyan
    Write-Host "1. Abra cada arquivo listado" -ForegroundColor White
    Write-Host "2. Procure por <<<<<<< HEAD" -ForegroundColor White
    Write-Host "3. Escolha qual versão manter" -ForegroundColor White
    Write-Host "4. Remova as marcações de conflito" -ForegroundColor White
    Write-Host "5. Execute: git add . && git commit -m 'Resolvidos conflitos'" -ForegroundColor Gray
} else {
    Write-Host "`n✅ Merge concluído com sucesso!" -ForegroundColor Green
    Write-Host "Sua branch '$branch' está atualizada com a main" -ForegroundColor Green
    Write-Host "Todas as suas funcionalidades foram mantidas" -ForegroundColor Green
}

Write-Host "`n=== Processo Finalizado ===" -ForegroundColor Cyan
