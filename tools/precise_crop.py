"""
根据热力图检测结果 + 人眼观察，精确裁剪各场景人物头像
方法：先截取小区域预览图到/tmp，再由肉眼确认是否命中人物
"""
import os

from PIL import Image, ImageDraw

base = '/Users/chenyinuo02/IdeaProjects/wondergame/frontend/public/assets'
out_dir = base + '/npc_avatars'
preview_dir = '/tmp/npc_crop_preview'
os.makedirs(preview_dir, exist_ok=True)

def crop_and_preview(src, candidates, scene_name):
    """
    对每个候选坐标，生成一个150x150的预览小图
    同时生成最终圆形头像
    candidates: list of (npc_id, x_pct, y_pct, size_pct, label)
    """
    img = Image.open(src).convert('RGB')
    W, H = img.size

    # 生成全图标注预览
    scale = min(900/W, 520/H)
    pw, ph = int(W*scale), int(H*scale)
    overview = img.resize((pw, ph), Image.LANCZOS)
    draw = ImageDraw.Draw(overview)
    # 画格线
    for i in range(0, 101, 5):
        draw.line([(int(pw*i/100),0),(int(pw*i/100),ph)], fill=(255,255,0,60), width=1)
        draw.line([(0,int(ph*i/100)),(pw,int(ph*i/100))], fill=(255,255,0,60), width=1)
    for i in range(0,101,10):
        draw.text((int(pw*i/100)+1, 1), f'{i}', fill=(255,255,0))
        draw.text((1, int(ph*i/100)+1), f'{i}', fill=(255,200,0))

    colors = [(255,50,50),(50,255,50),(50,100,255),(255,150,0),(200,50,200)]
    for idx, (npc_id, xp, yp, size, label) in enumerate(candidates):
        cx, cy = int(pw*xp/100), int(ph*yp/100)
        s = int(pw*size/100/2)
        color = colors[idx % len(colors)]
        draw.rectangle([cx-s, cy-s, cx+s, cy+s], outline=color, width=3)
        draw.text((cx-s, cy-s-16), f'{label}({xp:.0f}%,{yp:.0f}%)', fill=color)

    overview.save(f'{preview_dir}/{scene_name}_overview.jpg')
    print(f'\n=== {scene_name} ({W}x{H}) ===')

    for npc_id, xp, yp, size, label in candidates:
        cx = int(W * xp / 100)
        cy = int(H * yp / 100)
        half = int(min(W,H) * size / 100 / 2)
        # 确保正方形
        box = (
            max(0, cx - half),
            max(0, cy - half),
            min(W, cx + half),
            min(H, cy + half)
        )
        cropped = img.crop(box)
        cw, ch = cropped.size
        side = min(cw, ch)
        if cw != ch:
            ox = (cw-side)//2
            oy = (ch-side)//2
            cropped = cropped.crop((ox, oy, ox+side, oy+side))
        avatar = cropped.resize((160,160), Image.LANCZOS)
        # 圆形蒙版
        mask = Image.new('L', (160,160), 0)
        d2 = ImageDraw.Draw(mask)
        d2.ellipse((3,3,156,156), fill=255)
        result = Image.new('RGBA', (160,160), (0,0,0,0))
        result.paste(avatar.convert('RGBA'), mask=mask)
        # 保存头像
        result.save(f'{out_dir}/{npc_id}.png', format='PNG')
        # 保存小预览（方形，带标签）
        prev = avatar.copy()
        pd = ImageDraw.Draw(prev)
        pd.text((4, 4), f'{label}', fill=(255,255,0))
        pd.text((4, 22), f'{xp:.0f}%,{yp:.0f}%', fill=(200,200,200))
        prev.save(f'{preview_dir}/{npc_id}_crop.jpg')
        print(f'  {npc_id:<25} ({xp:.1f}%,{yp:.1f}%) box={box}')


