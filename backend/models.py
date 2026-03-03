from pydantic import BaseModel

class StartRequest(BaseModel):
    task: str
