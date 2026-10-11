import os
import math
from PIL import Image, ImageDraw, ImageFilter

def draw_inclusive_eyes_icon(size, is_round=False, for_maskable=False):
    # Render at 4x resolution for smooth supersampling
    scale = 4
    canvas_size = size * scale
    img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    cx = canvas_size / 2.0
    cy = canvas_size / 2.0

    # Background
    # Deep Forest Green gradient to dark emerald
    # #0D6B60 (13, 107, 96) -> #083832 (8, 56, 50)
    bg_img = Image.new("RGBA", (canvas_size, canvas_size))
    bg_draw = ImageDraw.Draw(bg_img)
    
    for y in range(canvas_size):
        ratio = y / float(canvas_size)
        r = int(13 * (1 - ratio) + 7 * ratio)
        g = int(107 * (1 - ratio) + 56 * ratio)
        b = int(96 * (1 - ratio) + 50 * ratio)
        bg_draw.line([(0, y), (canvas_size, y)], fill=(r, g, b, 255))

    # Mask for rounded or circular
    mask = Image.new("L", (canvas_size, canvas_size), 0)
    mask_draw = ImageDraw.Draw(mask)
    if is_round:
        mask_draw.ellipse([0, 0, canvas_size - 1, canvas_size - 1], fill=255)
    elif for_maskable:
        # Full bleed for adaptive maskable
        mask_draw.rectangle([0, 0, canvas_size - 1, canvas_size - 1], fill=255)
    else:
        # Modern rounded squircle (rx = 22% of size)
        rx = int(canvas_size * 0.23)
        mask_draw.rounded_rectangle([0, 0, canvas_size - 1, canvas_size - 1], radius=rx, fill=255)

    img.paste(bg_img, (0, 0), mask)
    draw = ImageDraw.Draw(img)

    # Ambient subtle inner radial glow
    glow_radius = int(canvas_size * 0.42)
    glow_box = [cx - glow_radius, cy - glow_radius * 0.8, cx + glow_radius, cy + glow_radius * 0.8]
    draw.ellipse(glow_box, fill=(35, 183, 125, 45))

    # Safe content zone: content scale ~ 58% of canvas
    content_scale = 0.58 if for_maskable else 0.68
    w = canvas_size * content_scale
    h = canvas_size * content_scale * 0.88

    # Chat bubble container
    bubble_x0 = cx - w / 2.0
    bubble_y0 = cy - h / 2.0 - canvas_size * 0.03
    bubble_x1 = cx + w / 2.0
    bubble_y1 = bubble_y0 + h

    # Speech Bubble polygon + tail
    # Tail points on bottom left
    bubble_rx = int(w * 0.22)
    draw.rounded_rectangle(
        [bubble_x0, bubble_y0, bubble_x1, bubble_y1],
        radius=bubble_rx,
        fill=(12, 30, 27, 240), # Dark ink emerald
        outline=(37, 211, 102, 230), # Crisp mint glow border
        width=max(2, int(scale * size * 0.018))
    )

    # Chat pointer tail (down-left)
    tail_top_x = bubble_x0 + w * 0.18
    tail_top_y = bubble_y1 - 2
    tail_tip_x = bubble_x0 + w * 0.04
    tail_tip_y = bubble_y1 + h * 0.20
    tail_base_x = bubble_x0 + w * 0.38
    tail_base_y = bubble_y1 - 2
    tail_points = [(tail_top_x, tail_top_y), (tail_tip_x, tail_tip_y), (tail_base_x, tail_base_y)]
    draw.polygon(tail_points, fill=(12, 30, 27, 240))
    # Border for tail
    draw.line([(tail_top_x, tail_top_y), (tail_tip_x, tail_tip_y)], fill=(37, 211, 102, 230), width=max(2, int(scale * size * 0.018)))
    draw.line([(tail_tip_x, tail_tip_y), (tail_base_x, tail_base_y)], fill=(37, 211, 102, 230), width=max(2, int(scale * size * 0.018)))

    # Inside the bubble: The "Inclusive Eyes" emblem
    # Two welcoming expressive eyes (arcs and pupils with mint glow)
    eye_y = bubble_y0 + h * 0.48
    eye_offset_x = w * 0.22
    eye1_x = cx - eye_offset_x
    eye2_x = cx + eye_offset_x

    eye_rw = w * 0.14
    eye_rh = h * 0.18

    # Outer eye glows (white-mint)
    for eye_x in (eye1_x, eye2_x):
        # Upper curved eye eyelid arc
        arc_box = [eye_x - eye_rw, eye_y - eye_rh * 1.3, eye_x + eye_rw, eye_y + eye_rh * 0.7]
        draw.arc(arc_box, start=190, end=350, fill=(255, 255, 255, 250), width=max(2, int(scale * size * 0.024)))
        # Lower subtle arc
        lower_arc = [eye_x - eye_rw * 0.8, eye_y - eye_rh * 0.4, eye_x + eye_rw * 0.8, eye_y + eye_rh * 1.1]
        draw.arc(lower_arc, start=20, end=160, fill=(37, 211, 102, 180), width=max(1, int(scale * size * 0.014)))

        # Eye pupil / sparkle dot
        pupil_r = eye_rw * 0.48
        draw.ellipse([eye_x - pupil_r, eye_y - pupil_r * 0.8, eye_x + pupil_r, eye_y + pupil_r * 1.1], fill=(37, 211, 102, 255))
        # Inner white gleam (catchlight)
        gleam_r = pupil_r * 0.36
        draw.ellipse([eye_x - pupil_r * 0.3, eye_y - pupil_r * 0.5, eye_x + gleam_r, eye_y], fill=(255, 255, 255, 255))

    # Center connecting bridge / trilingual spark
    spark_cx = cx
    spark_cy = eye_y - eye_rh * 0.3
    spark_r = w * 0.035
    draw.ellipse([spark_cx - spark_r, spark_cy - spark_r, spark_cx + spark_r, spark_cy + spark_r], fill=(255, 255, 255, 240))

    # Friendly smile / inclusion wave at bottom of bubble
    smile_box = [cx - w * 0.18, eye_y + eye_rh * 0.6, cx + w * 0.18, eye_y + eye_rh * 1.4]
    draw.arc(smile_box, start=25, end=155, fill=(37, 211, 102, 230), width=max(2, int(scale * size * 0.018)))

    # Downsample with high-quality Lanczos antialiasing
    final_img = img.resize((size, size), Image.Resampling.LANCZOS)
    return final_img

