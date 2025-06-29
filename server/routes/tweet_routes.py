from fastapi import APIRouter
from fastapi.responses import JSONResponse
from models.schemas import PromptRequest, PostRequest
from services.gemini import generate_tweet_text
from services.poster import post_tweet  # ✅ Make sure poster.py exists
from db.mongo import log_conversation, get_history
from datetime import datetime
import uuid

router = APIRouter()

@router.post("/generate")
def generate(req: PromptRequest):
    session_id = req.session_id or str(uuid.uuid4())

    # 🔄 Use history from request if present; fallback to DB history
    history_data = req.history if req.history else get_history(session_id)

    # 🧽 Normalize to expected format
    formatted_history = [
        {"prompt": item.get("prompt", ""), "tweet": item.get("tweet", "")}
        for item in history_data
        if item.get("prompt") and item.get("tweet")
    ]

    tweet_text, error = generate_tweet_text(req.prompt, formatted_history)
    if error:
        return JSONResponse(status_code=400, content={"error": error})

    log_conversation(session_id, req.prompt, tweet_text, datetime.utcnow())

    return {
        "response": tweet_text,
        "session_id": session_id,
        "status": "Generated tweet"
    }

@router.post("/post")
def post_generated_tweet(req: PostRequest):
    try:
        post_tweet(req.text)
        return {"status": "Tweet posted"}
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": "Post failed", "details": str(e)}
        )

@router.get("/history/{session_id}")
def history(session_id: str):
    data = get_history(session_id)
    return [
        {
            "prompt": item.get("prompt"),
            "tweet": item.get("tweet"),
            "timestamp": item.get("timestamp")
        }
        for item in data
    ]
