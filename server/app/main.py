from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware

from app.models import (
    BriefRequest,
    BriefResponse,
    ChatMessage,
    ChatRequest,
    ChatResponse,
    PrototypeBrief,
)
from app.services.image_generation import (
    GeminiConfigurationError,
    GeminiUpstreamError,
    generate_concept_image,
)
from app.services.llm import (
    LLMConfigurationError,
    LLMUpstreamError,
    complete_chat,
    draft_prototype_brief,
)

app = FastAPI(title="ProtoDesigner API")

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
