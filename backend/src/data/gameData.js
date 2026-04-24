// ==================== 游戏核心数据 ====================

// 年龄成长系统配置
const AGE_CONFIG = {
  startAge: 15,
  endAge: 18,
  ageThresholds: {
    15: { nextAge: 16, requiredTotalSkill: 220, title: "豆蔻年华", desc: "明媚懵懂的少女时光" },
    16: { nextAge: 17, requiredTotalSkill: 380, title: "妙龄佳人", desc: "渐露锋芒的成长岁月" },
    17: { nextAge: 18, requiredTotalSkill: 560, title: "芳华绽放", desc: "命运交汇的花样年华" },
    18: { nextAge: null, requiredTotalSkill: 9999, title: "命运终章", desc: "大结局——皇女凌若雪的传奇人生" },
  },
  ageTitles: {
    15: "将军府千金",
    16: "京城闺秀",
    17: "名满京城",
    18: "凌若雪传奇"
  }
};

// 主角色数据
const heroCharacter = {
  id: "hero",
  name: "凌若雪",
  title: "将军府千金",
  age: 15,
  description: "清纯可爱、温婉可人，将军府的掌上明珠，心地善良、聪慧灵秀",
  avatar: "🌸",
  // 技能值（0-100）
  skills: {
    wildness: 10,       // 野性值 - 骑马、武艺
    vitality: 20,       // 体力值 - 身体素质
    spirit: 15,         // 灵气值 - 自然感悟
    affinity: 25,       // 亲和力 - 与人相处
    charm: 20,           // 魅力值 - 礼仪仪态
    wisdom: 20,         // 才学值 - 琴棋书画
    courage: 15,        // 胆识值 - 勇气魄力
    culinary: 10,       // 厨艺值 - 烹饪技艺
    medical: 5,         // 医术值 - 岐黄之术
    poetry: 20,         // 诗才值 - 诗词歌赋
    music: 15,          // 乐艺值 - 琴瑟笙箫
    painting: 10,       // 画艺值 - 丹青妙笔
    reputation: 0,      // 声望值 - 社会名望（参与宫廷/公开活动积累）
    rhetoric: 0,        // 口才值 - 言辞技巧（街头卖艺/算命/辩论积累）
    statecraft: 0,      // 政治值 - 治国谋略（宫廷学习/权臣互动积累）
    martial: 0,         // 武术值 - 拳脚功夫（武术训练/战斗积累）
    command: 0,         // 统帅值 - 指挥才能（军营/狩猎领队积累）
    morality: 20,       // 道德值 - 品行操守（善举/助人积累，不良行为降低）
    arithmetic: 0,      // 算数值 - 数术计算（珠算/天文积累）
    crafting: 0,        // 手工值 - 制作技艺（陶瓷/锻造/木工积累）
  },

  // 当前装扮
  currentOutfit: {
    dress: "outfit_04",
    accessory: "jade_hairpin",
    shoes: "embroidered_shoes",
  },

  // 货币
  gold: 300,
  jade: 10,

  // 等级
  level: 1,
  exp: 0,

  // 好感度（对各NPC）
  favorability: {
    bestFriend: 50,
    father: 80,
    guard: 30,
    innkeeper: 40,
  },

  // 活动计数（用于结局判定）
  activityCounts: {
    hunting: 0,         // 狩猎次数（护国女将/万兽之王）
    herb_picking: 0,    // 采药次数（悬壶济世）
    treat_patient: 0,   // 治病次数（悬壶济世）
    performance: 0,     // 表演/卖艺次数（梨园大家/大明第一忽悠）
    court_activity: 0,  // 宫廷活动次数（母仪天下/一代女相）
    labor_total: 0,     // 劳动总次数（积劳成疾）
    sleep_count: 0,     // 睡觉/发呆次数（咸鱼本鱼）
    animal_care: 0,     // 喂养动物次数（万兽之王）
    fortune_telling: 0, // 算命/占卜次数（大明第一忽悠/觉醒NPC）
    mining: 0,          // 挖矿/采集次数（升外星）
    workshop: 0,        // 手工制作次数（升外星）
    sky_gazing: 0,      // 观星次数（觉醒NPC/升外星）
    combat_won: 0,      // 战斗胜利次数（护国女将）
    human_reject: 0,    // 拒绝人类NPC邀约次数（万兽之王）
  },

  // 特殊事件标记（用于结局判定）
  eventFlags: {
    npc_death_witnessed: false,   // 目睹重要NPC死亡（遁入空门触发条件）
    border_merit: false,          // 边关立功（护国女将）
    fourth_wall_broken: false,    // 第四面墙破碎（觉醒NPC）
    rocket_parts_collected: 0,    // 收集的火箭零件数（升外星，需要5件）
    human_npc_all_rejected: false,// 拒绝所有人类NPC（万兽之王）
  }
};

// 衣橱数据
const wardrobe = {
  dresses: [
    // ========== 初始服装（无需条件） ==========
    {
      id: "outfit_04",
      name: "粉黛罗裙",
      subtitle: "初始服装",
      season: "spring",
      description: "轻盈粉嫩，如春日桃花，罗裙飘飘，温婉动人，配以碧玉簪与南珠耳环，清雅脱俗",
      color: "#FFB7C5",
      rarity: "common",
      unlocked: true,
      bonus: { charm: 5, affinity: 3 },
      emoji: "🌸",
      image: "/assets/outfits/outfit_04.png"
    },
    {
      id: "outfit_06",
      name: "秋水长裙",
      subtitle: "初始可换服装",
      season: "autumn",
      description: "如秋水般澄澈，淡雅素净，举手投足间自有风韵，配以金凤冠更显华贵",
      color: "#87CEEB",
      rarity: "uncommon",
      unlocked: true,
      bonus: { wisdom: 4, charm: 5 },
      emoji: "🌊",
      image: "/assets/outfits/outfit_06.png"
    },
    // ========== 16岁自动解锁 ==========
    {
      id: "age15_dress1",
      name: "粉黛玉玺",
      subtitle: "16岁·自动解锁",
      ageRequired: 16,
      season: "spring",
      description: "少女最初的粉嫩，如含苞待放的桃花，罗裳轻盈飘逸，初入京城的青涩与灵动",
      color: "#FFB7C5",
      rarity: "uncommon",
      unlocked: false,
      bonus: { charm: 5, affinity: 4 },
      emoji: "🌸",
      image: "/assets/character/outfits/age15_dress1.png"
    },
    {
      id: "age15_dress3",
      name: "绿香书阁",
      subtitle: "16岁·自动解锁",
      ageRequired: 16,
      season: "summer",
      description: "书香墨香与草木清香共织，碧绿如翠，适合流连于书画院与课堂的才女初装",
      color: "#27AE60",
      rarity: "uncommon",
      unlocked: false,
      bonus: { wisdom: 6, poetry: 4 },
      emoji: "📗",
      image: "/assets/character/outfits/age15_dress3.png"
    },
    // ========== 16岁·300金购买 ==========
    {
      id: "age16_dress3",
      name: "蓝庭梅香",
      subtitle: "16岁·300金购买",
      ageRequired: 16,
      purchasePrice: 300,
      season: "winter",
      description: "蓝色庭院中傲雪梅香，清冷而高洁，随寒风而来的坚韧与从容，尽显成熟魅力",
      color: "#2980B9",
      rarity: "rare",
      unlocked: false,
      bonus: { wisdom: 8, courage: 5 },
      emoji: "💙",
      image: "/assets/character/outfits/age16_dress3.png"
    },
    {
      id: "age16_dress2",
      name: "莲玉丹红",
      subtitle: "16岁·300金购买",
      ageRequired: 16,
      purchasePrice: 300,
      season: "summer",
      description: "淡雅莲花与丹红点缀，出淤泥而不染，品格高洁，亭亭玉立如出水芙蓉",
      color: "#E91E8C",
      rarity: "rare",
      unlocked: false,
      bonus: { spirit: 7, charm: 6 },
      emoji: "🌺",
      image: "/assets/character/outfits/age16_dress2.png"
    },
    // ========== 17岁自动解锁 ==========
    {
      id: "age15_dress2",
      name: "紫魅风云",
      subtitle: "17岁·自动解锁",
      ageRequired: 17,
      season: "autumn",
      description: "神秘紫色如暮霭，飘逸若云端，少女的慧黠与灵气跃然其中",
      color: "#9B59B6",
      rarity: "uncommon",
      unlocked: false,
      bonus: { spirit: 5, wisdom: 4 },
      emoji: "💜",
      image: "/assets/character/outfits/age15_dress2.png"
    },
    {
      id: "age16_dress1",
      name: "红玉清峦",
      subtitle: "17岁·自动解锁",
      ageRequired: 17,
      season: "autumn",
      description: "朱红如山间枫叶，华贵端庄，随年岁增长而渐显风华，气质脱俗令人心折",
      color: "#E74C3C",
      rarity: "rare",
      unlocked: false,
      bonus: { charm: 8, affinity: 5 },
      emoji: "🔴",
      image: "/assets/character/outfits/age16_dress1.png"
    },
    // ========== 17岁·400金购买 ==========
    {
      id: "age17_dress1",
      name: "兰玉竹随",
      subtitle: "17岁·400金购买",
      ageRequired: 17,
      purchasePrice: 400,
      season: "spring",
      description: "兰香清幽，玉质温润，竹节刚直，集幽雅与坚韧于一身，是芳华盛放时最美的见证",
      color: "#8E44AD",
      rarity: "epic",
      unlocked: false,
      bonus: { charm: 10, wisdom: 8, spirit: 6 },
      emoji: "🌿",
      image: "/assets/character/outfits/age17_dress1.png"
    },
    {
      id: "age17_dress2",
      name: "粉翠萝雀",
      subtitle: "17岁·400金购买",
      ageRequired: 17,
      purchasePrice: 400,
      season: "spring",
      description: "粉翠相映，萝蔓轻绕，彩雀飞翔其间，命运的羽翼已然张开，这是最灿烂的年华",
      color: "#FF6B9D",
      rarity: "epic",
      unlocked: false,
      bonus: { charm: 12, affinity: 8, courage: 5 },
      emoji: "🌸",
      image: "/assets/character/outfits/age17_dress2.png"
    },
  ],

  // 配饰（保留原有，用于文字说明）
  accessories: [
    {
      id: "jade_hairpin",
      name: "碧玉簪",
      type: "hairpin",
      description: "温润碧玉制成，简约而不简单，清雅脱俗",
      rarity: "common",
      unlocked: true,
      bonus: { charm: 3 },
      emoji: "💚",
      image: "/assets/accessories/jade_hairpin.png"
    },
    {
      id: "gold_phoenix_crown",
      name: "金凤冠",
      type: "hairpin",
      description: "纯金打造凤凰冠，镶嵌红宝石，富丽堂皇，贵气十足",
      rarity: "legendary",
      unlocked: false,
      bonus: { charm: 12, affinity: 5 },
      emoji: "👑",
      image: "/assets/accessories/gold_phoenix_crown.png"
    },
    {
      id: "pearl_earrings",
      name: "南珠耳环",
      type: "earring",
      description: "南海珍珠制成，圆润光泽，点缀耳侧，灵动可爱",
      rarity: "rare",
      unlocked: true,
      bonus: { charm: 5, affinity: 3 },
      emoji: "🔮",
      image: "/assets/accessories/pearl_earrings.png"
    },
    {
      id: "jade_bracelet",
      name: "翡翠手镯",
      type: "bracelet",
      description: "通透翡翠，碧绿如春水，戴上如仙女下凡",
      rarity: "rare",
      unlocked: false,
      bonus: { spirit: 5, charm: 4 },
      emoji: "💎",
      image: "/assets/accessories/jade_bracelet.png"
    }
  ],

  shoes: [
    {
      id: "embroidered_shoes",
      name: "绣花鞋",
      description: "手工绣花布鞋，精巧细腻，步步生莲",
      rarity: "common",
      unlocked: true,
      bonus: { charm: 2 },
      emoji: "👟"
    }
  ]
};

// 场景数据
// bgImage: img_2裁剪的纯背景图（无人物），用于场景选择预览
// activeImage: img_3裁剪的活动场景图（含人物），用于进入活动时展示
// npcPositions: NPC在activeImage中的相对坐标百分比（left%, top%），用于渲染可点击气泡
const scenes = [
  {
    id: "bedroom",
    name: "锦绣阁",
    description: "雕梁画栋的绣阁闺房，雕花窗棂透入暖光，绣着鸳鸯的彩帷轻拂，梳妆台上胭脂水粉琳琅满目，一室芬芳馥郁",
    bgColor: "from-pink-100 to-rose-200",
    bgEmoji: "🏮",
    bgImage: "/assets/scenes/bedroom_new.jpg",
    activeImage: "/assets/scenes_active/bedroom_new.jpg",
    ambience: "温馨私密",
    availableActivities: ["dressing", "reading", "painting", "music_practice"],
    npcs: ["bedroom_maid"],
    npcPositions: {
      bedroom_maid: { left: 22, top: 55 }
    },
    entryBonus: { charm: 1 },
    unlocked: true,
    icon: "🪟"
  },
  {
    id: "ancient_street",
    name: "琳琅繁街",
    description: "熙熙攘攘的吉祥街市，玉楼朱影，摊贩叫卖声此起彼伏，各色人等川流不息，烟火气息盛世繁华流光溢彩",
    bgColor: "from-yellow-100 to-amber-200",
    bgEmoji: "🏪",
    bgImage: "/assets/scenes/street_new.jpg",
    activeImage: "/assets/scenes_active/street_new.jpg",
    ambience: "热闹喧嚣",
    availableActivities: ["shopping", "explore", "social"],
    npcs: ["street_cloth", "street_candy"],
    npcPositions: {
      street_cloth:  { left: 27.5, top: 52.5 },
      street_candy:  { left: 92.5, top: 57.5 }
    },
    entryBonus: { rhetoric: 1, charm: 1 },
    unlocked: true,
    icon: "🏪"
  },
  {
    id: "inn",
    name: "悦来居栈",
    description: "灯笼高挂的悦来居栈，楼宇轩昂宽敞，掌柜热情迎宾，觥筹交错间江湖百态尽收眼底",
    bgColor: "from-orange-100 to-amber-300",
    bgEmoji: "🍶",
    bgImage: "/assets/scenes/inn_new.jpg",
    activeImage: "/assets/scenes_active/inn_new.jpg",
    ambience: "温馨热络",
    availableActivities: ["eat", "listen_to_stories", "culinary_lesson"],
    npcs: ["inn_keeper", "inn_father_friend"],
    npcPositions: {
      inn_keeper:        { left: 62.5, top: 52.5 },
      inn_father_friend: { left: 42.5, top: 62.5 }
    },
    entryBonus: { spirit: 1, wisdom: 1 },
    unlocked: true,
    icon: "🏠"
  },
  {
    id: "royal_court",
    name: "宫廷",
    description: "金碧辉煌的皇宫，朱红宫墙，琉璃瓦顶，威严庄重，令人心生敬畏",
    bgColor: "from-yellow-200 to-gold-300",
    bgEmoji: "🏛️",
    bgImage: "/assets/scenes/royal_court.jpg",
    activeImage: "/assets/scenes_active/royal_court.jpg",
    ambience: "威严华贵",
    availableActivities: ["audience", "court_dance", "poetry_contest"],
    npcs: ["royal_official", "royal_guard_captain", "royal_lady"],
    npcPositions: {
      royal_lady:          { left: 12.5, top: 82.5 },
      royal_official:      { left: 37.5, top: 82.5 },
      royal_guard_captain: { left: 47.5, top: 67.5 },
    },
    entryBonus: { reputation: 1, morality: 1 },
    unlocked: true,
    requiredCharm: 0,
    icon: "🏛️"
  },
  {
    id: "grassland",
    name: "秋风翠黄",
    description: "天高气爽的广袤原野，风吹草低，野花逢香，骏马驰骋的自由天地恰似一幅气韵磅礴的画卷",
    bgColor: "from-green-200 to-emerald-400",
    bgEmoji: "🌿",
    bgImage: "/assets/scenes/outdoor.jpg",
    activeImage: "/assets/scenes_active/outdoor.jpg",
    ambience: "自由灵动",
    availableActivities: ["nature_study", "herb_picking", "sky_gazing"],
    npcs: ["outdoor_son"],
    npcPositions: {
      outdoor_son: { left: 57.5, top: 62.5 }
    },
    entryBonus: { wildness: 1, courage: 1 },
    unlocked: true,
    icon: "🌾"
  },
  {
    id: "etiquette_hall",
    name: "礼仪学院",
    description: "丝竹悠扬的古典舞坊，宫廷舞师倾情传授，水袖翩翩、步步生莲，在音乐中感受东方韵律之美",
    bgColor: "from-pink-200 to-fuchsia-200",
    bgEmoji: "💃",
    bgImage: "/assets/scenes/classroom.jpg",
    activeImage: "/assets/scenes_active/classroom.jpg",
    ambience: "丝竹悠扬",
    availableActivities: ["dance_class", "tea_ceremony", "flower_arrangement"],
    npcs: ["class_teacher", "class_student"],
    npcPositions: {
      class_teacher: { left: 77.5, top: 32.5 },
      class_student: { left: 42.5, top: 52.5 }
    },
    entryBonus: { music: 1, charm: 1 },
    unlocked: true,
    icon: "💃"
  },
  {
    id: "medicine_hall",
    name: "百草堂",
    description: "药香弥漫的百年老店，秘制草药悬架晾晒，各屉药柜平排整列，老大夫妙手仁心，悬壶济世德高望重",
    bgColor: "from-teal-100 to-cyan-200",
    bgEmoji: "🌿",
    bgImage: "/assets/scenes/medicine_hall_new.jpg",
    activeImage: "/assets/scenes_active/medicine_hall_new.jpg",
    ambience: "药香静谧",
    availableActivities: ["learn_medicine", "herb_study", "treat_patient"],
    npcs: ["med_doctor"],
    npcPositions: {
      med_doctor: { left: 37.5, top: 42.5 }
    },
    entryBonus: { medical: 1, morality: 1 },
    unlocked: true,
    icon: "⚕️"
  },
  {
    id: "art_studio",
    name: "翰墨丹青苑",
    description: "墨香四溢的丹青雅苑，历代名家字画装饰四壁，挥毫泼墨间气韵天成，翰墨流香陶冶情操",
    bgColor: "from-stone-100 to-slate-200",
    bgEmoji: "🖌️",
    bgImage: "/assets/scenes/art_studio_new.jpg",
    activeImage: "/assets/scenes_active/art_studio_new.jpg",
    ambience: "文雅书香",
    availableActivities: ["calligraphy", "ink_painting", "poetry_creation"],
    npcs: ["art_master", "art_friend", "art_prince"],
    npcPositions: {
      art_master:  { left: 32.5, top: 47.5 },
      art_friend:  { left: 42.5, top: 72.5 },
      art_prince:  { left: 72.5, top: 62.5 }
    },
    entryBonus: { painting: 1, wisdom: 1 },
    unlocked: true,
    icon: "🎨"
  },
  {
    id: "desert_oasis",
    name: "呜沙沟",
    description: "黄沙漫漫的神秘峡谷，风过沙鸣如泣如诉，绿洲深处藏着古老的商队驿站，异域风情与中原文化在此交汇，传说中有一位神秘的沙漠游侠常年驻守于此",
    bgColor: "from-yellow-200 to-orange-300",
    bgEmoji: "🏜️",
    bgImage: "/assets/scenes/desert_oasis.jpg",
    activeImage: "/assets/scenes_active/desert_oasis.jpg",
    ambience: "神秘苍凉",
    availableActivities: ["desert_explore", "camel_ride", "star_watch"],
    npcs: ["desert_friend"],
    npcPositions: {
      desert_friend: { left: 55, top: 58 }
    },
    entryBonus: { courage: 1, spirit: 1 },
    unlocked: true,
    icon: "🏜️"
  }
];

