"""
根据用户指定的格子编号，计算精确坐标并裁剪NPC头像
网格：20列 x 20行 = 400格，编号0~399
格子(c,r) = 编号 r*20+c
"""
import os

from PIL import Image, ImageDraw

COLS, ROWS = 20, 20
base_scenes = '/Users/chenyinuo02/IdeaProjects/wondergame/frontend/public/assets/scenes'
out_avatars = '/Users/chenyinuo02/IdeaProjects/wondergame/frontend/public/assets/npc_avatars'
out_preview = '/tmp/npc_final_preview'
os.makedirs(out_avatars, exist_ok=True)
os.makedirs(out_preview, exist_ok=True)

def grid_to_pct(cell_idx, img_w, img_h):
    """把格子编号转换为格子中心的百分比坐标"""
    c = cell_idx % COLS
    r = cell_idx // COLS
    tile_w = img_w / COLS
    tile_h = img_h / ROWS
    cx = (c + 0.5) * tile_w / img_w * 100
    cy = (r + 0.5) * tile_h / img_h * 100
    return cx, cy

def crop_avatar(img_path, cell_idx, npc_id, head_radius_cells=1.0):
    """
    从图片中裁剪头像
    head_radius_cells: 头部半径占格子宽度的倍数（1.0=一格宽度的半径）
    """
    img = Image.open(img_path).convert('RGB')
    W, H = img.size
    tile_w = W / COLS
    tile_h = H / ROWS

    c = cell_idx % COLS
    r = cell_idx // COLS
    cx_px = (c + 0.5) * tile_w
    cy_px = (r + 0.5) * tile_h

    # 头部半径：取格子尺寸的1倍作为裁剪半径
    radius = min(tile_w, tile_h) * head_radius_cells
    x1 = max(0, int(cx_px - radius))
    y1 = max(0, int(cy_px - radius))
    x2 = min(W, int(cx_px + radius))
    y2 = min(H, int(cy_px + radius))

    cropped = img.crop((x1, y1, x2, y2))
    # 正方形裁剪
    cw, ch = cropped.size
    side = min(cw, ch)
    ox, oy = (cw - side) // 2, (ch - side) // 2
    cropped = cropped.crop((ox, oy, ox + side, oy + side))
    avatar = cropped.resize((160, 160), Image.LANCZOS)

    # 圆形蒙版
    mask = Image.new('L', (160, 160), 0)
    ImageDraw.Draw(mask).ellipse((3, 3, 156, 156), fill=255)
    result = Image.new('RGBA', (160, 160), (0, 0, 0, 0))
    result.paste(avatar.convert('RGBA'), mask=mask)
    result.save(f'{out_avatars}/{npc_id}.png', format='PNG')

    # 预览（正方形，带标注）
    prev = avatar.copy()
    pd = ImageDraw.Draw(prev)
    pd.text((4, 4), f'{npc_id}', fill=(255, 255, 0))
    pd.text((4, 20), f'grid#{cell_idx}({c},{r})', fill=(200, 200, 200))
    # 格子中心位置百分比
    cx_pct, cy_pct = grid_to_pct(cell_idx, W, H)
    pd.text((4, 36), f'pos:{cx_pct:.1f}%,{cy_pct:.1f}%', fill=(150, 255, 150))
    prev.save(f'{out_preview}/{npc_id}.jpg')

    print(f'  {npc_id:<28} grid#{cell_idx:3d}(col={c},row={r})  center=({cx_pct:.1f}%, {cy_pct:.1f}%)')
    return cx_pct, cy_pct


# ============================================================
# 用户指定的人物格子编号
# ============================================================
npcs = [
    # (场景图路径, 格子编号, npc_id, 头部半径倍数)
    # 客栈 inn_new.jpg (1379x752)
    (f'{base_scenes}/inn_new.jpg',       212, 'inn_keeper',        1.1),  # 212-掌柜
    (f'{base_scenes}/inn_new.jpg',       248, 'inn_father_friend',  1.1),  # 248-父亲朋友

    # 街道 street_new.jpg (1376x768)
    (f'{base_scenes}/street_new.jpg',    205, 'street_cloth',      1.0),  # 205-卖绸缎的
    (f'{base_scenes}/street_new.jpg',    238, 'street_candy',      1.0),  # 238-卖糖葫芦的

    # 户外 outdoor.jpg (1408x768)
    (f'{base_scenes}/outdoor.jpg',       251, 'outdoor_son',       1.1),  # 251-父亲朋友的儿子

    # 课堂 classroom.jpg (1408x768)
    (f'{base_scenes}/classroom.jpg',     135, 'class_teacher',     1.1),  # 135-老师
    (f'{base_scenes}/classroom.jpg',     208, 'class_student',     1.0),  # 208-同学

    # 药店 medicine_hall_new.jpg (1408x768)  167+187合并取中心
    (f'{base_scenes}/medicine_hall_new.jpg', 167, 'med_doctor',    1.3),  # 167+187-药师(取167为头)

    # 书画院 art_studio_new.jpg (1408x768)
    (f'{base_scenes}/art_studio_new.jpg', 186, 'art_master',       1.1),  # 186-书画大师
    (f'{base_scenes}/art_studio_new.jpg', 288, 'art_friend',       1.0),  # 288-好朋友
    (f'{base_scenes}/art_studio_new.jpg', 254, 'art_prince',       1.1),  # 254-皇叔
]

print('开始裁剪NPC头像...\n')
positions = {}
for img_path, cell_idx, npc_id, radius in npcs:
    cx, cy = crop_avatar(img_path, cell_idx, npc_id, radius)
    positions[npc_id] = (cx, cy)

print('\n\n✅ 头像已保存到:', out_avatars)
print('📋 预览图保存到:', out_preview)
print('\n=== 坐标汇总（用于 gameData.js）===')
for npc_id, (cx, cy) in positions.items():
    print(f'  {npc_id:<28}  left: {cx:.1f}%,  top: {cy:.1f}%')

