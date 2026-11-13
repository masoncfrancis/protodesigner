import base64
import logging

from google import genai

from app.config import GEMINI_API_KEY, GEMINI_CODE_MODEL
from app.models import PrototypeBrief
from app.services.image_generation import GeminiConfigurationError, GeminiUpstreamError

logger = logging.getLogger(__name__)

OPENSCAD_PROMPT = """Generate editable OpenSCAD source for an approximate, printable enclosure
based primarily on the supplied concept image and secondarily on the approved physical brief.
Preserve the visible silhouette, proportions, controls, ports, and surface details as closely
as practical. Use millimeters and expose important dimensions as top-level parameters. Prefer
native OpenSCAD primitives and clear modules; include no external libraries, imported assets,
or explanatory prose. Output only valid .scad source code, without Markdown fences. This is a
concept model, not a certified manufacturing design.

Approved physical brief:
"""


def _strip_code_fence(text: str) -> str:
    lines = text.strip().splitlines()
    if lines and lines[0].strip().startswith("```"):
        lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines.pop()
    return "\n".join(lines).strip()


async def generate_openscad(
    image_data: bytes,
    mime_type: str,
    brief: PrototypeBrief,
) -> str:
    if not GEMINI_API_KEY or GEMINI_API_KEY == "replace-me":
        raise GeminiConfigurationError("Gemini credentials are not configured")

    client = genai.Client(
        api_key=GEMINI_API_KEY,
        http_options={"api_version": "v1beta"},
    )
    try:
        interaction = await client.aio.interactions.create(
            model=GEMINI_CODE_MODEL,
            input=[
                {
                    "type": "text",
                    "text": f"{OPENSCAD_PROMPT}{brief.model_dump_json(indent=2)}",
                },
                {
                    "type": "image",
                    "data": base64.b64encode(image_data).decode("ascii"),
                    "mime_type": mime_type,
                },
            ],
        )
    except Exception as error:
        logger.error("Gemini OpenSCAD request failed: %s: %s", type(error).__name__, error)
        raise GeminiUpstreamError("OpenSCAD generation failed") from error
    finally:
        await client.aio.aclose()

    code = _strip_code_fence(interaction.output_text or "")
    if not code:
        raise GeminiUpstreamError("Gemini returned no OpenSCAD code")
    return code
