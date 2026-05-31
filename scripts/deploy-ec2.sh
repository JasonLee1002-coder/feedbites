#!/bin/bash
# ============================================================
# Feedbites — EC2 部署腳本
# 執行方式：bash scripts/deploy-ec2.sh
# 需求：aws cli 已設定，SSM plugin 已安裝
# ============================================================
set -e

EC2_INSTANCE="i-0edcfd5786837c7b0"
REGION="ap-northeast-1"
APP_DIR="/home/jason/feedbites"
PORT=3200
CONTAINER="feedbites"
IMAGE="feedbites:latest"
DOCKER_NETWORK="omnicore-net"

echo "▶ [1/6] 產生 AUTH_SECRET 和 CRON_SECRET..."
AUTH_SECRET=$(openssl rand -hex 32)
CRON_SECRET=$(openssl rand -hex 16)

# ── 讀取本地 .env.local 取得 API Keys ─────────────────────
source "$(dirname "$0")/../.env.local" 2>/dev/null || true

echo "▶ [2/6] 上傳 .env.production 到 EC2..."
aws ssm send-command \
  --instance-ids "$EC2_INSTANCE" \
  --document-name "AWS-RunShellScript" \
  --region "$REGION" \
  --parameters commands=["
mkdir -p $APP_DIR && cat > $APP_DIR/.env.production << 'ENVEOF'
DATABASE_URL=postgresql://omnicore:R2LRtWQgMQIGkiJ5dXWTeo9BliHvjlrf@omnicore-postgres:5432/feedbites
AUTH_SECRET=$AUTH_SECRET
AUTH_URL=https://poc.mcstation.ai/feedbites
NEXTAUTH_URL=https://poc.mcstation.ai/feedbites
NEXT_PUBLIC_BASE_PATH=/feedbites

GEMINI_API_KEY=${GEMINI_API_KEY:-}
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}
LINE_CHANNEL_ACCESS_TOKEN=${LINE_CHANNEL_ACCESS_TOKEN:-}
OWNER_LINE_USER_ID=${OWNER_LINE_USER_ID:-}
PROJECT_DISPLAY_NAME=FeedBites

RESEND_API_KEY=${RESEND_API_KEY:-}
EMAIL_FROM=FeedBites <noreply@mcstation.ai>

UPLOADS_DIR=/uploads
UPLOADS_BASE_URL=https://poc.mcstation.ai/feedbites/uploads
CRON_SECRET=$CRON_SECRET
SUPER_ADMIN_EMAILS=jason@mcstation.ai
YUZU_LINE_WEBHOOK_URL=https://poc.mcstation.ai/yuzu/api/line/webhook
NODE_ENV=production
ENVEOF
"] \
  --output text --query "Command.CommandId" > /dev/null

echo "▶ [3/6] 建立 feedbites 資料庫 + 執行 schema..."
aws ssm send-command \
  --instance-ids "$EC2_INSTANCE" \
  --document-name "AWS-RunShellScript" \
  --region "$REGION" \
  --parameters commands=["
docker exec omnicore-postgres psql -U omnicore -c 'CREATE DATABASE feedbites;' 2>/dev/null || echo 'DB already exists'
"] \
  --output text --query "Command.CommandId" > /dev/null

echo "  上傳並執行 schema SQL..."
# 先把 SQL 上傳到 EC2，再執行
aws ssm send-command \
  --instance-ids "$EC2_INSTANCE" \
  --document-name "AWS-RunShellScript" \
  --region "$REGION" \
  --parameters commands=["
docker exec -i omnicore-postgres psql -U omnicore -d feedbites < $APP_DIR/scripts/feedbites-pg-schema.sql 2>/dev/null || echo 'Schema already applied'
"] \
  --output text --query "Command.CommandId" > /dev/null

echo "▶ [4/6] git pull + Docker build on EC2..."
aws ssm send-command \
  --instance-ids "$EC2_INSTANCE" \
  --document-name "AWS-RunShellScript" \
  --region "$REGION" \
  --parameters commands=["
cd $APP_DIR && \
git pull origin master && \
docker build -t $IMAGE . --no-cache
"] \
  --output text --query "Command.CommandId" > /dev/null

echo "▶ [5/6] 啟動 Docker 容器..."
aws ssm send-command \
  --instance-ids "$EC2_INSTANCE" \
  --document-name "AWS-RunShellScript" \
  --region "$REGION" \
  --parameters commands=["
mkdir -p /home/jason/feedbites-uploads
docker stop $CONTAINER 2>/dev/null || true
docker rm   $CONTAINER 2>/dev/null || true
docker run -d \
  --name $CONTAINER \
  --network $DOCKER_NETWORK \
  --restart unless-stopped \
  -p $PORT:$PORT \
  -v /home/jason/feedbites-uploads:/uploads \
  --env-file $APP_DIR/.env.production \
  $IMAGE
"] \
  --output text --query "Command.CommandId" > /dev/null

echo "▶ [6/6] 更新 nginx 設定..."
aws ssm send-command \
  --instance-ids "$EC2_INSTANCE" \
  --document-name "AWS-RunShellScript" \
  --region "$REGION" \
  --parameters commands=["
# nginx 設定片段
cat > /home/jason/feedbites-nginx.conf << 'NGINXEOF'
location /feedbites/uploads/ {
    alias /home/jason/feedbites-uploads/;
    expires 30d;
    add_header Cache-Control \"public, immutable\";
}

location /feedbites/ {
    proxy_pass http://feedbites:3200/feedbites/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_cache_bypass \$http_upgrade;
}
NGINXEOF
echo '>>> nginx 設定已寫入 /home/jason/feedbites-nginx.conf'
echo '>>> 請手動加入 nginx 主設定並執行：docker exec omnicore-nginx nginx -s reload'
"] \
  --output text --query "Command.CommandId" > /dev/null

echo ""
echo "✅ 部署完成！"
echo ""
echo "下一步（手動）："
echo "  1. 將 /home/jason/feedbites-nginx.conf 內容加入 omnicore-nginx 設定"
echo "  2. docker exec omnicore-nginx nginx -s reload"
echo "  3. 測試：https://poc.mcstation.ai/feedbites/"
echo "  4. 管理員帳號：jason@mcstation.ai / feedbites2026"
