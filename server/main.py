from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import os
from dotenv import load_dotenv
import google.generativeai as genai
import requests


load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI API KEY not found.")


genai.configure(api_key=api_key)
model = genai.GenerativeModel("gemini-1.5-flash")


TWEET_API_URL = os.getenv("TWITTER_API_URL")
TWEET_API_KEY = os.getenv("TWITTER_API_URL_KEY")
USERNAME = os.getenv("TWITTER_USERNAME")


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173",
    "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PromptRequest(BaseModel):
    prompt: str


def post_tweet(text: str):
    try:
        payload = {"username": USERNAME, "text": text}
        headers = {"Content-Type": "application/json", "api-key": TWEET_API_KEY}
        response = requests.post(TWEET_API_URL, json=payload, headers=headers)
        print("[INFO] Tweet status:", response.status_code, response.text)
    except Exception as e:
        print("[ERROR] Tweet post failed:", str(e))


@app.post("/generate")
def generate_and_respond(request: PromptRequest, background_tasks: BackgroundTasks):
    try:
        response = model.generate_content(request.prompt)
        tweet_text = response.text.strip()

    
        background_tasks.add_task(post_tweet, tweet_text)

        
        return {
            "response": tweet_text,
            "status": "Generated and posting in background"
        }

    except Exception as e:
        return JSONResponse(status_code=500, content={
            "error": "Gemini generation failed",
            "details": str(e)
        })
