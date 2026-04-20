"""
资源裁剪脚本
从用户提供的3张原始图中裁剪出：
  - 8套完整人物搭配图（从 img_1.png 底部）
  - 11个场景背景图（从 img_2.png）
"""
from PIL import Image
import os

BASE = '/Users/chenyinuo02/IdeaProjects/wondergame'
SRC = f'{BASE}/frontend/src/components'
ASSETS = f'{BASE}/frontend/public/assets'

os.makedirs(f'{ASSETS}/outfits', exist_ok=True)
os.makedirs(f'{ASSETS}/scenes', exist_ok=True)

# ============================================================
# img_1.png = 1408×768
# 下半部分是8套全身搭配（y从约390开始到768）
# 8个人物均匀分布在宽度上
# ============================================================
img1 = Image.open(f'{SRC}/img_1.png')
W1, H1 = img1.size  # 1408, 768
print(f'img_1.png: {W1}x{H1}')

# 8套人物从左到右均匀排列
# 从底部那行（y ~ 380到768）
# 根据图片估算：每格宽约 W/8 = 176px
# y: 从370到768（只取人物区域）

outfit_y_start = 370
outfit_y_end   = H1  # 768

col_w = W1 // 8  # 176

outfits = [
    # (id, name, col_index)
    ('spring_light',   '春日轻纱裙',  0),
    ('summer_lotus',   '夏荷碧裳',    1),
    ('autumn_maple',   '秋枫锦袍',    2),  # 实际是「秋枫锦袍」对应第3列
    ('winter_plum',    '冬梅白衣',    3),
    ('court_phoenix',  '凤凰宫装',    4),
    ('feather_wave',   '飞燕凌波衣',  5),
    ('purple_sandalwood', '紫檀悠然裙', 6),
    ('green_ridge',    '碧岭远行装',  7),
    # 注意img_1.png只有8列，最后一套「玄月揽星裳」在第9张
]

# 从img_1.png裁剪8套
for outfit_id, name, col in outfits:
    x1 = col * col_w
    x2 = (col + 1) * col_w
    y1 = outfit_y_start
    y2 = outfit_y_end
    crop = img1.crop((x1, y1, x2, y2))
    out_path = f'{ASSETS}/outfits/{outfit_id}.png'
    crop.save(out_path)
    print(f'  ✅ {outfit_id}.png ({name}): ({x1},{y1})-({x2},{y2}) -> {crop.size}')

# img.png中还有「玄月揽星裳」（第8套，最右侧）
img0 = Image.open(f'{SRC}/img.png')
W0, H0 = img0.size
print(f'\nimg.png: {W0}x{H0}')

# img.png 右侧有4套无底图服装 + 4套有人物的独立搭配
# 右半部分（x从704开始）有4个全身人物：飞燕凌波衣、紫檀悠然裙、碧岭远行装、玄月揽星裳
# y从0到768，4列均匀在 704~1408 范围内
right_x_start = 704
right_col_w = (W0 - right_x_start) // 4  # 约176

right_outfits = [
    ('feather_wave',      '飞燕凌波衣', 0),
    ('purple_sandalwood', '紫檀悠然裙', 1),
    ('green_ridge',       '碧岭远行装', 2),
    ('moon_star',         '玄月揽星裳', 3),
]

for outfit_id, name, col in right_outfits:
    x1 = right_x_start + col * right_col_w
    x2 = right_x_start + (col + 1) * right_col_w
    y1 = 0
    y2 = H0
    crop = img0.crop((x1, y1, x2, y2))
    out_path = f'{ASSETS}/outfits/{outfit_id}.png'
    crop.save(out_path)
    print(f'  ✅ {outfit_id}.png ({name}): ({x1},{y1})-({x2},{y2}) -> {crop.size}')

# ============================================================
# img_1.png 底部行的8套全身搭配（带人物的完整搭配）
# 第0行=配饰行，第1行=无人物服装行，第2行=有人物全身行（最下面）
# ============================================================
# 重新处理 img_1.png 的下半部分（全身搭配那行）
# 图片分析：有两行，上面一行约0~390是服装/配饰，下面是全身搭配
# 实际看图：下方一行有9个人物（含春日），y从约400到768

