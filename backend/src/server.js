try { require('dotenv').config(); } catch(e) {}
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { heroCharacter, wardrobe, scenes, npcs, courses, skillConfig, shopItems, storyItems, riddleQuestions, earnActivities, AGE_CONFIG, ENDINGS } = require('./data/gameData');

const JWT_SECRET = process.env.JWT_SECRET || 'wondergame_dev_secret';

const app = express();
const PORT = process.env.PORT || 3001;

// ==================== Supabase 客户端 ====================
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// ==================== 玩家状态缓存（30秒TTL，减少DB读次数） ====================
const stateCache = new Map(); // Map<playerId, { gameState, activityLog, cachedAt }>
const CACHE_TTL_MS = 30_000;

// ==================== 构建初始游戏状态 ====================
function buildFreshGameState() {
  const fresh = JSON.parse(JSON.stringify(heroCharacter));
  fresh.gameMonth = 1;
  fresh.gameStartTime = Date.now();
  fresh.inventory = [];
  fresh.activityCounts = heroCharacter.activityCounts ? JSON.parse(JSON.stringify(heroCharacter.activityCounts)) : {};
  fresh.eventFlags = heroCharacter.eventFlags ? JSON.parse(JSON.stringify(heroCharacter.eventFlags)) : {};
  fresh.subSceneVisits = {};
  fresh.unlockedStoryNodes = [];
  fresh.roomActivityCounts = {};
  fresh.roomActivityMonth = 1;
  // 初始衣橱解锁状态（存在gameState中，不再污染静态wardrobe对象）
  const INITIAL_DRESS_IDS = ['outfit_04', 'outfit_06'];
  const wardrobeUnlocks = {};
  wardrobe.dresses.forEach(d => { if (INITIAL_DRESS_IDS.includes(d.id)) wardrobeUnlocks[d.id] = true; });
  wardrobe.accessories.forEach(a => { if (a.unlocked) wardrobeUnlocks[a.id] = true; });
  wardrobe.shoes.forEach(s => { if (s.unlocked) wardrobeUnlocks[s.id] = true; });
  fresh.wardrobeUnlocks = wardrobeUnlocks;
  // 玩家元数据（原存 localStorage，现迁移到后端）
  fresh.fatigue = 0;
  fresh.courseAttendCount = {};
  fresh.courseStreak = {};
  // 前端本地状态迁移到后端
  fresh.jadeCoins = 0;
  fresh.unlockedScenes = [];
  fresh.sceneVisitCounts = {};
  fresh.peachIslandVisits = 0;
  fresh.courtTalkCounts = {};
  fresh.achievedEndings = [];
  return fresh;
}

// ==================== 衣橱视图（叠加玩家解锁状态） ====================
function getPlayerWardrobe(gameState) {
  const unlocks = gameState.wardrobeUnlocks || {};
  return {
    dresses: wardrobe.dresses.map(d => ({ ...d, unlocked: !!unlocks[d.id] })),
    accessories: wardrobe.accessories.map(a => ({ ...a, unlocked: !!unlocks[a.id] })),
    shoes: wardrobe.shoes.map(s => ({ ...s, unlocked: !!unlocks[s.id] })),
  };
}

// ==================== DB 读写 ====================
async function loadState(playerId) {
  const cached = stateCache.get(playerId);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return { gameState: cached.gameState, activityLog: cached.activityLog };
  }

  const { data, error } = await supabase
    .from('game_saves')
    .select('game_state, activity_log')
    .eq('player_id', playerId)
    .maybeSingle();

  if (error) throw error;

  let gs, al;
  if (data) {
    gs = data.game_state;
    al = data.activity_log || [];
    // 兼容旧存档：补充缺失字段
    if (!gs.wardrobeUnlocks) {
      const INITIAL_DRESS_IDS = ['outfit_04', 'outfit_06'];
      gs.wardrobeUnlocks = {};
      wardrobe.dresses.forEach(d => { if (INITIAL_DRESS_IDS.includes(d.id)) gs.wardrobeUnlocks[d.id] = true; });
      wardrobe.accessories.forEach(a => { if (a.unlocked) gs.wardrobeUnlocks[a.id] = true; });
      wardrobe.shoes.forEach(s => { if (s.unlocked) gs.wardrobeUnlocks[s.id] = true; });
    }
    if (!gs.roomActivityCounts) gs.roomActivityCounts = {};
    if (!gs.roomActivityMonth) gs.roomActivityMonth = gs.gameMonth || 1;
    if (!gs.subSceneVisits) gs.subSceneVisits = {};
    if (!gs.unlockedStoryNodes) gs.unlockedStoryNodes = [];
    if (!gs.activityCounts) gs.activityCounts = {};
    if (!gs.eventFlags) gs.eventFlags = {};
    if (!gs.inventory) gs.inventory = [];
    if (!gs.npcLastChoice) gs.npcLastChoice = {};
    if (!gs.outfitHistory) gs.outfitHistory = {};
    if (gs.fatigue === undefined) gs.fatigue = 0;
    if (!gs.courseAttendCount) gs.courseAttendCount = {};
    if (!gs.courseStreak) gs.courseStreak = {};
    if (gs.jadeCoins === undefined) gs.jadeCoins = 0;
    if (!gs.unlockedScenes) gs.unlockedScenes = [];
    if (!gs.sceneVisitCounts) gs.sceneVisitCounts = {};
    if (gs.peachIslandVisits === undefined) gs.peachIslandVisits = 0;
    if (!gs.courtTalkCounts) gs.courtTalkCounts = {};
    if (!gs.achievedEndings) gs.achievedEndings = [];
  } else {
    // 首次玩家：初始化
    gs = buildFreshGameState();
    al = [{ id: uuidv4(), timestamp: new Date().toISOString(), action: '开始新游戏', result: '凌若雪的传奇人生从这里开始...' }];
    const { error: insertError } = await supabase
      .from('game_saves')
      .upsert({ player_id: playerId, game_state: gs, activity_log: al }, { onConflict: 'player_id', ignoreDuplicates: true });
    if (insertError) throw insertError;
  }

  stateCache.set(playerId, { gameState: gs, activityLog: al, cachedAt: Date.now() });
  return { gameState: gs, activityLog: al };
}

async function saveState(playerId, gameState, activityLog) {
  stateCache.set(playerId, { gameState, activityLog, cachedAt: Date.now() });
  const { error } = await supabase
    .from('game_saves')
    .upsert({ player_id: playerId, game_state: gameState, activity_log: activityLog }, { onConflict: 'player_id' });
  if (error) throw error;
}

// ==================== 日志工具 ====================
function addLogEntry(activityLog, action, result) {
  activityLog.unshift({ id: uuidv4(), timestamp: new Date().toISOString(), action, result });
  if (activityLog.length > 50) activityLog.pop();
}

// 月份工具：将gameMonth转为 { age, monthInYear, gameMonth, isEnd }
// gameMonth: 1=15岁1月, 2=15岁2月, ..., 12=15岁12月, 13=16岁1月, ..., 36=17岁12月, 37=18岁1月(游戏结束)
function getMonthInfo(gm) {
  const safeGm = Math.max(1, Math.min(37, gm || 1));
  const ageOffset = Math.floor((safeGm - 1) / 12);
  const age = 15 + ageOffset;
  const monthInYear = ((safeGm - 1) % 12) + 1;
  const isEnd = safeGm >= 37;
  return { age, monthInYear, gameMonth: safeGm, isEnd };
}

// ==================== 工具函数（全部接受 gameState 参数，不依赖全局变量） ====================
function clampSkill(value) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

const EXP_THRESHOLDS = [0, 150, 350, 600, 900, 1300, 1800, 2500, 3400, 4500];

function checkLevelUp(gameState) {
  const nextLevel = gameState.level + 1;
  if (nextLevel < EXP_THRESHOLDS.length && gameState.exp >= EXP_THRESHOLDS[nextLevel]) {
    gameState.level = nextLevel;
    return true;
  }
  return false;
}

function getTotalSkill(gameState) {
  return Object.values(gameState.skills).reduce((sum, val) => sum + (val || 0), 0);
}

const AGE_MONTH_THRESHOLDS = { 13: 16, 25: 17, 37: 18 };

function checkAgeGrowth(gameState) {
  const currentAge = gameState.age || 15;
  const currentMonth = gameState.gameMonth || 1;
  const targetAge = AGE_MONTH_THRESHOLDS[currentMonth];
  if (!targetAge || targetAge <= currentAge) return null;
  const threshold = AGE_CONFIG.ageThresholds[currentAge];
  return {
    shouldGrow: true,
    oldAge: currentAge,
    newAge: targetAge,
    ageConfig: AGE_CONFIG.ageThresholds[targetAge] || AGE_CONFIG.ageThresholds[18],
    title: AGE_CONFIG.ageTitles[targetAge] || gameState.title,
    achievedTitle: threshold?.title || '',
    achievedDesc: threshold?.desc || '',
  };
}

function applyAgeGrowth(gameState, newAge) {
  const oldTitle = gameState.title;
  gameState.age = newAge;
  gameState.title = AGE_CONFIG.ageTitles[newAge] || oldTitle;
  // 自动解锁新年龄对应服装（存入 wardrobeUnlocks，不污染静态数据）
  if (!gameState.wardrobeUnlocks) gameState.wardrobeUnlocks = {};
  const newlyUnlocked = [];
  wardrobe.dresses.forEach(dress => {
    if (dress.ageRequired === newAge && !gameState.wardrobeUnlocks[dress.id] && !dress.purchasePrice) {
      gameState.wardrobeUnlocks[dress.id] = true;
      newlyUnlocked.push({ id: dress.id, name: dress.name, subtitle: dress.subtitle, image: dress.image, emoji: dress.emoji });
    }
  });
  const storyNode = `age_grow_${newAge}`;
  if (!gameState.unlockedStoryNodes) gameState.unlockedStoryNodes = [];
  if (!gameState.unlockedStoryNodes.includes(storyNode)) gameState.unlockedStoryNodes.push(storyNode);
  return newlyUnlocked;
}

function updateActivityCounts(gameState, courseId) {
  if (!gameState.activityCounts) gameState.activityCounts = {};
  const ac = gameState.activityCounts;
  ac.labor_total = (ac.labor_total || 0) + 1;
  const huntingIds = ['hunting', 'archery', 'racing'];
  const herbIds = ['herb_picking', 'herb_study', 'learn_medicine'];
  const treatIds = ['treat_patient'];
  const performIds = ['court_dance', 'dance_class', 'performance', 'poetry_contest', 'street_perform'];
  const courtIds = ['audience', 'court_dance', 'poetry_contest', 'tea_ceremony'];
  const animalIds = ['ranch_care', 'animal_care', 'nature_study'];
  const miningIds = ['mining', 'forging', 'pottery'];
  const workshopIds = ['woodwork', 'forging', 'pottery', 'crafting'];
  const skyIds = ['sky_gazing', 'astronomy'];
  const fortuneIds = ['fortune_telling', 'divination', 'sky_gazing'];
  const sleepIds = ['rest', 'sleep', 'idle', 'do_nothing'];
  if (huntingIds.includes(courseId)) ac.hunting = (ac.hunting || 0) + 1;
  if (herbIds.includes(courseId)) ac.herb_picking = (ac.herb_picking || 0) + 1;
  if (treatIds.includes(courseId)) ac.treat_patient = (ac.treat_patient || 0) + 1;
  if (performIds.includes(courseId)) ac.performance = (ac.performance || 0) + 1;
  if (courtIds.includes(courseId)) ac.court_activity = (ac.court_activity || 0) + 1;
  if (animalIds.includes(courseId)) ac.animal_care = (ac.animal_care || 0) + 1;
  if (miningIds.includes(courseId)) ac.mining = (ac.mining || 0) + 1;
  if (workshopIds.includes(courseId)) ac.workshop = (ac.workshop || 0) + 1;
  if (skyIds.includes(courseId)) ac.sky_gazing = (ac.sky_gazing || 0) + 1;
  if (fortuneIds.includes(courseId)) ac.fortune_telling = (ac.fortune_telling || 0) + 1;
  if (sleepIds.includes(courseId)) ac.sleep_count = (ac.sleep_count || 0) + 1;
  if ((ac.sky_gazing || 0) >= 6 && (ac.fortune_telling || 0) >= 5) {
    if (!gameState.eventFlags) gameState.eventFlags = {};
    gameState.eventFlags.fourth_wall_broken = true;
  }
}

// ==================== 稀有随机事件 ====================
const RARE_EVENTS = [
  {
    id: 'rare_doctor_mentor',
    title: '妙手传承',
    text: '行至百草堂附近，一位须发皆白的老大夫突然晕倒在街边。四周百姓围观却无人施救，你上前查看，发现是中暑昏厥。你取出随身药囊，施以针灸急救……',
    condition: (gs) => !(gs.eventFlags?.rare_doctor_mentor),
    scene: 'medicine_hall',
    fallbackImage: '/assets/events/rare_event_doctor.png',
    imagePrompt: 'Ancient Chinese medicine hall street scene, an elderly white-bearded doctor collapsed on the ground, concerned bystanders watching, a young woman in hanfu kneeling to help, traditional Chinese medicine shop background, warm afternoon light, detailed ink wash painting style, ultra-wide 16:9 horizontal composition, cinematic',
    interactiveSpots: [
      { id: 'correct', label: '老大夫', hint: '须发皆白、手持药箱的老者', x: 38, y: 62, w: 18, h: 22, correct: true },
      { id: 'wrong1', label: '围观路人', hint: '这只是普通路人', x: 68, y: 55, w: 14, h: 20, correct: false },
      { id: 'wrong2', label: '药铺掌柜', hint: '掌柜正忙着招揽生意', x: 15, y: 45, w: 16, h: 25, correct: false },
    ],
    interactivePrompt: '老大夫苏醒，凝视着你说：「丫头，你有仁心。老夫行医五十年，这套针法传给你。」',
    effect: (gs) => {
      gs.skills.medical = Math.min(100, (gs.skills.medical || 0) + 10);
      gs.skills.morality = Math.min(100, (gs.skills.morality || 0) + 5);
      gs.eventFlags.rare_doctor_mentor = true;
    },
    gainText: '医术+10，道德+5',
    skillGains: { medical: 10, morality: 5 },
  },
  {
    id: 'rare_performance_talent',
    title: '惊才绝艳',
    text: '翰墨苑的雅集上，你随口吟出一首即兴小曲，竟令在场所有文人雅士停杯侧耳。台下有一人拨开人群，向你深深一揖——他便是京城赫赫有名的梨园班主……',
    condition: (gs) => !(gs.eventFlags?.rare_performance_talent),
    scene: 'art_studio',
    fallbackImage: '/assets/events/rare_event_performance.png',
    imagePrompt: 'Ancient Chinese art studio gathering scene, scholars and artists seated around listening in amazement, a young woman in elegant hanfu standing performing, an old theater master in the crowd bowing respectfully, lanterns and ink paintings as background, golden evening light, ultra-wide 16:9 horizontal cinematic composition, detailed traditional Chinese painting style',
    interactiveSpots: [
      { id: 'correct', label: '梨园班主', hint: '身着戏服、向你行礼的老者', x: 55, y: 50, w: 16, h: 28, correct: true },
      { id: 'wrong1', label: '文人雅士', hint: '这是普通的文人听众', x: 22, y: 52, w: 15, h: 22, correct: false },
      { id: 'wrong2', label: '侍女', hint: '侍女正在斟酒', x: 78, y: 60, w: 12, h: 20, correct: false },
    ],
    interactivePrompt: '班主抬起头，眼中满是赏识：「姑娘天赋异禀，老朽愿倾囊相授！」',
    effect: (gs) => {
      gs.skills.music = Math.min(100, (gs.skills.music || 0) + 8);
      gs.skills.poetry = Math.min(100, (gs.skills.poetry || 0) + 8);
      gs.skills.charm = Math.min(100, (gs.skills.charm || 0) + 5);
      gs.eventFlags.rare_performance_talent = true;
    },
    gainText: '乐艺+8，诗才+8，魅力+5',
    skillGains: { music: 8, poetry: 8, charm: 5 },
  },
  {
    id: 'rare_general_recognition',
    title: '将门虎女',
    text: '将军府演武场外，你无意中看到墙上的兵法阵图，随口指出其中的破绽。身后传来脚步声，一位英武男子大步走来，目光如炬地打量着你……',
    condition: (gs) => !(gs.eventFlags?.rare_general_recognition) && ((gs.skills.courage || 0) >= 50 || (gs.skills.martial || 0) >= 50),
    scene: 'royal_court',
    fallbackImage: '/assets/events/rare_event_general.png',
    imagePrompt: 'Ancient Chinese military mansion training ground, a tall warrior general in armor approaching with intense gaze, a young woman in hanfu standing confidently before a battle formation diagram on the wall, soldiers training in background, dramatic afternoon sunlight, ultra-wide 16:9 horizontal cinematic composition, detailed ink wash style',
    interactiveSpots: [
      { id: 'correct', label: '宇文拓将军', hint: '身着铠甲、目光炯炯的将军', x: 52, y: 30, w: 20, h: 45, correct: true },
      { id: 'wrong1', label: '普通侍卫', hint: '这是寻常的守卫士兵', x: 18, y: 40, w: 14, h: 35, correct: false },
      { id: 'wrong2', label: '兵法图', hint: '这是墙上的阵图，不是人', x: 75, y: 25, w: 18, h: 30, correct: false },
    ],
    interactivePrompt: '宇文拓停在你面前，沉声道：「凌将军的女儿，果然不凡。这套刀法，你若肯学，我亲自教你。」',
    effect: (gs) => {
      gs.skills.martial = Math.min(100, (gs.skills.martial || 0) + 10);
      gs.skills.command = Math.min(100, (gs.skills.command || 0) + 8);
      gs.skills.courage = Math.min(100, (gs.skills.courage || 0) + 5);
      gs.eventFlags.rare_general_recognition = true;
      const yuwenFav = gs.favorability?.yuwentuo;
      if (yuwenFav !== undefined) gs.favorability.yuwentuo = Math.min(100, yuwenFav + 15);
    },
    gainText: '武术+10，统帅+8，胆识+5，宇文拓好感+15',
    skillGains: { martial: 10, command: 8, courage: 5 },
  },
  {
    id: 'rare_lost_child',
    title: '迷路孩童',
    text: '在琳琅繁街的人潮中，你听见一阵哭声。一个约莫五六岁的孩童独自蜷缩在摊位角落，泪眼汪汪地喊着"娘亲"。街上人来人往，却无人停下……',
    condition: (gs) => !(gs.eventFlags?.rare_lost_child),
    scene: 'ancient_street',
    fallbackImage: '/assets/events/rare_event_lost_child.jpg',
    imagePrompt: 'Ancient Chinese busy market street scene, a small crying child in traditional clothes sitting alone near a market stall, crowded street with merchants and passersby, a worried mother figure visible in the background crowd searching, warm golden hour light, ultra-wide 16:9 horizontal cinematic composition, detailed traditional Chinese painting style',
    interactiveSpots: [
      { id: 'correct', label: '孩童的母亲', hint: '正在焦急张望的妇人', x: 62, y: 35, w: 16, h: 32, correct: true },
      { id: 'wrong1', label: '摊贩', hint: '摊贩只顾着叫卖', x: 20, y: 38, w: 14, h: 30, correct: false },
      { id: 'wrong2', label: '路人甲', hint: '这个路人行色匆匆', x: 80, y: 42, w: 12, h: 28, correct: false },
    ],
    interactivePrompt: '妇人扑过来抱住孩子，泪流满面地向你道谢：「多谢姑娘！孩子找到了，找到了！」街坊邻里纷纷称赞，你的善名悄悄传开。',
    effect: (gs) => {
      gs.skills.morality = Math.min(100, (gs.skills.morality || 0) + 8);
      gs.skills.affinity = Math.min(100, (gs.skills.affinity || 0) + 5);
      gs.skills.reputation = Math.min(100, (gs.skills.reputation || 0) + 3);
      gs.eventFlags.rare_lost_child = true;
    },
    gainText: '道德+8，亲和+5，声望+3',
    skillGains: { morality: 8, affinity: 5, reputation: 3 },
  },
  {
    id: 'rare_inn_scholar',
    title: '旅途奇遇',
    text: '悦来居栈的大堂内，一位风尘仆仆的书生独自对着空碗发呆。掌柜悄悄告诉你，他是进京赶考的举子，盘缠被盗，已三日未食……',
    condition: (gs) => !(gs.eventFlags?.rare_inn_scholar),
    scene: 'inn',
    fallbackImage: '/assets/events/rare_event_inn_scholar.jpg',
    imagePrompt: 'Ancient Chinese inn interior, a young scholar in worn travel clothes sitting alone at a table looking dejected, empty bowl in front of him, inn owner whispering to a young woman in hanfu, other travelers in background, warm lantern light, ultra-wide 16:9 horizontal cinematic composition, detailed traditional Chinese painting style',
    interactiveSpots: [
      { id: 'correct', label: '落魄书生', hint: '衣衫褴褛、神情落寞的年轻人', x: 45, y: 38, w: 18, h: 35, correct: true },
      { id: 'wrong1', label: '说书人', hint: '说书人正在讲故事', x: 15, y: 30, w: 16, h: 30, correct: false },
      { id: 'wrong2', label: '商旅客人', hint: '这是普通的住店客人', x: 76, y: 40, w: 14, h: 28, correct: false },
    ],
    interactivePrompt: '书生抬起头，眼中满是感激与惊喜：「姑娘大恩，在下铭记于心。他日若得功名，必当涌泉相报！」你摆摆手，心中却暖意融融。',
    effect: (gs) => {
      gs.skills.morality = Math.min(100, (gs.skills.morality || 0) + 6);
      gs.skills.wisdom = Math.min(100, (gs.skills.wisdom || 0) + 4);
      gs.skills.rhetoric = Math.min(100, (gs.skills.rhetoric || 0) + 3);
      gs.eventFlags.rare_inn_scholar = true;
    },
    gainText: '道德+6，才学+4，口才+3',
    skillGains: { morality: 6, wisdom: 4, rhetoric: 3 },
  },
];

