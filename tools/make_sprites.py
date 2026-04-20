"""
换装合成脚本 v7 - Pillow + numpy 高效去背景
思路：
  1. 取边缘像素的中位数颜色作为背景色
  2. 生成「颜色接近背景色」的二值掩码（numpy）
  3. 用 PIL.Image 的多次 MinFilter（等效形态学腐蚀取反）做「从边缘连通」过滤：
     将 maybe_bg 图像从 4 个边向内做 MaxFilter 扩散（迭代填充）
  4. 设透明度 + 边缘羽化
"""
from PIL import Image, ImageFilter
import numpy as np
import os, shutil

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(BASE_DIR, '../frontend/public/assets')


def remove_bg_fast(img_path, out_path, tolerance=40, spread_passes=60):
    """去除棋盘格背景"""
    img = Image.open(img_path).convert('RGBA')
    orig_arr = np.array(img)
    h, w = orig_arr.shape[:2]
    rgb_f = orig_arr[:, :, :3].astype(np.float32)

    # 1. 背景色 = 边缘像素中位数
    border = np.concatenate([
        rgb_f[0, :], rgb_f[-1, :], rgb_f[:, 0], rgb_f[:, -1]
    ], axis=0)
    bg_color = np.median(border, axis=0)

    # 2. 颜色距离掩码
    diff = np.sqrt(np.sum((rgb_f - bg_color) ** 2, axis=2))
    maybe_bg = (diff <= tolerance).astype(np.uint8) * 255  # H×W, 0 or 255

    # 3. 用 PIL MaxFilter（3×3 内取最大值）从边缘扩散
    #    只保留与边缘连通的 maybe_bg 区域
    #    做法：把 maybe_bg 转成灰度图，对四边框做初始化（设边缘外一圈为255），
    #    然后反复 MaxFilter，每次都 AND 回 maybe_bg
    seed_img = Image.fromarray(maybe_bg, mode='L')

    # 在种子图里强制把四边设为255（确保从边缘出发）
    seed_arr = np.array(seed_img)
    seed_arr[0, :]  = 255
    seed_arr[-1, :] = 255
    seed_arr[:, 0]  = 255
    seed_arr[:, -1] = 255
    seed_img = Image.fromarray(seed_arr, mode='L')

    # 反复 MaxFilter+AND：相当于漫水填充
    maybe_bg_img = Image.fromarray(maybe_bg, mode='L')
    current = seed_img
    for _ in range(spread_passes):
        # MaxFilter 3×3：把已标记的背景向周围扩1像素
        expanded = current.filter(ImageFilter.MaxFilter(3))
        # 只保留原本就是 maybe_bg 的区域（防止越过颜色边界）
        expanded_arr = np.array(expanded)
        maybe_arr    = np.array(maybe_bg_img)
        new_arr = np.minimum(expanded_arr, maybe_arr)
        new_img = Image.fromarray(new_arr.astype(np.uint8), mode='L')
        if np.array_equal(new_arr, np.array(current)):
            break
        current = new_img

    bg_mask = np.array(current) > 127

    # 4. 设透明度
    result = orig_arr.copy()
    result[bg_mask, 3] = 0

    # 5. 边缘羽化（MaxFilter扩1像素 AND NOT bg_mask）
    bg_img_255 = Image.fromarray(bg_mask.astype(np.uint8) * 255, mode='L')
    edge_expanded = np.array(bg_img_255.filter(ImageFilter.MaxFilter(3))) > 127
    edge_zone = edge_expanded & ~bg_mask
    result[edge_zone, 3] = (result[edge_zone, 3].astype(np.float32) * 0.3).astype(np.uint8)

    out_img = Image.fromarray(result)
    out_dir = os.path.dirname(out_path)
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)
    out_img.save(out_path, 'PNG')
    bg_pct = bg_mask.sum() / (h * w) * 100
    print(f'  ✅ {os.path.basename(out_path)}: 去除背景 {bg_pct:.1f}%')
    return out_img


def composite_character(base_path, dress_path, out_path,
                         offset=(0.5, 0.62), scale=0.88):
    base  = Image.open(base_path).convert('RGBA')
    dress = Image.open(dress_path).convert('RGBA')
    bw, bh = base.size
    tw = int(bw * scale)
    th = int(tw * dress.height / dress.width)
    dr = dress.resize((tw, th), Image.LANCZOS)
    cx, cy = int(bw * offset[0]), int(bh * offset[1])
    px, py = cx - tw//2, cy - th//2
    comp = base.copy()
    comp.paste(dr, (px, py), dr)
    out_dir = os.path.dirname(out_path)
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)
    comp.save(out_path, 'PNG')
    print(f'  ✅ {os.path.basename(out_path)}: 合成完成')


# ========== 主流程 ==========
print('\n=== Step 1: 人物底图去背景 ===')
base_src = os.path.join(ASSETS, 'character/base.png')
base_t   = os.path.join(ASSETS, 'character/base_transparent.png')
remove_bg_fast(base_src, base_t, tolerance=42, spread_passes=80)

print('\n=== Step 2: 服装去背景 ===')
dresses = ['spring_light', 'summer_lotus', 'autumn_maple', 'winter_plum', 'court_phoenix']
for key in dresses:
    src = os.path.join(ASSETS, f'dresses/{key}.png')
    dst = os.path.join(ASSETS, f'dresses/{key}_transparent.png')
    remove_bg_fast(src, dst, tolerance=38, spread_passes=80)

print('\n=== Step 3: 配饰去背景 ===')
accessories = ['jade_hairpin', 'gold_phoenix_crown', 'pearl_earrings', 'jade_bracelet']
for key in accessories:
    src = os.path.join(ASSETS, f'accessories/{key}.png')
    dst = os.path.join(ASSETS, f'accessories/{key}_transparent.png')
    remove_bg_fast(src, dst, tolerance=45, spread_passes=80)

print('\n=== Step 4: 生成换装合成图 ===')
outfits_dir = os.path.join(ASSETS, 'character/outfits')
os.makedirs(outfits_dir, exist_ok=True)

shutil.copy(base_t, os.path.join(outfits_dir, 'spring_light.png'))
print('  ✅ spring_light.png: 使用透明人物底图')

dress_params = {
    'summer_lotus':  {'offset': (0.52, 0.62), 'scale': 0.90},
    'autumn_maple':  {'offset': (0.52, 0.56), 'scale': 0.96},
    'winter_plum':   {'offset': (0.50, 0.68), 'scale': 1.06},
    'court_phoenix': {'offset': (0.50, 0.62), 'scale': 1.10},
}
for key, p in dress_params.items():
    t_path = os.path.join(ASSETS, f'dresses/{key}_transparent.png')
    o_path = os.path.join(outfits_dir, f'{key}.png')
    composite_character(base_t, t_path, o_path, p['offset'], p['scale'])

print('\n✅ 全部完成！')

