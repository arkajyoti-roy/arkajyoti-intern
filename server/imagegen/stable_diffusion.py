import os
import requests
from dotenv import load_dotenv
from io import BytesIO
import base64

# Load .env if using environment variables (optional)
load_dotenv()

# Use this if you want to load from .env
# HF_TOKEN = os.getenv("HF_TOKEN")

# Or hardcode directly for now
HF_TOKEN = "arka_2345678901234567"
API_URL = "https://imggen-amber.vercel.app/api/generate-image"
HEADERS = {"x-api-key": HF_TOKEN}

def generate_image(prompt: str) -> str:
    try:
        print(f"[INFO] Generating image for prompt: {prompt}")
        print(f"[DEBUG] Using headers: {HEADERS}")
        
        payload = {"inputs": prompt}
        response = requests.post(API_URL, headers=HEADERS, json=payload, stream=True)

        print(f"[DEBUG] Response status: {response.status_code}")
        if response.status_code != 200:
            raise ValueError(f"Image generation failed: {response.status_code} - {response.text}")

        buffer = BytesIO(response.content)
        base64_img = base64.b64encode(buffer.getvalue()).decode("utf-8")
        print("[INFO] Image generated successfully.")
        return base64_img

    except Exception as e:
        print("[Image Generation Error]:", repr(e))
        return None

# Example usage
if __name__ == "__main__":
    prompt_text = "Why is coding at night so peaceful?"
    image_b64 = generate_image(prompt_text)

    if image_b64:
        with open("output_image.png", "wb") as f:
            f.write(base64.b64decode(image_b64))
        print("[INFO] Image saved as output_image.png")
    else:
        print("[WARN] Image generation failed. No output file created.")
