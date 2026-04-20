"""
通过肤色检测 + 热力图方式，找出场景图中人物头部的真实位置
古风插画的肤色特征：R较高、G中等、B较低，且 R > G > B
"""
import os

import numpy as np
from PIL import Image, ImageDraw

out_dir = '/tmp/face_detect'
os.makedirs(out_dir, exist_ok=True)

def find_skin_regions(src, out_name):
    """检测肤色区域并标注热力图"""
    img = Image.open(src).convert('RGB')
    W, H = img.size
    arr = np.array(img, dtype=np.float32)
    R, G, B = arr[:,:,0], arr[:,:,1], arr[:,:,2]

    # 古风插画肤色：R高、G中、B低；
    # 条件：R>150, G>100, B>60, R>G>B, R-B>40
    skin_mask = (
        (R > 140) & (G > 90) & (B > 50) &
        (R > G) & (G > B) &
        (R - B > 35) &
        (R < 255) & (G < 230) &
        # 排除纯白/过曝
        ((R + G + B) < 700)
    ).astype(np.float32)

    # 高斯模糊聚合相邻区域
    from PIL import ImageFilter
    mask_img = Image.fromarray((skin_mask * 255).astype(np.uint8), 'L')
    blur = mask_img.filter(ImageFilter.GaussianBlur(radius=20))
    blur_arr = np.array(blur, dtype=np.float32)

    # 找局部极大值（人物头部候选点）
    # 分成16x9的块，找每块最大值位置
    block_cols, block_rows = 32, 18
    bw = W / block_cols
    bh = H / block_rows
    candidates = []
    for r in range(block_rows):
        for c in range(block_cols):
            x1, y1 = int(c*bw), int(r*bh)
            x2, y2 = int((c+1)*bw), int((r+1)*bh)
            region = blur_arr[y1:y2, x1:x2]
            if region.size == 0: continue
            val = region.max()
            if val > 30:  # 阈值
                # 找局部最大值位置
                idx = region.argmax()
                ly, lx = divmod(idx, region.shape[1])
                cx_pct = (x1 + lx + 0.5*bw/block_cols) / W * 100
                cy_pct = (y1 + ly + 0.5*bh/block_rows) / H * 100
                candidates.append((val, cx_pct, cy_pct))

    # 按强度排序，取前8个
    candidates.sort(reverse=True)
    top = candidates[:8]

    # 生成标注图
    scale = min(1200/W, 700/H)
    pw, ph = int(W*scale), int(H*scale)
    vis = img.resize((pw, ph), Image.LANCZOS)
    # 叠加肤色热力图（半透明红色）
    heat = blur.resize((pw, ph), Image.LANCZOS).convert('RGB')
    heat_colored = Image.new('RGB', (pw, ph), (0,0,0))
    heat_arr = np.array(heat)[:,:,0]
    heat_rgba = np.zeros((ph, pw, 4), dtype=np.uint8)
    heat_rgba[:,:,0] = 255
    heat_rgba[:,:,3] = (heat_arr * 0.6).astype(np.uint8)
    heat_layer = Image.fromarray(heat_rgba, 'RGBA')
    vis_rgba = vis.convert('RGBA')
    vis_rgba.paste(heat_layer, mask=heat_layer.split()[3])
    vis = vis_rgba.convert('RGB')

    draw = ImageDraw.Draw(vis)
    # 画网格
    for x in range(0, 101, 10):
        px = int(pw * x / 100)
        draw.line([(px,0),(px,ph)], fill=(200,200,200), width=1)
        draw.text((px+2, 2), f'{x}%', fill=(200,200,200))
    for y in range(0, 101, 10):
        py = int(ph * y / 100)
        draw.line([(0,py),(pw,py)], fill=(200,200,200), width=1)
        draw.text((2, py+2), f'{y}%', fill=(200,200,200))

    # 标注候选头部位置
    for i, (val, cx, cy) in enumerate(top):
        px, py = int(pw * cx / 100), int(ph * cy / 100)
        r = 18
        draw.ellipse([(px-r, py-r),(px+r, py+r)], outline=(0,255,0), width=3)
        draw.text((px+r+3, py-8), f'#{i+1} ({cx:.0f}%,{cy:.0f}%)', fill=(0,255,0))

    vis.save(f'{out_dir}/{out_name}')
    print(f'\n{out_name}  ({W}x{H}):')
    for i, (val, cx, cy) in enumerate(top[:6]):
        print(f'  #{i+1}: x={cx:.1f}% y={cy:.1f}%  strength={val:.0f}')
    return top

scenes = [
    ('inn',      '/Users/chenyinuo02/IdeaProjects/wondergame/frontend/public/assets/scenes/inn_new.jpg'),
    ('street',   '/Users/chenyinuo02/IdeaProjects/wondergame/frontend/public/assets/scenes/street_new.jpg'),
    ('royal',    '/Users/chenyinuo02/IdeaProjects/wondergame/frontend/public/assets/scenes/royal_court.jpg'),
    ('outdoor',  '/Users/chenyinuo02/IdeaProjects/wondergame/frontend/public/assets/scenes/outdoor.jpg'),
    ('class',    '/Users/chenyinuo02/IdeaProjects/wondergame/frontend/public/assets/scenes/classroom.jpg'),
    ('medicine', '/Users/chenyinuo02/IdeaProjects/wondergame/frontend/public/assets/scenes/medicine_hall_new.jpg'),
    ('art',      '/Users/chenyinuo02/IdeaProjects/wondergame/frontend/public/assets/scenes/art_studio_new.jpg'),
    ('bedroom',  '/Users/chenyinuo02/IdeaProjects/wondergame/frontend/public/assets/scenes/bedroom_new.jpg'),
]

all_results = {}
for name, path in scenes:
    top = find_skin_regions(path, f'detect_{name}.jpg')
    all_results[name] = top

