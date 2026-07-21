import os
import json
import time
from openai import OpenAI

# Use the key the user provided
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "") or os.environ.get("GOOGLE_API_KEY", "")

client = OpenAI(api_key=GROQ_API_KEY, base_url="https://api.groq.com/openai/v1") if GROQ_API_KEY else None
MODELS = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]


def _try_openrouter(prompt: str, system: str, temperature: float = 0.4, response_mime_type: str = "text/plain") -> str | None:
    """Fallback / Primary to OpenRouter API."""
    if not OPENROUTER_API_KEY:
        return None
    try:
        or_client = OpenAI(api_key=OPENROUTER_API_KEY, base_url="https://openrouter.ai/api/v1")
        models_to_try = [
            "google/gemini-2.0-flash-001",
            "meta-llama/llama-3.3-70b-instruct",
            "deepseek/deepseek-chat",
            "google/gemini-2.0-flash-lite-preview-02-05:free",
        ]
        for m in models_to_try:
            try:
                print(f"[OpenRouter] Trying model {m}...")
                kwargs = {
                    "model": m,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": temperature,
                }
                if response_mime_type == "application/json":
                    kwargs["response_format"] = {"type": "json_object"}
                res = or_client.chat.completions.create(**kwargs)
                if res.choices and res.choices[0].message.content:
                    print(f"[OpenRouter] Success with {m}")
                    return res.choices[0].message.content
            except Exception as e:
                print(f"[OpenRouter {m}] Failed: {e}")
                continue
    except Exception as e:
        print(f"[OpenRouter] Exception: {e}")
    return None


GEMINI_KEYS = [k for k in [
    os.environ.get("GEMINI_API_KEY_2", ""),
    os.environ.get("GEMINI_API_KEY", ""),
    os.environ.get("GOOGLE_API_KEY", "")
] if k]


def _try_gemini(prompt: str, system: str, temperature: float = 0.4, response_mime_type: str = "text/plain") -> str | None:
    """Fallback to Google Gemini API with multi-key failover."""
    if not GEMINI_KEYS:
        return None
    import google.generativeai as genai

    for key_idx, key in enumerate(GEMINI_KEYS, 1):
        try:
            genai.configure(api_key=key)
            for model_name in ["gemini-flash-latest", "gemini-2.0-flash-lite"]:
                try:
                    model = genai.GenerativeModel(model_name, system_instruction=system)
                    config = {"temperature": temperature}
                    if response_mime_type == "application/json":
                        config["response_mime_type"] = "application/json"
                        
                    print(f"[Gemini Key {key_idx}] Generating with {model_name}...")
                    response = model.generate_content(prompt, generation_config=config)
                    if response.text:
                        return response.text
                except Exception as e:
                    err_str = str(e)
                    print(f"[Gemini Key {key_idx} - {model_name}] Failed: {err_str[:100]}")
                    continue
        except Exception as e:
            print(f"[Gemini Key {key_idx}] Config error: {e}")
            continue
    return None


def generate(prompt: str, system: str, temperature: float = 0.4, response_mime_type: str = "text/plain", response_schema: dict = None) -> str:
    """Generate text prioritizing Gemini (if key present), then OpenRouter, then Groq."""
    
    # 1. Try Google Gemini API if key is present
    if GEMINI_API_KEY:
        gemini_res = _try_gemini(prompt, system, temperature, response_mime_type)
        if gemini_res:
            return gemini_res

    # 2. Try OpenRouter if key is present
    if OPENROUTER_API_KEY:
        or_res = _try_openrouter(prompt, system, temperature, response_mime_type)
        if or_res:
            return or_res

    # 3. Try Groq models
    if client:
        for model_name in MODELS:
            try:
                messages = [
                    {"role": "system", "content": system},
                    {"role": "user", "content": prompt}
                ]
                kwargs = {
                    "model": model_name,
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": 4096,
                }
                if response_mime_type == "application/json":
                    kwargs["response_format"] = {"type": "json_object"}
                    if response_schema:
                        messages[0]["content"] += f"\n\nIMPORTANT: You MUST return ONLY valid JSON matching this schema:\n{json.dumps(response_schema)}"
                        
                response = client.chat.completions.create(**kwargs)
                return response.choices[0].message.content or ""
            except Exception as e:
                print(f"[Groq] Model {model_name} failed: {e}. Trying next model/fallback...")
                time.sleep(0.5)

    raise RuntimeError("All LLM providers (Gemini, OpenRouter, Groq) failed or have no API keys configured.")
