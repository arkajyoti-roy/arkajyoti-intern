import os
import requests
from dotenv import load_dotenv
from io import BytesIO
import base64

load_dotenv()

HF_TOKEN = os.getenv("HF_TOKEN")
API_URL = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0"
HEADERS = {"Authorization": f"Bearer {HF_TOKEN}"}

def generate_image(prompt: str) -> str:
    try:
        print(f"[INFO] Generating image for prompt: {prompt}")
        payload = {"inputs": prompt}

        response = requests.post(API_URL, headers=HEADERS, json=payload, stream=True)
        if response.status_code != 200:
            raise ValueError(f"Image generation failed: {response.status_code} - {response.text}")

        buffer = BytesIO(response.content)
        base64_img = base64.b64encode(buffer.getvalue()).decode("utf-8")
        return base64_img

    except Exception as e:
        print("[Image Generation Error]:", repr(e))
        return None
