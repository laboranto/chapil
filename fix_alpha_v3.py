from PIL import Image

def fix_alpha(path):
    img = Image.open(path).convert("RGBA")
    pixels = img.load()
    
    # Let's also check a non-transparent pixel to see its color
    found_color = False
    
    for y in range(img.size[1]):
        for x in range(img.size[0]):
            r, g, b, a = pixels[x, y]
            if a == 0:
                pixels[x, y] = (255, 255, 255, 0)
            elif not found_color:
                print(f"Sample pixel at ({x},{y}): {(r,g,b,a)}")
                found_color = True
            
    img.save(path)
    print(f"Fixed {path} with explicit white-transparent pixels.")

fix_alpha("android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png")
