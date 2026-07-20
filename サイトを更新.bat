@echo off
cd /d "%~dp0"
echo ==============================
echo  FURAIKI site update
echo ==============================

set PY=C:\Users\taku_\AppData\Local\Programs\Python\Python312\python.exe
if not exist "%PY%" set PY=python
echo [1/3] Preparing photos (HEIC convert + resize + list.json)...
"%PY%" tools\prepare_photos.py

echo [2/3] Rebuilding common parts (header/footer/head + robots/sitemap)...
"%PY%" tools\build_common.py

echo [3/3] Uploading to the website...
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
