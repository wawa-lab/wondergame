"""把每张场景图切成 8列x6行 的细粒度小图块"""
import os

from PIL import Image, ImageDraw

out_dir = '/tmp/tiles2'
os.makedirs(out_dir, exist_ok=True)

def make_tiles(src, scene_name, cols=8, rows=6):
    img = Image.open(src).convert('RGB')
    W, H = img.size
    tw, th = W // cols, H // rows
    pad = 2
    cell_w = 180 + pad
    cell_h = 110 + pad + 16
    big = Image.new('RGB', (cols * cell_w, rows * cell_h), (10,10,20))
    draw_big = ImageDraw.Draw(big)
    for r in range(rows):
        for c in range(cols):
            x1, y1 = c * tw, r * th
            x2, y2 = min(W, (c+1)*tw), min(H, (r+1)*th)
            tile = img.crop((x1, y1, x2, y2))
            scale = min(178/tile.width, 108/tile.height)
            sw, sh = int(tile.width*scale), int(tile.height*scale)
            tile_s = tile.resize((sw, sh), Image.LANCZOS)
            px = c * cell_w + 1
            py = r * cell_h + 1 + 16
            big.paste(tile_s, (px, py))
            cx_pct = (x1 + x2) / 2 / W * 100
            cy_pct = (y1 + y2) / 2 / H * 100
            draw_big.rectangle([px-1, py-17, px+sw+1, py+sh+1], outline=(60,60,80))
            draw_big.text((px+1, py-15), f'({cx_pct:.0f}%,{cy_pct:.0f}%)', fill=(255,220,80))
    big.save(f'{out_dir}/{scene_name}_tiles.jpg', quality=88)
    print(f'OK {scene_name}')

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
    make_tiles(path, name)
print(f'\nDone → {out_dir}')

