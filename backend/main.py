import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from anthropic import Anthropic, APIStatusError, APIConnectionError

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

class ClaudeRequest(BaseModel):
    systemPrompt: str
    userPrompt: str

@app.get("/")
def home():
    return {"status": "Agentic SDR backend running"}

@app.post("/api/claude")
def call_claude(req: ClaudeRequest):
    try:
        message = client.messages.create(
            model="claude-sonnet-5",
            max_tokens=1000,
            system=req.systemPrompt,
            messages=[
                {"role": "user", "content": req.userPrompt}
            ],
        )
    except APIStatusError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e.message)) from e
    except APIConnectionError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e

    text = "".join(
        block.text for block in message.content
        if block.type == "text"
    )

    return {"text": text}