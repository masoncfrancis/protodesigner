from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.models import ChatRequest, ChatResponse, ChatMessage
from app.services.llm import LLMConfigurationError, LLMUpstreamError, complete_chat

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
