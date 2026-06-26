@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================
echo   研究生BTI - 课题组牛马人格鉴定所
echo   正在启动本地服务器，浏览器会自动打开...
echo   关闭本窗口即可停止。
echo ============================================
echo.
if not exist "node_modules" (
  echo 第一次运行，正在安装依赖（可能要几分钟，走代理更快）...
  call npm install
)
call npm run dev -- --open
pause
