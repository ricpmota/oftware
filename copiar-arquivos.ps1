# Script para copiar arquivos do CENOFT/ADMIN para META/METAADMIN
# Execute com: .\copiar-arquivos.ps1

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   COPIA DE ARQUIVOS - CENOFT/ADMIN → META/METAADMIN          ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Verificar se estamos no diretório correto
if (-not (Test-Path "app\cenoft\page.tsx")) {
    Write-Host "❌ Erro: Arquivo app\cenoft\page.tsx não encontrado!" -ForegroundColor Red
    Write-Host "   Certifique-se de executar este script na raiz do projeto." -ForegroundColor Yellow
    exit 1
}

# Criar pastas se não existirem
Write-Host "📁 Criando pastas..." -ForegroundColor Yellow
if (-not (Test-Path "app\meta")) {
    New-Item -ItemType Directory -Path "app\meta" | Out-Null
    Write-Host "   ✓ app\meta criada" -ForegroundColor Green
} else {
    Write-Host "   ℹ app\meta já existe" -ForegroundColor Gray
}

if (-not (Test-Path "app\metaadmin")) {
    New-Item -ItemType Directory -Path "app\metaadmin" | Out-Null
    Write-Host "   ✓ app\metaadmin criada" -ForegroundColor Green
} else {
    Write-Host "   ℹ app\metaadmin já existe" -ForegroundColor Gray
}

Write-Host ""

# Copiar arquivo cenoft
Write-Host "📋 Copiando arquivos..." -ForegroundColor Yellow
if (Test-Path "app\cenoft\page.tsx") {
    Copy-Item "app\cenoft\page.tsx" "app\meta\page.tsx" -Force
    Write-Host "   ✓ app\cenoft\page.tsx → app\meta\page.tsx" -ForegroundColor Green
} else {
    Write-Host "   ❌ app\cenoft\page.tsx não encontrado!" -ForegroundColor Red
}

if (Test-Path "app\admin\page.tsx") {
    Copy-Item "app\admin\page.tsx" "app\metaadmin\page.tsx" -Force
    Write-Host "   ✓ app\admin\page.tsx → app\metaadmin\page.tsx" -ForegroundColor Green
} else {
    Write-Host "   ❌ app\admin\page.tsx não encontrado!" -ForegroundColor Red
}

Write-Host ""

# Verificar dependências
Write-Host "🔍 Verificando dependências..." -ForegroundColor Yellow

$missingFiles = @()

$requiredFiles = @(
    "components\EditModal.tsx",
    "components\EditResidenteForm.tsx",
    "components\EditLocalForm.tsx",
    "components\EditServicoForm.tsx",
    "components\EditEscalaForm.tsx",
    "components\FeriasCalendar.tsx",
    "types\auth.ts",
    "types\troca.ts",
    "types\ferias.ts",
    "types\mensagem.ts",
    "services\userService.ts",
    "services\mensagemService.ts",
    "lib\firebase.ts"
)

foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "   ✓ $file" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $file (NÃO ENCONTRADO)" -ForegroundColor Red
        $missingFiles += $file
    }
}

Write-Host ""

# Resumo final
if ($missingFiles.Count -eq 0) {
    Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║  ✅ SUCESSO! Todos os arquivos necessários existem!          ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Próximos passos:" -ForegroundColor Cyan
    Write-Host "   1. Teste as rotas /meta e /metaadmin no navegador"
    Write-Host "   2. Ajuste os textos/conteúdos se necessário"
    Write-Host "   3. Modifique permissões se desejar"
    Write-Host ""
} else {
    Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
    Write-Host "║  ⚠️  ATENÇÃO: Alguns arquivos estão faltando               ║" -ForegroundColor Yellow
    Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Arquivos faltando:" -ForegroundColor Red
    foreach ($file in $missingFiles) {
        Write-Host "   - $file" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "Os arquivos principais foram copiados, mas algumas funcionalidades"
    Write-Host "podem não funcionar sem os arquivos acima."
    Write-Host ""
}

Write-Host "✅ Copia concluída!" -ForegroundColor Green
Write-Host ""

