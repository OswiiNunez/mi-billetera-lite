@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if not errorlevel 1 (
    start "" http://localhost:8000
    node server.mjs
    goto :done
)
where py >nul 2>nul
if not errorlevel 1 (
    start "" http://localhost:8000
    py -3 server.py
    goto :done
)
echo Necesitas Node.js 18 o superior, o Python 3 con el comando py.
echo Si ya tienes Python instalado, ejecuta: python server.py
:done
pause
