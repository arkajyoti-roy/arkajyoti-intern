import os
import requests

def post_tweet(text: str):
    try:
        payload = {
            "username": os.getenv("TWITTER_USERNAME"),
            "text": text
        }
        headers = {
            "Content-Type": "application/json",
            "api-key": os.getenv("TWITTER_API_URL_KEY")
        }
        url = os.getenv("TWITTER_API_URL")
        response = requests.post(url, json=payload, headers=headers)
        print("[INFO] Tweet posted:", response.status_code)
        return response.status_code
    except Exception as err:
        print("[ERROR] Tweet failed:", err)
        raise
