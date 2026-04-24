import React, {useCallback, useEffect, useRef, useState} from 'react';
import axios from 'axios';
import CharacterPanel from './components/CharacterPanel';
import SceneView from './components/SceneView';
import WardrobePanel from './components/WardrobePanel';
import SkillsPanel from './components/SkillsPanel';
import ActivityLog from './components/ActivityLog';
import Toast from './components/Toast';
import LoadingScreen from './components/LoadingScreen';
import TopBar from './components/TopBar';
import NavigationBar from './components/NavigationBar';
import EarnPanel from './components/EarnPanel';
import InventoryPanel from './components/InventoryPanel';
import ShopPanel from './components/ShopPanel';
import RanchGame from './components/RanchGame';
import IntroSlides from './components/IntroSlides';
import LaborMiniGame from './components/LaborMiniGame';
import streetImage from './components/pic/街道.jpg';
import adventureMapImage from './components/pic/探险地图.jpg';
import peachFullImage from './components/pic/桃花岛-全景.jpg';
import peachStreetImage from './components/pic/桃花岛-街道.jpg';
import deepForestImage from './components/pic/深林.jpg';
import deepForestNpcImage from './components/pic/深林-npc.jpg';
import wailingSandImage from './components/pic/呜沙沟.jpg';
import wailingSandNpcImage from './components/pic/呜沙沟-npc.jpg';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3001/api';

// ==================== 账号系统（JWT） ====================
const TOKEN_KEY = 'wondergame_token';
const USERNAME_KEY = 'wondergame_username';

