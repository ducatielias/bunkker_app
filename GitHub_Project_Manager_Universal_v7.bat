@echo off
setlocal EnableExtensions EnableDelayedExpansion
title GitHub Project Manager Universal v7
cls

REM ============================================================
REM GITHUB PROJECT MANAGER UNIVERSAL v7
REM Windows CMD compatible: ASCII + CRLF + no BOM
REM
REM Funciones:
REM - Crear repositorio nuevo en GitHub (requiere GitHub CLI)
REM - Conectar a repositorio existente
REM - Actualizar origin recordado
REM - main como rama normal
REM - Detectar backups/ZIPs/versiones y dejarlos solo en local
REM - Detectar historiales no relacionados
REM - Opcion de unir historiales conservando el proyecto LOCAL
REM - Crea backup remoto antes de unir historiales
REM - Nunca usa force push automaticamente
REM ============================================================

echo.
echo ============================================================
echo          GITHUB PROJECT MANAGER UNIVERSAL v7
echo ============================================================
echo.
echo Carpeta actual:
echo   %CD%
echo.

where git >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Git no esta instalado o no esta disponible en PATH.
    echo.
    echo Instala Git for Windows y vuelve a ejecutar este BAT.
    echo.
    pause
    exit /b 1
)

for /f "delims=" %%G in ('git --version') do set "GIT_VERSION=%%G"
echo [OK] !GIT_VERSION!
echo.

set /p CONFIRM=Esta es la carpeta raiz del proyecto? [S/N]: 
if /I not "%CONFIRM%"=="S" (
    echo.
    echo Operacion cancelada.
    pause
    exit /b 0
)

if not exist ".git" (
    echo.
    echo [INFO] Inicializando repositorio Git local...
    git init
    if errorlevel 1 goto :git_error
) else (
    echo [OK] Repositorio Git local detectado.
)

set "GIT_NAME="
set "GIT_EMAIL="
for /f "delims=" %%A in ('git config user.name 2^>nul') do set "GIT_NAME=%%A"
for /f "delims=" %%A in ('git config user.email 2^>nul') do set "GIT_EMAIL=%%A"

if not defined GIT_NAME (
    echo.
    set /p GIT_NAME=Nombre para los commits: 
    if not defined GIT_NAME (
        echo [ERROR] Debes indicar un nombre.
        pause
        exit /b 1
    )
    git config user.name "!GIT_NAME!"
)

if not defined GIT_EMAIL (
    echo.
    set /p GIT_EMAIL=Email para los commits: 
    if not defined GIT_EMAIL (
        echo [ERROR] Debes indicar un email.
        pause
        exit /b 1
    )
    git config user.email "!GIT_EMAIL!"
)

if not exist ".gitignore" (
    echo.
    echo [INFO] Este proyecto no tiene .gitignore.
    set /p MAKEIGNORE=Crear un .gitignore basico? [S/N]: 
    if /I "!MAKEIGNORE!"=="S" call :create_basic_gitignore
)

call :detect_backups

set "REMEMBERED_REMOTE="
git remote get-url origin >nul 2>&1
if not errorlevel 1 (
    for /f "delims=" %%R in ('git remote get-url origin') do set "REMEMBERED_REMOTE=%%R"
)

call :normalize_master_only

echo.
echo ============================================================
echo                 QUE QUIERES HACER?
echo ============================================================
echo.
echo   [1] Crear un repositorio NUEVO en GitHub
echo   [2] Conectar este proyecto a un repositorio EXISTENTE
if defined REMEMBERED_REMOTE (
    echo   [3] ACTUALIZAR el repositorio recordado
    echo.
    echo       Repositorio recordado:
    echo       !REMEMBERED_REMOTE!
) else (
    echo   [3] Actualizar repositorio recordado - no disponible aun
)
echo   [4] Ver configuracion actual
echo   [0] Salir
echo.
set /p ACTION=Elige una opcion [0-4]: 

if "%ACTION%"=="1" goto :create_new
if "%ACTION%"=="2" goto :connect_existing
if "%ACTION%"=="3" goto :use_remembered
if "%ACTION%"=="4" goto :show_config
if "%ACTION%"=="0" goto :end_ok
echo.
echo [ERROR] Opcion no valida.
pause
exit /b 1

:create_new
echo.
echo ============================================================
echo              CREAR REPOSITORIO NUEVO
echo ============================================================
echo.
where gh >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Para crear repositorios desde este BAT necesitas GitHub CLI.
    echo.
    echo Instalala con:
    echo   winget install --id GitHub.cli
    echo.
    pause
    exit /b 1
)

