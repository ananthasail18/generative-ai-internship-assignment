"""Agent scaffolding folder.

This package hosts the AI agents that will later plug into the
OpenSwarm orchestrator/course-generation pipeline. None of these modules
contain implementation yet; they only expose stable interfaces so the rest of
the application can import them safely.

Planned pipeline (NOT yet implemented):

    Extract Text  ->  Chunk Text  ->  OpenSwarm Orchestrator
        ->  Structure Agent  -> Lesson Agents  -> Storytelling Agent
        ->  Flashcard Agent  -> Quiz Agent     -> Review Agent
        ->  Store Course
"""
