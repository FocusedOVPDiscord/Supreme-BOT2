@echo off
SETLOCAL EnableDelayedExpansion
title Supreme Bot
color 0b

:: Set working directory
cd /d "%~dp0"

:START
cls
echo.
echo  ================================================
echo                  SUPREME BOT
echo  ================================================
echo.

:: 1. Environment Check
if not exist ".env" (
    color 0c
    echo  [!] Error: .env file missing.
    echo      Please configure your environment variables.
    echo.
    pause
    exit
)

:: Check for Groq API Key in .env
findstr /C:"GROQ_API_KEY" .env >nul
if !errorlevel! neq 0 (
    color 0e
    echo  [!] Warning: GROQ_API_KEY not found in .env
    echo      AI features will not work without this key.
    echo.
)

:: 2. Dependency Check
if not exist "node_modules" (
    echo  [*] Installing required dependencies...
    call pnpm install --quiet
    if !errorlevel! neq 0 (
        color 0c
        echo  [!] Error: Dependency installation failed.
        pause
        exit
    )
    echo  [+] Dependencies ready.
    echo.
)

:: 3. Command Sync
echo  [*] Synchronizing Slash Commands...
call node deploy-commands.js >nul
if !errorlevel! neq 0 (
    color 0e
    echo  [!] Warning: Command sync failed. Continuing...
) else (
    echo  [+] Commands synchronized.
)
echo.

:: 4. Launch
echo  [*] Initializing Supreme Bot...
echo  ------------------------------------------------
node index.js

:: 5. Crash Recovery
color 0e
echo.
echo  [!] Process terminated.
echo      Restarting in 5 seconds... (Ctrl+C to cancel)
timeout /t 5 >nul
goto START