gh auth status >nul 2>&1
if errorlevel 1 (
    echo [INFO] GitHub CLI no esta autenticado.
    echo [INFO] Se iniciara el login oficial.
    echo.
    gh auth login
    if errorlevel 1 (
        echo.
        echo [ERROR] No se completo la autenticacion.
        pause
        exit /b 1
    )
)

for %%I in ("%CD%") do set "DEFAULT_REPO=%%~nxI"
set "NEW_REPO="
set /p NEW_REPO=Nombre del nuevo repositorio [!DEFAULT_REPO!]: 
if not defined NEW_REPO set "NEW_REPO=!DEFAULT_REPO!"

echo.
echo Visibilidad:
echo   [1] Privado
echo   [2] Publico
echo.
set /p VISIBILITY=Elige [1/2]: 
if "%VISIBILITY%"=="2" (
    set "GH_VISIBILITY=--public"
) else (
    set "GH_VISIBILITY=--private"
)

set "DESCRIPTION="
echo.
set /p DESCRIPTION=Descripcion opcional: 

call :ensure_initial_main
if errorlevel 1 exit /b 1
call :prepare_commit
if errorlevel 1 exit /b 1

if defined REMEMBERED_REMOTE (
    echo.
    echo [AVISO] Este proyecto ya tiene un origin:
    echo   !REMEMBERED_REMOTE!
    echo.
    set /p REPLACE_ORIGIN=Desconectarlo y crear uno nuevo? [S/N]: 
    if /I not "!REPLACE_ORIGIN!"=="S" (
        echo Operacion cancelada.
        pause
        exit /b 0
    )
    git remote remove origin
    if errorlevel 1 goto :git_error
    set "REMEMBERED_REMOTE="
)

echo.
echo [INFO] Creando repositorio "!NEW_REPO!" en GitHub...
if defined DESCRIPTION (
    gh repo create "!NEW_REPO!" !GH_VISIBILITY! --description "!DESCRIPTION!" --source "." --remote origin
) else (
    gh repo create "!NEW_REPO!" !GH_VISIBILITY! --source "." --remote origin
)
if errorlevel 1 (
    echo.
    echo [ERROR] No se pudo crear el repositorio.
    pause
    exit /b 1
)
for /f "delims=" %%R in ('git remote get-url origin') do set "REMEMBERED_REMOTE=%%R"
goto :safe_push_current

:connect_existing
echo.
echo ============================================================
echo          CONECTAR A REPOSITORIO EXISTENTE
echo ============================================================
echo.
echo Ejemplo HTTPS:
echo   https://github.com/usuario/repositorio.git
echo.
echo Ejemplo SSH:
echo   git@github.com:usuario/repositorio.git
echo.

set "REMOTE_URL="
set /p REMOTE_URL=URL del repositorio: 
if not defined REMOTE_URL (
    echo [ERROR] No has indicado ninguna URL.
    pause
    exit /b 1
)

if defined REMEMBERED_REMOTE (
    echo.
    echo Origin actual:
    echo   !REMEMBERED_REMOTE!
    echo.
    if /I not "!REMEMBERED_REMOTE!"=="!REMOTE_URL!" (
        set /p CHANGE_REMOTE=Cambiar origin a la nueva URL? [S/N]: 
        if /I not "!CHANGE_REMOTE!"=="S" (
            echo Operacion cancelada.
            pause
            exit /b 0
        )
        git remote set-url origin "!REMOTE_URL!"
        if errorlevel 1 goto :git_error
    )
) else (
    git remote add origin "!REMOTE_URL!"
    if errorlevel 1 goto :git_error
)
set "REMEMBERED_REMOTE=!REMOTE_URL!"
goto :verify_and_update

:use_remembered
if not defined REMEMBERED_REMOTE (
    echo.
    echo [ERROR] Este proyecto aun no tiene un repositorio recordado.
    echo Usa primero la opcion [1] o [2].
    echo.
    pause
    exit /b 1
)
echo.
echo ============================================================
echo             ACTUALIZAR REPOSITORIO RECORDADO
echo ============================================================
echo.
echo Repositorio:
echo   !REMEMBERED_REMOTE!
echo.
goto :verify_and_update

:show_config
echo.
echo ============================================================
echo                CONFIGURACION ACTUAL
echo ============================================================
echo.
echo Carpeta:
echo   %CD%
echo.
echo Usuario Git:
git config user.name 2>nul
echo.
echo Email Git:
git config user.email 2>nul
echo.
echo Origin:
git remote get-url origin 2>nul
if errorlevel 1 echo   No configurado
echo.
echo Rama:
git branch --show-current 2>nul
echo.
echo Estado:
git status --short 2>nul
echo.
pause
exit /b 0

