# 🏯 皇女成长计划 — 游戏设计文档 v2.0

> **最后更新**：2026-03-27
> **版本**：2.0.0（年龄系统 + 分支对话 + 年龄专属衣橱）

---

## 目录

1. [游戏概述](#1-游戏概述)
2. [技术架构](#2-技术架构)
3. [年龄成长系统](#3-年龄成长系统)
4. [年龄专属衣橱系统](#4-年龄专属衣橱系统)
5. [NPC 分支对话系统](#5-npc-分支对话系统)
6. [场景与地图设计](#6-场景与地图设计)
7. [技能与课程系统](#7-技能与课程系统)
8. [前端 UI 组件设计](#8-前端-ui-组件设计)
9. [后端 API 接口文档](#9-后端-api-接口文档)
10. [资源文件说明](#10-资源文件说明)
11. [游戏流程设计](#11-游戏流程设计)

---

## 1. 游戏概述

### 1.1 基本信息

| 项目 | 内容 |
|------|------|
| 游戏名称 | 皇女成长计划 |
| 主角 | 凌若雪（将军府千金） |
| 游戏类型 | 古风换装 · 养成 · 剧情互动 |
| 目标时长 | **30 ~ 40 分钟**（推荐 35 分钟） |
| 年龄跨度 | 15 岁（开局）→ 18 岁（大结局） |
| 技术栈 | React.js 前端 + Node.js / Express 后端 |

### 1.2 核心玩法

1. **探索场景**：在 9 大场景自由切换，与 NPC 互动、参加课程活动
2. **培养技能**：通过上课、购买道具提升 12 项技能
3. **换装成长**：解锁年龄专属套装，在角色面板实时展示当前造型
4. **剧情分支**：与 NPC 对话时做出选择，触发不同剧情画面与结局
5. **年龄增长**：技能总量达到阈值后自动升岁，解锁新服装和剧情内容

---

## 2. 技术架构

```
wondergame/
├── backend/
│   └── src/
│       ├── server.js          # Express API 服务（端口 3001）
│       └── data/
│           └── gameData.js    # 游戏核心数据（角色、场景、NPC、衣橱）
└── frontend/
    └── src/
        ├── App.js             # 主应用（全局状态、年龄轮询、弹窗）
        └── components/
            ├── CharacterPanel.js   # 角色面板（含年龄进度条）
            ├── SceneView.js        # 场景视图（NPC 热点 + 分支气泡）
            ├── WardrobePanel.js    # 衣橱面板（年龄分类筛选）
            ├── ShopPanel.js        # 商店
            ├── EarnPanel.js        # 赚钱活动
            ├── SkillsPanel.js      # 技能面板
            └── Toast.js / TopBar.js / NavigationBar.js / ...
```

### 2.1 数据流

```
用户操作
  ↓
React 前端（useState/useEffect）
  ↓ axios HTTP
Express 后端（内存 gameState）
  ↓
gameData.js（静态配置 + 可变 wardrobe）
  ↓
HTTP 响应（含 ageGrowth / consequence 等附加信息）
  ↑
前端状态更新 → UI 重渲染 → 弹窗 / 进度条更新
```

---

## 3. 年龄成长系统

### 3.1 设计思路

游戏将 30-40 分钟的体验划分为 **3 个成长阶段**，通过累积各技能总值触发年龄增长，而非依赖真实时间，确保玩家行为对剧情节奏有掌控感。

### 3.2 年龄阶段配置

| 年龄 | 称号 | 阶段描述 | 进入下一岁所需总技能 | 预计游戏时长 |
|------|------|----------|---------------------|-------------|
| **15 岁** | 将军府千金 | 豆蔻年华 · 明媚懵懂 | 220 | 0 ~ 10 分钟 |
| **16 岁** | 京城闺秀 | 妙龄佳人 · 渐露锋芒 | 380 | 10 ~ 23 分钟 |
| **17 岁** | 名满京城 | 芳华绽放 · 命运交汇 | 560 | 23 ~ 35 分钟 |
| **18 岁** | 凌若雪传奇 | 命运终章 · 大结局 | ∞（终态） | 35 分钟+ |

> **总技能** = 所有 12 项技能（野性值 + 体力值 + 灵气值 + 亲和力 + 魅力值 + 才学值 + 胆识值 + 厨艺值 + 医术值 + 诗才值 + 乐艺值 + 画艺值）的当前值之和

### 3.3 年龄增长触发条件

```javascript
// backend/src/server.js
function checkAgeGrowth() {
  const currentAge = gameState.age || 15;
  const threshold = AGE_CONFIG.ageThresholds[currentAge];
  if (!threshold || !threshold.nextAge) return null;

  const totalSkill = getTotalSkill(); // 所有技能之和
  if (totalSkill >= threshold.requiredTotalSkill) {
    return { shouldGrow: true, oldAge: currentAge, newAge: threshold.nextAge, ... };
  }
  return null;
}
```

**检查时机**（后端）：
- `POST /api/course/attend`：完成课程后自动检查
- `POST /api/shop/buy`：购买商店道具后自动检查
- `POST /api/age/check`：前端每 15 秒轮询触发

### 3.4 年龄增长效果

年龄增长时，系统自动执行：

1. **更新角色年龄**：`gameState.age` 更新
2. **更新角色称号**：对应年龄的 `ageTitles` 称号
3. **自动解锁当年龄服装**：`wardrobe.dresses` 中 `ageRequired === newAge` 的全部套装
4. **记录剧情节点**：写入 `gameState.unlockedStoryNodes`（如 `"age_grow_16"`）
5. **返回新解锁服装列表**：前端展示在年龄增长弹窗中

### 3.5 前端年龄增长弹窗（AgeGrowthModal）

触发条件：后端返回 `ageGrowth` 数据 / 轮询检测到 `grew: true`

弹窗内容：
- 🎂 年龄变化动画（`X岁 → Y岁`）
- 已完成阶段称号（如"豆蔻年华阶段圆满"）
- 新解锁套装预览（图片 + 名称）
- 各年龄段专属主题色渐变背景

```
16岁主题色：#E74C3C → #C9A84C（朱红 · 金色）
17岁主题色：#8E44AD → #E91E8C（紫罗兰 · 玫红）
18岁主题色：#C9A84C → #FBBF24（金色 · 琥珀）
```

---

## 4. 年龄专属衣橱系统

### 4.1 整体设计

衣橱分为两类：
- **年龄专属套装**（8 套）：标有 `ageRequired` 属性，达到对应年龄自动解锁，无需金币
- **普通套装**（9 套）：无年龄限制，需花费金币购买解锁

### 4.2 年龄专属套装列表

#### 🌸 15 岁专属（游戏开始即解锁，共 3 套）

| 套装 ID | 名称 | 图片文件 | 颜色 | 稀有度 | 技能加成 |
|---------|------|---------|------|--------|---------|
| `age15_dress1` | 粉黛玉玺 | `15岁-粉黛玉玺.jpg` | #FFB7C5 | 优良 | 魅力+5、亲和+4 |
| `age15_dress2` | 紫魅风云 | `15岁-紫魅风云.jpg` | #9B59B6 | 优良 | 灵气+5、才学+4 |
| `age15_dress3` | 绿香书阁 | `15岁-绿香书阁.jpg` | #27AE60 | 优良 | 才学+6、诗才+4 |

#### 🌺 16 岁专属（达到 16 岁自动解锁，共 3 套）

| 套装 ID | 名称 | 图片文件 | 颜色 | 稀有度 | 技能加成 |
|---------|------|---------|------|--------|---------|
| `age16_dress1` | 红玉清峦 | `16岁-红玉清峦.jpg` | #E74C3C | 稀有 | 魅力+8、亲和+5 |
| `age16_dress2` | 莲玉丹红 | `16岁-莲玉丹红.jpg` | #E91E8C | 稀有 | 灵气+7、魅力+6 |
| `age16_dress3` | 蓝庭梅香 | `16岁-蓝庭梅香.jpg` | #2980B9 | 稀有 | 才学+8、胆识+5 |

#### 🌿 17 岁专属（达到 17 岁自动解锁，共 2 套）

| 套装 ID | 名称 | 图片文件 | 颜色 | 稀有度 | 技能加成 |
|---------|------|---------|------|--------|---------|
| `age17_dress1` | 兰玉竹随 | `17岁-兰玉竹随.jpg` | #8E44AD | 史诗 | 魅力+10、才学+8、灵气+6 |
| `age17_dress2` | 粉翠萝雀 | `17岁-粉翠萝雀.jpg` | #FF6B9D | 史诗 | 魅力+12、亲和+8、胆识+5 |

### 4.3 年龄限制逻辑

**穿戴限制**（`POST /api/character/change-dress`）：
```
若 dress.ageRequired > gameState.age → 拒绝穿戴（返回 400）
```

**解锁逻辑**（`POST /api/wardrobe/unlock`）：
```
若 dress.ageRequired 存在：
  - 当前年龄已达到 → 直接解锁，无需金币
  - 当前年龄未达到 → 拒绝，提示"需达到X岁自动解锁"
若无 ageRequired → 正常金币购买解锁
```

### 4.4 衣橱面板 UI（WardrobePanel）

新增**年龄分类筛选**按钮：
- `全部` — 展示所有套装
- `年龄专属` — 仅展示有 `ageRequired` 的套装
- `普通服装` — 仅展示无 `ageRequired` 的套装

未解锁套装遮罩区别：
- 年龄专属：显示 🎂 图标 + "X岁自动解锁"
- 普通套装：显示 🔒 图标 + "金币解锁" + 购买按钮

---

## 5. NPC 分支对话系统

### 5.1 对话机制设计

每个 NPC 对话分为 **3 个阶段**：

```
普通对话阶段（dialogues）
    ↓ 点击至最后一句后（若有 dialogueWithChoice）
选项选择阶段（choice）
    ↓ 玩家选择
结果展示阶段（consequence）
```

### 5.2 支持的结果类型（consequence.type）

| 类型 | 说明 | 触发效果 |
|------|------|---------|
| `scene_character` | 新角色登场 | 在场景右侧叠加展示人物立绘图片 |
| `dialogue` | 继续对话 | 展示 NPC 的回应文字 |

当选择触发 `scene_character` 类型时：
- 场景图右侧出现人物立绘（`consequence.characterImage`）
- 对话气泡展示人物自我介绍（`consequence.nextDialogue`）
- 记录剧情节点到 `gameState.unlockedStoryNodes`（`consequence.storyNode`）
- 给对应 NPC 增加好感度（`consequence.reward.favorability`）

### 5.3 已实现的分支剧情

#### 📖 书画院（art_studio）—— 司徒仟

**触发 NPC**：艺术学院好友（`art_friend`）
**触发问题**：好友询问是否一起拜访书画院的才子司徒仟

| 选项 | 结果 |
|------|------|
| ✅ 一起去拜访朋友 | 场景叠加 `书画院-司徒仟.jpg` 立绘，司徒仟登场介绍自己，解锁剧情节点 `meet_situxian`，司徒仟好感+12 |
| ↩ 今日有事，先行告辞 | 展示婉拒对话文字，无额外效果 |

**司徒仟登场台词**：
> 「司徒仟（放下画笔，含笑）：'凌小姐，久仰大名。你的丹青造诣在京城早有传闻，今日得见，果然气质非凡。不知小姐可有兴趣，我们切磋一番？'」

#### 🏛️ 宫廷（royal_court）—— 宇文拓

**触发 NPC**：皇后娘娘（`royal_emperor`）
**触发问题**：皇后询问若雪是否愿随其前往偏殿拜见三皇子宇文拓

| 选项 | 结果 |
|------|------|
| ✅ 恭聆娘娘安排，若雪愿往 | 场景叠加 `宫廷-宇文拓.jpg` 立绘，宇文拓登场，解锁剧情节点 `meet_yuwentuo`，宇文拓好感+15 |
| ↩ 若雪才疏学浅，恐失礼数 | 皇后温和回应，暂时推迟会面 |

**宇文拓登场台词**：
> 「宇文拓（转身，目光如炬）：'凌若雪？父皇和母后都提过你。果然……与众不同。'他说话简短，却眼神深邃，令人心跳骤停。」

#### 🌿 秋风翠黄草原（grassland）—— 幕风公子

**触发 NPC**：赵公子（`outdoor_son`）
**触发问题**：赵公子询问是否一起去草原深处见识著名骑手幕风公子

| 选项 | 结果 |
|------|------|
| ✅ 好啊，一起去见识一下 | 场景叠加 `草原-幕风公子.jpg` 立绘，幕风公子骑马登场，解锁剧情节点 `meet_mufengongzi`，幕风公子好感+10 |
| ↩ 今日有些疲惫，下次再去 | 赵公子表示下次再带若雪去 |

**幕风公子登场台词**：
> 「幕风公子（骑马而来，洒脱如风）：'凌若雪？久闻大名。你的故事在草原上也传开了。不如一起骑马如何？'他笑容自信而神秘。」

#### 🏪 琳琅繁街（ancient_street）—— 王文玉

**触发 NPC**：锦绣坊掌柜（`street_cloth`）
**触发问题**：掌柜询问是否替若雪引荐在街上的王文玉公子

| 选项 | 结果 |
|------|------|
| ✅ 有劳掌柜引荐 | 场景叠加 `街道-王文玉.jpg` 立绘，王文玉登场，解锁剧情节点 `meet_wangwenyu`，王文玉好感+12 |
| ↩ 不必了，先看看您这儿的布料 | 掌柜笑着带若雪参观新布料 |

**王文玉登场台词**：
> 「王文玉（转身微笑）：'久闻凌小姐大名，今日得幸相识，果然名不虚传。我刚从江南带回新款的花粉，特别适合您这样肤色的佳人。'」

### 5.4 分支对话数据结构

```javascript
// gameData.js 中的 NPC 对象示例
{
  id: "royal_emperor",
  dialogues: ["...", "..."],  // 普通对话（多句）
  dialogueWithChoice: {
    text: "NPC 的问题文本",  // 展示给玩家的情节提问
    choices: [
      {
        id: "meet_yuwentuo",
        text: "选项一的文字（正面选择）",
        consequence: {
          type: "scene_character",          // 角色登场类型
          scene: "royal_court",            // 发生的场景 ID
          characterImage: "/assets/character/outfits/宫廷-宇文拓.jpg",
          nextDialogue: "角色登场的台词",
          storyNode: "meet_yuwentuo",       // 写入解锁节点
          reward: { favorability: "yuwentuo", value: 15 }
        }
      },
      {
        id: "politely_decline_court",
        text: "选项二的文字（婉拒）",
        consequence: {
          type: "dialogue",
          nextDialogue: "NPC 的回应文字"
        }
      }
    ]
  }
}
```

---

## 6. 场景与地图设计

### 6.1 场景列表

| 场景 ID | 名称 | 氛围 | NPC 数量 | 初始解锁 |
|---------|------|------|---------|---------|
| `bedroom` | 锦绣绣阁 | 温馨私密 | 1 | ✅ |
| `ancient_street` | 琳琅繁街 | 热闹喧嚣 | 2 | ✅ |
| `inn` | 悦来居栈 | 温馨热络 | 2 | ✅ |
| `royal_court` | 宫廷 | 威严华贵 | 3 | ❌（需魅力≥60）|
| `grassland` | 秋风翠黄 | 自由灵动 | 1 | ✅ |
| `etiquette_hall` | 雅韵礼仪院 | 典雅庄重 | 2 | ✅ |
| `medicine_hall` | 百草堂 | 药香静谧 | 1 | ✅ |
| `art_studio` | 翰墨丹青苑 | 文雅书香 | 3 | ✅ |

### 6.2 场景图片资源

每个场景配备两张图片：

| 图片类型 | 路径格式 | 用途 |
|---------|---------|------|
| `bgImage` | `/assets/scenes/{scene_id}.jpg` | 场景列表预览图（纯背景，无人物） |
| `activeImage` | `/assets/scenes_active/{scene_id}.jpg` | 进入场景后的活动图（含 NPC 位置） |

### 6.3 NPC 热点坐标系统

NPC 在场景图上的位置使用**百分比坐标**（`left%`, `top%`），基于场景图的实际尺寸：

```javascript
npcPositions: {
  art_master:  { left: 32.5, top: 47.5 },
  art_friend:  { left: 42.5, top: 72.5 },
  art_prince:  { left: 72.5, top: 62.5 }
}
```

---

## 7. 技能与课程系统

### 7.1 12 项技能

| 技能键 | 名称 | 图标 | 颜色 | 初始值 |
|--------|------|------|------|--------|
| `wildness` | 野性值 | 🐎 | #E67E22 | 10 |
| `vitality` | 体力值 | 💪 | #27AE60 | 20 |
| `spirit` | 灵气值 | ✨ | #9B59B6 | 15 |
| `affinity` | 亲和力 | 💚 | #1ABC9C | 25 |
| `charm` | 魅力值 | 💕 | #E91E8C | 30 |
| `wisdom` | 才学值 | 📚 | #3498DB | 20 |
| `courage` | 胆识值 | ⚡ | #E74C3C | 15 |
| `culinary` | 厨艺值 | 🍱 | #F39C12 | 10 |
| `medical` | 医术值 | 🌿 | #2ECC71 | 5 |
| `poetry` | 诗才值 | 📜 | #8E44AD | 20 |
| `music` | 乐艺值 | 🎵 | #2980B9 | 15 |
| `painting` | 画艺值 | 🎨 | #16A085 | 10 |

**初始总技能**：195（15 岁开局）
**到达 16 岁**：需总技能达到 220（差 25 点，约参加 3-5 个初级课程）

### 7.2 课程触发年龄增长

每次参加课程后，后端同步检测年龄增长条件：

```javascript
// 课程完成 → 检测年龄 → 若满足条件则返回 ageGrowth
if (ageGrowthResult?.shouldGrow) {
  const newlyUnlocked = applyAgeGrowth(ageGrowthResult.newAge);
  ageGrowth = { ...ageGrowthResult, newlyUnlockedDresses: newlyUnlocked };
}
```

---

## 8. 前端 UI 组件设计

### 8.1 CharacterPanel（左侧角色面板）

包含 4 个子区域：

1. **CharacterDisplay** — 角色立绘展示、当前服装信息
2. **AgeProgressPanel** — 年龄与成长进度
3. **MiniSkills** — 核心技能小进度条（魅力/才学/亲和/灵气）
4. **当前位置** — 当前所在场景名

#### AgeProgressPanel 详细说明

- **年龄徽章**：显示当前岁数（大号字体） + 年龄阶段称号（如"豆蔻年华"）
- **成长进度条**：当前总技能 / 下一年龄所需总技能，百分比动画进度条
- **游戏时长进度条**：基于 `gameStartTime` 计算已用时间，总时长 35 分钟为 100%
- **剧情节点数量**：已触发的重要剧情事件数量

年龄主题色对照：

| 年龄 | 主题色 | 阶段图标 |
|------|--------|---------|
| 15 | #FFB7C5（粉色） | 🌸 |
| 16 | #E74C3C（朱红） | 🌺 |
| 17 | #8E44AD（紫色） | 🌿 |
| 18 | #C9A84C（金色） | 👑 |

### 8.2 SceneView（中间场景视图）

#### NpcBubble 三阶段对话气泡

**阶段一：普通对话（dialogues）**
- 显示 NPC 头像 + 名字 + 职位
- 点击切换下一句
- 最后一句若有 `dialogueWithChoice` 则提示"💬 有对话选项"

**阶段二：选项选择（choice）**
- 深色背景气泡，粉红色边框（区别普通对话的暖金色）
- 展示 NPC 问题（斜体引用样式）
- 列出所有选项按钮（正面选项 vs 婉拒选项颜色区别）
- 正在处理时显示 ⏳ 加载状态

**阶段三：结果展示（consequence）**
- `scene_character` 类型：在气泡内展示人物立绘缩图 + 台词
- `dialogue` 类型：展示 NPC 普通回应文字
- 场景叠加图同步在 `ActiveSceneView` 右侧显示

#### NpcHotspot（场景 NPC 热点）

- 圆形头像可点击，悬停时放大并显示金色光晕
- 有 `dialogueWithChoice` 的 NPC 额外显示粉红色边框高亮
- 悬停 tooltip 显示 NPC 名字 + 职位 + "💬选项" 标签
- 浮动动画增加场景活跃感

#### 叠加角色图（Overlay Character Image）

当玩家选择 `scene_character` 类型的分支后：
- 人物立绘以滑入动画出现在场景图**右侧**
- 占场景宽度的 35%，从底部对齐
- 左边有渐变遮罩过渡
- 右上角有关闭按钮（✕）

### 8.3 WardrobePanel（衣橱面板）

- 顶部显示"当前 X 岁 · 已解锁 Y 套专属服装"
- **筛选按钮**：全部 / 年龄专属 / 普通服装
- 未解锁年龄专属套装：显示蛋糕图标 + "X岁自动解锁"（不显示购买按钮）
- 未解锁普通套装：显示锁图标 + 金币价格 + 购买按钮

---

## 9. 后端 API 接口文档

### 9.1 基础信息

```
Base URL: http://localhost:3001/api
Content-Type: application/json
```

### 9.2 接口列表

#### 游戏配置

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/game-config` | 获取全部静态配置（衣橱/场景/NPC/课程/商店） |
| GET | `/character` | 获取角色当前状态（含年龄进度信息） |
| POST | `/character/reset` | 重置游戏（初始化角色、重置年龄服装） |
| GET | `/health` | 服务健康检查 |

#### 年龄系统

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/age-status` | 获取年龄系统详情（进度/当前服装/游戏时长） |
| POST | `/age/check` | 前端轮询年龄检测，若满足则触发增长并返回 |

#### 换装

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/character/change-dress` | 更换服装（含年龄限制校验） |
| POST | `/character/change-accessory` | 更换配饰 |
| POST | `/wardrobe/unlock` | 解锁服装/配饰（年龄专属免费/普通需金币） |
| GET | `/wardrobe` | 获取衣橱数据（含年龄解锁状态提示） |

#### 场景与 NPC

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/scenes` | 获取全部场景列表 |
| GET | `/scene/:sceneId` | 获取场景详情（含 NPC/课程） |
| POST | `/npc/talk` | 与 NPC 普通对话（随机台词） |
| POST | `/npc/choice` | 处理 NPC 分支对话选项，返回 consequence |

#### 课程与商店

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/course/attend` | 参加课程（扣金币/提升技能/可能触发年龄增长） |
| GET | `/shop` | 获取商店列表 |
| POST | `/shop/buy` | 购买道具（可能触发年龄增长） |
| GET | `/earn` | 获取赚钱活动列表 |
| POST | `/earn/claim` | 领取积分兑换金币 |
| POST | `/earn/riddle` | 答题猜谜 |
| POST | `/earn/culinary` | 参加厨艺大赛 |
| POST | `/daily-reward` | 每日奖励 |
| GET | `/log` | 获取活动日志 |

### 9.3 关键响应结构示例

#### `/api/npc/choice` 响应

```json
{
  "success": true,
  "data": {
    "choice": { "id": "meet_yuwentuo", "text": "恭聆娘娘安排" },
    "consequence": {
      "type": "scene_character",
      "scene": "royal_court",
      "characterImage": "/assets/character/outfits/宫廷-宇文拓.jpg",
      "nextDialogue": "宇文拓（转身，目光如炬）：'...'",
      "storyNode": "meet_yuwentuo",
      "reward": { "favorability": "yuwentuo", "value": 15 }
    },
    "character": { ...gameState },
    "favorability": 15
  },
  "message": "✨ 剧情推进！遭遇了新角色！"
}
```

#### `/api/course/attend` 响应（含年龄增长）

```json
{
  "success": true,
  "data": {
    "character": { ...gameState },
    "skillChanges": {
      "charm": { "before": 30, "after": 38, "gain": 8 }
    },
    "leveledUp": false,
    "storyText": "课程剧情描述...",
    "totalSkill": 225,
    "ageGrowth": {
      "shouldGrow": true,
      "oldAge": 15,
      "newAge": 16,
      "achievedTitle": "豆蔻年华",
      "achievedDesc": "明媚懵懂的少女时光",
      "newlyUnlockedDresses": [
        { "id": "age16_dress1", "name": "红玉清峦", "image": "/assets/character/outfits/16岁-红玉清峦.jpg" }
      ]
    }
  }
}
```

---

## 10. 资源文件说明

### 10.1 图片目录结构

```
frontend/public/assets/
├── scenes/                    # 场景预览图（纯背景）
│   ├── bedroom_new.jpg
│   ├── street_new.jpg
│   ├── inn_new.jpg
│   ├── royal_court.jpg
│   ├── outdoor.jpg
│   ├── classroom.jpg
│   ├── medicine_hall_new.jpg
│   └── art_studio_new.jpg
├── scenes_active/             # 场景活动图（含人物位置）
│   └── （同上命名）
├── character/
│   └── outfits/               # 角色服装图 + NPC 场景立绘
│       ├── 15岁-粉黛玉玺.jpg
│       ├── 15岁-紫魅风云.jpg
│       ├── 15岁-绿香书阁.jpg
│       ├── 16岁-红玉清峦.jpg
│       ├── 16岁-莲玉丹红.jpg
│       ├── 16岁-蓝庭梅香.jpg
│       ├── 17岁-兰玉竹随.jpg
│       ├── 17岁-粉翠萝雀.jpg
│       ├── 书画院-司徒仟.jpg   ← NPC 场景立绘
│       ├── 宫廷-宇文拓.jpg
│       ├── 草原-幕风公子.jpg
│       └── 街道-王文玉.jpg
├── outfits/                   # 普通套装图
│   ├── outfit_04.png ~ outfit_12.png
│   └── ...
├── accessories/               # 配饰图
│   ├── jade_hairpin.png
│   ├── gold_phoenix_crown.png
│   ├── pearl_earrings.png
│   └── jade_bracelet.png
└── npc_avatars/               # NPC 头像（对话气泡中显示）
    ├── inn_keeper.png
    ├── street_cloth.png
    └── ...
```

### 10.2 图片命名规范

| 类别 | 命名格式 | 示例 |
|------|---------|------|
| 年龄专属服装 | `{年龄}岁-{名称}.jpg` | `15岁-粉黛玉玺.jpg` |
| NPC 场景立绘 | `{场景名}-{NPC名}.jpg` | `书画院-司徒仟.jpg` |
| 普通套装 | `outfit_{编号}.png` | `outfit_07.png` |
| NPC 头像 | `{npc_id}.png` | `inn_keeper.png` |
| 场景背景 | `{scene_id}.jpg` | `bedroom_new.jpg` |

---

## 11. 游戏流程设计

### 11.1 完整游戏流程图

```
游戏开局（15岁）
    │
    ├─ 🏠 锦绣绣阁（起点）
    │   └─ 与明珠对话 → 了解游戏基本操作
    │
    ├─ 探索各场景 → 参加课程 → 技能成长
    │
    │   总技能 → 220 时
    │       ↓
    │   🎂 年龄增长弹窗（15→16岁）
    │   自动解锁：红玉清峦、莲玉丹红、蓝庭梅香
    │
    ├─ 继续探索（现在可进入宫廷如果魅力≥60）
    │
    │   总技能 → 380 时
    │       ↓
    │   🎂 年龄增长弹窗（16→17岁）
    │   自动解锁：兰玉竹随、粉翠萝雀
    │
    ├─ 继续探索
    │
    │   总技能 → 560 时
    │       ↓
    │   🎂 年龄增长弹窗（17→18岁）
    │   → 🏆 大结局
    │
    └─ END
```

### 11.2 剧情分支触发时序

```
书画院访问
  └─ 与艺术好友对话
       └─ 选择"一起去拜访朋友" → 司徒仟登场 [解锁节点: meet_situxian]

宫廷访问（需魅力≥60）
  └─ 与皇后娘娘对话
       └─ 选择"恭聆娘娘安排" → 宇文拓登场 [解锁节点: meet_yuwentuo]

草原访问
  └─ 与赵公子对话
       └─ 选择"一起去见识一下" → 幕风公子登场 [解锁节点: meet_mufengongzi]

琳琅繁街访问
  └─ 与锦绣坊掌柜对话
       └─ 选择"有劳掌柜引荐" → 王文玉登场 [解锁节点: meet_wangwenyu]
```

### 11.3 推荐游玩路线（35分钟）

| 时间 | 推荐行动 | 目标 |
|------|---------|------|
| 0~5 min | 绣阁开局 → 参加礼仪/书画初级课程 | 熟悉操作 |
| 5~10 min | 探索街道/书画院 → 与 NPC 互动 | 触发分支对话 |
| 10~13 min | 技能总计达 220 → **16 岁年龄增长** | 解锁 3 套新服装 |
| 13~23 min | 加强学习 → 访问草原/客栈 → 多触发剧情 | 推进好感度 |
| 23~25 min | 技能总计达 380 → **17 岁年龄增长** | 解锁史诗级服装 |
| 25~33 min | 宫廷访问（魅力已≥60） → 宇文拓剧情 | 主线高潮 |
| 33~35 min | 技能总计达 560 → **18 岁大结局** | 游戏结束 |

---

## 附录：主要角色登场一览

| 人物 | 所在场景 | 触发方式 | 关系 |
|------|---------|---------|------|
| 明珠 | 锦绣绣阁 | 直接对话 | 贴身丫鬟 |
| 赵伯伯 | 悦来居栈 | 直接对话 | 父亲旧友 |
| 王掌柜 | 悦来居栈 | 直接对话 | 客栈掌柜 |
| 锦绣坊掌柜 | 琳琅繁街 | 直接对话 | 布商 |
| 糖葫芦阿叔 | 琳琅繁街 | 直接对话 | 街头小贩 |
| 皇后娘娘 | 宫廷 | 直接对话（需魅力≥60）| 中宫皇后 |
| 芳华郡主 | 宫廷 | 直接对话 | 皇室郡主 |
| 礼部侍郎 | 宫廷 | 直接对话 | 朝廷命官 |
| 赵公子 | 秋风翠黄 | 直接对话 | 赵伯伯之子 |
| **司徒仟** | 翰墨丹青苑 | **艺术好友分支选择** | 才子（隐线男主之一）|
| **宇文拓** | 宫廷 | **皇后娘娘分支选择** | 三皇子（主线男主）|
| **幕风公子** | 秋风翠黄 | **赵公子分支选择** | 草原骑手（隐线男主之一）|
| **王文玉** | 琳琅繁街 | **锦绣坊掌柜分支选择** | 江南才子（隐线男主之一）|

> **加粗**：通过 NPC 分支对话选择触发登场的特殊角色

---

*文档由 CatPaw AI 自动生成 · 皇女成长计划 v2.0*

