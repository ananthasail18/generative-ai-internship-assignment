"""Chat Agent — powered by Groq API.

Handles user questions via chat.
"""
from __future__ import annotations
from openai import OpenAI

import os
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
MODEL = "llama-3.1-8b-instant"

client = OpenAI(
    api_key=GROQ_API_KEY,
    base_url="https://api.groq.com/openai/v1"
)

def get_chat_response(messages: list[dict]) -> str:
    """Send conversation history to Groq."""
    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=messages,
            temperature=0.7,
        )
        if response.choices and len(response.choices) > 0:
            return response.choices[0].message.content or "No response returned."
        return "No response returned."
    except Exception as e:
        return f"Sorry, I encountered an error communicating with the AI backend: {str(e)}"
