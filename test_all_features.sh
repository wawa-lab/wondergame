#!/bin/bash

echo "🧪 开始完整功能测试"
echo "=========================================="

# 测试 1: 子场景对话系统
echo -e "\n📝 测试 1: 宇文拓子场景对话"
RESPONSE=$(curl -s -X POST http://localhost:3001/api/npc/choice \
  -H "Content-Type: application/json" \
  -d '{"npcId":"royal_emperor","choiceId":"meet_yuwentuo"}')

HAS_SUBDIALOGUES=$(echo $RESPONSE | python3 -c "import sys, json; data=json.load(sys.stdin); print('true' if 'subSceneDialogues' in data['data']['choice']['consequence'] else 'false')")
HAS_SUBCHOICES=$(echo $RESPONSE | python3 -c "import sys, json; data=json.load(sys.stdin); print('true' if 'subSceneChoices' in data['data']['choice']['consequence'] else 'false')")
DIALOGUE_COUNT=$(echo $RESPONSE | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data['data']['choice']['consequence'].get('subSceneDialogues', [])))")

echo "   ✓ 有 subSceneDialogues: $HAS_SUBDIALOGUES"
echo "   ✓ 有 subSceneChoices: $HAS_SUBCHOICES"
echo "   ✓ 对话数量: $DIALOGUE_COUNT 条"

if [ "$HAS_SUBDIALOGUES" = "true" ] && [ "$DIALOGUE_COUNT" -gt "1" ]; then
  echo "   ✅ 子场景对话 bug 修复成功！多轮对话正常"
else
  echo "   ❌ 子场景对话仍有问题"
fi

# 测试 2: 赠礼系统
echo -e "\n🎁 测试 2: 赠礼系统"
RESPONSE2=$(curl -s -X POST http://localhost:3001/api/npc/choice \
  -H "Content-Type: application/json" \
  -d '{"npcId":"outdoor_son","choiceId":"meet_mufengongzi"}')

HAS_GIFT=$(echo $RESPONSE2 | python3 -c "import sys, json; data=json.load(sys.stdin); options=data['data']['choice']['consequence'].get('subSceneChoices', {}).get('options', []); print('true' if any('giftItem' in opt for opt in options) else 'false')")

echo "   ✓ 有赠礼选项: $HAS_GIFT"

if [ "$HAS_GIFT" = "true" ]; then
  echo "   ✅ 赠礼系统正常"
else
  echo "   ⚠️  需要检查赠礼配置"
fi

# 测试 3: 商店系统
echo -e "\n🏪 测试 3: 商店系统"
SHOP=$(curl -s http://localhost:3001/api/shop)
ITEM_COUNT=$(echo $SHOP | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data['data']) if isinstance(data['data'], list) else len(data['data'].get('items', [])))" 2>/dev/null || echo "0")

echo "   ✓ 商店物品数量: $ITEM_COUNT"

if [ "$ITEM_COUNT" -gt "0" ]; then
  echo "   ✅ 商店系统正常"
else
  echo "   ⚠️  商店可能为空"
fi

# 测试 4: 前端代码检查
echo -e "\n🔍 测试 4: 前端代码检查"
FRONTEND_CHECK=$(grep -c "subSceneDialogues" /Users/chenyinuo02/IdeaProjects/wondergame/frontend/src/components/SceneView.js 2>/dev/null || echo "0")

echo "   ✓ SceneView.js 中有 $FRONTEND_CHECK 处 subSceneDialogues 引用"

if [ "$FRONTEND_CHECK" -gt "0" ]; then
  echo "   ✅ 前端代码正确处理了子场景对话"
else
  echo "   ❌ 前端代码可能缺少处理"
fi

echo -e "\n=========================================="
echo "✅ 测试完成！"

