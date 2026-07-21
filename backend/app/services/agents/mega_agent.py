import json
from app.services.agents.llm_client import generate

MEGA_PROMPT = """You are an expert AI educator. Return ONLY raw valid JSON (no markdown fences) with this exact structure:
{
  "content": "# Lesson Title\n\nFull engaging markdown content with multiple sections, at least 300 words...",
  "introduction": "2-3 sentence introduction explaining what this lesson covers and why it matters.",
  "explanation": "Comprehensive 200+ word explanation of the core concepts with clear examples.",
  "concepts": {
    "Key Concept 1": "Detailed description of concept 1",
    "Key Concept 2": "Detailed description of concept 2"
  },
  "key_takeaways": ["Specific takeaway 1", "Specific takeaway 2", "Specific takeaway 3"],
  "important_notes": ["Important caveat or warning 1", "Important caveat or warning 2"],
  "examples": {"Concept Name": "Concrete real-world example of this concept"},
  "summary": "2-3 sentence summary of the lesson.",
  "story": {"analogy": "A relatable real-world analogy", "narrative": "A short engaging story illustrating the topic"},
  "flashcards": [
    {"front": "Key term or question", "back": "Clear definition or answer"},
    {"front": "Key term or question 2", "back": "Clear definition or answer 2"},
    {"front": "Key term or question 3", "back": "Clear definition or answer 3"}
  ],
  "quiz": [
    {"question": "Specific question about this lesson?", "options": ["Option A", "Option B", "Option C", "Option D"], "answer_index": 0, "explanation": "Why this answer is correct"},
    {"question": "Another question?", "options": ["Option A", "Option B", "Option C", "Option D"], "answer_index": 2, "explanation": "Why this answer is correct"}
  ]
}"""

def generate_mega_lesson(lesson_title: str, context_chunks: list[str]) -> dict:
    truncated_chunks = [c[:1200] for c in context_chunks] if context_chunks else []
    context_str = "\n---\n".join(truncated_chunks)
    prompt = f"Lesson: {lesson_title}\nContext:\n{context_str}"
    
    # Generate JSON response
    response = generate(
        prompt=prompt,
        system=MEGA_PROMPT,
        temperature=0.4,
        response_mime_type="application/json"
    )
    
    # Parse and return
    try:
        return json.loads(response)
    except Exception as e:
        print(f"[MegaAgent] Failed to parse JSON: {e}")
        print(response)
        raise e
