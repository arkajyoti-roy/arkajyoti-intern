from pydantic import BaseModel
from typing import Optional, List, Dict

class PromptRequest(BaseModel):
    prompt: str
    session_id: Optional[str] = None
    history: Optional[List[Dict[str, str]]] = []

class PostRequest(BaseModel):
    text: str
