#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function testSubSceneDialogue() {
  console.log('🧪 测试子场景对话系统\n');

  try {
    // 1. 模拟获取初始游戏数据
    console.log('1️⃣  获取初始游戏数据...');
    const gameRes = await axios.get(`${BASE_URL}/game/status`);
    console.log('✅ 游戏初始化成功');
    console.log(`   等级: ${gameRes.data.data.character.level}\n`);

    // 2. 与皇后对话，触发选项
    console.log('2️⃣  与皇后对话...');
    const talkRes = await axios.post(`${BASE_URL}/npc/talk`, { npcId: 'empress' });
    console.log('✅ 对话成功');
    console.log(`   对话内容: ${talkRes.data.data.dialogue}\n`);

    // 3. 触发宇文拓子场景对话选择
    console.log('3️⃣  选择宇文拓相关对话...');
    const choiceRes = await axios.post(`${BASE_URL}/npc/choice`, {
      npcId: 'empress',
      choiceId: 'meet_yuwentuo'
    });

    const consequence = choiceRes.data.data.consequence;
    console.log('✅ 选择成功');
    console.log(`   对话类型: ${consequence.type}`);
    console.log(`   场景: ${consequence.scene}`);
    console.log(`   NPC图片: ${consequence.characterImage}`);
    console.log(`   对话数量: ${consequence.subSceneDialogues?.length || 0}`);

    if (consequence.subSceneDialogues) {
      console.log('\n   📝 所有对话:');
      consequence.subSceneDialogues.forEach((dialogue, idx) => {
        console.log(`      [${idx + 1}] ${dialogue.substring(0, 60)}...`);
      });
    }

    // 4. 验证数据完整性
    console.log('\n4️⃣  验证数据完整性:');
    const checks = [
      { name: '有效的 consequence 类型', pass: consequence.type === 'scene_character' },
      { name: '有效的场景 ID', pass: !!consequence.scene },
      { name: '有有效的角色图片路径', pass: !!consequence.characterImage },
      { name: '有有效的对话数组', pass: Array.isArray(consequence.subSceneDialogues) && consequence.subSceneDialogues.length > 0 },
      { name: '第一条对话与 nextDialogue 相同', pass: consequence.subSceneDialogues?.[0] === consequence.nextDialogue },
      { name: '有多条对话（超过1条）', pass: consequence.subSceneDialogues?.length > 1 },
      { name: '有子场景选项数据', pass: !!consequence.subSceneChoices },
    ];

    checks.forEach(check => {
      const status = check.pass ? '✅' : '❌';
      console.log(`   ${status} ${check.name}`);
    });

    const allPass = checks.every(c => c.pass);

    if (allPass) {
      console.log('\n🎉 所有检查通过！子场景对话系统工作正常。');
    } else {
      console.log('\n⚠️  某些检查失败，请检查数据结构。');
      console.log('\n📊 完整的 consequence 对象:');
      console.log(JSON.stringify(consequence, null, 2));
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('   响应数据:', error.response.data);
    }
    process.exit(1);
  }
}

// 运行测试
testSubSceneDialogue();

