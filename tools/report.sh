#!/bin/bash
# VPS から学習記録を取ってきて週報を出す。
#   tools/report.sh [日数=7]
# 取ってきた記録は ~/.sansu-data に置く（リポジトリには入れない）
set -euo pipefail
VPS_HOST="${VPS_HOST:-root@nullset-tools.xvps.jp}"
LOCAL="${SANSU_DATA:-$HOME/.sansu-data}"
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$LOCAL"
rsync -az -e "ssh -o ConnectTimeout=15" "$VPS_HOST:/root/sansu-master/data/" "$LOCAL/"
node "$APP_DIR/tools/report.js" "$LOCAL" "${1:-7}"
