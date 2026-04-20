"""
精确识别场景图片中的人物头部位置，裁剪为NPC头像
策略：先生成带网格的预览图，直观确认人物坐标，再精确裁剪头部
"""
import os

from PIL import Image, ImageDraw

base = '/Users/chenyinuo02/IdeaProjects/wondergame/frontend/public/assets'
out_dir = base + '/npc_avatars'
preview_dir = '/tmp/scene_previews'
os.makedirs(out_dir, exist_ok=True)
os.makedirs(preview_dir, exist_ok=True)

def save_preview_with_grid(src, out_name, marks=None):
    """生成带坐标网格和标注点的预览图，用于确认人物位置"""
    img = Image.open(src).convert('RGB')
    w, h = img.size
    # 缩放为预览尺寸
    scale = min(800/w, 500/h)
    pw, ph = int(w*scale), int(h*scale)
    preview = img.resize((pw, ph), Image.LANCZOS)
    draw = ImageDraw.Draw(preview)
    # 画10%间隔网格
    for x in range(0, 110, 10):
        px = int(pw * x / 100)
        draw.line([(px,0),(px,ph)], fill=(255,255,255,80), width=1)
        draw.text((px+2, 2), f'{x}%', fill=(255,255,0))
    for y in range(0, 110, 10):
        py = int(ph * y / 100)
        draw.line([(0,py),(pw,py)], fill=(255,255,255,80), width=1)
        draw.text((2, py+2), f'{y}%', fill=(255,255,0))
    # 标注指定点
    if marks:
        for label, xp, yp in marks:
            px, py = int(pw*xp/100), int(ph*yp/100)
            draw.ellipse([(px-8,py-8),(px+8,py+8)], outline=(255,50,50), width=3)
            draw.text((px+10, py-10), label, fill=(255,50,50))
    preview.save(f'{preview_dir}/{out_name}')
    print(f'Preview: {out_name} ({w}x{h})')
    return w, h

def crop_head(src, x_pct, y_pct, w_pct, h_pct, out_name):
    """
    按百分比裁剪人物头部区域
    x_pct, y_pct: 头部中心点百分比
    w_pct, h_pct: 头部宽高占图片百分比
    """
    img = Image.open(src).convert('RGB')
    W, H = img.size
    cx = int(W * x_pct / 100)
    cy = int(H * y_pct / 100)
    hw = int(W * w_pct / 100 / 2)
    hh = int(H * h_pct / 100 / 2)
    box = (max(0,cx-hw), max(0,cy-hh), min(W,cx+hw), min(H,cy+hh))
    cropped = img.crop(box)
    # 统一缩放为 120x120
    avatar = cropped.resize((120,120), Image.LANCZOS)
    # 圆形蒙版
    from PIL import ImageDraw as ID
    mask = Image.new('L', (120,120), 0)
    d = ID.Draw(mask)
    d.ellipse((3,3,116,116), fill=255)
    result = Image.new('RGBA', (120,120), (0,0,0,0))
    result.paste(avatar.convert('RGBA'), mask=mask)
    result.save(f'{out_dir}/{out_name}', format='PNG')
    print(f'Avatar: {out_name} | src box: {box} | from {W}x{H}')

# ============================================================
# 客栈 (inn_new.jpg 1379x752)
# 根据图片分析：
#   - 掌柜(王掌柜): 右侧柜台后，约 x=57%, y=35% （上半身可见）
#   - 戴斗笠侠客(项燕): 左侧坐着，约 x=19%, y=43% （头戴斗笠）
#   - 右侧食客(陈大娘): 右下角桌边，约 x=83%, y=55%
# ============================================================
INN = base + '/scenes/inn_new.jpg'
crop_head(INN,  57, 32, 12, 18,  'inn_keeper.png')      # 掌柜：站立在柜台后，头部偏右上
crop_head(INN,  19, 38, 11, 17,  'inn_swordsman.png')   # 侠客：斗笠头，坐姿，头偏左
crop_head(INN,  83, 52, 10, 16,  'inn_guest.png')       # 食客：右侧桌旁

# ============================================================
# 街道 (street_new.jpg 1376x768)
# 根据图片分析（街道场景，行人聚集）:
#   - 摊贩(刘大叔): 左前方，约 x=17%, y=48%
#   - 碧瑶: 中间女子，约 x=48%, y=42%
#   - 书生(陈文远): 右侧，约 x=76%, y=44%
# ============================================================
STREET = base + '/scenes/street_new.jpg'
crop_head(STREET, 17, 42, 11, 16, 'street_vendor.png')
crop_head(STREET, 48, 36, 11, 16, 'street_girl.png')
crop_head(STREET, 76, 40, 11, 16, 'street_scholar.png')

