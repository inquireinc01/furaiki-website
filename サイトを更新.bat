@echo off
cd /d "%~dp0"
echo ==============================
echo  FURAIKI site update
echo ==============================
git add -A
git commit -m "update: photos and content"
git push origin master
if %errorlevel% neq 0 (
  echo.
  echo [ERROR] Push failed. Check network or GitHub sign-in.
) else (
  echo.
  echo [OK] Uploaded! The site will update in 1-2 minutes.
  echo      https://www.furaiki.org
)
echo.
pause
