"""
把每张场景图切成 6列x4行 的小图块，每块标注坐标
这样可以直观看到每个区域里有什么
"""
import os

from PIL import Image, ImageDraw

out_dir = '/tmp/tiles'
os.makedirs(out_dir, exist_ok=True)

def make_tiles(src, scene_name, cols=6, rows=4):
    img = Image.open(src).convert('RGB')
    W, H = img.size
    tw, th = W // cols, H // rows
    # 拼接成大预览图
    pad = 4
    cell_w = min(280, tw) + pad
    cell_h = min(180, th) + pad + 20
    big = Image.new('RGB', (cols * cell_w, rows * cell_h), (20,10,15))
    draw_big = ImageDraw.Draw(big)
    for r in range(rows):
        for c in range(cols):
            x1, y1 = c * tw, r * th
            x2, y2 = min(W, (c+1)*tw), min(H, (r+1)*th)
            tile = img.crop((x1, y1, x2, y2))
            # 缩放到cell大小
            scale = min((cell_w-pad)/tile.width, (cell_h-pad-20)/tile.height)
            sw, sh = int(tile.width*scale), int(tile.height*scale)
            tile_s = tile.resize((sw, sh), Image.LANCZOS)
            px = c * cell_w + pad//2
            py = r * cell_h + pad//2 + 20
            big.paste(tile_s, (px, py))
            # 标注坐标
            cx_pct = (x1 + x2) / 2 / W * 100
            cy_pct = (y1 + y2) / 2 / H * 100
            draw_big.rectangle([px-1, py-21, px+cell_w-pad+1, py+sh+1], outline=(80,80,80))
            draw_big.text((px+2, py-18), f'({cx_pct:.0f}%,{cy_pct:.0f}%)', fill=(255,230,100))
    big.save(f'{out_dir}/{scene_name}_tiles.jpg', quality=85)
    print(f'Tiles: {scene_name}_tiles.jpg  (img={W}x{H}, tile={tw}x{th})')

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
for name, path in scenes:
    make_tiles(path, name, cols=6, rows=4)
print('Done. Open /tmp/tiles/')

