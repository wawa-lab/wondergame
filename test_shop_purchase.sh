#!/bin/bash

echo "🛍️  测试商店购买功能"
echo "=========================================="

# 获取商店中的第一个物品
SHOP_RESPONSE=$(curl -s http://localhost:3001/api/shop)
ITEM_ID=$(echo $SHOP_RESPONSE | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['data'][0]['id'] if data['data'] else '')")
ITEM_NAME=$(echo $SHOP_RESPONSE | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['data'][0]['name'] if data['data'] else '')")
ITEM_PRICE=$(echo $SHOP_RESPONSE | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['data'][0]['price'] if data['data'] else '')")

echo -e "\n第一个物品: $ITEM_NAME (价格: $ITEM_PRICE 金币)"
echo "Item ID: $ITEM_ID"

# 获取购买前的金币数
BEFORE_PURCHASE=$(curl -s http://localhost:3001/api/character)
GOLD_BEFORE=$(echo $BEFORE_PURCHASE | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['data']['gold'])")
INVENTORY_BEFORE=$(echo $BEFORE_PURCHASE | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data['data'].get('inventory', [])))")

echo -e "\n购买前状态:"
echo "   金币: $GOLD_BEFORE"
echo "   背包物品数: $INVENTORY_BEFORE"

# 进行购买
echo -e "\n执行购买..."
BUY_RESPONSE=$(curl -s -X POST http://localhost:3001/api/shop/buy \
  -H "Content-Type: application/json" \
  -d "{\"itemId\":\"$ITEM_ID\"}")

SUCCESS=$(echo $BUY_RESPONSE | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['success'])")
MESSAGE=$(echo $BUY_RESPONSE | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('message', 'Unknown'))")

echo "   响应: $MESSAGE"

if [ "$SUCCESS" = "True" ]; then
  # 获取购买后的金币数
  GOLD_AFTER=$(echo $BUY_RESPONSE | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['data']['character']['gold'])")
  INVENTORY_AFTER=$(echo $BUY_RESPONSE | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data['data']['character'].get('inventory', [])))")

  echo -e "\n购买后状态:"
  echo "   金币: $GOLD_AFTER (消耗了 $((GOLD_BEFORE - GOLD_AFTER)) 金币)"
  echo "   背包物品数: $INVENTORY_AFTER"

  # 验证
  if [ "$INVENTORY_AFTER" -gt "$INVENTORY_BEFORE" ]; then
    echo -e "\n✅ 购买成功！物品已添加到背包"
  else
    echo -e "\n❌ 购买失败！物品未添加到背包"
  fi
else
  echo -e "\n❌ 购买请求失败: $MESSAGE"
fi

echo -e "\n=========================================="

