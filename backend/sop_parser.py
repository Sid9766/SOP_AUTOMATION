from io import BytesIO
from pdfminer.high_level import extract_text
import re
import requests
import json

GROQ_API_KEY = "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"
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"


def extract_steps_from_pdf(pdf_bytes: bytes):
    text = extract_text(BytesIO(pdf_bytes)).strip()
    print(f"📄 Extracted PDF text length: {len(text)}")

    if len(text) < 100:
        return ["⚠️ PDF contains insufficient extractable text."]

    # 🔧 Construct Groq prompt
    prompt = f"""
You are a helpful assistant. Extract procedural steps from the following SOP document.

- Your response should either be in a numbered list OR a JSON array of step-description objects.
- Avoid section headings unless they describe a task.
- Ideal JSON format:
```json
{{
  "procedural_steps": [
    {{ "step": "1.1", "description": "..." }},
    {{ "step": "1.2", "description": "..." }}
  ]
}}
```

--- SOP Content Starts Below ---
{text}
"""

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": GROQ_MODEL,
        "temperature": 0.3,
        "max_tokens": 1024,
        "messages": [
            {"role": "system", "content": "You extract procedural steps from SOPs and return JSON."},
            {"role": "user", "content": prompt}
        ]
    }

    try:
        response = requests.post(GROQ_API_URL, headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        print("🔍 Groq raw response:\n", content)

        # 🧠 Attempt to extract JSON block
        match = re.search(r"```json\s*(\{[\s\S]*?\})\s*```", content)
        if match:
            try:
                raw_json = match.group(1)

                # 🛠 Sanitize malformed endings (basic fix)
                raw_json = raw_json.strip().replace('\n', '')
                if raw_json.count('{') > raw_json.count('}'):
                    raw_json += '}'
                elif raw_json.count('}') > raw_json.count('{'):
                    raw_json = raw_json[:raw_json.rfind('}')+1]

                parsed_json = json.loads(raw_json)

                # ✅ procedural_steps structure
                if "procedural_steps" in parsed_json:
                    steps = parsed_json["procedural_steps"]
                    return [
                        f"Step {s['step']}: {s['description']}"
                        for s in steps if "step" in s and "description" in s
                    ]

                # ✅ plain steps list
                elif "steps" in parsed_json:
                    return parsed_json["steps"]

            except Exception as e:
                print("⚠️ JSON parsing fallback failed:", str(e))

        # 🔁 Fallback: regex-numbered steps
        extracted_steps = re.findall(r"^\s*(?:\d+\.)+\s+(.*)", content, re.MULTILINE)
        if extracted_steps:
            return [f"Step {i + 1}: {s.strip()}" for i, s in enumerate(extracted_steps)]

        return ["⚠️ Groq returned no recognizable steps."]

    except Exception as e:
        print("❌ Groq API error:", e)
        return ["⚠️ Failed to extract steps due to API error."]
