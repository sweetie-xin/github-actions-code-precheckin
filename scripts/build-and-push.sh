#!/bin/bash
# 构建并推送 Docker 镜像的自动化脚本
# 日期: 2025-04-22
# 用法: ./build_push_docker.sh [参数]

# 设置颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # 无颜色

# 检查 Docker 是否已安装，如果没有则安装
check_and_install_docker() {
    echo -e "${BLUE}检查 Docker 是否已安装...${NC}"
    
    if command -v docker &> /dev/null; then
        echo -e "${GREEN}Docker 已安装!${NC}"
        docker --version
    else
        echo -e "${YELLOW}Docker 未安装，开始安装流程...${NC}"
        
        # 检测操作系统类型
        if [ -f /etc/os-release ]; then
            . /etc/os-release
            OS=$NAME
        elif type lsb_release >/dev/null 2>&1; then
            OS=$(lsb_release -si)
        elif [ -f /etc/lsb-release ]; then
            . /etc/lsb-release
            OS=$DISTRIB_ID
        else
            OS=$(uname -s)
        fi
        
        # 根据不同的系统安装 Docker
        case "$OS" in
            *Ubuntu*|*Debian*)
                echo -e "${BLUE}检测到 $OS 系统，使用 apt 安装 Docker...${NC}"
                sudo apt-get update
                sudo apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release
                curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
                echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
                sudo apt-get update
                sudo apt-get install -y docker-ce docker-ce-cli containerd.io
                ;;
                
            *CentOS*|*Red*|*Fedora*)
                echo -e "${BLUE}检测到 $OS 系统，使用 yum 安装 Docker...${NC}"
                sudo yum install -y yum-utils
                sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
                sudo yum install -y docker-ce docker-ce-cli containerd.io
                sudo systemctl start docker
                ;;
                
            *Arch*)
                echo -e "${BLUE}检测到 $OS 系统，使用 pacman 安装 Docker...${NC}"
                sudo pacman -Syu --noconfirm docker
                sudo systemctl start docker
                ;;
                
            *Alpine*)
                echo -e "${BLUE}检测到 $OS 系统，使用 apk 安装 Docker...${NC}"
                sudo apk add --update docker
                sudo service docker start
                ;;
                
            *Darwin*)
                echo -e "${BLUE}检测到 macOS 系统，请通过 Docker Desktop 进行安装${NC}"
                echo -e "${YELLOW}Docker Desktop 下载地址: https://www.docker.com/products/docker-desktop${NC}"
                read -p "是否要打开 Docker Desktop 的下载页面? (y/n) " -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    open "https://www.docker.com/products/docker-desktop"
                fi
                exit 1
                ;;
                
            *Windows*)
                echo -e "${BLUE}检测到 Windows 系统，请通过 Docker Desktop 进行安装${NC}"
                echo -e "${YELLOW}Docker Desktop 下载地址: https://www.docker.com/products/docker-desktop${NC}"
                read -p "是否要打开 Docker Desktop 的下载页面? (y/n) " -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    start "https://www.docker.com/products/docker-desktop"
                fi
                exit 1
                ;;
                
            *)
                echo -e "${RED}无法识别的操作系统: $OS${NC}"
                echo -e "${YELLOW}请手动安装 Docker: https://docs.docker.com/engine/install/${NC}"
                exit 1
                ;;
        esac
        
        # 检查安装是否成功
        if command -v docker &> /dev/null; then
            echo -e "${GREEN}Docker 安装成功!${NC}"
            docker --version
            
            # 添加当前用户到 docker 组以避免使用 sudo
            if [[ "$OS" != *Darwin* && "$OS" != *Windows* ]]; then
                echo -e "${BLUE}添加当前用户到 docker 组...${NC}"
                sudo usermod -aG docker $USER
                echo -e "${YELLOW}请注意: 您可能需要注销并重新登录以使 docker 组更改生效${NC}"
                read -p "是否现在尝试使用 Docker? (y/n) " -n 1 -r
                echo
                if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                    echo -e "${YELLOW}请在重新登录后运行本脚本${NC}"
                    exit 0
                fi
            fi
        else
            echo -e "${RED}Docker 安装失败，请手动安装: https://docs.docker.com/engine/install/${NC}"
            exit 1
        fi
    fi
    
    # 检查 Docker 服务是否运行
    if ! docker info &> /dev/null; then
        echo -e "${YELLOW}Docker 守护程序未运行，尝试启动...${NC}"
        if [[ "$OS" == *Darwin* || "$OS" == *Windows* ]]; then
            echo -e "${RED}请确保 Docker Desktop 已启动${NC}"
            exit 1
        else
            sudo systemctl start docker || sudo service docker start
            sleep 3
            if ! docker info &> /dev/null; then
                echo -e "${RED}无法启动 Docker 服务，请检查安装${NC}"
                exit 1
            else
                echo -e "${GREEN}Docker 服务已成功启动!${NC}"
            fi
        fi
    fi
}

