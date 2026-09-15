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

echo Generando la version web...
call npm.cmd run build
if errorlevel 1 (
  echo La compilacion fallo.
  pause
  exit /b 1
)

echo Iniciando Fretboard App en http://127.0.0.1:4173/
start "Fretboard Server" /min cmd /k npm.cmd run preview -- --host 127.0.0.1
timeout /t 5 /nobreak >nul
start "Fretboard App" http://127.0.0.1:4173/
echo La app esta abierta en el navegador. Puedes cerrar esta ventana cuando termines.
pause
