#!/bin/bash

# 创建输出目录
OUTDIR="deepseekmine-install"
mkdir -p "$OUTDIR"

echo "📦 开始导出镜像..."

# 导出每个镜像
docker save -o $OUTDIR/deepseekmine-0.6.1.tar deepseekmine:0.6.1
docker save -o $OUTDIR/meilisearch-v1.6.tar getmeili/meilisearch:v1.6

echo "✅ 所有镜像已导出到 ./$OUTDIR"

# 拷贝 docker-compose.yml
echo "📝 拷贝 docker-compose.yml"
cp docker-compose.yml $OUTDIR/
cp install.sh "$OUTDIR/"

# 生成 README
cat > $OUTDIR/README.md <<EOF
# DeepSeekMine 部署说明

## 镜像列表
- deepseekmine:0.6.1
- getmeili/meilisearch:v1.6

## 使用步骤：

1. 解压打包目录（如果是 .tar.gz）
2. 加载镜像：
    \`\`\`bash
    docker load -i deepseekmine-0.6.1.tar
    docker load -i meilisearch-v1.6.tar
    \`\`\`

3. 启动服务：
    \`\`\`bash
    docker-compose up -d
    \`\`\`

EOF

# 可选压缩整个目录
echo "📦 打包为 deepseekmine-install.tar.gz"
tar -czf deepseekmine-install.tar.gz $OUTDIR

echo "✅ 所有镜像和部署文件已打包完毕：deepseekmine-install.tar.gz"