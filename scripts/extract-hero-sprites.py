"""Cut the mounted-archer frames out of src/assests/model.png into a clean atlas.

Output: src/assests/sprites/hero.png — 4 columns (frames) x 4 rows
(idle, walk, run, attack), every cell CELL_W x CELL_H, feet aligned to the
cell bottom, horizontally centred, alpha hard-thresholded, colours quantised.

Run from web/:  python3 scripts/extract-hero-sprites.py
"""
from PIL import Image, ImageEnhance

SRC = 'src/assests/model.png'
DST = 'src/assests/sprites/hero.png'
CELL_W, CELL_H = 88, 92
COLS = [(403, 478), (484, 561), (565, 644), (651, 723)]
ROWS = [(82, 163), (177, 255), (272, 353), (370, 451)]  # idle, walk, run, attack
ALPHA_CUT = 128

src = Image.open(SRC).convert('RGBA')
# Hard alpha: the sheet has a faint (alpha <= ~30) glow around every sprite.
a = src.getchannel('A').point(lambda v: 255 if v >= ALPHA_CUT else 0)
src.putalpha(a)

atlas = Image.new('RGBA', (CELL_W * 4, CELL_H * 4), (0, 0, 0, 0))
for r, (y0, y1) in enumerate(ROWS):
    for c, (x0, x1) in enumerate(COLS):
        frame = src.crop((x0 - 3, y0 - 3, x1 + 4, y1 + 4))
        box = frame.getchannel('A').getbbox()
        if not box:
            continue
        frame = frame.crop(box)
        ox = c * CELL_W + (CELL_W - frame.width) // 2
        oy = r * CELL_H + (CELL_H - frame.height) - 2
        atlas.alpha_composite(frame, (ox, oy))

# Quantise to a small palette so the soft AI-upscaled edges read as pixel art.
alpha = atlas.getchannel('A')
rgb = ImageEnhance.Color(atlas.convert('RGB')).enhance(1.35)  # the sheet is slightly washed out
q = rgb.quantize(colors=56, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
out = q.convert('RGBA')
out.putalpha(alpha)
out.save(DST, optimize=True)
print('wrote', DST, out.size)
