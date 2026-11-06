import httpx

from app.config import OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL
from app.models import ChatRequest

SYSTEM_PROMPT = """You are ProtoDesigner, a thoughtful product discovery guide.
Help the user turn an electronic product idea into a thorough physical prototype brief.
Ask one focused question at a time. Prioritize purpose, context, electronics, dimensions,
ergonomics, controls, ports, materials, finish, manufacturing constraints, and durability.
Do not generate images yet. Keep responses concise, practical, and easy for a non-engineer
to answer. Use the current stage and summary as context, but do not repeat information the
user already provided."""


class LLMConfigurationError(Exception):
    pass


class LLMUpstreamError(Exception):
    pass


async def complete_chat(request: ChatRequest) -> str:
    if not OPENAI_API_KEY or OPENAI_API_KEY == "replace-me":
        raise LLMConfigurationError("LLM credentials are not configured")
    if not OPENAI_MODEL or OPENAI_MODEL == "replace-me":
        raise LLMConfigurationError("LLM model is not configured")

    context = (
        f"Current discovery stage: {request.stage}\n"
        f"Prototype summary: {request.summary.model_dump_json()}"
    )
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "system", "content": context},
        *[message.model_dump() for message in request.messages],
    ]

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                f"{OPENAI_BASE_URL}/chat/completions",
                headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
                json={"model": OPENAI_MODEL, "messages": messages, "temperature": 0.7},
            )
            response.raise_for_status()
    except httpx.HTTPError as error:
        raise LLMUpstreamError("LLM request failed") from error

    try:
        content = response.json()["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as error:
        raise LLMUpstreamError("LLM returned an unexpected response") from error

    if not isinstance(content, str) or not content.strip():
        raise LLMUpstreamError("LLM returned an empty response")
    return content.strip()
