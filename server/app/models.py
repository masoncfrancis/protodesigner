from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


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


class BriefRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=100)
    stage: str = Field(min_length=1, max_length=100)
    summary: PrototypeSummary


class PrototypeBrief(BaseModel):
    model_config = ConfigDict(extra="forbid")

    product_overview: str
    primary_user: str
    usage_context: str
    core_functionality: str
    internal_components: str
    approximate_size: str
    form_factor_and_ergonomics: str
    controls_and_indicators: str
    ports_and_connectors: str
    materials_and_finish: str
    build_constraints: str
    environment_and_durability: str
    visual_direction: str


class BriefResponse(BaseModel):
    brief: PrototypeBrief
