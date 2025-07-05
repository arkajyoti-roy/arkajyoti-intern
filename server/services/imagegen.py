import os
import requests
from dotenv import load_dotenv
from io import BytesIO
import base64

load_dotenv()

HF_TOKEN = "arka_2345678901234567"
API_URL = "https://imggen-amber.vercel.app/api/generate-image"
HEADERS = {"x-api-key": HF_TOKEN}

def generate_image(prompt: str) -> str:
    if not prompt:
        print("[ERROR] Empty prompt received for image generation.")
        return None

    try:
        print(f"[INFO] Generating image for prompt: {prompt}")
        payload = {"prompt": prompt}  # ✅ aligned with frontend structure

        response = requests.post(API_URL, headers=HEADERS, json=payload)
        print(f"[DEBUG] Response status: {response.status_code}")

        if response.status_code != 200:
            raise ValueError(f"Image generation failed: {response.status_code} - {response.text}")

        buffer = BytesIO(response.content)
        base64_img = base64.b64encode(buffer.getvalue()).decode("utf-8")
        print("[INFO] Image generation successful.")
        return base64_img

    except Exception as e:
        print("[Image Generation Error]:", repr(e))
        return None
