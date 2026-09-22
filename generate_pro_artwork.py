import os
import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

SHOWS = [
    {
        "prefix": "moti",
        "title": "Moti's Many Lives",
        "subtitle": "Kindness, Courage & Friendship in Varanasi",
        "tag": "MORAL STORIES • AGES 4-8",
        "badge": "PEBLO ORIGINAL",
        "colors": [(15, 23, 42), (88, 28, 135), (180, 83, 9)], # Navy -> Deep Violet -> Warm Amber
        "accent": (245, 158, 11),
    },
    {
        "prefix": "science",
        "title": "Peblo's Cosmic Science Lab",
        "subtitle": "Rockets, Planets & Curious Inventions",
        "tag": "SCIENCE & NATURE • AGES 5-10",
        "badge": "EXPLORE & DISCOVER",
        "colors": [(3, 7, 18), (49, 46, 129), (14, 116, 144)], # Dark -> Deep Indigo -> Cyan
        "accent": (56, 189, 248),
    },
    {
        "prefix": "tenali",
        "title": "Tales of Tenali Raman",
        "subtitle": "Wit, Laughter & Ancient Court Wisdom",
        "tag": "CLASSIC FABLES • AGES 6-12",
        "badge": "INDIAN CLASSIC",
        "colors": [(24, 24, 27), (69, 10, 10), (180, 83, 9)], # Dark -> Crimson -> Gold
        "accent": (251, 191, 36),
    },
    {
        "prefix": "gita",
        "title": "Gita for Kids",
        "subtitle": "The Wisdom & Courage of Arjuna",
        "tag": "MYTHOLOGY & CULTURE • AGES 6-12",
        "badge": "EPIC TALES",
        "colors": [(2, 44, 34), (15, 23, 42), (161, 98, 7)], # Emerald -> Midnight -> Sandalwood Gold
        "accent": (234, 179, 8),
    },
    {
        "prefix": "bedtime",
        "title": "Bedtime Stars & Lullabies",
        "subtitle": "Soothing Rhymes & Gentle Sleep Stories",
        "tag": "EARLY LEARNING • AGES 2-6",
        "badge": "CALM & SLEEP",
        "colors": [(15, 23, 42), (46, 16, 101), (30, 58, 138)], # Midnight -> Purple -> Deep Indigo
        "accent": (192, 132, 252),
    },
    {
        "prefix": "rhyme",
        "title": "Rhyme Time with Peblo",
        "subtitle": "Joyful Sing-Alongs, Numbers & Beats",
        "tag": "EARLY LEARNING • AGES 2-5",
        "badge": "SING & DANCE",
        "colors": [(6, 78, 59), (30, 58, 138), (180, 83, 9)], # Forest -> Blue -> Amber
        "accent": (52, 211, 153),
    },
    {
        "prefix": "jungle",
        "title": "Indian Jungle Safari",
        "subtitle": "Tigers, Elephants & Rainforest Secrets",
        "tag": "ANIMALS & WILDLIFE • AGES 5-11",
        "badge": "NATURE EXPEDITION",
        "colors": [(2, 44, 34), (6, 78, 59), (120, 53, 15)], # Deep Jungle -> Emerald -> Earth
        "accent": (74, 222, 128),
    },
    {
        "prefix": "panchatantra",
        "title": "Panchatantra Animal Fables",
        "subtitle": "Timeless Moral Stories for Young Minds",
        "tag": "MORAL STORIES • AGES 4-10",
        "badge": "TIMELESS CLASSIC",
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

def draw_particles(draw, width, height, accent):
    import random
    random.seed(width * height)
    for _ in range(40):
        x = random.randint(0, width)
        y = random.randint(0, height)
        radius = random.randint(2, 6)
        alpha = random.randint(40, 180)
        draw.ellipse([x - radius, y - radius, x + radius, y + radius], fill=(*accent, alpha))

def get_font(size):
    try:
        return ImageFont.truetype("arial.ttf", size)
    except Exception:
        return ImageFont.load_default()

def generate_banner(show, out_path):
    width, height = 1280, 720
    im = create_gradient(width, height, show["colors"][0], show["colors"][1], show["colors"][2])
    
    # Overlay layer with alpha
    overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)

    # Ambient radial glow
    for r in range(400, 50, -20):
        alpha = int(15 * (1 - r / 400))
        d.ellipse([width - 300 - r, 200 - r, width - 300 + r, 200 + r], fill=(*show["accent"], alpha))

    # Dark gradient bottom
    for y in range(height // 2, height):
        r = (y - height // 2) / (height // 2)
        d.line([(0, y), (width, y)], fill=(10, 15, 30, int(220 * r)))

    # Badge Pill
    badge_text = f"★ {show['badge']}"
    d.rounded_rectangle([70, 80, 70 + len(badge_text) * 11 + 24, 116], radius=18, fill=(0, 0, 0, 160), outline=show["accent"], width=2)
    f_badge = get_font(15)
    d.text((82, 89), badge_text, fill=show["accent"], font=f_badge)

    # Title
    f_title = get_font(48)
    # Shadow
    d.text((73, 143), show["title"], fill=(0, 0, 0, 200), font=f_title)
    d.text((70, 140), show["title"], fill=(255, 255, 255, 255), font=f_title)

    # Subtitle
    f_sub = get_font(22)
    d.text((72, 212), show["subtitle"], fill=(0, 0, 0, 180), font=f_sub)
    d.text((70, 210), show["subtitle"], fill=(226, 232, 240, 255), font=f_sub)

    # Tag line
    f_tag = get_font(16)
    d.text((70, 260), f"⚡ {show['tag']}", fill=show["accent"], font=f_tag)

    # Decorative bottom brand mark
    f_brand = get_font(18)
    d.text((70, height - 60), "PEBLO TV ORIGINAL • INDIAN ANIMATION", fill=(148, 163, 184, 180), font=f_brand)

    # Merge
    im = Image.alpha_composite(im.convert("RGBA"), overlay).convert("RGB")
    im.save(out_path, "JPEG", quality=92)

def generate_poster(show, out_path):
    width, height = 600, 900
    im = create_gradient(width, height, show["colors"][0], show["colors"][1], show["colors"][2])
    
    overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)

    # Top & bottom vignetting
    for y in range(height // 2, height):
        r = (y - height // 2) / (height // 2)
        d.line([(0, y), (width, y)], fill=(10, 15, 30, int(240 * r)))

    # Central glowing emblem box
    d.rounded_rectangle([40, 40, width - 40, height - 40], radius=24, outline=(*show["accent"], 80), width=2)

    # Badge Pill
    badge_text = show["badge"]
    f_badge = get_font(13)
    d.rounded_rectangle([width//2 - 90, 70, width//2 + 90, 100], radius=15, fill=(0, 0, 0, 180), outline=show["accent"], width=2)
    d.text((width//2 - len(badge_text)*4, 77), badge_text, fill=show["accent"], font=f_badge)

    # Title
    f_title = get_font(34)
    # Wrap title if long
    words = show["title"].split(" ")
    if len(words) > 3:
        line1 = " ".join(words[:len(words)//2])
        line2 = " ".join(words[len(words)//2:])
        d.text((52, height - 232), line1, fill=(0, 0, 0, 220), font=f_title)
        d.text((50, height - 230), line1, fill=(255, 255, 255), font=f_title)
        d.text((52, height - 182), line2, fill=(0, 0, 0, 220), font=f_title)
        d.text((50, height - 180), line2, fill=(255, 255, 255), font=f_title)
    else:
        d.text((52, height - 202), show["title"], fill=(0, 0, 0, 220), font=f_title)
        d.text((50, height - 200), show["title"], fill=(255, 255, 255), font=f_title)

    # Tag
    f_tag = get_font(13)
    d.text((50, height - 120), show["tag"], fill=show["accent"], font=f_tag)

    # Brand
    f_brand = get_font(14)
    d.text((50, height - 80), "PEBLO TV", fill=(203, 213, 225), font=f_brand)

    im = Image.alpha_composite(im.convert("RGBA"), overlay).convert("RGB")
    im.save(out_path, "JPEG", quality=92)

def generate_thumb(show, index_label, out_path):
    width, height = 640, 360
    im = create_gradient(width, height, show["colors"][0], show["colors"][1])
    
    overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)

    # Dark bottom scrim
    for y in range(height // 2, height):
        r = (y - height // 2) / (height // 2)
        d.line([(0, y), (width, y)], fill=(10, 15, 30, int(220 * r)))

    # Play Icon Circle in Center
    cx, cy = width // 2, height // 2 - 20
    d.ellipse([cx - 30, cy - 30, cx + 30, cy + 30], fill=(0, 0, 0, 160), outline=show["accent"], width=2)
    # Triangle
    d.polygon([(cx - 8, cy - 14), (cx + 14, cy), (cx - 8, cy + 14)], fill=show["accent"])

    # Episode / Trailer title
    f_ep = get_font(18)
    d.text((30, height - 60), f"{show['title']} • {index_label}", fill=(255, 255, 255), font=f_ep)

    f_sub = get_font(12)
    d.text((30, height - 35), "Full HD • Multi-Language Audio", fill=show["accent"], font=f_sub)

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
            
            # Generate episode thumbs
            generate_thumb(s, "Official Trailer", os.path.join(d, f"{p}_thumb_t1.jpg"))
            generate_thumb(s, "Episode 1", os.path.join(d, f"{p}_thumb_1.jpg"))
            generate_thumb(s, "Episode 2", os.path.join(d, f"{p}_thumb_2.jpg"))
            generate_thumb(s, "Episode 3", os.path.join(d, f"{p}_thumb_3.jpg"))

    print("All professional show artwork successfully created across storage directories!")

if __name__ == "__main__":
    main()