function getSavedToken() { return localStorage.getItem(TOKEN_KEY) || null; }
function getSavedUsername() { return localStorage.getItem(USERNAME_KEY) || null; }
function saveAuth(token, username) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USERNAME_KEY, username);
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}
function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USERNAME_KEY);
  delete axios.defaults.headers.common['Authorization'];
}
// 如果已有 token，直接注入请求头
const _savedToken = getSavedToken();
if (_savedToken) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${_savedToken}`;
}

// 课程名称配置 - 按图片上的顺序排列（3行8列）
const COURSE_NAMES = [
  // 第一排
  '农耕技术', '编织与刺绣', '马术', '舞蹈', '木工', '建筑营造', '法术', '书画',
  // 第二排
  '文学', '珠算', '狩猎', '蹴鞠', '中医本草', '针灸推拿', '烹饪艺术', '酿酒工艺',
  // 第三排
  '天文历法', '航海技术', '武术器械', '弓箭制造', '丝竹乐器', '茶艺文化', '雕刻技艺', '探险'
];

// 课程学习收获（icon, desc, cost=学费金币, skills=[{key,label,delta}×3种属性]）
const COURSE_CONTENTS = {
  '农耕技术':  { icon: '🌾', desc: '学习耕种技巧，了解四时节气，掌握了农作物种植之道。', cost: 30,
    skills: [{ key: 'vitality', label: '体力', delta: 4 }, { key: 'wisdom', label: '才学', delta: 2 }, { key: 'spirit', label: '灵气', delta: 2 }] },
  '编织与刺绣':{ icon: '🧵', desc: '绣出一幅精美的花鸟图，针法细腻入微，手艺精湛。', cost: 25,
    skills: [{ key: 'painting', label: '画艺', delta: 4 }, { key: 'charm', label: '魅力', delta: 2 }, { key: 'wisdom', label: '才学', delta: 2 }] },
  '马术':      { icon: '🐎', desc: '骑术精进，能在马背上自如驰骋，人马合一。', cost: 50,
    skills: [{ key: 'command', label: '统帅', delta: 4 }, { key: 'wildness', label: '野性', delta: 3 }, { key: 'martial', label: '武术', delta: 2 }] },
  '舞蹈':      { icon: '💃', desc: '跟随宫廷舞师学习古典舞蹈，水袖翩翩，步步生莲。', cost: 35,
    skills: [{ key: 'charm', label: '魅力', delta: 4 }, { key: 'reputation', label: '声望', delta: 2 }, { key: 'affinity', label: '亲和', delta: 2 }] },
  '木工':      { icon: '🪚', desc: '掌握木工技艺，能制作精美的家具和器具。', cost: 20,
    skills: [{ key: 'crafting', label: '手工', delta: 4 }, { key: 'vitality', label: '体力', delta: 2 }, { key: 'wisdom', label: '才学', delta: 2 }] },
  '建筑营造':  { icon: '🏛️', desc: '学习建筑原理，了解营造法式，眼界大开。', cost: 45,
    skills: [{ key: 'crafting', label: '手工', delta: 4 }, { key: 'arithmetic', label: '算数', delta: 3 }, { key: 'wisdom', label: '才学', delta: 2 }] },
  '法术':      { icon: '✨', desc: '研习神秘法术，掌握了一些神奇的咒语和仪式。', cost: 60,
    skills: [{ key: 'spirit', label: '灵气', delta: 6 }, { key: 'wisdom', label: '才学', delta: 2 }, { key: 'courage', label: '胆识', delta: 2 }] },
  '书画':      { icon: '🖌️', desc: '临摹名家真迹，笔法渐入佳境，作品得到赞赏。', cost: 40,
    skills: [{ key: 'painting', label: '画艺', delta: 5 }, { key: 'poetry', label: '诗才', delta: 2 }, { key: 'rhetoric', label: '口才', delta: 2 }] },
  '文学':      { icon: '📚', desc: '熟读经典文学，能写出优美的诗文，文采斐然。', cost: 35,
    skills: [{ key: 'poetry', label: '诗才', delta: 5 }, { key: 'wisdom', label: '才学', delta: 3 }, { key: 'rhetoric', label: '口才', delta: 2 }] },
  '珠算':      { icon: '🔢', desc: '精通珠算，能快速计算复杂账目，算无遗漏。', cost: 25,
    skills: [{ key: 'arithmetic', label: '算数', delta: 6 }, { key: 'wisdom', label: '才学', delta: 3 }, { key: 'spirit', label: '灵气', delta: 2 }] },
  '狩猎':      { icon: '🎯', desc: '学习狩猎技巧，追踪猎物，百发百中。', cost: 45,
    skills: [{ key: 'courage', label: '胆识', delta: 4 }, { key: 'wildness', label: '野性', delta: 3 }, { key: 'vitality', label: '体力', delta: 2 }] },
  '蹴鞠':      { icon: '⚽', desc: '练习蹴鞠技艺，身手矫健，配合默契。', cost: 20,
    skills: [{ key: 'vitality', label: '体力', delta: 4 }, { key: 'affinity', label: '亲和', delta: 2 }, { key: 'wildness', label: '野性', delta: 2 }] },
  '中医本草':  { icon: '🌿', desc: '熟记各种草药功效，能诊治常见病症。', cost: 50,
    skills: [{ key: 'medical', label: '医术', delta: 5 }, { key: 'wisdom', label: '才学', delta: 2 }, { key: 'spirit', label: '灵气', delta: 2 }] },
  '针灸推拿':  { icon: '💉', desc: '掌握针灸推拿之术，能调理身体，疏通经络。', cost: 55,
    skills: [{ key: 'medical', label: '医术', delta: 6 }, { key: 'spirit', label: '灵气', delta: 2 }, { key: 'affinity', label: '亲和', delta: 2 }] },
  '烹饪艺术':  { icon: '🍳', desc: '学会了几道精致的菜肴，厨艺大有长进。', cost: 30,
    skills: [{ key: 'culinary', label: '厨艺', delta: 5 }, { key: 'charm', label: '魅力', delta: 2 }, { key: 'affinity', label: '亲和', delta: 2 }] },
  '酿酒工艺':  { icon: '🍶', desc: '学习酿酒技艺，酿出香醇美酒，回味无穷。', cost: 35,
    skills: [{ key: 'culinary', label: '厨艺', delta: 4 }, { key: 'wisdom', label: '才学', delta: 2 }, { key: 'spirit', label: '灵气', delta: 2 }] },
  '天文历法':  { icon: '🔭', desc: '观星望月，通晓天文历法，预知节气变化。', cost: 45,
    skills: [{ key: 'arithmetic', label: '算数', delta: 4 }, { key: 'wisdom', label: '才学', delta: 3 }, { key: 'spirit', label: '灵气', delta: 2 }] },
  '航海技术':  { icon: '⛵', desc: '学习航海知识，懂得观星定位，乘风破浪。', cost: 50,
    skills: [{ key: 'statecraft', label: '政治', delta: 4 }, { key: 'courage', label: '胆识', delta: 3 }, { key: 'wildness', label: '野性', delta: 2 }] },
  '武术器械':  { icon: '⚔️', desc: '习练各种兵器，武艺大进，招式纯熟。', cost: 55,
    skills: [{ key: 'martial', label: '武术', delta: 5 }, { key: 'command', label: '统帅', delta: 2 }, { key: 'courage', label: '胆识', delta: 2 }] },
  '弓箭制造':  { icon: '🏹', desc: '学习制弓技术，能打造精良的弓箭。', cost: 40,
    skills: [{ key: 'martial', label: '武术', delta: 4 }, { key: 'crafting', label: '手工', delta: 3 }, { key: 'courage', label: '胆识', delta: 2 }] },
  '丝竹乐器':  { icon: '🪕', desc: '习练琴瑟笛箫，丝竹之声绕梁三日，心旷神怡。', cost: 55,
    skills: [{ key: 'music', label: '乐艺', delta: 6 }, { key: 'charm', label: '魅力', delta: 3 }, { key: 'spirit', label: '灵气', delta: 2 }] },
  '茶艺文化':  { icon: '🍵', desc: '品茶论道，领悟茶中三昧，心境澄明。', cost: 30,
    skills: [{ key: 'reputation', label: '声望', delta: 4 }, { key: 'rhetoric', label: '口才', delta: 3 }, { key: 'statecraft', label: '政治', delta: 2 }] },
  '雕刻技艺':  { icon: '🗿', desc: '学习雕刻艺术，作品栩栩如生，巧夺天工。', cost: 35,
    skills: [{ key: 'crafting', label: '手工', delta: 5 }, { key: 'painting', label: '画艺', delta: 2 }, { key: 'wisdom', label: '才学', delta: 2 }] },
  '探险':      { icon: '🗺️', desc: '踏上探险之旅，见识广博，胆识过人。', cost: 50,
    skills: [{ key: 'courage', label: '胆识', delta: 5 }, { key: 'wildness', label: '野性', delta: 3 }, { key: 'spirit', label: '灵气', delta: 2 }] },
};

// 对基础金币值做 ±20% 随机浮动
const randGold = (base) => Math.max(1, Math.round(base * (0.8 + Math.random() * 0.4)));

// 劳动种类配置（24种古代劳动，每种赚取金币，同时增加3种属性）
const LABOR_NAMES = [
  // 第一排
  '织布纺纱', '制陶烧窑', '打铁锻造', '捕鱼捞虾', '采药收草', '牧羊放牛', '伐木搬柴', '制绳编筐',
  // 第二排
  '烧炭制薪', '酿造蜂蜜', '修缮房屋', '挖井引水', '驾车赶路', '传递信件', '守夜巡逻', '摆摊售货',
  // 第三排
  '浣洗衣物', '腌制咸菜', '编制灯笼', '种桑养蚕', '磨粮制粉', '晒盐制卤', '制作陶器', '挑担运货',
];

const LABOR_CONTENTS = {
  '织布纺纱': { icon: '🪡', desc: '手指灵巧穿梭于丝线间，织出精美布匹。', gold: 35,
    skills: [{ key: 'vitality', label: '体力', delta: 4 }, { key: 'painting', label: '画艺', delta: 2 }, { key: 'affinity', label: '亲和', delta: 2 }] },
  '制陶烧窑': { icon: '🏺', desc: '揉捏泥土，精心雕琢，烧制出精美陶器。', gold: 40,
    skills: [{ key: 'vitality', label: '体力', delta: 4 }, { key: 'wisdom', label: '才学', delta: 2 }, { key: 'spirit', label: '灵气', delta: 2 }] },
  '打铁锻造': { icon: '🔨', desc: '挥舞铁锤，火花四溅，锻造出坚韧的器具。', gold: 55,
    skills: [{ key: 'martial', label: '武术', delta: 4 }, { key: 'vitality', label: '体力', delta: 3 }, { key: 'crafting', label: '手工', delta: 2 }] },
  '捕鱼捞虾': { icon: '🎣', desc: '撒网入江，静候收获，鱼虾满舱而归。', gold: 30,
    skills: [{ key: 'vitality', label: '体力', delta: 4 }, { key: 'spirit', label: '灵气', delta: 2 }, { key: 'affinity', label: '亲和', delta: 2 }] },
  '采药收草': { icon: '🌿', desc: '翻山越岭采集草药，为乡民备下良方。', gold: 35,
    skills: [{ key: 'medical', label: '医术', delta: 4 }, { key: 'spirit', label: '灵气', delta: 2 }, { key: 'vitality', label: '体力', delta: 2 }] },
  '牧羊放牛': { icon: '🐑', desc: '悠然放牧于山野之间，与牲畜相伴而行。', gold: 28,
    skills: [{ key: 'vitality', label: '体力', delta: 4 }, { key: 'spirit', label: '灵气', delta: 2 }, { key: 'wildness', label: '野性', delta: 2 }] },
  '伐木搬柴': { icon: '🪓', desc: '挥斧入林，伐取木材，肩扛重担归来。', gold: 48,
    skills: [{ key: 'vitality', label: '体力', delta: 5 }, { key: 'wildness', label: '野性', delta: 2 }, { key: 'courage', label: '胆识', delta: 2 }] },
  '制绳编筐': { icon: '🧺', desc: '手工编制实用绳索与竹筐，精巧耐用。', gold: 30,
    skills: [{ key: 'vitality', label: '体力', delta: 3 }, { key: 'wisdom', label: '才学', delta: 2 }, { key: 'affinity', label: '亲和', delta: 2 }] },
  '烧炭制薪': { icon: '🔥', desc: '窑火通明，烧制优质木炭，供冬日取暖。', gold: 42,
    skills: [{ key: 'vitality', label: '体力', delta: 4 }, { key: 'wildness', label: '野性', delta: 2 }, { key: 'spirit', label: '灵气', delta: 2 }] },
  '酿造蜂蜜': { icon: '🍯', desc: '采集山花蜜蜂之蜜，酿造甜美香醇蜂蜜。', gold: 55,
    skills: [{ key: 'culinary', label: '厨艺', delta: 4 }, { key: 'spirit', label: '灵气', delta: 2 }, { key: 'affinity', label: '亲和', delta: 2 }] },
  '修缮房屋': { icon: '🏚️', desc: '修葺邻里房屋，砌砖铺瓦，助人为乐。', gold: 60,
    skills: [{ key: 'morality', label: '道德', delta: 4 }, { key: 'crafting', label: '手工', delta: 3 }, { key: 'vitality', label: '体力', delta: 2 }] },
  '挖井引水': { icon: '🪣', desc: '凿开坚硬岩层，引甘泉入村，造福百姓。', gold: 65,
    skills: [{ key: 'vitality', label: '体力', delta: 5 }, { key: 'wisdom', label: '才学', delta: 2 }, { key: 'courage', label: '胆识', delta: 2 }] },
  '驾车赶路': { icon: '🛤️', desc: '驾马车往来于城镇之间，代人运送物资。', gold: 48,
    skills: [{ key: 'vitality', label: '体力', delta: 4 }, { key: 'wildness', label: '野性', delta: 3 }, { key: 'courage', label: '胆识', delta: 2 }] },
  '传递信件': { icon: '📜', desc: '奔走于街巷间，将书信及时送达。', gold: 30,
    skills: [{ key: 'rhetoric', label: '口才', delta: 4 }, { key: 'affinity', label: '亲和', delta: 3 }, { key: 'morality', label: '道德', delta: 2 }] },
  '守夜巡逻': { icon: '🏮', desc: '手持灯笼，守护村庄一夜安宁。', gold: 42,
    skills: [{ key: 'morality', label: '道德', delta: 4 }, { key: 'courage', label: '胆识', delta: 2 }, { key: 'vitality', label: '体力', delta: 2 }] },
  '摆摊售货': { icon: '🛍️', desc: '在集市摆摊叫卖，与客周旋，锻炼口才。', gold: 55,
    skills: [{ key: 'rhetoric', label: '口才', delta: 4 }, { key: 'affinity', label: '亲和', delta: 2 }, { key: 'reputation', label: '声望', delta: 2 }] },
  '浣洗衣物': { icon: '👘', desc: '溪边浣衣，清洗污渍，衣物洁净如新。', gold: 22,
    skills: [{ key: 'morality', label: '道德', delta: 3 }, { key: 'affinity', label: '亲和', delta: 2 }, { key: 'spirit', label: '灵气', delta: 2 }] },
  '腌制咸菜': { icon: '🥒', desc: '用盐腌制时令蔬菜，美味可口耐久存。', gold: 28,
    skills: [{ key: 'culinary', label: '厨艺', delta: 4 }, { key: 'wisdom', label: '才学', delta: 2 }, { key: 'spirit', label: '灵气', delta: 2 }] },
  '编制灯笼': { icon: '🏮', desc: '竹丝编骨，裱上彩纸，制成精美灯笼。', gold: 35,
    skills: [{ key: 'painting', label: '画艺', delta: 4 }, { key: 'wisdom', label: '才学', delta: 2 }, { key: 'affinity', label: '亲和', delta: 2 }] },
  '种桑养蚕': { icon: '🐛', desc: '种植桑树，悉心养蚕，缫出细腻生丝。', gold: 48,
    skills: [{ key: 'vitality', label: '体力', delta: 4 }, { key: 'spirit', label: '灵气', delta: 3 }, { key: 'wisdom', label: '才学', delta: 2 }] },
  '磨粮制粉': { icon: '🌾', desc: '推动石磨，将谷物研磨成细腻粉末。', gold: 30,
    skills: [{ key: 'vitality', label: '体力', delta: 4 }, { key: 'culinary', label: '厨艺', delta: 2 }, { key: 'spirit', label: '灵气', delta: 2 }] },
  '晒盐制卤': { icon: '🧂', desc: '引海水入田，经日晒风吹，结出白盐。', gold: 60,
    skills: [{ key: 'wisdom', label: '才学', delta: 4 }, { key: 'vitality', label: '体力', delta: 3 }, { key: 'spirit', label: '灵气', delta: 2 }] },
  '制作陶器': { icon: '🏺', desc: '拉坯成型，精心烧制，造出各式陶碗瓦罐。', gold: 42,
    skills: [{ key: 'crafting', label: '手工', delta: 4 }, { key: 'painting', label: '画艺', delta: 2 }, { key: 'vitality', label: '体力', delta: 2 }] },
  '挑担运货': { icon: '⚖️', desc: '肩挑重担，往返于山路之间，运送货物。', gold: 55,
    skills: [{ key: 'vitality', label: '体力', delta: 4 }, { key: 'command', label: '统帅', delta: 3 }, { key: 'courage', label: '胆识', delta: 2 }] },
};

// ==================== 课程道具奖励配置 ====================
// 每门课 5/10/20 次时的奖励道具（每组3种不同道具）
const COURSE_REWARDS = {
  '农耕技术':   { 5: { name: '五谷香囊', icon: '🌾', desc: '蕴含五谷精华，随身携带带来好运' }, 10: { name: '田园锄具', icon: '⛏️', desc: '精铁打造的小锄具，工艺精湛' }, 20: { name: '稻谷金印', icon: '🌿', desc: '代代相传的农耕信物，意义非凡' } },
  '编织与刺绣': { 5: { name: '锦绣荷包', icon: '👜', desc: '亲手绣制的精美荷包，细腻入微' }, 10: { name: '彩线绣绷', icon: '🪡', desc: '用于刺绣的专用绷架，工匠珍品' }, 20: { name: '凤凰刺绣屏', icon: '🦚', desc: '绣有凤凰图案的折叠屏风，华贵异常' } },
  '马术':       { 5: { name: '马鬃发带', icon: '🐴', desc: '用马鬃编制的发带，柔韧有力' }, 10: { name: '骑手手套', icon: '🧤', desc: '皮质精细的骑马手套，耐磨防滑' }, 20: { name: '飞龙马鞭', icon: '🐎', desc: '传说中快马神鞭，驱马如飞' } },
  '舞蹈':       { 5: { name: '水袖绸缎', icon: '🎀', desc: '舞蹈专用的轻盈水袖布料' }, 10: { name: '霓裳舞扇', icon: '🪭', desc: '宫廷舞蹈专用的精美折扇' }, 20: { name: '凤凰舞裙', icon: '💃', desc: '绣有凤凰图案的华丽舞裙' } },
  '木工':       { 5: { name: '木质小匣', icon: '📦', desc: '手工雕刻的精美小盒子' }, 10: { name: '竹节笔筒', icon: '✏️', desc: '天然竹节制成，古朴大方' }, 20: { name: '小叶紫檀镇纸', icon: '📋', desc: '珍贵紫檀木雕刻，收藏佳品' } },
  '建筑营造':   { 5: { name: '榫卯模型', icon: '🏗️', desc: '精巧的榫卯结构小模型' }, 10: { name: '营造手记', icon: '📐', desc: '记录建筑秘法的珍贵手册' }, 20: { name: '鲁班锁', icon: '🔒', desc: '传说中鲁班设计的机关锁' } },
  '法术':       { 5: { name: '符文玉佩', icon: '🔮', desc: '刻有神秘符文的玉石' }, 10: { name: '星辰香炉', icon: '🕯️', desc: '点燃可凝神静气，助修法术' }, 20: { name: '天师印章', icon: '⭐', desc: '道法高深的天师真印' } },
  '书画':       { 5: { name: '徽墨一锭', icon: '🖊️', desc: '上等徽墨，书写流畅润泽' }, 10: { name: '宣纸一刀', icon: '📜', desc: '精制宣纸，吸墨均匀上好之品' }, 20: { name: '端砚一方', icon: '🪨', desc: '珍贵端砚，石质细腻发墨如脂' } },
  '文学':       { 5: { name: '诗集手抄', icon: '📖', desc: '亲手抄录的古典诗词集' }, 10: { name: '文房镇纸', icon: '📝', desc: '文人书案必备的精雕镇纸' }, 20: { name: '珠玉词典', icon: '📚', desc: '收录古今名篇的珍贵词典' } },
  '珠算':       { 5: { name: '黄铜算珠', icon: '🔢', desc: '精制黄铜算盘珠，光滑易拨' }, 10: { name: '象牙算盘', icon: '📊', desc: '象牙制作的小算盘，珍贵稀有' }, 20: { name: '金算账册', icon: '💰', desc: '记载商业秘法的金边账册' } },
  '狩猎':       { 5: { name: '羽毛箭羽', icon: '🏹', desc: '精选鸟羽制成的箭羽' }, 10: { name: '猎人腰带', icon: '🎯', desc: '耐用皮革制成的猎人腰带' }, 20: { name: '玄铁猎叉', icon: '⚔️', desc: '黑铁精铸的三叉猎叉' } },
  '蹴鞠':       { 5: { name: '彩绣蹴鞠', icon: '⚽', desc: '手工缝制的彩色蹴鞠' }, 10: { name: '运动护腕', icon: '🤸', desc: '布制精细护腕，柔软舒适' }, 20: { name: '赛场锦旗', icon: '🚩', desc: '蹴鞠比赛冠军专属锦旗' } },
  '中医本草':   { 5: { name: '草药小包', icon: '🌿', desc: '精选草药制成的药包' }, 10: { name: '本草图谱', icon: '📗', desc: '绘有各类草药的珍贵图谱' }, 20: { name: '银质药箱', icon: '🏥', desc: '古朴银制药箱，医者至宝' } },
  '针灸推拿':   { 5: { name: '银针小盒', icon: '💉', desc: '存放银针的精制小盒' }, 10: { name: '穴位图册', icon: '📋', desc: '绘有全身穴位的珍贵图册' }, 20: { name: '金丝艾条', icon: '🌟', desc: '金丝包裹的上等艾条' } },
  '烹饪艺术':   { 5: { name: '调味香料包', icon: '🧂', desc: '精选八种香料的组合包' }, 10: { name: '厨艺秘笈', icon: '📕', desc: '老厨师珍藏的私房秘笈' }, 20: { name: '御厨铜锅', icon: '🍳', desc: '宫廷御厨专用的铜质锅具' } },
  '酿酒工艺':   { 5: { name: '酒曲小袋', icon: '🍶', desc: '精选曲种，酿酒必备' }, 10: { name: '陶制酒坛', icon: '🏺', desc: '专用于陈年储酒的老陶坛' }, 20: { name: '御酒宝典', icon: '📜', desc: '记载皇室酿酒秘方的典籍' } },
  '天文历法':   { 5: { name: '星图罗盘', icon: '🧭', desc: '绘有天象的精巧罗盘' }, 10: { name: '观星记录册', icon: '🔭', desc: '亲手记录的星辰观测手册' }, 20: { name: '浑天仪模型', icon: '🌌', desc: '古代天文仪器的精美模型' } },
  '航海技术':   { 5: { name: '航海罗针', icon: '⛵', desc: '精确的指南针，航海必备' }, 10: { name: '海图一份', icon: '🗺️', desc: '详绘海岸线的珍贵航海图' }, 20: { name: '望远铜镜', icon: '🔭', desc: '航海专用的长程铜质望远镜' } },
  '武术器械':   { 5: { name: '护腕铁环', icon: '⚔️', desc: '防护专用的精铁护腕' }, 10: { name: '武术秘典', icon: '📘', desc: '记载武学精髓的珍贵秘典' }, 20: { name: '龙纹剑鞘', icon: '🗡️', desc: '雕有龙纹的精美剑鞘' } },
  '弓箭制造':   { 5: { name: '箭矢一束', icon: '🏹', desc: '手工制作的精良箭矢' }, 10: { name: '弓弦材料', icon: '🪢', desc: '上好牛筋制成的弓弦' }, 20: { name: '神射者弓', icon: '🎯', desc: '传说中百步穿杨的名弓' } },
  '丝竹乐器':   { 5: { name: '红木笛', icon: '🎵', desc: '红木精制的短笛，音色清亮' }, 10: { name: '丝弦一套', icon: '🎼', desc: '上等蚕丝制成的琴弦' }, 20: { name: '古琴谱一卷', icon: '🪕', desc: '古代名曲手抄谱，珍贵无比' } },
  '茶艺文化':   { 5: { name: '紫砂小壶', icon: '🍵', desc: '宜兴紫砂制成的小茶壶' }, 10: { name: '茶道秘典', icon: '📗', desc: '记载茶道精髓的珍贵典籍' }, 20: { name: '龙井珍茗', icon: '🌱', desc: '极品龙井茶叶，香气馥郁' } },
  '雕刻技艺':   { 5: { name: '小型雕件', icon: '🗿', desc: '亲手雕刻的精美小摆件' }, 10: { name: '雕刻刀组', icon: '🔪', desc: '专业雕刻师专用刀具套组' }, 20: { name: '象牙雕品', icon: '🦷', desc: '精雕细琢的象牙工艺品' } },
  '探险':       { 5: { name: '探险日记', icon: '📓', desc: '记录探险见闻的皮质日记本' }, 10: { name: '地图卷轴', icon: '🗺️', desc: '记有秘境位置的珍贵地图' }, 20: { name: '探险者勋章', icon: '🏅', desc: '勇闯天涯的荣耀勋章' } },
};

// ==================== 随机事件数据 ====================
const RANDOM_EVENTS_COURSE = [
  { text: '先生今日心情极佳，多讲了半个时辰，你受益匪浅。', emoji: '🌟', skillKey: 'wisdom', delta: 5, type: 'good' },
  { text: '同窗分享了一本珍稀典籍，你如获至宝，细细研读。', emoji: '📚', skillKey: 'wisdom', delta: 4, type: 'good' },
  { text: '课后偶遇一位游方高人，他随口指点，令你茅塞顿开。', emoji: '🧙', skillKey: 'spirit', delta: 5, type: 'good' },
  { text: '今日课程中，你突然找到了窍门，技艺大进。', emoji: '✨', skillKey: 'charm', delta: 4, type: 'good' },
  { text: '同学见你勤奋，主动传授了独门心法，受益良多。', emoji: '🤝', skillKey: 'affinity', delta: 5, type: 'good' },
  { text: '课间练习时，你意外突破瓶颈，感到浑身轻盈。', emoji: '💫', skillKey: 'vitality', delta: 5, type: 'good' },
  { text: '先生当众表扬你，众目睽睽之下你愈发自信。', emoji: '🎖️', skillKey: 'courage', delta: 4, type: 'good' },
  { text: '途中遇雨，衣衫尽湿，但静心思索，倒有意外收获。', emoji: '🌧️', skillKey: 'spirit', delta: 3, type: 'surprise' },
  { text: '课堂上不慎打翻砚台，先生罚你重写百字，手腕更稳了。', emoji: '🖊️', skillKey: 'wisdom', delta: 3, type: 'surprise' },
  { text: '练习时磕破了手，但痛定思痛，动作更加精准。', emoji: '🩹', skillKey: 'courage', delta: 3, type: 'surprise' },
  { text: '今日心绪不宁，学得不甚专心，却在发呆时想通了一个道理。', emoji: '🌀', skillKey: 'wisdom', delta: 3, type: 'surprise' },
  { text: '课后迷了路，在街巷中转悠，见识了许多市井风情。', emoji: '🗺️', skillKey: 'affinity', delta: 4, type: 'surprise' },
];

const RANDOM_EVENTS_LABOR = [
  { text: '东家今日大方，额外多给了赏钱，你喜出望外。', emoji: '💰', skillKey: 'vitality', delta: 4, type: 'good' },
  { text: '劳作间隙，一位老工匠悄悄传授了你诀窍，效率倍增。', emoji: '🔨', skillKey: 'vitality', delta: 5, type: 'good' },
  { text: '今日天气晴好，干活格外起劲，比平时多完成了许多。', emoji: '☀️', skillKey: 'courage', delta: 4, type: 'good' },
  { text: '路过的商人见你手艺不错，当场订了一批货，喜上加喜。', emoji: '🛍️', skillKey: 'affinity', delta: 5, type: 'good' },
  { text: '劳作中与同伴说说笑笑，时间过得飞快，心情舒畅。', emoji: '😄', skillKey: 'charm', delta: 4, type: 'good' },
  { text: '风沙突起，吹乱了半日工作，但你沉住气重来，意志更坚。', emoji: '🌬️', skillKey: 'courage', delta: 3, type: 'surprise' },
  { text: '工具不慎损坏，自己修好后，倒学会了一门新技艺。', emoji: '🔧', skillKey: 'vitality', delta: 3, type: 'surprise' },
  { text: '被人误解偷懒，辩解无用，只好闷头苦干，反而做得更好。', emoji: '😤', skillKey: 'wisdom', delta: 3, type: 'surprise' },
];

// ==================== 技能里程碑称号 ====================
const SKILL_MILESTONE_TITLES = {
  wisdom:     { 50: '博学多才', 80: '满腹经纶', 100: '旷世奇才' },
  charm:      { 50: '倾城之貌', 80: '倾国倾城', 100: '绝世容颜' },
  spirit:     { 50: '神思敏锐', 80: '通玄达妙', 100: '天人合一' },
  affinity:   { 50: '八面玲珑', 80: '众望所归', 100: '万民归心' },
  courage:    { 50: '勇冠三军', 80: '所向披靡', 100: '战神降世' },
  vitality:   { 50: '铁骨铮铮', 80: '金刚不坏', 100: '永生不灭' },
  wildness:   { 50: '天马行空', 80: '苍鹰展翅', 100: '天地任我行' },
  culinary:   { 50: '色味双绝', 80: '食神初成', 100: '天下第一厨' },
  medical:    { 50: '妙手仁心', 80: '华佗再世', 100: '医圣传人' },
  poetry:     { 50: '诗意盎然', 80: '一代才女', 100: '诗仙之誉' },
  music:      { 50: '余音绕梁', 80: '天籁之音', 100: '乐圣传人' },
  painting:   { 50: '栩栩如生', 80: '泼墨成画', 100: '画圣之誉' },
  rhetoric:   { 50: '辩才无碍', 80: '金口玉言', 100: '天下第一嘴' },
  statecraft: { 50: '治国有方', 80: '一代贤相', 100: '千古名臣' },
  arithmetic: { 50: '数术精通', 80: '神算子',   100: '天机不泄' },
  crafting:   { 50: '精工细作', 80: '一代巨匠', 100: '工圣传人' },
  morality:   { 50: '仁义之人', 80: '圣人之风', 100: '万世师表' },
  reputation: { 50: '声名大噪', 80: '千古留名', 100: '万世流芳' },
};

// ==================== NPC旁观评论 ====================
const NPC_COMMENTS = {
  wangwenyu: {
    art: [
      '文玉路过窗前，见你伏案苦读，嘴角微扬：「你这般用功，倒让我汗颜。」',
      '文玉在门口驻足片刻，轻声道：「今日的字，比昨日又进了一分。」',
      '文玉悄悄放下一盏茶，低声说：「读书伤眼，记得歇息。」',
      '文玉翻看你的习作，沉默良久，才道：「假以时日，你必成大器。」',
    ],
    martial: [
      '文玉远远看着你练武，欲言又止，最终只是轻叹：「她竟比我还拼命。」',
      '文玉递来一块帕子：「擦擦汗吧，别累坏了。」',
      '文玉站在树荫下，眼神复杂：「你这股劲儿，真叫人既心疼又敬佩。」',
    ],
    labor: [
      '文玉见你劳作归来，默默接过你手中的东西：「我来拿。」',
      '文玉皱眉看着你手上的茧：「何必这般辛苦，我……」话说到一半，他低下了头。',
      '文玉在一旁帮你打下手，嘴上说着「不用谢」，耳根却红了。',
    ],
  },
  mufengongzi: {
    art: [
      '幕风公子骑马从书院外经过，探头望了一眼，大声嚷道：「整日读书有何趣？不如随我跑马去！」',
      '幕风公子凑过来看你写字，歪着头：「嗯，字是好字，就是……不如我的草原歌谣豪气。」',
      '幕风公子悄悄在窗台上放了一束野花，拍马而去，留下一阵风。',
    ],
    martial: [
      '幕风公子眼睛一亮，翻身下马：「这招不对，看我的！」说着就要献技。',
      '幕风公子在旁边越看越兴奋：「好！再来一次！你这劲道，草原上也算得上好手！」',
      '幕风公子拍掌叫好：「痛快！总算有个练武的人陪我说话了！」',
    ],
    labor: [
      '幕风公子跳下马来，二话不说挽起袖子：「来，我帮你！」',
      '幕风公子看你干活，若有所思：「草原上的姑娘也这般能干，你们中原女子倒不输她们。」',
      '幕风公子帮完忙，拍拍手：「以后有力气活，尽管找我。」',
    ],
  },
  sitouqian: {
    art: [
      '司徒仟在不远处悄悄支起画架，对你写字的侧影一笔一划地描摹。',
      '司徒仟轻声道：「你专注时的神情，是我见过最难画的，因为太美了。」',
      '司徒仟将你的习作收好：「我想把它画进我的画里，可以吗？」',
      '司徒仟笑道：「你每精进一分，我便多一分想为你题诗的冲动。」',
    ],
    martial: [
      '司徒仟远远看着，提笔记录：「她舞剑的样子，比任何仕女图都要动人。」',
      '司徒仟递来一块帕子：「你额上有汗，让我……」说到一半，脸红了。',
      '司徒仟喃喃：「这一幕，我要画下来，留作永念。」',
    ],
    labor: [
      '司徒仟默默在旁边陪着，偶尔帮你递个工具，什么也不说。',
      '司徒仟看着你的手，轻声道：「劳作后的手，也是一幅画。」',
      '司徒仟忽然道：「我来帮你，你只需告诉我该怎么做。」',
    ],
  },
  desert_friend: {
    art: [
      '沐风站在门口，挠了挠头：「你们中原人真奇怪，对着纸发呆也叫学习？」',
      '沐风凑过来看你写字，认真道：「这些弯弯绕绕，比沙漠的路还难走。」',
      '沐风悄悄放下一袋西域蜜枣：「吃了补脑，你读书太费神了。」',
    ],
    martial: [
      '沐风眼睛发亮，立刻跳出来：「我教你沙漠马背上的功夫！换你教我这招！」',
      '沐风拍腿叫好：「好！这一招我们草原也有，但你打得比我帅！」',
      '沐风在旁边跃跃欲试：「下次我们比试一场，如何？」',
    ],
    labor: [
      '沐风卷起袖子，大步走来：「一起干！两个人快一倍！」',
      '沐风干完活，拍拍肩膀：「你力气不小嘛，西域姑娘也不过如此！」',
      '沐风笑道：「干活就要这样，痛痛快快的，和骑骆驼一样！」',
    ],
  },
  royal_emperor: {
    art: [
      '皇上不知何时驻足于此，低声道：「朕见过无数才女，你这份专注，却是罕见。」',
      '皇上翻看你的习作，沉默良久，才道：「此字，可入御览。」',
      '皇上轻声叹道：「若你生在朝堂，必是朕之肱骨。」',
    ],
    martial: [
      '皇上远远看着，眼中有赞许：「有此胆魄，不输禁军。」',
      '皇上沉声道：「好。朕的江山，需要这样的人。」',
      '皇上低声道：「你这股劲，让朕想起了当年的自己。」',
    ],
    labor: [
      '皇上微微皱眉，似乎想说什么，最终只道：「辛苦了。」',
      '皇上负手而立，看了许久，轻声说：「朕……会记得你今日的样子。」',
      '皇上忽然开口：「朕可以为你做些什么？」',
    ],
  },
};

export default function App() {
  const [account, setAccount] = useState(() => getSavedToken());
  const [showIntro, setShowIntro] = useState(false);

  const bgmRef = React.useRef(null);
  const [bgmMuted, setBgmMuted] = useState(() => localStorage.getItem('bgmMuted') === 'true');

  const playBgm = React.useCallback(() => {
    const audio = bgmRef.current;
    if (!audio) return;
    audio.volume = 0.35;
    audio.loop = true;
    audio.muted = bgmMuted;
    audio.play().catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleBgm = () => {
    const next = !bgmMuted;
    setBgmMuted(next);
    localStorage.setItem('bgmMuted', String(next));
    if (bgmRef.current) bgmRef.current.muted = next;
  };

  const [username, setUsername] = useState(() => getSavedUsername());
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [accountError, setAccountError] = useState('');
  const [character, setCharacter] = useState(null);
  const [gameConfig, setGameConfig] = useState(null);
  const [currentScene, setCurrentScene] = useState('bedroom');
  const [sceneData, setSceneData] = useState(null);
  const [homeSubTab, setHomeSubTab] = useState('room');
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [courseResult, setCourseResult] = useState(null);
  const [ageGrowthModal, setAgeGrowthModal] = useState(null);
  const [ageStatus, setAgeStatus] = useState(null);
  const ageCheckTimerRef = useRef(null);
  // 始终保持最新的 gameMonth，避免 handleSceneChange 读到 character 上的 monthInfo 被覆盖问题
  const gameMonthRef = useRef(1);
  // 本月已访问的场景集合（内存，不用 localStorage 避免脏数据）
  const visitedScenesRef = useRef(new Set());
  // 本月每个场景已对话的NPC集合，key格式："sceneId:npcId"
  const talkedNpcsRef = useRef(new Set());
  const [giftModal, setGiftModal] = useState(null);
  const [roomActivityModal, setRoomActivityModal] = useState(null); // { activityName, gains, remaining }
  const [roomPlayingActivity, setRoomPlayingActivity] = useState(null); // { id, video, label } — 正在播放的活动
  const [showStreet, setShowStreet] = useState(false);
  const [courseSelections, setCourseSelections] = useState([]);
  const [courseModal, setCourseModal] = useState(null);
  const [laborSelections, setLaborSelections] = useState([]);
  const [laborModal, setLaborModal] = useState(null);
  // 记录每门课程的累计上课次数（从后端 game_state 加载）
  const [courseAttendCount, setCourseAttendCount] = useState({});
  const [courseStreak, setCourseStreak] = useState({});
  const [authLoading, setAuthLoading] = useState(false);
  // 道具奖励弹窗队列
  const [rewardItemQueue, setRewardItemQueue] = useState([]);
  // 探险地图
  const [showAdventureMap, setShowAdventureMap] = useState(false);
  const [pendingCourses, setPendingCourses] = useState(null);
  // 劳动/课程小游戏状态
  const [showRanchGame, setShowRanchGame] = useState(false);
  const [activeLaborGame, setActiveLaborGame] = useState(null);
  const [pendingCourseGames, setPendingCourseGames] = useState(null); // { queue: ['舞蹈','狩猎'], courses: [...], done: [] }
  const pendingCourseGamesRef = useRef(null);
  const [laborGameQueue, setLaborGameQueue] = useState([]);
  const [laborGameBonuses, setLaborGameBonuses] = useState({});
  const [pendingLabors, setPendingLabors] = useState(null);
  const laborGameQueueRef = useRef([]);
  const laborGameBonusesRef = useRef({});
  const pendingLaborsRef = useRef(null);
  // 桃花岛子场景访问次数
  const [peachIslandVisits, setPeachIslandVisits] = useState(() => {
    try { return JSON.parse(localStorage.getItem('peachIslandVisits') || '0'); } catch { return 0; }
  });
  // 本月探险次数（上限7次）
  const [adventureCount, setAdventureCount] = useState(0);
  // 各场景本月访问次数（用于轮换对话）
  const [sceneVisitCounts, setSceneVisitCounts] = useState({});
  // 疲惫度（从后端 game_state 加载）
  const [fatigue, setFatigue] = useState(0);
  // 琳琅繁街水果忍者触发
  const [streetFruitDialog, setStreetFruitDialog] = useState(false);
  const [streetFruitGame, setStreetFruitGame] = useState(false);
  // 生病弹窗
  const [illModal, setIllModal] = useState(false);
  // 休息弹窗
  const [restModal, setRestModal] = useState(null);
  // 场景本月已来过弹窗
  const [sceneVisitedModal, setSceneVisitedModal] = useState(false);
  // 礼仪院考试弹窗（announce=预告，exam=开考）
  const [etiquetteExamAnnounce, setEtiquetteExamAnnounce] = useState(false);
  const [etiquetteExam, setEtiquetteExam] = useState(false);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(() => {
    const initGame = async () => {
      try {
        const [charRes, configRes, ageRes, monthRes] = await Promise.all([
          axios.get(`${API_BASE}/character`),
          axios.get(`${API_BASE}/game-config`),
          axios.get(`${API_BASE}/age-status`),
          axios.get(`${API_BASE}/game/month-info`),
        ]);
        const charData = charRes.data.data;
        const monthData = monthRes.data.data;
        gameMonthRef.current = monthData.gameMonth;
        // 清理历史遗留的 sceneVisit localStorage 脏数据
        Object.keys(localStorage).forEach((k) => { if (k.startsWith('sceneVisit_')) localStorage.removeItem(k); });
        // 从后端恢复元数据（疲劳度、上课次数、连击）
        if (charData.fatigue !== undefined) setFatigue(charData.fatigue);
        if (charData.courseAttendCount) setCourseAttendCount(charData.courseAttendCount);
        if (charData.courseStreak) setCourseStreak(charData.courseStreak);
        // 将月份信息注入 character 对象，供 CharacterPanel 使用
        setCharacter({
          ...charData,
          gameMonth: monthData.gameMonth,
          monthInfo: monthData.monthInfo,
        });
        setGameConfig(configRes.data.data);
        setAgeStatus(ageRes.data.data);
        setLoading(false);
        setShowIntro(true); // 刷新后也先看介绍，介绍结束再播放BGM
      } catch (err) {
        showToast('连接服务器失败', 'error');
        setLoading(false);
      }
    };
    if (account) initGame();
  }, [showToast, account]);

  useEffect(() => {
    if (!character) return;
    const checkAge = async () => {
      try {
        const res = await axios.post(`${API_BASE}/age/check`);
        if (res.data.data.grew) {
          setCharacter(res.data.data.character);
          setAgeGrowthModal(res.data.data);
        }
        const ageRes = await axios.get(`${API_BASE}/age-status`);
        setAgeStatus(ageRes.data.data);
      } catch (err) {}
    };
    ageCheckTimerRef.current = setInterval(checkAge, 15000);
    return () => clearInterval(ageCheckTimerRef.current);
  }, [character]);

  // 月份推进后重置本月已访问场景记录
  const prevGameMonthForCleanupRef = React.useRef(null);
  useEffect(() => {
    const gm = character?.gameMonth;
    if (!gm) return;
    if (prevGameMonthForCleanupRef.current !== null && prevGameMonthForCleanupRef.current !== gm) {
      // 新的一月，清空访问记录并关闭弹窗
      visitedScenesRef.current = new Set();
      talkedNpcsRef.current = new Set();
      setSceneVisitedModal(false);
      setAdventureCount(0);
      setSceneVisitCounts({});
    }
    prevGameMonthForCleanupRef.current = gm;
  }, [character?.gameMonth]);

  const SKILL_NAMES = {
    wildness:'野性', vitality:'体力', spirit:'灵气', affinity:'亲和力', charm:'魅力',
    wisdom:'才学', courage:'胆识', culinary:'厨艺', medical:'医术', poetry:'诗才',
    music:'乐艺', painting:'画艺', reputation:'声望', rhetoric:'口才', statecraft:'政治',
    martial:'武术', command:'统帅', morality:'道德', arithmetic:'算数', crafting:'手工',
  };

  useEffect(() => {
    if (!character) return;
    const loadScene = async () => {
      try {
        const res = await axios.get(`${API_BASE}/scene/${currentScene}`);
        setSceneData(res.data.data);
      } catch (err) {
        if (err.response?.status === 403) setCurrentScene('bedroom');
      }
    };
    loadScene();
  }, [currentScene, character?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChangeDress = async (dressId) => {
    try { const res = await axios.post(`${API_BASE}/character/change-dress`, { dressId }); setCharacter(res.data.data); showToast(res.data.message); } catch (err) { showToast('换装失败', 'error'); }
  };
  const handleChangeAccessory = async (accessoryId) => {
    try { const res = await axios.post(`${API_BASE}/character/change-accessory`, { accessoryId }); setCharacter(res.data.data); showToast(res.data.message); } catch (err) { showToast('换装失败', 'error'); }
  };
  const handleUnlockItem = async (itemId, itemType) => {
    try {
      const res = await axios.post(`${API_BASE}/wardrobe/unlock`, { itemId, itemType });
      // 只更新金币，避免覆盖 monthInfo / gameMonth 等前端状态
      setCharacter(prev => prev ? { ...prev, gold: res.data.data.character?.gold ?? prev.gold } : prev);
      // 同步更新 gameConfig.wardrobe 中对应物品的解锁状态
      setGameConfig(prev => {
        if (!prev?.wardrobe) return prev;
        const collectionKey = itemType === 'dress' ? 'dresses' : itemType === 'accessory' ? 'accessories' : 'shoes';
        const collection = prev.wardrobe[collectionKey];
        if (!collection) return prev;
        return {
          ...prev,
          wardrobe: {
            ...prev.wardrobe,
            [collectionKey]: collection.map(item =>
              item.id === itemId ? { ...item, unlocked: true } : item
            ),
          },
        };
      });
      showToast(res.data.message, 'success');
    } catch (err) { showToast('购买失败', 'error'); }
  };
  const handleRoomActivity = async (act) => {
    try {
      // 先调后端，成功后再播视频
      const res = await axios.post(`${API_BASE}/room/activity`, { activityId: act.id });
      const { gains, character: pendingCharacter, insight, isPositive } = res.data.data;
      // 存结果（含 pendingCharacter），等视频播完再弹窗
      setRoomActivityModal({ activityName: act.label, gains, insight, isPositive, pendingCharacter });
      // 后端成功后才开始播放视频
      setRoomPlayingActivity(act);
    } catch (err) {
      showToast(err.response?.data?.message || '活动失败', 'error');
    }
  };

  const handleRoomVideoEnded = () => {
    // 视频播完：更新角色数据、恢复图片、显示弹窗
    if (roomActivityModal?.pendingCharacter) {
      setCharacter(roomActivityModal.pendingCharacter);
    }
    setRoomPlayingActivity(null);
    // modal 保留（去掉 pendingCharacter 字段）
    setRoomActivityModal(prev => prev
      ? { activityName: prev.activityName, gains: prev.gains, insight: prev.insight, isPositive: prev.isPositive }
      : null);
  };

  const handleAttendCourse = async (courseId) => {
    try { const res = await axios.post(`${API_BASE}/course/attend`, { courseId }); setCharacter(res.data.data.character); setCourseResult(res.data.data); showToast(res.data.message, 'success'); } catch (err) { showToast('课程参加失败', 'error'); }
  };
  const handleTalkToNpc = async (npcId) => {
    try {
      const res = await axios.post(`${API_BASE}/npc/talk`, { npcId });
      setCharacter(res.data.data.character);
      showToast(`${res.data.data.npc.name}："${res.data.data.dialogue}"`, 'dialogue');
    } catch (err) { showToast('对话失败', 'error'); }
  };

  // NPC热点点击拦截（返回true表示已处理，阻止气泡弹出）
  const handleNpcActivate = (npcId) => {
    const key = `${currentScene}:${npcId}`;
    if (talkedNpcsRef.current.has(key)) return true; // 本月已对话，阻止气泡
    return false;
  };

  // NPC气泡关闭回调（对话读完后触发）
  const handleNpcBubbleClose = (npcId) => {
    talkedNpcsRef.current.add(`${currentScene}:${npcId}`);
    if (npcId === 'med_doctor' && fatigue >= 100) {
      // 扣除100金币（不足则清零），清零疲惫度
      setCharacter(prev => prev ? { ...prev, gold: (prev.gold || 0) >= 100 ? (prev.gold || 0) - 100 : 0 } : prev);
      setFatigue(0);
      axios.post(`${API_BASE}/player/meta`, { fatigue: 0 }).catch(() => {});
      showToast('已付诊金百两，疲惫已消，好好休养', 'success');
    }
  };

  // 根据角色技能状态生成客栈动态对话
  const getInnDynamicDialogues = (npcId) => {
    if (!character) return null;
    const sk = character.skills || {};
    const monthInfo = character.monthInfo || {};
    const age = monthInfo.age || character.age || 15;
    const month = monthInfo.monthInYear || 1;

    // 20% 寒暄，80% 技能评价
    const roll = Math.random();

    // 寒暄库
    const greetings_keeper = [
      `凌小姐，${age}岁正是好年华，近来可好？掌柜我备了新茶，快坐下来歇歇！`,
      `哎呦，又是第${month}月，时光真快！凌小姐气色越来越好了，真是令人欣慰。`,
      `今日天气不错，凌小姐来得巧，厨房刚出锅了一道拿手菜，要不要尝尝？`,
      `凌小姐，您父亲上个月还托人带话来问您呢，说让您保重身体、莫要太拼。`,
    ];
    const greetings_friend = [
      `若雪丫头，这都${age}岁了，时间过得真快，伯伯看着你长大，心里高兴！`,
      `今日来客栈，没想到遇见你！这可真是缘分，快坐下来陪伯伯说说话。`,
      `你父亲最近写信来了，问你过得怎样，我说你一定很好，他放心多了。`,
    ];

    // 技能评价库（按各技能高低生成）
    const skillComments_keeper = [];
    const skillComments_friend = [];

    if (sk.charm >= 80) {
      skillComments_keeper.push('凌小姐如今在京城已是小有名气，听说好多贵家公子都打听你的消息呢，掌柜我可是与有荣焉！');
      skillComments_friend.push('若雪，你的魅力如今连我那犬子都夸，说你举止优雅、光彩照人，伯伯真是羡慕你父亲有你这样的女儿！');
    } else if (sk.charm >= 40) {
      skillComments_keeper.push('凌小姐最近仪态越来越好，举手投足间颇有大家闺秀的风范，往来客人都夸呢！');
      skillComments_friend.push('若雪，听说你礼仪课堂的学习大有长进，你父亲知道了一定很高兴！');
    }
    if (sk.wisdom >= 80) {
      skillComments_keeper.push('凌小姐才学渊博，前几日有位书院先生路过，说起京中才女，第一个就提到了你的名字！');
      skillComments_friend.push('若雪，你的学识已经远超同龄人了，伯伯听说书院的先生都对你赞不绝口！');
    } else if (sk.wisdom >= 40) {
      skillComments_keeper.push('听说凌小姐最近在书院颇为用功，连夫子都当众夸奖，真了不起！');
      skillComments_friend.push('你父亲说你近来才学进步神速，让伯伯替他好好夸夸你！');
    }
    if (sk.courage >= 60) {
      skillComments_keeper.push('凌小姐胆识过人，听说上次在马场策马奔腾，把一众少爷都比了下去，真是巾帼不让须眉！');
      skillComments_friend.push('若雪，你的胆识让伯伯刮目相看！敢做敢为，这才是凌家的风骨！');
    }
    if (sk.medical >= 50) {
      skillComments_keeper.push('凌小姐还懂医术？前几日一位客人突然身体不适，有人说若是凌小姐在就好了，真是多才多艺！');
      skillComments_friend.push('听说你在百草堂学了不少医术，若雪，你父亲说你将来必是济世之才！');
    }
    if (sk.music >= 50) {
      skillComments_keeper.push('上次凌小姐在这里抚了一曲，余音绕梁三日，客人们都说那是他们听过最美的琴声！');
      skillComments_friend.push('你的琴艺已经传到城里了，若雪！伯伯上次在茶馆里，还有人在议论你那首曲子呢。');
    }
    if (sk.painting >= 50) {
      skillComments_keeper.push('凌小姐的画作挂在书画苑里，听说好多人专门去观赏，掌柜我都想求一幅挂在客栈里！');
      skillComments_friend.push('你的画艺如今在城里颇有名声，若雪！伯伯早就说你有这方面的天赋！');
    }
    if (sk.culinary >= 40) {
      skillComments_keeper.push('凌小姐还懂厨艺？改天能否赏脸，来我们厨房露一手？客人们一定大开眼界！');
      skillComments_friend.push('听说你学了不少烹饪，若雪，改天做几道菜给伯伯尝尝！');
    }
    if (sk.wildness >= 60) {
      skillComments_keeper.push('凌小姐在草原骑马、在山间狩猎，那股子豪气，可不输给任何一位公子哥儿！');
      skillComments_friend.push('你这股子野性和胆气，跟你父亲年轻时一模一样！若雪，伯伯看着你，就像看到了当年的他。');
    }

    // 补充通用技能评价（确保总有内容）
    skillComments_keeper.push(
      `凌小姐如今${age}岁，正是大好年华，在这京城里，你的名声已经越来越响了！`,
      `听说凌小姐最近去了好几处地方游历，见识广博，眼界自然也不同凡响！`,
      `第${month}月了，凌小姐这一年来的变化真大，掌柜我看在眼里，替你高兴！`,
    );
    skillComments_friend.push(
      `若雪，你这${age}岁的年纪，已经比伯伯当年强太多了！你父亲真是有福气。`,
      `这是第${month}月了，时光飞逝，看着你一天天成长，伯伯心里说不出的高兴。`,
      `若雪，你近来的变化伯伯都看在眼里，你父亲托我转告：他为你骄傲！`,
    );

    const pool_keeper = roll < 0.2 ? greetings_keeper : skillComments_keeper;
    const pool_friend = roll < 0.2 ? greetings_friend : skillComments_friend;

    // 每次随机选1条，确保不重复（用当前月份+随机数做种）
    const shuffle = (arr) => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };

    if (npcId === 'inn_keeper') return [shuffle(pool_keeper)[0]];
    if (npcId === 'inn_father_friend') return [shuffle(pool_friend)[0]];
    return null;
  };

  const handleNpcChoice = async (npcId, choiceId) => {
    try { const res = await axios.post(`${API_BASE}/npc/choice`, { npcId, choiceId }); setCharacter(res.data.data.character); return res.data.data; } catch (err) { showToast('选择失败', 'error'); return null; }
  };
  const handleBuyShopItem = async (itemId) => {
    try { const res = await axios.post(`${API_BASE}/shop/buy`, { itemId }); setCharacter(res.data.data.character); showToast(res.data.message, 'success'); } catch (err) { showToast('购买失败', 'error'); }
  };
  const handleItemGift = async (giftItem) => {
    try {
      const res = await axios.post(`${API_BASE}/inventory/add`, { item: giftItem });
      setCharacter(prev => prev ? { ...prev, ...res.data.data.character, monthInfo: prev.monthInfo, gameMonth: prev.gameMonth } : prev);
    } catch (err) {
      // 后端失败时退回本地更新
      setCharacter(prev => {
        if (!prev) return prev;
        const inventory = prev.inventory ? [...prev.inventory] : [];
        inventory.push({ id: `gift_${Date.now()}`, name: giftItem.name, emoji: giftItem.emoji || '🎁', rarity: giftItem.rarity || 'common' });
        return { ...prev, inventory };
      });
    }
    setGiftModal(giftItem);
  };
  const handleSceneChange = (sceneId) => {
    setCurrentScene(sceneId);
    setCourseResult(null);
    setShowStreet(false);
    setHomeSubTab('outdoor');
    // 切换场景时关闭所有弹窗
    setSceneVisitedModal(false);
    setGiftModal(null);
    setRoomActivityModal(null);
    setStreetFruitDialog(false);
    setStreetFruitGame(false);
    setEtiquetteExamAnnounce(false);
    setEtiquetteExam(false);
    setIllModal(false);
    setRestModal(null);
    // 所有外出场景每月只能去一次（bedroom除外）
    // 用内存 Set 记录，彻底避免 localStorage 脏数据问题
    if (sceneId !== 'bedroom') {
      // 立即显示进入场景属性加成提示
      const sceneInfo = gameConfig?.scenes?.find(s => s.id === sceneId);
      const bonus = sceneInfo?.entryBonus;
      if (bonus && Object.keys(bonus).length > 0) {
        const parts = Object.entries(bonus).map(([k, v]) => `${SKILL_NAMES[k] || k} +${v}`);
        showToast(`✨ ${parts.join('　')}`, 'success');
        setCharacter(prev => {
          if (!prev) return prev;
          const newSkills = { ...prev.skills };
          for (const [k, v] of Object.entries(bonus)) {
            if (newSkills[k] !== undefined) newSkills[k] = Math.min(100, newSkills[k] + v);
          }
          return { ...prev, skills: newSkills };
        });
      }
      if (visitedScenesRef.current.has(sceneId)) {
        // 本月已来过 → 显示提示弹窗
        setTimeout(() => setSceneVisitedModal(true), 400);
      } else {
        // 本月首次到访 → 记录并触发特殊事件
        visitedScenesRef.current.add(sceneId);
        if (sceneId === 'ancient_street' && Math.random() < 0.3) {
          setTimeout(() => setStreetFruitDialog(true), 800);
        }
        if (sceneId === 'etiquette_hall' && Math.random() < 0.3) {
          setTimeout(() => setEtiquetteExamAnnounce(true), 800);
        }
      }
    }
  };
  const handleLeaveScene = () => { setShowStreet(true); };
  const handleGoHome = () => {
    setCurrentScene('bedroom'); setHomeSubTab('room'); setCourseResult(null);
    setGiftModal(null); setRoomActivityModal(null); setStreetFruitDialog(false);
    setStreetFruitGame(false); setEtiquetteExamAnnounce(false); setEtiquetteExam(false);
    setIllModal(false); setRestModal(null); setSceneVisitedModal(false);
  };

  // 结局弹窗状态
  const [endingModal, setEndingModal] = useState(null);

  // 处理 advance-month 响应：更新月份、角色状态，并在年龄增长时弹窗
  const applyAdvanceMonthResponse = useCallback((data) => {
    const { monthInfo, gameMonth, character: newChar, ageGrowth, ending } = data;
    gameMonthRef.current = gameMonth;
    if (newChar) {
      setCharacter(prev => prev ? { ...prev, ...newChar, monthInfo, gameMonth } : prev);
    } else {
      setCharacter(prev => prev ? { ...prev, monthInfo, gameMonth } : prev);
    }
    if (ageGrowth?.grew) {
      setAgeGrowthModal(ageGrowth);
      // 同步更新 gameConfig.wardrobe 解锁状态
      if (ageGrowth.newlyUnlockedDresses?.length > 0) {
        setGameConfig(prev => {
          if (!prev?.wardrobe) return prev;
          const unlockedIds = ageGrowth.newlyUnlockedDresses.map(d => d.id);
          return {
            ...prev,
            wardrobe: {
              ...prev.wardrobe,
              dresses: prev.wardrobe.dresses.map(d =>
                unlockedIds.includes(d.id) ? { ...d, unlocked: true } : d
              ),
            },
          };
        });
      }
    }
    // 到达18岁时展示结局
    if (ending) {
      // 延迟显示结局，让年龄增长弹窗先展示
      setTimeout(() => setEndingModal(ending), ageGrowth?.grew ? 2500 : 800);
    }
    return monthInfo;
  }, []);
  const handleResetGame = async () => { if (!window.confirm('确定要重置游戏吗？')) return; try { const res = await axios.post(`${API_BASE}/character/reset`); const resetData = res.data.data; gameMonthRef.current = 1; setCharacter({ ...resetData, monthInfo: resetData.monthInfo, gameMonth: 1 }); setCurrentScene('bedroom'); setHomeSubTab('room'); const [configRes, ageRes] = await Promise.all([axios.get(`${API_BASE}/game-config`), axios.get(`${API_BASE}/age-status`)]); setGameConfig(configRes.data.data); setAgeStatus(ageRes.data.data); showToast(res.data.message, 'success'); } catch (err) { showToast('重置失败', 'error'); } };
  const handleResetNpcVisits = async () => { if (!window.confirm('重置所有NPC的拜访记录？（剧情进度和好感度不受影响）')) return; try { await axios.post(`${API_BASE}/character/reset-npc-visits`); showToast('NPC拜访记录已重置，可以重新拜访啦', 'success'); } catch (err) { showToast('重置失败', 'error'); } };

  const handleLogout = () => {
    clearAuth();
    setAccount(null);
    setUsername(null);
    setCharacter(null);
    setGameConfig(null);
  };

  const handleCourseSelect = (index) => {
    if (courseSelections.includes(index)) {
      setCourseSelections(courseSelections.filter(i => i !== index));
    } else if (courseSelections.length < 3) {
      setCourseSelections([...courseSelections, index]);
    }
  };

  const REST_ENTRIES = [
    '在院子里赏花，心情舒畅，忘却烦恼。',
    '翻阅闲书，偶得一句佳句，令人回味无穷。',
    '与丫鬟嬉戏，笑声不断，好不惬意。',
    '静坐品茗，感受时光流逝，内心平静如水。',
    '午后小憩，梦见山间流水，醒来神清气爽。',
    '练习描红，笔墨飘香，心境渐渐平和。',
    '倚窗听雨，雨打芭蕉，思绪随之飘远。',
    '在花园中散步，蝴蝶翩翩，好不自在。',
    '抚琴一曲，琴声悠扬，烦恼随风而散。',
    '整理妆奁，把玩珠钗，心情愉悦。',
  ];

  const handleRest = async () => {
    // 推进月份（固定+1）
    let monthInfo = null;
    try {
      const res = await axios.post(`${API_BASE}/game/advance-month`);
      monthInfo = applyAdvanceMonthResponse(res.data.data);
    } catch (err) {}
    // 上报睡眠事件（咸鱼结局计数）
    axios.post(`${API_BASE}/game/event`, { eventType: 'sleep' }).catch(() => {});
    // 每次休息减少30疲惫度
    const newFatigue = Math.max(0, fatigue - 30);
    setFatigue(newFatigue);
    axios.post(`${API_BASE}/player/meta`, { fatigue: newFatigue }).catch(() => {});
    // 随机选2-3条休息收获
    const count = Math.random() < 0.5 ? 2 : 3;
    const shuffled = [...REST_ENTRIES].sort(() => Math.random() - 0.5);
    const entries = shuffled.slice(0, count);
    setRestModal({ entries, monthInfo });
    setCourseSelections([]);
    setLaborSelections([]);
  };

  // 有内置小游戏的课程（课程名 → LaborMiniGame的laborType）
  const COURSE_GAME_MAP = { '舞蹈': '舞蹈', '狩猎': '狩猎' };

  const handleConfirmCourses = async () => {
    if (fatigue >= 100) {
      setIllModal(true);
      return;
    }
    if (courseSelections.length !== 3) {
      showToast('请选择3门课程', 'error');
      return;
    }
    const selectedCourses = courseSelections.map(i => COURSE_NAMES[i]);

    // 提前算好本次浮动学费，检查和结算用同一组值
    const courseCosts = Object.fromEntries(selectedCourses.map(name => [name, randGold(COURSE_CONTENTS[name]?.cost || 0)]));
    const totalCost = Object.values(courseCosts).reduce((sum, v) => sum + v, 0);
    if (totalCost > 0 && (character?.gold || 0) < totalCost) {
      showToast(`无法缴纳学费（需${totalCost}金币），请先去劳动`, 'error');
      return;
    }

    // 如果选了探险课程，先进入探险地图
    if (selectedCourses.includes('探险')) {
      setShowAdventureMap(true);
      setPendingCourses({ courses: selectedCourses, courseCosts });
      return;
    }

    // 如果选了有小游戏的课程，先依次启动小游戏
    const gameQueue = selectedCourses.filter(c => COURSE_GAME_MAP[c]);
    if (gameQueue.length > 0) {
      const state = { queue: gameQueue, courses: selectedCourses, done: [], courseCosts };
      pendingCourseGamesRef.current = state;
      setPendingCourseGames(state);
      setActiveLaborGame(COURSE_GAME_MAP[gameQueue[0]]);
      return;
    }

    await doConfirmCourses(selectedCourses, courseCosts);
  };

  const handleCourseGameComplete = async (laborType, gameScore) => {
    setActiveLaborGame(null);
    const state = pendingCourseGamesRef.current;
    if (!state) return;
    const done = [...state.done, { course: laborType, score: gameScore }];
    const remaining = state.queue.slice(1);
    if (remaining.length > 0) {
      const next = { ...state, queue: remaining, done };
      pendingCourseGamesRef.current = next;
      setPendingCourseGames(next);
      setActiveLaborGame(COURSE_GAME_MAP[remaining[0]]);
    } else {
      pendingCourseGamesRef.current = null;
      setPendingCourseGames(null);
      await doConfirmCourses(state.courses, state.courseCosts);
    }
  };

  const doConfirmCourses = async (selectedCourses, precomputedCosts) => {
    // 扣除学费（使用检查时已确定的浮动值，或重新生成）
    const courseCosts = precomputedCosts || Object.fromEntries(selectedCourses.map(name => [name, randGold(COURSE_CONTENTS[name]?.cost || 0)]));
    const totalCost = Object.values(courseCosts).reduce((sum, v) => sum + v, 0);
    if (totalCost > 0) {
      try {
        const spendRes = await axios.post(`${API_BASE}/gold/spend`, {
          amount: totalCost,
          source: `课程学费：${selectedCourses.join('、')}`,
        });
        setCharacter(prev => prev ? { ...prev, gold: spendRes.data.data.character?.gold ?? prev.gold } : prev);
      } catch (err) {
        // 金币扣除失败（理论上前置检查已保证足够）
      }
    }

    // 更新上课次数并检查奖励
    const updatedAttendCount = { ...courseAttendCount };
    const rewards = [];
    selectedCourses.forEach(course => {
      const currentCount = updatedAttendCount[course] || 0;
      const newCount = currentCount + 1;
      updatedAttendCount[course] = newCount;
      // 检查奖励节点
      if (newCount === 5 || newCount === 10 || newCount === 20) {
        const reward = COURSE_REWARDS[course]?.[newCount];
        if (reward) rewards.push({ ...reward, courseName: course, milestone: newCount });
      }
    });
    setCourseAttendCount(updatedAttendCount);

    // ── 连击 streak 计算 ──
    const streakData = { ...courseStreak };
    // 只有3门课全部相同时才算连击（简化：取第一门课判断）
    const primaryCourse = selectedCourses[0];
    const allSame = selectedCourses.every(c => c === primaryCourse);
    let currentStreak = 0;
    if (allSame) {
      currentStreak = (streakData[primaryCourse] || 0) + 1;
      streakData[primaryCourse] = currentStreak;
    } else {
      // 中断，清零所有连击
      Object.keys(streakData).forEach(k => { streakData[k] = 0; });
    }
    setCourseStreak(streakData);

    // 结算课程技能增益（先于月份推进，确保结局判定时技能已更新）
    const skillDeltas = {};
    selectedCourses.forEach(course => {
      const content = COURSE_CONTENTS[course];
      if (content?.skills) {
        content.skills.forEach(({ key, delta }) => {
          // 连击加成：3次+50%，5次+100%
          const multiplier = currentStreak >= 5 ? 2.0 : currentStreak >= 3 ? 1.5 : 1.0;
          skillDeltas[key] = (skillDeltas[key] || 0) + Math.ceil(delta * multiplier);
        });
      }
    });
    // 记录应用前的技能快照，供弹窗显示 before 值
    const skillsBefore = { ...(character?.skills || {}) };
    if (Object.keys(skillDeltas).length > 0) {
      try {
        const skillRes = await axios.post(`${API_BASE}/skills/apply-course`, { skillDeltas, courseNames: selectedCourses });
        setCharacter(prev => prev ? { ...prev, skills: skillRes.data.data.character.skills } : prev);
      } catch (err) {
        // 技能结算失败不阻断流程
      }
    }

    // ── 里程碑检测 ──
    const skillsAfterCourse = { ...skillsBefore };
    Object.entries(skillDeltas).forEach(([k, d]) => { skillsAfterCourse[k] = Math.min(100, (skillsAfterCourse[k] || 0) + d); });
    const SKILL_LABELS_MAP = { wisdom:'才学',charm:'魅力',spirit:'灵性',affinity:'亲和',courage:'胆识',vitality:'体力',wildness:'野性',culinary:'厨艺',medical:'医术',poetry:'诗才',music:'音律',painting:'丹青',rhetoric:'口才',statecraft:'谋略',arithmetic:'算术',crafting:'工艺',morality:'德行',reputation:'声誉' };
    const milestones = [];
    Object.entries(skillDeltas).forEach(([key, delta]) => {
      const before = skillsBefore[key] || 0;
      const after = Math.min(100, before + delta);
      for (const m of [50, 80, 100]) {
        if (before < m && after >= m) {
          const title = SKILL_MILESTONE_TITLES[key]?.[m];
          if (title) milestones.push({ skillKey: key, label: SKILL_LABELS_MAP[key] || key, newVal: after, milestone: m, title });
          break;
        }
      }
    });

    // ── 随机事件（15%概率）──
    let randomEvent = null;
    if (Math.random() < 0.15) {
      const pool = RANDOM_EVENTS_COURSE;
      randomEvent = pool[Math.floor(Math.random() * pool.length)];
      if (randomEvent.skillKey && randomEvent.delta) {
        try {
          await axios.post(`${API_BASE}/skills/apply-course`, {
            skillDeltas: { [randomEvent.skillKey]: randomEvent.delta },
            courseNames: ['随机事件'],
          });
        } catch {}
      }
    }

    // ── NPC旁观评论（好感≥50，25%概率）──
    const ROMANCE_NPC_IDS = ['wangwenyu','mufengongzi','sitouqian','desert_friend','royal_emperor'];
    const fav = character?.favorability || {};
    const eligibleNpcs = ROMANCE_NPC_IDS.filter(id => (fav[id] || 0) >= 50);
    let npcComment = null;
    if (eligibleNpcs.length > 0 && Math.random() < 0.25) {
      const npcId = eligibleNpcs[Math.floor(Math.random() * eligibleNpcs.length)];
      const courseCategories = { art: ['书画','文学','法术','丝竹乐器','茶艺文化','天文历法','珠算','烹饪艺术','酿酒工艺'], martial: ['武术器械','弓箭制造','马术','蹴鞠','狩猎','探险','航海技术'], medical: ['中医本草','针灸推拿'] };
      let category = 'art';
      for (const [cat, courseList] of Object.entries(courseCategories)) {
        if (selectedCourses.some(c => courseList.includes(c))) { category = cat; break; }
      }
      const comments = NPC_COMMENTS[npcId]?.[category] || NPC_COMMENTS[npcId]?.art || [];
      if (comments.length > 0) {
        npcComment = { npcId, text: comments[Math.floor(Math.random() * comments.length)] };
      }
    }

    // 增加疲惫度
    const newFatigue = Math.min(100, fatigue + 15);
    setFatigue(newFatigue);
    axios.post(`${API_BASE}/player/meta`, { fatigue: newFatigue, courseAttendCount: updatedAttendCount, courseStreak: streakData }).catch(() => {});

    // 调用月份推进API（技能已结算，结局判定时数据正确）
    let monthInfo = null;
    try {
      const res = await axios.post(`${API_BASE}/game/advance-month`);
      monthInfo = applyAdvanceMonthResponse(res.data.data);
    } catch (err) {
      // 即使月份推进失败，也显示课程弹窗
    }

    // 30% 概率弹出课程心得 toast
    if (Math.random() < 0.30) {
      const insightCourse = selectedCourses[Math.floor(Math.random() * selectedCourses.length)];
      const insightDesc = COURSE_CONTENTS[insightCourse]?.desc;
      if (insightDesc) setTimeout(() => showToast(`💭 ${insightDesc}`, 'info'), 800);
    }

    setCourseModal({ courses: selectedCourses, monthInfo, rewards, skillsBefore, streak: currentStreak, streakCourse: allSame ? primaryCourse : null, milestones, randomEvent, npcComment });
  };

  const handleLaborSelect = (index) => {
    if (laborSelections.includes(index)) {
      setLaborSelections(laborSelections.filter(i => i !== index));
    } else if (laborSelections.length < 3) {
      setLaborSelections([...laborSelections, index]);
    }
  };

  const MINI_GAME_LABORS = ['牧羊放牛', '织布纺纱'];

  const getLaborBonusGold = (laborName, gameScore) => {
    return Math.max(0, Math.min(50, Math.floor(gameScore)));
  };

  const launchLaborGame = (laborName) => {
    if (laborName === '牧羊放牛') {
      setShowRanchGame(true);
      setActiveLaborGame(null);
      return;
    }
    setShowRanchGame(false);
    setActiveLaborGame(laborName);
  };

  const settleLabors = async (selectedLabors, gameBonuses = {}) => {
    const laborGolds = Object.fromEntries(selectedLabors.map(name => [name, randGold(LABOR_CONTENTS[name]?.gold || 0)]));
    const baseGold = Object.values(laborGolds).reduce((sum, v) => sum + v, 0);
    const bonusGold = Object.values(gameBonuses).reduce((sum, val) => sum + (val || 0), 0);
    const totalGold = baseGold + bonusGold;

    try {
      const source = bonusGold > 0
        ? `古代劳动：${selectedLabors.join('、')}（小游戏奖励+${bonusGold}）`
        : `古代劳动：${selectedLabors.join('、')}`;
      const res = await axios.post(`${API_BASE}/earn/claim`, { amount: totalGold, source });
      setCharacter(prev => prev ? { ...prev, gold: res.data.data.character?.gold ?? prev.gold } : prev);
    } catch (err) {
      // 即使更新失败，也显示劳动弹窗
    }

    // 结算劳动技能增益（先于月份推进，确保结局判定时技能已更新）
    const laborSkillsBefore = { ...(character?.skills || {}) };
    const laborSkillDeltas = {};
    selectedLabors.forEach(labor => {
      const content = LABOR_CONTENTS[labor];
      if (content?.skills) {
        content.skills.forEach(({ key, delta }) => {
          laborSkillDeltas[key] = (laborSkillDeltas[key] || 0) + delta;
        });
      }
    });
    if (Object.keys(laborSkillDeltas).length > 0) {
      try {
        const skillRes = await axios.post(`${API_BASE}/skills/apply-course`, {
          skillDeltas: laborSkillDeltas,
          courseNames: selectedLabors,
        });
        setCharacter(prev => prev ? { ...prev, skills: skillRes.data.data.character.skills } : prev);
      } catch (err) {
        // 技能结算失败不阻断流程
      }
    }

    // ── 里程碑检测（劳动）──
    const SKILL_LABELS_MAP_L = { wisdom:'才学',charm:'魅力',spirit:'灵性',affinity:'亲和',courage:'胆识',vitality:'体力',wildness:'野性',culinary:'厨艺',medical:'医术',poetry:'诗才',music:'音律',painting:'丹青',rhetoric:'口才',statecraft:'谋略',arithmetic:'算术',crafting:'工艺',morality:'德行',reputation:'声誉' };
    const laborMilestones = [];
    Object.entries(laborSkillDeltas).forEach(([key, delta]) => {
      const before = laborSkillsBefore[key] || 0;
      const after = Math.min(100, before + delta);
      for (const m of [50, 80, 100]) {
        if (before < m && after >= m) {
          const title = SKILL_MILESTONE_TITLES[key]?.[m];
          if (title) laborMilestones.push({ skillKey: key, label: SKILL_LABELS_MAP_L[key] || key, newVal: after, milestone: m, title });
          break;
        }
      }
    });

    // ── 随机事件（劳动，15%概率）──
    let laborRandomEvent = null;
    if (Math.random() < 0.15) {
      const pool = RANDOM_EVENTS_LABOR;
      laborRandomEvent = pool[Math.floor(Math.random() * pool.length)];
      if (laborRandomEvent.skillKey && laborRandomEvent.delta) {
        try {
          await axios.post(`${API_BASE}/skills/apply-course`, {
            skillDeltas: { [laborRandomEvent.skillKey]: laborRandomEvent.delta },
            courseNames: ['随机事件'],
          });
        } catch {}
      }
    }

    // ── NPC旁观评论（劳动，25%概率）──
    const ROMANCE_NPC_IDS_L = ['wangwenyu','mufengongzi','sitouqian','desert_friend','royal_emperor'];
    const favL = character?.favorability || {};
    const eligibleNpcsL = ROMANCE_NPC_IDS_L.filter(id => (favL[id] || 0) >= 50);
    let laborNpcComment = null;
    if (eligibleNpcsL.length > 0 && Math.random() < 0.25) {
      const npcId = eligibleNpcsL[Math.floor(Math.random() * eligibleNpcsL.length)];
      const comments = NPC_COMMENTS[npcId]?.labor || [];
      if (comments.length > 0) {
        laborNpcComment = { npcId, text: comments[Math.floor(Math.random() * comments.length)] };
      }
    }

    // 增加疲惫度
    const newFatigue = Math.min(100, fatigue + 15);
    setFatigue(newFatigue);
    axios.post(`${API_BASE}/player/meta`, { fatigue: newFatigue }).catch(() => {});

    // 每次劳动结算固定推进1个月（技能已结算，结局判定时数据正确）
    try {
      const monthRes = await axios.post(`${API_BASE}/game/advance-month`);
      applyAdvanceMonthResponse(monthRes.data.data);
    } catch (err) {}

    setLaborModal({ labors: selectedLabors, gameBonuses, bonusGold, milestones: laborMilestones, randomEvent: laborRandomEvent, npcComment: laborNpcComment });
    setPendingLabors(null);
    setLaborGameQueue([]);
    setLaborGameBonuses({});
    pendingLaborsRef.current = null;
    laborGameQueueRef.current = [];
    laborGameBonusesRef.current = {};
  };

  const handleConfirmLabors = async () => {
    if (fatigue >= 100) {
      setIllModal(true);
      return;
    }
    if (laborSelections.length !== 3) {
      showToast('请选择3种劳动', 'error');
      return;
    }
    const selectedLabors = laborSelections.map(i => LABOR_NAMES[i]);

    const queue = selectedLabors.filter(name => MINI_GAME_LABORS.includes(name));
    if (queue.length > 0) {
      setPendingLabors(selectedLabors);
      setLaborGameQueue(queue);
      setLaborGameBonuses({});
      pendingLaborsRef.current = selectedLabors;
      laborGameQueueRef.current = queue;
      laborGameBonusesRef.current = {};
      launchLaborGame(queue[0]);
      return;
    }

    await settleLabors(selectedLabors, {});
  };

  const handleLaborGameComplete = async (laborName, gameScore) => {
    const bonus = getLaborBonusGold(laborName, gameScore);
    const mergedBonuses = { ...laborGameBonusesRef.current, [laborName]: bonus };

    laborGameBonusesRef.current = mergedBonuses;
    setShowRanchGame(false);
    setActiveLaborGame(null);
    setLaborGameBonuses(mergedBonuses);

    const queue = laborGameQueueRef.current;
    const currentIndex = queue.indexOf(laborName);
    const remainingQueue = currentIndex >= 0 ? queue.slice(currentIndex + 1) : queue.slice(1);

    laborGameQueueRef.current = remainingQueue;
    setLaborGameQueue(remainingQueue);

    if (remainingQueue.length > 0) {
      launchLaborGame(remainingQueue[0]);
      return;
    }

    const finalLabors = pendingLaborsRef.current;
    if (finalLabors && finalLabors.length > 0) {
      await settleLabors(finalLabors, mergedBonuses);
    }
  };

  // ==================== 登录/注册界面 ====================
  if (!account) {
    const inputStyle = (hasError) => ({
      width: '100%', boxSizing: 'border-box',
      background: 'rgba(255,255,255,0.06)',
      border: `1px solid ${hasError ? 'rgba(239,68,68,0.7)' : 'rgba(212,81,122,0.4)'}`,
      borderRadius: '10px',
      color: '#F4A0C0', fontSize: '15px',
      padding: '11px 16px',
      outline: 'none',
      fontFamily: 'inherit',
    });
    const handleAuth = async () => {
      const uname = usernameInput.trim();
      const pwd = passwordInput;
      if (!uname || !pwd) { setAccountError('请填写用户名和密码'); return; }
      setAuthLoading(true);
      setAccountError('');
      try {
        const endpoint = authMode === 'register' ? '/auth/register' : '/auth/login';
        const res = await axios.post(`${API_BASE}${endpoint}`, { username: uname, password: pwd });
        const { token, username: uname2 } = res.data.data || res.data;
        saveAuth(token, uname2);
        setUsername(uname2);
        setAccount(token);
        setShowIntro(true); // 登录后先看介绍，介绍结束再播放BGM
      } catch (err) {
        const msg = err.response?.data?.error || (authMode === 'register' ? '注册失败' : '用户名或密码错误');
        setAccountError(msg);
      } finally {
        setAuthLoading(false);
      }
    };
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a0a0f 0%, #2d1520 50%, #1a0a0f 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          background: 'rgba(30,10,20,0.95)',
          border: '2px solid rgba(212,81,122,0.5)',
          borderRadius: '24px',
          padding: '48px 40px',
          width: '340px',
          boxShadow: '0 0 60px rgba(212,81,122,0.2)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px',
        }}>
          <div style={{ fontSize: '56px' }}>🏯</div>
          <div style={{ color: '#F4A0C0', fontSize: '22px', fontWeight: '700', letterSpacing: '4px' }}>锦年如雪</div>
          {/* 登录/注册切换 */}
          <div style={{ display: 'flex', gap: '0', width: '100%', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(212,81,122,0.4)' }}>
            {['login', 'register'].map(mode => (
              <button key={mode} onClick={() => { setAuthMode(mode); setAccountError(''); }}
                style={{
                  flex: 1, padding: '9px', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: '14px', fontWeight: '600', letterSpacing: '1px',
                  background: authMode === mode ? 'rgba(192,82,106,0.7)' : 'transparent',
                  color: authMode === mode ? 'white' : 'rgba(244,160,192,0.6)',
                  transition: 'all 0.2s',
                }}>
                {mode === 'login' ? '登录' : '注册'}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={usernameInput}
            onChange={e => { setUsernameInput(e.target.value); setAccountError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleAuth()}
            placeholder="用户名（2-20字符）"
            autoFocus
            style={inputStyle(false)}
          />
          <input
            type="password"
            value={passwordInput}
            onChange={e => { setPasswordInput(e.target.value); setAccountError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleAuth()}
            placeholder="密码（至少6位）"
            style={inputStyle(!!accountError)}
          />
          {accountError && (
            <div style={{ color: 'rgba(239,68,68,0.9)', fontSize: '13px', textAlign: 'center', marginTop: '-8px' }}>
              {accountError}
            </div>
          )}
          <button
            onClick={handleAuth}
            disabled={authLoading}
            style={{
              width: '100%',
              background: authLoading ? 'rgba(120,50,70,0.5)' : 'linear-gradient(135deg, #c0526a, #a03050)',
              border: 'none', borderRadius: '12px',
              color: 'white', fontSize: '16px', fontWeight: '700',
              padding: '14px', cursor: authLoading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              letterSpacing: '2px',
            }}
          >
            {authLoading ? '请稍候…' : (authMode === 'login' ? '进入游戏' : '创建账号')}
          </button>
        </div>
      </div>
    );
  }

  if (loading) return <LoadingScreen />;

  if (showIntro) return (
    <>
      <audio ref={bgmRef} src="/assets/bgm.mp3" preload="auto" />
      <IntroSlides onFinish={() => {
        setShowIntro(false);
        setTimeout(playBgm, 100);
      }} />
    </>
  );
  if (!character || !gameConfig) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '20px', background: 'linear-gradient(135deg, #1a0a0f, #2d1520)' }}>
      <div style={{ fontSize: '60px' }}>🏯</div>
      <div style={{ color: '#F4A0C0' }}>无法连接到游戏服务器</div>
      <button onClick={() => window.location.reload()}>重新连接</button>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1a0a0f 0%, #2d1520 50%, #1a0a0f 100%)', position: 'relative', overflow: 'hidden' }}>
      <audio ref={bgmRef} src="/assets/bgm.mp3" preload="auto" />
      <button
        onClick={toggleBgm}
        title={bgmMuted ? '开启音乐' : '静音'}
        style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 200,
          width: '40px', height: '40px', borderRadius: '50%',
          background: 'rgba(20,8,15,0.85)', border: '1px solid rgba(212,81,122,0.4)',
          color: bgmMuted ? 'rgba(244,160,192,0.35)' : '#F4A0C0',
          fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(10px)', transition: 'all 0.2s',
        }}
      >
        {bgmMuted ? '🔇' : '🎵'}
      </button>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, background: 'radial-gradient(ellipse at 10% 20%, rgba(212,81,122,0.08) 0%, transparent 40%)' }} />
      <TopBar character={character} onReset={handleResetGame} onResetNpcVisits={handleResetNpcVisits} onLogout={handleLogout} username={username} />
      <div style={{ paddingTop: '65px', position: 'relative', zIndex: 1 }}>
        {homeSubTab === 'outdoor' && sceneData && !showStreet ? (
          <div style={{ margin: '0 auto', padding: '20px 16px 100px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 260px', gap: '16px', alignItems: 'start' }}>
              <div style={{ position: 'sticky', top: '90px' }}><CharacterPanel character={character} gameConfig={gameConfig} currentScene={currentScene} ageStatus={ageStatus} fatigue={fatigue} /></div>
              <div style={{ position: 'relative' }}>
                {sceneVisitedModal && (
                  <div style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'rgba(5,2,5,0.82)', backdropFilter: 'blur(6px)', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'all' }}>
                    <div style={{ textAlign: 'center', padding: '32px 36px' }}>
                      <div style={{ fontSize: '44px', marginBottom: '14px' }}>🌙</div>
                      <div style={{ fontSize: '17px', fontWeight: '700', color: '#C9A84C', marginBottom: '10px' }}>本月已来过</div>
                      <p style={{ fontSize: '13px', color: 'rgba(245,230,236,0.65)', lineHeight: 1.9, margin: 0 }}>
                        凌小姐，您这月已经来过此地了。<br />下月再来，或许会有新的缘分。
                      </p>
                    </div>
                  </div>
                )}
                <SceneView
                  sceneData={(() => {
                    let sd = sceneData;
                    if (currentScene === 'inn' && sd.npcs) {
                      sd = {
                        ...sd,
                        npcs: sd.npcs.map(npc => {
                          const dynDialogues = getInnDynamicDialogues(npc.id);
                          return dynDialogues ? { ...npc, dialogues: dynDialogues } : npc;
                        })
                      };
                    }
                    if (currentScene === 'medicine_hall' && fatigue >= 100 && sd.npcs) {
                      sd = {
                        ...sd,
                        npcs: sd.npcs.map(npc => {
                          if (npc.id === 'med_doctor') {
                            return {
                              ...npc,
                              dialogues: [
                                '唉，凌小姐，你这面色憔悴，眼下青黑，乃是过度操劳、气血两亏之症。',
                                '老夫把脉……脉象细弱无力，确是积劳成疾。你近来是否夜不能寐、食欲不振？',
                                '老夫开一副调养方子：黄芪、当归、红枣各三钱，煎水服用，连服七日。',
                                '医嘱：切记劳逸结合，莫要再如此拼命了。身体乃是本钱，若垮了，什么都是空谈。',
                                '诊金百两，药材费另算。凌小姐，好好休养，下月再来复诊。',
                              ]
                            };
                          }
                          return npc;
                        })
                      };
                    }
                    return sd;
                  })()}
                  scenes={gameConfig.scenes} character={character} wardrobe={gameConfig.wardrobe} courseResult={courseResult} skillConfig={gameConfig.skillConfig} shopItems={gameConfig.shopItems || []} onAttendCourse={handleAttendCourse} onTalkToNpc={handleTalkToNpc} onNpcChoice={handleNpcChoice} onSceneChange={handleSceneChange} onBuyItem={handleBuyShopItem} onItemGift={handleItemGift} currentScene={currentScene} onInteractionEnd={() => {}} onNpcActivate={handleNpcActivate} onNpcBubbleClose={handleNpcBubbleClose} />
              </div>
              <div style={{ position: 'sticky', top: '90px' }}><NavigationBar scenes={gameConfig.scenes} currentScene={currentScene} character={character} onSceneChange={handleSceneChange} activeTab={homeSubTab} onTabChange={setHomeSubTab} onGoHome={handleGoHome} /></div>
            </div>
          </div>
        ) : homeSubTab === 'outdoor' && showStreet ? (
          <div style={{ margin: '0 auto', padding: '20px 16px 100px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 260px', gap: '16px', alignItems: 'start' }}>
              <div style={{ position: 'sticky', top: '90px' }}><CharacterPanel character={character} gameConfig={gameConfig} currentScene={currentScene} ageStatus={ageStatus} fatigue={fatigue} /></div>
              <div style={{ position: 'relative', width: '100%', height: 'calc(100vh - 200px)', minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(5,2,5,0.5)', borderRadius: '18px', overflow: 'hidden', border: '2px solid rgba(212,81,122,0.4)' }}>
                <img src={streetImage} alt="街道" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              </div>
              <div style={{ position: 'sticky', top: '90px' }}><NavigationBar scenes={gameConfig.scenes} currentScene={currentScene} character={character} onSceneChange={handleSceneChange} activeTab={homeSubTab} onTabChange={setHomeSubTab} onGoHome={handleGoHome} /></div>
            </div>
          </div>
        ) : homeSubTab === 'shop' ? (
          <div style={{ margin: '0 auto', padding: '20px 16px 100px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 260px', gap: '16px', alignItems: 'start' }}>
              <div style={{ position: 'sticky', top: '90px' }}><CharacterPanel character={character} gameConfig={gameConfig} currentScene={currentScene} ageStatus={ageStatus} fatigue={fatigue} /></div>
              <div>
                <ShopPanel shopItems={gameConfig.shopItems || []} character={character} skillConfig={gameConfig.skillConfig} onBuyItem={handleBuyShopItem} />
              </div>
              <div style={{ position: 'sticky', top: '90px' }}><NavigationBar scenes={gameConfig.scenes} currentScene={currentScene} character={character} onSceneChange={handleSceneChange} activeTab={homeSubTab} onTabChange={setHomeSubTab} onGoHome={handleGoHome} /></div>
            </div>
          </div>
        ) : (
          <div style={{ margin: '0 auto', padding: '20px 16px 100px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 260px', gap: '16px', alignItems: 'start' }}>
              <div style={{ position: 'sticky', top: '90px' }}><CharacterPanel character={character} gameConfig={gameConfig} currentScene={currentScene} ageStatus={ageStatus} fatigue={fatigue} /></div>
              <div>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', background: 'rgba(40,15,25,0.6)', borderRadius: '12px', padding: '4px' }}>
                  {[{ id: 'room', label: '🛏️ 房间' }, { id: 'course', label: '📚 课程' }, { id: 'labor', label: '⚒️ 劳动' }, { id: 'wardrobe', label: '👗 衣橱' }, { id: 'inventory', label: '🎒 装备' }, { id: 'skills', label: '✨ 技能' }, { id: 'log', label: '📜 日记' }].map(tab => (
                    <button key={tab.id} onClick={() => { setHomeSubTab(tab.id); setCourseSelections([]); setLaborSelections([]); }} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px', fontWeight: '600', background: homeSubTab === tab.id ? 'linear-gradient(135deg, #D4517A, #A03058)' : 'transparent', color: homeSubTab === tab.id ? 'white' : 'rgba(245,230,236,0.6)' }}>{tab.label}</button>
                  ))}
                </div>
                {homeSubTab === 'room' && sceneData && (
                  <div>
                    <div style={{ width: '100%', position: 'relative', paddingTop: '56.25%', borderRadius: '18px', overflow: 'hidden', border: `2px solid ${roomPlayingActivity ? roomPlayingActivity.color + '80' : 'rgba(212,81,122,0.4)'}`, background: 'linear-gradient(135deg, #1a0a0f, #2d1520)', transition: 'border-color 0.3s' }}>
                      {roomPlayingActivity ? (
                        <video
                          key={roomPlayingActivity.id}
                          autoPlay
                          playsInline
                          onEnded={handleRoomVideoEnded}
                          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                        >
                          <source src={roomPlayingActivity.video} type="video/mp4" />
                        </video>
                      ) : (
                        <img
                          src={sceneData.scene?.activeImage}
                          alt={sceneData.scene?.name || '场景'}
                          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      )}
                    </div>
                    <RoomActivities onActivity={handleRoomActivity} playingId={roomPlayingActivity?.id} character={character} />
                  </div>
                )}
                {homeSubTab === 'course' && (
                  <CoursePanelWithPositioning
                    courseSelections={courseSelections}
                    onCourseSelect={handleCourseSelect}
                    onConfirm={handleConfirmCourses}
                    onRest={handleRest}
                  />
                )}
                {homeSubTab === 'labor' && (
                  <LaborPanelWithPositioning
                    laborSelections={laborSelections}
                    onLaborSelect={handleLaborSelect}
                    onConfirm={handleConfirmLabors}
                    onRest={handleRest}
                  />
                )}
                {homeSubTab === 'wardrobe' && <WardrobePanel wardrobe={gameConfig.wardrobe} character={character} onChangeDress={handleChangeDress} onChangeAccessory={handleChangeAccessory} onUnlockItem={handleUnlockItem} />}
                {homeSubTab === 'inventory' && <InventoryPanel inventory={character?.inventory || []} skillConfig={gameConfig.skillConfig} />}
                {homeSubTab === 'skills' && <SkillsPanel character={character} skillConfig={gameConfig.skillConfig} courses={gameConfig.courses} />}
                {homeSubTab === 'log' && <ActivityLog apiBase={API_BASE} />}
              </div>
              <div style={{ position: 'sticky', top: '90px' }}><NavigationBar scenes={gameConfig.scenes} currentScene={currentScene} character={character} onSceneChange={handleSceneChange} activeTab={homeSubTab} onTabChange={setHomeSubTab} onGoHome={handleGoHome} /></div>
            </div>
          </div>
        )}
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {ageGrowthModal && <AgeGrowthModal ageGrowth={ageGrowthModal} onClose={() => setAgeGrowthModal(null)} />}
      {endingModal && <EndingModal ending={endingModal} character={character} onClose={() => setEndingModal(null)} onNewGame={handleResetGame} />}
      {giftModal && <ItemGiftModal item={giftModal} onClose={() => setGiftModal(null)} />}
      {roomActivityModal && !roomActivityModal.pendingCharacter && <RoomActivityModal data={roomActivityModal} skillConfig={gameConfig?.skillConfig} onClose={() => setRoomActivityModal(null)} />}
      {showAdventureMap && (
        <AdventureMapScene
          character={character}
          peachIslandVisits={peachIslandVisits}
          setPeachIslandVisits={setPeachIslandVisits}
          adventureCount={adventureCount}
          setAdventureCount={setAdventureCount}
          sceneVisitCounts={sceneVisitCounts}
          setSceneVisitCounts={setSceneVisitCounts}
          onClose={() => {
            setShowAdventureMap(false);
            if (pendingCourses) {
              const { courses, courseCosts } = pendingCourses;
              setPendingCourses(null);
              // 探险结束后，检查是否还有小游戏需要先跑
              const gameQueue = courses.filter(c => COURSE_GAME_MAP[c]);
              if (gameQueue.length > 0) {
                const state = { queue: gameQueue, courses, done: [], courseCosts };
                pendingCourseGamesRef.current = state;
                setPendingCourseGames(state);
                setActiveLaborGame(COURSE_GAME_MAP[gameQueue[0]]);
              } else {
                doConfirmCourses(courses, courseCosts);
              }
            }
          }}
        />
      )}
      {showRanchGame && (
        <RanchGame key="牧羊放牛" onComplete={(score) => handleLaborGameComplete('牧羊放牛', score)} onExit={() => handleLaborGameComplete('牧羊放牛', 0)} />
      )}
      {activeLaborGame && (
        <LaborMiniGame
          key={activeLaborGame}
          laborType={activeLaborGame}
          onComplete={pendingCourseGamesRef.current ? handleCourseGameComplete : handleLaborGameComplete}
        />
      )}
      {courseModal && (
        <CourseScheduleModal
          courseModal={courseModal}
          character={character}
          onAddInventory={(item) => {
            setCharacter(prev => {
              if (!prev) return prev;
              const inventory = prev.inventory ? [...prev.inventory] : [];
              inventory.push({ id: `reward_${Date.now()}_${Math.random()}`, name: item.name, emoji: item.icon, rarity: 'rare' });
              return { ...prev, inventory };
            });
          }}
          onClose={() => { setCourseModal(null); setCourseSelections([]); }}
        />
      )}
      {laborModal && <LaborScheduleModal laborModal={laborModal} character={character} onClose={() => { setLaborModal(null); setLaborSelections([]); }} />}


      {/* 礼仪院考试预告弹窗 */}
      {etiquetteExamAnnounce && (
        <div style={{ position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)', zIndex: 1100, width: '460px', maxWidth: '92vw' }}>
          <div style={{ background: 'linear-gradient(145deg, rgba(20,8,14,0.97), rgba(30,10,20,0.97))', border: '2px solid rgba(201,168,76,0.5)', borderRadius: '18px', padding: '22px 26px', boxShadow: '0 -4px 32px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
                🎓
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#C9A84C' }}>严夫子</div>
                <div style={{ fontSize: '11px', color: 'rgba(245,230,236,0.4)' }}>礼仪先生</div>
              </div>
            </div>
            <p style={{ fontSize: '14px', color: 'rgba(245,230,236,0.85)', lineHeight: 1.9, marginBottom: '18px' }}>
              「凌小姐，今日恰逢月末考核。本院每月择优考察礼仪文化，七题作答，答对五题方为通过。请做好准备，考核即将开始。」
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setEtiquetteExamAnnounce(false)}
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', padding: '9px 20px', color: 'rgba(245,230,236,0.55)', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                今日不便，改日再说
              </button>
              <button
                onClick={() => { setEtiquetteExamAnnounce(false); setEtiquetteExam(true); }}
                style={{ background: 'linear-gradient(135deg, #C9A84C, #A07830)', border: 'none', borderRadius: '10px', padding: '9px 22px', color: 'white', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                准备好了，开始考核
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 礼仪院考试弹窗 */}
      {etiquetteExam && (
        <EtiquetteExamModal
          onClose={() => setEtiquetteExam(false)}
          onPass={() => {
            setCharacter(prev => {
              if (!prev) return prev;
              const newSkills = { ...prev.skills, wisdom: Math.min(1000, (prev.skills?.wisdom || 0) + 50) };
              return { ...prev, skills: newSkills };
            });
            setEtiquetteExam(false);
            showToast('考试通过！才学 +50', 'success');
          }}
        />
      )}

      {/* 生病弹窗 */}
      {illModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,2,5,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, backdropFilter: 'blur(8px)' }}>
          <div style={{ background: 'linear-gradient(145deg, rgba(25,8,18,0.98), rgba(35,12,25,0.98))', border: '2px solid rgba(239,68,68,0.5)', borderRadius: '24px', padding: '36px 32px', maxWidth: '420px', width: '90vw', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🤒</div>
            <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#EF4444', marginBottom: '12px' }}>身体不适</h2>
            <p style={{ color: 'rgba(245,230,236,0.7)', fontSize: '14px', lineHeight: 1.8, marginBottom: '24px' }}>
              长期操劳，积劳成疾。身体已无法继续安排活动，<br />
              请前往百草堂就诊，好好调养。
            </p>
            <button
              onClick={() => { setCurrentScene('medicine_hall'); setHomeSubTab('outdoor'); setIllModal(false); }}
              style={{ background: 'linear-gradient(135deg, #EF4444, #B91C1C)', border: 'none', borderRadius: '12px', padding: '12px 32px', color: 'white', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}
            >
              前往百草堂
            </button>
          </div>
        </div>
      )}

      {/* 休息收获弹窗 */}
      {restModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,2,5,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, backdropFilter: 'blur(8px)' }}>
          <div style={{ background: 'linear-gradient(145deg, rgba(25,8,18,0.98), rgba(35,12,25,0.98))', border: '2px solid rgba(34,197,94,0.4)', borderRadius: '24px', padding: '36px 32px', maxWidth: '420px', width: '90vw', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🌸</div>
            <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#22C55E', marginBottom: '16px' }}>休息收获</h2>
            <div style={{ textAlign: 'left', marginBottom: '20px' }}>
              {restModal.entries.map((entry, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '10px', color: 'rgba(245,230,236,0.8)', fontSize: '14px', lineHeight: 1.7 }}>
                  <span style={{ color: '#22C55E', flexShrink: 0 }}>✦</span>
                  <span>{entry}</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(34,197,94,0.8)', marginBottom: '20px', background: 'rgba(34,197,94,0.1)', borderRadius: '8px', padding: '8px 12px' }}>
              疲惫度已清零，精神焕发
            </div>
            <button
              onClick={() => setRestModal(null)}
              style={{ background: 'linear-gradient(135deg, #22C55E, #15803D)', border: 'none', borderRadius: '12px', padding: '12px 32px', color: 'white', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}
            >
              心旷神怡
            </button>
          </div>
        </div>
      )}

      {/* 琳琅繁街水果忍者对话框 */}
      {streetFruitDialog && (
        <div style={{ position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)', zIndex: 1100, width: '420px', maxWidth: '90vw' }}>
          <div style={{ background: 'linear-gradient(145deg, rgba(25,8,18,0.97), rgba(35,12,25,0.97))', border: '2px solid rgba(201,168,76,0.5)', borderRadius: '18px', padding: '20px 24px', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
            <p style={{ color: 'rgba(245,230,236,0.85)', fontSize: '14px', lineHeight: 1.8, marginBottom: '16px' }}>
              前方水果店又举办活动啦，去凑个热闹吧。
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setStreetFruitDialog(false)} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', padding: '8px 20px', color: 'rgba(245,230,236,0.6)', fontSize: '13px', cursor: 'pointer' }}>算了</button>
              <button onClick={() => { setStreetFruitDialog(false); setStreetFruitGame(true); }} style={{ background: 'linear-gradient(135deg, #C9A84C, #A07830)', border: 'none', borderRadius: '10px', padding: '8px 20px', color: 'white', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>去看看</button>
            </div>
          </div>
        </div>
      )}

      {/* 水果忍者全屏覆盖 */}
      {streetFruitGame && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(5,2,5,0.95)' }}>
          <EarnPanel
            character={character}
            earnActivities={gameConfig?.earnActivities || []}
            onCharacterUpdate={setCharacter}
            showToast={showToast}
            fruitNinjaOnly={true}
            onFruitNinjaClose={() => setStreetFruitGame(false)}
          />
        </div>
      )}
    </div>
  );
}

// ── 礼仪院古风考试弹窗 ──
const EXAM_QUESTIONS = [
  { q: '古代"及笄"指女子多少岁？', opts: ['十二岁', '十三岁', '十五岁', '十八岁'], ans: 2 },
  { q: '"三纲五常"中"五常"不包含哪项？', opts: ['仁', '义', '礼', '孝'], ans: 3 },
  { q: '古代男子行冠礼一般在几岁？', opts: ['十六岁', '十八岁', '二十岁', '二十二岁'], ans: 2 },
  { q: '"六艺"中不包含哪项？', opts: ['礼', '乐', '射', '医'], ans: 3 },
  { q: '宫廷中"凤冠霞帔"通常在何场合穿戴？', opts: ['日常起居', '出行游玩', '婚嫁大典', '祭祀祈福'], ans: 2 },
  { q: '古代"行礼"时，以下哪种礼节最为隆重？', opts: ['揖礼', '拱手礼', '跪拜礼', '颔首礼'], ans: 2 },
  { q: '"茶道"中"头道茶"通常用来做什么？', opts: ['品饮', '敬神', '洗茶润器', '赠客'], ans: 2 },
  { q: '古代"诰命夫人"的品级由什么决定？', opts: ['自身才学', '夫君官职', '父亲地位', '皇帝喜好'], ans: 1 },
  { q: '宫廷礼仪中，觐见皇后应行何礼？', opts: ['揖礼', '万福礼', '跪拜大礼', '颔首示意'], ans: 2 },
  { q: '古代"花朝节"是纪念什么的节日？', opts: ['百花生日', '嫦娥奔月', '七夕相会', '中秋赏月'], ans: 0 },
  { q: '以下哪种香料在古代宫廷中最为名贵？', opts: ['桂花', '茉莉', '龙涎香', '薰衣草'], ans: 2 },
  { q: '"绕梁三日"形容的是什么？', opts: ['舞姿优美', '香气持久', '音乐动听', '诗文精妙'], ans: 2 },
  { q: '古代女子出嫁时，"嫁妆"中最重要的礼器是？', opts: ['铜镜', '凤冠', '玉佩', '绣屏'], ans: 0 },
  { q: '宫廷插花中，以下哪种花卉象征高洁品格？', opts: ['牡丹', '莲花', '海棠', '桃花'], ans: 1 },
  { q: '古代"束脩"是指什么？', opts: ['拜师礼物', '婚嫁礼金', '祭祀贡品', '宫廷赏赐'], ans: 0 },
];

function EtiquetteExamModal({ onClose, onPass }) {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);

  // 随机选7题
  const [questions] = useState(() => {
    const shuffled = [...EXAM_QUESTIONS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 7);
  });

  const handleSelect = (qi, oi) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [qi]: oi }));
  };

  const handleSubmit = () => {
    const correct = questions.filter((q, i) => answers[i] === q.ans).length;
    setResult(correct);
    setSubmitted(true);
  };

  const passed = result !== null && result >= 5;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,2,5,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, backdropFilter: 'blur(8px)', padding: '20px', overflowY: 'auto' }}>
      <div style={{ background: 'linear-gradient(145deg, rgba(20,8,14,0.99), rgba(30,10,20,0.99))', border: '2px solid rgba(201,168,76,0.5)', borderRadius: '24px', padding: '32px 28px', maxWidth: '640px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        {/* 试卷标题 */}
        <div style={{ textAlign: 'center', marginBottom: '24px', borderBottom: '1px solid rgba(201,168,76,0.25)', paddingBottom: '16px' }}>
          <div style={{ fontSize: '13px', color: 'rgba(201,168,76,0.6)', letterSpacing: '4px', marginBottom: '8px' }}>雅韵礼仪院</div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#C9A84C', margin: '0 0 6px', letterSpacing: '6px' }}>礼仪文化考核</h2>
          <div style={{ fontSize: '12px', color: 'rgba(245,230,236,0.4)', letterSpacing: '2px' }}>共七题 · 答对五题及以上方为通过</div>
        </div>

        {/* 题目列表 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
          {questions.map((q, qi) => {
            const chosen = answers[qi];
            return (
              <div key={qi} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: '14px', padding: '16px 18px' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: 'rgba(245,230,236,0.85)', marginBottom: '12px', lineHeight: 1.6 }}>
                  <span style={{ color: '#C9A84C', marginRight: '6px' }}>第{['一','二','三','四','五','六','七'][qi]}题</span>
                  {q.q}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {q.opts.map((opt, oi) => {
                    let bg = 'rgba(255,255,255,0.05)';
                    let border = '1px solid rgba(255,255,255,0.1)';
                    let color = 'rgba(245,230,236,0.7)';
                    if (submitted) {
                      if (oi === q.ans) { bg = 'rgba(34,197,94,0.15)'; border = '1px solid rgba(34,197,94,0.5)'; color = '#22C55E'; }
                      else if (oi === chosen && chosen !== q.ans) { bg = 'rgba(239,68,68,0.12)'; border = '1px solid rgba(239,68,68,0.4)'; color = '#EF4444'; }
                    } else if (oi === chosen) {
                      bg = 'rgba(201,168,76,0.15)'; border = '1px solid rgba(201,168,76,0.5)'; color = '#C9A84C';
                    }
                    return (
                      <button key={oi} onClick={() => handleSelect(qi, oi)} style={{ background: bg, border, borderRadius: '10px', padding: '10px 12px', color, fontSize: '13px', cursor: submitted ? 'default' : 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'all 0.2s ease' }}>
                        {['甲','乙','丙','丁'][oi]}、{opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* 结果 / 提交按钮 */}
        {!submitted ? (
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={handleSubmit}
              disabled={Object.keys(answers).length < 7}
              style={{ background: Object.keys(answers).length === 7 ? 'linear-gradient(135deg, #C9A84C, #A07830)' : 'rgba(60,60,60,0.5)', border: 'none', borderRadius: '14px', padding: '12px 40px', color: 'white', fontSize: '15px', fontWeight: '700', cursor: Object.keys(answers).length === 7 ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
              {Object.keys(answers).length < 7 ? `还有 ${7 - Object.keys(answers).length} 题未答` : '交卷'}
            </button>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px', background: passed ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', borderRadius: '16px', border: `1px solid ${passed ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
            <div style={{ fontSize: '36px', marginBottom: '10px' }}>{passed ? '🎉' : '📝'}</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: passed ? '#22C55E' : '#EF4444', marginBottom: '8px' }}>
              {passed ? '考试通过！' : '考试未通过'}
            </div>
            <div style={{ fontSize: '14px', color: 'rgba(245,230,236,0.6)', marginBottom: '16px' }}>
              答对 {result} / 7 题 {passed ? '· 才学 +50' : '· 下次继续努力'}
            </div>
            <button onClick={passed ? onPass : onClose} style={{ background: passed ? 'linear-gradient(135deg, #22C55E, #15803D)' : 'linear-gradient(135deg, #6366F1, #4338CA)', border: 'none', borderRadius: '12px', padding: '10px 28px', color: 'white', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
              {passed ? '领取奖励，离开考场' : '知道了，再接再厉'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 百草堂就诊多步对话弹窗 ──
const SICK_DIALOGUES = [
  { speaker: '白老大夫', text: '唉，凌小姐，你这面色憔悴，眼下青黑，乃是过度操劳、气血两亏之症。', action: null },
  { speaker: '白老大夫', text: '老夫把脉……嗯，脉象细弱无力，确是积劳成疾。你近来是否夜不能寐、食欲不振？', action: null },
  { speaker: '白老大夫', text: '老夫开一副调养方子：黄芪、当归、红枣各三钱，煎水服用，连服七日。', action: null },
  { speaker: '白老大夫', text: '医嘱：切记劳逸结合，莫要再如此拼命了。身体乃是本钱，若垮了，什么都是空谈。', action: null },
  { speaker: '白老大夫', text: '诊金百两，药材费另算。凌小姐，好好休养，下月再来复诊。', action: 'pay' },
];

function SickTreatmentModal({ onPay, onClose, character }) {
  const [step, setStep] = useState(0);
  const current = SICK_DIALOGUES[step];
  const isLast = step === SICK_DIALOGUES.length - 1;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,2,5,0.88)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1200, backdropFilter: 'blur(6px)', paddingBottom: '60px' }}>
      <div style={{ width: '580px', maxWidth: '92vw', background: 'linear-gradient(145deg, rgba(18,8,14,0.98), rgba(28,10,20,0.98))', border: '2px solid rgba(201,168,76,0.4)', borderRadius: '20px', padding: '24px 28px', boxShadow: '0 -4px 40px rgba(0,0,0,0.7)' }}>
        {/* 头像 + 姓名 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', flexShrink: 0 }}>
            🧑‍⚕️
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#C9A84C' }}>{current.speaker}</div>
            <div style={{ fontSize: '11px', color: 'rgba(245,230,236,0.4)', marginTop: '2px' }}>百草堂坐诊大夫</div>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: '11px', color: 'rgba(245,230,236,0.3)' }}>
            {step + 1} / {SICK_DIALOGUES.length}
          </div>
        </div>

        {/* 对话内容 */}
        <div style={{ fontSize: '15px', color: 'rgba(245,230,236,0.85)', lineHeight: 1.9, marginBottom: '20px', minHeight: '52px' }}>
          「{current.text}」
        </div>

        {/* 金币提示（最后一步） */}
        {isLast && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', background: 'rgba(201,168,76,0.1)', borderRadius: '10px', padding: '10px 14px', border: '1px solid rgba(201,168,76,0.25)' }}>
            <span style={{ fontSize: '18px' }}>💰</span>
            <span style={{ fontSize: '13px', color: '#C9A84C' }}>
              当前金币：{character?.gold ?? 0} 两 &nbsp;→&nbsp; 支付后剩余：{(character?.gold ?? 0) >= 100 ? (character?.gold ?? 0) - 100 : 0} 两{(character?.gold ?? 0) < 100 ? '（金币不足，将清空）' : ''}
            </span>
          </div>
        )}

        {/* 按钮 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          {!isLast ? (
            <button
              onClick={() => setStep(s => s + 1)}
              style={{ background: 'linear-gradient(135deg, #C9A84C, #A07830)', border: 'none', borderRadius: '12px', padding: '10px 28px', color: 'white', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
            >
              继续
            </button>
          ) : (
            <button
              onClick={onPay}
              style={{ background: 'linear-gradient(135deg, #D4517A, #A03058)', border: 'none', borderRadius: '12px', padding: '10px 28px', color: 'white', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
            >
              付诊金百两，领药离开
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function AgeGrowthModal({ ageGrowth, onClose }) {
  if (!ageGrowth) return null;
  const { oldAge, newAge, newTitle, achievedTitle, achievedDesc } = ageGrowth;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,2,5,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div style={{ background: 'linear-gradient(145deg, rgba(25,8,18,0.98), rgba(35,12,25,0.98))', border: '2px solid #D4517A60', borderRadius: '28px', padding: '40px 36px', maxWidth: '480px', width: '90vw', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: '54px', marginBottom: '16px' }}>🎂</div>
        <h2 style={{ fontSize: '32px', fontWeight: '800', margin: '0 0 6px', color: '#D4517A' }}>{oldAge}岁 → {newAge}岁</h2>
        <div style={{ fontSize: '16px', color: '#C9A84C', fontWeight: '600', marginBottom: '20px' }}>{newTitle}</div>
        <div style={{ background: 'rgba(212,81,122,0.15)', borderRadius: '16px', padding: '16px 20px', marginBottom: '20px' }}><div style={{ fontSize: '18px', fontWeight: '700', color: '#F5E6EC' }}>🏆 {achievedTitle}阶段圆满</div><div style={{ fontSize: '13px', color: 'rgba(245,230,236,0.6)' }}>{achievedDesc}</div></div>
        <button onClick={onClose} style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #D4517A, #C9A84C)', border: 'none', borderRadius: '14px', color: 'white', cursor: 'pointer', fontSize: '16px', fontWeight: '700' }}>✨ 继续若雪的旅程</button>
      </div>
    </div>
  );
}

// ==================== 结局弹窗 ====================
const ENDING_RARITY_STYLE = {
  legendary: { border: '#F59E0B', glow: 'rgba(245,158,11,0.5)', bg: 'linear-gradient(145deg, rgba(30,18,0,0.99), rgba(50,30,0,0.99))', badge: '#F59E0B', badgeText: '传奇结局' },
  epic:      { border: '#A855F7', glow: 'rgba(168,85,247,0.45)', bg: 'linear-gradient(145deg, rgba(20,5,30,0.99), rgba(35,10,50,0.99))', badge: '#A855F7', badgeText: '史诗结局' },
  secret:    { border: '#06B6D4', glow: 'rgba(6,182,212,0.5)',  bg: 'linear-gradient(145deg, rgba(0,20,30,0.99), rgba(0,35,50,0.99))', badge: '#06B6D4', badgeText: '隐藏结局' },
  rare:      { border: '#3B82F6', glow: 'rgba(59,130,246,0.4)', bg: 'linear-gradient(145deg, rgba(5,10,30,0.99), rgba(10,20,45,0.99))', badge: '#3B82F6', badgeText: '稀有结局' },
  bad:       { border: '#EF4444', glow: 'rgba(239,68,68,0.45)', bg: 'linear-gradient(145deg, rgba(25,5,5,0.99), rgba(40,8,8,0.99))', badge: '#EF4444', badgeText: '悲剧结局' },
  common:    { border: '#9CA3AF', glow: 'rgba(156,163,175,0.3)', bg: 'linear-gradient(145deg, rgba(15,10,20,0.99), rgba(25,15,30,0.99))', badge: '#9CA3AF', badgeText: '普通结局' },
};

// ── 结局弹窗：页面数据生成 ──────────────────────────────────
const NPC_INFO = {
  wangwenyu:     { name: '王文玉',     image: '/assets/character/outfits/npc_wangwenyu.png',   avatar: '/assets/npc_avatars/npc_wangwenyu_avatar.png',   role: '才子' },
  mufengongzi:   { name: '幕风公子',   image: '/assets/character/outfits/npc_mufeng.png',      avatar: '/assets/npc_avatars/npc_mufeng_avatar.png',      role: '草原公子' },
  sitouqian:     { name: '司徒仟',     image: '/assets/character/outfits/npc_sitouqian.png',   avatar: '/assets/npc_avatars/npc_sitouqian_avatar.png',   role: '画师' },
  desert_friend: { name: '沐风',       image: '/assets/character/outfits/npc_desert_friend.png', avatar: '/assets/npc_avatars/desert_friend.png',        role: '沙漠游侠' },
  royal_emperor: { name: '皇上',       image: '/assets/npc_avatars/emperor.png',               avatar: '/assets/npc_avatars/royal_emperor.png',          role: '天子' },
};

function buildEndingPages(ending, character) {
  if (!character) return [];
  const sk = character.skills || {};
  const fav = character.favorability || {};
  const ac = character.activityCounts || {};
  const sv = character.subSceneVisits || {};

  const wangFav    = fav.wangwenyu || 0;
  const mufengFav  = fav.mufengongzi || 0;
  const sitouFav   = fav.sitouqian || 0;
  const desertFav  = fav.desert_friend || 0;
  const emperorFav = fav.royal_emperor || 0;

  // ── 页1：结局揭晓（图片 + 标题 + 核心描述）──
  const page1 = { type: 'reveal', label: '命运揭晓' };

  // ── 页2：人生轨迹（根据技能属性扩展叙事）──
  const storyLines = [];

  // 技能叙事
  if (sk.medical >= 80) storyLines.push('你的医术已臻化境，江湖人称"凌神医"，所到之处，沉疴痼疾应手而愈。');
  else if (sk.medical >= 65) storyLines.push('你精通岐黄之术，编撰的《本草新录》被各地医馆奉为圭臬，救人无数。');
  if (sk.poetry >= 80) storyLines.push('你的诗才名动天下，诗集《若雪吟》洛阳纸贵，文人墨客争相传抄。');
  else if (sk.poetry >= 60) storyLines.push('你的诗词颇有造诣，常令旁人赞叹，偶有佳句流传于世。');
  if (sk.martial >= 80) storyLines.push('一身武艺出神入化，江湖人称"凌家剑神"，十步之内无人可近其身。');
  else if (sk.martial >= 60) storyLines.push('习得一身武艺，行走江湖足以防身，遇不平之事亦敢拔刀相助。');
  if (sk.music >= 80) storyLines.push('琴艺超绝，一曲《高山流水》令闻者落泪，名动京城乐坊。');
  else if (sk.music >= 60) storyLines.push('琴艺颇佳，闲暇时抚琴自娱，清音袅袅令四邻驻足聆听。');
  if (sk.painting >= 80) storyLines.push('丹青妙笔，所绘山河栩栩如生，传世之作被皇家内府珍藏。');
  else if (sk.painting >= 60) storyLines.push('画艺不俗，笔下人物神韵毕现，常有人登门求画。');
  if (sk.wisdom >= 80) storyLines.push('博学多识，才华横溢，令天下士子折服，有"女诸葛"之誉。');
  if (sk.charm >= 80) storyLines.push('仪态万方，气质出众，所到之处无不令人倾心，美名远播四方。');
  if (sk.statecraft >= 60) storyLines.push('通晓治国之道，胸怀天下苍生，朝野上下皆赞你有经世之才。');
  if (sk.wildness >= 70) storyLines.push('天性自由洒脱，不拘世俗礼法，策马驰骋时如同草原上最自由的鹰。');
  if (sk.morality >= 80) storyLines.push('品行高洁，仁心仁术，乡邻皆以"凌善人"称之，德高望重。');
  if (sk.vitality <= 25) storyLines.push('只是多年操劳，身体已大不如前，常需静养，令关心你的人颇为担忧。');
  if (ac.labor_total >= 15) storyLines.push('你这一生勤勉不辍，双手留下了岁月的印记，却也换来了无数人的感激。');

  // 活动叙事
  if ((ac.herb_picking || 0) >= 8) storyLines.push('踏遍山川采药，你对草木的了解已超过许多老大夫，药典上的每一味药都曾亲手采摘。');
  if ((ac.treat_patient || 0) >= 5) storyLines.push('义诊施药无数，你救治过的病患遍及京城内外，每逢节日总有人登门致谢。');
  if ((ac.court_activity || 0) >= 5) storyLines.push('多次出入宫廷，你对朝堂规则了如指掌，举手投足间自有一股大家风范。');
  if ((ac.performance || 0) >= 6) storyLines.push('登台献艺无数次，每一次都赢得满堂彩，你的名字早已传遍了京城的大街小巷。');
  if ((ac.sky_gazing || 0) >= 4) storyLines.push('仰望星空的夜晚让你的心灵愈发澄澈，你开始相信冥冥之中自有天意。');

  const page2 = { type: 'story', label: '人生轨迹', lines: storyLines.slice(0, 4) };

  // ── 页3：情缘（NPC关系，若有则显示NPC图片）──
  const romanceNpcs = [];
  if (wangFav >= 50)   romanceNpcs.push({ id: 'wangwenyu',     fav: wangFav,   visits: sv.wangwenyu || 0 });
  if (mufengFav >= 50) romanceNpcs.push({ id: 'mufengongzi',   fav: mufengFav, visits: sv.mufengongzi || 0 });
  if (sitouFav >= 50)  romanceNpcs.push({ id: 'sitouqian',     fav: sitouFav,  visits: sv.sitouqian || 0 });
  if (desertFav >= 50) romanceNpcs.push({ id: 'desert_friend', fav: desertFav, visits: sv.desert_friend || 0 });
  if (emperorFav >= 50) romanceNpcs.push({ id: 'royal_emperor', fav: emperorFav, visits: sv.royal_emperor || 0 });
  romanceNpcs.sort((a, b) => b.fav - a.fav);

  const ROMANCE_TEXT = {
    wangwenyu: {
      high: (endId) => ({
        empress: '成婚之日，王文玉身着锦袍立于宫门外，你凤冠霞帔踏过红毯，他低声说：「此生得你，胜过万卷诗书。」',
        hermit: '及笄之后，王文玉亲执红绸，与你拜了天地。从此他写诗，你行医，山间小院炊烟袅袅，岁岁年年。',
        divine_doctor: '王文玉在你出诊归来的傍晚，于药铺门前单膝跪地，捧出一支白玉钗：「嫁我，我替你研墨、替你数药，此生不离。」',
        female_chancellor: '你高中女相那日，王文玉只身赶来，在相府门前等了一夜，只为亲手将一枚玉戒套上你的指尖：「庙堂是你的，我也是你的。」',
        war_general: '班师回朝那天，王文玉挤过人群，将一枚刻着两人名字的印章塞进你手心：「这是婚书，你若点头，我明日便去提亲。」你点了头。',
        performer: '谢幕之夜，王文玉捧着满怀的桃花候在后台，向你求婚。婚后他为你的每场演出题诗压轴，你们的名字从此并列史册。',
        ordinary: '王文玉登门提亲，你父亲喜不自胜。成婚后二人举案齐眉，他写诗，你操持家务，平淡日子里藏着最真实的幸福。',
        default: '王文玉亲自登门求亲，两家长辈皆大欢喜。洞房花烛夜，他握住你的手说：「往后的诗，只写你一个人。」',
      }[endId] || '王文玉亲自登门求亲，两家长辈皆大欢喜。洞房花烛夜，他握住你的手说：「往后的诗，只写你一个人。」'),
      mid: '王文玉曾向你表明心意，只因缘分未到，两人约定来日再续前缘，那份情意始终悬在心头。',
    },
    mufengongzi: {
      high: (endId) => ({
        empress: '成婚之日，幕风公子策马入宫，在满朝文武的惊愕中，俯身将你抱上马背：「皇后娘娘，草原才是你我的洞房。」皇上特许，你们在草原完成了属于自己的婚礼。',
        hermit: '幕风公子在草原最高的山丘上，对着苍天大地宣告你们的婚事。成婚后二人并辔天涯，草原、大漠、林海，哪里都是家。',
        divine_doctor: '幕风公子追到西域边陲找到你，在篝火旁单膝跪地，将一枚草原图腾戒指套上你的手指：「嫁给我，我护着你走遍天下每一个需要大夫的地方。」',
        war_general: '凯旋之日，幕风公子策马冲破人群，当众向你求婚。婚后他成了你麾下最骁勇的先锋，夫妻并肩，所向披靡。',
        female_chancellor: '幕风公子在相府门前驻马三日，终于等到你亲口说「好」。婚后他往来草原与京城之间，你治国，他守边，相辅相成。',
        ordinary: '幕风公子托媒人上门提亲，你父亲起初嫌他是草原人，最终被他的诚意打动。婚后二人在城郊置了小院，养马种地，自在逍遥。',
        default: '幕风公子豪迈求婚，你欣然应允。成婚后他收了心，陪你安居，偶尔策马出游，夫妻恩爱，羡煞旁人。',
      }[endId] || '幕风公子豪迈求婚，你欣然应允。成婚后他收了心，陪你安居，偶尔策马出游，夫妻恩爱，羡煞旁人。'),
      mid: '幕风公子曾向你表明心意，只因缘分尚浅，两人约定他日再叙，那份豪情与深情始终萦绕心间。',
    },
    sitouqian: {
      high: (endId) => ({
        empress: '成婚之日，司徒仟为你画了一幅嫁衣图，亲手绣在婚服上。他说：「我画过无数美人，此后只画你一人，直到白头。」',
        hermit: '司徒仟在山间小屋门前铺满了你最爱的花，向你求婚。婚后他作画，你读书，两人相依为命，笑看云卷云舒。',
        divine_doctor: '司徒仟追到你出诊的山村，在村口的大树下，将一枚刻有"若雪"二字的玉佩系在你腕间：「嫁我，我替你记录每一个被你救活的生命。」',
        performer: '谢幕之夜，司徒仟捧出一幅婚书求婚，婚书上是你台上最美的画像。婚后他为你的每次演出作画，你们的爱情成了梨园最美的传说。',
        female_chancellor: '拜相那日，司徒仟在人群中高举婚书，当众求婚，满城皆知。婚后他辞了画院，专心为你绘制每一道政令颁布时的风采。',
        ordinary: '司徒仟登门提亲，带来了一幅你的画像作为聘礼。父亲笑着说：「这孩子有心了。」婚后二人举案齐眉，画室里总有你研墨的身影。',
        default: '司徒仟以一幅亲手所绘的婚书向你求婚，你含笑应允。洞房花烛夜，他说：「此生，我只为你一人执笔。」',
      }[endId] || '司徒仟以一幅亲手所绘的婚书向你求婚，你含笑应允。洞房花烛夜，他说：「此生，我只为你一人执笔。」'),
      mid: '司徒仟曾含蓄地向你表明心意，只因缘分未足，两人约定他日再续，那幅未完成的画像始终等待着你的归来。',
    },
    desert_friend: {
      high: (endId) => ({
        hermit: '沐风在鸣沙山顶，对着漫天星斗，将一枚西域蓝宝戒指套上你的手指：「嫁给我，我们一起走遍丝路每一寸土地。」婚后二人浪迹天涯，以沙漠为家。',
        divine_doctor: '沐风追到你行医的西域小镇，在集市中央单膝跪地求婚，引得满市喝彩。婚后他护你走遍大漠，你行医，他守护，相伴终老。',
        war_general: '班师途经西域，沐风拦住你的马队，当着三军将士的面求婚。你笑着接过他递来的弯刀——那是他们族中最隆重的定情礼。婚后他随军出征，夫妻并肩。',
        ordinary: '沐风随商队入京提亲，带来满驼西域珍宝作聘礼。父亲被他的诚意打动，点头应允。婚后二人在城中开了一家西域货栈，过着热闹而自在的日子。',
        default: '沐风骑骆驼入京求婚，引得全城围观。你笑着应允，他当场解下腰间图腾挂坠为你戴上。婚后二人一同走遍西域与中原，相伴一生。',
      }[endId] || '沐风骑骆驼入京求婚，引得全城围观。你笑着应允，他当场解下腰间图腾挂坠为你戴上。婚后二人一同走遍西域与中原，相伴一生。'),
      mid: '沐风曾在鸣沙山下向你表明心意，只因缘分尚浅，两人约定来日再见，那枚西域铜护符你一直贴身带着。',
    },
    royal_emperor: {
      high: (endId) => ({
        empress: '皇上亲执凤冠为你簪上，低声说：「朕等了你很久。」大婚之日，万民同庆，你成为这片江山最尊贵的女人，与他共治天下，相濡以沫，白头偕老。',
        female_chancellor: '皇上在朝会上当众赐婚，以皇后之礼迎你入宫。你白日在前朝议政，夜里与他共批奏折，既是君臣，亦是夫妻，朝野皆叹天作之合。',
        default: '皇上颁下圣旨赐婚，你凤冠霞帔踏入宫门。洞房花烛夜，他握住你的手说：「朕的江山，从今日起也是你的。」',
      }[endId] || '皇上颁下圣旨赐婚，你凤冠霞帔踏入宫门。洞房花烛夜，他握住你的手说：「朕的江山，从今日起也是你的。」'),
      mid: '皇上曾对你流露情意，只因你心有所向，那段宫廷情缘最终未能开花结果，却让你对这世间的情与权有了更深的体悟。',
    },
  };

  let page3 = null;
  if (romanceNpcs.length > 0) {
    const npcPages = romanceNpcs.map(n => {
      const info = NPC_INFO[n.id];
      const textObj = ROMANCE_TEXT[n.id];
      const text = n.fav >= 70
        ? textObj.high(ending.id)
        : textObj.mid;
      const depth = n.fav >= 80 ? '深情' : n.fav >= 60 ? '情深' : '相识';
      return { id: n.id, name: info?.name, image: info?.image, role: info?.role, fav: n.fav, visits: n.visits, depth, text };
    });
    page3 = { type: 'romance', label: '红尘情缘', npcs: npcPages };
  }

  // ── 页4：结局金句 + 属性总览 ──
  const topSkills = Object.entries(sk)
    .filter(([, v]) => v >= 50)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const SKILL_NAMES = {
    wildness:'野性', vitality:'体力', spirit:'灵气', affinity:'亲和', charm:'魅力', wisdom:'智慧',
    courage:'勇气', culinary:'厨艺', medical:'医术', poetry:'诗才', music:'音律', painting:'丹青',
    reputation:'声望', rhetoric:'口才', statecraft:'谋略', martial:'武艺', command:'统御',
    morality:'品德', arithmetic:'数术', crafting:'制造',
  };
  const page4 = { type: 'finale', label: '尘埃落定', topSkills, skillNames: SKILL_NAMES };

  const pages = [page1, page2];
  if (page3) pages.push(page3);
  pages.push(page4);
  return pages;
}

// ── 结局弹窗 ──────────────────────────────────────────────
function EndingModal({ ending, character, onClose, onNewGame }) {
  const [pageIdx, setPageIdx] = useState(0);
  const [opacity, setOpacity] = useState(0);
  const [scale, setScale] = useState(0.88);
  const [imgErr, setImgErr] = useState(false);
  const [slideDir, setSlideDir] = useState(1); // 1=forward, -1=back
  const [sliding, setSliding] = useState(false);
  const timerRef = React.useRef(null);

  React.useEffect(() => {
    if (!ending) return;
    setPageIdx(0); setImgErr(false);
    timerRef.current = setTimeout(() => { setOpacity(1); setScale(1); }, 60);
    return () => clearTimeout(timerRef.current);
  }, [ending]);

  if (!ending) return null;
  const style = ENDING_RARITY_STYLE[ending.rarity] || ENDING_RARITY_STYLE.common;
  const pages = buildEndingPages(ending, character);
  const page = pages[pageIdx];
  const isLast = pageIdx === pages.length - 1;

  const goNext = () => {
    if (sliding) return;
    if (isLast) { onClose(); return; }
    setSlideDir(1); setSliding(true);
    setTimeout(() => { setPageIdx(i => i + 1); setSliding(false); }, 220);
  };
  const goPrev = () => {
    if (sliding || pageIdx === 0) return;
    setSlideDir(-1); setSliding(true);
    setTimeout(() => { setPageIdx(i => i - 1); setSliding(false); }, 220);
  };

  // 横屏卡片尺寸
  const cardW = 'min(92vw, 860px)';
  const cardH = 'min(90vh, 520px)';

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.93)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000, backdropFilter: 'blur(14px)',
    }}>
      <div style={{
        background: style.bg,
        border: `2px solid ${style.border}`,
        borderRadius: '28px',
        width: cardW, height: cardH,
        display: 'flex', flexDirection: 'column',
        boxShadow: `0 0 80px ${style.glow}, 0 0 200px ${style.glow}30`,
        opacity, transform: `scale(${scale})`,
        transition: 'opacity 0.5s ease, transform 0.5s cubic-bezier(0.34,1.4,0.64,1)',
        overflow: 'hidden', position: 'relative',
      }}>

        {/* ── 顶部进度条 ── */}
        <div style={{ display: 'flex', gap: '6px', padding: '14px 20px 0', flexShrink: 0 }}>
          {pages.map((p, i) => (
            <div key={i} style={{
              flex: 1, height: '3px', borderRadius: '2px',
              background: i <= pageIdx ? style.border : `${style.border}30`,
              transition: 'background 0.3s',
            }} />
          ))}
        </div>

        {/* ── 主内容区（横向两栏）── */}
        <div style={{
          flex: 1, display: 'flex', overflow: 'hidden',
          opacity: sliding ? 0 : 1,
          transform: sliding ? `translateX(${slideDir * 30}px)` : 'none',
          transition: sliding ? 'none' : 'opacity 0.25s, transform 0.25s',
        }}>

          {/* ── 左栏：图片区 ── */}
          <div style={{
            width: '42%', flexShrink: 0,
            display: 'flex', alignItems: 'stretch',
            padding: '16px 0 16px 16px',
          }}>
            {page.type === 'reveal' && (
              <div style={{ flex: 1, borderRadius: '18px', overflow: 'hidden', position: 'relative' }}>
                {ending.image && !imgErr ? (
                  <img src={ending.image} alt={ending.title} onError={() => setImgErr(true)}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
                ) : (
                  <div style={{
                    width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: `${style.badge}18`, fontSize: '72px',
                  }}>{ending.emoji}</div>
                )}
                {/* 渐变遮罩 */}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: `linear-gradient(to right, transparent 70%, ${style.bg.split(',')[0].replace('linear-gradient(145deg,','')} 100%)`,
                }} />
                {/* 稀有度标签叠加 */}
                <div style={{
                  position: 'absolute', top: '12px', left: '12px',
                  padding: '3px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: '700',
                  background: `${style.badge}33`, border: `1px solid ${style.badge}80`,
                  color: style.badge, letterSpacing: '1.5px', backdropFilter: 'blur(6px)',
                }}>✦ {style.badgeText} ✦</div>
              </div>
            )}

            {page.type === 'story' && (
              <div style={{
                flex: 1, borderRadius: '18px', overflow: 'hidden',
                background: `${style.badge}0d`,
                border: `1px solid ${style.border}25`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '20px',
              }}>
                <div style={{ fontSize: '56px', marginBottom: '12px' }}>{ending.emoji}</div>
                <div style={{ fontSize: '13px', color: `${style.border}99`, letterSpacing: '2px', textAlign: 'center' }}>
                  {ending.title}
                </div>
                <div style={{
                  marginTop: '16px', width: '40px', height: '1px',
                  background: `linear-gradient(90deg, transparent, ${style.border}60, transparent)`,
                }} />
                <div style={{ marginTop: '12px', fontSize: '11px', color: `${style.border}66`, letterSpacing: '1px', textAlign: 'center' }}>
                  人生轨迹
                </div>
              </div>
            )}

            {page.type === 'romance' && page.npcs && page.npcs.length > 0 && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {page.npcs.slice(0, 2).map((n, i) => (
                  <div key={i} style={{
                    flex: 1, borderRadius: '14px', overflow: 'hidden', position: 'relative',
                    border: `1px solid ${style.border}40`,
                  }}>
                    <img src={n.image} alt={n.name}
                      onError={e => { e.target.style.display = 'none'; }}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      background: 'linear-gradient(transparent, rgba(0,0,0,0.75))',
                      padding: '8px 10px 6px',
                    }}>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: style.border }}>{n.name}</div>
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>{n.role} · 好感 {n.fav}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {page.type === 'finale' && (
              <div style={{
                flex: 1, borderRadius: '18px', overflow: 'hidden',
                background: `${style.badge}0d`, border: `1px solid ${style.border}25`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '16px',
              }}>
                <div style={{ fontSize: '42px', marginBottom: '8px' }}>✨</div>
                <div style={{ fontSize: '13px', color: style.border, letterSpacing: '2px', marginBottom: '16px' }}>属性总览</div>
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {page.topSkills.map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ fontSize: '10px', color: `${style.border}cc`, width: '28px', flexShrink: 0, textAlign: 'right' }}>
                        {page.skillNames[k] || k}
                      </div>
                      <div style={{ flex: 1, height: '4px', background: `${style.border}20`, borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${v}%`, height: '100%', borderRadius: '2px',
                          background: `linear-gradient(90deg, ${style.border}80, ${style.border})`,
                        }} />
                      </div>
                      <div style={{ fontSize: '10px', color: `${style.border}99`, width: '24px', flexShrink: 0 }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── 右栏：文字区 ── */}
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            padding: '20px 20px 16px 18px', overflow: 'hidden',
          }}>

            {/* 页签标签 */}
            <div style={{
              fontSize: '10px', color: `${style.border}88`, letterSpacing: '2px',
              marginBottom: '8px', fontWeight: '600',
            }}>
              {page.label?.toUpperCase()}
            </div>

            {/* ── 页1：揭晓 ── */}
            {page.type === 'reveal' && (
              <>
                <h2 style={{
                  fontSize: '32px', fontWeight: '900', margin: '0 0 4px',
                  color: style.border, letterSpacing: '4px', lineHeight: 1.1,
                  textShadow: `0 0 24px ${style.glow}`,
                }}>
                  {ending.emoji} {ending.title}
                </h2>
                <div style={{
                  width: '50px', height: '2px', marginBottom: '14px',
                  background: `linear-gradient(90deg, ${style.border}, transparent)`,
                }} />
                <div style={{
                  flex: 1, fontSize: '14px', lineHeight: '1.95', color: 'rgba(245,230,236,0.9)',
                  letterSpacing: '0.4px', overflowY: 'auto',
                }}>
                  {ending.description}
                </div>
                {ending.flavor && (
                  <div style={{
                    fontSize: '12px', color: style.border, fontStyle: 'italic',
                    padding: '10px 14px', marginTop: '12px',
                    background: `${style.badge}12`, borderRadius: '10px',
                    border: `1px solid ${style.badge}30`, letterSpacing: '1px',
                    flexShrink: 0,
                  }}>
                    「{ending.flavor}」
                  </div>
                )}
              </>
            )}

            {/* ── 页2：人生轨迹 ── */}
            {page.type === 'story' && (
              <>
                <h3 style={{
                  fontSize: '20px', fontWeight: '800', margin: '0 0 14px',
                  color: style.border, letterSpacing: '2px',
                }}>凌若雪的传奇</h3>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {page.lines && page.lines.length > 0 ? page.lines.map((line, i) => (
                    <div key={i} style={{
                      fontSize: '13px', lineHeight: '1.85', color: 'rgba(245,230,236,0.85)',
                      padding: '10px 12px', borderRadius: '10px',
                      background: `${style.badge}0d`, border: `1px solid ${style.border}18`,
                      letterSpacing: '0.3px',
                    }}>
                      {line}
                    </div>
                  )) : (
                    <div style={{ fontSize: '13px', color: 'rgba(245,230,236,0.5)', fontStyle: 'italic' }}>
                      平淡地走完了这段岁月，没有惊天动地，却也安稳踏实。
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── 页3：情缘 ── */}
            {page.type === 'romance' && (
              <>
                <h3 style={{
                  fontSize: '20px', fontWeight: '800', margin: '0 0 14px',
                  color: style.border, letterSpacing: '2px',
                }}>红尘情缘</h3>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {page.npcs && page.npcs.map((n, i) => (
                    <div key={i} style={{
                      padding: '12px 14px', borderRadius: '12px',
                      background: `${style.badge}0d`, border: `1px solid ${style.border}20`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <div style={{
                          fontSize: '11px', fontWeight: '700', color: style.border,
                          padding: '2px 8px', background: `${style.badge}22`,
                          borderRadius: '10px', border: `1px solid ${style.badge}50`,
                        }}>{n.name}</div>
                        <div style={{ fontSize: '10px', color: `${style.border}88` }}>{n.role}</div>
                        <div style={{ fontSize: '10px', color: `${style.border}66`, marginLeft: 'auto' }}>
                          {n.depth} · {n.visits}次相遇
                        </div>
                      </div>
                      <div style={{
                        fontSize: '12px', lineHeight: '1.8', color: 'rgba(245,230,236,0.82)',
                        letterSpacing: '0.3px',
                      }}>{n.text}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── 页4：尘埃落定 ── */}
            {page.type === 'finale' && (
              <>
                <h3 style={{
                  fontSize: '20px', fontWeight: '800', margin: '0 0 6px',
                  color: style.border, letterSpacing: '2px',
                }}>尘埃落定</h3>
                <div style={{
                  fontSize: '12px', color: style.border, fontStyle: 'italic',
                  padding: '10px 14px', marginBottom: '14px',
                  background: `${style.badge}14`, borderRadius: '10px',
                  border: `1px solid ${style.badge}30`, letterSpacing: '1px', flexShrink: 0,
                }}>
                  「{ending.flavor}」
                </div>
                <div style={{
                  flex: 1, fontSize: '13px', lineHeight: '1.9', color: 'rgba(245,230,236,0.8)',
                  overflowY: 'auto', letterSpacing: '0.3px',
                }}>
                  凌若雪的传奇人生就此落幕。她用{Object.values(character?.skills || {}).reduce((a,b)=>a+b,0)}点修为走完了这段岁月，
                  留下了属于自己的印记。无论结局如何，这段旅程都是独一无二的。
                  {character?.gold > 0 && `　她留下了${character.gold}两银子，`}
                  {(character?.inventory?.length || 0) > 0 && `以及${character.inventory.length}件珍贵的收藏。`}
                </div>
              </>
            )}

          </div>
        </div>

        {/* ── 底部按钮区 ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '12px 20px 16px', flexShrink: 0,
          borderTop: `1px solid ${style.border}18`,
        }}>
          {/* 重新开始 */}
          <button onClick={onNewGame} style={{
            padding: '9px 16px', borderRadius: '12px',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
            color: 'rgba(245,230,236,0.6)', cursor: 'pointer', fontSize: '12px',
            fontWeight: '600', fontFamily: 'inherit', flexShrink: 0,
          }}>🔄 重来</button>

          {/* 页码点 */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '6px' }}>
            {pages.map((_, i) => (
              <div key={i} onClick={() => { setSlideDir(i > pageIdx ? 1 : -1); setPageIdx(i); }} style={{
                width: i === pageIdx ? '18px' : '6px', height: '6px', borderRadius: '3px',
                background: i === pageIdx ? style.border : `${style.border}40`,
                transition: 'all 0.3s', cursor: 'pointer',
              }} />
            ))}
          </div>

          {/* 上一页 */}
          {pageIdx > 0 && (
            <button onClick={goPrev} style={{
              padding: '9px 14px', borderRadius: '12px',
              background: `${style.badge}15`, border: `1px solid ${style.border}40`,
              color: `${style.border}cc`, cursor: 'pointer', fontSize: '12px',
              fontWeight: '600', fontFamily: 'inherit', flexShrink: 0,
            }}>← 上页</button>
          )}

          {/* 下一页 / 完成 */}
          <button onClick={goNext} style={{
            padding: '9px 20px', borderRadius: '12px',
            background: isLast
              ? `linear-gradient(135deg, ${style.border}, ${style.border}bb)`
              : `${style.badge}22`,
            border: `1px solid ${style.border}${isLast ? 'ff' : '60'}`,
            color: isLast ? '#fff' : style.border,
            cursor: 'pointer', fontSize: '13px', fontWeight: '700',
            fontFamily: 'inherit', flexShrink: 0,
            boxShadow: isLast ? `0 4px 16px ${style.glow}` : 'none',
          }}>
            {isLast ? '✨ 永远铭记' : '继续 →'}
          </button>
        </div>

      </div>
    </div>
  );
}

function ItemGiftModal({ item, onClose }) {
  if (!item) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,2,5,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, backdropFilter: 'blur(10px)' }} onClick={onClose}>
      <div style={{ background: 'linear-gradient(145deg, rgba(22,8,16,0.99), rgba(38,14,28,0.99))', border: '2px solid #D4517A70', borderRadius: '28px', padding: '36px 32px', maxWidth: '400px', width: '88vw', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: '46px', marginBottom: '16px' }}>{item.emoji || '🎁'}</div>
        <h2 style={{ fontSize: '26px', fontWeight: '800', margin: '0 0 8px', color: '#D4517A' }}>{item.name}</h2>
        {item.description && <div style={{ fontSize: '13px', color: 'rgba(245,230,236,0.7)', marginBottom: '16px' }}>{item.description}</div>}
        <button onClick={onClose} style={{ width: '100%', padding: '13px', background: 'linear-gradient(135deg, #D4517A, #A03058)', border: 'none', borderRadius: '14px', color: '#fff', cursor: 'pointer', fontSize: '15px', fontWeight: '700' }}>✨ 收下了</button>
      </div>
    </div>
  );
}

// ==================== 房间活动 ====================
const ROOM_ACTIVITY_DEFS = [
  { id: 'grooming',     icon: '🪞', label: '梳妆打扮', desc: '精心装扮，提升魅力', color: '#DB2777', video: '/assets/videos/grooming.mp4' },
  { id: 'write_poetry', icon: '📜', label: '吟诗作赋', desc: '挥毫泼墨，陶冶诗才', color: '#6366F1', video: '/assets/videos/write_poetry.mp4' },
  { id: 'exercise',     icon: '🤸', label: '晨练强身', desc: '锻炼体魄，增强体力', color: '#EA580C', video: '/assets/videos/exercise.mp4' },
  { id: 'cook_practice',icon: '🍳', label: '厨房练手', desc: '研习烹饪，精进厨艺', color: '#F59E0B', video: '/assets/videos/cook_practice.mp4' },
];

function RoomActivities({ onActivity, playingId, character }) {
  const doneCounts = character?.roomActivityCounts || {};
  return (
    <div style={{ marginTop: '16px' }}>
      <div style={{ fontSize: '12px', color: 'rgba(245,230,236,0.4)', letterSpacing: '2px', marginBottom: '12px', textAlign: 'center' }}>
        今日可做之事
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
        {ROOM_ACTIVITY_DEFS.map(act => {
          const isPlaying = playingId === act.id;
          const isDone = !!doneCounts[act.id];
          const disabled = !!playingId || isDone;
          return (
            <button
              key={act.id}
              onClick={() => !disabled && onActivity(act)}
              disabled={disabled}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                padding: '14px 8px 12px',
                background: isPlaying ? `${act.color}22` : isDone ? 'rgba(20,10,15,0.5)' : 'rgba(30,10,20,0.65)',
                border: `1px solid ${isPlaying ? act.color : isDone ? 'rgba(150,120,130,0.25)' : act.color + '40'}`,
                borderRadius: '14px',
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.18s ease',
                fontFamily: 'inherit',
                opacity: isDone ? 0.5 : disabled && !isPlaying ? 0.4 : 1,
                position: 'relative',
              }}
              onMouseEnter={e => {
                if (!disabled) {
                  e.currentTarget.style.background = `${act.color}18`;
                  e.currentTarget.style.borderColor = `${act.color}80`;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = `0 6px 18px ${act.color}20`;
                }
              }}
              onMouseLeave={e => {
                if (!isPlaying && !isDone) e.currentTarget.style.background = 'rgba(30,10,20,0.65)';
                e.currentTarget.style.borderColor = isPlaying ? act.color : isDone ? 'rgba(150,120,130,0.25)' : `${act.color}40`;
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <span style={{ fontSize: '26px', lineHeight: 1 }}>{isPlaying ? '▶️' : isDone ? '✓' : act.icon}</span>
              <span style={{ fontSize: '13px', fontWeight: '700', color: isPlaying ? act.color : isDone ? 'rgba(180,150,160,0.6)' : 'rgba(245,220,200,0.92)', letterSpacing: '0.5px' }}>
                {act.label}
              </span>
              <span style={{ fontSize: '11px', color: 'rgba(200,170,180,0.5)', textAlign: 'center', lineHeight: 1.4 }}>
                {isDone ? '本月已完成' : act.desc}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RoomActivityModal({ data, skillConfig, onClose }) {
  if (!data) return null;
  const { activityName, gains, insight, isPositive } = data;
  const gainEntries = Object.entries(gains || {});

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(5,2,5,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, backdropFilter: 'blur(12px)' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'linear-gradient(145deg, #0e0510, #1c0a18)', border: `1.5px solid ${isPositive ? 'rgba(201,168,76,0.45)' : 'rgba(150,120,150,0.35)'}`, borderRadius: '24px', padding: '32px 28px', maxWidth: '380px', width: '88vw', textAlign: 'center', boxShadow: '0 24px 60px rgba(0,0,0,0.7)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontSize: '11px', color: 'rgba(201,168,76,0.5)', letterSpacing: '3px', marginBottom: '8px' }}>活动完成</div>
        <h2 style={{ fontSize: '22px', fontWeight: '800', margin: '0 0 20px', background: 'linear-gradient(135deg, #FFD700, #FFA040)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {activityName}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: insight ? '16px' : '20px' }}>
          {gainEntries.map(([skill, { gain, before, after }]) => {
            const cfg = skillConfig?.[skill];
            const maxValue = cfg?.maxValue || 100;
            const beforePct = Math.min(100, (before / maxValue) * 100);
            const afterPct = Math.min(100, (after / maxValue) * 100);
            const color = cfg?.color || '#FFD700';
            return (
              <div key={skill} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '10px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '20px' }}>{cfg?.icon || '✨'}</span>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color }}>{cfg?.name || skill}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(200,170,180,0.55)', marginTop: '2px' }}>{before} → {after}</div>
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: isPositive ? '#4ADE80' : '#A78BFA' }}>+{gain}</div>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${afterPct}%`,
                    background: `linear-gradient(90deg, ${color}80, ${color})`,
                    borderRadius: '3px',
                    transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: `0 0 6px ${color}60`,
                    position: 'relative',
                  }}>
                    <div style={{
                      position: 'absolute', right: 0, top: 0, bottom: 0,
                      width: `${afterPct - beforePct <= 0 ? 0 : ((afterPct - beforePct) / afterPct) * 100}%`,
                      background: isPositive ? 'rgba(74,222,128,0.5)' : 'rgba(167,139,250,0.5)',
                      borderRadius: '0 3px 3px 0',
                    }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {insight && (
          <div style={{
            background: isPositive ? 'rgba(74,222,128,0.06)' : 'rgba(167,139,250,0.06)',
            border: `1px solid ${isPositive ? 'rgba(74,222,128,0.2)' : 'rgba(167,139,250,0.2)'}`,
            borderRadius: '12px', padding: '12px 14px', marginBottom: '16px', textAlign: 'left',
          }}>
            <div style={{ fontSize: '11px', color: isPositive ? 'rgba(74,222,128,0.7)' : 'rgba(167,139,250,0.7)', letterSpacing: '1px', marginBottom: '6px' }}>
              {isPositive ? '✦ 今日心得' : '✦ 今日感悟'}
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(235,215,225,0.85)', lineHeight: '1.7' }}>
              {insight}
            </div>
          </div>
        )}

        <div style={{ fontSize: '12px', color: 'rgba(201,168,76,0.45)', marginBottom: '18px' }}>
          本月此活动已完成，下月可再次进行
        </div>

        <button
          onClick={onClose}
          style={{ width: '100%', padding: '13px', background: isPositive ? 'linear-gradient(135deg, rgba(201,168,76,0.85), rgba(160,110,30,0.85))' : 'linear-gradient(135deg, rgba(120,90,160,0.8), rgba(80,50,120,0.8))', border: 'none', borderRadius: '14px', color: '#FFF8E0', cursor: 'pointer', fontSize: '15px', fontWeight: '700' }}
        >
          {isPositive ? '收获满满 ✦' : '继续努力 ✦'}
        </button>
      </div>
    </div>
  );
}

