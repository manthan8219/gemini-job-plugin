@echo off
setlocal

echo ===================================================
echo     Installing Antigravity Job Assistant Plugin
echo ===================================================
echo.

set "SOURCE_DIR=%~dp0."
set "DEST_DIR=%USERPROFILE%\.gemini\config\plugins\job-assistant"

echo Copying files to: %DEST_DIR%
echo.

:: Use robocopy to mirror the directory
:: /MIR  - Mirror a directory tree
:: /XD   - Exclude directories
:: /XF   - Exclude files
:: /NFL  - No File List
:: /NDL  - No Directory List
:: /NJH  - No Job Header
:: /NJS  - No Job Summary
robocopy "%SOURCE_DIR%" "%DEST_DIR%" /MIR /XD .git /XF install.bat /NFL /NDL /NJH /NJS

:: robocopy returns codes < 8 for success
if %ERRORLEVEL% LSS 8 (
    echo [SUCCESS] Plugin installed successfully!
) else (
    echo [ERROR] Failed to install the plugin.
)

echo.
echo Press any key to exit...
pause > nul
