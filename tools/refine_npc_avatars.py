"""
根据人眼观察各场景图片，精确修正人物头像裁剪坐标
客栈1.jpg (1379x752) 人物分析：
  - 掌柜：右侧柜台后，笑脸，x≈57%, y≈38%（头部在上半部偏右）
  - 戴斗笠侠客：左前方，x≈20%, y≈46%（斗笠很明显，头偏高）
  - 右侧食客（陈大娘）：最右侧桌旁，x≈83%, y≈55%
  - 注意：紫衣女子是主角，不裁剪

街道.jpg (1376x768) 人物分析：
  - 街道行人众多，选取清晰可见的3人

皇宫.jpg (1408x768) 人物分析：
  - 宫廷场景，多人排列

药房.jpg (1408x768)
课堂.jpg (1408x768)
书画院.jpg (1408x768)
闺房.jpg (1408x768)
"""
from PIL import Image, ImageDraw

base = '/Users/chenyinuo02/IdeaProjects/wondergame/frontend/public/assets'
out_dir = base + '/npc_avatars'

def crop_head(src, x_pct, y_pct, box_w_pct, box_h_pct, out_name):
    """
    精确裁剪人物头部
    x_pct, y_pct: 头部中心的百分比坐标
    box_w_pct: 裁剪框宽度占图片宽度的百分比
    box_h_pct: 裁剪框高度占图片高度的百分比
    """
    img = Image.open(src).convert('RGB')
    W, H = img.size
    cx = int(W * x_pct / 100)
    cy = int(H * y_pct / 100)
    bw = int(W * box_w_pct / 100)
    bh = int(H * box_h_pct / 100)
    # 统一为正方形（取较大边）
    side = max(bw, bh)
    box = (
        max(0, cx - side//2),
        max(0, cy - side//2),
        min(W, cx + side//2),
        min(H, cy + side//2)
    )
    cropped = img.crop(box)
    # 强制为正方形
    sq_size = min(cropped.size)
    cw, ch = cropped.size
    if cw != ch:
        off_x = (cw - sq_size) // 2
        off_y = (ch - sq_size) // 2
        cropped = cropped.crop((off_x, off_y, off_x + sq_size, off_y + sq_size))
    avatar = cropped.resize((160, 160), Image.LANCZOS)
    # 圆形蒙版（稍微内缩2px）
    mask = Image.new('L', (160, 160), 0)
    d = ImageDraw.Draw(mask)
    d.ellipse((3, 3, 156, 156), fill=255)
    result = Image.new('RGBA', (160, 160), (0, 0, 0, 0))
    result.paste(avatar.convert('RGBA'), mask=mask)
    result.save(f'{out_dir}/{out_name}', format='PNG')
    print(f'✓ {out_name:<28} center=({x_pct}%,{y_pct}%) box={box}')

INN      = base + '/scenes/inn_new.jpg'           # 1379×752
STREET   = base + '/scenes/street_new.jpg'        # 1376×768
ROYAL    = base + '/scenes/royal_court.jpg'       # 1408×768
OUTDOOR  = base + '/scenes/outdoor.jpg'           # 1408×768
CLASS    = base + '/scenes/classroom.jpg'         # 1408×768
MEDICINE = base + '/scenes/medicine_hall_new.jpg' # 1408×768
ART      = base + '/scenes/art_studio_new.jpg'    # 1408×768
BEDROOM  = base + '/scenes/bedroom_new.jpg'       # 1408×768

print('=== 客栈 (1379×752) ===')
# 掌柜站在右侧柜台后，头在约(57%, 33%)处，给大一点的裁剪框
crop_head(INN, 57, 30, 13, 20, 'inn_keeper.png')
# 戴斗笠侠客，左侧坐着，头(含斗笠)在约(20%, 42%)
crop_head(INN, 19, 40, 13, 20, 'inn_swordsman.png')
# 右侧食客，约(82%, 52%)
crop_head(INN, 82, 50, 11, 17, 'inn_guest.png')

print('\n=== 街道 (1376×768) ===')
# 左侧摊贩，(17%, 45%)
crop_head(STREET, 16, 43, 11, 17, 'street_vendor.png')
# 中间女子，(49%, 40%)
crop_head(STREET, 49, 38, 11, 17, 'street_girl.png')
# 右侧书生，(77%, 42%)
crop_head(STREET, 77, 40, 11, 17, 'street_scholar.png')

print('\n=== 宫廷 (1408×768) ===')
# 左侧文官，(22%, 35%)
crop_head(ROYAL, 22, 33, 11, 17, 'royal_official.png')
# 中央皇后，(52%, 28%)
crop_head(ROYAL, 52, 26, 13, 20, 'royal_emperor.png')
# 右侧郡主，(76%, 36%)
crop_head(ROYAL, 76, 34, 11, 17, 'royal_lady.png')

print('\n=== 草原/户外 (1408×768) ===')
# 牧民，左侧，(30%, 42%)
crop_head(OUTDOOR, 30, 40, 11, 17, 'grass_herder.png')
# 旅人/道人，右侧，(67%, 38%)
crop_head(OUTDOOR, 67, 36, 11, 17, 'grass_traveler.png')

print('\n=== 礼仪课堂 (1408×768) ===')
# 夫子，左前，(26%, 30%)
crop_head(CLASS, 26, 28, 12, 18, 'class_teacher.png')
# 学生，右侧，(62%, 34%)
crop_head(CLASS, 62, 32, 11, 17, 'class_student.png')

print('\n=== 药铺 (1408×768) ===')
# 老大夫，左中，(33%, 30%)
crop_head(MEDICINE, 33, 28, 11, 17, 'med_doctor.png')
# 药童，右侧，(66%, 34%)
crop_head(MEDICINE, 66, 32, 11, 17, 'med_patient.png')

print('\n=== 书画院 (1408×768) ===')
# 画师，左，(30%, 30%)
crop_head(ART, 30, 28, 11, 17, 'art_master.png')
# 学生，右，(67%, 30%)
crop_head(ART, 67, 28, 11, 17, 'art_student.png')

print('\n=== 闺房 (1408×768) ===')
# 丫鬟，左侧，(21%, 34%)
crop_head(BEDROOM, 21, 32, 11, 17, 'bedroom_maid.png')

print('\n\n✅ 所有头像裁剪完成！')

