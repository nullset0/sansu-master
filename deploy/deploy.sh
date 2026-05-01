#!/bin/bash
# 算数マスター → Xserver VPS デプロイ
# 前提: SSH鍵認証で root@nullset-tools.xvps.jp に接続できる
# DNS: sansu.ecaiclub.com → 85.131.251.82 が反映されていること

set -euo pipefail

VPS_HOST="${VPS_HOST:-root@nullset-tools.xvps.jp}"
REMOTE_DIR="${REMOTE_DIR:-/root/sansu-master}"

# このスクリプトの1つ上 = アプリのルート
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DEPLOY_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🚀 算数マスター デプロイ開始"
echo "  ローカル: $APP_DIR"
echo "  VPS:    $VPS_HOST:$REMOTE_DIR"
echo ""

# 1. リモートディレクトリ準備
echo "📁 リモートディレクトリ作成..."
ssh "$VPS_HOST" "mkdir -p $REMOTE_DIR/app"

# 2. アプリ本体を rsync で転送
echo "📤 アプリ本体を転送..."
rsync -avz --delete \
  --exclude='deploy/' --exclude='.DS_Store' --exclude='*.command' \
  -e "ssh -o StrictHostKeyChecking=accept-new" \
  "$APP_DIR/" \
  "$VPS_HOST:$REMOTE_DIR/app/"

# 3. compose.yaml と nginx.conf を転送
echo "📤 設定ファイルを転送..."
rsync -avz \
  -e "ssh -o StrictHostKeyChecking=accept-new" \
  "$DEPLOY_DIR/compose.yaml" "$DEPLOY_DIR/nginx.conf" \
  "$VPS_HOST:$REMOTE_DIR/"

# 4. コンテナ起動 / 再起動
echo "🐳 Docker Compose で起動..."
ssh "$VPS_HOST" "cd $REMOTE_DIR && docker compose up -d --force-recreate"

# 5. 起動確認
echo ""
echo "📋 コンテナの状態:"
ssh "$VPS_HOST" "docker ps --filter name=sansu-master --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"

echo ""
echo "🎉 デプロイ完了！"
echo "📱 ブラウザで開く: https://sansu.ecaiclub.com/"
echo ""
echo "💡 SSL証明書の発行は数分かかることがあります"
echo "   失敗時のログ確認: ssh $VPS_HOST 'docker logs n8n-compose-traefik-1 | tail -50'"
