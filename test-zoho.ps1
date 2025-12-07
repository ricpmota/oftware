# Script de teste para Zoho Mail
Write-Host "🧪 Testando configuração do Zoho Mail..." -ForegroundColor Cyan
Write-Host ""

# Testar se as variáveis estão configuradas
Write-Host "1️⃣ Verificando variáveis de ambiente..." -ForegroundColor Yellow
$response = Invoke-WebRequest -Uri "http://localhost:3000/api/test-zoho-config" -ErrorAction SilentlyContinue
$config = $response.Content | ConvertFrom-Json

if ($config.hasZohoEmail -and $config.hasZohoPassword) {
    Write-Host "   ✅ Variáveis configuradas!" -ForegroundColor Green
    Write-Host "   📧 E-mail: $($config.emailPrefix)" -ForegroundColor Gray
    Write-Host "   🔑 Senha: $($config.passwordLength) caracteres" -ForegroundColor Gray
} else {
    Write-Host "   ❌ Variáveis NÃO configuradas!" -ForegroundColor Red
    Write-Host "   Por favor, adicione ZOHO_EMAIL e ZOHO_PASSWORD no .env.local" -ForegroundColor Yellow
    Write-Host "   E reinicie o servidor (Ctrl+C e depois npm run dev)" -ForegroundColor Yellow
    exit
}

Write-Host ""
Write-Host "2️⃣ Testando envio de e-mail..." -ForegroundColor Yellow
$body = @{
    to = "teste@exemplo.com"
    subject = "Teste Zoho Mail - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    html = "<p>Este é um teste de envio via Zoho Mail</p>"
} | ConvertTo-Json

try {
    $sendResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/send-email" -Method POST -Body $body -ContentType "application/json"
    $sendResult = $sendResponse.Content | ConvertFrom-Json
    if ($sendResult.success) {
        Write-Host "   ✅ E-mail enviado com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Erro ao enviar: $($sendResult.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Erro ao enviar e-mail: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "3️⃣ Testando leitura de e-mails..." -ForegroundColor Yellow
try {
    $readResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/read-emails?limit=5" -ErrorAction Stop
    $readResult = $readResponse.Content | ConvertFrom-Json
    Write-Host "   ✅ Leitura bem-sucedida!" -ForegroundColor Green
    Write-Host "   📬 E-mails encontrados: $($readResult.count)" -ForegroundColor Gray
    if ($readResult.count -gt 0) {
        Write-Host "   📧 Primeiro e-mail: $($readResult.emails[0].subject)" -ForegroundColor Gray
    }
} catch {
    $errorContent = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($errorContent)
    $errorJson = $reader.ReadToEnd() | ConvertFrom-Json
    Write-Host "   ❌ Erro ao ler e-mails: $($errorJson.error)" -ForegroundColor Red
    if ($errorJson.details) {
        Write-Host "   Detalhes: $($errorJson.details)" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "✅ Teste concluído!" -ForegroundColor Cyan

