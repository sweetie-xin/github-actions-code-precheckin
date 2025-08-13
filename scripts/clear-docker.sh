#!/bin/bash
echo "⛔ 正在彻底清理 Docker，请确保无重要数据！"

docker rm -f $(docker ps -aq) 2>/dev/null
docker rmi -f $(docker images -q) 2>/dev/null
docker network prune -f
docker volume prune -f
docker builder prune -a -f
docker system prune -a --volumes -f

echo "✅ Docker 清理完成！"