// ==================== 课程弹窗：下滑动画展示学习收获 ====================
// 课程过程小任务题库（仅用于没有专属小游戏的课程）
const COURSE_MINI_TASKS = {
  '农耕技术': [
    { prompt: '播种时，种子深度多少最合适？', options: ['约一指深，覆土压实', '越深越好', '撒在表面即可'], correct: 0, bonus: { key: 'wisdom', label: '才学', delta: 3 } },
    { prompt: '发现庄稼叶子发黄，可能是？', options: ['缺水或缺肥，需浇水施肥', '光照太强', '种得太密'], correct: 0, bonus: { key: 'spirit', label: '灵气', delta: 2 } },
  ],
  '编织与刺绣': [
    { prompt: '绣花时针脚不均匀，怎么办？', options: ['拆掉重绣，保持间距一致', '将就继续', '用布遮住'], correct: 0, bonus: { key: 'painting', label: '画艺', delta: 3 } },
    { prompt: '丝线打结了，你会？', options: ['耐心顺着线结慢慢解开', '直接剪断', '硬拉扯'], correct: 0, bonus: { key: 'charm', label: '魅力', delta: 2 } },
  ],
  '木工': [
    { prompt: '锯木头时锯条发热，应该？', options: ['放慢速度，适当涂油润滑', '加快速度锯完', '换把新锯'], correct: 0, bonus: { key: 'wisdom', label: '才学', delta: 2 } },
    { prompt: '两块木板拼接不平整，如何处理？', options: ['用刨子打磨平整后再拼', '用钉子钉死', '填木屑遮盖'], correct: 0, bonus: { key: 'crafting', label: '手工', delta: 3 } },
  ],
  '建筑营造': [
    { prompt: '砌墙时砖缝不均匀，影响是？', options: ['影响美观和稳固，需重砌', '只影响美观', '无所谓'], correct: 0, bonus: { key: 'arithmetic', label: '算数', delta: 3 } },
    { prompt: '测量地基时，如何确保水平？', options: ['用水平仪或水盆检验', '目测估计', '拉绳子看'], correct: 0, bonus: { key: 'wisdom', label: '才学', delta: 2 } },
  ],
  '珠算': [
    { prompt: '拨珠时上档一颗代表多少？', options: ['五', '一', '十'], correct: 0, bonus: { key: 'arithmetic', label: '算数', delta: 4 } },
    { prompt: '算盘清零时，你会？', options: ['将所有珠子拨向框边归位', '随意拨一下', '从左往右逐一清零'], correct: 0, bonus: { key: 'wisdom', label: '才学', delta: 2 } },
  ],
  '烹饪艺术': [
    { prompt: '爆炒时油烟太大，应该？', options: ['开窗通风，调小火候', '继续大火', '加水压烟'], correct: 0, bonus: { key: 'culinary', label: '厨艺', delta: 4 } },
    { prompt: '炖汤时何时加盐最佳？', options: ['出锅前加，保留鲜味', '一开始就加', '中途多次加'], correct: 0, bonus: { key: 'wisdom', label: '才学', delta: 2 } },
  ],
  '酿酒工艺': [
    { prompt: '酒坛密封后发现漏气，你会？', options: ['用蜡或泥重新密封', '忽略继续等待', '打开重新酿'], correct: 0, bonus: { key: 'spirit', label: '灵气', delta: 3 } },
    { prompt: '判断酒是否酿好，最直接的方法？', options: ['观察颜色，闻香气，少量品尝', '只看时间', '摇晃坛子听声音'], correct: 0, bonus: { key: 'culinary', label: '厨艺', delta: 3 } },
  ],
  '航海技术': [
    { prompt: '夜间航行如何辨别方向？', options: ['观察北极星或使用罗盘', '跟着海浪走', '凭感觉'], correct: 0, bonus: { key: 'courage', label: '胆识', delta: 3 } },
    { prompt: '船帆破损漏风，临时如何处理？', options: ['用备用布料缝补遮盖', '降帆改用桨划', '弃船'], correct: 0, bonus: { key: 'wisdom', label: '才学', delta: 2 } },
  ],
  '雕刻技艺': [
    { prompt: '木雕时刻刀打滑，原因是？', options: ['木料太硬或刀刃钝了，需磨刀', '力气不够', '姿势不对'], correct: 0, bonus: { key: 'painting', label: '画艺', delta: 3 } },
    { prompt: '雕刻细节时，如何保持稳定？', options: ['固定木料，屏气凝神，小刀细刻', '快速刻完', '用大刀一气呵成'], correct: 0, bonus: { key: 'wisdom', label: '才学', delta: 2 } },
  ],
  '探险': [
    { prompt: '迷路时，如何判断方向？', options: ['观察苔藓生长方向（朝北面多）或太阳位置', '随便走', '大声呼救'], correct: 0, bonus: { key: 'courage', label: '胆识', delta: 3 } },
    { prompt: '发现未知植物，你会？', options: ['先记录特征，不随意触碰', '直接摘下研究', '踩掉继续走'], correct: 0, bonus: { key: 'spirit', label: '灵气', delta: 2 } },
  ],
};

