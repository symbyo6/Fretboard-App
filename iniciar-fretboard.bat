@echo off
setlocal
cd /d "%~dp0"

echo Comprobando dependencias...
if not exist "node_modules" (
  call npm.cmd install
  if errorlevel 1 (
    echo No se pudieron instalar las dependencias.
    pause
    exit /b 1
  )
)

echo Generando la version standalone...
call npm.cmd run build
if errorlevel 1 (
  echo La compilacion fallo.
  pause
  exit /b 1
)

  if not exist "Fretboard-App-Standalone\electron.exe" (
    echo No se encontro el ejecutable standalone.
    pause
    exit /b 1
)

  robocopy "%~dp0dist" "%~dp0Fretboard-App-Standalone\resources\app\dist" /MIR /NFL /NDL /NJH /NJS >nul
echo Iniciando Fretboard App standalone...
  start "Fretboard App" "%~dp0Fretboard-App-Standalone\electron.exe"
echo La app standalone esta abierta.
pause
