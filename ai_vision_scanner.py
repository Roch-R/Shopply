import sys
import json
import os
import warnings

warnings.filterwarnings("ignore")

try:
    from PIL import Image
    import numpy as np
except ImportError:
    Image = None
    np = None

def analyze_image(image_path):
    if not os.path.exists(image_path):
        return {"error": f"File not found: {image_path}"}

    result = {
        "width": 0,
        "height": 0,
        "aspect_ratio": 1.0,
        "dominant_color_hex": "#888888",
        "dominant_color_name": "Neutral",
        "brightness": "medium",
        "is_square": True
    }

    if Image is None:
        return result

    try:
        with Image.open(image_path) as img:
            img = img.convert("RGB")
            w, h = img.size
            result["width"] = w
            result["height"] = h
            result["aspect_ratio"] = round(w / h, 2) if h > 0 else 1.0
            result["is_square"] = abs(w - h) < (0.15 * max(w, h))

            # Resize to thumbnail to calculate dominant color
            thumb = img.resize((32, 32))
            if hasattr(thumb, "get_flattened_data"):
                pixels = list(thumb.get_flattened_data())
            else:
                pixels = list(thumb.getdata())

            r_total = sum(p[0] for p in pixels)
            g_total = sum(p[1] for p in pixels)
            b_total = sum(p[2] for p in pixels)
            n_pixels = len(pixels)

            avg_r = int(r_total / n_pixels)
            avg_g = int(g_total / n_pixels)
            avg_b = int(b_total / n_pixels)

            hex_code = f"#{avg_r:02x}{avg_g:02x}{avg_b:02x}"
            result["dominant_color_hex"] = hex_code

            # Brightness check
            lum = 0.299 * avg_r + 0.587 * avg_g + 0.114 * avg_b
            if lum < 80:
                result["brightness"] = "dark"
            elif lum > 190:
                result["brightness"] = "light"
            else:
                result["brightness"] = "medium"

            # Detect color name
            if avg_r > 160 and avg_g < 100 and avg_b < 100:
                result["dominant_color_name"] = "Red"
            elif avg_r > 200 and avg_g > 120 and avg_b < 80:
                result["dominant_color_name"] = "Orange"
            elif avg_r > 190 and avg_g > 180 and avg_b < 90:
                result["dominant_color_name"] = "Yellow"
            elif avg_g > 140 and avg_r < 110 and avg_b < 110:
                result["dominant_color_name"] = "Green"
            elif avg_b > 150 and avg_r < 110 and avg_g < 130:
                result["dominant_color_name"] = "Blue"
            elif avg_r > 150 and avg_b > 150 and avg_g < 120:
                result["dominant_color_name"] = "Purple"
            elif avg_r > 200 and avg_g > 150 and avg_b > 170:
                result["dominant_color_name"] = "Coral Pink"
            elif lum < 50:
                result["dominant_color_name"] = "Black"
            elif lum > 220:
                result["dominant_color_name"] = "White"
            else:
                result["dominant_color_name"] = "Neutral"

    except Exception as e:
        result["error"] = str(e)

    return result

if __name__ == "__main__":
    if len(sys.argv) > 1:
        img_path = sys.argv[1]
        data = analyze_image(img_path)
        print(json.dumps(data))
    else:
        print(json.dumps({"error": "No image path provided"}))
