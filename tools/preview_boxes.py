"""在图片上绘制裁剪区域框，用于验证坐标"""
from PIL import Image, ImageDraw, ImageFont
import sys

src = sys.argv[1] if len(sys.argv) > 1 else 'frontend/src/components/img_1.png'
img = Image.open(src).convert('RGBA')
W, H = img.size
draw = ImageDraw.Draw(img)

# img_1 套装区域框
if 'img_1' in src:
    boxes = [
        (10,   10,  185, 390, 'red',    '0:spring_light'),
        (198,  148, 335, 395, 'blue',   '1:summer_lotus'),
        (335,  148, 468, 395, 'green',  '2:winter_plum'),
        (468,  148, 580, 395, 'orange', '3:court_phoenix'),
        (700,   25, 878, 390, 'purple', '4:feather_wave'),
        (878,   25,1055, 390, 'cyan',   '5:purple_sand'),
        (1055,  25,1230, 390, 'yellow', '6:green_ridge'),
        (1230,  25,1405, 390, 'pink',   '7:moon_star'),
        (  0,  400, 140, 760, 'red',    '8:full01'),
        (140,  400, 282, 760, 'blue',   '9:full02'),
        (282,  400, 424, 760, 'green',  '10:full03'),
        (424,  400, 563, 760, 'orange', '11:full04'),
        (563,  400, 704, 760, 'purple', '12:full05'),
        (704,  400, 844, 760, 'cyan',   '13:full06'),
        (844,  400, 985, 760, 'yellow', '14:full07'),
    ]

# img_2 场景区域框（13个场景，来自用户提供的 image_2）
elif 'img_2' in src:
    # 行1: 4个场景 y:0~250
    # 行2: 4个场景 y:250~500
    # 行3: 5个场景 y:500~768
    col4 = W // 4  # 352
    col5 = W // 5  # 281
    boxes = [
        (0*col4, 0,   1*col4, 248, 'red',    '闺房'),
        (1*col4, 0,   2*col4, 248, 'blue',   '府衙'),
        (2*col4, 0,   3*col4, 248, 'green',  '街道'),
        (3*col4, 0,   4*col4, 248, 'orange', '客栈'),
        (0*col4, 248, 1*col4, 496, 'purple', '酒馆1'),
        (1*col4, 248, 2*col4, 496, 'cyan',   '酒馆2'),
        (2*col4, 248, 3*col4, 496, 'yellow', '跑马场1'),
        (3*col4, 248, 4*col4, 496, 'pink',   '草原1'),
        (0*col5, 496, 1*col5, 768, 'red',    '跑马场2'),
        (1*col5, 496, 2*col5, 768, 'blue',   '草原2'),
        (2*col5, 496, 3*col5, 768, 'green',  '幼学馆'),
        (3*col5, 496, 4*col5, 768, 'orange', '礼仪课堂'),
        (4*col5, 496, 5*col5, 768, 'purple', '药铺'),
    ]

# img_3 活动场景区域框（与img_2同布局）
elif 'img_3' in src:
    col4 = W // 4
    col5 = W // 5
    boxes = [
        (0*col4, 0,   1*col4, 248, 'red',    '闺房'),
        (1*col4, 0,   2*col4, 248, 'blue',   '府衙'),
        (2*col4, 0,   3*col4, 248, 'green',  '街道'),
        (3*col4, 0,   4*col4, 248, 'orange', '客栈'),
        (0*col4, 248, 1*col4, 496, 'purple', '酒馆1'),
        (1*col4, 248, 2*col4, 496, 'cyan',   '酒馆2'),
        (2*col4, 248, 3*col4, 496, 'yellow', '跑马场1'),
        (3*col4, 248, 4*col4, 496, 'pink',   '草原1'),
        (0*col5, 496, 1*col5, 768, 'red',    '跑马场2'),
        (1*col5, 496, 2*col5, 768, 'blue',   '草原2'),
        (2*col5, 496, 3*col5, 768, 'green',  '幼学馆'),
        (3*col5, 496, 4*col5, 768, 'orange', '礼仪课堂'),
        (4*col5, 496, 5*col5, 768, 'purple', '药铺'),
    ]
else:
    boxes = []

for (x1, y1, x2, y2, color, label) in boxes:
    draw.rectangle([x1, y1, x2, y2], outline=color, width=4)
    draw.text((x1+4, y1+4), label, fill=color)

out = f'/tmp/preview_{src.split("/")[-1]}'
img.save(out)
print(f'Saved: {out}  ({W}x{H})')