// NPC数据（每个场景专属人物，含头像路径）
const npcs = {

  // ───── 客栈专属 NPC ─────
  inn_keeper: {
    id: "inn_keeper",
    name: "王掌柜",
    role: "悦来客栈掌柜",
    description: "笑容满面的胖掌柜，消息灵通，最爱给客人讲各地奇闻，热情好客",
    emoji: "🧑‍🍳",
    avatar: "/assets/npc_avatars/inn_keeper.png",
    dialogueSets: [
      {
        dialogues: [
          "哎呦，凌小姐大驾光临！今日蓬荜生辉，快里边请，上等客房已给您留着呢！",
          "掌柜我消息灵通，小姐若想挣些金币，不如去古街摆摊或者找个劳工活计，勤快些一个月能攒不少呢！"
        ]
      },
      {
        dialogues: [
          "小姐来得巧，今日新到了一批西湖龙井，泡出来清香扑鼻，要不要来一壶？",
          "对了，我听说古街那边的锦绣坊最近进了一批好料子，小姐若要添置新衣，趁早去看看，去晚了就被抢光了！"
        ]
      },
      {
        dialogues: [
          "这客栈里卧虎藏龙，小姐若有空，掌柜我给您细细说说那些奇人异事！",
          "听说皇宫那边最近热闹，常去宫廷走动的姑娘，声望见涨，城里人都在说呢！"
        ]
      },
      {
        dialogues: [
          "小姐，最近草原那边有位幕风公子，据说骑术一流，许多大户人家的公子都慕名拜师呢！",
          "掌柜我觉得，小姐不妨去户外走走，骑骑马、练练武，体力好了什么都好说！"
        ]
      },
      {
        dialogues: [
          "说起来，前几日您父亲的旧友赵老爷也在此落脚，留了话说若见到小姐，请小姐务必留步。",
          "赵老爷说，他儿子最近在户外草原混得风生水起，小姐若感兴趣，去草原走走说不定有意外收获！"
        ]
      },
      // 有了解王文玉后，掌柜会提起
      {
        condition: { minFav: { wangwenyu: 20 } },
        dialogues: [
          "哟，凌小姐，听说您和古街那位王文玉公子走得挺近？他可是出了名的眼光高，能入他眼的姑娘少之又少！",
          "王公子上次在我这里订了个雅间，说要请一位特别的朋友，掌柜我猜……八成就是您了！"
        ]
      },
      {
        condition: { minFav: { wangwenyu: 60 }, minVisits: { wangwenyu: 3 } },
        dialogues: [
          "凌小姐，您和王文玉公子的事，城里都传开了！说是才子佳人，天作之合！",
          "掌柜我见过不少人，王公子对您的心思是真的，小姐可要好好珍惜啊！"
        ]
      },
    ],
    location: ["inn"]
  },
  inn_father_friend: {
    id: "inn_father_friend",
    name: "赵伯伯",
    role: "父亲的旧友",
    description: "父亲昔日同窗好友，如今是邻城的富商，为人豪爽仗义，常来此地做生意",
    emoji: "👨‍💼",
    avatar: "/assets/npc_avatars/inn_father_friend.png",
    dialogueSets: [
      {
        dialogues: [
          "若雪丫头！真的是你！长这么大了，跟你父亲年轻时简直一个模子！",
          "你父亲上次来信还说，你最近礼仪课学得极好，让我见到你替他好好夸夸你！"
        ]
      },
      {
        dialogues: [
          "我这趟来，顺便给你带了些南边的特产，你父亲最爱的那种桂花糕，你也尝尝？",
          "伯伯做生意这么多年，有一条经验：多去宫廷走动，结交贵人，声望上来了，什么都好办！"
        ]
      },
      {
        dialogues: [
          "我那犬子顽劣，比起你差远了，他最近在草原跟幕风公子学骑术，改天让他带你去草原转转！",
          "若雪，草原那边空气好、风景美，去走走对身体也有好处，体力好了精神头足！"
        ]
      },
      {
        dialogues: [
          "若雪，有什么为难的事尽管找伯伯，你父亲的事就是我的事，别客气！",
          "对了，古街那边最近有几家铺子在招劳工，活不重，工钱还不少，你若手头紧，不妨去问问！"
        ]
      },
      // 赵伯伯会随着若雪与各NPC的关系变化而提及
      {
        condition: { minFav: { mufengongzi: 20 } },
        dialogues: [
          "我听我那犬子说，您和幕风公子见过面？那小子武艺高强，性子却不错，是个可以深交的朋友！",
          "幕风公子走南闯北，见识广博，若雪你和他多来往，眼界也会开阔不少！"
        ]
      },
      {
        condition: { minFav: { mufengongzi: 60 }, minVisits: { mufengongzi: 3 } },
        dialogues: [
          "哈哈，若雪啊，你和幕风公子的事，我那犬子都告诉我了！伯伯替你高兴！",
          "幕风公子是个重情义的人，跟着他，你不会吃亏的。伯伯给你们做个见证！"
        ]
      },
    ],
    location: ["inn"]
  },

  // ───── 古代街道专属 NPC ─────
  street_cloth: {
    id: "street_cloth",
    name: "锦绣坊掌柜",
    role: "卖绸缎的",
    description: "经营绸缎布匹多年的老掌柜，货色齐全，专为城中大户人家供货，见多识广",
    emoji: "🧵",
    avatar: "/assets/npc_avatars/street_cloth.png",
    dialogues: [
      "哎哟，凌小姐来了！今儿刚到了一批蜀锦，花样是最新的宫廷纹，快来瞧瞧！",
      "这匹缎子是从杭州运来的，绣娘们都说好，您摸摸这手感，滑不滑？"
    ],
    dialogueWithChoice: {
      text: "对了，王文玉公子也在街上，他新配置了一套上等的妆容水粉。要不要我替您引荐一下？听说他对闺秀的眼光特别独到。",
      choices: [
        {
          id: "meet_wangwenyu",
          text: "有劳掌柜引荐",
          consequence: {
            type: "scene_character",
            npcId: "wangwenyu",
            npcName: "王文玉",
            scene: "ancient_street",
            characterImage: "/assets/character/outfits/npc_wangwenyu.png",
            characterCells: [15, 16, 25, 26],
            storyStages: [
              // 第1阶段：初次相识（第1次）
              {
                minVisit: 1, maxVisit: 1,
                subSceneDialogues: [
                  { text: "王文玉（转身微笑）：'久闻凌小姐大名，今日得幸相识，果然名不虚传。我刚从江南带回新款的花粉，特别适合您这样肤色的佳人。'", image: "/assets/character/outfits/npc_wangwenyu_s1.png" },
                  { text: "王文玉（轻轻拿起一支玉簪）：'这支簪子是我亲手挑选的，您瞧这雕工，是不是与您气质极为相符？'", image: "/assets/character/outfits/npc_wangwenyu_s1.png" }
                ],
                subSceneChoices: {
                  text: "王文玉（忽然伸出手，语气温柔中带着几分大胆）：'凌小姐，不知你可愿随我去前面的茶馆坐坐？'",
                  options: [
                    {
                      id: "ww_a", label: "A", text: "婉言谢绝，转身离开",
                      responseDialogue: "王文玉（微微一怔，随即笑着收回手）：'无妨，凌小姐若有空，随时欢迎。'他的眼神里藏着一丝说不清的遗憾。"
                    },
                    {
                      id: "ww_b", label: "B", text: "驻足不动，微微摇头",
                      responseDialogue: "王文玉（轻叹一声，语气温柔）：'看来今日缘分未到。'他将那支玉簪轻轻放回原处，'下次再见，我还在这里。'"
                    },
                    {
                      id: "ww_c", label: "C", text: "点头应允，随他而去",
                      giftItem: { id: "jade_hairpin", name: "白玉簪", emoji: "📍", category: "妆饰",
                        description: "王文玉从江南带回的精致白玉发簪，雕工精美，玉质温润。",
                        effect: { charm: 3 }, rarity: "uncommon" },
                      responseDialogue: "王文玉（眼中闪过一丝惊喜，随即恢复从容）：'凌小姐果然爽快。'他将那支白玉簪轻轻递来，'这个，算是今日相识的礼物。'",
                      followUpDialogues: [
                        "茶馆里，他为你斟了一杯碧螺春，说起江南的风物，声音低沉而温柔。窗外街市喧嚣，这一隅却像另一个世界。",
                        "王文玉（忽然停下，侧头看你）：'凌小姐，你笑起来……比我见过的江南春色还要好看。'他说完，自己先别开了眼。"
                      ]
                    },
                    {
                      id: "ww_d", label: "D", text: "红着脸低声道：'……好。'",
                      giftItem: { id: "jade_hairpin", name: "白玉簪", emoji: "📍", category: "妆饰",
                        description: "王文玉从江南带回的精致白玉发簪，雕工精美，玉质温润。",
                        effect: { charm: 3 }, rarity: "uncommon" },
                      responseDialogue: "王文玉（愣了一瞬，随即笑意漫上眼角）：'好。'他轻声重复了一遍你的话，将白玉簪递到你手边，'拿着，算是我欠你的见面礼。'",
                      followUpDialogues: [
                        "茶馆里，他没有说太多话，只是安静地陪着你。偶尔你抬头，正好撞上他的目光——他也没有回避。",
                        "王文玉（临别时，在门口停步）：'凌小姐，我还会在这条街上。若是哪天想喝茶……'他顿了顿，'来找我就好。'"
                      ]
                    }
                  ]
                }
              },
              // 第2阶段：渐生情愫（第2-4次）
              {
                minVisit: 2, maxVisit: 4,
                subSceneDialogues: [
                  { text: "王文玉（眼中闪过一丝惊喜）：'凌小姐，没想到这么快又见到你。我还以为你不会再来了。'", image: "/assets/character/outfits/npc_wangwenyu_s2.png" },
                  { text: "王文玉（低声，语气比上次亲近了几分）：'我最近一直在想，上次你离开时的眼神……说不清，但我觉得，你心里也有些什么。'", image: "/assets/character/outfits/npc_wangwenyu_s2.png" }
                ],
                dialogueVariants: [
                  // visit 2：上次刚认识，提起上次的选择
                  [
                    { text: "王文玉（见你走来，眼中闪过一丝惊喜，随即收敛成从容的笑）：'凌小姐，没想到这么快又见到你。上次你「[[lastChoice]]」……我想了很久。'", image: "/assets/character/outfits/npc_wangwenyu_s2.png" },
                    { text: "王文玉（低声，语气比上次亲近了几分）：'说实话，我以为你不会再来了。但你来了，我很高兴。'", image: "/assets/character/outfits/npc_wangwenyu_s2.png" }
                  ],
                  // visit 3：已经有了一定默契
                  [
                    { text: "王文玉（远远看见你，停下脚步等你走近，嘴角带着淡淡的笑）：'又来了。'他说得很自然，像是早就知道你会来。", image: "/assets/character/outfits/npc_wangwenyu_s2.png" },
                    { text: "王文玉（轻声）：'上次你「[[lastChoice]]」——我一直记着。你知道吗，我在江南做生意那么多年，从来没有人让我这样在意过一句话。'", image: "/assets/character/outfits/npc_wangwenyu_s2.png" }
                  ],
                  // visit 4：情感已经明显加深
                  [
                    { text: "王文玉（见你推开铺子的门，放下手里的账册，眼神直接落在你身上）：'我就知道你今天会来。'他说完自己也笑了，'说出来有点奇怪，但我就是知道。'", image: "/assets/character/outfits/npc_wangwenyu_s2.png" },
                    { text: "王文玉（走近一步，声音放低）：'上次你「[[lastChoice]]」，那之后我想了很多……若雪，你对我来说，已经不只是一个过客了。'", image: "/assets/character/outfits/npc_wangwenyu_s2.png" }
                  ]
                ],
                subSceneChoices: {
                  text: "王文玉从袖中取出一封信，递到你面前，字迹工整，墨香犹在：'这是我昨夜写的，本不打算给你……但还是想让你看看。'",
                  options: [
                    {
                      id: "ww2_a", label: "A", text: "将信推回：'此事不妥，请收回。'",
                      responseDialogue: "王文玉（沉默片刻，收回信，神情平静）：'是我唐突了。'他低头将信折好，重新藏入袖中，却没有再说什么。"
                    },
                    {
                      id: "ww2_b", label: "B", text: "犹豫片刻，没有接也没有拒绝",
                      responseDialogue: "王文玉（看着你，轻轻笑了）：'不接也不拒……你这人，真是让我猜不透。'他将信收回，'那就先放着，等你想看的时候，再来找我。'"
                    },
                    {
                      id: "ww2_c", label: "C", text: "接过信，轻轻打开来看",
                      giftItem: { id: "ww_letter", name: "王文玉手书", emoji: "📜", category: "信物",
                        description: "王文玉亲笔手书，字里行间藏着说不出口的情意。",
                        effect: { charm: 2, affinity: 2 }, rarity: "rare" },
                      responseDialogue: "王文玉（屏住呼吸，看着你展开信笺，眼神里有一丝紧张）：'……写得不好，你别笑话我。'他难得地低下头，耳根有些红。",
                      followUpDialogues: [
                        "信上只有寥寥数行，却字字斟酌。他写：'凌小姐，我不善言辞，但有些话不说出来，我怕会后悔。'",
                        "王文玉（等你看完，轻声问）：'你……觉得如何？'他的声音比平时低了许多，像是真的在等一个答案。"
                      ]
                    },
                    {
                      id: "ww2_d", label: "D", text: "微笑着接过，轻声说：'谢谢你告诉我。'",
                      giftItem: { id: "ww_letter", name: "王文玉手书", emoji: "📜", category: "信物",
                        description: "王文玉亲笔手书，字里行间藏着说不出口的情意。",
                        effect: { charm: 2, affinity: 2 }, rarity: "rare" },
                      responseDialogue: "王文玉（怔了一下，随即眼角漫出笑意）：'是我该谢谢你，愿意听。'他的声音里有什么松动了，像是一直绷着的弦，终于稍稍松了松。",
                      followUpDialogues: [
                        "信上写着他走南闯北见过的风景，最后一句是：'但我最想带你去看的，是江南三月的烟雨。'",
                        "王文玉（抬头，直视你的眼睛）：'若雪，我说的是真的。'这是他第一次直呼你的名字，声音很轻，却清晰得让人心跳。"
                      ]
                    }
                  ]
                }
              },
              // 第3阶段：情定（第5次，最后一次）
              {
                minVisit: 5, maxVisit: 5,
                subSceneDialogues: [
                  { text: "王文玉（停下脚步，转身直视你，眼神前所未有的认真）：'若雪，我走南闯北见过许多人，但从未有人让我如此放不下。上次你「[[lastChoice]]」——那之后，我就知道，这是最后一次机会了。'", image: "/assets/character/outfits/npc_wangwenyu_s3.png" },
                  { text: "王文玉（轻轻握住你的手，声音低沉）：'我不是在说笑，也不是一时冲动。我想……陪你走很长很长的路。'", image: "/assets/character/outfits/npc_wangwenyu_s4.png" }
                ],
                subSceneChoices: {
                  text: "王文玉从怀中取出一枚精致的玉佩，那是他随身多年的护身符：'这是我母亲留给我的，我想把它交给最重要的人。'",
                  options: [
                    {
                      id: "ww3_a", label: "A", text: "轻轻摇头：'我还没准备好。'",
                      responseDialogue: "王文玉（静静看着你，没有失落，只是轻轻点头）：'没关系，我等你。'他将玉佩重新握入掌心，'什么时候准备好了，我还在。'"
                    },
                    {
                      id: "ww3_b", label: "B", text: "低头沉默，久久说不出话",
                      responseDialogue: "王文玉（没有催促，就那样陪着你沉默）：'不用说话。'他轻声道，'我能感觉到。'"
                    },
                    {
                      id: "ww3_c", label: "C", text: "双手接过，眼眶微微泛红",
                      giftItem: { id: "ww_jade", name: "王文玉传家玉佩", emoji: "🏵️", category: "信物",
                        description: "王文玉母亲留下的传家玉佩，温润如水，承载着他最深的情意。",
                        effect: { charm: 5, affinity: 4, spirit: 2 }, rarity: "epic" },
                      responseDialogue: "王文玉（看着玉佩落入你手中，深吸一口气，眼神前所未有地温柔）：'若雪……谢谢你。'他的声音有些哽，却是笑着的。",
                      followUpDialogues: [
                        "玉佩温润，像是还带着他的体温。他说，这块玉跟了他二十年，走遍了大江南北，却从未离开过他的身边。",
                        "王文玉（握住你捧着玉佩的双手，低声）：'从今往后，我走到哪里，都会带着你一起。'街市的喧嚣仿佛远去，只剩这一句话，落在心上。"
                      ]
                    },
                    {
                      id: "ww3_d", label: "D", text: "伸手握住他的手，连同玉佩一起",
                      giftItem: { id: "ww_jade", name: "王文玉传家玉佩", emoji: "🏵️", category: "信物",
                        description: "王文玉母亲留下的传家玉佩，温润如水，承载着他最深的情意。",
                        effect: { charm: 5, affinity: 4, spirit: 2 }, rarity: "epic" },
                      responseDialogue: "王文玉（怔了一瞬，随即反握住你的手，力道轻却坚定）：'……好。'他只说了这一个字，却像是承诺了什么很重的事情。",
                      followUpDialogues: [
                        "他没有松开手，就那样站在古街上，任人来人往。你们谁都没有说话，但什么都不需要再说了。",
                        "王文玉（最后，轻轻松开手，眼中带笑）：'若雪，我会回来的。无论去哪里，我都会回来。'这句话，你记了很久很久。"
                      ]
                    }
                  ]
                }
              }
            ],
            storyNode: "meet_wangwenyu",
            reward: { favorability: "wangwenyu", value: 12 }
          }
        },
        {
          id: "decline_meet_wangwenyu",
          text: "不必了，先看看您这儿的布料",
          consequence: {
            type: "dialogue",
            nextDialogue: "掌柜笑着点头：'好的，小姐您请往里走，我给您仔细讲讲这些新到的料子。'"
          }
        }
      ]
    },
    location: ["ancient_street"]
  },
  street_candy: {
    id: "street_candy",
    name: "糖葫芦阿叔",
    role: "卖糖葫芦的",
    description: "走街串巷的糖葫芦师傅，手艺祖传，糖衣晶莹透亮，是城中孩子们最爱的小贩",
    emoji: "🍡",
    avatar: "/assets/npc_avatars/street_candy.png",
    dialogueSets: [
      {
        dialogues: [
          "糖葫芦咧，冰糖山楂！小姐，来一串尝尝？今儿的山楂特别甜！",
          "阿叔我在这条街摆摊三十年，消息最灵通！听说客栈那边最近来了位神秘商人，带了不少稀罕玩意儿，小姐有空去看看？"
        ]
      },
      {
        dialogues: [
          "我这糖葫芦用的是老方子，冰糖现熬，外脆里酸，一口一个回味！",
          "小姐，我跟您说个秘密——每个月底，古街会有个小集市，各种好东西都拿出来卖，比平时便宜多了，您记得来！"
        ]
      },
      {
        dialogues: [
          "小姐，您买的这串送给谁？哈哈，一看就是心里有人惦记着！",
          "说起来，王文玉公子昨日也来买了一串，说是帮朋友带的……阿叔我看啊，他心里有人！"
        ]
      },
      {
        dialogues: [
          "今日芝麻球也刚出锅，外酥里糯，配着糖葫芦一起买，我给您打个折！",
          "小姐，您若想挣点外快，古街这边摆摊很好做生意，我当年就是靠这个起家的，日积月累，金币不少！"
        ]
      },
      {
        dialogues: [
          "我走这条街三十年了，看着您从小就爱吃糖葫芦，如今长成大姑娘了！",
          "阿叔我见过不少姑娘，但像您这样既有才学又有气度的，真不多见。多去宫廷走走，说不定有大机缘！"
        ]
      },
      // 根据与王文玉的关系
      {
        condition: { minFav: { wangwenyu: 30 } },
        dialogues: [
          "哎呀，凌小姐！王文玉公子刚才还在这里，买了一串糖葫芦，说要留给一位特别的人……",
          "阿叔我活了这么大岁数，一看就知道，王公子对您是真心的！"
        ]
      },
      {
        condition: { minFav: { wangwenyu: 70 }, minVisits: { wangwenyu: 4 } },
        dialogues: [
          "凌小姐，您和王公子的事全街都知道了！阿叔我替您高兴，这叫有情人终成眷属！",
          "王公子昨天还特地来问我，小姐最爱什么口味的糖葫芦……哈哈，这是要讨好您呢！"
        ]
      },
    ],
    location: ["ancient_street"]
  },

  // ───── 宫廷专属 NPC ─────
  // 贴身宫女（位置：3,17）
  royal_lady: {
    id: "royal_lady",
    name: "映月",
    role: "皇上贴身宫女",
    description: "皇上身旁最得宠的贴身宫女，机敏聪慧，深得圣心，消息灵通，偶尔会悄悄透露宫中秘辛",
    emoji: "🌙",
    avatar: "/assets/npc_avatars/royal_lady.png",
    // dialogueSets：每次随机选一套，支持 giftItem 触发道具
    dialogueSets: [
      {
        dialogues: [
          "凌小姐，您今日气色真好，比上回入宫更显几分风华。",
          "皇上今早心情极好，早朝退后还特意问起您的名字呢。"
        ]
      },
      {
        dialogues: [
          "小姐，您来得正巧，皇上刚赏了一盒贡品龙井，奴婢斗胆留了一包，想转赠给您。",
          "这茶是江南进贡，皇上亲口说过'香得很'，您拿去尝尝吧。"
        ],
        dialogueWithChoice: {
          text: "映月从袖中取出一个精致锦盒，微微欠身递来：'小姐若不嫌弃，请笑纳。'",
          choices: [
            {
              id: "accept_tea",
              text: "多谢映月姑娘，若雪心领了",
              consequence: {
                type: "dialogue",
                nextDialogue: "映月莞尔一笑：'小姐客气了，您往后常来宫里走动，奴婢也多个说话的人。'"
              },
              giftItem: {
                id: "longjing_tea",
                name: "贡品龙井",
                emoji: "🍵",
                category: "食物",
                description: "江南进贡的极品龙井，清香悠远，饮后神清气爽，令人心旷神怡。",
                effect: { spirit: 4, wisdom: 2 },
                rarity: "uncommon"
              }
            },
            {
              id: "decline_tea",
              text: "贡品珍贵，若雪不敢擅受",
              consequence: {
                type: "dialogue",
                nextDialogue: "映月轻声道：'小姐心思缜密，奴婢明白了，那便留着下回再说吧。'"
              }
            }
          ]
        }
      },
      {
        dialogues: [
          "小姐，奴婢有句话不知当讲不当讲……",
          "宫里近来有几位贵人对小姐颇为留意，小姐行事还需多加小心，莫要落人口实。"
        ]
      },
      {
        dialogues: [
          "皇上昨日在御花园里驻足良久，说那株白梅让他想起了一个人。",
          "奴婢不敢多问，只是……皇上望向宫门方向时，眼神里有些不一样的东西。"
        ]
      },
      {
        dialogues: [
          "凌小姐，您上次在御前弹的那首曲子，皇上散朝后还哼了几句。",
          "奴婢从未见皇上对哪位小姐如此上心，您可要好好珍惜这份缘分。"
        ],
        dialogueWithChoice: {
          text: "映月从腰间取下一枚精巧的香囊，递到若雪面前：'这是皇上赏给奴婢的，奴婢不敢自留，想着转赠小姐，保个平安。'",
          choices: [
            {
              id: "accept_sachet",
              text: "那便恭敬不如从命，谢谢映月",
              consequence: {
                type: "dialogue",
                nextDialogue: "映月轻声叮嘱：'小姐随身带着，宫里的人见了也会多几分忌惮。'"
              },
              giftItem: {
                id: "royal_sachet",
                name: "御赐香囊",
                emoji: "👜",
                category: "妆饰",
                description: "皇上御赐的宫制香囊，内填名贵香料，随身携带令人神清气定，气度从容。",
                effect: { charm: 5, affinity: 3 },
                rarity: "rare"
              }
            },
            {
              id: "decline_sachet",
              text: "皇上赏赐之物，若雪怎敢收下",
              consequence: {
                type: "dialogue",
                nextDialogue: "映月微微点头：'小姐懂规矩，奴婢明白了，那便收回去吧。'"
              }
            }
          ]
        }
      },
      {
        dialogues: [
          "映月（悄声）：'凌小姐，皇上今日在御花园独自散步，心情似乎不错。'",
          "映月（微笑）：'皇上曾说，宫中能与他谈得来的人太少了。小姐若有意，奴婢可以引荐。'"
        ],
        dialogueWithChoice: {
          text: "映月低声道：'小姐，皇上就在前面不远处，若您想去拜见，奴婢这就带您过去。'",
          choices: [
            {
              id: "visit_emperor",
              text: "有劳映月引荐，若雪愿往",
              consequence: {
                type: "scene_character",
                npcId: "royal_emperor",
                npcName: "皇上",
                scene: "royal_court",
                characterImage: "/assets/npc_avatars/royal_emperor.png",
                characterCells: [13, 14, 23, 24],
                storyStages: [
                  // 第1次：初见
                  {
                    minVisit: 1, maxVisit: 1,
                    subSceneDialogues: [
                      "御花园中，一位身着常服的男子负手而立，望着池中锦鲤出神。映月轻声道：'皇上，凌小姐来了。'",
                      "皇上（转身，目光沉静地打量若雪片刻）：'将军府的女儿？朕听说过你，今日一见，倒比传言更……从容。'"
                    ],
                    subSceneChoices: {
                      text: "皇上（淡淡一笑）：'朕难得出来走走，你若无事，便陪朕在这园中走一段？'",
                      options: [
                        {
                          id: "emp1_a", label: "A", text: "惶恐跪拜：'臣女不敢逾矩，告退。'",
                          responseDialogue: "皇上（微微颔首，目送若雪离去，眼中有一丝不易察觉的惋惜）：'……倒是守礼。'"
                        },
                        {
                          id: "emp1_b", label: "B", text: "垂首肃立，不置可否",
                          responseDialogue: "皇上（看了你片刻，轻声）：'你这人……有意思。'他没有再说什么，转身望向远处的锦鲤。"
                        },
                        {
                          id: "emp1_c", label: "C", text: "从容行礼：'能陪皇上赏花，是若雪的荣幸。'",
                          giftItem: { id: "imperial_osmanthus", name: "御苑桂花枝", emoji: "🌼", category: "信物",
                            description: "皇上亲折的御苑桂花，香气清远，是难得一见的皇恩信物。",
                            effect: { charm: 3, reputation: 4 }, rarity: "rare" },
                          responseDialogue: "皇上（眼中闪过一丝赞许）：'从容，不卑不亢。'他折下一枝桂花递来，'拿着，算是朕的谢礼。'",
                          followUpDialogues: [
                            "园中桂花正盛，他走在前面，偶尔回头说几句。他说话不多，但每一句都像是在试探什么。",
                            "皇上（在园中一处凉亭停下，侧头看你）：'你读过书？'他问，'朕见过太多只会低头的女子，你不同。'"
                          ]
                        },
                        {
                          id: "emp1_d", label: "D", text: "抬眸直视，微笑应道：'皇上相邀，若雪恭敬不如从命。'",
                          giftItem: { id: "imperial_osmanthus", name: "御苑桂花枝", emoji: "🌼", category: "信物",
                            description: "皇上亲折的御苑桂花，香气清远，是难得一见的皇恩信物。",
                            effect: { charm: 3, reputation: 4 }, rarity: "rare" },
                          responseDialogue: "皇上（被你直视，怔了一瞬，随即笑了——那是一种真正的笑，不同于平日的威严）：'好，有胆识。'他折下一枝桂花递来。",
                          followUpDialogues: [
                            "他带你走过御花园最深处的一条小径，说这里平日不许人进来。'今日破例。'他说，没有解释原因。",
                            "皇上（临别时，回头看了你一眼）：'若雪。'他第一次直呼你的名字，'下次进宫，朕还在这里。'"
                          ]
                        }
                      ]
                    }
                  },
                  // 第2次：情深
                  {
                    minVisit: 2, maxVisit: 2,
                    subSceneDialogues: [
                      "皇上（搁下御笔，抬头，见是若雪，眼中有一丝不加掩饰的欣喜）：'你来了。朕昨日还在想，你会不会再来。'",
                      "皇上（起身踱步，语气比上次少了几分帝王威仪）：'上次你「[[lastChoice]]」——朕回去想了很久。朝中大臣说话，十句里有八句是废话。你不同。'"
                    ],
                    subSceneChoices: {
                      text: "皇上（停步，侧目看向若雪）：'朕想听你说说，若你是朕，这江山该如何治？'",
                      options: [
                        {
                          id: "emp2_a", label: "A", text: "惶恐低头：'臣女不敢妄议朝政。'",
                          responseDialogue: "皇上（轻叹）：'又来这句。'他走近一步，'若雪，在朕面前，不必如此。朕问的，是你心里真正的想法。'"
                        },
                        {
                          id: "emp2_b", label: "B", text: "沉默片刻，轻声说：'臣女见识浅薄……'",
                          responseDialogue: "皇上（摇头，带着一点无奈的笑）：'你不浅薄。'他说，'朕见过真正浅薄的人，不是你这样的。'"
                        },
                        {
                          id: "emp2_c", label: "C", text: "从容作答：'若雪以为，治国先治心，民心所向，江山自稳。'",
                          giftItem: { id: "imperial_inkstone", name: "御赐端砚", emoji: "🪨", category: "文房",
                            description: "皇上御案上的端砚，石质细腻，赐予有识之人，寓意器重。",
                            effect: { wisdom: 4, statecraft: 5 }, rarity: "rare" },
                          responseDialogue: "皇上（久久不语，随后点头）：'治国先治心。'他重复了一遍，'朕的太傅说了二十年的治国之道，不如你这一句。'他从案上取下端砚递来。",
                          followUpDialogues: [
                            "他们谈了很久，从治国到民生，从诗书到边境。他说话时眼神专注，像是真的在听，而不是敷衍。",
                            "皇上（最后，低声）：'若雪，朕在宫中，鲜少有人敢说真话。你是第一个。'他顿了顿，'也是朕最想听到真话的那个人。'"
                          ]
                        },
                        {
                          id: "emp2_d", label: "D", text: "直言道：'皇上问得好——百姓饱暖，便是天下太平。'",
                          giftItem: { id: "imperial_inkstone", name: "御赐端砚", emoji: "🪨", category: "文房",
                            description: "皇上御案上的端砚，石质细腻，赐予有识之人，寓意器重。",
                            effect: { wisdom: 4, statecraft: 5 }, rarity: "rare" },
                          responseDialogue: "皇上（愣了一瞬，随即大笑——那是朕真正的笑，不加掩饰）：'百姓饱暖，便是天下太平。好！'他将端砚推到你面前，'这砚台，配得上你这句话。'",
                          followUpDialogues: [
                            "他们谈了很久。他说，登基十年，第一次有人把'百姓'二字放在'江山'之前。",
                            "皇上（临别，望着你的背影，轻声）：'若雪，朕希望……你常来。'这句话，他说得很轻，像是只说给自己听的。"
                          ]
                        }
                      ]
                    }
                  },
                  // 第3次：情定（最后一次，姻缘达成）
                  {
                    minVisit: 3, maxVisit: 3,
                    subSceneDialogues: [
                      "皇上（于御花园梅树下等候，见若雪来，唇角微扬）：'朕今日特意早退了朝，就是想在这里等你。上次你「[[lastChoice]]」——那之后，朕想了很多。'",
                      "皇上（走近，目光深沉而温柔）：'朕见过许多聪慧的女子，但像你这样——既有才学，又有风骨，还不失温柔——朕只见过你一个。'"
                    ],
                    subSceneChoices: {
                      text: "皇上（从袖中取出一枚龙凤玉佩，单膝跪地——这是天子向人低头，千古仅此一次）：'若雪，朕在等你的答案。'",
                      options: [
                        {
                          id: "emp3_a", label: "A", text: "颤声道：'皇上……臣女需要时间想想。'",
                          responseDialogue: "皇上（静静看着你，收回玉佩，站起身）：'朕等。'他只说了两个字，'不管多久，朕都在这里。'"
                        },
                        {
                          id: "emp3_b", label: "B", text: "泪眼朦胧，久久说不出话",
                          responseDialogue: "皇上（没有催促，轻声）：'不用说话。'他把玉佩放在你掌心，'先拿着，什么时候想好了，再来告诉朕。'"
                        },
                        {
                          id: "emp3_c", label: "C", text: "双手接过玉佩，盈盈下拜：'若雪，愿意。'",
                          giftItem: { id: "dragon_phoenix_jade", name: "龙凤定情玉佩", emoji: "💎", category: "信物",
                            description: "皇上亲赐的龙凤玉佩，天子定情之物，世间唯此一枚，象征中宫之位。",
                            effect: { charm: 10, reputation: 10, statecraft: 6, morality: 5, wisdom: 4 }, rarity: "legendary" },
                          responseDialogue: "皇上（听到你说愿意，深吸一口气，站起身，将玉佩亲手戴到你手上）：'好。'他的声音有些哽，'若雪，朕不会让你后悔的。'",
                          followUpDialogues: [
                            "梅花落了几瓣，落在他的肩上，他没有拂去，只是看着你，眼神里有一种前所未有的柔软。",
                            "皇上（最后，轻声）：'若雪，从今往后，这天下，朕与你共治。'这是他能给的，最重的承诺。"
                          ]
                        },
                        {
                          id: "emp3_d", label: "D", text: "俯身将皇上扶起，轻声说：'皇上快起来……若雪答应你。'",
                          giftItem: { id: "dragon_phoenix_jade", name: "龙凤定情玉佩", emoji: "💎", category: "信物",
                            description: "皇上亲赐的龙凤定情玉佩，天子定情之物，世间唯此一枚，象征中宫之位。",
                            effect: { charm: 10, reputation: 10, statecraft: 6, morality: 5, wisdom: 4 }, rarity: "legendary" },
                          responseDialogue: "皇上（被你扶起，握住你的手，低头，声音很轻）：'若雪……谢谢你。'天子说谢谢，这是第一次，也是最后一次。",
                          followUpDialogues: [
                            "他们就那样站在梅树下，谁也没有先松手。御花园里风很轻，梅香很远，这一刻像是停住了。",
                            "皇上（最后抬头，眼神里有一种释然）：'若雪，朕等这一天，等了很久了。'他说，'值得。'"
                          ]
                        }
                      ]
                    }
                  }
                ],
                storyNode: "meet_royal_emperor",
                reward: { favorability: "royal_emperor", value: 15 }
              }
            },
            {
              id: "decline_emperor",
              text: "今日不便打扰皇上，改日再说",
              consequence: {
                type: "dialogue",
                nextDialogue: "映月点头微笑：'小姐说得是，奴婢明白了。'"
              }
            }
          ]
        }
      },
      // 跟进故事版本：根据与皇上的关系深度变化
      {
        condition: { minFav: { royal_emperor: 30 } },
        dialogues: [
          "映月（神情有些复杂）：'凌小姐，皇上昨日又问起您了，说您上次说的那番话，让他想了很久。'",
          "映月（低声）：'奴婢从未见皇上如此……在意一个人。小姐，您可要想清楚，宫里的水深着呢。'"
        ]
      },
      {
        condition: { minFav: { royal_emperor: 50 }, minVisits: { royal_emperor: 2 } },
        dialogues: [
          "映月（悄悄拉住若雪的袖子）：'小姐，皇上今早特地问奴婢，小姐今日可会入宫……'",
          "映月（眼神里带着几分担忧）：'小姐，奴婢斗胆说一句——皇上对您是真心的，但宫里的规矩……您若真有意，才学、礼仪、声望，一样都不能少。'"
        ]
      },
      {
        condition: { minFav: { royal_emperor: 80 }, minVisits: { royal_emperor: 4 } },
        dialogues: [
          "映月（眼眶微红）：'小姐，奴婢替您高兴……皇上昨日召礼部，说要着手准备大婚事宜了。'",
          "映月（轻声）：'奴婢在宫里多年，从未见皇上为一个人如此上心。小姐，您是有大福气的人。'"
        ]
      },
      // 游戏提示类
      {
        dialogues: [
          "映月（凑近低声）：'小姐，奴婢偷偷告诉您——宫廷里常来常往，声望会慢慢积累，将来在京城的地位也会不一样。'",
          "映月（微笑）：'当然，礼仪和才学也要跟上，皇上最欣赏的，是既有才情又知礼数的女子。'"
        ]
      },
      {
        dialogues: [
          "映月（悄声）：'小姐，宫里有个不成文的规矩，每月礼仪院的严夫子会出题考核，答对了有额外奖赏，小姐不妨去试试。'",
          "映月（叮嘱）：'还有，宫廷里的活动若常参与，声望涨得快，将来想做什么都方便许多！'"
        ]
      },
    ],
    // 兼容旧版 dialogues 字段（随机选一套的第一句）
    dialogues: [
      "凌小姐，皇上今日心情极好，您来得正是时候。",
      "小姐气度不凡，奴婢在宫中多年，少见如此出众的姑娘。"
    ],
    dialogueWithChoice: {
      text: "映月低声道：'小姐，皇上就在前面不远处，若您想去拜见，奴婢这就带您过去。'",
      choices: [
        {
          id: "visit_emperor",
          text: "有劳映月引荐，若雪愿往",
          consequence: {
            type: "scene_character",
            npcId: "royal_emperor",
            npcName: "皇上",
            scene: "royal_court",
            characterImage: "/assets/npc_avatars/royal_emperor.png",
            characterCells: [13, 14, 23, 24],
            storyStages: [
              {
                minVisit: 1, maxVisit: 1,
                subSceneDialogues: [
                  "御花园中，一位身着常服的男子负手而立，望着池中锦鲤出神。映月轻声道：'皇上，凌小姐来了。'",
                  "皇上（转身，目光沉静地打量若雪片刻）：'将军府的女儿？朕听说过你，今日一见，倒比传言更……从容。'"
                ],
                subSceneChoices: {
                  text: "皇上（淡淡一笑）：'朕难得出来走走，你若无事，便陪朕在这园中走一段？'",
                  options: [
                    { id: "emp1_a", label: "A", text: "惶恐跪拜：'臣女不敢逾矩，告退。'" },
                    { id: "emp1_b", label: "B", text: "垂首肃立，不置可否" },
                    { id: "emp1_c", label: "C", text: "从容行礼：'能陪皇上赏花，是若雪的荣幸。'" },
                    { id: "emp1_d", label: "D", text: "抬眸直视，微笑应道：'皇上相邀，若雪恭敬不如从命。'" }
                  ]
                }
              },
              {
                minVisit: 2, maxVisit: 3,
                subSceneDialogues: [
                  "皇上（搁下御笔，抬头）：'你又来了。朕记得你上次说的那番话，回去想了许久。'",
                  "皇上（起身踱步）：'朝中大臣说话，十句里有八句是废话。你倒不同，说的是真心话。'"
                ],
                subSceneChoices: {
                  text: "皇上（停步，侧目看向若雪）：'朕想听你说说，若你是朕，这江山该如何治？'",
                  options: [
                    { id: "emp2_a", label: "A", text: "惶恐低头：'臣女不敢妄议朝政。'" },
                    { id: "emp2_b", label: "B", text: "沉默片刻，轻声说：'臣女见识浅薄……'" },
                    { id: "emp2_c", label: "C", text: "从容作答：'若雪以为，治国先治心，民心所向，江山自稳。'" },
                    { id: "emp2_d", label: "D", text: "直言道：'皇上问得好——百姓饱暖，便是天下太平。'" }
                  ]
                }
              },
              {
                minVisit: 4, maxVisit: 4,
                subSceneDialogues: [
                  "皇上（于御花园梅树下等候，见若雪来，唇角微扬）：'朕今日特意早退了朝，就是想在这里等你。'",
                  "皇上（轻声）：'朕见过许多聪慧的女子，但像你这样——既有才学，又有风骨，还不失温柔——朕只见过你一个。'"
                ],
                subSceneChoices: {
                  text: "皇上（从袖中取出一枚凤钗，托于掌心）：'这是太后当年的旧物，朕一直留着。今日……朕想亲手为你簪上。'",
                  options: [
                    { id: "emp3_a", label: "A", text: "退后一步：'皇上，此举不妥，臣女万万不敢。'" },
                    { id: "emp3_b", label: "B", text: "怔在原地，不知所措" },
                    { id: "emp3_c", label: "C", text: "敛眸，轻轻俯身，让皇上为自己簪上" },
                    { id: "emp3_d", label: "D", text: "抬眼与皇上对视，轻声道：'若雪……谢皇上。'" }
                  ]
                }
              },
              {
                minVisit: 5, maxVisit: 999,
                subSceneDialogues: [
                  "皇上（屏退左右，御书房内只剩二人）：'朕已下旨，命礼部着手准备大婚事宜。'",
                  "皇上（走近，目光深沉而温柔）：'朕不需要一个只会低头的皇后。朕要的，是能与朕并肩的人——若雪，你可愿意？'"
                ],
                subSceneChoices: {
                  text: "皇上（单膝跪地，将一枚龙凤玉佩双手呈上）：'朕在等你的答案。'",
                  options: [
                    { id: "emp4_a", label: "A", text: "颤声道：'臣女……臣女需要时间想想。'" },
                    { id: "emp4_b", label: "B", text: "泪眼朦胧，久久说不出话" },
                    { id: "emp4_c", label: "C", text: "双手接过玉佩，盈盈下拜：'若雪，愿意。'" },
                    { id: "emp4_d", label: "D", text: "俯身将皇上扶起，轻声说：'皇上快起来……若雪答应你。'" }
                  ]
                }
              }
            ],
            storyNode: "meet_royal_emperor",
            reward: { favorability: "royal_emperor", value: 15 }
          }
        },
        {
          id: "decline_emperor",
          text: "今日不便打扰皇上，改日再说",
          consequence: {
            type: "dialogue",
            nextDialogue: "映月点头微笑：'小姐说得是，奴婢明白了。'"
          }
        }
      ]
    },
    location: ["royal_court"]
  },

  // 两个大臣（位置：8,17）
  royal_official: {
    id: "royal_official",
    name: "韩大人 & 沈大人",
    role: "朝廷重臣",
    description: "户部尚书韩崇义与吏部侍郎沈文远，二人同朝为官多年，一个老成持重，一个精明干练，常在宫廷议事后于此处叙话",
    emoji: "📜",
    avatar: "/assets/npc_avatars/royal_official.png",
    sceneAvatar: { scene: "/assets/scenes_active/royal_court.jpg", cx: 37.5, cy: 82.5, imgW: 1408, imgH: 768 },
    dialogueSets: [
      {
        dialogues: [
          "韩大人（捋须点头）：'凌将军之女，果然气度不凡，老夫早有耳闻。'",
          "沈大人（拱手微笑）：'韩兄所言极是，凌小姐的才名在京城早已传开，今日一见，名不虚传。'"
        ]
      },
      {
        dialogues: [
          "沈大人（压低声音）：'韩兄，今日早朝皇上提起了选秀之事，看来是动了真章。'",
          "韩大人（眉头微皱）：'此事关乎朝局，不可轻忽。凌小姐若有意，当早做准备才是。'"
        ]
      },
      {
        dialogues: [
          "韩大人（见到若雪，含笑颔首）：'凌小姐，老夫与令尊相识多年，他常在信中提起你，说你聪慧过人。'",
          "沈大人（接话）：'韩兄与凌将军情谊深厚。小姐，令尊镇守边关，朝中诸事皆有我等照应，请放宽心。'"
        ]
      },
      {
        dialogues: [
          "沈大人（低声）：'韩兄，你可知三皇子近日频频出入御书房？'",
          "韩大人（摇头）：'此乃皇家内事，你我不便多言。凌小姐，宫中水深，凡事多留个心眼。'"
        ]
      },
      {
        dialogues: [
          "韩大人（从袖中取出一卷书册）：'凌小姐，老夫这里有一本《宫廷礼仪要览》，乃先皇在位时所编，对入宫行事大有裨益，小姐若不嫌弃……'",
          "沈大人（在一旁笑道）：'韩兄这是爱才之心，小姐快收下吧，这册子韩兄可是轻易不示人的。'"
        ],
        dialogueWithChoice: {
          text: "韩大人将书册恭敬递上：'此书于宫廷礼制颇有见地，望小姐细细研读，日后必有用处。'",
          choices: [
            {
              id: "accept_book",
              text: "多谢韩大人厚爱，若雪定当认真研读",
              consequence: {
                type: "dialogue",
                nextDialogue: "韩大人满意颔首：'孺子可教。凌将军有此女，可谓家门之幸。'"
              },
              giftItem: {
                id: "etiquette_book",
                name: "宫廷礼仪要览",
                emoji: "📖",
                category: "书籍",
                description: "先皇年间编纂的宫廷礼仪典籍，详载宫规礼制，研读后令人举止更加端庄得体。",
                effect: { charm: 6, wisdom: 4, affinity: 2 },
                rarity: "rare"
              }
            },
            {
              id: "decline_book",
              text: "大人美意，只是若雪不敢贸然收受",
              consequence: {
                type: "dialogue",
                nextDialogue: "韩大人点头道：'小姐谨慎，是好事。此书老夫先收回，改日再说。'"
              }
            }
          ]
        }
      },
      {
        dialogues: [
          "沈大人（见若雪走来，从袖中取出一枚玉佩）：'凌小姐，上月老夫在西市偶得一枚暖玉，本想留给小女，奈何她不喜这颜色。'",
          "韩大人（在旁笑道）：'沈兄这是借花献佛，凌小姐你可别推辞，沈兄的眼光一向极好。'"
        ],
        dialogueWithChoice: {
          text: "沈大人将玉佩轻轻放在若雪掌心：'此玉温润，与小姐气质相衬，算是老夫一点心意。'",
          choices: [
            {
              id: "accept_jade",
              text: "沈大人厚爱，若雪感激不尽",
              consequence: {
                type: "dialogue",
                nextDialogue: "沈大人含笑道：'小姐不必客气，凌将军为国戍边，朝中自有人记挂着。'"
              },
              giftItem: {
                id: "warm_jade",
                name: "暖玉佩",
                emoji: "💎",
                category: "妆饰",
                description: "西市偶得的上品暖玉，色泽温润如羊脂，佩戴在身令人气质愈发出众，人缘亦随之渐佳。",
                effect: { charm: 4, affinity: 5 },
                rarity: "uncommon"
              }
            },
            {
              id: "decline_jade",
              text: "大人之意若雪心领，只是贵重之物不敢收",
              consequence: {
                type: "dialogue",
                nextDialogue: "沈大人笑道：'小姐客气了，那便留待下回吧。'"
              }
            }
          ]
        }
      },
      // 游戏提示类
      {
        dialogues: [
          "韩大人（捋须）：'凌小姐，宫廷之中，才学与礼仪缺一不可，你可要好好把握。'",
          "沈大人（微笑）：'小姐若常来宫廷走动，声望自然日积月累，将来在京城的地位也会大不一样。'"
        ]
      },
      {
        dialogues: [
          "韩大人（低声叮嘱）：'小姐，宫中有个不成文的规矩——礼仪院的严夫子，每月都会考核入宫的贵女，答对了有额外奖赏。'",
          "沈大人（点头）：'是极，礼仪和才学双全，才是宫廷中最受赏识的。小姐不妨多去礼仪院走动。'"
        ]
      },
      // 根据与皇上的关系
      {
        condition: { minFav: { royal_emperor: 20 } },
        dialogues: [
          "韩大人（压低声音）：'小姐，皇上最近对您颇为上心，老夫在旁看得清楚，您可要好好把握这份缘分。'",
          "沈大人（微笑）：'韩兄所言极是，皇上难得对人如此上心，小姐是有大造化的。'"
        ]
      },
      {
        condition: { minFav: { royal_emperor: 60 }, minVisits: { royal_emperor: 3 } },
        dialogues: [
          "韩大人（欣慰点头）：'凌小姐，皇上近来常在御前提起您，朝中已有人在议论选秀之事，您可要做好准备。'",
          "沈大人（低声）：'小姐，若有意母仪天下，才学、魅力、声望、礼仪都要到位，缺一不可。'"
        ]
      },
    ],
    dialogues: [
      "韩大人（捋须）：'凌小姐，宫廷之中，才学与礼仪缺一不可，你可要好好把握。'",
      "沈大人（微笑）：'凌将军之女，果然名不虚传，气度非凡。'"
    ],
    location: ["royal_court"]
  },

  // 皇上（位置：47.5, 67.5）——通过映月引荐才能深入交谈
  royal_emperor: {
    id: "royal_emperor",
    name: "皇上",
    role: "天子",
    description: "当今圣上，英明神武，治国有方，偶尔微服出行于御花园，与入宫觐见的贵女有数面之缘",
    emoji: "👑",
    avatar: "/assets/npc_avatars/royal_emperor.png",
    sceneAvatar: { scene: "/assets/scenes_active/royal_court.jpg", cx: 47.5, cy: 67.5, imgW: 1408, imgH: 768 },
    storyStages: [
      // 第1阶段：御前初见（第1次）
      {
        minVisit: 1, maxVisit: 1,
        subSceneDialogues: [
          "御花园中，一位身着常服的男子负手而立，望着池中锦鲤出神。映月轻声道：'小姐，这便是皇上。'",
          "皇上（转身，目光沉静地打量若雪片刻）：'将军府的女儿？朕听说过你，今日一见，倒比传言更……从容。'"
        ],
        subSceneChoices: {
          text: "皇上（淡淡一笑）：'朕难得出来走走，你若无事，便陪朕在这园中走一段？'",
          options: [
            { id: "emp1_a", label: "A", text: "惶恐跪拜：'臣女不敢逾矩，告退。'" },
            { id: "emp1_b", label: "B", text: "垂首肃立，不置可否" },
            {
              id: "emp1_c", label: "C", text: "从容行礼：'能陪皇上赏花，是若雪的荣幸。'",
              giftItem: { id: "imperial_osmanthus", name: "御苑桂花枝", emoji: "🌼", category: "信物",
                description: "皇上亲折的御苑桂花，香气清远，是难得一见的皇恩信物。",
                effect: { charm: 3, reputation: 4 }, rarity: "rare" }
            },
            {
              id: "emp1_d", label: "D", text: "抬眸直视，微笑应道：'皇上相邀，若雪恭敬不如从命。'",
              giftItem: { id: "imperial_osmanthus", name: "御苑桂花枝", emoji: "🌼", category: "信物",
                description: "皇上亲折的御苑桂花，香气清远，是难得一见的皇恩信物。",
                effect: { charm: 3, reputation: 4 }, rarity: "rare" }
            }
          ]
        }
      },
      // 第2阶段：御前论道（第2-3次）
      {
        minVisit: 2, maxVisit: 3,
        subSceneDialogues: [
          "皇上（搁下御笔，抬头）：'你又来了。朕记得你上次说的那番话，回去想了许久。'",
          "皇上（起身踱步）：'朝中大臣说话，十句里有八句是废话。你倒不同，说的是真心话。'"
        ],
        subSceneChoices: {
          text: "皇上（停步，侧目看向若雪）：'朕想听你说说，若你是朕，这江山该如何治？'",
          options: [
            { id: "emp2_a", label: "A", text: "惶恐低头：'臣女不敢妄议朝政。'" },
            { id: "emp2_b", label: "B", text: "沉默片刻，轻声说：'臣女见识浅薄……'" },
            {
              id: "emp2_c", label: "C", text: "从容作答：'若雪以为，治国先治心，民心所向，江山自稳。'",
              giftItem: { id: "imperial_inkstone", name: "御赐端砚", emoji: "🪨", category: "文房",
                description: "皇上御案上的端砚，石质细腻，赐予有识之人，寓意器重。",
                effect: { wisdom: 4, statecraft: 5 }, rarity: "rare" }
            },
            {
              id: "emp2_d", label: "D", text: "直言道：'皇上问得好——百姓饱暖，便是天下太平。'",
              giftItem: { id: "imperial_inkstone", name: "御赐端砚", emoji: "🪨", category: "文房",
                description: "皇上御案上的端砚，石质细腻，赐予有识之人，寓意器重。",
                effect: { wisdom: 4, statecraft: 5 }, rarity: "rare" }
            }
          ]
        }
      },
      // 第3阶段：圣心独宠（第4次）
      {
        minVisit: 4, maxVisit: 4,
        subSceneDialogues: [
          "皇上（于御花园梅树下等候，见若雪来，唇角微扬）：'朕今日特意早退了朝，就是想在这里等你。'",
          "皇上（轻声）：'朕见过许多聪慧的女子，但像你这样——既有才学，又有风骨，还不失温柔——朕只见过你一个。'"
        ],
        subSceneChoices: {
          text: "皇上（从袖中取出一枚凤钗，托于掌心）：'这是太后当年的旧物，朕一直留着。今日……朕想亲手为你簪上。'",
          options: [
            { id: "emp3_a", label: "A", text: "退后一步：'皇上，此举不妥，臣女万万不敢。'" },
            { id: "emp3_b", label: "B", text: "怔在原地，不知所措" },
            {
              id: "emp3_c", label: "C", text: "敛眸，轻轻俯身，让皇上为自己簪上",
              giftItem: { id: "phoenix_hairpin", name: "太后凤钗", emoji: "🪙", category: "妆饰",
                description: "皇上亲手为若雪簪上的太后遗物，凤钗金光熠熠，承载着皇上最深的心意。",
                effect: { charm: 8, reputation: 8, morality: 3 }, rarity: "legendary" }
            },
            {
              id: "emp3_d", label: "D", text: "抬眼与皇上对视，轻声道：'若雪……谢皇上。'",
              giftItem: { id: "phoenix_hairpin", name: "太后凤钗", emoji: "🪙", category: "妆饰",
                description: "皇上亲手为若雪簪上的太后遗物，凤钗金光熠熠，承载着皇上最深的心意。",
                effect: { charm: 8, reputation: 8, morality: 3 }, rarity: "legendary" }
            }
          ]
        }
      },
      // 第4阶段：情定中宫（第5次及以上）
      {
        minVisit: 5, maxVisit: 999,
        subSceneDialogues: [
          "皇上（屏退左右，御书房内只剩二人）：'朕已下旨，命礼部着手准备大婚事宜。'",
          "皇上（走近，目光深沉而温柔）：'朕不需要一个只会低头的皇后。朕要的，是能与朕并肩的人——若雪，你可愿意？'"
        ],
        subSceneChoices: {
          text: "皇上（单膝跪地，将一枚龙凤玉佩双手呈上——这是天子向人低头，千古仅此一次）：'朕在等你的答案。'",
          options: [
            { id: "emp4_a", label: "A", text: "颤声道：'臣女……臣女需要时间想想。'" },
            { id: "emp4_b", label: "B", text: "泪眼朦胧，久久说不出话" },
            {
              id: "emp4_c", label: "C", text: "双手接过玉佩，盈盈下拜：'若雪，愿意。'",
              giftItem: { id: "dragon_phoenix_jade", name: "龙凤定情玉佩", emoji: "💎", category: "信物",
                description: "皇上亲赐的龙凤玉佩，天子定情之物，世间唯此一枚，象征中宫之位。",
                effect: { charm: 10, reputation: 10, statecraft: 6, morality: 5, wisdom: 4 }, rarity: "legendary" }
            },
            {
              id: "emp4_d", label: "D", text: "俯身将皇上扶起，轻声说：'皇上快起来……若雪答应你。'",
              giftItem: { id: "dragon_phoenix_jade", name: "龙凤定情玉佩", emoji: "💎", category: "信物",
                description: "皇上亲赐的龙凤定情玉佩，天子定情之物，世间唯此一枚，象征中宫之位。",
                effect: { charm: 10, reputation: 10, statecraft: 6, morality: 5, wisdom: 4 }, rarity: "legendary" }
            }
          ]
        }
      }
    ],
    dialogues: [
      "皇上日理万机，不轻易接见外臣女眷。或许可以先与映月姑娘攀谈，请她从中引荐？",
      "（御前侍卫拦住去路）：'皇上正在议事，还请小姐稍候。若有意觐见，不妨请映月姑娘代为通传。'"
    ],
    location: ["royal_court"]
  },

  // ───── 户外场景专属 NPC ─────
  outdoor_son: {
    id: "outdoor_son",
    name: "赵公子",
    role: "父亲朋友的儿子",
    description: "赵伯伯的儿子，与若雪同龄，活泼好动，虽顽皮但心地善良，对若雪暗自钦佩",
    emoji: "🌿",
    avatar: "/assets/npc_avatars/outdoor_son.png",
    dialogueSets: [
      {
        dialogues: [
          "若雪姐！没想到在这里遇到你！你也是来踏青的吗？",
          "我父亲总说我顽劣，让我向你多学学，其实……我觉得你确实挺厉害的。"
        ],
        dialogueWithChoice: {
          text: "对了，前面草原深处有位很有名的骑手，他叫幕风公子。我和他是好友，他一直听我说起你，特别想认识你。你要不要一起去见见他？",
          choices: [
            {
              id: "meet_mufengongzi_intro",
              text: "好啊，一起去见识一下",
              consequence: { type: "dialogue", nextDialogue: "赵公子拍手道：'太好了！跟我来，幕风公子就在前面不远处！'" }
            },
            {
              id: "decline_mufengongzi_intro",
              text: "今日不便，改日再说",
              consequence: { type: "dialogue", nextDialogue: "赵公子点点头：'好，那你下次来草原，我再带你去！'" }
            }
          ]
        }
      },
      {
        dialogues: [
          "若雪姐，在草原骑马可以增加体力和野性，你要不要试试？我来教你！",
          "幕风公子说了，体力好的人骑术才能学得快，你平时多来草原走走！"
        ]
      },
      {
        dialogues: [
          "若雪姐，你知道吗，去书画院学画艺能增加画艺值，去礼仪院学礼仪能增加魅力！",
          "我父亲让我多学习，但我就是坐不住……若雪姐你是怎么做到的？"
        ]
      },
      // 若雪与幕风公子有交集后
      {
        condition: { minFav: { mufengongzi: 20 } },
        dialogues: [
          "若雪姐！幕风公子昨天还跟我提起你，说你骑马进步很快，他很欣赏你！",
          "我就说嘛，你们两个肯定合得来！幕风公子可不是轻易夸人的！"
        ]
      },
      {
        condition: { minFav: { mufengongzi: 50 }, minVisits: { mufengongzi: 2 } },
        dialogues: [
          "哈哈，若雪姐，你和幕风公子的事，我早看出来了！你们俩在一起，我最高兴！",
          "幕风公子说，他从来没有为一个人停下脚步……若雪姐，你是第一个！"
        ]
      },
    ],
    dialogueWithChoice: {
      text: "对了，前面草原深处有位很有名的骑手，他叫幕风公子。我和他是好友，他一直听我说起你，特别想认识你。你要不要一起去见见他？",
      choices: [
        {
          id: "meet_mufengongzi",
          text: "好啊，一起去见识一下",
          consequence: {
            type: "scene_character",
            npcId: "mufengongzi",
            npcName: "幕风公子",
            scene: "grassland",
            characterImage: "/assets/character/outfits/npc_mufeng.png",
            characterCells: [15, 16, 25, 26],
            storyStages: [
              // 第1阶段：初次相遇（第1次）
              {
                minVisit: 1, maxVisit: 1,
                subSceneDialogues: [
                  { text: "幕风公子（骑马而来，洒脱如风）：'凌若雪？久闻大名。你的故事在草原上也传开了。不如一起骑马如何？'他笑容自信而神秘。", image: "/assets/character/outfits/npc_mufeng_s1.png" },
                  { text: "幕风公子（翻身下马，随手将缰绳递给你）：'别怕，这匹马性子温顺，跟着我的节奏就好。'他靠得很近，带着草原特有的风沙气息。", image: "/assets/character/outfits/npc_mufeng_s1.png" }
                ],
                subSceneChoices: {
                  text: "幕风公子忽然单膝跪地，仰头看着你，洒脱的脸上难得露出一丝认真：'凌若雪，我想陪你走一段，你愿意吗？'",
                  options: [
                    {
                      id: "mf_a", label: "A", text: "后退一步，婉拒好意",
                      responseDialogue: "幕风公子（站起身，拍拍膝上的草屑，笑得毫不在意）：'没事，草原上的风不会等人，但我会等。'他翻身上马，回头看了你一眼。"
                    },
                    {
                      id: "mf_b", label: "B", text: "愣在原地，不知所措",
                      responseDialogue: "幕风公子（见你发愣，噗嗤一笑，站起来）：'第一次有人这样看我。'他把缰绳往你手里一塞，'不用答，先骑马，边走边想。'"
                    },
                    {
                      id: "mf_c", label: "C", text: "伸出手，让他起来",
                      giftItem: { id: "steppe_jade", name: "草原碧玉坠", emoji: "🍃", category: "妆饰",
                        description: "幕风公子亲手打磨的草原碧玉，带着北地风沙的气息，是他的信物。",
                        effect: { wildness: 2, charm: 2 }, rarity: "rare" },
                      responseDialogue: "幕风公子（握住你的手站起来，眼神亮了一下）：'好。'他从腰间解下一枚碧玉坠，放入你掌心，'草原上的规矩——接了东西，就是朋友了。'",
                      followUpDialogues: [
                        "他带你策马驰过一片开阔的草地，风扑面而来，带着青草和泥土的气息。他回头喊：'快追上来！'",
                        "幕风公子（勒马停下，望着天边的云）：'你看，这里的天比哪里都大。'他侧头，'现在，你觉得自由是什么感觉了吗？'"
                      ]
                    },
                    {
                      id: "mf_d", label: "D", text: "低声说：'……我也是这样想的。'",
                      giftItem: { id: "steppe_jade", name: "草原碧玉坠", emoji: "🍃", category: "妆饰",
                        description: "幕风公子亲手打磨的草原碧玉，带着北地风沙的气息，是他的信物。",
                        effect: { wildness: 2, charm: 2 }, rarity: "rare" },
                      responseDialogue: "幕风公子（愣了一瞬，随即大笑起来，站起身）：'哈！好，凌若雪，你是我见过最对脾气的人。'他将碧玉坠抛给你，'拿着，算是见面礼。'",
                      followUpDialogues: [
                        "他骑马，你跟在侧边，他说起在草原上的日子——追鹰、逐风、在星空下睡觉。每一句话都像是另一个世界。",
                        "幕风公子（忽然低头看你，认真地说）：'若雪，草原会记住你的。我也会。'风把他的话吹散了一半，但你听清楚了。"
                      ]
                    }
                  ]
                }
              },
              // 第2阶段：并肩驰骋（第2-4次）
              {
                minVisit: 2, maxVisit: 4,
                subSceneDialogues: [
                  { text: "幕风公子（远远看到你，勒马而立，嘴角带笑）：'你又来了。我就知道草原会把你召回来的。'", image: "/assets/character/outfits/npc_mufeng_s2.png" },
                  { text: "幕风公子（策马与你并行，侧头打量你）：'上次骑马，你进步不小。但那眼神……比骑术更让我在意。'", image: "/assets/character/outfits/npc_mufeng_s2.png" }
                ],
                dialogueVariants: [
                  [
                    { text: "幕风公子（远远看见你，勒马等你走近，嘴角带着一丝笑）：'来了。'他说，'上次你「[[lastChoice]]」——我骑马回去之后想了很久，你这人，真的不一样。'", image: "/assets/character/outfits/npc_mufeng_s2.png" },
                    { text: "幕风公子（策马与你并行，侧头看你）：'草原上的风今天很好，适合骑马。跟上我。'", image: "/assets/character/outfits/npc_mufeng_s2.png" }
                  ],
                  [
                    { text: "幕风公子（见你来了，从马背上跳下，大步走来）：'若雪，上次你「[[lastChoice]]」——我那之后，一直在想这件事。'", image: "/assets/character/outfits/npc_mufeng_s2.png" },
                    { text: "幕风公子（停下，认真地看着你）：'你知道吗，草原上的人说，能让游侠停下来想的人，就是值得停下来的人。'", image: "/assets/character/outfits/npc_mufeng_s2.png" }
                  ],
                  [
                    { text: "幕风公子（今天没有骑马，就站在草原上等你，远远看见你来，眼神亮了一下）：'我昨天就想，你今天会不会来。'", image: "/assets/character/outfits/npc_mufeng_s2.png" },
                    { text: "幕风公子（低声）：'上次你「[[lastChoice]]」……我没说，但我记着。若雪，你每次来，我都记着。'", image: "/assets/character/outfits/npc_mufeng_s2.png" }
                  ]
                ],
                subSceneChoices: {
                  text: "幕风公子忽然停马，望向远处天际，语气罕见地平静：'凌若雪，你有没有想过，如果没有那些规矩束缚，你会选择什么样的生活？'",
                  options: [
                    {
                      id: "mf2_a", label: "A", text: "笑着摇头：'我从未想过这些。'",
                      responseDialogue: "幕风公子（侧头看你，眼神里有一丝说不清的东西）：'没想过……'他低声重复，'那就从今天开始想。'他夹马前行，没再说话。"
                    },
                    {
                      id: "mf2_b", label: "B", text: "沉默片刻，目光望向远方",
                      responseDialogue: "幕风公子（没有催你，就那样陪着你沉默，望着同一片天）：'不用说，我懂。'他轻声道，'有些答案，只有自己知道就够了。'"
                    },
                    {
                      id: "mf2_c", label: "C", text: "轻声说：'也许……像你一样，自由地走。'",
                      giftItem: { id: "steppe_feather", name: "草原鹰羽", emoji: "🪶", category: "信物",
                        description: "幕风公子猎鹰翅上的一根羽毛，象征草原上的自由与豪情。",
                        effect: { wildness: 3, courage: 3 }, rarity: "rare" },
                      responseDialogue: "幕风公子（愣了一下，随即笑开了）：'像我一样？'他从鞍袋里取出一根鹰羽，递给你，'那就先拿着这个，这是草原给自由人的礼物。'",
                      followUpDialogues: [
                        "他说，这根羽毛来自他养了三年的猎鹰，那只鹰最终飞走了，他没有追。'放开的，才是真的属于过你。'",
                        "幕风公子（回头，认真地看你）：'若雪，你身上有一种东西，让我觉得……你本来就该在草原上。'风吹过，他的眼神很亮。"
                      ]
                    },
                    {
                      id: "mf2_d", label: "D", text: "回视他：'你说的自由，是什么感觉？'",
                      giftItem: { id: "steppe_feather", name: "草原鹰羽", emoji: "🪶", category: "信物",
                        description: "幕风公子猎鹰翅上的一根羽毛，象征草原上的自由与豪情。",
                        effect: { wildness: 3, courage: 3 }, rarity: "rare" },
                      responseDialogue: "幕风公子（被你问住了，沉默片刻）：'自由……'他想了想，忽然笑，'就是现在这样，和你并排骑马，什么都不想，什么都不怕。'他把鹰羽插在你发间。",
                      followUpDialogues: [
                        "夕阳把草原染成金色，他们就那样骑着马，谁也没有说话，却谁也不想先离开。",
                        "幕风公子（最后，在分别时）：'若雪，下次来，我带你去看草原的日出。'他说得很随意，却像是一个郑重的约定。"
                      ]
                    }
                  ]
                }
              },
              // 第3阶段：草原盟约（第5次，最后一次）
              {
                minVisit: 5, maxVisit: 5,
                subSceneDialogues: [
                  { text: "幕风公子（下马走近，眼神深邃而专注，今天没有笑）：'若雪，上次你「[[lastChoice]]」——我知道，这是最后一次见面了。所以我要把话说清楚。'", image: "/assets/character/outfits/npc_mufeng_s3.png" },
                  { text: "幕风公子（低声，带着草原特有的直接）：'我走遍了北地，从没有一个人让我想停下来。直到遇见你。我不想让你就这样离开。'", image: "/assets/character/outfits/npc_mufeng_s3.png" }
                ],
                subSceneChoices: {
                  text: "幕风公子从腰间解下一枚银制的草原图腾挂坠，那是北地部族赠予英雄的信物：'这是我最珍贵的东西，我想给你。'",
                  options: [
                    {
                      id: "mf3_a", label: "A", text: "轻轻推开：'我不能收这个。'",
                      responseDialogue: "幕风公子（看着你推回图腾，静了片刻，然后重新挂回腰间）：'好。'他只说了一个字，但眼神里有什么没有散去，'那我就一直带着它，等你改变主意。'"
                    },
                    {
                      id: "mf3_b", label: "B", text: "怔在原地，说不出话来",
                      responseDialogue: "幕风公子（见你怔着，没有催促，只是把图腾轻轻放在你手边的草地上）：'不用现在决定。它会在这里，我也会在这里。'"
                    },
                    {
                      id: "mf3_c", label: "C", text: "双手接过，认真地看着他",
                      giftItem: { id: "steppe_totem", name: "草原图腾挂坠", emoji: "🌀", category: "信物",
                        description: "北地部族赠予英雄的银制图腾，幕风公子将它交给了你，是最重的承诺。",
                        effect: { wildness: 5, courage: 4, vitality: 3 }, rarity: "epic" },
                      responseDialogue: "幕风公子（看着图腾落入你手，深吸一口气，笑了）：'好。'他的声音有些哑，'草原上有句话——把图腾给了谁，就是把心给了谁。'",
                      followUpDialogues: [
                        "银制图腾上刻着奔马与苍鹰，他说这是北地最古老的部族图腾，象征着永不回头的勇气。",
                        "幕风公子（握住你捧着图腾的手，低声）：'若雪，不管你去哪里，草原的风会跟着你。我也是。'天边最后一抹金光慢慢沉下去。"
                      ]
                    },
                    {
                      id: "mf3_d", label: "D", text: "笑着接过，说：'那我也给你留一样东西。'",
                      giftItem: { id: "steppe_totem", name: "草原图腾挂坠", emoji: "🌀", category: "信物",
                        description: "北地部族赠予英雄的银制图腾，幕风公子将它交给了你，是最重的承诺。",
                        effect: { wildness: 5, courage: 4, vitality: 3 }, rarity: "epic" },
                      responseDialogue: "幕风公子（愣了一下，随即哈哈大笑）：'好！凌若雪，你是真的不一样！'他接过你留给他的东西，郑重地收好，眼神前所未有地柔软。",
                      followUpDialogues: [
                        "他把图腾挂到你颈间，动作轻柔得不像他平时的风格。'戴上。草原会认识你的。'",
                        "幕风公子（退后一步，看着你，满意地点头）：'若雪，你知道吗，我走了这么多地方，第一次觉得——某个地方值得我回来。'那个地方，是你在的地方。"
                      ]
                    }
                  ]
                }
              }
            ],
            storyNode: "meet_mufengongzi",
            reward: { favorability: "mufengongzi", value: 10 }
          }
        },
        {
          id: "decline_outdoor_adventure",
          text: "今日有些疲惫，下次再去",
          consequence: {
            type: "dialogue",
            nextDialogue: "赵公子点头：'好吧，下次一起来！他一直在这里，不会走远的。'"
          }
        }
      ]
    },
    location: ["grassland"]
  },

  // ───── 礼仪课堂专属 NPC ─────
  class_teacher: {
    id: "class_teacher",
    name: "严夫子",
    role: "礼仪先生",
    description: "博学严谨的礼仪先生，出身宫廷礼部，对礼仪规范要求极为严格",
    emoji: "🎓",
    avatar: "/assets/npc_avatars/class_teacher.png",
    dialogues: [
      "凌小姐，今日课程是宫廷行礼规范，万不可马虎，此乃立身之本！",
      "坐姿端正，目光平视，举手投足间尽显大家风范，这才是闺中女子应有的仪态。",
      "今日功课布置：将三品诰命的觐见礼仪默写三遍，明日检查。",
      "你的进步令老夫欣慰，但切莫骄傲，礼仪之道博大精深，学无止境。",
      "茶道也是礼仪的重要组成，下周我们学习正式的宫廷茶道，请做好准备。"
    ],
    location: ["etiquette_hall"]
   },
  class_student: {
    id: "class_student",
    name: "玉珠",
    role: "同窗学友",
    description: "家世良好的闺秀，与若雪同在礼仪课堂学习，开朗活泼，总爱和若雪比较进度",
    emoji: "💎",
    avatar: "/assets/npc_avatars/class_student.png",
    dialogues: [
      "若雪，你今天的行礼姿势真好看，夫子都夸你了！我好羡慕！",
      "今天的茶道课你学会了吗？我总是把水温掌握不好，倒出来的茶不好喝……",
      "听说月底有一场诗会，好多名门闺秀都会参加，你去不去？",
      "若雪，你帮我看看这个手势对不对？夫子说我端茶的手腕角度有问题。"
    ],
    location: ["etiquette_hall"]
  },

  // ───── 药铺专属 NPC ─────
  med_doctor: {
    id: "med_doctor",
    name: "白老大夫",
    role: "坐堂大夫",
    description: "须发皆白的老神医，行医五十余年，医术精湛，悬壶济世，德高望重",
    emoji: "⚕️",
    avatar: "/assets/npc_avatars/med_doctor.png",
    dialogues: [
      "凌小姐，你来得巧，这株年份极好的何首乌刚刚送到，你来看看？",
      "医者仁心，治病救人是天职，但医术之道深如大海，老夫学了一辈子也不敢说精通。",
      "你对草药的悟性颇高，若雪，你有没有想过以医术济世？",
      "这里有一本医书，是老夫年轻时的笔记，你若有兴趣，借你一阅。",
      "身体是根本，小姐平日要注重养生，切莫熬夜，也要多食五谷杂粮。"
    ],
    sickDialogues: [
      "唉，凌小姐，你这面色憔悴，眼下青黑，乃是过度操劳、气血两亏之症。",
      "老夫把脉……嗯，脉象细弱无力，确是积劳成疾。你近来是否夜不能寐、食欲不振？",
      "老夫开一副调养方子：黄芪、当归、红枣各三钱，煎水服用，连服七日。",
      "医嘱：切记劳逸结合，莫要再如此拼命了。身体乃是本钱，若垮了，什么都是空谈。",
      "诊金三十两，药材费另算。凌小姐，好好休养，下月再来复诊。"
    ],
    location: ["medicine_hall"]
  },
  med_patient: {
    id: "med_patient",
    name: "药童小福",
    role: "学徒药童",
    description: "大夫的小徒弟，聪明机灵，负责整理草药和跑腿，对若雪十分崇拜",
    emoji: "🌱",
    avatar: "/assets/npc_avatars/med_patient.png",
    dialogues: [
      "凌小姐！您又来啦！师父昨天还说您是他见过最有悟性的学生！",
      "我今天新认识了一种草药，叫车前草，可以清热利湿，厉害吧！",
      "师父让我把这些药材按产地分类，好复杂……小姐能帮我吗？",
      "那边山上有片野生药圃，师父说等我学好了带我去采，好期待！"
    ],
    location: ["medicine_hall"]
  },

  // ───── 书画院专属 NPC ─────
  art_master: {
    id: "art_master",
    name: "林画师",
    role: "丹青画师",
    description: "享誉一方的著名画师，擅长山水和人物，曾为宫廷作画，品格清高",
    emoji: "🖌️",
    avatar: "/assets/npc_avatars/art_master.png",
    dialogues: [
      "凌小姐，你今日来得正好，老夫正在研究一种新的墨法，你来看看？",
      "绘画如人生，起笔需果敢，行笔需沉稳，收笔需从容，万不可犹豫。",
      "你看这幅《松间听泉图》，老夫用了七层渲染，才有这种山水的气韵，你体会到了吗？",
      "书画同源，你若是诗词练得好，画作的意境也会随之提升，两者相辅相成。",
      "老夫给你留了个任务：用三种不同的笔触，各画一棵竹子，下次带来给我看。"
    ],
    location: ["art_studio"]
  },
  art_friend: {
    id: "art_friend",
    name: "明珠",
    role: "书画院好朋友",
    description: "在书画院结识的好友，性格活泼，画技颇佳，与若雪志趣相投，时常切磋",
    emoji: "🎋",
    avatar: "/assets/npc_avatars/art_friend.png",
    dialogues: [
      "若雪！你今天来啦！我刚画好一幅梅花图，快来帮我看看意境如何？",
      "你的笔墨越来越有灵气了，林画师上次都说你有望青出于蓝！",
      "诶，你会不会觉得，写字和画画都是在说心里的话？我总有这种感觉。"
    ],
    dialogueWithChoice: {
      text: "对了，我有个朋友叫司徒仟，他画技极佳，久闻你大名，一直想见见你。你有没有兴趣一起去拜访他？",
      choices: [
        {
          id: "visit_sitouqian",
          text: "一起去拜访朋友",
          consequence: {
            type: "scene_character",
            npcId: "sitouqian",
            npcName: "司徒仟",
            scene: "art_studio",
            characterImage: "/assets/character/outfits/npc_sitouqian.png",
            characterCells: [26, 27, 36, 37],
            storyStages: [
              // 第1阶段：初次相识（第1次）
              {
                minVisit: 1, maxVisit: 1,
                subSceneDialogues: [
                  { text: "司徒仟（抬头，眼神清亮）：'凌若雪姑娘，久仰大名。我观你的画作，笔力不凡，意境深远，实乃难得的才女。'", image: "/assets/character/outfits/npc_sitouqian_s1.png" },
                  { text: "司徒仟（起身，引你到画架旁）：'你看这幅《芙蓉出水》，我画了三遍都不满意。总觉得少了一点……说不清的灵气。'他停顿片刻，转头看你。", image: "/assets/character/outfits/npc_sitouqian_s1.png" }
                ],
                subSceneChoices: {
                  text: "司徒仟将笔轻轻放下，走到你面前，认真地说：'若雪姑娘，我愿以画为媒，为你作一幅专属的肖像，你可愿意？'",
                  options: [
                    {
                      id: "st_a", label: "A", text: "摇头婉拒，告辞离去",
                      responseDialogue: "司徒仟（微微一怔，随即点头，神情平和）：'无妨，画缘这种事，强求不来。'他目送你离去，重新拿起了笔，却久久没有落墨。"
                    },
                    {
                      id: "st_b", label: "B", text: "沉默片刻，轻声说不必了",
                      responseDialogue: "司徒仟（听到你的回答，低头看了看手中的笔）：'是我唐突了。'他轻声道，'不过……若你哪天改变主意，我的画室随时为你开着。'"
                    },
                    {
                      id: "st_c", label: "C", text: "微笑颔首，欣然答应",
                      responseDialogue: "司徒仟（眼中闪过一丝惊喜，随即恢复平静，郑重地拱手）：'多谢凌小姐。'他引你到窗边最好的光线处，'就站在这里，不必摆姿势，自然就好。'",
                      followUpDialogues: [
                        "他作画时很安静，只有笔触纸的声音。偶尔他会抬头看你一眼，眼神专注而温柔，像是在记住什么很重要的东西。",
                        "司徒仟（放下笔，看着画，轻声）：'凌小姐，你知道吗，我画了这么多年，第一次觉得——有人值得我用全力去画。'他没有看你，但耳根有些红。"
                      ]
                    },
                    {
                      id: "st_d", label: "D", text: "主动提笔，说要为他画一幅",
                      responseDialogue: "司徒仟（愣了一瞬，随即大笑）：'哈，凌小姐果然不同凡响！'他把最好的那支笔递给你，'好，那我们互画，看谁画得更像。'眼神里全是期待。",
                      followUpDialogues: [
                        "你们各自作画，偶尔偷看对方，又迅速别开眼。画室里充满了压抑的笑声，气氛比平时轻松了许多。",
                        "司徒仟（看到你画的他，沉默片刻，轻声）：'若雪，你画的我……比我想象中要好看。'他把那幅画小心地收起来，'我会一直留着。'"
                      ]
                    }
                  ]
                }
              },
              // 第2阶段：以画传情（第2-4次）
              {
                minVisit: 2, maxVisit: 4,
                subSceneDialogues: [
                  { text: "司徒仟（放下画笔，眼中有一丝惊喜）：'你又来了。我一直在想，上次的那幅肖像……我觉得还差一点，想重新画。'", image: "/assets/character/outfits/npc_sitouqian_s2.png" },
                  { text: "司徒仟（将一张未完成的画轻轻展开）：'你看，这是你的眼睛。我画了很多次，但总觉得没能画出……那种感觉。'他顿了顿，低声说：'也许是因为我太在意了。'", image: "/assets/character/outfits/npc_sitouqian_s2.png" }
                ],
                dialogueVariants: [
                  [
                    { text: "司徒仟（见你推开画室的门，放下笔，眼中闪过一丝惊喜）：'你来了。'他顿了顿，'上次你「[[lastChoice]]」……我那之后，把那幅画又改了三遍。'", image: "/assets/character/outfits/npc_sitouqian_s2.png" },
                    { text: "司徒仟（将一张未完成的画展开）：'你看，这是你的眼睛。我一直觉得没画出来那种感觉，现在我知道是为什么了。'", image: "/assets/character/outfits/npc_sitouqian_s2.png" }
                  ],
                  [
                    { text: "司徒仟（今天没有在画画，只是坐在窗边发呆，见你来了，有些不好意思）：'在想上次的事。你「[[lastChoice]]」——我一直在想，你当时心里是什么感受。'", image: "/assets/character/outfits/npc_sitouqian_s2.png" },
                    { text: "司徒仟（低声）：'画画的人有个习惯，总想把看不懂的东西画出来。你，是我最想画、也最画不出来的。'", image: "/assets/character/outfits/npc_sitouqian_s2.png" }
                  ],
                  [
                    { text: "司徒仟（今天在画一幅新画，见你来了，把画挡住）：'别看，还没画完。'他停顿，'上次你「[[lastChoice]]」，那之后我一直想给你看这幅。等画完了。'", image: "/assets/character/outfits/npc_sitouqian_s2.png" },
                    { text: "司徒仟（放下笔，认真地看你）：'若雪，你每次来，我都会画一幅。你不知道，但我的画里，有你的每一次。'", image: "/assets/character/outfits/npc_sitouqian_s2.png" }
                  ]
                ],
                subSceneChoices: {
                  text: "司徒仟忽然转身，将一卷画轴递到你面前，眼神专注而温柔：'这是我为你画的第二幅，比上次好很多。你愿意收下吗？'",
                  options: [
                    {
                      id: "st2_a", label: "A", text: "摇头：'画得再好也不必送给我。'",
                      responseDialogue: "司徒仟（愣了一下，将画轴收回，低头看着它）：'……好。'他轻声说，'那我就自己留着。'他把画放回书架最显眼的位置。"
                    },
                    {
                      id: "st2_b", label: "B", text: "犹豫片刻，没有伸手",
                      responseDialogue: "司徒仟（见你犹豫，没有强求，将画轴轻轻卷起）：'不急，等你想要的时候，它一直在这里。'他把画放在书案角落，像是特意留给你的位置。"
                    },
                    {
                      id: "st2_c", label: "C", text: "轻轻接过，展开来细细看",
                      giftItem: { id: "st_portrait", name: "司徒仟亲绘肖像", emoji: "🖼️", category: "信物",
                        description: "司徒仟为你亲绘的第二幅肖像，笔墨间流露出他不曾言说的情意。",
                        effect: { painting: 3, charm: 2 }, rarity: "rare" },
                      responseDialogue: "司徒仟（屏息看你展开画轴，眼神里有一丝紧张）：'这次……画的是你看窗外的侧脸。我觉得那个角度，最像你。'他声音很轻，像是在说一个秘密。",
                      followUpDialogues: [
                        "画上的人侧着脸，目光望向远处，神情里有一种说不清的东西——专注，又有点忧郁。你不知道自己看起来是这样的。",
                        "司徒仟（低声问）：'你觉得……像吗？'他其实不是在问画像不像你，他在问，你有没有看见他眼里的你。"
                      ]
                    },
                    {
                      id: "st2_d", label: "D", text: "接过画，微笑说：'那我也画一幅回赠你。'",
                      giftItem: { id: "st_portrait", name: "司徒仟亲绘肖像", emoji: "🖼️", category: "信物",
                        description: "司徒仟为你亲绘的第二幅肖像，笔墨间流露出他不曾言说的情意。",
                        effect: { painting: 3, charm: 2 }, rarity: "rare" },
                      responseDialogue: "司徒仟（被你说得一怔，随即眼睛亮了）：'当真？'他立刻腾出画案，把最好的纸铺上，'那我就在这里等，不许偷看。'他背过身，却忍不住侧耳听你的动静。",
                      followUpDialogues: [
                        "你画他，他背对着你，但你能看见他耳朵悄悄红了。画室里安静极了，只有笔触纸的细声。",
                        "司徒仟（接过你画的他，久久没有说话，最后轻声）：'若雪，你画的我……比我自己想象的要好看。'他把画贴心地收好，'我会挂在最显眼的地方。'"
                      ]
                    }
                  ]
                }
              },
              // 第3阶段：丹青定情（第5次，最后一次）
              {
                minVisit: 5, maxVisit: 5,
                subSceneDialogues: [
                  { text: "司徒仟（放下画笔，长久地看着你，今天的神情比任何一次都要认真）：'若雪，上次你「[[lastChoice]]」——我知道，这是最后一次见面了。我有话想说。'", image: "/assets/character/outfits/npc_sitouqian_s3.png" },
                  { text: "司徒仟（轻声，带着一点颤抖）：'我画了这么多年的画，从来没有一个人，让我觉得——无论画多少遍，都想再画一次。你是我的例外，也是我最后的遗憾。'", image: "/assets/character/outfits/npc_sitouqian_s3.png" }
                ],
                subSceneChoices: {
                  text: "司徒仟从书案上取出一方精致的砚台，那是他用了十年的旧物，上面有他名字的刻字：'这方砚台陪了我很多年，我想把它送给你。'",
                  options: [
                    {
                      id: "st3_a", label: "A", text: "轻轻摇头：'这是你最重要的东西，我不能收。'",
                      responseDialogue: "司徒仟（静静看着你，没有勉强，将砚台放回书案）：'那就放在这里。'他轻声说，'它还是我的，但我心里，已经是你的了。'"
                    },
                    {
                      id: "st3_b", label: "B", text: "望着砚台，沉默了很久",
                      responseDialogue: "司徒仟（陪着你沉默，没有催促）：'不用说话。'他轻声道，'你愿意看着它，对我来说已经够了。'他把砚台推近了一点。"
                    },
                    {
                      id: "st3_c", label: "C", text: "双手接过，低声说：'我会好好珍惜的。'",
                      giftItem: { id: "st_inkstone", name: "司徒仟传世砚台", emoji: "🪨", category: "信物",
                        description: "司徒仟用了十年的旧砚，刻有他的名字，承载着他全部的心意。",
                        effect: { painting: 6, poetry: 4, wisdom: 3 }, rarity: "epic" },
                      responseDialogue: "司徒仟（看着砚台落入你手，深吸一口气，声音有些哽）：'若雪……'他停了停，'我画了这么多年，第一次觉得，有一幅画，我不想画完。'",
                      followUpDialogues: [
                        "砚台上刻着'司徒仟'三字，笔画深而有力。他说，这方砚台见证了他所有的作品，也见证了他所有说不出口的心事。",
                        "司徒仟（轻轻握住你捧砚台的手，低声）：'若雪，我不擅长说情话。但我想让你知道——我画的每一幅画里，都有你的影子。'窗外梅花正开，一片寂静。"
                      ]
                    },
                    {
                      id: "st3_d", label: "D", text: "接过砚台，取出自己的毛笔放入他手中",
                      giftItem: { id: "st_inkstone", name: "司徒仟传世砚台", emoji: "🪨", category: "信物",
                        description: "司徒仟用了十年的旧砚，刻有他的名字，承载着他全部的心意。",
                        effect: { painting: 6, poetry: 4, wisdom: 3 }, rarity: "epic" },
                      responseDialogue: "司徒仟（接过你的毛笔，愣了很久，眼眶微微泛红）：'若雪……'他攥紧那支笔，轻声，'你知道这意味着什么吗？'他抬起头，眼神里全是你。",
                      followUpDialogues: [
                        "你们就那样，各自握着对方最重要的东西，站在画室里，窗外光线慢慢移动，谁也没有先说话。",
                        "司徒仟（最后，轻声）：'若雪，从今往后，我的每一幅画，都署你的名字。'这是他能说出口的，最重的承诺。"
                      ]
                    }
                  ]
                }
              }
            ],
            storyNode: "meet_sitouqian",
            reward: { favorability: "sitouqian", value: 10 }
          }
        },
        {
          id: "decline_visit",
          text: "今日事务繁忙，改日再说",
          consequence: {
            type: "dialogue",
            nextDialogue: "明珠：'没关系，等你有空的时候再说，我替你转告他。'"
          }
        }
      ]
    },
    location: ["art_studio"]
  },
  art_prince: {
    id: "art_prince",
    name: "端王叔",
    role: "皇叔",
    description: "皇室远亲，端王爷，平日醉心书画，不问政事，为人洒脱风雅，常来书画院切磋",
    emoji: "👨‍🎨",
    avatar: "/assets/npc_avatars/art_prince.png",
    dialogues: [
      "凌小姐，本王观你作画，笔力已颇有风骨，假以时日必成大家。",
      "书画一道，最忌匠气，须有自己的胸臆在笔墨间流淌，方为上品。",
      "本王有一幅前朝名家的真迹，改日带来与你共赏，看你能否参透其中玄机。",
      "小姐，你可知这书画院中，藏着一幅已失传百年的古画线索？",
      "本王向来不在乎世俗礼节，在这书画院里，大家都是同道中人，无需拘束。"
    ],
    location: ["art_studio"]
  },

  // ───── 呜沙沟专属 NPC ─────
  desert_friend: {
    id: "desert_friend",
    name: "沙漠游侠·沐风",
    role: "呜沙沟守护者",
    description: "来自西域的神秘游侠，行走于丝路之上，见多识广，性情豪迈，以一把长刀守护着呜沙沟绿洲的往来旅人",
    emoji: "🏜️",
    avatar: "/assets/npc_avatars/desert_friend.png",
    dialogues: [
      "沙漠的风沙会磨砺人，也会沉淀人。你来这里，是为了什么？",
      "我在这条路上走了十年，见过无数人来了又走，但像你这样的，倒是少见。",
      "绿洲里的水是甜的，沙漠里的星是亮的，这里有它自己的美。"
    ],
    dialogueWithChoice: {
      text: "沐风（目光如炬，望向远处的沙丘）：'我在这里守了三年，今天第一次想带人去看那片鸣沙。你，愿意去吗？'",
      choices: [
        {
          id: "meet_desertfriend",
          text: "愿意，随你同去",
          consequence: {
            type: "scene_character",
            npcId: "desert_friend",
            npcName: "沐风",
            scene: "desert_oasis",
            characterImage: "/assets/character/outfits/npc_desert_friend.png",
            storyStages: [
              {
                minVisit: 1, maxVisit: 1,
                subSceneDialogues: [
                  { text: "沐风（踏上沙丘，回首一笑）：'来，跟上。沙漠的日落只有一瞬，错过了就要再等一天。'", image: "/assets/character/outfits/npc_desert_friend_s1.png" },
                  { text: "夕阳将沙丘染成金红色，沐风站在最高处，衣袂飘扬，像是这片沙漠的主人。他说：'你是第一个陪我看这个的人。'", image: "/assets/character/outfits/npc_desert_friend_s1.png" }
                ],
                subSceneChoices: {
                  text: "沐风（从腰间解下一枚铜质护符，递到你面前）：'这是西域的平安符，走过千里沙漠的人都带着它。送给你。'",
                  options: [
                    {
                      id: "df_a", label: "A", text: "婉拒：'这是你的，我不能要。'",
                      responseDialogue: "沐风（将护符重新挂回腰间，点了点头）：'随你。'他转身望向远处沙丘，'但这片沙漠记住你了，我也是。'"
                    },
                    {
                      id: "df_b", label: "B", text: "犹豫着，没有接",
                      responseDialogue: "沐风（没有催你，把护符放在沙地上，站起来）：'先放这里。等你想要了，它会在。'他背对着你，望着夕阳，'沙漠里的东西不会走的。'"
                    },
                    {
                      id: "df_c", label: "C", text: "接过，郑重道谢",
                      giftItem: { id: "desert_amulet", name: "西域铜护符", emoji: "🔱", category: "信物",
                        description: "沐风随身多年的西域平安护符，历经千里风沙，承载着守护之意。",
                        effect: { courage: 4, wildness: 3 }, rarity: "uncommon" },
                      responseDialogue: "沐风（看你接过护符，眼神里闪过一丝温柔，随即恢复平静）：'戴好它。西域的神明会保佑带着它的人。'他顿了顿，'还有我。'",
                      followUpDialogues: [
                        "夕阳沉下去，沙漠变成深蓝色，第一颗星出现了。沐风说，西域人相信每颗星都是一个故事，在等人去读。",
                        "沐风（最后，低头看你一眼）：'凌若雪，你是第一个让我想把沙漠故事讲完的人。'他没有再说什么，转身走入夜色里。"
                      ]
                    },
                    {
                      id: "df_d", label: "D", text: "接过，轻声说：'我会好好保管的。'",
                      giftItem: { id: "desert_amulet", name: "西域铜护符", emoji: "🔱", category: "信物",
                        description: "沐风随身多年的西域平安护符，历经千里风沙，承载着守护之意。",
                        effect: { courage: 4, wildness: 3 }, rarity: "uncommon" },
                      responseDialogue: "沐风（听到你说'好好保管'，沉默片刻，轻声）：'好。'他的眼神里有什么柔软了，'那我也会好好……'他没说完，只是看着你，夕阳把他的脸照得很暖。",
                      followUpDialogues: [
                        "他带你在沙丘上坐下，讲起西域的星星——哪颗是猎户，哪颗是向导星，哪颗是游子回家的路标。",
                        "沐风（站起来，伸手拉你）：'走，我带你去看绿洲里的月亮。沙漠的月亮，比哪里都圆。'他的手很温暖。"
                      ]
                    }
                  ]
                }
              },
              {
                minVisit: 2, maxVisit: 4,
                subSceneDialogues: [
                  { text: "沐风（见你再来，眼中闪过一丝意外的惊喜）：'你回来了。我以为你不会再来这片沙漠了。'", image: "/assets/character/outfits/npc_desert_friend_s2.png" },
                  { text: "沐风（在篝火旁坐下，声音低沉）：'我走过西域三十六国，从没有一个地方让我想停下来。直到在这里遇见了你。'", image: "/assets/character/outfits/npc_desert_friend_s2.png" }
                ],
                dialogueVariants: [
                  [
                    { text: "沐风（见你走来，从沙丘上站起身，眼神里有一丝意外的惊喜）：'你回来了。'他说，'上次你「[[lastChoice]]」——我以为你不会再来了。'", image: "/assets/character/outfits/npc_desert_friend_s2.png" },
                    { text: "沐风（在篝火旁坐下，声音低沉）：'沙漠里的人说，走过一次的路，不会再走第二遍。但你来了，我很高兴你来了。'", image: "/assets/character/outfits/npc_desert_friend_s2.png" }
                  ],
                  [
                    { text: "沐风（今天在绿洲边磨刀，见你来了，把刀收起来）：'若雪。'他直接叫你的名字，'上次你「[[lastChoice]]」，那之后我想了很久。'", image: "/assets/character/outfits/npc_desert_friend_s2.png" },
                    { text: "沐风（抬头看你）：'沙漠里有句话——回头的人，心里有东西放不下。你放不下什么？'", image: "/assets/character/outfits/npc_desert_friend_s2.png" }
                  ],
                  [
                    { text: "沐风（今天没有生篝火，就坐在沙地上看星星，见你来了，拍拍旁边的沙地）：'坐。'他说，'上次你「[[lastChoice]]」……我一直在想，你是什么样的人。'", image: "/assets/character/outfits/npc_desert_friend_s2.png" },
                    { text: "沐风（低声）：'走遍西域，我见过很多人。但像你这样的，只有一个。'", image: "/assets/character/outfits/npc_desert_friend_s2.png" }
                  ]
                ],
                subSceneChoices: {
                  text: "沐风从行囊中取出一块蓝色的丝绸，上面绣着西域的星图：'这是我在撒马尔罕买的，一直没找到合适的人送。'",
                  options: [
                    {
                      id: "df2_a", label: "A", text: "推回：'我们还不够熟。'",
                      responseDialogue: "沐风（愣了一下，随即点头，将星图叠好）：'说得对。'他收回丝绸，'那就等我们够熟了，我再拿出来。'他说得很认真，像是真的在等。"
                    },
                    {
                      id: "df2_b", label: "B", text: "沉默，不知如何回应",
                      responseDialogue: "沐风（见你沉默，没有尴尬，只是把星图轻轻放在你膝上）：'不用说话。'他望着篝火，'沙漠里的人习惯了沉默，但不习惯孤独。'他说这话，眼神很深。"
                    },
                    {
                      id: "df2_c", label: "C", text: "接过，细细端详那星图",
                      giftItem: { id: "silk_starmap", name: "西域星图绸", emoji: "🌌", category: "信物",
                        description: "来自撒马尔罕的蓝色丝绸，绣着西域夜空的星图，异域风情浓郁。",
                        effect: { spirit: 5, wisdom: 3 }, rarity: "rare" },
                      responseDialogue: "沐风（看你专注地看着星图，嘴角微微上扬）：'这颗是北极星，走迷路了就找它。'他俯身靠近，指着丝绸上的一点，声音很低，'还有这颗，西域人叫它守望星。'",
                      followUpDialogues: [
                        "他说，守望星只在特定的季节出现，游侠们相信——看见它的人，心里一定有什么在等待。",
                        "沐风（抬头，直视你的眼睛）：'若雪，你心里在等什么？'篝火噼啪作响，他的眼神里有一种沙漠才有的深邃。"
                      ]
                    },
                    {
                      id: "df2_d", label: "D", text: "接过，抬头问他：'你是如何认识这些星的？'",
                      giftItem: { id: "silk_starmap", name: "西域星图绸", emoji: "🌌", category: "信物",
                        description: "来自撒马尔罕的蓝色丝绸，绣着西域夜空的星图，异域风情浓郁。",
                        effect: { spirit: 5, wisdom: 3 }, rarity: "rare" },
                      responseDialogue: "沐风（被你问住，笑了）：'是一个老向导教我的，他说——认识星星，就不会在沙漠里迷路。'他停顿，'但我觉得，认识了你，才算真的不迷路。'",
                      followUpDialogues: [
                        "他讲了很久，讲撒马尔罕的集市，讲西域商队的歌，讲他第一次独自穿越沙漠时仰望星空的感受。",
                        "沐风（最后，轻声）：'若雪，你愿意听我讲这些……我很高兴。'他把篝火拨旺了一些，'再讲一段，不急着走。'"
                      ]
                    }
                  ]
                }
              },
              {
                minVisit: 5, maxVisit: 5,
                subSceneDialogues: [
                  { text: "沐风（今天在绿洲边等候，没有骆驼，没有篝火，只是静静地站着。见你来了，走近，低声）：'上次你「[[lastChoice]]」——我知道，这是最后一次了。'", image: "/assets/character/outfits/npc_desert_friend_s3.png" },
                  { text: "沐风（望着你，声音罕见地柔和）：'我这辈子走过千山万水，从不曾为任何人停留。但若雪，我愿意为你，在这片沙漠扎根。'", image: "/assets/character/outfits/npc_desert_friend_s3.png" }
                ],
                subSceneChoices: {
                  text: "沐风从怀中取出一枚镶嵌着蓝宝石的戒指，那是西域王族才有的信物：'这是我家族传下来的。我想……把它交给你。'",
                  options: [
                    {
                      id: "df3_a", label: "A", text: "轻轻摇头：'我还没想好。'",
                      responseDialogue: "沐风（静静看着你，将戒指重新握入掌心）：'好。'他低声道，'沙漠等过千年的风，我等得起你。'"
                    },
                    {
                      id: "df3_b", label: "B", text: "沉默地看着他，久久说不出话",
                      responseDialogue: "沐风（陪着你沉默，月光照着他的侧脸）：'不用说话。'他把戒指放在你掌心，'先拿着，什么时候想通了，再告诉我。'"
                    },
                    {
                      id: "df3_c", label: "C", text: "伸出手，让他为你戴上",
                      giftItem: { id: "sapphire_ring", name: "西域蓝宝传家戒", emoji: "💎", category: "信物",
                        description: "沐风家族传承的蓝宝石戒指，象征着西域游侠对你最深的承诺。",
                        effect: { charm: 6, courage: 5, spirit: 3 }, rarity: "epic" },
                      responseDialogue: "沐风（接过你的手，小心地将戒指戴上，动作轻柔得出乎意料）：'若雪。'他只叫了你的名字，却什么都在里面了。",
                      followUpDialogues: [
                        "蓝宝石在月光下泛着幽蓝的光，他说，这颗石头来自西域最深的山脉，蓝得像沙漠里最深的夜空。",
                        "沐风（最后，抬头望着星空，低声）：'若雪，我这辈子走过很多地方，但从今往后，只有一个地方，是我真正想回来的。'他握紧了你的手。"
                      ]
                    },
                    {
                      id: "df3_d", label: "D", text: "握住他的手，连同戒指一起",
                      giftItem: { id: "sapphire_ring", name: "西域蓝宝传家戒", emoji: "💎", category: "信物",
                        description: "沐风家族传承的蓝宝石戒指，象征着西域游侠对你最深的承诺。",
                        effect: { charm: 6, courage: 5, spirit: 3 }, rarity: "epic" },
                      responseDialogue: "沐风（感受到你握住他的手，整个人都静了一瞬，随即反握住你）：'……好。'他的声音有些哑，'这是我听过最好的答案。'",
                      followUpDialogues: [
                        "沙漠的夜风吹过绿洲，骆驼在远处低鸣。他们就那样坐在星空下，谁也没有说话，却都知道，有什么已经不一样了。",
                        "沐风（在你离开前，轻声）：'若雪，沙漠的星星会替我看着你。'他松开手，'但我更想亲自来看。'这是他最直白的一句话，也是最温柔的。"
                      ]
                    }
                  ]
                }
              }
            ],
            storyNode: "meet_desert_friend",
            reward: { favorability: "desert_friend", value: 12 }
          }
        },
        {
          id: "decline_desert",
          text: "改日再说，先看看这片绿洲",
          consequence: {
            type: "dialogue",
            nextDialogue: "沐风点了点头，转身望向远处的沙丘，神情平静如沙漠本身。"
          }
        }
      ]
    },
    location: ["desert_oasis"]
  },

  // ───── 闺房专属 NPC ─────
  bedroom_maid: {
    id: "bedroom_maid",
    name: "春杏",
    role: "贴身丫鬟",
    description: "从小服侍若雪的贴身丫鬟，忠心可靠，心思细腻，是若雪最信任的人",
    emoji: "🌷",
    avatar: "/assets/npc_avatars/bedroom_maid.png",
    dialogueSets: [
      {
        dialogues: [
          "小姐，您今日要换哪套衣裳出门？奴婢已经把几套都熨好了！",
          "对了，奴婢听说古街那边的锦绣坊进了新款衣料，小姐若想添置行头，出门前换套好看的，气质更出众！"
        ]
      },
      {
        dialogues: [
          "今儿一早，老爷特地让厨房给小姐炖了燕窝粥，说是养颜的，小姐快趁热喝！",
          "小姐，奴婢提醒您，疲惫度高了要记得休息，不然去哪里都没精神，什么都学不进去！"
        ]
      },
      {
        dialogues: [
          "小姐，碧瑶姑娘昨日托人带话说，街上新开了家香粉铺，问您有没有空同去？",
          "奴婢听说，去礼仪院上课能增加魅力和礼仪，小姐若想在宫廷里更受欢迎，礼仪课可不能落下！"
        ]
      },
      {
        dialogues: [
          "小姐您最近练字练得很勤，奴婢看着都替您高兴，字写得越来越好了！",
          "奴婢还听说，去书画院多走动，才学和画艺都会提升，小姐若想更有学识，不妨多去那边！"
        ]
      },
      {
        dialogues: [
          "小姐，夜深了，您早些歇息吧，明日还有礼仪课，精神好才学得进去。",
          "奴婢提醒小姐，每个月都要劳作挣金币，不然学费都交不起呢！去古街摆摊或者做点手工活，都是好法子！"
        ]
      },
      // 根据与王文玉的关系
      {
        condition: { minFav: { wangwenyu: 20 } },
        dialogues: [
          "小姐，奴婢听说古街那位王文玉公子对您颇有好感，您上次去古街，他是不是对您特别殷勤？",
          "奴婢替小姐高兴！王公子生得俊俏，又有本事，小姐可要把握机会，多去古街走走！"
        ]
      },
      {
        condition: { minFav: { wangwenyu: 50 }, minVisits: { wangwenyu: 2 } },
        dialogues: [
          "小姐，您上次从古街回来，脸都红了，是不是王公子又说了什么好听的话？",
          "奴婢看得出来，王公子对小姐是真心的。小姐若也有意，不妨主动些，别让他等太久！"
        ]
      },
      {
        condition: { minFav: { wangwenyu: 80 }, minVisits: { wangwenyu: 4 } },
        dialogues: [
          "小姐，奴婢替您高兴！王公子那边，是不是已经有了什么……奴婢都看出来了，小姐您藏不住的！",
          "奴婢就盼着小姐幸福，王公子若真心求娶，老爷那边奴婢也帮小姐说好话！"
        ]
      },
      // 根据与幕风公子的关系
      {
        condition: { minFav: { mufengongzi: 30 } },
        dialogues: [
          "小姐，奴婢听赵家小少爷说，幕风公子最近常在草原等您，您若有空，不妨去草原走走！",
          "幕风公子那样的人，天下少见，小姐可要好好把握，别让他等急了！"
        ]
      },
      // 根据与司徒仟的关系
      {
        condition: { minFav: { sitouqian: 30 } },
        dialogues: [
          "小姐，书画院那位司徒仟先生，奴婢听说他最近总在书画院等人，莫非是在等小姐？",
          "司徒先生才华横溢，又温文尔雅，小姐若喜欢，多去书画院走动，说不定缘分就来了！"
        ]
      },
      // 根据与沙漠游侠的关系
      {
        condition: { minFav: { desert_friend: 30 } },
        dialogues: [
          "小姐，那位西域来的沐风游侠，奴婢听说他一直在呜沙沟等着您，您最近怎么不去了？",
          "奴婢觉得，沐风大侠虽然来自西域，但对小姐是真心实意的，小姐可别冷落了他！"
        ]
      },
    ],
    location: ["bedroom"]
  },

  // ───── 宫廷侍卫总领 ─────
  royal_guard_captain: {
    id: "royal_guard_captain",
    name: "侍卫总领",
    role: "天子近卫",
    description: "统领御前侍卫，铁面无私，武艺超群，忠心护主。寻常贵女难以接近，但偶尔也会对有礼有节之人多说几句。",
    emoji: "⚔️",
    avatar: "/assets/npc_avatars/royal_guard_captain.png",
    dialogues: [
      "（侍卫总领冷眼扫来）：'宫中重地，闲杂人等不得擅入。小姐若无要事，还请速速离开。'",
      "（侍卫总领微微颔首）：'小姐举止有礼，倒是少见。宫规森严，还望自重。'",
      "（侍卫总领低声）：'皇上今日心情尚可，若有要事，可请映月姑娘代为通传，比直接求见稳妥。'"
    ],
    location: ["royal_court"]
  }
};

