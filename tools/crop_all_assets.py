"""
一次性裁剪所有资源：
1. img_1.png → 15个套装图（透明背景）→ /assets/outfits/
2. img_2.png → 13个场景背景图（无人物）→ /assets/scenes/
3. img_3.png → 13个活动场景图（含人物）→ /assets/scenes_active/

基于 1408×768 尺寸

img_1.png 布局（套装图）：
  上半行（y:0~390）：
    - 左大立绘 x:0~188          → outfit #0（春日轻纱裙默认立绘）
    - 配饰区 x:188~570（跳过）
    - 上右4个人物立绘 x:700~1408 → outfits #1~#4（飞燕/紫檀/碧岭/玄月）
  下方行（y:390~768）：
    - 10个完整搭配立绘，均分1408 → outfits #5~#14

img_2.png / img_3.png 布局（场景图，13个）：
  行1(y:12~240): 4个，每个352px宽   → 闺房/府衙/街道/客栈
  行2(y:252~490): 4个，每个352px宽  → 酒馆(1)/酒馆(2)/跑马场(1)/草原(1)
  行3(y:502~756): 5个，每个281px宽  → 跑马场(2)/草原(2)/幼学馆/礼仪课堂/药铺
"""

from PIL import Image
import numpy as np
import os

BASE = '/Users/chenyinuo02/IdeaProjects/wondergame'
IMG1 = f'{BASE}/frontend/src/components/img_1.png'
IMG2 = f'{BASE}/frontend/src/components/img_2.png'
IMG3 = f'{BASE}/frontend/src/components/img_3.png'
OUTFITS_DIR   = f'{BASE}/frontend/public/assets/outfits/'
SCENES_DIR    = f'{BASE}/frontend/public/assets/scenes/'
ACTIVE_DIR    = f'{BASE}/frontend/public/assets/scenes_active/'

for d in [OUTFITS_DIR, SCENES_DIR, ACTIVE_DIR]:
    os.makedirs(d, exist_ok=True)


# ─────────────────────────────────────────
# 去白色背景工具
# ─────────────────────────────────────────
def remove_white_bg(pil_img, tol=28):
    """将白色及接近白色的像素变为透明"""
    arr = np.array(pil_img.convert('RGBA')).astype(np.float32)
    r, g, b = arr[:,:,0], arr[:,:,1], arr[:,:,2]
    # 纯白判断
    white_mask = (r >= 255 - tol) & (g >= 255 - tol) & (b >= 255 - tol)
    # 接近白色：做渐变透明
    near_mask  = (r >= 255 - tol*3) & (g >= 255 - tol*3) & (b >= 255 - tol*3)
    edge_mask  = near_mask & ~white_mask

    arr[:,:,3] = 255.0
    arr[:,:,3][white_mask] = 0.0

    if edge_mask.any():
        brightness = (r[edge_mask] + g[edge_mask] + b[edge_mask]) / 3.0
        alpha_edge = ((255.0 - brightness) / (tol * 3.0) * 255.0).clip(0, 255)
        arr[:,:,3][edge_mask] = alpha_edge

    return Image.fromarray(arr.astype(np.uint8), 'RGBA')


# ─────────────────────────────────────────
# 1. 裁剪15个套装图（img_1.png）
# ─────────────────────────────────────────
print("=" * 50)
print("【1】裁剪套装图（img_1.png）")
print("=" * 50)

img1 = Image.open(IMG1).convert('RGBA')
W1, H1 = img1.size  # 1408×768

# 下方10个完整搭配，y:392~760，均分1408（每个≈140.8px）
row2_y1, row2_y2 = 392, 762
n_row2 = 10
row2_w = W1 / n_row2  # 140.8

# 上右4个人物立绘，y:30~385，x:700~1408（4等分=177px）
row1_right_y1, row1_right_y2 = 28, 388
row1_right_x1 = 700
row1_right_n  = 4
row1_right_w  = (W1 - row1_right_x1) / row1_right_n  # 177

