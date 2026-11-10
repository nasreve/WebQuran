#!/usr/bin/env python3
"""Membuat ikon aplikasi (build/icon.ico + build/icon.png).

Motif: Rub el Hizb (bintang delapan sudut) di atas latar navy gelap dengan
aksen emerald. Digambar murni dengan geometri supaya tetap tajam pada ukuran
kecil (16 px) di taskbar Windows.
"""

from pathlib import Path
from PIL import Image, ImageDraw

SIZE = 1024
NAVY_TOP = (19, 42, 74)
NAVY_BOTTOM = (9, 17, 32)
GOLD = (200, 164, 92)
GOLD_LIGHT = (226, 199, 138)
EMERALD = (47, 174, 137)


def star_points(cx, cy, radius, points=8, rotation=0.0):
    """Delapan sudut: bintang Rub el Hizb (dua persegi yang ditumpuk)."""
    from math import cos, sin, pi

    vertices = []
    for i in range(points * 2):
        r = radius if i % 2 == 0 else radius * 0.62
        angle = rotation + i * pi / points
        vertices.append((cx + r * cos(angle), cy + r * sin(angle)))
    return vertices


def vertical_gradient(size, top, bottom):
    gradient = Image.new("RGB", (1, size), top)
    draw = ImageDraw.Draw(gradient)
    for y in range(size):
        ratio = y / max(size - 1, 1)
        draw.point((0, y), fill=(
            round(top[0] + (bottom[0] - top[0]) * ratio),
            round(top[1] + (bottom[1] - top[1]) * ratio),
            round(top[2] + (bottom[2] - top[2]) * ratio),
        ))
    return gradient.resize((size, size))


def build_master():
    # Latar: kotak bersudut tumpul dengan gradien navy
    background = vertical_gradient(SIZE, NAVY_TOP, NAVY_BOTTOM).convert("RGBA")
    mask = Image.new("L", (SIZE, SIZE), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, SIZE - 1, SIZE - 1), radius=int(SIZE * 0.22), fill=255
    )
    canvas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    canvas.paste(background, (0, 0), mask)

    draw = ImageDraw.Draw(canvas)
    cx = cy = SIZE / 2

    # Cincin emerald tipis sebagai bingkai
    ring = SIZE * 0.40
    draw.ellipse(
        (cx - ring, cy - ring, cx + ring, cy + ring),
        outline=EMERALD + (110,), width=int(SIZE * 0.012),
    )

    # Bentuk utama: bintang delapan sudut (Rub el Hizb), sederhana agar tetap
    # terbaca pada 16 px di taskbar.
    draw.polygon(star_points(cx, cy, SIZE * 0.345), fill=GOLD + (255,))

    # Lubang di tengah: lingkaran navy, lalu titik emerald
    hole = SIZE * 0.150
    draw.ellipse((cx - hole, cy - hole, cx + hole, cy + hole), fill=NAVY_BOTTOM + (255,))
    draw.ellipse(
        (cx - hole, cy - hole, cx + hole, cy + hole),
        outline=GOLD_LIGHT + (140,), width=int(SIZE * 0.007),
    )
    dot = SIZE * 0.070
    draw.ellipse((cx - dot, cy - dot, cx + dot, cy + dot), fill=EMERALD + (255,))

    return canvas


def main():
    out = Path(__file__).resolve().parent.parent / "build"
    out.mkdir(parents=True, exist_ok=True)

    master = build_master()
    png_path = out / "icon.png"
    master.resize((512, 512), Image.LANCZOS).save(png_path, "PNG")

    ico_path = out / "icon.ico"
    master.save(
        ico_path,
        format="ICO",
        sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
    )
    print(f"OK  {png_path}  ({png_path.stat().st_size} bytes)")
    print(f"OK  {ico_path}  ({ico_path.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
