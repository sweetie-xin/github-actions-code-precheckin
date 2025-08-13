# ---------- Stage 1: 编译 Python 为 .pyc ----------
    FROM python:3.10-slim AS pybuilder
    WORKDIR /build
    COPY semantic_rag/ semantic_rag/
    RUN python -m compileall semantic_rag/
    
    # ---------- Stage 2: 构建前端 ----------
    FROM node:20 AS frontend
    WORKDIR /workspace
    COPY package.json package-lock.json tsconfig.json ./
    RUN npm install
    
    # 复制构建用文件（注意别漏掉 tsconfig.json、next.config.ts）
    COPY app/ app/
    COPY public/ public/
    COPY next.config.ts ./
    COPY tailwind.config.ts postcss.config.mjs ./
    ENV NODE_ENV=production

    RUN npm run build
    
    # ---------- Stage 3: 最终镜像 ----------
    FROM python:3.10-slim
    WORKDIR /workspace

    # 设置版本号
    ENV VERSION=1.0.0
    
    # 安装运行所需的依赖
    RUN apt-get update && \
    apt-get install -y \
    build-essential \
    gcc \
    g++ \
    libgomp1 \
    libgl1 \
    libglib2.0-0 \
    curl \
    netcat-openbsd \
    net-tools && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

    
    # 安装 Python 依赖
    COPY semantic_rag/requirements.txt .
    RUN pip install --no-cache-dir -r requirements.txt
    
    # 复制编译后的 .pyc（无源码）
    RUN mkdir -p semantic_rag
    COPY --from=pybuilder /build/semantic_rag/__pycache__/main.cpython-310.pyc semantic_rag/main.pyc
    COPY --from=pybuilder /build/semantic_rag/__pycache__/logger.cpython-310.pyc semantic_rag/logger.pyc
    COPY --from=pybuilder /build/semantic_rag/__pycache__/upload.cpython-310.pyc semantic_rag/upload.pyc
    COPY --from=pybuilder /build/semantic_rag/__pycache__/memory.cpython-310.pyc semantic_rag/memory.pyc
    COPY --from=pybuilder /build/semantic_rag/__pycache__/chunking.cpython-310.pyc semantic_rag/chunking.pyc
    COPY --from=pybuilder /build/semantic_rag/__pycache__/retriever.cpython-310.pyc semantic_rag/retriever.pyc
    COPY --from=pybuilder /build/semantic_rag/__pycache__/utils.cpython-310.pyc semantic_rag/utils.pyc
    COPY --from=pybuilder /build/semantic_rag/__pycache__/configure.cpython-310.pyc semantic_rag/configure.pyc
    COPY --from=pybuilder /build/semantic_rag/__pycache__/ocr_handle.cpython-310.pyc semantic_rag/ocr_handle.pyc


    COPY semantic_rag/baidu_stopwords.txt semantic_rag/
    COPY semantic_rag/models/ semantic_rag/models/
    COPY semantic_rag/apps/ semantic_rag/apps/

    # 设置 PYTHONPATH
    ENV PYTHONPATH=/workspace/semantic_rag
    
    # 复制前端构建产物（确保 .next 和 node_modules）
    COPY --from=frontend /workspace/.next .next/
    COPY --from=frontend /workspace/public public/
    COPY --from=frontend /workspace/node_modules node_modules/
    COPY --from=frontend /workspace/package.json ./
    COPY --from=frontend /workspace/package-lock.json ./
    
    # 配置文件与启动脚本
    COPY config.json ./
    COPY start.sh ./start.sh
    RUN chmod +x ./start.sh
    
    EXPOSE 3000 5001
    CMD ["bash", "./start.sh"]
    
