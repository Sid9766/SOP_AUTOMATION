from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import json
from io import BytesIO
from pdfminer.high_level import extract_text
import re

app = FastAPI()

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Groq credentials
GROQ_API_KEY = "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"
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"

@app.post("/upload/")
async def upload_pdf(file: UploadFile = File(...)):
    pdf_bytes = await file.read()
    text = extract_text(BytesIO(pdf_bytes))
    print(f"📄 Extracted PDF text length: {len(text)}")

    prompt = f"""
Extract all actionable procedural steps from this SOP document.
Return only a JSON array of strings (each string being one step). No markdown, no explanation.

--- START OF DOCUMENT ---
{text}
"""

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": GROQ_MODEL,
        "temperature": 0.3,
        "messages": [
            {"role": "system", "content": "You are an SOP parser that returns only actionable steps as a JSON array of strings."},
            {"role": "user", "content": prompt}
        ]
    }

    try:
        res = requests.post(GROQ_API_URL, headers=headers, json=payload, timeout=30)
        res.raise_for_status()
        content = res.json()["choices"][0]["message"]["content"]
        print("🔍 Groq raw response:\n", content)

        # Attempt to extract JSON from triple backtick block
        match = re.search(r"```json\s*(\[[\s\S]+?\])\s*```", content)
        if match:
            steps = json.loads(match.group(1))
            return {"steps": steps}

        # Fallback: match a flat JSON string list
        match = re.search(r'\[\s*"[^"]+?"(?:\s*,\s*"[^"]+?")*\s*\]', content)
        if match:
            steps = json.loads(match.group(0))
            return {"steps": steps}

        print("⚠️ No valid step array could be extracted.")
        return {"steps": []}

    except Exception as e:
        print("❌ Groq API error:", e)
        return {"steps": []}


# Q&A endpoint
class QARequest(BaseModel):
    question: str
    context: str
    use_web: bool = True

@app.post("/ask/")
def ask_question(request: QARequest):
    prompt = f"""Answer the user's question based on the following SOP steps.
SOP:
{request.context}

Question:
{request.question}

Answer in a clear and concise manner:"""

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": GROQ_MODEL,
        "temperature": 0.3,
        "messages": [
            {"role": "system", "content": "You assist users by answering questions based on SOP context."},
            {"role": "user", "content": prompt}
        ]
    }

    try:
        res = requests.post(GROQ_API_URL, headers=headers, json=payload, timeout=30)
        res.raise_for_status()
        content = res.json()["choices"][0]["message"]["content"]
        return {"answer": content}
    except Exception as e:
        print("❌ Groq API Q&A error:", e)
        return {"answer": "Sorry, I couldn't process your question."}