print('\n=== 从img_1.png 裁剪全身搭配图 ===')
# 全身搭配行（第2行）
row2_y1 = 400
row2_y2 = H1

# 9套全身搭配（从左到右）
outfits_row2 = [
    ('spring_light',   '春日轻纱裙+金凤冠+翡翠手镯',  0),
    ('summer_lotus',   '夏荷碧裳+碧玉簪+南珠耳环',    1),
    ('autumn_maple',   '秋枫锦袍+全套配饰',            2),
    ('winter_plum',    '冬梅白衣+全凤冠',              3),
    ('court_phoenix',  '凤凰宫装+全套配饰',            4),
    ('feather_wave',   '飞燕凌波衣+碧玉簪+翡翠手镯',   5),
    ('purple_sandalwood', '紫檀悠然裙+全套配饰',        6),
    ('green_ridge',    '碧岭远行装+斗笠',               7),
    ('moon_star',      '玄月揽星裳+金凤冠+南珠耳环',    8),
]

# 注意：第9套可能超出8等份，最后一列要单独处理
col_w2 = W1 // 9  # 约156

for outfit_id, desc, col in outfits_row2:
    x1 = col * col_w2
    x2 = min((col + 1) * col_w2, W1)
    crop = img1.crop((x1, row2_y1, x2, row2_y2))
    out_path = f'{ASSETS}/outfits/{outfit_id}.png'
    crop.save(out_path)
    print(f'  ✅ {outfit_id}.png: {desc} ({x1},{row2_y1})-({x2},{row2_y2}) -> {crop.size}')

# ============================================================
# img_2.png = 1408×768 = 场景图
# 3行4列布局（最后一行只有3个）
# 行1（y: 0~256）: 闺房、府衙、街道、客栈
# 行2（y: 256~512）: 酒馆1、酒馆2、跑马场1、草原1
# 行3（y: 512~768）: 跑马场2、草原2、幼学馆、礼仪课堂、药铺（5个，但图宽只有4列？）
# 实际布局需要仔细分析
# ============================================================
img2 = Image.open(f'{SRC}/img_2.png')
W2, H2 = img2.size
print(f'\nimg_2.png: {W2}x{H2}')

# 每行高度约 H/3 = 256
row_h = H2 // 3
col_w3 = W2 // 4  # 352

scenes = [
    # (id, name, row, col)
    ('bedroom',        '闺房',     0, 0),
    ('mansion',        '府衙',     0, 1),
    ('street',         '街道',     0, 2),
    ('inn',            '客栈',     0, 3),
    ('tavern1',        '酒馆1',    1, 0),
    ('tavern2',        '酒馆2',    1, 1),
    ('horse_ranch1',   '跑马场1',  1, 2),
    ('grassland1',     '草原1',    1, 3),
    ('horse_ranch2',   '跑马场2',  2, 0),
    ('grassland2',     '草原2',    2, 1),
    ('kindergarten',   '幼学馆',   2, 2),
    ('etiquette',      '礼仪课堂', 2, 3),
    # 药铺可能是第5列（若行3有5格）- 暂时跳过
]

for scene_id, name, row, col in scenes:
    x1 = col * col_w3
    x2 = min((col + 1) * col_w3, W2)
    y1 = row * row_h
    y2 = min((row + 1) * row_h, H2)
    # 去掉底部文字标签（约40px）
    y2_crop = y2 - 40
    crop = img2.crop((x1, y1, x2, y2_crop))
    out_path = f'{ASSETS}/scenes/{scene_id}.png'
    crop.save(out_path)
    print(f'  ✅ {scene_id}.png ({name}): ({x1},{y1})-({x2},{y2_crop}) -> {crop.size}')

# 药铺可能在第3行第4格之外，单独检查
# 如果行3有5个元素，则最后一个是药铺
# 先保存行3整行看看
row3_full = img2.crop((0, 2*row_h, W2, H2))
row3_full.save(f'{ASSETS}/scenes/row3_debug.png')
print(f'\n  📸 row3_debug.png saved for inspection')

print('\n✅ 裁剪完成！')
print(f'  outfits: {len(os.listdir(ASSETS+"/outfits"))} files')
print(f'  scenes: {len(os.listdir(ASSETS+"/scenes"))} files')