:verify_and_update
echo.
echo [INFO] Comprobando acceso al repositorio remoto...
git ls-remote origin >nul 2>&1
if errorlevel 1 (
    echo.
    echo [ERROR] No se pudo acceder al repositorio.
    echo Revisa conexion, URL, permisos y autenticacion.
    echo.
    pause
    exit /b 1
)
echo [OK] Repositorio remoto accesible.
git fetch origin --prune
if errorlevel 1 echo [INFO] El remoto puede estar vacio. Continuando...
call :ensure_initial_main
if errorlevel 1 exit /b 1
call :prepare_commit
if errorlevel 1 exit /b 1
call :normalize_upload_after_commit
goto :safe_push_current

:normalize_master_only
set "CURRENT_BRANCH="
for /f "delims=" %%B in ('git branch --show-current 2^>nul') do set "CURRENT_BRANCH=%%B"
if /I "!CURRENT_BRANCH!"=="master" (
    echo.
    echo [INFO] Renombrando automaticamente master a main...
    git branch -M main
    if not errorlevel 1 echo [OK] Rama renombrada a main.
)
exit /b 0

:ensure_initial_main
set "CURRENT_BRANCH="
for /f "delims=" %%B in ('git branch --show-current 2^>nul') do set "CURRENT_BRANCH=%%B"
if not defined CURRENT_BRANCH (
    git symbolic-ref HEAD refs/heads/main >nul 2>&1
    exit /b 0
)
if /I "!CURRENT_BRANCH!"=="master" (
    git branch -M main
    if errorlevel 1 exit /b 1
)
exit /b 0

:normalize_upload_after_commit
set "CURRENT_BRANCH="
for /f "delims=" %%B in ('git branch --show-current 2^>nul') do set "CURRENT_BRANCH=%%B"
if not defined CURRENT_BRANCH exit /b 0
echo !CURRENT_BRANCH! | findstr /B /I "upload-" >nul
if errorlevel 1 exit /b 0
git status --porcelain | findstr . >nul
if not errorlevel 1 exit /b 0

echo.
echo [INFO] Rama temporal detectada:
echo   !CURRENT_BRANCH!
echo [INFO] Intentando volver a main de forma segura...

git show-ref --verify --quiet refs/heads/main
if not errorlevel 1 (
    git merge-base --is-ancestor main "!CURRENT_BRANCH!" >nul 2>&1
    if not errorlevel 1 (
        git checkout main >nul 2>&1
        if errorlevel 1 exit /b 0
        git merge --ff-only "!CURRENT_BRANCH!" >nul 2>&1
        if errorlevel 1 (
            git checkout "!CURRENT_BRANCH!" >nul 2>&1
            exit /b 0
        )
        echo [OK] main actualizada con la rama temporal.
        exit /b 0
    )
)
exit /b 0

:prepare_commit
echo.
echo [INFO] Revisando cambios...
echo.
git status --short
echo.
git add -A
if errorlevel 1 exit /b 1
git diff --cached --quiet
if errorlevel 1 (
    set "COMMIT_MSG="
    set /p COMMIT_MSG=Mensaje del commit [Actualizacion del proyecto]: 
    if not defined COMMIT_MSG set "COMMIT_MSG=Actualizacion del proyecto"
    git commit -m "!COMMIT_MSG!"
    if errorlevel 1 exit /b 1
    echo [OK] Commit creado.
) else (
    echo [INFO] No hay cambios nuevos para crear un commit.
)
git rev-parse HEAD >nul 2>&1
if errorlevel 1 (
    echo [ERROR] No existe ningun commit para subir.
    exit /b 1
)
exit /b 0

:safe_push_current
set "LOCAL_BRANCH="
for /f "delims=" %%B in ('git branch --show-current') do set "LOCAL_BRANCH=%%B"
if not defined LOCAL_BRANCH goto :git_error
if /I "!LOCAL_BRANCH!"=="master" (
    git branch -M main
    if errorlevel 1 goto :git_error
    set "LOCAL_BRANCH=main"
)

echo.
echo [INFO] Rama local para push:
echo   !LOCAL_BRANCH!
echo.

git fetch origin --prune
if errorlevel 1 echo [INFO] El remoto puede estar vacio. Continuando...

set "REMOTE_HAS_HEADS="
for /f "delims=" %%R in ('git ls-remote --heads origin 2^>nul') do set "REMOTE_HAS_HEADS=1"
if not defined REMOTE_HAS_HEADS (
    echo [INFO] Repositorio remoto vacio.
    git push -u origin "!LOCAL_BRANCH!"
    if errorlevel 1 goto :push_error
    goto :success
)