// ── 道具组合效果 ──
const ITEM_COMBOS = [
  {
    id: 'combo_desert_duo',
    items: ['silk_starmap', 'desert_amulet'],
    scene: 'desert_oasis',
    title: '沙漠传说',
    text: '沐风看见你随身携带的星图和护符，眼神中闪过一丝动容：「你把这两样都带着……在沙漠里，这叫做有备而行。跟我来，我带你去一个没有人知道的地方。」',
    effect: (gs) => {
      gs.favorability.desert_friend = Math.min(100, (gs.favorability.desert_friend || 0) + 15);
      gs.skills.spirit = Math.min(100, (gs.skills.spirit || 0) + 5);
      gs.eventFlags.combo_desert_duo_done = true;
    },
    gainText: '沐风好感+15，灵气+5，解锁沐风身世故事',
  },
  {
    id: 'combo_ww_full',
    items: ['ww_letter', 'ww_jade'],
    scene: 'ancient_street',
    title: '月下倾诉',
    text: '王文玉见你将他的手书和玉佩都随身带着，沉默良久，低声说：「你……都留着。」他拉住你的手，将你带到街角的茶馆，说了很多平时说不出口的话。',
    effect: (gs) => {
      gs.favorability.wangwenyu = Math.min(100, (gs.favorability.wangwenyu || 0) + 18);
      if (!gs.subSceneVisits) gs.subSceneVisits = {};
      gs.subSceneVisits.wangwenyu = (gs.subSceneVisits.wangwenyu || 0) + 1;
      gs.eventFlags.combo_ww_full_done = true;
    },
    gainText: '王文玉好感+18，额外计1次拜访',
  },
  {
    id: 'combo_st_full',
    items: ['st_portrait', 'st_inkstone'],
    scene: 'art_studio',
    title: '合作创作',
    text: '司徒仟看见你带着他的画像和砚台，放下手中的笔，走到你面前：「你愿意……和我一起画一幅画吗？就画今天，画你站在这里的样子。」',
    effect: (gs) => {
      gs.favorability.sitouqian = Math.min(100, (gs.favorability.sitouqian || 0) + 18);
      gs.skills.painting = Math.min(100, (gs.skills.painting || 0) + 12);
      gs.skills.poetry = Math.min(100, (gs.skills.poetry || 0) + 8);
      gs.eventFlags.combo_st_full_done = true;
    },
    gainText: '司徒仟好感+18，画艺+12，诗才+8',
  },
  {
    id: 'combo_emperor_full',
    items: ['imperial_inkstone', 'imperial_osmanthus'],
    scene: 'royal_court',
    title: '御前献艺',
    text: '皇上见你带来了御赐端砚和桂花枝，微微一笑：「你倒是都记着。」他当场命人备好纸墨，要你当场赋诗一首，满朝文武见证。',
    effect: (gs) => {
      gs.favorability.royal_emperor = Math.min(100, (gs.favorability.royal_emperor || 0) + 12);
      gs.skills.reputation = Math.min(100, (gs.skills.reputation || 0) + 15);
      gs.skills.statecraft = Math.min(100, (gs.skills.statecraft || 0) + 8);
      gs.eventFlags.combo_emperor_full_done = true;
    },
    gainText: '皇上好感+12，声望+15，政务+8',
  },
  {
    id: 'combo_medicine_full',
    items: ['book_medicine', 'herb_ginseng'],
    scene: 'medicine_hall',
    title: '坐堂义诊',
    text: '白老大夫见你带来了图鉴和人参，眼睛一亮：「好，今天就让你跟着老夫坐诊，把书上的和实际的都对照一遍。」你们一起为街坊义诊了整整一下午。',
    effect: (gs) => {
      gs.activityCounts.treat_patient = (gs.activityCounts.treat_patient || 0) + 2;
      gs.skills.medical = Math.min(100, (gs.skills.medical || 0) + 8);
      gs.skills.morality = Math.min(100, (gs.skills.morality || 0) + 6);
      gs.eventFlags.combo_medicine_full_done = true;
    },
    gainText: '医术+8，道德+6，治病次数+2',
  },
];

function checkCombo(gameState, sceneId) {
  const inv = gameState.inventory || [];
  const hasItem = (id) => inv.some(i => i.id === id);
  if (!gameState.eventFlags) gameState.eventFlags = {};

  const eligible = ITEM_COMBOS.filter(c =>
    c.scene === sceneId &&
    !gameState.eventFlags[`${c.id}_done`] &&
    c.items.every(id => hasItem(id))
  );
  if (eligible.length === 0) return null;
  const combo = eligible[0];
  combo.effect(gameState);
  return { id: combo.id, title: combo.title, text: combo.text, gainText: combo.gainText };
}

// 每年预先抽签：从未触发的稀有事件中随机选1-2个作为本年"计划触发"事件
// 存储在 gameState.rareEventPlan: { year: number, planned: string[] }
function ensureRareEventPlan(gameState) {
  const month = gameState.gameMonth || 1;
  const year = Math.ceil(month / 12); // 1=15岁, 2=16岁, 3=17岁
  if (!gameState.rareEventPlan || gameState.rareEventPlan.year !== year) {
    // 本年尚未抽签，抽出未触发事件中的1-2个
    if (!gameState.eventFlags) gameState.eventFlags = {};
    const pending = RARE_EVENTS.filter(e => e.condition(gameState));
    const count = pending.length === 0 ? 0 : pending.length === 1 ? 1 : (Math.random() < 0.5 ? 1 : 2);
    const shuffled = [...pending].sort(() => Math.random() - 0.5);
    gameState.rareEventPlan = { year, planned: shuffled.slice(0, count).map(e => e.id) };
  }
}

function tryTriggerRareEvent(gameState, sceneId) {
  if (!gameState.eventFlags) gameState.eventFlags = {};
  ensureRareEventPlan(gameState);
  const planned = gameState.rareEventPlan?.planned || [];
  // 找本年计划中、场景匹配、条件满足的事件
  const event = RARE_EVENTS.find(e =>
    planned.includes(e.id) && e.scene === sceneId && e.condition(gameState)
  );
  if (!event) return null;
  // 从计划中移除（触发后不再重复）
  gameState.rareEventPlan.planned = planned.filter(id => id !== event.id);
  return event;
}

// ==================== 年龄节点事件 ====================
const AGE_MILESTONE_EVENTS = {
  16: [
    {
      id: 'milestone_16_martial',
      condition: (gs) => (gs.skills.martial || 0) >= 30 || (gs.skills.courage || 0) >= 30,
      title: '将门传承',
      text: '父亲将你叫到书房，从柜中取出一把古朴的短刀，郑重地放在你手中：「你娘留下的。她说，若你有将门之志，就把它传给你。」',
      effect: (gs) => {
        gs.skills.martial = Math.min(100, (gs.skills.martial || 0) + 8);
        gs.skills.courage = Math.min(100, (gs.skills.courage || 0) + 8);
        gs.eventFlags.milestone_16_martial_done = true;
      },
      gainText: '武术+8，胆识+8，解锁护国女将隐藏对话',
    },
    {
      id: 'milestone_16_wisdom',
      condition: (gs) => (gs.skills.wisdom || 0) >= 30 || (gs.skills.statecraft || 0) >= 20,
      title: '朝堂初窥',
      text: '父亲的旧友——一位致仕的老御史登门拜访。他与你谈论时政，越谈越惊喜，临走时留下一本亲笔注解的《资治通鉴》：「此书赠你，他日若入朝堂，记住民为重。」',
      effect: (gs) => {
        gs.skills.wisdom = Math.min(100, (gs.skills.wisdom || 0) + 8);
        gs.skills.statecraft = Math.min(100, (gs.skills.statecraft || 0) + 8);
        gs.eventFlags.milestone_16_wisdom_done = true;
      },
      gainText: '才学+8，政务+8，解锁女相隐藏对话',
    },
  ],
  17: [
    {
      id: 'milestone_17_romance',
      condition: (gs) => {
        const fav = gs.favorability || {};
        return ['wangwenyu','mufengongzi','sitouqian','desert_friend'].some(id => (fav[id] || 0) >= 50);
      },
      title: '月下心意',
      text: '中秋夜，灯火阑珊处，那个让你心跳加速的人悄悄递来一盏花灯，灯上写着四个字——「有缘再见」。你们相视而笑，什么都没说，却又什么都明白了。',
      effect: (gs) => {
        const fav = gs.favorability || {};
        const npcId = ['wangwenyu','mufengongzi','sitouqian','desert_friend'].find(id => (fav[id] || 0) >= 50);
        if (npcId) gs.favorability[npcId] = Math.min(100, (fav[npcId] || 0) + 10);
        gs.eventFlags.milestone_17_romance_done = true;
      },
      gainText: '与最亲近的人好感+10，情缘加深',
    },
    {
      id: 'milestone_17_free',
      condition: (gs) => (gs.skills.wildness || 0) >= 30 || (gs.skills.spirit || 0) >= 35,
      title: '天地之间',
      text: '一个深夜，你独自溜出府门，爬上城外最高的山头。俯瞰万家灯火，你突然明白：这世界比将军府大得多，而你，比任何人想象的都要自由。',
      effect: (gs) => {
        gs.skills.wildness = Math.min(100, (gs.skills.wildness || 0) + 8);
        gs.skills.spirit = Math.min(100, (gs.skills.spirit || 0) + 8);
        gs.skills.courage = Math.min(100, (gs.skills.courage || 0) + 5);
        gs.eventFlags.milestone_17_free_done = true;
      },
      gainText: '野性+8，灵气+8，胆识+5',
    },
  ],
};

function checkMilestoneEvent(gameState, newAge) {
  const events = AGE_MILESTONE_EVENTS[newAge];
  if (!events) return null;
  if (!gameState.eventFlags) gameState.eventFlags = {};
  for (const ev of events) {
    if (!gameState.eventFlags[`${ev.id}_done`] && ev.condition(gameState)) {
      ev.effect(gameState);
      return { id: ev.id, title: ev.title, text: ev.text, gainText: ev.gainText };
    }
  }
  return null;
}

// ── 限时机会事件（模块级，供 advance-month 和 time-event-choice 共用）──
const TIME_EVENTS = [
  {
    id: 'poetry_festival',
    triggerMonth: 4,  // 15岁第4月
    title: '京城诗会',
    desc: '城中文人雅士齐聚碧波亭，举办一年一度的诗会。才华出众者可一鸣惊人，声名大噪。',
    image: '/assets/events/time_event_poetry.png',
    options: [
      { id: 'attend', label: '欣然赴会', effect: { poetry: 8, reputation: 10, charm: 3 }, desc: '诗才大显，名声远播' },
      { id: 'decline', label: '婉言谢绝', effect: { spirit: 3 }, desc: '独处静思，别有收获' },
    ],
  },
  {
    id: 'epidemic_relief',
    triggerMonth: 16,  // 16岁第4月
    title: '城中瘟疫',
    desc: '京城近郊突发疫情，百姓苦不堪言。有医者在街头施药，急需帮手。',
    image: '/assets/events/time_event_epidemic.png',
    options: [
      { id: 'help', label: '挺身相助', effect: { medical: 10, morality: 12, reputation: 5 }, desc: '仁心仁术，口碑大涨' },
      { id: 'donate', label: '捐银百两', effect: { morality: 6, gold: -100 }, desc: '解囊相助，积德行善', requireGold: 100 },
      { id: 'avoid', label: '绕道而行', effect: { morality: -5 }, desc: '明哲保身，良心难安' },
    ],
  },
  {
    id: 'father_illness',
    triggerMonth: 28,  // 17岁第4月
    title: '父亲抱恙',
    desc: '将军府传来消息，父亲因旧伤复发卧床不起。你是继续在外游历，还是回府侍疾？',
    image: '/assets/events/time_event_father.png',
    options: [
      { id: 'return', label: '立刻回府', effect: { morality: 15, vitality: -5, father_fav: 20 }, desc: '侍疾在侧，孝心感天' },
      { id: 'send_medicine', label: '托人送药', effect: { morality: 5, gold: -50, father_fav: 8 }, desc: '遥寄关怀，略表心意', requireGold: 50 },
      { id: 'continue', label: '继续游历', effect: { morality: -8, father_fav: -10 }, desc: '心有愧疚，但志在四方' },
    ],
  },
];

