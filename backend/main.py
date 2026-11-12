import os
import re
import smtplib

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

import llm
from email_sender import send_email

load_dotenv()

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class GenerateRequest(BaseModel):
    systemPrompt: str
    userPrompt: str
    webSearch: bool = False


class EmailRequest(BaseModel):
    to: str
    subject: str
    body: str
    senderName: str | None = None
    inReplyTo: str | None = None


@app.get("/")
def home():
    return {"status": "Agentic SDR backend running"}


@app.get("/api/status")
def status():
    smtp_user = os.getenv("SMTP_USER")
    return {
        "ai": llm.status(),
        "email": bool(smtp_user and os.getenv("SMTP_APP_PASSWORD")),
        "emailFrom": smtp_user,
    }


@app.post("/api/generate")
def generate(req: GenerateRequest):
    try:
        text = llm.generate(req.systemPrompt, req.userPrompt, web_search=req.webSearch)
    except llm.LLMError as e:
        raise HTTPException(status_code=e.status, detail=e.detail) from e

    return {"text": text}


@app.post("/api/send-email")
def send(req: EmailRequest):
    if not EMAIL_RE.match(req.to.strip()):
        raise HTTPException(status_code=400, detail=f"Invalid recipient address: {req.to!r}")

    try:
        message_id = send_email(
            to=req.to.strip(),
            subject=req.subject,
            body=req.body,
            sender_name=req.senderName,
            in_reply_to=req.inReplyTo,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except (smtplib.SMTPException, OSError) as e:
        raise HTTPException(status_code=502, detail=f"SMTP error: {e}") from e

    return {"messageId": message_id}