# ============================================================
# 客栈 inn_new.jpg (1379x752)
# 从客栈1图分析：
# - 掌柜(右侧柜台后)：站在柜台右方，面带笑容，约 x=58%, y=43%
#   头部在画面中央偏右，胸部以上可见
# - 戴斗笠侠客(左侧)：坐在左边桌旁，斗笠遮头，约 x=20%, y=53%
# - 右侧食客：右边桌旁食客，约 x=79%, y=63%
# ============================================================
INN = base + '/scenes/inn_new.jpg'
crop_and_preview(INN, [
    ('inn_keeper',    58, 40, 11, '掌柜'),
    ('inn_swordsman', 20, 52, 11, '侠客'),
    ('inn_guest',     79, 60, 10, '食客'),
], 'inn')

# ============================================================
# 街道 street_new.jpg (1376x768)
# 街道场景，行人众多，选3个典型人物
# 基于热力图，肤色集中在上方区域(y约10-20%)和中部
# ============================================================
STREET = base + '/scenes/street_new.jpg'
crop_and_preview(STREET, [
    ('street_vendor',   17, 50, 10, '摊贩'),
    ('street_girl',     50, 42, 10, '碧瑶'),
    ('street_scholar',  77, 46, 10, '书生'),
], 'street')

# ============================================================
# 宫廷 royal_court.jpg (1408x768)
# 热力图：右侧y=18%有强肤色(71%,18%)，中间偏下
# ============================================================
ROYAL = base + '/scenes/royal_court.jpg'
crop_and_preview(ROYAL, [
    ('royal_official', 22, 42, 10, '文官'),
    ('royal_emperor',  52, 36, 11, '皇后'),
    ('royal_lady',     72, 18, 10, '郡主'),
], 'royal')

# ============================================================
# 草原/户外 outdoor.jpg (1408x768)
# 热力图：x=31%, y=80%有人物(下方)，x=42%, y=68%
# 说明人物在画面中下部
# ============================================================
OUTDOOR = base + '/scenes/outdoor.jpg'
crop_and_preview(OUTDOOR, [
    ('grass_herder',   32, 72, 10, '牧民'),
    ('grass_traveler', 42, 62, 10, '旅人'),
], 'outdoor')

# ============================================================
# 课堂 classroom.jpg (1408x768)
# 热力图：x=79%, y≈99%, x=62%, y≈95% (最底部！人物在画面下方)
# ============================================================
CLASS = base + '/scenes/classroom.jpg'
crop_and_preview(CLASS, [
    ('class_teacher',  28, 52, 11, '夫子'),
    ('class_student',  62, 58, 10, '学生'),
], 'class')

# ============================================================
# 药铺 medicine_hall_new.jpg (1408x768)
# 热力图：x=31%, y≈0%(顶部)，x=98%, y=38%(极右)
# 说明人物在边缘，重新分析
# ============================================================
MEDICINE = base + '/scenes/medicine_hall_new.jpg'
crop_and_preview(MEDICINE, [
    ('med_doctor',   35, 38, 10, '大夫'),
    ('med_patient',  62, 42, 10, '药童'),
], 'medicine')

# ============================================================
# 书画院 art_studio_new.jpg (1408x768)
# 热力图：x=68%, y=89%(底部)，x=57%, y=85%(底部)
# 说明人物主体在画面下方60-90%区域
# ============================================================
ART = base + '/scenes/art_studio_new.jpg'
crop_and_preview(ART, [
    ('art_master',   30, 55, 10, '画师'),
    ('art_student',  68, 50, 10, '学生'),
], 'art')

# ============================================================
# 闺房 bedroom_new.jpg (1408x768)
# 热力图：x=16%, y=63-67%，说明丫鬟在左侧中部
# ============================================================
BEDROOM = base + '/scenes/bedroom_new.jpg'
crop_and_preview(BEDROOM, [
    ('bedroom_maid', 16, 58, 10, '丫鬟'),
], 'bedroom')

print('\n\n✅ 完成！请查看预览:')
print(f'  全图标注: {preview_dir}/*_overview.jpg')
print(f'  头像预览: {preview_dir}/*_crop.jpg')

