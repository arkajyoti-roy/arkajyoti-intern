import os
from pymongo import MongoClient
from datetime import datetime

client = MongoClient(os.getenv("MONGO_URI"))
db = client["tweets_db"]
collection = db["conversations"]

def log_conversation(session_id, prompt, tweet, timestamp):
    collection.insert_one({
        "session_id": session_id,
        "prompt": prompt,
        "tweet": tweet,
        "timestamp": timestamp,
    })

def get_history(session_id):
    return list(collection.find({"session_id": session_id}).sort("timestamp", 1))