function CourseScheduleModal({ courseModal, character, onClose, onAdvanceMonth, onAddInventory }) {
  // phase: 'title' → 展示标题 → 'slide' → 逐个下滑展示课程 → 'done'
  const [phase, setPhase] = useState('title');
  const [visibleCount, setVisibleCount] = useState(0);
  const [progressWidth, setProgressWidth] = useState(0);
  const [monthInfo, setMonthInfo] = useState(courseModal?.monthInfo || null);
  const [rewards, setRewards] = useState(courseModal?.rewards || []);
  const [rewardsReceived, setRewardsReceived] = useState(false);
  // 轻量小游戏状态
  const [miniGameType, setMiniGameType] = useState(null); // 'rhythm'|'memory'|'herb'|null
  const [miniGameActive, setMiniGameActive] = useState(false);
  const [miniGameDone, setMiniGameDone] = useState(false);
  const [miniGameBonus, setMiniGameBonus] = useState(null); // { skillKey, delta, text }
  // 节奏游戏
  const [rhythmRingSize, setRhythmRingSize] = useState(80);
  const [rhythmResult, setRhythmResult] = useState(null); // 'perfect'|'good'|'miss'
  const rhythmIntervalRef = useRef(null);
  // 记忆游戏
  const [memoryChars, setMemoryChars] = useState([]);
  const [memoryOptions, setMemoryOptions] = useState([]);
  const [memoryShowing, setMemoryShowing] = useState(false);
  const [memoryAnswer, setMemoryAnswer] = useState(null);
  // 采药游戏
  const [herbItems, setHerbItems] = useState([]);
  const [herbSelected, setHerbSelected] = useState([]);
  const [herbSubmitted, setHerbSubmitted] = useState(false);
  // 课程过程小任务（无专属小游戏时触发）
  const [courseMiniTask, setCourseMiniTask] = useState(null);
  const [courseMiniTaskAnswered, setCourseMiniTaskAnswered] = useState(false);
  const [courseMiniTaskBonus, setCourseMiniTaskBonus] = useState(null);
  const SLIDE_DURATION = 5000; // 5秒内滑完所有课程

  // 判断是否有小游戏课程
  const RHYTHM_COURSES = ['武术器械','弓箭制造','马术','蹴鞠'];
  const MEMORY_COURSES = ['书画','文学','法术','丝竹乐器','茶艺文化','天文历法'];
  const HERB_COURSES   = ['中医本草','针灸推拿'];

  useEffect(() => {
    if (!courseModal) return;
    setPhase('title');
    setVisibleCount(0);
    setProgressWidth(0);
    setMonthInfo(courseModal.monthInfo || null);
    setMiniGameDone(false);
    setMiniGameBonus(null);
    setRhythmResult(null);
    setMemoryAnswer(null);
    setHerbSelected([]);
    setHerbSubmitted(false);
    setCourseMiniTask(null);
    setCourseMiniTaskAnswered(false);
    setCourseMiniTaskBonus(null);
    // 判断小游戏类型
    const courses = courseModal.courses || [];
    if (courses.some(c => RHYTHM_COURSES.includes(c))) {
      setMiniGameType('rhythm');
    } else if (courses.some(c => MEMORY_COURSES.includes(c))) {
      setMiniGameType('memory');
    } else if (courses.some(c => HERB_COURSES.includes(c))) {
      setMiniGameType('herb');
    } else {
      // 无专属小游戏：随机从本次课程中抽取一道小任务（70%概率）
      const allCourseTasks = courses.flatMap(c => COURSE_MINI_TASKS[c] || []);
      if (allCourseTasks.length > 0 && Math.random() < 0.7) {
        const task = allCourseTasks[Math.floor(Math.random() * allCourseTasks.length)];
        setCourseMiniTask(task);
      }
      setMiniGameType(null);
    }
    // 0.5s 后开始展示内容（加快结算弹窗显示）
    const t1 = setTimeout(() => setPhase('slide'), 500);
    return () => clearTimeout(t1);
  }, [courseModal]);

  useEffect(() => {
    if (phase !== 'slide') return;
    const courses = courseModal?.courses || [];
    const count = courses.length;
    if (count === 0) { setPhase('done'); return; }
    // 每隔 (SLIDE_DURATION / count) ms 展示一条
    const interval = SLIDE_DURATION / count;
    let shown = 0;
    const timer = setInterval(() => {
      shown += 1;
      setVisibleCount(shown);
      if (shown >= count) {
        clearInterval(timer);
        setPhase('done');
      }
    }, interval);
    return () => clearInterval(timer);
  }, [phase, courseModal]);

  // 进度条动画：phase=done 后拉满
  useEffect(() => {
    if (phase === 'done') {
      const t = setTimeout(() => setProgressWidth(100), 150);
      return () => clearTimeout(t);
    }
  }, [phase]);

  if (!courseModal) return null;
  const courses = courseModal.courses || [];
  const mi = monthInfo;
  // 计算本月进度 (1-12月各月内进度)
  const monthProgress = mi ? Math.round((mi.monthInYear / 12) * 100) : 50;

  const SKILL_COLORS = {
    charm: '#DB2777', wisdom: '#2563EB', spirit: '#7C3AED',
    affinity: '#059669', courage: '#F59E0B', vitality: '#EF4444',
    wildness: '#DC2626', culinary: '#EA580C', medical: '#16A34A',
    poetry: '#9333EA', music: '#0EA5E9', painting: '#D97706',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,2,5,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, backdropFilter: 'blur(12px)' }}>
      <style>{`
        @keyframes courseSlideIn {
          from { opacity: 0; transform: translateY(-40px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes courseGlow {
          0%,100% { box-shadow: 0 0 12px rgba(212,81,122,0.3); }
          50%      { box-shadow: 0 0 28px rgba(212,81,122,0.7); }
        }
        @keyframes progressFill {
          from { width: 0%; }
          to   { width: 100%; }
        }
        @keyframes milestoneFlash {
          0%   { transform: scale(0.85); opacity: 0; }
          40%  { transform: scale(1.06); opacity: 1; }
          70%  { transform: scale(0.97); }
          100% { transform: scale(1);    opacity: 1; }
        }
        @keyframes streakBounce {
          0%   { transform: scale(0); opacity: 0; }
          60%  { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); }
        }
        @keyframes npcSlideIn {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes randomEventFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes miniGamePulse {
          0%,100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(212,81,122,0.6); }
          50% { transform: scale(1.04); box-shadow: 0 0 0 8px rgba(212,81,122,0); }
        }
        @keyframes ringShrink {
          from { width: 80px; height: 80px; opacity: 1; }
          to   { width: 20px; height: 20px; opacity: 0.4; }
        }
      `}</style>
      <div style={{
        background: 'linear-gradient(145deg, rgba(20,6,15,0.99), rgba(32,10,22,0.99))',
        border: '2px solid rgba(212,81,122,0.5)',
        borderRadius: '28px',
        padding: '32px 30px 28px',
        maxWidth: '560px',
        width: '92vw',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 0 60px rgba(212,81,122,0.2)',
      }}>
        {/* 标题 */}
        <div style={{ textAlign: 'center', marginBottom: phase === 'title' ? '0' : '20px', flexShrink: 0 }}>
          {mi && (
            <div style={{ fontSize: '12px', color: 'rgba(245,230,236,0.5)', letterSpacing: '3px', marginBottom: '8px' }}>
              {mi.age}岁 · 第{mi.monthInYear}月
            </div>
          )}
          <h2 style={{
            fontSize: phase === 'title' ? '38px' : '22px',
            fontWeight: '800', margin: 0,
            background: 'linear-gradient(135deg, #C9A84C, #FFE08A)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            letterSpacing: '4px',
            transition: 'font-size 0.6s ease',
          }}>
            📚 学习收获
          </h2>
          {phase === 'title' && (
            <div style={{ marginTop: '12px', fontSize: '14px', color: 'rgba(245,230,236,0.45)', letterSpacing: '2px' }}>
              本月课程即将揭晓...
            </div>
          )}
        </div>

        {/* 课程下滑区 */}
        {phase !== 'title' && (
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
            {courses.map((course, index) => {
              const content = COURSE_CONTENTS[course] || { icon: '📖', desc: '勤奋学习，收获颇丰。', cost: 0, skills: [{ key: 'wisdom', label: '才学', delta: 5 }] };
              const primarySkill = content.skills?.[0] || { key: 'wisdom', label: '才学', delta: 5 };
              const primaryColor = SKILL_COLORS[primarySkill.key] || '#D4517A';
              const isVisible = index < visibleCount;
              return (
                <div
                  key={course}
                  style={{
                    opacity: isVisible ? 1 : 0,
                    animation: isVisible ? 'courseSlideIn 0.55s ease forwards' : 'none',
                    background: `linear-gradient(135deg, rgba(212,81,122,0.10), rgba(40,12,28,0.8))`,
                    borderRadius: '18px',
                    padding: '16px 18px',
                    marginBottom: '12px',
                    border: `1px solid ${primaryColor}40`,
                    pointerEvents: isVisible ? 'auto' : 'none',
                  }}
                >
                  {/* 标题行 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                    <div style={{
                      width: '48px', height: '48px', borderRadius: '14px', flexShrink: 0,
                      background: `${primaryColor}22`,
                      border: `2px solid ${primaryColor}55`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '26px',
                    }}>
                      {content.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '17px', fontWeight: '700', color: '#F4A0C0', marginBottom: '3px' }}>{course}</div>
                      <div style={{ fontSize: '12px', color: 'rgba(245,230,236,0.5)' }}>{content.desc}</div>
                    </div>
                    {/* 费用标签 */}
                    {content.cost > 0 && (
                      <div style={{
                        flexShrink: 0,
                        padding: '5px 10px',
                        background: 'rgba(201,168,76,0.2)',
                        border: '1.5px solid rgba(201,168,76,0.5)',
                        borderRadius: '10px',
                        color: '#C9A84C',
                        fontSize: '12px',
                        fontWeight: '700',
                      }}>
                        💰-{content.cost}
                      </div>
                    )}
                  </div>
                  {/* 三种属性进度条 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {(content.skills || []).map((sk, si) => {
                      const skColor = SKILL_COLORS[sk.key] || '#D4517A';
                      const curVal = courseModal?.skillsBefore?.[sk.key] ?? (character?.skills?.[sk.key] || 0);
                      const newVal = Math.min(100, curVal + sk.delta);
                      return (
                        <div key={si}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                            <span style={{ fontSize: '10px', color: skColor, fontWeight: '600' }}>
                              {sk.label} +{sk.delta}
                            </span>
                            <span style={{ fontSize: '10px', color: 'rgba(245,230,236,0.4)' }}>
                              {curVal} → {newVal}
                            </span>
                          </div>
                          <div style={{ height: '5px', borderRadius: '3px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', borderRadius: '3px',
                              width: isVisible ? `${newVal}%` : '0%',
                              background: `linear-gradient(90deg, ${skColor}, ${skColor}BB)`,
                              transition: `width 1s ease ${0.3 + si * 0.2}s`,
                              boxShadow: `0 0 6px ${skColor}60`,
                            }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* ── 轻量小游戏区域（phase=slide时，课程列表下方） ── */}
            {phase !== 'title' && miniGameType && !miniGameDone && (
              <div style={{
                marginTop: '8px', marginBottom: '4px',
                background: 'linear-gradient(135deg, rgba(212,81,122,0.12), rgba(30,8,20,0.9))',
                border: '1.5px solid rgba(212,81,122,0.5)',
                borderRadius: '18px', padding: '16px 18px',
                animation: 'randomEventFadeIn 0.5s ease forwards',
              }}>
                {/* 节奏点击小游戏 */}
                {miniGameType === 'rhythm' && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '13px', color: '#F4A0C0', fontWeight: '700', marginBottom: '10px', letterSpacing: '2px' }}>
                      ⚔️ 武学心法 · 把握时机点击圆圈！
                    </div>
                    {!rhythmResult ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                        <div
                          onClick={() => {
                            if (rhythmIntervalRef.current) clearInterval(rhythmIntervalRef.current);
                            const size = rhythmRingSize;
                            let result, bonus;
                            if (size <= 28) { result = 'perfect'; bonus = { skillKey: 'courage', delta: 5, text: '完美时机！勇气 +5' }; }
                            else if (size <= 45) { result = 'good'; bonus = { skillKey: 'courage', delta: 3, text: '不错！勇气 +3' }; }
                            else { result = 'miss'; bonus = null; }
                            setRhythmResult(result);
                            setMiniGameBonus(bonus);
                            setMiniGameDone(true);
                          }}
                          style={{
                            width: `${rhythmRingSize}px`, height: `${rhythmRingSize}px`,
                            borderRadius: '50%', cursor: 'pointer',
                            border: '3px solid #D4517A',
                            background: 'rgba(212,81,122,0.2)',
                            transition: 'width 0.05s linear, height 0.05s linear',
                            animation: 'miniGamePulse 1s ease infinite',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '24px',
                          }}
                        >⚔️</div>
                        <RhythmShrink size={rhythmRingSize} setSize={setRhythmRingSize} intervalRef={rhythmIntervalRef} onTimeout={() => { setRhythmResult('miss'); setMiniGameDone(true); }} />
                        <div style={{ fontSize: '11px', color: 'rgba(245,230,236,0.4)' }}>圆圈缩小时点击，越小越好！</div>
                      </div>
                    ) : null}
                  </div>
                )}
                {/* 快速记忆小游戏 */}
                {miniGameType === 'memory' && (
                  <MemoryGame
                    onDone={(correct) => {
                      setMiniGameBonus(correct ? { skillKey: 'wisdom', delta: 5, text: '全部答对！才学 +5' } : null);
                      setMiniGameDone(true);
                    }}
                  />
                )}
                {/* 采药点击小游戏 */}
                {miniGameType === 'herb' && (
                  <HerbGame
                    onDone={(score) => {
                      const bonus = score >= 3 ? { skillKey: 'medical', delta: 5, text: '全部认对！医术 +5' }
                                  : score >= 2 ? { skillKey: 'medical', delta: 3, text: '认出大半！医术 +3' }
                                  : null;
                      setMiniGameBonus(bonus);
                      setMiniGameDone(true);
                    }}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* ── 课程过程小任务（无专属小游戏时，phase=done时展示） ── */}
        {phase === 'done' && !miniGameType && courseMiniTask && (
          <div style={{
            marginTop: '4px', marginBottom: '4px',
            background: 'linear-gradient(135deg, rgba(212,81,122,0.12), rgba(30,8,20,0.9))',
            border: `1.5px solid ${courseMiniTaskAnswered ? 'rgba(212,81,122,0.7)' : 'rgba(212,81,122,0.4)'}`,
            borderRadius: '18px', padding: '16px 18px',
            animation: 'randomEventFadeIn 0.4s ease forwards',
          }}>
            <div style={{ fontSize: '12px', color: '#F4A0C0', letterSpacing: '2px', marginBottom: '8px' }}>
              📝 课堂小考验
            </div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: 'rgba(245,230,236,0.9)', marginBottom: '12px', lineHeight: 1.6 }}>
              {courseMiniTask.prompt}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {courseMiniTask.options.map((opt, i) => {
                const isCorrect = i === courseMiniTask.correct;
                return (
                  <button
                    key={i}
                    disabled={courseMiniTaskAnswered}
                    onClick={() => {
                      if (courseMiniTaskAnswered) return;
                      setCourseMiniTaskAnswered(true);
                      if (isCorrect) setCourseMiniTaskBonus(courseMiniTask.bonus);
                    }}
                    style={{
                      padding: '9px 14px',
                      background: !courseMiniTaskAnswered ? 'rgba(212,81,122,0.1)' : isCorrect ? 'rgba(212,81,122,0.25)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${!courseMiniTaskAnswered ? 'rgba(212,81,122,0.3)' : isCorrect ? 'rgba(212,81,122,0.8)' : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: '10px',
                      color: !courseMiniTaskAnswered ? 'rgba(245,230,236,0.85)' : isCorrect ? '#F4A0C0' : 'rgba(245,230,236,0.35)',
                      fontSize: '13px', cursor: courseMiniTaskAnswered ? 'default' : 'pointer',
                      textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.2s',
                    }}
                  >
                    {!courseMiniTaskAnswered ? `${['A','B','C'][i]}. ${opt}` : isCorrect ? `✅ ${opt}` : `${['A','B','C'][i]}. ${opt}`}
                  </button>
                );
              })}
            </div>
            {courseMiniTaskAnswered && courseMiniTaskBonus && (
              <div style={{ marginTop: '10px', fontSize: '13px', color: '#F4A0C0', fontWeight: '700', animation: 'randomEventFadeIn 0.4s ease forwards' }}>
                🎉 答对了！{courseMiniTaskBonus.label} +{courseMiniTaskBonus.delta}
              </div>
            )}
            {courseMiniTaskAnswered && !courseMiniTaskBonus && (
              <div style={{ marginTop: '10px', fontSize: '13px', color: 'rgba(245,230,236,0.45)' }}>
                没关系，继续努力！
              </div>
            )}
          </div>
        )}

        {/* 底部进度条 + 确认按钮（phase=done时显示） */}
        {phase === 'done' && (
          <div style={{ flexShrink: 0, marginTop: '16px' }}>

            {/* ── 连击横幅 ── */}
            {(courseModal?.streak || 0) >= 3 && (
              <div style={{
                marginBottom: '12px',
                background: (courseModal.streak >= 5)
                  ? 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(30,10,50,0.9))'
                  : 'linear-gradient(135deg, rgba(249,115,22,0.25), rgba(30,10,10,0.9))',
                border: `1.5px solid ${courseModal.streak >= 5 ? 'rgba(139,92,246,0.7)' : 'rgba(249,115,22,0.7)'}`,
                borderRadius: '14px', padding: '12px 16px',
                display: 'flex', alignItems: 'center', gap: '10px',
                animation: 'streakBounce 0.5s ease forwards',
              }}>
                <span style={{ fontSize: '28px' }}>{courseModal.streak >= 5 ? '💫' : '🔥'}</span>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: courseModal.streak >= 5 ? '#C4B5FD' : '#FB923C', letterSpacing: '2px' }}>
                    {courseModal.streak >= 5 ? `大师连击 ×${courseModal.streak}！` : `连击 ×${courseModal.streak}！`}
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(245,230,236,0.5)', marginTop: '2px' }}>
                    {courseModal.streak >= 5 ? '熟练加成 ×2，属性双倍获得！' : '熟练加成 ×1.5，属性额外提升！'}
                    {courseModal.streakCourse && ` · ${courseModal.streakCourse}`}
                  </div>
                </div>
              </div>
            )}

            {/* ── 技能里程碑 ── */}
            {(courseModal?.milestones || []).map((m, mi) => (
              <div key={mi} style={{
                marginBottom: '12px',
                background: 'linear-gradient(135deg, rgba(201,168,76,0.2), rgba(255,224,138,0.06))',
                border: '2px solid rgba(201,168,76,0.7)',
                borderRadius: '16px', padding: '14px 18px',
                display: 'flex', alignItems: 'center', gap: '14px',
                animation: 'milestoneFlash 0.7s ease forwards',
              }}>
                <div style={{
                  width: '52px', height: '52px', borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, rgba(201,168,76,0.4), rgba(255,224,138,0.2))',
                  border: '2px solid rgba(201,168,76,0.8)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '24px',
                }}>🏆</div>
                <div>
                  <div style={{ fontSize: '11px', color: 'rgba(201,168,76,0.7)', letterSpacing: '2px', marginBottom: '3px' }}>成就解锁</div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#FFE08A', letterSpacing: '2px' }}>{m.title}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(245,230,236,0.5)', marginTop: '2px' }}>
                    {m.label} 达到 {m.milestone} · 当前 {m.newVal}
                  </div>
                </div>
              </div>
            ))}

            {/* ── 小游戏结果 ── */}
            {miniGameDone && miniGameBonus && (
              <div style={{
                marginBottom: '12px',
                background: 'linear-gradient(135deg, rgba(16,185,129,0.18), rgba(5,30,20,0.9))',
                border: '1.5px solid rgba(16,185,129,0.6)',
                borderRadius: '14px', padding: '12px 16px',
                display: 'flex', alignItems: 'center', gap: '10px',
                animation: 'randomEventFadeIn 0.5s ease forwards',
              }}>
                <span style={{ fontSize: '24px' }}>🎯</span>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#34D399', letterSpacing: '1px' }}>互动加成</div>
                  <div style={{ fontSize: '12px', color: 'rgba(245,230,236,0.6)', marginTop: '2px' }}>{miniGameBonus.text}</div>
                </div>
              </div>
            )}
            {miniGameDone && !miniGameBonus && miniGameType && (
              <div style={{
                marginBottom: '12px', padding: '10px 14px',
                background: 'rgba(255,255,255,0.04)', borderRadius: '12px',
                fontSize: '12px', color: 'rgba(245,230,236,0.4)', textAlign: 'center',
              }}>下次互动加油～</div>
            )}

            {/* ── 随机事件 ── */}
            {courseModal?.randomEvent && (
              <div style={{
                marginBottom: '12px',
                background: 'linear-gradient(135deg, rgba(234,179,8,0.15), rgba(20,15,5,0.9))',
                border: '1.5px solid rgba(234,179,8,0.5)',
                borderRadius: '14px', padding: '13px 16px',
                display: 'flex', alignItems: 'flex-start', gap: '10px',
                animation: 'randomEventFadeIn 0.6s ease 0.2s both',
              }}>
                <span style={{ fontSize: '22px', flexShrink: 0 }}>{courseModal.randomEvent.emoji}</span>
                <div>
                  <div style={{ fontSize: '11px', color: 'rgba(234,179,8,0.7)', letterSpacing: '2px', marginBottom: '3px' }}>
                    {courseModal.randomEvent.type === 'good' ? '意外之喜' : '小插曲'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(245,230,236,0.75)', lineHeight: 1.6 }}>{courseModal.randomEvent.text}</div>
                  {courseModal.randomEvent.skillKey && (
                    <div style={{ fontSize: '11px', color: '#FCD34D', marginTop: '4px', fontWeight: '700' }}>
                      +{courseModal.randomEvent.delta} {courseModal.randomEvent.skillKey}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── NPC旁观评论 ── */}
            {courseModal?.npcComment && (() => {
              const npcInfo = { wangwenyu:{name:'王文玉',avatar:'/assets/npc_avatars/wangwenyu.png',color:'#F9A8D4'}, mufengongzi:{name:'幕风公子',avatar:'/assets/npc_avatars/mufengongzi.png',color:'#93C5FD'}, sitouqian:{name:'司徒仟',avatar:'/assets/npc_avatars/sitouqian.png',color:'#C4B5FD'}, desert_friend:{name:'沐风',avatar:'/assets/npc_avatars/desert_friend.png',color:'#FCD34D'}, royal_emperor:{name:'皇上',avatar:'/assets/npc_avatars/emperor.png',color:'#FDE68A'} }[courseModal.npcComment.npcId] || {};
              return (
                <div style={{
                  marginBottom: '12px',
                  background: 'linear-gradient(135deg, rgba(244,160,192,0.1), rgba(20,5,15,0.9))',
                  border: `1.5px solid ${npcInfo.color || '#F4A0C0'}55`,
                  borderRadius: '14px', padding: '12px 14px',
                  display: 'flex', alignItems: 'flex-start', gap: '10px',
                  animation: 'npcSlideIn 0.55s ease 0.3s both',
                }}>
                  <img src={npcInfo.avatar} alt={npcInfo.name} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: `2px solid ${npcInfo.color || '#F4A0C0'}66` }} onError={e => { e.target.style.display='none'; }} />
                  <div>
                    <div style={{ fontSize: '11px', color: npcInfo.color || '#F4A0C0', fontWeight: '700', marginBottom: '4px' }}>{npcInfo.name}</div>
                    <div style={{ fontSize: '12px', color: 'rgba(245,230,236,0.7)', lineHeight: 1.6 }}>{courseModal.npcComment.text}</div>
                  </div>
                </div>
              );
            })()}

            {/* 道具奖励展示区（如果有奖励且未领取） */}
            {rewards.length > 0 && !rewardsReceived && (
              <div style={{
                marginBottom: '16px',
                background: 'linear-gradient(135deg, rgba(201,168,76,0.15), rgba(255,224,138,0.08))',
                border: '1.5px solid rgba(201,168,76,0.5)',
                borderRadius: '18px',
                padding: '16px 18px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '20px' }}>🎁</span>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#FFE08A', letterSpacing: '2px' }}>
                    习艺精进 · 获得道具奖励！
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
                  {rewards.map((reward, ri) => (
                    <div key={ri} style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                      background: 'rgba(201,168,76,0.12)',
                      border: '1px solid rgba(201,168,76,0.35)',
                      borderRadius: '14px',
                      padding: '12px 14px',
                      minWidth: '90px',
                      flex: 1,
                    }}>
                      <div style={{
                        width: '48px', height: '48px', borderRadius: '14px',
                        background: 'linear-gradient(135deg, rgba(201,168,76,0.3), rgba(255,224,138,0.15))',
                        border: '2px solid rgba(201,168,76,0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '26px',
                      }}>
                        {reward.icon}
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#FFE08A', textAlign: 'center', lineHeight: 1.3 }}>
                        {reward.name}
                      </div>
                      <div style={{ fontSize: '10px', color: 'rgba(245,230,236,0.5)', textAlign: 'center', lineHeight: 1.3 }}>
                        {reward.desc}
                      </div>
                      <div style={{ fontSize: '10px', color: 'rgba(201,168,76,0.7)', marginTop: '2px' }}>
                        {reward.courseName} · 第{reward.milestone}次
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    rewards.forEach(reward => onAddInventory && onAddInventory(reward));
                    setRewardsReceived(true);
                  }}
                  style={{
                    width: '100%', padding: '12px',
                    background: 'linear-gradient(135deg, #C9A84C, #FFE08A)',
                    border: 'none', borderRadius: '12px',
                    color: '#1a0a0f', cursor: 'pointer',
                    fontSize: '14px', fontWeight: '800', fontFamily: 'inherit',
                    letterSpacing: '1px',
                    boxShadow: '0 4px 16px rgba(201,168,76,0.4)',
                    transition: 'transform 0.2s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  ✨ 收下奖励（{rewards.length}件）
                </button>
              </div>
            )}
            {/* 道具已领取提示 */}
            {rewards.length > 0 && rewardsReceived && (
              <div style={{
                marginBottom: '12px', textAlign: 'center',
                fontSize: '13px', color: 'rgba(201,168,76,0.7)',
                letterSpacing: '1px',
              }}>
                ✅ 道具已收入装备栏
              </div>
            )}
            {/* 月份进度条 */}
            {mi && (
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', color: 'rgba(245,230,236,0.5)', letterSpacing: '2px' }}>
                    📅 {mi.age}岁第{mi.monthInYear}月 · 本月学习进度
                  </span>
                  <span style={{ fontSize: '11px', color: '#C9A84C', fontWeight: '700' }}>
                    {mi.monthInYear}/12月
                  </span>
                </div>
                <div style={{ height: '10px', borderRadius: '5px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden', position: 'relative' }}>
                  <div style={{
                    height: '100%', borderRadius: '5px',
                    width: `${progressWidth}%`,
                    background: 'linear-gradient(90deg, #D4517A, #C9A84C, #FFE08A)',
                    transition: 'width 1.2s cubic-bezier(0.22,1,0.36,1)',
                    boxShadow: '0 0 12px rgba(212,81,122,0.5)',
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'rgba(245,230,236,0.25)', marginTop: '3px' }}>
                  <span>{mi.age}岁开始</span>
                  <span>{mi.age + 1}岁到来</span>
                </div>
              </div>
            )}

            <button
              onClick={onClose}
              disabled={rewards.length > 0 && !rewardsReceived}
              style={{
                width: '100%',
                padding: '15px',
                background: (rewards.length > 0 && !rewardsReceived)
                  ? 'rgba(60,60,60,0.5)'
                  : 'linear-gradient(135deg, #D4517A, #C9A84C)',
                border: 'none',
                borderRadius: '16px',
                color: 'white',
                cursor: (rewards.length > 0 && !rewardsReceived) ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: '700',
                fontFamily: 'inherit',
                letterSpacing: '2px',
                boxShadow: (rewards.length > 0 && !rewardsReceived) ? 'none' : '0 4px 20px rgba(212,81,122,0.4)',
                transition: 'transform 0.2s ease',
                opacity: (rewards.length > 0 && !rewardsReceived) ? 0.5 : 1,
              }}
              onMouseEnter={e => { if (!(rewards.length > 0 && !rewardsReceived)) e.currentTarget.style.transform = 'scale(1.02)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              {(rewards.length > 0 && !rewardsReceived) ? '请先收下奖励' : '✨ 修习结束'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 节奏游戏：圆圈收缩计时器（独立组件避免在父组件内用 useEffect 管理 interval）──
function RhythmShrink({ size, setSize, intervalRef, onTimeout }) {
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSize(prev => {
        const next = prev - 2;
        if (next <= 14) {
          clearInterval(intervalRef.current);
          onTimeout();
          return 14;
        }
        return next;
      });
    }, 60);
    return () => clearInterval(intervalRef.current);
  }, []);
  return null;
}

// ── 快速记忆小游戏 ──
const MEMORY_SETS = [
  { chars: ['诗','书','礼'], wrong: ['乐','易','春'] },
  { chars: ['梅','兰','菊'], wrong: ['竹','荷','桃'] },
  { chars: ['琴','棋','画'], wrong: ['书','茶','剑'] },
  { chars: ['风','花','雪'], wrong: ['月','云','霜'] },
];
function MemoryGame({ onDone }) {
  const [set] = useState(() => MEMORY_SETS[Math.floor(Math.random() * MEMORY_SETS.length)]);
  const [showing, setShowing] = useState(true);
  const [options, setOptions] = useState([]);
  const [selected, setSelected] = useState([]);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const all = [...set.chars, ...set.wrong].sort(() => Math.random() - 0.5);
    setOptions(all);
    const t = setTimeout(() => setShowing(false), 2000);
    return () => clearTimeout(t);
  }, []);

  const toggle = (c) => {
    if (submitted) return;
    setSelected(prev => prev.includes(c) ? prev.filter(x => x !== c) : prev.length < 3 ? [...prev, c] : prev);
  };
  const submit = () => {
    setSubmitted(true);
    const correct = set.chars.every(c => selected.includes(c)) && selected.length === 3;
    setTimeout(() => onDone(correct), 800);
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '13px', color: '#F4A0C0', fontWeight: '700', marginBottom: '10px', letterSpacing: '2px' }}>
        📖 文思考验 · 记住这三个字！
      </div>
      {showing ? (
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '10px' }}>
          {set.chars.map(c => (
            <div key={c} style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(212,81,122,0.25)', border: '2px solid rgba(212,81,122,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', color: '#F4A0C0', fontWeight: '800' }}>{c}</div>
          ))}
        </div>
      ) : (
        <>
          <div style={{ fontSize: '11px', color: 'rgba(245,230,236,0.4)', marginBottom: '8px' }}>选出刚才的三个字</div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '10px' }}>
            {options.map(c => (
              <button key={c} onClick={() => toggle(c)} style={{
                width: '40px', height: '40px', borderRadius: '10px', border: `2px solid ${selected.includes(c) ? '#D4517A' : 'rgba(255,255,255,0.15)'}`,
                background: selected.includes(c) ? 'rgba(212,81,122,0.3)' : 'rgba(255,255,255,0.05)',
                color: selected.includes(c) ? '#F4A0C0' : 'rgba(245,230,236,0.6)',
                fontSize: '18px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}>{c}</button>
            ))}
          </div>
          {!submitted && selected.length === 3 && (
            <button onClick={submit} style={{ padding: '8px 20px', background: 'linear-gradient(135deg, #D4517A, #C9A84C)', border: 'none', borderRadius: '10px', color: 'white', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>确认</button>
          )}
        </>
      )}
    </div>
  );
}

