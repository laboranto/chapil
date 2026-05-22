from PIL import Image

def fix_alpha(path):
    img = Image.open(path).convert("RGBA")
    data = img.getdata()
    
    new_data = []
    for item in data:
        # If fully transparent, set to white transparent (255, 255, 255, 0)
        if item[3] == 0:
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)
            
    img.putdata(new_data)
    img.save(path)
    print(f"Fixed {path}")

if __name__ == "__main__":
    fix_alpha("android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png")
from PIL import Image

def fix_alpha(path):
    img = Image.open(path).convert("RGBA")
    pixels = img.load()
    
    for y in range(img.size[1]):
        for x in range(img.size[0]):
            r, g, b, a = pixels[x, y]
            if a == 0:
                pixels[x, y] = (255, 255, 255, 0)
            
    img.save(path)
    print(f"Fixed {path} using pixel access")

fix_alpha("android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png")
