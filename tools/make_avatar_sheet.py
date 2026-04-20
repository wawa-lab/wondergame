"""生成一张汇总图，展示所有裁剪出的NPC头像"""
import os

from PIL import Image, ImageDraw

avatar_dir = '/Users/chenyinuo02/IdeaProjects/wondergame/frontend/public/assets/npc_avatars'
out_path = '/tmp/avatar_sheet.png'

avatars = [
    ('inn_keeper',      '王掌柜\n客栈掌柜'),
    ('inn_swordsman',   '项燕\n江湖侠客'),
    ('inn_guest',       '陈大娘\n市井食客'),
    ('street_vendor',   '刘大叔\n布匹摊贩'),
    ('street_girl',     '碧瑶\n闺中密友'),
    ('street_scholar',  '陈文远\n赶考书生'),
    ('royal_official',  '礼部侍郎\n朝廷命官'),
    ('royal_emperor',   '皇后娘娘\n中宫皇后'),
    ('royal_lady',      '芳华郡主\n皇室郡主'),
    ('grass_herder',    '阿木格\n草原牧民'),
    ('grass_traveler',  '墨云\n云游道人'),
    ('class_teacher',   '严夫子\n礼仪先生'),
    ('class_student',   '玉珠\n同窗学友'),
    ('med_doctor',      '白老大夫\n坐堂大夫'),
    ('med_patient',     '药童小福\n学徒药童'),
    ('art_master',      '林画师\n丹青画师'),
    ('art_student',     '砚秋\n书画院学生'),
    ('bedroom_maid',    '春杏\n贴身丫鬟'),
]

COLS = 6
ROWS = (len(avatars) + COLS - 1) // COLS
CELL = 160
PAD = 20
LABEL_H = 44
W = COLS * (CELL + PAD) + PAD
H = ROWS * (CELL + LABEL_H + PAD) + PAD

sheet = Image.new('RGBA', (W, H), (30, 15, 20, 255))
draw = ImageDraw.Draw(sheet)

for i, (name, label) in enumerate(avatars):
    row = i // COLS
    col = i % COLS
    x = PAD + col * (CELL + PAD)
    y = PAD + row * (CELL + LABEL_H + PAD)
    path = os.path.join(avatar_dir, f'{name}.png')
    if os.path.exists(path):
        av = Image.open(path).convert('RGBA').resize((CELL, CELL), Image.LANCZOS)
        sheet.paste(av, (x, y), av)
    else:
        draw.rectangle([x, y, x+CELL, y+CELL], fill=(80,40,40))
        draw.text((x+10, y+60), 'MISSING', fill=(255,100,100))
    # 标签
    for li, line in enumerate(label.split('\n')):
        draw.text((x + CELL//2, y + CELL + 4 + li*18), line,
                  fill=(255,220,150) if li==0 else (180,150,100), anchor='mt')

sheet.save(out_path)
print(f'✅ 头像汇总图已保存: {out_path}')

