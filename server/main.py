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
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request body schemas
class PromptRequest(BaseModel):
    prompt: str

class PostRequest(BaseModel):
    text: str

# Post tweet function
def post_tweet(text: str):
    try:
        payload = {"username": USERNAME, "text": text}
        headers = {"Content-Type": "application/json", "api-key": TWEET_API_KEY}
        response = requests.post(TWEET_API_URL, json=payload, headers=headers)
        print("[INFO] Tweet status:", response.status_code, response.text)
    except Exception as e:
        print("[ERROR] Tweet post failed:", str(e))

# Generate concise AI response
@app.post("/generate")
def generate_response(request: PromptRequest):
    try:
        refined_prompt = f"Respond concisely in a tweet-like format (under 280 characters): {request.prompt}"
        response = model.generate_content(refined_prompt)
        tweet_text = response.text.strip()

        # Trim to 280 chars if needed
        if len(tweet_text) > 280:
            tweet_text = tweet_text[:277].rsplit(" ", 1)[0] + "..."

        return {
            "response": tweet_text,
            "status": "Generated. Awaiting user confirmation to post."
        }

    except Exception as e:
        return JSONResponse(status_code=500, content={
            "error": "Gemini generation failed",
            "details": str(e)
        })

# Confirm and post tweet
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
