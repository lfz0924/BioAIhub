#!/bin/bash
cd "$(dirname "$0")"
echo "------------------------------------------------"
echo "🚀 BioIntelligence Hub - IMA 代理启动器"
echo "------------------------------------------------"
if ! command -v node &> /dev/null
then
    echo "❌ 错误: 未检测到 Node.js 环境。"
    echo "请先安装 Node.js (https://nodejs.org)"
    read -p "按回车键退出..."
    exit
fi

if [ ! -d "node_modules" ]; then
    echo "📦 正在安装必要的组件 (首次运行)..."
    npm install express cors http-proxy-middleware
fi

echo "✅ 代理正在启动..."
node ima-proxy.js
