from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import os
from dotenv import load_dotenv
import google.generativeai as genai
import requests

# Load environment variables
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI API KEY not found.")

TWEET_API_URL = os.getenv("TWITTER_API_URL")
TWEET_API_KEY = os.getenv("TWITTER_API_URL_KEY")
USERNAME = os.getenv("TWITTER_USERNAME")

# Configure Gemini
genai.configure(api_key=api_key)
model = genai.GenerativeModel("gemini-1.5-flash")

# FastAPI app setup
app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://arkajyoti-intern.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request schemas
class PromptRequest(BaseModel):
    prompt: str

class PostRequest(BaseModel):
    text: str

# Simple tweet post function
def post_tweet(text: str):
    try:
        payload = {"username": USERNAME, "text": text}
        headers = {"Content-Type": "application/json", "api-key": TWEET_API_KEY}
        response = requests.post(TWEET_API_URL, json=payload, headers=headers)
        print("[INFO] Tweet status:", response.status_code, response.text)
    except Exception as e:
        print("[ERROR] Tweet post failed:", str(e))

# AI generation endpoint with tone, hashtags, safety
@app.post("/generate")
def generate_response(request: PromptRequest):
    try:
        # Basic inappropriate prompt filter
        banned_keywords = ["kill", "hate", "violence", "nude", "nsfw", "bomb", "racist", "attack", "suicide"]
        lowered_prompt = request.prompt.lower()
        if any(word in lowered_prompt for word in banned_keywords):
            return JSONResponse(status_code=400, content={
                "error": "Inappropriate content detected. Please rephrase your prompt."
            })

        # Compose a friendly, human-sounding tweet
        refined_prompt = f"""
You're a witty, expressive social media writer. Respond to the following prompt as if you're a human writing a casual tweet. 
Keep the response under 280 characters. Use natural tone, humor, or empathy — avoid sounding robotic.

Also add 2–3 relevant hashtags based on the topic.

Format your reply like:
Tweet: [Your tweet here]
Hashtags: #tag1 #tag2 #tag3

Prompt: {request.prompt}
"""

        response = model.generate_content(refined_prompt)
        full_text = response.text.strip()

        # Parse into tweet and hashtags
        if "Hashtags:" in full_text:
            tweet_part, tag_part = full_text.split("Hashtags:", 1)
            tweet_text = tweet_part.replace("Tweet:", "").strip()
            hashtags = tag_part.strip()
        else:
            tweet_text = full_text
            hashtags = ""

        full_output = f"{tweet_text} {hashtags}".strip()

        # Trim final output if needed
        if len(full_output) > 280:
            full_output = full_output[:277].rsplit(" ", 1)[0] + "..."

        return {
            "response": full_output,
            "status": "Generated with human tone, hashtags, and safety check"
        }

    except Exception as e:
        return JSONResponse(status_code=500, content={
            "error": "Gemini generation failed",
            "details": str(e)
        })

# Post-tweet confirmation route
@app.post("/post")
def confirm_and_post(request: PostRequest):
    try:
        post_tweet(request.text)
        return {"status": "Tweet successfully posted"}
    except Exception as e:
        return JSONResponse(status_code=500, content={
            "error": "Tweet post failed",
            "details": str(e)
        })
