@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

echo ============================================
echo 📦 正在加载 Docker 镜像（Windows 版）
echo ============================================

REM 遇到错误立即退出
set ERRORLEVEL=0

docker load -i deepseekmine-1.0.0.tar
if errorlevel 1 (
    echo ❌ 加载 deepseekmine-1.0.0.tar 失败！
    pause
    exit /b 1
)

docker load -i node-20.tar
if errorlevel 1 (
    echo ❌ 加载 node-20.tar 失败！
    pause
    exit /b 1
)

docker load -i python-3.10-slim.tar
if errorlevel 1 (
    echo ❌ 加载 python-3.10-slim.tar 失败！
    pause
    exit /b 1
)

docker load -i meilisearch-v1.6.tar
if errorlevel 1 (
    echo ❌ 加载 meilisearch-v1.6.tar 失败！
    pause
    exit /b 1
)

echo.
echo 🚀 正在启动服务...
docker-compose up -d
if errorlevel 1 (
    echo ❌ 启动服务失败，请确认 docker-compose.yml 是否正确！
    pause
    exit /b 1
)

echo.
echo ✅ 部署完成！
echo 👉 现在你可以访问:
echo http://127.0.0.1:3000
pause
