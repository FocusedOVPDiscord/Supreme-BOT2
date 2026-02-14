#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math

# Banner dimensions (Discord recommended)
WIDTH = 600
HEIGHT = 240
FRAMES = 30  # Number of frames for smooth animation

def create_frame(frame_num, total_frames):
    """Create a single frame of the animated banner"""
    # Create base image with dark gradient background
    img = Image.new('RGB', (WIDTH, HEIGHT), color=(15, 10, 35))
    draw = ImageDraw.Draw(img)
    
    # Animation progress (0 to 1)
    progress = frame_num / total_frames
    
    # Draw gradient background
    for y in range(HEIGHT):
        # Purple to blue gradient
        r = int(15 + (40 - 15) * (y / HEIGHT))
        g = int(10 + (20 - 10) * (y / HEIGHT))
        b = int(35 + (80 - 35) * (y / HEIGHT))
        draw.rectangle([(0, y), (WIDTH, y+1)], fill=(r, g, b))
    
    # Animated particles (moving dots)
    for i in range(20):
        angle = (progress * 2 * math.pi) + (i * math.pi / 10)
        x = int(WIDTH * 0.75 + 80 * math.cos(angle + i))
        y = int(HEIGHT * 0.5 + 40 * math.sin(angle * 1.5 + i))
        
        # Keep particles in bounds
        if 0 <= x < WIDTH and 0 <= y < HEIGHT:
            size = 2 + int(2 * math.sin(angle))
            alpha = int(100 + 155 * abs(math.sin(angle)))
            color = (100 + alpha // 2, 150 + alpha // 3, 255)
            draw.ellipse([x-size, y-size, x+size, y+size], fill=color)
    
    # Draw circuit-like lines (animated)
    offset = int(progress * 50)
    for i in range(5):
        y_pos = 50 + i * 40 + (offset % 20)
        draw.line([(WIDTH * 0.6, y_pos), (WIDTH * 0.9, y_pos)], 
                  fill=(80, 120, 255, 100), width=1)
    
    # Draw hexagons (pulsing)
    pulse = 0.9 + 0.1 * math.sin(progress * 2 * math.pi)
    hex_x = int(WIDTH * 0.75)
    hex_y = int(HEIGHT * 0.5)
    hex_size = int(40 * pulse)
    
    # Draw multiple hexagons
    for offset_mult in [1.0, 1.3, 1.6]:
        size = int(hex_size * offset_mult)
        alpha = int(150 / offset_mult)
        points = []
        for i in range(6):
            angle = math.pi / 3 * i
            x = hex_x + size * math.cos(angle)
            y = hex_y + size * math.sin(angle)
            points.append((x, y))
        draw.polygon(points, outline=(100, 150, 255, alpha), width=2)
    
    # Draw shield with checkmark (pulsing glow)
    shield_x = WIDTH * 0.75
    shield_y = HEIGHT * 0.5
    shield_size = 35
    glow_intensity = int(100 + 100 * abs(math.sin(progress * 2 * math.pi)))
    
    # Shield outline
    shield_points = [
        (shield_x, shield_y - shield_size),
        (shield_x + shield_size * 0.6, shield_y - shield_size * 0.7),
        (shield_x + shield_size * 0.6, shield_y + shield_size * 0.3),
        (shield_x, shield_y + shield_size),
        (shield_x - shield_size * 0.6, shield_y + shield_size * 0.3),
        (shield_x - shield_size * 0.6, shield_y - shield_size * 0.7),
    ]
    
    # Draw glowing shield
    draw.polygon(shield_points, outline=(150 + glow_intensity // 2, 180 + glow_intensity // 3, 255), width=3)
    
    # Draw checkmark inside shield
    check_points = [
        (shield_x - 15, shield_y),
        (shield_x - 5, shield_y + 12),
        (shield_x + 15, shield_y - 15)
    ]
    draw.line(check_points, fill=(100 + glow_intensity, 200 + glow_intensity // 2, 255), width=4, joint='curve')
    
    # Add text using default font (since custom fonts may not be available)
    try:
        # Try to use a nice font
        font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 60)
        font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 24)
    except:
        # Fallback to default
        font_large = ImageFont.load_default()
        font_small = ImageFont.load_default()
    
    # Draw "SUPREME" text with gold color and glow
    text_glow = int(50 + 50 * abs(math.sin(progress * 2 * math.pi)))
    supreme_color = (255, 215 - text_glow, 0)  # Gold color
    draw.text((50, 70), "SUPREME", fill=supreme_color, font=font_large)
    
    # Draw "MIDDLEMAN SERVICES" text
    draw.text((50, 145), "MIDDLEMAN SERVICES", fill=(200, 220, 255), font=font_small)
    
    return img

# Generate all frames
print("Generating animated banner frames...")
frames = []
for i in range(FRAMES):
    print(f"Frame {i+1}/{FRAMES}")
    frame = create_frame(i, FRAMES)
    frames.append(frame)

# Save as animated GIF
print("Saving animated GIF...")
frames[0].save(
    '/home/ubuntu/Supreme-BOT2/supreme_bot_banner.gif',
    save_all=True,
    append_images=frames[1:],
    duration=100,  # 100ms per frame = 10 FPS
    loop=0,  # Infinite loop
    optimize=True
)

print("✅ Animated banner created: supreme_bot_banner.gif")