// ── 京城才女榜（每年5月，满足资格条件才上榜）──
//
// 三年三榜，门槛逐年递增：
//   15岁榜（第1年5月）：初露锋芒——综合评分≥250，且至少一项才艺（诗/乐/画/才学）≥35
//   16岁榜（第2年5月）：名动闺阁——综合评分≥420，且至少两项才艺≥50，声望≥20
//   17岁榜（第3年5月）：名冠京城——综合评分≥620，且至少一项才艺≥75，声望≥40，德行≥35
//
// 综合评分权重：才艺类（诗才×1.3、音律×1.2、丹青×1.1、才学×1.1）为核心；
//              魅力×1.2、声望×1.4 体现社交；德行×0.9、口才×1.0 为辅。
function computeTalentRank(gameState) {
  const sk = gameState.skills || {};
  const month = gameState.gameMonth || 1;
  const age = 15 + Math.floor((month - 1) / 12);

  // 综合评分（才艺类权重更高）
  const playerScore = (sk.poetry||0)*1.3 + (sk.music||0)*1.2 + (sk.painting||0)*1.1 +
                      (sk.wisdom||0)*1.1 + (sk.charm||0)*1.2 + (sk.reputation||0)*1.4 +
                      (sk.rhetoric||0)*1.0 + (sk.morality||0)*0.9 +
                      (sk.medical||0)*0.8 + (sk.culinary||0)*0.7;

  // 才艺四项（用于资格检验）
  const artSkills = [sk.poetry||0, sk.music||0, sk.painting||0, sk.wisdom||0];
  const artAbove = (threshold) => artSkills.filter(v => v >= threshold).length;

  // 各年资格条件
  const QUALIFICATIONS = {
    15: {
      scoreMin: 250,
      check: () => artAbove(35) >= 1,
      failHint: (score) => {
        const hints = [];
        if (score < 250) hints.push(`综合评分不足（当前${Math.round(score)}，需≥250）`);
        if (artAbove(35) < 1) hints.push('诗才、音律、丹青、才学至少需有一项达到35');
        return hints.join('；');
      },
    },
    16: {
      scoreMin: 420,
      check: () => artAbove(50) >= 2 && (sk.reputation||0) >= 20,
      failHint: (score) => {
        const hints = [];
        if (score < 420) hints.push(`综合评分不足（当前${Math.round(score)}，需≥420）`);
        if (artAbove(50) < 2) hints.push('诗才、音律、丹青、才学需至少两项达到50');
        if ((sk.reputation||0) < 20) hints.push(`声望不足（当前${sk.reputation||0}，需≥20）`);
        return hints.join('；');
      },
    },
    17: {
      scoreMin: 620,
      check: () => artAbove(75) >= 1 && (sk.reputation||0) >= 40 && (sk.morality||0) >= 35,
      failHint: (score) => {
        const hints = [];
        if (score < 620) hints.push(`综合评分不足（当前${Math.round(score)}，需≥620）`);
        if (artAbove(75) < 1) hints.push('诗才、音律、丹青、才学至少需有一项达到75');
        if ((sk.reputation||0) < 40) hints.push(`声望不足（当前${sk.reputation||0}，需≥40）`);
        if ((sk.morality||0) < 35) hints.push(`德行不足（当前${sk.morality||0}，需≥35）`);
        return hints.join('；');
      },
    },
  };

  const qual = QUALIFICATIONS[age] || QUALIFICATIONS[17];
  const qualified = playerScore >= qual.scoreMin && qual.check();

  if (!qualified) {
    return { qualified: false, failHint: qual.failHint(playerScore), playerScore: Math.round(playerScore), age };
  }

  // 竞争者：分三届，实力随届次递增
  const BASE = age === 15 ? 0 : age === 16 ? 120 : 280;
  const competitors = [
    { name: '柳如烟', score: BASE + 185 },
    { name: '沈芷兰', score: BASE + 165 },
    { name: '顾明珠', score: BASE + 145 },
    { name: '温婉儿', score: BASE + 205 },
    { name: '裴云舒', score: BASE + 125 },
    { name: '江雪瑶', score: BASE + 175 },
    { name: '林晚晴', score: BASE + 158 },
    { name: '谢含烟', score: BASE + 195 },
    { name: '周清欢', score: BASE + 135 },
  ];

  const rank = competitors.filter(c => c.score > playerScore).length + 1;
  const total = competitors.length + 1;
  const nearbyCompetitors = [...competitors]
    .sort((a, b) => Math.abs(a.score - playerScore) - Math.abs(b.score - playerScore))
    .slice(0, 2);

  // 上榜依据：找出贡献最高的技能
  const skillContributions = [
    { name: '诗才', val: (sk.poetry||0)*1.3 },
    { name: '音律', val: (sk.music||0)*1.2 },
    { name: '丹青', val: (sk.painting||0)*1.1 },
    { name: '才学', val: (sk.wisdom||0)*1.1 },
    { name: '魅力', val: (sk.charm||0)*1.2 },
    { name: '声望', val: (sk.reputation||0)*1.4 },
    { name: '口才', val: (sk.rhetoric||0)*1.0 },
    { name: '医术', val: (sk.medical||0)*0.8 },
    { name: '德行', val: (sk.morality||0)*0.9 },
    { name: '厨艺', val: (sk.culinary||0)*0.7 },
  ].filter(s => s.val > 0).sort((a, b) => b.val - a.val);
  const topSkills = skillContributions.slice(0, 3).map(s => s.name);
  const yearLabel = age === 15 ? '初露锋芒' : age === 16 ? '名动闺阁' : '名冠京城';
  const reason = topSkills.length > 0
    ? `凭借出众的${topSkills.join('、')}，综合评分${Math.round(playerScore)}分，${yearLabel}，位列第${rank}名`
    : `综合评分${Math.round(playerScore)}分，位列第${rank}名`;

  return { qualified: true, rank, total, playerScore: Math.round(playerScore), nearbyCompetitors, reason, age, yearLabel };
}

function computeEnding(gameState) {
  const fav = gameState.favorability || {};
  const visits = gameState.subSceneVisits || {};

  // ── 婚恋资格：好感≥60且拜访≥3次；好感≥75时拜访只需≥2次 ──
  const ROMANCE_NPCS = [
    { id: 'wangwenyu',     endingId: 'marry_wangwenyu' },
    { id: 'mufengongzi',   endingId: 'marry_mufengongzi' },
    { id: 'sitouqian',     endingId: 'marry_sitouqian' },
    { id: 'desert_friend', endingId: 'marry_desert_friend' },
  ];
  // 婚恋结局需要持有对应 NPC 的信物（持有信物可降低好感门槛）
  const ROMANCE_ITEM_MAP = {
    wangwenyu:     ['ww_jade', 'ww_letter'],
    sitouqian:     ['st_inkstone'],
    desert_friend: ['steppe_totem', 'steppe_feather'],
    mufengongzi:   ['steppe_feather'],
  };
  const inv = gameState.inventory || [];
  const hasInvItem = (id) => inv.some(i => i.id === id);
  const hasRomanceItem = (npcId) => (ROMANCE_ITEM_MAP[npcId] || []).some(itemId => hasInvItem(itemId));

  const isRomanceEligible = (n) => {
    const f = fav[n.id] || 0;
    const v = visits[n.id] || 0;
    const hasItem = hasRomanceItem(n.id);
    // 持有信物：好感门槛降低10，拜访次数降低1
    const favThreshold = hasItem ? 50 : 60;
    const visitThreshold = hasItem ? (f >= 65 ? 1 : 2) : (f >= 75 ? 2 : 3);
    return f >= favThreshold && v >= visitThreshold;
  };
  const eligible = ROMANCE_NPCS.filter(isRomanceEligible);

  const pickRomanceEnding = () => {
    if (eligible.length === 0) return null;
    const maxFav = Math.max(...eligible.map(n => fav[n.id] || 0));
    const topCandidates = eligible.filter(n => (fav[n.id] || 0) === maxFav);
    const chosen = topCandidates[Math.floor(Math.random() * topCandidates.length)];
    return ENDINGS.find(e => e.id === chosen.endingId) || null;
  };

  // ── 道具影响结局门槛 ──
  // 持有龙凤定情玉佩：母仪天下好感门槛80降至70
  if (hasInvItem('dragon_phoenix_jade')) {
    const sk = gameState.skills;
    if ((fav.royal_emperor || 0) >= 70
      && (visits.royal_emperor || 0) >= 3
      && sk.charm >= 75 && sk.wisdom >= 75 && sk.statecraft >= 75) {
      const empress = ENDINGS.find(e => e.id === 'empress');
      if (empress) return empress;
    }
  }

  // 持有草原图腾+草原鹰羽：逍遥散人wildness门槛50→40
  if (hasInvItem('steppe_totem') && hasInvItem('steppe_feather')) {
    const sk = gameState.skills;
    if (sk.wildness >= 40 && sk.courage >= 45) {
      const romanceOk = (id) => {
        const f = fav[id] || 0;
        const v = visits[id] || 0;
        return f >= 75 ? v >= 2 : (f >= 60 && v >= 3);
      };
      if (romanceOk('mufengongzi') || romanceOk('wangwenyu') || romanceOk('sitouqian') || romanceOk('desert_friend')) {
        const hermit = ENDINGS.find(e => e.id === 'hermit');
        if (hermit) return hermit;
      }
    }
  }

  // 持有同窗旧事卷：梨园大家painting门槛40→30
  if (hasInvItem('shared_memory_scroll')) {
    const sk = gameState.skills;
    if (sk.music >= 60 && sk.charm >= 55 && sk.painting >= 30 && sk.poetry >= 40) {
      const performer = ENDINGS.find(e => e.id === 'performer');
      if (performer) return performer;
    }
  }

  // 持有本草图鉴：悬壶济世morality门槛55→45
  if (hasInvItem('book_medicine')) {
    const sk = gameState.skills;
    if (sk.medical >= 65 && sk.morality >= 45) {
      const doctor = ENDINGS.find(e => e.id === 'divine_doctor');
      if (doctor) return doctor;
    }
  }

  // ── 按优先级检查结局，婚恋插入 priority=82 位置（低于传奇85/92，高于稀有60）──
  const ROMANCE_INSERT_PRIORITY = 82;
  let romanceInserted = false;
  const nonRomanceSorted = [...ENDINGS]
    .filter(e => !e.id.startsWith('marry_'))
    .sort((a, b) => b.priority - a.priority);

  for (const ending of nonRomanceSorted) {
    if (!romanceInserted && ending.priority <= ROMANCE_INSERT_PRIORITY) {
      romanceInserted = true;
      const re = pickRomanceEnding();
      if (re) return re;
    }
    try { if (ending.check(gameState)) return ending; } catch (e) { /* skip */ }
  }

  // 兜底：若婚恋还未插入（所有结局优先级都>82）
  if (!romanceInserted) {
    const re = pickRomanceEnding();
    if (re) return re;
  }

  return ENDINGS.find(e => e.id === 'ordinary');
}

// ==================== Express 中间件 ====================
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://cynspace.com',
    'https://www.cynspace.com',
    /\.cynspace\.com$/,
    /\.railway\.app$/,
    /\.up\.railway\.app$/,
  ],
  credentials: true,
}));
app.use(bodyParser.json());
app.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

// ==================== JWT 认证中间件 ====================
const PUBLIC_PATHS = ['/api/health', '/api/game-config', '/api/scenes', '/api/shop', '/api/auth/register', '/api/auth/login'];
app.use((req, res, next) => {
  if (PUBLIC_PATHS.includes(req.path)) return next();
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: '未登录，请先登录' });
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.playerId = payload.userId;
    req.username = payload.username;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token 已过期，请重新登录' });
  }
});

// ==================== API 路由 ====================

// ── 注册 ──
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
  if (username.length < 2 || username.length > 20) return res.status(400).json({ success: false, message: '用户名长度须在2-20字符之间' });
  if (password.length < 6) return res.status(400).json({ success: false, message: '密码至少6位' });
  try {
    const { data: existing } = await supabase.from('users').select('id').eq('username', username).maybeSingle();
    if (existing) return res.status(409).json({ success: false, message: '用户名已被占用' });
    const passwordHash = await bcrypt.hash(password, 10);
    const { data: newUser, error } = await supabase.from('users').insert({ username, password_hash: passwordHash }).select('id').single();
    if (error) throw error;
    const token = jwt.sign({ userId: newUser.id, username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, data: { token, username }, message: '注册成功，欢迎来到奇境游记！' });
  } catch (err) { res.status(500).json({ success: false, message: '注册失败', error: err.message }); }
});

// ── 登录 ──
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
  try {
    const { data: user } = await supabase.from('users').select('id, password_hash').eq('username', username).maybeSingle();
    if (!user) return res.status(401).json({ success: false, message: '用户名或密码错误' });
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ success: false, message: '用户名或密码错误' });
    const token = jwt.sign({ userId: user.id, username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, data: { token, username }, message: `欢迎回来，${username}！` });
  } catch (err) { res.status(500).json({ success: false, message: '登录失败', error: err.message }); }
});

// 获取游戏初始数据（所有静态配置）
app.get('/api/game-config', (req, res) => {
  res.json({
    success: true,
    data: {
      wardrobe,
      scenes,
      npcs,
      courses,
      skillConfig,
      shopItems,
      earnActivities,
      ageConfig: AGE_CONFIG
    }
  });
});

// 获取当前角色状态（附带年龄进度信息）
app.get('/api/character', async (req, res) => {
  try {
    const { gameState } = await loadState(req.playerId);
    const totalSkill = getTotalSkill(gameState);
    const currentAge = gameState.age || 15;
    const threshold = AGE_CONFIG.ageThresholds[currentAge];
    const ageProgress = threshold
      ? Math.min(100, Math.round((totalSkill / threshold.requiredTotalSkill) * 100))
      : 100;
    const monthInfo = getMonthInfo(gameState.gameMonth);
    res.json({
      success: true,
      data: {
        ...gameState,
        totalSkill,
        ageProgress,
        ageThreshold: threshold ? threshold.requiredTotalSkill : 9999,
        ageTitle: threshold ? threshold.title : '命运终章',
        ageDesc: threshold ? threshold.desc : '大结局',
      }
    });
  } catch (err) { res.status(500).json({ success: false, message: 'DB错误', error: err.message }); }
});

// 保存玩家元数据（疲劳度、上课次数、连击streak）
app.post('/api/player/meta', async (req, res) => {
  try {
    const { gameState, activityLog } = await loadState(req.playerId);
    const { fatigue, courseAttendCount, courseStreak, reputationGain,
            jadeCoins, unlockedScenes, sceneVisitCounts, peachIslandVisits,
            courtTalkCounts, achievedEndings } = req.body || {};
    if (fatigue !== undefined) gameState.fatigue = Math.max(0, Math.min(100, fatigue));
    if (courseAttendCount !== undefined) gameState.courseAttendCount = courseAttendCount;
    if (courseStreak !== undefined) gameState.courseStreak = courseStreak;
    if (reputationGain !== undefined && typeof reputationGain === 'number') {
      gameState.skills.reputation = Math.min(100, (gameState.skills.reputation || 0) + reputationGain);
    }
    // 前端本地状态同步
    if (jadeCoins !== undefined) gameState.jadeCoins = Math.max(0, jadeCoins);
    if (Array.isArray(unlockedScenes)) gameState.unlockedScenes = unlockedScenes;
    if (sceneVisitCounts !== undefined) gameState.sceneVisitCounts = sceneVisitCounts;
    if (peachIslandVisits !== undefined) gameState.peachIslandVisits = peachIslandVisits;
    if (courtTalkCounts !== undefined) gameState.courtTalkCounts = courtTalkCounts;
    if (Array.isArray(achievedEndings)) gameState.achievedEndings = achievedEndings;
    await saveState(req.playerId, gameState, activityLog);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: 'DB错误', error: err.message }); }
});

// 重置角色（新游戏）
app.post('/api/character/reset', async (req, res) => {
  try {
    stateCache.delete(req.playerId);
    const freshState = buildFreshGameState();
    const freshLog = [{ id: uuidv4(), timestamp: new Date().toISOString(), action: '开始新游戏', result: '凌若雪的传奇人生从这里开始...' }];
    await saveState(req.playerId, freshState, freshLog);
    const resetMonthInfo = getMonthInfo(1);
    res.json({
      success: true,
      data: { ...freshState, monthInfo: resetMonthInfo, gameMonth: 1 },
      message: '游戏已重置！凌若雪的传奇人生从这里开始！'
    });
  } catch (err) { res.status(500).json({ success: false, message: 'DB错误', error: err.message }); }
});

app.post('/api/character/reset-npc-visits', async (req, res) => {
  try {
    const { gameState, activityLog } = await loadState(req.playerId);
    gameState.subSceneVisits = {};
    gameState.npcLastChoice = {};
    await saveState(req.playerId, gameState, activityLog);
    res.json({ success: true, message: 'NPC拜访记录已重置' });
  } catch (err) { res.status(500).json({ success: false, message: 'DB错误', error: err.message }); }
});

// 换装 - 更换服装
app.post('/api/character/change-dress', async (req, res) => {
  try {
    const { dressId } = req.body;
    const { gameState, activityLog } = await loadState(req.playerId);
    const pw = getPlayerWardrobe(gameState);
    const dress = pw.dresses.find(d => d.id === dressId);
    if (!dress) return res.status(404).json({ success: false, message: '找不到该服装' });
    if (!dress.unlocked) return res.status(400).json({ success: false, message: '该服装尚未解锁' });
    if (dress.ageRequired && dress.ageRequired > (gameState.age || 15)) {
      return res.status(400).json({ success: false, message: `此服装需要达到${dress.ageRequired}岁才能穿戴，当前年龄${gameState.age || 15}岁` });
    }
    gameState.currentOutfit.dress = dressId;
    // 记录穿戴次数（用于结局条件判断）
    if (!gameState.outfitHistory) gameState.outfitHistory = {};
    gameState.outfitHistory[dressId] = (gameState.outfitHistory[dressId] || 0) + 1;
    addLogEntry(activityLog, '更换服装', `换上了${dress.name}，${dress.description}`);
    await saveState(req.playerId, gameState, activityLog);
    res.json({ success: true, data: gameState, message: `成功换上了「${dress.name}」！` });
  } catch (err) { res.status(500).json({ success: false, message: 'DB错误', error: err.message }); }
});

// 换装 - 更换配饰
app.post('/api/character/change-accessory', async (req, res) => {
  try {
    const { accessoryId } = req.body;
    const { gameState, activityLog } = await loadState(req.playerId);
    const pw = getPlayerWardrobe(gameState);
    const accessory = pw.accessories.find(a => a.id === accessoryId);
    if (!accessory) return res.status(404).json({ success: false, message: '找不到该配饰' });
    if (!accessory.unlocked) return res.status(400).json({ success: false, message: '该配饰尚未解锁' });
    gameState.currentOutfit.accessory = accessoryId;
    addLogEntry(activityLog, '更换配饰', `戴上了${accessory.name}`);
    await saveState(req.playerId, gameState, activityLog);
    res.json({ success: true, data: gameState, message: `成功戴上了「${accessory.name}」！` });
  } catch (err) { res.status(500).json({ success: false, message: 'DB错误', error: err.message }); }
});

// 购买/解锁服装（金币购买普通服装）
app.post('/api/wardrobe/unlock', async (req, res) => {
  try {
    const { itemId, itemType } = req.body;
    const { gameState, activityLog } = await loadState(req.playerId);
    const pw = getPlayerWardrobe(gameState);
    const priceMap = { common: 50, uncommon: 100, rare: 200, epic: 400, legendary: 800 };

    let item = null;
    if (itemType === 'dress') item = pw.dresses.find(d => d.id === itemId);
    else if (itemType === 'accessory') item = pw.accessories.find(a => a.id === itemId);
    else if (itemType === 'shoes') item = pw.shoes.find(s => s.id === itemId);

    if (!item) return res.status(404).json({ success: false, message: '找不到该物品' });
    if (item.unlocked) return res.status(400).json({ success: false, message: '该物品已解锁' });

    if (!gameState.wardrobeUnlocks) gameState.wardrobeUnlocks = {};

    if (item.ageRequired) {
      const currentAge = gameState.age || 15;
      if (item.ageRequired > currentAge) {
        return res.status(400).json({ success: false, message: `此服装需要达到${item.ageRequired}岁，当前${currentAge}岁` });
      }
      if (item.purchasePrice) {
        const price = item.purchasePrice;
        if (gameState.gold < price) return res.status(400).json({ success: false, message: `金币不足！需要${price}金币，当前只有${gameState.gold}金币` });
        gameState.gold -= price;
        gameState.wardrobeUnlocks[itemId] = true;
        addLogEntry(activityLog, '购买服装', `花费${price}金币，购得${item.name}`);
        await saveState(req.playerId, gameState, activityLog);
        return res.json({ success: true, data: { character: gameState, item: { ...item, unlocked: true } }, message: `成功购买「${item.name}」！花费${price}金币` });
      }
      gameState.wardrobeUnlocks[itemId] = true;
      addLogEntry(activityLog, '年龄解锁服装', `达到${item.ageRequired}岁，自动解锁${item.name}`);
      await saveState(req.playerId, gameState, activityLog);
      return res.json({ success: true, data: { character: gameState, item: { ...item, unlocked: true } }, message: `🎉 解锁了「${item.name}」！` });
    }

    const price = item.purchasePrice || priceMap[item.rarity] || 100;
    if (gameState.gold < price) return res.status(400).json({ success: false, message: `金币不足！需要${price}金币，当前只有${gameState.gold}金币` });
    gameState.gold -= price;
    gameState.wardrobeUnlocks[itemId] = true;
    addLogEntry(activityLog, '购买物品', `花费${price}金币，购得${item.name}`);
    await saveState(req.playerId, gameState, activityLog);
    res.json({ success: true, data: { character: gameState, item: { ...item, unlocked: true } }, message: `成功购买「${item.name}」！花费${price}金币` });
  } catch (err) { res.status(500).json({ success: false, message: 'DB错误', error: err.message }); }
});

