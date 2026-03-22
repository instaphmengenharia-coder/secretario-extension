@echo off
title Secretario Escolar - Instalador da Extensao
color 0A
echo.
echo  =============================================
echo    Secretario Escolar -- Instalador Chrome
echo  =============================================
echo.
echo  Baixando extensao...
curl -L "https://github.com/instaphmengenharia-coder/secretario-extension/archive/refs/heads/master.zip" -o "%TEMP%\se-ext.zip" --silent --show-error
if errorlevel 1 (
  echo  ERRO: Nao foi possivel baixar. Verifique sua internet.
  pause
  exit /b 1
)
echo  Download concluido!
echo.
echo  Extraindo arquivos...
if exist "%USERPROFILE%\secretario-extension" rmdir /s /q "%USERPROFILE%\secretario-extension"
powershell -Command "Expand-Archive -Path '%TEMP%\se-ext.zip' -DestinationPath '%TEMP%\se-ext-tmp' -Force"
xcopy "%TEMP%\se-ext-tmp\secretario-extension-master" "%USERPROFILE%\secretario-extension" /E /Y /Q >nul
rmdir /s /q "%TEMP%\se-ext-tmp"
del "%TEMP%\se-ext.zip"
echo  Arquivos extraidos!
echo.
echo  =============================================
echo   PRONTO! Agora faca o seguinte no Chrome:
echo  =============================================
echo.
echo   1. A pagina chrome://extensions vai abrir
echo   2. Ative o "Modo do desenvolvedor" (canto direito)
echo   3. Clique em "Carregar sem compactacao"
echo   4. Selecione a pasta:
echo      %USERPROFILE%\secretario-extension
echo.
echo  Abrindo chrome://extensions...
start chrome "chrome://extensions"
echo.
pause