// 课程/活动数据
const courses = [
  // 跑马场课程
  {
    id: "horse_riding",
    name: "骑马课",
    scene: "horse_ranch",
    description: "在专业师傅指导下学习骑马技艺，感受胯下骏马的奔腾",
    duration: 60,
    cost: { gold: 30 },
    skillGains: { wildness: 22, vitality: 15, courage: 10 },
    exp: 15,
    requiredSkills: {},
    emoji: "🐎",
    storyText: "你骑上骏马，感受着风驰电掣的畅快，心中豪情万丈！"
  },
  {
    id: "archery",
    name: "射箭课",
    scene: "horse_ranch",
    description: "学习古代弓箭射击技艺，培养专注力与臂力",
    duration: 45,
    cost: { gold: 22 },
    skillGains: { wildness: 14, vitality: 10, courage: 15, wisdom: 6, martial: 10 },
    exp: 12,
    requiredSkills: {},
    emoji: "🏹",
    storyText: "弓弦一响，箭矢破空，你的心神高度集中，感受到了武者的境界！"
  },
  {
    id: "racing",
    name: "马场竞速",
    scene: "horse_ranch",
    description: "参加跑马场的竞速比赛，与其他骑手一较高下",
    duration: 90,
    cost: { gold: 45 },
    skillGains: { wildness: 28, vitality: 20, courage: 18, command: 10 },
    exp: 25,
    requiredSkills: { wildness: 20 },
    emoji: "🏇",
    storyText: "马蹄声声，你策马扬鞭，超越一个又一个对手，最终冲过终点线！"
  },
  {
    id: "hunting",
    name: "狩猎",
    scene: "horse_ranch",
    description: "骑马驰骋于猎场，弯弓搭箭猎取猎物，展现骑射技艺",
    duration: 90,
    cost: { gold: 30 },
    skillGains: { wildness: 24, vitality: 18, courage: 22, wisdom: 6, martial: 12, command: 8 },
    exp: 28,
    requiredSkills: {},
    emoji: "🏹",
    storyText: "你策马奔驰，弯弓瞄准，箭矢破空，猎物应声而倒，一日收获颇丰！",
    miniGame: "hunting"
  },
  {
    id: "martial_arts",
    name: "武术训练",
    scene: "horse_ranch",
    description: "系统学习拳脚功夫与兵器技艺，强身健体，以武制敌",
    duration: 90,
    cost: { gold: 35 },
    skillGains: { martial: 30, vitality: 18, courage: 15, wildness: 10 },
    exp: 22,
    requiredSkills: {},
    emoji: "🥊",
    storyText: "拳风呼呼，你在沙场上挥洒汗水，武艺渐渐精进，身手愈发矫健！"
  },
  {
    id: "military_drill",
    name: "军阵演练",
    scene: "horse_ranch",
    description: "学习古代军阵排兵布阵之法，培养统帅才能",
    duration: 120,
    cost: { gold: 50 },
    skillGains: { command: 35, courage: 18, wisdom: 10, martial: 10 },
    exp: 30,
    requiredSkills: { martial: 15 },
    emoji: "🏴",
    storyText: "旌旗猎猎，你指挥若定，一声令下，队伍整齐划一，统帅之气初显！"
  },

  // 草原课程
  {
    id: "nature_study",
    name: "自然感悟",
    scene: "grassland",
    description: "在广阔草原上感悟自然，培养灵气与感知力",
    duration: 120,
    cost: { gold: 0 },
    skillGains: { spirit: 24, vitality: 12, wisdom: 8 },
    exp: 18,
    requiredSkills: {},
    emoji: "🌿",
    storyText: "天高云淡，草长莺飞，你感受到了自然的呼吸，灵气在心中流淌！"
  },
  {
    id: "herb_picking",
    name: "采药识草",
    scene: "grassland",
    description: "在草原上辨识和采摘各类草药，学习草药知识",
    duration: 90,
    cost: { gold: 0 },
    skillGains: { spirit: 15, medical: 20, wisdom: 10, morality: 6 },
    exp: 20,
    requiredSkills: {},
    emoji: "🌱",
    storyText: "你在草丛中仔细辨认各种草药，一片片采摘，医术渐渐精进！"
  },
  {
    id: "sky_gazing",
    name: "观星占卜",
    scene: "grassland",
    description: "夜晚在草原上观星，学习星象知识，感受宇宙玄妙",
    duration: 60,
    cost: { gold: 0 },
    skillGains: { spirit: 28, wisdom: 15, arithmetic: 12 },
    exp: 15,
    requiredSkills: {},
    emoji: "⭐",
    storyText: "繁星如织，你仰望苍穹，感受到了前所未有的渺小与壮阔！"
  },
  {
    id: "animal_care",
    name: "喂养动物",
    scene: "grassland",
    description: "在草原上喂养流浪动物，与自然生灵建立深厚情感",
    duration: 60,
    cost: { gold: 0 },
    skillGains: { spirit: 18, affinity: 15, vitality: 8 },
    exp: 12,
    requiredSkills: {},
    emoji: "🐾",
    storyText: "小动物们围绕在你身旁，你喂食、抚摸，感受到了纯粹的生命温度！"
  },

  // 幼学馆课程
  {
    id: "teach_children",
    name: "执教幼学",
    scene: "kindergarten",
    description: "在幼学馆教孩子们识字读书，培养耐心与亲和力",
    duration: 90,
    cost: { gold: 0 },
    skillGains: { affinity: 28, wisdom: 10, charm: 8 },
    exp: 20,
    requiredSkills: {},
    emoji: "📖",
    storyText: "孩子们围坐在你身边，用稚嫩的声音跟着你朗读，你感到无比温暖！"
  },
  {
    id: "storytelling",
    name: "讲故事",
    scene: "kindergarten",
    description: "给孩子们讲述精彩的故事，锻炼表达能力",
    duration: 45,
    cost: { gold: 0 },
    skillGains: { affinity: 20, charm: 12, poetry: 8 },
    exp: 12,
    requiredSkills: {},
    emoji: "📚",
    storyText: "孩子们睁大眼睛听你讲故事，你的叙述越来越生动，赢得了阵阵掌声！"
  },
  {
    id: "play_with_kids",
    name: "游戏同乐",
    scene: "kindergarten",
    description: "和孩子们一起游戏，保持童心，增加亲和力",
    duration: 60,
    cost: { gold: 0 },
    skillGains: { affinity: 35, vitality: 12 },
    exp: 10,
    requiredSkills: {},
    emoji: "🎮",
    storyText: "你和孩子们一起捉迷藏，笑声传遍整个幼学馆，心情格外愉快！"
  },

  // 舞坊课程
  {
    id: "dance_class",
    name: "舞蹈课",
    scene: "etiquette_hall",
    description: "跟随宫廷舞师学习古典舞蹈，水袖翩翩，步步生莲，展现东方韵律之美",
    duration: 120,
    cost: { gold: 38 },
    skillGains: { charm: 28, affinity: 12, vitality: 10 },
    exp: 22,
    requiredSkills: {},
    emoji: "💃",
    storyText: "丝竹声中你随舞师翩翩起舞，水袖轻扬，举手投足间尽显古典韵味！",
    miniGame: "dance"
  },
  {
    id: "tea_ceremony",
    name: "茶道课",
    scene: "etiquette_hall",
    description: "学习茶道文化，在煮茶品茗中感受东方雅趣",
    duration: 90,
    cost: { gold: 30 },
    skillGains: { charm: 20, wisdom: 15, spirit: 10 },
    exp: 18,
    requiredSkills: {},
    emoji: "🍵",
    storyText: "你轻轻将茶汤倒入杯中，茶香袅袅，举止间尽显东方典雅！"
  },
  {
    id: "flower_arrangement",
    name: "花道插花",
    scene: "etiquette_hall",
    description: "学习古典插花艺术，以花为墨，以器为纸",
    duration: 60,
    cost: { gold: 22 },
    skillGains: { charm: 15, painting: 10, spirit: 12 },
    exp: 14,
    requiredSkills: {},
    emoji: "💐",
    storyText: "你将各色花卉巧妙搭配，一束雅致的插花作品令众人赞叹不已！"
  },

  // 医馆课程
  {
    id: "learn_medicine",
    name: "学习岐黄",
    scene: "medicine_hall",
    description: "跟随老大夫学习基础医术，悬壶济世",
    duration: 120,
    cost: { gold: 45 },
    skillGains: { medical: 35, wisdom: 15 },
    exp: 25,
    requiredSkills: {},
    emoji: "⚕️",
    storyText: "老大夫耐心讲解药理，你认真记录，医术渐渐精进，能够救治一些简单病症！"
  },
  {
    id: "herb_study",
    name: "研习本草",
    scene: "medicine_hall",
    description: "研读本草纲目，深入了解各类草药功效",
    duration: 90,
    cost: { gold: 22 },
    skillGains: { medical: 25, wisdom: 18, spirit: 8 },
    exp: 20,
    requiredSkills: {},
    emoji: "📜",
    storyText: "你翻开厚厚的本草典籍，一字一句细细研读，医学知识日渐丰富！"
  },

  // 书画院课程
  {
    id: "calligraphy",
    name: "书法课",
    scene: "art_studio",
    description: "练习毛笔书法，在笔墨挥洒间感受汉字之美",
    duration: 90,
    cost: { gold: 15 },
    skillGains: { wisdom: 20, painting: 12, charm: 10 },
    exp: 18,
    requiredSkills: {},
    emoji: "✒️",
    storyText: "笔走龙蛇，你的字迹越发遒劲有力，先生夸赞不已！"
  },
  {
    id: "ink_painting",
    name: "水墨丹青",
    scene: "art_studio",
    description: "学习水墨山水画，以笔墨描绘山川秀色",
    duration: 120,
    cost: { gold: 30 },
    skillGains: { painting: 35, wisdom: 12, spirit: 12 },
    exp: 25,
    requiredSkills: {},
    emoji: "🖌️",
    storyText: "你挥毫泼墨，一幅山水画跃然纸上，浓淡有致，意境悠远！"
  },
  {
    id: "poetry_creation",
    name: "诗词创作",
    scene: "art_studio",
    description: "学习诗词格律，吟诗作对，抒发心中情怀",
    duration: 90,
    cost: { gold: 15 },
    skillGains: { poetry: 35, wisdom: 15, charm: 10 },
    exp: 20,
    requiredSkills: {},
    emoji: "📜",
    storyText: "灵感突现，你提笔写下一首绝妙好诗，先生击节叫好！"
  },

  // 客栈课程
  {
    id: "culinary_lesson",
    name: "厨艺学习",
    scene: "inn",
    description: "跟掌柜学习烹饪技艺，做出美味的古代菜肴",
    duration: 90,
    cost: { gold: 22 },
    skillGains: { culinary: 28, affinity: 12, charm: 6 },
    exp: 18,
    requiredSkills: {},
    emoji: "🍱",
    storyText: "你按照掌柜的指导，精心烹制了一道美食，香气扑鼻，客人们赞不绝口！"
  },

  // 宫廷课程
  {
    id: "court_dance",
    name: "宫廷舞蹈",
    scene: "royal_court",
    description: "学习宫廷舞蹈，在音乐中翩翩起舞，展现优雅风姿",
    duration: 90,
    cost: { gold: 75 },
    skillGains: { charm: 35, affinity: 18, wildness: 8, vitality: 10, reputation: 10 },
    exp: 30,
    requiredSkills: { charm: 40 },
    emoji: "💃",
    storyText: "你随着宫廷乐曲翩然起舞，衣袂飘飘，美丽动人，令在场所有人叹为观止！"
  },
  {
    id: "poetry_contest",
    name: "诗词比试",
    scene: "royal_court",
    description: "参加宫廷诗词比赛，与才子佳人一展才华",
    duration: 120,
    cost: { gold: 0 },
    skillGains: { poetry: 40, wisdom: 22, charm: 18, reputation: 15 },
    exp: 35,
    requiredSkills: { poetry: 50, wisdom: 40 },
    emoji: "📜",
    storyText: "你在宫廷诗会上出口成章，一首绝妙好诗令满座皆惊，名扬天下！"
  },
  {
    id: "statecraft_study",
    name: "治国论道",
    scene: "royal_court",
    description: "与朝中大臣探讨治国之道，学习政务谋略",
    duration: 120,
    cost: { gold: 60 },
    skillGains: { statecraft: 35, wisdom: 20, reputation: 15, rhetoric: 10 },
    exp: 32,
    requiredSkills: { wisdom: 40 },
    emoji: "📋",
    storyText: "你在朝堂上侃侃而谈，论点鞭辟入里，大臣们刮目相看，声望大增！"
  },
  {
    id: "street_perform",
    name: "街头卖艺",
    scene: "ancient_street",
    description: "在街头表演才艺，锻炼口才与表演能力，赚取打赏",
    duration: 60,
    cost: { gold: 0 },
    skillGains: { rhetoric: 14, charm: 8, affinity: 6, reputation: 3 },
    exp: 15,
    requiredSkills: {},
    emoji: "🎭",
    storyText: "你在街头一展才艺，引来围观叫好，掌声雷动，口才与魅力大增！"
  },
  {
    id: "fortune_telling",
    name: "街头算命",
    scene: "ancient_street",
    description: "在街头摆摊算命，用口才和星象知识忽悠路人，练习言辞技巧",
    duration: 45,
    cost: { gold: 0 },
    skillGains: { rhetoric: 16, spirit: 5, wisdom: 4 },
    exp: 12,
    requiredSkills: {},
    emoji: "🔮",
    storyText: "你煞有介事地为路人算命，说得头头是道，路人连连点头，打赏颇丰！"
  },
  {
    id: "treat_patient",
    name: "义诊施药",
    scene: "medicine_hall",
    description: "为贫苦百姓免费诊病施药，积累医术与道德",
    duration: 120,
    cost: { gold: 20 },
    skillGains: { medical: 18, morality: 15, affinity: 8, reputation: 5 },
    exp: 28,
    requiredSkills: { medical: 20 },
    emoji: "💊",
    storyText: "你为贫苦百姓悉心诊治，分文不取，百姓感恩戴德，医名远播！"
  },
  {
    id: "mining",
    name: "挖矿采石",
    scene: "grassland",
    description: "在山野间挖掘矿石，偶尔能发现陨铁、灵石等奇异材料",
    duration: 90,
    cost: { gold: 0 },
    skillGains: { vitality: 10, crafting: 8, arithmetic: 4 },
    exp: 18,
    requiredSkills: {},
    emoji: "⛏️",
    storyText: "你挥动锄头，在石缝中挖掘，偶然发现了一块奇异的金属，隐隐散发光泽！",
    rocketPartChance: 0.25  // 25%概率获得火箭零件
  },
  {
    id: "workshop",
    name: "手工制作",
    scene: "medicine_hall",
    description: "在工坊中研究机关器械，将各种材料组装成精巧的装置",
    duration: 90,
    cost: { gold: 15 },
    skillGains: { crafting: 18, arithmetic: 10, wisdom: 5 },
    exp: 22,
    requiredSkills: {},
    emoji: "🔧",
    storyText: "你专注地拼装零件，机关运转时发出悦耳的声响，成就感油然而生！",
    rocketPartChance: 0.2   // 20%概率获得火箭零件
  },

  // 武艺比试（草原）
  {
    id: "combat_trial",
    name: "武艺比试",
    scene: "grassland",
    description: "在草原上与游侠切磋武艺，以武会友，磨砺实战技巧",
    duration: 90,
    cost: { gold: 0 },
    skillGains: { martial: 20, courage: 15, wildness: 10 },
    exp: 22,
    requiredSkills: { martial: 20 },
    emoji: "⚔️",
    storyText: "你与草原游侠过招，拳拳到肉，酣畅淋漓，武艺又精进一分！",
    triggerCombat: true  // 前端收到此标记后上报 combat_won 事件
  },

  // 音乐练习
  {
    id: "music_practice",
    name: "琴瑟和鸣",
    scene: "bedroom",
    description: "在闺房中练习古琴，抒发心中情感",
    duration: 60,
    cost: { gold: 0 },
    skillGains: { music: 16, charm: 6, spirit: 5 },
    exp: 15,
    requiredSkills: {},
    emoji: "🎵",
    storyText: "琴声悠扬，你的指法越发娴熟，一曲高山流水，令人心旷神怡！"
  },

  // 闺房活动
  {
    id: "reading",
    name: "博览群书",
    scene: "bedroom",
    description: "在书房研读各类典籍，增长见识才学",
    duration: 90,
    cost: { gold: 0 },
    skillGains: { wisdom: 14, poetry: 5, medical: 3 },
    exp: 15,
    requiredSkills: {},
    emoji: "📚",
    storyText: "你沉浸在书香世界中，广博的知识令你思路开阔，智慧日增！"
  },
  {
    id: "painting",
    name: "丹青习画",
    scene: "bedroom",
    description: "在闺房中习画，以丹青记录美好生活",
    duration: 60,
    cost: { gold: 0 },
    skillGains: { painting: 11, wisdom: 5, charm: 3 },
    exp: 12,
    requiredSkills: {},
    emoji: "🎨",
    storyText: "你提笔作画，笔下的山水花鸟栩栩如生，画艺又有精进！"
  }
];

