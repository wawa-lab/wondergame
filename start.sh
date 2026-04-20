#!/bin/bash
# 皇女成长计划 - 快速启动脚本

echo "🌸 正在启动皇女成长计划..."
echo ""

# 检查是否已安装依赖
if [ ! -d "backend/node_modules" ]; then
  echo "📦 安装后端依赖..."
  cd backend && npm install && cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
  echo "📦 安装前端依赖..."
  cd frontend && npm install --legacy-peer-deps && cd ..
fi

# 杀掉占用端口的进程
lsof -ti:3001 | xargs kill -9 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null
sleep 1

# 启动后端
echo "🏯 启动后端服务 (端口3001)..."
cd backend && node src/server.js &
BACKEND_PID=$!
cd ..
sleep 2

# 验证后端
if curl -s http://localhost:3001/api/health > /dev/null; then
  echo "✅ 后端服务启动成功！"
else
  echo "❌ 后端启动失败，请检查错误"
  exit 1
fi

# 启动前端
echo "🎮 启动前端服务 (端口3000)..."
cd frontend && BROWSER=none DANGEROUSLY_DISABLE_HOST_CHECK=true npm start &
FRONTEND_PID=$!
cd ..

echo ""
echo "🎉 启动完成！"
echo ""
echo "📡 后端API: http://localhost:3001"
echo "🌐 游戏界面: http://localhost:3000"
echo ""
echo "在浏览器中打开: http://localhost:3000"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 等待
wait

