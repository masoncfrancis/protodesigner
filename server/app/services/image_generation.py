import base64
import logging

from google import genai

from app.config import GEMINI_API_KEY, GEMINI_IMAGE_MODEL
from app.models import PrototypeBrief

logger = logging.getLogger(__name__)


class GeminiConfigurationError(Exception):
    pass


class GeminiUpstreamError(Exception):
    pass


async def generate_concept_image(brief: PrototypeBrief) -> tuple[bytes, str]:
    if not GEMINI_API_KEY or GEMINI_API_KEY == "replace-me":
        raise GeminiConfigurationError("Gemini image credentials are not configured")

    prompt = f"""Create one photorealistic industrial-design concept image of this electronic
product enclosure. The approved brief is the source of truth. Prioritize its silhouette,
proportions, physical scale, orientation, ergonomics, surface treatment, color, seams, and
construction. Use purpose and electronics only to make the physical design plausible. Keep
visible controls, indicators, and ports exactly consistent with the brief; do not invent
features, add screens or labels unless specified, or turn the image into a functional diagram.
Show one complete prototype, centered, in a clean studio product-photography setup with a
soft neutral background and clear enclosure details.

Approved prototype brief:
{brief.model_dump_json(indent=2)}"""

    client = genai.Client(
        api_key=GEMINI_API_KEY,
        http_options={"api_version": "v1beta"},
    )
    try:
        interaction = await client.aio.interactions.create(
            model=GEMINI_IMAGE_MODEL,
            input=prompt,
            response_modalities=["image"],
        )
    except Exception as error:
        logger.error("Gemini image request failed: %s: %s", type(error).__name__, error)
        raise GeminiUpstreamError("Image generation failed") from error
    finally:
        await client.aio.aclose()

    output_image = interaction.output_image
    if not output_image or not output_image.data:
        raise GeminiUpstreamError("Gemini returned no image")

    try:
        image_data = base64.b64decode(output_image.data, validate=True)
    except (ValueError, TypeError) as error:
        raise GeminiUpstreamError("Gemini returned invalid image data") from error

    mime_type = output_image.mime_type or "image/png"
    if not mime_type.startswith("image/"):
        raise GeminiUpstreamError("Gemini returned an unsupported image type")
    return image_data, mime_type
