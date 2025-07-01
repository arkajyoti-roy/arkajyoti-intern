import os
import re
from dotenv import load_dotenv
import google.generativeai as genai
from google.generativeai import GenerativeModel

# Load env vars and configure Gemini API
load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

def generate_tweet_text(prompt: str, history: list = None):
    # 🚫 Basic prompt validation
    banned = [
        "kill", "hate", "violence", "nude", "nsfw", "bomb",
        "racist", "attack", "suicide"
    ]

    prompt_lower = prompt.lower()
    if any(word in prompt_lower for word in banned):
        return None, "Inappropriate content"
    if not prompt.strip():
        return None, "Prompt is empty or invalid"

    # 🔄 Build conversation context (last 10 messages max)
    context = ""
    if history:
        for msg in history[-10:]:
            if msg.get("prompt") and msg.get("tweet"):
                context += f"Prompt: {msg['prompt']}\nTweet: {msg['tweet']}\n"

    # 📜 Prompt construction for Gemini model
    system_instruction = f"""
You are a creative and relatable tweet assistant. Write tweets in a witty, clever, or emotionally engaging human tone—like someone sharing a thought with friends online.

Instructions:
- Keep tone natural, humorous, empathetic, or sarcastic (not robotic)
- 1–3 natural-sounding hashtags at the end
- No "Not suitable for Twitter" responses
- Max 250 characters total

{context}
Prompt: {prompt}

Reply like this:
Tweet: ...
Hashtags: #example #example
""".strip()

    try:
        # 🔁 New model per request to avoid memory/state carry-over
        model = GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(system_instruction)
        gemini_response = response.text.strip()
        print("[DEBUG] Gemini raw response:", gemini_response)

        # 🧠 Extract tweet and hashtags
        tweet_match = re.search(r"Tweet:\s*(.*)", gemini_response)
        tags_match = re.search(r"Hashtags:\s*(.*)", gemini_response)

        tweet = tweet_match.group(1).strip() if tweet_match else gemini_response.splitlines()[0].strip()
        tags = tags_match.group(1).strip() if tags_match else ""

        full = f"{tweet} {tags}".strip()

        # 🧼 Trim if over 280 characters
        if len(full) > 280:
            full = full[:277].rsplit(" ", 1)[0] + "..."

        return full, None

    except Exception as e:
        print("[ERROR] Gemini failure:", str(e))
        return None, f"Gemini generation failed: {str(e)}"
