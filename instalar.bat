@echo off
title Secretario Escolar - Instalador Automatico
color 0A
echo.
echo  =============================================
echo    Secretario Escolar -- Instalador Chrome
echo  =============================================
echo.

:: ── 1. Fechar Chrome ──────────────────────────────────────────────────────────
echo  [1/5] Fechando o Chrome...
taskkill /f /im chrome.exe >nul 2>&1
timeout /t 2 /nobreak >nul

:: ── 2. Baixar extensao ────────────────────────────────────────────────────────
echo  [2/5] Baixando extensao...
curl -L "https://github.com/instaphmengenharia-coder/secretario-extension/archive/refs/heads/master.zip" -o "%TEMP%\se-ext.zip" --silent --show-error
if errorlevel 1 (
  color 0C
  echo  ERRO: Nao foi possivel baixar. Verifique sua internet.
  pause
  exit /b 1
)
echo  Download OK!

:: ── 3. Extrair arquivos ───────────────────────────────────────────────────────
echo  [3/5] Instalando arquivos...
if exist "%USERPROFILE%\secretario-extension" rmdir /s /q "%USERPROFILE%\secretario-extension"
powershell -Command "Expand-Archive -Path '%TEMP%\se-ext.zip' -DestinationPath '%TEMP%\se-ext-tmp' -Force"
xcopy "%TEMP%\se-ext-tmp\secretario-extension-master" "%USERPROFILE%\secretario-extension" /E /Y /Q >nul
rmdir /s /q "%TEMP%\se-ext-tmp" >nul 2>&1
del "%TEMP%\se-ext.zip" >nul 2>&1
echo  Arquivos OK!

:: ── 4. Ativar modo desenvolvedor no Chrome ────────────────────────────────────
echo  [4/5] Ativando modo desenvolvedor...
powershell -NoProfile -Command ^
  "$f = \"$env:LOCALAPPDATA\Google\Chrome\User Data\Local State\"; ^
   if (Test-Path $f) { ^
     $j = Get-Content $f -Raw | ConvertFrom-Json; ^
     if (-not $j.PSObject.Properties['extensions']) { $j | Add-Member -Type NoteProperty -Name extensions -Value ([PSCustomObject]@{}); } ^
     if (-not $j.extensions.PSObject.Properties['ui']) { $j.extensions | Add-Member -Type NoteProperty -Name ui -Value ([PSCustomObject]@{}); } ^
     $j.extensions.ui | Add-Member -Type NoteProperty -Name developer_mode -Value $true -Force; ^
     $j | ConvertTo-Json -Depth 30 | Set-Content $f -Encoding UTF8; ^
     Write-Host '  Modo desenvolvedor ativado!'; ^
   } else { Write-Host '  Perfil Chrome nao encontrado, pulando...'; }"

:: ── 5. Abrir Chrome com a extensao instalada ──────────────────────────────────
echo  [5/5] Abrindo Chrome com extensao instalada...
set CHROME1="%PROGRAMFILES%\Google\Chrome\Application\chrome.exe"
set CHROME2="%PROGRAMFILES(X86)%\Google\Chrome\Application\chrome.exe"
set CHROME3="%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"

if exist %CHROME1% (
  start "" %CHROME1% --load-extension="%USERPROFILE%\secretario-extension" "https://nova-pasta-secretario.vercel.app"
) else if exist %CHROME2% (
  start "" %CHROME2% --load-extension="%USERPROFILE%\secretario-extension" "https://nova-pasta-secretario.vercel.app"
) else if exist %CHROME3% (
  start "" %CHROME3% --load-extension="%USERPROFILE%\secretario-extension" "https://nova-pasta-secretario.vercel.app"
) else (
  color 0E
  echo  Chrome nao encontrado no local padrao.
  echo  Abra o Chrome manualmente, va em chrome://extensions,
  echo  e carregue a pasta: %USERPROFILE%\secretario-extension
  pause
  exit /b 0
)

echo.
color 0A
echo  =============================================
echo   PRONTO! Extensao instalada com sucesso!
echo   O site foi aberto no Chrome.
echo   Procure o badge "EXT ON" verde no topo.
echo  =============================================
echo.
timeout /t 5 /nobreak >nul
