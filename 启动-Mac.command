#!/bin/bash
cd "$(dirname "$0")"
echo "============================================"
echo "  研究生BTI - 课题组牛马人格鉴定所 (macOS)"
echo "============================================"
echo

# 1) 检查 Node.js
if ! command -v npm >/dev/null 2>&1; then
  echo "未检测到 Node.js。请先到 https://nodejs.org 下载安装 Node (LTS) 版，再重新双击本文件。"
  read -p "按回车键退出..."
  exit 1
fi

# 2) Windows 装的 node_modules 在 Mac 上不通用，自动重装
if [ ! -d node_modules ] || [ -f node_modules/.installed-on-windows ]; then
  echo "正在为 Mac 安装依赖（首次可能要几分钟）..."
  rm -rf node_modules
  npm install || { echo "安装失败，请检查网络/代理后重试。"; read -p "按回车键退出..."; exit 1; }
fi

# 3) 启动并自动打开浏览器（关闭本窗口即停止）
npm run dev -- --open
read -p "服务器已停止，按回车键退出..."