git show-ref --verify --quiet "refs/remotes/origin/!LOCAL_BRANCH!"
if errorlevel 1 (
    echo [INFO] La rama !LOCAL_BRANCH! no existe aun en GitHub.
    git push -u origin "!LOCAL_BRANCH!"
    if errorlevel 1 goto :push_error
    goto :success
)

git merge-base --is-ancestor "origin/!LOCAL_BRANCH!" HEAD >nul 2>&1
if not errorlevel 1 (
    echo [INFO] Historial compatible. Haciendo push normal...
    git push -u origin "!LOCAL_BRANCH!"
    if errorlevel 1 goto :push_error
    goto :success
)

git merge-base --is-ancestor HEAD "origin/!LOCAL_BRANCH!" >nul 2>&1
if not errorlevel 1 (
    echo.
    echo [AVISO] GitHub tiene commits que tu copia local no tiene.
    echo [AVISO] No se hara push automatico.
    goto :safe_branch
)

set "MERGE_BASE="
for /f "delims=" %%M in ('git merge-base HEAD "origin/!LOCAL_BRANCH!" 2^>nul') do set "MERGE_BASE=%%M"
if not defined MERGE_BASE goto :unrelated_histories

echo.
echo [AVISO] Los historiales local y remoto han divergido.
goto :safe_branch

:unrelated_histories
echo.
echo ============================================================
echo          HISTORIALES DIFERENTES DETECTADOS
echo ============================================================
echo.
echo El proyecto local y la rama remota no comparten historial.
echo.
echo Opciones:
echo.
echo   [1] Unir historiales conservando MI PROYECTO LOCAL
echo       como contenido actual
echo.
echo   [2] Subir mi proyecto a una rama de seguridad upload-*
echo.
echo   [3] Cancelar
echo.
set /p HISTORY_ACTION=Elige [1/2/3]: 

if "!HISTORY_ACTION!"=="1" goto :merge_keep_local
if "!HISTORY_ACTION!"=="2" goto :safe_branch
echo Operacion cancelada.
pause
exit /b 0

:merge_keep_local
echo.
echo [INFO] Se creara primero una copia de seguridad del remoto.
for /f %%T in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "STAMP=%%T"
set "BACKUP_BRANCH=backup-github-main-!STAMP!"

git branch "!BACKUP_BRANCH!" "origin/!LOCAL_BRANCH!"
if errorlevel 1 goto :git_error
git push origin "!BACKUP_BRANCH!"
if errorlevel 1 (
    echo [ERROR] No se pudo crear la copia de seguridad remota.
    git branch -D "!BACKUP_BRANCH!" >nul 2>&1
    pause
    exit /b 1
)

echo [OK] Backup remoto creado:
echo   !BACKUP_BRANCH!
echo.
echo [INFO] Uniendo historiales con estrategia ours...
echo [INFO] El contenido actual del proyecto local se conserva.

git merge "origin/!LOCAL_BRANCH!" --allow-unrelated-histories -s ours -m "Unificar historial local con GitHub"
if errorlevel 1 (
    echo.
    echo [ERROR] No se pudo unir los historiales.
    echo [INFO] El backup remoto ya existe y no se ha borrado.
    pause
    exit /b 1
)

echo [OK] Historial unido correctamente.
echo.
echo [INFO] Haciendo push normal a !LOCAL_BRANCH!...
git push -u origin "!LOCAL_BRANCH!"
if errorlevel 1 goto :push_error
goto :success

:safe_branch
echo.
echo ============================================================
echo             SUBIDA SEGURA A RAMA NUEVA
echo ============================================================
echo.
echo No se utilizara force push.
echo.
for /f %%T in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "STAMP=%%T"
set "UPLOAD_BRANCH=upload-!STAMP!"
echo Nueva rama:
echo   !UPLOAD_BRANCH!
echo.
set /p CONTINUE_SAFE=Continuar con la rama segura? [S/N]: 
if /I not "!CONTINUE_SAFE!"=="S" (
    echo Operacion cancelada.
    pause
    exit /b 0
)
git checkout -b "!UPLOAD_BRANCH!"
if errorlevel 1 goto :git_error
git push -u origin "!UPLOAD_BRANCH!"
if errorlevel 1 goto :push_error
echo.
echo [OK] Proyecto subido sin tocar la rama existente.
goto :success

:detect_backups
set "HAS_BACKUPS="
set "NEEDS_BACKUP_ACTION="
set "BACKUP_LIST_FILE=%TEMP%\github_uploader_backups_%RANDOM%.txt"
if exist "!BACKUP_LIST_FILE!" del /q "!BACKUP_LIST_FILE!" >nul 2>&1

