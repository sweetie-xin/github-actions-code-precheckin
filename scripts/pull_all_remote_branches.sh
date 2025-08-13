#!/bin/bash

# Step 1: 拉取所有远程引用
echo "🚀 Fetching all remote branches..."
git fetch --all

# Step 2: 遍历所有远程分支（排除 HEAD 指针）
for remote_branch in $(git branch -r | grep -vE '->'); do
  local_branch=${remote_branch#origin/}
  
  echo "⬇️  Creating or updating local branch: $local_branch"

  # 创建并强制更新本地分支（已存在的会被覆盖）
  git checkout -B "$local_branch" "$remote_branch" >/dev/null 2>&1

  if [ $? -eq 0 ]; then
    echo "✅ Synced: $local_branch"
  else
    echo "❌ Failed: $local_branch"
  fi
done

echo "🎉 All remote branches are now available locally."

