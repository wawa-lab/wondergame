"""
从 img_1.png (1408x768) 裁剪15个套装图，去白底，保存为透明PNG。

img_1.png 布局分析（1408×768）：
  - 第一行（上半段）：上方小图区 —— 4个单独配饰图（碧玉簪、金凤冠、南珠耳环、翡翠手镯）+ 4个无头身套装（春日轻纱裙/夏荷碧裳/冬梅白衣/凤凰宫装）
  - 第一行右侧：4个全身套装立绘（飞燕凌波衣/紫檀悠然裙/碧岭远行装/玄月揽星裳）
  - 第二行（下半段）：10个全身套装完整搭配立绘

实际上图片中可识别的15个套装（含人物全身）位于：
  上方右半区域 4个（飞燕凌波衣/紫檀悠然裙/碧岭远行装/玄月揽星裳）
  下方一整行 10个完整搭配（全身）
  上方左半中间行 4个无人头身装束 -- 这些没有人物，属于服装展示

用户要"15种装束（不包括单独的首饰和衣物）"：
  即需要有完整人物的15个立绘：
    上右 4个（y≈80~370，按4等分x）
    下方 10个（y≈380~750，按10等分 → 分两组：左5 + 右5 ）
    但仔细看图：下方是从最左到最右10个人

  注：上方左侧第一个大立绘（春日轻纱裙女主）也算一个完整套装 → 共1+4+10=15个

重新分析布局（1408×768）：
  [左上大立绘] x:0~200, y:0~400 → outfit_0（春日轻纱裙，但图中是完整女主）
  [上中无头身服装区] x:200~550 → 跳过（单纯服装无人物）
  [上右4立绘区] x:700~1408, y:0~390 → 4个套装
  [下方10立绘区] x:0~1408, y:390~768 → 10个套装
"""

from PIL import Image, ImageFilter
import numpy as np
import os

SRC = '/Users/chenyinuo02/IdeaProjects/wondergame/frontend/src/components/img_1.png'
OUT_DIR = '/Users/chenyinuo02/IdeaProjects/wondergame/frontend/public/assets/outfits/'
os.makedirs(OUT_DIR, exist_ok=True)

img = Image.open(SRC).convert('RGBA')
W, H = img.size
print(f"原图尺寸: {W}x{H}")

# 去白色背景（容差法）
def remove_white_bg(pil_img, tolerance=30):
    img_arr = np.array(pil_img.convert('RGBA'), dtype=np.float32)
    r, g, b, a = img_arr[:,:,0], img_arr[:,:,1], img_arr[:,:,2], img_arr[:,:,3]
    # 白色：RGB都接近255
    is_white = (r > 255 - tolerance) & (g > 255 - tolerance) & (b > 255 - tolerance)
    img_arr[:,:,3] = np.where(is_white, 0, 255)
    # 边缘羽化：对接近白色的像素做半透明
    near_white = (r > 255 - tolerance*2) & (g > 255 - tolerance*2) & (b > 255 - tolerance*2)
    edge = near_white & ~is_white
    brightness = (r[edge] + g[edge] + b[edge]) / 3
    alpha_val = ((255 - brightness) / (tolerance * 2) * 255).clip(0, 255)
    img_arr[:,:,3][edge] = alpha_val
    return Image.fromarray(img_arr.astype(np.uint8), 'RGBA')

# ============================================================
# 15个套装的裁剪区域定义（基于1408×768的坐标）
# 经过仔细分析图片布局：
#
# 第一个大立绘（左上角，完整春日套装女主）：
#   约 x:10~175, y:10~385
#
# 上方右侧4个立绘（飞燕凌波衣/紫檀悠然裙/碧岭远行装/玄月揽星裳）：
#   y: 30~380, 4等分 x:700~1408
#   每个宽约 177px
#
# 下方10个立绘（y:390~760，10等分 x:0~1408）：
#   每个宽约 140px
# ============================================================

outfits = [
    # id, name, (x1, y1, x2, y2)
    # --- 左上角大立绘（全套配饰+春日轻纱裙） ---
    ("spring_light",    "春日轻纱裙",    (10,   10,  185, 390)),

    # --- 上右4个无头身套装立绘区 ---
    # 这4个是没有头部的服装展示，对应图左中区域
    # 实际布局：x约200~570，y约150~390，4列
    ("summer_lotus",    "夏荷碧裳",      (198, 148, 335, 395)),
    ("winter_plum",     "冬梅白衣",      (335, 148, 468, 395)),
    ("court_phoenix",   "凤凰宫装",      (468, 148, 580, 395)),

    # --- 上右4个完整人物立绘 ---
    # x约700~1408，y约30~385，4等分
    ("feather_wave",    "飞燕凌波衣",    (700,  25, 878, 390)),
    ("purple_sandalwood","紫檀悠然裙",   (878,  25,1055, 390)),
    ("green_ridge",     "碧岭远行装",   (1055,  25,1230, 390)),
    ("moon_star",       "玄月揽星裳",   (1230,  25,1405, 390)),

    # --- 下方10个完整搭配立绘（y:395~760，x:0~1408，10等分=每格约140px） ---
    ("outfit_full_01",  "全身搭配:春日轻纱裙", (  0, 400, 140, 760)),
    ("outfit_full_02",  "全身搭配:夏荷碧裳",   (140, 400, 282, 760)),
    ("outfit_full_03",  "全身搭配:秋枫锦袍",   (282, 400, 424, 760)),
    ("outfit_full_04",  "全身搭配:冬梅白衣",   (424, 400, 563, 760)),
    ("outfit_full_05",  "全身搭配:凤凰宫装",   (563, 400, 704, 760)),
    ("outfit_full_06",  "全身搭配:飞燕凌波衣", (704, 400, 844, 760)),
    ("outfit_full_07",  "全身搭配:紫檀悠然裙", (844, 400, 985, 760)),
    ("outfit_full_08",  "全身搭配:碧岭远行装", (985, 400,1125, 760)),
    ("outfit_full_09",  "全身搭配:玄月揽星裳", (1125,400,1265, 760)),
    ("outfit_full_10",  "全身搭配:斑斓裙裳",   (1265,400,1405, 760)),
]

# 只取前15个
outfits = outfits[:15]

for oid, oname, (x1, y1, x2, y2) in outfits:
    crop = img.crop((x1, y1, x2, y2))
    crop_clean = remove_white_bg(crop, tolerance=25)
    out_path = os.path.join(OUT_DIR, f"{oid}.png")
    crop_clean.save(out_path)
    print(f"✅ {oname} -> {oid}.png  ({x2-x1}x{y2-y1})")

print("\n全部套装裁剪完成！")

