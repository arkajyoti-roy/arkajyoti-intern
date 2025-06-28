from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import os
from dotenv import load_dotenv
import google.generativeai as genai
import requests

# Load environment variables from .env file
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
TWEET_API_URL = os.getenv("TWITTER_API_URL")
TWEET_API_KEY = os.getenv("TWITTER_API_URL_KEY")
USERNAME = os.getenv("TWITTER_USERNAME")

# Check if Gemini API key is provided
if not GEMINI_API_KEY:
    raise ValueError("Missing GEMINI_API_KEY in .env")

# Setup Gemini model
genai.configure(api_key=GEMINI_API_KEY)
gemini = genai.GenerativeModel("gemini-1.5-flash")

# Create FastAPI app
app = FastAPI()

# Allow frontend access (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://arkajyoti-intern.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request body for /generate
class PromptRequest(BaseModel):
    prompt: str

# Request body for /post
class PostRequest(BaseModel):
    text: str

# Helper: sends tweet using external API
def post_tweet(text: str):
    try:
        payload = {"username": USERNAME, "text": text}
        headers = {"Content-Type": "application/json", "api-key": TWEET_API_KEY}
        response = requests.post(TWEET_API_URL, json=payload, headers=headers)
        print("[INFO] Tweet posted:", response.status_code)
    except Exception as err:
        print("[ERROR] Tweet failed:", err)

# Route: Generate tweet text
@app.post("/generate")
def generate_tweet(req: PromptRequest):
    # Block unsafe prompts
    banned = ["kill", "hate", "violence", "nude", "nsfw", "bomb", "racist", "attack", "suicide"]
    if any(bad in req.prompt.lower() for bad in banned):
        return JSONResponse(status_code=400, content={"error": "Inappropriate content"})

    # Prompt Gemini for a tweet-like response
    final_prompt = f"""
Write a tweet based on the prompt below. Keep it under 280 characters. Be friendly or funny. Add 2-3 hashtags.

Prompt: {req.prompt}
Format:
Tweet: [Your tweet]
Hashtags: #tag1 #tag2
"""
    try:
        result = gemini.generate_content(final_prompt).text.strip()
        tweet, tags = result.split("Hashtags:", 1) if "Hashtags:" in result else (result, "")
        tweet = tweet.replace("Tweet:", "").strip()
        full = f"{tweet} {tags.strip()}"

        if len(full) > 280:
            full = full[:277].rsplit(" ", 1)[0] + "..."

        return {"response": full, "status": "Generated tweet"}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": "Gemini failed", "details": str(e)})

# Route: Post tweet to API
@app.post("/post")
def post_generated_tweet(req: PostRequest):
    try:
        post_tweet(req.text)
        return {"status": "Tweet posted"}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": "Post failed", "details": str(e)})