# ============================================================
# 宫廷 (royal_court.jpg 1408x768)
# 根据图片分析（宫殿内，多人）:
#   - 文官(礼部侍郎): 左侧站立，约 x=22%, y=38%
#   - 皇后: 中央主位，约 x=52%, y=30%
#   - 郡主(芳华): 右侧，约 x=76%, y=40%
# ============================================================
ROYAL = base + '/scenes/royal_court.jpg'
crop_head(ROYAL, 22, 32, 11, 16, 'royal_official.png')
crop_head(ROYAL, 52, 26, 12, 18, 'royal_emperor.png')
crop_head(ROYAL, 76, 34, 11, 16, 'royal_lady.png')

# ============================================================
# 草原/户外 (outdoor.jpg 1408x768)
# 根据图片分析：
#   - 牧民(阿木格): 左侧，约 x=28%, y=48%
#   - 道人(墨云): 右侧，约 x=65%, y=42%
# ============================================================
OUTDOOR = base + '/scenes/outdoor.jpg'
crop_head(OUTDOOR, 28, 40, 11, 16, 'grass_herder.png')
crop_head(OUTDOOR, 65, 36, 11, 16, 'grass_traveler.png')

# ============================================================
# 礼仪课堂 (classroom.jpg 1408x768)
# 根据图片分析：
#   - 夫子(严夫子): 左前方站立，约 x=25%, y=32%
#   - 学生(玉珠): 右侧坐姿，约 x=62%, y=36%
# ============================================================
CLASSROOM = base + '/scenes/classroom.jpg'
crop_head(CLASSROOM, 25, 27, 11, 16, 'class_teacher.png')
crop_head(CLASSROOM, 62, 32, 11, 16, 'class_student.png')

# ============================================================
# 药铺 (medicine_hall_new.jpg 1408x768)
# 根据图片分析：
#   - 老大夫(白老大夫): 中左，坐诊，约 x=32%, y=34%
#   - 药童(小福): 右侧站立，约 x=65%, y=38%
# ============================================================
MEDICINE = base + '/scenes/medicine_hall_new.jpg'
crop_head(MEDICINE, 32, 28, 11, 16, 'med_doctor.png')
crop_head(MEDICINE, 65, 34, 11, 16, 'med_patient.png')

# ============================================================
# 书画院 (art_studio_new.jpg 1408x768)
# 根据图片分析：
#   - 画师(林画师): 左侧，约 x=30%, y=34%
#   - 学生(砚秋): 右侧，约 x=66%, y=32%
# ============================================================
ART = base + '/scenes/art_studio_new.jpg'
crop_head(ART, 30, 28, 11, 16, 'art_master.png')
crop_head(ART, 66, 28, 11, 16, 'art_student.png')

# ============================================================
# 闺房 (bedroom_new.jpg 1408x768)
# 根据图片分析：
#   - 丫鬟(春杏): 左侧，约 x=20%, y=38%
# ============================================================
BEDROOM = base + '/scenes/bedroom_new.jpg'
crop_head(BEDROOM, 20, 32, 11, 16, 'bedroom_maid.png')

print('\n=== 所有头像裁剪完成 ===')
print(f'输出目录: {out_dir}')

# 同时生成带标注的预览图，方便检查位置
save_preview_with_grid(INN, 'inn_preview.jpg', [
    ('掌柜',57,32), ('侠客',19,38), ('食客',83,52)
])
save_preview_with_grid(STREET, 'street_preview.jpg', [
    ('摊贩',17,42), ('碧瑶',48,36), ('书生',76,40)
])
save_preview_with_grid(ROYAL, 'royal_preview.jpg', [
    ('文官',22,32), ('皇后',52,26), ('郡主',76,34)
])
save_preview_with_grid(OUTDOOR, 'outdoor_preview.jpg', [
    ('牧民',28,40), ('道人',65,36)
])
save_preview_with_grid(CLASSROOM, 'classroom_preview.jpg', [
    ('夫子',25,27), ('学生',62,32)
])
save_preview_with_grid(MEDICINE, 'medicine_preview.jpg', [
    ('大夫',32,28), ('药童',65,34)
])
save_preview_with_grid(ART, 'art_preview.jpg', [
    ('画师',30,28), ('学生',66,28)
])
save_preview_with_grid(BEDROOM, 'bedroom_preview.jpg', [
    ('丫鬟',20,32)
])
print('预览图已生成到 /tmp/scene_previews/')