// ── 采药点击小游戏 ──
const HERB_SETS = [
  { correct: ['🌿','🍃','🌱'], wrong: ['🍄','🌾'] },
  { correct: ['🌺','🌸','🌼'], wrong: ['🍂','🍁'] },
  { correct: ['🫚','🌰','🫛'], wrong: ['🍄','🌾'] },
];
function HerbGame({ onDone }) {
  const [set] = useState(() => HERB_SETS[Math.floor(Math.random() * HERB_SETS.length)]);
  const [items] = useState(() => [...set.correct, ...set.wrong].sort(() => Math.random() - 0.5));
  const [selected, setSelected] = useState([]);
  const [submitted, setSubmitted] = useState(false);

  const toggle = (item) => {
    if (submitted) return;
    setSelected(prev => prev.includes(item) ? prev.filter(x => x !== item) : prev.length < 3 ? [...prev, item] : prev);
  };
  const submit = () => {
    setSubmitted(true);
    const score = selected.filter(i => set.correct.includes(i)).length;
    setTimeout(() => onDone(score), 600);
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '13px', color: '#F4A0C0', fontWeight: '700', marginBottom: '10px', letterSpacing: '2px' }}>
        🌿 辨药考验 · 选出3种正确草药！
      </div>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '10px' }}>
        {items.map((item, i) => (
          <button key={i} onClick={() => toggle(item)} style={{
            width: '46px', height: '46px', borderRadius: '12px',
            border: `2px solid ${selected.includes(item) ? '#34D399' : 'rgba(255,255,255,0.15)'}`,
            background: selected.includes(item) ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.05)',
            fontSize: '22px', cursor: 'pointer', transition: 'all 0.15s',
          }}>{item}</button>
        ))}
      </div>
      {!submitted && selected.length === 3 && (
        <button onClick={submit} style={{ padding: '8px 20px', background: 'linear-gradient(135deg, #34D399, #059669)', border: 'none', borderRadius: '10px', color: 'white', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>采药完成</button>
      )}
    </div>
  );
}