// 参加课程
app.post('/api/course/attend', async (req, res) => {
  try {
    const { courseId } = req.body;
    const { gameState, activityLog } = await loadState(req.playerId);
    const course = courses.find(c => c.id === courseId);
    if (!course) return res.status(404).json({ success: false, message: '找不到该课程' });
    for (const [skill, required] of Object.entries(course.requiredSkills || {})) {
      if ((gameState.skills[skill] || 0) < required) {
        const skillName = skillConfig[skill]?.name || skill;
        return res.status(400).json({ success: false, message: `${skillName}不足${required}，无法参加此课程！` });
      }
    }
    if (course.cost.gold && gameState.gold < course.cost.gold) {
      return res.status(400).json({ success: false, message: `金币不足！需要${course.cost.gold}金币` });
    }
    if (course.cost.gold) gameState.gold -= course.cost.gold;
    const skillChanges = {};
    for (const [skill, gain] of Object.entries(course.skillGains)) {
      const before = gameState.skills[skill] || 0;
      gameState.skills[skill] = clampSkill(before + gain);
      skillChanges[skill] = { before, after: gameState.skills[skill], gain: gameState.skills[skill] - before };
    }
    gameState.exp += course.exp;
    const leveledUp = checkLevelUp(gameState);
    const ageGrowthResult = checkAgeGrowth(gameState);
    let ageGrowth = null;
    if (ageGrowthResult && ageGrowthResult.shouldGrow) {
      const newlyUnlocked = applyAgeGrowth(gameState, ageGrowthResult.newAge);
      ageGrowth = { ...ageGrowthResult, newlyUnlockedDresses: newlyUnlocked };
      addLogEntry(activityLog, `🎂 年龄增长：${ageGrowthResult.oldAge}岁 → ${ageGrowthResult.newAge}岁`, `${ageGrowthResult.achievedTitle}阶段已圆满！凌若雪迎来了${ageGrowthResult.newAge}岁，解锁了${newlyUnlocked.length}件新服装！`);
    }
    updateActivityCounts(gameState, courseId);
    // ── 课程精通buff：同一门课上满3次，解锁该课程主技能的被动月增长 ──
    if (!gameState.courseMastery) gameState.courseMastery = {};
    gameState.courseMastery[courseId] = (gameState.courseMastery[courseId] || 0) + 1;
    let masteryUnlocked = false;
    if (gameState.courseMastery[courseId] === 3) {
      if (!gameState.passiveSkillGrowth) gameState.passiveSkillGrowth = {};
      const mainSkill = Object.keys(course.skillGains)[0];
      if (mainSkill && !gameState.passiveSkillGrowth[mainSkill]) {
        gameState.passiveSkillGrowth[mainSkill] = 1;
        masteryUnlocked = true;
        addLogEntry(activityLog, `🌟 精通解锁：${course.name}`, `反复钻研之下，${skillConfig[mainSkill]?.name || mainSkill}已融入日常，每月自动+1`);
      }
    }
    if (course.triggerCombat) {
      const won = Math.random() < 0.7;
      if (won) {
        gameState.activityCounts.combat_won = (gameState.activityCounts.combat_won || 0) + 1;
        if ((gameState.activityCounts.combat_won || 0) >= 3) gameState.eventFlags.border_merit = true;
      }
    }
    let rocketPartFound = false;
    if (course.rocketPartChance && Math.random() < course.rocketPartChance) {
      gameState.eventFlags.rocket_parts_collected = (gameState.eventFlags.rocket_parts_collected || 0) + 1;
      rocketPartFound = true;
      addLogEntry(activityLog, '🚀 发现神秘零件', `在${course.name}中发现了一个奇异的机械零件，共收集${gameState.eventFlags.rocket_parts_collected}/5件`);
    }
    addLogEntry(activityLog, `参加课程：${course.name}`, course.storyText);
    await saveState(req.playerId, gameState, activityLog);
    res.json({
      success: true,
      data: { character: gameState, skillChanges, leveledUp, storyText: course.storyText, ageGrowth, totalSkill: getTotalSkill(gameState), rocketPartFound, rocketPartsTotal: gameState.eventFlags?.rocket_parts_collected || 0, masteryUnlocked, masteryCourseName: masteryUnlocked ? course.name : null },
      message: masteryUnlocked ? `🌟 精通解锁！${course.name}已融入日常，相关技能每月自动+1` : rocketPartFound ? `✅ 完成${course.name}！⚙️ 发现神秘零件！（${gameState.eventFlags.rocket_parts_collected}/5）` : leveledUp ? `🎉 恭喜！完成${course.name}，并升级到${gameState.level}级！` : `✅ 完成${course.name}！`
    });
  } catch (err) { res.status(500).json({ success: false, message: 'DB错误', error: err.message }); }
});

// 获取场景信息和NPC
app.get('/api/scene/:sceneId', async (req, res) => {
  try {
    const { sceneId } = req.params;
    const { gameState, activityLog } = await loadState(req.playerId);
    const scene = scenes.find(s => s.id === sceneId);
    if (!scene) return res.status(404).json({ success: false, message: '找不到该场景' });
    const requiredCharm = scene.requiredCharm || 0;
    if (sceneId === 'royal_court' && requiredCharm > 0 && gameState.skills.charm < requiredCharm) {
      return res.status(403).json({ success: false, message: `魅力值需达到${requiredCharm}才能进入宫廷！当前魅力：${gameState.skills.charm}` });
    }
    // 进入场景加成（每次进入都触发）
    const entryBonus = scene.entryBonus || {};
    const appliedBonus = {};
    for (const [skill, delta] of Object.entries(entryBonus)) {
      if (gameState.skills[skill] !== undefined) {
        gameState.skills[skill] = Math.min(100, gameState.skills[skill] + delta);
        appliedBonus[skill] = delta;
      }
    }
    // 玉石奖励（特定场景每次进入+1玉石，只返回给前端累加到localStorage，不存服务端）
    const jadeGained = scene.jadeReward || 0;
    // 稀有随机事件（5%概率）
    const rareEvent = tryTriggerRareEvent(gameState, sceneId);
    if (rareEvent) {
      addLogEntry(activityLog, `✨ 奇遇：${rareEvent.title}`, rareEvent.text);
    }
    const comboEvent = checkCombo(gameState, sceneId);
    if (comboEvent) {
      addLogEntry(activityLog, `✨ 道具共鸣：${comboEvent.title}`, comboEvent.text);
    }
    if (Object.keys(appliedBonus).length > 0 || jadeGained > 0 || rareEvent || comboEvent) {
      await saveState(req.playerId, gameState, activityLog);
    }
    const sceneNpcs = scene.npcs.map(npcId => npcs[npcId]).filter(Boolean);
    const sceneCourses = courses.filter(c => c.scene === sceneId);
    // 道具解锁的条件活动
    const inv = gameState.inventory || [];
    const unlockedConditionalActivities = (scene.conditionalActivities || []).filter(
      ca => inv.some(i => i.id === ca.requiredItem)
    );
    res.json({ success: true, data: { scene, npcs: sceneNpcs, courses: sceneCourses, currentSkills: gameState.skills, entryBonus: appliedBonus, jadeGained, jade: gameState.jade || 0, rareEvent: rareEvent ? { id: rareEvent.id, title: rareEvent.title, text: rareEvent.text, gainText: rareEvent.gainText, imagePrompt: rareEvent.imagePrompt, fallbackImage: rareEvent.fallbackImage || null, interactiveSpots: rareEvent.interactiveSpots, interactivePrompt: rareEvent.interactivePrompt, skillGains: rareEvent.skillGains } : null, comboEvent, unlockedConditionalActivities } });
  } catch (err) { res.status(500).json({ success: false, message: 'DB错误', error: err.message }); }
});

app.post('/api/scene/conditional-activity', async (req, res) => {
  try {
    const { sceneId, activityId } = req.body;
    const { gameState, activityLog } = await loadState(req.playerId);
    const scene = scenes.find(s => s.id === sceneId);
    if (!scene) return res.status(404).json({ success: false, message: '场景不存在' });

    const activity = (scene.conditionalActivities || []).find(a => a.id === activityId);
    if (!activity) return res.status(404).json({ success: false, message: '活动不存在' });

    // Check item requirement
    const inv = gameState.inventory || [];
    if (!inv.some(i => i.id === activity.requiredItem)) {
      return res.status(400).json({ success: false, message: `需要持有「${activity.requiredItem}」才能进行此活动` });
    }

    // Apply skill gains
    const skillChanges = {};
    for (const [skill, gain] of Object.entries(activity.skillGains || {})) {
      const before = gameState.skills[skill] || 0;
      gameState.skills[skill] = clampSkill(before + gain);
      skillChanges[skill] = { before, after: gameState.skills[skill], gain: gameState.skills[skill] - before };
    }

    // Apply NPC favorability bonus
    if (activity.triggerNpc && activity.triggerFavBonus) {
      if (gameState.favorability[activity.triggerNpc] !== undefined) {
        gameState.favorability[activity.triggerNpc] = Math.min(100, gameState.favorability[activity.triggerNpc] + activity.triggerFavBonus);
      }
    }

    // Track in activityCounts
    updateActivityCounts(gameState, activityId);

    const ageGrowthResult = checkAgeGrowth(gameState);
    let ageGrowth = null;
    if (ageGrowthResult?.shouldGrow) {
      const newlyUnlocked = applyAgeGrowth(gameState, ageGrowthResult.newAge);
      ageGrowth = { ...ageGrowthResult, newlyUnlockedDresses: newlyUnlocked };
    }

    addLogEntry(activityLog, `✨ ${activity.label}`, activity.desc);
    await saveState(req.playerId, gameState, activityLog);

    res.json({
      success: true,
      data: { character: gameState, skillChanges, ageGrowth, totalSkill: getTotalSkill(gameState) },
      message: `✅ ${activity.label}完成！${Object.entries(activity.skillGains || {}).map(([k,v]) => `${k}+${v}`).join('，')}`
    });
  } catch (err) { res.status(500).json({ success: false, message: 'DB错误', error: err.message }); }
});

// 场景道具消耗
app.post('/api/scene/use-item', async (req, res) => {
  try {
    const { itemId, sceneId, npcId } = req.body;
    const { gameState, activityLog } = await loadState(req.playerId);

    // Check player has the item
    const inv = gameState.inventory || [];
    const itemIdx = inv.findIndex(i => i.id === itemId);
    if (itemIdx === -1) return res.status(400).json({ success: false, message: '背包中没有该道具' });

    const item = inv[itemIdx];
    const skillChanges = {};
    let message = '';

    // Apply effects based on item+scene combination
    const SCENE_ITEM_EFFECTS = {
      'food_osmanthus_cake:royal_court': (gs) => {
        if (gs.favorability.royal_lady !== undefined) gs.favorability.royal_lady = Math.min(100, (gs.favorability.royal_lady || 0) + 10);
        gs.eventFlags = gs.eventFlags || {};
        gs.eventFlags.court_boost_active = true;
        return '映月好感+10，本月宫廷活动加成已激活';
      },
      'incense_sandalwood:mountain_monastery': (gs) => {
        gs.skills.spirit = clampSkill((gs.skills.spirit || 0) + 5);
        skillChanges.spirit = { gain: 5 };
        if (Math.random() < 0.3) {
          gs.skills.wisdom = clampSkill((gs.skills.wisdom || 0) + 3);
          skillChanges.wisdom = { gain: 3 };
          return '灵气+5，禅师有感而发，才学+3';
        }
        return '灵气+5，心神澄澈';
      },
      'herb_ginseng:medicine_hall': (gs) => {
        if (gs.favorability.med_doctor !== undefined) gs.favorability.med_doctor = Math.min(100, (gs.favorability.med_doctor || 0) + 12);
        gs.eventFlags = gs.eventFlags || {};
        gs.eventFlags.medicine_boost_active = true;
        return '白老大夫好感+12，本月百草堂活动加成已激活';
      },
      'food_lotus_soup:bedroom': (gs) => {
        if (gs.favorability.bedroom_maid !== undefined) gs.favorability.bedroom_maid = Math.min(100, (gs.favorability.bedroom_maid || 0) + 8);
        gs.skills.charm = clampSkill((gs.skills.charm || 0) + 3);
        skillChanges.charm = { gain: 3 };
        return '春杏好感+8，魅力+3';
      },
    };

    const key = `${itemId}:${sceneId}`;
    const effectFn = SCENE_ITEM_EFFECTS[key];
    if (!effectFn) return res.status(400).json({ success: false, message: '此道具在该场景无法使用' });

    message = effectFn(gameState);

    // Remove item from inventory (consumed)
    gameState.inventory.splice(itemIdx, 1);

    addLogEntry(activityLog, `使用道具：${item.name}`, message);
    await saveState(req.playerId, gameState, activityLog);

    res.json({ success: true, data: { character: gameState, skillChanges }, message: `✅ ${message}` });
  } catch (err) { res.status(500).json({ success: false, message: 'DB错误', error: err.message }); }
});

// 从 dress id 获取 storyTag（civilian/scholar/noble/mystical）
function getOutfitTag(dressId) {
  const dress = wardrobe.dresses.find(d => d.id === dressId);
  return dress?.storyTag || 'civilian';
}

// 检查并发放满足条件的剧情道具，返回新获得的道具列表
function checkAndGrantStoryItems(gameState) {
  if (!gameState.inventory) gameState.inventory = [];
  const newItems = [];
  for (const item of storyItems) {
    if (gameState.inventory.some(i => i.id === item.id)) continue;
    const cond = item.acquireCondition;
    if (!cond) continue;
    let met = false;
    if (cond.npcId && cond.favorability) {
      const fav = gameState.favorability?.[cond.npcId] || 0;
      const age = gameState.age || 15;
      met = fav >= cond.favorability && age >= (cond.age || 0);
    } else if (cond.activityCount) {
      const count = gameState.activityCounts?.[cond.activityCount] || 0;
      const passRandom = cond.random ? Math.random() < cond.random : true;
      met = count >= cond.minCount && passRandom;
    } else if (cond.eventFlag) {
      met = !!gameState.eventFlags?.[cond.eventFlag];
    }
    if (met) {
      gameState.inventory.push({
        id: item.id, name: item.name, emoji: item.emoji,
        category: item.category, description: item.description,
        rarity: item.rarity, isStoryItem: true,
        effect: item.effect || {}
      });
      // 应用一次性技能加成
      if (item.effect && gameState.skills) {
        for (const [sk, val] of Object.entries(item.effect)) {
          if (typeof val === 'number') {
            gameState.skills[sk] = Math.min(100, (gameState.skills[sk] || 0) + val);
          }
        }
      }
      newItems.push(item);
    }
  }
  return newItems;
}

// 检查玩家是否持有某剧情道具
function hasStoryItem(gameState, itemId) {
  return !!(gameState.inventory?.some(i => i.id === itemId));
}

// 服装NPC专属台词（4个婚恋对象对特定服装有好感加成）
// 键名对应 wardrobe.dresses 中的真实 id
const OUTFIT_NPC_REACTIONS = {
  wangwenyu: {
    age16_dress1: { line: '王文玉目光微顿，轻声道：「这身红玉清峦……倒是衬得你气度不凡。」', favBonus: 5 },
    age16_dress3: { line: '王文玉失笑：「这身蓝庭梅香穿在你身上，竟也别有一番风味。」', favBonus: 3 },
  },
  mufengongzi: {
    age15_dress3: { line: '幕风公子眼神一亮：「这身绿香书阁……像极了草原上的格格。」', favBonus: 5 },
    age16_dress1: { line: '幕风公子微微皱眉，随即笑道：「中原的红裙穿在你身上倒不像囚笼。」', favBonus: 3 },
  },
  sitouqian: {
    age15_dress2: { line: '司徒仟凝视片刻，提笔道：「你今日这身紫魅风云，我想画下来——可否？」', favBonus: 5 },
    outfit_04:    { line: '司徒仟轻声道：「春光正好，这粉黛罗裙的颜色，与窗外桃花相映成趣。」', favBonus: 3 },
  },
  desert_friend: {
    age16_dress3: { line: '沐风眯起眼睛，嘴角微扬：「这身蓝色……你是要跟我走丝路吗？」', favBonus: 5 },
    age15_dress3: { line: '沐风点头：「这颜色不错，在大漠里不会迷路。」', favBonus: 3 },
  },
};

