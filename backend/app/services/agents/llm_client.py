"""Shared LLM client factory for all agents using Google Gemini API."""
from __future__ import annotations
import os
import time
import google.generativeai as genai

# Use the key the user provided
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
genai.configure(api_key=GEMINI_API_KEY)

MODEL = "gemini-2.5-flash"

def generate(prompt: str, system: str, temperature: float = 0.4) -> str:
    """Simple text generation using Gemini with retry logic for rate limits."""
    max_retries = 3
    delay = 45  # Start with 45s delay for strict RPM limits
    
    for attempt in range(max_retries):
        try:
            model = genai.GenerativeModel(
                model_name=MODEL,
                system_instruction=system,
                generation_config=genai.types.GenerationConfig(
                    temperature=temperature,
                )
            )
            response = model.generate_content(prompt)
            return response.text or ""
        except Exception as e:
            if attempt < max_retries - 1:
                print(f"[Gemini] Request failed: {e}. Retrying in {delay}s...")
                time.sleep(delay)
                delay += 20
            else:
                raise e
