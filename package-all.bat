@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

:: 自动创建持久化目录
if not exist C:\deepseekmine\meili_data (
    mkdir C:\deepseekmine\meili_data
)

:: 配置
set VERSION=1.0.0
set IMAGE_NAME=deepseekmine
set OUTDIR=deepseekmine-install-0702

echo 🚧 正在构建镜像 %IMAGE_NAME%:%VERSION% ...

:: 创建输出目录
if not exist %OUTDIR% (
    mkdir %OUTDIR%
)

:: 构建镜像并导出为 tar
docker buildx build -t %IMAGE_NAME%:%VERSION% -f Dockerfile . --output type=docker,dest=%OUTDIR%\%IMAGE_NAME%-%VERSION%.tar
if errorlevel 1 (
    echo ❌ 镜像构建失败！
    exit /b 1
)
echo ✅ 镜像构建完成并导出至 %OUTDIR%\%IMAGE_NAME%-%VERSION%.tar

:: 拉取基础镜像（自动匹配当前平台）
echo 📦 拉取 node:20, python:3.10-slim, meilisearch:v1.6 ...
docker pull node:20
docker pull python:3.10-slim
docker pull getmeili/meilisearch:v1.6

:: 导出基础镜像
echo 📦 导出基础镜像 tar 文件...
docker save -o %OUTDIR%\node-20.tar node:20
docker save -o %OUTDIR%\python-3.10-slim.tar python:3.10-slim
docker save -o %OUTDIR%\meilisearch-v1.6.tar getmeili/meilisearch:v1.6

:: 拷贝 docker-compose.yml
echo 📝 拷贝 docker-compose.yml
copy /Y docker-compose.yml %OUTDIR%\
copy /Y install.bat %OUTDIR%\
copy /Y install.sh %OUTDIR%\

:: 写 README.md 文件
echo 📘 生成 README.md
(
echo # DeepSeekMine 部署说明
echo.
echo ## 镜像列表
echo - %IMAGE_NAME%:%VERSION%
echo - node:20
echo - python:3.10-slim
echo - getmeili/meilisearch:v1.6
echo.
echo ## 使用步骤：
echo.
echo 1. 解压打包目录（如果是 .zip）
echo 2. 加载镜像：
echo     docker load -i %IMAGE_NAME%-%VERSION%.tar
echo     docker load -i node-20.tar
echo     docker load -i python-3.10-slim.tar
echo     docker load -i meilisearch-v1.6.tar
echo.
echo 3. 启动服务：
echo     docker-compose up -d
) > %OUTDIR%\README.md

:: 打包目录为 .zip（适合 Windows 用户）
echo 📦 打包为 %OUTDIR%.zip
powershell Compress-Archive -Path "%OUTDIR%\*" -DestinationPath "%OUTDIR%.zip"

echo ✅ 打包完成：%OUTDIR%.zip
pause
