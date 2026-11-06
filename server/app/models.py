from typing import Literal

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: Literal["system", "assistant", "user"]
    content: str = Field(min_length=1)


class PrototypeSummary(BaseModel):
    purpose: str
    context: str
    internals: str
    form: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=100)
    stage: str = Field(min_length=1, max_length=100)
    summary: PrototypeSummary


class ChatResponse(BaseModel):
    message: ChatMessage
