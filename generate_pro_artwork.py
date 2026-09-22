import os
from PIL import Image, ImageDraw

SHOWS = [
    {
        "prefix": "moti",
        "colors": [(15, 23, 42), (88, 28, 135), (180, 83, 9)], # Navy -> Deep Violet -> Warm Sunset
        "accent": (245, 158, 11),
    },
    {
        "prefix": "science",
        "colors": [(3, 7, 18), (49, 46, 129), (14, 116, 144)], # Dark -> Cosmic Indigo -> Electric Cyan
        "accent": (56, 189, 248),
    },
    {
        "prefix": "tenali",
        "colors": [(24, 24, 27), (69, 10, 10), (180, 83, 9)], # Dark -> Royal Crimson -> Gold
        "accent": (251, 191, 36),
    },
    {
        "prefix": "gita",
        "colors": [(2, 44, 34), (15, 23, 42), (161, 98, 7)], # Emerald -> Midnight -> Sacred Gold
        "accent": (234, 179, 8),
    },
    {
        "prefix": "bedtime",
        "colors": [(15, 23, 42), (46, 16, 101), (30, 58, 138)], # Midnight -> Twilight Purple -> Deep Blue
        "accent": (192, 132, 252),
    },
    {
        "prefix": "rhyme",
        "colors": [(6, 78, 59), (30, 58, 138), (180, 83, 9)], # Forest Teal -> Ocean Blue -> Amber
        "accent": (52, 211, 153),
    },
    {
        "prefix": "jungle",
        "colors": [(2, 44, 34), (6, 78, 59), (120, 53, 15)], # Deep Jungle -> Moss Emerald -> Warm Earth
        "accent": (74, 222, 128),
    },
    {
        "prefix": "panchatantra",
        "colors": [(20, 10, 30), (59, 7, 100), (160, 60, 20)], # Midnight -> Royal Plum -> Terracotta
        "accent": (251, 146, 60),
    },
]

def create_gradient(width, height, color1, color2, color3=None):
    base = Image.new("RGB", (width, height))
    draw = ImageDraw.Draw(base)
    for y in range(height):
        ratio = y / height
        if color3 is None:
            r = int(color1[0] * (1 - ratio) + color2[0] * ratio)
            g = int(color1[1] * (1 - ratio) + color2[1] * ratio)
            b = int(color1[2] * (1 - ratio) + color2[2] * ratio)
        else:
            if ratio < 0.5:
                sub_r = ratio * 2
                r = int(color1[0] * (1 - sub_r) + color2[0] * sub_r)
                g = int(color1[1] * (1 - sub_r) + color2[1] * sub_r)
                b = int(color1[2] * (1 - sub_r) + color2[2] * sub_r)
            else:
                sub_r = (ratio - 0.5) * 2
                r = int(color2[0] * (1 - sub_r) + color3[0] * sub_r)
                g = int(color2[1] * (1 - sub_r) + color3[1] * sub_r)
                b = int(color2[2] * (1 - sub_r) + color3[2] * sub_r)
        draw.line([(0, y), (width, y)], fill=(r, g, b))
    return base

def generate_banner(show, out_path):
    width, height = 1280, 720
    im = create_gradient(width, height, show["colors"][0], show["colors"][1], show["colors"][2])
    
    overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)

    # Ambient radial lighting glow (No text)
    cx, cy = int(width * 0.7), int(height * 0.4)
    for r in range(450, 40, -25):
        alpha = int(22 * (1 - r / 450))
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(*show["accent"], alpha))

    # Second ambient soft glow on left
    for r in range(300, 30, -20):
        alpha = int(15 * (1 - r / 300))
        d.ellipse([250 - r, height - 150 - r, 250 + r, height - 150 + r], fill=(*show["colors"][1], alpha))

    # Dark cinematic bottom vignette
    for y in range(height // 2, height):
        r = (y - height // 2) / (height // 2)
        d.line([(0, y), (width, y)], fill=(10, 15, 30, int(200 * r)))

    im = Image.alpha_composite(im.convert("RGBA"), overlay).convert("RGB")
    im.save(out_path, "JPEG", quality=92)

def generate_poster(show, out_path):
    width, height = 600, 900
    im = create_gradient(width, height, show["colors"][0], show["colors"][1], show["colors"][2])
    
    overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)

    # Ambient central atmospheric glow
    cx, cy = width // 2, height // 2 - 50
    for r in range(350, 30, -20):
        alpha = int(24 * (1 - r / 350))
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(*show["accent"], alpha))

    # Elegant subtle border frame
    d.rounded_rectangle([30, 30, width - 30, height - 30], radius=24, outline=(*show["accent"], 40), width=1)

    # Dark bottom vignette
    for y in range(height // 2, height):
        r = (y - height // 2) / (height // 2)
        d.line([(0, y), (width, y)], fill=(10, 15, 30, int(210 * r)))

    im = Image.alpha_composite(im.convert("RGBA"), overlay).convert("RGB")
    im.save(out_path, "JPEG", quality=92)

def generate_thumb(show, out_path):
    width, height = 640, 360
    im = create_gradient(width, height, show["colors"][0], show["colors"][1])
    
    overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)

    # Ambient soft glow in center
    cx, cy = width // 2, height // 2
    for r in range(180, 20, -15):
        alpha = int(20 * (1 - r / 180))
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(*show["accent"], alpha))

    # Elegant Minimal Play Circle
    d.ellipse([cx - 26, cy - 26, cx + 26, cy + 26], fill=(0, 0, 0, 140), outline=(*show["accent"], 180), width=2)
    d.polygon([(cx - 7, cy - 12), (cx + 12, cy), (cx - 7, cy + 12)], fill=show["accent"])

    im = Image.alpha_composite(im.convert("RGBA"), overlay).convert("RGB")
    im.save(out_path, "JPEG", quality=90)

def main():
    target_dirs = ["storage/artwork", "backend/storage/artwork"]
    for d in target_dirs:
        os.makedirs(d, exist_ok=True)

    for s in SHOWS:
        p = s["prefix"]
        banner_name = f"{p}_banner.jpg"
        poster_name = f"{p}_poster.jpg"
        
        for d in target_dirs:
            generate_banner(s, os.path.join(d, banner_name))
            generate_poster(s, os.path.join(d, poster_name))
            
            # Generate episode thumbs (with clean minimalist play badge, no cluttering text)
            generate_thumb(s, os.path.join(d, f"{p}_thumb_t1.jpg"))
            generate_thumb(s, os.path.join(d, f"{p}_thumb_1.jpg"))
            generate_thumb(s, os.path.join(d, f"{p}_thumb_2.jpg"))
            generate_thumb(s, os.path.join(d, f"{p}_thumb_3.jpg"))

    print("All clean cinematic artwork generated with ZERO burnt-in text!")

if __name__ == "__main__":
    main()
