"""
把场景图切成 20x20 小格子，每格标注坐标，生成大图方便肉眼判断人物位置
"""
from PIL import Image, ImageDraw


def make_grid(src, out_path, cols=20, rows=20):
    img = Image.open(src).convert('RGB')
    W, H = img.size
    # 缩放到方便查看的尺寸
    scale = min(1200/W, 700/H)
    pw, ph = int(W*scale), int(H*scale)
    preview = img.resize((pw, ph), Image.LANCZOS)
    draw = ImageDraw.Draw(preview)
    cw = pw / cols
    ch = ph / rows
    for c in range(cols+1):
        x = int(c * cw)
        draw.line([(x,0),(x,ph)], fill=(255,255,0,120), width=1)
        if c < cols:
            draw.text((x+2, 2), f'{c*100//cols}', fill=(255,255,0))
    for r in range(rows+1):
        y = int(r * ch)
        draw.line([(0,y),(pw,y)], fill=(255,255,0,120), width=1)
        if r < rows:
            draw.text((2, y+2), f'{r*100//rows}', fill=(255,200,0))
    preview.save(out_path)
    print(f'Grid saved: {out_path}  ({W}x{H})')

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
    make_grid(path, f'/tmp/grid_{name}.jpg')

