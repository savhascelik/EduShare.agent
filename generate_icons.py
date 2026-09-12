import os
from PIL import Image, ImageDraw, ImageFont

def create_pwa_icon(size, filename):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Warm gradient-like background rounded rectangle
    margin = int(size * 0.08)
    radius = int(size * 0.22)
    
    # Base background
    draw.rounded_rectangle(
        [(margin, margin), (size - margin, size - margin)],
        radius=radius,
        fill=(16, 185, 129, 255) # Emerald 500
    )

    # Secondary warm inner glow
    inner_margin = int(size * 0.12)
    inner_radius = int(size * 0.18)
    draw.rounded_rectangle(
        [(inner_margin, inner_margin), (size - inner_margin, size - inner_margin)],
        radius=inner_radius,
        fill=(5, 150, 105, 255) # Emerald 600
    )

    # Draw a stylized warm gold circular emblem
    center = size // 2
    r = int(size * 0.22)
    draw.ellipse(
        [(center - r, center - r), (center + r, center + r)],
        fill=(245, 158, 11, 255) # Amber 500
    )

    # Draw center white E symbol / leaf accent
    leaf_w = int(r * 0.55)
    draw.ellipse(
        [(center - leaf_w, center - leaf_w), (center + leaf_w, center + leaf_w)],
        fill=(255, 255, 255, 240)
    )

    out_dir = r"C:\laragon\www\hackathon\edushare\frontend\public"
    os.makedirs(out_dir, exist_ok=True)
    target_path = os.path.join(out_dir, filename)
    img.save(target_path, "PNG")
    print(f"Generated: {target_path} ({size}x{size})")

if __name__ == "__main__":
    create_pwa_icon(192, "pwa-192x192.png")
    create_pwa_icon(512, "pwa-512x512.png")
    create_pwa_icon(180, "apple-touch-icon.png")
