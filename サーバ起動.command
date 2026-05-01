#!/bin/bash
# 算数マスターのローカルサーバを起動
# ダブルクリックで実行 → ブラウザで http://localhost:8765/ にアクセス
cd "$(dirname "$0")"
echo "🌟 算数マスター サーバ起動中..."
echo "📱 ブラウザで http://localhost:8888/ を開いてください"
echo "🛑 終了するには Ctrl+C"
echo ""
sleep 1
open "http://localhost:8888/"
python3 -m http.server 8888