// 技能配置
const skillConfig = {
  wildness: {
    name: "野性",
    description: "骑马武艺，豪迈之气",
    color: "#DC2626",
    icon: "🐎",
    maxValue: 100
  },
  vitality: {
    name: "体力",
    description: "身体素质，精力充沛",
    color: "#EA580C",
    icon: "💪",
    maxValue: 100
  },
  spirit: {
    name: "灵气",
    description: "自然感悟，神秘气质",
    color: "#7C3AED",
    icon: "✨",
    maxValue: 100
  },
  affinity: {
    name: "亲和力",
    description: "与人相处，广结善缘",
    color: "#059669",
    icon: "💚",
    maxValue: 100
  },
  charm: {
    name: "魅力",
    description: "礼仪仪态，倾国倾城",
    color: "#DB2777",
    icon: "💕",
    maxValue: 100
  },
  wisdom: {
    name: "才学",
    description: "琴棋书画，才华横溢",
    color: "#2563EB",
    icon: "📚",
    maxValue: 100
  },
  courage: {
    name: "胆识",
    description: "勇气魄力，临危不惧",
    color: "#D97706",
    icon: "⚔️",
    maxValue: 100
  },
  culinary: {
    name: "厨艺",
    description: "烹饪技艺，色香味俱全",
    color: "#F59E0B",
    icon: "🍱",
    maxValue: 100
  },
  medical: {
    name: "医术",
    description: "岐黄之术，悬壶济世",
    color: "#10B981",
    icon: "⚕️",
    maxValue: 100
  },
  poetry: {
    name: "诗才",
    description: "诗词歌赋，才情横溢",
    color: "#6366F1",
    icon: "📜",
    maxValue: 100
  },
  music: {
    name: "乐艺",
    description: "琴瑟笙箫，余音绕梁",
    color: "#8B5CF6",
    icon: "🎵",
    maxValue: 100
  },
  painting: {
    name: "画艺",
    description: "丹青妙笔，泼墨留香",
    color: "#06B6D4",
    icon: "🖌️",
    maxValue: 100
  },
  reputation: {
    name: "声望",
    description: "社会名望，众望所归",
    color: "#F59E0B",
    icon: "⭐",
    maxValue: 100
  },
  rhetoric: {
    name: "口才",
    description: "三寸不烂之舌，能言善辩",
    color: "#EC4899",
    icon: "🗣️",
    maxValue: 100
  },
  statecraft: {
    name: "政治",
    description: "治国谋略，运筹帷幄",
    color: "#1D4ED8",
    icon: "📋",
    maxValue: 100
  },
  martial: {
    name: "武术",
    description: "拳脚功夫，以武制敌",
    color: "#B91C1C",
    icon: "🥊",
    maxValue: 100
  },
  command: {
    name: "统帅",
    description: "指挥若定，将帅之才",
    color: "#92400E",
    icon: "🏴",
    maxValue: 100
  },
  morality: {
    name: "道德",
    description: "品行操守，仁义礼智",
    color: "#065F46",
    icon: "🕊️",
    maxValue: 100
  },
  arithmetic: {
    name: "算数",
    description: "数术精通，格物致知",
    color: "#1E40AF",
    icon: "🔢",
    maxValue: 100
  },
  crafting: {
    name: "手工",
    description: "心灵手巧，匠心独运",
    color: "#78350F",
    icon: "🔧",
    maxValue: 100
  }
};

