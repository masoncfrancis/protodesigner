from fastapi import FastAPI, File, Form, HTTPException, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError

from app.models import (
    BriefRequest,
    BriefResponse,
    ChatMessage,
    ChatRequest,
    ChatResponse,
    OpenScadResponse,
    PrototypeBrief,
)
from app.services.image_generation import (
    GeminiConfigurationError,
    GeminiUpstreamError,
    generate_concept_image,
)
from app.services.openscad_generation import generate_openscad
from app.services.llm import (
    LLMConfigurationError,
    LLMUpstreamError,
    complete_chat,
    draft_prototype_brief,
)

app = FastAPI(title="ProtoDesigner API")
MAX_OPENSCAD_IMAGE_BYTES = 10 * 1024 * 1024


def _image_signature_matches(image_data: bytes, mime_type: str) -> bool:
    if mime_type == "image/png":
        return image_data.startswith(b"\x89PNG\r\n\x1a\n")
    if mime_type == "image/jpeg":
        return image_data.startswith(b"\xff\xd8\xff")
    if mime_type == "image/webp":
        return image_data.startswith(b"RIFF") and image_data[8:12] == b"WEBP"
    return False

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    try:
        content = await complete_chat(request)
    except LLMConfigurationError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except LLMUpstreamError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error

    return ChatResponse(message=ChatMessage(role="assistant", content=content))


@app.post("/api/brief", response_model=BriefResponse)
async def create_brief(request: BriefRequest) -> BriefResponse:
    try:
        brief = await draft_prototype_brief(request)
    except LLMConfigurationError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except LLMUpstreamError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error
    return BriefResponse(brief=brief)


@app.post("/api/images/generate")
async def create_concept_image(brief: PrototypeBrief) -> Response:
    try:
        image_data, mime_type = await generate_concept_image(brief)
    except GeminiConfigurationError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except GeminiUpstreamError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error
    return Response(
        content=image_data,
        media_type=mime_type,
        headers={"Cache-Control": "no-store"},
    )


@app.post("/api/openscad/generate", response_model=OpenScadResponse)
async def create_openscad(
    image: UploadFile = File(...),
    brief_json: str = Form(...),
) -> OpenScadResponse:
    if len(brief_json) > 20_000:
        raise HTTPException(status_code=413, detail="Prototype brief is too large")
    try:
        brief = PrototypeBrief.model_validate_json(brief_json)
    except ValidationError as error:
        raise HTTPException(status_code=422, detail="Invalid prototype brief") from error

    mime_type = image.content_type or ""
    if mime_type not in {"image/png", "image/jpeg", "image/webp"}:
        raise HTTPException(status_code=415, detail="Use a PNG, JPEG, or WebP concept image")

    image_data = await image.read(MAX_OPENSCAD_IMAGE_BYTES + 1)
    await image.close()
    if len(image_data) > MAX_OPENSCAD_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Concept image exceeds 10 MB limit")
    if not image_data or not _image_signature_matches(image_data, mime_type):
        raise HTTPException(status_code=415, detail="Uploaded image does not match its file type")

    try:
        code = await generate_openscad(image_data, mime_type, brief)
    except GeminiConfigurationError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except GeminiUpstreamError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error
    return OpenScadResponse(code=code)