// 服装 storyTag 通用反应（每个 tag 对 NPC 首次出现时触发一次）
const OUTFIT_TAG_NPC_REACTIONS = {
  wangwenyu: {
    scholar:  { line: '王文玉扫了一眼你的装束，嘴角微扬：「书卷气十足，倒是和这条街上的才女们不同。」', favBonus: 3 },
    mystical: { line: '王文玉微微一怔，轻声道：「这身颜色……有些出尘，不像京城寻常女子。」', favBonus: 3 },
    noble:    { line: '王文玉拱手，神情多了几分郑重：「凌小姐今日这身打扮，倒是比那些贵府千金还要端庄。」', favBonus: 4 },
  },
  mufengongzi: {
    scholar:  { line: '幕风公子歪头看了看你：「书生打扮？草原上从没见过这样的姑娘。」', favBonus: 3 },
    noble:    { line: '幕风公子皱眉：「穿这么正式……你要去宫里觐见？」他顿了顿，「还是说，今天特意打扮过？」', favBonus: 4 },
    mystical: { line: '幕风公子盯着你的衣裳看了一会儿，没说话，只是点了点头，像是认可了什么。', favBonus: 3 },
  },
  sitouqian: {
    civilian: { line: '司徒仟抬头看了你一眼，轻声道：「今天这身……很自然。比那些刻意打扮的好看。」', favBonus: 3 },
    noble:    { line: '司徒仟放下笔：「这身颜色和料子……是哪家绣坊的手艺？我想画下来。」', favBonus: 5 },
    scholar:  { line: '司徒仟眼中闪过一丝欣赏：「书香气。这样的装束，来书画院最合适不过。」', favBonus: 4 },
  },
  desert_friend: {
    scholar:  { line: '沐风歪头打量你：「读书人的打扮，但眼神不像。」他若有所思，「有意思。」', favBonus: 3 },
    noble:    { line: '沐风沉默片刻：「这身衣裳……在大漠里会很显眼。」他补充，「不是坏事。」', favBonus: 3 },
    mystical: { line: '沐风盯着你的衣裳看了一会儿，突然道：「西域的商队里有人穿过这颜色，说是能辟邪。」', favBonus: 4 },
  },
  royal_emperor: {
    noble:    { line: '皇上目光在你身上停了片刻，微微颔首：「今日装束得体，有大家风范。」', favBonus: 4 },
    scholar:  { line: '皇上微微一笑：「朕见过不少才女，却鲜少有人穿成这样来觐见——倒是别有一番风骨。」', favBonus: 3 },
    civilian: { line: '皇上轻声道：「不着意打扮，却自有气度。这倒是难得。」', favBonus: 3 },
  },
};

// 与NPC普通对话（随机台词）
app.post('/api/npc/talk', async (req, res) => {
  try {
    const { npcId, sick } = req.body;
    const { gameState, activityLog } = await loadState(req.playerId);
    const npc = npcs[npcId];
    if (!npc) return res.status(404).json({ success: false, message: '找不到该NPC' });

        const dialoguePool = (sick && npc.sickDialogues && npc.sickDialogues.length > 0) ? npc.sickDialogues : npc.dialogues;
    const randomDialogue = dialoguePool[Math.floor(Math.random() * dialoguePool.length)];
    if (gameState.favorability[npcId] !== undefined) {
      gameState.favorability[npcId] = Math.min(100, gameState.favorability[npcId] + 2);
    }
    // 记录普通对话次数（用于宫廷顺序解锁）
    if (!gameState.npcTalkCount) gameState.npcTalkCount = {};
    gameState.npcTalkCount[npcId] = (gameState.npcTalkCount[npcId] || 0) + 1;

    // 服装NPC专属反应（dress-specific 优先，否则 tag-based 通用反应）
    let outfitReaction = null;
    const npcOutfitMap = OUTFIT_NPC_REACTIONS[npcId];
    const currentDress = gameState.currentOutfit?.dress;
    const currentTag = getOutfitTag(currentDress);
    if (npcOutfitMap && currentDress && npcOutfitMap[currentDress]) {
      const reaction = npcOutfitMap[currentDress];
      if (gameState.favorability[npcId] !== undefined) {
        gameState.favorability[npcId] = Math.min(100, gameState.favorability[npcId] + reaction.favBonus);
      }
      outfitReaction = { line: reaction.line, favBonus: reaction.favBonus, tag: currentTag };
    } else if (OUTFIT_TAG_NPC_REACTIONS[npcId]?.[currentTag]) {
      // tag-based 通用反应（每个 tag 只触发一次，避免刷屏）
      const tagKey = `outfitTagSeen_${npcId}_${currentTag}`;
      if (!gameState.activityCounts[tagKey]) {
        const reaction = OUTFIT_TAG_NPC_REACTIONS[npcId][currentTag];
        gameState.activityCounts[tagKey] = 1;
        if (gameState.favorability[npcId] !== undefined) {
          gameState.favorability[npcId] = Math.min(100, gameState.favorability[npcId] + reaction.favBonus);
        }
        outfitReaction = { line: reaction.line, favBonus: reaction.favBonus, tag: currentTag };
      }
    }
    // 检查剧情道具获取（每次 talk 时触发）
    const newStoryItems = checkAndGrantStoryItems(gameState);

    // 剧情道具持有时 NPC 特殊反应（每个道具对每个 NPC 只触发一次）
    let storyItemReaction = null;
    const STORY_ITEM_NPC_LINES = {
      general_token: {
        mufengongzi: { line: '幕风公子目光落在你腰间的令牌上，眼神一变：「将军府的令牌……你是将军的女儿？」他沉默片刻，「难怪。」', favBonus: 5 },
        royal_emperor: { line: '皇上瞥见你手中的令牌，微微颔首：「凌将军的令牌，你带着它来见朕……倒是有几分胆气。」', favBonus: 4 },
      },
      court_invitation: {
        wangwenyu: { line: '王文玉看见你手中的宫廷请柬，轻声道：「宫里的人赏识你……我早就知道你不只是将军府的千金。」', favBonus: 4 },
        sitouqian: { line: '司徒仟见到请柬，放下笔：「宫廷的人请你？」他顿了顿，「你比我想象的更厉害。」', favBonus: 4 },
      },
      recommendation_letter: {
        sitouqian: { line: '司徒仟接过推荐信看了看，眼中闪过惊喜：「这是……名师的亲笔？」他认真地看着你，「你在诗才大会上赢了？我竟不知道。」', favBonus: 8 },
        wangwenyu: { line: '王文玉扫了一眼推荐信，轻轻笑道：「诗才大会的名师推荐……凌小姐，你让我越来越看不透了。」', favBonus: 5 },
      },
      ancient_star_map: {
        mufengongzi: { line: '幕风公子盯着那张星图看了很久，低声道：「这是……西域的星图？草原上的老人说，能读懂这图的人，天生是要走远路的。」', favBonus: 5 },
      },
    };
    for (const [itemId, npcLines] of Object.entries(STORY_ITEM_NPC_LINES)) {
      if (hasStoryItem(gameState, itemId) && npcLines[npcId]) {
        const reactionKey = `storyItemSeen_${itemId}_${npcId}`;
        if (!gameState.activityCounts[reactionKey]) {
          gameState.activityCounts[reactionKey] = 1;
          const r = npcLines[npcId];
          if (gameState.favorability[npcId] !== undefined) {
            gameState.favorability[npcId] = Math.min(100, gameState.favorability[npcId] + r.favBonus);
          }
          storyItemReaction = { line: r.line, favBonus: r.favBonus };
          break; // 每次只触发一条
        }
      }
    }

    let reward = null;
    if (npcId === 'father' && Math.random() < 0.3) {
      const goldReward = Math.floor(Math.random() * 50) + 20;
      gameState.gold += goldReward;
      reward = { gold: goldReward };
      addLogEntry(activityLog, `与${npc.name}对话`, `${npc.name}："${randomDialogue}" — 父亲赐予了${goldReward}金币！`);
    } else {
      addLogEntry(activityLog, `与${npc.name}对话`, `${npc.name}："${randomDialogue}"`);
    }
    // NPC 对话 EXP +3
    gameState.exp = (gameState.exp || 0) + 3;
    checkLevelUp(gameState);
    await saveState(req.playerId, gameState, activityLog);
    res.json({ success: true, data: { npc, dialogue: randomDialogue, dialogueWithChoice: npc.dialogueWithChoice || null, favorability: gameState.favorability[npcId], reward, outfitReaction, storyItemReaction, newStoryItems, currentOutfitTag: currentTag, character: gameState } });
  } catch (err) { res.status(500).json({ success: false, message: 'DB错误', error: err.message }); }
});

// ==================== NPC 带选项对话处理 ====================

/**
 * 处理玩家选择NPC对话选项
 * body: { npcId, choiceId }
 * 返回: 选择后的结果（场景/角色图/后续对话/奖励）
 */
app.post('/api/npc/choice', async (req, res) => {
  try {
    const { npcId, choiceId } = req.body;
    const { gameState, activityLog } = await loadState(req.playerId);
    const npc = npcs[npcId];
    if (!npc) return res.status(404).json({ success: false, message: '找不到该NPC' });

    // 支持 dialogueSets 格式（按 visitRange 查找当前 set 的 dialogueWithChoice）
    let dialogueWithChoice = npc.dialogueWithChoice;
    let isDialogueSetsNpc = false;
    if (!dialogueWithChoice && npc.dialogueSets && npc.dialogueSets.length > 0) {
      isDialogueSetsNpc = true;
      if (!gameState.subSceneVisits) gameState.subSceneVisits = {};
      // 此次互动算作一次见面，先递增
      gameState.subSceneVisits[npcId] = (gameState.subSceneVisits[npcId] || 0) + 1;
      const visitCount = gameState.subSceneVisits[npcId];
      const matchSet = npc.dialogueSets.find(s => s.visitRange && visitCount >= s.visitRange[0] && visitCount <= s.visitRange[1])
        || npc.dialogueSets[npc.dialogueSets.length - 1];
      dialogueWithChoice = matchSet?.dialogueWithChoice || npc.dialogueWithChoice;
    }
    if (!dialogueWithChoice) return res.status(400).json({ success: false, message: '该NPC没有可选择的对话' });

    // 兼容旧格式（choices数组）和新格式（options数组）
    const optionList = dialogueWithChoice.choices || dialogueWithChoice.options || [];
    const choice = optionList.find(c => c.id === choiceId);
    if (!choice) return res.status(404).json({ success: false, message: '找不到该选项' });
    // 兼容旧格式（choice.consequence）和新格式（dialogueWithChoice.consequences[choiceId]）
    const consequence = choice.consequence || (dialogueWithChoice.consequences && dialogueWithChoice.consequences[choiceId]);
    // 旧格式：consequence.reward.favorability = npcId, reward.value = delta
    if (consequence.reward && consequence.reward.favorability) {
      const favNpcId = consequence.reward.favorability;
      if (!gameState.favorability[favNpcId]) gameState.favorability[favNpcId] = 0;
      gameState.favorability[favNpcId] = Math.min(100, gameState.favorability[favNpcId] + (consequence.reward.value || 5));
    }
    // 新格式：consequence.favorability = delta（数字）, consequence.npcId = npcId
    if (typeof consequence.favorability === 'number' && consequence.npcId) {
      if (!gameState.favorability[consequence.npcId]) gameState.favorability[consequence.npcId] = 0;
      gameState.favorability[consequence.npcId] = Math.max(0, Math.min(100, gameState.favorability[consequence.npcId] + consequence.favorability));
    }
    // 新格式：consequence.skillBonus = { skillKey: delta, ... }
    if (consequence.skillBonus && typeof consequence.skillBonus === 'object') {
      if (!gameState.skills) gameState.skills = {};
      for (const [sk, delta] of Object.entries(consequence.skillBonus)) {
        if (typeof delta === 'number') {
          gameState.skills[sk] = Math.min(100, (gameState.skills[sk] || 0) + delta);
        }
      }
    }
    // 新格式：consequence.giftItem → 加入 inventory
    if (consequence.giftItem) {
      if (!gameState.inventory) gameState.inventory = [];
      const already = gameState.inventory.some(i => i.id === consequence.giftItem.id);
      if (!already) gameState.inventory.push({ id: consequence.giftItem.id, name: consequence.giftItem.name, emoji: consequence.giftItem.emoji || '🎁', rarity: 'rare', desc: consequence.giftItem.desc });
    }
    if (consequence.storyNode) {
      if (!gameState.unlockedStoryNodes) gameState.unlockedStoryNodes = [];
      if (!gameState.unlockedStoryNodes.includes(consequence.storyNode)) gameState.unlockedStoryNodes.push(consequence.storyNode);
    }
    // 宫廷NPC顺序解锁：前一个NPC子场景见面达2次才能见下一个，否则被赶出去
    const courtSequence = ['royal_lady', 'royal_official', 'royal_guard_captain', 'royal_emperor'];
    if (consequence.type === 'scene_character' && courtSequence.includes(consequence.npcId)) {
      if (!gameState.subSceneVisits) gameState.subSceneVisits = {};
      const idx = courtSequence.indexOf(consequence.npcId);
      if (idx > 0) {
        const prevNpcId = courtSequence[idx - 1];
        const prevVisits = gameState.subSceneVisits[prevNpcId] || 0;
        if (prevVisits < 2) {
          const prevNpcName = { royal_lady: '映月', royal_official: '韩大人', royal_guard_captain: '侍卫总领' }[prevNpcId] || prevNpcId;
          const npcName = consequence.npcName || '此人';
          return res.json({ success: true, data: { choice, consequence: { type: 'npc_absent', npcName, reason: `侍卫拦住去路：「闲杂人等不得擅入！」你被礼貌地请了出去。需先与${prevNpcName}多加熟悉（至少2次），方可觐见。` }, character: gameState, favorability: null }, message: '尚未解锁' });
        }
      }
    }
    if (consequence.type === 'scene_character') {
      if (!gameState.subSceneVisits) gameState.subSceneVisits = {};
      const pastVisits = gameState.subSceneVisits[consequence.npcId] || 0;
      // 见面达到上限后，已离开，永远不在（皇上3次，其他NPC5次）
      const maxVisitsMap = { royal_emperor: 3 };
      const maxVisits = maxVisitsMap[consequence.npcId] ?? 5;
      const departureMessages = {
        wangwenyu: '王文玉已离开京城，听说去了江南打理生意，不知何时才能再回来。',
        mufengongzi: '幕风公子已策马离去，回了北地草原，此去山高路远。',
        sitouqian: '司徒仟已离开书画院，听说云游四方去寻访名山大川，以画记途。',
        desert_friend: '沐风已踏上西域的归途，沙漠的风带走了他的身影。',
        royal_emperor: '皇上已移驾行宫，御前侍卫传话：圣驾未回，不便觐见。',
        yuwentuo: '宇文拓将军已奉旨出征，府中侍卫传话：将军领兵在外，不知何时班师。',
        pavilion_poet: '白鹭先生已离开碧波亭，听说云游四海去寻访名山大川，不知何时归来。',
        zen_master: '了尘禅师已闭关修行，弟子传话：禅师闭关期间谢绝访客，请施主改日再来。',
      };
      const npcPresent = pastVisits < maxVisits && (pastVisits === 0 || Math.random() >= 0.3);
      if (!npcPresent) {
        const absentName = consequence.npcName || 'TA';
        const reason = pastVisits >= maxVisits
          ? (departureMessages[consequence.npcId] || `${absentName}已离开，去了远方。`)
          : `${absentName}不在`;
        addLogEntry(activityLog, `${npc.name}：选择了"${choice.text}"`, reason);
        await saveState(req.playerId, gameState, activityLog);
        return res.json({ success: true, data: { choice, consequence: { type: 'npc_absent', npcName: absentName, reason }, character: gameState, favorability: null }, message: reason });
      }
    }
    let resolvedConsequence = { ...consequence };
    if (consequence.type === 'scene_character' && consequence.npcId && consequence.storyStages) {
      if (!gameState.subSceneVisits) gameState.subSceneVisits = {};
      if (!gameState.npcLastChoice) gameState.npcLastChoice = {};
      const visits = (gameState.subSceneVisits[consequence.npcId] || 0) + 1;
      gameState.subSceneVisits[consequence.npcId] = visits;
      const stage = consequence.storyStages.find(s => visits >= s.minVisit && visits <= s.maxVisit) || consequence.storyStages[consequence.storyStages.length - 1];
      const stageIndex = consequence.storyStages.indexOf(stage);

      // 选取本次对话变体：优先用 dialogueVariants 轮换，否则退回 subSceneDialogues
      let dialogues;
      if (stage.dialogueVariants && stage.dialogueVariants.length > 0) {
        const variantIdx = (visits - stage.minVisit) % stage.dialogueVariants.length;
        dialogues = stage.dialogueVariants[variantIdx];
      } else {
        dialogues = stage.subSceneDialogues;
      }

      // 将上次选项文本注入台词（替换占位符 [[lastChoice]]，兼容字符串和 {text,image} 格式）
      const lastChoiceRecord = gameState.npcLastChoice?.[consequence.npcId];
      const lastChoiceText = (lastChoiceRecord?.recallText && lastChoiceRecord.recallText.trim())
        ? lastChoiceRecord.recallText
        : (lastChoiceRecord?.text && lastChoiceRecord.text.trim())
          ? lastChoiceRecord.text
          : '那番话';
      if (dialogues && dialogues.length > 0) {
        dialogues = dialogues.map(line => {
          if (typeof line === 'string') return line.replace(/\[\[lastChoice\]\]/g, lastChoiceText);
          if (typeof line === 'object' && line.text) return { ...line, text: line.text.replace(/\[\[lastChoice\]\]/g, lastChoiceText) };
          return line;
        });
      }

      // 服装 tag 影响：若 stage 有 outfitTagDialogue，在对话列表末尾插入一句 NPC 的穿衣评价
      const currentOutfitTag = getOutfitTag(gameState.currentOutfit?.dress);
      const tagLine = stage.outfitTagDialogue?.[currentOutfitTag];
      if (tagLine && dialogues && dialogues.length > 0) {
        const tagSeenKey = `outfitTagSubScene_${consequence.npcId}_${stageIndex}_${currentOutfitTag}`;
        if (!gameState.activityCounts[tagSeenKey]) {
          gameState.activityCounts[tagSeenKey] = 1;
          const lineObj = typeof tagLine === 'string' ? { text: tagLine } : tagLine;
          dialogues = [...dialogues, lineObj];
        }
      }

      // 选取本次选项变体
      let choices = stage.subSceneChoices;
      if (stage.choiceVariants && stage.choiceVariants.length > 0) {
        const variantIdx = (visits - stage.minVisit) % stage.choiceVariants.length;
        choices = stage.choiceVariants[variantIdx];
      }

      resolvedConsequence = { ...consequence, subSceneDialogues: dialogues, subSceneChoices: choices, visitCount: visits, storyStage: stageIndex + 1, stageImage: stage.stageImage || null };
      delete resolvedConsequence.storyStages;
    }
    // 新格式 consequence.text → nextDialogue（供 ConsequenceView 显示）
    if (resolvedConsequence.text && !resolvedConsequence.nextDialogue) {
      resolvedConsequence = { ...resolvedConsequence, nextDialogue: resolvedConsequence.text };
    }
    const firstDialogue = resolvedConsequence.subSceneDialogues?.[0];
    const firstDialogueText = typeof firstDialogue === 'string' ? firstDialogue : (firstDialogue?.text || resolvedConsequence.nextDialogue || '剧情推进中...');
    addLogEntry(activityLog, `${npc.name}：选择了"${choice.text}"`, firstDialogueText);
    // EXP：子场景按 storyStage 给 8/10/15，普通对话 +3
    let expGain = 0;
    if (consequence.type === 'scene_character') {
      const stage = resolvedConsequence.storyStage || 1;
      expGain = stage >= 3 ? 15 : stage === 2 ? 10 : 8;
    } else if (consequence.type === 'dialogue') {
      expGain = 3;
    }
    if (expGain > 0) { gameState.exp = (gameState.exp || 0) + expGain; checkLevelUp(gameState); }
    await saveState(req.playerId, gameState, activityLog);
    const favReturnId = consequence.npcId || consequence.reward?.favorability;
    res.json({ success: true, data: { choice, consequence: resolvedConsequence, character: gameState, favorability: favReturnId ? gameState.favorability[favReturnId] : null, expGain }, message: consequence.type === 'scene_character' ? `✨ 剧情推进！遭遇了新角色！` : `💬 对话继续...` });
  } catch (err) { res.status(500).json({ success: false, message: 'DB错误', error: err.message }); }
});