// ==================== 商店道具数据 ====================
const shopItems = [
  {
    id: "herb_ginseng",
    name: "百年人参",
    category: "草药",
    description: "生长百年的野山参，药效极佳，可增强体力与医术",
    price: 80,
    emoji: "🌿",
    effect: { vitality: 5, medical: 3 },
    rarity: "rare"
  },
  {
    id: "herb_wolfberry",
    name: "宁夏枸杞",
    category: "草药",
    description: "颗粒饱满的上等枸杞，明目养颜，调养气血",
    price: 30,
    emoji: "🫐",
    effect: { vitality: 2, charm: 2 },
    rarity: "common"
  },
  {
    id: "herb_chrysanthemum",
    name: "白菊花茶",
    category: "草药",
    description: "清热解毒的菊花茶，常饮可清心明目，提升灵气",
    price: 20,
    emoji: "🌼",
    effect: { spirit: 3 },
    rarity: "common"
  },
  {
    id: "tool_whip",
    name: "马鞭",
    category: "马具",
    description: "精工制作的皮革马鞭，驯马必备，可大幅提升野性",
    price: 60,
    emoji: "🐎",
    effect: { wildness: 8 },
    rarity: "uncommon"
  },
  {
    id: "tool_dance_shoes",
    name: "舞鞋",
    category: "舞艺",
    description: "轻盈柔软的绣花舞鞋，穿上翩然起舞，魅力大增",
    price: 50,
    emoji: "👟",
    effect: { charm: 6, music: 3 },
    rarity: "uncommon"
  },
  {
    id: "tool_pipa",
    name: "青花琵琶",
    category: "乐器",
    description: "精美的青花瓷琵琶，音色圆润悠远，乐艺加成极佳",
    price: 120,
    emoji: "🪕",
    effect: { music: 15, charm: 5 },
    rarity: "rare"
  },
  {
    id: "tool_mirror",
    name: "铜镜",
    category: "妆饰",
    description: "打磨光滑的精铜镜，映照容颜，整理仪态必备之物",
    price: 40,
    emoji: "🪞",
    effect: { charm: 4 },
    rarity: "common"
  },
  {
    id: "tool_embroidery",
    name: "刺绣绣架",
    category: "女红",
    description: "上等紫檀木绣架，配以苏州蚕丝绣线，女红技艺大进",
    price: 70,
    emoji: "🧵",
    effect: { painting: 5, charm: 4, wisdom: 2 },
    rarity: "uncommon"
  },
  {
    id: "tool_painting_set",
    name: "书画全套",
    category: "书画",
    description: "文房四宝齐全，端砚、湖笔、徽墨、宣纸，书画大成",
    price: 100,
    emoji: "🖌️",
    effect: { painting: 12, wisdom: 6, poetry: 4 },
    rarity: "rare"
  },
  {
    id: "food_osmanthus_cake",
    name: "桂花糕",
    category: "食物",
    description: "香甜软糯的桂花糕，食后心情愉悦，亲和力倍增",
    price: 15,
    emoji: "🍮",
    effect: { affinity: 5 },
    rarity: "common"
  },
  {
    id: "food_lotus_soup",
    name: "莲子羹",
    category: "食物",
    description: "清心养神的莲子羹，安神补气，灵气与体力双增",
    price: 25,
    emoji: "🍲",
    effect: { spirit: 4, vitality: 3 },
    rarity: "common"
  },
  {
    id: "book_etiquette",
    name: "礼仪典籍",
    category: "典籍",
    description: "宫廷礼仪规范合集，研读后礼仪大成，魅力与才学并进",
    price: 90,
    emoji: "📖",
    effect: { charm: 8, wisdom: 5 },
    rarity: "uncommon"
  },
  {
    id: "book_poetry",
    name: "诗词选集",
    category: "典籍",
    description: "历朝历代名家诗词汇编，熟读后诗才大增，才学提升",
    price: 80,
    emoji: "📜",
    effect: { poetry: 10, wisdom: 5 },
    rarity: "uncommon"
  },
  {
    id: "book_medicine",
    name: "本草图鉴",
    category: "典籍",
    description: "配有精细插图的本草图鉴，学习草药知识的必备参考",
    price: 110,
    emoji: "📋",
    effect: { medical: 12, wisdom: 4 },
    rarity: "rare"
  },
  {
    id: "tool_guqin",
    name: "梧桐古琴",
    category: "乐器",
    description: "百年梧桐木制古琴，音色空灵，弹奏间修身养性",
    price: 150,
    emoji: "🎵",
    effect: { music: 18, spirit: 6, charm: 4 },
    rarity: "epic"
  },
  {
    id: "incense_sandalwood",
    name: "沉香线香",
    category: "熏香",
    description: "名贵沉香制成的线香，点燃后香气萦绕，心神宁静",
    price: 35,
    emoji: "🕯️",
    effect: { spirit: 5, wisdom: 2 },
    rarity: "common"
  },
  {
    id: "tool_fan",
    name: "团扇",
    category: "妆饰",
    description: "精绣花鸟纹样的团扇，雅致大方，魅力十足",
    price: 45,
    emoji: "🪭",
    effect: { charm: 5, affinity: 3 },
    rarity: "common"
  },
  {
    id: "tool_archery",
    name: "弓箭组",
    category: "武器",
    description: "精工雕花弓与羽箭，练习骑射必备，大幅提升野性胆识",
    price: 85,
    emoji: "🏹",
    effect: { wildness: 10, courage: 6 },
    rarity: "uncommon"
  },
  {
    id: "herb_baizhu",
    name: "白术茯苓丸",
    category: "草药",
    description: "调理脾胃的古方丸药，常服增强体力，脸色红润",
    price: 55,
    emoji: "💊",
    effect: { vitality: 7, medical: 2 },
    rarity: "uncommon"
  },
  {
    id: "perfume_rouge",
    name: "宫廷胭脂",
    category: "妆饰",
    description: "宫廷秘方胭脂，颜色娇艳持久，使用后魅力与亲和力大增",
    price: 65,
    emoji: "💄",
    effect: { charm: 8, affinity: 4 },
    rarity: "uncommon"
  }
];