# 默认参数
USERNAME="wenhualiuliu"
PASSWORD="Super123Star"
REGISTRY="docker.io" # Docker Hub 默认地址
IMAGE_NAME=""
TAG="latest"
DOCKERFILE="Dockerfile"
BUILD_CONTEXT="."
USE_TOKEN=false
SHOW_HELP=false
NO_CACHE=false

# 显示帮助信息
show_help() {
    echo -e "${BLUE}Docker 镜像构建推送脚本${NC}"
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -u, --username USERNAME    Docker 仓库用户名"
    echo "  -p, --password PASSWORD    Docker 仓库密码或令牌"
    echo "  -r, --registry REGISTRY    Docker 仓库地址 (默认: docker.io)"
    echo "  -i, --image IMAGE_NAME     镜像名称"
    echo "  -t, --tag TAG              镜像标签 (默认: latest)"
    echo "  -f, --dockerfile FILE      Dockerfile 路径 (默认: Dockerfile)"
    echo "  -c, --context DIR          构建上下文目录 (默认: .)"
    echo "  -k, --token                使用令牌代替密码"
    echo "  -n, --no-cache             不使用缓存构建镜像"
    echo "  -h, --help                 显示帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 -u myusername -p mypassword -i my-app -t 1.0"
    echo "  $0 -u myusername -p mytoken -i my-app -k -r registry.cn-hangzhou.aliyuncs.com"
    echo ""
    echo "国内仓库示例:"
    echo "  阿里云: $0 -u myuser -p mypassword -i my-app -r registry.cn-hangzhou.aliyuncs.com"
    echo "  腾讯云: $0 -u myuser -p mypassword -i my-app -r ccr.ccs.tencentyun.com"
    echo "  华为云: $0 -u myuser -p mypassword -i my-app -r swr.cn-north-4.myhuaweicloud.com"
}

# 先检查并安装 Docker
check_and_install_docker

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    key="$1"
    case $key in
        -u|--username)
            USERNAME="$2"
            shift 2
            ;;
        -p|--password)
            PASSWORD="$2"
            shift 2
            ;;
        -r|--registry)
            REGISTRY="$2"
            shift 2
            ;;
        -i|--image)
            IMAGE_NAME="$2"
            shift 2
            ;;
        -t|--tag)
            TAG="$2"
            shift 2
            ;;
        -f|--dockerfile)
            DOCKERFILE="$2"
            shift 2
            ;;
        -c|--context)
            BUILD_CONTEXT="$2"
            shift 2
            ;;
        -k|--token)
            USE_TOKEN=true
            shift
            ;;
        -n|--no-cache)
            NO_CACHE=true
            shift
            ;;
        -h|--help)
            SHOW_HELP=true
            shift
            ;;
        *)
            echo -e "${RED}错误: 未知选项 $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# 显示帮助并退出
if [ "$SHOW_HELP" = true ]; then
    show_help
    exit 0
fi

# 检查必要参数
if [ -z "$IMAGE_NAME" ]; then
    echo -e "${RED}错误: 未指定镜像名称. 使用 -i 或 --image 选项.${NC}"
    show_help
    exit 1
fi

# 如果没有提供用户名，询问用户
if [ -z "$USERNAME" ]; then
    echo -e "${YELLOW}请输入 Docker 仓库用户名:${NC}"
    read USERNAME
fi

# 在没有提供密码的情况下询问用户
if [ -z "$PASSWORD" ]; then
    if [ "$USE_TOKEN" = true ]; then
        echo -e "${YELLOW}请输入 Docker 仓库访问令牌:${NC}"
    else
        echo -e "${YELLOW}请输入 Docker 仓库密码:${NC}"
    fi
    read -s PASSWORD
    echo
fi

# 设置完整镜像名称
if [ "$REGISTRY" = "docker.io" ]; then
    FULL_IMAGE_NAME="$USERNAME/$IMAGE_NAME:$TAG"
else
    FULL_IMAGE_NAME="$REGISTRY/$USERNAME/$IMAGE_NAME:$TAG"
fi

# 显示即将执行的操作
echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}即将执行以下操作:${NC}"
echo -e "${BLUE}* 登录到容器仓库: ${NC}$REGISTRY"
echo -e "${BLUE}* 构建镜像: ${NC}$FULL_IMAGE_NAME"
echo -e "${BLUE}* 使用 Dockerfile: ${NC}$DOCKERFILE"
echo -e "${BLUE}* 构建上下文: ${NC}$BUILD_CONTEXT"
if [ "$NO_CACHE" = true ]; then
    echo -e "${BLUE}* 不使用缓存构建${NC}"
fi
echo -e "${BLUE}============================================================${NC}"

# 登录 Docker 仓库
echo -e "${YELLOW}正在登录 Docker 仓库...${NC}"
if [ "$USE_TOKEN" = true ]; then
    echo "$PASSWORD" | docker login "$REGISTRY" -u "$USERNAME" --password-stdin
else
    echo "$PASSWORD" | docker login "$REGISTRY" -u "$USERNAME" --password-stdin
fi

