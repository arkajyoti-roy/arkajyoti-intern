from typing import Optional, List
from pydantic import BaseModel

class PromptRequest(BaseModel):
    prompt: str
    session_id: Optional[str] = None
    history: Optional[List[dict]] = None
    generate_image: Optional[bool] = False

class PostRequest(BaseModel):
    text: str