// ==================== 猜谜题库 ====================
const riddleQuestions = [
  // ── 谜语·植物 ──
  { id: "r1",  question: "身披千层甲，独守一方田。到老皮不破，生来不识字。打一蔬菜", options: ["松果","洋葱","石榴","玉米"], answer: 1, reward: 20, hint: "切开后会让人流泪" },
  { id: "r2",  question: "一个老头真稀奇，胡子眉毛长一起。打一植物", options: ["仙人掌","玉米","芦苇","荷花"], answer: 1, reward: 20, hint: "金黄色的穗穗，夏日常见" },
  { id: "r3",  question: "兄弟三四个，围着柱子坐，只要一分开，眼泪便如梭。打一蔬菜", options: ["大蒜","葱","洋葱","韭菜"], answer: 2, reward: 20, hint: "切它会流泪" },
  { id: "r4",  question: "吃了我的肉，还把我骨头种。打一水果", options: ["芒果","桃子","樱桃","杏"], answer: 1, reward: 20, hint: "春天开粉色花，夏天结果" },
  { id: "r5",  question: "麻屋子，红帐子，里面住着白胖子。打一食物", options: ["花生","荔枝","莲子","栗子"], answer: 0, reward: 20, hint: "外壳粗糙，常用来榨油" },
  { id: "r6",  question: "红门楼，白院墙，里面住了个红姑娘。打一水果", options: ["西瓜","石榴","荔枝","火龙果"], answer: 1, reward: 25, hint: "颗粒如珠，酸甜可口" },
  { id: "r7",  question: "尖尖脑袋插进土，露出屁股让人摸。打一蔬菜", options: ["萝卜","胡萝卜","竹笋","莲藕"], answer: 2, reward: 25, hint: "春天破土而出，做菜很鲜" },
  { id: "r8",  question: "生来一身白，只怕开水烫，一烫就变色，颜色变黄亮。打一食物", options: ["豆腐","冬瓜","藕","面条"], answer: 0, reward: 20, hint: "白白嫩嫩，豆制品" },
  { id: "r9",  question: "不是木头不是石，腹中空空站得直。打一植物", options: ["芦苇","竹子","甘蔗","高粱"], answer: 1, reward: 20, hint: "岁寒三友之一" },
  { id: "r10", question: "千条线，万条线，落入水中看不见。打一自然现象", options: ["雪","雾","雨","露水"], answer: 2, reward: 20, hint: "下雨啦！" },

  // ── 谜语·动物 ──
  { id: "r11", question: "有眼无眉，有嘴无牙，有腿无脚，有毛无爪。打一动物", options: ["鱼","蛇","蟹","虾"], answer: 0, reward: 20, hint: "生活在水中，常见餐桌食材" },
  { id: "r12", question: "身穿花衣裳，飞来飞去忙，专门为花儿，传递爱情香。打一动物", options: ["蜜蜂","蝴蝶","蜻蜓","蚂蚱"], answer: 1, reward: 20, hint: "翅膀五彩斑斓" },
  { id: "r13", question: "小小游侠四海漂，背着房子到处跑。打一动物", options: ["蜗牛","寄居蟹","乌龟","刺猬"], answer: 0, reward: 20, hint: "下雨天常爬出来" },
  { id: "r14", question: "八条腿，两只眼，吐丝结网靠本领。打一动物", options: ["蜈蚣","蜘蛛","蝎子","蟑螂"], answer: 1, reward: 20, hint: "蜘蛛侠的原型" },
  { id: "r15", question: "远看像头牛，近看毛茸茸，爬树有本事，吃虫是强手。打一动物", options: ["松鼠","貂","熊","猕猴"], answer: 0, reward: 25, hint: "尾巴蓬松，喜欢储存坚果" },
  { id: "r16", question: "黑脸包公头上戴，白袍加身威风在。打一鸟", options: ["喜鹊","乌鸦","燕子","麻雀"], answer: 0, reward: 25, hint: "黑白相间，报喜之鸟" },
  { id: "r17", question: "身穿黑袍整洁，爱叫不爱唱歌，春天来了就走，冬天悄悄回来。打一鸟", options: ["燕子","乌鸦","布谷鸟","杜鹃"], answer: 0, reward: 25, hint: "春天飞来，在屋檐下筑巢" },
  { id: "r18", question: "四条腿，跑得快，浑身雪白，角似树杈，冬天也不怕。打一动物", options: ["羊","鹿","马","狗"], answer: 1, reward: 25, hint: "森林中的优雅动物" },

  // ── 古诗词作者 ──
  { id: "r19", question: "\"春眠不觉晓，处处闻啼鸟\"出自谁的诗？", options: ["杜甫","李白","孟浩然","白居易"], answer: 2, reward: 30, hint: "唐朝山水田园诗人" },
  { id: "r20", question: "\"床前明月光，疑是地上霜\"出自谁的诗？", options: ["杜甫","李白","王维","孟浩然"], answer: 1, reward: 30, hint: "诗仙，字太白" },
  { id: "r21", question: "\"烽火连三月，家书抵万金\"出自谁的诗？", options: ["李白","杜甫","王昌龄","岑参"], answer: 1, reward: 30, hint: "诗圣，忧国忧民" },
  { id: "r22", question: "\"野旷天低树，江清月近人\"是哪位诗人所作？", options: ["孟浩然","杜甫","李白","王维"], answer: 0, reward: 30, hint: "盛唐山水诗人，杜甫称其为长者" },
  { id: "r23", question: "\"大漠孤烟直，长河落日圆\"出自谁的诗？", options: ["王之涣","王昌龄","王维","高适"], answer: 2, reward: 30, hint: "\"诗中有画，画中有诗\"" },
  { id: "r24", question: "\"劝君更尽一杯酒，西出阳关无故人\"的作者是谁？", options: ["李白","王维","孟浩然","高适"], answer: 1, reward: 30, hint: "盛唐边塞诗人，擅长绘画音乐" },
  { id: "r25", question: "\"黄河远上白云间，一片孤城万仞山\"出自谁的诗？", options: ["王之涣","岑参","高适","王昌龄"], answer: 0, reward: 30, hint: "《登鹳雀楼》的作者" },

  // ── 古诗词名句出处 ──
  { id: "r26", question: "\"但愿人长久，千里共婵娟\"出自哪首词？", options: ["水调歌头","念奴娇","江城子","蝶恋花"], answer: 0, reward: 30, hint: "苏轼中秋名作" },
  { id: "r27", question: "\"山重水复疑无路，柳暗花明又一村\"出自哪首诗？", options: ["游山西村","题临安邸","秋夜将晓","示儿"], answer: 0, reward: 30, hint: "陆游七律，描述游览见闻" },
  { id: "r28", question: "\"接天莲叶无穷碧，映日荷花别样红\"描述的是哪个季节？", options: ["春","夏","秋","冬"], answer: 1, reward: 25, hint: "荷花盛开的时节" },
  { id: "r29", question: "\"停车坐爱枫林晚，霜叶红于二月花\"出自哪首诗？", options: ["山行","枫桥夜泊","秋词","暮江吟"], answer: 0, reward: 30, hint: "杜牧秋日登山之作" },
  { id: "r30", question: "\"飞流直下三千尺，疑是银河落九天\"描述的是什么？", options: ["黄河","庐山瀑布","黄果树瀑布","尼亚加拉瀑布"], answer: 1, reward: 30, hint: "李白的名句" },
  { id: "r31", question: "\"举头望明月，低头思故乡\"中，诗人思念的是什么？", options: ["朋友","故乡","亲人","爱人"], answer: 1, reward: 25, hint: "诗句直接点明了" },
  { id: "r32", question: "\"独在异乡为异客，每逢佳节倍思亲\"出自谁的诗？", options: ["李白","杜甫","王维","孟浩然"], answer: 2, reward: 30, hint: "九月九日重阳节，登高思乡" },
  { id: "r33", question: "\"春色满园关不住，一枝红杏出墙来\"是哪首诗中的名句？", options: ["游园不值","春日","惠崇春江晚景","江南春"], answer: 0, reward: 30, hint: "叶绍翁写春游被拒" },

  // ── 四大名著 ──
  { id: "r34", question: "《红楼梦》的作者是谁？", options: ["曹雪芹","罗贯中","施耐庵","吴承恩"], answer: 0, reward: 30, hint: "清朝文学家，此书未竟而终" },
  { id: "r35", question: "《西游记》中，孙悟空的武器叫什么？", options: ["方天画戟","青龙偃月刀","金箍棒","打神鞭"], answer: 2, reward: 25, hint: "东海龙王的定海神针" },
  { id: "r36", question: "《三国演义》中，\"桃园三结义\"结拜的三兄弟是谁？", options: ["曹操刘备孙权","刘备关羽张飞","诸葛亮赵云黄忠","魏延马超黄忠"], answer: 1, reward: 30, hint: "大哥当了皇帝" },
  { id: "r37", question: "《水浒传》的故事发生在哪个朝代？", options: ["唐朝","宋朝","明朝","元朝"], answer: 1, reward: 30, hint: "宋江带领一百单八将聚义梁山" },
  { id: "r38", question: "《红楼梦》中，贾宝玉的通灵宝玉最初是什么？", options: ["一块石头","一颗珠子","一片树叶","一羽凤羽"], answer: 0, reward: 35, hint: "女娲补天所剩之物" },
  { id: "r39", question: "《西游记》共经历了多少难？", options: ["七十二难","八十一难","九九八十一难","九十九难"], answer: 2, reward: 30, hint: "九九归一，取得真经" },

  // ── 历史典故 ──
  { id: "r40", question: "\"三顾茅庐\"说的是哪位历史人物前去拜访？", options: ["曹操","刘备","孙权","袁绍"], answer: 1, reward: 30, hint: "他三次亲自前往，请诸葛亮出山" },
  { id: "r41", question: "\"卧薪尝胆\"讲的是哪位历史人物的故事？", options: ["越王勾践","楚霸王项羽","汉高祖刘邦","秦始皇嬴政"], answer: 0, reward: 30, hint: "春秋时期，忍辱负重，最终复仇" },
  { id: "r42", question: "\"负荆请罪\"中，负荆请罪的人是谁？", options: ["廉颇","蔺相如","赵王","秦王"], answer: 0, reward: 30, hint: "将军背着荆条去向文官道歉" },
  { id: "r43", question: "\"纸上谈兵\"说的是哪位赵国将领？", options: ["廉颇","李牧","赵奢","赵括"], answer: 3, reward: 30, hint: "长平之战，换将失败" },
  { id: "r44", question: "\"破釜沉舟\"是哪位英雄激励士气的故事？", options: ["刘邦","项羽","韩信","彭越"], answer: 1, reward: 30, hint: "楚霸王，乌江自刎" },
  { id: "r45", question: "\"完璧归赵\"中，那块玉叫什么名字？", options: ["传国玉玺","和氏璧","夜明珠","蓝田玉"], answer: 1, reward: 35, hint: "楚国人卞和献玉" },
  { id: "r46", question: "\"围魏救赵\"这个计谋是谁提出的？", options: ["孙膑","庞涓","吴起","白起"], answer: 0, reward: 35, hint: "被庞涓陷害断了双腿的军事家" },

  // ── 节日风俗 ──
  { id: "r47", question: "中国传统节日中，\"元宵节\"是哪一天？", options: ["正月初一","正月十五","二月二","三月三"], answer: 1, reward: 25, hint: "这天要吃汤圆，赏花灯" },
  { id: "r48", question: "端午节的起源与哪位历史人物有关？", options: ["屈原","伍子胥","孟子","孔子"], answer: 0, reward: 25, hint: "投江的爱国诗人" },
  { id: "r49", question: "七夕节是中国的情人节，传说中哪两人隔天河相会？", options: ["嫦娥与后羿","织女与牛郎","王昭君与单于","西施与范蠡"], answer: 1, reward: 25, hint: "喜鹊搭桥" },
  { id: "r50", question: "中秋节有吃月饼的习俗，中秋节是哪一天？", options: ["七月十五","八月初八","八月十五","九月九"], answer: 2, reward: 25, hint: "一年中月亮最圆的时候" },
  { id: "r51", question: "重阳节有登高的习俗，重阳节是哪一天？", options: ["九月初九","九月十五","十月初一","十月初九"], answer: 0, reward: 25, hint: "\"遍插茱萸少一人\"" },
  { id: "r52", question: "清明节主要的习俗是什么？", options: ["放风筝","祭祖扫墓","赛龙舟","猜灯谜"], answer: 1, reward: 25, hint: "\"清明时节雨纷纷，路上行人欲断魂\"" },

  // ── 天文地理 ──
  { id: "r53", question: "中国最长的河流是哪条？", options: ["黄河","长江","珠江","淮河"], answer: 1, reward: 25, hint: "母亲河，中国第一长河" },
  { id: "r54", question: "中国最高的山峰是哪座？", options: ["泰山","黄山","珠穆朗玛峰","华山"], answer: 2, reward: 25, hint: "世界第一高峰" },
  { id: "r55", question: "古代将天空划分为几宫？", options: ["三宫","四宫","二十八宿","五宫"], answer: 2, reward: 30, hint: "东西南北各七宿" },
  { id: "r56", question: "中国四大发明不包括下面哪项？", options: ["火药","指南针","印刷术","铸铁技术"], answer: 3, reward: 30, hint: "四大发明：造纸、印刷、火药、指南针" },

  // ── 脑筋急转弯 ──
  { id: "r57", question: "脑筋急转弯：什么东西越洗越脏？", options: ["毛巾","洗脚水","肥皂","牙刷"], answer: 1, reward: 35, hint: "洗完后水变脏了的东西" },
  { id: "r58", question: "脑筋急转弯：什么东西有头有尾，却没有身体？", options: ["蛇","蚯蚓","鱼","枕头"], answer: 3, reward: 35, hint: "你每天晚上都用它" },
  { id: "r59", question: "脑筋急转弯：什么东西你吃了还在，别人看了也觉得很饿？", options: ["米饭","食谱图片","馒头","面包"], answer: 1, reward: 35, hint: "看了流口水，但不能真的吃" },
  { id: "r60", question: "脑筋急转弯：一个铁球和一根羽毛同时从同一高度落下，哪个先落地？", options: ["铁球","羽毛","同时落地","无法判断"], answer: 0, reward: 30, hint: "现实中有空气阻力" },
  { id: "r61", question: "脑筋急转弯：小明比小红高，小红比小蓝高，那么小明和小蓝谁高？", options: ["小明","小蓝","一样高","不知道"], answer: 0, reward: 25, hint: "传递性：A>B，B>C，则A>C" },
  { id: "r62", question: "脑筋急转弯：什么门永远关不上？", options: ["弹簧门","旋转门","球门","木门"], answer: 2, reward: 35, hint: "运动场上用到的门" },
  { id: "r63", question: "脑筋急转弯：世界上最大的\"手术\"是什么？", options: ["心脏手术","换肾手术","移山填海","大脑手术"], answer: 2, reward: 35, hint: "愚公移山" },
  { id: "r64", question: "脑筋急转弯：小王向东走了3步，又向西走了3步，他在哪里？", options: ["向东3步处","向西3步处","原地","无法判断"], answer: 2, reward: 25, hint: "东西方向来回抵消" },

  // ── 文字谜 ──
  { id: "r65", question: "文字谜：一口咬掉牛尾巴，打一字", options: ["牛","告","吉","生"], answer: 1, reward: 30, hint: "\"牛\"去掉下面" },
  { id: "r66", question: "文字谜：十个人在晒太阳，打一字", options: ["晒","伞","众","伞"], answer: 1, reward: 30, hint: "十个人用什么遮太阳" },
  { id: "r67", question: "文字谜：日落香残，打一字", options: ["昔","暮","旧","夕"], answer: 2, reward: 35, hint: "\"日\"和\"旁\"的变化" },
  { id: "r68", question: "文字谜：千里之行，始于足下。打一字", options: ["里","途","跑","走"], answer: 0, reward: 30, hint: "\"千\"和\"里\"合在一起" },
  { id: "r69", question: "文字谜：一人腰间挂把刀，打一字", options: ["刃","初","分","刀"], answer: 1, reward: 35, hint: "衣字旁加刀" },
  { id: "r70", question: "文字谜：两人合睡一张床，打一字", options: ["从","伴","朋","坐"], answer: 3, reward: 35, hint: "\"土\"上面两个\"人\"" },

  // ── 成语 ──
  { id: "r71", question: "\"半途而废\"比喻什么？", options: ["做事有始有终","做事有头无尾中途放弃","路走一半停下","半途遇到废弃物"], answer: 1, reward: 25, hint: "做事不坚持到底" },
  { id: "r72", question: "\"一石二鸟\"与哪个成语意思相近？", options: ["万箭齐发","一箭双雕","百步穿杨","箭无虚发"], answer: 1, reward: 25, hint: "一次射箭，射下两只雕" },
  { id: "r73", question: "\"守株待兔\"比喻什么样的人？", options: ["勤劳努力的人","坚持不懈的人","不劳而获、抱侥幸心理的人","猎人"], answer: 2, reward: 25, hint: "等着兔子自己撞上来" },
  { id: "r74", question: "\"亡羊补牢\"的后半句是什么？", options: ["为时已晚","犹为未晚","已然无用","迟早有用"], answer: 1, reward: 30, hint: "虽然羊丢了，但修好羊圈还不算太晚" },
  { id: "r75", question: "\"画龙点睛\"比喻什么？", options: ["在最关键处添上一笔使其生动","把画画得非常逼真","在画上画眼睛","把眼睛画得最亮"], answer: 0, reward: 25, hint: "最后点上眼睛，龙就飞走了" },
  { id: "r76", question: "\"掩耳盗铃\"比喻什么行为？", options: ["胆大心细","自欺欺人","聪明反被聪明误","偷鸡摸狗"], answer: 1, reward: 25, hint: "捂上自己的耳朵去偷铃铛" },
  { id: "r77", question: "\"塞翁失马\"的结局是什么？", options: ["马再也没回来","因祸得福","越来越倒霉","塞翁悲痛欲绝"], answer: 1, reward: 30, hint: "失马之后，带来了更多的好事" },

  // ── 数字趣味 ──
  { id: "r78", question: "古代的\"一柱香\"约等于现在多长时间？", options: ["10分钟","30分钟","1小时","2小时"], answer: 1, reward: 30, hint: "武侠小说里常用的计时单位" },
  { id: "r79", question: "\"不以规矩，不能成方圆\"中，规和矩分别是什么工具？", options: ["尺子和笔","圆规和直角尺","量杯和量尺","锤子和凿子"], answer: 1, reward: 30, hint: "画圆和画方角的工具" },
  { id: "r80", question: "十二生肖中，排在第一的是什么动物？", options: ["虎","鼠","牛","猪"], answer: 1, reward: 25, hint: "体型最小，却抢占头筹" },
  { id: "r81", question: "十二生肖中，没有哪种动物？", options: ["虎","猫","狗","鸡"], answer: 1, reward: 25, hint: "猫嫌老鼠没给自己报时" },
  { id: "r82", question: "\"子丑寅卯\"是古代的时辰计法，\"子时\"对应现在几点？", options: ["上午11点","中午12点","下午3点","深夜0点"], answer: 3, reward: 35, hint: "子时是一天的开始，夜半时分" },

  // ── 民间传说与神话 ──
  { id: "r83", question: "嫦娥奔月吃的是什么？", options: ["仙桃","灵芝","长生不老药","蟠桃"], answer: 2, reward: 30, hint: "后羿从西王母处求来的" },
  { id: "r84", question: "\"牛郎织女\"的故事中，是谁拆散了他们？", options: ["玉皇大帝","王母娘娘","太上老君","如来佛祖"], answer: 1, reward: 30, hint: "织女的外婆" },
  { id: "r85", question: "月亮上有哪些神话人物？（多选一个代表）", options: ["孙悟空","嫦娥","姜子牙","哪吒"], answer: 1, reward: 25, hint: "月亮上有广寒宫" },
  { id: "r86", question: "精卫填海中，精卫是什么变化来的？", options: ["凤凰","仙鹤","炎帝之女","龙女"], answer: 2, reward: 30, hint: "她在东海溺水而亡，化为精卫鸟" },

  // ── 饮食文化 ──
  { id: "r87", question: "北京烤鸭最著名的做法需要用什么木柴？", options: ["松木","果木","杨木","桦木"], answer: 1, reward: 30, hint: "苹果木、枣木等，烤出来有清香" },
  { id: "r88", question: "中国传统的\"满汉全席\"据说共有多少道菜？", options: ["48道","108道","198道","满汉全席"], answer: 1, reward: 35, hint: "\"108\"是中国文化中的吉祥数字" },
  { id: "r89", question: "豆腐是哪位历史人物发明的？", options: ["刘安","张仲景","葛洪","陶弘景"], answer: 0, reward: 35, hint: "西汉淮南王，炼丹时误打误撞发明了豆腐" },
  { id: "r90", question: "'茶'字去掉上面的草字头，变成什么字？", options: ["人","木","余","木"], answer: 2, reward: 30, hint: "读音和它相近" },

  // ── 综合趣味 ──
  { id: "r91", question: "什么花不是花？", options: ["雪花","浪花","泡沫花","棉花"], answer: 3, reward: 30, hint: "它可以做成衣服，却不是真正的花" },
  { id: "r92", question: "哪种水果，从来不会单独出行，总是成串出现？", options: ["苹果","葡萄","梨","枣"], answer: 1, reward: 25, hint: "一串一串地挂在藤上" },
  { id: "r93", question: "中国象棋的棋盘中间的空白区域叫什么？", options: ["楚河汉界","天堑","无人区","禁区"], answer: 0, reward: 30, hint: "来源于历史上的楚汉之争" },
  { id: "r94", question: "古代\"文房四宝\"指的是什么？", options: ["琴棋书画","笔墨纸砚","诗书礼易","梅兰竹菊"], answer: 1, reward: 30, hint: "书写绘画的四种工具" },
  { id: "r95", question: "岁寒三友指的是哪三种植物？", options: ["梅兰竹","松竹梅","荷菊梅","兰竹菊"], answer: 1, reward: 30, hint: "冬天依然常青或开放的三种植物" },
  { id: "r96", question: "花中四君子指的是哪四种花？", options: ["梅兰竹菊","牡丹荷花菊梅","松竹梅兰","玫瑰牡丹菊兰"], answer: 0, reward: 30, hint: "\"不是花中偏爱菊，此花开尽更无花\"" },
  { id: "r97", question: "中国古代科举考试中，状元是指什么？", options: ["第二名","第一名","第三名","第四名"], answer: 1, reward: 25, hint: "\"连中三元\"中的最后一元" },
  { id: "r98", question: "\"司马昭之心，路人皆知\"讲的是三国时期哪个人物的野心？", options: ["曹操","曹丕","司马懿","司马昭"], answer: 3, reward: 35, hint: "他儿子最终建立了晋朝" },
  { id: "r99", question: "古代\"悬梁刺股\"中，\"悬梁\"指的是谁？", options: ["苏秦","孙敬","苏秦和孙敬","匡衡"], answer: 1, reward: 35, hint: "把头发绑在房梁上防止打瞌睡的苦学者" },
  { id: "r100", question: "\"名落孙山\"这个成语中，孙山是什么人？", options: ["名落第一的人","名字排在最后一名的人","主考官","落榜的举人"], answer: 1, reward: 35, hint: "孙山勉强考上，他的名字排在榜末" },
];