// ==================== 年龄系统 API ====================

/**
 * 获取年龄系统状态（进度、阶段信息、年龄专属服装）
 */
app.get('/api/age-status', async (req, res) => {
  try {
    const { gameState } = await loadState(req.playerId);
    const currentAge = gameState.age || 15;
    const totalSkill = getTotalSkill(gameState);
    const threshold = AGE_CONFIG.ageThresholds[currentAge];
    const ageProgress = threshold ? Math.min(100, Math.round((totalSkill / threshold.requiredTotalSkill) * 100)) : 100;
    const ageDresses = wardrobe.dresses.filter(d => d.ageRequired === currentAge);
    const nextAgeDresses = threshold?.nextAge ? wardrobe.dresses.filter(d => d.ageRequired === threshold.nextAge) : [];
    const elapsed = gameState.gameStartTime ? Date.now() - gameState.gameStartTime : 0;
    const elapsedMinutes = Math.round(elapsed / 60000);
    res.json({ success: true, data: { currentAge, totalSkill, ageProgress, requiredTotalSkill: threshold?.requiredTotalSkill || 9999, nextAge: threshold?.nextAge || null, currentAgeTitle: threshold?.title || '命运终章', currentAgeDesc: threshold?.desc || '大结局', ageTitles: AGE_CONFIG.ageTitles, ageDresses, nextAgeDresses, elapsedMinutes, unlockedStoryNodes: gameState.unlockedStoryNodes || [] } });
  } catch (err) { res.status(500).json({ success: false, message: 'DB错误', error: err.message }); }
});

/**
 * 手动触发年龄检查（用于前端轮询检测）
 */
app.post('/api/age/check', async (req, res) => {
  try {
    const { gameState, activityLog } = await loadState(req.playerId);
    const ageGrowthResult = checkAgeGrowth(gameState);
    if (!ageGrowthResult) {
      const currentAge = gameState.age || 15;
      const totalSkill = getTotalSkill(gameState);
      const threshold = AGE_CONFIG.ageThresholds[currentAge];
      return res.json({ success: true, data: { grew: false, currentAge, totalSkill, ageProgress: threshold ? Math.min(100, Math.round((totalSkill / threshold.requiredTotalSkill) * 100)) : 100, requiredTotalSkill: threshold?.requiredTotalSkill || 9999 } });
    }
    const newlyUnlocked = applyAgeGrowth(gameState, ageGrowthResult.newAge);
    addLogEntry(activityLog, `🎂 年龄增长：${ageGrowthResult.oldAge}岁 → ${ageGrowthResult.newAge}岁`, `${ageGrowthResult.achievedTitle}！凌若雪迎来了${ageGrowthResult.newAge}岁生日！`);
    await saveState(req.playerId, gameState, activityLog);
    res.json({ success: true, data: { grew: true, oldAge: ageGrowthResult.oldAge, newAge: ageGrowthResult.newAge, newTitle: AGE_CONFIG.ageTitles[ageGrowthResult.newAge], achievedTitle: ageGrowthResult.achievedTitle, achievedDesc: ageGrowthResult.achievedDesc, newlyUnlockedDresses: newlyUnlocked, character: gameState, totalSkill: getTotalSkill(gameState) }, message: `🎂 凌若雪长大了！从${ageGrowthResult.oldAge}岁迈入${ageGrowthResult.newAge}岁！` });
  } catch (err) { res.status(500).json({ success: false, message: 'DB错误', error: err.message }); }
});

// ==================== 商店 API ====================

// 获取商店商品列表
app.get('/api/shop', (req, res) => {
  res.json({ success: true, data: shopItems });
});

// 购买商店道具（消耗金币，立即获得属性加成）
app.post('/api/shop/buy', async (req, res) => {
  try {
    const { itemId } = req.body;
    const { gameState, activityLog } = await loadState(req.playerId);
    const item = shopItems.find(i => i.id === itemId);
    if (!item) return res.status(404).json({ success: false, message: '找不到该道具' });
    if (gameState.gold < item.price) return res.status(400).json({ success: false, message: `金币不足！需要${item.price}金币，当前只有${gameState.gold}金币` });
    gameState.gold -= item.price;
    const changes = {};
    for (const [skill, gain] of Object.entries(item.effect)) {
      const before = gameState.skills[skill] || 0;
      gameState.skills[skill] = clampSkill(before + gain);
      changes[skill] = { before, after: gameState.skills[skill], gain: gameState.skills[skill] - before };
    }
    if (!gameState.inventory) gameState.inventory = [];
    gameState.inventory.push({ id: uuidv4(), itemId: item.id, name: item.name, emoji: item.emoji, category: item.category, description: item.description, effect: item.effect, rarity: item.rarity, source: 'shop', acquiredAt: new Date().toISOString() });
    addLogEntry(activityLog, `购买道具：${item.name}`, `花费${item.price}金币，获得${item.emoji}${item.name}。${item.description}`);
    const ageGrowthResult = checkAgeGrowth(gameState);
    let ageGrowth = null;
    if (ageGrowthResult && ageGrowthResult.shouldGrow) {
      const newlyUnlocked = applyAgeGrowth(gameState, ageGrowthResult.newAge);
      ageGrowth = { ...ageGrowthResult, newlyUnlockedDresses: newlyUnlocked };
    }
    await saveState(req.playerId, gameState, activityLog);
    res.json({ success: true, data: { character: gameState, changes, ageGrowth }, message: `✅ 成功购买「${item.emoji}${item.name}」，花费${item.price}金币！` });
  } catch (err) { res.status(500).json({ success: false, message: 'DB错误', error: err.message }); }
});

// ==================== 赚钱活动 API ====================

// 获取赚钱活动列表（带解锁状态）
app.get('/api/earn', async (req, res) => {
  try {
    const { gameState } = await loadState(req.playerId);
    const activities = earnActivities.map(act => {
      const canUnlock = Object.entries(act.requiredSkills || {}).every(([skill, required]) => (gameState.skills[skill] || 0) >= required);
      return { ...act, unlocked: canUnlock };
    });
    res.json({ success: true, data: { activities, riddleQuestions } });
  } catch (err) { res.status(500).json({ success: false, message: 'DB错误', error: err.message }); }
});

// 领取积分兑换金币（积分小游戏）
app.post('/api/earn/claim', async (req, res) => {
  try {
    const { amount, source, laborCount } = req.body;
    const { gameState, activityLog } = await loadState(req.playerId);
    const reward = Math.max(0, Math.min(500, Math.round(Number(amount) || 0)));
    gameState.gold += reward;
    // 劳动 EXP：每种劳动 +5
    const expGain = (laborCount || 0) * 5;
    if (expGain > 0) { gameState.exp = (gameState.exp || 0) + expGain; checkLevelUp(gameState); }
    addLogEntry(activityLog, '铸币积分坊', source || `积分兑换${reward}金币`);
    await saveState(req.playerId, gameState, activityLog);
    res.json({ success: true, data: { character: gameState, reward, expGain }, message: `💰 成功兑换${reward}金币！` });
  } catch (err) { res.status(500).json({ success: false, message: 'DB错误', error: err.message }); }
});

