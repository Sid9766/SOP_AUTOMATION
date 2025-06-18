from io import BytesIO
from pdfminer.high_level import extract_text
import requests
import json
import re

# ✅ Groq API details
GROQ_API_KEY = "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"
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"

def extract_steps_from_pdf(pdf_bytes: bytes):
    # Step 1: Extract text from the uploaded PDF
    text = extract_text(BytesIO(pdf_bytes))
    print("📄 Extracted PDF text length:", len(text))

    # Step 2: Build the prompt
    prompt = f"""
You are an expert SOP assistant.

Extract all actionable procedural steps from the following SOP document.
- Even if steps are not explicitly numbered, infer and summarize each as an action.
- Return your response either as valid JSON, OR as a clear numbered list.

Your ideal format is:
1. Step 1 summary...
2. Step 2 summary...
3. ...

--- SOP Content Below ---
{text}
"""


    try:
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": GROQ_MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.3
        }

        response = requests.post(GROQ_API_URL, headers=headers, json=payload, timeout=30)
        response.raise_for_status()

        content = response.json()["choices"][0]["message"]["content"]
        print("🔍 Groq raw response:\n", content)

        # Try parsing as JSON directly
        if content.strip().startswith("{"):
            parsed = json.loads(content)
            return parsed.get("steps", [])

        # Fallback: extract numbered steps like "1. ..." or "1) ..."
        steps = re.findall(r"^\s*(?:Step\s*)?(\d+)[\.\)]\s+(.*)", content, re.IGNORECASE | re.MULTILINE)
        if steps:
            return [f"Step {i+1}: {s[1].strip()}" for i, s in enumerate(steps)]

        return ["⚠️ Groq returned no recognizable steps."]

    except Exception as e:
        print("❌ Groq API error:", str(e))
        return [f"❌ Groq API call failed: {str(e)}"]
