from openai import AsyncOpenAI, OpenAIError

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
        async with AsyncOpenAI(
            api_key=OPENAI_API_KEY,
            base_url=OPENAI_BASE_URL,
            timeout=60,
        ) as client:
            response = await client.chat.completions.create(
                model=OPENAI_MODEL,
                messages=messages,
                temperature=0.7,
            )
    except OpenAIError as error:
        raise LLMUpstreamError("LLM request failed") from error

    if not response.choices or not response.choices[0].message.content:
        raise LLMUpstreamError("LLM returned an empty response")
    return response.choices[0].message.content.strip()
