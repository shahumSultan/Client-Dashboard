import json
from groq import AsyncGroq
from app.config import settings

_client: AsyncGroq | None = None


def _get_client() -> AsyncGroq:
    global _client
    if _client is None:
        _client = AsyncGroq(api_key=settings.GROQ_API_KEY)
    return _client


async def ask_project_assistant(context: dict, question: str) -> str:
    if not settings.GROQ_API_KEY:
        return "AI assistant is not configured. Add a GROQ_API_KEY to enable it."

    client = _get_client()
    response = await client.chat.completions.create(
        model=settings.GROQ_MODEL,
        max_tokens=512,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a helpful project assistant for Enigma-Cube's client portal. "
                    "Answer questions about the project in plain, non-technical language. "
                    "Be concise, friendly, and reassuring. Focus on business impact."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Project context:\n{json.dumps(context, indent=2)}\n\n"
                    f"Client question: {question}"
                ),
            },
        ],
    )
    return response.choices[0].message.content


async def generate_analytics_summary(data: dict) -> str:
    if not settings.GROQ_API_KEY:
        return ""

    client = _get_client()
    response = await client.chat.completions.create(
        model=settings.GROQ_FAST_MODEL,
        max_tokens=256,
        messages=[
            {
                "role": "user",
                "content": (
                    "Generate a 2-3 sentence business-friendly summary of these analytics results "
                    f"for a client report:\n{json.dumps(data, indent=2)}"
                ),
            }
        ],
    )
    return response.choices[0].message.content
