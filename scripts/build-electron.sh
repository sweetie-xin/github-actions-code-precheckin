#!/bin/bash

# 默认值设置
CONTAINER_NAME="electron-builder"
OUTPUT_FOLDER="electron-output"
PLATFORM="win"  # 默认平台
CLEAN=false     # 是否清理之前的构建

# 显示帮助信息
show_help() {
    echo "Electron 应用构建与导出脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -n, --name NAME       设置容器名称 (默认: electron-builder)"
    echo "  -o, --output FOLDER   设置输出文件夹 (默认: electron-output)"
    echo "  -p, --platform PLAT   设置构建平台 win|linux|mac|all (默认: win)"
    echo "  -c, --clean           构建前清理输出目录"
    echo "  -h, --help            显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 --name my-app --output dist --platform win --clean"
    echo ""
}

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        -n|--name)
            CONTAINER_NAME="$2"
            shift 2
            ;;
        -o|--output)
            OUTPUT_FOLDER="$2"
            shift 2
            ;;
        -p|--platform)
            PLATFORM="$2"
            shift 2
            ;;
        -c|--clean)
            CLEAN=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo "未知参数: $1"
            show_help
            exit 1
            ;;
    esac
done

# 设置输出文件夹的完整路径
FULL_OUTPUT_PATH=$(realpath "$OUTPUT_FOLDER")

# 如果需要清理，则删除输出目录
if [ "$CLEAN" = true ]; then
    echo "清理输出目录: $FULL_OUTPUT_PATH"
    rm -rf "$FULL_OUTPUT_PATH"
fi

# 创建输出目录（如果不存在）
mkdir -p "$FULL_OUTPUT_PATH"

# 构建 Docker 镜像
echo "=========================================="
echo "开始构建 Docker 镜像: $CONTAINER_NAME"
echo "平台: $PLATFORM"
echo "=========================================="

docker build --build-arg PLATFORM="$PLATFORM" -t "$CONTAINER_NAME" .

# 检查构建是否成功
if [ $? -ne 0 ]; then
    echo "❌ Docker 镜像构建失败!"
    exit 1
fi

echo "✅ Docker 镜像构建成功!"

# 创建临时容器
echo "创建临时容器..."
TEMP_CONTAINER="${CONTAINER_NAME}-temp"
docker create --name "$TEMP_CONTAINER" "$CONTAINER_NAME"

# 检查容器创建是否成功
if [ $? -ne 0 ]; then
    echo "❌ 创建临时容器失败!"
    exit 1
fi

# 根据平台选择源目录
case "$PLATFORM" in
    win)
        SRC_PATH="/app/output/win-unpacked"
        ;;
    linux)
        SRC_PATH="/app/output/linux-unpacked"
        ;;
    mac)
        SRC_PATH="/app/output/mac"
        ;;
    all)
        SRC_PATH="/app/output"
        ;;
    *)
        SRC_PATH="/app/output"
        ;;
esac

# 复制文件
echo "正在从容器复制 Electron 应用..."
echo "源路径: $SRC_PATH"
echo "目标路径: $FULL_OUTPUT_PATH"

docker cp "$TEMP_CONTAINER:$SRC_PATH" "$FULL_OUTPUT_PATH"

# 检查文件复制是否成功
if [ $? -ne 0 ]; then
    echo "⚠️ 文件复制可能不完整，检查容器中文件路径是否正确!"
    echo "尝试复制整个输出目录..."
    docker cp "$TEMP_CONTAINER:/app/output/." "$FULL_OUTPUT_PATH/"
fi

# 同时复制安装包文件
echo "正在复制安装包文件（如果有）..."
#docker cp "$TEMP_CONTAINER:/app/output/." "$FULL_OUTPUT_PATH-installers/"

# 删除临时容器
echo "删除临时容器..."
docker rm "$TEMP_CONTAINER"

# 检查输出目录
if [ -d "$FULL_OUTPUT_PATH" ]; then
    ITEMS=$(ls -A "$FULL_OUTPUT_PATH" | wc -l)
    
    if [ $ITEMS -gt 0 ]; then
        echo "✅ Electron 应用已成功导出!"
        echo "输出目录: $FULL_OUTPUT_PATH"
        ls -la "$FULL_OUTPUT_PATH"
    else
        echo "⚠️ 输出目录是空的，请检查容器中的构建结果!"
        echo "尝试列出容器中的/app/output目录内容..."
        docker create --name "$TEMP_CONTAINER" "$CONTAINER_NAME"
        docker start "$TEMP_CONTAINER"
        docker exec "$TEMP_CONTAINER" ls -la /app/output
        docker stop "$TEMP_CONTAINER"
        docker rm "$TEMP_CONTAINER"
    fi
else
    echo "❌ 输出目录不存在!"
fi

echo "=========================================="
echo "构建与导出过程完成!"
echo "=========================================="