# 检查登录是否成功
if [ $? -ne 0 ]; then
    echo -e "${RED}登录失败. 请检查用户名和密码/令牌.${NC}"
    exit 1
else
    echo -e "${GREEN}登录成功!${NC}"
fi

# 构建 Docker 镜像
echo -e "${YELLOW}正在构建 Docker 镜像...${NC}"
BUILD_CMD="docker build"
if [ "$NO_CACHE" = true ]; then
    BUILD_CMD="$BUILD_CMD --no-cache"
fi
BUILD_CMD="$BUILD_CMD -t $FULL_IMAGE_NAME -f $DOCKERFILE $BUILD_CONTEXT"

echo -e "${BLUE}执行命令: ${NC}$BUILD_CMD"
eval $BUILD_CMD

# 检查构建是否成功
if [ $? -ne 0 ]; then
    echo -e "${RED}构建失败. 请检查 Dockerfile 和构建上下文.${NC}"
    exit 1
else
    echo -e "${GREEN}构建成功!${NC}"
fi

# 推送 Docker 镜像
echo -e "${YELLOW}正在推送 Docker 镜像到 $REGISTRY...${NC}"
docker push $FULL_IMAGE_NAME

# 检查推送是否成功
if [ $? -ne 0 ]; then
    echo -e "${RED}推送失败. 请检查网络连接和仓库权限.${NC}"
    echo -e "${YELLOW}如果您在中国，可能需要使用国内镜像仓库或配置加速器.${NC}"
    echo -e "${YELLOW}国内仓库示例:${NC}"
    echo -e "${BLUE}  阿里云: ${NC}$0 -u myuser -p mypassword -i $IMAGE_NAME -r registry.cn-hangzhou.aliyuncs.com"
    echo -e "${BLUE}  腾讯云: ${NC}$0 -u myuser -p mypassword -i $IMAGE_NAME -r ccr.ccs.tencentyun.com"
    exit 1
else
    echo -e "${GREEN}推送成功!${NC}"
fi

# 列出构建的镜像信息
echo -e "${YELLOW}镜像信息:${NC}"
docker images $FULL_IMAGE_NAME

# 显示使用说明
echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}Docker 镜像已成功构建并推送!${NC}"
echo -e "${GREEN}镜像: ${NC}$FULL_IMAGE_NAME"
echo -e "${GREEN}============================================================${NC}"
echo -e "${BLUE}拉取此镜像:${NC} docker pull $FULL_IMAGE_NAME"

# 检查镜像中的 .exe 文件 (如果是 Electron 应用)
echo -e "${YELLOW}检查镜像中的应用构建产物...${NC}"
CONTAINER_ID=$(docker create $FULL_IMAGE_NAME)

# 首先尝试复制 /app/output 目录
mkdir -p ./electron-dist
docker cp $CONTAINER_ID:/app/output/. ./electron-dist/ 2>/dev/null
OUTPUT_EXISTS=$?

# 如果 /app/output 不存在，尝试复制 /app/dist 目录
if [ $OUTPUT_EXISTS -ne 0 ]; then
    echo -e "${YELLOW}/app/output 目录不存在，尝试复制 /app/dist 目录...${NC}"
    docker cp $CONTAINER_ID:/app/dist/. ./electron-dist/ 2>/dev/null || echo -e "${YELLOW}无法找到构建产物目录${NC}"
fi

# 清理临时容器
docker rm $CONTAINER_ID > /dev/null

# 显示复制的文件 (如果有)
if [ -d "./electron-dist" ] && [ "$(ls -A ./electron-dist 2>/dev/null)" ]; then
    echo -e "${GREEN}已将构建产物复制到 ./electron-dist 目录${NC}"
    
    # 列出常见的可执行文件
    echo -e "${YELLOW}查找可执行文件...${NC}"
    find ./electron-dist -type f -name "*.exe" -o -name "*.AppImage" -o -name "*.dmg" -o -name "*.deb" -o -name "*.rpm" 2>/dev/null || echo -e "${YELLOW}未找到可执行文件${NC}"
    
    # 列出目录结构
    echo -e "${YELLOW}电子应用目录结构:${NC}"
    find ./electron-dist -type d | sort | head -10
else
    echo -e "${YELLOW}未找到构建产物或目录为空${NC}"
fi

# 提供使用国内镜像仓库的提示
if [ "$REGISTRY" = "docker.io" ]; then
    echo -e "${YELLOW}如果您在中国，推荐使用国内镜像仓库提高速度:${NC}"
    echo -e "${BLUE}阿里云: ${NC}$0 -u myuser -p mypassword -i $IMAGE_NAME -r registry.cn-hangzhou.aliyuncs.com"
    echo -e "${BLUE}腾讯云: ${NC}$0 -u myuser -p mypassword -i $IMAGE_NAME -r ccr.ccs.tencentyun.com"
    echo -e "${BLUE}华为云: ${NC}$0 -u myuser -p mypassword -i $IMAGE_NAME -r swr.cn-north-4.myhuaweicloud.com"
fi

exit 0