for %%F in (*.zip *.7z *.rar *.bak *.backup) do (
    if exist "%%F" (
        echo %%F>>"!BACKUP_LIST_FILE!"
        set "HAS_BACKUPS=1"
        git check-ignore --no-index -q "%%F" >nul 2>&1
        if errorlevel 1 set "NEEDS_BACKUP_ACTION=1"
    )
)

for /d %%D in ("+Versiones" "Versiones" "versions" "backup" "backups" "Backup" "Backups") do (
    if exist "%%~D\" (
        echo %%~D/>>"!BACKUP_LIST_FILE!"
        set "HAS_BACKUPS=1"
        git check-ignore --no-index -q "%%~D/" >nul 2>&1
        if errorlevel 1 set "NEEDS_BACKUP_ACTION=1"
    )
)

if not defined HAS_BACKUPS exit /b 0
if not defined NEEDS_BACKUP_ACTION (
    if exist "!BACKUP_LIST_FILE!" del /q "!BACKUP_LIST_FILE!" >nul 2>&1
    exit /b 0
)

echo.
echo ============================================================
echo          BACKUPS / VERSIONES DETECTADOS
echo ============================================================
echo.
type "!BACKUP_LIST_FILE!"
echo.
echo Que quieres hacer?
echo.
echo   [1] Subirlos tambien a GitHub
echo   [2] Ignorarlos en Git y mantenerlos SOLO en tu PC
echo   [3] No cambiar nada ahora
echo.
set /p BACKUP_ACTION=Elige [1/2/3]: 

if "!BACKUP_ACTION!"=="2" (
    if not exist ".gitignore" call :create_basic_gitignore
    >>".gitignore" echo.
    >>".gitignore" echo # Backups y versiones locales

    for %%F in (*.zip *.7z *.rar *.bak *.backup) do (
        if exist "%%F" (
            findstr /x /c:"%%F" ".gitignore" >nul 2>&1
            if errorlevel 1 >>".gitignore" echo %%F
            git ls-files --error-unmatch "%%F" >nul 2>&1
            if not errorlevel 1 (
                echo [INFO] Quitando %%F del seguimiento Git sin borrarlo...
                git rm --cached -- "%%F"
            )
        )
    )

    for /d %%D in ("+Versiones" "Versiones" "versions" "backup" "backups" "Backup" "Backups") do (
        if exist "%%~D\" (
            findstr /x /c:"%%~D/" ".gitignore" >nul 2>&1
            if errorlevel 1 >>".gitignore" echo %%~D/
            git ls-files "%%~D/" | findstr . >nul
            if not errorlevel 1 (
                echo [INFO] Quitando %%~D/ del seguimiento Git sin borrar archivos...
                git rm -r --cached -- "%%~D/"
            )
        )
    )

    echo.
    echo [OK] Backups/versiones ignorados.
    echo [OK] Los archivos siguen existiendo en tu PC.
)

if exist "!BACKUP_LIST_FILE!" del /q "!BACKUP_LIST_FILE!" >nul 2>&1
exit /b 0

:create_basic_gitignore
>".gitignore" (
    echo # Sistema
    echo Thumbs.db
    echo Desktop.ini
    echo .DS_Store
    echo.
    echo # Editores
    echo .vscode/
    echo .idea/
    echo.
    echo # Dependencias y builds
    echo node_modules/
    echo dist/
    echo build/
    echo.
    echo # Variables y secretos
    echo .env
    echo .env.*
    echo ^!.env.example
    echo.
    echo # Logs
    echo *.log
)
echo [OK] .gitignore creado.
exit /b 0

:success
echo.
echo ============================================================
echo                  OPERACION COMPLETADA
echo ============================================================
echo.
echo Repositorio recordado:
git remote get-url origin 2>nul
echo.
echo Rama actual:
git branch --show-current
echo.
echo Ultimo commit:
git log -1 --oneline
echo.
echo Objetivo normal:
echo   trabajar y actualizar desde main
echo.
pause
exit /b 0

:push_error
echo.
echo ============================================================
echo                   ERROR DURANTE EL PUSH
echo ============================================================
echo.
echo No se ha usado force push ni se ha borrado contenido remoto.
echo Revisa el mensaje de Git que aparece encima.
echo.
pause
exit /b 1

:git_error
echo.
echo ============================================================
echo                     ERROR DE GIT
echo ============================================================
echo.
echo El proceso se ha detenido por seguridad.
echo No se ha utilizado force push.
echo.
pause
exit /b 1

:end_ok
echo.
echo Saliendo...
exit /b 0