// ==================== 课程选择面板：图标卡片网格（3行8列） ====================
// ROW_LABELS: 各行的主题标签
const ROW_LABELS = ['第一排·农耕技艺', '第二排·学识文化', '第三排·武学探索'];

function CoursePanelWithPositioning({ courseSelections, onCourseSelect, onConfirm, onRest }) {
  const rows = [
    COURSE_NAMES.slice(0, 8),
    COURSE_NAMES.slice(8, 16),
    COURSE_NAMES.slice(16, 24),
  ];

  return (
    <div style={{
      width: '100%', borderRadius: '20px', overflow: 'hidden',
      border: '2px solid rgba(212,81,122,0.4)',
      background: 'linear-gradient(145deg, rgba(20,8,15,0.95), rgba(35,12,25,0.95))',
      padding: '24px 20px 20px',
    }}>
      <style>{`
        @keyframes courseCardHover { from { transform: scale(1); } to { transform: scale(1.04); } }
        .course-card:hover { animation: courseCardHover 0.15s ease forwards !important; }
        .course-card-selected { animation: none !important; transform: scale(1.03); }
      `}</style>

      {/* 标题 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <h3 style={{
            margin: 0, fontSize: '20px', fontWeight: '800', letterSpacing: '4px',
            background: 'linear-gradient(135deg, #C9A84C, #F4A0C0)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            📚 本月课程选择
          </h3>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'rgba(245,230,236,0.45)', letterSpacing: '1px' }}>
            请从24门课中选择3门本月修习
          </p>
        </div>
        {onRest && (
          <button onClick={onRest} style={{
            background: 'linear-gradient(135deg, #22C55E, #15803D)',
            border: 'none', borderRadius: '10px', padding: '8px 16px',
            color: 'white', fontSize: '13px', fontWeight: '700', cursor: 'pointer',
            flexShrink: 0, marginLeft: '12px',
            boxShadow: '0 2px 8px rgba(34,197,94,0.3)'
          }}>
            休息
          </button>
        )}
      </div>

      {/* 三行课程 */}
      {rows.map((rowCourses, rowIndex) => (
        <div key={rowIndex} style={{ marginBottom: rowIndex < 2 ? '20px' : '0' }}>
          {/* 行标题 */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px'
          }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(212,81,122,0.2)' }} />
            <span style={{ fontSize: '11px', color: 'rgba(201,168,76,0.8)', letterSpacing: '2px', flexShrink: 0 }}>
              {ROW_LABELS[rowIndex]}
            </span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(212,81,122,0.2)' }} />
          </div>
          {/* 8个课程卡片 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(8, 1fr)',
            gap: '8px',
          }}>
            {rowCourses.map((courseName, colIndex) => {
              const globalIndex = rowIndex * 8 + colIndex;
              const content = COURSE_CONTENTS[courseName] || { icon: '📖' };
              const isSelected = courseSelections.includes(globalIndex);
              const isDisabled = !isSelected && courseSelections.length >= 3;
              const hasMiniGame = courseName === '舞蹈' || courseName === '狩猎';
              const isAdventure = courseName === '探险';
              return (
                <button
                  key={globalIndex}
                  className={`course-card${isSelected ? ' course-card-selected' : ''}`}
                  onClick={() => !isDisabled && onCourseSelect(globalIndex)}
                  title={hasMiniGame ? `${courseName}（🎮 内置游戏）` : courseName}
                  style={{
                    padding: '10px 4px 8px',
                    borderRadius: '14px',
                    border: isSelected
                      ? '2px solid #D4517A'
                      : hasMiniGame
                      ? '2px solid rgba(251,191,36,0.7)'
                      : isAdventure
                      ? '2px solid rgba(212,81,122,0.8)'
                      : '1.5px solid rgba(212,81,122,0.2)',
                    background: isSelected
                      ? 'linear-gradient(145deg, rgba(212,81,122,0.35), rgba(160,48,88,0.25))'
                      : hasMiniGame
                      ? 'linear-gradient(145deg, rgba(251,191,36,0.18), rgba(217,119,6,0.12))'
                      : isAdventure
                      ? 'linear-gradient(145deg, rgba(212,81,122,0.2), rgba(160,48,88,0.12))'
                      : isDisabled
                      ? 'rgba(255,255,255,0.03)'
                      : 'rgba(255,255,255,0.04)',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                    transition: 'all 0.2s ease',
                    opacity: isDisabled ? 0.4 : 1,
                    boxShadow: isSelected
                      ? '0 0 16px rgba(212,81,122,0.5)'
                      : hasMiniGame
                      ? '0 0 12px rgba(251,191,36,0.35)'
                      : isAdventure
                      ? '0 0 14px rgba(212,81,122,0.7)'
                      : 'none',
                    fontFamily: 'inherit',
                    position: 'relative',
                    overflow: 'hidden',
                    animation: hasMiniGame && !isSelected ? 'miniGamePulse 2.5s ease-in-out infinite' : isAdventure && !isSelected ? 'miniGamePulse 3s ease-in-out infinite' : 'none',
                  }}
                >
                  {/* 小游戏角标 */}
                  {hasMiniGame && !isSelected && (
                    <div style={{
                      position: 'absolute', top: 2, right: 3,
                      fontSize: '9px', background: 'rgba(251,191,36,0.9)',
                      borderRadius: '4px', padding: '0 3px', color: '#1a0a00',
                      fontWeight: '800', lineHeight: '14px', zIndex: 2,
                    }}>🎮</div>
                  )}
                  {/* 选中光晕 */}
                  {isSelected && (
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'radial-gradient(circle at 50% 40%, rgba(212,81,122,0.25), transparent 70%)',
                      pointerEvents: 'none',
                    }} />
                  )}
                  {/* 图标容器 */}
                  <div style={{
                    width: '42px', height: '42px',
                    borderRadius: '12px',
                    background: isSelected
                      ? 'linear-gradient(135deg, rgba(212,81,122,0.4), rgba(201,168,76,0.2))'
                      : hasMiniGame
                      ? 'linear-gradient(135deg, rgba(251,191,36,0.3), rgba(217,119,6,0.2))'
                      : isAdventure
                      ? 'linear-gradient(135deg, rgba(212,81,122,0.3), rgba(160,48,88,0.2))'
                      : 'rgba(255,255,255,0.06)',
                    border: isSelected
                      ? '1.5px solid rgba(212,81,122,0.6)'
                      : hasMiniGame
                      ? '1.5px solid rgba(251,191,36,0.6)'
                      : isAdventure
                      ? '1.5px solid rgba(212,81,122,0.7)'
                      : '1.5px solid rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '22px',
                    transition: 'all 0.2s ease',
                    flexShrink: 0,
                    position: 'relative', zIndex: 1,
                    filter: isAdventure && !isSelected ? 'drop-shadow(0 0 5px rgba(212,81,122,0.8))' : 'none',
                  }}>
                    {content.icon}
                  </div>
                  {/* 课程名 */}
                  <div style={{
                    fontSize: '10px',
                    color: isSelected ? '#F4A0C0' : hasMiniGame ? '#FDE68A' : 'rgba(245,230,236,0.6)',
                    fontWeight: isSelected || hasMiniGame ? '700' : '500',
                    textAlign: 'center',
                    lineHeight: 1.3,
                    wordBreak: 'break-all',
                    position: 'relative', zIndex: 1,
                  }}>
                    {courseName}
                  </div>
                  {/* 已选角标 */}
                  {isSelected && (
                    <div style={{
                      position: 'absolute', top: '4px', right: '4px',
                      width: '16px', height: '16px', borderRadius: '50%',
                      background: '#D4517A',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '10px', color: 'white', fontWeight: '700',
                      zIndex: 2,
                    }}>
                      {courseSelections.indexOf(globalIndex) + 1}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {/* 底部工具栏：已选课程 + 确定按钮 */}
      <div style={{
        marginTop: '20px',
        paddingTop: '16px',
        borderTop: '1px solid rgba(212,81,122,0.2)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flex: 1, minHeight: '32px', alignItems: 'center' }}>
          {courseSelections.length === 0 ? (
            <span style={{ color: 'rgba(245,230,236,0.4)', fontSize: '13px', letterSpacing: '1px' }}>✦ 点击卡片选择3门课程</span>
          ) : (
            courseSelections.map(i => {
              const c = COURSE_CONTENTS[COURSE_NAMES[i]] || {};
              return (
                <span key={i} style={{
                  fontSize: '13px', padding: '5px 12px',
                  background: 'linear-gradient(135deg, rgba(212,81,122,0.3), rgba(160,48,88,0.2))',
                  border: '1px solid rgba(212,81,122,0.55)',
                  borderRadius: '10px', color: '#F4A0C0', fontWeight: '600',
                  display: 'flex', alignItems: 'center', gap: '5px',
                }}>
                  <span>{c.icon}</span>
                  <span>{COURSE_NAMES[i]}</span>
                </span>
              );
            })
          )}
        </div>
        <button
          onClick={onConfirm}
          disabled={courseSelections.length !== 3}
          style={{
            background: courseSelections.length === 3
              ? 'linear-gradient(135deg, #D4517A, #A03058)'
              : 'rgba(60,60,60,0.5)',
            border: 'none', borderRadius: '14px', padding: '12px 26px',
            color: 'white', cursor: courseSelections.length === 3 ? 'pointer' : 'not-allowed',
            fontSize: '15px', fontWeight: '700', fontFamily: 'inherit',
            whiteSpace: 'nowrap', transition: 'all 0.3s ease', flexShrink: 0,
            boxShadow: courseSelections.length === 3 ? '0 4px 16px rgba(212,81,122,0.4)' : 'none',
          }}
        >
          {courseSelections.length === 3 ? '✨ 确认选课' : `待选 ${3 - courseSelections.length} 门`}
        </button>
      </div>
    </div>
  );
}

// ==================== 劳动选择面板：图标卡片网格（3行8列） ====================
const LABOR_ROW_LABELS = ['第一排·农耕制造', '第二排·服务经营', '第三排·生活手艺'];

const MINI_GAME_LABOR_NAMES = ['织布纺纱', '牧羊放牛'];

function LaborPanelWithPositioning({ laborSelections, onLaborSelect, onConfirm, onRest }) {
  const rows = [
    LABOR_NAMES.slice(0, 8),
    LABOR_NAMES.slice(8, 16),
    LABOR_NAMES.slice(16, 24),
  ];

  return (
    <div style={{
      width: '100%', borderRadius: '20px', overflow: 'hidden',
      border: '2px solid rgba(52,211,153,0.4)',
      background: 'linear-gradient(145deg, rgba(8,20,15,0.95), rgba(12,35,25,0.95))',
      padding: '24px 20px 20px',
    }}>
      <style>{`
        @keyframes laborCardHover { from { transform: scale(1); } to { transform: scale(1.04); } }
        .labor-card:hover { animation: laborCardHover 0.15s ease forwards !important; }
        .labor-card-selected { animation: none !important; transform: scale(1.03); }
        @keyframes miniGamePulse {
          0%, 100% { box-shadow: 0 0 8px rgba(251,191,36,0.3); border-color: rgba(251,191,36,0.5); }
          50% { box-shadow: 0 0 18px rgba(251,191,36,0.65); border-color: rgba(251,191,36,0.95); }
        }
      `}</style>

      {/* 标题 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <h3 style={{
            margin: 0, fontSize: '20px', fontWeight: '800', letterSpacing: '4px',
            background: 'linear-gradient(135deg, #34D399, #6EE7B7)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            ⚒️ 本月劳动选择
          </h3>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'rgba(245,230,236,0.45)', letterSpacing: '1px' }}>
            请从24种劳动中选择3种，劳动可赚取金币
          </p>
        </div>
        {onRest && (
          <button onClick={onRest} style={{
            background: 'linear-gradient(135deg, #22C55E, #15803D)',
            border: 'none', borderRadius: '10px', padding: '8px 16px',
            color: 'white', fontSize: '13px', fontWeight: '700', cursor: 'pointer',
            flexShrink: 0, marginLeft: '12px',
            boxShadow: '0 2px 8px rgba(34,197,94,0.3)'
          }}>
            休息
          </button>
        )}
      </div>

      {/* 三行劳动 */}
      {rows.map((rowLabors, rowIndex) => (
        <div key={rowIndex} style={{ marginBottom: rowIndex < 2 ? '20px' : '0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(52,211,153,0.2)' }} />
            <span style={{ fontSize: '11px', color: 'rgba(52,211,153,0.8)', letterSpacing: '2px', flexShrink: 0 }}>
              {LABOR_ROW_LABELS[rowIndex]}
            </span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(52,211,153,0.2)' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '8px' }}>
            {rowLabors.map((laborName, colIndex) => {
              const globalIndex = rowIndex * 8 + colIndex;
              const content = LABOR_CONTENTS[laborName] || { icon: '🔧' };
              const isSelected = laborSelections.includes(globalIndex);
              const isDisabled = !isSelected && laborSelections.length >= 3;
              const isMiniGame = MINI_GAME_LABOR_NAMES.includes(laborName);
              return (
                <button
                  key={globalIndex}
                  className={`labor-card${isSelected ? ' labor-card-selected' : ''}`}
                  onClick={() => !isDisabled && onLaborSelect(globalIndex)}
                  title={isMiniGame ? `${laborName}（🎮 迷你游戏）` : laborName}
                  style={{
                    padding: '10px 4px 8px',
                    borderRadius: '14px',
                    border: isSelected
                      ? '2px solid #34D399'
                      : isMiniGame
                      ? '2px solid rgba(251,191,36,0.7)'
                      : '1.5px solid rgba(52,211,153,0.2)',
                    background: isSelected
                      ? 'linear-gradient(145deg, rgba(52,211,153,0.3), rgba(16,120,80,0.25))'
                      : isMiniGame
                      ? 'linear-gradient(145deg, rgba(251,191,36,0.18), rgba(217,119,6,0.12))'
                      : isDisabled ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.04)',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                    transition: 'all 0.2s ease',
                    opacity: isDisabled ? 0.4 : 1,
                    boxShadow: isSelected
                      ? '0 0 16px rgba(52,211,153,0.4)'
                      : isMiniGame
                      ? '0 0 12px rgba(251,191,36,0.35)'
                      : 'none',
                    fontFamily: 'inherit',
                    position: 'relative', overflow: 'hidden',
                    animation: isMiniGame && !isSelected ? 'miniGamePulse 2.5s ease-in-out infinite' : 'none',
                  }}
                >
                  {isMiniGame && !isSelected && (
                    <div style={{
                      position: 'absolute', top: 2, right: 3,
                      fontSize: '9px', background: 'rgba(251,191,36,0.9)',
                      borderRadius: '4px', padding: '0 3px', color: '#1a0a00',
                      fontWeight: '800', lineHeight: '14px', zIndex: 2,
                    }}>🎮</div>
                  )}
                  {isSelected && (
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'radial-gradient(circle at 50% 40%, rgba(52,211,153,0.2), transparent 70%)',
                      pointerEvents: 'none',
                    }} />
                  )}
                  <div style={{
                    width: '42px', height: '42px', borderRadius: '12px',
                    background: isSelected
                      ? 'linear-gradient(135deg, rgba(52,211,153,0.35), rgba(110,231,183,0.2))'
                      : isMiniGame
                      ? 'linear-gradient(135deg, rgba(251,191,36,0.3), rgba(217,119,6,0.2))'
                      : 'rgba(255,255,255,0.06)',
                    border: isSelected
                      ? '1.5px solid rgba(52,211,153,0.6)'
                      : isMiniGame
                      ? '1.5px solid rgba(251,191,36,0.6)'
                      : '1.5px solid rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '22px', transition: 'all 0.2s ease', flexShrink: 0,
                    position: 'relative', zIndex: 1,
                  }}>
                    {content.icon}
                  </div>
                  <div style={{
                    fontSize: '10px',
                    color: isSelected ? '#6EE7B7' : isMiniGame ? '#FDE68A' : 'rgba(245,230,236,0.6)',
                    fontWeight: isSelected || isMiniGame ? '700' : '500',
                    textAlign: 'center', lineHeight: 1.3, wordBreak: 'break-all',
                    position: 'relative', zIndex: 1,
                  }}>
                    {laborName}
                  </div>
                  {isSelected && (
                    <div style={{
                      position: 'absolute', top: '4px', right: '4px',
                      width: '16px', height: '16px', borderRadius: '50%',
                      background: '#34D399',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '10px', color: 'white', fontWeight: '700', zIndex: 2,
                    }}>
                      {laborSelections.indexOf(globalIndex) + 1}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {/* 底部工具栏 */}
      <div style={{
        marginTop: '20px', paddingTop: '16px',
        borderTop: '1px solid rgba(52,211,153,0.2)',
        display: 'flex', alignItems: 'center', gap: '10px',
      }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flex: 1, minHeight: '32px', alignItems: 'center' }}>
          {laborSelections.length === 0 ? (
            <span style={{ color: 'rgba(245,230,236,0.4)', fontSize: '13px', letterSpacing: '1px' }}>✦ 点击卡片选择3种劳动</span>
          ) : (
            laborSelections.map(i => {
              const c = LABOR_CONTENTS[LABOR_NAMES[i]] || {};
              return (
                <span key={i} style={{
                  fontSize: '13px', padding: '5px 12px',
                  background: 'linear-gradient(135deg, rgba(52,211,153,0.25), rgba(16,120,80,0.2))',
                  border: '1px solid rgba(52,211,153,0.5)',
                  borderRadius: '10px', color: '#6EE7B7', fontWeight: '600',
                  display: 'flex', alignItems: 'center', gap: '5px',
                }}>
                  <span>{c.icon}</span>
                  <span>{LABOR_NAMES[i]}</span>
                </span>
              );
            })
          )}
        </div>
        <button
          onClick={onConfirm}
          disabled={laborSelections.length !== 3}
          style={{
            background: laborSelections.length === 3 ? 'linear-gradient(135deg, #34D399, #059669)' : 'rgba(60,60,60,0.5)',
            border: 'none', borderRadius: '14px', padding: '12px 26px',
            color: 'white', cursor: laborSelections.length === 3 ? 'pointer' : 'not-allowed',
            fontSize: '15px', fontWeight: '700', fontFamily: 'inherit',
            whiteSpace: 'nowrap', transition: 'all 0.3s ease', flexShrink: 0,
            boxShadow: laborSelections.length === 3 ? '0 4px 16px rgba(52,211,153,0.4)' : 'none',
          }}
        >
          {laborSelections.length === 3 ? '💰 确认劳动' : `待选 ${3 - laborSelections.length} 种`}
        </button>
      </div>
    </div>
  );
}

// ==================== 劳动弹窗：下滑动画展示劳动收获 ====================
// 劳动过程小任务题库（key 与 LABOR_NAMES 完全对应）
const LABOR_MINI_TASKS = {
  '织布纺纱': [
    { prompt: '纺线时线断了，你该怎么办？', options: ['停下来重新接线', '继续硬拉扯', '换一根新线'], correct: 0, bonus: { key: 'vitality', label: '体力', delta: 2 } },
    { prompt: '梭子卡住了，你会？', options: ['轻轻拨动梭子', '用力敲打', '叫人来帮忙'], correct: 0, bonus: { key: 'painting', label: '画艺', delta: 2 } },
  ],
  '制陶烧窑': [
    { prompt: '泥坯开裂了，原因最可能是？', options: ['晾干太快，水分不均', '泥土太多', '窑火太旺'], correct: 0, bonus: { key: 'wisdom', label: '才学', delta: 2 } },
    { prompt: '烧窑时火候如何判断？', options: ['观察火焰颜色和陶器光泽', '凭感觉估计', '看时间长短'], correct: 0, bonus: { key: 'spirit', label: '灵气', delta: 2 } },
  ],
  '打铁锻造': [
    { prompt: '铁器锻打时，何时淬火最佳？', options: ['烧至红热时迅速入水', '冷却后再入水', '随时都行'], correct: 0, bonus: { key: 'vitality', label: '体力', delta: 2 } },
    { prompt: '铁锤挥下，力道该如何？', options: ['稳而有力，集中一点', '越猛越好', '轻轻敲打'], correct: 0, bonus: { key: 'courage', label: '胆识', delta: 2 } },
  ],
  '捕鱼捞虾': [
    { prompt: '撒网时应注意什么？', options: ['顺水流方向，均匀展开', '逆水流方向', '随意撒出'], correct: 0, bonus: { key: 'spirit', label: '灵气', delta: 2 } },
    { prompt: '发现鱼群在深水，你会？', options: ['换用重坠网，沉到底部', '继续浅水捞', '放弃转移'], correct: 0, bonus: { key: 'vitality', label: '体力', delta: 2 } },
  ],
  '采药收草': [
    { prompt: '采到一株不认识的草药，你会？', options: ['先记下特征，请教郎中再确认', '直接尝一口', '随手丢弃'], correct: 0, bonus: { key: 'medical', label: '医术', delta: 3 } },
    { prompt: '采药时遇到蜂巢，你会？', options: ['缓慢退开，绕道而行', '挥手驱赶', '大声呼救'], correct: 0, bonus: { key: 'spirit', label: '灵气', delta: 2 } },
  ],
  '牧羊放牛': [
    { prompt: '牛羊走散了，最好的办法是？', options: ['吹口哨或摇铃，等它们回来', '大声呼喊追赶', '立刻报官'], correct: 0, bonus: { key: 'wildness', label: '野性', delta: 2 } },
    { prompt: '暴风雨来临，如何安置牲畜？', options: ['提前赶入圈舍避风', '继续放牧', '任由它们躲避'], correct: 0, bonus: { key: 'spirit', label: '灵气', delta: 2 } },
  ],
  '伐木搬柴': [
    { prompt: '砍树时，切口应朝哪个方向？', options: ['朝向树倒的方向，先斜切再直切', '随意方向', '从顶部往下砍'], correct: 0, bonus: { key: 'courage', label: '胆识', delta: 2 } },
    { prompt: '扛柴时腰酸，你会？', options: ['调整姿势，用腿部发力', '咬牙硬撑', '直接放下休息'], correct: 0, bonus: { key: 'vitality', label: '体力', delta: 2 } },
  ],
  '制绳编筐': [
    { prompt: '编筐时藤条断了，如何接续？', options: ['将新藤条压入旧藤下方编入', '直接绑一个结', '换新藤条重编'], correct: 0, bonus: { key: 'wisdom', label: '才学', delta: 2 } },
  ],
  '酿造蜂蜜': [
    { prompt: '蜂蜜结晶了，这说明什么？', options: ['质量好，纯度高', '变质了', '水分太多'], correct: 0, bonus: { key: 'culinary', label: '厨艺', delta: 3 } },
    { prompt: '取蜜时如何避免被蜂蛰？', options: ['穿戴防护，用烟雾驱蜂', '快速取完', '徒手取蜜'], correct: 0, bonus: { key: 'spirit', label: '灵气', delta: 2 } },
  ],
  '修缮房屋': [
    { prompt: '屋顶漏雨，最先检查什么？', options: ['瓦片是否移位或破损', '墙壁是否裂缝', '地基是否松动'], correct: 0, bonus: { key: 'wisdom', label: '才学', delta: 2 } },
  ],
  '挖井引水': [
    { prompt: '挖井时遇到坚硬岩层，你会？', options: ['换用铁钎凿开，再清理碎石', '直接放弃', '绕开另挖'], correct: 0, bonus: { key: 'vitality', label: '体力', delta: 3 } },
  ],
  '驾车赶路': [
    { prompt: '马车轮子陷入泥坑，如何脱困？', options: ['在轮下垫木板，再驱马拉出', '猛抽马鞭', '等人来帮'], correct: 0, bonus: { key: 'courage', label: '胆识', delta: 2 } },
  ],
  '传递信件': [
    { prompt: '信件被雨淋湿，你会？', options: ['立刻放入干燥处摊开晾干', '用手甩干', '继续赶路不管'], correct: 0, bonus: { key: 'morality', label: '道德', delta: 2 } },
  ],
  '守夜巡逻': [
    { prompt: '深夜发现可疑人影，你会？', options: ['提灯靠近查看，保持警惕', '大声呼喊', '立刻逃跑'], correct: 0, bonus: { key: 'courage', label: '胆识', delta: 3 } },
  ],
  '摆摊售货': [
    { prompt: '客人嫌价格贵，你会？', options: ['说明货品品质，适当让利', '立刻降价', '拒绝还价'], correct: 0, bonus: { key: 'rhetoric', label: '口才', delta: 3 } },
    { prompt: '货物快卖完，有人想全买，你会？', options: ['留一部分给其他顾客，维护口碑', '全卖给他', '涨价再卖'], correct: 0, bonus: { key: 'affinity', label: '亲和', delta: 2 } },
  ],
  '浣洗衣物': [
    { prompt: '衣物有顽固污渍，如何处理？', options: ['用皂角反复揉搓后浸泡', '用力拧扯', '直接晾干'], correct: 0, bonus: { key: 'morality', label: '道德', delta: 2 } },
  ],
  '腌制咸菜': [
    { prompt: '腌菜坛子里出现白沫，你会？', options: ['撇去白沫，加盐压实再密封', '直接丢弃', '继续腌制不管'], correct: 0, bonus: { key: 'culinary', label: '厨艺', delta: 3 } },
  ],
  '编制灯笼': [
    { prompt: '竹丝太硬不好弯曲，你会？', options: ['用水浸泡后再编', '用火烤软', '换细竹丝'], correct: 0, bonus: { key: 'painting', label: '画艺', delta: 3 } },
  ],
  '种桑养蚕': [
    { prompt: '蚕宝宝不吃桑叶，可能是？', options: ['桑叶太老或太湿，需换新鲜嫩叶', '蚕生病了', '温度太低'], correct: 0, bonus: { key: 'spirit', label: '灵气', delta: 3 } },
  ],
  '磨粮制粉': [
    { prompt: '磨盘转动费力，原因是？', options: ['粮食放太多，需减量', '磨盘太重', '人力不够'], correct: 0, bonus: { key: 'vitality', label: '体力', delta: 2 } },
  ],
  '晒盐制卤': [
    { prompt: '盐田里盐分不够浓，如何改善？', options: ['扩大蒸发面积，延长晾晒时间', '加更多海水', '加热煮沸'], correct: 0, bonus: { key: 'wisdom', label: '才学', delta: 2 } },
  ],
  '制作陶器': [
    { prompt: '陶器烧好后出现裂纹，原因是？', options: ['降温太快，应缓慢冷却', '泥土质量差', '水分太少'], correct: 0, bonus: { key: 'spirit', label: '灵气', delta: 2 } },
  ],
  '挑担运货': [
    { prompt: '挑担走远路，如何保持体力？', options: ['步伐均匀，定时换肩休息', '一口气冲到终点', '放慢速度磨蹭'], correct: 0, bonus: { key: 'vitality', label: '体力', delta: 3 } },
  ],
  '烧炭制薪': [
    { prompt: '炭窑封口后，如何判断炭已烧好？', options: ['烟色由浓转淡，再等两个时辰', '烟停了就好', '随时可以开窑'], correct: 0, bonus: { key: 'wildness', label: '野性', delta: 2 } },
  ],
};

function LaborScheduleModal({ laborModal, character, onClose }) {
  const [phase, setPhase] = useState('title');
  const [visibleCount, setVisibleCount] = useState(0);
  const [progressWidth, setProgressWidth] = useState(0);
  const SLIDE_DURATION = 4000;

  // 劳动过程小任务状态
  const [miniTask, setMiniTask] = useState(null); // { type, prompt, options, answered, bonus }
  const [taskAnswered, setTaskAnswered] = useState(false);
  const [taskBonus, setTaskBonus] = useState(null);

  useEffect(() => {
    if (!laborModal) return;
    setPhase('title');
    setVisibleCount(0);
    setProgressWidth(0);
    setMiniTask(null);
    setTaskAnswered(false);
    setTaskBonus(null);
    const t1 = setTimeout(() => setPhase('slide'), 500);
    return () => clearTimeout(t1);
  }, [laborModal]);

  useEffect(() => {
    if (phase !== 'slide') return;
    const labors = laborModal?.labors || [];
    const count = labors.length;
    if (count === 0) { setPhase('done'); return; }
    const interval = SLIDE_DURATION / count;
    let shown = 0;
    const timer = setInterval(() => {
      shown += 1;
      setVisibleCount(shown);
      if (shown >= count) {
        clearInterval(timer);
        // 随机触发一个小任务（60%概率）
        const allTasks = labors.flatMap(l => LABOR_MINI_TASKS[l] || []);
        if (allTasks.length > 0 && Math.random() < 0.6) {
          const task = allTasks[Math.floor(Math.random() * allTasks.length)];
          setMiniTask(task);
          setPhase('task'); // 进入小任务阶段
        } else {
          setPhase('done');
        }
      }
    }, interval);
    return () => clearInterval(timer);
  }, [phase, laborModal]);

  useEffect(() => {
    if (phase === 'done') {
      const t = setTimeout(() => setProgressWidth(100), 150);
      return () => clearTimeout(t);
    }
  }, [phase]);

  if (!laborModal) return null;
  const labors = laborModal.labors || [];

  const SKILL_COLORS = {
    charm: '#DB2777', wisdom: '#2563EB', spirit: '#7C3AED',
    affinity: '#059669', courage: '#F59E0B', vitality: '#EF4444',
    wildness: '#DC2626', culinary: '#EA580C', medical: '#16A34A',
    poetry: '#9333EA', music: '#0EA5E9', painting: '#D97706',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,2,5,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, backdropFilter: 'blur(12px)' }}>
      <style>{`
        @keyframes laborSlideIn { from { opacity: 0; transform: translateY(-40px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes goldGlow { 0%,100% { box-shadow: 0 0 10px rgba(52,211,153,0.3); } 50% { box-shadow: 0 0 24px rgba(52,211,153,0.7); } }
        @keyframes laborMilestoneFlash { 0%{transform:scale(0.85);opacity:0} 40%{transform:scale(1.06);opacity:1} 70%{transform:scale(0.97)} 100%{transform:scale(1);opacity:1} }
        @keyframes laborRandomFade { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes laborNpcSlide { from{opacity:0;transform:translateX(40px)} to{opacity:1;transform:translateX(0)} }
      `}</style>
      <div style={{
        background: 'linear-gradient(145deg, rgba(6,15,10,0.99), rgba(10,24,18,0.99))',
        border: '2px solid rgba(52,211,153,0.5)',
        borderRadius: '28px',
        padding: '32px 30px 28px',
        maxWidth: '560px', width: '92vw', maxHeight: '90vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 0 60px rgba(52,211,153,0.15)',
      }}>
        {/* 标题 */}
        <div style={{ textAlign: 'center', marginBottom: phase === 'title' ? '0' : '20px', flexShrink: 0 }}>
          <h2 style={{
            fontSize: phase === 'title' ? '38px' : '22px',
            fontWeight: '800', margin: 0,
            background: 'linear-gradient(135deg, #34D399, #6EE7B7)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            letterSpacing: '4px', transition: 'font-size 0.6s ease',
          }}>
            ⚒️ 劳动收获
          </h2>
          {phase === 'title' && (
            <div style={{ marginTop: '12px', fontSize: '14px', color: 'rgba(245,230,236,0.45)', letterSpacing: '2px' }}>
              本月劳动成果即将揭晓...
            </div>
          )}
        </div>

        {/* 劳动下滑区 */}
        {phase !== 'title' && (
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
            {labors.map((labor, index) => {
              const content = LABOR_CONTENTS[labor] || { icon: '🔧', desc: '辛勤劳作，颇有收获。', gold: 0, skills: [] };
              const isVisible = index < visibleCount;
              return (
                <div
                  key={labor}
                  style={{
                    opacity: isVisible ? 1 : 0,
                    animation: isVisible ? 'laborSlideIn 0.55s ease forwards' : 'none',
                    background: 'linear-gradient(135deg, rgba(52,211,153,0.08), rgba(10,30,20,0.8))',
                    borderRadius: '18px', padding: '16px 18px', marginBottom: '12px',
                    border: '1px solid rgba(52,211,153,0.3)',
                    pointerEvents: isVisible ? 'auto' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                    <div style={{
                      width: '48px', height: '48px', borderRadius: '14px', flexShrink: 0,
                      background: 'rgba(52,211,153,0.15)', border: '2px solid rgba(52,211,153,0.4)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px',
                    }}>
                      {content.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '17px', fontWeight: '700', color: '#6EE7B7', marginBottom: '3px' }}>{labor}</div>
                      <div style={{ fontSize: '12px', color: 'rgba(245,230,236,0.5)' }}>{content.desc}</div>
                    </div>
                    {/* 金币收益 */}
                    {content.gold > 0 && (
                      <div style={{
                        flexShrink: 0, padding: '6px 14px',
                        background: 'rgba(201,168,76,0.2)', border: '1.5px solid rgba(201,168,76,0.6)',
                        borderRadius: '12px', color: '#FFE08A', fontSize: '14px', fontWeight: '800',
                        animation: isVisible ? 'goldGlow 2s ease infinite' : 'none',
                      }}>
                        💰+{content.gold}
                      </div>
                    )}
                  </div>
                  {/* 三种属性进度条 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {(content.skills || []).map((sk, si) => {
                      const skColor = SKILL_COLORS[sk.key] || '#34D399';
                      const curVal = character?.skills?.[sk.key] || 0;
                      const newVal = Math.min(100, curVal + sk.delta);
                      return (
                        <div key={si}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                            <span style={{ fontSize: '10px', color: skColor, fontWeight: '600' }}>{sk.label} +{sk.delta}</span>
                            <span style={{ fontSize: '10px', color: 'rgba(245,230,236,0.4)' }}>{curVal} → {newVal}</span>
                          </div>
                          <div style={{ height: '5px', borderRadius: '3px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', borderRadius: '3px',
                              width: isVisible ? `${newVal}%` : '0%',
                              background: `linear-gradient(90deg, ${skColor}, ${skColor}BB)`,
                              transition: `width 1s ease ${0.3 + si * 0.2}s`,
                              boxShadow: `0 0 6px ${skColor}60`,
                            }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* ── 劳动过程小任务（phase=task时显示） ── */}
            {(phase === 'task' || (phase === 'done' && taskAnswered)) && miniTask && (
              <div style={{
                marginTop: '8px',
                background: 'linear-gradient(135deg, rgba(52,211,153,0.12), rgba(10,30,20,0.9))',
                border: `1.5px solid ${taskAnswered ? 'rgba(52,211,153,0.6)' : 'rgba(52,211,153,0.4)'}`,
                borderRadius: '18px', padding: '16px 18px',
                animation: 'laborRandomFade 0.4s ease forwards',
              }}>
                <div style={{ fontSize: '12px', color: 'rgba(52,211,153,0.7)', letterSpacing: '2px', marginBottom: '8px' }}>
                  ✨ 劳动小考验
                </div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: 'rgba(245,230,236,0.9)', marginBottom: '12px', lineHeight: 1.6 }}>
                  {miniTask.prompt}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {miniTask.options.map((opt, i) => {
                    const isCorrect = i === miniTask.correct;
                    const isSelected = taskAnswered;
                    return (
                      <button
                        key={i}
                        disabled={taskAnswered}
                        onClick={() => {
                          if (taskAnswered) return;
                          setTaskAnswered(true);
                          if (isCorrect) {
                            setTaskBonus(miniTask.bonus);
                          }
                          // 答题后短暂停留再进入done
                          setTimeout(() => setPhase('done'), 1200);
                        }}
                        style={{
                          padding: '9px 14px',
                          background: !taskAnswered
                            ? 'rgba(52,211,153,0.1)'
                            : isCorrect
                              ? 'rgba(52,211,153,0.25)'
                              : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${!taskAnswered ? 'rgba(52,211,153,0.3)' : isCorrect ? 'rgba(52,211,153,0.8)' : 'rgba(255,255,255,0.1)'}`,
                          borderRadius: '10px',
                          color: !taskAnswered ? 'rgba(245,230,236,0.85)' : isCorrect ? '#6EE7B7' : 'rgba(245,230,236,0.35)',
                          fontSize: '13px', cursor: taskAnswered ? 'default' : 'pointer',
                          textAlign: 'left', fontFamily: 'inherit',
                          transition: 'all 0.2s',
                        }}
                      >
                        {!taskAnswered ? `${['A','B','C'][i]}. ${opt}` : isCorrect ? `✅ ${opt}` : `${['A','B','C'][i]}. ${opt}`}
                      </button>
                    );
                  })}
                </div>
                {taskAnswered && taskBonus && (
                  <div style={{ marginTop: '10px', fontSize: '13px', color: '#6EE7B7', fontWeight: '700', animation: 'laborRandomFade 0.4s ease forwards' }}>
                    🎉 答对了！{taskBonus.label} +{taskBonus.delta}
                  </div>
                )}
                {taskAnswered && !taskBonus && (
                  <div style={{ marginTop: '10px', fontSize: '13px', color: 'rgba(245,230,236,0.45)' }}>
                    没关系，下次会更好！
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 底部进度条 + 按钮 */}
        {phase === 'done' && (
          <div style={{ flexShrink: 0, marginTop: '16px' }}>

            {/* ── 技能里程碑（劳动） ── */}
            {(laborModal?.milestones || []).map((m, mi) => (
              <div key={mi} style={{
                marginBottom: '12px',
                background: 'linear-gradient(135deg, rgba(201,168,76,0.2), rgba(255,224,138,0.06))',
                border: '2px solid rgba(201,168,76,0.7)',
                borderRadius: '16px', padding: '14px 18px',
                display: 'flex', alignItems: 'center', gap: '14px',
                animation: 'laborMilestoneFlash 0.7s ease forwards',
              }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, rgba(201,168,76,0.4), rgba(255,224,138,0.2))', border: '2px solid rgba(201,168,76,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🏆</div>
                <div>
                  <div style={{ fontSize: '11px', color: 'rgba(201,168,76,0.7)', letterSpacing: '2px', marginBottom: '3px' }}>成就解锁</div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#FFE08A', letterSpacing: '2px' }}>{m.title}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(245,230,236,0.5)', marginTop: '2px' }}>{m.label} 达到 {m.milestone} · 当前 {m.newVal}</div>
                </div>
              </div>
            ))}

            {/* ── 随机事件（劳动） ── */}
            {laborModal?.randomEvent && (
              <div style={{
                marginBottom: '12px',
                background: 'linear-gradient(135deg, rgba(234,179,8,0.15), rgba(20,15,5,0.9))',
                border: '1.5px solid rgba(234,179,8,0.5)',
                borderRadius: '14px', padding: '13px 16px',
                display: 'flex', alignItems: 'flex-start', gap: '10px',
                animation: 'laborRandomFade 0.6s ease 0.2s both',
              }}>
                <span style={{ fontSize: '22px', flexShrink: 0 }}>{laborModal.randomEvent.emoji}</span>
                <div>
                  <div style={{ fontSize: '11px', color: 'rgba(234,179,8,0.7)', letterSpacing: '2px', marginBottom: '3px' }}>{laborModal.randomEvent.type === 'good' ? '意外之喜' : '小插曲'}</div>
                  <div style={{ fontSize: '12px', color: 'rgba(245,230,236,0.75)', lineHeight: 1.6 }}>{laborModal.randomEvent.text}</div>
                  {laborModal.randomEvent.skillKey && (
                    <div style={{ fontSize: '11px', color: '#FCD34D', marginTop: '4px', fontWeight: '700' }}>+{laborModal.randomEvent.delta} {laborModal.randomEvent.skillKey}</div>
                  )}
                </div>
              </div>
            )}

            {/* ── NPC旁观评论（劳动） ── */}
            {laborModal?.npcComment && (() => {
              const npcInfo = { wangwenyu:{name:'王文玉',avatar:'/assets/npc_avatars/wangwenyu.png',color:'#F9A8D4'}, mufengongzi:{name:'幕风公子',avatar:'/assets/npc_avatars/mufengongzi.png',color:'#93C5FD'}, sitouqian:{name:'司徒仟',avatar:'/assets/npc_avatars/sitouqian.png',color:'#C4B5FD'}, desert_friend:{name:'沐风',avatar:'/assets/npc_avatars/desert_friend.png',color:'#FCD34D'}, royal_emperor:{name:'皇上',avatar:'/assets/npc_avatars/emperor.png',color:'#FDE68A'} }[laborModal.npcComment.npcId] || {};
              return (
                <div style={{
                  marginBottom: '12px',
                  background: 'linear-gradient(135deg, rgba(52,211,153,0.08), rgba(5,20,15,0.9))',
                  border: `1.5px solid ${npcInfo.color || '#34D399'}55`,
                  borderRadius: '14px', padding: '12px 14px',
                  display: 'flex', alignItems: 'flex-start', gap: '10px',
                  animation: 'laborNpcSlide 0.55s ease 0.3s both',
                }}>
                  <img src={npcInfo.avatar} alt={npcInfo.name} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: `2px solid ${npcInfo.color || '#34D399'}66` }} onError={e => { e.target.style.display='none'; }} />
                  <div>
                    <div style={{ fontSize: '11px', color: npcInfo.color || '#34D399', fontWeight: '700', marginBottom: '4px' }}>{npcInfo.name}</div>
                    <div style={{ fontSize: '12px', color: 'rgba(245,230,236,0.7)', lineHeight: 1.6 }}>{laborModal.npcComment.text}</div>
                  </div>
                </div>
              );
            })()}

            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', color: 'rgba(245,230,236,0.5)', letterSpacing: '2px' }}>
                  ⚒️ 本月劳动完成进度
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '11px', color: '#34D399', fontWeight: '700' }}>
                    💰 +{labors.reduce((sum, name) => sum + (LABOR_CONTENTS[name]?.gold || 0), 0)} 金币
                  </span>
                  {laborModal.bonusGold > 0 && (
                    <span style={{ fontSize: '11px', color: '#FFD700', fontWeight: '700', paddingLeft: '8px', borderLeft: '1px solid rgba(201,168,76,0.3)' }}>
                      🎮 游戏奖励 +{laborModal.bonusGold}
                    </span>
                  )}
                  {taskBonus && (
                    <span style={{ fontSize: '11px', color: '#6EE7B7', fontWeight: '700', paddingLeft: '8px', borderLeft: '1px solid rgba(52,211,153,0.3)' }}>
                      ✨ {taskBonus.label} +{taskBonus.delta}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ height: '10px', borderRadius: '5px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: '5px',
                  width: `${progressWidth}%`,
                  background: 'linear-gradient(90deg, #34D399, #6EE7B7, #C9A84C)',
                  transition: 'width 1.2s cubic-bezier(0.22,1,0.36,1)',
                  boxShadow: '0 0 12px rgba(52,211,153,0.5)',
                }} />
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: '100%', padding: '15px',
                background: 'linear-gradient(135deg, #34D399, #059669)',
                border: 'none', borderRadius: '16px', color: 'white', cursor: 'pointer',
                fontSize: '16px', fontWeight: '700', fontFamily: 'inherit',
                letterSpacing: '2px', boxShadow: '0 4px 20px rgba(52,211,153,0.4)',
                transition: 'transform 0.2s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              ✅ 劳动结束
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== 探险地图场景组件 ====================

// ── 通用多步对话+选项组件（支持随机子场景、战斗判定） ──
function AdventureDialogue({ scene, visitCount, character, onClose, onForceClose }) {
  // 随机决定是否触发子场景（每次访问均有概率）
  const [activeSubScene] = useState(() => {
    if (scene.subScenes && scene.subScenes.length > 0) {
      const rand = Math.random();
      let cum = 0;
      for (const s of scene.subScenes) {
        cum += s.probability;
        if (rand < cum) return s;
      }
    }
    return null;
  });

  // 阶段：'main' → 主场景对话，'sub' → 子场景对话/选项
  const [phase, setPhase] = useState('main');
  const [step, setStep] = useState(0);
  const [choiceMade, setChoiceMade] = useState(null);
  const [choiceResult, setChoiceResult] = useState(null);
  const [combatOutcome, setCombatOutcome] = useState(null); // 'win' | 'lose'

  // 支持 dialogueSets 数组（按访问次数轮换）或旧格式 dialogues.first/later
  const mainDialogues = (() => {
    if (scene.dialogueSets && scene.dialogueSets.length > 0) {
      const idx = visitCount % scene.dialogueSets.length;
      return scene.dialogueSets[idx].dialogues;
    }
    return visitCount === 0 ? scene.dialogues.first : scene.dialogues.later;
  })();
  // 支持 choiceSets 数组（按访问次数轮换）或旧格式 choices（仅首次）
  const mainChoices = (() => {
    if (scene.choiceSets && scene.choiceSets.length > 0) {
      const idx = visitCount % scene.choiceSets.length;
      return scene.choiceSets[idx];
    }
    return scene.choices && visitCount === 0 ? scene.choices : null;
  })();

  // 子场景也支持 dialogueSets/choiceSets（按visitCount轮换）
  const subDialogues = (() => {
    if (!activeSubScene) return null;
    if (activeSubScene.dialogueSets && activeSubScene.dialogueSets.length > 0) {
      const idx = visitCount % activeSubScene.dialogueSets.length;
      return activeSubScene.dialogueSets[idx].dialogues;
    }
    return activeSubScene.dialogues;
  })();
  const subChoices = (() => {
    if (!activeSubScene) return null;
    if (activeSubScene.choiceSets && activeSubScene.choiceSets.length > 0) {
      const idx = visitCount % activeSubScene.choiceSets.length;
      return activeSubScene.choiceSets[idx];
    }
    return activeSubScene.choices;
  })();

  // 当前展示的对话列表和选项
  const dialogues = phase === 'sub' && activeSubScene ? subDialogues : mainDialogues;
  const choices = phase === 'sub' && activeSubScene ? subChoices : mainChoices;
  const currentImage = phase === 'sub' && activeSubScene ? activeSubScene.image : scene.image;
  const currentOverlay = phase === 'sub' && activeSubScene ? (activeSubScene.overlay || scene.overlay) : scene.overlay;

  const totalSteps = dialogues.length;
  const isLastDialogue = step === totalSteps - 1;
  const showChoices = isLastDialogue && choices && !choiceMade && combatOutcome === null;
  const showResult = !!choiceResult && combatOutcome === null;
  const showCombatResult = combatOutcome !== null;

  const handleNext = () => {
    if (showCombatResult) {
      if (combatOutcome === 'lose') { onForceClose(); return; }
      // 战斗胜利后，若主场景还有子场景则切入
      if (phase === 'main' && activeSubScene) {
        setPhase('sub'); setStep(0); setChoiceMade(null); setChoiceResult(null); setCombatOutcome(null);
      } else {
        onClose(null);
      }
      return;
    }
    if (showResult) {
      // 主场景选项结果看完后，若有子场景则切入
      if (phase === 'main' && activeSubScene) {
        setPhase('sub'); setStep(0); setChoiceMade(null); setChoiceResult(null);
      } else {
        onClose(choiceMade);
      }
      return;
    }
    if (isLastDialogue && !choices) {
      // 主场景纯对话完（无选项），有子场景则切换
      if (phase === 'main' && activeSubScene) {
        setPhase('sub'); setStep(0); setChoiceMade(null); setChoiceResult(null);
      } else {
        onClose(null);
      }
      return;
    }
    if (!showChoices) setStep(s => s + 1);
  };

  const handleChoice = (choice) => {
    if (choice.type === 'combat') {
      // 战斗判定：基于野性+体力+胆识+武术
      const skills = character?.skills || {};
      const power = (skills.wildness || 0) + (skills.vitality || 0) + (skills.courage || 0) + (skills.martial || 0) * 0.5;
      const winChance = Math.min(0.85, Math.max(0.15, power / 220));
      const won = Math.random() < winChance;
      setChoiceMade(choice.id);
      setCombatOutcome(won ? 'win' : 'lose');
      setChoiceResult(won ? choice.winResult : choice.loseResult);
      // 上报战斗结果给后端
      if (won) {
        axios.post(`${API_BASE}/game/event`, { eventType: 'combat_won' }).catch(() => {});
      }
    } else {
      setChoiceMade(choice.id);
      setChoiceResult(choice.result);
    }
  };

  const accentColor = scene.accentColor || '#C9A84C';
  const borderColor = scene.borderColor || 'rgba(212,81,122,0.7)';

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(5,2,5,0.9)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1400, backdropFilter: 'blur(8px)',
    }}>
      <div style={{
        position: 'relative', width: 'min(90vw, calc(85vh * 4 / 3))', maxWidth: '900px',
        aspectRatio: '4 / 3',
        borderRadius: '24px', overflow: 'hidden',
        border: `3px solid ${borderColor}`,
        boxShadow: `0 0 80px ${scene.glowColor || 'rgba(212,81,122,0.4)'}`,
      }}>
        {/* 背景图（主/子场景切换） */}
        <img src={currentImage} alt={scene.name} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'opacity 0.4s' }} />
        <div style={{ position: 'absolute', inset: 0, background: currentOverlay || 'rgba(0,0,0,0.35)' }} />

        {/* 场景名 + 访问次数 */}
        <div style={{
          position: 'absolute', top: '20px', left: '20px', padding: '10px 20px',
          background: 'linear-gradient(135deg, rgba(0,0,0,0.85), rgba(20,8,15,0.9))',
          borderRadius: '14px', border: `2px solid ${accentColor}`,
        }}>
          <div style={{ fontSize: '20px', fontWeight: '700', color: accentColor, letterSpacing: '2px' }}>
            {scene.icon} {scene.name}{phase === 'sub' && activeSubScene ? ` · ${activeSubScene.name}` : ''}
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(245,230,236,0.5)', marginTop: '3px' }}>
            第 {visitCount + 1} 次探访
          </div>
        </div>

        {/* 对话进度点 */}
        <div style={{ position: 'absolute', top: '24px', right: '24px', display: 'flex', gap: '6px' }}>
          {dialogues.map((_, i) => (
            <div key={i} style={{
              width: i === step ? '18px' : '8px', height: '8px', borderRadius: '4px',
              background: i <= step ? accentColor : 'rgba(255,255,255,0.2)',
              transition: 'all 0.3s ease',
            }} />
          ))}
        </div>

        {/* 战斗结果 */}
        {showCombatResult && (
          <div style={{
            position: 'absolute', bottom: '80px', left: '50%', transform: 'translateX(-50%)',
            width: '85%', maxWidth: '700px', padding: '22px 28px',
            background: combatOutcome === 'win'
              ? 'linear-gradient(145deg, rgba(10,30,10,0.97), rgba(20,50,20,0.97))'
              : 'linear-gradient(145deg, rgba(30,5,5,0.97), rgba(50,10,10,0.97))',
            borderRadius: '18px',
            border: `2px solid ${combatOutcome === 'win' ? '#34D399' : '#EF4444'}`,
            boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
          }}>
            <div style={{
              fontSize: '22px', fontWeight: '800', marginBottom: '10px',
              color: combatOutcome === 'win' ? '#34D399' : '#EF4444',
            }}>
              {combatOutcome === 'win' ? '⚔️ 战斗胜利！' : '💀 不敌对手，落败而归'}
            </div>
            {choiceResult?.item && combatOutcome === 'win' && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px',
                padding: '10px 14px', borderRadius: '10px',
                background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)',
              }}>
                <span style={{ fontSize: '24px' }}>{choiceResult.item.emoji}</span>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#34D399' }}>获得道具：{choiceResult.item.name}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(245,230,236,0.5)' }}>{choiceResult.item.desc}</div>
                </div>
              </div>
            )}
            <div style={{ fontSize: '15px', lineHeight: '1.9', color: 'rgba(245,230,236,0.92)', letterSpacing: '0.5px' }}>
              「{choiceResult?.text}」
            </div>
          </div>
        )}

        {/* 普通选项结果 */}
        {showResult && (
          <div style={{
            position: 'absolute', bottom: '80px', left: '50%', transform: 'translateX(-50%)',
            width: '85%', maxWidth: '700px', padding: '22px 28px',
            background: 'linear-gradient(145deg, rgba(20,6,15,0.97), rgba(40,15,30,0.97))',
            borderRadius: '18px', border: `2px solid ${accentColor}`,
            boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
          }}>
            {choiceResult.item && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px',
                padding: '10px 14px', borderRadius: '10px',
                background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)',
              }}>
                <span style={{ fontSize: '24px' }}>{choiceResult.item.emoji}</span>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#C9A84C' }}>获得道具：{choiceResult.item.name}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(245,230,236,0.5)' }}>{choiceResult.item.desc}</div>
                </div>
              </div>
            )}
            <div style={{ fontSize: '15px', lineHeight: '1.9', color: 'rgba(245,230,236,0.92)', letterSpacing: '0.5px' }}>
              「{choiceResult.text}」
            </div>
          </div>
        )}

        {/* 普通对话框 */}
        {!showResult && !showChoices && !showCombatResult && (
          <div style={{
            position: 'absolute', bottom: '80px', left: '50%', transform: 'translateX(-50%)',
            width: '85%', maxWidth: '700px', padding: '20px 28px',
            background: 'linear-gradient(145deg, rgba(20,6,15,0.95), rgba(40,15,30,0.95))',
            borderRadius: '18px', border: `2px solid ${borderColor}`,
            boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
          }}>
            <div style={{ fontSize: '16px', lineHeight: '1.8', color: 'rgba(245,230,236,0.92)', letterSpacing: '1px' }}>
              「{dialogues[step]}」
            </div>
          </div>
        )}

        {/* 选项列表 */}
        {showChoices && (
          <div style={{
            position: 'absolute', bottom: '80px', left: '50%', transform: 'translateX(-50%)',
            width: '85%', maxWidth: '700px', padding: '18px 24px',
            background: 'linear-gradient(145deg, rgba(20,6,15,0.97), rgba(40,15,30,0.97))',
            borderRadius: '18px', border: `2px solid ${borderColor}`,
            boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
          }}>
            <div style={{ fontSize: '14px', color: 'rgba(245,230,236,0.6)', marginBottom: '12px', letterSpacing: '1px' }}>
              {choices.prompt}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {choices.options.map((opt, i) => (
                <button key={opt.id} onClick={() => handleChoice(opt)} style={{
                  padding: '11px 18px', textAlign: 'left',
                  background: opt.type === 'combat' ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${opt.type === 'combat' ? 'rgba(239,68,68,0.4)' : accentColor + '55'}`,
                  borderRadius: '10px', color: 'rgba(245,230,236,0.85)', fontSize: '14px',
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', gap: '10px',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = opt.type === 'combat' ? 'rgba(239,68,68,0.18)' : 'rgba(255,255,255,0.08)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = opt.type === 'combat' ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)'; }}
                >
                  <span style={{ fontSize: '16px', opacity: 0.7 }}>{opt.type === 'combat' ? '⚔️' : ['Ⅰ','Ⅱ','Ⅲ','Ⅳ'][i]}</span>
                  {opt.label}
                  {opt.type === 'combat' && (
                    <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'rgba(239,68,68,0.7)' }}>
                      胜率取决于野性·体力·胆识
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 底部按钮 */}
        {(!showChoices || showResult || showCombatResult) && (
          <button onClick={handleNext} style={{
            position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
            padding: '13px 40px',
            background: showCombatResult && combatOutcome === 'lose'
              ? 'linear-gradient(135deg, #7f1d1d, #450a0a)'
              : `linear-gradient(135deg, ${scene.btnColor || '#D4517A'}, ${scene.btnColorDark || '#A03058'})`,
            border: 'none', borderRadius: '14px', color: 'white',
            fontSize: '15px', fontWeight: '700', cursor: 'pointer',
            fontFamily: 'inherit', letterSpacing: '2px',
            boxShadow: `0 4px 20px ${scene.glowColor || 'rgba(212,81,122,0.5)'}`,
            transition: 'transform 0.2s ease',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(-50%) scale(1.05)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateX(-50%) scale(1)'; }}
          >
            {showCombatResult
              ? (combatOutcome === 'win' ? '✦ 凯旋而归' : '结束探险，返回')
              : showResult ? (choiceResult?.item ? '收好道具，继续前行' : '继续前行')
              : isLastDialogue ? '离开此地'
              : '继续 ▶'}
          </button>
        )}
      </div>
    </div>
  );
}

// 桃花岛子场景配置
const PEACH_ISLAND_SCENES = [
  {
    id: 'fullView',
    name: '桃花岛全景',
    image: '桃花岛-全景.jpg',
    probability: 0.2,
    dialogues: {
      first: '初次来到桃花岛，满眼桃花盛开，美不胜收。远处山峦叠嶂，近处溪水潺潺，真是人间仙境！',
      later: '再次踏上桃花岛，熟悉的桃花香扑面而来。这里的美景让人流连忘返。'
    }
  },
  {
    id: 'street',
    name: '桃花岛街道',
    image: '桃花岛-街道.jpg',
    probability: 0.4,
    dialogues: {
      first: '漫步在桃花岛的街道上，两旁是古色古香的店铺，叫卖声此起彼伏，好不热闹！',
      later: '又一次来到桃花岛街道，商贩们热情地打着招呼，仿佛老朋友一般。'
    }
  },
  {
    id: 'character',
    name: '桃花岛人物',
    image: '桃花岛-人物.jpg',
    probability: 0.4,
    dialogues: {
      first: '一位身着古装的侠客从桃花林中走出，目光如炬，气质非凡。他微微点头，似乎在等待着什么。',
      later: '那位神秘的侠客再次出现，嘴角微微上扬，似乎对你的到来并不意外。'
    }
  }
];

// 深林场景配置
const DEEP_FOREST_SCENE = {
  name: '深林',
  icon: '🌲',
  image: deepForestImage,
  overlay: 'rgba(5,15,5,0.4)',
  borderColor: 'rgba(52,211,153,0.6)',
  glowColor: 'rgba(52,211,153,0.3)',
  accentColor: '#34D399',
  btnColor: '#1a7a4a',
  btnColorDark: '#0f5233',
  dialogueSets: [
    { dialogues: [
      '月色如水，深林中树影婆娑，脚下枯叶沙沙作响。你屏住呼吸，感觉有什么东西在黑暗中注视着你。',
      '忽然，一只白色的狐狸从灌木丛中跳出，它嘴里衔着一枚发光的翠玉，停在你面前，歪着头打量你。',
      '狐狸将翠玉轻轻放在你脚边，随后消失在林间。那枚玉石散发着淡淡的绿光，温润异常。',
    ]},
    { dialogues: [
      '清晨的深林弥漫着薄雾，树间光线如丝线般穿落，踩过的苔藓软绵绵的，带着清凉的湿意。',
      '一阵奇异的鸟鸣引你抬头，枝头停着一只通体碧蓝的鸟，它嘴里叼着一根细长的羽毛，像是在邀你追逐。',
      '你跟随那只蓝鸟穿过密林，来到一处山泉边。泉水清澈见底，泉底沉着一枚古朴的铜铃，随水流发出轻响。',
    ]},
    { dialogues: [
      '傍晚时分，林间升起淡淡的炊烟，你循着气味走去，发现一座被藤蔓缠绕的废弃石屋。',
      '推开半掩的门，屋内陈设简朴，桌上摆着一碗未凉的粥，旁边压着一张字条：「有缘人，此物赠你，好生保重。」',
      '字条下压着一只精巧的香囊，绣工细腻，散发着淡淡的草药香。屋主不知去向，你只好收下，带着满心疑惑离去。',
    ]},
    { dialogues: [
      '深夜，你再度踏入深林，月亮被厚云遮住，四周一片漆黑，只有萤火虫零星点缀。',
      '忽然脚下一软，你低头一看，踩到了一只受伤的小鹿。它挣扎着想站起来，眼中满是惊恐。',
      '你蹲下身，轻声安抚，为它简单包扎了伤口。小鹿渐渐平静，临走时用鼻子蹭了蹭你的手，留下了颈间一枚铃铛。',
    ]},
    { dialogues: [
      '雨后的深林空气清新，地面积了一层薄薄的水雾，脚步声被厚实的腐叶吸收，悄无声息。',
      '你在一棵古树下发现了一个被苔藓覆盖的石碑，碑上的文字已难以辨认，只依稀可见「此处埋宝，有缘者得」。',
      '你在石碑旁挖了挖，果然掘出一个陶罐，里面装着几枚古朴的铜钱和一块残缺的玉片，散发着幽幽的光。',
    ]},
  ],
  choiceSets: [
    {
      prompt: '白狐留下了翠玉……你会怎么做？',
      options: [
        { id: 'take', label: '将翠玉收入怀中，感谢白狐的馈赠',
          result: { text: '你小心地捧起翠玉，它微微发热，仿佛有生命一般。林间忽然吹来一阵清风，带着淡淡的花香，白狐远去的方向传来一声轻鸣，像是回应。',
            item: { name: '灵狐翠玉', emoji: '💚', desc: '白狐所赠，蕴含灵气，佩戴可使心神宁静' } } },
        { id: 'leave', label: '将翠玉放回原处，不打扰林间精灵',
          result: { text: '你俯身将翠玉轻轻放回原处，转身离去。四周的萤火虫依旧点点飞舞，那一刻的宁静，让你心中平静许多。' } },
        { id: 'follow', label: '悄悄跟上白狐，想看看它去往何处',
          result: { text: '你轻手轻脚地跟上白狐，穿过几丛荆棘，来到一处隐秘的林间空地。月光下，数只白狐正在起舞，见你靠近，它们倏地消散在月色中，只留下一片寂静。' } },
      ],
    },
    {
      prompt: '铜铃静静躺在泉底……你会如何？',
      options: [
        { id: 'retrieve', label: '卷起衣袖，俯身将铜铃取出',
          result: { text: '铜铃入手，清脆一鸣，泉水随之泛起涟漪，水中竟映出一幅山河图景，令你心旷神怡。',
            item: { name: '山泉铜铃', emoji: '🔔', desc: '山泉底部所得，铃声清越，据说能驱散心中迷惘' } } },
        { id: 'leave_bell', label: '不取铜铃，只掬一捧泉水饮下',
          result: { text: '泉水入喉，清甜甘冽，你只觉浑身轻盈，疲惫一扫而空。蓝鸟在枝头欢叫，振翅而去，只留你独自伫立泉边。' } },
        { id: 'sing', label: '坐在泉边，轻声哼唱一曲',
          result: { text: '你的歌声在林间回荡，那只蓝鸟飞落枝头，侧耳聆听，歌罢振翅消失在林深处，只留下一片回响。' } },
      ],
    },
    {
      prompt: '石屋里的香囊和字条……你如何处置？',
      options: [
        { id: 'take_sachet', label: '收下香囊，在门口留下一枚铜钱作为回礼',
          result: { text: '你将香囊挂在腰间，留下铜钱，转身离去。走出不远，回头望去，石屋的门竟自行关上了，仿佛有人在里面。',
            item: { name: '草药香囊', emoji: '🌿', desc: '深林石屋所赠，草药清香，佩戴可使身心舒畅，医术精进' } } },
        { id: 'wait', label: '在屋外等候，想见见留下字条的人',
          result: { text: '你等了许久，暮色渐深，始终无人出现。林间虫鸣渐起，那个神秘的屋主，终究没有露面。' } },
        { id: 'search', label: '在屋内仔细搜寻，看看有没有更多线索',
          result: { text: '你在屋内翻找一番，除了那碗粥和字条，再无其他。屋主去向成谜，你只好带着满心疑惑离去。' } },
      ],
    },
    {
      prompt: '小鹿临走留下了铃铛……',
      options: [
        { id: 'keep_bell', label: '将铃铛系在腰间，作为这次奇遇的纪念',
          result: { text: '铃铛随你走动叮当作响，林间的动物们似乎对你更加亲近，一路上鸟雀低飞，松鼠跳跃，如同相送。',
            item: { name: '小鹿铃铛', emoji: '🔔', desc: '受伤小鹿所赠，铃声温柔，据说佩戴者与动物更有缘分，亲和大增' } } },
        { id: 'release', label: '把铃铛挂在树枝上，让风来摇响',
          result: { text: '铃声随风飘荡，整片林子仿佛都活了起来。你静静听了许久，直到铃声渐渐被夜风掩去，才独自离开。' } },
        { id: 'follow_deer', label: '远远跟上小鹿，看它去往何处',
          result: { text: '小鹿步伐轻盈，很快消失在灌木深处。你追了许久，只见林间偶有枝叶摇动，终究没能跟上，只好原路返回。' } },
      ],
    },
    {
      prompt: '陶罐里的铜钱和玉片……',
      options: [
        { id: 'take_jade', label: '只取玉片，将铜钱留在原处',
          result: { text: '玉片在手，你感到一阵温热，隐约可见玉片上有细微的纹路，像是一幅微缩的山河图。带着它，你仿佛对这片深林有了更深的感应。',
            item: { name: '残缺玉片', emoji: '🟢', desc: '深林古碑所藏，残缺却灵气充盈，据说是更大玉器的一角' } } },
        { id: 'take_all', label: '将铜钱和玉片一并带走',
          result: { text: '你将陶罐里的东西悉数收入怀中，铜钱叮当作响，玉片温润如初。走出深林时，天边恰好升起一轮明月，如同祝贺。',
            item: { name: '古钱玉片', emoji: '💰', desc: '深林古碑所藏，铜钱与玉片各有灵性，财气与灵气兼得' } } },
        { id: 'rebury', label: '将陶罐原样埋回，不取分毫',
          result: { text: '你将陶罐仔细埋好，拍平泥土。起身时，石碑上的文字依旧模糊，林间一片寂静，你带着一份平静的心情离去。' } },
      ],
    },
  ],
  subScenes: [
    {
      id: 'thief',
      name: '暗中跟踪',
      probability: 0.3,
      image: deepForestNpcImage,
      overlay: 'rgba(0,8,0,0.5)',
      dialogues: [
        '林间忽然静了下来，连虫鸣都消失了。你的脖颈后方升起一阵寒意——有人在跟踪你。',
        '你放慢脚步，余光扫向身后：一道黑影藏在粗壮的树干之后，衣角在月光下若隐若现。',
        '那黑影见你停步，索性从树后走出，拔出一把匕首，压低声音道："把身上值钱的东西都留下，我放你离开。"',
      ],
      choices: {
        prompt: '贼人已亮出匕首，你该如何应对？',
        options: [
          {
            id: 'fight',
            type: 'combat',
            label: '⚔️ 转身迎战，不惧来犯',
            winResult: {
              text: '你深吸一口气，猛然转身！贼人一愣，你已抢先出手，几个回合下来，贼人被你制服，跌坐在地，匕首也飞了出去。他仓皇逃窜，消失在林间。你从他遗落的包袱里发现了一枚被盗的玉扳指。',
              item: { name: '碧玉扳指', emoji: '💍', desc: '贼人遗落之物，碧绿通透，雕工精细，野性之气尽显' },
            },
            loseResult: {
              text: '你奋力抵抗，却终究寡不敌众。贼人趁你一个踉跄，将你推倒在地，夺路而逃。你挣扎着爬起，身上多了几处擦伤，此次探险只能就此作罢……',
            },
          },
          {
            id: 'flee',
            label: '🏃 加速逃跑，甩开追踪',
            result: {
              text: '你拔腿就跑，贼人紧追其后。你左拐右绕穿过灌木丛，终于将贼人甩开。气喘吁吁停下时，四周只剩林间虫鸣，贼人早已消失无踪。',
            },
          },
          {
            id: 'negotiate',
            label: '💬 镇定开口，试图谈判周旋',
            result: {
              text: '你不慌不忙，缓缓开口："你我素不相识，何必刀兵相见？"贼人一愣，你趁机继续说："我身上并无多少财物，不如各走各路。"贼人狐疑地打量你片刻，终于收了匕首，消失在林间。',
            },
          },
        ],
      },
    },
  ],
};

// 呜沙沟场景配置
const WAILING_SAND_SCENE = {
  name: '呜沙沟',
  icon: '🏜️',
  image: wailingSandImage,
  overlay: 'rgba(20,12,5,0.3)',
  borderColor: 'rgba(251,191,36,0.6)',
  glowColor: 'rgba(251,191,36,0.3)',
  accentColor: '#FBBF24',
  btnColor: '#b45309',
  btnColorDark: '#78350f',
  dialogueSets: [
    { dialogues: [
      '黄沙漫天，风声如泣如诉，这便是传说中的呜沙沟。脚下的沙地绵软，每一步都像在陷落。',
      '沙尘中，你隐约看见前方有一位老者盘坐于枯木之上，须发皆白，手持一根细长的鱼竿——沙漠中垂钓，令人称奇。',
      '老者缓缓睁眼，打量你片刻，嘴角微微上扬："年轻人，你来得正好。老夫在此等候已久，有一件东西，要交给有缘人。"',
    ]},
    { dialogues: [
      '呜沙沟的风依然在鸣叫，沙丘连绵起伏，如同凝固的波浪。你在沙地上留下一串脚印，转瞬又被风沙掩埋。',
      '一阵旋风卷起，沙尘散去后，地面上多了一个奇怪的图案——像是被人故意画下的，由一圈石子围成。',
      '图案中央，压着一个小小的铁盒，盒盖上刻着「开者得福」四个字，锈迹斑斑，却锁扣完好。',
    ]},
    { dialogues: [
      '烈日当空，呜沙沟热浪滚滚，你顶着炙热走了许久，忽然远处出现一片绿洲，绿得不真实。',
      '走近一看，果然是真实的绿洲——一汪清泉，几棵枣树，树下卧着一头老骆驼，它懒洋洋地抬起头看你。',
      '骆驼鞍上挂着一个皮囊，皮囊上绣着奇异的花纹，主人却不见踪影，只有骆驼用大眼睛盯着你，好像在等你做什么决定。',
    ]},
    { dialogues: [
      '黄昏，呜沙沟的天空被染成橙红，沙丘的影子拉得很长，像一道道屏障。',
      '你在一处背风的沙丘后发现了一个小营地，灰烬还有余温，旁边插着一根木棍，棍上挂着一件破旧的斗篷。',
      '斗篷的口袋里有一封没有收信人的信，写着："若你看到此信，说明我已离去。这里的一切，留给下一个有缘人。"',
    ]},
    { dialogues: [
      '深夜，呜沙沟的星空令人窒息，繁星密布，银河清晰可见，仿佛伸手就能摘到。',
      '你席地而坐，仰望星空，忽然听见远处传来断断续续的琴声，悠扬而哀愁，像是有人在诉说一段久远的故事。',
      '循声而去，沙丘后有一位蒙面的旅人，他见你到来，停下琴声，沉默片刻后，将手中的琴弦取下一根递给你，随即消失在夜色中。',
    ]},
  ],
  choiceSets: [
    {
      prompt: '老者说有东西要交给有缘人……你如何回应？',
      options: [
        { id: 'bow', label: '恭敬行礼，静待老者赐教',
          result: { text: '老者满意地点头，从袖中取出一本泛黄的册子递给你："此乃沙海行路心法，得此书者，无论身处何处，皆能辨明方向。"',
            item: { name: '沙海行路册', emoji: '📜', desc: '记载沙漠行路心法，读后方向感大增，才学精进' } } },
        { id: 'ask', label: '好奇追问："您在沙漠中钓什么？"',
          result: { text: '老者哈哈大笑："钓的是缘分。"鱼竿忽然一抖，从沙中拉出一根细绳，绳上空空如也。老者意味深长地看着你："缘分这东西，有时候就是这样，看得见，抓不住。"随后闭目不言。' } },
        { id: 'sit', label: '默默在老者旁边坐下，静静陪伴',
          result: { text: '两人就这样在风沙中沉默相对。许久，老者长叹一声："难得有人懂得静。"他缓缓起身，化作一阵风沙消散，只留下一片空旷的沙地。' } },
      ],
    },
    {
      prompt: '铁盒锁扣完好，你会怎么做？',
      options: [
        { id: 'open', label: '用随身的发簪撬开锁扣',
          result: { text: '锁扣弹开，盒内装着一枚镶嵌红玉的戒指，红玉在阳光下熠熠生辉，戒面上刻着一个你不认识的文字，却莫名感到亲切。',
            item: { name: '红玉戒指', emoji: '💍', desc: '沙漠铁盒所藏，红玉温润，刻有古字，据说能增强持有者的胆识与野性' } } },
        { id: 'leave_box', label: '将铁盒原样放回，不去打扰',
          result: { text: '你将铁盒推回原位，压上一块石头，转身离去。风沙很快将铁盒的痕迹掩埋，仿佛从未有人到过这里。' } },
        { id: 'take_box', label: '将整个铁盒带走，回去慢慢研究',
          result: { text: '铁盒沉甸甸的，你揣着它走了很远。夜里在营地打开，里面除了一枚普通的铜环，再无他物。那把锁倒是做工精巧，不知出自何人之手。' } },
      ],
    },
    {
      prompt: '骆驼鞍上挂着皮囊，主人不在……',
      options: [
        { id: 'take_bag', label: '打开皮囊，看看里面装着什么',
          result: { text: '皮囊里装着几块干粮、一瓶香料，以及一个小小的铜镜，镜背刻着「平安」二字。骆驼见你取走，竟点了点头，像是认可。',
            item: { name: '平安铜镜', emoji: '🪞', desc: '沙漠绿洲所得，镜背刻「平安」，据说佩戴者能逢凶化吉，魅力倍增' } } },
        { id: 'wait_owner', label: '在绿洲旁等候，看主人是否回来',
          result: { text: '你在枣树下坐了许久，主人始终未归。骆驼也渐渐闭上眼，沙漠的风轻轻吹过，你终究只能独自离去。' } },
        { id: 'drink_spring', label: '不管皮囊，只在清泉边洗脸喝水',
          result: { text: '泉水冰凉甘甜，你痛饮一番，浑身舒爽。骆驼懒洋洋地看着你，你们就这样在绿洲边各自沉默，片刻后你起身离去。' } },
      ],
    },
    {
      prompt: '营地里有一封信和一件斗篷……',
      options: [
        { id: 'take_cloak', label: '披上斗篷，带走那封信',
          result: { text: '斗篷虽旧，却异常轻暖，风沙吹来，你感到一阵庇护。信的背面写着一首短诗，读来令人心旷神怡，仿佛前人将一生的豁达都藏在了字里行间。',
            item: { name: '旅人斗篷', emoji: '🧥', desc: '沙漠营地所得，轻暖如新，据说能护持旅人抵御风沙，野性与体力皆有增益' } } },
        { id: 'reply', label: '在信的空白处写下几句话，留给下一个有缘人',
          result: { text: '你写下自己的感悟，将信放回原处，压上一块石头。转身离去时，风沙吹来，那块石头轻轻滚动，像是在为你送行。' } },
        { id: 'stay', label: '在营地休息片刻，感受这份宁静',
          result: { text: '你在灰烬旁坐下，闭目养神。沙漠的风轻轻吹过，带来一阵莫名的宁静。休息片刻后，你起身继续赶路，心中多了几分平静。' } },
      ],
    },
    {
      prompt: '蒙面旅人留下了一根琴弦……',
      options: [
        { id: 'play', label: '将琴弦绕在手指上，轻轻拨弹',
          result: { text: '琴弦震动，发出一声幽远的鸣响，在星空下久久回荡。你闭上眼，忽然感到一种从未有过的平静，仿佛整个沙漠都在聆听。',
            item: { name: '旅人琴弦', emoji: '🎵', desc: '沙漠蒙面旅人所赠，弦音幽远，据说弹奏可使心神宁静，乐艺与灵气皆有增益' } } },
        { id: 'follow_sound', label: '循着消失的方向追去，想看看旅人是谁',
          result: { text: '你追出很远，沙丘连绵，旅人的踪迹已无从寻觅。你在沙丘上站了许久，夜风渐凉，最终只能原路返回。' } },
        { id: 'keep_star', label: '不去追，只是仰望星空，将这一刻记在心里',
          result: { text: '你静静地坐在沙丘上，看了很久的星星。天将破晓时，晨风带来一阵沙尘，那根琴弦在指间轻轻颤动，你将它小心收好，起身离去。' } },
      ],
    },
  ],
  subScenes: [
    {
      id: 'sand_danger',
      name: '沙漠危机',
      probability: 0.35,
      image: wailingSandImage,
      overlay: 'rgba(30,15,0,0.55)',
      dialogues: [
        '正当你独自穿行沙丘之间，忽然脚下一陷——你踩入了流沙边缘，身体缓缓下沉，四周沙壁松软，难以借力。',
        '你奋力挣扎，沙子却越陷越深，已到腰间。就在此时，沙丘顶端出现一道黑影，是一个蒙面的沙盗，他冷冷地俯视着你。',
        '"想活命？把身上的值钱东西扔上来，我扔根绳子救你。"他的声音低沉，手中握着一根粗绳，却迟迟不抛出。',
      ],
      choices: {
        prompt: '流沙渐深，沙盗伺机而动，你该怎么办？',
        options: [
          {
            id: 'fight_sand',
            type: 'combat',
            label: '⚔️ 奋力一搏，趁其不备反制',
            winResult: {
              text: '你深吸一口气，猛然借力一跃，抓住沙壁边缘的枯根爬了出来！沙盗大惊，你趁势扑上，将他制服。他落荒而逃，遗下一个沉甸甸的布囊，里面装着一枚刻有图腾的铜牌。',
              item: { name: '图腾铜牌', emoji: '🪬', desc: '沙盗遗落，刻有古老图腾，据说能护佑持有者在危难中化险为夷' },
            },
            loseResult: {
              text: '你精疲力竭，终究没能挣脱流沙。沙盗趁机将你拉出，却也搜走了你身上的财物，冷冷地将你推倒在沙地上。你挣扎着爬起，遍体鳞伤，此次探险只能就此作罢……',
            },
          },
          {
            id: 'negotiate_sand',
            label: '💬 答应条件，先脱险再说',
            result: {
              text: '你将随身的一枚铜钱扔了上去，沙盗嗤之以鼻，却还是抛下绳子。你抓住绳子爬了出来，沙盗早已消失在沙丘后。虽然狼狈，总算保住了性命。',
            },
          },
          {
            id: 'self_rescue',
            label: '🌿 冷静自救，寻找脱身之法',
            result: {
              text: '你强迫自己冷静下来，慢慢将身体横躺，减小陷入面积，一点一点向边缘挪动。沙盗见状，冷笑一声转身离去。你终于爬出流沙，全身沙尘，但毫发无伤。',
            },
          },
        ],
      },
    },
    {
      id: 'npc_encounter',
      name: '沙漠奇遇',
      probability: 0.3,
      image: wailingSandNpcImage,
      overlay: 'rgba(20,10,0,0.35)',
      // 多套对话，随见面次数（visitCount）循环推进，每次情节不同
      dialogueSets: [
        // 第1次：初次相遇，互相帮助
        { dialogues: [
          '黄沙漫漫，你正独自赶路，忽见前方沙丘旁立着一位身着褐色行装的旅人，他见到你，竟主动招手，笑意盈盈。',
          '"哎，终于见到活人了！"他拍手笑道，"我迷路了，你也是过路人吗？一起走一段？"他自我介绍叫沙云，常年行走大漠，对这片沙海了如指掌。',
          '沙云从行囊里掏出一个水囊递给你："大漠行路，水比金贵。你看起来也走了很远，喝一口吧。"两人就这样在沙丘边坐下，谈笑风生。',
        ]},
        // 第2次：再度相遇，熟络起来
        { dialogues: [
          '沙丘之间，一个熟悉的身影正坐在背风处修补行囊，正是上次相遇的大漠行者沙云。他抬头看见你，咧嘴一笑："哟，又是你！大漠真小。"',
          '"上次你走后，我按你说的方向果然找到了水源。"沙云拍了拍行囊，"这次我带够了干粮，你若缺什么，尽管开口。"',
          '两人并肩坐在沙丘上，望着连绵起伏的沙海，沙云感慨道："大漠孤旅，能遇到一个说得上话的人，比什么都珍贵。"',
        ]},
        // 第3次：深入交流，分享各自的故事
        { dialogues: [
          '夕阳西下，沙云正在一处低洼地生火，见你走来，立刻招手："来来来，今晚一起扎营！我猎了只沙鸡，正好够两人吃。"',
          '篝火旁，沙云讲起自己走遍大漠的往事："我十五岁就跟着父亲跑商队，这片沙漠的每一条路我都走过。"他顿了顿，"不过，有些地方，我一个人不敢去。"',
          '"那个地方叫黑风口，每逢月圆就有怪风，据说是大漠深处的秘密……"沙云神秘地压低声音，"若你感兴趣，下次我带你去看看。"',
        ]},
        // 第4次：患难与共，互相信任
        { dialogues: [
          '正当你在沙丘间跋涉，忽听远处传来呼救声，循声而去，竟是沙云的骆驼陷入了沙坑，他一人拉不出来，急得满头大汗。',
          '"你来得正好！"沙云见你赶来，如释重负，"一起用力！"两人合力，终于将骆驼从沙坑里拉了出来，骆驼抖了抖身上的沙，悠然地踱步走开。',
          '沙云拍着你的肩膀，认真地说："你是我在大漠里遇过最靠谱的人。以后若有难处，只管找我，我沙云绝不推辞。"他从怀中取出一枚骨制的护身符，郑重地递给你。',
        ]},
        // 第5次及以后：老友重逢，共话大漠
        { dialogues: [
          '沙云远远看见你，大步走来，哈哈大笑："我就知道你还会来！大漠留人，你已经是这片沙海的一部分了。"',
          '"上次你走后，我去了黑风口。"沙云神色微敛，"那里果然不寻常，我带回了一样东西，一直想着等见到你再说。"他从行囊深处取出一个用布包裹的小物件。',
          '"给你。"沙云将布包递到你手中，"大漠里的东西，要给最懂它的人。你每次来这里，都比上次走得更远、更深——这个，你配得上。"',
        ]},
      ],
      choiceSets: [
        // 第1次：初次相遇的选择
        {
          prompt: '沙云热情地与你攀谈，你如何回应？',
          options: [
            {
              id: 'share_story',
              label: '📖 讲述自己的旅途见闻，与他畅谈',
              result: {
                text: '你将一路见闻娓娓道来，沙云听得津津有味，不时发出惊叹。临别时，他从腕上取下一串琥珀手链递给你："送你个念想，下次大漠相遇，咱们再叙！"他的笑声随风飘远，消失在沙丘之后。',
                item: { name: '琥珀手链', emoji: '🟤', desc: '大漠行者所赠，琥珀温润，据说内藏远古虫珀，亲和力倍增' },
              },
            },
            {
              id: 'ask_route',
              label: '🗺️ 向他请教大漠行路的秘诀',
              result: {
                text: '沙云眼睛一亮，从怀中取出一张手绘地图铺开，指着密密麻麻的标注详细讲解。"记住，大漠里看星星定方向，看骆驼脚印找水源。"临别他拍拍你的肩："记住这些，大漠里比什么都管用。"',
              },
            },
            {
              id: 'help_direction',
              label: '🧭 告诉他你知道的出路方向',
              result: {
                text: '你将自己记下的沙丘走向和风向告诉沙云，他认真听完，眼中闪过一丝感激："多谢！大漠里愿意分享路径的人不多。"他从行囊里取出一小块干粮递给你，"路上备着，大漠里饿肚子可不是玩笑。"',
              },
            },
          ],
        },
        // 第2次：熟络后的选择
        {
          prompt: '沙云说有干粮可以分享，你们聊得投机……',
          options: [
            {
              id: 'share_supplies',
              label: '🎒 也拿出自己的干粮一起分享',
              result: {
                text: '两人将各自的干粮摆在一起，虽然简陋，却吃得格外香。沙云感慨："大漠里，能和人一起吃饭，比什么山珍海味都好。"临别时他悄悄在你行囊里塞了一小瓶沙漠特有的香料："带着，能防虫，也能驱寒。"',
                item: { name: '沙漠香料瓶', emoji: '🧴', desc: '大漠行者所赠，香气独特，据说能驱虫防寒，体力与灵气皆有裨益' },
              },
            },
            {
              id: 'ask_black_wind',
              label: '🌪️ 追问黑风口的秘密',
              result: {
                text: '沙云沉吟片刻，压低声音："黑风口的风不是自然风，是大漠深处某种力量的呼吸。我见过一次，风过之后，沙地上出现了奇怪的图案，像是文字，却不是任何我认识的字。"他顿了顿，"你若想去，等我准备好，一起。"',
              },
            },
            {
              id: 'walk_together',
              label: '🚶 提议结伴同行一段路',
              result: {
                text: '沙云爽快地站起来："好！正好我也要往那个方向走。"两人并肩穿行沙丘，沙云边走边讲沿途的故事，时间过得飞快。分别时，他指了指前方："那条路更安全，记住了。"',
              },
            },
          ],
        },
        // 第3次：营地夜话后的选择
        {
          prompt: '沙云提到了黑风口，言语间似有未尽之意……',
          options: [
            {
              id: 'go_with_him',
              label: '🌑 答应下次一起去黑风口探秘',
              result: {
                text: '沙云眼中闪过一丝激动："一言为定！"他从火堆旁捡起一根细木棍，在沙地上画下一幅简略地图，"这是去黑风口的路，你先记着。"夜风吹来，篝火摇曳，两人的影子在沙地上交叠，像是一个无声的约定。',
                item: { name: '沙地手绘图', emoji: '🗺️', desc: '大漠行者亲手所绘，记载黑风口方位，据说持有者方向感大增，才学精进' },
              },
            },
            {
              id: 'listen_more',
              label: '🔥 让他继续讲大漠深处的故事',
              result: {
                text: '沙云的故事一个接一个，从沙漠古城的传说，到迷失旅人的幽灵，再到只在月圆之夜出现的沙漠绿洲。篝火渐渐熄灭，天色将明，两人竟聊了整整一夜。沙云笑道："下次见面，我再给你讲更深处的秘密。"',
              },
            },
            {
              id: 'cook_together',
              label: '🍖 专心帮他烤沙鸡，享受这份宁静',
              result: {
                text: '两人不再多言，专心对付那只沙鸡。沙云的烤法独特，加了几种沙漠香料，香气四溢。吃完后，沙云满足地拍拍肚子："有时候，不说话也挺好。"他留给你一小包香料，"回去试试，保管比城里买的好。"',
                item: { name: '大漠混合香料', emoji: '🌿', desc: '大漠行者秘制，香气独特，据说长期使用能提振精神，灵气与才学皆有增益' },
              },
            },
          ],
        },
        // 第4次：患难与共后的选择
        {
          prompt: '沙云郑重地将护身符递给你，你感受到了这份信任……',
          options: [
            {
              id: 'accept_sincerely',
              label: '🙏 郑重接受，也回赠一件随身之物',
              result: {
                text: '你从身上取出一件随身携带的小物件回赠给沙云，他愣了一下，随即笑开了花："好，这就是朋友的礼数。"他将你的回礼贴身收好，"大漠里，有这样一个朋友，什么险路都不怕了。"',
                item: { name: '大漠护身符', emoji: '🪬', desc: '沙漠行者所赠，骨制护身符，据说能在危难中护佑持有者，胆识与野性皆有增益' },
              },
            },
            {
              id: 'ask_about_him',
              label: '💬 问他为何独自一人行走大漠',
              result: {
                text: '沙云沉默了片刻，望向远处的沙丘："有些路，只能一个人走。"他没有再说下去，但你感觉到，在那沉默之后，藏着一段很长很重的故事。他拍了拍你的肩："但有些路，遇到对的人，就不孤单了。"',
              },
            },
            {
              id: 'promise_help',
              label: '🤝 告诉他，你也会在他需要时出现',
              result: {
                text: '沙云愣了一下，随即笑出了声："好，就这么说定了。"他抬头看了看天色，"大漠里说出口的话，比任何契约都管用。"他将护身符系在你手腕上，"戴着它，我们的约定就一直在。"',
                item: { name: '大漠护身符', emoji: '🪬', desc: '大漠行者亲手系上，骨制护身符，承载着两人的约定，胆识与魅力皆有增益' },
              },
            },
          ],
        },
        // 第5次及以后：老友重逢后的选择
        {
          prompt: '沙云将那个神秘的布包递到你手中……',
          options: [
            {
              id: 'open_carefully',
              label: '🎁 小心打开，看看里面是什么',
              result: {
                text: '布包里是一枚古旧的铜制指南针，表面刻满了细密的沙漠图纹，指针在掌心轻轻转动，稳稳指向北方。沙云说："这是我在黑风口找到的，它从不迷失方向——就像你，每次都能找到这里。"',
                item: { name: '大漠古铜罗盘', emoji: '🧭', desc: '黑风口所得，古铜指南针，刻有沙漠图纹，据说持有者永不迷路，才学与灵气大增' },
              },
            },
            {
              id: 'ask_black_wind_trip',
              label: '🌑 追问他在黑风口的经历',
              result: {
                text: '沙云神色凝重地讲述：黑风口的风在月圆之夜会停下来整整一刻钟，那一刻，沙地上会浮现出古老的文字，像是大漠在诉说什么。"我抄下了几个字，至今不知道是什么意思。"他将布包塞进你手里，"也许你能看懂。"',
                item: { name: '黑风口拓印', emoji: '📜', desc: '大漠行者所赠，记载黑风口神秘文字，据说研读者才学大增，或能窥见大漠的秘密' },
              },
            },
            {
              id: 'sit_together',
              label: '🌅 和他一起坐下，看大漠的日落',
              result: {
                text: '两人并肩坐在沙丘顶上，看着太阳缓缓沉入沙海，天边燃起大片橙红。沙云轻声说："每次看这个，都觉得什么烦恼都没了。"他将布包轻轻放在你膝上，"不用急着打开，好东西，慢慢看。"',
                item: { name: '大漠古铜罗盘', emoji: '🧭', desc: '黑风口所得，古铜指南针，刻有沙漠图纹，据说持有者永不迷路，才学与灵气大增' },
              },
            },
          ],
        },
      ],
    },
  ],
};

// 探险地图热区配置（百分比定位）
const ADVENTURE_HOTSPOTS = [
  { id: 'skyCity',    name: '苍穹城', left: '5%',  top: '8%',  width: '20%', height: '22%' }, // 左上角
  { id: 'deepForest', name: '深林',   left: '52%', top: '20%', width: '22%', height: '22%' }, // 上方
  { id: 'peachIsland',name: '桃花岛', left: '72%', top: '48%', width: '22%', height: '24%' }, // 右方
  { id: 'abyssValley',name: '幽冥谷', left: '38%', top: '70%', width: '22%', height: '22%' }, // 下方
  { id: 'wailingSand',name: '呜沙沟', left: '5%',  top: '55%', width: '20%', height: '22%' }, // 左方
];

const ADVENTURE_LIMIT = 7;

function AdventureMapScene({ character, peachIslandVisits, setPeachIslandVisits, adventureCount, setAdventureCount, sceneVisitCounts, setSceneVisitCounts, onClose }) {
  const [selectedHotspot, setSelectedHotspot] = useState(null);
  const [showSubScene, setShowSubScene] = useState(null);
  const [showDialogue, setShowDialogue] = useState(false);
  const [currentDialogue, setCurrentDialogue] = useState('');
  // 当前打开的富场景（深林/呜沙沟）
  const [activeAdventureScene, setActiveAdventureScene] = useState(null); // { scene, visitCount }
  // 探险结束提示
  const [showAdventureEnd, setShowAdventureEnd] = useState(false);

  // 处理热区点击
  const handleHotspotClick = (hotspot) => {
    // 检查本月探险次数上限
    if (adventureCount >= ADVENTURE_LIMIT) {
      setShowAdventureEnd(true);
      return;
    }

    // 计数 +1
    const newCount = adventureCount + 1;
    setAdventureCount(newCount);

    if (hotspot.id === 'peachIsland') {
      // 桃花岛：概率选择子场景
      const rand = Math.random();
      let cumulative = 0;
      let selectedScene = PEACH_ISLAND_SCENES[0];
      for (const scene of PEACH_ISLAND_SCENES) {
        cumulative += scene.probability;
        if (rand < cumulative) { selectedScene = scene; break; }
      }
      setShowSubScene(selectedScene);
      const visitCount = peachIslandVisits || 0;
      setCurrentDialogue(visitCount === 0 ? selectedScene.dialogues.first : selectedScene.dialogues.later);
      const newVisits = visitCount + 1;
      setPeachIslandVisits(newVisits);
      localStorage.setItem('peachIslandVisits', JSON.stringify(newVisits));
      setShowDialogue(true);
      // 更新场景访问计数
      setSceneVisitCounts(prev => ({ ...prev, peachIsland: (prev.peachIsland || 0) + 1 }));
    } else if (hotspot.id === 'deepForest') {
      const visitCount = sceneVisitCounts.deepForest || 0;
      setActiveAdventureScene({ scene: DEEP_FOREST_SCENE, visitCount });
      setSceneVisitCounts(prev => ({ ...prev, deepForest: visitCount + 1 }));
    } else if (hotspot.id === 'wailingSand') {
      const visitCount = sceneVisitCounts.wailingSand || 0;
      setActiveAdventureScene({ scene: WAILING_SAND_SCENE, visitCount });
      setSceneVisitCounts(prev => ({ ...prev, wailingSand: visitCount + 1 }));
    } else {
      // 其他热区暂时只显示提示（不消耗探险次数，撤回计数）
      setAdventureCount(adventureCount);
      setSelectedHotspot(hotspot);
    }

  };

  // 关闭子场景对话，检查是否达到上限
  const handleCloseDialogue = () => {
    setShowDialogue(false);
    setShowSubScene(null);
    setSelectedHotspot(null);
    if (adventureCount >= ADVENTURE_LIMIT) setShowAdventureEnd(true);
  };

  // 关闭富场景对话，检查是否达到上限
  const handleCloseAdventureScene = () => {
    setActiveAdventureScene(null);
    if (adventureCount >= ADVENTURE_LIMIT) setShowAdventureEnd(true);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(5,2,5,0.95)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1300, backdropFilter: 'blur(10px)',
    }}>
      {/* 地图容器 */}
      <div style={{
        position: 'relative',
        width: '90vw',
        maxWidth: '1200px',
        height: '85vh',
        borderRadius: '24px',
        overflow: 'hidden',
        border: '3px solid rgba(212,81,122,0.6)',
        boxShadow: '0 0 60px rgba(212,81,122,0.3)',
      }}>
        {/* 地图背景图片 */}
        <img
          src={adventureMapImage}
          alt="探险地图"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />

        {/* 热区覆盖层 */}
        {ADVENTURE_HOTSPOTS.map(hotspot => (
          <div
            key={hotspot.id}
            onClick={() => handleHotspotClick(hotspot)}
            style={{
              position: 'absolute',
              left: hotspot.left,
              top: hotspot.top,
              width: hotspot.width,
              height: hotspot.height,
              cursor: 'pointer',
              background: 'transparent',
              borderRadius: '12px',
              transition: 'all 0.3s ease',
              // 悬停效果
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(212,81,122,0.25)';
              e.currentTarget.style.boxShadow = '0 0 30px rgba(212,81,122,0.5)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.boxShadow = 'none';
            }}
            title={hotspot.name}
          >
            {/* 热区名称标签 */}
            <div style={{
              position: 'absolute',
              bottom: '8px',
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '4px 12px',
              background: 'rgba(0,0,0,0.7)',
              borderRadius: '8px',
              color: '#F4A0C0',
              fontSize: '12px',
              fontWeight: '600',
              whiteSpace: 'nowrap',
              opacity: 0.8,
            }}>
              {hotspot.name}
            </div>
          </div>
        ))}

        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(212,81,122,0.9), rgba(160,48,88,0.9))',
            border: '2px solid rgba(255,255,255,0.3)',
            color: 'white',
            fontSize: '24px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            transition: 'transform 0.2s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          ✕
        </button>

        {/* 标题 */}
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          padding: '12px 24px',
          background: 'linear-gradient(135deg, rgba(0,0,0,0.8), rgba(30,10,20,0.9))',
          borderRadius: '16px',
          border: '2px solid rgba(212,81,122,0.5)',
        }}>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#C9A84C', letterSpacing: '3px' }}>
            🗺️ 探险地图
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(245,230,236,0.6)', marginTop: '4px' }}>
            点击地图上的区域开始探险
          </div>
        </div>

        {/* 探险次数计数器 */}
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '8px 20px',
          background: 'linear-gradient(135deg, rgba(0,0,0,0.85), rgba(20,8,15,0.9))',
          borderRadius: '20px',
          border: `2px solid ${adventureCount >= ADVENTURE_LIMIT ? 'rgba(212,81,122,0.8)' : 'rgba(201,168,76,0.5)'}`,
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          {Array.from({ length: ADVENTURE_LIMIT }).map((_, i) => (
            <div key={i} style={{
              width: 10, height: 10, borderRadius: '50%',
              background: i < adventureCount ? '#C9A84C' : 'rgba(255,255,255,0.2)',
              border: i < adventureCount ? '1px solid rgba(255,215,0,0.6)' : '1px solid rgba(255,255,255,0.15)',
              transition: 'all 0.3s ease',
            }} />
          ))}
          <span style={{ fontSize: 11, color: adventureCount >= ADVENTURE_LIMIT ? '#F4A0C0' : 'rgba(245,230,236,0.6)', marginLeft: 4 }}>
            {adventureCount >= ADVENTURE_LIMIT ? '本月探险已满' : `${adventureCount}/${ADVENTURE_LIMIT}`}
          </span>
        </div>
      </div>

      {/* 探险结束提示 */}
      {showAdventureEnd && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1500,
          background: 'rgba(5,2,5,0.92)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(12px)',
        }}>
          <div style={{
            textAlign: 'center',
            padding: '48px 56px',
            borderRadius: 24,
            border: '2px solid rgba(201,168,76,0.6)',
            background: 'linear-gradient(145deg, rgba(18,10,18,0.98), rgba(32,18,30,0.98))',
            boxShadow: '0 0 60px rgba(201,168,76,0.25)',
            maxWidth: 440,
          }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>🌙</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#C9A84C', letterSpacing: 2, marginBottom: 12 }}>
              本月探险已结束
            </div>
            <div style={{ fontSize: 14, color: 'rgba(245,230,236,0.75)', lineHeight: 1.8, marginBottom: 28 }}>
              你已走遍山川，历尽奇遇。<br />
              夜色渐深，是时候回家歇息，<br />
              整理这一月的收获了……
            </div>
            <button
              onClick={() => { setShowAdventureEnd(false); onClose(); }}
              style={{
                padding: '12px 36px',
                borderRadius: 14,
                border: '2px solid rgba(201,168,76,0.7)',
                background: 'linear-gradient(135deg, rgba(201,168,76,0.3), rgba(160,120,40,0.3))',
                color: '#FFD9A0',
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
                letterSpacing: 2,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(201,168,76,0.5), rgba(160,120,40,0.5))'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(201,168,76,0.3), rgba(160,120,40,0.3))'; }}
            >
              回家吧 🏠
            </button>
          </div>
        </div>
      )}

      {/* 子场景对话弹窗 */}
      {showSubScene && showDialogue && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(5,2,5,0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1400,
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{
            position: 'relative',
            width: '90vw',
            maxWidth: '900px',
            height: '80vh',
            borderRadius: '24px',
            overflow: 'hidden',
            border: '3px solid rgba(212,81,122,0.7)',
            boxShadow: '0 0 80px rgba(212,81,122,0.4)',
          }}>
            {/* 子场景背景图 */}
            <img
              src={showSubScene.id === 'fullView' ? peachFullImage : showSubScene.id === 'street' ? peachStreetImage : peachFullImage}
              alt={showSubScene.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />

            {/* 场景名称 */}
            <div style={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              padding: '10px 20px',
              background: 'linear-gradient(135deg, rgba(0,0,0,0.85), rgba(30,10,20,0.9))',
              borderRadius: '14px',
              border: '2px solid rgba(201,168,76,0.6)',
            }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#C9A84C', letterSpacing: '2px' }}>
                {showSubScene.name}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(245,230,236,0.5)', marginTop: '3px' }}>
                第 {peachIslandVisits} 次造访
              </div>
            </div>

            {/* 对话框 */}
            <div style={{
              position: 'absolute',
              bottom: '80px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '85%',
              maxWidth: '700px',
              padding: '20px 28px',
              background: 'linear-gradient(145deg, rgba(20,6,15,0.95), rgba(40,15,30,0.95))',
              borderRadius: '18px',
              border: '2px solid rgba(212,81,122,0.6)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
            }}>
              <div style={{
                fontSize: '16px',
                lineHeight: '1.8',
                color: 'rgba(245,230,236,0.9)',
                letterSpacing: '1px',
              }}>
                「{currentDialogue}」
              </div>
            </div>

            {/* 关闭按钮 */}
            <button
              onClick={handleCloseDialogue}
              style={{
                position: 'absolute',
                bottom: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                padding: '14px 40px',
                background: 'linear-gradient(135deg, #D4517A, #A03058)',
                border: 'none',
                borderRadius: '14px',
                color: 'white',
                fontSize: '16px',
                fontWeight: '700',
                cursor: 'pointer',
                fontFamily: 'inherit',
                letterSpacing: '2px',
                boxShadow: '0 4px 20px rgba(212,81,122,0.5)',
                transition: 'transform 0.2s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(-50%) scale(1.05)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateX(-50%) scale(1)'; }}
            >
              继续探险
            </button>
          </div>
        </div>
      )}

      {/* 深林 / 呜沙沟 富场景对话 */}
      {activeAdventureScene && (
        <AdventureDialogue
          scene={activeAdventureScene.scene}
          visitCount={activeAdventureScene.visitCount}
          character={character}
          onClose={handleCloseAdventureScene}
          onForceClose={() => { setActiveAdventureScene(null); onClose(); }}
        />
      )}

      {/* 其他热区提示（暂未实现详细内容） */}
      {selectedHotspot && selectedHotspot.id !== 'peachIsland' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(5,2,5,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1400,
        }}>
          <div style={{
            background: 'linear-gradient(145deg, rgba(20,6,15,0.98), rgba(40,15,30,0.98))',
            borderRadius: '24px',
            padding: '40px 50px',
            textAlign: 'center',
            border: '2px solid rgba(212,81,122,0.5)',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚧</div>
            <h3 style={{ fontSize: '24px', color: '#C9A84C', marginBottom: '12px' }}>{selectedHotspot.name}</h3>
            <p style={{ fontSize: '14px', color: 'rgba(245,230,236,0.6)', marginBottom: '24px' }}>
              此区域尚未开放，敬请期待...
            </p>
            <button
              onClick={() => setSelectedHotspot(null)}
              style={{
                padding: '12px 30px',
                background: 'linear-gradient(135deg, #D4517A, #A03058)',
                border: 'none',
                borderRadius: '12px',
                color: 'white',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              返回地图
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

