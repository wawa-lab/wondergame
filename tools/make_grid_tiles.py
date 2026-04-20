"""
把每张场景图均匀切成 20列x20行 = 400格，每格标号（0~399）
编号从左到右、从上到下
"""
import os

from PIL import Image, ImageDraw

COLS = 20
ROWS = 20
LABEL_H = 13  # 标号区高度(px)

base = '/Users/chenyinuo02/IdeaProjects/wondergame/frontend/public/assets/scenes'
out_dir = '/tmp/grid20'
os.makedirs(out_dir, exist_ok=True)

scenes = [
    ('inn',      f'{base}/inn_new.jpg'),
    ('street',   f'{base}/street_new.jpg'),
    ('royal',    f'{base}/royal_court.jpg'),
    ('outdoor',  f'{base}/outdoor.jpg'),
    ('class',    f'{base}/classroom.jpg'),
    ('medicine', f'{base}/medicine_hall_new.jpg'),
    ('art',      f'{base}/art_studio_new.jpg'),
    ('bedroom',  f'{base}/bedroom_new.jpg'),
]

for scene_name, path in scenes:
    img = Image.open(path).convert('RGB')
    W, H = img.size

    tile_w = W / COLS   # 每格实际宽（浮点）
    tile_h = H / ROWS   # 每格实际高（浮点）

    # 每格在画布上的显示大小
    cell_w = 70
    cell_h = 44

    canvas_w = COLS * cell_w
    canvas_h = ROWS * (cell_h + LABEL_H)
    canvas = Image.new('RGB', (canvas_w, canvas_h), (25, 15, 35))
    draw = ImageDraw.Draw(canvas)

    idx = 0
    for r in range(ROWS):
        for c in range(COLS):
            # 原图裁剪区域（像素）
            x1 = int(c * tile_w)
            y1 = int(r * tile_h)
            x2 = int((c + 1) * tile_w)
            y2 = int((r + 1) * tile_h)
            tile = img.crop((x1, y1, x2, y2))

            # 缩放到 cell_w x cell_h
            tile_s = tile.resize((cell_w, cell_h), Image.LANCZOS)

            px = c * cell_w
            py = r * (cell_h + LABEL_H) + LABEL_H

            canvas.paste(tile_s, (px, py))

            # 标号背景条
            draw.rectangle([px, py - LABEL_H, px + cell_w - 1, py - 1], fill=(18, 8, 28))
            # 标号文字
            draw.text((px + 2, py - LABEL_H + 1), str(idx), fill=(255, 220, 50))
            # 格子边框
            draw.rectangle([px, py, px + cell_w - 1, py + cell_h - 1], outline=(70, 50, 90))

            idx += 1

    out_path = f'{out_dir}/{scene_name}.jpg'
    canvas.save(out_path, quality=93)
    print(f'{scene_name:12s}  {W}x{H}  →  {COLS}列x{ROWS}行=400格  →  {out_path}')

print(f'\n✅ 完成！请查看: {out_dir}/')

