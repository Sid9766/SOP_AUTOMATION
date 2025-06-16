from io import BytesIO
from pdfminer.high_level import extract_text
import re

def extract_steps_from_pdf(pdf_bytes: bytes):
    text = extract_text(BytesIO(pdf_bytes))
    lines = text.splitlines()

    steps = []

    for line in lines:
        line = line.strip()
        # Include lines that start with "• Step N:" or "Step N:"
        if re.match(r"^(•\s*)?Step\s+\d+:.*", line):
            steps.append(line)
    
    return steps