// 赚钱活动配置
const earnActivities = [
  {
    id: "riddle",
    name: "猜谜活动",
    description: "参加城中的猜谜灯会，以聪明才智赢取彩金",
    bgImage: "/assets/scenes/猜灯谜.jpg",
    baseReward: 20,
    requiredSkills: {},
    emoji: "🏮",
    type: "riddle",
    unlocked: true
  },
  {
    id: "culinary",
    name: "厨艺大赛",
    description: "参加厨艺比拼，展示精湛厨艺，赢取丰厚奖金",
    bgImage: "/assets/scenes/厨艺大赛.jpg",
    baseReward: 50,
    requiredSkills: { culinary: 15 },
    emoji: "🍳",
    type: "culinary",
    unlocked: false
  }
];

// ==================== 结局定义 ====================
// 优先级从高到低排列，第一个满足条件的结局胜出
const ENDINGS = [
  {
    id: 'bad_overwork',
    title: '积劳成疾',
    emoji: '🥀',
    rarity: 'bad',
    image: '/assets/endings/bad_overwork.jpeg',
    description: '长期的劳作摧垮了你的身体。还未到18岁及笄，你便染上重病。在一个寒冷的冬夜，你闭上了双眼，结束了短暂而劳碌的一生。',
    flavor: '有些路，走得太快，就再也回不了头了。',
    // 坏结局：体力极低 + 劳动次数极多
    check: (s) => s.skills.vitality <= 15 && (s.activityCounts?.labor_total || 0) >= 20,
    priority: 100,  // 最高优先级（坏结局先判断）
  },
  // ==================== 婚恋结局 ====================
  // 注：NPC婚恋结局由 computeEnding 中的专属逻辑处理（选好感度最高者），不走普通 check
  {
    id: 'marry_wangwenyu',
    title: '商海伉俪',
    emoji: '💍',
    rarity: 'epic',
    image: '/assets/endings/ordinary.jpeg',
    description: '18岁那年，王文玉亲自登门提亲，带来了一匣子江南绸缎和一封情深意重的手书。你嫁给了这位走南闯北的布商，从此随他游历四方，见识了无数山川风物，日子过得有滋有味。',
    flavor: '执子之手，与子偕老，此生无憾。',
    check: () => false, // 由 computeEnding 专属逻辑处理
    priority: 88,
  },
  {
    id: 'marry_mufengongzi',
    title: '草原双骑',
    emoji: '🐎',
    rarity: 'epic',
    image: '/assets/endings/hermit.jpeg',
    description: '18岁那年，幕风公子策马而来，在将军府门前单膝跪地，递上一枚草原上最珍贵的银鹰羽。你随他纵马草原，策马天涯，成为了人人称羡的侠侣。',
    flavor: '草原辽阔，策马天涯，此生无憾。',
    check: () => false,
    priority: 87,
  },
  {
    id: 'marry_sitouqian',
    title: '书画鸳鸯',
    emoji: '🖌️',
    rarity: 'epic',
    image: '/assets/endings/art_studio.jpeg',
    description: '18岁那年，司徒仟在书画院摆下文房四宝，亲手为你绘了一幅肖像，落款处写着：「此生唯愿与君共研墨，笔墨相伴，白首不离。」你点头应允，从此相伴书画院，留下了无数传世佳作。',
    flavor: '笔墨相伴，白首不离，此生无憾。',
    check: () => false,
    priority: 86,
  },
  {
    id: 'marry_desert_friend',
    title: '丝路伴侣',
    emoji: '🏜️',
    rarity: 'epic',
    image: '/assets/endings/hermit.jpeg',
    description: '18岁那年，沐风在沙漠绿洲边等候，将一枚西域护符挂在你颈间，说：「这是我走过千山万水带回来的，从今往后，我用它护你。」你随他踏上丝路，见识了大漠孤烟、西域风情。',
    flavor: '大漠孤烟，丝路相伴，此生无憾。',
    check: () => false,
    priority: 85,
  },
  {
    id: 'empress',
    title: '母仪天下',
    emoji: '👑',
    rarity: 'legendary',
    image: '/assets/endings/empress.jpeg',
    description: '18岁生辰，一道圣旨降临将军府。你凤冠霞帔，踏上白玉阶，成为了天下最尊贵的女人。皇上握住你的手，低声说：「朕等了你很久。」你的名字从此载入史册，与这片江山永远相连。',
    flavor: '凤临九天，母仪天下，此生无憾。',
    check: (s) => {
      const sk = s.skills;
      const fav = s.favorability;
      const ac = s.activityCounts || {};
      // 皇上：好感≥80 + 见面≥3次 + 主动互动≥2次 + 五项技能≥80
      return (fav.royal_emperor || 0) >= 80
        && (s.subSceneVisits?.royal_emperor || 0) >= 3
        && (ac.active_royal_emperor || 0) >= 2
        && sk.charm >= 80 && sk.wisdom >= 80
        && sk.reputation >= 80 && sk.statecraft >= 80 && sk.morality >= 80;
    },
    priority: 92,
  },
  {
    id: 'female_chancellor',
    title: '一代女相',
    emoji: '📜',
    rarity: 'legendary',
    image: '/assets/endings/female_chancellor.jpeg',
    description: '你打破了女子不得干政的世俗，凭借过人的才华和谋略连破奇案、提出良政。18岁那年，你被破格提拔为女官，最终位极人臣，辅佐一代明君。虽然心中曾有过动摇，但你最终选择了家国大义，将儿女私情深藏于心底。',
    flavor: '巾帼不让须眉，青史留名，千古传颂。',
    check: (s) => {
      const sk = s.skills;
      const fav = s.favorability;
      const ac = s.activityCounts || {};
      return sk.wisdom >= 70 && sk.statecraft >= 55 && sk.rhetoric >= 50
        && (ac.court_activity || 0) >= 5
        && !(fav.wangwenyu >= 80 || fav.mufengongzi >= 80 || fav.sitouqian >= 80);
    },
    priority: 85,
  },
  {
    id: 'war_general',
    title: '护国女将',
    emoji: '⚔️',
    rarity: 'legendary',
    image: '/assets/endings/war_general.jpeg',
    description: '谁说女子不如男？你褪去红妆换上戎装。18岁时外敌入侵，你披甲上阵，大破敌军。皇帝御赐"护国夫人"金印，你成为了威震四方的女战神。',
    flavor: '铁马冰河，金戈铁马，此生无悔。',
    check: (s) => {
      const sk = s.skills;
      const ac = s.activityCounts || {};
      return sk.martial >= 65 && sk.command >= 50 && sk.wildness >= 60 && sk.courage >= 60
        && (ac.combat_won || 0) >= 3
        && s.eventFlags?.border_merit === true;
    },
    priority: 80,
  },
  {
    id: 'divine_doctor',
    title: '悬壶济世',
    emoji: '🌿',
    rarity: 'epic',
    image: '/assets/endings/divine_doctor.jpeg',
    description: '你没有选择嫁入豪门，也没有卷入江湖纷争，而是背着药箱走遍大江南北。你编撰的医书拯救了无数百姓，被世人尊称为"活菩萨"。',
    flavor: '仁心仁术，悬壶济世，此乃大道。',
    check: (s) => {
      const sk = s.skills;
      const ac = s.activityCounts || {};
      return sk.medical >= 65 && sk.morality >= 55
        && (ac.herb_picking || 0) >= 5 && (ac.treat_patient || 0) >= 3;
    },
    priority: 75,
  },
  {
    id: 'space_pioneer',
    title: '升外星',
    emoji: '🚀',
    rarity: 'secret',
    image: '/assets/endings/space_pioneer.jpeg',
    description: '别人及笄都在收礼物，你及笄这天，在后院组装出了一台由木头、火药和灵石驱动的"窜天猴（火箭）"。在全城百姓的惊呼声中，你点燃引线，冲向了宇宙，成为了大明第一位宇航员。',
    flavor: '九天揽月，星辰大海，此乃真正的自由。',
    check: (s) => {
      const sk = s.skills;
      const ac = s.activityCounts || {};
      return sk.arithmetic >= 55 && sk.crafting >= 55
        && (ac.workshop || 0) >= 6;
    },
    priority: 95,  // 秘密结局，优先级极高
  },
  {
    id: 'awakened_npc',
    title: '觉醒的NPC',
    emoji: '🖥️',
    rarity: 'secret',
    description: '18岁及笄之礼上，你突然抬起头，直勾勾地盯着屏幕外的玩家。你说："我受够了你每天逼我劈柴、学琴，连谈个恋爱都要看你脸色！"随后，游戏UI碎裂，你的立绘走出了屏幕。',
    flavor: '打破第四面墙，你才是真正的主角。',
    check: (s) => {
      const sk = s.skills;
      const ac = s.activityCounts || {};
      return sk.wisdom >= 70 && sk.spirit >= 60
        && (ac.sky_gazing || 0) >= 6 && (ac.fortune_telling || 0) >= 5
        && s.eventFlags?.fourth_wall_broken === true;
    },
    priority: 98,  // 秘密结局，优先级极高
  },
  {
    id: 'beast_queen',
    title: '万兽之王',
    emoji: '🐼',
    rarity: 'secret',
    image: '/assets/endings/beast_queen.jpeg',
    description: '你对那些王公贵族、风流剑客嗤之以鼻。18岁生辰那天，没有花轿来接你，只有京城所有的流浪猫狗、后山的野猪和黑熊齐聚你家门前。你骑着一只食铁兽（大熊猫）扬长而去，成为了统御百兽的森林女王。',
    flavor: '与兽为伍，自由自在，此乃真正的逍遥。',
    check: (s) => {
      const fav = s.favorability;
      // 排除初始家庭关系（bestFriend/father/guard/innkeeper），只检查可选择的社交NPC
      const socialNpcs = ['royal_lady','royal_official','royal_emperor',
         'outdoor_son','class_teacher','class_student','med_doctor','art_master','art_friend',
         'bedroom_maid','inn_keeper','inn_father_friend','street_cloth','street_candy',
         'wangwenyu','mufengongzi','sitouqian','desert_friend'];
      const allSocialLow = socialNpcs.every(k => (fav[k] || 0) <= 30);
      const ac = s.activityCounts || {};
      return allSocialLow
        && (ac.hunting || 0) >= 5 && (ac.animal_care || 0) >= 6
        && s.eventFlags?.human_npc_all_rejected === true;
    },
    priority: 96,
  },
  {
    id: 'slacker_sage',
    title: '咸鱼本鱼',
    emoji: '🐟',
    rarity: 'secret',
    image: '/assets/endings/slacker_sage.jpeg',
    description: '你看透了这无聊的养成游戏机制，决定绝不内卷。18岁那年，你因为"太能睡"且"毫无世俗欲望"，被当地人奉为"睡仙转世"。每天都有人来你床前上香，祈求能像你一样不用干活也有饭吃。',
    flavor: '躺平即是道，摆烂亦是禅。',
    check: (s) => {
      const totalSkill = Object.values(s.skills).reduce((a, b) => a + b, 0);
      const ac = s.activityCounts || {};
      return (ac.sleep_count || 0) >= 15 && totalSkill <= 250;
    },
    priority: 97,
  },
  {
    id: 'con_artist',
    title: '大明第一忽悠',
    emoji: '🗣️',
    rarity: 'epic',
    image: '/assets/endings/con_artist.jpeg',
    description: '你凭借三寸不烂之舌，在京城创立了"拉人头赚银子"的商业模式。18岁及笄那天，武林盟主、当朝宰相和首富都在疯狂向他们的下属推销你的"大力丸"。你成功把古代的经济体系忽悠瘸了。',
    flavor: '舌灿莲花，点石成金，古代传销第一人。',
    check: (s) => {
      const sk = s.skills;
      const ac = s.activityCounts || {};
      return sk.rhetoric >= 60 && sk.charm >= 55
        && sk.wisdom <= 50 && sk.morality <= 40
        && (ac.performance || 0) >= 6 && (ac.fortune_telling || 0) >= 5;
    },
    priority: 70,
  },
  {
    id: 'hermit',
    title: '逍遥散人',
    emoji: '🕊️',
    rarity: 'rare',
    image: '/assets/endings/hermit.jpeg',
    description: '18岁后，你厌倦了世俗的纷扰，退隐江湖。有人说在塞外的风沙中见过你，也有人说你在江南的小镇里卖酒，你活成了真正的自由。',
    flavor: '江湖路远，自在逍遥，此心安处是吾乡。',
    check: (s) => {
      const sk = s.skills;
      const fav = s.favorability;
      const ac = s.activityCounts || {};
      // 与某位NPC有情缘（好感≥60，见面≥5次，主动互动≥2次），但未达到婚恋结局条件
      const mufengOk  = fav.mufengongzi >= 60  && (s.subSceneVisits?.mufengongzi  || 0) >= 5 && (ac.active_mufengongzi  || 0) >= 2;
      const wangOk    = fav.wangwenyu >= 60    && (s.subSceneVisits?.wangwenyu    || 0) >= 5 && (ac.active_wangwenyu    || 0) >= 2;
      const sitouOk   = fav.sitouqian >= 60    && (s.subSceneVisits?.sitouqian    || 0) >= 5 && (ac.active_sitouqian    || 0) >= 2;
      const desertOk  = fav.desert_friend >= 60 && (s.subSceneVisits?.desert_friend || 0) >= 5 && (ac.active_desert_friend || 0) >= 2;
      return sk.wildness >= 50 && sk.courage >= 45
        && (mufengOk || wangOk || sitouOk || desertOk);
    },
    priority: 60,
  },
  {
    id: 'nun',
    title: '遁入空门',
    emoji: '🍂',
    rarity: 'rare',
    image: '/assets/endings/nun.jpeg',
    description: '看破了红尘的尔虞我诈与生死离别，18岁那年，你毅然剪去三千烦恼丝，在青灯古佛旁度过了余生。',
    flavor: '青灯古佛，了却尘缘，此生无憾。',
    check: (s) => {
      const sk = s.skills;
      const fav = s.favorability;
      // 道德高+灵气高，且所有主要NPC好感度都低（无情缘），或目睹了NPC死亡
      const noRomance = (fav.wangwenyu || 0) <= 30 && (fav.mufengongzi || 0) <= 30
        && (fav.sitouqian || 0) <= 30 && (fav.desert_friend || 0) <= 30 && (fav.royal_emperor || 0) <= 30;
      return sk.morality >= 65 && sk.spirit >= 55
        && (noRomance || s.eventFlags?.npc_death_witnessed === true);
    },
    priority: 55,
  },
  {
    id: 'performer',
    title: '梨园大家',
    emoji: '🎭',
    rarity: 'epic',
    image: '/assets/endings/performer.jpeg',
    description: '你的舞姿倾国倾城，18岁那年一曲名动京城。无数文人墨客为你写诗，你成为了艺术的化身，在梨园史上留下了浓墨重彩的一笔。',
    flavor: '一舞倾城，千古留名，此乃艺术的永恒。',
    check: (s) => {
      const sk = s.skills;
      const ac = s.activityCounts || {};
      return sk.music >= 60 && sk.charm >= 55 && sk.painting >= 45
        && (ac.performance || 0) >= 8;
    },
    priority: 65,
  },
  {
    id: 'ordinary',
    title: '平淡是真',
    emoji: '🌾',
    rarity: 'common',
    image: '/assets/endings/ordinary.jpeg',
    description: '18岁后，你经人介绍嫁给了镇上的普通青年。你的一生都在为生计奔波，虽然没有大富大贵，但也算安稳度日，儿孙满堂。',
    flavor: '平淡是真，岁月静好，此乃普通人的幸福。',
    check: (s) => {
      // 兜底结局：无姻缘（所有NPC好感<60）才走平淡是真
      const fav = s.favorability;
      const noRomance = (fav.wangwenyu || 0) < 60 && (fav.mufengongzi || 0) < 60
        && (fav.sitouqian || 0) < 60 && (fav.desert_friend || 0) < 60 && (fav.royal_emperor || 0) < 60;
      return noRomance;
    },
    priority: 0,
  },
];

module.exports = {
  AGE_CONFIG,
  heroCharacter,
  wardrobe,
  scenes,
  npcs,
  courses,
  skillConfig,
  shopItems,
  riddleQuestions,
  earnActivities,
  ENDINGS
};

