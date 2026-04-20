import os

from PIL import Image, ImageDraw

base = '/Users/chenyinuo02/IdeaProjects/wondergame/frontend/public/assets'
out_dir = base + '/npc_avatars'
os.makedirs(out_dir, exist_ok=True)

def crop_avatar(src, x_pct, y_pct, radius_pct, out_name):
    """从场景图中按百分比位置裁剪人物头像（正方形），保存为120x120"""
    img = Image.open(src).convert('RGB')
    w, h = img.size
    cx = int(w * x_pct / 100)
    cy = int(h * y_pct / 100)
    half = int(min(w, h) * radius_pct / 100)
    box = (max(0, cx - half), max(0, cy - half), min(w, cx + half), min(h, cy + half))
    cropped = img.crop(box).resize((120, 120), Image.LANCZOS)
    # 做圆形蒙版
    mask = Image.new('L', (120, 120), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((2, 2, 117, 117), fill=255)
    result = Image.new('RGBA', (120, 120), (0, 0, 0, 0))
    cropped_rgba = cropped.convert('RGBA')
    result.paste(cropped_rgba, mask=mask)
    result.save(out_dir + '/' + out_name, format='PNG')
    print(f'OK: {out_name} ({w}x{h} -> crop {box})')

# ===== 客栈 =====
inn = base + '/scenes/inn_new.jpg'
crop_avatar(inn, 58, 32, 7, 'inn_keeper.png')       # 掌柜 - 柜台后方右侧
crop_avatar(inn, 22, 48, 7, 'inn_swordsman.png')    # 戴斗笠侠客 - 左侧食客
crop_avatar(inn, 80, 58, 7, 'inn_guest.png')        # 右侧食客

# ===== 街道 =====
street = base + '/scenes/street_new.jpg'
crop_avatar(street, 18, 42, 7, 'street_vendor.png')   # 左侧摊贩
crop_avatar(street, 50, 38, 7, 'street_girl.png')     # 中间行人女子
crop_avatar(street, 78, 40, 7, 'street_scholar.png')  # 右侧书生

# ===== 宫廷 =====
royal = base + '/scenes/royal_court.jpg'
crop_avatar(royal, 25, 36, 7, 'royal_official.png')  # 左侧文官
crop_avatar(royal, 55, 32, 7, 'royal_emperor.png')   # 中央主座
crop_avatar(royal, 75, 38, 7, 'royal_lady.png')      # 右侧宫女

# ===== 草原/户外 =====
outdoor = base + '/scenes/outdoor.jpg'
crop_avatar(outdoor, 32, 44, 7, 'grass_herder.png')   # 牧民
crop_avatar(outdoor, 68, 40, 7, 'grass_traveler.png') # 旅人

# ===== 礼仪课堂 =====
classroom = base + '/scenes/classroom.jpg'
crop_avatar(classroom, 28, 34, 7, 'class_teacher.png')  # 礼仪先生
crop_avatar(classroom, 60, 38, 7, 'class_student.png')  # 学生

# ===== 药铺 =====
medicine = base + '/scenes/medicine_hall_new.jpg'
crop_avatar(medicine, 35, 36, 7, 'med_doctor.png')   # 老大夫
crop_avatar(medicine, 67, 40, 7, 'med_patient.png')  # 病人/药童

# ===== 书画院 =====
art = base + '/scenes/art_studio_new.jpg'
crop_avatar(art, 33, 38, 7, 'art_master.png')    # 画师
crop_avatar(art, 68, 36, 7, 'art_student.png')   # 学生

# ===== 闺房 =====
bedroom = base + '/scenes/bedroom_new.jpg'
crop_avatar(bedroom, 22, 40, 7, 'bedroom_maid.png')  # 丫鬟

print('All done!')