// 添加道具到背包（NPC赠礼、子场景奖励等）
app.post('/api/inventory/add', async (req, res) => {
  try {
    const { item } = req.body;
    if (!item || !item.name) return res.status(400).json({ success: false, message: '道具数据无效' });
    const { gameState, activityLog } = await loadState(req.playerId);
    if (!gameState.inventory) gameState.inventory = [];
    const newItem = { id: `gift_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, name: item.name, emoji: item.emoji || '🎁', rarity: item.rarity || 'common', description: item.description || '', effect: item.effect || {}, category: item.category || '', source: 'gift' };
    gameState.inventory.push(newItem);
    if (item.effect && typeof item.effect === 'object') {
      for (const [skill, val] of Object.entries(item.effect)) {
        if (typeof val === 'number' && gameState.skills[skill] !== undefined) {
          gameState.skills[skill] = Math.min((gameState.skills[skill] || 0) + val, skillConfig[skill]?.maxValue || 100);
        }
      }
    }
    addLogEntry(activityLog, '获得道具', `${item.name} 已加入背包`);
    await saveState(req.playerId, gameState, activityLog);
    res.json({ success: true, data: { character: gameState }, message: `获得了「${item.name}」` });
  } catch (err) { res.status(500).json({ success: false, message: 'DB错误', error: err.message }); }
});

// 前端课程名 → 活动计数类型映射
const COURSE_NAME_TO_ACTIVITY = {
  '舞蹈': ['performance', 'court_activity'],
  '茶艺文化': ['court_activity', 'performance'],
  '丝竹乐器': ['performance'],
  '狩猎': ['hunting'],
  '马术': ['hunting'],
  '武术器械': ['hunting'],
  '中医本草': ['herb_picking'],
  '针灸推拿': ['herb_picking', 'treat_patient'],
  '天文历法': ['sky_gazing', 'fortune_telling'],
  '法术': ['sky_gazing', 'fortune_telling'],
  '农耕技术': ['labor_total'],
  '木工': ['workshop'],
  '雕刻技艺': ['workshop'],
  '建筑营造': ['workshop'],
  '探险': ['hunting'],
  '书画': ['performance', 'court_activity'],
  '文学': ['performance', 'court_activity'],
  '珠算': [],
  '编织与刺绣': ['workshop'],
  '蹴鞠': [],
  '烹饪艺术': [],
  '酿酒工艺': [],
  '航海技术': ['court_activity'],
  '弓箭制造': ['workshop'],
  // 劳动（所有劳动都计入 labor_total）
  '织布纺纱': ['labor_total', 'workshop'],
  '制陶烧窑': ['labor_total', 'workshop'],
  '打铁锻造': ['labor_total', 'workshop', 'mining'],
  '捕鱼捞虾': ['labor_total'],
  '采药收草': ['labor_total', 'herb_picking'],
  '牧羊放牛': ['labor_total', 'animal_care'],
  '伐木搬柴': ['labor_total'],
  '押镖护卫': ['labor_total'],
  '酿造蜂蜜': ['labor_total'],
  '修缮房屋': ['labor_total', 'workshop'],
  '挖井引水': ['labor_total', 'mining'],
  '驾车赶路': ['labor_total'],
  '传递信件': ['labor_total'],
  '守夜巡逻': ['labor_total'],
  '摆摊售货': ['labor_total', 'performance'],
  '田间奏乐': ['labor_total', 'performance'],
  '驯鹰放隼': ['labor_total', 'animal_care'],
  '编制灯笼': ['labor_total', 'workshop'],
  '种桑养蚕': ['labor_total', 'animal_care'],
  '珠算账目': ['labor_total'],
  '绘制地图': ['labor_total'],
  '代写书信': ['labor_total', 'performance'],
  '调解纷争': ['labor_total'],
  '挑担运货': ['labor_total'],
};

// 课程技能结算（前端课程体系）
app.post('/api/skills/apply-course', async (req, res) => {
  try {
    const { skillDeltas, courseNames } = req.body;
    if (!skillDeltas || typeof skillDeltas !== 'object') return res.status(400).json({ success: false, message: '参数错误' });
    const { gameState, activityLog } = await loadState(req.playerId);
    const changes = {};
    for (const [skill, delta] of Object.entries(skillDeltas)) {
      if (typeof delta !== 'number') continue;
      const before = gameState.skills[skill] || 0;
      gameState.skills[skill] = Math.max(0, Math.min(before + delta, skillConfig[skill]?.maxValue || 100));
      changes[skill] = { before, after: gameState.skills[skill] };
    }
    if (Array.isArray(courseNames)) {
      if (!gameState.activityCounts) gameState.activityCounts = {};
      const ac = gameState.activityCounts;
      for (const name of courseNames) {
        const activities = COURSE_NAME_TO_ACTIVITY[name] || [];
        for (const act of activities) ac[act] = (ac[act] || 0) + 1;
      }
      if ((ac.sky_gazing || 0) >= 6 && (ac.fortune_telling || 0) >= 5) {
        if (!gameState.eventFlags) gameState.eventFlags = {};
        gameState.eventFlags.fourth_wall_broken = true;
      }
    }
    await saveState(req.playerId, gameState, activityLog);
    res.json({ success: true, data: { character: gameState, changes } });
  } catch (err) { res.status(500).json({ success: false, message: 'DB错误', error: err.message }); }
});

// 扣除金币（学费等消费）
app.post('/api/gold/spend', async (req, res) => {
  try {
    const { amount, source } = req.body;
    const { gameState, activityLog } = await loadState(req.playerId);
    const cost = Math.max(0, Math.round(Number(amount) || 0));
    if (gameState.gold < cost) return res.status(400).json({ success: false, message: '金币不足' });
    gameState.gold -= cost;
    if (source) addLogEntry(activityLog, '消费', source);
    await saveState(req.playerId, gameState, activityLog);
    res.json({ success: true, data: { character: gameState }, message: `已扣除${cost}金币` });
  } catch (err) { res.status(500).json({ success: false, message: 'DB错误', error: err.message }); }
});

// 猜谜答题
app.post('/api/earn/riddle', async (req, res) => {
  try {
    const { questionId, answerIdx } = req.body;
    const question = riddleQuestions.find(q => q.id === questionId);
    if (!question) return res.status(404).json({ success: false, message: '题目不存在' });
    const { gameState, activityLog } = await loadState(req.playerId);
    const RIDDLE_REWARD = 3;
    const isCorrect = answerIdx === question.answer;
    if (isCorrect) {
      gameState.gold += RIDDLE_REWARD;
      addLogEntry(activityLog, '猜谜活动', `回答正确！"${question.question}"，获得${RIDDLE_REWARD}金币`);
      await saveState(req.playerId, gameState, activityLog);
      return res.json({ success: true, data: { correct: true, reward: RIDDLE_REWARD, character: gameState }, message: `🎉 回答正确！获得${RIDDLE_REWARD}金币！` });
    } else {
      addLogEntry(activityLog, '猜谜活动', `回答错误："${question.question}"，本次未获奖励`);
      await saveState(req.playerId, gameState, activityLog);
      return res.json({ success: true, data: { correct: false, reward: 0, correctAnswer: question.answer, character: gameState }, message: `😔 回答错误，正确答案是「${question.options[question.answer]}」` });
    }
  } catch (err) { res.status(500).json({ success: false, message: 'DB错误', error: err.message }); }
});

// 厨艺大赛
app.post('/api/earn/culinary', async (req, res) => {
  try {
    const { dish, steps } = req.body;
    const { gameState, activityLog } = await loadState(req.playerId);
    const culinaryLevel = gameState.skills.culinary || 0;
    if (culinaryLevel < 15) return res.status(400).json({ success: false, message: `厨艺值需达到15才能参加厨艺大赛！当前厨艺：${culinaryLevel}` });
    const stepsCorrect = steps ? steps.filter(Boolean).length : 0;
    const totalSteps = steps ? steps.length : 1;
    const accuracy = stepsCorrect / totalSteps;
    const baseScore = Math.floor(accuracy * 100);
    const bonusScore = Math.floor((culinaryLevel / 100) * 50);
    const totalScore = baseScore + bonusScore;
    let reward = 0, rank = '';
    if (totalScore >= 90) { reward = 150; rank = '状元'; }
    else if (totalScore >= 75) { reward = 100; rank = '榜眼'; }
    else if (totalScore >= 60) { reward = 60; rank = '探花'; }
    else if (totalScore >= 40) { reward = 30; rank = '良'; }
    else { reward = 10; rank = '参与奖'; }
    gameState.gold += reward;
    gameState.skills.culinary = clampSkill(culinaryLevel + 2);
    addLogEntry(activityLog, '厨艺大赛', `参加厨艺大赛，荣获${rank}，获得${reward}金币`);
    await saveState(req.playerId, gameState, activityLog);
    res.json({ success: true, data: { score: totalScore, rank, reward, character: gameState }, message: `🍱 厨艺大赛结果：${rank}！获得${reward}金币！` });
  } catch (err) { res.status(500).json({ success: false, message: 'DB错误', error: err.message }); }
});

// ==================== 新年表演活动 ====================
// 课程名 → 四字表演题目（与课程技能相关）
const PERFORMANCE_TOPICS = {
  '舞蹈':    ['翩若惊鸿', '霓裳羽衣', '水袖生花', '广袖流云'],
  '丝竹乐器':['丝竹悠扬', '琴瑟和鸣', '箫声如诉', '弦歌不辍'],
  '文学':    ['锦绣文章', '诗意盎然', '才情横溢', '妙笔生花'],
  '书画':    ['丹青妙笔', '翰墨飘香', '挥毫泼墨', '笔走龙蛇'],
  '茶艺文化':['茶香四溢', '品茗论道', '茶禅一味', '清茶待客'],
  '烹饪艺术':['烹艺精湛', '色香味俱', '佳肴飘香', '美食天成'],
  '马术':    ['驰骋疆场', '人马合一', '纵横驰骋', '骏马扬蹄'],
  '狩猎':    ['百步穿杨', '弓马娴熟', '箭无虚发', '猎猎风声'],
  '武术器械':['武艺高强', '剑走偏锋', '龙腾虎跃', '出神入化'],
  '中医本草':['悬壶济世', '妙手回春', '杏林春暖', '岐黄之术'],
  '针灸推拿':['针到病除', '手到春来', '经络通畅', '调和阴阳'],
  '天文历法':['观星问天', '天象奇观', '星河璀璨', '仰观天象'],
  '法术':    ['法力无边', '灵气氤氲', '仙法通玄', '符咒显灵'],
  '珠算':    ['算无遗漏', '心算如神', '珠落有声', '数理精通'],
  '探险':    ['踏遍山河', '胆识过人', '探幽寻秘', '勇闯天涯'],
  '农耕技术':['五谷丰登', '春耕秋收', '农桑繁盛', '田园牧歌'],
  '木工':    ['巧夺天工', '榫卯精妙', '匠心独运', '雕梁画栋'],
  '建筑营造':['营造有方', '亭台楼阁', '雕梁画栋', '巍然壮观'],
  '弓箭制造':['弓矢精良', '百炼成钢', '制器有道', '弓弦紧绷'],
  '雕刻技艺':['雕刻传神', '精雕细琢', '栩栩如生', '鬼斧神工'],
  '酿酒工艺':['酒香四溢', '醇厚绵长', '佳酿飘香', '玉液琼浆'],
  '蹴鞠':    ['蹴鞠竞技', '身手矫健', '踢技精湛', '灵活敏捷'],
  '编织与刺绣':['绣出芳华', '针线情深', '锦绣年华', '绣工精湛'],
  '航海技术':['乘风破浪', '扬帆远航', '观星导航', '海阔天空'],
};

const DEFAULT_TOPICS = ['才艺惊人', '风华绝代', '倾国倾城', '名动京城', '惊才绝艳', '玉骨冰肌'];

// 计算最近一年（12个gameMonth）某课程的上课次数
// courseAttendCount 存储的是累计总次数，需要用 courseAttendHistory 按月份记录
// 由于现有系统只存累计数，我们用 courseAttendCount 中最近的快照来近似
// 实际采用：前端传来 courseAttendCount（最近12个月内的上课次数快照）
app.post('/api/performance/new-year', async (req, res) => {
  try {
    const { selectedTopic, courseAttendCount } = req.body;
    const { gameState, activityLog } = await loadState(req.playerId);
    const monthInfo = getMonthInfo(gameState.gameMonth || 1);

    if (!selectedTopic) return res.status(400).json({ success: false, message: '请选择表演题目' });

    // 找到该题目对应的课程
    let relatedCourse = null;
    for (const [course, topics] of Object.entries(PERFORMANCE_TOPICS)) {
      if (topics.includes(selectedTopic)) { relatedCourse = course; break; }
    }

    // 最近一年该课程的上课次数（前端传来的 courseAttendCount 即最近12月累计）
    const recentCount = relatedCourse ? ((courseAttendCount || {})[relatedCourse] || 0) : 0;

    // 结果判定：5次以上有名次，更多次数有更高名次
    let rank = null, rankLabel = '', goldReward = 0;
    if (recentCount >= 15) {
      rank = 1; rankLabel = '魁首'; goldReward = 300;
    } else if (recentCount >= 10) {
      rank = 2; rankLabel = '榜眼'; goldReward = 200;
    } else if (recentCount >= 7) {
      rank = 3; rankLabel = '探花'; goldReward = 150;
    } else if (recentCount >= 5) {
      rank = Math.floor(Math.random() * 3) + 4; rankLabel = `第${rank}名`; goldReward = 80;
    } else {
      rank = null; rankLabel = ''; goldReward = 10;
    }

    if (goldReward > 0) {
      gameState.gold += goldReward;
      gameState.activityCounts = gameState.activityCounts || {};
      gameState.activityCounts.performance = (gameState.activityCounts.performance || 0) + 1;
    }
    // 新年表演 EXP：按名次 40/30/25/15/10
    const perfExpGain = rank === 1 ? 40 : rank === 2 ? 30 : rank === 3 ? 25 : rank ? 15 : 10;
    gameState.exp = (gameState.exp || 0) + perfExpGain;
    checkLevelUp(gameState);

    const resultText = rank
      ? `凌若雪以《${selectedTopic}》惊艳四座，荣获${rankLabel}，获得${goldReward}金币赏赐！`
      : `凌若雪以《${selectedTopic}》参加表演，虽未获名次，获得${goldReward}金币出场费。练习更多相关课程方能夺魁！`;

    addLogEntry(activityLog, `🎭 新年表演：${selectedTopic}`, resultText);
    await saveState(req.playerId, gameState, activityLog);

    res.json({
      success: true,
      data: {
        rank,
        rankLabel,
        goldReward,
        recentCount,
        relatedCourse,
        resultText,
        character: gameState,
        age: monthInfo.age,
      },
      message: resultText,
    });
  } catch (err) { res.status(500).json({ success: false, message: 'DB错误', error: err.message }); }
});

// 生成新年表演舞台图片（调用 infsh CLI）
app.post('/api/performance/stage-image', async (req, res) => {
  const { execFile } = require('child_process');
  try {
    const prompt = 'ancient Chinese New Year stage performance, traditional opera stage with red lanterns and golden decorations, elegant dancer in colorful hanfu costume performing under spotlight, ink wash painting style, wide horizontal composition, cinematic, festive atmosphere, 16:9';
    const result = await new Promise((resolve, reject) => {
      const infshPath = process.env.INFSH_PATH || '/Users/chenyinuo02/.local/bin/infsh';
      execFile(infshPath, ['app', 'run', 'falai/flux-dev-lora', '--input', JSON.stringify({ prompt }), '--json'], { timeout: 60000 }, (err, stdout, stderr) => {
        if (err) return reject(err);
        try {
          // infsh outputs a header line before JSON; find the first '{'
          const jsonStart = stdout.indexOf('{');
          resolve(jsonStart >= 0 ? JSON.parse(stdout.slice(jsonStart)) : {});
        } catch { reject(new Error('解析图片结果失败')); }
      });
    });
    const imageUrl = result?.images?.[0] || result?.output?.images?.[0] || result?.output?.images?.[0]?.url || result?.output?.image?.url || result?.output?.url || null;
    res.json({ success: true, data: { imageUrl } });
  } catch (err) {
    res.json({ success: true, data: { imageUrl: null }, message: '图片生成跳过' });
  }
});

// ==================== 奇遇事件：生成横图 + 确认奖励 ====================
app.post('/api/event/generate-image', async (req, res) => {
  const { execFile } = require('child_process');
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ success: false, message: '缺少 prompt' });
  try {
    const result = await new Promise((resolve, reject) => {
      const infshPath = process.env.INFSH_PATH || '/Users/chenyinuo02/.local/bin/infsh';
      execFile(infshPath, ['app', 'run', 'google/gemini-3-1-flash-image-preview', '--input', JSON.stringify({ prompt }), '--json'], { timeout: 90000 }, (err, stdout) => {
        if (err) return reject(err);
        try { const j = stdout.indexOf('{'); resolve(j >= 0 ? JSON.parse(stdout.slice(j)) : {}); }
        catch { reject(new Error('解析失败')); }
      });
    });
    const imageUrl = result?.images?.[0] || result?.output?.images?.[0] || result?.output?.image?.url || result?.output?.url || null;
    res.json({ success: true, data: { imageUrl } });
  } catch (err) {
    res.json({ success: true, data: { imageUrl: null } });
  }
});

app.post('/api/event/confirm', async (req, res) => {
  try {
    const { eventId } = req.body;
    const { gameState, activityLog } = await loadState(req.playerId);
    const event = RARE_EVENTS.find(e => e.id === eventId);
    if (!event) return res.status(404).json({ success: false, message: '事件不存在' });
    if (gameState.eventFlags?.[eventId]) return res.json({ success: true, data: { character: gameState }, message: '已处理' });
    event.effect(gameState);
    // 奇遇 EXP +20
    gameState.exp = (gameState.exp || 0) + 20;
    checkLevelUp(gameState);
    addLogEntry(activityLog, `✨ 奇遇：${event.title}`, event.interactivePrompt || event.text);
    await saveState(req.playerId, gameState, activityLog);
    res.json({ success: true, data: { character: gameState, skillGains: event.skillGains, gainText: event.gainText, expGain: 20 } });
  } catch (err) { res.status(500).json({ success: false, message: 'DB错误', error: err.message }); }
});

// ==================== 诗才大会：生成古风图片 ====================
const POETRY_IMAGE_PROMPTS = [
  'ancient Chinese pavilion by moonlit lake, weeping willows, lotus flowers, misty atmosphere, ink wash painting style, wide horizontal 16:9, serene and poetic',
  'classical Chinese garden with stone bridge, bamboo grove, waterfall, scholar sitting writing poetry, soft morning light, ink wash painting, wide 16:9',
  'ancient Chinese mountain landscape with pine trees, flowing river, distant pagoda, mist and clouds, traditional ink painting style, wide 16:9',
  'traditional Chinese courtyard with plum blossoms, snow falling gently, red lanterns, elegant woman in hanfu reading, wide horizontal, ink painting',
  'ancient Chinese lakeside scene, boats with lanterns, full moon reflection, willow trees, fireflies, dreamy atmosphere, ink wash style, 16:9',
  'traditional Chinese autumn forest, maple leaves falling, stone steps, ancient temple in distance, poetic mood, ink wash painting, wide 16:9',
  'classical Chinese spring garden, cherry blossoms, butterflies, young woman in hanfu playing guqin, gentle breeze, ink painting, wide 16:9',
  'ancient Chinese river at dusk, fishing boats, orange sky, mountains silhouette, traditional ink painting style, wide horizontal 16:9',
];

app.post('/api/poetry/generate-image', async (req, res) => {
  const { execFile } = require('child_process');
  try {
    const promptIdx = Math.floor(Math.random() * POETRY_IMAGE_PROMPTS.length);
    const prompt = POETRY_IMAGE_PROMPTS[promptIdx];
    const result = await new Promise((resolve, reject) => {
      const infshPath = process.env.INFSH_PATH || '/Users/chenyinuo02/.local/bin/infsh';
      execFile(infshPath, ['app', 'run', 'google/gemini-3-1-flash-image-preview', '--input', JSON.stringify({ prompt }), '--json'], { timeout: 90000 }, (err, stdout, stderr) => {
        if (err) return reject(err);
        try {
          const jsonStart = stdout.indexOf('{');
          resolve(jsonStart >= 0 ? JSON.parse(stdout.slice(jsonStart)) : {});
        } catch { reject(new Error('解析图片结果失败')); }
      });
    });
    const imageUrl = result?.images?.[0] || result?.output?.images?.[0] || result?.output?.image?.url || result?.output?.url || null;
    res.json({ success: true, data: { imageUrl, promptIdx } });
  } catch (err) {
    res.json({ success: true, data: { imageUrl: null }, message: '图片生成跳过' });
  }
});

// ==================== 诗才大会：AI评分诗词 ====================
app.post('/api/poetry/score', async (req, res) => {
  const { execFile } = require('child_process');
  try {
    const { poem, imagePromptIdx } = req.body;
    if (!poem || poem.trim().length < 5) {
      return res.status(400).json({ success: false, message: '诗句太短，请至少写5个字' });
    }
    const sceneDesc = POETRY_IMAGE_PROMPTS[imagePromptIdx || 0] || '古典中国风景';
    const scorePrompt = `你是一位精通中国古典诗词的文学评审。请对以下诗句进行鉴赏评分。

画面描述：${sceneDesc}
玩家诗句：${poem}

请从以下几个维度评分（满分10分）：
1. 意境契合（与画面的契合程度）
2. 文采优美（用词是否优美、雅致）
3. 格律韵味（是否有古诗词的韵味）

给出一个综合分数（0-10的整数），以及一句简短的点评（20字以内）。

请严格按照以下JSON格式回复，不要添加任何其他内容：
{"score": 数字, "comment": "点评文字"}`;

    const result = await new Promise((resolve, reject) => {
      const infshPath = process.env.INFSH_PATH || '/Users/chenyinuo02/.local/bin/infsh';
      execFile(infshPath, ['app', 'run', 'anthropic/claude-haiku-4-5', '--input', JSON.stringify({ prompt: scorePrompt }), '--json'], { timeout: 30000 }, (err, stdout, stderr) => {
        if (err) return reject(err);
        try {
          const jsonStart = stdout.indexOf('{');
          resolve(jsonStart >= 0 ? JSON.parse(stdout.slice(jsonStart)) : {});
        } catch { reject(new Error('解析评分结果失败')); }
      });
    });

    let score = 5;
    let comment = '诗句颇有意境，继续努力！';
    try {
      const text = result?.output?.text || result?.output?.content || '';
      const jsonMatch = text.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        score = Math.max(0, Math.min(10, parseInt(parsed.score) || 5));
        comment = parsed.comment || comment;
      }
    } catch {}

    res.json({ success: true, data: { score, comment } });
  } catch (err) {
    // 评分失败时给一个随机分数
    const score = Math.floor(Math.random() * 5) + 4;
    res.json({ success: true, data: { score, comment: '诗句意境悠远，颇有古风韵味。' } });
  }
});

// ==================== 月份推进接口 ====================
// ── 月度叙事文本生成 ──
function generateMonthNarrative(gameState, monthInfo) {
  const sk = gameState.skills || {};
  const fav = gameState.favorability || {};
  const ac = gameState.activityCounts || {};
  const { age, monthInYear, season } = monthInfo;

  const seasonWord = { spring:'春', summer:'夏', autumn:'秋', winter:'冬' }[season] || '春';
  const seasonDesc = {
    spring: ['春风和煦，桃花已开', '春日迟迟，草木萌发', '暖风拂面，万物复苏'],
    summer: ['暑气渐浓，蝉鸣声声', '烈日当空，荷花盛开', '夏夜微凉，萤火点点'],
    autumn: ['金风送爽，枫叶渐红', '秋高气爽，菊花盛放', '寒意初现，落叶纷飞'],
    winter: ['寒风凛冽，白雪皑皑', '冬日暖阳，梅花独秀', '冰封大地，岁末将至'],
  }[season] || ['时光流转'];
  const desc = seasonDesc[monthInYear % seasonDesc.length];

  // 根据最高属性生成个性化叙事
  const topSkills = Object.entries(sk).sort((a,b) => b[1]-a[1]).slice(0,2).map(([k]) => k);
  const skillNarr = {
    wisdom:     ['书卷气渐浓，京城才女榜上隐有你的名字', '诗书之道，你愈发得心应手'],
    statecraft: ['朝堂之事偶有耳闻，心中谋略悄然生长', '治国之才，需时间磨砺'],
    rhetoric:   ['言辞愈发犀利，旁人辩不过你', '三寸之舌，已能搅动一方风云'],
    medical:    ['药香萦绕，你的医术已令街坊称道', '岐黄之术日精，百草堂的老大夫频频点头'],
    martial:    ['拳脚功夫愈发精进，身手矫健', '习武之路漫漫，你却越走越稳'],
    music:      ['琴声悠扬，连院中鸟雀都停下聆听', '一曲奏罢，余音绕梁三日不绝'],
    poetry:     ['诗才渐盛，偶有佳句脱口而出', '文字之间，你的情思愈发细腻'],
    painting:   ['丹青妙笔，笔下山水已有几分神韵', '画艺日进，翰墨苑的先生频频夸赞'],
    charm:      ['仪态万方，走在街上引来不少目光', '魅力与日俱增，左邻右舍皆言好看'],
    culinary:   ['厨艺精进，连父亲也多吃了两碗', '锅铲翻飞间，香气飘出了院子'],
    crafting:   ['手工愈发精巧，做出的物件令人爱不释手', '匠心独运，一针一线都有了自己的风格'],
    wildness:   ['骑马驰骋，心中有股挡不住的自由气', '野性难驯，偏偏这股劲让人着迷'],
    morality:   ['品行端正，邻里皆赞你是个好姑娘', '心存善念，做事踏实，口碑渐佳'],
    spirit:     ['灵气渐盛，有时能感知到常人察觉不到的事', '冥冥之中，似乎有什么在等着你'],
    courage:    ['胆识过人，遇事不慌，父亲暗自欣慰', '临危不惧，这份胆气已非寻常女子所有'],
    affinity:   ['与人为善，结交的朋友越来越多', '亲和力十足，走到哪里都受人欢迎'],
    command:    ['统帅之才初显，遇事有条不紊', '指挥若定，身边人渐渐以你为主心骨'],
    reputation: ['名声渐起，京城中已有人知道你的名字', '声望日隆，出门常有人主动打招呼'],
    arithmetic: ['算数精通，账目一目了然，连父亲都让你管家', '数术之道，你已窥见其中奥妙'],
    vitality:   ['体力充沛，精力旺盛，什么都想去尝试', '身体康健，是最踏实的本钱'],
  };
  const skNarr = skillNarr[topSkills[0]]?.[monthInYear % 2] || '时光悄然流逝，你在慢慢成长。';

  // NPC关系暗示（好感高的NPC）
  const npcHints = {
    wangwenyu:     ['古街布商最近总往将军府附近走动，不知是否有意', '王文玉托人带来一匹上好的绸缎，说是无意中想到你'],
    mufengongzi:   ['草原来的公子偶尔出现在城中，总是往将军府方向望', '幕风公子捎来一封信，字迹潇洒，言语间有几分牵挂'],
    sitouqian:     ['翰墨苑的司徒仟又画了一幅仕女图，旁人说那眉眼有几分像你', '司徒仟托人问你近来可好，言语间似乎有话未说'],
    desert_friend: ['呜沙沟来的沐风最近常在城中出没，说是有生意，却总往这边来', '沐风托人带来一枚西域小物件，说是护身用的'],
    royal_emperor: ['宫中偶有消息传出，说皇上对将军府的千金颇为留意', '宫廷的邀帖比往年来得更勤了一些'],
  };
  let npcHint = '';
  const topNpc = Object.entries(fav).filter(([k]) => ['wangwenyu','mufengongzi','sitouqian','desert_friend','royal_emperor'].includes(k)).sort((a,b) => b[1]-a[1])[0];
  if (topNpc && topNpc[1] >= 35) {
    const hints = npcHints[topNpc[0]];
    if (hints) npcHint = hints[monthInYear % hints.length];
  }

  // 组合叙事
  const parts = [`${age}岁，${seasonWord}${monthInYear}月。${desc}。`, skNarr];
  if (npcHint) parts.push(npcHint + '。');
  return parts.join('');
}

app.post("/api/game/advance-month", async (req, res) => {
  try {
    const { gameState, activityLog } = await loadState(req.playerId);
    const currentGm = gameState.gameMonth || 1;
    if (currentGm >= 37) {
      const monthInfo = getMonthInfo(currentGm);
      const ending = computeEnding(gameState);
      return res.json({ success: true, data: { gameMonth: currentGm, monthInfo, isEnd: true, character: gameState, ending }, message: "已到达18岁，游戏行将结束" });
    }
    const newGm = Math.min(37, currentGm + 1);
    gameState.gameMonth = newGm;
    gameState.roomActivityCounts = {};
    gameState.roomActivityMonth = newGm;
    // 月份推进 EXP +10（时光流逝积累阅历）
    gameState.exp = (gameState.exp || 0) + 10;
    checkLevelUp(gameState);
    // ── 被动技能增长（课程精通buff）──
    const passiveGrowth = gameState.passiveSkillGrowth || {};
    const passiveGains = {};
    for (const [skill, delta] of Object.entries(passiveGrowth)) {
      if (gameState.skills[skill] !== undefined) {
        const before = gameState.skills[skill];
        gameState.skills[skill] = clampSkill(before + delta);
        if (gameState.skills[skill] > before) passiveGains[skill] = delta;
      }
    }
    // ── 限时机会事件（特定月份触发，玩家可选择参与）──
    const timeEvent = TIME_EVENTS.find(e => e.triggerMonth === newGm && !gameState.eventFlags?.[`time_event_${e.id}_done`]);

    const monthInfo = getMonthInfo(newGm);
    addLogEntry(activityLog, "月份推进", `进入${monthInfo.age}岁第${monthInfo.monthInYear}月（第${newGm}月）`);
    const ageGrowthResult = checkAgeGrowth(gameState);
    let ageGrowth = null;
    if (ageGrowthResult && ageGrowthResult.shouldGrow) {
      const newlyUnlocked = applyAgeGrowth(gameState, ageGrowthResult.newAge);
      const milestoneEvent = checkMilestoneEvent(gameState, ageGrowthResult.newAge);
      if (milestoneEvent) {
        addLogEntry(activityLog, `🌟 命运节点：${milestoneEvent.title}`, milestoneEvent.text);
      }
      addLogEntry(activityLog, `🎂 年龄增长：${ageGrowthResult.oldAge}岁 → ${ageGrowthResult.newAge}岁`, `凌若雪迎来了${ageGrowthResult.newAge}岁！`);
      ageGrowth = { grew: true, oldAge: ageGrowthResult.oldAge, newAge: ageGrowthResult.newAge, newTitle: AGE_CONFIG.ageTitles[ageGrowthResult.newAge], achievedTitle: ageGrowthResult.achievedTitle, achievedDesc: ageGrowthResult.achievedDesc, newlyUnlockedDresses: newlyUnlocked, milestoneEvent };
    }
    // ── 京城才女榜：每年5月（monthInYear===5）触发，满足当年资格条件才上榜 ──
    let talentRank = null;
    if (monthInfo.monthInYear === 5 && !monthInfo.isEnd) {
      const rankResult = computeTalentRank(gameState);
      if (rankResult.qualified) {
        talentRank = rankResult;
        if (!gameState.talentRankHistory) gameState.talentRankHistory = [];
        gameState.talentRankHistory.push({ month: newGm, age: rankResult.age, rank: rankResult.rank, score: rankResult.playerScore });
        if (!gameState.eventFlags) gameState.eventFlags = {};
        if (talentRank.rank === 1) gameState.eventFlags.talent_rank_first = true;
      } else {
        // 未达标：返回未上榜信息，让前端可以展示"差了什么"提示
        talentRank = { qualified: false, failHint: rankResult.failHint, playerScore: rankResult.playerScore, age: rankResult.age };
      }
    }
    let ending = null;
    if (monthInfo.isEnd) {
      ending = computeEnding(gameState);
      addLogEntry(activityLog, '🎊 命运终章', `凌若雪的传奇结局：${ending.emoji} ${ending.title}`);
    }
    const narrative = !monthInfo.isEnd ? generateMonthNarrative(gameState, monthInfo) : null;
    await saveState(req.playerId, gameState, activityLog);
    return res.json({ success: true, data: { gameMonth: newGm, monthInfo, isEnd: monthInfo.isEnd, character: gameState, ageGrowth, ending, passiveGains: Object.keys(passiveGains).length > 0 ? passiveGains : null, timeEvent: timeEvent || null, talentRank, narrative }, message: `已进入${monthInfo.age}岁第${monthInfo.monthInYear}月` });
  } catch (err) { res.status(500).json({ success: false, message: 'DB错误', error: err.message }); }
});

// ── 限时机会事件：玩家选择处理 ──
app.post('/api/game/time-event-choice', async (req, res) => {
  try {
    const { eventId, optionId } = req.body;
    const { gameState, activityLog } = await loadState(req.playerId);

    const event = TIME_EVENTS.find(e => e.id === eventId);
    if (!event) return res.status(404).json({ success: false, message: '事件不存在' });

    // 防重复提交
    if (gameState.eventFlags?.[`time_event_${eventId}_done`]) {
      return res.status(400).json({ success: false, message: '该事件已处理过' });
    }

    const option = event.options.find(o => o.id === optionId);
    if (!option) return res.status(404).json({ success: false, message: '选项不存在' });

    // Check gold requirement
    if (option.requireGold && (gameState.gold || 0) < option.requireGold) {
      return res.status(400).json({ success: false, message: `金币不足，需要${option.requireGold}金币` });
    }

    // Apply effects
    const skillChanges = {};
    for (const [key, delta] of Object.entries(option.effect)) {
      if (key === 'gold') {
        gameState.gold = Math.max(0, (gameState.gold || 0) + delta);
      } else if (key === 'father_fav') {
        if (!gameState.favorability) gameState.favorability = {};
        gameState.favorability.father = Math.min(100, Math.max(0, (gameState.favorability.father || 80) + delta));
      } else if (gameState.skills && gameState.skills[key] !== undefined) {
        const before = gameState.skills[key];
        gameState.skills[key] = clampSkill(before + delta);
        skillChanges[key] = { before, after: gameState.skills[key] };
      }
    }

    // Mark event as done
    if (!gameState.eventFlags) gameState.eventFlags = {};
    gameState.eventFlags[`time_event_${eventId}_done`] = true;

    addLogEntry(activityLog, `限时事件：${event.title}`, `选择了"${option.label}"——${option.desc}`);
    await saveState(req.playerId, gameState, activityLog);

    res.json({ success: true, data: { character: gameState, skillChanges, option }, message: `✅ ${option.desc}` });
  } catch (err) { res.status(500).json({ success: false, message: 'DB错误', error: err.message }); }
});

app.get('/api/game/ending', async (req, res) => {
  try {
    const { gameState } = await loadState(req.playerId);
    const ending = computeEnding(gameState);
    res.json({ success: true, data: { ending, character: gameState } });
  } catch (err) { res.status(500).json({ success: false, message: 'DB错误', error: err.message }); }
});

app.post('/api/game/event', async (req, res) => {
  try {
    const { eventType, payload } = req.body;
    const { gameState, activityLog } = await loadState(req.playerId);
    if (!gameState.activityCounts) gameState.activityCounts = {};
    if (!gameState.eventFlags) gameState.eventFlags = {};
    switch (eventType) {
      case 'combat_won':
        gameState.activityCounts.combat_won = (gameState.activityCounts.combat_won || 0) + 1;
        if ((gameState.activityCounts.combat_won || 0) >= 3) gameState.eventFlags.border_merit = true;
        break;
      case 'npc_rejected':
        gameState.activityCounts.human_reject = (gameState.activityCounts.human_reject || 0) + 1;
        if ((gameState.activityCounts.human_reject || 0) >= 6) gameState.eventFlags.human_npc_all_rejected = true;
        break;
      case 'npc_death':
        gameState.eventFlags.npc_death_witnessed = true;
        break;
      case 'rocket_part':
        gameState.eventFlags.rocket_parts_collected = (gameState.eventFlags.rocket_parts_collected || 0) + 1;
        break;
      case 'sleep':
        gameState.activityCounts.sleep_count = (gameState.activityCounts.sleep_count || 0) + 1;
        break;
      case 'performance':
        gameState.activityCounts.performance = (gameState.activityCounts.performance || 0) + 1;
        break;
      case 'fortune_telling':
        gameState.activityCounts.fortune_telling = (gameState.activityCounts.fortune_telling || 0) + 1;
        if ((gameState.activityCounts.sky_gazing || 0) >= 6 && (gameState.activityCounts.fortune_telling || 0) >= 5) gameState.eventFlags.fourth_wall_broken = true;
        break;
      case 'npc_affection':
        if (payload?.npcId && typeof payload.value === 'number') {
          if (!gameState.favorability) gameState.favorability = {};
          gameState.favorability[payload.npcId] = Math.min(100, (gameState.favorability[payload.npcId] || 0) + payload.value);
          const activeKey = `active_${payload.npcId}`;
          gameState.activityCounts[activeKey] = (gameState.activityCounts[activeKey] || 0) + 1;
        }
        break;
      case 'npc_last_choice':
        if (payload?.npcId && payload?.optionId) {
          if (!gameState.npcLastChoice) gameState.npcLastChoice = {};
          gameState.npcLastChoice[payload.npcId] = { optionId: payload.optionId, text: payload.text || '', recallText: payload.recallText || '' };
        }
        break;
      case 'skill_bonus':
        if (payload?.skill && typeof payload.value === 'number') {
          if (!gameState.skills) gameState.skills = {};
          gameState.skills[payload.skill] = Math.min(100, (gameState.skills[payload.skill] || 0) + payload.value);
        }
        break;
      default:
        if (eventType && typeof eventType === 'string') gameState.activityCounts[eventType] = (gameState.activityCounts[eventType] || 0) + 1;
    }
    // 每次事件后检查剧情道具获取
    const newStoryItems = checkAndGrantStoryItems(gameState);
    addLogEntry(activityLog, '特殊事件', `触发：${eventType}`);
    await saveState(req.playerId, gameState, activityLog);
    res.json({ success: true, data: { activityCounts: gameState.activityCounts, eventFlags: gameState.eventFlags, newStoryItems } });
  } catch (err) { res.status(500).json({ success: false, message: 'DB错误', error: err.message }); }
});

app.get("/api/game/month-info", async (req, res) => {
  try {
    const { gameState } = await loadState(req.playerId);
    const monthInfo = getMonthInfo(gameState.gameMonth || 1);
    res.json({ success: true, data: { gameMonth: gameState.gameMonth || 1, monthInfo } });
  } catch (err) { res.status(500).json({ success: false, message: 'DB错误', error: err.message }); }
});

app.get('/api/log', async (req, res) => {
  try {
    const { activityLog } = await loadState(req.playerId);
    res.json({ success: true, data: activityLog.slice(0, 20) });
  } catch (err) { res.status(500).json({ success: false, message: 'DB错误', error: err.message }); }
});

// 房间活动
const ROOM_ACTIVITIES = {
  read: {
    name: '读书',
    gains: { wisdom: [6, 10], poetry: [3, 5] },
  },
  meditate: {
    name: '静心冥想',
    gains: { spirit: [6, 10], charm: [2, 4] },
  },
  grooming: {
    name: '梳妆打扮',
    gains: { charm: [6, 10], affinity: [2, 4] },
    insights: {
      positive: [
        '铜镜里的自己越来越顺眼了，心情也随之明朗起来。',
        '细细描了眉，涂了口脂，感觉整个人都焕然一新。',
        '今日打扮得格外用心，连春杏都说气色比往日好了许多。',
      ],
      negative: [
        '妆容画了又擦，总觉得哪里不对，折腾了半天反而有些疲倦。',
        '新买的胭脂颜色不太合适，心里有点小失落。',
        '铜镜模糊，照来照去看不清楚，白白耗费了不少时间。',
      ],
    },
  },
  practice_music: {
    name: '抚琴练曲',
    gains: { music: [6, 10], spirit: [2, 4] },
  },
  write_poetry: {
    name: '吟诗作赋',
    gains: { poetry: [6, 10], wisdom: [2, 4] },
    insights: {
      positive: [
        '文思泉涌，一气呵成写下一首小诗，读来朗朗上口，颇为满意。',
        '今日心境澄明，落笔如有神助，连自己都没想到能写出这样的句子。',
        '反复推敲了几个字，终于找到最妥帖的表达，成就感油然而生。',
      ],
      negative: [
        '对着空白的纸发了半天呆，脑子里一片空白，一个字也没写出来。',
        '写了几句，总觉得平淡无奇，全部划掉重来，心里有些沮丧。',
        '今日思绪散乱，诗没写成，反倒弄洒了一砚墨，心情大打折扣。',
      ],
    },
  },
  exercise: {
    name: '晨练强身',
    gains: { vitality: [6, 10], courage: [2, 4] },
    insights: {
      positive: [
        '晨风习习，练完一套拳法，浑身舒畅，神清气爽。',
        '今日动作比上次流畅了许多，感觉身体在慢慢变得有力。',
        '跑了一圈回来，汗水淋漓，反而觉得精神头十足。',
      ],
      negative: [
        '昨夜没睡好，今日练起来有气无力，勉强完成了一半便停下了。',
        '不小心扭了脚踝，虽然不严重，但后半段只能缓缓活动。',
        '天气太闷热，练了没多久就头晕，只好提前结束。',
      ],
    },
  },
  cook_practice: {
    name: '厨房练手',
    gains: { culinary: [6, 10], affinity: [2, 3] },
    insights: {
      positive: [
        '今日炖的莲藕排骨汤火候恰到好处，连厨娘都忍不住夸了一句。',
        '新学了一道江南小点，做出来卖相不错，尝了一口也觉得不错。',
        '切菜的刀工比以前稳多了，看着整齐的菜丝，心里暗暗高兴。',
      ],
      negative: [
        '火候没控制好，把一锅汤烧得有些焦糊，厨房里烟雾弥漫。',
        '放盐的时候手滑多放了，菜咸得没法入口，只好倒掉重做。',
        '今日心不在焉，切菜时差点伤了手，幸好只是虚惊一场。',
      ],
    },
  },
  herbal_study: {
    name: '研习医书',
    gains: { medical: [6, 10], wisdom: [2, 4] },
  },
};

app.post('/api/room/activity', async (req, res) => {
  try {
    const { activityId } = req.body;
    const { gameState, activityLog } = await loadState(req.playerId);
    const activity = ROOM_ACTIVITIES[activityId];
    if (!activity) return res.status(404).json({ success: false, message: '活动不存在' });
    const currentMonth = gameState.gameMonth || 1;
    if (gameState.roomActivityMonth !== currentMonth) {
      gameState.roomActivityCounts = {};
      gameState.roomActivityMonth = currentMonth;
    }
    if (gameState.roomActivityCounts[activityId]) return res.status(400).json({ success: false, message: `本月「${activity.name}」已经练习过了，下月再来吧` });
    const isPositive = Math.random() < 0.5;
    const insightPool = activity.insights?.[isPositive ? 'positive' : 'negative'];
    const insight = insightPool ? insightPool[Math.floor(Math.random() * insightPool.length)] : null;
    const gainMultiplier = isPositive ? 1 : 0.5;
    const gains = {};
    let totalGain = 0;
    const MAX_TOTAL_GAIN = 5;
    for (const [skill, [min, max]] of Object.entries(activity.gains)) {
      if (totalGain >= MAX_TOTAL_GAIN) break;
      const rawGain = Math.floor(Math.random() * (max - min + 1)) + min;
      const gain = Math.max(1, Math.min(Math.round(rawGain * gainMultiplier), MAX_TOTAL_GAIN - totalGain));
      const before = gameState.skills[skill] || 0;
      gameState.skills[skill] = Math.min(before + gain, skillConfig[skill]?.maxValue || 100);
      const actualGain = gameState.skills[skill] - before;
      gains[skill] = { before, after: gameState.skills[skill], gain: actualGain };
      totalGain += actualGain;
    }
    gameState.roomActivityCounts[activityId] = true;
    if (['rest', 'sleep', 'idle'].includes(activityId)) {
      if (!gameState.activityCounts) gameState.activityCounts = {};
      gameState.activityCounts.sleep_count = (gameState.activityCounts.sleep_count || 0) + 1;
      gameState.activityCounts.labor_total = (gameState.activityCounts.labor_total || 0) + 1;
    } else {
      updateActivityCounts(gameState, activityId);
    }
    // 房间活动 EXP +3
    gameState.exp = (gameState.exp || 0) + 3;
    checkLevelUp(gameState);
    addLogEntry(activityLog, '房间活动', `进行了「${activity.name}」，${isPositive ? '心情愉快' : '状态一般'}，获得属性提升`);
    await saveState(req.playerId, gameState, activityLog);
    res.json({ success: true, data: { character: gameState, gains, insight, isPositive, expGain: 3 }, message: `完成了「${activity.name}」！` });
  } catch (err) { res.status(500).json({ success: false, message: 'DB错误', error: err.message }); }
});


// 获取所有场景列表
app.get('/api/scenes', (req, res) => {
  res.json({
    success: true,
    data: scenes
  });
});

// 获取衣橱（按年龄分组，含玩家解锁状态）
app.get('/api/wardrobe', async (req, res) => {
  try {
    const { gameState } = await loadState(req.playerId);
    const pw = getPlayerWardrobe(gameState);
    const currentAge = gameState.age || 15;
    const dressesWithStatus = pw.dresses.map(d => ({
      ...d,
      ageUnlockable: d.ageRequired ? d.ageRequired <= currentAge : true,
      ageUnlockHint: d.ageRequired && d.ageRequired > currentAge ? `需达到${d.ageRequired}岁解锁` : null
    }));
    res.json({ success: true, data: { ...pw, dresses: dressesWithStatus } });
  } catch (err) { res.status(500).json({ success: false, message: 'DB错误', error: err.message }); }
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: '皇女成长计划后端服务运行中！', version: '2.0.0' });
});

// 托管前端静态文件
const path = require('path');
const fs = require('fs');
const frontendBuild = path.join(__dirname, '../../frontend/build');
if (fs.existsSync(frontendBuild)) {
  app.use(express.static(frontendBuild));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendBuild, 'index.html'));
  });
}

// 启动服务器
app.listen(PORT, () => {
  console.log(`🏯 皇女成长计划后端服务已启动！`);
  console.log(`📡 服务地址: http://localhost:${PORT}`);
  console.log(`🎮 API文档: http://localhost:${PORT}/api/health`);
  console.log(`🎂 年龄系统: http://localhost:${PORT}/api/age-status`);
});

module.exports = app;

