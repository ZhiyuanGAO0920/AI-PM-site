#!/usr/bin/env python3
# 生成社交分享预览图 og-default.png (1200x630)
# 运行：python scripts/gen-og.py  （在 ai-pm-site 根目录执行）
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
BG = (15, 23, 42)        # 深蓝底，与站点 hero 一致
ACCENT = (56, 189, 248)  # 青色强调条
WHITE = (255, 255, 255)
LIGHT = (226, 232, 240)
MUTED = (148, 163, 184)

FONT = 'C:/Windows/Fonts/msyh.ttc'  # 微软雅黑（Windows 自带，含中文）
try:
    f_title = ImageFont.truetype(FONT, 76)
    f_sub = ImageFont.truetype(FONT, 38)
    f_small = ImageFont.truetype(FONT, 30)
except Exception as e:
    # 兜底：用默认字体（中文可能显示为方块，仅作保底）
    print('字体加载失败，使用默认字体:', e)
    f_title = ImageFont.load_default()
    f_sub = ImageFont.load_default()
    f_small = ImageFont.load_default()


def center_y(draw, y, text, font):
    bbox = draw.textbbox((0, 0), text, font=font)
    w = bbox[2] - bbox[0]
    draw.text(((W - w) / 2, y), text, font=font, fill=WHITE)


img = Image.new('RGB', (W, H), BG)
d = ImageDraw.Draw(img)

# 顶部强调条
d.rectangle([0, 0, W, 12], fill=ACCENT)

# 主标题（居中）
center_y(d, 190, '高志远的 AI PM 笔记', f_title)

# 副标题（居中）
center_y(d, 320, '一个 B 端产品人真实转 AI PM 的路径', f_sub)
center_y(d, 380, '+ 可验证的经验库', f_sub)

# 底部署名
bbox = d.textbbox((0, 0), '高志远 · 整理', font=f_small)
w = bbox[2] - bbox[0]
d.text(((W - w) / 2, 545), '高志远 · 整理', font=f_small, fill=MUTED)

img.save('public/og-default.png')
print('og-default.png 已生成 (1200x630)')
