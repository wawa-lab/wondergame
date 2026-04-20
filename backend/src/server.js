try { require('dotenv').config(); } catch(e) {}
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { heroCharacter, wardrobe, scenes, npcs, courses, skillConfig, shopItems, riddleQuestions, earnActivities, AGE_CONFIG, ENDINGS } = require('./data/gameData');

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
    if (gs.fatigue === undefined) gs.fatigue = 0;
    if (!gs.courseAttendCount) gs.courseAttendCount = {};
    if (!gs.courseStreak) gs.courseStreak = {};
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

function checkLevelUp(gameState) {
  const expThresholds = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200, 4000];
  const nextLevel = gameState.level + 1;
  if (nextLevel < expThresholds.length && gameState.exp >= expThresholds[nextLevel]) {
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

function computeEnding(gameState) {
  const sorted = [...ENDINGS].sort((a, b) => b.priority - a.priority);
  for (const ending of sorted) {
    try {
      if (ending.check(gameState)) return ending;
    } catch (e) { /* skip */ }
  }
  return ENDINGS.find(e => e.id === 'ordinary');
}

// ==================== Express 中间件 ====================
app.use(cors());
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
    const { fatigue, courseAttendCount, courseStreak } = req.body || {};
    if (fatigue !== undefined) gameState.fatigue = Math.max(0, Math.min(100, fatigue));
    if (courseAttendCount !== undefined) gameState.courseAttendCount = courseAttendCount;
    if (courseStreak !== undefined) gameState.courseStreak = courseStreak;
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
      data: { character: gameState, skillChanges, leveledUp, storyText: course.storyText, ageGrowth, totalSkill: getTotalSkill(gameState), rocketPartFound, rocketPartsTotal: gameState.eventFlags?.rocket_parts_collected || 0 },
      message: rocketPartFound ? `✅ 完成${course.name}！⚙️ 发现神秘零件！（${gameState.eventFlags.rocket_parts_collected}/5）` : leveledUp ? `🎉 恭喜！完成${course.name}，并升级到${gameState.level}级！` : `✅ 完成${course.name}！`
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
    if (Object.keys(appliedBonus).length > 0) {
      await saveState(req.playerId, gameState, activityLog);
    }
    const sceneNpcs = scene.npcs.map(npcId => npcs[npcId]).filter(Boolean);
    const sceneCourses = courses.filter(c => c.scene === sceneId);
    res.json({ success: true, data: { scene, npcs: sceneNpcs, courses: sceneCourses, currentSkills: gameState.skills, entryBonus: appliedBonus } });
  } catch (err) { res.status(500).json({ success: false, message: 'DB错误', error: err.message }); }
});

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
    let reward = null;
    if (npcId === 'father' && Math.random() < 0.3) {
      const goldReward = Math.floor(Math.random() * 50) + 20;
      gameState.gold += goldReward;
      reward = { gold: goldReward };
      addLogEntry(activityLog, `与${npc.name}对话`, `${npc.name}："${randomDialogue}" — 父亲赐予了${goldReward}金币！`);
    } else {
      addLogEntry(activityLog, `与${npc.name}对话`, `${npc.name}："${randomDialogue}"`);
    }
    await saveState(req.playerId, gameState, activityLog);
    res.json({ success: true, data: { npc, dialogue: randomDialogue, dialogueWithChoice: npc.dialogueWithChoice || null, favorability: gameState.favorability[npcId], reward, character: gameState } });
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
    const dialogueWithChoice = npc.dialogueWithChoice;
    if (!dialogueWithChoice) return res.status(400).json({ success: false, message: '该NPC没有可选择的对话' });
    const choice = dialogueWithChoice.choices.find(c => c.id === choiceId);
    if (!choice) return res.status(404).json({ success: false, message: '找不到该选项' });
    const consequence = choice.consequence;
    if (consequence.reward && consequence.reward.favorability) {
      const favNpcId = consequence.reward.favorability;
      if (!gameState.favorability[favNpcId]) gameState.favorability[favNpcId] = 0;
      gameState.favorability[favNpcId] = Math.min(100, gameState.favorability[favNpcId] + (consequence.reward.value || 5));
    }
    if (consequence.storyNode) {
      if (!gameState.unlockedStoryNodes) gameState.unlockedStoryNodes = [];
      if (!gameState.unlockedStoryNodes.includes(consequence.storyNode)) gameState.unlockedStoryNodes.push(consequence.storyNode);
    }
    // 宫廷NPC顺序解锁：每个对话/见面达2次才能见下一个
    const courtSequence = ['royal_lady', 'royal_official', 'royal_guard_captain', 'royal_emperor'];
    if (consequence.type === 'scene_character' && courtSequence.includes(consequence.npcId)) {
      if (!gameState.subSceneVisits) gameState.subSceneVisits = {};
      if (!gameState.npcTalkCount) gameState.npcTalkCount = {};
      const idx = courtSequence.indexOf(consequence.npcId);
      if (idx > 0) {
        const prevNpcId = courtSequence[idx - 1];
        // 普通对话次数 + 子场景见面次数 合计
        const prevCount = (gameState.npcTalkCount[prevNpcId] || 0) + (gameState.subSceneVisits[prevNpcId] || 0);
        if (prevCount < 2) {
          const prevNpcName = { royal_lady: '映月', royal_official: '韩大人', royal_guard_captain: '侍卫总领' }[prevNpcId] || prevNpcId;
          return res.json({ success: true, data: { choice, consequence: { type: 'npc_absent', npcName: consequence.npcName, reason: `需要先与${prevNpcName}多加熟悉，才能见到此人。` }, character: gameState, favorability: null }, message: '尚未解锁' });
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

      // 将上次选项文本注入台词（替换占位符 {lastChoice} 或直接注入首句）
      const lastChoiceText = gameState.npcLastChoice[consequence.npcId]?.text || null;
      if (lastChoiceText && dialogues && dialogues.length > 0) {
        dialogues = dialogues.map(line => line.replace('[[lastChoice]]', lastChoiceText));
      }

      // 选取本次选项变体
      let choices = stage.subSceneChoices;
      if (stage.choiceVariants && stage.choiceVariants.length > 0) {
        const variantIdx = (visits - stage.minVisit) % stage.choiceVariants.length;
        choices = stage.choiceVariants[variantIdx];
      }

      resolvedConsequence = { ...consequence, subSceneDialogues: dialogues, subSceneChoices: choices, visitCount: visits, storyStage: stageIndex + 1 };
      delete resolvedConsequence.storyStages;
    }
    addLogEntry(activityLog, `${npc.name}：选择了"${choice.text}"`, resolvedConsequence.subSceneDialogues?.[0] || resolvedConsequence.nextDialogue || '剧情推进中...');
    await saveState(req.playerId, gameState, activityLog);
    res.json({ success: true, data: { choice, consequence: resolvedConsequence, character: gameState, favorability: consequence.reward?.favorability ? gameState.favorability[consequence.reward.favorability] : null }, message: consequence.type === 'scene_character' ? `✨ 剧情推进！遭遇了新角色！` : `💬 对话继续...` });
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
    const { amount, source } = req.body;
    const { gameState, activityLog } = await loadState(req.playerId);
    const reward = Math.max(0, Math.min(500, Math.round(Number(amount) || 0)));
    gameState.gold += reward;
    addLogEntry(activityLog, '铸币积分坊', source || `积分兑换${reward}金币`);
    await saveState(req.playerId, gameState, activityLog);
    res.json({ success: true, data: { character: gameState, reward }, message: `💰 成功兑换${reward}金币！` });
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
  '制绳编筐': ['labor_total', 'workshop'],
  '烧炭制薪': ['labor_total'],
  '酿造蜂蜜': ['labor_total'],
  '修缮房屋': ['labor_total', 'workshop'],
  '挖井引水': ['labor_total', 'mining'],
  '驾车赶路': ['labor_total'],
  '传递信件': ['labor_total'],
  '守夜巡逻': ['labor_total'],
  '摆摊售货': ['labor_total', 'performance'],
  '浣洗衣物': ['labor_total'],
  '腌制咸菜': ['labor_total'],
  '编制灯笼': ['labor_total', 'workshop'],
  '种桑养蚕': ['labor_total', 'animal_care'],
  '磨粮制粉': ['labor_total'],
  '晒盐制卤': ['labor_total', 'mining'],
  '制作陶器': ['labor_total', 'workshop'],
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

// ==================== 月份推进接口 ====================
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
    const monthInfo = getMonthInfo(newGm);
    addLogEntry(activityLog, "月份推进", `进入${monthInfo.age}岁第${monthInfo.monthInYear}月（第${newGm}月）`);
    const ageGrowthResult = checkAgeGrowth(gameState);
    let ageGrowth = null;
    if (ageGrowthResult && ageGrowthResult.shouldGrow) {
      const newlyUnlocked = applyAgeGrowth(gameState, ageGrowthResult.newAge);
      addLogEntry(activityLog, `🎂 年龄增长：${ageGrowthResult.oldAge}岁 → ${ageGrowthResult.newAge}岁`, `凌若雪迎来了${ageGrowthResult.newAge}岁！`);
      ageGrowth = { grew: true, oldAge: ageGrowthResult.oldAge, newAge: ageGrowthResult.newAge, newTitle: AGE_CONFIG.ageTitles[ageGrowthResult.newAge], achievedTitle: ageGrowthResult.achievedTitle, achievedDesc: ageGrowthResult.achievedDesc, newlyUnlockedDresses: newlyUnlocked };
    }
    let ending = null;
    if (monthInfo.isEnd) {
      ending = computeEnding(gameState);
      addLogEntry(activityLog, '🎊 命运终章', `凌若雪的传奇结局：${ending.emoji} ${ending.title}`);
    }
    await saveState(req.playerId, gameState, activityLog);
    return res.json({ success: true, data: { gameMonth: newGm, monthInfo, isEnd: monthInfo.isEnd, character: gameState, ageGrowth, ending }, message: `已进入${monthInfo.age}岁第${monthInfo.monthInYear}月` });
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
          gameState.npcLastChoice[payload.npcId] = { optionId: payload.optionId, text: payload.text || '' };
        }
        break;
      default:
        if (eventType && typeof eventType === 'string') gameState.activityCounts[eventType] = (gameState.activityCounts[eventType] || 0) + 1;
    }
    addLogEntry(activityLog, '特殊事件', `触发：${eventType}`);
    await saveState(req.playerId, gameState, activityLog);
    res.json({ success: true, data: { activityCounts: gameState.activityCounts, eventFlags: gameState.eventFlags } });
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
    for (const [skill, [min, max]] of Object.entries(activity.gains)) {
      const rawGain = Math.floor(Math.random() * (max - min + 1)) + min;
      const gain = Math.max(1, Math.round(rawGain * gainMultiplier));
      const before = gameState.skills[skill] || 0;
      gameState.skills[skill] = Math.min(before + gain, skillConfig[skill]?.maxValue || 100);
      gains[skill] = { before, after: gameState.skills[skill], gain: gameState.skills[skill] - before };
    }
    gameState.roomActivityCounts[activityId] = true;
    if (['rest', 'sleep', 'idle'].includes(activityId)) {
      if (!gameState.activityCounts) gameState.activityCounts = {};
      gameState.activityCounts.sleep_count = (gameState.activityCounts.sleep_count || 0) + 1;
      gameState.activityCounts.labor_total = (gameState.activityCounts.labor_total || 0) + 1;
    } else {
      updateActivityCounts(gameState, activityId);
    }
    addLogEntry(activityLog, '房间活动', `进行了「${activity.name}」，${isPositive ? '心情愉快' : '状态一般'}，获得属性提升`);
    await saveState(req.playerId, gameState, activityLog);
    res.json({ success: true, data: { character: gameState, gains, insight, isPositive }, message: `完成了「${activity.name}」！` });
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

// 启动服务器
app.listen(PORT, () => {
  console.log(`🏯 皇女成长计划后端服务已启动！`);
  console.log(`📡 服务地址: http://localhost:${PORT}`);
  console.log(`🎮 API文档: http://localhost:${PORT}/api/health`);
  console.log(`🎂 年龄系统: http://localhost:${PORT}/api/age-status`);
});

module.exports = app;