outfits_def = [
    # (filename_id, display_name, x1, y1, x2, y2)

    # #0：左上角大立绘（春日轻纱裙完整版）
    ("spring_light_full",  "春日轻纱裙",
     8, 8, 190, 388),

    # #1~#4：上右4个人物立绘
    ("feather_wave",   "飞燕凌波衣",
     int(row1_right_x1 + 0 * row1_right_w),
     row1_right_y1,
     int(row1_right_x1 + 1 * row1_right_w),
     row1_right_y2),

    ("purple_sandalwood", "紫檀悠然裙",
     int(row1_right_x1 + 1 * row1_right_w),
     row1_right_y1,
     int(row1_right_x1 + 2 * row1_right_w),
     row1_right_y2),

    ("green_ridge",    "碧岭远行装",
     int(row1_right_x1 + 2 * row1_right_w),
     row1_right_y1,
     int(row1_right_x1 + 3 * row1_right_w),
     row1_right_y2),

    ("moon_star",      "玄月揽星裳",
     int(row1_right_x1 + 3 * row1_right_w),
     row1_right_y1,
     W1 - 2,
     row1_right_y2),

    # #5~#14：下方10个完整搭配立绘（按顺序：春/夏/秋/冬/凤/飞燕/紫檀/碧岭/玄月/斑斓）
    ("spring_light",        "全套:春日轻纱裙",   int(0*row2_w), row2_y1, int(1*row2_w), row2_y2),
    ("summer_lotus",        "全套:夏荷碧裳",     int(1*row2_w), row2_y1, int(2*row2_w), row2_y2),
    ("autumn_maple",        "全套:秋枫锦袍",     int(2*row2_w), row2_y1, int(3*row2_w), row2_y2),
    ("winter_plum",         "全套:冬梅白衣",     int(3*row2_w), row2_y1, int(4*row2_w), row2_y2),
    ("court_phoenix",       "全套:凤凰宫装",     int(4*row2_w), row2_y1, int(5*row2_w), row2_y2),
    ("feather_wave_full",   "全套:飞燕凌波衣",   int(5*row2_w), row2_y1, int(6*row2_w), row2_y2),
    ("purple_sand_full",    "全套:紫檀悠然裙",   int(6*row2_w), row2_y1, int(7*row2_w), row2_y2),
    ("green_ridge_full",    "全套:碧岭远行装",   int(7*row2_w), row2_y1, int(8*row2_w), row2_y2),
    ("moon_star_full",      "全套:玄月揽星裳",   int(8*row2_w), row2_y1, int(9*row2_w), row2_y2),
    ("bolan_full",          "全套:斑斓裙裳",     int(9*row2_w), row2_y1, W1 - 2,        row2_y2),
]

for fid, fname, x1, y1, x2, y2 in outfits_def:
    crop = img1.crop((x1, y1, x2, y2))
    clean = remove_white_bg(crop, tol=28)
    out = os.path.join(OUTFITS_DIR, f"{fid}.png")
    clean.save(out)
    print(f"  ✅ {fname:<22} → {fid}.png  ({x2-x1}×{y2-y1})")


# ─────────────────────────────────────────
# 2&3. 裁剪场景图（img_2 + img_3，相同布局）
# ─────────────────────────────────────────
def crop_scenes(src_path, out_dir, label):
    print(f"\n{'='*50}")
    print(f"【{label}】裁剪场景图（{os.path.basename(src_path)}）")
    print(f"{'='*50}")
    img = Image.open(src_path).convert('RGB')
    W, H = img.size  # 1408×768

    # 行分界（去掉底部文字区域，场景图片内容在标注文字上方）
    # 观察：每行图片下方有约28px文字，实际图片内容区域：
    row1_y1, row1_y2 = 8,   242   # 第1行图片区
    row2_y1, row2_y2 = 258, 492   # 第2行图片区
    row3_y1, row3_y2 = 508, 760   # 第3行图片区

    col4 = W // 4   # 352 per col
    col5 = W // 5   # 281 per col

    scenes_def = [
        # row1: 4列
        ("bedroom",       "闺房",     0*col4, row1_y1, 1*col4, row1_y2),
        ("mansion",       "府衙",     1*col4, row1_y1, 2*col4, row1_y2),
        ("street",        "街道",     2*col4, row1_y1, 3*col4, row1_y2),
        ("inn",           "客栈",     3*col4, row1_y1, W,      row1_y2),
        # row2: 4列
        ("tavern1",       "酒馆",     0*col4, row2_y1, 1*col4, row2_y2),
        ("tavern2",       "酒馆2",    1*col4, row2_y1, 2*col4, row2_y2),
        ("horse_ranch1",  "跑马场",   2*col4, row2_y1, 3*col4, row2_y2),
        ("grassland1",    "草原",     3*col4, row2_y1, W,      row2_y2),
        # row3: 5列
        ("horse_ranch2",  "跑马场2",  0*col5, row3_y1, 1*col5, row3_y2),
        ("grassland2",    "草原2",    1*col5, row3_y1, 2*col5, row3_y2),
        ("kindergarten",  "幼学馆",   2*col5, row3_y1, 3*col5, row3_y2),
        ("etiquette",     "礼仪课堂", 3*col5, row3_y1, 4*col5, row3_y2),
        ("medicine_hall", "药铺",     4*col5, row3_y1, W,      row3_y2),
    ]

    for sid, sname, x1, y1, x2, y2 in scenes_def:
        crop = img.crop((x1, y1, x2, y2))
        out = os.path.join(out_dir, f"{sid}.png")
        crop.save(out)
        print(f"  ✅ {sname:<10} → {sid}.png  ({x2-x1}×{y2-y1})")

crop_scenes(IMG2, SCENES_DIR,  "2")
crop_scenes(IMG3, ACTIVE_DIR,  "3")

# ─────────────────────────────────────────
# 清理临时工具文件
# ─────────────────────────────────────────
print("\n🎉 全部裁剪完成！")
print(f"  套装图: {OUTFITS_DIR}")
print(f"  场景图: {SCENES_DIR}")
print(f"  活动场景图: {ACTIVE_DIR}")

