import logging

from openai import APIStatusError, AsyncOpenAI, OpenAIError

from app.config import OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL
from app.models import BriefRequest, ChatRequest, PrototypeBrief

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are ProtoDesigner, a thoughtful product discovery guide.
Help the user turn an electronic product idea into a thorough physical prototype brief.
Ask one focused question at a time. Prioritize purpose, context, electronics, dimensions,
ergonomics, controls, ports, materials, finish, manufacturing constraints, and durability.
Keep responses concise, practical, and easy for a non-engineer to answer. Use the current
stage and summary as context, but do not repeat information the user already provided.
Ask only useful, unanswered questions. Never require more answers before visualization;
the user can choose to visualize at any time. When enough is known, summarize and invite
them to review the brief."""

BRIEF_INSTRUCTIONS = """Create a concise physical prototype brief from the conversation and current
summary. Preserve known specifics. For any detail the user has not provided, write
\"Not specified\" rather than inventing it. Return all fields in the required schema.
This brief will be reviewed and edited by the user before image generation."""


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
    input_items = [
        {"role": message.role, "content": message.content}
        for message in request.messages
    ]

    try:
        async with AsyncOpenAI(
            api_key=OPENAI_API_KEY,
            base_url=OPENAI_BASE_URL,
            timeout=60,
        ) as client:
            response = await client.responses.create(
                model=OPENAI_MODEL,
                instructions=f"{SYSTEM_PROMPT}\n\n{context}",
                input=input_items,
            )
    except APIStatusError as error:
        logger.error(
            "LLM provider error: status=%s request_id=%s response=%s",
            error.status_code,
            error.request_id,
            error.response.text,
        )
        raise LLMUpstreamError("LLM request failed") from error
    except OpenAIError as error:
        logger.error("LLM SDK request failed: %s", type(error).__name__)
        raise LLMUpstreamError("LLM request failed") from error

    if not response.output_text:
        raise LLMUpstreamError("LLM returned an empty response")
    return response.output_text.strip()


async def draft_prototype_brief(request: BriefRequest) -> PrototypeBrief:
    if not OPENAI_API_KEY or OPENAI_API_KEY == "replace-me":
        raise LLMConfigurationError("LLM credentials are not configured")
    if not OPENAI_MODEL or OPENAI_MODEL == "replace-me":
        raise LLMConfigurationError("LLM model is not configured")

    context = (
        f"Current discovery stage: {request.stage}\n"
        f"Current summary: {request.summary.model_dump_json()}"
    )
    try:
        async with AsyncOpenAI(
            api_key=OPENAI_API_KEY,
            base_url=OPENAI_BASE_URL,
            timeout=60,
        ) as client:
            response = await client.responses.create(
                model=OPENAI_MODEL,
                instructions=f"{BRIEF_INSTRUCTIONS}\n\n{context}",
                input=[message.model_dump() for message in request.messages],
                text={
                    "format": {
                        "type": "json_schema",
                        "name": "prototype_brief",
                        "strict": True,
                        "schema": PrototypeBrief.model_json_schema(),
                    }
                },
            )
    except APIStatusError as error:
        logger.error(
            "LLM provider error while drafting brief: status=%s request_id=%s response=%s",
            error.status_code,
            error.request_id,
            error.response.text,
        )
        raise LLMUpstreamError("Could not prepare prototype brief") from error
    except OpenAIError as error:
        logger.error("LLM brief request failed: %s", type(error).__name__)
        raise LLMUpstreamError("Could not prepare prototype brief") from error

    if not response.output_text:
        raise LLMUpstreamError("LLM returned an empty prototype brief")
    try:
        return PrototypeBrief.model_validate_json(response.output_text)
    except ValueError as error:
        raise LLMUpstreamError("LLM returned an invalid prototype brief") from error
