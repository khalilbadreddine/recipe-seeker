"""Regenerate the butternut squash quinoa bowl Pinterest pin kicker.

Only the violating kicker line ("HIGH-FIBER FALL RECIPE") is replaced.
Title, factual macro subline, divider and photo are left untouched.
New kicker: "A PLANT-FORWARD FALL BOWL" (neutral, dish-focused, no nutrient claim).
"""
from PIL import Image, ImageDraw, ImageFont

PATH = "client/public/pinterest/butternut-squash-quinoa-bowl-pin.jpg"
SANS_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

img = Image.open(PATH).convert("RGB")
W, H = img.size
assert (W, H) == (1000, 1500), f"unexpected size {(W, H)}"
draw = ImageDraw.Draw(img)

# --- locate the old kicker -------------------------------------------------
# Kicker text block sits in the flat dark zone; title starts ~y=200.
Y0, Y1 = 88, 178

# Sample the original orange from the old kicker pixels.
oranges = []
for y in range(Y0, Y1, 2):
    for x in range(60, 940, 3):
        r, g, b = img.getpixel((x, y))
        if r > 170 and g < 140 and b < 110 and r - g > 50:
            oranges.append((r, g, b))
oranges.sort()
orange = oranges[len(oranges) // 2]
print("sampled orange:", orange, f"({len(oranges)} px)")

# Paint over the old kicker with the local background.
# Background is a near-flat dark tone; sample a clean vertical strip at x=14
# (left of the old text) and fill row-by-row to preserve the subtle gradient.
bg_strip = [img.getpixel((14, y)) for y in range(Y0, Y1)]
for y in range(Y0, Y1):
    draw.line([(0, y), (W, y)], fill=bg_strip[y - Y0])

# --- draw the new kicker ----------------------------------------------------
text = "A PLANT-FORWARD FALL BOWL"
TARGET_W = 780          # match the old kicker's span (~x 110..890)
CENTER_Y = 131          # optical center of the old kicker

size = 58
font = None
widths = []
tracking = 0
while size > 24:
    font = ImageFont.truetype(SANS_BOLD, size)
    tracking = int(round(size * 0.18))
    widths = [draw.textlength(ch, font=font) for ch in text]
    if sum(widths) + tracking * (len(text) - 1) <= TARGET_W:
        break
    size -= 2
print("kicker font size:", size, "tracking:", tracking)

total_w = sum(widths) + tracking * (len(text) - 1)
ascent, descent = font.getmetrics()
x = (W - total_w) / 2
y_text = CENTER_Y - (ascent + descent) / 2
for ch, w in zip(text, widths):
    draw.text((x, y_text), ch, font=font, fill=orange)
    x += w + tracking

img.save(PATH, quality=95)
print("saved", PATH, img.size)

import hashlib
h = hashlib.sha256(open(PATH, "rb").read()).hexdigest()
print("sha256:", h)
