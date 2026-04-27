// 道具用途提示中央映射表
// scene: 带去哪个场景有用 | combo: 与哪件道具组合 | ending: 影响哪个结局
const ITEM_HINTS = {
  food_osmanthus_cake:  [{ scene: 'royal_court',       icon: '🏛️', tip: '带去宫廷赠给映月，可获好感加成与活动加持' }],
  incense_sandalwood:   [{ scene: 'mountain_monastery', icon: '🏔️', tip: '带去云顶禅院供奉，可获灵气提升与禅师讲经机缘' }],
  herb_ginseng:         [{ scene: 'medicine_hall', icon: '⚕️', tip: '带去百草堂赠给白老大夫，可获好感与活动加成' }, { combo: '本草图鉴', icon: '📚', tip: '同时持有本草图鉴，可触发坐堂义诊组合效果' }],
  food_lotus_soup:      [{ scene: 'bedroom',            icon: '🪟', tip: '回到锦绣阁分给春杏，可获魅力提升' }],
  steppe_jade:          [{ scene: 'desert_oasis',       icon: '🏜️', tip: '带去呜沙沟找沐风，他认得出幕风公子的信物' }],
  st_portrait:          [{ scene: 'ancient_street',     icon: '🏪', tip: '带去古街找王文玉，他会对这幅画像有特别的反应' }],
  ww_jade:              [{ scene: 'grassland', icon: '🌾', tip: '带去草原找赵公子，他认出传家玉佩会很惊讶' }, { combo: '王文玉手书', icon: '🏪', tip: '同时持有王文玉手书，可在古街触发月下倾诉' }],
  sapphire_ring:        [{ scene: 'grassland',          icon: '🌾', tip: '带去草原找赵公子，他看见家传戒指会大吃一惊' }],
  longjing_tea:         [{ scene: 'medicine_hall',      icon: '⚕️', tip: '带去百草堂，老大夫会分享用茶入药的秘方' }],
  book_medicine:        [{ scene: 'medicine_hall', icon: '⚕️', tip: '带去百草堂，老大夫会纠正书中错误传授真正医道' }, { combo: '百年人参', icon: '🌿', tip: '同时持有百年人参，可触发坐堂义诊' }, { ending: '悬壶济世', icon: '🌿', tip: '持有此书可降低悬壶济世结局的道德门槛' }],
  tool_guqin:           [{ scene: 'lakeside_pavilion',  icon: '🌙', tip: '带去碧波亭，白鹭先生听见琴声会讲述往事' }],
  dragon_phoenix_jade:  [{ scene: 'general_mansion', icon: '⚔️', tip: '带去将军府，宇文拓看见此物会有复杂的反应' }, { ending: '母仪天下', icon: '👑', tip: '持有此物可降低母仪天下结局的好感门槛' }],
  silk_starmap:         [{ scene: 'grassland', icon: '🌾', tip: '带去草原，可解锁星图导航特殊活动' }, { combo: '西域铜护符', icon: '🏜️', tip: '同时持有西域铜护符，可在沙漠触发沙漠传说' }],
  imperial_inkstone:    [{ scene: 'art_studio', icon: '🎨', tip: '带去翰墨苑，可解锁御题临摹特殊活动' }, { combo: '御苑桂花枝', icon: '🏛️', tip: '同时持有御苑桂花，可在宫廷触发御前献艺' }],
  steppe_feather:       [{ scene: 'general_mansion', icon: '⚔️', tip: '带去将军府，可解锁驯鹰训练特殊活动' }, { combo: '草原图腾挂坠', icon: '🌾', tip: '同时持有草原图腾，可降低逍遥散人结局门槛' }],
  st_inkstone:          [{ scene: 'lakeside_pavilion', icon: '🌙', tip: '带去碧波亭，可解锁诗画雅集特殊活动' }, { combo: '司徒仟亲绘肖像', icon: '🎨', tip: '同时持有司徒仟画像，可触发合作创作' }],
  desert_amulet:        [{ scene: 'mountain_monastery', icon: '🏔️', tip: '带去云顶禅院，可解锁西域冥想特殊活动' }, { combo: '西域星图绸', icon: '🏜️', tip: '同时持有西域星图，可在沙漠触发沙漠传说' }],
  ww_letter:            [{ scene: 'art_studio', icon: '🎨', tip: '带去翰墨苑找司徒仟，他认出王文玉字迹会分享往事' }, { combo: '王文玉传家玉佩', icon: '🏪', tip: '同时持有传家玉佩，可触发月下倾诉' }],
  imperial_osmanthus:   [{ scene: 'ancient_street', icon: '🏪', tip: '带去古街找王文玉，他看见御苑桂花会有些吃味' }, { combo: '御赐端砚', icon: '🏛️', tip: '同时持有御赐端砚，可在宫廷触发御前献艺' }],
  general_jade:         [{ scene: 'royal_court',        icon: '🏛️', tip: '带去宫廷，皇上认出宇文拓信物后会另眼相看' }],
  shared_memory_scroll: [{ ending: '梨园大家',           icon: '🎭', tip: '持有此卷可降低梨园大家结局的画艺门槛' }],
  steppe_totem:         [{ combo: '草原鹰羽',            icon: '🌾', tip: '同时持有草原鹰羽，可降低逍遥散人结局门槛' }],
};

export default ITEM_HINTS;