def generate_all():
    print("Generating Web and PWA icons...")
    # 1. Web icons
    icon_512 = draw_inclusive_eyes_icon(512)
    icon_512.save("public/icon-512.png", "PNG")
    print("Saved public/icon-512.png")

    icon_192 = draw_inclusive_eyes_icon(192)
    icon_192.save("public/icon-192.png", "PNG")
    print("Saved public/icon-192.png")

    apple_icon = draw_inclusive_eyes_icon(180)
    apple_icon.save("public/apple-touch-icon.png", "PNG")
    print("Saved public/apple-touch-icon.png")

    fav_32 = draw_inclusive_eyes_icon(32)
    fav_32.save("public/favicon-32x32.png", "PNG")
    fav_16 = draw_inclusive_eyes_icon(16)
    fav_48 = draw_inclusive_eyes_icon(48)
    fav_32.save("public/favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
    print("Saved public/favicon.ico and public/favicon-32x32.png")

    # 2. Android Mipmap icons
    res_base = "android/app/src/main/res"
    densities = {
        "mdpi": 48,
        "hdpi": 72,
        "xhdpi": 96,
        "xxhdpi": 144,
        "xxxhdpi": 192,
    }

    print("Generating Android mipmap icons...")
    for density, px in densities.items():
        folder = os.path.join(res_base, f"mipmap-{density}")
        os.makedirs(folder, exist_ok=True)
        # Regular icon (rounded squircle)
        reg_icon = draw_inclusive_eyes_icon(px, is_round=False)
        reg_icon.save(os.path.join(folder, "ic_launcher.webp"), "WEBP", quality=95)
        # Round icon (circular)
        round_icon = draw_inclusive_eyes_icon(px, is_round=True)
        round_icon.save(os.path.join(folder, "ic_launcher_round.webp"), "WEBP", quality=95)
        print(f"Generated {density} ({px}x{px}) ic_launcher and ic_launcher_round")

if __name__ == "__main__":
    generate_all()
