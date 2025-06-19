from fastapi import FastAPI
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


TWEET_API_URL = os.getenv("TWEET_API_URL")
TWEET_API_KEY = os.getenv("TWEET_API_KEY")
USERNAME = os.getenv("USERNAME")

if not all([TWEET_API_URL, TWEET_API_KEY, USERNAME]):
    raise ValueError("Error in .env")


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PromptRequest(BaseModel):
    prompt: str

@app.post("/generate")
def generate_and_post_tweet(request: PromptRequest):
    try:
       
        response = model.generate_content(request.prompt)
        tweet_text = response.text.strip()


        payload = {
            "username": USERNAME,
            "text": tweet_text
        }
        headers = {
            "Content-Type": "application/json",
            "api-key": TWEET_API_KEY
        }

        tweet_response = requests.post(TWEET_API_URL, json=payload, headers=headers)

        if tweet_response.ok:
            return {
                "generated_tweet": tweet_text,
                "tweet_status": "Posted successfully"
            }
        else:
            return JSONResponse(status_code=tweet_response.status_code, content={
                "generated_tweet": tweet_text,
                "tweet_status": "Post failed",
                "error": tweet_response.text
            })

    except Exception as e:
        return JSONResponse(status_code=500, content={
            "error": "Gemini or tweet post failed",
            "details": str(e)
        })
