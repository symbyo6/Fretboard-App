@echo off
setlocal

set "NODE_EXE="
if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE_EXE if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles(x86)%\nodejs\node.exe"
if not defined NODE_EXE for /f "delims=" %%F in ('where node.exe 2^>nul') do if not defined NODE_EXE set "NODE_EXE=%%F"

if not defined NODE_EXE (
  echo Node.js/npm was not found. Install Node.js or add it to PATH.
  exit /b 1
)

set "ESLINT_CLI=%CD%\node_modules\eslint\bin\eslint.js"
set "TSX_CLI=%CD%\node_modules\tsx\dist\cli.mjs"
set "VITE_CLI=%CD%\node_modules\vite\bin\vite.js"
if not exist "%ESLINT_CLI%" if not exist "%TSX_CLI%" if not exist "%VITE_CLI%" (
  echo Project dependencies are missing. Run npm install first.
  exit /b 1
)

echo Running lint...
call "%NODE_EXE%" "%ESLINT_CLI%" . || exit /b %errorlevel%

echo Running smoke tests...
call "%NODE_EXE%" "%TSX_CLI%" scripts/smoke-test.ts || exit /b %errorlevel%

echo Running production build...
call "%NODE_EXE%" "%VITE_CLI%" build --base=./ || exit /b %errorlevel%

echo All validations passed.
exit /b 0