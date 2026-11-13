from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ChatMessage(BaseModel):
    role: Literal["system", "assistant", "user"]
    content: str = Field(min_length=1)


class PrototypeSummary(BaseModel):
    overall_form: str
    size_and_placement: str
    interaction_and_controls: str
    materials_and_finish: str
    build_constraints: str


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

    product_purpose: str
    overall_form_and_silhouette: str
    size_and_proportions: str
    orientation_and_placement: str
    handling_and_ergonomics: str
    internal_fit_constraints: str
    controls_and_indicators: str
    ports_and_connectors: str
    materials_and_finish: str
    color_palette: str
    seams_and_construction: str
    manufacturing_and_durability: str
    visual_direction: str


class BriefResponse(BaseModel):
    brief: PrototypeBrief
